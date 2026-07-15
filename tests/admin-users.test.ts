import { describe, expect, it } from "vitest";
import { appUserCreateSchema, appUserUpdateSchema } from "../lib/validations";

describe("AppUser Schema Validations", () => {
  describe("appUserCreateSchema", () => {
    it("accepts a valid user payload", () => {
      const payload = {
        fullName: "Ahmet Yılmaz",
        email: "ahmet@vibegsm.com",
        role: "CASHIER",
        password: "securepassword123",
        isActive: true,
      };
      const result = appUserCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejects invalid email address", () => {
      const payload = {
        fullName: "Ahmet Yılmaz",
        email: "invalid-email",
        role: "CASHIER",
        password: "securepassword123",
      };
      const result = appUserCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejects password shorter than 8 characters", () => {
      const payload = {
        fullName: "Ahmet Yılmaz",
        email: "ahmet@vibegsm.com",
        role: "TECHNICIAN",
        password: "123",
      };
      const result = appUserCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejects name shorter than 3 characters", () => {
      const payload = {
        fullName: "Al",
        email: "ahmet@vibegsm.com",
        role: "ADMIN",
        password: "securepassword123",
      };
      const result = appUserCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("appUserUpdateSchema", () => {
    it("accepts partial updates", () => {
      const payload = {
        fullName: "Ali Can",
        role: "TECHNICIAN",
      };
      const result = appUserUpdateSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejects invalid role during update", () => {
      const payload = {
        role: "SUPER_ADMIN",
      };
      const result = appUserUpdateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
