"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

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

export default function CustomersVeresiyePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledger, setLedger] = useState<AccountEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [settings, setSettings] = useState<any>(null);

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
  const [newCustFullName, setNewCustFullName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustNationalId, setNewCustNationalId] = useState("");
  const [newCustNotes, setNewCustNotes] = useState("");
  const [newCustCreditLimit, setNewCustCreditLimit] = useState("0");

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
      return (
        c.fullName.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        (c.email && c.email.toLowerCase().includes(term))
      );
    });
  }, [customers, search]);

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

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustFullName.trim().length < 3) {
      toast.error("Müşteri adı en az 3 karakter olmalıdır.");
      return;
    }
    if (newCustPhone.trim().length < 10) {
      toast.error("Telefon numarası en az 10 karakter olmalıdır.");
      return;
    }
    if (newCustNationalId && (newCustNationalId.length !== 11 || !/^\d+$/.test(newCustNationalId))) {
      toast.error("T.C. Kimlik Numarası 11 haneli ve sadece rakamlardan oluşmalıdır.");
      return;
    }

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newCustFullName.trim(),
          phone: newCustPhone.trim(),
          email: newCustEmail.trim() || null,
          nationalId: newCustNationalId.trim() || null,
          notes: newCustNotes.trim() || null,
          creditLimit: newCustCreditLimit ? Number(newCustCreditLimit) : 0,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success("Müşteri başarıyla eklendi.");
        setIsAddCustomerModalOpen(false);
        setNewCustFullName("");
        setNewCustPhone("");
        setNewCustEmail("");
        setNewCustNationalId("");
        setNewCustNotes("");
        setNewCustCreditLimit("0");
        fetchData();
      } else {
        toast.error(json.error || json.message || "Müşteri eklenirken bir hata oluştu.");
      }
    } catch {
      toast.error("İşlem başarısız.");
    }
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
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Toplam Veresiye Alacak</p>
          <p className="text-3xl font-extrabold text-rose-500 mt-2">
            {customers
              .reduce((sum, c) => sum + Math.max(0, getCustomerBalance(c.id)), 0)
              .toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Limit Dışı Müşteriler</p>
          <p className="text-3xl font-extrabold text-amber-500 mt-2">
            {customers.filter((c) => getCustomerBalance(c.id) > (c.creditLimit ?? 0)).length}
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
            className="w-full md:w-auto px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl border border-slate-200 transition-all shadow-sm hover:shadow-slate-100 active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Yeni Müşteri Ekle
          </button>

          <button
            onClick={() => {
              if (customers.length > 0) {
                setEntryCustomerId(customers[0].id);
              } else {
                setEntryCustomerId("");
              }
              setEntryType("DEBIT");
              setIsEntryModalOpen(true);
            }}
            className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-slate-900 font-medium rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Yeni Cari İşlem Ekle
          </button>
        </div>
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
                        <span className={bal > 0 ? "text-rose-400" : bal < 0 ? "text-emerald-400" : "text-slate-700"}>
                          {bal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isLimitExceeded ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                            🚨 Limit Aşıldı ({(bal - limit).toLocaleString("tr-TR")} TL)
                          </span>
                        ) : bal > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Borçlu
                          </span>
                        ) : bal < 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Alacaklı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-500 border border-slate-500/30">
                            Dengede
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => {
                              setEntryCustomerId(c.id);
                              setEntryType("CREDIT");
                              setIsEntryModalOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs bg-emerald-600/80 hover:bg-emerald-600 text-slate-900 rounded-lg transition-colors font-medium"
                          >
                            Tahsilat Yap
                          </button>
                          <button
                            onClick={() => sendWhatsAppReminder(c)}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-xl transition-all border border-emerald-500/20 flex items-center justify-center"
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
                        <span className="inline-flex px-2 py-1 rounded bg-rose-500/10 text-rose-400 text-xs font-medium border border-rose-500/20">
                          Borç (Dışarıya Satış)
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                          Alacak / Tahsilat
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
              <h3 className="text-xl font-bold text-slate-900">Yeni Cari İşlem Ekle</h3>
              <p className="text-sm text-slate-500 mt-1">Borçlandırma veya ödeme tahsilatı ekleyin.</p>
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
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as "DEBIT" | "CREDIT")}
                    required
                  >
                    <option value="DEBIT" className="bg-white text-slate-900">Borç (Dükkandan Alışveriş)</option>
                    <option value="CREDIT" className="bg-white text-slate-900">Alacak/Tahsilat (Ödeme Aldık)</option>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Yeni Müşteri Ekle</h3>
              <p className="text-sm text-slate-500 mt-1">Sisteme yeni bir müşteri kaydı oluşturun.</p>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Ad Soyad *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="örn. Ahmet Yılmaz"
                    value={newCustFullName}
                    onChange={(e) => setNewCustFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Telefon *</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="örn. 05551234567"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">E-posta</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="örn. ahmet@example.com"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">T.C. Kimlik No</label>
                  <input
                    type="text"
                    maxLength={11}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                    placeholder="11 haneli T.C. No"
                    value={newCustNationalId}
                    onChange={(e) => setNewCustNationalId(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Başlangıç Veresiye Limiti (TL)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                  placeholder="örn. 5000"
                  value={newCustCreditLimit}
                  onChange={(e) => setNewCustCreditLimit(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Özel Notlar</label>
                <textarea
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent h-20 resize-none"
                  placeholder="Müşteri hakkında notlar girin..."
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
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
    </section>
  );
}


