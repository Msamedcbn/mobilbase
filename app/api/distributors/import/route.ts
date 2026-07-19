import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const { distributor, csvContent } = await req.json();
    if (!distributor || !csvContent) {
      return fail("Distribütör ve CSV içeriği zorunludur", "VALIDATION", 400);
    }

    // Basic CSV parsing
    const lines = csvContent.split(/\r?\n/).filter((l: string) => l.trim() !== "");
    if (lines.length < 2) {
      return fail("CSV dosyası en azından bir başlık ve bir veri satırı içermelidir", "VALIDATION", 400);
    }

    const header = lines[0];
    const dataLines = lines.slice(1);

    // Let's determine delimiter (, or ;)
    const delimiter = header.includes(";") ? ";" : ",";

    let insertedCount = 0;
    let updatedCount = 0;

    const parsedRows = dataLines.map((line: string) => {
      const parts = line.split(delimiter).map((p) => p.trim());
      // Expecting columns: name, barcode, category, purchasePrice, salePrice, stock
      const name = parts[0] || "";
      const barcode = parts[1] || "";
      const category = parts[2] || "Aksesuar";
      const purchasePrice = parseFloat(parts[3] || "0");
      const salePrice = parseFloat(parts[4] || "0");
      const stock = parseInt(parts[5] || "0", 10);

      return { name, barcode, category, purchasePrice, salePrice, stock };
    }).filter((r: any) => r.name && r.barcode);

    if (isDbDisabledMode()) {
      // Mock the updates in local store mode
      parsedRows.forEach((row: any) => {
        // Simulating that barcodes ending in even numbers already exist and get updated
        if (parseInt(row.barcode.slice(-1), 10) % 2 === 0) {
          updatedCount++;
        } else {
          insertedCount++;
        }
      });

      return ok(
        { insertedCount, updatedCount, totalProcessed: parsedRows.length },
        200,
        `${distributor} fiyat listesinden ${parsedRows.length} ürün başarıyla işlendi.`
      );
    }

    const tenantId = auth.user.tenantId || null;

    // DB Mode: run upserts in transaction or sequential loop
    for (const row of parsedRows) {
      // findFirst (not findUnique) so a null tenantId (PLATFORM_OWNER importing without
      // tenant context) is matched the same way it's written below — findUnique on the
      // barcode_tenantId composite requires an exact non-null-safe match, which caused
      // re-imports to never find the row they'd just created and duplicate it every time.
      const existing = await prisma.product.findFirst({
        where: { barcode: row.barcode, tenantId },
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            category: row.category,
            purchasePrice: row.purchasePrice,
            salePrice: row.salePrice,
            stock: { increment: row.stock }, // Increment stock
          },
        });
        updatedCount++;
      } else {
        await prisma.product.create({
          data: {
            name: row.name,
            barcode: row.barcode,
            category: row.category,
            purchasePrice: row.purchasePrice,
            salePrice: row.salePrice,
            stock: row.stock,
            tenantId: tenantId,
          },
        });
        insertedCount++;
      }
    }

    return ok(
      { insertedCount, updatedCount, totalProcessed: parsedRows.length },
      200,
      `${distributor} fiyat listesinden ${parsedRows.length} ürün başarıyla işlendi.`
    );
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
