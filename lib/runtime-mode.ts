export function isDbDisabledMode() {
  return (process.env.DB_DISABLED_MODE ?? "false").toLowerCase() === "true";
}

export type DemoAuthUser = {
  email: string;
  password: string;
  fullName: string;
  role: "PLATFORM_OWNER" | "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT";
};

export function getDemoAuthUser(): DemoAuthUser {
  const roleRaw = (process.env.DEMO_LOGIN_ROLE ?? "ADMIN").toUpperCase();
  const allowedRoles = ["PLATFORM_OWNER", "ADMIN", "CASHIER", "TECHNICIAN", "MANAGER", "ACCOUNTANT"] as const;
  const role: DemoAuthUser["role"] = (allowedRoles as readonly string[]).includes(roleRaw)
    ? (roleRaw as DemoAuthUser["role"])
    : "ADMIN";
  return {
    email: (process.env.DEMO_LOGIN_EMAIL ?? "admin@vibegsm.local").toLowerCase(),
    password: process.env.DEMO_LOGIN_PASSWORD ?? "Admin123!",
    fullName: process.env.DEMO_LOGIN_NAME ?? "Sistem Yoneticisi",
    role,
  };
}
