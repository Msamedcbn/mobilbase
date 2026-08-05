-- 24_add_product_branch_stock_price.sql
-- Null means "use Product.salePrice" -- only set when a branch sells the
-- item at a different price (local campaign, branch-specific markup, etc).
ALTER TABLE "ProductBranchStock" ADD COLUMN IF NOT EXISTS "price" DECIMAL(10,2);
