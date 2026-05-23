export function isValidBuybackStatusTransition(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return true;

  const allowedNextByCurrent: Record<string, string[]> = {
    DRAFT: ["APPROVED", "REJECTED"],
    APPROVED: ["COMPLETED", "REJECTED"],
    REJECTED: [],
    COMPLETED: [],
  };

  return (allowedNextByCurrent[currentStatus] ?? []).includes(nextStatus);
}
