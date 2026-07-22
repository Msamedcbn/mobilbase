"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductCardModal } from "@/components/product-card-modal";
import { ErpProductMatrixCreator } from "@/components/erp-product-matrix-creator";
import { useConfirm } from "@/components/confirm-modal";


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
  isCatalog?: boolean;
  condition?: string | null;
  isBuybackItem?: boolean;
  buybackProcessStatus?: "SERVICE_TRANSFERRED" | "READY_FOR_SALE" | null;
  buybackSaleEnabled?: boolean;
  buybackDealId?: string | null;
  purchaseDate?: string;
  updatedAt?: string;
};

type Product = {
  id: string;
  name: string;
  barcode: string;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  variantColor?: string | null;
  variantStorage?: string | null;
  purchasePrice?: string | number;
  salePrice: string | number;
  stock?: number;
  isCatalog?: boolean;
  condition?: string | null;
  imei?: string | null;
  requiresSerialNumber?: boolean;
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

type DeviceModel = {
  brand: string;
  model: string;
};

const emptyCatalogForm = {
  sku: "",
  name: "",
  category: "Telefon",
  brand: "",
  model: "",
  variantColor: "",
  variantStorage: "",
  purchasePrice: "0",
  salePrice: "0",
  stock: "0",
  imei: "",
  condition: "1. Sıfır",
  requiresSerialNumber: true,
};

const emptyStockForm = {
  sku: "",
  name: "",
  category: "Telefon",
  brand: "",
  model: "",
  variantColor: "",
  variantStorage: "",
  serialNumber: "",
  imei: "",
  quantity: "1",
  purchasePrice: "0",
  salePrice: "0",
  purchaseDocType: "",
  purchaseDocNo: "",
  minThreshold: "0",
  condition: "1. Sıfır",
  purchaseDate: new Date().toISOString().split("T")[0],
  requiresSerialNumber: false,
};

function cleanString(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toUpperCase()
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ş/g, "S")
    .replace(/İ/g, "I")
    .replace(/I/g, "I")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export default function StockPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [items, setItems] = useState<StockItem[]>([]);
  const [catalogCards, setCatalogCards] = useState<Product[]>([]);
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
  const [selectedProductCardId, setSelectedProductCardId] = useState<string | null>(null);
  const [showErpMatrixCreator, setShowErpMatrixCreator] = useState(false);
  
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPriceMode, setBulkPriceMode] = useState<"FIXED" | "MARKUP">("FIXED");
  const [bulkPriceValue, setBulkPriceValue] = useState("");
  const [applyingBulkPrice, setApplyingBulkPrice] = useState(false);

  // Tabbed Navigation: inventory (Envanter), entry (Stok Girişi), catalog (Ürün Kartları), report (Raporlar & Loglar)
  const [activeTab, setActiveTab] = useState<"inventory" | "buyback" | "entry" | "catalog" | "report">("inventory");
  const [buybackProcessFilter, setBuybackProcessFilter] = useState<"ALL" | "SERVICE_TRANSFERRED" | "READY_FOR_SALE">("ALL");
  const [buybackSaleFilter, setBuybackSaleFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [buybackUpdatingId, setBuybackUpdatingId] = useState<string | null>(null);
  
  // Forms State
  const [catalogForm, setCatalogForm] = useState(emptyCatalogForm);
  const [stockForm, setStockForm] = useState(emptyStockForm);
  const [selectedCardId, setSelectedCardId] = useState("");
  
  const [vatRateUi, setVatRateUi] = useState("20");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Added States for Barcode Printing and Stock logs
  const [logs, setLogs] = useState<any[]>([]);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [costEvents, setCostEvents] = useState<StockCostEvent[]>([]);
  
  // Manual Cost Event Adjustment States (only in Edit Mode)
  const [costEventType, setCostEventType] = useState("PURCHASE_EXTERNAL");
  const [costEventAmount, setCostEventAmount] = useState("");
  const [costEventNote, setCostEventNote] = useState("");
  const [costEventRef, setCostEventRef] = useState("");

  // Auto-complete suggestions state
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Catalog search in stock entry tab
  const [catalogSearchTerm, setCatalogSearchTerm] = useState("");

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/stock-items");
      const json = await res.json();
      // Filter out catalog cards from the inventory list
      const actualItems = Array.isArray(json) ? json.filter(x => !x.isCatalog) : [];
      setItems(actualItems);
    } catch {
      toast.error("Stok verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCatalog() {
    try {
      const res = await fetch("/api/products?catalog=true");
      const json = await res.json();
      const rawData = json.data || json;
      setCatalogCards(Array.isArray(rawData) ? rawData : []);
    } catch {
      toast.error("Ürün kataloğu yüklenemedi.");
    }
  }

  async function fetchDeviceModels() {
    try {
      const res = await fetch("/api/device-models");
      const json = await res.json();
      setDeviceModels(Array.isArray(json) ? json : []);
      const brands = Array.from(new Set(json.map((x: any) => x.brand))) as string[];
      setBrandSuggestions(brands);
    } catch {
      // Fail silently
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
    void fetchCatalog();
    void fetchDeviceModels();
    void fetchLogs();
  }, []);

  // Read/Write Tab from URL parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "inventory" || tabParam === "buyback" || tabParam === "entry" || tabParam === "catalog" || tabParam === "report") {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = (tab: "inventory" | "buyback" | "entry" | "catalog" | "report") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState({}, "", url.pathname + url.search);
    }
  };

  // Generate Catalog Card Name dynamically if category is Telefon
  useEffect(() => {
    if (activeTab === "catalog" && catalogForm.category === "Telefon") {
      const brand = catalogForm.brand.trim();
      const model = catalogForm.model.trim();
      const storage = catalogForm.variantStorage.trim();
      const color = catalogForm.variantColor.trim();
      const generatedName = [brand, model, storage, color].filter(Boolean).join(" ");
      setCatalogForm((p) => ({ ...p, name: generatedName }));
    }
  }, [catalogForm.category, catalogForm.brand, catalogForm.model, catalogForm.variantStorage, catalogForm.variantColor, activeTab]);

  // Generate SKU in real-time for Catalog Card
  useEffect(() => {
    if (activeTab === "catalog") {
      const catClean = cleanString(catalogForm.category || "");
      const brandClean = cleanString(catalogForm.brand || "");
      const modelClean = cleanString(catalogForm.model || "");
      const storageClean = cleanString(catalogForm.variantStorage || "");
      const colorClean = cleanString(catalogForm.variantColor || "");
      const nameClean = cleanString(catalogForm.name || "");

      let skuGen = "";
      if (catClean === "TELEFON") {
        skuGen = `TEL-${brandClean}-${modelClean}-${storageClean}-${colorClean}`;
      } else if (catClean === "AKSESUAR") {
        skuGen = `AKS-${brandClean || "GENEL"}-${nameClean || "AKSESUAR"}`;
      } else if (catClean === "YEDEKPARCA" || catClean === "YEDEK PARCA") {
        skuGen = `PAR-${brandClean || "GENEL"}-${nameClean || "PARCA"}`;
      } else {
        skuGen = `PRD-${nameClean || "URUN"}`;
      }

      skuGen = skuGen.replace(/-+/g, "-").replace(/-+$/, "").replace(/^-+/, "");
      setCatalogForm((p) => ({ ...p, sku: skuGen }));
    }
  }, [catalogForm.category, catalogForm.brand, catalogForm.model, catalogForm.variantStorage, catalogForm.variantColor, catalogForm.name, activeTab]);

  // Handle selected Product Card in Stock Entry form
  const handleSelectCard = (card: Product) => {
    setSelectedCardId(card.id);
    setStockForm((prev) => ({
      ...prev,
      sku: card.barcode,
      name: card.name,
      category: card.category || "Telefon",
      brand: card.brand || "",
      model: card.model || "",
      variantColor: card.variantColor || "",
      variantStorage: card.variantStorage || "",
      salePrice: String(Number(card.salePrice || 0)),
      quantity: card.category === "Telefon" ? "1" : "1",
      requiresSerialNumber: card.requiresSerialNumber ?? false,
    }));
    setCatalogSearchTerm("");
  };

  // Autocomplete Suggestions logic for Catalog Form
  const handleBrandChange = (val: string) => {
    setCatalogForm((p) => ({ ...p, brand: val }));
    const filteredBrands = Array.from(
      new Set(
        deviceModels
          .filter((x) => x.brand.toLowerCase().includes(val.toLowerCase()))
          .map((x) => x.brand)
      )
    ) as string[];
    setBrandSuggestions(filteredBrands);
    setShowBrandDropdown(true);

    // Also update model suggestions
    const models = deviceModels
      .filter((x) => x.brand.toLowerCase() === val.trim().toLowerCase())
      .map((x) => x.model);
    setModelSuggestions(models);
  };

  const handleModelChange = (val: string) => {
    setCatalogForm((p) => ({ ...p, model: val }));
    const filteredModels = deviceModels
      .filter(
        (x) =>
          x.brand.toLowerCase() === catalogForm.brand.trim().toLowerCase() &&
          x.model.toLowerCase().includes(val.toLowerCase())
      )
      .map((x) => x.model);
    setModelSuggestions(filteredModels);
    setShowModelDropdown(true);
  };

  // Inventory Filtering & Computations
  const categories = useMemo(() => {
    const set = new Set(items.map((x) => x.category).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (item.isBuybackItem) return false;
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      if (!term) return true;
      return `${item.sku} ${item.name} ${item.category} ${item.imei || ""} ${item.serialNumber || ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [items, search, categoryFilter]);

  const buybackItems = useMemo(() => {
    return items
      .filter((item) => item.isBuybackItem)
      .filter((item) => (buybackProcessFilter === "ALL" ? true : item.buybackProcessStatus === buybackProcessFilter))
      .filter((item) => {
        if (buybackSaleFilter === "ALL") return true;
        return buybackSaleFilter === "OPEN" ? Boolean(item.buybackSaleEnabled) : !item.buybackSaleEnabled;
      });
  }, [items, buybackProcessFilter, buybackSaleFilter]);

  async function updateBuybackState(
    id: string,
    payload: { buybackProcessStatus?: "SERVICE_TRANSFERRED" | "READY_FOR_SALE"; buybackSaleEnabled?: boolean },
  ) {
    try {
      setBuybackUpdatingId(id);
      const res = await fetch(`/api/stock-items/${id}/buyback-state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Buyback durum guncellenemedi.");
      toast.success("Buyback durum guncellendi.");
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Buyback durum guncellenemedi.");
    } finally {
      setBuybackUpdatingId(null);
    }
  }

  const filteredCatalogCards = useMemo(() => {
    const term = catalogSearchTerm.trim().toLowerCase();
    if (!term) return catalogCards;
    return catalogCards.filter((card) =>
      `${card.name} ${card.barcode} ${card.brand || ""} ${card.model || ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [catalogCards, catalogSearchTerm]);

  const lowStockCount = useMemo(
    () => items.filter((x) => Number(x.quantity) <= Number(x.minThreshold)).length,
    [items]
  );
  const totalStockUnits = useMemo(
    () => items.reduce((sum, x) => sum + Number(x.quantity), 0),
    [items]
  );
  const totalInventoryCost = useMemo(
    () => items.reduce((sum, x) => sum + (Number(x.purchasePrice) * Number(x.quantity)), 0),
    [items]
  );
  const totalInventoryRetail = useMemo(
    () => items.reduce((sum, x) => sum + (Number(x.salePrice) * Number(x.quantity)), 0),
    [items]
  );
  
  const purchaseWithVatPreview = useMemo(() => {
    const base = Number(stockForm.purchasePrice || 0);
    const vat = Number(vatRateUi || 0);
    return base * (1 + vat / 100);
  }, [stockForm.purchasePrice, vatRateUi]);

  const saleWithVatPreview = useMemo(() => {
    const base = Number(stockForm.salePrice || 0);
    const vat = Number(vatRateUi || 0);
    return base * (1 + vat / 100);
  }, [stockForm.salePrice, vatRateUi]);

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

  // Edit stock item action
  function startEdit(item: StockItem) {
    setEditingId(item.id);
    setStockForm({
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
      condition: item.condition || "1. Sıfır",
      purchaseDate: item.purchaseDate ? item.purchaseDate.split("T")[0] : new Date().toISOString().split("T")[0],
      requiresSerialNumber: !!item.imei,
    });
    setSelectedCardId("editing");
    handleTabChange("entry");
    void fetchCostEvents(item.id);
  }

  function resetCatalogForm() {
    setCatalogForm(emptyCatalogForm);
  }

  function resetStockForm() {
    setEditingId(null);
    setStockForm(emptyStockForm);
    setSelectedCardId("");
    setVatRateUi("20");
    setCostEvents([]);
    setCostEventAmount("");
    setCostEventNote("");
    setCostEventRef("");
  }

  // Save Catalog Card (POST /api/products?catalog=true)
  async function saveCatalogCard(e: React.FormEvent) {
    e.preventDefault();
    if (!catalogForm.sku || !catalogForm.name) {
      return toast.error("SKU/Barkod ve Ürün Adı zorunludur.");
    }

    const isSerialized = catalogForm.requiresSerialNumber;
    const cleanImei = (catalogForm as any).imei ? (catalogForm as any).imei.trim() : "";
    const qty = Number((catalogForm as any).stock || 0);

    if (isSerialized && qty > 0) {
      if (!cleanImei) {
        return toast.error("Stok eklemek için IMEI numarası zorunludur.");
      }
      if (cleanImei.length < 14 || cleanImei.length > 16) {
        return toast.error("Lütfen geçerli bir IMEI numarası girin (14-16 haneli).");
      }
      if (qty > 1) {
        return toast.error("Seri numaralı cihazlar için başlangıç stoğu en fazla 1 olabilir.");
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/products?catalog=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: catalogForm.sku.trim(),
          barcode: catalogForm.sku.trim(),
          name: catalogForm.name.trim(),
          category: catalogForm.category,
          brand: catalogForm.brand.trim() || null,
          model: catalogForm.model.trim() || null,
          variantColor: catalogForm.variantColor.trim() || null,
          variantStorage: catalogForm.variantStorage.trim() || null,
          purchasePrice: Number((catalogForm as any).purchasePrice || 0),
          salePrice: Number(catalogForm.salePrice || 0),
          stock: qty,
          imei: cleanImei || null,
          condition: (catalogForm as any).condition || null,
          serialNumber: (catalogForm as any).serialNumber || null,
          isCatalog: true,
          requiresSerialNumber: catalogForm.requiresSerialNumber,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Kayıt başarısız");

      toast.success(qty > 0 ? "Ürün Kartı ve Başlangıç Stoğu başarıyla eklendi." : "Ürün Kartı başarıyla kataloğa eklendi.");
      resetCatalogForm();
      await fetchCatalog();
      await fetchItems();
      handleTabChange("inventory");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function handleLoadDefaultCards() {
    if (!(await confirm("Popüler Apple, Samsung modelleri, yedek parçalar ve aksesuarları içeren 20 adet varsayılan ürün kartını yüklemek istiyor musunuz?"))) return;
    setLoadingSeed(true);
    try {
      const res = await fetch("/api/products/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Yükleme başarısız");
      toast.success(`${json.data?.addedCount || 0} adet varsayılan ürün kartı başarıyla eklendi!`);
      await fetchCatalog();
      await fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setLoadingSeed(false);
    }
  }

  // Save Stock Item (POST /api/stock-items or PUT /api/stock-items/[id])
  async function saveStockItem(e: React.FormEvent) {
    e.preventDefault();
    if (!stockForm.sku || !stockForm.name) {
      return toast.error("Lütfen bir Ürün Kartı seçin.");
    }

    const isSerialized = stockForm.requiresSerialNumber;

    if (isSerialized) {
      if (!stockForm.imei.trim()) {
        return toast.error("Bu ürün için IMEI numarası zorunludur.");
      }
      if (stockForm.imei.trim().length < 14 || stockForm.imei.trim().length > 16) {
        return toast.error("Lütfen geçerli bir IMEI numarası girin (14-16 haneli).");
      }
    }

    const payload = {
      sku: stockForm.sku.trim(),
      name: stockForm.name.trim(),
      category: stockForm.category || "Genel",
      brand: stockForm.brand.trim() || null,
      model: stockForm.model.trim() || null,
      variantColor: stockForm.variantColor.trim() || null,
      variantStorage: stockForm.variantStorage.trim() || null,
      serialNumber: stockForm.serialNumber.trim() || null,
      imei: stockForm.imei.trim() || null,
      quantity: Number(stockForm.quantity || 1),
      purchasePrice: Number(stockForm.purchasePrice || 0),
      salePrice: Number(stockForm.salePrice || 0),
      purchaseDocType: stockForm.purchaseDocType.trim() || null,
      purchaseDocNo: stockForm.purchaseDocNo.trim() || null,
      minThreshold: Number(stockForm.minThreshold || 0),
      condition: stockForm.condition || null,
      purchaseDate: stockForm.purchaseDate,
      requiresSerialNumber: stockForm.requiresSerialNumber,
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

      toast.success(editingId ? "Envanter kaydı güncellendi." : "Ürün başarıyla envantere eklendi.");
      resetStockForm();
      await fetchItems();
      await fetchLogs();
      handleTabChange("inventory");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCatalogCard(id: string, name: string) {
    if (!(await confirm(`"${name}" ürün kartını silmek istediğinizden emin misiniz?`, { danger: true, confirmLabel: "Kartı Sil" }))) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Silinemedi");
      toast.success(body?.archived ? body.message : "Ürün kartı silindi.");
      await fetchCatalog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silme işlemi başarısız.");
    }
  }

  async function deleteItem(id: string) {

    if (!(await confirm("Bu stok kaydını envanterden silmek istiyor musunuz?", { danger: true, confirmLabel: "Sil" }))) return;
    try {
      const res = await fetch(`/api/stock-items/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Silinemedi");
      toast.success(body?.archived ? body.message : "Ürün envanterden silindi.");
      if (editingId === id) resetStockForm();
      await fetchItems();
      await fetchLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silme işlemi başarısız.");
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered(ids: string[]) {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  }

  async function applyBulkPrice() {
    const value = Number(bulkPriceValue);
    if (!Number.isFinite(value) || value < 0) return toast.error("Geçerli bir değer girin.");
    if (selectedIds.size === 0) return;
    setApplyingBulkPrice(true);
    try {
      const res = await fetch("/api/stock-items/bulk-price", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), mode: bulkPriceMode, value }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Toplu güncelleme başarısız.");
      toast.success(`${body?.updated ?? selectedIds.size} ürünün satış fiyatı güncellendi.`);
      setSelectedIds(new Set());
      setBulkPriceValue("");
      await fetchItems();
      await fetchLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Toplu güncelleme başarısız.");
    } finally {
      setApplyingBulkPrice(false);
    }
  }

  // Cost Events manual adjustment
  async function addCostEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return toast.error("Önce düzenleme modunda bir stok kartı seçin.");
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
          <div class="header">VibeGSM Iletisim</div>
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

  return (
    <section className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="page-title m-0">Stok & Cihaz Yönetimi</h2>
          <p className="text-slate-500 text-xs md:text-sm m-0 mt-1">
            Ürün kartı tanımlama, envantere cihaz ekleme, tekil IMEI takibi ve alış-satış maliyet denetimi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowErpMatrixCreator(true)}
          className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
        >
          <span>⚡ ERP Hızlı Ürün Kartı & Varyant Sihirbazı</span>
        </button>
      </div>


      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-2 mb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => handleTabChange("inventory")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === "inventory"
              ? "border-blue-700 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📦 Envanter
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("buyback")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === "buyback"
              ? "border-blue-700 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Buyback Cihazlar
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("entry")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === "entry"
              ? "border-blue-700 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📥 Stok Girişi {editingId && "(Düzenleme)"}
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("catalog")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === "catalog"
              ? "border-blue-700 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📇 Ürün Kataloğu
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("report")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === "report"
              ? "border-blue-700 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📊 Raporlar & Loglar
        </button>
      </div>

      {/* Tab 1: Inventory List */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="panel p-4 flex items-center justify-between bg-white relative overflow-hidden group">
              <div>
                <p className="m-0 text-2xs font-bold text-slate-400 uppercase tracking-wider">Kayıtlı Cihaz/Ürün</p>
                <h3 className="m-0 mt-1.5 text-2xl font-extrabold text-slate-900">{items.length} adet</h3>
              </div>
            </div>
            <div className="panel p-4 flex items-center justify-between bg-white relative overflow-hidden group">
              <div>
                <p className="m-0 text-2xs font-bold text-slate-400 uppercase tracking-wider">Kritik Stok Seviyesi</p>
                <h3 className={`m-0 mt-1.5 text-2xl font-extrabold ${lowStockCount > 0 ? "text-amber-600" : "text-blue-700"}`}>{lowStockCount}</h3>
              </div>
            </div>
            <div className="panel p-4 flex items-center justify-between bg-white relative overflow-hidden group">
              <div>
                <p className="m-0 text-2xs font-bold text-slate-400 uppercase tracking-wider">Toplam Envanter Maliyeti</p>
                <h3 className="m-0 mt-1.5 text-2xl font-extrabold text-slate-900">{totalInventoryCost.toLocaleString("tr-TR")} TL</h3>
              </div>
            </div>
            <div className="panel p-4 flex items-center justify-between bg-white relative overflow-hidden group">
              <div>
                <p className="m-0 text-2xs font-bold text-slate-400 uppercase tracking-wider">Toplam Satış Değeri</p>
                <h3 className="m-0 mt-1.5 text-2xl font-extrabold text-slate-900">{totalInventoryRetail.toLocaleString("tr-TR")} TL</h3>
              </div>
            </div>
          </div>

          {/* Filtering and Table */}
          <div className="panel p-6 bg-white flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input 
                  className="field w-full pl-9" 
                  placeholder="SKU, Ürün adı, IMEI veya kategori ara..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              </div>

              <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
                {categories.map((c) => {
                  const active = categoryFilter === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategoryFilter(c)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-200 shrink-0 cursor-pointer ${
                        active 
                          ? "bg-blue-700 border-blue-700 text-white shadow-sm" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                      }`}
                    >
                      {c === "ALL" ? "Tümü" : c}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-blue-200 bg-blue-50">
                <span className="text-xs font-bold text-blue-800">{selectedIds.size} ürün seçili</span>
                <select
                  className="field text-xs py-1.5 w-auto"
                  value={bulkPriceMode}
                  onChange={(e) => setBulkPriceMode(e.target.value as "FIXED" | "MARKUP")}
                >
                  <option value="FIXED">Satış fiyatını şuna eşitle (TL)</option>
                  <option value="MARKUP">Alış fiyatına şu kadar % ekle</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="field text-xs py-1.5 w-28"
                  placeholder={bulkPriceMode === "FIXED" ? "TL" : "%"}
                  value={bulkPriceValue}
                  onChange={(e) => setBulkPriceValue(e.target.value)}
                />
                <button
                  type="button"
                  disabled={applyingBulkPrice || !bulkPriceValue}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  onClick={() => void applyBulkPrice()}
                >
                  {applyingBulkPrice ? "Uygulanıyor..." : "Uygula"}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Seçimi Temizle
                </button>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl shadow-2xs">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Kayıt bulunamadı.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="text-xs w-8">
                        <input
                          type="checkbox"
                          checked={filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id))}
                          onChange={() => toggleSelectAllFiltered(filtered.map((i) => i.id))}
                        />
                      </th>
                      <th className="text-xs">SKU</th>
                      <th className="text-xs">Ürün Tanımı</th>
                      <th className="text-xs">Kategori</th>
                      <th className="text-xs">Durum</th>
                      <th className="text-xs">IMEI / Seri No</th>
                      <th className="text-xs">Miktar</th>
                      <th className="text-xs">Alış Tarihi</th>
                      <th className="text-xs">Maliyet / Satış</th>
                      <th className="text-right text-xs">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const low = Number(item.quantity) <= Number(item.minThreshold);
                      const isPhone = item.category === "Telefon" || !!item.imei;
                      
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td>
                            <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelected(item.id)} />
                          </td>
                          <td className="font-mono text-[11px] font-semibold text-slate-500">{item.sku}</td>
                          <td>
                            <div className="flex flex-col">
                              <strong className="text-slate-800 text-xs font-semibold">{item.name}</strong>
                              <span className="text-slate-400 text-2xs font-medium">
                                {[item.brand, item.model, item.variantStorage, item.variantColor].filter(Boolean).join(" / ")}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="bg-slate-100 text-slate-650 text-2xs px-2 py-0.5 rounded font-bold">
                              {item.category}
                            </span>
                          </td>
                          <td>
                            {item.condition ? (
                              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-2xs px-2 py-0.5 rounded font-bold">
                                {item.condition}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="font-mono text-xs">
                            {item.imei ? (
                              <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] text-slate-700 font-bold block w-fit">
                                IMEI: {item.imei}
                              </span>
                            ) : item.serialNumber ? (
                              <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] text-slate-700 font-bold block w-fit">
                                SN: {item.serialNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td>
                            <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                              low ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100" : "text-blue-700"
                            }`}>
                              {item.quantity} adet
                            </span>
                          </td>
                          <td className="text-slate-600 text-xs font-medium">
                            {item.purchaseDate 
                              ? new Date(item.purchaseDate).toLocaleDateString("tr-TR")
                              : item.updatedAt
                                ? new Date(item.updatedAt).toLocaleDateString("tr-TR")
                                : "-"}
                          </td>
                          <td>
                            <div className="flex flex-col text-2xs">
                              <span className="text-slate-500">Alış: <strong className="text-slate-700">{Number(item.purchasePrice).toLocaleString("tr-TR")} TL</strong></span>
                              <span className="text-blue-700 font-bold">Satış: <strong>{Number(item.salePrice).toLocaleString("tr-TR")} TL</strong></span>
                            </div>
                          </td>
                          <td className="text-right">
                            <div className="flex gap-1 justify-end">
                              <button type="button" className="px-2.5 py-1 text-xs border border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 hover:text-slate-800 bg-white transition-colors cursor-pointer font-bold" onClick={() => startEdit(item)}>Düzenle</button>
                              <button
                                type="button"
                                className="px-2.5 py-1 text-xs border border-blue-200/50 hover:border-blue-300 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer font-bold"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowBarcodeModal(true);
                                }}
                              >
                                Barkod
                              </button>
                              <button type="button" className="px-2.5 py-1 text-xs border border-rose-200/50 hover:border-rose-300 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer font-bold" onClick={() => void deleteItem(item.id)}>Sil</button>
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
      )}

      {activeTab === "buyback" && (
        <div className="space-y-6">
          <div className="panel p-6 bg-white flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                className="field w-full sm:w-56"
                value={buybackProcessFilter}
                onChange={(e) => setBuybackProcessFilter(e.target.value as any)}
              >
                <option value="ALL">Tum Surecler</option>
                <option value="SERVICE_TRANSFERRED">Servise Aktarildi</option>
                <option value="READY_FOR_SALE">Satisa Hazir</option>
              </select>
              <select
                className="field w-full sm:w-56"
                value={buybackSaleFilter}
                onChange={(e) => setBuybackSaleFilter(e.target.value as any)}
              >
                <option value="ALL">Tum Satis Durumlari</option>
                <option value="OPEN">Satisa Acik</option>
                <option value="CLOSED">Satisa Kapali</option>
              </select>
            </div>
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl shadow-2xs">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Yukleniyor...</div>
              ) : buybackItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Buyback envanter kaydi bulunamadi.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Cihaz</th>
                      <th>IMEI</th>
                      <th>Surec</th>
                      <th>Satis Durumu</th>
                      <th className="text-right">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buybackItems.map((item) => (
                      <tr key={item.id}>
                        <td className="font-mono text-xs">{item.sku}</td>
                        <td>
                          <strong className="text-slate-800">{item.name}</strong>
                        </td>
                        <td className="font-mono text-xs">{item.imei || "-"}</td>
                        <td>
                          <span className="text-xs font-semibold">
                            {item.buybackProcessStatus === "READY_FOR_SALE" ? "Satisa Hazir" : "Servise Aktarildi"}
                          </span>
                        </td>
                        <td>
                          <span className={`text-xs font-semibold ${item.buybackSaleEnabled ? "text-blue-700" : "text-rose-600"}`}>
                            {item.buybackSaleEnabled ? "Satisa Acik" : "Satisa Kapali"}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex gap-2 justify-end">
                            {buybackUpdatingId === item.id && (
                              <span className="text-xs text-slate-500">Guncelleniyor...</span>
                            )}
                            <button
                              type="button"
                              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                              disabled={buybackUpdatingId === item.id}
                              onClick={() => void updateBuybackState(item.id, { buybackProcessStatus: "SERVICE_TRANSFERRED" })}
                            >
                              Servise Aktarildi
                            </button>
                            <button
                              type="button"
                              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                              disabled={buybackUpdatingId === item.id}
                              onClick={() => void updateBuybackState(item.id, { buybackProcessStatus: "READY_FOR_SALE" })}
                            >
                              Satisa Hazir
                            </button>
                            <button
                              type="button"
                              className={`px-2.5 py-1 text-xs rounded-lg border ${item.buybackSaleEnabled ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}
                              disabled={buybackUpdatingId === item.id}
                              onClick={() => void updateBuybackState(item.id, { buybackSaleEnabled: !item.buybackSaleEnabled })}
                            >
                              {item.buybackSaleEnabled ? "Satisa Kapat" : "Satisa Ac"}
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
        </div>
      )}

      {/* Tab 2: Stock Entry Screen */}
      {activeTab === "entry" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <form className="panel p-6 flex flex-col gap-4 bg-white" onSubmit={saveStockItem}>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="m-0 text-base font-bold text-slate-800">
                  {editingId ? "Envanter Kaydını Düzenle" : "Envantere Stok Ekle"}
                </h3>
                {editingId && (
                  <button 
                    type="button" 
                    className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                    onClick={resetStockForm}
                  >
                    Düzeltmeyi İptal Et & Yeni Ekle
                  </button>
                )}
              </div>

              {/* Step 1: Catalog Card Search/Select */}
              {!editingId && (
                <div className="space-y-2">
                  <label className="text-2xs font-bold uppercase tracking-wider text-slate-500">1. Kataloğu Ara ve Ürün Kartı Seç</label>
                  <div className="relative">
                    <input
                      className="field w-full text-sm pl-9"
                      placeholder="Kart adı, SKU veya marka ile katalogda arayın..."
                      value={catalogSearchTerm}
                      onChange={(e) => setCatalogSearchTerm(e.target.value)}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                  </div>

                  {filteredCatalogCards.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white max-h-48 overflow-y-auto">
                      {filteredCatalogCards.map((card) => (
                        <div
                          key={card.id}
                          className="p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer flex justify-between items-center text-xs"
                          onClick={() => handleSelectCard(card)}
                        >
                          <div>
                            <strong className="text-slate-800">{card.name}</strong>
                            <span className="text-slate-450 block text-[10px]">SKU/Barkod: {card.barcode} | Kategori: {card.category}</span>
                          </div>
                          <span className="text-blue-700 font-bold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded text-[10px]">Kartı Seç</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Selected Card Display */}
              {selectedCardId ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-2xs font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                        {stockForm.category} Kartı
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-800 mt-2">{stockForm.name}</h4>
                      <p className="text-2xs text-slate-500 font-mono mt-1">Barkod: {stockForm.sku}</p>
                    </div>
                    {!editingId && (
                      <button
                        type="button"
                        className="text-2xs text-slate-500 hover:text-slate-800 border border-slate-200 bg-white rounded-lg px-2.5 py-1 font-bold cursor-pointer"
                        onClick={() => {
                          setSelectedCardId("");
                          setStockForm(emptyStockForm);
                        }}
                      >
                        Değiştir
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 text-2xs text-slate-600">
                    <div><span className="text-slate-400 block">Marka</span><strong>{stockForm.brand || "-"}</strong></div>
                    <div><span className="text-slate-400 block">Model</span><strong>{stockForm.model || "-"}</strong></div>
                    <div><span className="text-slate-400 block">Hafıza</span><strong>{stockForm.variantStorage || "-"}</strong></div>
                    <div><span className="text-slate-400 block">Renk</span><strong>{stockForm.variantColor || "-"}</strong></div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400">
                  Devam etmek için yukarıdan bir Ürün Kartı aratıp seçin, ya da &quot;Ürün Kataloğu&quot; sekmesinden yeni bir kart tanımlayın.
                </div>
              )}

              {/* Step 3: Stock Parameters */}
              {selectedCardId && (
                <div className="space-y-4">
                  <p className="m-0 text-2xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">2. Stok ve Maliyet Bilgilerini Girin</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Phone Category Mandatory Inputs */}
                    {stockForm.requiresSerialNumber ? (
                      <>
                        <div className="flex flex-col gap-1">
                          <label className="text-2xs font-bold text-slate-600">IMEI Numarası (Zorunlu) *</label>
                          <input
                            className="field w-full text-sm font-mono"
                            placeholder="15 Haneli IMEI Girin..."
                            value={stockForm.imei}
                            onChange={(e) => setStockForm((p) => ({ ...p, imei: e.target.value }))}
                            maxLength={16}
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-2xs font-bold text-slate-600">Cihaz Durumu *</label>
                          <select
                            className="field w-full text-xs font-bold"
                            value={stockForm.condition}
                            onChange={(e) => setStockForm((p) => ({ ...p, condition: e.target.value }))}
                          >
                            <option value="1. Sıfır">1. Sıfır</option>
                            <option value="2. El">2. El</option>
                            <option value="Yenilenmiş">Yenilenmiş</option>
                            <option value="Teşhir">Teşhir</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col gap-1">
                          <label className="text-2xs font-bold text-slate-600">Seri Numarası (Opsiyonel)</label>
                          <input
                            className="field w-full text-sm font-mono"
                            placeholder="Seri No girin..."
                            value={stockForm.serialNumber}
                            onChange={(e) => setStockForm((p) => ({ ...p, serialNumber: e.target.value }))}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-2xs font-bold text-slate-600">Stok Miktarı *</label>
                          <input
                            className="field w-full text-sm"
                            type="number"
                            min={1}
                            placeholder="Miktar"
                            value={stockForm.quantity}
                            onChange={(e) => setStockForm((p) => ({ ...p, quantity: e.target.value }))}
                            required
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Financial inputs */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-2xs font-bold text-slate-600">Alış Fiyatı (KDV Hariç) *</label>
                        <input
                          className="field w-full text-sm"
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Alış Fiyatı..."
                          value={stockForm.purchasePrice}
                          onChange={(e) => setStockForm((p) => ({ ...p, purchasePrice: e.target.value }))}
                          required
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-2xs font-bold text-slate-600">Satış Fiyatı (KDV Hariç) *</label>
                        <input
                          className="field w-full text-sm font-bold text-blue-800"
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Satış Fiyatı..."
                          value={stockForm.salePrice}
                          onChange={(e) => setStockForm((p) => ({ ...p, salePrice: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-2xs font-bold text-slate-600">KDV Oranı</label>
                        <select
                          className="field w-full text-xs font-bold"
                          value={vatRateUi}
                          onChange={(e) => setVatRateUi(e.target.value)}
                        >
                          <option value="0">%0</option>
                          <option value="1">%1</option>
                          <option value="10">%10</option>
                          <option value="20">%20</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-2xs font-bold text-slate-600">Alış Tarihi</label>
                        <input
                          className="field w-full text-xs font-bold"
                          type="date"
                          value={stockForm.purchaseDate}
                          onChange={(e) => setStockForm((p) => ({ ...p, purchaseDate: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-2xs font-bold text-slate-600">Belge Türü</label>
                        <select
                          className="field w-full text-xs font-bold"
                          value={stockForm.purchaseDocType}
                          onChange={(e) => setStockForm((p) => ({ ...p, purchaseDocType: e.target.value }))}
                        >
                          <option value="">Seçiniz (opsiyonel)</option>
                          <option value="INVOICE">Fatura</option>
                          <option value="EXPENSE_SLIP">Gider Pusulası</option>
                          <option value="OTHER">Diğer</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-2xs font-bold text-slate-600">Belge No / Fatura No</label>
                        <input
                          className="field w-full text-xs font-bold"
                          placeholder="No girin..."
                          value={stockForm.purchaseDocNo}
                          onChange={(e) => setStockForm((p) => ({ ...p, purchaseDocNo: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-2xs font-bold text-slate-600">Minimum Stok Uyarı Eşiği</label>
                        <input
                          className="field w-full text-sm"
                          type="number"
                          min={0}
                          placeholder="Min Stok..."
                          value={stockForm.minThreshold}
                          onChange={(e) => setStockForm((p) => ({ ...p, minThreshold: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-2xs text-slate-600 pt-2 border-t border-slate-200">
                      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                        Alış (KDV Dahil): <strong className="text-slate-800 font-bold">{purchaseWithVatPreview.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</strong>
                      </div>
                      <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-2.5 py-2">
                        Satış (KDV Dahil): <strong className="text-blue-850 font-bold">{saleWithVatPreview.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2.5 mt-2">
                    <button
                      type="submit"
                      className="primary-btn flex-1 py-2.5 font-bold text-sm cursor-pointer shadow-md shadow-blue-700/10 hover:shadow-blue-700/20"
                      disabled={saving}
                    >
                      {saving ? "Kaydediliyor..." : editingId ? "Envanter Kaydını Güncelle" : "Envantere Ekle"}
                    </button>
                    <button
                      type="button"
                      className="field w-28 py-2.5 cursor-pointer font-medium text-slate-500 hover:text-slate-800"
                      onClick={resetStockForm}
                    >
                      Temizle
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Edit Mode cost events adjustment */}
          {editingId && (
            <div className="lg:col-span-4 panel p-6 flex flex-col gap-4 bg-white border border-slate-200 shadow-sm">
              <h3 className="m-0 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Manuel Maliyet Düzeltme</h3>
              <form className="flex flex-col gap-3" onSubmit={addCostEvent}>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">İşlem Türü</label>
                  <select className="field w-full text-xs font-bold" value={costEventType} onChange={(e) => setCostEventType(e.target.value)}>
                    <option value="PURCHASE_EXTERNAL">Dış Alım</option>
                    <option value="INTERNAL_SELL_TO_SERVICE">Teknik Servise İç Satış</option>
                    <option value="SERVICE_COST_LABOR">Servis İşçilik Maliyeti</option>
                    <option value="SERVICE_COST_PART">Servis Parça Maliyeti</option>
                    <option value="INTERNAL_BUYBACK_FROM_SERVICE">Servisten Geri Alım</option>
                    <option value="MANUAL_ADJUSTMENT">Manuel Düzeltme</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tutar (TL)</label>
                  <input className="field w-full text-xs" type="number" min={0} step="0.01" placeholder="Tutar" value={costEventAmount} onChange={(e) => setCostEventAmount(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Belge/Referans No</label>
                  <input className="field w-full text-xs font-mono" placeholder="Belge No" value={costEventRef} onChange={(e) => setCostEventRef(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Açıklama</label>
                  <input className="field w-full text-xs" placeholder="Not" value={costEventNote} onChange={(e) => setCostEventNote(e.target.value)} />
                </div>
                <button className="primary-btn w-full py-2 cursor-pointer font-bold text-xs shadow-md">Hareket Ekle</button>
              </form>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto mt-2">
                {costEvents.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">Henüz maliyet hareketi yok.</div>
                ) : (
                  <table className="data-table text-[11px]">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Tip</th>
                        <th>Tutar</th>
                        <th>Birim Maliyet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costEvents.map((ev) => (
                        <tr key={ev.id}>
                          <td className="text-[10px] text-slate-400 font-mono">{new Date(ev.createdAt).toLocaleDateString("tr-TR")}</td>
                          <td className="font-semibold text-slate-700">{getEventTypeName(ev.type)}</td>
                          <td>{Number(ev.amount).toLocaleString("tr-TR")} TL</td>
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
      )}

      {/* Tab 3: Product Catalog (Templates Creation) */}
      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* New Catalog Card Form */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <form className="panel p-6 flex flex-col gap-4 bg-white" onSubmit={saveCatalogCard}>
              <h3 className="m-0 text-base font-bold text-slate-800 border-b border-slate-100 pb-3">
                Kataloğa Yeni Ürün Kartı Ekle
              </h3>
              
              <div className="flex flex-col gap-1">
                <label className="text-2xs font-bold text-slate-600">Ürün Kategorisi *</label>
                <select
                  className="field w-full text-xs font-bold"
                  value={catalogForm.category}
                  onChange={(e) => setCatalogForm((p) => ({ ...p, category: e.target.value, brand: "", model: "", requiresSerialNumber: e.target.value === "Telefon" }))}
                >
                  <option value="Telefon">Telefon</option>
                  <option value="Aksesuar">Aksesuar</option>
                  <option value="Yedek Parça">Yedek Parça</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresSerialNumber"
                  checked={catalogForm.requiresSerialNumber}
                  onChange={(e) => setCatalogForm((p) => ({ ...p, requiresSerialNumber: e.target.checked }))}
                />
                <label htmlFor="requiresSerialNumber" className="text-2xs font-bold text-slate-600">
                  Seri Numarası (IMEI) Takibi Gerekli
                </label>
              </div>

              {/* Brand Suggestion input */}
              <div className="relative flex flex-col gap-1">
                <label className="text-2xs font-bold text-slate-600">Marka {catalogForm.category === "Telefon" && "*"}</label>
                <input
                  className="field w-full text-sm"
                  placeholder="Apple, Samsung, Xiaomi..."
                  value={catalogForm.brand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  onFocus={() => setShowBrandDropdown(true)}
                  onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
                  required={catalogForm.category === "Telefon"}
                />
                {showBrandDropdown && brandSuggestions.length > 0 && (
                  <div className="absolute top-14 left-0 w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg z-10 max-h-40 overflow-y-auto text-xs">
                    {brandSuggestions.slice(0, 10).map((br) => (
                      <div
                        key={br}
                        className="p-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 font-semibold text-slate-850"
                        onMouseDown={() => {
                          setCatalogForm((p) => ({ ...p, brand: br }));
                          const models = deviceModels
                            .filter((x) => x.brand.toLowerCase() === br.toLowerCase())
                            .map((x) => x.model);
                          setModelSuggestions(models);
                        }}
                      >
                        {br}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Model Suggestion input */}
              <div className="relative flex flex-col gap-1">
                <label className="text-2xs font-bold text-slate-600">Model {catalogForm.category === "Telefon" && "*"}</label>
                <input
                  className="field w-full text-sm"
                  placeholder="iPhone 11, Galaxy S21..."
                  value={catalogForm.model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  onFocus={() => setShowModelDropdown(true)}
                  onBlur={() => setTimeout(() => setShowModelDropdown(false), 200)}
                  required={catalogForm.category === "Telefon"}
                />
                {showModelDropdown && modelSuggestions.length > 0 && (
                  <div className="absolute top-14 left-0 w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg z-10 max-h-40 overflow-y-auto text-xs">
                    {modelSuggestions.slice(0, 10).map((md) => (
                      <div
                        key={md}
                        className="p-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 font-semibold text-slate-850"
                        onMouseDown={() => setCatalogForm((p) => ({ ...p, model: md }))}
                      >
                        {md}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-2xs font-bold text-slate-600">Renk Varyantı {catalogForm.category === "Telefon" && "*"}</label>
                  <input
                    className="field w-full text-sm"
                    placeholder="Siyah, Uzay Grisi..."
                    value={catalogForm.variantColor}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, variantColor: e.target.value }))}
                    required={catalogForm.category === "Telefon"}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-2xs font-bold text-slate-600">Hafıza Varyantı {catalogForm.category === "Telefon" && "*"}</label>
                  <input
                    className="field w-full text-sm"
                    placeholder="128GB, 256GB..."
                    value={catalogForm.variantStorage}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, variantStorage: e.target.value }))}
                    required={catalogForm.category === "Telefon"}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-2xs font-bold text-slate-600">Ürün Adı *</label>
                <input
                  className="field w-full text-sm"
                  placeholder="Ürün Adı..."
                  value={catalogForm.name}
                  onChange={(e) => setCatalogForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-2xs font-bold text-slate-600">Varsayılan Alış Fiyatı (KDV Hariç)</label>
                  <input
                    className="field w-full text-sm"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Alış Fiyatı..."
                    value={catalogForm.purchasePrice}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, purchasePrice: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-2xs font-bold text-slate-600">Varsayılan Satış Fiyatı (KDV Hariç)</label>
                  <input
                    className="field w-full text-sm font-bold text-blue-800"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Satış Fiyatı..."
                    value={catalogForm.salePrice}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, salePrice: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-2xs font-bold text-slate-600">Başlangıç Stok Miktarı</label>
                  <input
                    className="field w-full text-sm"
                    type="number"
                    min={0}
                    placeholder="Stok Adeti..."
                    value={catalogForm.stock}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, stock: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-2xs font-bold text-slate-600">SKU / Barkod (Otomatik) *</label>
                  <input
                    className="field w-full text-sm font-mono bg-slate-50"
                    value={catalogForm.sku}
                    readOnly
                    required
                  />
                </div>
              </div>

              {catalogForm.requiresSerialNumber ? (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl animate-fade-in">
                  <div className="flex flex-col gap-1">
                    <label className="text-2xs font-bold text-slate-600">
                      IMEI Numarası {Number(catalogForm.stock) > 0 && "*"}
                    </label>
                    <input
                      className="field w-full text-sm font-mono bg-white"
                      placeholder="15 Haneli IMEI..."
                      value={catalogForm.imei || ""}
                      onChange={(e) => setCatalogForm((p) => ({ ...p, imei: e.target.value }))}
                      maxLength={16}
                      required={Number(catalogForm.stock) > 0}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-2xs font-bold text-slate-600">Cihaz Durumu</label>
                    <select
                      className="field w-full text-xs font-bold bg-white"
                      value={catalogForm.condition || "1. Sıfır"}
                      onChange={(e) => setCatalogForm((p) => ({ ...p, condition: e.target.value }))}
                    >
                      <option value="1. Sıfır">1. Sıfır</option>
                      <option value="2. El">2. El</option>
                      <option value="Yenilenmiş">Yenilenmiş</option>
                      <option value="Teşhir">Teşhir</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1 p-3 bg-slate-50 border border-slate-200/80 rounded-xl animate-fade-in">
                  <label className="text-2xs font-bold text-slate-600">Seri Numarası (Opsiyonel)</label>
                  <input
                    className="field w-full text-sm bg-white"
                    placeholder="Seri Numarası girin..."
                    value={(catalogForm as any).serialNumber || ""}
                    onChange={(e) => setCatalogForm((p) => ({ ...p, serialNumber: e.target.value }))}
                  />
                </div>
              )}

              <div className="flex gap-2.5 mt-2">
                <button
                  type="submit"
                  className="primary-btn flex-1 py-2.5 font-bold text-sm cursor-pointer shadow-md shadow-blue-700/10 hover:shadow-blue-700/20"
                  disabled={saving}
                >
                  {saving ? "Kart Oluşturuluyor..." : "Ürün Kartı Oluştur"}
                </button>
                <button
                  type="button"
                  className="field w-28 py-2.5 cursor-pointer font-medium text-slate-500 hover:text-slate-800"
                  onClick={resetCatalogForm}
                >
                  Temizle
                </button>
              </div>
            </form>
          </div>

          {/* Catalog Cards List View */}
          <div className="lg:col-span-7 panel p-6 flex flex-col gap-4 bg-white shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="m-0 text-base font-bold text-slate-800">
                Mevcut Ürün Kartı Kataloğu
              </h3>
              <button
                type="button"
                className="btn text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg border border-slate-200 cursor-pointer shadow-sm disabled:opacity-50"
                onClick={handleLoadDefaultCards}
                disabled={loadingSeed}
              >
                {loadingSeed ? "Yükleniyor..." : "Varsayılan Kartları Yükle"}
              </button>
            </div>
            
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl max-h-[580px] overflow-y-auto">
              {catalogCards.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">Henüz tanımlı katalog kartı yok.</div>
              ) : (
                <table className="data-table text-xs">
                  <thead>
                    <tr>
                      <th>Barkod / SKU</th>
                      <th>Ürün Tanımı</th>
                      <th>Kategori</th>
                      <th>Varsayılan Alış</th>
                      <th>Varsayılan Satış</th>
                      <th>Mevcut Stok</th>
                      <th className="text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogCards.map((card) => (
                      <tr
                        key={card.id}
                        className="hover:bg-slate-50/50 cursor-pointer"
                        onClick={() => setSelectedProductCardId(card.id)}
                        title="Ürün kartını aç"
                      >
                        <td className="font-mono text-[11px] text-slate-500 font-bold">{card.barcode}</td>
                        <td>
                          <div className="flex flex-col">
                            <strong>{card.name}</strong>
                            <span className="text-slate-400 text-[10px]">
                              {[card.brand, card.model, card.variantStorage, card.variantColor].filter(Boolean).join(" / ") || "-"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="bg-slate-100 text-slate-650 text-2xs px-2 py-0.5 rounded font-bold">
                            {card.category || "Genel"}
                          </span>
                        </td>
                        <td className="font-semibold text-slate-700">{Number(card.purchasePrice || 0).toLocaleString("tr-TR")} TL</td>
                        <td className="font-bold text-blue-800">{Number(card.salePrice || 0).toLocaleString("tr-TR")} TL</td>
                        <td className="font-bold text-slate-900">{card.stock || 0} Adet</td>
                        <td className="text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => void deleteCatalogCard(card.id, card.name)}
                            className="px-2.5 py-1 text-2xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                            title="Ürün kartını sil"
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}

                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Reports & Logs Dashboard */}
      {activeTab === "report" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Report Summary Cards */}
          <div className="panel p-6 flex flex-col gap-4 bg-white">
            <h3 className="m-0 text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
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
                <p className={`m-0 mt-1 text-xl font-extrabold ${totalInventoryRetail - totalInventoryCost >= 0 ? "text-blue-700" : "text-rose-600"}`}>
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
                        <td className={`font-bold ${row.profit >= 0 ? "text-blue-700" : "text-rose-600"}`}>{row.profit.toLocaleString("tr-TR")} TL</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Stock Movement Log Feed panel */}
          <div className="panel p-6 bg-white flex flex-col gap-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="m-0 text-base font-bold text-slate-800 flex items-center gap-2">
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
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-start justify-center z-50 p-4 pt-12 animate-fade-in">
          <div className="panel w-full max-w-[280px] p-4 border border-slate-200 shadow-xl bg-white/95 backdrop-blur-md rounded-2xl flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="m-0 text-xs font-bold text-slate-800">Barkod Önizleme</h3>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="text-slate-400 hover:text-slate-650 bg-slate-100 hover:bg-slate-200 transition-colors w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex justify-center items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.4)_1px,transparent_1px)] bg-[size:10px_10px] opacity-20 pointer-events-none" />
              
              <div className="w-[200px] h-[120px] bg-white text-black rounded p-2 flex flex-col justify-between shadow-md box-border select-none relative z-10 border border-slate-200">
                <div className="text-[7px] font-black text-slate-850 uppercase tracking-wider border-b border-black pb-0.5 mb-0.5 font-mono">
                  VibeGSM İletişim
                </div>
                <div className="text-[8px] leading-tight font-bold text-slate-900 line-clamp-2 overflow-hidden h-[18px] font-sans">
                  {selectedItem.name}
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-end h-[24px] w-full justify-center">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const hash = selectedItem.sku.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
                      const widths = [1, 1.5, 2, 1, 3, 1.5, 1, 2, 1.5, 1];
                      const width = widths[(hash + i) % widths.length] * 1.1;
                      const isLine = i % 2 === 0;
                      return isLine ? (
                        <div key={i} style={{
                          width: `${width}px`,
                          height: "100%",
                          backgroundColor: "#000000",
                          marginRight: `${((hash + i) % 2) + 0.8}px`
                        }} />
                      ) : null;
                    })}
                  </div>
                  <div className="text-[6px] font-mono mt-1 tracking-wider font-bold">
                    {selectedItem.sku}
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-dotted border-slate-350 pt-0.5">
                  <span className="text-[6px] text-slate-500 font-semibold uppercase">{selectedItem.category || "Genel"}</span>
                  <span className="text-[9px] font-black text-slate-955">
                    {Number(selectedItem.salePrice).toLocaleString("tr-TR")} TL
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handlePrintSticker(selectedItem)}
                className="primary-btn flex-1 py-2 flex items-center justify-center gap-2 font-bold text-xs cursor-pointer shadow-md shadow-blue-700/10 hover:shadow-blue-700/20"
              >
                Yazdır
              </button>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="field w-20 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      <ProductCardModal
        productId={selectedProductCardId}
        onClose={() => setSelectedProductCardId(null)}
        onSaved={() => {
          fetchCatalog();
          setSelectedProductCardId(null);
        }}
      />
      <ErpProductMatrixCreator
        isOpen={showErpMatrixCreator}
        onClose={() => setShowErpMatrixCreator(false)}
        onCreated={() => {
          void fetchCatalog();
          void fetchItems();
        }}
      />
      {confirmDialog}
    </section>

  );
}
