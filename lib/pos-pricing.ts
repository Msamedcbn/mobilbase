/**
 * Sale-price rules shared by the POS checkout route.
 *
 * The client sends `unitPrice` on every cart line, but it is only ever a copy of
 * what /api/products already returned — a display value, never a source of
 * truth. These helpers let the server resolve the real price and reject a
 * payload whose prices don't match, so a tampered request cannot set its own.
 */

/** Tolerance for float comparison — prices are 2-decimal money values. */
const PRICE_EPSILON = 0.01;

/**
 * A branch may sell an item at its own price. Null/undefined override means
 * "use the product's general sale price".
 */
export function resolveBranchPrice(
  salePrice: number | string,
  branchOverride?: number | string | null,
): number {
  if (branchOverride !== null && branchOverride !== undefined) {
    const parsed = Number(branchOverride);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number(salePrice);
}

export type PriceMismatch =
  | { kind: "unknown-product"; productId: string }
  | { kind: "price-changed"; productId: string; expected: number; received: number };

/**
 * Returns the first line whose price doesn't match the authoritative one, or
 * null when every line checks out. Fails closed: a product missing from the
 * price map is treated as an error, not as "skip validation".
 */
export function findPriceMismatch(
  items: Array<{ productId: string; unitPrice: number }>,
  authoritativePrices: Map<string, number>,
): PriceMismatch | null {
  for (const item of items) {
    const expected = authoritativePrices.get(item.productId);
    if (expected === undefined) {
      return { kind: "unknown-product", productId: item.productId };
    }
    if (Math.abs(expected - item.unitPrice) > PRICE_EPSILON) {
      return {
        kind: "price-changed",
        productId: item.productId,
        expected,
        received: item.unitPrice,
      };
    }
  }
  return null;
}
