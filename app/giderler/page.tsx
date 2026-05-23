"use client";

import { useEffect, useState } from "react";
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
  branch?: {
    id: string;
    name: string;
  } | null;
};

type Branch = {
  id: string;
  name: string;
};

const EXPENSE_CATEGORIES = ["Kira", "Fatura", "Maaş", "Mal Alımı", "Diğer"];
const PAYMENT_METHODS = [
  { key: "CASH", label: "Nakit" },
  { key: "CREDIT_CARD", label: "Kredi Kartı" },
  { key: "ON_ACCOUNT", label: "Cari Hesap" },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formCategory, setFormCategory] = useState("Kira");
  const [formCustomCategory, setFormCustomCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState<"CASH" | "CREDIT_CARD" | "ON_ACCOUNT">("CASH");
  const [formBranchId, setFormBranchId] = useState("branch-kadikoy");

  // Filters State
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterBranch, setFilterBranch] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resExp, resBranch] = await Promise.all([
        fetch("/api/expenses"),
        fetch("/api/branches"),
      ]);
      if (!resExp.ok) throw new Error("Giderler yüklenemedi");
      
      const expData = await resExp.json();
      setExpenses(expData);

      if (resBranch.ok) {
        const branchData = await resBranch.json();
        setBranches(branchData);
        if (branchData.length > 0) {
          setFormBranchId(branchData[0].id);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Veriler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Parsing category and actual message from prefix like "[Kategori: Kira] Mayıs Ayı..."
  const parseExpenseDetails = (noteStr: string | null) => {
    if (!noteStr) return { category: "Diğer", details: "" };
    
    const match = noteStr.match(/^\[Kategori:\s*([^\]]+)\]\s*(.*)$/i);
    if (match) {
      return {
        category: match[1].trim(),
        details: match[2].trim(),
      };
    }
    return {
      category: "Diğer",
      details: noteStr,
    };
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0) {
      toast.error("Geçerli bir gider tutarı giriniz");
      return;
    }

    setSubmitting(true);
    const categoryName = formCategory === "Diğer" && formCustomCategory ? formCustomCategory : formCategory;
    const prefixedNote = `[Kategori: ${categoryName}] ${formNote}`.trim();

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAmount: Number(formAmount),
          paymentMethod: formPaymentMethod,
          note: prefixedNote,
          branchId: formBranchId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Gider kaydedilemedi");
      }

      toast.success("Gider kaydı başarıyla eklendi");
      setShowAddModal(false);
      
      // Reset form
      setFormAmount("");
      setFormNote("");
      setFormCustomCategory("");
      
      // Refresh list
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gider kaydedilirken hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Bu gider kaydını silmek istediğinizden emin misiniz?")) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Gider silinemedi");
      }

      toast.success("Gider kaydı başarıyla silindi");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gider silinirken bir hata oluştu");
    }
  };

  // Filter & Search implementation
  const filteredExpenses = expenses.filter((exp) => {
    const { category, details } = parseExpenseDetails(exp.note);
    const matchesCategory = filterCategory === "All" || category.toLowerCase() === filterCategory.toLowerCase();
    
    // Fallback branch matches
    const expBranchId = exp.branchId || "branch-kadikoy";
    const matchesBranch = filterBranch === "All" || expBranchId === filterBranch;
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      details.toLowerCase().includes(searchLower) ||
      category.toLowerCase().includes(searchLower) ||
      (exp.transactionNo || "").toLowerCase().includes(searchLower) ||
      String(exp.totalAmount).includes(searchLower);

    return matchesCategory && matchesBranch && matchesSearch;
  });

  // Calculations for stats summary cards
  const totalExpenseAmount = filteredExpenses.reduce((sum, item) => sum + Number(item.totalAmount), 0);
  
  const categoryTotals: Record<string, number> = {};
  filteredExpenses.forEach((exp) => {
    const { category } = parseExpenseDetails(exp.note);
    categoryTotals[category] = (categoryTotals[category] || 0) + Number(exp.totalAmount);
  });

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "Bulunmuyor";

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gider Yönetimi</h1>
          <p className="text-xs text-slate-500 mt-1">
            İşletmenizin şubelerine ait harcama, fatura, kira ve maaş giderlerini buradan takip edebilirsiniz.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition duration-150 shadow-md shadow-teal-700/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Gider Ekle
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Total Expense Card */}
        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtrelenmiş Toplam Gider</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-18 0a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 002.25 19.5h19.5a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5M9 9h.008v.008H9V9zm.008 2.25H9v.008h.008v-.008zm0 2.25H9v.008h.008v-.008zM12 9h.008v.008H12V9zm.008 2.25H12v.008h.008v-.008zm0 2.25H12v.008h.008v-.008zm3.75-4.5h.008v.008h-.008V9zm.008 2.25h-.008v.008h.008v-.008zm0 2.25h-.008v.008h.008v-.008z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-700">
              {totalExpenseAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Seçili filtrelere uygun giderlerin toplamı.</p>
          </div>
        </div>

        {/* Top Category Card */}
        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Yüksek Gider Kalemi</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 truncate">{topCategory}</h3>
            <p className="text-[10px] text-slate-400 mt-1">En çok harcama yapılan kategori.</p>
          </div>
        </div>

        {/* Count Card */}
        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">İşlem Adeti</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.377 2.24l-.407-.051a2.25 2.25 0 01-1.976-2.192V6.108c0-1.135.845-2.098 1.976-2.192a48.424 48.424 0 011.123-.08m-5.8 0A2.251 2.251 0 017.5 2.25H9c1.03 0 1.9.693 2.166 1.638" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">{filteredExpenses.length} Adet</h3>
            <p className="text-[10px] text-slate-400 mt-1">Kayıtlı toplam harcama faturası sayısı.</p>
          </div>
        </div>

      </div>

      {/* Filter and Table Panel */}
      <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Filter Controls Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Açıklama, Kategori veya Fiş No Ara..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Category Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kategori Filtresi</label>
              <select
                className="border border-slate-200 rounded-xl text-xs px-3 py-2 outline-none bg-white focus:ring-2 focus:ring-teal-500 transition"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="All">Tüm Kategoriler</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Şube Filtresi</label>
              <select
                className="border border-slate-200 rounded-xl text-xs px-3 py-2 outline-none bg-white focus:ring-2 focus:ring-teal-500 transition"
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
              >
                <option value="All">Tüm Şubeler</option>
                {branches.map((br) => (
                  <option key={br.id} value={br.id}>{br.name}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-medium animate-pulse">
              Gider kayıtları yükleniyor...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              Kayıtlı harcama veya gider bulunamadı.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Fiş/İşlem No</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Açıklama</th>
                  <th className="px-6 py-4">Ödeme Yöntemi</th>
                  <th className="px-6 py-4">Şube</th>
                  <th className="px-6 py-4">Tarih</th>
                  <th className="px-6 py-4 text-right">Tutar</th>
                  <th className="px-6 py-4 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredExpenses.map((exp) => {
                  const { category, details } = parseExpenseDetails(exp.note);
                  const matchedBranch = branches.find((b) => b.id === exp.branchId);
                  const methodLabel = PAYMENT_METHODS.find((m) => m.key === exp.paymentMethod)?.label || exp.paymentMethod;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">{exp.transactionNo}</td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-100/50">
                          {category}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 max-w-[200px] truncate text-slate-800" title={details}>{details || "Açıklama yok"}</td>
                      <td className="px-6 py-3.5">{methodLabel}</td>
                      <td className="px-6 py-3.5">{matchedBranch?.name || exp.branchId || "Genel"}</td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {new Date(exp.createdAt).toLocaleDateString("tr-TR")} {new Date(exp.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-rose-700">
                        -{Number(exp.totalAmount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Sil"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden transition-all duration-300 transform scale-100">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-md font-bold text-slate-800">Yeni Gider Kaydı Oluştur</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              
              {/* Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Gider Kategorisi</label>
                <select
                  className="w-full border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 transition bg-white"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Custom Category input if other is chosen */}
              {formCategory === "Diğer" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Özel Kategori İsmi</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Kırtasiye, Kargo..."
                    className="w-full border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 transition"
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                  />
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Gider Tutarı (TL)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-xl text-xs pl-3.5 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 transition font-bold"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                  />
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-slate-400">
                    TL
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ödeme Yöntemi</label>
                <select
                  className="w-full border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 transition bg-white"
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Branch */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Harcamayı Yapan Şube</label>
                <select
                  className="w-full border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 transition bg-white"
                  value={formBranchId}
                  onChange={(e) => setFormBranchId(e.target.value)}
                >
                  {branches.map((br) => (
                    <option key={br.id} value={br.id}>{br.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Gider Açıklaması</label>
                <textarea
                  placeholder="Harcamaya dair detayları yazınız..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 transition resize-none"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                />
              </div>

              {/* Modal Actions */}
              <div className="border-t border-slate-100 pt-4 mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition"
                >
                  İptal Et
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl transition shadow-md shadow-teal-700/20 disabled:opacity-50"
                >
                  {submitting ? "Kaydediliyor..." : "Gideri Kaydet"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
