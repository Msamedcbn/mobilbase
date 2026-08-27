"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Quote = {
  id: string;
  quoteNo: string;
  companyName: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  validUntil?: string | null;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "CANCELED";
  itemsJson: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  note?: string | null;
  createdAt: string;
};
type Product = {
  id: string;
  name: string;
  salePrice: number | string;
};

const STATUS_LABEL: Record<Quote["status"], string> = {
  DRAFT: "Taslak",
  SENT: "Gönderildi",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  CANCELED: "İptal",
};

const STATUS_STYLE: Record<Quote["status"], string> = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-100",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-100",
  CANCELED: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function CorporateQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [taxRate, setTaxRate] = useState("20");
  const [note, setNote] = useState("");

  const [lineTitle, setLineTitle] = useState("");
  const [lineProductId, setLineProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [lineQty, setLineQty] = useState("1");
  const [linePrice, setLinePrice] = useState("0");
  const [items, setItems] = useState<Array<{ title: string; quantity: number; unitPrice: number }>>([]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [items]);
  const taxAmount = useMemo(() => Math.max(0, (subtotal - Number(discountAmount || 0)) * (Number(taxRate || 0) / 100)), [subtotal, discountAmount, taxRate]);
  const totalAmount = useMemo(() => Math.max(0, subtotal - Number(discountAmount || 0) + taxAmount), [subtotal, discountAmount, taxAmount]);
  const previewQuoteNo = useMemo(() => `TKF-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(4, "0")}`, [quotes.length]);

  async function fetchQuotes() {
    setLoading(true);
    try {
      const res = await fetch("/api/corporate-quotes");
      const json = await res.json();
      setQuotes(Array.isArray(json) ? json : []);
    } catch {
      toast.error("Teklifler yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      const json = await res.json();
      const list: Product[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setProducts(list);
      if (!lineProductId && list.length > 0) {
        setLineProductId(list[0].id);
        setLineTitle(list[0].name);
        setLinePrice(String(Number(list[0].salePrice || 0)));
      }
    } catch {
      setProducts([]);
    }
  }

  useEffect(() => {
    void fetchQuotes();
    void fetchProducts();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.tenantName) setTenantName(d.tenantName);
      })
      .catch(() => null);
  }, []);

  function selectProduct(productId: string) {
    setLineProductId(productId);
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setLineTitle(p.name);
    setLinePrice(String(Number(p.salePrice || 0)));
  }

  function addItem() {
    const q = Number(lineQty || 0);
    const p = Number(linePrice || 0);
    if (!lineTitle.trim() || q <= 0 || p < 0) return toast.error("Kalem bilgileri gecersiz.");
    setItems((prev) => [...prev, { title: lineTitle.trim(), quantity: q, unitPrice: p }]);
    setLineTitle(""); setLineQty("1"); setLinePrice("0");
  }
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function createQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return toast.error("Firma adi zorunlu.");
    if (items.length === 0) return toast.error("En az 1 kalem ekleyin.");

    try {
      const res = await fetch("/api/corporate-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, contactName, contactPhone, contactEmail, validUntil: validUntil || null, discountAmount: Number(discountAmount || 0), taxRate: Number(taxRate || 0), note, items }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Teklif olusturulamadi");
      toast.success("Kurumsal teklif olusturuldu.");
      setCompanyName(""); setContactName(""); setContactPhone(""); setContactEmail(""); setValidUntil(""); setDiscountAmount("0"); setTaxRate("20"); setNote(""); setItems([]);
      await fetchQuotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Teklif olusturulamadi");
    }
  }

  async function updateStatus(id: string, status: Quote["status"]) {
    try {
      const res = await fetch(`/api/corporate-quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Durum guncellenemedi");
      toast.success("Teklif durumu guncellendi.");
      await fetchQuotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Durum guncellenemedi");
    }
  }

  async function sendQuote(id: string, channel: "EMAIL" | "WHATSAPP") {
    try {
      const res = await fetch(`/api/corporate-quotes/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gonderim basarisiz");
      if (channel === "WHATSAPP" && json.whatsappUrl) {
        window.open(json.whatsappUrl, "_blank");
      }
      toast.success(channel === "EMAIL" ? "E-posta gonderimi baslatildi." : "WhatsApp paylasim penceresi acildi.");
      await fetchQuotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gonderim basarisiz");
    }
  }

  const inputClass =
    "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <section className="space-y-6 pb-12">
      <h2 className="text-xl font-black tracking-tight text-slate-900">Kurumsal Teklif Yönetimi</h2>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* New quote form */}
        <form className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4" onSubmit={createQuote}>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Yeni Teklif Hazırla</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Firma Adı *" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            <input className={inputClass} placeholder="Yetkili Kişi" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className={inputClass} placeholder="Telefon" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            <input className={inputClass} placeholder="E-posta" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            <input className={`${inputClass} font-mono`} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Teklif Kalemleri</p>

            <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.4fr_0.6fr_0.8fr_auto] gap-2">
              <button type="button" className={`${inputClass} text-left truncate`} onClick={() => setIsProductModalOpen(true)}>
                {lineProductId ? `Stoktan: ${lineTitle}` : "Stoktan ürün seç"}
              </button>
              <input className={inputClass} placeholder="Kalem Açıklaması" value={lineTitle} onChange={(e) => setLineTitle(e.target.value)} />
              <input className={`${inputClass} font-mono`} type="number" min={1} value={lineQty} onChange={(e) => setLineQty(e.target.value)} />
              <input className={`${inputClass} font-mono`} type="number" min={0} step="0.01" value={linePrice} onChange={(e) => setLinePrice(e.target.value)} />
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Ekle
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {items.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">Henüz kalem yok.</div>
              ) : (
                <div className="max-h-[170px] overflow-y-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase sticky top-0">
                        <th className="px-3 py-2">Kalem</th>
                        <th className="px-3 py-2">Adet</th>
                        <th className="px-3 py-2">Birim</th>
                        <th className="px-3 py-2">Tutar</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it, idx) => (
                        <tr key={`${it.title}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2 font-medium text-slate-700">{it.title}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{it.quantity}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{it.unitPrice.toLocaleString("tr-TR")} TL</td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-900">{(it.quantity * it.unitPrice).toLocaleString("tr-TR")} TL</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1 rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition"
                              title="Sil"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className={`${inputClass} font-mono`} type="number" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} placeholder="İndirim" />
            <input className={`${inputClass} font-mono`} type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="KDV %" />
            <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Toplam</p>
              <p className="text-xl font-black font-mono text-slate-900">{totalAmount.toLocaleString("tr-TR")} TL</p>
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95"
            >
              Teklifi Kaydet
            </button>
          </div>
        </form>

        {/* Live quote preview */}
        <aside className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-3">Canlı Teklif Kopyası</h3>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mx-auto w-full max-w-[560px] min-h-[760px] bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2.5">
                <div>
                  <strong className="text-lg tracking-tight text-slate-900">KURUMSAL TEKLİF</strong>
                  <p className="mt-1 text-xs text-slate-500">{tenantName || "Kurumsal Mağaza / Servis"}</p>
                </div>
                <div className="text-right text-xs text-slate-700">
                  <div><strong>No:</strong> <span className="font-mono">{previewQuoteNo}</span></div>
                  <div><strong>Tarih:</strong> <span className="font-mono">{new Date().toLocaleDateString("tr-TR")}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="border border-slate-200 rounded-lg p-2">
                  <div className="text-slate-500 font-bold mb-1">MÜŞTERİ / FİRMA</div>
                  <div><strong>Firma:</strong> {companyName || "-"}</div>
                  <div><strong>Yetkili:</strong> {contactName || "-"}</div>
                  <div><strong>Telefon:</strong> {contactPhone || "-"}</div>
                  <div><strong>E-posta:</strong> {contactEmail || "-"}</div>
                </div>
                <div className="border border-slate-200 rounded-lg p-2">
                  <div className="text-slate-500 font-bold mb-1">TEKLİF DETAYI</div>
                  <div><strong>Geçerlilik:</strong> {validUntil ? new Date(validUntil).toLocaleDateString("tr-TR") : "-"}</div>
                  <div><strong>KDV:</strong> %{Number(taxRate || 0).toLocaleString("tr-TR")}</div>
                  <div><strong>Para Birimi:</strong> TRY</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[260px] overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="px-2 py-1.5">#</th>
                      <th className="px-2 py-1.5">Kalem</th>
                      <th className="px-2 py-1.5">Adet</th>
                      <th className="px-2 py-1.5">Birim</th>
                      <th className="px-2 py-1.5">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-slate-400 py-4">Kalem ekleyince önizleme oluşur.</td></tr>
                    ) : items.map((it, idx) => (
                      <tr key={`preview-${idx}`}>
                        <td className="px-2 py-1.5 font-mono">{idx + 1}</td>
                        <td className="px-2 py-1.5">{it.title}</td>
                        <td className="px-2 py-1.5 font-mono">{it.quantity}</td>
                        <td className="px-2 py-1.5 font-mono">{it.unitPrice.toLocaleString("tr-TR")} TL</td>
                        <td className="px-2 py-1.5 font-mono">{(it.quantity * it.unitPrice).toLocaleString("tr-TR")} TL</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-[1.2fr_0.8fr] gap-2">
                <div className="border border-slate-200 rounded-lg p-2 text-[11px] text-slate-600 leading-relaxed">
                  <strong className="block mb-1 text-slate-700">Koşullar</strong>
                  <span>1) Bu teklif belirtilen geçerlilik tarihine kadar geçerlidir.</span><br />
                  <span>2) Teslimat ve ödeme planı mutabakata göre netleştirilir.</span><br />
                  <span>3) Fiyatlara aksi belirtilmedikçe KDV dahildir.</span>
                </div>
                <div className="border border-slate-200 rounded-lg p-2 text-xs text-slate-700 flex flex-col gap-1">
                  <span>Ara Toplam: <span className="font-mono">{subtotal.toLocaleString("tr-TR")} TL</span></span>
                  <span>İndirim: <span className="font-mono">{Number(discountAmount || 0).toLocaleString("tr-TR")} TL</span></span>
                  <span>KDV: <span className="font-mono">{taxAmount.toLocaleString("tr-TR")} TL</span></span>
                  <strong className="text-sm font-mono">Genel Toplam: {totalAmount.toLocaleString("tr-TR")} TL</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-1.5">
                <div className="border-t border-dashed border-slate-400 pt-1.5 text-[11px] text-slate-500">
                  <strong>Müşteri Onay</strong>
                  <div>Ad Soyad / İmza</div>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1.5 text-[11px] text-slate-500 text-right">
                  <strong>Firma Yetkilisi</strong>
                  <div>Ad Soyad / İmza</div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-center border-t border-slate-200 pt-2">
                {note ? `Not: ${note}` : "Bu alan teklif notları için ayrılmıştır."}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Product picker modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[86vh] bg-white border border-slate-200 rounded-2xl shadow-md p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Stoktan Ürün Seç</h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input className={inputClass} placeholder="Ürün ara..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            <div className="rounded-xl border border-slate-200 overflow-y-auto max-h-[65vh]">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase sticky top-0">
                    <th className="px-4 py-2.5">Ürün</th>
                    <th className="px-4 py-2.5">Satış</th>
                    <th className="px-4 py-2.5 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{p.name}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-600">{Number(p.salePrice || 0).toLocaleString("tr-TR")} TL</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            selectProduct(p.id);
                            setIsProductModalOpen(false);
                            setProductSearch("");
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all"
                        >
                          Seç
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quotes list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Yükleniyor...</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase sticky top-0">
                  <th className="px-6 py-4">No</th>
                  <th className="px-6 py-4">Firma</th>
                  <th className="px-6 py-4">Durum</th>
                  <th className="px-6 py-4">Geçerlilik</th>
                  <th className="px-6 py-4 text-right">Tutar</th>
                  <th className="px-6 py-4">Tarih</th>
                  <th className="px-6 py-4">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-500">{q.quoteNo}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{q.companyName}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border ${STATUS_STYLE[q.status]}`}>
                        {STATUS_LABEL[q.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{q.validUntil ? new Date(q.validUntil).toLocaleDateString("tr-TR") : "-"}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">{Number(q.totalAmount).toLocaleString("tr-TR")} TL</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(q.createdAt).toLocaleString("tr-TR")}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={q.status}
                          onChange={(e) => void updateStatus(q.id, e.target.value as Quote["status"])}
                        >
                          <option value="DRAFT">Taslak</option>
                          <option value="SENT">Gönderildi</option>
                          <option value="APPROVED">Onaylandı</option>
                          <option value="REJECTED">Reddedildi</option>
                          <option value="CANCELED">İptal</option>
                        </select>
                        <button
                          onClick={() => window.open(`/api/corporate-quotes/${q.id}/pdf`, "_blank")}
                          title="PDF"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => void sendQuote(q.id, "EMAIL")}
                          title="E-posta"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => void sendQuote(q.id, "WHATSAPP")}
                          title="WhatsApp"
                          className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
