import { Prisma } from "@prisma/client";

export function getErrorMessage(error: unknown, fallback = "Beklenmeyen bir hata olustu") {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    if (error.message.includes("Can't reach database server")) {
      return "Veritabani baglantisi kurulamadigi icin islem su anda tamamlanamiyor.";
    }
    return "Veritabani baglantisi baslatilamadi.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(",") : String(error.meta?.target ?? "");
    if (target.includes("barcode")) return "Bu barkod zaten kayitli.";
    if (target.includes("imei")) return "Bu IMEI zaten kayitli.";
    if (target.includes("nationalId")) return "Bu TC Kimlik No zaten kayitli.";
    if (target.includes("phone")) return "Bu telefon numarasi zaten kayitli.";
    return "Bu bilgi zaten sistemde kayitli.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    return "Bu kayit satis/islem gecmisinde kullanildigi icin silinemez.";
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

export function getErrorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "INTERNAL" as const;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "CONFLICT" as const;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    return "CONFLICT" as const;
  }
  return "INTERNAL" as const;
}

export function getErrorStatus(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return 503;
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) return 503;
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return 409;
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return 409;
  return 400;
}
