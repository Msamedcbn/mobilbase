ALTER TABLE "SystemSettings"
  ADD COLUMN "expenseTypes" TEXT[] NOT NULL DEFAULT ARRAY[''Kira'',''Fatura'',''Maas'',''Mal Alimi'',''Diger'']::TEXT[];
