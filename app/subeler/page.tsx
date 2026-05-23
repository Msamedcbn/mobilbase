"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

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
  createdAt: string;
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
    if (!confirm("Bu şubeyi silmek istediğinizden emin misiniz?")) return;
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
      setEditingUser(null);
      setShowUserModal(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız");
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm("Bu personeli silmek istediğinizden emin misiniz?")) return;
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

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 className="page-title" style={{ margin: 0 }}>Çoklu Şube Yönetimi</h2>
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
          + Yeni Şube Ekle
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: "2rem" }}>
        {/* Branch List */}
        <div className="panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontWeight: 700 }}>Şubelerimiz</h3>
          {branches.length === 0 ? (
            <div className="empty-box">Kayıtlı şube bulunmuyor.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {branches.map((b) => (
                <div key={b.id} className="panel" style={{ padding: 12, background: "rgba(255, 255, 255, 0.03)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontWeight: 700, margin: "0 0 4px" }}>{b.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 2px" }}>📞 {b.phone || "Telefon yok"}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>📍 {b.address || "Adres girilmemiş"}</p>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button 
                      className="field" 
                      style={{ padding: "4px 8px", fontSize: 12, cursor: "pointer" }}
                      onClick={() => {
                        setEditingBranch(b);
                        setBranchName(b.name);
                        setBranchAddress(b.address || "");
                        setBranchPhone(b.phone || "");
                        setShowAddModal(true);
                      }}
                    >
                      Düzenle
                    </button>
                    <button 
                      className="field" 
                      style={{ padding: "4px 8px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.2)", cursor: "pointer" }}
                      onClick={() => handleDeleteBranch(b.id)}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consolidated reports */}
        <div className="panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontWeight: 700 }}>Konsolide Performans</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Şube bazlı toplam ciro dağılımı (Aktif Sipariş Toplamları)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {performance.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 12 }}>
                Performans verisi yükleniyor veya şube cirosu bulunmuyor.
              </div>
            ) : (
              performance.map((p, idx) => {
                const gradient = idx % 2 === 0 
                  ? "linear-gradient(90deg, #3b82f6, #60a5fa)" 
                  : "linear-gradient(90deg, #ec4899, #f472b6)";
                return (
                  <div key={p.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span>{Number(p.revenue).toLocaleString("tr-TR")} TL ({p.percentage}%)</span>
                    </div>
                    <div style={{ height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 5, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${p.percentage}%`, background: gradient, borderRadius: 5, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div style={{ marginTop: 24, padding: 12, background: "rgba(59, 130, 246, 0.05)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <p style={{ fontSize: 12, margin: 0, color: "var(--text-muted)", lineHeight: 1.4 }}>
              Toplam Ciro: <strong>{Number(totalRevenue).toLocaleString("tr-TR")} TL</strong>. Düşük stok seviyeli ürünleri cirosu yüksek olan şubeler arasında transfer ederek stok devir hızını optimize edebilirsiniz.
            </p>
          </div>
        </div>
      </div>

      {/* Personel Yönetimi Panel */}
      {isUserAdmin && (
        <div className="panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 0, fontWeight: 700 }}>Personel Yönetimi</h3>
            <button
              onClick={() => {
                setEditingUser(null);
                setUserFullName("");
                setUserEmail("");
                setUserPassword("");
                setUserRole("CASHIER");
                setUserBranchId(branches.length > 0 ? branches[0].id : "");
                setUserIsActive(true);
                setShowUserModal(true);
              }}
              className="primary-btn"
              style={{ padding: "6px 12px", fontSize: 13 }}
            >
              + Yeni Personel Ekle
            </button>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Şubelerinizde çalışan personelleri, sistem yetkilerini, giriş bilgilerini ve cari borç durumlarını buradan yönetebilirsiniz.
          </p>

          <div style={{ overflowX: "auto" }}>
            {users.length === 0 ? (
              <div className="empty-box">Kayıtlı personel bulunmuyor.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Personel Adı</th>
                    <th>E-posta</th>
                    <th>Rol / Yetki</th>
                    <th>Bağlı Şube</th>
                    <th>Cari Durumu</th>
                    <th>Durum</th>
                    <th style={{ textAlign: "right" }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const branch = branches.find((b) => b.id === u.branchId);
                    const cari = getUserBalance(u.email);

                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                        <td>{u.email}</td>
                        <td>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              background:
                                u.role === "ADMIN"
                                  ? "rgba(59, 130, 246, 0.15)"
                                  : u.role === "MANAGER"
                                  ? "rgba(16, 185, 129, 0.15)"
                                  : u.role === "ACCOUNTANT"
                                  ? "rgba(99, 102, 241, 0.15)"
                                  : u.role === "TECHNICIAN"
                                  ? "rgba(168, 85, 247, 0.15)"
                                  : "rgba(234, 179, 8, 0.15)",
                              color:
                                u.role === "ADMIN"
                                  ? "#60a5fa"
                                  : u.role === "MANAGER"
                                  ? "#34d399"
                                  : u.role === "ACCOUNTANT"
                                  ? "#818cf8"
                                  : u.role === "TECHNICIAN"
                                  ? "#c084fc"
                                  : "#facc15",
                            }}
                          >
                            {u.role === "ADMIN"
                              ? "Yönetici"
                              : u.role === "MANAGER"
                              ? "Müdür"
                              : u.role === "ACCOUNTANT"
                              ? "Muhasebeci"
                              : u.role === "TECHNICIAN"
                              ? "Teknisyen"
                              : "Kasiyer"}
                          </span>
                        </td>
                        <td>{branch ? branch.name : <em style={{ color: "var(--text-muted)" }}>Şube Atanmamış</em>}</td>
                        <td>
                          {cari ? (
                            <span
                              style={{
                                fontWeight: 700,
                                color: cari.balance > 0 ? "#f87171" : cari.balance < 0 ? "#34d399" : "var(--text-muted)",
                              }}
                            >
                              {Number(cari.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCreateUserCari(u)}
                              style={{
                                padding: "2px 6px",
                                fontSize: 11,
                                background: "rgba(59,130,246,0.1)",
                                border: "1px solid rgba(59,130,246,0.2)",
                                color: "#60a5fa",
                                borderRadius: 4,
                                cursor: "pointer",
                              }}
                              title="Personel için otomatik cari hesap kartı açar"
                            >
                              + Cari Hesap Aç
                            </button>
                          )}
                        </td>
                        <td>
                          <span style={{ color: u.isActive ? "#34d399" : "#f87171", fontWeight: 600 }}>
                            {u.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setUserFullName(u.fullName);
                                setUserEmail(u.email);
                                setUserPassword("");
                                setUserRole(u.role);
                                setUserBranchId(u.branchId || "");
                                setUserIsActive(u.isActive);
                                setShowUserModal(true);
                              }}
                              className="field"
                              style={{ padding: "3px 6px", fontSize: 11, cursor: "pointer" }}
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="field"
                              style={{
                                padding: "3px 6px",
                                fontSize: 11,
                                color: "#ef4444",
                                borderColor: "rgba(239,68,68,0.2)",
                                cursor: "pointer",
                              }}
                            >
                              Sil
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
      )}

      {/* Stock transfer Panel */}
      <div className="panel" style={{ padding: "1.5rem" }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontWeight: 700 }}>Şubeler Arası Stok Transferi</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <form onSubmit={handleTransfer} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Ürün Seçin</label>
              <select 
                className="field" 
                value={selectedProductId} 
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setSourceBranchId("");
                  setTargetBranchId("");
                }}
              >
                <option value="">Seçiniz...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.barcode})</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Kaynak Şube</label>
                <select 
                  className="field" 
                  value={sourceBranchId} 
                  onChange={(e) => setSourceBranchId(e.target.value)}
                  disabled={!selectedProductId}
                >
                  <option value="">Seçiniz...</option>
                  {selectedProduct?.branchStocks?.map((s) => (
                    <option key={s.branchId} value={s.branchId}>
                      {s.branch?.name || `Şube: ${s.branchId}`} (Stok: {s.stock})
                    </option>
                  )) || branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Hedef Şube</label>
                <select 
                  className="field" 
                  value={targetBranchId} 
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  disabled={!selectedProductId}
                >
                  <option value="">Seçiniz...</option>
                  {branches
                    .filter((b) => b.id !== sourceBranchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Transfer Miktarı</label>
              <input 
                type="number" 
                min={1} 
                className="field" 
                value={transferQty} 
                onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value, 10)))}
                disabled={!selectedProductId}
              />
            </div>

            <button 
              type="submit" 
              className="primary-btn" 
              style={{ marginTop: 6 }} 
              disabled={loading || !selectedProductId}
            >
              Transferi Gerçekleştir
            </button>
          </form>

          {/* Selected Product Branch stock levels breakdown */}
          <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 20 }}>
            <h4 style={{ margin: "0 0 10px" }}>Şube Stok Kırılımı</h4>
            {!selectedProduct ? (
              <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 12, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 6 }}>
                Şube dağılımını görmek için bir ürün seçin
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ padding: 10, background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", borderRadius: 6 }}>
                  <p style={{ fontWeight: 600, margin: "0 0 4px", fontSize: 14 }}>{selectedProduct.name}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Barkod: {selectedProduct.barcode}</p>
                </div>
                <table className="data-table">
                  <thead>
                    <tr><th>Şube</th><th>Mevcut Stok</th></tr>
                  </thead>
                  <tbody>
                    {selectedProduct.branchStocks && selectedProduct.branchStocks.length > 0 ? (
                      selectedProduct.branchStocks.map((s) => (
                        <tr key={s.id}>
                          <td>{s.branch?.name || `Şube: ${s.branchId}`}</td>
                          <td style={{ fontWeight: 700 }}>{s.stock} adet</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={2} style={{ textAlign: "center", color: "var(--text-muted)" }}>Bu ürün için henüz şube bazlı stok bilgisi girilmemiştir.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Şubeler Arası Transfer Geçmişi */}
      <div className="panel" style={{ padding: "1.5rem", marginTop: 20 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontWeight: 700 }}>Şubeler Arası Transfer Geçmişi</h3>
        <div className="panel-scroll" style={{ maxHeight: 300, overflowY: "auto" }}>
          {transferHistory.length === 0 ? (
            <div className="empty-box">Kayıtlı transfer geçmişi bulunmuyor.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Ürün</th>
                  <th>Kaynak Şube</th>
                  <th>Hedef Şube</th>
                  <th>Miktar</th>
                </tr>
              </thead>
              <tbody>
                {transferHistory.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontSize: 13 }}>{new Date(h.createdAt).toLocaleString("tr-TR")}</td>
                    <td style={{ fontWeight: 600 }}>{h.productName || "Bilinmeyen Ürün"}</td>
                    <td style={{ color: "#f43f5e" }}>{h.sourceBranchName || "Bilinmeyen Şube"}</td>
                    <td style={{ color: "#10b981" }}>{h.targetBranchName || "Bilinmeyen Şube"}</td>
                    <td style={{ fontWeight: 700 }}>{h.quantity} adet</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 100, padding: 16 }}>
          <div className="panel" style={{ width: "min(460px, 95vw)", padding: "1.5rem" }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>{editingBranch ? "Şubeyi Düzenle" : "Yeni Şube Ekle"}</h3>
            <form onSubmit={handleAddOrEditBranch} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Şube Adı</label>
                <input 
                  type="text" 
                  className="field" 
                  value={branchName} 
                  onChange={(e) => setBranchName(e.target.value)} 
                  placeholder="Örn: Kadıköy Şubesi"
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Telefon Numarası</label>
                <input 
                  type="text" 
                  className="field" 
                  value={branchPhone} 
                  onChange={(e) => setBranchPhone(e.target.value)} 
                  placeholder="Örn: 0216 123 45 67"
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Adres</label>
                <textarea 
                  className="field" 
                  rows={3} 
                  value={branchAddress} 
                  onChange={(e) => setBranchAddress(e.target.value)} 
                  placeholder="Şubenin tam adresi..."
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="submit" className="primary-btn" style={{ flex: 1 }}>Kaydet</button>
                <button 
                  type="button" 
                  className="primary-btn" 
                  style={{ flex: 1, backgroundColor: "#64748b" }}
                  onClick={() => setShowAddModal(false)}
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showUserModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 110,
            padding: 16,
          }}
        >
          <div className="panel" style={{ width: "min(480px, 95vw)", padding: "1.5rem" }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>
              {editingUser ? "Personeli Düzenle" : "Yeni Personel Ekle"}
            </h3>
            <form onSubmit={handleAddOrEditUser} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Ad Soyad *</label>
                <input
                  type="text"
                  className="field"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="örn. Mehmet Demir"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>E-posta (Giriş Adı) *</label>
                <input
                  type="email"
                  className="field"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="örn. mehmet@telefoncupro.com"
                  disabled={!!editingUser}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Yetki Rolü</label>
                  <select
                    className="field"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as any)}
                  >
                    <option value="CASHIER">Kasiyer</option>
                    <option value="TECHNICIAN">Teknisyen</option>
                    <option value="MANAGER">Müdür</option>
                    <option value="ACCOUNTANT">Muhasebeci</option>
                    <option value="PLATFORM_OWNER">Platform Owner</option>
                    <option value="ADMIN">Yönetici</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Çalıştığı Şube</label>
                  <select
                    className="field"
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

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="userIsActiveCheckbox"
                  checked={userIsActive}
                  onChange={(e) => setUserIsActive(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="userIsActiveCheckbox" style={{ fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Kullanıcı Aktif mi? (Sisteme giriş yapabilir)
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="submit" className="primary-btn" style={{ flex: 1 }}>
                  Kaydet
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ flex: 1, backgroundColor: "#64748b" }}
                  onClick={() => setShowUserModal(false)}
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
