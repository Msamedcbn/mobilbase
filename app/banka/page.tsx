"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-modal";

type BankAccount = {
  id: string;
  name: string;
  iban: string | null;
  balance: number | string;
  createdAt: string;
};

type LogEntry = {
  id: string;
  date: string;
  type: "INCOME" | "OUTFLOW";
  description: string;
  amount: number;
  source: "POS" | "CARI" | "BUYBACK";
};

export default function BankaManagementPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [iban, setIban] = useState("");
  const [balance, setBalance] = useState("");

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/banks");
      const json = await res.json();
      if (res.ok) {
        const data = json.data || json;
        setBanks(data);
        if (data.length > 0 && !selectedBank) {
          fetchLogs(data[0]);
        }
      } else {
        toast.error(json.message || "Banka hesapları yüklenemedi.");
      }
    } catch {
      toast.error("Sunucu bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (bank: BankAccount) => {
    setSelectedBank(bank);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/banks/${bank.id}/transactions`);
      const json = await res.json();
      if (res.ok) {
        setLogs(json.data || json);
      } else {
        toast.error("İşlem geçmişi yüklenemedi.");
      }
    } catch {
      toast.error("Sunucu bağlantı hatası.");
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Hesap adı zorunludur.");
      return;
    }
    try {
      const res = await fetch("/api/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, iban: iban || null, balance: Number(balance || 0) }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Banka/Kasa hesabı başarıyla oluşturuldu.");
        setIsAddModalOpen(false);
        setName("");
        setIban("");
        setBalance("");
        fetchBanks();
      } else {
        toast.error(json.message || "Hesap oluşturulamadı.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBank || !name.trim()) return;
    try {
      const res = await fetch(`/api/banks/${editingBank.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, iban: iban || null, balance: Number(balance || 0) }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Banka/Kasa hesabı güncellendi.");
        setIsEditModalOpen(false);
        setName("");
        setIban("");
        setBalance("");
        setEditingBank(null);
        fetchBanks();
      } else {
        toast.error(json.message || "Hesap güncellenemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("Bu banka/kasa hesabını silmek istediğinize emin misiniz?", { danger: true, confirmLabel: "Sil" }))) return;
    try {
      const res = await fetch(`/api/banks/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Hesap başarıyla silindi.");
        if (selectedBank?.id === id) {
          setSelectedBank(null);
          setLogs([]);
        }
        fetchBanks();
      } else {
        toast.error(json.message || "Silme işlemi başarısız.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    }
  };

  const openEditModal = (bank: BankAccount) => {
    setEditingBank(bank);
    setName(bank.name);
    setIban(bank.iban || "");
    setBalance(bank.balance.toString());
    setIsEditModalOpen(true);
  };

  const totalAssets = banks.reduce((sum, b) => sum + Number(b.balance), 0);

  if (loading && banks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <section className="space-y-8 pb-12">
      {/* Top Assets summary & actions */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="glass-card p-6 rounded-2xl bg-gradient-to-r from-blue-900 to-slate-900 border border-blue-500/20 shadow-md relative overflow-hidden w-full md:w-96">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Toplam Kasa / Banka Varlığı</p>
          <p className="text-3xl font-extrabold text-white mt-2">
            {totalAssets.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
          </p>
        </div>

        <button
          onClick={() => {
            setName("");
            setIban("");
            setBalance("0");
            setIsAddModalOpen(true);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Yeni Banka / Kasa Hesabı
        </button>
      </div>

      {/* Grid of Bank Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {banks.map((b) => {
          const isSelected = selectedBank?.id === b.id;
          return (
            <div
              key={b.id}
              onClick={() => fetchLogs(b)}
              className={`cursor-pointer group glass-card p-6 rounded-2xl border transition-all ${
                isSelected
                  ? "bg-slate-900 border-blue-500 shadow-md ring-2 ring-blue-500/20"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className={`font-bold text-lg ${isSelected ? "text-white" : "text-slate-900"}`}>
                    {b.name}
                  </h3>
                  <p className={`text-xs ${isSelected ? "text-slate-400" : "text-slate-500"} font-mono`}>
                    {b.iban ? b.iban : "Kasa (IBAN Yok)"}
                  </p>
                </div>
                <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(b);
                    }}
                    className={`p-1.5 rounded-lg border transition ${
                      isSelected
                        ? "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                        : "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                    title="Düzenle"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(b.id);
                    }}
                    className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition"
                    title="Sil"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-baseline">
                <span className={`text-xs ${isSelected ? "text-slate-500" : "text-slate-400"} uppercase tracking-wider`}>Bakiye</span>
                <span className={`text-2xl font-black font-mono ${isSelected ? "text-blue-400" : "text-blue-600"}`}>
                  {Number(b.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction History Logs */}
      {selectedBank && (
        <div className="panel bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {selectedBank.name} - Hesap Geçmişi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Bu hesaba bağlı tüm gelir ve gider hareketleri.</p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Bakiye: {Number(selectedBank.balance).toLocaleString("tr-TR")} TL
            </span>
          </div>

          <div className="overflow-x-auto">
            {loadingLogs ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Henüz bu hesaba ait işlem hareketi bulunmuyor.</div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                    <th className="px-6 py-4">Tarih</th>
                    <th className="px-6 py-4">Kaynak</th>
                    <th className="px-6 py-4">İşlem Tipi</th>
                    <th className="px-6 py-4">Açıklama</th>
                    <th className="px-6 py-4 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {logs.map((log) => {
                    const isIncome = log.type === "INCOME";
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(log.date).toLocaleString("tr-TR")}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono border ${
                            log.source === "POS"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : log.source === "CARI"
                              ? "bg-purple-50 text-purple-700 border-purple-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}>
                            {log.source}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isIncome ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Giriş (Gelir / Tahsilat)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Çıkış (Ödeme / Geri Alım)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {log.description}
                        </td>
                        <td className={`px-6 py-4 text-right font-mono font-bold text-base ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                          {isIncome ? "+" : "-"}{log.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Add Bank Account */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Banka / Kasa Hesabı Ekle</h3>
              <p className="text-sm text-slate-500 mt-1">Manual bakiye takibi yapabileceğiniz yeni bir hesap.</p>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Hesap Adı</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Örn. Garanti Ticari, Nakit Kasa Merkez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">IBAN (Varsa)</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="TR00..."
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Başlangıç Bakiyesi (TL)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-950 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all"
                >
                  Hesap Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Bank Account */}
      {isEditModalOpen && editingBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Banka / Kasa Hesabını Düzenle</h3>
              <p className="text-sm text-slate-500 mt-1">Hesap detaylarını veya bakiyeyi güncelleyin.</p>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Hesap Adı</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">IBAN</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Mevcut Bakiye (TL)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  step="0.01"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingBank(null);
                  }}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-950 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDialog}
    </section>
  );
}
