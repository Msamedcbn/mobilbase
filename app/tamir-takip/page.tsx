"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

type Customer = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  notes: string | null;
};

type Device = {
  id: string;
  customerId: string;
  brand: string;
  model: string;
  storage: string | null;
  imei: string | null;
  color: string | null;
  conditionNote: string | null;
  customer?: Customer;
};

type RepairRecord = {
  id: string;
  deviceId: string;
  issueDescription: string;
  diagnosisNote: string | null;
  laborCost: number | string;
  partCost: number | string;
  totalCost: number | string;
  status: "RECEIVED" | "IN_PROGRESS" | "WAITING_PART" | "READY" | "DELIVERED" | "CANCELED";
  receivedAt: string;
  completedAt: string | null;
  device: Device & { customer: Customer };
};

const CHECKLIST_KEYS = [
  { key: "screen", label: "Ekran / Dokunmatik" },
  { key: "frontCam", label: "Ön Kamera" },
  { key: "backCam", label: "Arka Kamera" },
  { key: "wifi", label: "WiFi / Bluetooth" },
  { key: "speaker", label: "Ahize / Hoparlör" },
  { key: "mic", label: "Mikrofon" },
  { key: "network", label: "Şebeke / Sinyal" },
  { key: "battery", label: "Batarya Durumu" },
  { key: "buttons", label: "Tuşlar (Güç/Ses)" },
  { key: "chargingPort", label: "Şarj Soketi" },
];

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Teslim Alındı",
  IN_PROGRESS: "Onarımda",
  WAITING_PART: "Parça Bekliyor",
  READY: "Tamamlandı (Hazır)",
  DELIVERED: "Teslim Edildi",
  CANCELED: "İptal Edildi",
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "#64748b",
  IN_PROGRESS: "#eab308",
  WAITING_PART: "#f97316",
  READY: "#10b981",
  DELIVERED: "#6366f1",
  CANCELED: "#ef4444",
};

interface PhoneVisualExpertiseProps {
  value: Record<string, "OK" | "BAD" | "NA">;
  onChange: React.Dispatch<React.SetStateAction<Record<string, "OK" | "BAD" | "NA">>>;
}

function PhoneVisualExpertise({ value, onChange }: PhoneVisualExpertiseProps) {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  const cycleState = (key: string) => {
    onChange((prev) => {
      const current = prev[key] || "NA";
      let next: "OK" | "BAD" | "NA" = "NA";
      if (current === "NA") next = "OK";
      else if (current === "OK") next = "BAD";
      else if (current === "BAD") next = "NA";
      return { ...prev, [key]: next };
    });
  };

  const getStylesForPart = (key: string) => {
    const state = value[key] || "NA";
    if (state === "OK") {
      return {
        fill: "rgba(16, 185, 129, 0.22)",
        stroke: "#10b981",
        strokeWidth: 2,
      };
    }
    if (state === "BAD") {
      return {
        fill: "rgba(239, 68, 68, 0.3)",
        stroke: "#ef4444",
        strokeWidth: 2.5,
        className: "part-interactive pulse-bad",
      };
    }
    return {
      fill: "rgba(148, 163, 184, 0.05)",
      stroke: "rgba(148, 163, 184, 0.4)",
      strokeWidth: 1.5,
      strokeDasharray: "3 3",
    };
  };

  const partEvents = (key: string) => ({
    onClick: () => cycleState(key),
    onMouseEnter: () => setHoveredPart(key),
    onMouseLeave: () => setHoveredPart(null),
    style: { cursor: "pointer", transition: "all 0.2s ease" },
  });

  return (
    <div style={{ padding: "12px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", marginBottom: "1.25rem" }}>
      <style>{`
        .pulse-bad {
          animation: visualPulse 1.8s infinite ease-in-out;
        }
        @keyframes visualPulse {
          0% { fill: rgba(239, 68, 68, 0.15); stroke: #ef4444; }
          50% { fill: rgba(239, 68, 68, 0.45); stroke: #f87171; }
          100% { fill: rgba(239, 68, 68, 0.15); stroke: #ef4444; }
        }
        .part-interactive:hover {
          filter: brightness(0.9) saturate(1.2);
        }
      `}</style>

      <div style={{ display: "flex", gap: "2.5rem", justifyContent: "center", flexWrap: "wrap", margin: "10px 0" }}>
        {/* Front View */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>ÖN YÜZ (FRONT)</div>
          <svg width="160" height="280" viewBox="0 0 160 280" style={{ overflow: "visible" }}>
            {/* Outer phone container rect (non-interactive) */}
            <rect x="10" y="10" width="140" height="260" rx="24" fill="var(--surface-soft)" stroke="var(--border)" strokeWidth="3" />
            
            {/* Screen Area (screen) */}
            <rect x="16" y="26" width="128" height="228" rx="14" className="part-interactive" {...getStylesForPart("screen")} {...partEvents("screen")} />
            
            {/* Front Cam (frontCam) */}
            <circle cx="80" cy="38" r="6" className="part-interactive" {...getStylesForPart("frontCam")} {...partEvents("frontCam")} />
            
            {/* Speaker Grill (speaker) */}
            <rect x="65" y="14" width="30" height="4" rx="2" className="part-interactive" {...getStylesForPart("speaker")} {...partEvents("speaker")} />
            
            {/* Microphone (mic) */}
            <circle cx="45" cy="265" r="4" className="part-interactive" {...getStylesForPart("mic")} {...partEvents("mic")} />
            
            {/* Charging Port (chargingPort) */}
            <rect x="68" y="263" width="24" height="7" rx="3.5" className="part-interactive" {...getStylesForPart("chargingPort")} {...partEvents("chargingPort")} />
            
            {/* Buttons - Volume (Left) */}
            <rect x="4" y="65" width="6" height="20" rx="2" className="part-interactive" {...getStylesForPart("buttons")} {...partEvents("buttons")} />
            <rect x="4" y="90" width="6" height="20" rx="2" className="part-interactive" {...getStylesForPart("buttons")} {...partEvents("buttons")} />
            
            {/* Buttons - Power (Right) */}
            <rect x="150" y="75" width="6" height="30" rx="2" className="part-interactive" {...getStylesForPart("buttons")} {...partEvents("buttons")} />
          </svg>
        </div>

        {/* Back View */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>ARKA YÜZ (BACK)</div>
          <svg width="160" height="280" viewBox="0 0 160 280" style={{ overflow: "visible" }}>
            {/* Outer phone container rect (non-interactive) */}
            <rect x="10" y="10" width="140" height="260" rx="24" fill="var(--surface-soft)" stroke="var(--border)" strokeWidth="3" />
            
            {/* Back Camera Module (non-interactive outline) */}
            <rect x="20" y="22" width="40" height="40" rx="10" fill="rgba(148, 163, 184, 0.05)" stroke="var(--border)" strokeWidth="1.5" />
            
            {/* Back Camera Lens (backCam) */}
            <circle cx="40" cy="42" r="10" className="part-interactive" {...getStylesForPart("backCam")} {...partEvents("backCam")} />
            <circle cx="40" cy="42" r="4" fill="var(--muted)" opacity="0.6" pointerEvents="none" />
            
            {/* WiFi / Bluetooth Region (wifi) */}
            <rect x="90" y="22" width="42" height="40" rx="10" className="part-interactive" {...getStylesForPart("wifi")} {...partEvents("wifi")} />
            {/* Custom Wireless Icon */}
            <path d="M103 48 A 10 10 0 0 1 119 48 M106 44 A 6 6 0 0 1 116 44 M111 40 A 1 1 0 0 1 111 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" pointerEvents="none" style={{ color: value.wifi === "NA" ? "var(--muted)" : (value.wifi === "OK" ? "#10b981" : "#ef4444") }} />
            
            {/* Battery Outline & Cap (battery) */}
            <rect x="70" y="84" width="20" height="6" rx="2" className="part-interactive" {...getStylesForPart("battery")} {...partEvents("battery")} />
            <rect x="35" y="90" width="90" height="110" rx="8" className="part-interactive" {...getStylesForPart("battery")} {...partEvents("battery")} />
            {/* Lightning bolt inside battery */}
            <path d="M 82 132 L 74 148 L 80 148 L 78 162 L 88 144 L 82 144 Z" fill="currentColor" opacity="0.85" pointerEvents="none" style={{ color: value.battery === "NA" ? "var(--muted)" : (value.battery === "OK" ? "#10b981" : "#ef4444") }} />
            
            {/* Network Antenna Bands (network) */}
            <rect x="10" y="72" width="140" height="6" className="part-interactive" {...getStylesForPart("network")} {...partEvents("network")} />
            <rect x="10" y="210" width="140" height="6" className="part-interactive" {...getStylesForPart("network")} {...partEvents("network")} />
            
            {/* Buttons - Volume (Right on Back) */}
            <rect x="150" y="65" width="6" height="20" rx="2" className="part-interactive" {...getStylesForPart("buttons")} {...partEvents("buttons")} />
            <rect x="150" y="90" width="6" height="20" rx="2" className="part-interactive" {...getStylesForPart("buttons")} {...partEvents("buttons")} />
            
            {/* Buttons - Power (Left on Back) */}
            <rect x="4" y="75" width="6" height="30" rx="2" className="part-interactive" {...getStylesForPart("buttons")} {...partEvents("buttons")} />
            
            {/* Charging Port (chargingPort) */}
            <rect x="68" y="263" width="24" height="7" rx="3.5" className="part-interactive" {...getStylesForPart("chargingPort")} {...partEvents("chargingPort")} />
          </svg>
        </div>
      </div>

      {/* Interactive Info Panel */}
      <div style={{
        marginTop: 12,
        padding: "8px 12px",
        borderRadius: 10,
        background: "var(--surface-soft)",
        border: "1px solid var(--border)",
        textAlign: "center",
        minHeight: 38,
        fontSize: "0.85rem",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: hoveredPart ? "var(--accent)" : "var(--muted)",
        transition: "all 0.15s ease",
      }}>
        {hoveredPart ? (
          <span>
            🔍 <strong>{CHECKLIST_KEYS.find(k => k.key === hoveredPart)?.label}</strong>:{" "}
            <span style={{
              color: value[hoveredPart] === "OK" ? "#10b981" : value[hoveredPart] === "BAD" ? "#ef4444" : "inherit"
            }}>
              {value[hoveredPart] === "OK" ? "ÇALIŞIYOR" : value[hoveredPart] === "BAD" ? "SORUNLU / HASARLI" : "SEÇİLMEDİ (Değiştirmek İçin Tıklayın)"}
            </span>
          </span>
        ) : (
          <span>📱 Durumu değiştirmek için görseldeki parçalara tıklayın (NA ➜ OK ➜ BAD)</span>
        )}
      </div>

      {/* Color legend */}
      <div style={{ display: "flex", gap: "1.25rem", justifyContent: "center", marginTop: 10, fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(16, 185, 129, 0.25)", border: "1.5px solid #10b981" }}></span>
          Çalışıyor
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(239, 68, 68, 0.3)", border: "1.5px solid #ef4444" }}></span>
          Sorunlu / Hasarlı
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(148, 163, 184, 0.05)", border: "1.5px dashed rgba(148, 163, 184, 0.6)" }}></span>
          Seçilmedi
        </div>
      </div>
    </div>
  );
}

export default function RepairPage() {
  const [repairs, setRepairs] = useState<RepairRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [availableModels, setAvailableModels] = useState<Array<{ brand: string; model: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal control states
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<RepairRecord | null>(null);

  // New repair wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [customerMode, setCustomerMode] = useState<"SELECT" | "CREATE">("SELECT");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustNotes, setNewCustNotes] = useState("");

  const [deviceMode, setDeviceMode] = useState<"SELECT" | "CREATE">("SELECT");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [newDevBrand, setNewDevBrand] = useState("");
  const [newDevModel, setNewDevModel] = useState("");
  const [newDevStorage, setNewDevStorage] = useState("128GB");
  const [newDevImei, setNewDevImei] = useState("");
  const [newDevColor, setNewDevColor] = useState("");
  const [newDevCondNote, setNewDevCondNote] = useState("");

  const [checklist, setChecklist] = useState<Record<string, "OK" | "BAD" | "NA">>({
    screen: "NA",
    frontCam: "NA",
    backCam: "NA",
    wifi: "NA",
    speaker: "NA",
    mic: "NA",
    network: "NA",
    battery: "NA",
    buttons: "NA",
    chargingPort: "NA",
  });
  const [issueDescription, setIssueDescription] = useState("");
  const [laborCost, setLaborCost] = useState("0");
  const [partCost, setPartCost] = useState("0");
  const [initialStatus, setInitialStatus] = useState<"RECEIVED" | "IN_PROGRESS" | "WAITING_PART" | "READY" | "DELIVERED" | "CANCELED">("RECEIVED");

  // AI Recommendation State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ laborCost: number; partCost: number; predictedTime: string; possibleParts: string[]; reasoning: string } | null>(null);

  async function handleAiRecommendation() {
    if (!issueDescription) {
      toast.warning("Lütfen önce arıza açıklamasını yazın.");
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      let brand = "";
      let model = "";
      if (deviceMode === "CREATE") {
        brand = newDevBrand;
        model = newDevModel;
      } else if (selectedDeviceId) {
        const selectedDev = devices.find(d => d.id === selectedDeviceId);
        if (selectedDev) {
          brand = selectedDev.brand;
          model = selectedDev.model;
        }
      }

      const res = await fetch("/api/repairs/ai-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueDescription, brand, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Yapay zeka önerisi alınamadı.");

      setLaborCost(String(data.laborCost));
      setPartCost(String(data.partCost));
      setAiResult(data);
      toast.success("Yapay zeka fiyatlandırma ve teşhis önerisi uygulandı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Öneri alınamadı.");
    } finally {
      setAiLoading(false);
    }
  }

  // Detail Modal Update Form State
  const [editStatus, setEditStatus] = useState<"RECEIVED" | "IN_PROGRESS" | "WAITING_PART" | "READY" | "DELIVERED" | "CANCELED">("RECEIVED");
  const [editLabor, setEditLabor] = useState("0");
  const [editPart, setEditPart] = useState("0");
  const [editIssue, setEditIssue] = useState("");
  const [editChecklist, setEditChecklist] = useState<Record<string, "OK" | "BAD" | "NA">>({});
  const [editCustomNote, setEditCustomNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [repRes, custRes, devRes, modelRes, settingsRes] = await Promise.all([
        fetch("/api/repairs"),
        fetch("/api/customers"),
        fetch("/api/devices"),
        fetch("/api/device-models").catch(() => null),
        fetch("/api/settings").catch(() => null),
      ]);
      const [repData, custData, devData, modelData, settingsData] = await Promise.all([
        repRes.json(),
        custRes.json(),
        devRes.json(),
        modelRes ? modelRes.json() : [],
        settingsRes ? settingsRes.json() : null,
      ]);

      setRepairs(Array.isArray(repData) ? repData : []);
      setCustomers(custData.data ?? (Array.isArray(custData) ? custData : []));
      setDevices(devData.data ?? (Array.isArray(devData) ? devData : []));
      setAvailableModels(Array.isArray(modelData) ? modelData : []);
      setSettings(settingsData?.data || settingsData || null);
    } catch {
      toast.error("Teknik servis verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  // Filtered repairs
  const filteredRepairs = useMemo(() => {
    return repairs.filter((r) => {
      const query = search.toLowerCase().trim();
      const matchSearch =
        !query ||
        r.device.customer.fullName.toLowerCase().includes(query) ||
        r.device.customer.phone.includes(query) ||
        r.device.brand.toLowerCase().includes(query) ||
        r.device.model.toLowerCase().includes(query) ||
        (r.device.imei && r.device.imei.includes(query)) ||
        r.issueDescription.toLowerCase().includes(query);

      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [repairs, search, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    let active = 0;
    let ready = 0;
    let deliveredToday = 0;
    const today = new Date().toDateString();

    repairs.forEach((r) => {
      if (["RECEIVED", "IN_PROGRESS", "WAITING_PART"].includes(r.status)) {
        active++;
      } else if (r.status === "READY") {
        ready++;
      } else if (r.status === "DELIVERED") {
        const completedDate = r.completedAt ? new Date(r.completedAt).toDateString() : "";
        if (completedDate === today) {
          deliveredToday++;
        }
      }
    });

    return { active, ready, deliveredToday };
  }, [repairs]);

  // Devices of selected customer
  const selectedCustomerDevices = useMemo(() => {
    if (!selectedCustomerId) return [];
    return devices.filter((d) => d.customerId === selectedCustomerId);
  }, [devices, selectedCustomerId]);

  function parseDiagnosis(note: string | null) {
    if (!note) return { checklist: {} as Record<string, "OK" | "BAD" | "NA">, note: "" };
    try {
      if (note.startsWith("{")) {
        const parsed = JSON.parse(note);
        return {
          checklist: (parsed.checklist || {}) as Record<string, "OK" | "BAD" | "NA">,
          note: parsed.note || "",
        };
      }
    } catch {
      // fallback
    }
    return { checklist: {} as Record<string, "OK" | "BAD" | "NA">, note: note };
  }

  // Handle opening detail modal
  function openDetail(repair: RepairRecord) {
    setSelectedRepair(repair);
    setEditStatus(repair.status);
    setEditLabor(String(repair.laborCost));
    setEditPart(String(repair.partCost));
    setEditIssue(repair.issueDescription);
    const parsed = parseDiagnosis(repair.diagnosisNote);
    setEditChecklist(parsed.checklist);
    setEditCustomNote(parsed.note);
    setIsDetailModalOpen(true);
  }

  // Create Flow
  async function handleCreateRepair() {
    setLoading(true);
    try {
      let finalCustId = selectedCustomerId;
      let finalDevId = selectedDeviceId;

      // 1. Create customer if new
      if (customerMode === "CREATE") {
        if (!newCustName || !newCustPhone) {
          toast.warning("Müşteri adı ve telefonu zorunludur.");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: newCustName,
            phone: newCustPhone,
            email: newCustEmail,
            notes: newCustNotes,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Müşteri oluşturulamadı.");
        finalCustId = json.id || json.data?.id;
      }

      if (!finalCustId) {
        toast.warning("Lütfen bir müşteri seçin veya oluşturun.");
        setLoading(false);
        return;
      }

      // 2. Create device if new
      if (deviceMode === "CREATE") {
        if (!newDevBrand || !newDevModel) {
          toast.warning("Cihaz Marka ve Model alanları zorunludur.");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: finalCustId,
            brand: newDevBrand,
            model: newDevModel,
            storage: newDevStorage,
            imei: newDevImei || null,
            color: newDevColor || null,
            conditionNote: newDevCondNote || null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Cihaz oluşturulamadı.");
        finalDevId = json.id || json.data?.id;
      }

      if (!finalDevId) {
        toast.warning("Lütfen bir cihaz seçin veya oluşturun.");
        setLoading(false);
        return;
      }

      if (!issueDescription) {
        toast.warning("Arıza açıklaması boş bırakılamaz.");
        setLoading(false);
        return;
      }

      // 3. Create Repair Record
      const total = Number(laborCost) + Number(partCost);
      const diagnosisString = JSON.stringify({ checklist, note: newDevCondNote });

      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: finalDevId,
          issueDescription,
          diagnosisNote: diagnosisString,
          laborCost: Number(laborCost),
          partCost: Number(partCost),
          totalCost: total,
          status: initialStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Servis kaydı oluşturulamadı.");

      toast.success("Teknik servis kaydı başarıyla oluşturuldu.");
      setIsNewModalOpen(false);
      resetWizard();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  }

  function resetWizard() {
    setWizardStep(1);
    setCustomerMode("SELECT");
    setSelectedCustomerId("");
    setNewCustName("");
    setNewCustPhone("");
    setNewCustEmail("");
    setNewCustNotes("");

    setDeviceMode("SELECT");
    setSelectedDeviceId("");
    setNewDevBrand("");
    setNewDevModel("");
    setNewDevStorage("128GB");
    setNewDevImei("");
    setNewDevColor("");
    setNewDevCondNote("");

    setChecklist({
      screen: "NA",
      frontCam: "NA",
      backCam: "NA",
      wifi: "NA",
      speaker: "NA",
      mic: "NA",
      network: "NA",
      battery: "NA",
      buttons: "NA",
      chargingPort: "NA",
    });
    setIssueDescription("");
    setLaborCost("0");
    setPartCost("0");
    setInitialStatus("RECEIVED");
    setAiResult(null);
    setAiLoading(false);
  }

  // Update flow
  async function handleUpdateRepair() {
    if (!selectedRepair) return;
    setSavingEdit(true);

    try {
      const total = Number(editLabor) + Number(editPart);
      const diagnosisString = JSON.stringify({ checklist: editChecklist, note: editCustomNote });

      const res = await fetch(`/api/repairs/${selectedRepair.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          laborCost: Number(editLabor),
          partCost: Number(editPart),
          totalCost: total,
          issueDescription: editIssue,
          diagnosisNote: diagnosisString,
          completedAt: editStatus === "DELIVERED" ? new Date().toISOString() : selectedRepair.completedAt,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Güncelleme başarısız.");

      toast.success("Servis kaydı güncellendi.");
      setIsDetailModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem başarısız.");
    } finally {
      setSavingEdit(false);
    }
  }

  // Trigger WhatsApp
  function sendWhatsAppNotification(repair: RepairRecord) {
    if (!settings || !settings.whatsappEnabled || !settings.whatsappNumber) {
      toast.error("WhatsApp bildirim entegrasyonu kurulmamış veya aktif edilmemiş. Lütfen Ayarlar sayfasından kurulumu tamamlayın.");
      return;
    }

    const cust = repair.device.customer;
    let phoneNum = cust.phone.replace(/\D/g, "");
    if (phoneNum.length === 10 && phoneNum.startsWith("5")) {
      phoneNum = "90" + phoneNum;
    }

    const defaultTpl = "Merhaba {ad_soyad}, {cihaz_marka} {cihaz_model} cihazınızın teknik servis durumu güncellendi. Durum: {durum}. Toplam Tutar: {tutar} TL. Bilgi almak için bizi arayabilirsiniz. İyi günler dileriz. - TelefoncuPro";
    let message = settings.repairTemplate || defaultTpl;

    message = message
      .replace(/{ad_soyad}/g, cust.fullName)
      .replace(/{cihaz_marka}/g, repair.device.brand)
      .replace(/{cihaz_model}/g, repair.device.model)
      .replace(/{durum}/g, STATUS_LABELS[repair.status])
      .replace(/{tutar}/g, Number(repair.totalCost).toLocaleString("tr-TR"))
      .replace(/{servis_no}/g, repair.id.slice(0, 8).toUpperCase());

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${phoneNum}&text=${encoded}`, "_blank");
  }

  // Fiş yazdırma templates (80mm)
  function printKabulFisi(repair: RepairRecord) {
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const parsed = parseDiagnosis(repair.diagnosisNote);
    const checklistHtml = CHECKLIST_KEYS.map((ck) => {
      const state = parsed.checklist[ck.key] || "NA";
      const displayState = state === "OK" ? "ÇALIŞIYOR" : state === "BAD" ? "SORUNLU" : "KONTROL EDİLMEDİ";
      return `<tr><td style="padding: 3px 0; font-size: 12px; border-bottom: 1px dotted #ccc;">${ck.label}</td><td style="text-align: right; font-weight: bold; font-size: 12px; border-bottom: 1px dotted #ccc;">${displayState}</td></tr>`;
    }).join("");

    const dateStr = new Date(repair.receivedAt).toLocaleString("tr-TR");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Tamir Kabul Fişi #${repair.id.slice(0, 8)}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 10px 4px;
            color: #000;
            background: #fff;
            font-size: 12px;
            line-height: 1.4;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .header { margin-bottom: 12px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
          .title { font-size: 15px; font-weight: bold; margin: 0 0 4px; }
          .info-table, .checklist-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .section-title { font-weight: bold; border-bottom: 1px dashed #000; margin: 10px 0 6px; padding-bottom: 2px; text-transform: uppercase; font-size: 13px; }
          .disclaimer { font-size: 10px; text-align: justify; margin-top: 10px; border-top: 1px dashed #000; padding-top: 8px; line-height: 1.3; }
          .signatures { display: flex; justify-content: space-between; margin-top: 25px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <div class="title">TELEFONCUPRO</div>
          <div style="font-size: 12px; font-weight: bold;">TEKNİK SERVİS KABUL FİŞİ</div>
          <div style="font-size: 10px; margin-top: 4px;">Akıllı Cihaz Bakım ve Onarım Merkezi</div>
        </div>

        <table class="info-table">
          <tr><td class="bold">Tarih:</td><td class="text-right">${dateStr}</td></tr>
          <tr><td class="bold">Servis No:</td><td class="text-right">${repair.id.slice(0, 8).toUpperCase()}</td></tr>
          <tr><td class="bold">Müşteri:</td><td class="text-right">${repair.device.customer.fullName}</td></tr>
          <tr><td class="bold">Telefon:</td><td class="text-right">${repair.device.customer.phone}</td></tr>
        </table>

        <div class="section-title">Cihaz Bilgileri</div>
        <table class="info-table">
          <tr><td class="bold">Model:</td><td class="text-right">${repair.device.brand} ${repair.device.model} ${repair.device.storage || ""}</td></tr>
          <tr><td class="bold">IMEI:</td><td class="text-right">${repair.device.imei || "-"}</td></tr>
          <tr><td class="bold">Renk:</td><td class="text-right">${repair.device.color || "-"}</td></tr>
        </table>

        <div class="section-title">Arıza & Ön Kontrol Raporu</div>
        <div style="font-size: 12px; margin-bottom: 8px;"><span class="bold">Şikayet:</span> ${repair.issueDescription}</div>
        <table class="checklist-table">
          ${checklistHtml}
        </table>
        ${parsed.note ? `<div style="font-size: 11px; margin-top: 5px;"><span class="bold">Teknisyen Notu:</span> ${parsed.note}</div>` : ""}

        <div class="disclaimer">
          <strong>SERVİS KOŞULLARI:</strong><br/>
          1. Yedek alınmayan verilerden servisimiz kesinlikle sorumlu tutulamaz.<br/>
          2. Cihaz onarımı esnasında (özellikle darbe almış ve sıvı teması olan cihazlarda) oluşabilecek entegre arızalarından dükkanımız sorumlu değildir.<br/>
          3. 90 gün içerisinde teslim alınmayan cihazlardan firmamız mesuliyet kabul etmez.
        </div>

        <div class="signatures">
          <div>Müşteri İmza</div>
          <div>Teslim Alan</div>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 300);
  }

  function printTeslimFisi(repair: RepairRecord) {
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const dateStr = new Date().toLocaleString("tr-TR");
    const labor = Number(repair.laborCost);
    const part = Number(repair.partCost);
    const total = Number(repair.totalCost);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Tamir Teslim Fişi #${repair.id.slice(0, 8)}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 10px 4px;
            color: #000;
            background: #fff;
            font-size: 12px;
            line-height: 1.4;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .header { margin-bottom: 12px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
          .title { font-size: 15px; font-weight: bold; margin: 0 0 4px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .section-title { font-weight: bold; border-bottom: 1px dashed #000; margin: 10px 0 6px; padding-bottom: 2px; text-transform: uppercase; font-size: 13px; }
          .totals-box { border-top: 1px dashed #000; padding-top: 6px; margin-top: 10px; }
          .totals-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 2px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 25px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <div class="title">TELEFONCUPRO</div>
          <div style="font-size: 12px; font-weight: bold;">TEKNİK SERVİS TESLİM FİŞİ</div>
          <div style="font-size: 10px; margin-top: 4px;">Cihaz Teslim ve Ödeme Makbuzu</div>
        </div>

        <table class="info-table">
          <tr><td class="bold">Teslim Tarihi:</td><td class="text-right">${dateStr}</td></tr>
          <tr><td class="bold">Servis No:</td><td class="text-right">${repair.id.slice(0, 8).toUpperCase()}</td></tr>
          <tr><td class="bold">Müşteri:</td><td class="text-right">${repair.device.customer.fullName}</td></tr>
          <tr><td class="bold">Model:</td><td class="text-right">${repair.device.brand} ${repair.device.model}</td></tr>
          <tr><td class="bold">IMEI:</td><td class="text-right">${repair.device.imei || "-"}</td></tr>
        </table>

        <div class="section-title">Yapılan İşlemler</div>
        <div style="font-size: 12px; margin-bottom: 10px;">${repair.issueDescription} onarımı tamamlanmış ve cihaz test edilerek teslim edilmiştir.</div>

        <div class="totals-box">
          <div class="totals-row"><span>İşçilik Tutarı:</span><span>${labor.toLocaleString("tr-TR")} TL</span></div>
          <div class="totals-row"><span>Yedek Parça:</span><span>${part.toLocaleString("tr-TR")} TL</span></div>
          <div class="totals-row bold" style="font-size: 15px; margin-top: 4px; border-top: 1px dotted #000; padding-top: 4px;">
            <span>TOPLAM TUTAR:</span>
            <span>${total.toLocaleString("tr-TR")} TL</span>
          </div>
        </div>

        <div style="font-size: 10px; text-align: center; margin-top: 15px;">Onarılan parçalar 6 Ay servisimiz garantisi altındadır.</div>

        <div class="signatures">
          <div>Müşteri İmza</div>
          <div>Teslim Eden</div>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 300);
  }

  return (
    <section style={{ position: "relative" }}>
      {/* Page Header Cards */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 className="page-title" style={{ margin: 0 }}>Teknik Servis Yönetimi</h2>
        <button onClick={() => { resetWizard(); setIsNewModalOpen(true); }} className="primary-btn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Servis Kaydı
        </button>
      </div>

      {/* Premium Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="panel" style={{ padding: "1.25rem", background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)", color: "white" }}>
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.85, fontWeight: 600, textTransform: "uppercase" }}>Aktif Cihazlar</p>
          <h3 style={{ margin: "8px 0 0", fontSize: "2.2rem", fontWeight: 800 }}>{stats.active}</h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.75rem", opacity: 0.75 }}>Tamir ve parça bekleyenler</p>
        </div>

        <div className="panel" style={{ padding: "1.25rem", background: "white" }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Hazır / Teslim Edilecek</p>
          <h3 style={{ margin: "8px 0 0", fontSize: "2.2rem", fontWeight: 800, color: "#10b981" }}>{stats.ready}</h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>Onarımı biten cihazlar</p>
        </div>

        <div className="panel" style={{ padding: "1.25rem", background: "white" }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Bugün Teslim Edilen</p>
          <h3 style={{ margin: "8px 0 0", fontSize: "2.2rem", fontWeight: 800, color: "#6366f1" }}>{stats.deliveredToday}</h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>Dükkandan çıkan cihazlar</p>
        </div>

        <div className="panel" style={{ padding: "1.25rem", background: "white" }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Kayıtlı Cihaz Sayısı</p>
          <h3 style={{ margin: "8px 0 0", fontSize: "2.2rem", fontWeight: 800, color: "#0f172a" }}>{repairs.length}</h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>Toplam arıza girdisi</p>
        </div>
      </div>

      {/* Control panel: Search & Filters */}
      <div className="panel" style={{ padding: "1rem", marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {["ALL", "RECEIVED", "IN_PROGRESS", "WAITING_PART", "READY", "DELIVERED", "CANCELED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "0.5rem 0.85rem",
                fontSize: "0.85rem",
                cursor: "pointer",
                fontWeight: 600,
                backgroundColor: statusFilter === st ? "var(--accent)" : "white",
                color: statusFilter === st ? "white" : "var(--text)",
                transition: "all 0.15s ease",
              }}
            >
              {st === "ALL" ? "Tümü" : STATUS_LABELS[st]}
            </button>
          ))}
        </div>
        <div style={{ width: "min(350px, 100%)" }}>
          <input
            className="field"
            placeholder="Müşteri, Model, IMEI veya Arıza Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Repairs Table / Cards */}
      {loading ? (
        <div className="panel" style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Veriler yükleniyor...</div>
      ) : filteredRepairs.length === 0 ? (
        <div className="empty-box" style={{ padding: "3rem" }}>Kayıt bulunamadı.</div>
      ) : (
        <div className="panel" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kayıt No</th>
                  <th>Müşteri</th>
                  <th>Cihaz</th>
                  <th>Şikayet / Arıza</th>
                  <th>Durum</th>
                  <th>Ücret</th>
                  <th>Kayıt Tarihi</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredRepairs.map((item) => {
                  const statusLabel = STATUS_LABELS[item.status] || item.status;
                  const color = STATUS_COLORS[item.status] || "var(--muted)";
                  return (
                    <tr key={item.id} style={{ cursor: "pointer" }} onClick={() => openDetail(item)}>
                      <td style={{ fontWeight: 600, color: "#64748b" }}>#{item.id.slice(0, 8).toUpperCase()}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.device.customer.fullName}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.device.customer.phone}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.device.brand} {item.device.model}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>IMEI: {item.device.imei || "-"}</div>
                      </td>
                      <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.issueDescription}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.25rem 0.6rem",
                            borderRadius: 20,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            backgroundColor: color + "1a",
                            color: color,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--accent)" }}>
                        {Number(item.totalCost).toLocaleString("tr-TR")} TL
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        {new Date(item.receivedAt).toLocaleDateString("tr-TR")}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openDetail(item)}
                          className="primary-btn"
                          style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem", borderRadius: 8 }}
                        >
                          Yönet
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1. NEW SERVICE RECORD MODAL (WIZARD) */}
      {isNewModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 65, padding: 16 }}>
          <div className="panel" style={{ width: "min(680px,95vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0 }}>
            {/* Header */}
            <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Yeni Servis Kaydı</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                style={{ border: 0, background: "transparent", fontSize: "1.2rem", cursor: "pointer", color: "var(--muted)" }}
              >
                &times;
              </button>
            </div>

            {/* Step Indicators */}
            <div style={{ display: "flex", background: "var(--surface-soft)", borderBottom: "1px solid var(--border)" }}>
              {["Müşteri", "Cihaz", "Kontrol & Kayıt"].map((stepLabel, idx) => {
                const stepNum = idx + 1;
                const active = wizardStep === stepNum;
                const done = wizardStep > stepNum;
                return (
                  <div
                    key={stepLabel}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "0.75rem 0.5rem",
                      fontSize: "0.85rem",
                      fontWeight: active || done ? 700 : 500,
                      color: active ? "var(--accent)" : done ? "#10b981" : "var(--muted)",
                      borderBottom: active ? "3px solid var(--accent)" : done ? "3px solid #10b981" : "3px solid transparent",
                    }}
                  >
                    {done ? "✓ " : ""}{stepNum}. {stepLabel}
                  </div>
                );
              })}
            </div>

            {/* Content Scroll Area */}
            <div style={{ padding: "1.25rem", overflowY: "auto", flex: 1 }}>
              {/* STEP 1: CUSTOMER */}
              {wizardStep === 1 && (
                <div style={{ display: "grid", gap: "1rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className="primary-btn"
                      onClick={() => setCustomerMode("SELECT")}
                      style={{ flex: 1, backgroundColor: customerMode === "SELECT" ? "var(--accent)" : "#cbd5e1", color: customerMode === "SELECT" ? "white" : "var(--text)" }}
                    >
                      Mevcut Müşteri Seç
                    </button>
                    <button
                      className="primary-btn"
                      onClick={() => setCustomerMode("CREATE")}
                      style={{ flex: 1, backgroundColor: customerMode === "CREATE" ? "var(--accent)" : "#cbd5e1", color: customerMode === "CREATE" ? "white" : "var(--text)" }}
                    >
                      Yeni Müşteri Ekle
                    </button>
                  </div>

                  {customerMode === "SELECT" ? (
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Kayıtlı Müşteri</label>
                      <select
                        className="field"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                      >
                        <option value="">Seçiniz...</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>{c.fullName} ({c.phone})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Ad Soyad *</label>
                        <input className="field" placeholder="Müşteri ad soyad" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Telefon *</label>
                        <input className="field" placeholder="Örn: 5554443322" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>E-posta</label>
                        <input className="field" placeholder="E-posta adresi (opsiyonel)" value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Müşteri Notu</label>
                        <textarea className="field" style={{ minHeight: 60 }} placeholder="Müşteri hakkında özel notlar..." value={newCustNotes} onChange={(e) => setNewCustNotes(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: DEVICE */}
              {wizardStep === 2 && (
                <div style={{ display: "grid", gap: "1rem" }}>
                  {/* Select or Create Device selector */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className="primary-btn"
                      onClick={() => setDeviceMode("SELECT")}
                      style={{ flex: 1, backgroundColor: deviceMode === "SELECT" ? "var(--accent)" : "#cbd5e1", color: deviceMode === "SELECT" ? "white" : "var(--text)" }}
                      disabled={customerMode === "CREATE"} // New customers don't have devices in database yet
                    >
                      Kayıtlı Cihaz Seç ({selectedCustomerDevices.length} adet)
                    </button>
                    <button
                      className="primary-btn"
                      onClick={() => setDeviceMode("CREATE")}
                      style={{ flex: 1, backgroundColor: deviceMode === "CREATE" ? "var(--accent)" : "#cbd5e1", color: deviceMode === "CREATE" ? "white" : "var(--text)" }}
                    >
                      Yeni Cihaz Tanımla
                    </button>
                  </div>

                  {deviceMode === "SELECT" && customerMode === "SELECT" ? (
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>Cihaz Seçimi</label>
                      {selectedCustomerDevices.length === 0 ? (
                        <div className="empty-box" style={{ margin: 0, padding: "1rem" }}>
                          Bu müşteriye ait kayıtlı cihaz bulunamadı. Lütfen &quot;Yeni Cihaz Tanımla&quot; butonuna basarak cihaz ekleyin.
                        </div>
                      ) : (
                        <select
                          className="field"
                          value={selectedDeviceId}
                          onChange={(e) => setSelectedDeviceId(e.target.value)}
                        >
                          <option value="">Seçiniz...</option>
                          {selectedCustomerDevices.map((d) => (
                            <option key={d.id} value={d.id}>{d.brand} {d.model} ({d.storage || "Bilinmiyor"} - IMEI: {d.imei || "Bilinmiyor"})</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr" }}>
                      <div style={{ gridColumn: "span 2" }}>
                        <p style={{ margin: "0 0 8px", fontSize: "0.85rem", color: "#64748b" }}>Yeni cihazın temel bilgilerini doldurun.</p>
                      </div>
                      {/* Quick Model Selector from Pricing List */}
                      {availableModels.length > 0 && (
                        <div style={{ gridColumn: "span 2" }}>
                          <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Kayıtlı Cihaz Modellerinden Hızlı Seç</label>
                          <select
                            className="field"
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                const [brand, model] = val.split("|||");
                                setNewDevBrand(brand);
                                setNewDevModel(model);
                              }
                            }}
                          >
                            <option value="">-- Model Seçin (Otomatik Doldur) --</option>
                            {availableModels.map((m, idx) => (
                              <option key={idx} value={`${m.brand}|||${m.model}`}>
                                {m.brand} - {m.model}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Marka *</label>
                        <input className="field" placeholder="Örn: Apple" value={newDevBrand} onChange={(e) => setNewDevBrand(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Model *</label>
                        <input className="field" placeholder="Örn: iPhone 14 Pro" value={newDevModel} onChange={(e) => setNewDevModel(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Kapasite *</label>
                        <select className="field" value={newDevStorage} onChange={(e) => setNewDevStorage(e.target.value)}>
                          <option value="64GB">64GB</option>
                          <option value="128GB">128GB</option>
                          <option value="256GB">256GB</option>
                          <option value="512GB">512GB</option>
                          <option value="1TB">1TB</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>IMEI (Opsiyonel)</label>
                        <input className="field" placeholder="15 haneli numara" maxLength={16} value={newDevImei} onChange={(e) => setNewDevImei(e.target.value)} />
                      </div>

                      {/* Color selections */}
                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Renk (Hızlı Seçim)</label>
                        <select
                          className="field"
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              setNewDevColor(val);
                            }
                          }}
                        >
                          <option value="">-- Renk Seçin --</option>
                          <option value="Uzay Grisi / Siyah">Uzay Grisi / Siyah</option>
                          <option value="Gümüş / Beyaz">Gümüş / Beyaz</option>
                          <option value="Altın">Altın</option>
                          <option value="Grafit">Grafit</option>
                          <option value="Gece Yarısı">Gece Yarısı</option>
                          <option value="Mavi">Mavi</option>
                          <option value="Yeşil">Yeşil</option>
                          <option value="Kırmızı">Kırmızı</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Renk Detayı</label>
                        <input className="field" placeholder="Örn: Grafit" value={newDevColor} onChange={(e) => setNewDevColor(e.target.value)} />
                      </div>

                      {/* Cosmetic conditions */}
                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Kozmetik Durumu (Hızlı Seçim)</label>
                        <select
                          className="field"
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              setNewDevCondNote(val);
                            }
                          }}
                        >
                          <option value="">-- Durum Seçin --</option>
                          <option value="Temiz">Temiz</option>
                          <option value="Ekranda Kılcal Çizikler">Ekranda Kılcal Çizikler</option>
                          <option value="Derin Çizikler Var">Derin Çizikler Var</option>
                          <option value="Ekran Kırık / Çatlak">Ekran Kırık / Çatlak</option>
                          <option value="Arka Cam Kırık">Arka Cam Kırık</option>
                          <option value="Kasa Ezik ve Çizik">Kasa Ezik ve Çizik</option>
                          <option value="Sıvı Temaslı Cihaz">Sıvı Temaslı Cihaz</option>
                          <option value="Açılmıyor / Tepki Yok">Açılmıyor / Tepki Yok</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Kozmetik Detayı / Notu</label>
                        <input className="field" placeholder="Örn: Temiz, Ekran Çizik" value={newDevCondNote} onChange={(e) => setNewDevCondNote(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: PRE-CHECK CHECKLIST & SERVICE DETAILS */}
              {wizardStep === 3 && (
                <div style={{ display: "grid", gap: "1.25rem" }}>
                  <div>
                    <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", fontWeight: 700, textTransform: "uppercase", color: "var(--accent)", borderBottom: "1px dashed var(--border)", paddingBottom: 4 }}>Cihaz Ön Kontrol Listesi</h4>
                    <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "#64748b" }}>Cihaz dükkana teslim edilirken parçaların durumunu işaretleyin. Bu çıktı fişe yansıyacaktır.</p>
                    <PhoneVisualExpertise value={checklist} onChange={setChecklist} />
                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                      {CHECKLIST_KEYS.map((ck) => {
                        const currentVal = checklist[ck.key];
                        return (
                          <div key={ck.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 10 }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{ck.label}</span>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                type="button"
                                onClick={() => setChecklist(prev => ({ ...prev, [ck.key]: "OK" }))}
                                style={{
                                  border: 0,
                                  borderRadius: 6,
                                  width: 28,
                                  height: 24,
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                  fontWeight: "bold",
                                  backgroundColor: currentVal === "OK" ? "#10b981" : "#f1f5f9",
                                  color: currentVal === "OK" ? "white" : "#64748b",
                                }}
                                title="Çalışıyor"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => setChecklist(prev => ({ ...prev, [ck.key]: "BAD" }))}
                                style={{
                                  border: 0,
                                  borderRadius: 6,
                                  width: 28,
                                  height: 24,
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                  fontWeight: "bold",
                                  backgroundColor: currentVal === "BAD" ? "#ef4444" : "#f1f5f9",
                                  color: currentVal === "BAD" ? "white" : "#64748b",
                                }}
                                title="Sorunlu"
                              >
                                &times;
                              </button>
                              <button
                                type="button"
                                onClick={() => setChecklist(prev => ({ ...prev, [ck.key]: "NA" }))}
                                style={{
                                  border: 0,
                                  borderRadius: 6,
                                  width: 28,
                                  height: 24,
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                  fontWeight: "bold",
                                  backgroundColor: currentVal === "NA" ? "#64748b" : "#f1f5f9",
                                  color: currentVal === "NA" ? "white" : "#64748b",
                                }}
                                title="Seçilmedi"
                              >
                                ?
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ margin: "10px 0 10px", fontSize: "0.95rem", fontWeight: 700, textTransform: "uppercase", color: "var(--accent)", borderBottom: "1px dashed var(--border)", paddingBottom: 4 }}>Arıza & Fiyat Detayları</h4>
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Arıza Açıklaması / Talep Edilen İşlem *</label>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input className="field" placeholder="Örn: Ekran kırık, batarya şişmiş, değişecek" value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} />
                          <button
                            type="button"
                            onClick={handleAiRecommendation}
                            disabled={aiLoading || !issueDescription}
                            className="primary-btn"
                            style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            {aiLoading ? "Analiz..." : "✨ Yapay Zeka Önerisi"}
                          </button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div>
                          <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Tahmini İşçilik Bedeli (TL)</label>
                          <input type="number" min={0} className="field" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Tahmini Parça Bedeli (TL)</label>
                          <input type="number" min={0} className="field" value={partCost} onChange={(e) => setPartCost(e.target.value)} />
                        </div>
                      </div>
                      {aiResult && (
                        <div style={{
                          padding: "0.75rem",
                          borderRadius: "10px",
                          border: "1px solid #ccfbf1",
                          backgroundColor: "#f0fdfa",
                          fontSize: "0.85rem",
                          color: "#115e59",
                          display: "grid",
                          gap: "4px"
                        }}>
                          <div style={{ fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
                            <span>✨ Yapay Zeka Teşhisi ve Fiyatlandırma</span>
                            <span>Süre: {aiResult.predictedTime}</span>
                          </div>
                          <p style={{ margin: "2px 0 6px" }}>{aiResult.reasoning}</p>
                          <div style={{ fontSize: "0.8rem", color: "#0f766e" }}>
                            <strong>Önerilen Parçalar:</strong> {aiResult.possibleParts.join(", ")}
                          </div>
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.75rem", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                          Öngörülen Toplam: <span style={{ color: "var(--accent)" }}>{(Number(laborCost) + Number(partCost)).toLocaleString("tr-TR")} TL</span>
                        </div>
                        <div>
                          <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Giriş Durumu</label>
                          <select className="field" value={initialStatus} onChange={(e) => setInitialStatus(e.target.value as any)}>
                            <option value="RECEIVED">Teslim Alındı</option>
                            <option value="IN_PROGRESS">Onarımda</option>
                            <option value="WAITING_PART">Parça Bekliyor</option>
                            <option value="READY">Hazır</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div style={{ padding: "1.25rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              {wizardStep > 1 ? (
                <button className="primary-btn" style={{ backgroundColor: "#64748b" }} onClick={() => setWizardStep(prev => prev - 1)}>
                  Geri
                </button>
              ) : (
                <button className="primary-btn" style={{ backgroundColor: "#64748b" }} onClick={() => setIsNewModalOpen(false)}>
                  İptal
                </button>
              )}

              {wizardStep < 3 ? (
                <button
                  className="primary-btn"
                  onClick={() => {
                    // Quick validation before step transition
                    if (wizardStep === 1 && customerMode === "SELECT" && !selectedCustomerId) {
                      toast.warning("Lütfen müşteri seçimi yapın.");
                      return;
                    }
                    if (wizardStep === 1 && customerMode === "CREATE" && (!newCustName || !newCustPhone)) {
                      toast.warning("Lütfen ad soyad ve telefon doldurun.");
                      return;
                    }
                    if (wizardStep === 2 && deviceMode === "SELECT" && !selectedDeviceId) {
                      toast.warning("Lütfen cihaz seçimi yapın.");
                      return;
                    }
                    if (wizardStep === 2 && deviceMode === "CREATE" && (!newDevBrand || !newDevModel || !newDevImei)) {
                      toast.warning("Lütfen cihaz marka, model ve IMEI doldurun.");
                      return;
                    }

                    // Pre-fill fields for creation if using select modes to avoid blank submissions
                    setWizardStep(prev => prev + 1);
                  }}
                >
                  Sonraki Adım
                </button>
              ) : (
                <button className="primary-btn" onClick={handleCreateRepair} disabled={loading}>
                  {loading ? "Kaydediliyor..." : "Arıza Kaydını Aç"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. REPAIR DETAIL & STATUS ACTION MODAL */}
      {isDetailModalOpen && selectedRepair && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 65, padding: 16 }}>
          <div className="panel" style={{ width: "min(720px,95vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0 }}>
            {/* Header */}
            <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Servis Kaydı Detayı</h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "#64748b" }}>Kayıt No: #{selectedRepair.id.toUpperCase()}</p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={{ border: 0, background: "transparent", fontSize: "1.2rem", cursor: "pointer", color: "var(--muted)" }}
              >
                &times;
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{ padding: "1.25rem", overflowY: "auto", flex: 1, display: "grid", gap: "1.25rem" }}>
              {/* Row 1: Customer & Device Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="panel" style={{ padding: "10px 12px", background: "var(--surface-soft)" }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Müşteri Bilgileri</h4>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{selectedRepair.device.customer.fullName}</div>
                  <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: 2 }}>Tel: {selectedRepair.device.customer.phone}</div>
                  {selectedRepair.device.customer.email && <div style={{ fontSize: "0.85rem", color: "#64748b" }}>{selectedRepair.device.customer.email}</div>}
                </div>

                <div className="panel" style={{ padding: "10px 12px", background: "var(--surface-soft)" }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Cihaz Bilgileri</h4>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{selectedRepair.device.brand} {selectedRepair.device.model} {selectedRepair.device.storage || ""}</div>
                  <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: 2 }}>IMEI: {selectedRepair.device.imei || "-"}</div>
                  {selectedRepair.device.color && <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Renk: {selectedRepair.device.color}</div>}
                </div>
              </div>

              {/* Row 2: Condition Pre-Check Results */}
              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", color: "var(--accent)" }}>Ön Kontrol Durumu</h4>
                <PhoneVisualExpertise value={editChecklist} onChange={setEditChecklist} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                  {CHECKLIST_KEYS.map((ck) => {
                    const state = editChecklist[ck.key] || "NA";
                    const color = state === "OK" ? "#10b981" : state === "BAD" ? "#ef4444" : "#64748b";
                    const label = state === "OK" ? "Çalışıyor" : state === "BAD" ? "Sorunlu" : "Kontrol Edilmedi";
                    return (
                      <div key={ck.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 8 }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{ck.label}</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => setEditChecklist(prev => ({ ...prev, [ck.key]: "OK" }))}
                            style={{
                              border: 0,
                              borderRadius: 4,
                              width: 22,
                              height: 18,
                              fontSize: "0.7rem",
                              cursor: "pointer",
                              backgroundColor: state === "OK" ? "#10b981" : "#f1f5f9",
                              color: state === "OK" ? "white" : "#64748b",
                            }}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditChecklist(prev => ({ ...prev, [ck.key]: "BAD" }))}
                            style={{
                              border: 0,
                              borderRadius: 4,
                              width: 22,
                              height: 18,
                              fontSize: "0.7rem",
                              cursor: "pointer",
                              backgroundColor: state === "BAD" ? "#ef4444" : "#f1f5f9",
                              color: state === "BAD" ? "white" : "#64748b",
                            }}
                          >
                            &times;
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditChecklist(prev => ({ ...prev, [ck.key]: "NA" }))}
                            style={{
                              border: 0,
                              borderRadius: 4,
                              width: 22,
                              height: 18,
                              fontSize: "0.7rem",
                              cursor: "pointer",
                              backgroundColor: state === "NA" ? "#64748b" : "#f1f5f9",
                              color: state === "NA" ? "white" : "#64748b",
                            }}
                          >
                            ?
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: Repair Edit Form fields */}
              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", color: "var(--accent)" }}>Servis Güncelleme</h4>
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Talep / Arıza Tanımı</label>
                    <input className="field" value={editIssue} onChange={(e) => setEditIssue(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Teknisyen Teşhis ve Kozmetik Notları</label>
                    <textarea className="field" style={{ minHeight: 60 }} value={editCustomNote} onChange={(e) => setEditCustomNote(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>İşçilik Bedeli (TL)</label>
                      <input type="number" min={0} className="field" value={editLabor} onChange={(e) => setEditLabor(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Yedek Parça Bedeli (TL)</label>
                      <input type="number" min={0} className="field" value={editPart} onChange={(e) => setEditPart(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Güncel Durum</label>
                      <select className="field" value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)}>
                        <option value="RECEIVED">Teslim Alındı</option>
                        <option value="IN_PROGRESS">Onarımda</option>
                        <option value="WAITING_PART">Parça Bekliyor</option>
                        <option value="READY">Hazır (Tamamlandı)</option>
                        <option value="DELIVERED">Müşteriye Teslim Edildi</option>
                        <option value="CANCELED">İptal Edildi</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Toplam Hizmet Bedeli: <span style={{ color: "var(--accent)" }}>{(Number(editLabor) + Number(editPart)).toLocaleString("tr-TR")} TL</span></span>
                  </div>
                </div>
              </div>

              {/* Row 4: Action Tools (Print & Notification Hooks) */}
              <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 10 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Hızlı İşlemler</h4>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    onClick={() => printKabulFisi(selectedRepair)}
                    className="primary-btn"
                    style={{ flex: 1, backgroundColor: "#64748b", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.617 0-1.11-.5-1.12-1.129L6.34 18m11.32 0a3 3 0 000-6a3 3 0 00-11.32 0M16.5 6V4.5A1.5 1.5 0 0015 3H9a1.5 1.5 0 00-1.5 1.5V6m9 0H6" />
                    </svg>
                    Kabul Fişi Yazdır (80mm)
                  </button>

                  <button
                    onClick={() => printTeslimFisi(selectedRepair)}
                    className="primary-btn"
                    style={{ flex: 1, backgroundColor: "#475569", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    disabled={editStatus !== "DELIVERED" && selectedRepair.status !== "DELIVERED"}
                  >
                    <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Teslim Fişi Yazdır (80mm)
                  </button>

                  <button
                    onClick={() => sendWhatsAppNotification(selectedRepair)}
                    className="primary-btn"
                    style={{ flex: 1.2, backgroundColor: "#25d366", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <svg style={{ width: 16, height: 16 }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.022-.08-.103-.128-.352-.253-.25-.125-1.478-.73-1.705-.813-.228-.083-.393-.128-.559.127-.166.255-.641.81-.786.975-.145.166-.29.185-.54.06-.25-.125-1.048-.385-1.996-1.23-.737-.657-1.235-1.47-1.38-1.725-.144-.255-.015-.393.11-.517.113-.112.25-.29.375-.435.125-.145.166-.25.25-.417.083-.166.042-.31-.02-.435-.062-.125-.56-1.348-.767-1.85-.203-.491-.408-.423-.559-.43-.145-.008-.313-.01-.482-.01-.17 0-.445.064-.679.314-.234.25-.893.874-.893 2.132 0 1.258.916 2.474 1.043 2.643.127.17 1.8 2.748 4.36 3.856.61.264 1.085.422 1.458.54.613.195 1.17.168 1.61.102.49-.074 1.477-.604 1.684-1.19.207-.585.207-1.085.145-1.19m-5.466 7.42h-.008c-2.277 0-4.516-.612-6.47-1.767L3.5 21.048l1.398-5.105c-1.265-2.19-1.93-4.707-1.93-7.29 0-7.854 6.39-14.24 14.246-14.24 3.803 0 7.377 1.48 10.063 4.167A14.16 14.16 0 0124 8.65c0 7.855-6.39 14.242-14.243 14.242" />
                    </svg>
                    WhatsApp ile Bildir
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "1.25rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                className="primary-btn"
                style={{ backgroundColor: "#64748b" }}
                onClick={() => setIsDetailModalOpen(false)}
              >
                Kapat
              </button>
              <button
                className="primary-btn"
                onClick={handleUpdateRepair}
                disabled={savingEdit}
              >
                {savingEdit ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
