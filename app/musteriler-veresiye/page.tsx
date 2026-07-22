"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import CustomerQuickAddModal from "@/components/customer-quick-add-modal";

type Customer = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  creditLimit?: number;
};

type AccountEntry = {
  id: string;
  customerId: string;
  type: "DEBIT" | "CREDIT";
  amount: number | string;
  description: string | null;
  createdAt: string;
  customer?: Customer;
};

type BankAccount = {
  id: string;
  name: string;
  balance: number | string;
};

type CustomerHistoryResult = {
  customer: Customer;
  summary: {
    totalDebit: number;
    totalCredit: number;
    netBalance: number;
    repairCount: number;
    transactionCount: number;
    deviceCount: number;
  };
  timeline: Array<{
    id: string;
    date: string;
    kind: "ACCOUNT_ENTRY" | "REPAIR" | "TRANSACTION" | "INVOICE";
    title: string;
    amount: number | null;
    direction: "IN" | "OUT" | null;
    detail: string | null;
    status: string | null;
  }>;
};

export default function CustomersVeresiyePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledger, setLedger] = useState<AccountEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [balanceFilter, setBalanceFilter] = useState<"ALL" | "RECEIVABLE" | "PAYABLE">("ALL");

  // Modals state
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newLimitValue, setNewLimitValue] = useState("");

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryCustomerId, setEntryCustomerId] = useState("");
  const [entryType, setEntryType] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDesc, setEntryDesc] = useState("");

  // Add Customer modal state
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);

  // Customer history search state
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyResults, setHistoryResults] = useState<CustomerHistoryResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, ledgRes, bankRes, settingsRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/account-entries"),
        fetch("/api/banks"),
        fetch("/api/settings").catch(() => null),
      ]);

      if (custRes.ok && ledgRes.ok && bankRes.ok) {
        const custData = await custRes.json();
        const ledgData = await ledgRes.json();
        const bankData = await bankRes.json();
        // Extract inner array if enveloped
        const loadedCustomers = custData.data || custData;
        setCustomers(loadedCustomers);
        setLedger(ledgData.data || ledgData);
        const loadedBanks = bankData.data || bankData || [];
        setBanks(loadedBanks);
        if (loadedBanks.length > 0) {
          setBankAccountId(loadedBanks[0].id);
        }
        if (loadedCustomers.length > 0) {
          setEntryCustomerId((prev) => prev || loadedCustomers[0].id);
        }
      } else {
        toast.error("Veriler yüklenirken hata oluştu.");
      }

      if (settingsRes && settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.data || settingsData || null);
      }
    } catch {
      toast.error("Sunucu bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  // Helper: Calculate net balance for a customer (DEBIT - CREDIT)
  const getCustomerBalance = (customerId: string) => {
    return ledger
      .filter((e) => e.customerId === customerId)
      .reduce((sum, entry) => {
        const amt = Number(entry.amount);
        return sum + (entry.type === "DEBIT" ? amt : -amt);
      }, 0);
  };

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const term = search.toLowerCase();
      const baseMatch = (
        c.fullName.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        (c.email && c.email.toLowerCase().includes(term))
      );
      if (!baseMatch) return false;
      const bal = getCustomerBalance(c.id);
      if (balanceFilter === "RECEIVABLE") return bal > 0;
      if (balanceFilter === "PAYABLE") return bal < 0;
      return true;
    });
  }, [customers, search, balanceFilter, ledger]);

  const totalOnAccountSales = useMemo(
    () => ledger.filter((x) => x.type === "DEBIT").reduce((sum, x) => sum + Number(x.amount), 0),
    [ledger],
  );
  const totalOnAccountCollections = useMemo(
    () => ledger.filter((x) => x.type === "CREDIT").reduce((sum, x) => sum + Number(x.amount), 0),
    [ledger],
  );
  const netBalance = useMemo(() => totalOnAccountSales - totalOnAccountCollections, [totalOnAccountSales, totalOnAccountCollections]);

  const handleUpdateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const limit = Number(newLimitValue);
    if (isNaN(limit) || limit < 0) {
      toast.error("Geçersiz limit değeri.");
      return;
    }

    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditLimit: limit }),
      });

      if (res.ok) {
        toast.success("Limit başarıyla güncellendi.");
        setIsLimitModalOpen(false);
        fetchData();
      } else {
        toast.error("Limit güncellenemedi.");
      }
    } catch {
      toast.error("İşlem başarısız.");
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryCustomerId) {
      toast.error("Lütfen müşteri seçin.");
      return;
    }

    const amt = Number(entryAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Geçersiz tutar değeri.");
      return;
    }

    // Limit Validation for DEBIT entry
    if (entryType === "DEBIT") {
      const cust = customers.find((c) => c.id === entryCustomerId);
      if (cust) {
        const currentBal = getCustomerBalance(entryCustomerId);
        const limit = cust.creditLimit ?? 0;
        if (currentBal + amt > limit) {
          toast.error(`Limit Aşımı! Bu işlemle bakiye (${currentBal + amt} TL) limiti (${limit} TL) aşacaktır.`);
          return;
        }
      }
    }

    try {
      const res = await fetch("/api/account-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: entryCustomerId,
          type: entryType,
          amount: amt,
          description: entryDesc,
          bankAccountId: bankAccountId || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Cari hareket başarıyla eklendi.");
        setIsEntryModalOpen(false);
        setEntryAmount("");
        setEntryDesc("");
        fetchData();
      } else {
        toast.error("Cari hareket kaydedilemedi.");
      }
    } catch {
      toast.error("İşlem başarısız.");
    }
  };

  const handleCustomerHistorySearch = async (presetQuery?: string) => {
    const q = (presetQuery ?? historyQuery).trim();
    if (q.length < 2) {
      toast.warning("Müşteri adı için en az 2 karakter girin.");
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/customers/history?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Müşteri geçmişi getirilemedi.");
      setHistoryResults(Array.isArray(data.items) ? data.items : []);
      if (!data.items?.length) toast.info("Aramaya uygun müşteri bulunamadı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Müşteri geçmişi getirilemedi.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const viewCustomerHistory = (c: Customer) => {
    setHistoryQuery(c.fullName);
    void handleCustomerHistorySearch(c.fullName);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sendWhatsAppReminder = (cust: Customer) => {
    const balance = getCustomerBalance(cust.id);
    if (balance <= 0) {
      toast.error("Müşterinin borç bakiyesi bulunmuyor.");
      return;
    }

    if (!settings || !settings.whatsappEnabled || !settings.whatsappNumber) {
      toast.error("WhatsApp bildirim entegrasyonu kurulmamış veya aktif edilmemiş. Lütfen Ayarlar sayfasından kurulumu tamamlayın.");
      return;
    }

    const defaultTpl = "Sayın {ad_soyad}, cari hesabınızdaki güncel borç bakiyeniz {bakiye} TL'dir. Ödemenizi en kısa sürede yapmanızı rica ederiz. İyi çalışmalar.";
    let message = settings.veresiyeTemplate || defaultTpl;

    const balanceStr = balance.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
    message = message
      .replace(/{ad_soyad}/g, cust.fullName)
      .replace(/{bakiye}/g, balanceStr);

    const cleanPhone = cust.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("90") ? cleanPhone : cleanPhone.startsWith("0") ? "90" + cleanPhone.slice(1) : "90" + cleanPhone;
    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <section className="space-y-8 pb-12">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Kayıtlı Müşteri</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{customers.length}</p>
        </div>

        <div className="glass-card p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.554-.589 1.448-.589 2.002 0l.007.007a1.425 1.425 0 002.016 0l.007-.007c.554-.59 1.448-.59 2.002 0l.007.007a1.425 1.425 0 000 2.015l-.007.007c-.554.59-.554 1.54 0 2.13l.007.007a1.425 1.425 0 000 2.015l-.007.007c-.554.59-1.448.59-2.002 0l-.007-.007a1.425 1.425 0 00-2.016 0l-.007.007c-.554.59-1.448.59-2.002 0l-.007-.007a1.425 1.425 0 00-2.015 0l-.007.007c-.554.59-.554 1.54 0 2.13l.007.007a1.425 1.425 0 000 2.015l-.007.007c-.554.59-1.448.59-2.002 0l-.007-.007a1.425 1.425 0 00-2.015-2.015l.007-.007c.554-.59.554-1.54 0-2.13l-.007-.007a1.425 1.425 0 000-2.015l.007-.007c.554-.59 1.448-.59 2.002 0l.007.007z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Veresiye Sattıklarım (Alacak)</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">
            {totalOnAccountSales.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Veresiye Aldıklarım (Tahsilat)</p>
          <p className="text-3xl font-extrabold text-rose-600 mt-2">
            {totalOnAccountCollections.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all"
            placeholder="Müşteri adı veya telefon ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="absolute top-3.5 right-4 text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3">
          <button
            onClick={() => setIsAddCustomerModalOpen(true)}
            className="w-full md:w-auto px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            + Yeni Müşteri
          </button>

          <button
            onClick={() => {
              if (customers.length > 0) setEntryCustomerId(customers[0].id);
              setEntryType("DEBIT");
              setEntryAmount("");
              setIsEntryModalOpen(true);
            }}
            className="w-full md:w-auto px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            🔴 Cari Aç (Borçlandır)
          </button>

          <button
            onClick={() => {
              if (customers.length > 0) setEntryCustomerId(customers[0].id);
              setEntryType("CREDIT");
              setEntryAmount("");
              setIsEntryModalOpen(true);
            }}
            className="w-full md:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            🟢 Cari Kapat (Tahsilat Al)
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button onClick={() => setBalanceFilter("ALL")} className={`px-3 py-2 rounded-lg border text-xs font-semibold ${balanceFilter === "ALL" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"}`}>Tum Bakiye</button>
          <button onClick={() => setBalanceFilter("RECEIVABLE")} className={`px-3 py-2 rounded-lg border text-xs font-semibold ${balanceFilter === "RECEIVABLE" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-700 border-emerald-200"}`}>Alacaklarim</button>
          <button onClick={() => setBalanceFilter("PAYABLE")} className={`px-3 py-2 rounded-lg border text-xs font-semibold ${balanceFilter === "PAYABLE" ? "bg-rose-600 text-white border-rose-600" : "bg-white text-rose-700 border-rose-200"}`}>Vereceklerim</button>
        </div>
      </div>
      {/* Customer store-history search */}
      <div className="panel bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="w-full md:max-w-md relative">
            <input
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Müşteri adı veya telefon ile mağaza geçmişi sorgula..."
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCustomerHistorySearch();
              }}
            />
          </div>
          <button
            onClick={() => void handleCustomerHistorySearch()}
            disabled={historyLoading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium rounded-xl transition-all shadow-sm active:scale-95"
          >
            {historyLoading ? "Sorgulanıyor..." : "Geçmiş İşlemleri Sorgula"}
          </button>
          {historyResults.length > 0 && (
            <button
              onClick={() => { setHistoryResults([]); setHistoryQuery(""); }}
              className="px-4 py-3 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              Temizle
            </button>
          )}
        </div>

        {historyResults.length > 0 && (
          <div className="mt-4 grid gap-3">
            {historyResults.map((item) => (
              <div key={item.customer.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong className="text-slate-900">{item.customer.fullName}</strong>
                    <div className="text-xs text-slate-500">{item.customer.phone}</div>
                  </div>
                  <div className="text-xs text-slate-600">
                    Borç: <strong className="text-rose-600">{Number(item.summary.totalDebit).toLocaleString("tr-TR")} TL</strong>
                    {" · "}Tahsilat: <strong className="text-emerald-600">{Number(item.summary.totalCredit).toLocaleString("tr-TR")} TL</strong>
                    {" · "}Net: <strong>{Number(item.summary.netBalance).toLocaleString("tr-TR")} TL</strong>
                  </div>
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  Tamir: {item.summary.repairCount} · İşlem: {item.summary.transactionCount} · Cihaz: {item.summary.deviceCount}
                </div>

                {item.timeline.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-400">Bu müşteri için mağaza hareketi bulunamadı.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase">
                          <th className="py-2 pr-3">Tarih</th>
                          <th className="py-2 pr-3">Tip</th>
                          <th className="py-2 pr-3">Açıklama</th>
                          <th className="py-2 pr-3 text-right">Tutar</th>
                          <th className="py-2">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {item.timeline.slice(0, 20).map((row) => (
                          <tr key={row.id}>
                            <td className="py-2 pr-3 text-slate-500">{new Date(row.date).toLocaleString("tr-TR")}</td>
                            <td className="py-2 pr-3">{row.kind}</td>
                            <td className="py-2 pr-3">{row.title}{row.detail ? ` — ${row.detail}` : ""}</td>
                            <td className={`py-2 pr-3 text-right font-mono font-bold ${row.direction === "IN" ? "text-emerald-600" : row.direction === "OUT" ? "text-rose-600" : ""}`}>
                              {row.amount == null ? "-" : `${Number(row.amount).toLocaleString("tr-TR")} TL`}
                            </td>
                            <td className="py-2">{row.status || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-500">Net Veresiye Bakiye</span>
        <strong className={netBalance >= 0 ? "text-emerald-600" : "text-rose-600"}>
          {netBalance.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
        </strong>
      </div>

      {/* Customer List */}
      <div className="panel bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Müşteri Cari Durum Listesi</h3>
        </div>
        <div className="overflow-x-auto">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Müşteri bulunamadı.</div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                  <th className="px-6 py-4">Müşteri</th>
                  <th className="px-6 py-4">Telefon</th>
                  <th className="px-6 py-4">Veresiye Limiti</th>
                  <th className="px-6 py-4">Net Bakiye</th>
                  <th className="px-6 py-4">Durum</th>
                  <th className="px-6 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredCustomers.map((c) => {
                  const bal = getCustomerBalance(c.id);
                  const limit = c.creditLimit ?? 0;
                  const isLimitExceeded = bal > limit;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{c.fullName}</td>
                      <td className="px-6 py-4 text-slate-500">{c.phone}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-900">
                            {limit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                          </span>
                          <button
                            onClick={() => {
                              setSelectedCustomer(c);
                              setNewLimitValue(limit.toString());
                              setIsLimitModalOpen(true);
                            }}
                            className="text-indigo-400 hover:text-indigo-300 transition-colors p-1"
                            title="Limiti Düzenle"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold">
                        <span className={bal > 0 ? "text-emerald-600" : bal < 0 ? "text-rose-600" : "text-slate-700"}>
                          {bal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isLimitExceeded ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                            🚨 Limit Aşıldı ({(bal - limit).toLocaleString("tr-TR")} TL)
                          </span>
                        ) : bal > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                            Alacaklım (Yeşil)
                          </span>
                        ) : bal < 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-500 border border-rose-500/30">
                            Vereceğim (Kırmızı)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-500 border border-slate-500/30">
                            Dengede
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => viewCustomerHistory(c)}
                            className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-semibold"
                          >
                            Geçmiş
                          </button>
                          <button
                            onClick={() => {
                              setEntryCustomerId(c.id);
                              setEntryType("DEBIT");
                              setEntryAmount("");
                              setIsEntryModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors font-bold"
                          >
                            Cari Aç
                          </button>
                          <button
                            onClick={() => {
                              setEntryCustomerId(c.id);
                              setEntryType("CREDIT");
                              setEntryAmount(bal > 0 ? String(bal) : "");
                              setIsEntryModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-bold shadow-sm"
                          >
                            Cari Kapat
                          </button>
                          <button
                            onClick={() => sendWhatsAppReminder(c)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-all border border-emerald-200 flex items-center justify-center"
                            title="WhatsApp Borç Hatırlat"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 1.981 14.111.957 11.997.957c-5.439 0-9.862 4.37-9.866 9.801-.002 1.761.478 3.483 1.393 5.015l-.997 3.64 3.738-.97c1.547.842 3.12 1.282 4.379 1.282zm10.742-7.85c-.29-.145-1.716-.848-1.983-.945-.267-.097-.461-.145-.655.145-.194.29-.752.945-.921 1.14-.169.194-.339.219-.63.073-.29-.145-1.229-.453-2.34-1.445-.864-.77-1.447-1.722-1.617-2.013-.17-.29-.018-.447.127-.592.13-.13.29-.339.436-.509.145-.17.194-.29.291-.485.097-.194.049-.364-.024-.509-.073-.145-.655-1.577-.898-2.16-.236-.57-.478-.49-.655-.499-.17-.008-.364-.01-.558-.01-.194 0-.509.073-.776.364-.267.29-1.02 1.02-1.02 2.475 0 1.455 1.069 2.859 1.214 3.053.145.194 2.1 3.21 5.09 4.5 1.776.767 2.477.83 3.364.698.544-.08 1.716-.703 1.958-1.382.242-.679.242-1.261.169-1.382-.072-.12-.267-.194-.557-.339z" />
                            </svg>
                          </button>
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

      {/* Ledger History */}
      <div className="panel bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Son Cari Hareketler</h3>
        </div>
        <div className="overflow-x-auto">
          {ledger.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Henüz cari hareket bulunmuyor.</div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                  <th className="px-6 py-4">Tarih</th>
                  <th className="px-6 py-4">Müşteri</th>
                  <th className="px-6 py-4">İşlem Tipi</th>
                  <th className="px-6 py-4">Tutar</th>
                  <th className="px-6 py-4">Açıklama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {ledger.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(item.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {item.customer?.fullName || "Bilinmeyen Müşteri"}
                    </td>
                    <td className="px-6 py-4">
                      {item.type === "DEBIT" ? (
                        <span className="inline-flex px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 text-xs font-medium border border-emerald-500/20">
                          Veresiye Satış (Alacak)
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded bg-rose-500/10 text-rose-500 text-xs font-medium border border-rose-500/20">
                          Veresiye Tahsilat (Aldığım)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {Number(item.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                    </td>
                    <td className="px-6 py-4 text-slate-500">{item.description || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL 1: Edit Credit Limit */}
      {isLimitModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Veresiye Limitini Düzenle</h3>
              <p className="text-sm text-slate-500 mt-1">{selectedCustomer.fullName} için maksimum borç limiti.</p>
            </div>

            <form onSubmit={handleUpdateLimit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Limit Tutarı (TL)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                  placeholder="örn. 5000"
                  value={newLimitValue}
                  onChange={(e) => setNewLimitValue(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLimitModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-slate-900 text-sm font-medium rounded-xl transition-all"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Cari Entry */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {entryType === "DEBIT" ? "🔴 Cari Aç (Borç Ekle / Veresiye Verme)" : "🟢 Cari Kapat (Tahsilat Al / Borç Kapatma)"}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {entryType === "DEBIT" ? "Müşteri hesabına borç kaydedin (Cari Açma)." : "Müşteriden ödeme alarak cari hesabı kapatın veya bakiyeyi düşürün."}
              </p>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Müşteri Seçin</label>
                  <select
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={entryCustomerId}
                    onChange={(e) => setEntryCustomerId(e.target.value)}
                    required
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white text-slate-900">
                        {c.fullName} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">İşlem Tipi</label>
                  <select
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-bold"
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as "DEBIT" | "CREDIT")}
                    required
                  >
                    <option value="DEBIT" className="bg-white text-rose-700 font-bold">🔴 Cari Aç (Borçlandır)</option>
                    <option value="CREDIT" className="bg-white text-emerald-700 font-bold">🟢 Cari Kapat (Tahsilat Al / Sıfırla)</option>
                  </select>
                </div>
              </div>


              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Tutar (TL)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                  placeholder="örn. 1500"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">İşlem Yapılan Kasa/Banka</label>
                <select
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                >
                  <option value="">İşlem Kasası/Bankası Seçin (İsteğe Bağlı)</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id} className="bg-white text-slate-900">
                      {b.name} ({Number(b.balance).toLocaleString("tr-TR")} TL)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Açıklama</label>
                <textarea
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent h-20 resize-none"
                  placeholder="İşlem açıklaması girin..."
                  value={entryDesc}
                  onChange={(e) => setEntryDesc(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-slate-900 text-sm font-medium rounded-xl transition-all"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Customer */}
      {isAddCustomerModalOpen && (
        <CustomerQuickAddModal
          onClose={() => setIsAddCustomerModalOpen(false)}
          onCreated={() => {
            setIsAddCustomerModalOpen(false);
            fetchData();
          }}
        />
      )}
    </section>
  );
}


