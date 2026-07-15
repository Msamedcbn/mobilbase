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

export default function CorporateQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { void fetchQuotes(); void fetchProducts(); }, []);

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

  return (
    <section className="compact-shell" style={{ display: "grid", gap: 10 }}>
      <h2 className="page-title" style={{ margin: 0 }}>Kurumsal Teklif Yonetimi</h2>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
      <form className="panel" style={{ padding: "0.8rem", display: "grid", gap: 8 }} onSubmit={createQuote}>
        <h3 style={{ margin: 0 }}>Yeni Teklif Hazirla</h3>
        <div className="form-grid-2">
          <input className="field" placeholder="Firma Adi *" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <input className="field" placeholder="Yetkili Kisi" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div className="form-grid-3">
          <input className="field" placeholder="Telefon" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          <input className="field" placeholder="E-posta" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          <input className="field" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>

        <div className="panel" style={{ padding: "0.6rem" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Teklif Kalemleri</p>
          <div className="form-grid-4" style={{ marginBottom: 8 }}>
            <button type="button" className="field" style={{ width: "100%", textAlign: "left" }} onClick={() => setIsProductModalOpen(true)}>
              {lineProductId ? `Stoktan Secildi: ${lineTitle}` : "Stoktan urun sec (popup)"}
            </button>
            <input className="field" placeholder="Kalem Aciklamasi" value={lineTitle} onChange={(e) => setLineTitle(e.target.value)} />
            <input className="field" type="number" min={1} value={lineQty} onChange={(e) => setLineQty(e.target.value)} />
            <input className="field" type="number" min={0} step="0.01" value={linePrice} onChange={(e) => setLinePrice(e.target.value)} />
            <button type="button" className="field" onClick={addItem}>Kalem Ekle</button>
          </div>
          <div className="panel panel-scroll" style={{ maxHeight: 170 }}>
            {items.length === 0 ? <div className="empty-box">Henuz kalem yok.</div> : (
              <table className="data-table"><thead><tr><th>Kalem</th><th>Adet</th><th>Birim</th><th>Tutar</th><th></th></tr></thead><tbody>
                {items.map((it, idx) => <tr key={`${it.title}-${idx}`}><td>{it.title}</td><td>{it.quantity}</td><td>{it.unitPrice.toLocaleString("tr-TR")} TL</td><td>{(it.quantity * it.unitPrice).toLocaleString("tr-TR")} TL</td><td><button type="button" className="field" style={{ width: 56 }} onClick={() => removeItem(idx)}>Sil</button></td></tr>)}
              </tbody></table>
            )}
          </div>
        </div>

        <div className="form-grid-3">
          <input className="field" type="number" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} placeholder="Indirim" />
          <input className="field" type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="KDV %" />
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not" />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>Toplam: {totalAmount.toLocaleString("tr-TR")} TL</strong>
          <button className="primary-btn" style={{ width: 220 }}>Teklifi Kaydet</button>
        </div>
      </form>
      <aside className="panel" style={{ padding: "0.9rem", alignSelf: "start" }}>
        <h3 style={{ margin: "0 0 8px" }}>Canli Teklif Kopyasi</h3>
        <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 12, background: "#f8fafc" }}>
          <div style={{ margin: "0 auto", width: "100%", maxWidth: 560, minHeight: 760, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0f172a", paddingBottom: 10 }}>
            <div>
              <strong style={{ fontSize: 18, letterSpacing: 0.3 }}>KURUMSAL TEKLIF</strong>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>VibeGSM Teknik ve Magazacilik Hizmetleri</p>
            </div>
            <div style={{ textAlign: "right", fontSize: 12 }}>
              <div><strong>No:</strong> {previewQuoteNo}</div>
              <div><strong>Tarih:</strong> {new Date().toLocaleDateString("tr-TR")}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
              <div style={{ color: "#64748b", marginBottom: 4, fontWeight: 700 }}>MUSTERI / FIRMA</div>
              <div><strong>Firma:</strong> {companyName || "-"}</div>
              <div><strong>Yetkili:</strong> {contactName || "-"}</div>
              <div><strong>Telefon:</strong> {contactPhone || "-"}</div>
              <div><strong>E-posta:</strong> {contactEmail || "-"}</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
              <div style={{ color: "#64748b", marginBottom: 4, fontWeight: 700 }}>TEKLIF DETAYI</div>
              <div><strong>Gecerlilik:</strong> {validUntil ? new Date(validUntil).toLocaleDateString("tr-TR") : "-"}</div>
              <div><strong>KDV:</strong> %{Number(taxRate || 0).toLocaleString("tr-TR")}</div>
              <div><strong>Para Birimi:</strong> TRY</div>
            </div>
          </div>
          <div className="panel panel-scroll" style={{ maxHeight: 260, border: "1px solid #e2e8f0" }}>
            <table className="data-table">
              <thead><tr><th>#</th><th>Kalem</th><th>Adet</th><th>Birim</th><th>Tutar</th></tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8" }}>Kalem ekleyince onizleme olusur.</td></tr> : items.map((it, idx) => (
                  <tr key={`preview-${idx}`}>
                    <td>{idx + 1}</td>
                    <td>{it.title}</td>
                    <td>{it.quantity}</td>
                    <td>{it.unitPrice.toLocaleString("tr-TR")} TL</td>
                    <td>{(it.quantity * it.unitPrice).toLocaleString("tr-TR")} TL</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1.2fr 0.8fr" }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, fontSize: 11, color: "#475569" }}>
              <strong style={{ display: "block", marginBottom: 4, color: "#334155" }}>Kosullar</strong>
              <span>1) Bu teklif belirtilen gecerlilik tarihine kadar gecerlidir.</span><br />
              <span>2) Teslimat ve odeme plani mutabakata gore netlestirilir.</span><br />
              <span>3) Fiyatlara aksi belirtilmedikce KDV dahildir.</span>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, fontSize: 12, color: "#334155", display: "grid", gap: 4 }}>
              <span>Ara Toplam: {subtotal.toLocaleString("tr-TR")} TL</span>
              <span>Indirim: {Number(discountAmount || 0).toLocaleString("tr-TR")} TL</span>
              <span>KDV: {taxAmount.toLocaleString("tr-TR")} TL</span>
              <strong style={{ fontSize: 14 }}>Genel Toplam: {totalAmount.toLocaleString("tr-TR")} TL</strong>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
            <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: 6, fontSize: 11, color: "#64748b" }}>
              <strong>Musteri Onay</strong>
              <div>Ad Soyad / Imza</div>
            </div>
            <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: 6, fontSize: 11, color: "#64748b", textAlign: "right" }}>
              <strong>Firma Yetkilisi</strong>
              <div>Ad Soyad / Imza</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
            {note ? `Not: ${note}` : "Bu alan teklif notlari icin ayrilmistir."}
          </div>
          </div>
        </div>
      </aside>
      </div>

      {isProductModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="panel" style={{ width: "min(900px, 96vw)", maxHeight: "86vh", display: "grid", gap: 8, padding: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Stoktan Urun Sec</h3>
              <button type="button" className="field" style={{ width: 90 }} onClick={() => setIsProductModalOpen(false)}>Kapat</button>
            </div>
            <input className="field" placeholder="Urun ara..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            <div className="panel panel-scroll" style={{ maxHeight: "65vh" }}>
              <table className="data-table">
                <thead><tr><th>Urun</th><th>Satis</th><th></th></tr></thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{Number(p.salePrice || 0).toLocaleString("tr-TR")} TL</td>
                      <td>
                        <button
                          type="button"
                          className="primary-btn"
                          style={{ width: 95 }}
                          onClick={() => {
                            selectProduct(p.id);
                            setIsProductModalOpen(false);
                            setProductSearch("");
                          }}
                        >
                          Sec
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

      <div className="panel panel-scroll" style={{ maxHeight: 420 }}>
        {loading ? <div className="empty-box">Yukleniyor...</div> : (
          <table className="data-table">
            <thead><tr><th>No</th><th>Firma</th><th>Durum</th><th>Gecerlilik</th><th>Tutar</th><th>Tarih</th><th>Aksiyon</th></tr></thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td>{q.quoteNo}</td>
                  <td>{q.companyName}</td>
                  <td>{q.status}</td>
                  <td>{q.validUntil ? new Date(q.validUntil).toLocaleDateString("tr-TR") : "-"}</td>
                  <td>{Number(q.totalAmount).toLocaleString("tr-TR")} TL</td>
                  <td>{new Date(q.createdAt).toLocaleString("tr-TR")}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <select className="field" value={q.status} onChange={(e) => void updateStatus(q.id, e.target.value as Quote["status"])}>
                        <option value="DRAFT">Taslak</option>
                        <option value="SENT">Gonderildi</option>
                        <option value="APPROVED">Onaylandi</option>
                        <option value="REJECTED">Reddedildi</option>
                        <option value="CANCELED">Iptal</option>
                      </select>
                      <button className="field" style={{ width: 70 }} onClick={() => window.open(`/api/corporate-quotes/${q.id}/pdf`, "_blank")}>PDF</button>
                      <button className="field" style={{ width: 90 }} onClick={() => void sendQuote(q.id, "EMAIL")}>E-posta</button>
                      <button className="field" style={{ width: 95 }} onClick={() => void sendQuote(q.id, "WHATSAPP")}>WhatsApp</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
