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
  const [activeTab, setActiveTab] = useState<"inventory" | "service-flow" | "report">("inventory");

  // Read tab parameter from URL on load and changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "service-flow" || tabParam === "inventory" || tabParam === "report") {
        setActiveTab(tabParam);
      } else {
        setActiveTab("inventory");
      }
    }
  }, [typeof window !== "undefined" ? window.location.search : ""]);

  const handleTabChange = (tab: "inventory" | "service-flow" | "report") => {
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

  // Cost Flow Wizard States
  const [selectedFlowItemId, setSelectedFlowItemId] = useState("");
  const [flowPartCost, setFlowPartCost] = useState("");
  const [flowPartNote, setFlowPartNote] = useState("");
  const [flowLaborCost, setFlowLaborCost] = useState("");
  const [flowLaborNote, setFlowLaborNote] = useState("");
  const [flowBuybackPrice, setFlowBuybackPrice] = useState(""); // Added Geri Satın Alım Fiyatı state
  const [flowSalePrice, setFlowSalePrice] = useState("");
  const [flowStatusLoading, setFlowStatusLoading] = useState(false);

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

  useEffect(() => {
    if (selectedFlowItemId) {
      void fetchCostEvents(selectedFlowItemId);
      const item = items.find((x) => x.id === selectedFlowItemId);
      if (item) {
        setFlowSalePrice(String(Number(item.salePrice || 0)));
      }
    } else {
      setCostEvents([]);
    }
  }, [selectedFlowItemId, items]);

  // Cost Flow Wizard Step Handlers
  async function handleFlowSendToService() {
    if (!selectedFlowItemId) return;
    setFlowStatusLoading(true);
    try {
      const res = await fetch(`/api/stock-items/${selectedFlowItemId}/cost-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INTERNAL_SELL_TO_SERVICE",
          amount: 0,
          note: "Cihaz onarım ve parça yenileme için teknik servise sevk edildi.",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "İşlem başarısız");
      toast.success("Cihaz başarıyla teknik servise sevk edildi.");
      await fetchItems();
      await fetchCostEvents(selectedFlowItemId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setFlowStatusLoading(false);
    }
  }

  async function handleFlowAddPartCost(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlowItemId) return;
    const amount = Number(flowPartCost || 0);
    if (!amount || amount <= 0) return toast.error("Geçerli bir yedek parça maliyeti girin.");
    setFlowStatusLoading(true);
    try {
      const res = await fetch(`/api/stock-items/${selectedFlowItemId}/cost-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SERVICE_COST_PART",
          amount,
          note: flowPartNote || "Yedek Parça Değişimi",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "İşlem başarısız");
      toast.success("Parça maliyeti eklendi ve birim maliyete yansıtıldı.");
      setFlowPartCost("");
      setFlowPartNote("");
      await fetchItems();
      await fetchCostEvents(selectedFlowItemId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setFlowStatusLoading(false);
    }
  }

  async function handleFlowAddLaborCost(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlowItemId) return;
    const amount = Number(flowLaborCost || 0);
    if (!amount || amount <= 0) return toast.error("Geçerli bir işçilik maliyeti girin.");
    setFlowStatusLoading(true);
    try {
      const res = await fetch(`/api/stock-items/${selectedFlowItemId}/cost-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SERVICE_COST_LABOR",
          amount,
          note: flowLaborNote || "Servis İşçilik Gideri",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "İşlem başarısız");
      toast.success("İşçilik maliyeti eklendi ve birim maliyete yansıtıldı.");
      setFlowLaborCost("");
      setFlowLaborNote("");
      await fetchItems();
      await fetchCostEvents(selectedFlowItemId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setFlowStatusLoading(false);
    }
  }

  async function handleFlowBuybackFromService(targetPrice?: number) {
    if (!selectedFlowItemId) return;
    const selectedItem = items.find((x) => x.id === selectedFlowItemId);
    if (!selectedItem) return;

    const currentCost = Number(selectedItem.purchasePrice);
    let amount = 0;
    let note = "Cihaz onarımı tamamlanarak vitrin/mağaza stoğuna geri alındı.";

    if (targetPrice && targetPrice > currentCost) {
      amount = targetPrice - currentCost;
      note = `Teknik servisten geri satın alındı. Servis onarım bedeli maliyete yansıtıldı. (Geri Alım: ${targetPrice.toLocaleString("tr-TR")} TL)`;
    }

    setFlowStatusLoading(true);
    try {
      const res = await fetch(`/api/stock-items/${selectedFlowItemId}/cost-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INTERNAL_BUYBACK_FROM_SERVICE",
          amount,
          note,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "İşlem başarısız");
      toast.success("Cihaz başarıyla mağaza satış stoğuna geri alındı.");
      setFlowBuybackPrice("");
      await fetchItems();
      await fetchCostEvents(selectedFlowItemId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setFlowStatusLoading(false);
    }
  }

  async function handleFlowUpdateSalePrice(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlowItemId) return;
    const salePrice = Number(flowSalePrice || 0);
    if (!salePrice || salePrice <= 0) return toast.error("Geçerli bir satış fiyatı girin.");
    const selectedItem = items.find((i) => i.id === selectedFlowItemId);
    if (!selectedItem) return;

    setFlowStatusLoading(true);
    try {
      const res = await fetch(`/api/stock-items/${selectedFlowItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: selectedItem.sku,
          name: selectedItem.name,
          category: selectedItem.category,
          brand: selectedItem.brand,
          model: selectedItem.model,
          variantColor: selectedItem.variantColor,
          variantStorage: selectedItem.variantStorage,
          serialNumber: selectedItem.serialNumber,
          imei: selectedItem.imei,
          quantity: selectedItem.quantity,
          purchasePrice: selectedItem.purchasePrice,
          salePrice,
          minThreshold: selectedItem.minThreshold,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "İşlem başarısız");
      toast.success("Cihaz satış fiyatı başarıyla güncellendi.");
      await fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setFlowStatusLoading(false);
    }
  }

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

  const selectedFlowItem = useMemo(() => {
    return items.find((x) => x.id === selectedFlowItemId) || null;
  }, [items, selectedFlowItemId]);

  const flowStepsStatus = useMemo(() => {
    if (!selectedFlowItem) return { step1: "pending", step2: "pending", step3: "pending" };
    
    const hasSentToService = costEvents.some(ev => ev.type === "INTERNAL_SELL_TO_SERVICE");
    const hasBuyback = costEvents.some(ev => ev.type === "INTERNAL_BUYBACK_FROM_SERVICE");
    
    return {
      step1: hasSentToService ? "completed" : "active",
      step2: hasBuyback ? "completed" : (hasSentToService ? "active" : "pending"),
      step3: hasBuyback ? "active" : "pending",
    };
  }, [selectedFlowItem, costEvents]);

  const flowTotals = useMemo(() => {
    if (!selectedFlowItem) return { initial: 0, addedCost: 0, total: 0, sale: 0, profit: 0, margin: 0 };
    
    const buybackEvent = costEvents.find((e) => e.type === "INTERNAL_BUYBACK_FROM_SERVICE");
    const total = Number(selectedFlowItem.purchasePrice);
    
    const addedCost = buybackEvent ? Number(buybackEvent.amount) : costEvents
      .filter((e) => e.type === "SERVICE_COST_PART" || e.type === "SERVICE_COST_LABOR")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const initial = Math.max(0, total - addedCost);
    const sale = Number(selectedFlowItem.salePrice);
    const profit = sale - total;
    const margin = total > 0 ? (profit / total) * 100 : 0;
    
    return {
      initial,
      addedCost,
      total,
      sale,
      profit,
      margin,
    };
  }, [selectedFlowItem, costEvents]);

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
          onClick={() => handleTabChange("service-flow")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === "service-flow"
              ? "border-teal-700 text-teal-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" /></svg>
          İç Servis & Maliyet Döngüsü
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
                <div className="grid grid-cols-4 gap-2">
                  <input className="field w-full px-2 text-xs" type="number" min={0} placeholder="Adet" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
                  <input className="field w-full px-2 text-xs" type="number" min={0} step="0.01" placeholder="Alış Fiyatı" value={form.purchasePrice} onChange={(e) => setForm((p) => ({ ...p, purchasePrice: e.target.value }))} />
                  <input className="field w-full px-2 text-xs" type="number" min={0} step="0.01" placeholder="Satış Fiyatı" value={form.salePrice} onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))} />
                  <input className="field w-full px-2 text-xs" type="number" min={0} placeholder="Min Stok" value={form.minThreshold} onChange={(e) => setForm((p) => ({ ...p, minThreshold: e.target.value }))} />
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

      {/* Tab 2: Internal Service & Repair Cost Flow Wizard */}
      {activeTab === "service-flow" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          {/* Main Flow Stepper and Controls */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Device Selector Panel */}
            <div className="panel p-5 bg-white flex flex-col gap-3">
              <h3 className="m-0 text-sm font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                İşlem Yapılacak Cihaz / Ürün Seçimi
              </h3>
              <p className="m-0 text-slate-500 text-xs">İç servis sevkiyat ve geri satın alım döngüsünü başlatmak için cihaz seçin.</p>
              
              <select
                className="field w-full cursor-pointer text-sm font-medium mt-1.5"
                value={selectedFlowItemId}
                onChange={(e) => setSelectedFlowItemId(e.target.value)}
              >
                <option value="">-- Cihaz / Ürün Seçin --</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) {item.imei ? `- IMEI: ${item.imei}` : ""} - Maliyet: {Number(item.purchasePrice).toLocaleString("tr-TR")} TL
                  </option>
                ))}
              </select>
            </div>

            {selectedFlowItem ? (
              <>
                {/* Visual Flowchart Stepper */}
                <div className="panel p-6 bg-slate-50/50 border-slate-200/50 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-radial-gradient(circle_at_top_right,rgba(15,118,110,0.05),transparent) pointer-events-none" />
                  
                  {[
                    { label: "İç Servise Sevk", desc: "Servise Gönderme/Satış", status: flowStepsStatus.step1 },
                    { label: "Servisten Geri Satın Al", desc: "Maliyet Güncelleme", status: flowStepsStatus.step2 },
                    { label: "Vitrin Listeleme", desc: "Satış Fiyatı Belirle", status: flowStepsStatus.step3 }
                  ].map((step, idx) => {
                    const isCompleted = step.status === "completed";
                    const isActive = step.status === "active";
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center text-center relative z-10 w-full md:w-auto">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border ${
                          isCompleted 
                            ? "bg-teal-50 border-teal-500 text-teal-700 shadow-md shadow-teal-500/10" 
                            : isActive 
                            ? "bg-teal-700 border-teal-700 text-white shadow-lg shadow-teal-700/20 animate-pulse font-bold" 
                            : "bg-slate-100 border-slate-200 text-slate-400"
                        }`}>
                          {isCompleted ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div className="mt-2.5">
                          <p className={`m-0 text-xs font-bold ${isActive ? "text-teal-700" : isCompleted ? "text-slate-800" : "text-slate-400"}`}>{step.label}</p>
                          <p className="m-0 text-[10px] text-slate-400 font-medium mt-0.5">{step.desc}</p>
                        </div>
                        {idx < 2 && (
                          <div className="hidden md:block absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-[2px] bg-slate-200 -z-10">
                            <div className={`h-full transition-all duration-500 ${
                              isCompleted ? "bg-teal-500 w-full" : "bg-transparent w-0"
                            }`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Step Action Cards Stack */}
                <div className="flex flex-col gap-4">
                  {/* Step 1: İç Servise Sevk */}
                  <div className={`panel p-5 bg-white border transition-all duration-300 relative ${
                    flowStepsStatus.step1 === "completed" 
                      ? "border-slate-200 bg-slate-50/20" 
                      : "border-teal-700/40 shadow-sm shadow-teal-500/5 bg-white"
                  }`}>
                    <div className="flex gap-3 items-start">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        flowStepsStatus.step1 === "completed" 
                          ? "bg-teal-50 text-teal-700 border border-teal-100" 
                          : "bg-teal-700 text-white animate-pulse"
                      }`}>1</div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <h4 className="m-0 text-sm font-bold text-slate-800">
                            1. Adım: Cihazı İç Servise Sevk Et (Sat)
                          </h4>
                          {flowStepsStatus.step1 === "completed" ? (
                            <span className="text-teal-700 bg-teal-50 border border-teal-200 text-2xs font-semibold px-2.5 py-0.5 rounded-full">
                              ✓ Sevk Edildi
                            </span>
                          ) : (
                            <span className="text-teal-700 bg-teal-50 border border-teal-200 text-2xs font-semibold px-2.5 py-0.5 rounded-full animate-pulse">
                              ● Gönderim Bekliyor
                            </span>
                          )}
                        </div>
                        <p className="m-0 text-slate-400 text-xs mt-0.5">Cihazın onarım için kendi teknik servisinize çıkış işlemini onaylayın.</p>
                        
                        <div className="flex gap-4 mt-3 text-xs">
                          <div>
                            <span className="text-slate-400">Başlangıç Maliyeti:</span> <strong className="text-slate-700">{flowTotals.initial.toLocaleString("tr-TR")} TL</strong>
                          </div>
                        </div>

                        {flowStepsStatus.step1 === "active" && (
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={handleFlowSendToService}
                              disabled={flowStatusLoading}
                              className="primary-btn px-4 py-2 text-xs font-semibold cursor-pointer shadow-md shadow-teal-700/10"
                            >
                              {flowStatusLoading ? "Sevk Ediliyor..." : "Cihazı İç Servise Sat (Sevk Et)"}
                            </button>
                          </div>
                        )}
                        {flowStepsStatus.step1 === "completed" && (
                          <div className="text-[11px] text-slate-500 mt-2 bg-slate-100/50 p-2 rounded-lg border border-slate-200/50 w-fit">
                            ℹ️ Cihaz teknik servise sevk edildi.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Servisten Geri Satın Al */}
                  <div className={`panel p-5 bg-white border transition-all duration-300 relative ${
                    flowStepsStatus.step2 === "completed" 
                      ? "border-slate-200 bg-slate-50/20" 
                      : flowStepsStatus.step2 === "active" 
                      ? "border-teal-700/40 shadow-sm shadow-teal-500/5 bg-white" 
                      : "opacity-60 bg-slate-50/50"
                  }`}>
                    <div className="flex gap-3 items-start">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        flowStepsStatus.step2 === "completed" 
                          ? "bg-teal-50 text-teal-700 border border-teal-100" 
                          : flowStepsStatus.step2 === "active" 
                          ? "bg-teal-700 text-white animate-pulse" 
                          : "bg-slate-100 text-slate-400"
                      }`}>2</div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <h4 className="m-0 text-sm font-bold text-slate-800">
                            2. Adım: Cihazı Teknik Servisten Geri Satın Al
                          </h4>
                          {flowStepsStatus.step2 === "completed" ? (
                            <span className="text-teal-700 bg-teal-50 border border-teal-200 text-2xs font-semibold px-2.5 py-0.5 rounded-full">
                              ✓ Geri Alındı
                            </span>
                          ) : flowStepsStatus.step2 === "active" ? (
                            <span className="text-teal-700 bg-teal-50 border border-teal-200 text-2xs font-semibold px-2.5 py-0.5 rounded-full animate-pulse">
                              ● Geri Alım Bekliyor
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 border border-slate-200 text-2xs font-semibold px-2.5 py-0.5 rounded-full">
                              🔒 Kilitli
                            </span>
                          )}
                        </div>
                        <p className="m-0 text-slate-400 text-xs mt-0.5">Teknik servisin onararak size geri sattığı fiyatı girin. Aradaki fark otomatik olarak cihaz maliyetine eklenecektir.</p>

                        {(flowStepsStatus.step2 === "active" || flowStepsStatus.step2 === "completed") && (
                          <div className="mt-4 flex flex-col gap-3">
                            {flowStepsStatus.step2 === "active" && (
                              <div className="flex gap-3 items-end max-w-md">
                                <div className="flex-1 flex flex-col gap-1">
                                  <span className="text-slate-700 text-xs font-bold">Geri Satın Alma Fiyatı (TL)</span>
                                  <input
                                    type="number"
                                    min={Number(selectedFlowItem.purchasePrice)}
                                    className="field text-xs w-full py-2"
                                    placeholder="Örn: 32000"
                                    value={flowBuybackPrice}
                                    onChange={(e) => setFlowBuybackPrice(e.target.value)}
                                    disabled={flowStatusLoading}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleFlowBuybackFromService(Number(flowBuybackPrice))}
                                  disabled={flowStatusLoading || !flowBuybackPrice}
                                  className="primary-btn py-2 px-4 text-xs font-bold cursor-pointer"
                                >
                                  {flowStatusLoading ? "İşlem yapılıyor..." : "Geri Satın Al"}
                                </button>
                              </div>
                            )}

                            {flowStepsStatus.step2 === "completed" && (
                              <div className="text-xs text-slate-600 bg-slate-100/50 p-2.5 rounded-lg border border-slate-200/50 w-fit flex flex-col gap-1">
                                <div>Geri Satın Alma Bedeli: <strong>{flowTotals.total.toLocaleString("tr-TR")} TL</strong></div>
                                <div>Yansıyan Servis Maliyeti: <strong className="text-amber-700">+{flowTotals.addedCost.toLocaleString("tr-TR")} TL</strong></div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Vitrin Listeleme Fiyatı */}
                  <div className={`panel p-5 bg-white border transition-all duration-300 relative ${
                    flowStepsStatus.step3 === "completed" 
                      ? "border-slate-200 bg-slate-50/20" 
                      : flowStepsStatus.step3 === "active" 
                      ? "border-teal-700/40 shadow-sm shadow-teal-500/5 bg-white" 
                      : "opacity-60 bg-slate-50/50"
                  }`}>
                    <div className="flex gap-3 items-start">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        flowStepsStatus.step3 === "completed" 
                          ? "bg-teal-50 text-teal-700 border border-teal-100" 
                          : flowStepsStatus.step3 === "active" 
                          ? "bg-teal-700 text-white animate-pulse" 
                          : "bg-slate-100 text-slate-400"
                      }`}>3</div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <h4 className="m-0 text-sm font-bold text-slate-800">
                            3. Adım: Vitrin Satış Fiyatı Belirle & Listele
                          </h4>
                          {flowStepsStatus.step3 === "active" ? (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 text-2xs font-semibold px-2.5 py-0.5 rounded-full animate-pulse">
                              ✎ Fiyat Belirleme Aktif
                            </span>
                          ) : flowStepsStatus.step3 === "completed" ? (
                            <span className="text-teal-700 bg-teal-50 border border-teal-200 text-2xs font-semibold px-2.5 py-0.5 rounded-full">
                              ✓ Satışta / Vitrinde
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 border border-slate-200 text-2xs font-semibold px-2.5 py-0.5 rounded-full">
                              🔒 Kilitli
                            </span>
                          )}
                        </div>
                        <p className="m-0 text-slate-400 text-xs mt-0.5">Onarılmış cihazın vitrinde yer alacağı nihai perakende liste satış fiyatını belirleyin.</p>

                        {(flowStepsStatus.step3 === "active" || flowStepsStatus.step3 === "completed") && (
                          <div className="mt-4 flex flex-col gap-4">
                            <form onSubmit={handleFlowUpdateSalePrice} className="flex gap-3 items-end max-w-md">
                              <div className="flex-1 flex flex-col gap-1.5">
                                <span className="text-slate-700 text-xs font-bold">Vitrin Satış Fiyatı (TL)</span>
                                <input
                                  type="number"
                                  min={1}
                                  className="field text-xs w-full py-2"
                                  placeholder="Satış Fiyatı girin..."
                                  value={flowSalePrice}
                                  onChange={(e) => setFlowSalePrice(e.target.value)}
                                  disabled={flowStatusLoading}
                                />
                              </div>
                              <button
                                type="submit"
                                className="primary-btn py-2 px-4 text-xs font-bold cursor-pointer"
                                disabled={flowStatusLoading}
                              >
                                Fiyatı Güncelle & Listele
                              </button>
                            </form>

                            {/* Margin and Profit analysis */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border border-slate-200 p-3 rounded-lg bg-slate-50/50 text-xs">
                              <div>
                                <span className="text-slate-400">Nihai Maliyet:</span>
                                <p className="m-0 text-slate-700 font-bold mt-0.5">{flowTotals.total.toLocaleString("tr-TR")} TL</p>
                              </div>
                              <div>
                                <span className="text-slate-400">Belirlenen Satış:</span>
                                <p className="m-0 text-slate-700 font-bold mt-0.5">{flowTotals.sale.toLocaleString("tr-TR")} TL</p>
                              </div>
                              <div className="col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-3">
                                <span className="text-slate-400">Net Kâr Potansiyeli:</span>
                                <p className={`m-0 font-extrabold mt-0.5 ${flowTotals.profit >= 0 ? "text-teal-700" : "text-rose-600"}`}>
                                  {flowTotals.profit.toLocaleString("tr-TR")} TL (%{flowTotals.margin.toFixed(1)})
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="panel p-12 text-center bg-white flex flex-col items-center justify-center border border-slate-200">
                <svg className="w-16 h-16 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <h4 className="m-0 text-slate-700 font-bold">Cihaz Seçilmedi</h4>
                <p className="m-0 text-slate-400 text-xs mt-1 max-w-sm">İç servis döngüsünü, maliyet akışını ve kârlılık grafiklerini görüntülemek için yukarıdaki menüden bir stok kartı seçin.</p>
              </div>
            )}
          </div>

          {/* Right Column: Financial Summary Card & Timeline */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {selectedFlowItem && (
              <>
                {/* Cost Breakdown Card */}
                <div className="panel bg-gradient-to-tr from-slate-900 to-indigo-950 text-white border-0 shadow-xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-radial-gradient(circle_at_top_right,rgba(15,118,110,0.15),transparent) pointer-events-none" />
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
                  
                  <div className="p-5 flex flex-col gap-4">
                    <div className="border-b border-white/10 pb-3">
                      <span className="text-[10px] text-teal-300 font-black uppercase tracking-wider">{selectedFlowItem.category || "Cihaz"}</span>
                      <h3 className="m-0 text-base font-black text-white mt-0.5 line-clamp-1">{selectedFlowItem.name}</h3>
                      <p className="m-0 text-[10px] text-slate-400 font-mono mt-0.5">SKU: {selectedFlowItem.sku}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs text-slate-350">
                        <span>Dış Satın Alım Maliyeti:</span>
                        <span className="font-bold text-white">{flowTotals.initial.toLocaleString("tr-TR")} TL</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-350">
                        <span>İç Servis Ek Maliyeti:</span>
                        <span className="font-bold text-amber-400">+ {flowTotals.addedCost.toLocaleString("tr-TR")} TL</span>
                      </div>
                      <div className="border-t border-white/10 my-1.5" />
                      <div className="flex justify-between text-xs text-slate-200">
                        <span className="font-semibold">Birikimli Birim Maliyet:</span>
                        <span className="font-extrabold text-white text-sm">{flowTotals.total.toLocaleString("tr-TR")} TL</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-200">
                        <span className="font-semibold">Etiket Satış Fiyatı:</span>
                        <span className="font-extrabold text-teal-300 text-sm">{flowTotals.sale.toLocaleString("tr-TR")} TL</span>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 mt-1.5">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Potansiyel Net Kâr</span>
                          <h4 className={`m-0 text-lg font-black ${flowTotals.profit >= 0 ? "text-teal-400" : "text-rose-400"}`}>
                            {flowTotals.profit.toLocaleString("tr-TR")} TL
                          </h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          flowTotals.profit >= 0 
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/30" 
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}>
                          %{flowTotals.margin.toFixed(1)} Marj
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chronological Cost Timeline */}
                <div className="panel p-5 bg-white border border-slate-200 flex flex-col gap-4">
                  <h3 className="m-0 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Maliyet Akış Zaman Tüneli
                  </h3>
                  
                  <div className="flex flex-col relative pl-4 border-l border-slate-200 ml-2 gap-5 py-1">
                    {costEvents.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">Maliyet hareketi kaydı bulunamadı.</div>
                    ) : (
                      costEvents.map((ev) => (
                        <div key={ev.id} className="relative">
                          {/* Dot marker */}
                          <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-400" />
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-400 font-mono">{new Date(ev.createdAt).toLocaleString("tr-TR")}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getEventTypeColor(ev.type)}`}>
                                {getEventTypeName(ev.type)}
                              </span>
                              {ev.amount > 0 && (
                                <span className="text-xs font-bold text-slate-800">
                                  {Number(ev.amount).toLocaleString("tr-TR")} TL
                                </span>
                              )}
                            </div>
                            {ev.note && <p className="m-0 text-xs text-slate-600 font-medium">{ev.note}</p>}
                            {ev.referenceNo && (
                              <span className="text-[10px] text-slate-400 font-mono">Ref No: {ev.referenceNo}</span>
                            )}
                            <div className="text-[10px] text-slate-500 font-medium border-t border-slate-100 pt-1.5 mt-0.5">
                              Yeni Birim Maliyet: <strong className="text-slate-800">{Number(ev.unitCostAfter).toLocaleString("tr-TR")} TL</strong>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
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
