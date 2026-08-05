# VibeGSM Gelistirme ve Ozellestirme Yol Haritasi

Son guncelleme: 2026-08-05

Bu not, urun gelistirme onceliklerini ve bilinen acik konulari kayit altina alir.
Bir madde tamamlandiginda "Tamamlananlar" bolumune tasinir; ertelenen maddelerin
neden ertelendigi ve neyi bekledigi acikca yazilir.

---

## Tamamlananlar

### Faz 1 (kismen)

| Madde | Not |
| --- | --- |
| GA4 kurulumu (`G-K3YZF0F0TR`) | `/kayit` uzerinde `trial_signup` donusum event'i gonderiliyor. |
| POS'ta anlik kart komisyonu | Kart/taksit secilince komisyon sonrasi net tutar sepet ozetinde gorunur. |

### Ozellestirme (tamami)

| Madde | Not |
| --- | --- |
| Marka temasi | Tenant bazli logo ve vurgu rengi. `--accent` CSS degiskeni uzerinden uygulanir. |
| Fis / fatura sablonu | Isletme adi, vergi dairesi, VKN ve fis alt notu POS ciktisinda kullanilir. |
| Rol bazli yetki arayuzu | Ayarlar'da 5 rol x 6 modul matrisi. Degisiklik aninda etkili. |
| Sube bazli fiyat | `ProductBranchStock.price` (null = genel fiyat). Subeler ekranindan duzenlenir, POS secili subenin fiyatini kullanir. |

### Guvenlik

| Madde | Not |
| --- | --- |
| POS fiyat dogrulamasi | Checkout artik istemciden gelen `unitPrice` degerine guvenmiyor; sunucudaki gercek fiyatla karsilastirip uyusmazsa 409 donuyor. Mantik `lib/pos-pricing.ts` icinde saf fonksiyon, 11 regresyon testi var. |

---

## Sirada: Faz 2

Onaylandi, henuz baslanmadi.

1. **Primler ekrani** — personel prim kurali tanimlama ve aylik hakedis ozeti.
   Bugun Personel & Hakedis icinde gomulu; ayri bir ekran olarak ayrilacak.
2. **Vadeli alis borclarina vade hatirlatmasi** — veresiye tarafindaki hatirlatma
   mantiginin tedarikci borclarina uygulanmasi.
3. **Uzun kuyruk blog serisi (10 baslik)** — sehir ve niyet odakli icerik.

### Faz 2'den cikarilan

- **Otomatik WhatsApp bildirimi** — iptal edildi. Durum degisikliklerinde yanlis
  bildirim gitme riski, kazanimdan buyuk gorulduugu icin manuel gonderim korunuyor.

---

## Beklemede

Teknik olarak hazir degil ya da dis bir kosula bagli.

| Madde | Neyi bekliyor |
| --- | --- |
| Servis takip linki icin SMS / e-posta kanali | E-posta altyapisinin kurulmasi. Bugun link yalnizca WhatsApp ile gonderiliyor. |
| Gercek e-Arsiv / GIB entegrasyonu | Yatirimci sirket. POS'taki mevcut e-Arsiv akisi bir simulasyondur. |
| Muhasebe yazilimi koprusu (Logo / Mikro / Parasut) | Yatirimci sirket. |
| Bayi zinciri / franchise yonetimi | Once yukaridakilerin netlesmesi. |

---

## Elle yapilmasi gerekenler

Kod tarafinda tamamlandi, uygulanmasi icin manuel adim gerekiyor.

1. **Supabase migration'i** — `supabase/migrations/24_add_product_branch_stock_price.sql`
   Supabase SQL Editor'de calistirilmali. `IF NOT EXISTS` kullanildigi icin
   birden fazla kez calistirilabilir; tabloyu yeniden yazmaz, kilit olusturmaz.
   Calistirilana kadar sube fiyati uretimde kaydedilemez (kod bozulmaz, genel
   fiyata duser).
2. **Google Isletme Profili** — yerel aramalarda haritada gorunmek ve ilk
   backlink sinyali icin. Kod isi degil.

---

## Teknik borc

| Konu | Durum |
| --- | --- |
| Migration pipeline | `prisma migrate deploy` build script'inde yok. Migration'lar elle calistiriliyor. Bu yuzden bazi tenant ayarlari (modul toggle, komisyon orani, marka, fis sablonu, rol yetkileri, vadeli borclar) sema degisikligi yerine `Customer.notes` JSON alaninda tutuluyor. |
| `data/local-store.json` commit kirliligi | Her yerel test sonrasi elle geri aliniyor. `.gitignore`'a alinip gercek bir seed script'i ile degistirilmeli. |
