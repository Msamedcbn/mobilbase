"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

type ProductVariant = {
  id: string;
  size: string | null;
  color: string | null;
  barcode: string;
  stock: number;
  purchasePrice: string | number | null;
  salePrice: string | number | null;
};

type ProductDetail = {
  id: string;
  name: string;
  barcode: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  variantColor: string | null;
  variantStorage: string | null;
  condition: string | null;
  purchasePrice: string | number;
  salePrice: string | number;
  dealerPrice: string | number | null;
  wholesalePrice: string | number | null;
  images: string[] | null;
  variants: ProductVariant[];
};

type TabKey = "GENEL" | "VARYANT" | "FIYAT" | "RESIM";

const TABS: Array<{ id: TabKey; label: string }> = [
  { id: "GENEL", label: "Genel Bilgiler" },
  { id: "VARYANT", label: "Varyantlar" },
  { id: "FIYAT", label: "Fiyat Listeleri" },
  { id: "RESIM", label: "Resimler" },
];

export function ProductCardModal({
  productId,
  onClose,
  onSaved,
}: {
  productId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("GENEL");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [newVariant, setNewVariant] = useState({ size: "", color: "", barcode: "", stock: "0", salePrice: "" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setActiveTab("GENEL");
    setLoading(true);
    fetch(`/api/products/${productId}`)
      .then((r) => r.json())
      .then((data: ProductDetail) => setProduct(data))
      .catch(() => toast.error("Urun kartı yuklenemedi."))
      .finally(() => setLoading(false));
  }, [productId]);

  if (!productId) return null;

  async function saveGeneral() {
    if (!product) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          category: product.category,
          brand: product.brand,
          model: product.model,
          variantColor: product.variantColor,
          variantStorage: product.variantStorage,
          condition: product.condition,
          purchasePrice: Number(product.purchasePrice),
          salePrice: Number(product.salePrice),
          dealerPrice: product.dealerPrice != null ? Number(product.dealerPrice) : null,
          wholesalePrice: product.wholesalePrice != null ? Number(product.wholesalePrice) : null,
          images: product.images,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Kaydedilemedi");
      toast.success("Ürün kartı kaydedildi");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function addVariant() {
    if (!product) return;
    try {
      const res = await fetch(`/api/products/${product.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size: newVariant.size || null,
          color: newVariant.color || null,
          barcode: newVariant.barcode || undefined,
          stock: Number(newVariant.stock) || 0,
          salePrice: newVariant.salePrice ? Number(newVariant.salePrice) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Varyant eklenemedi");
      setProduct({ ...product, variants: [...product.variants, json] });
      setNewVariant({ size: "", color: "", barcode: "", stock: "0", salePrice: "" });
      toast.success("Varyant eklendi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Varyant eklenemedi");
    }
  }

  async function removeVariant(variantId: string) {
    if (!product) return;
    const res = await fetch(`/api/products/${product.id}/variants/${variantId}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Varyant silinemedi");
    setProduct({ ...product, variants: product.variants.filter((v) => v.id !== variantId) });
  }

  async function uploadImage(file: File) {
    if (!product) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Resim yuklenemedi");
      setProduct({ ...product, images: [...(product.images || []), json.url] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resim yuklenemedi");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    if (!product) return;
    setProduct({ ...product, images: (product.images || []).filter((u) => u !== url) });
  }

  async function deleteProductCard() {
    if (!product) return;
    if (!confirm(`"${product.name}" ürün kartını silmek istediğinizden emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Silinemedi");
      toast.success(json.message || "Ürün kartı silindi");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Silinemedi");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl h-[85vh] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-black text-slate-800">Ürün Kartı</h2>
            {product && <p className="text-[11px] text-slate-400 font-mono mt-0.5">Barkod: {product.barcode}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/30 p-6">
          {loading || !product ? (
            <div className="text-center text-slate-400 text-sm py-10">Yükleniyor...</div>
          ) : (
            <>
              {activeTab === "GENEL" && (
                <div className="grid grid-cols-2 gap-4 max-w-2xl">
                  <Field label="Ürün Adı" value={product.name} onChange={(v) => setProduct({ ...product, name: v })} />
                  <Field label="Kategori" value={product.category ?? ""} onChange={(v) => setProduct({ ...product, category: v })} />
                  <Field label="Marka" value={product.brand ?? ""} onChange={(v) => setProduct({ ...product, brand: v })} />
                  <Field label="Model" value={product.model ?? ""} onChange={(v) => setProduct({ ...product, model: v })} />
                  <Field label="Renk" value={product.variantColor ?? ""} onChange={(v) => setProduct({ ...product, variantColor: v })} />
                  <Field label="Hafıza/Beden" value={product.variantStorage ?? ""} onChange={(v) => setProduct({ ...product, variantStorage: v })} />
                  <Field label="Durum" value={product.condition ?? ""} onChange={(v) => setProduct({ ...product, condition: v })} />
                </div>
              )}

              {activeTab === "VARYANT" && (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="text-left p-2">Beden</th>
                          <th className="text-left p-2">Renk</th>
                          <th className="text-left p-2">Barkod</th>
                          <th className="text-right p-2">Stok</th>
                          <th className="text-right p-2">Satış Fiyatı</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.variants.length === 0 ? (
                          <tr><td colSpan={6} className="p-4 text-center text-slate-400">Varyant yok</td></tr>
                        ) : (
                          product.variants.map((v) => (
                            <tr key={v.id} className="border-t border-slate-100">
                              <td className="p-2">{v.size ?? "-"}</td>
                              <td className="p-2">{v.color ?? "-"}</td>
                              <td className="p-2 font-mono">{v.barcode}</td>
                              <td className="p-2 text-right">{v.stock}</td>
                              <td className="p-2 text-right">{v.salePrice != null ? `${Number(v.salePrice).toLocaleString("tr-TR")} TL` : "-"}</td>
                              <td className="p-2 text-right">
                                <button onClick={() => removeVariant(v.id)} className="text-rose-500 hover:text-rose-700 text-[11px] font-bold">Sil</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-5 gap-2 items-end">
                    <MiniField label="Beden" value={newVariant.size} onChange={(v) => setNewVariant({ ...newVariant, size: v })} />
                    <MiniField label="Renk" value={newVariant.color} onChange={(v) => setNewVariant({ ...newVariant, color: v })} />
                    <MiniField label="Barkod (opsiyonel)" value={newVariant.barcode} onChange={(v) => setNewVariant({ ...newVariant, barcode: v })} />
                    <MiniField label="Stok" value={newVariant.stock} onChange={(v) => setNewVariant({ ...newVariant, stock: v })} />
                    <button onClick={addVariant} className="h-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold">
                      Varyant Ekle
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "FIYAT" && (
                <div className="grid grid-cols-2 gap-4 max-w-2xl">
                  <NumberField label="Alış Fiyatı" value={String(product.purchasePrice)} onChange={(v) => setProduct({ ...product, purchasePrice: v })} />
                  <NumberField label="Perakende Satış Fiyatı" value={String(product.salePrice)} onChange={(v) => setProduct({ ...product, salePrice: v })} />
                  <NumberField label="Bayi Fiyatı" value={product.dealerPrice != null ? String(product.dealerPrice) : ""} onChange={(v) => setProduct({ ...product, dealerPrice: v || null })} />
                  <NumberField label="Toptan Fiyatı" value={product.wholesalePrice != null ? String(product.wholesalePrice) : ""} onChange={(v) => setProduct({ ...product, wholesalePrice: v || null })} />
                </div>
              )}

              {activeTab === "RESIM" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {(product.images || []).map((url) => (
                      <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <img src={url} alt="Ürün görseli" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(url)}
                          className="absolute top-1 right-1 bg-slate-900/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer hover:border-indigo-400 hover:text-indigo-500">
                      {uploading ? "Yükleniyor..." : "+ Resim Ekle"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <button
            type="button"
            onClick={deleteProductCard}
            disabled={saving || !product}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            Ürün Kartını Sil
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200">
              Kapat
            </button>
            <button onClick={saveGeneral} disabled={saving || !product} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold disabled:opacity-50">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</label>
      <input className="field w-full" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</label>
      <input type="number" min="0" step="0.01" className="field w-full" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function MiniField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</label>
      <input className="field w-full h-9 text-xs" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
