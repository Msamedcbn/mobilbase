# VibeGSM Pilot Onboarding Checklist

## 1) Kurulum Oncesi

1. Tenant adi, subdomain ve sorumlu operasyon kisisi netlestirildi.
2. Uretim DB ve SMTP bilgileri alindi, secret store'a yuklendi.
3. `APP_BASE_URL` ve `BUYBACK_*` flag stratejisi teyit edildi.

## 2) Teknik Kurulum

1. Migration uygulandi, health/readiness `200` dogrulandi.
2. Admin kullanicisi olusturuldu, zorunlu sifre degisikligi tamamlandi.
3. Feature flag'ler dark launch seviyesinde acildi.

## 3) Operasyon Hazirlik

1. En az 1 POS checkout, 1 buyback wizard ve 1 reconciliation akisi test edildi.
2. SMTP ile test bildirimi `SENT` durumuna dustu.
3. ERP JSON ve CSV import icin en az birer test dosyasi calistirildi.

## 4) Canliya Alma

1. Smoke checklist tamamlandi.
2. Rollback playbook sorumlulari atandi.
3. 24 saatlik izleme penceresi ve backlog esikleri aktif edildi.
