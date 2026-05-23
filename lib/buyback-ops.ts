import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { generateBuybackMailPdfTemplates } from "@/lib/buyback-pdf";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createReconciliationToken() {
  return crypto.randomBytes(24).toString("hex");
}

export async function enqueueReconciliationNotifications(input: {
  buybackDealId: string;
  customerEmail?: string | null;
  reconciliationLink: string;
  offerIdLabel: string;
}) {
  const recipients = [input.customerEmail, process.env.BUYBACK_NOTIFICATION_EMAIL]
    .filter((v): v is string => Boolean(v && v.trim()))
    .map((v) => v.trim());

  if (recipients.length === 0) return 0;

  const subject = `Mutabakat Bekleniyor - Teklif ${input.offerIdLabel}`;
  const body = `
    <p>Mutabakat degerlendirmesi icin asagidaki baglantiyi acin:</p>
    <p><a href="${input.reconciliationLink}">${input.reconciliationLink}</a></p>
  `;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    if (!store.notifications) store.notifications = [];
    for (const recipient of recipients) {
      store.notifications.push({
        id: localId("notif"),
        buybackDealId: input.buybackDealId,
        eventType: "RECONCILIATION_SENT",
        recipient,
        subject,
        bodyHtml: body,
        status: "QUEUED",
        errorMessage: null,
        contextJson: JSON.stringify({ reconciliationLink: input.reconciliationLink }),
        createdAt: new Date().toISOString(),
        sentAt: null,
      });
    }
    await writeLocalStore(store);
    return recipients.length;
  }

  await prisma.buybackNotification.createMany({
    data: recipients.map((recipient) => ({
      buybackDealId: input.buybackDealId,
      eventType: "RECONCILIATION_SENT",
      recipient,
      subject,
      bodyHtml: body,
      status: "QUEUED",
      contextJson: JSON.stringify({ reconciliationLink: input.reconciliationLink }),
    })),
  });

  return recipients.length;
}

export async function processQueuedBuybackNotifications(limit = 50) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    if (!store.notifications) store.notifications = [];
    const queue = store.notifications.filter((n) => n.status === "QUEUED").slice(0, limit);
    let sent = 0;
    let failed = 0;
    const smtpEnabled = (process.env.SMTP_ENABLED ?? "").toLowerCase() === "true";
    const transporter = smtpEnabled
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: (process.env.SMTP_SECURE ?? "").toLowerCase() === "true",
          auth: process.env.SMTP_USER
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              }
            : undefined,
        })
      : null;

    for (const item of queue) {
      try {
        if (!transporter) throw new Error("SMTP is disabled");
        const deal = store.buybacks.find((b) => b.id === item.buybackDealId);
        const customer = deal ? store.customers.find((c) => c.id === deal.customerId) : null;
        const device = deal ? store.devices.find((d) => d.id === deal.deviceId) : null;
        if (!deal) throw new Error("Buyback deal not found");
        let reconciliationLink: string | undefined;
        if (item.contextJson) {
          try {
            const parsed = JSON.parse(item.contextJson) as { reconciliationLink?: string };
            reconciliationLink = parsed.reconciliationLink;
          } catch {
            reconciliationLink = undefined;
          }
        }
        const attachments = await generateBuybackMailPdfTemplates({
          dealId: deal.id,
          customerName: customer?.fullName ?? "-",
          customerPhone: customer?.phone ?? "-",
          customerNationalId: customer?.nationalId ?? "-",
          deviceBrand: device?.brand ?? "-",
          deviceModel: device?.model ?? "-",
          deviceImei: device?.imei ?? "-",
          offeredPrice: Number(deal.offeredPrice ?? 0),
          agreedPrice: deal.agreedPrice == null ? null : Number(deal.agreedPrice),
          reconciliationLink,
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
          to: item.recipient,
          subject: item.subject,
          html: item.bodyHtml,
          attachments,
        });
        item.status = "SENT";
        item.errorMessage = null;
        item.sentAt = new Date().toISOString();
        sent++;
      } catch (error) {
        item.status = "FAILED";
        item.errorMessage = (error instanceof Error ? error.message : "Send failed").slice(0, 255);
        failed++;
      }
    }
    await writeLocalStore(store);
    return { processed: queue.length, sent, failed };
  }

  const queue = await prisma.buybackNotification.findMany({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      buybackDeal: {
        include: {
          customer: true,
          device: true,
        },
      },
    },
  });

  let sent = 0;
  let failed = 0;
  const smtpEnabled = (process.env.SMTP_ENABLED ?? "").toLowerCase() === "true";

  const transporter = smtpEnabled
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: (process.env.SMTP_SECURE ?? "").toLowerCase() === "true",
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
      })
    : null;

  for (const item of queue) {
    try {
      if (!transporter) {
        throw new Error("SMTP is disabled");
      }
      const deal = item.buybackDeal;
      const customer = deal.customer;
      const device = deal.device;
      let reconciliationLink: string | undefined;
      if (item.contextJson) {
        try {
          const parsed = JSON.parse(item.contextJson) as { reconciliationLink?: string };
          reconciliationLink = parsed.reconciliationLink;
        } catch {
          reconciliationLink = undefined;
        }
      }

      const attachments = await generateBuybackMailPdfTemplates({
        dealId: deal.id,
        customerName: customer?.fullName ?? "-",
        customerPhone: customer?.phone ?? "-",
        customerNationalId: customer?.nationalId ?? "-",
        deviceBrand: device?.brand ?? "-",
        deviceModel: device?.model ?? "-",
        deviceImei: device?.imei ?? "-",
        offeredPrice: Number(deal.offeredPrice ?? 0),
        agreedPrice: deal.agreedPrice == null ? null : Number(deal.agreedPrice),
        reconciliationLink,
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to: item.recipient,
        subject: item.subject,
        html: item.bodyHtml,
        attachments,
      });

      await prisma.buybackNotification.update({
        where: { id: item.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          errorMessage: null,
        },
      });
      sent++;
    } catch (error) {
      await prisma.buybackNotification.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          errorMessage: (error instanceof Error ? error.message : "Send failed").slice(0, 255),
        },
      });
      failed++;
    }
  }

  return { processed: queue.length, sent, failed };
}

export async function resolveReconciliationByToken(token: string) {
  const tokenHash = hashToken(token);
  return prisma.buybackReconciliation.findUnique({
    where: { tokenHash },
    include: {
      buybackDeal: {
        include: { customer: true, device: true },
      },
    },
  });
}

export function getTokenHash(token: string) {
  return hashToken(token);
}
