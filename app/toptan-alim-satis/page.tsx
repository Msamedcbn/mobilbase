"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Branch = { id: string; name: string };
type Product = { id: string; name: string };
type Movement = { id: string; transactionNo: string; type: "INCOME" | "EXPENSE"; totalAmount: number; note: string | null; createdAt: string; branchId?: string | null; branch?: Branch | null };

export default function WholesalePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [action, setAction] = useState<"EXTERNAL_PURCHASE" | "EXTERNAL_SALE" | "INTERNAL_TRANSFER">("EXTERNAL_PURCHASE");
  const [productId, setProductId] = useState("");
  const [newProductMode, setNewProductMode] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [targetBranchId, setTargetBranchId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => Number(quantity || 0) * Number(unitPrice || 0), [quantity, unitPrice]);
  const todayMovements = useMemo(() => movements.filter((m) => new Date(m.createdAt).toDateString() === new Date().toDateString()), [movements]);
  const todayVolume = useMemo(() => todayMovements.reduce((sum, m) => sum + Number(m.totalAmount || 0), 0), [todayMovements]);

  async function fetchData() {
    const res = await fetch("/api/wholesale");
    const json = await res.json();
    setBranches(json.branches || []);
    setProducts(json.products || []);
    setMovements(json.movements || []);
    if (!productId && (json.products || []).length) setProductId(json.products[0].id);
    if (!sourceBranchId && (json.branches || []).length) setSourceBranchId(json.branches[0].id);
    if (!targetBranchId && (json.branches || []).length > 1) setTargetBranchId(json.branches[1].id);
  }

  useEffect(() => { void fetchData(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newProductMode && !newProductName.trim()) {
      toast.error("Yeni urun adi zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/wholesale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          productId: newProductMode ? "" : productId,
          newProductName: newProductMode ? newProductName.trim() : "",
          sourceBranchId,
          targetBranchId,
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
          invoiceNo,
          note,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Islem basarisiz");
      toast.success("Toptan islem kaydedildi.");
      setNote("");
      setInvoiceNo("");
      setNewProductName("");
      setNewProductMode(false);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Islem basarisiz");
    } finally {
      setSaving(false);
    }
  }

  const actionOptions: { value: typeof action; label: string; icon: JSX.Element }[] = [
    {
      value: "EXTERNAL_PURCHASE",
      label: "Dış Alış",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      ),
    },
    {
      value: "EXTERNAL_SALE",
      label: "Dış Satış",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      ),
    },
    {
      value: "INTERNAL_TRANSFER",
      label: "İç Transfer",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      ),
    },
  ];

  const movementTypeLabel = (t: Movement["type"]) => (t === "INCOME" ? "Gelir" : "Gider");
  const movementBadgeClass = (t: Movement["type"]) =>
    t === "INCOME" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <section className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <div>
            <h2 className="page-title !m-0">Toptan Alış &amp; Tedarik Yönetimi</h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Tedarikçi alışları, toplu satışlar ve şubeler arası stok transferleri.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="panel p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bugün İşlem</p>
          <p className="mt-1 text-2xl font-black text-slate-900 font-mono">{todayMovements.length}</p>
        </div>
        <div className="panel p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bugün Hacim</p>
          <p className="mt-1 text-2xl font-black text-slate-900 font-mono">{todayVolume.toLocaleString("tr-TR")} TL</p>
        </div>
        <div className="panel p-4 col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hızlı İşlem Tipi</p>
          <div className="flex gap-1.5 mt-2">
            {actionOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setAction(opt.value);
                  if (opt.value !== "EXTERNAL_PURCHASE") setNewProductMode(false);
                }}
                title={opt.label}
                className={`flex-1 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  action === opt.value ? "bg-blue-600 text-white shadow-sm shadow-blue-900/20" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {opt.icon}
              </button>
            ))}
          </div>
        </div>
        <div className="panel p-4 col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hazır Miktar</p>
          <div className="flex gap-1.5 mt-2">
            {[1, 5, 10].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuantity(String(q))}
                className={`flex-1 h-8 rounded-lg text-xs font-bold font-mono transition-colors ${
                  quantity === String(q) ? "bg-blue-600 text-white shadow-sm shadow-blue-900/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form className="panel p-4 space-y-3" onSubmit={submit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            className="field"
            value={action}
            onChange={(e) => {
              const next = e.target.value as typeof action;
              setAction(next);
              if (next !== "EXTERNAL_PURCHASE") setNewProductMode(false);
            }}
          >
            <option value="EXTERNAL_PURCHASE">Dışarıdan Toptan Alış</option>
            <option value="EXTERNAL_SALE">Dışarıya Toptan Satış</option>
            <option value="INTERNAL_TRANSFER">Şubeler Arası İç Satış/Alış</option>
          </select>
          {newProductMode ? (
            <input
              className="field"
              placeholder="Yeni Ürün Adı"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
            />
          ) : (
            <select className="field" value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <input className="field" placeholder="Fatura / Belge No" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
        </div>

        {action === "EXTERNAL_PURCHASE" && (
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newProductMode}
              onChange={(e) => setNewProductMode(e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
            />
            Kataloğa kayıtlı olmayan yeni bir ürün alıyorum
          </label>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <select className="field" value={sourceBranchId} onChange={(e) => setSourceBranchId(e.target.value)}>
            <option value="">Kaynak Şube</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="field" value={targetBranchId} onChange={(e) => setTargetBranchId(e.target.value)}>
            <option value="">Hedef Şube</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input className="field font-mono" type="number" min={1} placeholder="Adet" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <input className="field font-mono" type="number" min={0} step="0.01" placeholder="Birim Fiyat" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        </div>

        <input className="field" placeholder="Not" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-slate-500 font-semibold">
            Toplam <span className="text-lg font-black text-slate-900 font-mono ml-1">{total.toLocaleString("tr-TR")} TL</span>
          </p>
          <button className="primary-btn text-sm py-2 px-5" disabled={saving}>{saving ? "Kaydediliyor..." : "İşlemi Kaydet"}</button>
        </div>
      </form>

      <div className="panel overflow-hidden">
        {movements.length === 0 ? (
          <div className="empty-box">Kayıt bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-xs">Tarih</th>
                  <th className="text-xs">No</th>
                  <th className="text-xs">Tip</th>
                  <th className="text-xs">Şube</th>
                  <th className="text-xs">Tutar</th>
                  <th className="text-xs">Not</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="text-xs text-slate-500 whitespace-nowrap font-mono">{new Date(m.createdAt).toLocaleString("tr-TR")}</td>
                    <td className="text-xs font-mono text-slate-500">{m.transactionNo}</td>
                    <td className="text-xs">
                      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${movementBadgeClass(m.type)}`}>
                        {movementTypeLabel(m.type)}
                      </span>
                    </td>
                    <td className="text-xs text-slate-600 font-semibold">{m.branch?.name || branches.find((b) => b.id === m.branchId)?.name || "—"}</td>
                    <td className="text-xs font-bold text-slate-900 font-mono">{Number(m.totalAmount).toLocaleString("tr-TR")} TL</td>
                    <td className="text-xs text-slate-500 max-w-[240px] truncate" title={m.note || undefined}>{m.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
