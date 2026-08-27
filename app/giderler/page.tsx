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

  const totalFiltered = useMemo(() => filtered.reduce((sum, e) => sum + Number(e.totalAmount || 0), 0), [filtered]);
  const paymentLabel: Record<Expense["paymentMethod"], string> = { CASH: "Nakit", CREDIT_CARD: "Kredi Kartı", ON_ACCOUNT: "Cari" };
  const paymentBadgeClass: Record<Expense["paymentMethod"], string> = {
    CASH: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CREDIT_CARD: "bg-blue-50 text-blue-700 border-blue-200",
    ON_ACCOUNT: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <section className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-4.5-9.75h16.5a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5v-9a1.5 1.5 0 011.5-1.5z" />
            </svg>
          </div>
          <div>
            <h2 className="page-title !m-0">Gider Yönetimi</h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium">İşletme giderlerinizi kategori ve şubeye göre takip edin.</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowAddModal(true)} className="primary-btn text-xs py-2 px-4">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Gider Ekle
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="panel p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Görüntülenen Toplam</p>
          <p className="mt-1 text-2xl font-black text-slate-900 font-mono">{totalFiltered.toLocaleString("tr-TR")} TL</p>
        </div>
        <div className="panel p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kayıt Sayısı</p>
          <p className="mt-1 text-2xl font-black text-slate-900 font-mono">{filtered.length}</p>
        </div>
        <div className="panel p-4 col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gider Tipi Sayısı</p>
          <p className="mt-1 text-2xl font-black text-slate-900 font-mono">{expenseTypes.length}</p>
        </div>
      </div>

      <div className="panel p-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Kategori Filtresi</label>
          <select className="field w-44" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="All">Tüm Kategoriler</option>
            {expenseTypes.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Şube</label>
          <select className="field w-44" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="All">Tüm Şubeler</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-box">Kayıt bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-xs">No</th>
                  <th className="text-xs">Kategori</th>
                  <th className="text-xs">Açıklama</th>
                  <th className="text-xs">Şube</th>
                  <th className="text-xs">Ödeme</th>
                  <th className="text-xs">Tarih</th>
                  <th className="text-xs">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const d = parseExpenseDetails(e.note);
                  return (
                    <tr key={e.id}>
                      <td className="text-xs font-mono text-slate-500">{e.transactionNo}</td>
                      <td className="text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold">{d.category}</span>
                      </td>
                      <td className="text-xs text-slate-500 max-w-[240px] truncate" title={d.details || undefined}>{d.details || "—"}</td>
                      <td className="text-xs text-slate-600 font-semibold">{branches.find((b) => b.id === e.branchId)?.name || "—"}</td>
                      <td className="text-xs">
                        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${paymentBadgeClass[e.paymentMethod]}`}>
                          {paymentLabel[e.paymentMethod]}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500 whitespace-nowrap font-mono">{new Date(e.createdAt).toLocaleString("tr-TR")}</td>
                      <td className="text-xs font-bold text-slate-900 font-mono">{Number(e.totalAmount).toLocaleString("tr-TR")} TL</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowAddModal(false)}>
          <form
            onSubmit={addExpense}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900">Yeni Gider</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Kategori</label>
                <select className="field" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                  {expenseTypes.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Tutar (TL)</label>
                <input className="field" type="number" min={0.01} step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Ödeme Yöntemi</label>
                <select className="field" value={formPaymentMethod} onChange={(e) => setFormPaymentMethod(e.target.value as any)}>
                  <option value="CASH">Nakit</option>
                  <option value="CREDIT_CARD">Kredi Kartı</option>
                  <option value="ON_ACCOUNT">Cari</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Şube</label>
                <select className="field" value={formBranchId} onChange={(e) => setFormBranchId(e.target.value)}>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {formPaymentMethod !== "ON_ACCOUNT" && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Ödenen Kasa/Banka (İsteğe Bağlı)</label>
                <select className="field" value={formBankAccountId} onChange={(e) => setFormBankAccountId(e.target.value)}>
                  <option value="">Seçiniz... (bakiye düşülmez)</option>
                  {banks.map((b) => <option key={b.id} value={b.id}>{b.name} ({Number(b.balance).toLocaleString("tr-TR")} TL)</option>)}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Açıklama</label>
              <input className="field" value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="Açıklama" />
            </div>

            <div className="space-y-1 rounded-xl border border-dashed border-slate-200 p-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Yeni Gider Tipi Ekle</label>
              <div className="flex gap-2">
                <input className="field" value={newExpenseType} onChange={(e) => setNewExpenseType(e.target.value)} placeholder="Örn: Kargo" />
                <button type="button" onClick={addExpenseType} className="px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 whitespace-nowrap">
                  Ekle
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
                Vazgeç
              </button>
              <button type="submit" className="primary-btn text-sm py-2 px-5">
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
