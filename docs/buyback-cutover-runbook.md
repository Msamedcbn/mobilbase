# Buyback Kesintisiz Gecis Runbook

## 1) On Hazirlik

1. Uretim veritabani snapshot alin.
2. Mevcut uygulama release artefaktini rollback icin saklayin.
3. Asagidaki env degiskenlerini ekleyin:
   - `BUYBACK_NEW_OPS_ENABLED=false`
   - `BUYBACK_RECONCILIATION_ENABLED=false`
   - `BUYBACK_ERP_SYNC_ENABLED=false`
   - `SMTP_ENABLED=true` + SMTP ayarlari
   - `APP_BASE_URL`

## 2) Migration ve Dark Launch

1. `prisma/migrations/20260521_buyback_cutover/migration.sql` uygulayin.
2. Uygulamayi deploy edin.
3. Flag'ler kapali iken temel smoke test yapin.
4. `BUYBACK_NEW_OPS_ENABLED=true` acin (yalniz operasyon rolleri gorecek sekilde).

## 3) Fazli Acilis

1. Mutabakat acilisi: `BUYBACK_RECONCILIATION_ENABLED=true`
2. ERP/CSV acilisi: `BUYBACK_ERP_SYNC_ENABLED=true`
3. Bildirim kuyruğunu `POST /api/buyback/notifications/process` ile izleyin.

## 4) Canli Kabul

1. 24-48 saat boyunca:
   - `BuybackNotification` tablosunda `FAILED` oranini takip edin.
   - `BuybackDeal` / `BuybackReconciliation` tutarliligini kontrol edin.
2. Eski akisi read-only'ye alin.
3. Sorun yoksa eski akisi tamamen kapatin.

## 5) Rollback

1. Flag'leri tamamen kapatin:
   - `BUYBACK_NEW_OPS_ENABLED=false`
   - `BUYBACK_RECONCILIATION_ENABLED=false`
   - `BUYBACK_ERP_SYNC_ENABLED=false`
2. Onceki app release'ine donun.
3. Gerekirse snapshot'tan DB geri donusu yapin.
