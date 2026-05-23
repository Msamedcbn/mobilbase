export function isDbDisabledMode() {
  return (process.env.DB_DISABLED_MODE ?? "false").toLowerCase() === "true";
}

export type DemoAuthUser = {
  email: string;
  password: string;
  fullName: string;
  role: "ADMIN" | "CASHIER" | "TECHNICIAN";
};

export function getDemoAuthUser(): DemoAuthUser {
  const roleRaw = (process.env.DEMO_LOGIN_ROLE ?? "ADMIN").toUpperCase();
  const role = roleRaw === "CASHIER" || roleRaw === "TECHNICIAN" ? roleRaw : "ADMIN";
  return {
    email: (process.env.DEMO_LOGIN_EMAIL ?? "admin@telefoncupro.local").toLowerCase(),
    password: process.env.DEMO_LOGIN_PASSWORD ?? "Admin123!",
    fullName: process.env.DEMO_LOGIN_NAME ?? "Sistem Yoneticisi",
    role,
  };
}
