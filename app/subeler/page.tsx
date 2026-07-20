"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-modal";

type Branch = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
};

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
  createdAt: string;
};

type StaffPerformanceRow = {
  userId: string;
  fullName: string;
  role: string;
  baseSalary: number;
  commissionBasis: "NONE" | "PROFIT" | "REVENUE";
  commissionPct: number;
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

type Product = {
  id: string;
  name: string;
  barcode: string;
  category: string | null;
  stock: number;
  branchStocks?: Array<{
    id: string;
    branchId: string;
    stock: number;
    branch: Branch | null;
  }>;
};

export default function BranchesPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Branch form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Stock transfer form state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [targetBranchId, setTargetBranchId] = useState("");
  const [transferQty, setTransferQty] = useState(1);

  // Added States for branch performance & history
  const [performance, setPerformance] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [transferHistory, setTransferHistory] = useState<any[]>([]);

  // Personnel management states
  const [users, setUsers] = useState<AppUser[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  // User form modals state
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Staff performance / hakediş report state
  const [performancePeriod, setPerformancePeriod] = useState<"day" | "week" | "month" | "all">("month");
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformanceRow[]>([]);
  const [staffPerformanceLoading, setStaffPerformanceLoading] = useState(false);
  const [postingPayoutUserId, setPostingPayoutUserId] = useState<string | null>(null);

  // Active UI tab state
  const [activeTab, setActiveTab] = useState<"branches" | "users" | "transfers" | "performance">("branches");

  async function loadData() {
    setLoading(true);
    try {
      const [bRes, pRes, uRes, cRes, lRes] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/products"),
        fetch("/api/admin/users").catch(() => null),
        fetch("/api/customers").catch(() => null),
        fetch("/api/account-entries").catch(() => null)
      ]);
      const bJson = await bRes.json();
      const pJson = await pRes.json();
      setBranches(Array.isArray(bJson) ? bJson : ((bJson as any).data || []));
      setProducts(Array.isArray(pJson) ? pJson : ((pJson as any).data || []));

      if (uRes && uRes.ok) {
        const uJson = await uRes.json();
        setUsers(Array.isArray(uJson) ? uJson : ((uJson as any).data || []));
        setIsUserAdmin(true);
      } else {
        setIsUserAdmin(false);
      }

      if (cRes && cRes.ok) {
        const cJson = await cRes.json();
        setCustomers(Array.isArray(cJson) ? cJson : ((cJson as any).data || []));
      }

      if (lRes && lRes.ok) {
        const lJson = await lRes.json();
        setLedger(Array.isArray(lJson) ? lJson : ((lJson as any).data || []));
      }
    } catch {
      toast.error("Şube ve ürün verileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function loadPerformanceAndHistory() {
    try {
      const [perfRes, histRes] = await Promise.all([
        fetch("/api/branches/performance"),
        fetch("/api/products/transfer/history")
      ]);
      const perfJson = await perfRes.json();
      const histJson = await histRes.json();

      if (perfJson && perfJson.performance) {
        setPerformance(perfJson.performance);
        setTotalRevenue(perfJson.totalRevenue || 0);
      } else if (perfJson && perfJson.data) {
        setPerformance(perfJson.data.performance || []);
        setTotalRevenue(perfJson.data.totalRevenue || 0);
      }

      if (Array.isArray(histJson)) {
        setTransferHistory(histJson);
      } else if (histJson && histJson.data) {
        setTransferHistory(histJson.data || []);
      }
    } catch {
      // Fail silently
    }
  }

  useEffect(() => {
    loadData();
    loadPerformanceAndHistory();
  }, []);

  useEffect(() => {
    if (!isUserAdmin && (activeTab === "users" || activeTab === "performance")) {
      setActiveTab("branches");
    }
  }, [isUserAdmin, activeTab]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  async function handleAddOrEditBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!branchName.trim()) {
      toast.warning("Şube adı gereklidir");
      return;
    }

    const payload = {
      name: branchName,
      address: branchAddress || null,
      phone: branchPhone || null,
    };

    try {
      const url = editingBranch ? `/api/branches/${editingBranch.id}` : "/api/branches";
      const method = editingBranch ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Şube kaydedilemedi");

      toast.success(data.message || "Şube kaydedildi");
      setBranchName("");
      setBranchAddress("");
      setBranchPhone("");
      setEditingBranch(null);
      setShowAddModal(false);
      loadData();
      loadPerformanceAndHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    }
  }

  async function handleDeleteBranch(id: string) {
    if (!(await confirm("Bu şubeyi silmek istediğinizden emin misiniz?", { danger: true, confirmLabel: "Sil" }))) return;
    try {
      const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Şube silinemedi");

      toast.success("Şube silindi");
      loadData();
      loadPerformanceAndHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    }
  }

  const getUserBalance = (email: string) => {
    const cust = customers.find((c) => c.email?.toLowerCase().trim() === email.toLowerCase().trim());
    if (!cust) return null;
    const balance = ledger
      .filter((e) => e.customerId === cust.id)
      .reduce((sum, entry) => {
        const amt = Number(entry.amount);
        return sum + (entry.type === "DEBIT" ? amt : -amt);
      }, 0);
    return {
      customerId: cust.id,
      balance,
    };
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

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId || !sourceBranchId || !targetBranchId || transferQty <= 0) {
      toast.warning("Lütfen tüm alanları doldurun ve transfer adedini girin");
      return;
    }

    try {
      const res = await fetch("/api/products/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          sourceBranchId,
          targetBranchId,
          quantity: transferQty
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer başarısız");

      toast.success(data.message || "Stok transferi gerçekleştirildi");
      setTransferQty(1);
      loadData();
      loadPerformanceAndHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
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

  async function handleChangeOwnPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.warning("Tum sifre alanlarini doldurun.");
      return;
    }
    if (newPassword.length < 8) {
      toast.warning("Yeni sifre en az 8 karakter olmali.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning("Yeni sifre ve tekrar alani ayni olmali.");
      return;
    }

    try {
      setChangingPassword(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sifre guncellenemedi.");
      toast.success(json.message || "Sifre guncellendi.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sifre guncellenemedi.");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <section className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="page-title !m-0">Çoklu Şube Yönetimi</h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Şube dağılımlarını, ciro performansını, personelleri ve şubeler arası stok transferlerini yönetin</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("branches")}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "branches"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Şubeler ve Performans
        </button>

        {isUserAdmin && (
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "users"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Personel Yönetimi
          </button>
        )}

        <button
          onClick={() => setActiveTab("transfers")}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "transfers"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Stok Transferi
        </button>

        {isUserAdmin && (
          <button
            onClick={() => { setActiveTab("performance"); void loadStaffPerformance(performancePeriod); }}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "performance"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Hakediş Raporu
          </button>
        )}
      </div>

      {/* Tab Contents */}
      {activeTab === "branches" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Branches list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Kayıtlı Şubeler</h3>
                <p className="text-xs text-slate-500">Sistemdeki tüm aktif şubelerin listesi</p>
              </div>
              <button 
                onClick={() => {
                  setEditingBranch(null);
                  setBranchName("");
                  setBranchAddress("");
                  setBranchPhone("");
                  setShowAddModal(true);
                }} 
                className="primary-btn"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Yeni Şube Ekle
              </button>
            </div>

            {branches.length === 0 ? (
              <div className="empty-box">Kayıtlı şube bulunmuyor.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branches.map((b) => {
                  const branchUsers = users.filter((u) => u.branchId === b.id);
                  const staffCount = branchUsers.length;
                  
                  return (
                    <div key={b.id} className="panel group relative overflow-hidden flex flex-col justify-between p-5 transition-all duration-300 hover:shadow-lg hover:border-blue-500/30">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full pointer-events-none" />
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base shadow-inner shrink-0">
                              {b.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors duration-200">{b.name}</h4>
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md mt-1 select-none">
                                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                {staffCount} Personel
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                          <p className="flex items-center">
                            <svg className="w-4 h-4 text-slate-400 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 00.096.807L7 9.773V13a9 9 0 009 9h3.227l1.043-1.043a1 1 0 00.096-.807l-.548-2.2a1 1 0 01.725-.94H21a2 2 0 012 2v3a2 2 0 01-2 2h-3.09a4.5 4.5 0 01-2.94-1.11L3.3 5.3a4.5 4.5 0 01-1.11-2.94V5z" />
                            </svg>
                            {b.phone || "Telefon belirtilmemiş"}
                          </p>
                          <p className="flex items-start">
                            <svg className="w-4 h-4 text-slate-400 mr-2 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="line-clamp-2">{b.address || "Adres bilgisi eklenmemiş"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                        <button 
                          onClick={() => {
                            setEditingBranch(b);
                            setBranchName(b.name);
                            setBranchAddress(b.address || "");
                            setBranchPhone(b.phone || "");
                            setShowAddModal(true);
                          }}
                          className="flex-1 field py-2 text-xs font-semibold hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Düzenle
                        </button>
                        <button 
                          onClick={() => handleDeleteBranch(b.id)}
                          className="field py-2 text-xs font-semibold border-rose-100 text-rose-500 bg-rose-50/20 hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          style={{ width: "fit-content", paddingLeft: 12, paddingRight: 12 }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Sil
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Performance and stats */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Konsolide Performans</h3>
            <div className="panel p-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Hesap Guvenligi</h4>
                <p className="text-xs text-slate-500">Kendi kullanici sifrenizi buradan degistirebilirsiniz.</p>
              </div>
              <form className="space-y-3" onSubmit={handleChangeOwnPassword}>
                <input
                  type="password"
                  className="field"
                  placeholder="Mevcut sifre"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <input
                  type="password"
                  className="field"
                  placeholder="Yeni sifre (en az 8 karakter)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <input
                  type="password"
                  className="field"
                  placeholder="Yeni sifre (tekrar)"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button type="submit" className="primary-btn w-full" disabled={changingPassword}>
                  {changingPassword ? "Guncelleniyor..." : "Sifremi Guncelle"}
                </button>
              </form>
            </div>
            
            <div className="panel p-5 space-y-6">
              {/* Financial Box */}
              <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-2xl p-5 relative overflow-hidden shadow-md">
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-blue-200/80 uppercase tracking-wider">Toplam Konsolide Ciro</span>
                    <h2 className="text-2xl md:text-3xl font-extrabold mt-1 tracking-tight">
                      {Number(totalRevenue).toLocaleString("tr-TR")} <span className="text-lg font-semibold text-blue-300">TL</span>
                    </h2>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-4 font-semibold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Aktif sipariş ve satış toplamları baz alınmıştır
                </div>
              </div>

              {/* Progress bars list */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Şube Ciro Dağılımı</span>
                {performance.length === 0 ? (
                  <div className="text-slate-500 text-sm text-center py-4">
                    Performans verisi yükleniyor veya şube cirosu bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {performance.map((p, idx) => {
                      const colors = [
                        "from-blue-500 to-emerald-500",
                        "from-blue-500 to-indigo-500",
                        "from-purple-500 to-pink-500",
                        "from-amber-500 to-orange-500",
                      ];
                      const gradientClass = colors[idx % colors.length];
                      return (
                        <div key={p.id} className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{p.name}</span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {Number(p.revenue).toLocaleString("tr-TR")} TL <span className="text-xs font-normal text-slate-500">({p.percentage}%)</span>
                            </span>
                          </div>
                          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                            <div 
                              className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-500 ease-out`}
                              style={{ width: `${p.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Smart recommendation card */}
              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-3 items-start">
                <span className="text-xl shrink-0 mt-0.5">💡</span>
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-blue-800 dark:text-blue-300">Stok Optimizasyonu Önerisi</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Düşük stok seviyeli ürünleri, cirosu yüksek olan şubeler arasında transfer ederek stok devir hızını ve genel satış oranlarını optimize edebilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "users" && isUserAdmin && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Personel Kadrosu</h3>
              <p className="text-xs sm:text-sm text-slate-500">Sistem yetkileri, giriş bilgileri ve personel cari hesap durumları</p>
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
                      <th>Cari Borç Durumu</th>
                      <th>Durum</th>
                      <th style={{ textAlign: "right" }}>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const branch = branches.find((b) => b.id === u.branchId);
                      const cari = getUserBalance(u.email);
                      
                      const roleColors: Record<string, { bg: string, text: string, label: string }> = {
                        ADMIN: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", label: "Yönetici" },
                        MANAGER: { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", label: "Müdür" },
                        ACCOUNTANT: { bg: "bg-indigo-500/10 dark:bg-indigo-500/20", text: "text-indigo-600 dark:text-indigo-400", label: "Muhasebeci" },
                        TECHNICIAN: { bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-600 dark:text-purple-400", label: "Teknisyen" },
                        CASHIER: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", label: "Kasiyer" },
                        PLATFORM_OWNER: { bg: "bg-rose-500/10 dark:bg-rose-500/20", text: "text-rose-600 dark:text-rose-400", label: "Platform Sahibi" },
                      };
                      const roleStyle = roleColors[u.role] || { bg: "bg-slate-100", text: "text-slate-600", label: u.role };

                      const initials = u.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0 select-none">
                                {initials}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 dark:text-white">{u.fullName}</span>
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
                              <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 font-medium">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                {branch.name}
                              </span>
                            ) : (
                              <em className="text-xs text-slate-400">Şube Atanmamış</em>
                            )}
                          </td>
                          <td>
                            {cari ? (
                              <span className={`font-bold text-sm ${cari.balance > 0 ? "text-rose-500" : cari.balance < 0 ? "text-emerald-500" : "text-slate-400"}`}>
                                {Number(cari.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                              </span>
                            ) : (
                              <button
                                onClick={() => handleCreateUserCari(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:border-blue-500/30 rounded-lg cursor-pointer transition-all duration-200"
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
                              <span className={u.isActive ? "text-slate-700 dark:text-slate-300" : "text-rose-500"}>
                                {u.isActive ? "Aktif" : "Pasif"}
                              </span>
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className="flex gap-2 justify-end">
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

      {activeTab === "transfers" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Transfer Form */}
            <div className="panel p-5 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Şubeler Arası Stok Transferi</h3>
                <p className="text-xs text-slate-500">Mevcut envanteri şubeler arasında hızlıca taşıyın</p>
              </div>

              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Ürün Seçin</label>
                  <select 
                    className="field font-medium cursor-pointer" 
                    value={selectedProductId} 
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setSourceBranchId("");
                      setTargetBranchId("");
                    }}
                  >
                    <option value="">Ürün arayın veya seçin...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.barcode})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Kaynak Şube</label>
                    <select 
                      className="field font-medium cursor-pointer" 
                      value={sourceBranchId} 
                      onChange={(e) => setSourceBranchId(e.target.value)}
                      disabled={!selectedProductId}
                    >
                      <option value="">Şube seçin...</option>
                      {selectedProduct?.branchStocks?.map((s) => (
                        <option key={s.branchId} value={s.branchId}>
                          {s.branch?.name || `Şube: ${s.branchId}`} (Mevcut Stok: {s.stock})
                        </option>
                      )) || branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Hedef Şube</label>
                    <select 
                      className="field font-medium cursor-pointer" 
                      value={targetBranchId} 
                      onChange={(e) => setTargetBranchId(e.target.value)}
                      disabled={!selectedProductId}
                    >
                      <option value="">Şube seçin...</option>
                      {branches
                        .filter((b) => b.id !== sourceBranchId)
                        .map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Transfer Miktarı (Adet)</label>
                  <input 
                    type="number" 
                    min={1} 
                    className="field font-semibold" 
                    value={transferQty} 
                    onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value, 10)))}
                    disabled={!selectedProductId}
                  />
                </div>

                <button 
                  type="submit" 
                  className="primary-btn w-full py-3" 
                  disabled={loading || !selectedProductId}
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Transferi Gerçekleştir
                </button>
              </form>
            </div>

            {/* Column 2: Selected Product stock breakdown */}
            <div className="panel p-5 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Şube Stok Durumu</h3>
                <p className="text-xs text-slate-500">Seçili ürünün şubeler arasındaki envanter dağılımı</p>
              </div>

              {!selectedProduct ? (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center min-h-[250px]">
                  <span className="text-3xl mb-2 select-none">📦</span>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300">Ürün Seçilmedi</h4>
                  <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                    Şube dağılımını görmek ve transfer işlemini başlatmak için lütfen formdan bir ürün seçin
                  </p>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-slate-500/5 rounded-bl-full flex items-center justify-center pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">{selectedProduct.category || "Genel"}</span>
                      <h4 className="font-bold text-slate-800 dark:text-white text-base">{selectedProduct.name}</h4>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                      <span>Barkod: <strong className="text-slate-500 dark:text-slate-300">{selectedProduct.barcode}</strong></span>
                      <span>Toplam Stok: <strong className="text-slate-500 dark:text-slate-300">{selectedProduct.stock} adet</strong></span>
                    </div>
                  </div>

                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Şube</th>
                          <th style={{ textAlign: "right" }}>Mevcut Stok</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProduct.branchStocks && selectedProduct.branchStocks.length > 0 ? (
                          selectedProduct.branchStocks.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/50">
                              <td className="font-bold text-slate-700 dark:text-slate-300">
                                {s.branch?.name || `Şube: ${s.branchId}`}
                              </td>
                              <td style={{ textAlign: "right" }} className="font-extrabold text-slate-900 dark:text-white">
                                {s.stock} adet
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="text-center text-slate-400 text-xs py-8">
                              Bu ürün için henüz şube bazlı stok bilgisi girilmemiştir.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Panel: Transfer History */}
          <div className="panel p-5 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transfer Geçmişi</h3>
              <p className="text-xs text-slate-500">Şubeler arasında yapılmış geçmiş stok transferi kayıtları</p>
            </div>

            <div className="panel-scroll max-h-[300px] overflow-y-auto">
              {transferHistory.length === 0 ? (
                <div className="empty-box">Kayıtlı transfer geçmişi bulunmuyor.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tarih / Saat</th>
                      <th>Ürün Bilgisi</th>
                      <th>Kaynak Şube</th>
                      <th>Hedef Şube</th>
                      <th style={{ textAlign: "right" }}>Miktar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50">
                        <td className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {new Date(h.createdAt).toLocaleString("tr-TR")}
                        </td>
                        <td className="font-bold text-slate-800 dark:text-white">
                          {h.productName || "Bilinmeyen Ürün"}
                        </td>
                        <td>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15 select-none">
                            {h.sourceBranchName || "Bilinmeyen Şube"}
                          </span>
                        </td>
                        <td>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 select-none">
                            {h.targetBranchName || "Bilinmeyen Şube"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }} className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                          {h.quantity} adet
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "performance" && isUserAdmin && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Personel Hakediş Raporu</h3>
              <p className="text-xs sm:text-sm text-slate-500">Sabit maaş + kâr/ciro payına göre dönemsel hakediş ve personel cari hesabına işleme.</p>
            </div>
            <div className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-xs font-bold shadow-sm">
              {(["day", "week", "month", "all"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPerformancePeriod(p); void loadStaffPerformance(p); }}
                  className={`px-4 py-2 rounded-xl transition-all ${performancePeriod === p ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
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
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50 dark:bg-slate-900">
                      <th className="px-4 py-3">Personel</th>
                      <th className="px-4 py-3 text-right">Satış Adedi</th>
                      <th className="px-4 py-3 text-right">Ciro</th>
                      <th className="px-4 py-3 text-right">Maliyet</th>
                      <th className="px-4 py-3 text-right">Kâr</th>
                      <th className="px-4 py-3">Prim Bazı</th>
                      <th className="px-4 py-3 text-right">Prim</th>
                      <th className="px-4 py-3 text-right">Sabit Maaş</th>
                      <th className="px-4 py-3 text-right">Toplam Hakediş</th>
                      <th className="px-4 py-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {staffPerformance.map((row) => (
                      <tr key={row.userId} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{row.fullName}</td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{row.salesCount}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-200">{row.revenue.toLocaleString("tr-TR")} TL</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">{row.cost.toLocaleString("tr-TR")} TL</td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${row.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{row.profit.toLocaleString("tr-TR")} TL</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{COMMISSION_BASIS_LABELS[row.commissionBasis]}{row.commissionBasis !== "NONE" ? ` (%${row.commissionPct})` : ""}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-200">{row.commissionAmount.toLocaleString("tr-TR")} TL</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-200">{row.baseSalary.toLocaleString("tr-TR")} TL</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-700 dark:text-blue-400">{row.totalPayout.toLocaleString("tr-TR")} TL</td>
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

      {/* Add/Edit Branch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="panel w-full max-w-[460px] p-6 space-y-4 animate-scale-in">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingBranch ? "Şubeyi Düzenle" : "Yeni Şube Ekle"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Şube bilgilerini detaylıca giriniz</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddOrEditBranch} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Şube Adı *</label>
                <input 
                  type="text" 
                  className="field" 
                  value={branchName} 
                  onChange={(e) => setBranchName(e.target.value)} 
                  placeholder="Örn: Kadıköy Şubesi"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Telefon Numarası</label>
                <input 
                  type="text" 
                  className="field" 
                  value={branchPhone} 
                  onChange={(e) => setBranchPhone(e.target.value)} 
                  placeholder="Örn: 0216 123 45 67"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Adres</label>
                <textarea 
                  className="field" 
                  rows={3} 
                  value={branchAddress} 
                  onChange={(e) => setBranchAddress(e.target.value)} 
                  placeholder="Şubenin tam adresi..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  className="flex-1 field py-2.5 font-bold bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  onClick={() => setShowAddModal(false)}
                >
                  İptal
                </button>
                <button type="submit" className="flex-1 primary-btn py-2.5">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="panel w-full max-w-[480px] p-6 space-y-4 animate-scale-in">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingUser ? "Personeli Düzenle" : "Yeni Personel Ekle"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Personel hesap bilgilerini ve yetkilerini belirleyin</p>
              </div>
              <button 
                onClick={() => setShowUserModal(false)}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddOrEditUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Ad Soyad *</label>
                <input
                  type="text"
                  className="field"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="örn. Mehmet Demir"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">E-posta (Giriş Adı) *</label>
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {editingUser ? "Şifre (Değiştirmek istemiyorsanız boş bırakın)" : "Giriş Şifresi *"}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Yetki Rolü</label>
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

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Çalıştığı Şube</label>
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
              </div>

              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-4">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Maaş Tipi</label>
                <p className="text-[11px] text-slate-400 -mt-1">Sabit maaş + isteğe bağlı satış kârından veya cirodan pay. Hakediş, Şubeler &gt; Hakediş Raporu sekmesinden hesaplanır.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
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
                      <option value="PROFIT">Satış Kârından Pay</option>
                      <option value="REVENUE">Cirodan Pay</option>
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

              <div className="flex items-center gap-2 pt-1.5">
                <input
                  type="checkbox"
                  id="userIsActiveCheckbox"
                  checked={userIsActive}
                  onChange={(e) => setUserIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="userIsActiveCheckbox" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
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
        </div>
      )}
      {confirmDialog}
    </section>
  );
}
