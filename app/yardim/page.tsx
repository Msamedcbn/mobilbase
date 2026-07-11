"use client";

import { useState } from "react";

interface KbArticle {
  slug: string;
  title: string;
  description: string;
  body: string;
}

const KB_ARTICLES: KbArticle[] = [
  {
    slug: "baslangic",
    title: "MobiBase'e Başlangıç",
    description: "İlk girişten bayi ayarlarına kadar temel adımlar.",
    body: `## Hoş Geldiniz

MobiBase, telefon bayileri için tasarlanmış bir işletim sistemidir. Satış, servis, stok, finans ve ikinci el işlemlerini tek platformda birleştirir.

### İlk Adımlar

1. **Dashboard'ı tanıyın:** Ana sayfanızda günlük satış, gider, kâr ve tahsilat özetini görürsünüz.
2. **İlk satışınızı yapın:** Sol menüden "Hızlı Satış (POS)" bölümüne gidin.
3. **Servis kaydı açın:** "Tamir Takip" menüsünden cihaz kabulü yapabilirsiniz.
4. **Personel ekleyin:** Ayarlar bölümünden kullanıcı ve yetki yönetimi yapabilirsiniz.

### Destek

Herhangi bir sorunuzda sağ alt köşedeki mavi sohbet simgesinden bize ulaşabilirsiniz.`,
  },
  {
    slug: "tamir-takip",
    title: "Tamir Takip Kullanımı",
    description: "Cihaz kabulü, servis adımları ve müşteri bilgilendirme.",
    body: `## Tamir Takip Sistemi

Tamir takip modülü, cihaz kabulünden teslimata kadar tüm servis sürecini izler.

### Cihaz Kabulü

1. Sol menüden "Tamir Takip" seçeneğine tıklayın.
2. "Yeni Kayıt" butonuna basın.
3. Müşteri bilgilerini, cihaz modelini ve arıza açıklamasını girin.
4. İşlem durumunu, tahmini teslim tarihini ve ücret bilgisini ekleyin.

### Servis Durumları

- **Bekliyor:** Cihaz teslim alındı, henüz işleme başlanmadı.
- **İşlemde:** Teknisyen tarafından üzerinde çalışılıyor.
- **Parça Bekliyor:** Yedek parça siparişi verildi.
- **Hazır:** Onarım tamamlandı, müşteri teslim alabilir.
- **Teslim Edildi:** Müşteri cihazı teslim aldı.

### Müşteri Bilgilendirme

Cihaz durumu değiştiğinde müşteriye otomatik SMS veya e-posta bildirimi gönderilir.`,
  },
  {
    slug: "stok-yonetimi",
    title: "Stok Yönetimi",
    description: "Ürün ekleme, seri no takibi ve stok seviyeleri.",
    body: `## Stok Yönetimi

Stok modülü, cihaz, aksesuar ve yedek parça envanterini yönetmenizi sağlar.

### Ürün Ekleme

1. "Stok Yönetimi" menüsüne gidin.
2. "Yeni Ürün" butonuna tıklayın.
3. Ürün adı, model, alış fiyatı, satış fiyatı ve miktar girin.
4. Seri numarası takibi gerekiyorsa ilgili kutucuğu işaretleyin.

### Seri No Takibi

IMEI veya seri numarası ile takip edilen ürünler için:
- Her stok girişinde seri numarası zorunludur.
- Satış anında seri numarası otomatik düşülür.
- "Seri No Takip" ekranından tüm seri numaralarının durumunu görebilirsiniz.

### Stok Uyarıları

Minimum stok seviyesinin altına düşen ürünler için dashboard'da uyarı görüntülenir.`,
  },
  {
    slug: "ikinci-el",
    title: "İkinci El (Buyback) İşlemleri",
    description: "Cihaz alım, değerleme ve satışa hazırlama süreci.",
    body: `## İkinci El / Buyback Sistemi

Buyback modülü, ikinci el telefon alım, değerlendirme ve yeniden satış sürecini yönetir.

### Cihaz Alımı

1. "İkinci El İşlemleri" menüsüne gidin.
2. "Yeni Alım" butonuna tıklayın.
3. Cihaz IMEI, model, kondisyon ve alım fiyatını girin.
4. Gerekirse servise transfer edin (tamir/kozmetik işlemler için).

### Kondisyon Derecelendirmesi

- **A+ (Çok İyi):** Kutusunda, sıfır ayarında.
- **A (İyi):** Hafif kullanım izleri, tam fonksiyonel.
- **B (Orta):** Belirgin kullanım izleri, çalışır durumda.
- **C (Kötü):** Ekran çizik, kasa hasarlı, onarım gerekebilir.

### Satışa Hazırlama

Alımı yapılan cihazlar otomatik olarak stokta görünür. Servis işlemi tamamlandığında satışa hazır duruma gelir.`,
  },
  {
    slug: "fiyatlandirma",
    title: "Fiyatlandırma ve Paketler",
    description: "MobiBase abonelik paketleri, limitler ve ek hizmetler.",
    body: `## MobiBase Paketleri

MobiBase dört farklı paket sunar. Her paket bayi ölçeğine göre farklı modül ve limitler içerir.

| Paket | POS | Servis | Stok | Fatura | İkinci El | Destek |
|-------|-----|--------|------|--------|-----------|--------|
| Lite | ✓ | ✓ | - | - | - | Standart |
| Service | - | ✓ | ✓ | - | - | Servis Odaklı |
| Pro | ✓ | ✓ | ✓ | ✓ | - | Hızlı |
| Enterprise | ✓ | ✓ | ✓ | ✓ | ✓ | 7/24 SLA |

### Ek Hizmetler

- **Ek Şube:** Her pakette belirli sayıda şube dahildir. İlave şubeler aylık ücrete tabidir.
- **API Paketi:** Dış sistem entegrasyonları için ek API kotası.
- **Depolama:** Ek veritabanı alanı.

### Deneme Sürümü

14 günlük ücretsiz deneme sürümünde tüm Pro özelliklerine erişebilirsiniz. Kredi kartı gerekmez.`,
  },
];

export default function KnowledgeBasePage() {
  const [search, setSearch] = useState("");
  const [activeArticle, setActiveArticle] = useState<KbArticle | null>(null);

  const filtered = search.trim()
    ? KB_ARTICLES.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.description.toLowerCase().includes(search.toLowerCase()) ||
          a.body.toLowerCase().includes(search.toLowerCase())
      )
    : KB_ARTICLES;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-20">
        {activeArticle ? (
          <div>
            <button
              onClick={() => setActiveArticle(null)}
              className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-teal-700 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Yardım Merkezi
            </button>

            <article className="prose prose-slate max-w-none">
              <h1 className="text-2xl font-black text-slate-900 md:text-3xl">{activeArticle.title}</h1>
              <div
                className="mt-6 text-slate-700 leading-7"
                dangerouslySetInnerHTML={{
                  __html: activeArticle.body
                    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-slate-900 mt-6 mb-2">$1</h3>')
                    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-black text-slate-900 mt-8 mb-3">$1</h2>')
                    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-5 list-decimal">$2</li>')
                    .replace(/^- (.+)$/gm, '<li class="ml-5 list-disc">$2</li>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n\n/g, '</p><p class="mt-3">')
                    .replace(/^\|(.+)\|$/gm, (match) => {
                      const cells = match.split("|").filter(Boolean).map((c) => c.trim());
                      if (cells.every((c) => /^-+$/.test(c))) return "";
                      return (
                        '<tr>' +
                        cells.map((c, i) => `<${cells[0] ? "td" : "th"} class="border border-slate-200 px-3 py-2 text-sm">${c}</${cells[0] ? "td" : "th"}>`).join("") +
                        "</tr>"
                      );
                    }),
                }}
              />
            </article>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-black text-slate-900 md:text-4xl">Yardım Merkezi</h1>
            <p className="mt-3 text-base text-slate-500">
              MobiBase hakkında sık sorulan sorular ve kullanım kılavuzları.
            </p>

            <div className="mt-6">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Bir şey ara... (örn: stok, tamir, fiyatlandırma)"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 transition shadow-sm"
              />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {filtered.map((article) => (
                <button
                  key={article.slug}
                  onClick={() => setActiveArticle(article)}
                  className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md hover:border-teal-300"
                >
                  <h3 className="text-base font-black text-slate-900">{article.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{article.description}</p>
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <p className="text-sm font-bold text-slate-500">Aramanızla eşleşen sonuç bulunamadı.</p>
                <p className="mt-1 text-xs text-slate-400">Farklı anahtar kelimeler deneyin veya destek ekibimize ulaşın.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
