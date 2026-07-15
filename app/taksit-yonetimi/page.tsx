"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";

type Installment = {
  id: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: "PAID" | "UNPAID";
  paidAt?: string | null;
  bankAccountId?: string | null;
  note?: string | null;
};

type InstallmentSale = {
  id: string;
  transactionNo: string;
  customerId?: string | null;
  totalAmount: number;
  installmentCount: number;
  interestRate: number;
  remainingAmount: number;
  createdAt: string;
  installments: Installment[];
  customer: {
    fullName: string;
    phone: string;
    email: string | null;
  } | null;
};

type BankAccount = {
  id: string;
  name: string;
  iban: string | null;
  balance: number;
};

type Customer = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  creditLimit?: number;
};

type CardInstallmentConfig = {
  brandId: string;
  brandName: string;
  isActive: boolean;
  installments: Array<{
    count: number;
    isActive: boolean;
    rate: number;
    plusInstallment: number;
  }>;
};

const getBrandStyle = (brandId: string) => {
  switch (brandId) {
    case "bonus":
      return { bg: "from-emerald-500 to-blue-600", text: "text-emerald-700", border: "border-emerald-200" };
    case "world":
      return { bg: "from-indigo-500 to-purple-600", text: "text-indigo-700", border: "border-indigo-200" };
    case "maximum":
      return { bg: "from-rose-500 to-red-600", text: "text-rose-700", border: "border-rose-200" };
    case "axess":
      return { bg: "from-amber-400 to-orange-500", text: "text-amber-800", border: "border-amber-200" };
    case "paraf":
      return { bg: "from-slate-700 to-slate-900", text: "text-slate-800", border: "border-slate-300" };
    case "cardfinans":
      return { bg: "from-blue-500 to-blue-600", text: "text-blue-700", border: "border-blue-200" };
    case "bankkart":
      return { bg: "from-red-500 to-orange-600", text: "text-red-700", border: "border-red-200" };
    default:
      return { bg: "from-slate-500 to-slate-600", text: "text-slate-700", border: "border-slate-200" };
  }
};

export default function InstallmentManagementPage() {
  const [sales, setSales] = useState<InstallmentSale[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"takip" | "oranlar">("takip");

  // Settings states
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [cardConfigs, setCardConfigs] = useState<CardInstallmentConfig[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "OVERDUE" | "COMPLETED">("ALL");

  // Selected Sale for Detail Modal
  const [selectedSale, setSelectedSale] = useState<InstallmentSale | null>(null);
  
  // Pay Form State
  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Create Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formBaseAmount, setFormBaseAmount] = useState("");
  const [formInstallmentCount, setFormInstallmentCount] = useState(6);
  const [formInterestRate, setFormInterestRate] = useState(0);
  const [isPesinFiyatina, setIsPesinFiyatina] = useState(false);
  
  const getNextMonthDateString = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [formFirstDueDate, setFormFirstDueDate] = useState("");
  const [formNote, setFormNote] = useState("");

  // Excel-like edits state
  const [edits, setEdits] = useState<Record<string, {
    saleId: string;
    dueDate?: string;
    amount?: number;
    status?: "PAID" | "UNPAID";
    bankAccountId?: string | null;
    note?: string;
  }>>({});
  const [savingEdits, setSavingEdits] = useState(false);

  const resetForm = () => {
    setFormCustomerId("");
    setFormBaseAmount("");
    setFormInstallmentCount(6);
    setFormInterestRate(0);
    setIsPesinFiyatina(false);
    setFormFirstDueDate(getNextMonthDateString());
    setFormNote("");
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSales, resBanks, resCustomers, resSettings] = await Promise.all([
        fetch("/api/installments"),
        fetch("/api/banks"),
        fetch("/api/customers"),
        fetch("/api/settings").catch(() => null),
      ]);

      if (!resSales.ok) throw new Error("Taksit planları yüklenemedi.");
      const salesData = await resSales.json();
      setSales(salesData);

      if (resBanks.ok) {
        const banksData = await resBanks.json();
        setBanks(banksData);
        if (banksData.length > 0) {
          setSelectedBankId(banksData[0].id);
        }
      }

      if (resCustomers.ok) {
        const customersData = await resCustomers.json();
        setCustomers(customersData);
      }

      if (resSettings && resSettings.ok) {
        const settingsData = await resSettings.json();
        setSettings(settingsData.data || settingsData || null);
      }
    } catch (err: any) {
      toast.error(err.message || "Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setFormFirstDueDate(getNextMonthDateString());
  }, []);

  // Update selectedSale details if it's open and data refreshes
  useEffect(() => {
    if (selectedSale) {
      const updated = sales.find((s) => s.id === selectedSale.id);
      if (updated) {
        setSelectedSale(updated);
      }
    }
  }, [sales]);

  // Fetch card configs
  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/installments/settings");
      if (res.ok) {
        const data = await res.json();
        setCardConfigs(data);
      } else {
        toast.error("Taksit oranları yüklenemedi.");
      }
    } catch (err: any) {
      toast.error("Taksit oranları yüklenirken hata oluştu.");
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "oranlar") {
      fetchSettings();
    }
  }, [activeTab]);

  const handleAutoFill = () => {
    if (cardConfigs.length === 0) return;
    const firstCard = cardConfigs[0];
    const updated = cardConfigs.map((cfg, index) => {
      if (index === 0) return cfg;
      return {
        ...cfg,
        isActive: firstCard.isActive,
        installments: firstCard.installments.map((inst) => ({
          ...inst
        }))
      };
    });
    setCardConfigs(updated);
    toast.success("İlk kartın (" + firstCard.brandName + ") ayarları tüm kartlara uygulandı!");
  };

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/installments/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: cardConfigs }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Taksit oranları başarıyla kaydedildi.");
      } else {
        throw new Error(data.error || "Taksit oranları kaydedilemedi.");
      }
    } catch (err: any) {
      toast.error(err.message || "Taksit oranları kaydedilirken hata oluştu.");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleCardActiveChange = (brandId: string, isActive: boolean) => {
    setCardConfigs((prev) =>
      prev.map((c) => (c.brandId === brandId ? { ...c, isActive } : c))
    );
  };

  const handleInstallmentActiveChange = (brandId: string, count: number, isActive: boolean) => {
    setCardConfigs((prev) =>
      prev.map((c) => {
        if (c.brandId !== brandId) return c;
        return {
          ...c,
          installments: c.installments.map((inst) =>
            inst.count === count ? { ...inst, isActive } : inst
          ),
        };
      })
    );
  };

  const handleInstallmentRateChange = (brandId: string, count: number, rate: number) => {
    setCardConfigs((prev) =>
      prev.map((c) => {
        if (c.brandId !== brandId) return c;
        return {
          ...c,
          installments: c.installments.map((inst) =>
            inst.count === count ? { ...inst, rate } : inst
          ),
        };
      })
    );
  };

  const handleInstallmentPlusChange = (brandId: string, count: number, plusInstallment: number) => {
    setCardConfigs((prev) =>
      prev.map((c) => {
        if (c.brandId !== brandId) return c;
        return {
          ...c,
          installments: c.installments.map((inst) =>
            inst.count === count ? { ...inst, plusInstallment } : inst
          ),
        };
      })
    );
  };

  // Date helper to get YYYY-MM-DD for comparison in local timezone
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayDateString();

  // Helper check if sale is overdue (has any unpaid installment whose dueDate is past today)
  const isSaleOverdue = (sale: InstallmentSale) => {
    return sale.installments.some(
      (inst) => inst.status === "UNPAID" && new Date(inst.dueDate).toISOString().split("T")[0] < todayStr
    );
  };

  // liveGridData unrolls sales into individual installments, overlaying client edits in real-time
  const liveGridData = useMemo(() => {
    const list: Array<{
      saleId: string;
      installmentId: string;
      transactionNo: string;
      customerName: string;
      customerPhone: string;
      customerEmail: string | null;
      installmentNo: number;
      installmentCount: number;
      dueDate: string;
      amount: number;
      status: "PAID" | "UNPAID";
      bankAccountId: string | null;
      note: string;
      createdAt: string;
    }> = [];

    sales.forEach((sale) => {
      sale.installments.forEach((inst) => {
        const edit = edits[inst.id];
        const amount = edit?.amount !== undefined ? edit.amount : inst.amount;
        const dueDate = edit?.dueDate !== undefined ? edit.dueDate : (inst.dueDate ? inst.dueDate.split("T")[0] : "");
        const status = edit?.status !== undefined ? edit.status : inst.status;
        const bankAccountId = edit?.bankAccountId !== undefined ? edit.bankAccountId : (inst.bankAccountId ?? null);
        const note = edit?.note !== undefined ? edit.note : (inst.note || "");

        list.push({
          saleId: sale.id,
          installmentId: inst.id,
          transactionNo: sale.transactionNo,
          customerName: sale.customer?.fullName || "Genel Müşteri",
          customerPhone: sale.customer?.phone || "-",
          customerEmail: sale.customer?.email || null,
          installmentNo: inst.installmentNo,
          installmentCount: sale.installmentCount,
          dueDate,
          amount,
          status,
          bankAccountId,
          note,
          createdAt: sale.createdAt,
        });
      });
    });

    // Newest sales first, then installment number
    return list.sort((a, b) => {
      const dateDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.installmentNo - b.installmentNo;
    });
  }, [sales, edits]);

  // Dynamic Excel-style search & status filtering on the live grid data
  const filteredGridData = useMemo(() => {
    return liveGridData.filter((row) => {
      const customerName = row.customerName.toLowerCase();
      const customerPhone = row.customerPhone;
      const txNo = row.transactionNo.toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        customerName.includes(query) ||
        customerPhone.includes(query) ||
        txNo.includes(query);

      if (!matchesSearch) return false;

      if (statusFilter === "ACTIVE") {
        return row.status === "UNPAID";
      } else if (statusFilter === "OVERDUE") {
        return row.status === "UNPAID" && row.dueDate < todayStr;
      } else if (statusFilter === "COMPLETED") {
        return row.status === "PAID";
      }

      return true;
    });
  }, [liveGridData, searchQuery, statusFilter, todayStr]);

  // Live KPI Calculations that update immediately as cells change
  const totalAlacak = useMemo(() => {
    return liveGridData.filter((i) => i.status === "UNPAID").reduce((sum, i) => sum + i.amount, 0);
  }, [liveGridData]);

  const gecikmisTaksit = useMemo(() => {
    return liveGridData
      .filter((i) => i.status === "UNPAID" && i.dueDate < todayStr)
      .reduce((sum, i) => sum + i.amount, 0);
  }, [liveGridData, todayStr]);

  const tahsilEdilen = useMemo(() => {
    return liveGridData.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0);
  }, [liveGridData]);

  const aktifPlanCount = useMemo(() => {
    const unpaidSaleIds = new Set(liveGridData.filter((i) => i.status === "UNPAID").map((i) => i.saleId));
    return unpaidSaleIds.size;
  }, [liveGridData]);

  // Handle cell text/amount/date updates in draft edits state
  const handleCellEdit = (installmentId: string, saleId: string, field: string, value: any) => {
    setEdits((prev) => {
      const existing = prev[installmentId] || { saleId };
      return {
        ...prev,
        [installmentId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  // Handle status cell dropdown with auto bank assignment
  const handleStatusChange = (installmentId: string, saleId: string, newStatus: "PAID" | "UNPAID") => {
    const original = liveGridData.find((x) => x.installmentId === installmentId);
    const currentBank = edits[installmentId]?.bankAccountId !== undefined ? edits[installmentId].bankAccountId : original?.bankAccountId;

    let nextBank = currentBank;
    if (newStatus === "PAID" && !currentBank) {
      nextBank = banks[0]?.id || "bank-nakit";
    } else if (newStatus === "UNPAID") {
      nextBank = null;
    }

    setEdits((prev) => {
      const existing = prev[installmentId] || { saleId };
      return {
        ...prev,
        [installmentId]: {
          ...existing,
          status: newStatus,
          bankAccountId: nextBank,
        },
      };
    });
  };

  // Save changes via PUT API
  const handleSaveEdits = async () => {
    if (Object.keys(edits).length === 0) return;
    setSavingEdits(true);
    try {
      const installmentsToSave = Object.entries(edits).map(([instId, val]) => ({
        installmentId: instId,
        saleId: val.saleId,
        dueDate: val.dueDate,
        amount: val.amount,
        status: val.status,
        bankAccountId: val.bankAccountId,
        note: val.note,
      }));

      const res = await fetch("/api/installments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installments: installmentsToSave }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Taksitler kaydedilemedi.");
      }

      toast.success("Excel tablosundaki tüm değişiklikler kaydedildi!");
      setEdits({});
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Kaydetme sırasında bir hata oluştu.");
    } finally {
      setSavingEdits(false);
    }
  };

  // Export to CSV utility ensuring correct Turkish characters and Excel compatibility
  const exportToCSV = () => {
    const headers = ["Sözleşme No", "Müşteri", "Telefon", "Taksit Sıra", "Vade Tarihi", "Tutar (TL)", "Durum", "Banka/Kasa", "Taksit Notu"];
    const rows = filteredGridData.map((row) => [
      row.transactionNo,
      row.customerName,
      row.customerPhone,
      `${row.installmentNo}/${row.installmentCount}`,
      row.dueDate,
      row.amount.toFixed(2),
      row.status === "PAID" ? "Ödendi" : "Ödenmedi",
      banks.find((b) => b.id === row.bankAccountId)?.name || "-",
      row.note,
    ]);

    // Prepend UTF-8 BOM (\uFEFF) and use semicolons for Excel compatibility in Turkish regional settings
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `taksit_tablosu_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel CSV başarıyla indirildi.");
  };

  // Handle Pay installment
  const handlePayInstallment = async (installmentId: string) => {
    if (!selectedSale) return;
    if (!selectedBankId) {
      toast.error("Lütfen tahsilat için kasa/banka seçiniz.");
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/installments/${selectedSale.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId,
          bankAccountId: selectedBankId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Taksit tahsilatı başarısız oldu.");
      }

      toast.success("Taksit ödemesi başarıyla kaydedildi.");
      setPayingInstallmentId(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Taksit tahsil edilirken bir hata oluştu.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Handle Create installment plan
  const handleCreateInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId) {
      toast.error("Lütfen bir müşteri seçiniz.");
      return;
    }
    if (!formBaseAmount || Number(formBaseAmount) <= 0) {
      toast.error("Lütfen geçerli bir tutar giriniz.");
      return;
    }

    setCreatingPlan(true);
    try {
      const res = await fetch("/api/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: formCustomerId,
          baseAmount: Number(formBaseAmount),
          installmentCount: Number(formInstallmentCount),
          interestRate: isPesinFiyatina ? 0 : Number(formInterestRate),
          firstDueDate: formFirstDueDate || undefined,
          note: formNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Taksit planı oluşturulamadı.");
      }

      toast.success("Taksit planı başarıyla oluşturuldu.");
      setShowCreateModal(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Taksit planı oluşturulurken bir hata oluştu.");
    } finally {
      setCreatingPlan(false);
    }
  };

  // Helper to format phone for WhatsApp
  const formatWhatsAppPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `90${digits}`;
    }
    if (digits.length === 11 && digits.startsWith("0")) {
      return `90${digits.substring(1)}`;
    }
    if (digits.length === 12 && digits.startsWith("90")) {
      return digits;
    }
    return digits;
  };

  // WhatsApp reminder generator
  const sendWhatsApp = (sale: InstallmentSale, inst: Installment) => {
    if (!settings || !settings.whatsappEnabled || !settings.whatsappNumber) {
      toast.error("WhatsApp bildirim entegrasyonu kurulmamış veya aktif edilmemiş. Lütfen Ayarlar sayfasından kurulumu tamamlayın.");
      return;
    }
    if (!sale.customer) return;
    const customerName = sale.customer.fullName;
    const phone = formatWhatsAppPhone(sale.customer.phone);
    const dateStr = new Date(inst.dueDate).toLocaleDateString("tr-TR");

    const defaultTpl = "Merhaba {ad_soyad}, {islem_no} numaralı alışverişinize ait {taksit_no}. taksit ödemeniz ({tutar} TL) vadesi ({vade}) gelmiştir. Ödemenizi en kısa sürede tamamlamanızı rica ederiz. İyi günler dileriz.";
    let message = settings.installmentTemplate || defaultTpl;

    message = message
      .replace(/{ad_soyad}/g, customerName)
      .replace(/{islem_no}/g, sale.transactionNo)
      .replace(/{taksit_no}/g, String(inst.installmentNo))
      .replace(/{tutar}/g, inst.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 }))
      .replace(/{vade}/g, dateStr);

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const sendWhatsAppRow = (row: any) => {
    if (!settings || !settings.whatsappEnabled || !settings.whatsappNumber) {
      toast.error("WhatsApp bildirim entegrasyonu kurulmamış veya aktif edilmemiş. Lütfen Ayarlar sayfasından kurulumu tamamlayın.");
      return;
    }
    const cleanPhone = row.customerPhone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("90") ? cleanPhone : cleanPhone.startsWith("0") ? "90" + cleanPhone.slice(1) : "90" + cleanPhone;
    const dateStr = new Date(row.dueDate).toLocaleDateString("tr-TR");

    const defaultTpl = "Merhaba {ad_soyad}, {islem_no} numaralı alışverişinize ait {taksit_no}. taksit ödemeniz ({tutar} TL) vadesi ({vade}) gelmiştir. Ödemenizi en kısa sürede tamamlamanızı rica ederiz. İyi günler dileriz.";
    let message = settings.installmentTemplate || defaultTpl;

    message = message
      .replace(/{ad_soyad}/g, row.customerName)
      .replace(/{islem_no}/g, row.transactionNo)
      .replace(/{taksit_no}/g, String(row.installmentNo))
      .replace(/{tutar}/g, row.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 }))
      .replace(/{vade}/g, dateStr);

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  // Live dynamic preview for manual creation modal
  const manualPreviewList = useMemo(() => {
    const amt = Number(formBaseAmount);
    const count = Number(formInstallmentCount);
    const rate = isPesinFiyatina ? 0 : Number(formInterestRate);

    if (isNaN(amt) || amt <= 0 || isNaN(count) || count < 1) return [];

    const totalWithMarkup = Math.round(amt * (1 + rate / 100) * 100) / 100;
    const monthlyAmount = Math.round((totalWithMarkup / count) * 100) / 100;
    let addedAmount = 0;
    const preview = [];

    const baseDate = formFirstDueDate ? new Date(formFirstDueDate) : new Date();
    if (!formFirstDueDate) {
      baseDate.setMonth(baseDate.getMonth() + 1);
    }

    for (let i = 1; i <= count; i++) {
      const dueDate = new Date(baseDate);
      if (i > 1) {
        dueDate.setMonth(baseDate.getMonth() + (i - 1));
      }

      let currentInstAmount = monthlyAmount;
      if (i === count) {
        currentInstAmount = Math.round((totalWithMarkup - addedAmount) * 100) / 100;
      } else {
        addedAmount += monthlyAmount;
      }

      preview.push({
        installmentNo: i,
        dueDate: dueDate.toLocaleDateString("tr-TR"),
        amount: currentInstAmount,
      });
    }
    return preview;
  }, [formBaseAmount, formInstallmentCount, formInterestRate, isPesinFiyatina, formFirstDueDate]);

  const manualTotalAmount = useMemo(() => {
    const amt = Number(formBaseAmount);
    const rate = isPesinFiyatina ? 0 : Number(formInterestRate);
    if (isNaN(amt) || amt <= 0) return 0;
    return Math.round(amt * (1 + rate / 100) * 100) / 100;
  }, [formBaseAmount, formInterestRate, isPesinFiyatina]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Taksit Yönetimi</h1>
          <p className="text-xs text-slate-500 mt-1">
            Müşterilerinizin taksitli satış sözleşmelerini, vade detaylarını ve tahsilatlarını buradan yönetebilirsiniz.
          </p>
        </div>
        {activeTab === "takip" && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition duration-150 shadow-md shadow-blue-700/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Yeni Taksit Planı Oluştur
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200/60 gap-6 text-sm">
        <button
          onClick={() => setActiveTab("takip")}
          className={`pb-3 font-bold transition-all relative ${activeTab === "takip" ? "text-blue-700 font-extrabold" : "text-slate-500 hover:text-slate-800"}`}
        >
          Taksit Takip
          {activeTab === "takip" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("oranlar")}
          className={`pb-3 font-bold transition-all relative ${activeTab === "oranlar" ? "text-blue-700 font-extrabold" : "text-slate-500 hover:text-slate-800"}`}
        >
          Kredi Kartı Taksit Oranları
          {activeTab === "oranlar" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
      </div>

      {activeTab === "takip" ? (
        <>
          {/* KPI Stats Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Toplam Taksitli Alacak */}
            <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toplam Kalan Alacak</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-1.958-.659-1.071-.879-1.071-2.303 0-3.182.508-.439 1.233-.659 1.958-.659.768 0 1.536.219 2.121.659c.586.44.879.99.879 1.59" />
                  </svg>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-blue-700">
                  {totalAlacak.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Müşterilerden tahsil edilecek kalan toplam anapara + vade farkı tutarı.</p>
              </div>
            </div>

            {/* Günü Geçen Taksitler */}
            <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Günü Geçen Taksitler</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-rose-700">
                  {gecikmisTaksit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Vadesi bugünden önce olup henüz ödenmemiş olan taksitlerin toplamı.</p>
              </div>
            </div>

            {/* Tahsil Edilen Tutar */}
            <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tahsil Edilen Toplam</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-blue-700">
                  {tahsilEdilen.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Bugüne kadar taksitli satışlardan kasaya giren toplam tutar.</p>
              </div>
            </div>

            {/* Aktif Plan Sayısı */}
            <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aktif Plan Sayısı</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-black text-slate-800">{aktifPlanCount} Plan</h3>
                <p className="text-[10px] text-slate-400 mt-1">Kalan bakiyesi sıfırdan büyük olan açık taksitli sözleşme adeti.</p>
              </div>
            </div>
          </div>

          {/* Filter and Table Panel */}
          <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-2xl shadow-sm overflow-hidden">
            {/* Filter Controls Header */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 max-w-sm">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Müşteri Adı, Telefon veya Fiş No Ara..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter Tabs */}
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 text-xs font-semibold">
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg transition ${statusFilter === "ALL" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    Tümü
                  </button>
                  <button
                    onClick={() => setStatusFilter("ACTIVE")}
                    className={`px-3 py-1.5 rounded-lg transition ${statusFilter === "ACTIVE" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    Ödenmemiş
                  </button>
                  <button
                    onClick={() => setStatusFilter("OVERDUE")}
                    className={`px-3 py-1.5 rounded-lg transition ${statusFilter === "OVERDUE" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    Gecikmiş
                  </button>
                  <button
                    onClick={() => setStatusFilter("COMPLETED")}
                    className={`px-3 py-1.5 rounded-lg transition ${statusFilter === "COMPLETED" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    Ödenmiş
                  </button>
                </div>
                
                {/* Excel Export Button */}
                <button
                  type="button"
                  onClick={exportToCSV}
                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition duration-150 shadow-md shadow-emerald-700/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                  </svg>
                  {"Excel'e Aktar (CSV)"}
                </button>
              </div>
            </div>

            {/* Live Excel Sheet */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-500 font-medium animate-pulse">
                  Taksit tablosu yükleniyor...
                </div>
              ) : filteredGridData.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  Gösterilecek taksit kaydı bulunamadı.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-[11px] border border-slate-200">
                  <thead>
                    {/* Excel Index Headers (A, B, C...) */}
                    <tr className="bg-slate-100/80 text-[10px] text-slate-400 font-bold text-center border-b border-slate-200">
                      <th className="w-10 border-r border-slate-200 bg-slate-200/50 py-0.5 select-none"></th>
                      <th className="px-2 py-0.5 border-r border-slate-200">A</th>
                      <th className="px-2 py-0.5 border-r border-slate-200">B</th>
                      <th className="px-2 py-0.5 border-r border-slate-200">C</th>
                      <th className="px-2 py-0.5 border-r border-slate-200">D</th>
                      <th className="px-2 py-0.5 border-r border-slate-200">E</th>
                      <th className="px-2 py-0.5 border-r border-slate-200">F</th>
                      <th className="px-2 py-0.5 border-r border-slate-200">G</th>
                      <th className="px-2 py-0.5 border-r border-slate-200">H</th>
                      <th className="px-2 py-0.5">I</th>
                    </tr>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="w-10 text-center border-r border-slate-200 bg-slate-100/70 select-none py-2">#</th>
                      <th className="px-3 py-2 border-r border-slate-200 min-w-[130px]">Sözleşme Fiş No</th>
                      <th className="px-3 py-2 border-r border-slate-200 min-w-[150px]">Müşteri Bilgisi</th>
                      <th className="px-3 py-2 border-r border-slate-200 text-center w-20">Taksit</th>
                      <th className="px-3 py-2 border-r border-slate-200 min-w-[120px]">Vade Tarihi</th>
                      <th className="px-3 py-2 border-r border-slate-200 text-right min-w-[110px]">Tutar (TL)</th>
                      <th className="px-3 py-2 border-r border-slate-200 text-center w-24">Durum</th>
                      <th className="px-3 py-2 border-r border-slate-200 min-w-[130px]">Kasa / Banka Seçimi</th>
                      <th className="px-3 py-2 border-r border-slate-200 min-w-[200px]">Taksit Notu</th>
                      <th className="px-3 py-2 text-center w-24">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-700 bg-white">
                    {filteredGridData.map((row, idx) => {
                      const hasLocalEdit = !!edits[row.installmentId];
                      const isOverdue = row.status === "UNPAID" && row.dueDate < todayStr;
                      
                      return (
                        <tr
                          key={row.installmentId}
                          className={`hover:bg-slate-50/50 transition border-b border-slate-150 ${hasLocalEdit ? "bg-amber-50/40 hover:bg-amber-50/60" : ""}`}
                        >
                          {/* Row Number Column */}
                          <td className="w-10 text-center border-r border-slate-200 bg-slate-50 text-[10px] text-slate-400 font-bold select-none py-1">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-1 border-r border-slate-200 font-mono text-[11px] text-slate-500">{row.transactionNo}</td>
                          <td className="px-3 py-1 border-r border-slate-200">
                            <div className="font-bold text-slate-800 line-clamp-1">{row.customerName}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{row.customerPhone}</div>
                          </td>
                          <td className="px-3 py-1 border-r border-slate-200 text-center font-bold text-slate-600">
                            <span className="text-blue-700">{row.installmentNo}</span>
                            <span className="text-slate-400">/</span>
                            <span>{row.installmentCount}</span>
                          </td>
                          
                          {/* Due Date Cell */}
                          <td className="p-0.5 border-r border-slate-200">
                            <input
                              type="date"
                              className="w-full h-full px-2 py-1 bg-transparent border-0 outline-none text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded transition font-medium"
                              value={row.dueDate}
                              onChange={(e) => handleCellEdit(row.installmentId, row.saleId, "dueDate", e.target.value)}
                            />
                          </td>

                          {/* Amount Cell */}
                          <td className="p-0.5 border-r border-slate-200 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              className="w-full h-full px-2 py-1 bg-transparent border-0 outline-none text-xs text-right text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded transition font-bold"
                              value={row.amount}
                              onChange={(e) => handleCellEdit(row.installmentId, row.saleId, "amount", Number(e.target.value))}
                            />
                          </td>

                          {/* Status Cell */}
                          <td className="p-0.5 border-r border-slate-200">
                            <select
                              className={`w-full px-2 py-1 bg-transparent border-0 outline-none text-xs font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 rounded transition cursor-pointer ${
                                row.status === "PAID"
                                  ? "text-blue-700"
                                  : isOverdue
                                  ? "text-rose-700"
                                  : "text-amber-700"
                              }`}
                              value={row.status}
                              onChange={(e) => handleStatusChange(row.installmentId, row.saleId, e.target.value as "PAID" | "UNPAID")}
                            >
                              <option value="UNPAID">Ödenmedi</option>
                              <option value="PAID">Ödendi</option>
                            </select>
                          </td>

                          {/* Bank Selector Cell */}
                          <td className="p-0.5 border-r border-slate-200">
                            {row.status === "PAID" ? (
                              <select
                                className="w-full px-2 py-1 bg-transparent border-0 outline-none text-[11px] font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 rounded transition cursor-pointer text-slate-700"
                                value={row.bankAccountId || ""}
                                onChange={(e) => handleCellEdit(row.installmentId, row.saleId, "bankAccountId", e.target.value || null)}
                              >
                                <option value="" disabled>-- Seçin --</option>
                                {banks.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="w-full px-2 py-1 text-[10px] text-slate-400 select-none italic font-normal">
                                Seçim kapalı (Ödenmedi)
                              </div>
                            )}
                          </td>

                          {/* Note Cell */}
                          <td className="p-0.5 border-r border-slate-200">
                            <input
                              type="text"
                              placeholder="Not giriniz..."
                              className="w-full h-full px-2 py-1 bg-transparent border-0 outline-none text-[11px] text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded transition font-medium"
                              value={row.note}
                              onChange={(e) => handleCellEdit(row.installmentId, row.saleId, "note", e.target.value)}
                            />
                          </td>

                          {/* Actions Column */}
                          <td className="px-2 py-1 text-center align-middle">
                            <div className="flex items-center justify-center gap-1">
                              {/* Detail Modal Trigger */}
                              <button
                                type="button"
                                onClick={() => {
                                  const originalSale = sales.find((s) => s.id === row.saleId);
                                  if (originalSale) {
                                    setSelectedSale(originalSale);
                                  }
                                }}
                                title="Plan Detayını Göster"
                                className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200/40 transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>

                              {/* WhatsApp Reminder (Only for Unpaid with customers) */}
                              {row.status === "UNPAID" && row.customerPhone !== "-" && (
                                <button
                                  onClick={() => sendWhatsAppRow(row)}
                                  title="WhatsApp ile Hatırlat"
                                  className="p-1 bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200/40 transition flex items-center justify-center cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.733-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.023-5.11-2.885-6.974C16.59 1.91 14.121.879 11.487.879 6.058.879 1.631 5.299 1.627 10.73c-.001 1.737.478 3.426 1.396 4.909L2.04 19.3l3.864-.992c1.47.802 3.12 1.222 4.743 1.222zm11.367-7.635c-.31-.155-1.837-.906-2.121-.996-.284-.09-.49-.136-.696.155-.206.29-.798.996-.978 1.206-.18.207-.36.233-.67.078-.31-.156-1.309-.48-2.493-1.537-.92-.818-1.54-1.83-1.72-2.139-.18-.31-.018-.477.137-.631.14-.139.31-.36.465-.54.155-.18.206-.31.31-.517.103-.207.052-.387-.026-.54-.078-.155-.696-1.677-.954-2.297-.252-.606-.51-.524-.696-.533-.18-.01-.387-.01-.594-.01-.206 0-.54.078-.825.388-.284.31-1.083 1.06-1.083 2.585 0 1.526 1.11 3.003 1.265 3.21.155.207 2.185 3.337 5.292 4.679.739.32 1.317.51 1.77.653.743.236 1.42.203 1.954.124.594-.088 1.837-.751 2.096-1.474.258-.724.258-1.344.18-1.474-.078-.13-.258-.207-.568-.362z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Floating Excel Save Bar (Appears when there are edits in the sheet) */}
            {Object.keys(edits).length > 0 && (
              <div className="bg-slate-900 text-white py-3.5 px-6 flex items-center justify-between shadow-2xl border-t border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-bold tracking-wide">
                    Tabloda <span className="text-amber-400 font-extrabold">{Object.keys(edits).length} adet</span> hücre düzenlendi.
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEdits({})}
                    disabled={savingEdits}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-extrabold px-4 py-2 rounded-xl transition disabled:opacity-40"
                  >
                    Geri Al
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdits}
                    disabled={savingEdits}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 disabled:opacity-40"
                  >
                    {savingEdits ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Auto-fill and Save Actions bar */}
          <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Kredi Kartı Taksit Tabloları</h2>
              <p className="text-xs text-slate-500 mt-1">
                Kredi kartı markaları ve taksit bazlı vade farkı oranlarını buradan ayarlayabilirsiniz.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={cardConfigs.length === 0}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition duration-150 border border-slate-200"
              >
                Otomatik Doldur (Bonus Oranlarını Hepsine Kopyala)
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={settingsLoading}
                className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition duration-150 shadow-md shadow-blue-700/20"
              >
                {settingsLoading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </button>
            </div>
          </div>

          {settingsLoading && cardConfigs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium animate-pulse">
              Taksit oranları yükleniyor...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {cardConfigs.map((config) => {
                const style = getBrandStyle(config.brandId);
                return (
                  <div key={config.brandId} className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    {/* Card Header */}
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${style.bg}`} />
                        <h3 className="text-sm font-bold text-slate-800">{config.brandName}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600 select-none cursor-pointer" htmlFor={`brand-active-${config.brandId}`}>
                          Aktif
                        </label>
                        <input
                          id={`brand-active-${config.brandId}`}
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                          checked={config.isActive}
                          onChange={(e) => handleCardActiveChange(config.brandId, e.target.checked)}
                        />
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 space-y-4">
                      {!config.isActive ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-xs py-12">
                          Bu kart markası pasifleştirildi. Taksit seçeneklerinde listelenmeyecektir.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                <th className="pb-2">Taksit</th>
                                <th className="pb-2 text-center">Durum</th>
                                <th className="pb-2 text-center">Vade Farkı (%)</th>
                                <th className="pb-2 text-center">Artı Taksit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                              {config.installments.map((inst) => (
                                <tr key={inst.count} className="hover:bg-slate-50/30 transition">
                                  <td className="py-2.5 font-bold">{inst.count} Taksit</td>
                                  <td className="py-2.5 text-center">
                                    <input
                                      type="checkbox"
                                      className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                      checked={inst.isActive}
                                      onChange={(e) => handleInstallmentActiveChange(config.brandId, inst.count, e.target.checked)}
                                    />
                                  </td>
                                  <td className="py-2.5 text-center">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      disabled={!inst.isActive}
                                      className="w-16 border border-slate-200 rounded-lg text-center px-1 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition font-bold disabled:opacity-40"
                                      value={inst.rate}
                                      onChange={(e) => handleInstallmentRateChange(config.brandId, inst.count, Number(e.target.value))}
                                    />
                                  </td>
                                  <td className="py-2.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="6"
                                      disabled={!inst.isActive}
                                      className="w-16 border border-slate-200 rounded-lg text-center px-1 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 transition font-bold disabled:opacity-40"
                                      value={inst.plusInstallment}
                                      onChange={(e) => handleInstallmentPlusChange(config.brandId, inst.count, Number(e.target.value))}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Manual Installment Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden transition-all duration-300 transform scale-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-md font-bold text-slate-800">Yeni Taksit Planı Oluştur</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Manuel taksit ödeme planı ve borç kaydı oluşturur.</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleCreateInstallment} className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
              {/* Form Side */}
              <div className="flex-1 space-y-4">
                {/* Customer */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Müşteri Seçin (İsteğe Bağlı)</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition bg-white font-medium"
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                  >
                    <option value="">-- Müşteri Seçilmedi (Genel Satış / Cari Hesaba İşlenmez) --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.phone}) {c.creditLimit ? `[Limit: ${c.creditLimit.toLocaleString("tr-TR")} TL]` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Base Amount */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ana Para Tutar (TL) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="w-full border border-slate-200 rounded-xl text-xs pl-3.5 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition font-bold"
                      value={formBaseAmount}
                      onChange={(e) => setFormBaseAmount(e.target.value)}
                    />
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-slate-400">
                      TL
                    </span>
                  </div>
                </div>

                {/* Installment Count */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Taksit Sayısı (Ay) *</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition bg-white font-semibold"
                    value={formInstallmentCount}
                    onChange={(e) => setFormInstallmentCount(Number(e.target.value))}
                  >
                    <option value={1}>1 Taksit (Tek Çekim/Vade)</option>
                    <option value={2}>2 Taksit</option>
                    <option value={3}>3 Taksit</option>
                    <option value={4}>4 Taksit</option>
                    <option value={6}>6 Taksit</option>
                    <option value={9}>9 Taksit</option>
                    <option value={12}>12 Taksit</option>
                    <option value={18}>18 Taksit</option>
                    <option value={24}>24 Taksit</option>
                  </select>
                </div>

                {/* Peşin Fiyatına Toggle & Vade Farkı */}
                <div className="border border-slate-100 p-3.5 rounded-2xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pesinFiyatina"
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      checked={isPesinFiyatina}
                      onChange={(e) => {
                        setIsPesinFiyatina(e.target.checked);
                        if (e.target.checked) {
                          setFormInterestRate(0);
                        }
                      }}
                    />
                    <label htmlFor="pesinFiyatina" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                      Peşin Fiyatına Satış (Vade Farksız)
                    </label>
                  </div>

                  {!isPesinFiyatina && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Vade Farkı Oranı (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          className="w-full border border-slate-200 rounded-xl text-xs pl-3.5 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition font-bold"
                          value={formInterestRate}
                          onChange={(e) => setFormInterestRate(Number(e.target.value))}
                        />
                        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-slate-400">
                          %
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* First Due Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">İlk Taksit Vade Tarihi</label>
                  <input
                    type="date"
                    required
                    className="w-full border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                    value={formFirstDueDate}
                    onChange={(e) => setFormFirstDueDate(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Belirtilmezse ilk taksit bugünden 1 ay sonra başlar.</p>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sözleşme Notu / Açıklama</label>
                  <textarea
                    rows={2}
                    placeholder="Bu manuel taksit planına ait açıklama ekleyin..."
                    className="w-full border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition resize-none font-medium"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                  />
                </div>
              </div>

              {/* Preview Side */}
              <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col max-h-[500px]">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taksit Planı Önizleme</h3>
                  {manualTotalAmount > 0 && (
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Toplam Borç</div>
                      <div className="text-sm font-black text-blue-700">
                        {manualTotalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 font-medium text-xs mt-3">
                  {manualPreviewList.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-center py-12">
                      Tutar ve taksit sayısı girdiğinizde plan listelenecektir.
                    </div>
                  ) : (
                    manualPreviewList.map((p) => (
                      <div key={p.installmentNo} className="py-2.5 flex justify-between items-center hover:bg-slate-100/30 px-1 rounded-lg transition">
                        <div>
                          <div className="font-bold text-slate-800">{p.installmentNo}. Taksit</div>
                          <div className="text-[10px] text-slate-400">Vade: {p.dueDate}</div>
                        </div>
                        <div className="font-bold text-slate-700 text-right">
                          {p.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Submitting button inside preview footer */}
                <div className="pt-4 border-t border-slate-200/60 mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={creatingPlan || !formBaseAmount}
                    className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-700/20 disabled:opacity-50"
                  >
                    {creatingPlan ? "Oluşturuluyor..." : "Planı Oluştur"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Installment Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden transition-all duration-300 transform scale-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-md font-bold text-slate-800">Taksit Planı Detayları</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Sözleşme No: {selectedSale.transactionNo}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedSale(null);
                  setPayingInstallmentId(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Customer Info Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Müşteri Bilgileri</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{selectedSale.customer?.fullName || "Genel Satış / Müşteri Belirtilmemiş"}</div>
                  <div className="text-xs text-slate-500">{selectedSale.customer?.phone || "-"}</div>
                  <div className="text-xs text-slate-500">{selectedSale.customer?.email || "-"}</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Sözleşme Finansalı</div>
                  <div className="text-xs text-slate-700 mt-2 flex justify-between max-w-[200px]">
                    <span>Toplam Tutar:</span>
                    <span className="font-bold text-slate-800">{Number(selectedSale.totalAmount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</span>
                  </div>
                  <div className="text-xs text-slate-700 flex justify-between max-w-[200px]">
                    <span>Kalan Borç:</span>
                    <span className="font-bold text-blue-700">{Number(selectedSale.remainingAmount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Plan Koşulları</div>
                  <div className="text-xs text-slate-700 mt-2 flex justify-between max-w-[200px]">
                    <span>Taksit Adeti:</span>
                    <span className="font-bold text-slate-800">{selectedSale.installmentCount} Ay</span>
                  </div>
                  <div className="text-xs text-slate-700 flex justify-between max-w-[200px]">
                    <span>Vade Farkı Oranı:</span>
                    <span className="font-bold text-slate-800">%{selectedSale.interestRate}</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span>Ödeme İlerlemesi</span>
                  <span>
                    %{Math.round(((selectedSale.totalAmount - selectedSale.remainingAmount) / selectedSale.totalAmount) * 100)} (
                    {(selectedSale.totalAmount - selectedSale.remainingAmount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL Ödendi
                    )
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, ((selectedSale.totalAmount - selectedSale.remainingAmount) / selectedSale.totalAmount) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Installments Table */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Taksit Ödeme Tablosu</h3>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="px-5 py-3">Taksit No</th>
                        <th className="px-5 py-3">Son Ödeme Tarihi</th>
                        <th className="px-5 py-3 text-right">Tutar</th>
                        <th className="px-5 py-3 text-center">Durum</th>
                        <th className="px-5 py-3">Ödeme Detayı</th>
                        <th className="px-5 py-3 text-center">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {selectedSale.installments.map((inst) => {
                        const isOverdue = inst.status === "UNPAID" && new Date(inst.dueDate).toISOString().split("T")[0] < todayStr;
                        const paidBank = banks.find((b) => b.id === inst.bankAccountId);

                        return (
                          <tr key={inst.id} className="hover:bg-slate-50/30 transition">
                            <td className="px-5 py-3.5 font-bold">{inst.installmentNo}. Taksit</td>
                            <td className="px-5 py-3.5 text-slate-500">
                              {new Date(inst.dueDate).toLocaleDateString("tr-TR")}
                            </td>
                            <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                              {Number(inst.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              {inst.status === "PAID" ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                  Ödendi
                                </span>
                              ) : isOverdue ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                                  Gecikti
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                  Bekliyor
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                              {inst.status === "PAID" ? (
                                <div>
                                  <div>Kasa: {paidBank?.name || inst.bankAccountId}</div>
                                  <div className="text-[9px] text-slate-400">
                                    Tarih: {inst.paidAt ? new Date(inst.paidAt).toLocaleDateString("tr-TR") : "-"}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              {inst.status === "PAID" ? (
                                <span className="text-xs text-slate-400 font-semibold">Tamamlandı</span>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  {payingInstallmentId === inst.id ? (
                                    <div className="flex items-center gap-1 bg-slate-50 p-1 border border-slate-200 rounded-xl">
                                      <select
                                        className="border border-slate-200 rounded-lg text-[10px] px-2 py-1 outline-none bg-white focus:ring-1 focus:ring-blue-500 transition"
                                        value={selectedBankId}
                                        onChange={(e) => setSelectedBankId(e.target.value)}
                                      >
                                        {banks.map((b) => (
                                          <option key={b.id} value={b.id}>
                                            {b.name} ({b.balance.toLocaleString("tr-TR")} TL)
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => handlePayInstallment(inst.id)}
                                        disabled={submittingPayment}
                                        className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-[10px] px-2 py-1.5 rounded-lg transition disabled:opacity-50"
                                      >
                                        {submittingPayment ? "..." : "Kaydet"}
                                      </button>
                                      <button
                                        onClick={() => setPayingInstallmentId(null)}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] px-2 py-1.5 rounded-lg transition"
                                      >
                                        İptal
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setPayingInstallmentId(inst.id);
                                          if (banks.length > 0 && !selectedBankId) {
                                            setSelectedBankId(banks[0].id);
                                          }
                                        }}
                                        className="inline-flex items-center gap-1 bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg transition"
                                      >
                                        Tahsil Et
                                      </button>
                                      {selectedSale.customer && (
                                        <button
                                          onClick={() => sendWhatsApp(selectedSale, inst)}
                                          className="inline-flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200/50 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                        >
                                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.733-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.023-5.11-2.885-6.974C16.59 1.91 14.121.879 11.487.879 6.058.879 1.631 5.299 1.627 10.73c-.001 1.737.478 3.426 1.396 4.909L2.04 19.3l3.864-.992c1.47.802 3.12 1.222 4.743 1.222zm11.367-7.635c-.31-.155-1.837-.906-2.121-.996-.284-.09-.49-.136-.696.155-.206.29-.798.996-.978 1.206-.18.207-.36.233-.67.078-.31-.156-1.309-.48-2.493-1.537-.92-.818-1.54-1.83-1.72-2.139-.18-.31-.018-.477.137-.631.14-.139.31-.36.465-.54.155-.18.206-.31.31-.517.103-.207.052-.387-.026-.54-.078-.155-.696-1.677-.954-2.297-.252-.606-.51-.524-.696-.533-.18-.01-.387-.01-.594-.01-.206 0-.54.078-.825.388-.284.31-1.083 1.06-1.083 2.585 0 1.526 1.11 3.003 1.265 3.21.155.207 2.185 3.337 5.292 4.679.739.32 1.317.51 1.77.653.743.236 1.42.203 1.954.124.594-.088 1.837-.751 2.096-1.474.258-.724.258-1.344.18-1.474-.078-.13-.258-.207-.568-.362z" />
                                            </svg>
                                            Hatırlat
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedSale(null);
                  setPayingInstallmentId(null);
                }}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Kapat
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
