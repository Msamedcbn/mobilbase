import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";

export async function GET() {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    return ok(store.branches || []);
  }

  try {
    const branches = await prisma.branch.findMany({ orderBy: { createdAt: "desc" } });
    return ok(branches);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, address, phone } = body;
    if (!name) {
      return fail("Şube adı zorunludur", "VALIDATION", 400);
    }

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.branches) store.branches = [];
      
      const exists = store.branches.some((b) => b.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        return fail("Bu şube adı zaten kayıtlı", "CONFLICT", 409);
      }

      const newBranch = {
        id: localId("branch"),
        name,
        address: address || null,
        phone: phone || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.branches.push(newBranch);
      await writeLocalStore(store);
      return ok(newBranch, 201, "Şube başarıyla oluşturuldu");
    }

    const branch = await prisma.branch.create({
      data: { name, address, phone },
    });
    return ok(branch, 201, "Şube başarıyla oluşturuldu");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
