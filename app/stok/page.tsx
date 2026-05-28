"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type StockItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand?: string | null;
  model?: string | null;
  variantColor?: string | null;
  variantStorage?: string | null;
  serialNumber?: string | null;
  imei?: string | null;
  quantity: number;
  purchasePrice: number | string;
  salePrice: number | string;
  purchaseDocType?: string | null;
  purchaseDocNo?: string | null;
  minThreshold: number;
  updatedAt?: string;
};
type StockCostEvent = {
  id: string;
  type: string;
  amount: number;
  costDelta: number;
  unitCostAfter: number;
  note?: string | null;
  referenceNo?: string | null;
  createdAt: string;
};

const emptyForm = {
  sku: "",
  name: "",
  category: "Aksesuar",
  brand: "",
  model: "",
  variantColor: "",
  variantStorage: "",
  serialNumber: "",
  imei: "",
  quantity: "0",
  purchasePrice: "0",
  salePrice: "0",
  purchaseDocType: "",
  purchaseDocNo: "",
  minThreshold: "0",
};

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [form, setForm] = useState(emptyForm);
  const [vatRateUi, setVatRateUi] = useState("20");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Added States for Barcode Printing and Stock logs
  const [logs, setLogs] = useState<any[]>([]);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [costEvents, setCostEvents] = useState<StockCostEvent[]>([]);
  const [costEventType, setCostEventType] = useState("PURCHASE_EXTERNAL");
  const [costEventAmount, setCostEventAmount] = useState("");
  const [costEventNote, setCostEventNote] = useState("");
  const [costEventRef, setCostEventRef] = useState("");

  // Sub navigation active Tab
  const [activeTab, setActiveTab] = useState<"inventory" | "report">("inventory");

  // Read tab parameter from URL on load and changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "inventory" || tabParam === "report") {
        setActiveTab(tabParam);
      } else {
        setActiveTab("inventory");
      }
    }
  }, [typeof window !== "undefined" ? window.location.search : ""]);

  const handleTabChange = (tab: "inventory" | "report") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "inventory") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.pushState({}, "", url.pathname + url.search);
    }
  };

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

  async function fetchCostEvents(stockItemId: string) {
    try {
      const res = await fetch(`/api/stock-items/${stockItemId}/cost-events`);
      const json = await res.json();
      setCostEvents(Array.isArray(json.events) ? json.events : []);
    } catch {
      setCostEvents([]);
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
  const totalStockUnits = useMemo(
    () => items.reduce((sum, x) => sum + Number(x.quantity), 0),
    [items],
  );
  const totalInventoryCost = useMemo(
    () => items.reduce((sum, x) => sum + (Number(x.purchasePrice) * Number(x.quantity)), 0),
    [items],
  );
  const totalInventoryRetail = useMemo(
    () => items.reduce((sum, x) => sum + (Number(x.salePrice) * Number(x.quantity)), 0),
    [items],
  );
  const purchaseWithVatPreview = useMemo(() => {
    const base = Number(form.purchasePrice || 0);
    const vat = Number(vatRateUi || 0);
    return base * (1 + vat / 100);
  }, [form.purchasePrice, vatRateUi]);
  const saleWithVatPreview = useMemo(() => {
    const base = Number(form.salePrice || 0);
    const vat = Number(vatRateUi || 0);
    return base * (1 + vat / 100);
  }, [form.salePrice, vatRateUi]);
  const inventoryByCategory = useMemo(() => {
    const map = new Map<string, { quantity: number; cost: number; retail: number }>();
    items.forEach((item) => {
      const key = item.category || "Genel";
      const prev = map.get(key) ?? { quantity: 0, cost: 0, retail: 0 };
      prev.quantity += Number(item.quantity);
      prev.cost += Number(item.purchasePrice) * Number(item.quantity);
      prev.retail += Number(item.salePrice) * Number(item.quantity);
      map.set(key, prev);
    });
    return Array.from(map.entries())
      .map(([category, v]) => ({ category, ...v, profit: v.retail - v.cost }))
      .sort((a, b) => b.retail - a.retail);
  }, [items]);

  function startEdit(item: StockItem) {
    setEditingId(item.id);
    setForm({
      sku: item.sku,
      name: item.name,
      category: item.category,
      brand: item.brand || "",
      model: item.model || "",
      variantColor: item.variantColor || "",
      variantStorage: item.variantStorage || "",
      serialNumber: item.serialNumber || "",
      imei: item.imei || "",
      quantity: String(item.quantity),
      purchasePrice: String(Number(item.purchasePrice)),
      salePrice: String(Number(item.salePrice)),
      purchaseDocType: item.purchaseDocType || "",
      purchaseDocNo: item.purchaseDocNo || "",
      minThreshold: String(item.minThreshold),
    });
    void fetchCostEvents(item.id);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setVatRateUi("20");
    setCostEvents([]);
    setCostEventAmount("");
    setCostEventNote("");
    setCostEventRef("");
  }

  async function addCostEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return toast.error("Maliyet hareketi için önce bir stok kartı seçin.");
    const amount = Number(costEventAmount || 0);
    if (!Number.isFinite(amount) || amount < 0) return toast.error("Geçerli bir tutar girin.");
    try {
      const res = await fetch(`/api/stock-items/${editingId}/cost-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: costEventType,
          amount,
          note: costEventNote || null,
          referenceNo: costEventRef || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Maliyet hareketi kaydedilemedi");
      toast.success("Maliyet hareketi eklendi.");
      setCostEventAmount("");
      setCostEventNote("");
      setCostEventRef("");
      await fetchItems();
      await fetchCostEvents(editingId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    }
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sku || !form.name) return toast.error("SKU ve ürün adı zorunlu.");
    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category: form.category.trim() || "Genel",
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      variantColor: form.variantColor.trim() || null,
      variantStorage: form.variantStorage.trim() || null,
      serialNumber: form.serialNumber.trim() || null,
      imei: form.imei.trim() || null,
      quantity: Number(form.quantity || 0),
      purchasePrice: Number(form.purchasePrice || 0),
      salePrice: Number(form.salePrice || 0),
      purchaseDocType: form.purchaseDocType.trim() || null,
      purchaseDocNo: form.purchaseDocNo.trim() || null,
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



  const getEventTypeName = (type: string) => {
    switch (type) {
      case "PURCHASE_EXTERNAL": return "Dış Satın Alım";
      case "INTERNAL_SELL_TO_SERVICE": return "İç Servise Sevk (Satış)";
      case "SERVICE_COST_LABOR": return "İşçilik Maliyeti";
      case "SERVICE_COST_PART": return "Parça Maliyeti";
      case "INTERNAL_BUYBACK_FROM_SERVICE": return "Servisten Geri Satın Alım";
      case "MANUAL_ADJUSTMENT": return "Manuel Maliyet Düzeltmesi";
      default: return type;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "PURCHASE_EXTERNAL": return "bg-emerald-50 border border-emerald-100 text-emerald-700";
      case "INTERNAL_SELL_TO_SERVICE": return "bg-blue-50 border border-blue-100 text-blue-700";
      case "SERVICE_COST_LABOR": return "bg-amber-50 border border-amber-100 text-amber-700";
      case "SERVICE_COST_PART": return "bg-orange-50 border border-orange-100 text-orange-700";
      case "INTERNAL_BUYBACK_FROM_SERVICE": return "bg-teal-50 border border-teal-100 text-teal-700 font-bold";
      case "MANUAL_ADJUSTMENT": return "bg-slate-50 border border-slate-100 text-slate-700";
      default: return "bg-slate-50 border border-slate-100 text-slate-700";
    }
  };

  return (
    <section className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h2 className="page-title m-0">Stok Yönetimi</h2>
          <p className="text-slate-500 text-xs md:text-sm m-0 mt-1">Ürün envanteri, kategori bazlı kırılımlar, maliyet takibi ve barkod sticker baskısı.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-2 mb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => handleTabChange("inventory")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === "inventory"
              ? "border-teal-700 text-teal-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
          Envanter & Stok Kartları
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("report")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === "report"
              ? "border-teal-700 text-teal-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" /></svg>
          Raporlar & İşlem Logları
        </button>
      </div>

      {/* Tab 1: Inventory Management */}
      {activeTab === "inventory" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="panel p-4 flex items-center justify-between bg-white relative overflow-hidden group">
              <div className="absolute -right-3 -bottom-3 opacity-5 text-slate-800 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <div>
                <p className="m-0 text-2xs font-bold text-slate-400 uppercase tracking-wider">Toplam Kart</p>
                <h3 className="m-0 mt-1.5 text-2xl font-extrabold text-slate-900">{items.length}</h3>
              </div>
            </div>

            <div className="panel p-4 flex items-center justify-between bg-white relative overflow-hidden group">
              <div className="absolute -right-3 -bottom-3 opacity-5 text-amber-800 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="m-0 text-2xs font-bold text-slate-400 uppercase tracking-wider">Düşük Stok</p>
                <h3 className={`m-0 mt-1.5 text-2xl font-extrabold ${lowStockCount > 0 ? "text-amber-600" : "text-teal-700"}`}>{lowStockCount}</h3>
              </div>
            </div>

            <div className="panel p-4 flex items-center justify-between bg-white relative overflow-hidden group">
              <div className="absolute -right-3 -bottom-3 opacity-5 text-slate-800 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="m-0 text-2xs font-bold text-slate-400 uppercase tracking-wider">Filtreli Sonuç</p>
                <h3 className="m-0 mt-1.5 text-2xl font-extrabold text-slate-900">{filtered.length}</h3>
              </div>
            </div>

            <div className="panel p-4 flex items-center justify-between bg-white relative overflow-hidden group">
              <div className="absolute -right-3 -bottom-3 opacity-5 text-slate-800 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.125 1.125 0 001.591 0l4.318-4.318a1.125 1.125 0 000-1.591l-9.581-9.581A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z" />
                </svg>
              </div>
              <div>
                <p className="m-0 text-2xs font-bold text-slate-400 uppercase tracking-wider">Kategori Sayısı</p>
                <h3 className="m-0 mt-1.5 text-2xl font-extrabold text-slate-900">{Math.max(0, categories.length - 1)}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
            <div className="lg:col-span-5 flex flex-col gap-6">
              <form className="panel p-6 flex flex-col gap-4 bg-white" onSubmit={saveItem}>
                <h3 className="m-0 text-base font-bold text-slate-800 border-b border-slate-100 pb-3">
                  {editingId ? "Stok Kartı Düzenle" : "Detaylı Ürün Ekle"}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <input className="field w-full text-sm" placeholder="SKU *" value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} />
                  <input className="field w-full text-sm" placeholder="Kategori" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
                </div>
                <p className="m-0 -mt-2 text-[11px] text-slate-400">SKU, POS ekranında barkod gibi kullanılır.</p>
                <input className="field w-full text-sm" placeholder="Ürün Adı *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="field w-full text-sm" placeholder="Marka (opsiyonel)" value={form.brand} onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))} />
                  <input className="field w-full text-sm" placeholder="Model (opsiyonel)" value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="field w-full text-sm" placeholder="Renk varyantı (opsiyonel)" value={form.variantColor} onChange={(e) => setForm((p) => ({ ...p, variantColor: e.target.value }))} />
                  <input className="field w-full text-sm" placeholder="Hafıza varyantı (örn: 128GB)" value={form.variantStorage} onChange={(e) => setForm((p) => ({ ...p, variantStorage: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="field w-full text-sm" placeholder="Seri Kodu (opsiyonel)" value={form.serialNumber} onChange={(e) => setForm((p) => ({ ...p, serialNumber: e.target.value }))} />
                  <input className="field w-full text-sm" placeholder="IMEI (opsiyonel)" value={form.imei} onChange={(e) => setForm((p) => ({ ...p, imei: e.target.value }))} />
                </div>
                <p className="m-0 -mt-2 text-[11px] text-slate-400">Seri kodu/IMEI alanları tekil cihaz takibi içindir, aksesuarlar için boş bırakılabilir.</p>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="m-0 mb-3 text-2xs font-bold uppercase tracking-wider text-slate-600">Fiyatlandirma ve Stok</p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-2xs font-semibold text-slate-600">Alis Fiyati (KDV Hariç)</label>
                      <input className="field w-full px-2 text-xs" type="number" min={0} step="0.01" placeholder="Alis Fiyati (KDV Hariç)" value={form.purchasePrice} onChange={(e) => setForm((p) => ({ ...p, purchasePrice: e.target.value }))} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-2xs font-semibold text-slate-600">Satis Fiyati (KDV Hariç)</label>
                      <input className="field w-full px-2 text-xs" type="number" min={0} step="0.01" placeholder="Satis Fiyati (KDV Hariç)" value={form.salePrice} onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-2xs font-semibold text-slate-600">KDV Orani</label>
                      <select className="field w-full px-2 text-xs" value={vatRateUi} onChange={(e) => setVatRateUi(e.target.value)}>
                        <option value="0">%0</option>
                        <option value="1">%1</option>
                        <option value="10">%10</option>
                        <option value="20">%20</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-2xs font-semibold text-slate-600">Stok Adedi</label>
                      <input className="field w-full px-2 text-xs" type="number" min={0} placeholder="Stok Adedi" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-2xs font-semibold text-slate-600">Minimum Stok</label>
                      <input className="field w-full px-2 text-xs" type="number" min={0} placeholder="Minimum Stok Uyari Esigi" value={form.minThreshold} onChange={(e) => setForm((p) => ({ ...p, minThreshold: e.target.value }))} />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-2xs text-slate-600 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                      Alis (KDV Dahil): <strong className="text-slate-800">{purchaseWithVatPreview.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</strong>
                    </div>
                    <div className="rounded-lg border border-teal-200 bg-teal-50/60 px-2.5 py-2">
                      Satis (KDV Dahil): <strong className="text-teal-800">{saleWithVatPreview.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</strong>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select className="field w-full text-xs" value={form.purchaseDocType} onChange={(e) => setForm((p) => ({ ...p, purchaseDocType: e.target.value }))}>
                    <option value="">Alım Belgesi Türü (opsiyonel)</option>
                    <option value="INVOICE">Fatura</option>
                    <option value="EXPENSE_SLIP">Gider Pusulası</option>
                    <option value="OTHER">Diğer</option>
                  </select>
                  <input className="field w-full text-sm" placeholder="Belge No (fatura no / pusula no)" value={form.purchaseDocNo} onChange={(e) => setForm((p) => ({ ...p, purchaseDocNo: e.target.value }))} />
                </div>
                <p className="m-0 -mt-2 text-[11px] text-slate-400">Alım belgesi bilgileri rapor ve maliyet denetimi için referans olarak saklanır.</p>
                <div className="flex gap-2.5 mt-2">
                  <button className="primary-btn flex-1 py-2.5 font-semibold text-sm cursor-pointer shadow-md shadow-teal-700/10 hover:shadow-teal-700/20" disabled={saving}>{saving ? "Kaydediliyor..." : editingId ? "Güncelle" : "Ürün Ekle"}</button>
                  <button type="button" className="field w-28 py-2.5 cursor-pointer font-medium text-slate-500 hover:text-slate-800" onClick={resetForm}>Temizle</button>
                </div>
              </form>

              {editingId && (
                <div className="panel p-6 flex flex-col gap-4 bg-white border border-slate-200">
                  <h3 className="m-0 text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Manuel Maliyet Düzeltme</h3>
                  <form className="flex flex-col gap-3" onSubmit={addCostEvent}>
                    <div className="grid grid-cols-2 gap-3">
                      <select className="field w-full text-xs" value={costEventType} onChange={(e) => setCostEventType(e.target.value)}>
                        <option value="PURCHASE_EXTERNAL">Dış Alım</option>
                        <option value="INTERNAL_SELL_TO_SERVICE">Teknik Servise İç Satış</option>
                        <option value="SERVICE_COST_LABOR">Servis İşçilik Maliyeti</option>
                        <option value="SERVICE_COST_PART">Servis Parça Maliyeti</option>
                        <option value="INTERNAL_BUYBACK_FROM_SERVICE">Servisten Mağazaya Geri Alım</option>
                        <option value="MANUAL_ADJUSTMENT">Manuel Düzeltme</option>
                      </select>
                      <input className="field w-full text-xs" type="number" min={0} step="0.01" placeholder="Tutar" value={costEventAmount} onChange={(e) => setCostEventAmount(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input className="field w-full text-xs" placeholder="Ref No (Fatura/Pusula)" value={costEventRef} onChange={(e) => setCostEventRef(e.target.value)} />
                      <input className="field w-full text-xs" placeholder="Kısa Açıklama/Not" value={costEventNote} onChange={(e) => setCostEventNote(e.target.value)} />
                    </div>
                    <button className="primary-btn w-full py-2 cursor-pointer font-semibold text-xs shadow-md">Hareket Ekle</button>
                  </form>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {costEvents.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">Henüz maliyet hareketi yok.</div>
                    ) : (
                      <table className="data-table text-xs">
                        <thead>
                          <tr>
                            <th>Tarih</th>
                            <th>Tip</th>
                            <th>Tutar</th>
                            <th>Delta</th>
                            <th>Birim Maliyet</th>
                          </tr>
                        </thead>
                        <tbody>
                          {costEvents.map((ev) => (
                            <tr key={ev.id}>
                              <td className="text-2xs text-slate-400 font-mono">{new Date(ev.createdAt).toLocaleDateString("tr-TR")}</td>
                              <td className="font-semibold text-slate-700">{getEventTypeName(ev.type)}</td>
                              <td>{Number(ev.amount).toLocaleString("tr-TR")} TL</td>
                              <td className={ev.costDelta > 0 ? "text-amber-600 font-semibold" : "text-slate-500"}>
                                {ev.costDelta > 0 ? `+${Number(ev.costDelta).toLocaleString("tr-TR")}` : `${Number(ev.costDelta).toLocaleString("tr-TR")}`} TL
                              </td>
                              <td className="font-bold text-slate-900">{Number(ev.unitCostAfter).toLocaleString("tr-TR")} TL</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 panel p-6 flex flex-col gap-4 bg-white">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input 
                    className="field w-full pl-9" 
                    placeholder="SKU, Ürün adı veya kategori ara..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  {categories.map((c) => {
                    const active = categoryFilter === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategoryFilter(c)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-200 shrink-0 cursor-pointer ${
                          active 
                            ? "bg-teal-700 border-teal-700 text-white shadow-sm" 
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                        }`}
                      >
                        {c === "ALL" ? "Tümü" : c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200/80 rounded-xl shadow-2xs max-h-[640px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">Kayıt bulunamadı.</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="sticky top-0 bg-slate-50 z-10 text-xs">SKU</th>
                        <th className="sticky top-0 bg-slate-50 z-10 text-xs">Ürün Detayı</th>
                        <th className="sticky top-0 bg-slate-50 z-10 text-xs">Kategori</th>
                        <th className="sticky top-0 bg-slate-50 z-10 text-xs">Miktar</th>
                        <th className="sticky top-0 bg-slate-50 z-10 text-xs">Maliyet / Satış</th>
                        <th className="sticky top-0 bg-slate-50 z-10 text-right text-xs">Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => {
                        const low = Number(item.quantity) <= Number(item.minThreshold);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="font-mono text-[11px] font-semibold text-slate-500">{item.sku}</td>
                            <td>
                              <div className="flex flex-col gap-0.5">
                                <strong className="text-slate-800 text-xs font-semibold">{item.name}</strong>
                                <span className="text-slate-400 text-2xs font-medium">
                                  {[item.brand, item.model, item.variantColor, item.variantStorage].filter(Boolean).join(" / ") || "-"}
                                </span>
                                {(item.serialNumber || item.imei) && (
                                  <span className="text-slate-400 text-[10px] font-mono mt-0.5 bg-slate-50 px-1 py-0.5 rounded border border-slate-100 w-fit">
                                    {item.serialNumber ? `SN: ${item.serialNumber}` : ""}{item.serialNumber && item.imei ? " | " : ""}{item.imei ? `IMEI: ${item.imei}` : ""}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="bg-slate-100 text-slate-600 text-2xs px-2 py-0.5 rounded font-semibold">
                                {item.category}
                              </span>
                            </td>
                            <td>
                              <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                                low ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100" : "text-teal-700"
                              }`}>
                                {item.quantity} adet
                                {low && <span className="text-[9px] font-normal text-rose-500">(Kritik)</span>}
                              </span>
                            </td>
                            <td>
                              <div className="flex flex-col text-2xs">
                                <span className="text-slate-500">Maliyet: <strong className="text-slate-700">{Number(item.purchasePrice).toLocaleString("tr-TR")} TL</strong></span>
                                <span className="text-teal-700">Satış: <strong>{Number(item.salePrice).toLocaleString("tr-TR")} TL</strong></span>
                              </div>
                            </td>
                            <td className="text-right">
                              <div className="flex gap-1 justify-end">
                                <button type="button" className="px-2 py-1 text-xs border border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 hover:text-slate-800 bg-white transition-colors cursor-pointer" onClick={() => startEdit(item)}>Düzenle</button>
                                <button
                                  type="button"
                                  className="px-2 py-1 text-xs border border-teal-200/50 hover:border-teal-300 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowBarcodeModal(true);
                                  }}
                                >
                                  Barkod
                                </button>
                                <button type="button" className="px-2 py-1 text-xs border border-rose-200/50 hover:border-rose-300 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer" onClick={() => void deleteItem(item.id)}>Sil</button>
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
        </>
      )}



      {/* Tab 3: Reports & Logs Dashboard */}
      {activeTab === "report" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Report Summary Cards */}
          <div className="panel p-6 flex flex-col gap-4 bg-white">
            <h3 className="m-0 text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
              Genel Envanter Değer Analizi
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="panel p-4 bg-slate-50/50 border-slate-200/50">
                <p className="m-0 text-2xs font-bold text-slate-400 uppercase tracking-wider">Toplam Ürün Adedi</p>
                <p className="m-0 mt-1 text-xl font-extrabold text-slate-900">{totalStockUnits.toLocaleString("tr-TR")}</p>
              </div>
              <div className="panel p-4 bg-slate-50/50 border-slate-200/50">
                <p className="m-0 text-2xs font-bold text-slate-400 uppercase tracking-wider">Toplam Envanter Maliyeti</p>
                <p className="m-0 mt-1 text-xl font-extrabold text-slate-900">{totalInventoryCost.toLocaleString("tr-TR")} TL</p>
              </div>
              <div className="panel p-4 bg-slate-50/50 border-slate-200/50">
                <p className="m-0 text-2xs font-bold text-slate-400 uppercase tracking-wider">Toplam Satış Değeri</p>
                <p className="m-0 mt-1 text-xl font-extrabold text-slate-900">{totalInventoryRetail.toLocaleString("tr-TR")} TL</p>
              </div>
              <div className="panel p-4 bg-slate-50/50 border-slate-200/50">
                <p className="m-0 text-2xs font-bold text-slate-400 uppercase tracking-wider">Tahmini Brüt Kâr Potansiyeli</p>
                <p className={`m-0 mt-1 text-xl font-extrabold ${totalInventoryRetail - totalInventoryCost >= 0 ? "text-teal-700" : "text-rose-600"}`}>
                  {(totalInventoryRetail - totalInventoryCost).toLocaleString("tr-TR")} TL
                </p>
              </div>
            </div>
            
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl max-h-60 overflow-y-auto">
              {inventoryByCategory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">Rapor için ürün verisi bulunamadı.</div>
              ) : (
                <table className="data-table text-xs">
                  <thead>
                    <tr>
                      <th className="sticky top-0 bg-slate-50 z-10">Kategori</th>
                      <th className="sticky top-0 bg-slate-50 z-10">Adet</th>
                      <th className="sticky top-0 bg-slate-50 z-10">Toplam Maliyet</th>
                      <th className="sticky top-0 bg-slate-50 z-10">Toplam Satış</th>
                      <th className="sticky top-0 bg-slate-50 z-10">Tahmini Brüt Kâr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryByCategory.map((row) => (
                      <tr key={row.category} className="hover:bg-slate-50/50">
                        <td className="font-semibold text-slate-800">{row.category}</td>
                        <td className="text-slate-600 font-semibold">{row.quantity.toLocaleString("tr-TR")}</td>
                        <td className="text-slate-600">{row.cost.toLocaleString("tr-TR")} TL</td>
                        <td className="text-slate-600">{row.retail.toLocaleString("tr-TR")} TL</td>
                        <td className={`font-bold ${row.profit >= 0 ? "text-teal-700" : "text-rose-600"}`}>{row.profit.toLocaleString("tr-TR")} TL</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Stock Movement Log Feed panel */}
          <div className="panel p-6 bg-white flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="m-0 text-base font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Stok Hareket Logları
              </h3>
              <span className="text-xs text-slate-400 font-mono">Son 50 işlem listeleniyor</span>
            </div>
            <div className="max-h-80 overflow-y-auto flex flex-col gap-2">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic border border-dashed border-slate-200 rounded-lg">Henüz hareket kaydı yok.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-150 flex-wrap gap-2 hover:border-slate-300 transition-colors text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        log.action === "STOCK_ADD" 
                          ? "bg-emerald-50 border border-emerald-100 text-emerald-600" 
                          : log.action === "STOCK_DELETE" 
                          ? "bg-rose-50 border border-rose-100 text-rose-600" 
                          : "bg-blue-50 border border-blue-100 text-blue-600"
                      }`}>
                        {log.action === "STOCK_ADD" ? "+" : log.action === "STOCK_DELETE" ? "-" : "~"}
                      </span>
                      <div>
                        <p className="m-0 text-slate-800 font-semibold">{log.detail}</p>
                        <p className="m-0 text-[10px] text-slate-400 font-mono mt-0.5">{new Date(log.createdAt).toLocaleString("tr-TR")}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barcode Modal Dialog */}
      {showBarcodeModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm grid place-items-center z-50 p-4 animate-fade-in">
          <div className="panel w-full max-w-sm p-6 border border-slate-200 shadow-2xl bg-white/95 backdrop-blur-md rounded-2xl flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="m-0 text-base font-bold text-slate-800">Barkod Sticker Önizleme</h3>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors w-8 h-8 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex justify-center items-center bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.4)_1px,transparent_1px)] bg-[size:10px_10px] opacity-20 pointer-events-none" />
              
              <div className="w-[280px] h-[168px] bg-white text-black rounded-lg p-3 flex flex-col justify-between shadow-lg box-border select-none relative z-10 border border-slate-250">
                <div className="text-[9px] font-black text-slate-800 uppercase tracking-widest border-b border-black pb-1 mb-1 font-mono">
                  SaaSTel İletişim
                </div>
                <div className="text-[10px] leading-tight font-bold text-slate-900 line-clamp-2 overflow-hidden h-[24px] font-sans">
                  {selectedItem.name}
                </div>
                <div className="flex flex-col items-center mt-1">
                  <div className="flex items-end h-[36px] w-full justify-center">
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
                          marginRight: `${((hash + i) % 2) + 1.2}px`
                        }} />
                      ) : null;
                    })}
                  </div>
                  <div className="text-[7.5px] font-mono mt-1.5 tracking-widest font-bold">
                    {selectedItem.sku}
                  </div>
                </div>
                <div className="flex justify-between items-end mt-1 border-t border-dotted border-slate-300 pt-1">
                  <span className="text-[7.5px] text-slate-500 font-semibold uppercase">{selectedItem.category || "Genel"}</span>
                  <span className="text-xs font-black text-slate-950">
                    {Number(selectedItem.salePrice).toLocaleString("tr-TR")} TL
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handlePrintSticker(selectedItem)}
                className="primary-btn flex-1 py-2.5 flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer shadow-lg shadow-teal-700/10 hover:shadow-teal-700/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-5a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                Yazdır
              </button>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="field w-28 py-2.5 font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}





