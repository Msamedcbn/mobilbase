import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { readLocalStore } from "@/lib/local-store";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { prisma } from "@/lib/prisma";
import { makeRenewalSuggestion, summarizeLedger } from "@/lib/studio-finance";
import PDFDocument from "pdfkit";

function parseMetadata(notes: string | null) {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    if (parsed && parsed.isSaaS) return parsed;
  } catch {
    return null;
  }
  return null;
}

export async function GET(req: Request) {
  const auth = requireRole(["PLATFORM_OWNER", "STUDIO_OPERATOR"]);
  if (auth.error) return auth.error;

  // NOT: resellerPricing/resellerPricingHistory hala sadece local-store'da tutuluyor
  // (ayrı flag'lenmiş bug — pricing route'un tamami DB-mode kontrolsuz). Tenant/audit
  // verisi asagida gercek moda gore dallaniyor, pricing config'i degil.
  const store = await readLocalStore();
  const pricing = store.resellerPricing;

  const tenants = isDbDisabledMode()
    ? (store.customers
        .map((c) => ({ customer: c, meta: parseMetadata(c.notes) }))
        .filter((x) => !!x.meta) as Array<{ customer: any; meta: any }>)
    : ((await prisma.customer.findMany())
        .map((c) => ({ customer: c, meta: parseMetadata(c.notes) }))
        .filter((x) => !!x.meta) as Array<{ customer: any; meta: any }>);

  const rows = tenants.map((t) => {
    const ledger = Array.isArray(t.meta.billingLedger) ? t.meta.billingLedger : [];
    const summary = summarizeLedger(ledger);
    const renewal = makeRenewalSuggestion({
      tenantName: t.customer.fullName,
      plan: t.meta.plan || "Pro",
      branchLimit: Number(t.meta.branchLimit || 0),
      licenseEnd: t.meta.licenseEnd || new Date().toISOString().split("T")[0],
      pricing: pricing as any,
    });
    return { ...t, summary, renewal };
  });

  const allCharges = rows.reduce((sum, r) => sum + r.summary.totalCharges, 0);
  const allCollections = rows.reduce((sum, r) => sum + r.summary.totalCollections, 0);
  const allOverdue = rows.reduce((sum, r) => sum + r.summary.overdueAmount, 0);
  const kpis = {
    tenantCount: rows.length,
    totalCharges: allCharges,
    totalCollections: allCollections,
    collectionRatePct: allCharges > 0 ? Number(((allCollections / allCharges) * 100).toFixed(2)) : 0,
    overdueAmount: allOverdue,
    overdueRatePct: allCharges > 0 ? Number(((allOverdue / allCharges) * 100).toFixed(2)) : 0,
  };

  const dueBuckets = {
    overdue: rows.flatMap((r) =>
      (r.meta.billingLedger || [])
        .filter((e: any) => e.type === "CHARGE" && (e.status || "UNPAID") !== "PAID" && new Date(e.dueDate || e.date).getTime() < Date.now())
        .map((e: any) => ({ tenantId: r.customer.id, tenantName: r.customer.fullName, ...e })),
    ),
    dueIn7: rows.flatMap((r) =>
      (r.meta.billingLedger || [])
        .filter((e: any) => {
          if (e.type !== "CHARGE" || (e.status || "UNPAID") === "PAID") return false;
          const dd = Math.ceil((new Date(e.dueDate || e.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return dd >= 0 && dd <= 7;
        })
        .map((e: any) => ({ tenantId: r.customer.id, tenantName: r.customer.fullName, ...e })),
    ),
    dueIn30: rows.flatMap((r) =>
      (r.meta.billingLedger || [])
        .filter((e: any) => {
          if (e.type !== "CHARGE" || (e.status || "UNPAID") === "PAID") return false;
          const dd = Math.ceil((new Date(e.dueDate || e.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return dd > 7 && dd <= 30;
        })
        .map((e: any) => ({ tenantId: r.customer.id, tenantName: r.customer.fullName, ...e })),
    ),
  };

  const riskTenants = rows
    .filter((r) => r.summary.overdueAmount > 0 || r.renewal.remainingDays <= 15)
    .map((r) => ({
      tenantId: r.customer.id,
      tenantName: r.customer.fullName,
      overdueAmount: r.summary.overdueAmount,
      remainingDays: r.renewal.remainingDays,
      reason:
        r.summary.overdueAmount > 0
          ? "Vadesi gecmis borc var"
          : "Lisans yenilemesi kritik esikte",
    }));

  const renewalSuggestions = rows
    .filter((r) => r.renewal.shouldSuggest)
    .map((r) => ({
      tenantId: r.customer.id,
      tenantName: r.customer.fullName,
      ...r.renewal,
    }));

  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return monthKey(dt);
  });
  const monthly = months.map((m) => ({ month: m, charges: 0, collections: 0, byPlan: { Lite: 0, Service: 0, Pro: 0, Enterprise: 0 } as Record<string, number> }));
  const monthlyMap = new Map(monthly.map((x) => [x.month, x]));

  for (const r of rows) {
    const plan = r.meta.plan || "Pro";
    for (const e of r.meta.billingLedger || []) {
      const m = monthKey(new Date(e.date));
      const row = monthlyMap.get(m);
      if (!row) continue;
      const amount = Number(e.amount || 0);
      if (e.type === "CHARGE") {
        row.charges += amount;
        if (plan in row.byPlan) row.byPlan[plan] += amount;
      } else if (e.type === "COLLECTION") {
        row.collections += amount;
      }
    }
  }

  const auditLogs = isDbDisabledMode()
    ? (store.studioAuditLogs || []).slice(0, 40)
    : (await prisma.studioAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 })).map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      }));

  const payload = {
    asOf: new Date().toISOString(),
    kpis,
    dueBuckets,
    riskTenants,
    renewalSuggestions,
    monthly,
    pricingHistory: (store.resellerPricingHistory || []).slice(0, 20),
    auditLogs,
  };

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");
  const type = searchParams.get("type") || "monthly";
  if (format === "csv") {
    let csv = "";
    if (type === "monthly") {
      csv = [
        "month,charges,collections,plan_lite,plan_service,plan_pro,plan_enterprise",
        ...payload.monthly.map((m) =>
          [m.month, m.charges, m.collections, m.byPlan.Lite, m.byPlan.Service, m.byPlan.Pro, m.byPlan.Enterprise].join(","),
        ),
      ].join("\n");
    } else if (type === "due") {
      csv = [
        "bucket,tenantName,category,description,dueDate,amount,status",
        ...payload.dueBuckets.overdue.map((x: any) => ["overdue", x.tenantName, x.category, `"${String(x.description || "").replace(/"/g, "\"\"")}"`, x.dueDate || x.date, x.amount, x.status || "UNPAID"].join(",")),
        ...payload.dueBuckets.dueIn7.map((x: any) => ["dueIn7", x.tenantName, x.category, `"${String(x.description || "").replace(/"/g, "\"\"")}"`, x.dueDate || x.date, x.amount, x.status || "UNPAID"].join(",")),
        ...payload.dueBuckets.dueIn30.map((x: any) => ["dueIn30", x.tenantName, x.category, `"${String(x.description || "").replace(/"/g, "\"\"")}"`, x.dueDate || x.date, x.amount, x.status || "UNPAID"].join(",")),
      ].join("\n");
    } else {
      csv = [
        "tenantName,remainingDays,suggestedAmount,description",
        ...payload.renewalSuggestions.map((x: any) => [x.tenantName, x.remainingDays, x.suggestedAmount, `"${String(x.description || "").replace(/"/g, "\"\"")}"`].join(",")),
      ].join("\n");
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"studio-${type}-report.csv\"`,
      },
    });
  }

  if (format === "pdf") {
    const rows =
      type === "due"
        ? [
            ...payload.dueBuckets.overdue.map((x: any) => ({ bucket: "overdue", ...x })),
            ...payload.dueBuckets.dueIn7.map((x: any) => ({ bucket: "dueIn7", ...x })),
            ...payload.dueBuckets.dueIn30.map((x: any) => ({ bucket: "dueIn30", ...x })),
          ]
        : type === "renewal"
          ? payload.renewalSuggestions
          : payload.monthly;

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 36 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(16).text(`Studio Report - ${type.toUpperCase()}`);
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString("tr-TR")}`);
      doc.moveDown();

      if (type === "monthly") {
        doc.fontSize(11).text("Month | Charges | Collections");
        doc.moveDown(0.3);
        for (const m of rows as any[]) {
          doc.fontSize(9).text(`${m.month} | ${Number(m.charges).toLocaleString("tr-TR")} TL | ${Number(m.collections).toLocaleString("tr-TR")} TL`);
        }
      } else if (type === "due") {
        doc.fontSize(11).text("Bucket | Tenant | DueDate | Amount");
        doc.moveDown(0.3);
        for (const x of rows as any[]) {
          doc.fontSize(9).text(`${x.bucket} | ${x.tenantName} | ${x.dueDate || x.date} | ${Number(x.amount).toLocaleString("tr-TR")} TL`);
        }
      } else {
        doc.fontSize(11).text("Tenant | Remaining Days | Suggested Amount");
        doc.moveDown(0.3);
        for (const x of rows as any[]) {
          doc.fontSize(9).text(`${x.tenantName} | ${x.remainingDays} | ${Number(x.suggestedAmount).toLocaleString("tr-TR")} TL`);
        }
      }

      doc.end();
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"studio-${type}-report.pdf\"`,
      },
    });
  }

  return NextResponse.json(payload);
}
