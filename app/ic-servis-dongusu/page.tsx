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

export default function InternalServiceFlowPage() {
  const serviceOperationOptions = [
    "Ekran değişti",
    "Kasa değişti",
    "Pil değişti",
    "Anakart değişti",
    "Arka kapak değişti",
    "Kamera değişti",
    "Şarj soketi değişti",
  ] as const;

  const [items, setItems] = useState<StockItem[]>([]);
  const [inServiceItems, setInServiceItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [costEvents, setCostEvents] = useState<StockCostEvent[]>([]);
  const [flowBuybackPrice, setFlowBuybackPrice] = useState("");
  const [flowServiceOperations, setFlowServiceOperations] = useState<string[]>([]);
  const [flowServiceNote, setFlowServiceNote] = useState("");
  const [flowSalePrice, setFlowSalePrice] = useState("");
  const [flowStatusLoading, setFlowStatusLoading] = useState(false);

  // Stats tab / filter
  const [statusFilter, setStatusFilter] = useState<"ALL" | "IN_SERVICE" | "COMPLETED" | "READY">("ALL");

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

  async function fetchInServiceItems() {
    try {
      const res = await fetch("/api/stock-items/in-service");
      const json = await res.json();
      setInServiceItems(Array.isArray(json) ? json : []);
    } catch {
      setInServiceItems([]);
    }
  }

  async function fetchCostEvents(itemId: string) {
    try {
      const res = await fetch(`/api/stock-items/${itemId}/cost-events`);
      const json = await res.json();
      setCostEvents(Array.isArray(json.events) ? json.events : []);
    } catch {
      setCostEvents([]);
    }
  }

  useEffect(() => {
    void fetchItems();
    void fetchInServiceItems();
  }, []);

  useEffect(() => {
    if (selectedItemId) {
      void fetchCostEvents(selectedItemId);
      const item = items.find((x) => x.id === selectedItemId);
      if (item) {
        setFlowSalePrice(String(Number(item.salePrice || 0)));
      }
      setFlowServiceOperations([]);
      setFlowServiceNote("");
    } else {
      setCostEvents([]);
      setFlowServiceOperations([]);
      setFlowServiceNote("");
    }
  }, [selectedItemId, items]);

  const selectedItem = useMemo(() => {
    return items.find((x) => x.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // Stepper calculations
  const flowStepsStatus = useMemo(() => {
    if (!selectedItem) return { step1: "pending", step2: "pending", step3: "pending" };
    
    const hasSentToService = costEvents.some(ev => ev.type === "INTERNAL_SELL_TO_SERVICE");
    const hasBuyback = costEvents.some(ev => ev.type === "INTERNAL_BUYBACK_FROM_SERVICE");
    
    return {
      step1: hasSentToService ? "completed" : "active",
      step2: hasBuyback ? "completed" : (hasSentToService ? "active" : "pending"),
      step3: hasBuyback ? "active" : "pending",
    };
  }, [selectedItem, costEvents]);

  const flowTotals = useMemo(() => {
    if (!selectedItem) return { initial: 0, addedCost: 0, total: 0, sale: 0, profit: 0, margin: 0 };
    
    const buybackEvent = costEvents.find((e) => e.type === "INTERNAL_BUYBACK_FROM_SERVICE");
    const total = Number(selectedItem.purchasePrice);
    
    const addedCost = buybackEvent ? Number(buybackEvent.amount) : costEvents
      .filter((e) => e.type === "SERVICE_COST_PART" || e.type === "SERVICE_COST_LABOR")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const initial = Math.max(0, total - addedCost);
    const sale = Number(selectedItem.salePrice);
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
  }, [selectedItem, costEvents]);

  // Actions
  async function handleSendToService() {
    if (!selectedItemId) return;

    setFlowStatusLoading(true);
    try {
      const res = await fetch(`/api/stock-items/${selectedItemId}/cost-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INTERNAL_SELL_TO_SERVICE",
          amount: 0,
          note: "Cihaz onarım ve parça yenileme için teknik servise sevk edildi. (İç Satış)",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "İşlem başarısız");
      toast.success("Cihaz başarıyla teknik servise sevk edildi.");
      await fetchItems();
      await fetchInServiceItems();
      await fetchCostEvents(selectedItemId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setFlowStatusLoading(false);
    }
  }

  async function handleBuybackFromService(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItemId) return;
    const targetPrice = Number(flowBuybackPrice || 0);
    if (!targetPrice || targetPrice <= 0) return toast.error("Geçerli bir geri alım fiyatı girin.");

    const selectedItem = items.find((x) => x.id === selectedItemId);
    if (!selectedItem) return;

    const currentCost = Number(selectedItem.purchasePrice);
    let amount = 0;
    let note = "Cihaz onarımı tamamlanarak vitrin/mağaza stoğuna geri alındı.";

    if (targetPrice > currentCost) {
      amount = targetPrice - currentCost;
      note = `Teknik servisten geri satın alındı. Servis onarım bedeli maliyete yansıtıldı. (Geri Alım: ${targetPrice.toLocaleString("tr-TR")} TL)`;
    } else {
      toast.error(`Geri alım fiyatı, mevcut maliyetten (${currentCost.toLocaleString("tr-TR")} TL) düşük olamaz.`);
      return;
    }

    const detailLines: string[] = [];
    if (flowServiceOperations.length > 0) {
      detailLines.push(`Yapılan İşlemler: ${flowServiceOperations.join(", ")}`);
    }
    if (flowServiceNote.trim()) {
      detailLines.push(`Servis Notu: ${flowServiceNote.trim()}`);
    }
    if (detailLines.length > 0) {
      note = `${note}\n${detailLines.join("\n")}`;
    }

    setFlowStatusLoading(true);
    try {
      const res = await fetch(`/api/stock-items/${selectedItemId}/cost-events`, {
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
      setFlowServiceOperations([]);
      setFlowServiceNote("");
      await fetchItems();
      await fetchInServiceItems();
      await fetchCostEvents(selectedItemId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setFlowStatusLoading(false);
    }
  }

  function handleToggleServiceOperation(operation: string) {
    setFlowServiceOperations((prev) =>
      prev.includes(operation) ? prev.filter((item) => item !== operation) : [...prev, operation],
    );
  }

  async function handleUpdateSalePrice(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItemId) return;
    const salePrice = Number(flowSalePrice || 0);
    if (!salePrice || salePrice <= 0) return toast.error("Geçerli bir satış fiyatı girin.");
    const selectedItem = items.find((i) => i.id === selectedItemId);
    if (!selectedItem) return;

    setFlowStatusLoading(true);
    try {
      const res = await fetch(`/api/stock-items/${selectedItemId}`, {
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

      await fetch(`/api/stock-items/${selectedItemId}/cost-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MANUAL_ADJUSTMENT",
          amount: 0,
          note: "__INTERNAL_SERVICE_STEP3_COMPLETED__ Vitrin listeleme tamamlandı.",
        }),
      });

      toast.success("Cihaz satış fiyatı başarıyla güncellendi.");
      await fetchItems();
      await fetchInServiceItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setFlowStatusLoading(false);
    }
  }

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      // Filter by search query
      const matchesSearch = !query || `${item.sku} ${item.name} ${item.brand || ""} ${item.model || ""} ${item.imei || ""} ${item.serialNumber || ""}`
        .toLowerCase()
        .includes(query);

      return matchesSearch;
    });
  }, [items, searchQuery]);

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
      {/* Header */}
      <div>
        <h2 className="page-title m-0">İç Servis & Maliyet Döngüsü</h2>
        <p className="text-slate-500 text-xs md:text-sm m-0 mt-1">
          Kendi teknik servisiniz üzerinden satın aldığınız, onardığınız ve mağaza vitrinine taşıdığınız cihazların maliyet takibi.
        </p>
      </div>

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Device Selection and List */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="panel p-4 bg-amber-50/50 border border-amber-200/70 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-xs font-bold text-amber-900">Teknik Servisteki Cihazlar</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {inServiceItems.length} Adet
              </span>
            </div>
            {inServiceItems.length === 0 ? (
              <p className="m-0 text-[11px] text-amber-700/80">Şu an serviste bekleyen cihaz yok.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                {inServiceItems.slice(0, 8).map((item) => (
                  <button
                    key={`service-${item.id}`}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    className={`text-left rounded-lg border px-2.5 py-2 text-[11px] transition-colors cursor-pointer ${
                      selectedItemId === item.id
                        ? "bg-white border-amber-400"
                        : "bg-white/70 border-amber-200 hover:bg-white"
                    }`}
                  >
                    <div className="font-semibold text-slate-800 line-clamp-1">{item.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono line-clamp-1">{item.sku}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="panel p-5 bg-white flex flex-col gap-3">
            <h3 className="m-0 text-sm font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Cihaz Arama & Seçim
            </h3>
            
            <input
              type="text"
              className="field w-full text-xs"
              placeholder="SKU, IMEI, Model veya Cihaz Adı ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] border border-slate-100 rounded-xl p-1.5 bg-slate-50/30">
              {loading ? (
                <div className="p-4 text-center text-xs text-slate-400">Yükleniyor...</div>
              ) : filteredItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">Cihaz bulunamadı.</div>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = item.id === selectedItemId;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-teal-50/50 border-teal-500 shadow-sm"
                          : "bg-white border-slate-200/60 hover:bg-slate-50 hover:border-slate-350"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1 w-full">
                        <span className="font-bold text-slate-800 text-xs line-clamp-2 leading-tight">
                          {item.name}
                        </span>
                        <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                          {item.sku}
                        </span>
                      </div>
                      
                      {item.imei && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          IMEI: {item.imei}
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-100/60 w-full mt-0.5">
                        <span className="text-slate-500">Maliyet: <strong className="text-slate-700">{Number(item.purchasePrice).toLocaleString("tr-TR")} TL</strong></span>
                        <span className="text-teal-700 font-semibold">Satış: {Number(item.salePrice).toLocaleString("tr-TR")} TL</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Columns: Main Flow Stepper & Financials */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {selectedItem ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Stepper Card */}
              <div className="md:col-span-7 flex flex-col gap-6">
                {/* Product Detail Card */}
                <div className="panel p-5 bg-white border border-slate-200">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="m-0 text-sm font-bold text-slate-800">{selectedItem.name}</h3>
                      <p className="m-0 text-[10px] text-slate-400 mt-1 font-mono">SKU: {selectedItem.sku} {selectedItem.imei ? `| IMEI: ${selectedItem.imei}` : ""}</p>
                    </div>
                    <button
                      onClick={() => setSelectedItemId("")}
                      className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                    >
                      Kapat ✕
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                    <div>Kategori: <strong className="text-slate-700">{selectedItem.category}</strong></div>
                    {selectedItem.brand && <div>Marka: <strong className="text-slate-700">{selectedItem.brand}</strong></div>}
                    {selectedItem.model && <div>Model: <strong className="text-slate-700">{selectedItem.model}</strong></div>}
                  </div>
                </div>

                {/* Visual Flowchart Stepper */}
                <div className="panel p-6 bg-slate-50/50 border-slate-200/50 rounded-2xl flex justify-between items-center gap-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-radial-gradient(circle_at_top_right,rgba(15,118,110,0.05),transparent) pointer-events-none" />
                  
                  {[
                    { label: "İç Servise Sevk", desc: "Servise Gönderme/Satış", status: flowStepsStatus.step1 },
                    { label: "Servisten Geri Al", desc: "Maliyet Güncelleme", status: flowStepsStatus.step2 },
                    { label: "Vitrin Listeleme", desc: "Satış Fiyatı Belirle", status: flowStepsStatus.step3 }
                  ].map((step, idx) => {
                    const isCompleted = step.status === "completed";
                    const isActive = step.status === "active";
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center text-center relative z-10 w-full">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border ${
                          isCompleted 
                            ? "bg-teal-50 border-teal-500 text-teal-700 shadow-md shadow-teal-500/10" 
                            : isActive 
                            ? "bg-teal-700 border-teal-700 text-white shadow-lg shadow-teal-700/20 animate-pulse font-bold" 
                            : "bg-slate-100 border-slate-200 text-slate-400"
                        }`}>
                          {isCompleted ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div className="mt-2.5">
                          <p className={`m-0 text-[11px] font-bold ${isActive ? "text-teal-700" : isCompleted ? "text-slate-800" : "text-slate-400"}`}>{step.label}</p>
                          <p className="m-0 text-[9px] text-slate-400 mt-0.5">{step.desc}</p>
                        </div>
                        {idx < 2 && (
                          <div className="hidden md:block absolute top-[18px] left-[calc(50%+18px)] right-[calc(-50%+18px)] h-[1.5px] bg-slate-200 -z-10">
                            <div className={`h-full transition-all duration-500 ${
                              isCompleted ? "bg-teal-500 w-full" : "bg-transparent w-0"
                            }`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Step Actions Panel */}
                <div className="flex flex-col gap-4">
                  {/* Step 1: İç Servise Sevk */}
                  <div className={`panel p-5 bg-white border transition-all duration-300 relative ${
                    flowStepsStatus.step1 === "completed" 
                      ? "border-slate-200 bg-slate-50/20" 
                      : "border-teal-700/40 shadow-sm shadow-teal-500/5 bg-white"
                  }`}>
                    <div className="flex gap-3 items-start">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        flowStepsStatus.step1 === "completed" 
                          ? "bg-teal-50 text-teal-700 border border-teal-100" 
                          : "bg-teal-700 text-white animate-pulse"
                      }`}>1</div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <h4 className="m-0 text-xs font-bold text-slate-800">
                            1. Adım: Cihazı İç Servise Sevk Et (Sat)
                          </h4>
                          {flowStepsStatus.step1 === "completed" ? (
                            <span className="text-teal-700 bg-teal-50 border border-teal-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              ✓ Sevk Edildi
                            </span>
                          ) : (
                            <span className="text-teal-700 bg-teal-50 border border-teal-200 text-[10px] font-semibold px-2 py-0.5 rounded-full animate-pulse">
                              ● Gönderim Bekliyor
                            </span>
                          )}
                        </div>
                        <p className="m-0 text-slate-400 text-2xs mt-0.5">Cihazın onarım için kendi teknik servisinize çıkış işlemini onaylayın.</p>
                        
                        <div className="flex gap-4 mt-3 text-xs">
                          <div>
                            <span className="text-slate-400">Başlangıç Maliyeti:</span> <strong className="text-slate-700">{flowTotals.initial.toLocaleString("tr-TR")} TL</strong>
                          </div>
                        </div>

                        {flowStepsStatus.step1 === "active" && (
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={handleSendToService}
                              disabled={flowStatusLoading}
                              className="primary-btn px-4 py-2 text-xs font-semibold cursor-pointer shadow-md shadow-teal-700/10"
                            >
                              {flowStatusLoading ? "Sevk Ediliyor..." : "Cihazı İç Servise Sat (Sevk Et)"}
                            </button>
                          </div>
                        )}
                        {flowStepsStatus.step1 === "completed" && (
                          <div className="text-[10px] text-slate-500 mt-2 bg-slate-100/50 p-2 rounded-lg border border-slate-200/50 w-fit font-medium">
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
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        flowStepsStatus.step2 === "completed" 
                          ? "bg-teal-50 text-teal-700 border border-teal-100" 
                          : flowStepsStatus.step2 === "active" 
                          ? "bg-teal-700 text-white animate-pulse" 
                          : "bg-slate-100 text-slate-400"
                      }`}>2</div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <h4 className="m-0 text-xs font-bold text-slate-800">
                            2. Adım: Cihazı Teknik Servisten Geri Satın Al
                          </h4>
                          {flowStepsStatus.step2 === "completed" ? (
                            <span className="text-teal-700 bg-teal-50 border border-teal-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              ✓ Geri Alındı
                            </span>
                          ) : flowStepsStatus.step2 === "active" ? (
                            <span className="text-teal-700 bg-teal-50 border border-teal-200 text-[10px] font-semibold px-2 py-0.5 rounded-full animate-pulse">
                              ● Geri Alım Bekliyor
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              Kilitli
                            </span>
                          )}
                        </div>
                        <p className="m-0 text-slate-400 text-2xs mt-0.5">Teknik servisin onararak size geri sattığı fiyatı girin. Aradaki fark otomatik olarak cihaz maliyetine eklenecektir.</p>

                        {(flowStepsStatus.step2 === "active" || flowStepsStatus.step2 === "completed") && (
                          <div className="mt-4 flex flex-col gap-3">
                            {flowStepsStatus.step2 === "active" && (
  <form onSubmit={handleBuybackFromService} className="max-w-xl flex flex-col gap-3">
    <div className="flex gap-3 items-end">
      <div className="flex-1 flex flex-col gap-1">
        <span className="text-slate-700 text-2xs font-bold">Geri Satın Alma Fiyatı (TL)</span>
        <input
          type="number"
          min={Number(selectedItem.purchasePrice)}
          className="field text-xs w-full py-2"
          placeholder="Örn: 32000"
          value={flowBuybackPrice}
          onChange={(e) => setFlowBuybackPrice(e.target.value)}
          disabled={flowStatusLoading}
        />
      </div>
      <button
        type="submit"
        disabled={flowStatusLoading || !flowBuybackPrice}
        className="primary-btn py-2 px-4 text-xs font-bold cursor-pointer"
      >
        {flowStatusLoading ? "İşlem yapılıyor..." : "Geri Satın Al"}
      </button>
    </div>

    <div className="flex flex-col gap-1.5">
      <span className="text-slate-700 text-2xs font-bold">Yapılan İşlemler</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {serviceOperationOptions.map((operation) => (
          <label
            key={operation}
            className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
          >
            <input
              type="checkbox"
              checked={flowServiceOperations.includes(operation)}
              onChange={() => handleToggleServiceOperation(operation)}
              disabled={flowStatusLoading}
            />
            <span>{operation}</span>
          </label>
        ))}
      </div>
    </div>

    <div className="flex flex-col gap-1">
      <span className="text-slate-700 text-2xs font-bold">Servis Notu</span>
      <textarea
        className="field text-xs w-full min-h-[88px] resize-y"
        placeholder="Bu geri alım için not ekleyin..."
        value={flowServiceNote}
        onChange={(e) => setFlowServiceNote(e.target.value)}
        disabled={flowStatusLoading}
      />
    </div>
  </form>
)}

                            {flowStepsStatus.step2 === "completed" && (
                              <div className="text-2xs text-slate-650 bg-slate-100/50 p-2.5 rounded-lg border border-slate-200/50 w-fit flex flex-col gap-1">
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
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        flowStepsStatus.step3 === "completed" 
                          ? "bg-teal-50 text-teal-700 border border-teal-100" 
                          : flowStepsStatus.step3 === "active" 
                          ? "bg-teal-700 text-white animate-pulse" 
                          : "bg-slate-100 text-slate-400"
                      }`}>3</div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <h4 className="m-0 text-xs font-bold text-slate-800">
                            3. Adım: Vitrin Satış Fiyatı Belirle & Listele
                          </h4>
                          {flowStepsStatus.step3 === "active" ? (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-full animate-pulse">
                              Fiyat Belirleme Aktif
                            </span>
                          ) : flowStepsStatus.step3 === "completed" ? (
                            <span className="text-teal-700 bg-teal-50 border border-teal-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              ✓ Satışta / Vitrinde
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              Kilitli
                            </span>
                          )}
                        </div>
                        <p className="m-0 text-slate-400 text-2xs mt-0.5">Onarılmış cihazın vitrinde yer alacağı nihai perakende liste satış fiyatını belirleyin.</p>

                        {(flowStepsStatus.step3 === "active" || flowStepsStatus.step3 === "completed") && (
                          <div className="mt-4 flex flex-col gap-4">
                            <form onSubmit={handleUpdateSalePrice} className="flex gap-3 items-end max-w-md">
                              <div className="flex-1 flex flex-col gap-1.5">
                                <span className="text-slate-700 text-2xs font-bold">Vitrin Satış Fiyatı (TL)</span>
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
                            <div className="grid grid-cols-2 gap-3 border border-slate-200 p-3 rounded-lg bg-slate-50/50 text-[11px]">
                              <div>
                                <span className="text-slate-400">Nihai Maliyet:</span>
                                <p className="m-0 text-slate-705 font-bold mt-0.5">{flowTotals.total.toLocaleString("tr-TR")} TL</p>
                              </div>
                              <div>
                                <span className="text-slate-400">Belirlenen Satış:</span>
                                <p className="m-0 text-slate-705 font-bold mt-0.5">{flowTotals.sale.toLocaleString("tr-TR")} TL</p>
                              </div>
                              <div className="col-span-2 border-t border-slate-200 pt-2">
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
              </div>

              {/* Financial & Cost Timeline Card */}
              <div className="md:col-span-5 flex flex-col gap-6">
                {/* Cost Breakdown Card */}
                <div className="panel bg-gradient-to-tr from-slate-900 to-indigo-950 text-white border-0 shadow-xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-radial-gradient(circle_at_top_right,rgba(15,118,110,0.15),transparent) pointer-events-none" />
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
                  
                  <div className="p-5 flex flex-col gap-4">
                    <div className="border-b border-white/10 pb-3">
                      <span className="text-[10px] text-teal-300 font-black uppercase tracking-wider">{selectedItem.category || "Cihaz"}</span>
                      <h3 className="m-0 text-base font-black text-white mt-0.5 line-clamp-1">{selectedItem.name}</h3>
                      <p className="m-0 text-[10px] text-slate-400 font-mono mt-0.5">SKU: {selectedItem.sku}</p>
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
                    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Maliyet Zaman Tüneli
                  </h3>
                  
                  <div className="flex flex-col relative pl-4 border-l border-slate-200 ml-2 gap-5 py-1">
                    {costEvents.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">Maliyet hareketi kaydı bulunamadı.</div>
                    ) : (
                      costEvents.map((ev) => (
                        <div key={ev.id} className="relative">
                          <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-450" />
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-slate-400 font-mono">{new Date(ev.createdAt).toLocaleString("tr-TR")}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${getEventTypeColor(ev.type)}`}>
                                {getEventTypeName(ev.type)}
                              </span>
                              {ev.amount > 0 && (
                                <span className="text-2xs font-bold text-slate-800">
                                  {Number(ev.amount).toLocaleString("tr-TR")} TL
                                </span>
                              )}
                            </div>
                            {ev.note && <p className="m-0 text-[10px] text-slate-600 font-medium">{ev.note}</p>}
                            {ev.referenceNo && (
                              <span className="text-[9px] text-slate-400 font-mono">Ref No: {ev.referenceNo}</span>
                            )}
                            <div className="text-[9px] text-slate-500 font-semibold border-t border-slate-100 pt-1.5 mt-0.5">
                              Yeni Birim Maliyet: <strong className="text-slate-800">{Number(ev.unitCostAfter).toLocaleString("tr-TR")} TL</strong>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Dashboard Welcome / Info State */
            <div className="panel p-8 bg-white border border-slate-200/80 rounded-2xl flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-radial-gradient(circle_at_top_right,rgba(15,118,110,0.03),transparent) pointer-events-none" />
              
              <div className="flex flex-col md:flex-row items-center gap-6 border-b border-slate-100 pb-6">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700 shrink-0 shadow-inner">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M7.5 12l3 3m-3-3l-3 3" />
                  </svg>
                </div>
                <div>
                  <h3 className="m-0 text-base font-bold text-slate-800">İç Servis Döngüsü Nedir ve Nasıl Çalışır?</h3>
                  <p className="m-0 text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Dışarıdan (ikinci el vb.) satın alıp doğrudan vitrine koymak yerine, onarım yapılması amacıyla kendi teknik servisinize 
                    gönderdiğiniz cihazların maliyet akışını bu ekrandan yönetebilirsiniz. Her bir sevk ve geri alım işlemi otomatik olarak 
                    ürün maliyet kartını günceller.
                  </p>
                </div>
              </div>

              {/* Visual Flow Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                  <div className="text-xs font-bold text-teal-800 mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-[10px]">1</span>
                    İç Servise Sevk (Satış)
                  </div>
                  <p className="m-0 text-2xs text-slate-500 leading-normal">
                    Seçtiğiniz cihazı başlangıç maliyet fiyatı ile kendi teknik servisinize sevk edin.
                  </p>
                </div>

                <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                  <div className="text-xs font-bold text-teal-800 mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-[10px]">2</span>
                    Geri Satın Alma (Maliyet)
                  </div>
                  <p className="m-0 text-2xs text-slate-500 leading-normal">
                    Servis onarımı sonrası size kesilen geri alım tutarını girin. Aradaki fark birim maliyete (purchasePrice) eklenir.
                  </p>
                </div>

                <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                  <div className="text-xs font-bold text-teal-800 mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-[10px]">3</span>
                    Nihai Satış (Vitrin)
                  </div>
                  <p className="m-0 text-2xs text-slate-500 leading-normal">
                    Onarımı bitmiş, kümülatif maliyeti güncellenmiş cihazın vitrin liste fiyatını belirleyip POS sistemine hazır edin.
                  </p>
                </div>
              </div>

              <div className="text-center text-xs text-slate-400 py-6 border-t border-slate-100">
                Başlamak için sol menüden veya arama kutusundan bir cihaz seçin.
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}




