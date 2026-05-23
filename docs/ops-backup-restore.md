# Ops Backup / Restore Runbook (SLA-Lite)

## Gunluk Backup

1. Uygulama database URL bilgisini dogrula (`DATABASE_URL`).
2. PostgreSQL backup al:
   - `pg_dump -Fc -d "$DATABASE_URL" -f backup_YYYYMMDD_HHMM.dump`
3. Backup dosyasini güvenli depoya yukle (S3, Azure Blob, NAS).
4. Backup checksum kaydi olustur (SHA256).

## Restore Test (Haftalik)

1. Bos bir test veritabani olustur.
2. Restore:
   - `pg_restore -d "$TEST_DATABASE_URL" backup_YYYYMMDD_HHMM.dump`
3. Uygulamada smoke test:
   - `/api/health/readiness`
   - `/api/products`
   - `/api/customers`
4. Sonucu operasyon kaydina yaz.

## Migration Once Snapshot

1. Uretim migration oncesi zorunlu snapshot al.
2. Migration dry-run staging'de tamamlanmadan production migration yapma.

## Acil Rollback

1. Uygulamayi maintenance/read-only moda al.
2. Son saglam backup ile restore et.
3. Onceki release artefaktini yeniden deploy et.
4. `/api/health/readiness` ve kritik endpointleri dogrula.
