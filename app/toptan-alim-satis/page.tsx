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

  return (
    <section className="compact-shell space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
            <span>📦 SCM - Toptan Tedarik & Alış-Satış</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Toptan Alış & Tedarik Yönetimi</h2>
          <p className="text-xs text-slate-500">Tedarikçi alışları, toplu mal kabul işlemleri ve şubeler arası stok transferleri.</p>
        </div>
      </div>

      <div className="form-grid-4">
        <div className="panel" style={{ padding: "0.7rem" }}>
          <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>Bugun Islem</p>
          <p style={{ margin: "2px 0 0", fontWeight: 800, fontSize: 18 }}>{todayMovements.length}</p>
        </div>
        <div className="panel" style={{ padding: "0.7rem" }}>
          <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>Bugun Hacim</p>
          <p style={{ margin: "2px 0 0", fontWeight: 800, fontSize: 18 }}>{todayVolume.toLocaleString("tr-TR")} TL</p>
        </div>
        <div className="panel" style={{ padding: "0.7rem" }}>
          <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>Hizli Islem</p>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button type="button" className="field" style={{ width: 88 }} onClick={() => setAction("EXTERNAL_PURCHASE")}>Dis Alis</button>
            <button type="button" className="field" style={{ width: 88 }} onClick={() => { setAction("EXTERNAL_SALE"); setNewProductMode(false); }}>Dis Satis</button>
            <button type="button" className="field" style={{ width: 88 }} onClick={() => { setAction("INTERNAL_TRANSFER"); setNewProductMode(false); }}>Ic Transfer</button>
          </div>
        </div>
        <div className="panel" style={{ padding: "0.7rem" }}>
          <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>Hazir Miktar</p>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {[1, 5, 10].map((q) => <button key={q} type="button" className="field" style={{ width: 50 }} onClick={() => setQuantity(String(q))}>{q}</button>)}
          </div>
        </div>
      </div>
      <form className="panel" style={{ padding: "0.8rem", display: "grid", gap: 8 }} onSubmit={submit}>
        <div className="form-grid-3">
          <select
            className="field"
            value={action}
            onChange={(e) => {
              const next = e.target.value as typeof action;
              setAction(next);
              if (next !== "EXTERNAL_PURCHASE") setNewProductMode(false);
            }}
          >
            <option value="EXTERNAL_PURCHASE">Disaridan Toptan Alis</option>
            <option value="EXTERNAL_SALE">Disariya Toptan Satis</option>
            <option value="INTERNAL_TRANSFER">Subeler Arasi Ic Satis/Alis</option>
          </select>
          {newProductMode ? (
            <input
              className="field"
              placeholder="Yeni Urun Adi"
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
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#475569" }}>
            <input
              type="checkbox"
              checked={newProductMode}
              onChange={(e) => setNewProductMode(e.target.checked)}
            />
            Kataloga kayitli olmayan yeni bir urun alıyorum
          </label>
        )}

        <div className="form-grid-4">
          <select className="field" value={sourceBranchId} onChange={(e) => setSourceBranchId(e.target.value)}>
            <option value="">Kaynak Sube</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="field" value={targetBranchId} onChange={(e) => setTargetBranchId(e.target.value)}>
            <option value="">Hedef Sube</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input className="field" type="number" min={1} placeholder="Adet" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <input className="field" type="number" min={0} step="0.01" placeholder="Birim Fiyat" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        </div>

        <input className="field" placeholder="Not" value={note} onChange={(e) => setNote(e.target.value)} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>Toplam: {total.toLocaleString("tr-TR")} TL</strong>
          <button className="primary-btn" style={{ width: 220 }} disabled={saving}>{saving ? "Kaydediliyor..." : "Islemi Kaydet"}</button>
        </div>
      </form>

      <div className="panel panel-scroll" style={{ maxHeight: 390 }}>
        <table className="data-table">
          <thead><tr><th>Tarih</th><th>No</th><th>Tip</th><th>Sube</th><th>Tutar</th><th>Not</th></tr></thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt).toLocaleString("tr-TR")}</td>
                <td>{m.transactionNo}</td>
                <td>{m.type}</td>
                <td>{m.branch?.name || branches.find((b) => b.id === m.branchId)?.name || "-"}</td>
                <td>{Number(m.totalAmount).toLocaleString("tr-TR")} TL</td>
                <td>{m.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
