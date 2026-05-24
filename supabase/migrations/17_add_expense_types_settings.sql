-- 17_add_expense_types_settings.sql
ALTER TABLE "SystemSettings"
  ADD COLUMN IF NOT EXISTS "expenseTypes" TEXT[] NOT NULL DEFAULT ARRAY['Kira','Fatura','Maas','Mal Alimi','Diger']::TEXT[];
