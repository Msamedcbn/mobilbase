"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Expense = {
  id: string;
  transactionNo: string;
  type: "EXPENSE";
  paymentMethod: "CASH" | "CREDIT_CARD" | "ON_ACCOUNT";
  totalAmount: number;
  note: string | null;
  createdAt: string;
  branchId: string | null;
  branch?: { id: string; name: string } | null;
};

type Branch = { id: string; name: string };
type BankAccount = { id: string; name: string; balance: number };

const DEFAULT_EXPENSE_TYPES = ["Kira", "Fatura", "Maas", "Mal Alimi", "Diger"];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expenseTypes, setExpenseTypes] = useState<string[]>(DEFAULT_EXPENSE_TYPES);
  const [newExpenseType, setNewExpenseType] = useState("");

  const [formCategory, setFormCategory] = useState(DEFAULT_EXPENSE_TYPES[0]);
  const [formAmount, setFormAmount] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState<"CASH" | "CREDIT_CARD" | "ON_ACCOUNT">("CASH");
  const [formBranchId, setFormBranchId] = useState("");
  const [formBankAccountId, setFormBankAccountId] = useState("");

  const [filterCategory, setFilterCategory] = useState("All");
  const [filterBranch, setFilterBranch] = useState("All");

  function parseExpenseDetails(noteStr: string | null) {
    if (!noteStr) return { category: "Diger", details: "" };
    const match = noteStr.match(/^\[Kategori:\s*([^\]]+)\]\s*(.*)$/i);
    if (match) return { category: match[1].trim(), details: match[2].trim() };
    return { category: "Diger", details: noteStr };
  }

  async function fetchData() {
    setLoading(true);
    try {
      const [expRes, branchRes, bankRes, settingsRes] = await Promise.all([
        fetch("/api/expenses"),
        fetch("/api/branches"),
        fetch("/api/banks").catch(() => null),
        fetch("/api/settings").catch(() => null),
      ]);
      const expJson = await expRes.json();
      setExpenses(Array.isArray(expJson) ? expJson : []);

      if (branchRes.ok) {
        const bJson = await branchRes.json();
        setBranches(Array.isArray(bJson) ? bJson : []);
        if ((bJson || []).length && !formBranchId) setFormBranchId(bJson[0].id);
      }

      if (bankRes && bankRes.ok) {
        const bankJson = await bankRes.json();
        setBanks(Array.isArray(bankJson) ? bankJson : []);
      }

      if (settingsRes && settingsRes.ok) {
        const s = await settingsRes.json();
        const settings = s.data || s;
        if (Array.isArray(settings?.expenseTypes) && settings.expenseTypes.length > 0) {
          setExpenseTypes(settings.expenseTypes);
          setFormCategory(settings.expenseTypes[0]);
        }
      }
    } catch {
      toast.error("Gider verileri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchData(); }, []);

  async function addExpenseType() {
    const name = newExpenseType.trim();
    if (!name) return;
    if (expenseTypes.some((x) => x.toLowerCase() === name.toLowerCase())) {
      toast.error("Bu gider tipi zaten var.");
      return;
    }
    const next = [...expenseTypes, name];
    try {
      const sRes = await fetch("/api/settings");
      const sJson = await sRes.json();
      const current = sJson.data || sJson;
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, expenseTypes: next }),
      });
      if (!res.ok) throw new Error();
      setExpenseTypes(next);
      setFormCategory(name);
      setNewExpenseType("");
      toast.success("Gider tipi eklendi.");
    } catch {
      toast.error("Gider tipi kaydedilemedi.");
    }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(formAmount || 0);
    if (amount <= 0) return toast.error("Gecerli tutar girin.");

    try {
      const note = `[Kategori: ${formCategory}] ${formNote}`.trim();
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAmount: amount,
          paymentMethod: formPaymentMethod,
          note,
          branchId: formBranchId || null,
          bankAccountId: formPaymentMethod !== "ON_ACCOUNT" && formBankAccountId ? formBankAccountId : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kayit basarisiz");
      toast.success("Gider eklendi.");
      setShowAddModal(false);
      setFormAmount("");
      setFormNote("");
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kayit basarisiz");
    }
  }

  const filtered = useMemo(() => {
    return expenses.filter((exp) => {
      const { category } = parseExpenseDetails(exp.note);
      const okCategory = filterCategory === "All" || category.toLowerCase() === filterCategory.toLowerCase();
      const okBranch = filterBranch === "All" || (exp.branchId || "") === filterBranch;
      return okCategory && okBranch;
    });
  }, [expenses, filterCategory, filterBranch]);

  return (
    <section className="compact-shell" style={{ display: "grid", gap: 10 }}>
      <h2 className="page-title" style={{ margin: 0 }}>Gider Yonetimi</h2>
      <div className="panel" style={{ padding: "0.7rem", display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 12, color: "#64748b" }}>Kategori Filtresi</label>
          <select className="field" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="All">Tum Kategoriler</option>
            {expenseTypes.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#64748b" }}>Sube</label>
          <select className="field" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="All">Tum Subeler</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <button className="primary-btn" style={{ width: 180 }} onClick={() => setShowAddModal(true)}>Yeni Gider Ekle</button>
      </div>

      <div className="panel panel-scroll" style={{ maxHeight: 420 }}>
        {loading ? <div className="empty-box">Yukleniyor...</div> : (
          <table className="data-table">
            <thead><tr><th>No</th><th>Kategori</th><th>Aciklama</th><th>Sube</th><th>Tarih</th><th>Tutar</th></tr></thead>
            <tbody>
              {filtered.map((e) => {
                const d = parseExpenseDetails(e.note);
                return (
                  <tr key={e.id}>
                    <td>{e.transactionNo}</td>
                    <td>{d.category}</td>
                    <td>{d.details || "-"}</td>
                    <td>{branches.find((b) => b.id === e.branchId)?.name || "-"}</td>
                    <td>{new Date(e.createdAt).toLocaleString("tr-TR")}</td>
                    <td>{Number(e.totalAmount).toLocaleString("tr-TR")} TL</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <form className="panel" style={{ width: 620, maxWidth: "95vw", padding: "0.8rem", display: "grid", gap: 8 }} onSubmit={addExpense}>
            <h3 style={{ margin: 0 }}>Yeni Gider</h3>
            <div className="form-grid-2">
              <select className="field" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                {expenseTypes.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <input className="field" type="number" min={0.01} step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="Tutar" />
            </div>
            <div className="form-grid-2">
              <select className="field" value={formPaymentMethod} onChange={(e) => setFormPaymentMethod(e.target.value as any)}>
                <option value="CASH">Nakit</option><option value="CREDIT_CARD">Kredi Karti</option><option value="ON_ACCOUNT">Cari</option>
              </select>
              <select className="field" value={formBranchId} onChange={(e) => setFormBranchId(e.target.value)}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {formPaymentMethod !== "ON_ACCOUNT" && (
              <div>
                <label style={{ fontSize: 12, color: "#64748b" }}>Odenen Kasa/Banka (Isteğe Bağlı)</label>
                <select className="field" value={formBankAccountId} onChange={(e) => setFormBankAccountId(e.target.value)}>
                  <option value="">Seçiniz... (bakiye düşülmez)</option>
                  {banks.map((b) => <option key={b.id} value={b.id}>{b.name} ({Number(b.balance).toLocaleString("tr-TR")} TL)</option>)}
                </select>
              </div>
            )}
            <input className="field" value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="Aciklama" />
            <div className="form-grid-2">
              <input className="field" value={newExpenseType} onChange={(e) => setNewExpenseType(e.target.value)} placeholder="Yeni gider tipi (ornek: Kargo)" />
              <button type="button" className="field" onClick={addExpenseType}>Gider Tipi Ekle</button>
            </div>
            <div style={{ display: "flex", justifyContent: "end", gap: 8 }}>
              <button type="button" className="field" style={{ width: 110 }} onClick={() => setShowAddModal(false)}>Kapat</button>
              <button className="primary-btn" style={{ width: 140 }}>Kaydet</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
