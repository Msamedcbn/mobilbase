"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-modal";

type Branch = { id: string; name: string };

type StaffBenefit = { label: string; amount: number };

type AppUser = {
  id: string;
  fullName: string;
  email: string;
  role: "PLATFORM_OWNER" | "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT";
  isActive: boolean;
  branchId: string | null;
  baseSalary?: number | string;
  commissionBasis?: "NONE" | "PROFIT" | "REVENUE";
  commissionPct?: number | string;
  benefits?: StaffBenefit[] | null;
  tenantId?: string | null;
  createdAt: string;
};

const QUICK_BENEFIT_PRESETS = ["Yol", "Yemek"];

type StaffPerformanceRow = {
  userId: string;
  fullName: string;
  role: string;
  baseSalary: number;
  commissionBasis: "NONE" | "PROFIT" | "REVENUE";
  commissionPct: number;
  benefits: StaffBenefit[];
  benefitsAmount: number;
  salesCount: number;
  revenue: number;
  cost: number;
  profit: number;
  commissionAmount: number;
  totalPayout: number;
  alreadyPosted: boolean;
};

const COMMISSION_BASIS_LABELS: Record<string, string> = {
  NONE: "Yok (Sadece Sabit Maaş)",
  PROFIT: "Satış Kârından Pay",
  REVENUE: "Cirodan Pay",
};

export default function PersonnelPage() {
  const { confirm, confirmDialog } = useConfirm();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [banks, setBanks] = useState<Array<{ id: string; name: string; balance: number | string }>>([]);
  const [isAccessAllowed, setIsAccessAllowed] = useState(true);
  const [loading, setLoading] = useState(false);

  // Active UI tab state — roster (anlık durum) vs Hakediş Raporu
  const [activeTab, setActiveTab] = useState<"roster" | "hakedis">("roster");

  // User form modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userFullName, setUserFullName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"PLATFORM_OWNER" | "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT">("CASHIER");
  const [userBranchId, setUserBranchId] = useState("");
  const [userIsActive, setUserIsActive] = useState(true);
  const [userBaseSalary, setUserBaseSalary] = useState("0");
  const [userCommissionBasis, setUserCommissionBasis] = useState<"NONE" | "PROFIT" | "REVENUE">("NONE");
  const [userCommissionPct, setUserCommissionPct] = useState("0");
  const [userBenefits, setUserBenefits] = useState<Array<{ label: string; amount: string }>>([]);

  // Staff performance / hakediş report state
  const [performancePeriod, setPerformancePeriod] = useState<"day" | "week" | "month" | "all">("month");
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformanceRow[]>([]);
  const [staffPerformanceLoading, setStaffPerformanceLoading] = useState(false);
  const [postingPayoutUserId, setPostingPayoutUserId] = useState<string | null>(null);

  // Today's at-a-glance performance for the roster table (independent of the
  // period selector on the Hakediş Raporu tab — always "today").
  const [todayPerformance, setTodayPerformance] = useState<StaffPerformanceRow[]>([]);

  // Avans Ver modal state
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceTargetUser, setAdvanceTargetUser] = useState<AppUser | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceDescription, setAdvanceDescription] = useState("Avans");
  const [advanceBankAccountId, setAdvanceBankAccountId] = useState("");
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);

  // Son Hareketler modal state
  const [historyUser, setHistoryUser] = useState<AppUser | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [bRes, uRes, cRes, lRes, bankRes] = await Promise.all([
        fetch("/api/branches").catch(() => null),
        fetch("/api/admin/users").catch(() => null),
        fetch("/api/customers").catch(() => null),
        fetch("/api/account-entries").catch(() => null),
        fetch("/api/banks").catch(() => null),
      ]);

      if (bRes && bRes.ok) {
        const bJson = await bRes.json();
        setBranches(Array.isArray(bJson) ? bJson : ((bJson as any).data || []));
      }

      if (uRes && uRes.ok) {
        const uJson = await uRes.json();
        setUsers(Array.isArray(uJson) ? uJson : ((uJson as any).data || []));
        setIsAccessAllowed(true);
      } else {
        setIsAccessAllowed(false);
      }

      if (cRes && cRes.ok) {
        const cJson = await cRes.json();
        setCustomers(Array.isArray(cJson) ? cJson : ((cJson as any).data || []));
      }

      if (lRes && lRes.ok) {
        const lJson = await lRes.json();
        setLedger(Array.isArray(lJson) ? lJson : ((lJson as any).data || []));
      }

      if (bankRes && bankRes.ok) {
        const bankJson = await bankRes.json();
        setBanks(Array.isArray(bankJson) ? bankJson : ((bankJson as any).data || []));
      }
    } catch {
      toast.error("Personel verileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function loadTodayPerformance() {
    try {
      const res = await fetch("/api/reports/staff-performance?period=day");
      const json = await res.json();
      if (!res.ok) return;
      setTodayPerformance(Array.isArray(json.staff) ? json.staff : []);
    } catch {
      // best-effort — table just shows "-" if this fails
    }
  }

  async function loadStaffPerformance(period: "day" | "week" | "month" | "all") {
    setStaffPerformanceLoading(true);
    try {
      const res = await fetch(`/api/reports/staff-performance?period=${period}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Hakediş raporu getirilemedi");
      setStaffPerformance(Array.isArray(json.staff) ? json.staff : []);
      if (json.dbUnavailable) {
        toast.warning("Bu rapor gerçek veritabanı gerektirir, veriler eksik olabilir.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hakediş raporu getirilemedi");
    } finally {
      setStaffPerformanceLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    loadTodayPerformance();
  }, []);

  const getUserBalance = (email: string) => {
    const cust = customers.find((c) => c.email?.toLowerCase().trim() === email.toLowerCase().trim());
    if (!cust) return null;
    const balance = ledger
      .filter((e) => e.customerId === cust.id)
      .reduce((sum, entry) => {
        const amt = Number(entry.amount);
        return sum + (entry.type === "DEBIT" ? amt : -amt);
      }, 0);
    return { customerId: cust.id, balance };
  };

  async function handleCreateUserCari(user: AppUser) {
    try {
      const dummyPhone = "0" + Math.floor(100000000 + Math.random() * 900000000).toString();
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: user.fullName,
          email: user.email,
          phone: dummyPhone,
          notes: `${user.fullName} Personel Cari Hesabı`,
          creditLimit: 10000,
          // Only honored by the API when the caller is a platform-wide (no-tenant)
          // platform owner — everyone else is always scoped to their own tenant.
          tenantId: user.tenantId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cari hesap oluşturulamadı");
      toast.success("Personel için cari hesap başarıyla oluşturuldu.");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cari oluşturma başarısız");
    }
  }

  async function handleCloseCari(user: AppUser, cari: { customerId: string; balance: number }) {
    if (Math.abs(cari.balance) === 0) {
      toast.info(`${user.fullName} cari hesabı zaten dengede (0,00 TL).`);
      return;
    }

    const type = cari.balance > 0 ? "CREDIT" : "DEBIT";
    const amount = Math.abs(cari.balance);
    const label = cari.balance > 0 ? "Tahsilat Alındı (Cari Kapatma)" : "Ödeme Yapıldı (Cari Kapatma)";

    if (
      !(await confirm(
        `${user.fullName} için ${amount.toLocaleString("tr-TR")} TL tutarındaki cari bakiyeyi sıfırlayarak hesabı kapatmak istiyor musunuz?`,
        { confirmLabel: "Cari Kapat" }
      ))
    )
      return;

    try {
      const res = await fetch("/api/account-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: cari.customerId,
          type,
          amount,
          description: `Personel Cari Kapatma / Sıfırlama - ${label}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cari kapatılamadı");
      toast.success(`${user.fullName} cari hesabı kapatıldı ve bakiye sıfırlandı.`);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cari kapatma başarısız");
    }
  }

  async function handleGiveAdvance(e: React.FormEvent) {

    e.preventDefault();
    if (!advanceTargetUser) return;
    const amt = Number(advanceAmount);
    if (!amt || amt <= 0) {
      toast.warning("Geçerli bir tutar girin");
      return;
    }
    const cari = getUserBalance(advanceTargetUser.email);
    if (!cari) {
      toast.warning("Bu personel için cari hesap bulunamadı");
      return;
    }
    setAdvanceSubmitting(true);
    try {
      // DEBIT here mirrors the regular customer ledger's meaning ("this entity
      // now owes less back to us") — since hakediş is posted as CREDIT (company
      // owes staff), a DEBIT advance nets against it on the same cari, so month-end
      // settlement is automatically avans-aware without extra bookkeeping.
      const res = await fetch("/api/account-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: cari.customerId,
          type: "DEBIT",
          amount: amt,
          description: advanceDescription.trim() || "Avans",
          bankAccountId: advanceBankAccountId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Avans kaydedilemedi");
      toast.success(`${advanceTargetUser.fullName} için ${amt.toLocaleString("tr-TR")} TL avans kaydedildi`);
      setShowAdvanceModal(false);
      setAdvanceTargetUser(null);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Avans kaydedilemedi");
    } finally {
      setAdvanceSubmitting(false);
    }
  }

  async function handleAddOrEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!userFullName.trim() || !userEmail.trim()) {
      toast.warning("Ad soyad ve e-posta gereklidir");
      return;
    }
    if (!editingUser && !userPassword) {
      toast.warning("Yeni personel için şifre gereklidir");
      return;
    }

    const payload: Record<string, any> = {
      fullName: userFullName,
      role: userRole,
      isActive: userIsActive,
      branchId: userBranchId || null,
      baseSalary: Number(userBaseSalary) || 0,
      commissionBasis: userCommissionBasis,
      commissionPct: Number(userCommissionPct) || 0,
      benefits: userBenefits
        .filter((b) => b.label.trim())
        .map((b) => ({ label: b.label.trim(), amount: Number(b.amount) || 0 })),
    };
    if (!editingUser) {
      payload.email = userEmail;
      payload.password = userPassword;
    } else if (userPassword) {
      payload.password = userPassword;
    }

    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
      const method = editingUser ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Personel kaydedilemedi");

      toast.success(editingUser ? "Personel güncellendi" : "Personel eklendi");
      setUserFullName("");
      setUserEmail("");
      setUserPassword("");
      setUserRole("CASHIER");
      setUserBranchId("");
      setUserIsActive(true);
      setUserBaseSalary("0");
      setUserCommissionBasis("NONE");
      setUserCommissionPct("0");
      setUserBenefits([]);
      setEditingUser(null);
      setShowUserModal(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    }
  }

  async function handleDeleteUser(id: string) {
    if (!(await confirm("Bu personeli silmek istediğinizden emin misiniz?", { danger: true, confirmLabel: "Sil" }))) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Personel silinemedi");

      toast.success("Personel silindi");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    }
  }

  async function handlePostPayout(row: StaffPerformanceRow) {
    if (
      !(await confirm(
        `${row.fullName} için ${row.totalPayout.toLocaleString("tr-TR")} TL hakediş, personelin cari hesabına alacak olarak işlenecek. Onaylıyor musunuz?`,
        { confirmLabel: "Cariye İşle" }
      ))
    )
      return;
    setPostingPayoutUserId(row.userId);
    try {
      const res = await fetch("/api/reports/staff-performance/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: row.userId, period: performancePeriod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hakediş işlenemedi");
      toast.success(data.message || "Hakediş cari hesaba işlendi");
      void loadStaffPerformance(performancePeriod);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hakediş işlenemedi");
    } finally {
      setPostingPayoutUserId(null);
    }
  }

  if (!loading && !isAccessAllowed) {
    return (
      <section className="max-w-[1400px] mx-auto p-4 md:p-6 animate-fade-in">
        <div className="panel p-8 text-center space-y-2">
          <h2 className="text-lg font-bold text-slate-900">Erişim Yetkiniz Yok</h2>
          <p className="text-sm text-slate-500">Personel Yönetimi bölümü için Yönetici veya Müdür yetkisi gereklidir.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h2 className="page-title !m-0">Personel Yönetimi</h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Personel kadrosu, anlık ciro durumu, avans ve ay sonu hakediş yönetimi</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto pb-px">
        <button
          onClick={() => { setActiveTab("roster"); void loadTodayPerformance(); }}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "roster" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Personel Kadrosu
        </button>
        <button
          onClick={() => { setActiveTab("hakedis"); void loadStaffPerformance(performancePeriod); }}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "hakedis" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Hakediş Raporu
        </button>
      </div>

      {activeTab === "roster" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Personel Kadrosu</h3>
              <p className="text-xs sm:text-sm text-slate-500">Sistem yetkileri, bugünkü ciro ve personel cari hesap durumları — anlık</p>
            </div>
            <button
              onClick={() => {
                setEditingUser(null);
                setUserFullName("");
                setUserEmail("");
                setUserPassword("");
                setUserRole("CASHIER");
                setUserBranchId(branches.length > 0 ? branches[0].id : "");
                setUserIsActive(true);
                setUserBaseSalary("0");
                setUserCommissionBasis("NONE");
                setUserCommissionPct("0");
                setUserBenefits([]);
                setShowUserModal(true);
              }}
              className="primary-btn shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Yeni Personel Ekle
            </button>
          </div>

          <div className="panel overflow-hidden">
            {users.length === 0 ? (
              <div className="empty-box">Kayıtlı personel bulunmuyor.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Personel Bilgisi</th>
                      <th>Rol / Yetki</th>
                      <th>Bağlı Şube</th>
                      <th style={{ textAlign: "right" }}>Bugünkü Ciro</th>
                      <th>Net Bakiye (Avans/Hakediş)</th>
                      <th>Durum</th>
                      <th style={{ textAlign: "right" }}>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const branch = branches.find((b) => b.id === u.branchId);
                      const cari = getUserBalance(u.email);

                      const roleColors: Record<string, { bg: string; text: string; label: string }> = {
                        ADMIN: { bg: "bg-blue-500/10", text: "text-blue-600", label: "Yönetici" },
                        MANAGER: { bg: "bg-emerald-500/10", text: "text-emerald-600", label: "Müdür" },
                        ACCOUNTANT: { bg: "bg-indigo-500/10", text: "text-indigo-600", label: "Muhasebeci" },
                        TECHNICIAN: { bg: "bg-purple-500/10", text: "text-purple-600", label: "Teknisyen" },
                        CASHIER: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Kasiyer" },
                        PLATFORM_OWNER: { bg: "bg-rose-500/10", text: "text-rose-600", label: "Platform Sahibi" },
                      };
                      const roleStyle = roleColors[u.role] || { bg: "bg-slate-100", text: "text-slate-600", label: u.role };

                      const initials = u.fullName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0 select-none">
                                {initials}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{u.fullName}</span>
                                <span className="text-xs text-slate-400 font-medium">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleStyle.bg} ${roleStyle.text}`}>
                              {roleStyle.label}
                            </span>
                          </td>
                          <td>
                            {branch ? (
                              <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                {branch.name}
                              </span>
                            ) : (
                              <em className="text-xs text-slate-400">Şube Atanmamış</em>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {(() => {
                              const today = todayPerformance.find((r) => r.userId === u.id);
                              if (!today) return <span className="text-xs text-slate-400">-</span>;
                              return (
                                <div className="flex flex-col items-end">
                                  <span className="font-bold text-sm text-slate-700">{today.revenue.toLocaleString("tr-TR")} TL</span>
                                  <span className="text-2xs text-slate-400">{today.salesCount} satış</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td>
                            {cari ? (
                              <button
                                onClick={() => setHistoryUser(u)}
                                className="font-bold text-sm cursor-pointer hover:underline"
                                title="Son hareketleri göster"
                              >
                                <span className={cari.balance > 0 ? "text-rose-500" : cari.balance < 0 ? "text-emerald-500" : "text-slate-400"}>
                                  {Number(cari.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                                </span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCreateUserCari(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 hover:border-blue-500/30 rounded-lg cursor-pointer transition-all duration-200"
                                title="Personel için otomatik cari hesap kartı açar"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Cari Aç
                              </button>
                            )}
                          </td>
                          <td>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                              <span className={`w-2 h-2 rounded-full ${u.isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500"}`} />
                              <span className={u.isActive ? "text-slate-700" : "text-rose-500"}>{u.isActive ? "Aktif" : "Pasif"}</span>
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className="flex gap-2 justify-end">
                              {cari && (
                                <button
                                  onClick={() => void handleCloseCari(u, cari)}
                                  className="field py-1.5 px-3 text-xs font-bold border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Personel cari bakiyesini sıfırlayarak hesabı kapat"
                                >
                                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Cari Kapat
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (!cari) {
                                    toast.warning("Önce bu personel için cari hesap açın (Cari Aç)");
                                    return;
                                  }
                                  setAdvanceTargetUser(u);
                                  setAdvanceAmount("");
                                  setAdvanceDescription("Avans");
                                  setAdvanceBankAccountId("");
                                  setShowAdvanceModal(true);
                                }}
                                disabled={!cari}
                                className="field py-1.5 px-3 text-xs font-semibold hover:border-amber-500 hover:text-amber-600 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                title={cari ? "Personele avans ver" : "Önce cari hesap açın"}
                              >

                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m9-8a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Avans Ver
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setUserFullName(u.fullName);
                                  setUserEmail(u.email);
                                  setUserPassword("");
                                  setUserRole(u.role);
                                  setUserBranchId(u.branchId || "");
                                  setUserIsActive(u.isActive);
                                  setUserBaseSalary(String(u.baseSalary ?? 0));
                                  setUserCommissionBasis(u.commissionBasis ?? "NONE");
                                  setUserCommissionPct(String(u.commissionPct ?? 0));
                                  setUserBenefits((u.benefits ?? []).map((b) => ({ label: b.label, amount: String(b.amount) })));
                                  setShowUserModal(true);
                                }}
                                className="field py-1.5 px-3 text-xs font-semibold hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Düzenle
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="field py-1.5 px-3 text-xs font-semibold border-rose-100 text-rose-500 bg-rose-50/20 hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center gap-1 cursor-pointer"
                                style={{ width: "fit-content" }}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Sil
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "hakedis" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Personel Hakediş Raporu</h3>
              <p className="text-xs sm:text-sm text-slate-500">Sabit maaş + kâr/ciro payına göre dönemsel hakediş ve personel cari hesabına işleme.</p>
            </div>
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 text-xs font-bold shadow-sm">
              {(["day", "week", "month", "all"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPerformancePeriod(p); void loadStaffPerformance(p); }}
                  className={`px-4 py-2 rounded-xl transition-all ${performancePeriod === p ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {p === "day" ? "Günlük" : p === "week" ? "Haftalık" : p === "month" ? "Aylık" : "Tümü"}
                </button>
              ))}
            </div>
          </div>

          <div className="panel overflow-hidden">
            {staffPerformanceLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Yükleniyor...</div>
            ) : staffPerformance.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Bu dönem için personel verisi bulunamadı.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                      <th className="px-4 py-3">Personel</th>
                      <th className="px-4 py-3 text-right">Satış Adedi</th>
                      <th className="px-4 py-3 text-right">Ciro</th>
                      <th className="px-4 py-3 text-right">Maliyet</th>
                      <th className="px-4 py-3 text-right">Kâr</th>
                      <th className="px-4 py-3">Prim Bazı</th>
                      <th className="px-4 py-3 text-right">Prim</th>
                      <th className="px-4 py-3 text-right">Sabit Maaş</th>
                      <th className="px-4 py-3 text-right">Ek Haklar</th>
                      <th className="px-4 py-3 text-right">Toplam Hakediş</th>
                      <th className="px-4 py-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffPerformance.map((row) => (
                      <tr key={row.userId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.fullName}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{row.salesCount}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{row.revenue.toLocaleString("tr-TR")} TL</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">{row.cost.toLocaleString("tr-TR")} TL</td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${row.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{row.profit.toLocaleString("tr-TR")} TL</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{COMMISSION_BASIS_LABELS[row.commissionBasis]}{row.commissionBasis !== "NONE" ? ` (%${row.commissionPct})` : ""}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{row.commissionAmount.toLocaleString("tr-TR")} TL</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{row.baseSalary.toLocaleString("tr-TR")} TL</td>
                        <td
                          className="px-4 py-3 text-right font-mono text-slate-700"
                          title={row.benefits.map((b) => `${b.label}: ${b.amount.toLocaleString("tr-TR")} TL`).join(", ") || undefined}
                        >
                          {row.benefitsAmount.toLocaleString("tr-TR")} TL
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">{row.totalPayout.toLocaleString("tr-TR")} TL</td>
                        <td className="px-4 py-3 text-right">
                          {performancePeriod === "all" ? (
                            <span className="text-[10px] text-slate-400">Dönem seçin</span>
                          ) : row.alreadyPosted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">İşlendi ✓</span>
                          ) : (
                            <button
                              onClick={() => void handlePostPayout(row)}
                              disabled={postingPayoutUserId === row.userId || row.totalPayout <= 0}
                              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-semibold"
                            >
                              {postingPayoutUserId === row.userId ? "İşleniyor..." : "Cariye İşle"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit User Modal — portaled to <body> so it centers on the real
          viewport, not the page <section>'s box (that ancestor keeps a
          `transform: translateY(0)` after its entrance animation finishes,
          which turns it into a containing block for `position: fixed`
          children and breaks their positioning otherwise). */}
      {showUserModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="w-full max-w-[680px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-3 animate-scale-in">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingUser ? "Personeli Düzenle" : "Yeni Personel Ekle"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Personel hesap bilgilerini ve yetkilerini belirleyin</p>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="w-8 h-8 shrink-0 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddOrEditUser} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ad Soyad *</label>
                  <input
                    type="text"
                    className="field"
                    value={userFullName}
                    onChange={(e) => setUserFullName(e.target.value)}
                    placeholder="örn. Mehmet Demir"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">E-posta (Giriş Adı) *</label>
                  <input
                    type="email"
                    className="field"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="örn. mehmet@vibegsm.com"
                    disabled={!!editingUser}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {editingUser ? "Şifre (boş = değişmez)" : "Giriş Şifresi *"}
                  </label>
                  <input
                    type="password"
                    className="field"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder={editingUser ? "Yeni şifre girin..." : "En az 8 karakter..."}
                    required={!editingUser}
                    minLength={8}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Yetki Rolü</label>
                  <select
                    className="field font-medium cursor-pointer"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as any)}
                  >
                    <option value="CASHIER">Kasiyer</option>
                    <option value="TECHNICIAN">Teknisyen</option>
                    <option value="MANAGER">Müdür</option>
                    <option value="ACCOUNTANT">Muhasebeci</option>
                    <option value="PLATFORM_OWNER">Platform Sahibi</option>
                    <option value="ADMIN">Yönetici</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Çalıştığı Şube</label>
                <select
                  className="field font-medium cursor-pointer"
                  value={userBranchId}
                  onChange={(e) => setUserBranchId(e.target.value)}
                >
                  <option value="">Şube Seçin (İsteğe Bağlı)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Maaş Tipi</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block">Sabit Maaş (TL)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="field"
                      value={userBaseSalary}
                      onChange={(e) => setUserBaseSalary(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block">Prim Bazı</label>
                    <select
                      className="field font-medium cursor-pointer"
                      value={userCommissionBasis}
                      onChange={(e) => setUserCommissionBasis(e.target.value as any)}
                    >
                      <option value="NONE">Yok</option>
                      <option value="PROFIT">Kâr Payı</option>
                      <option value="REVENUE">Ciro Payı</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block">Prim Oranı (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      className="field"
                      value={userCommissionPct}
                      onChange={(e) => setUserCommissionPct(e.target.value)}
                      disabled={userCommissionBasis === "NONE"}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ek Haklar (Yol, Yemek vb.)</label>
                  <div className="flex items-center gap-1.5">
                    {QUICK_BENEFIT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setUserBenefits((prev) => [...prev, { label: preset, amount: "0" }])}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
                      >
                        + {preset}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setUserBenefits((prev) => [...prev, { label: "", amount: "0" }])}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      + Diğer
                    </button>
                  </div>
                </div>

                {userBenefits.length > 0 && (
                  <div className="space-y-2">
                    {userBenefits.map((b, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          className="field flex-1 min-w-0"
                          placeholder="örn. Yol Yardımı"
                          value={b.label}
                          onChange={(e) =>
                            setUserBenefits((prev) => prev.map((row, i) => (i === idx ? { ...row, label: e.target.value } : row)))
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="field shrink-0"
                          style={{ width: "8rem" }}
                          placeholder="Tutar (TL)"
                          value={b.amount}
                          onChange={(e) =>
                            setUserBenefits((prev) => prev.map((row, i) => (i === idx ? { ...row, amount: e.target.value } : row)))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setUserBenefits((prev) => prev.filter((_, i) => i !== idx))}
                          className="shrink-0 w-8 h-8 rounded-lg border border-slate-200 text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="userIsActiveCheckbox"
                  checked={userIsActive}
                  onChange={(e) => setUserIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="userIsActiveCheckbox" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Kullanıcı Aktif mi? (Sisteme giriş yapabilir)
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="flex-1 field py-2.5 font-bold bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  onClick={() => setShowUserModal(false)}
                >
                  İptal
                </button>
                <button type="submit" className="flex-1 primary-btn py-2.5">
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showAdvanceModal && advanceTargetUser && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Avans Ver</h3>
                <p className="text-xs text-slate-400 mt-0.5">{advanceTargetUser.fullName} için personel carisine borç (avans) kaydı</p>
              </div>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="w-8 h-8 shrink-0 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGiveAdvance} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tutar (TL) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="field"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="örn. 2000"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Açıklama</label>
                <input
                  type="text"
                  className="field"
                  value={advanceDescription}
                  onChange={(e) => setAdvanceDescription(e.target.value)}
                  placeholder="Avans"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Kasa/Banka (isteğe bağlı)</label>
                <select
                  className="field font-medium cursor-pointer"
                  value={advanceBankAccountId}
                  onChange={(e) => setAdvanceBankAccountId(e.target.value)}
                >
                  <option value="">Seçilmedi</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({Number(b.balance).toLocaleString("tr-TR")} TL)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="flex-1 field py-2.5 font-bold bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  onClick={() => setShowAdvanceModal(false)}
                >
                  İptal
                </button>
                <button type="submit" disabled={advanceSubmitting} className="flex-1 primary-btn py-2.5 disabled:opacity-60">
                  {advanceSubmitting ? "Kaydediliyor..." : "Avansı Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {historyUser && typeof document !== "undefined" && createPortal(
        (() => {
          const cari = getUserBalance(historyUser.email);
          const entries = cari
            ? ledger
                .filter((entry) => entry.customerId === cari.customerId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 15)
            : [];
          return (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
              <div className="w-full max-w-[480px] max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-in">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Son Hareketler</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{historyUser.fullName} — avans ve hakediş cari kayıtları</p>
                  </div>
                  <button
                    onClick={() => setHistoryUser(null)}
                    className="w-8 h-8 shrink-0 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-500 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {entries.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">Henüz cari hareketi yok.</p>
                ) : (
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{entry.description || (entry.type === "CREDIT" ? "Hakediş" : "Borç")}</p>
                          <p className="text-2xs text-slate-400">{new Date(entry.createdAt).toLocaleString("tr-TR")}</p>
                        </div>
                        <span className={`font-mono font-bold text-sm ${entry.type === "CREDIT" ? "text-emerald-600" : "text-rose-500"}`}>
                          {entry.type === "CREDIT" ? "+" : "-"}{Number(entry.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })(),
        document.body
      )}

      {confirmDialog}
    </section>
  );
}
