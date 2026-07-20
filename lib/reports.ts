export type ReportPeriod = "day" | "week" | "month" | "all";

// Resolves a period preset (or an explicit from/to pair) into concrete date
// boundaries. Used by both the staff-performance report and its payout-posting
// endpoint so the two always agree on exactly which window a payout covers.
export function resolvePeriod(searchParams: URLSearchParams): { periodStart: Date | null; periodEnd: Date } {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from) {
    const periodStart = new Date(from);
    const periodEnd = to ? new Date(to) : new Date();
    return { periodStart, periodEnd };
  }

  const period = (searchParams.get("period") as ReportPeriod) || "month";
  const now = new Date();
  const periodEnd = now;

  if (period === "day") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { periodStart: start, periodEnd };
  }
  if (period === "week") {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { periodStart: start, periodEnd };
  }
  if (period === "month") {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { periodStart: start, periodEnd };
  }
  return { periodStart: null, periodEnd };
}
