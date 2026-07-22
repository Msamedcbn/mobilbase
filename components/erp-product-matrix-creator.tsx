"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

type CategoryOption = {
  id: string;
  name: string;
  icon: string;
  prefix: string;
  requiresSerialNumber: boolean;
};

const CATEGORIES: CategoryOption[] = [
  { id: "Telefon", name: "Telefon & Tablet", icon: "📱", prefix: "TEL", requiresSerialNumber: true },
  { id: "Aksesuar", name: "Aksesuar & Kılıf", icon: "🎧", prefix: "AKS", requiresSerialNumber: false },
  { id: "Yedek Parça", name: "Yedek Parça & Ekran", icon: "🛠️", prefix: "PAR", requiresSerialNumber: false },
  { id: "Elektronik", name: "Bilgisayar & Diğer", icon: "💻", prefix: "ELK", requiresSerialNumber: false },
];

const STORAGE_PRESETS = ["64GB", "128GB", "256GB", "512GB", "1TB"];
const COLOR_PRESETS = ["Siyah", "Beyaz", "Mavi", "Doğal Titanyum", "Uzay Siyahı", "Yeşil", "Şeffaf"];

export function ErpProductMatrixCreator({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>(CATEGORIES[0]);
  const [brand, setBrand] = useState("Apple");
  const [model, setModel] = useState("");
  const [customName, setCustomName] = useState("");
  
  // Matrix Variant Choices
  const [selectedStorages, setSelectedStorages] = useState<string[]>(["128GB", "256GB"]);
  const [selectedColors, setSelectedColors] = useState<string[]>(["Siyah", "Doğal Titanyum"]);
  const [customColor, setCustomColor] = useState("");
  
  // Global Prices for Matrix
  const [basePurchasePrice, setBasePurchasePrice] = useState("0");
  const [baseSalePrice, setBaseSalePrice] = useState("0");
  const [initialStock, setInitialStock] = useState("0");

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const toggleStorage = (item: string) => {
    setSelectedStorages((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
    );
  };

  const toggleColor = (item: string) => {
    setSelectedColors((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const addCustomColor = () => {
    if (!customColor.trim()) return;
    if (!selectedColors.includes(customColor.trim())) {
      setSelectedColors((prev) => [...prev, customColor.trim()]);
    }
    setCustomColor("");
  };

  // Compute combinations
  const generatedVariants: Array<{ name: string; storage: string; color: string; sku: string }> = [];
  if (selectedCategory.id === "Telefon") {

    const storages = selectedStorages.length > 0 ? selectedStorages : [""];
    const colors = selectedColors.length > 0 ? selectedColors : [""];
    for (const s of storages) {
      for (const c of colors) {
        const fullTitle = [brand.trim(), model.trim(), s, c].filter(Boolean).join(" ");
        const sku = `TEL-${cleanString(brand)}-${cleanString(model)}-${cleanString(s)}-${cleanString(c)}`.replace(/-+/g, "-");
        generatedVariants.push({ name: fullTitle, storage: s, color: c, sku });
      }
    }
  } else {
    const titleBase = customName.trim() || [brand.trim(), model.trim()].filter(Boolean).join(" ");
    const colors = selectedColors.length > 0 ? selectedColors : ["Standard"];
    for (const c of colors) {
      const fullTitle = c === "Standard" ? titleBase : `${titleBase} (${c})`;
      const sku = `${selectedCategory.prefix}-${cleanString(brand || "GENEL")}-${cleanString(titleBase)}-${cleanString(c)}`.replace(/-+/g, "-");
      generatedVariants.push({ name: fullTitle, storage: "", color: c === "Standard" ? "" : c, sku });
    }
  }

  async function handleBatchCreate() {
    if (selectedCategory.id === "Telefon" && (!brand.trim() || !model.trim())) {
      toast.error("Lütfen Marka ve Model adını girin.");
      return;
    }
    if (selectedCategory.id !== "Telefon" && !customName.trim() && !model.trim()) {
      toast.error("Lütfen Ürün Adı girin.");
      return;
    }
    if (generatedVariants.length === 0) {
      toast.error("Üretilecek en az 1 varyant oluşturulmalıdır.");
      return;
    }

    setSaving(true);
    let successCount = 0;

    try {
      for (const variant of generatedVariants) {
        const res = await fetch("/api/products?catalog=true", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: variant.sku,
            barcode: variant.sku,
            name: variant.name,
            category: selectedCategory.id,
            brand: brand.trim() || null,
            model: model.trim() || null,
            variantColor: variant.color || null,
            variantStorage: variant.storage || null,
            purchasePrice: Number(basePurchasePrice || 0),
            salePrice: Number(baseSalePrice || 0),
            stock: Number(initialStock || 0),
            isCatalog: true,
            requiresSerialNumber: selectedCategory.requiresSerialNumber,
          }),
        });

        if (res.ok) successCount++;
      }

      toast.success(`Tebrikler! ${successCount} adet varyant ürün kartı ERP kataloğuna eklendi.`);
      onCreated();
      onClose();
    } catch {
      toast.error("Varyantlar eklenirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-200">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">ERP Varyantlı Ürün Kartı Sihirbazı</h2>
              <p className="text-xs text-slate-500">Ana Kategori ➔ Şablon ➔ Toplu Varyant Kartları Üretimi</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center">
            ✕
          </button>
        </div>

        {/* Wizard Steps indicator */}
        <div className="flex border-b border-slate-100 bg-slate-50/40 px-6 py-2 gap-4 text-xs font-bold">
          <button onClick={() => setStep(1)} className={`flex items-center gap-2 pb-1 border-b-2 transition-all ${step === 1 ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>
            <span>1. Ana Kategori</span>
          </button>
          <button onClick={() => setStep(2)} className={`flex items-center gap-2 pb-1 border-b-2 transition-all ${step === 2 ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>
            <span>2. Şablon & Varyant Seçimi</span>
          </button>
          <button onClick={() => setStep(3)} className={`flex items-center gap-2 pb-1 border-b-2 transition-all ${step === 3 ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"}`}>
            <span>3. Fiyat & Önizleme ({generatedVariants.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Ana Kategori Seçin</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className={`p-5 rounded-2xl border text-center transition-all flex flex-col items-center gap-3 cursor-pointer ${
                      selectedCategory.id === cat.id
                        ? "border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <span className="text-3xl">{cat.icon}</span>
                    <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                  </button>
                ))}
              </div>

              <div className="pt-4 flex justify-end">
                <button onClick={() => setStep(2)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md">
                  Devam Et ➔
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ürün Şablon Bilgileri</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Marka</label>
                    <input
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      placeholder="örn. Apple, Samsung, Anker"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                    />
                  </div>
                  {selectedCategory.id === "Telefon" ? (
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Model Ailesi</label>
                      <input
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                        placeholder="örn. iPhone 15 Pro, Galaxy S24"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Ürün / Şablon Adı</label>
                      <input
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                        placeholder="örn. MagSafe Şarj Cihazı 20W"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Variant Matrix Checkboxes */}
              {selectedCategory.id === "Telefon" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Hafıza / Kapasite Seçenekleri (Matris)</label>
                  <div className="flex flex-wrap gap-2">
                    {STORAGE_PRESETS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleStorage(s)}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                          selectedStorages.includes(s)
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Renk Varyantları (Matris)</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleColor(c)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                        selectedColors.includes(c)
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 max-w-xs pt-2">
                  <input
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                    placeholder="Özel renk ekle..."
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                  />
                  <button type="button" onClick={addCustomColor} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl">Ekle</button>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-500 text-xs font-bold">⬅ Geri</button>
                <button onClick={() => setStep(3)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md">
                  İleri: Fiyat & Üretim ({generatedVariants.length} Varyant) ➔
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-indigo-700 block mb-1">Varsayılan Alış Fiyatı</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold"
                    value={basePurchasePrice}
                    onChange={(e) => setBasePurchasePrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-indigo-700 block mb-1">Varsayılan Satış Fiyatı</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold"
                    value={baseSalePrice}
                    onChange={(e) => setBaseSalePrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-indigo-700 block mb-1">Başlangıç Stoğu</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Oluşturulacak Varyant Kartları Listesi ({generatedVariants.length} Adet)</h4>
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white">
                  {generatedVariants.map((v, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-900 block">{v.name}</strong>
                        <span className="text-[10px] font-mono text-slate-400">SKU: {v.sku}</span>
                      </div>
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {selectedCategory.id}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button onClick={() => setStep(2)} className="px-4 py-2 text-slate-500 text-xs font-bold">⬅ Geri</button>
                <button
                  onClick={handleBatchCreate}
                  disabled={saving}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg disabled:opacity-50"
                >
                  {saving ? "Oluşturuluyor..." : `✨ ${generatedVariants.length} Varyant Ürün Kartını Kataloğa Ekle`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function cleanString(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toUpperCase()
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ş/g, "S")
    .replace(/İ/g, "I")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C")
    .replace(/[^A-Z0-9-]/g, "");
}
