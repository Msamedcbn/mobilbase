"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type StockItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  purchasePrice: number | string;
  salePrice: number | string;
  minThreshold: number;
  updatedAt?: string;
};

const emptyForm = {
  sku: "",
  name: "",
  category: "Aksesuar",
  quantity: "0",
  purchasePrice: "0",
  salePrice: "0",
  minThreshold: "0",
};

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Added States for Barcode Printing and Stock logs
  const [logs, setLogs] = useState<any[]>([]);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/stock-items");
      const json = await res.json();
      setItems(Array.isArray(json) ? json : []);
    } catch {
      toast.error("Stok verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    try {
      const res = await fetch("/api/stock-items/logs");
      const json = await res.json();
      setLogs(Array.isArray(json) ? json : []);
    } catch {
      // Fail silently
    }
  }

  useEffect(() => {
    void fetchItems();
    void fetchLogs();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(items.map((x) => x.category).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      if (!term) return true;
      return `${item.sku} ${item.name} ${item.category}`.toLowerCase().includes(term);
    });
  }, [items, search, categoryFilter]);

  const lowStockCount = useMemo(
    () => items.filter((x) => Number(x.quantity) <= Number(x.minThreshold)).length,
    [items],
  );

  function startEdit(item: StockItem) {
    setEditingId(item.id);
    setForm({
      sku: item.sku,
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      purchasePrice: String(Number(item.purchasePrice)),
      salePrice: String(Number(item.salePrice)),
      minThreshold: String(item.minThreshold),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sku || !form.name) return toast.error("SKU ve ürün adı zorunlu.");
    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category: form.category.trim() || "Genel",
      quantity: Number(form.quantity || 0),
      purchasePrice: Number(form.purchasePrice || 0),
      salePrice: Number(form.salePrice || 0),
      minThreshold: Number(form.minThreshold || 0),
    };

    setSaving(true);
    try {
      const url = editingId ? `/api/stock-items/${editingId}` : "/api/stock-items";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Kayıt başarısız");
      toast.success(editingId ? "Stok kartı güncellendi." : "Stok kartı eklendi.");
      resetForm();
      await fetchItems();
      await fetchLogs(); // Refresh logs
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Bu stok kartını silmek istiyor musunuz?")) return;
    try {
      const res = await fetch(`/api/stock-items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silinemedi");
      toast.success("Stok kartı silindi.");
      if (editingId === id) resetForm();
      await fetchItems();
      await fetchLogs(); // Refresh logs
    } catch {
      toast.error("Silme işlemi başarısız.");
    }
  }

  // Helper functions for Barcode Sticker printing
  function generateBarcodeLinesHTML(sku: string) {
    const hash = sku.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const widths = [1, 2, 3, 1, 4, 2, 1, 3, 2, 1];
    let html = "";
    for (let i = 0; i < 24; i++) {
      const width = widths[(hash + i) % widths.length];
      const isLine = i % 2 === 0;
      if (isLine) {
        html += `<div style="width: ${width}px; height: 100%; background-color: #000; margin-right: ${((hash + i) % 2) + 1.5}px;"></div>`;
      }
    }
    return html;
  }

  function handlePrintSticker(item: StockItem) {
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const content = `
      <html>
        <head>
          <title>Barkod Yazdir</title>
          <style>
            @page {
              size: 50mm 30mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 2mm 3mm;
              width: 50mm;
              height: 30mm;
              box-sizing: border-box;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #fff;
              color: #000;
            }
            .header {
              font-size: 8px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 0.5px solid #000;
              padding-bottom: 1px;
              margin-bottom: 2px;
            }
            .title {
              font-size: 8px;
              line-height: 1.1;
              font-weight: 600;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            .barcode-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-top: 2px;
            }
            .barcode-lines {
              display: flex;
              align-items: flex-end;
              height: 8mm;
              width: 35mm;
              justify-content: center;
            }
            .sku-text {
              font-size: 7px;
              font-family: monospace;
              margin-top: 1px;
              letter-spacing: 1px;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 2px;
            }
            .category {
              font-size: 7px;
              color: #444;
            }
            .price {
              font-size: 11px;
              font-weight: 800;
            }
          </style>
        </head>
        <body>
          <div class="header">SaaSTel Iletisim</div>
          <div class="title">${item.name}</div>
          <div class="barcode-container">
            <div class="barcode-lines">
              ${generateBarcodeLinesHTML(item.sku)}
            </div>
            <div class="sku-text">${item.sku}</div>
          </div>
          <div class="footer">
            <div class="category">${item.category || "Genel"}</div>
            <div class="price">${Number(item.salePrice).toLocaleString("tr-TR")} TL</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.parent.document.body.removeChild(window.frameElement);
              }, 1000);
            }
          </script>
        </body>
      </html>
    `;

    doc.open();
    doc.write(content);
    doc.close();
  }

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h2 className="page-title" style={{ margin: 0 }}>Stok Yönetimi</h2>

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
        <div className="panel" style={{ padding: "0.75rem 0.9rem" }}><p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>Toplam Kart</p><p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800 }}>{items.length}</p></div>
        <div className="panel" style={{ padding: "0.75rem 0.9rem" }}><p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>Düşük Stok</p><p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: lowStockCount > 0 ? "#b45309" : "#0f766e" }}>{lowStockCount}</p></div>
        <div className="panel" style={{ padding: "0.75rem 0.9rem" }}><p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>Filtreli Sonuç</p><p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800 }}>{filtered.length}</p></div>
        <div className="panel" style={{ padding: "0.75rem 0.9rem" }}><p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>Kategori Sayısı</p><p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800 }}>{Math.max(0, categories.length - 1)}</p></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 12 }}>
        <form className="panel" style={{ padding: "1rem", display: "grid", gap: 10 }} onSubmit={saveItem}>
          <h3 style={{ margin: 0 }}>{editingId ? "Stok Kartı Düzenle" : "Detaylı Ürün Ekle"}</h3>
          <div className="form-grid-2">
            <input className="field" placeholder="SKU *" value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} />
            <input className="field" placeholder="Kategori" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
          </div>
          <input className="field" placeholder="Ürün Adı *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <div className="form-grid-4">
            <input className="field" type="number" min={0} placeholder="Adet" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
            <input className="field" type="number" min={0} step="0.01" placeholder="Alış Fiyatı" value={form.purchasePrice} onChange={(e) => setForm((p) => ({ ...p, purchasePrice: e.target.value }))} />
            <input className="field" type="number" min={0} step="0.01" placeholder="Satış Fiyatı" value={form.salePrice} onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))} />
            <input className="field" type="number" min={0} placeholder="Min Stok" value={form.minThreshold} onChange={(e) => setForm((p) => ({ ...p, minThreshold: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="primary-btn" style={{ width: 180 }} disabled={saving}>{saving ? "Kaydediliyor..." : editingId ? "Güncelle" : "Ürün Ekle"}</button>
            <button type="button" className="field" style={{ width: 120 }} onClick={resetForm}>Temizle</button>
          </div>
        </form>

        <div className="panel" style={{ padding: "1rem", display: "grid", gap: 10 }}>
          <div className="form-grid-2">
            <input className="field" placeholder="SKU / ürün / kategori ara..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="field" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              {categories.map((c) => <option key={c} value={c}>{c === "ALL" ? "Tüm Kategoriler" : c}</option>)}
            </select>
          </div>
          <div className="panel panel-scroll" style={{ maxHeight: 560 }}>
            {loading ? (
              <div className="empty-box">Yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-box">Kayıt bulunamadı.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>SKU</th><th>Ürün</th><th>Kategori</th><th>Adet</th><th>Fiyat</th><th>Aksiyon</th></tr></thead>
                <tbody>
                  {filtered.map((item) => {
                    const low = Number(item.quantity) <= Number(item.minThreshold);
                    return (
                      <tr key={item.id}>
                        <td>{item.sku}</td>
                        <td>{item.name}</td>
                        <td>{item.category}</td>
                        <td style={{ color: low ? "#b45309" : undefined, fontWeight: low ? 700 : 500 }}>{item.quantity}</td>
                        <td>{Number(item.salePrice).toLocaleString("tr-TR")} TL</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="field" style={{ width: 56 }} onClick={() => startEdit(item)}>Düzenle</button>
                            <button
                              type="button"
                              className="field"
                              style={{
                                width: 70,
                                backgroundColor: "rgba(59, 130, 246, 0.1)",
                                borderColor: "rgba(59, 130, 246, 0.2)",
                                color: "#3b82f6"
                              }}
                              onClick={() => {
                                setSelectedItem(item);
                                setShowBarcodeModal(true);
                              }}
                            >
                              Barkod
                            </button>
                            <button className="field" style={{ width: 44, color: "#b91c1c" }} onClick={() => void deleteItem(item.id)}>Sil</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Stock Movement Log Feed panel */}
      <div className="panel" style={{ padding: "1.25rem", marginTop: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            Stok Hareket Logları
          </h3>
          <span style={{ fontSize: "12px", color: "#64748b" }}>Son 50 işlem listeleniyor</span>
        </div>
        <div className="panel-scroll" style={{ maxHeight: "240px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          {logs.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>Henüz hareket kaydı yok.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: log.action === "STOCK_ADD" ? "rgba(16,185,129,0.1)" : log.action === "STOCK_DELETE" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)",
                    color: log.action === "STOCK_ADD" ? "#10b981" : log.action === "STOCK_DELETE" ? "#ef4444" : "#3b82f6"
                  }}>
                    {log.action === "STOCK_ADD" ? "+" : log.action === "STOCK_DELETE" ? "-" : "~"}
                  </span>
                  <div>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: "500", color: "#f8fafc" }}>{log.detail}</p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>{new Date(log.createdAt).toLocaleString("tr-TR")}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Barcode Modal Dialog */}
      {showBarcodeModal && selectedItem && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}>
          <div className="panel" style={{
            width: "420px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Barkod Sticker Önizleme</h3>
              <button
                onClick={() => setShowBarcodeModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  fontSize: "20px",
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              padding: "30px",
              borderRadius: "8px",
              border: "1px dashed rgba(255, 255, 255, 0.1)"
            }}>
              {/* Real-size mockup scaled up for visibility */}
              <div style={{
                width: "300px",
                height: "180px",
                backgroundColor: "#ffffff",
                color: "#000000",
                borderRadius: "4px",
                padding: "12px 18px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
                boxSizing: "border-box",
                fontFamily: "system-ui, -apple-system, sans-serif"
              }}>
                <div style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  borderBottom: "1px solid #000000",
                  paddingBottom: "2px",
                  marginBottom: "4px"
                }}>
                  SaaSTel İletişim
                </div>
                <div style={{
                  fontSize: "11px",
                  lineHeight: "1.2",
                  fontWeight: 600,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  height: "26px"
                }}>
                  {selectedItem.name}
                </div>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginTop: "6px"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "flex-end",
                    height: "40px",
                    width: "100%",
                    justifyContent: "center"
                  }}>
                    {/* Render simulated lines */}
                    {Array.from({ length: 24 }).map((_, i) => {
                      const hash = selectedItem.sku.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
                      const widths = [1, 2, 3, 1, 4, 2, 1, 3, 2, 1];
                      const width = widths[(hash + i) % widths.length] * 1.5;
                      const isLine = i % 2 === 0;
                      return isLine ? (
                        <div key={i} style={{
                          width: `${width}px`,
                          height: "100%",
                          backgroundColor: "#000000",
                          marginRight: `${((hash + i) % 2) + 1.5}px`
                        }} />
                      ) : null;
                    })}
                  </div>
                  <div style={{
                    fontSize: "8px",
                    fontFamily: "monospace",
                    marginTop: "4px",
                    letterSpacing: "1.5px"
                  }}>
                    {selectedItem.sku}
                  </div>
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginTop: "4px"
                }}>
                  <span style={{ fontSize: "8px", color: "#555555", fontWeight: 500 }}>{selectedItem.category}</span>
                  <span style={{ fontSize: "14px", fontWeight: 800 }}>
                    {Number(selectedItem.salePrice).toLocaleString("tr-TR")} TL
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => handlePrintSticker(selectedItem)}
                className="primary-btn"
                style={{ flex: 1, height: "42px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
                Yazdır
              </button>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="field"
                style={{ width: "100px", height: "42px" }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

