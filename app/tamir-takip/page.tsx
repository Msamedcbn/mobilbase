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
        fill: "rgba(16, 185, 129, 0.18)",
        stroke: "#10b981",
        strokeWidth: 2,
        filter: "drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))",
      };
    }
    if (state === "BAD") {
      return {
        fill: "rgba(239, 68, 68, 0.25)",
        stroke: "#ef4444",
        strokeWidth: 2.5,
        filter: "drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))",
        className: "part-interactive pulse-bad",
      };
    }
    return {
      fill: "rgba(30, 41, 59, 0.45)",
      stroke: "rgba(148, 163, 184, 0.2)",
      strokeWidth: 1.5,
      strokeDasharray: "4 4",
    };
  };

  const partEvents = (key: string) => ({
    onClick: () => cycleState(key),
    onMouseEnter: () => setHoveredPart(key),
    onMouseLeave: () => setHoveredPart(null),
    style: { cursor: "pointer", transition: "all 0.25s ease" },
  });

  return (
    <div className="relative mx-auto mb-6 w-full max-w-[920px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-3 shadow-xl md:p-4">
      {/* Visual background scanning lines */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.10),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(99,102,241,0.10),transparent_35%)]" />
      <style>{`
        .pulse-bad {
          animation: visualPulse 1.8s infinite ease-in-out;
        }
        @keyframes visualPulse {
          0% { fill: rgba(239, 68, 68, 0.1); stroke: #ef4444; filter: drop-shadow(0 0 2px rgba(239,68,68,0.3)); }
          50% { fill: rgba(239, 68, 68, 0.35); stroke: #f87171; filter: drop-shadow(0 0 8px rgba(239,68,68,0.7)); }
          100% { fill: rgba(239, 68, 68, 0.1); stroke: #ef4444; filter: drop-shadow(0 0 2px rgba(239,68,68,0.3)); }
        }
        .part-interactive:hover {
          filter: brightness(1.2) saturate(1.2);
          stroke-width: 2.5px;
        }
      `}</style>

      <div className="relative z-10 mb-3 flex flex-wrap items-start justify-center gap-3 md:gap-5">
        {/* Front View */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/45 p-2 text-center md:p-3">
          <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-1.5 font-mono text-2xs font-bold uppercase tracking-widest text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            ÖN YÜZ (FRONT SIDE)
          </div>
          <svg width="128" height="224" viewBox="0 0 160 280" className="overflow-visible select-none">
            {/* Outer phone container rect (non-interactive) */}
            <rect x="10" y="10" width="140" height="260" rx="24" fill="#090d16" stroke="rgba(148, 163, 184, 0.15)" strokeWidth="2.5" />
            
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
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/45 p-2 text-center md:p-3">
          <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-1.5 font-mono text-2xs font-bold uppercase tracking-widest text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            ARKA YÜZ (BACK SIDE)
          </div>
          <svg width="128" height="224" viewBox="0 0 160 280" className="overflow-visible select-none">
            {/* Outer phone container rect (non-interactive) */}
            <rect x="10" y="10" width="140" height="260" rx="24" fill="#090d16" stroke="rgba(148, 163, 184, 0.15)" strokeWidth="2.5" />
            
            {/* Back Camera Module (non-interactive outline) */}
            <rect x="20" y="22" width="40" height="40" rx="10" fill="rgba(30, 41, 59, 0.2)" stroke="rgba(148, 163, 184, 0.12)" strokeWidth="1.5" />
            
            {/* Back Camera Lens (backCam) */}
            <circle cx="40" cy="42" r="10" className="part-interactive" {...getStylesForPart("backCam")} {...partEvents("backCam")} />
            <circle cx="40" cy="42" r="4" fill="#475569" opacity="0.6" pointerEvents="none" />
            
            {/* WiFi / Bluetooth Region (wifi) */}
            <rect x="90" y="22" width="42" height="40" rx="10" className="part-interactive" {...getStylesForPart("wifi")} {...partEvents("wifi")} />
            {/* Custom Wireless Icon */}
            <path d="M103 48 A 10 10 0 0 1 119 48 M106 44 A 6 6 0 0 1 116 44 M111 40 A 1 1 0 0 1 111 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" pointerEvents="none" style={{ color: value.wifi === "NA" ? "#475569" : (value.wifi === "OK" ? "#10b981" : "#ef4444") }} />
            
            {/* Battery Outline & Cap (battery) */}
            <rect x="70" y="84" width="20" height="6" rx="2" className="part-interactive" {...getStylesForPart("battery")} {...partEvents("battery")} />
            <rect x="35" y="90" width="90" height="110" rx="8" className="part-interactive" {...getStylesForPart("battery")} {...partEvents("battery")} />
            {/* Lightning bolt inside battery */}
            <path d="M 82 132 L 74 148 L 80 148 L 78 162 L 88 144 L 82 144 Z" fill="currentColor" opacity="0.85" pointerEvents="none" style={{ color: value.battery === "NA" ? "#475569" : (value.battery === "OK" ? "#10b981" : "#ef4444") }} />
            
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
      <div className="relative z-10 mx-auto mt-2 min-h-[48px] max-w-[840px] rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-center shadow-inner">
        {hoveredPart ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5 font-mono text-2xs text-slate-200 md:text-xs">
            <span className="text-blue-400">⚡ DIAGNOSTIC:</span>
            <strong>{CHECKLIST_KEYS.find(k => k.key === hoveredPart)?.label}</strong>
            <span>➜</span>
            <span className={
              value[hoveredPart] === "OK" ? "text-emerald-400 font-bold" : value[hoveredPart] === "BAD" ? "text-rose-400 font-bold animate-pulse" : "text-slate-500"
            }>
              {value[hoveredPart] === "OK" ? "ÇALIŞIYOR (STATUS: OK)" : value[hoveredPart] === "BAD" ? "SORUNLU / HASARLI (STATUS: ALERT)" : "SEÇİLMEDİ (STATUS: NULL)"}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] text-slate-400 md:text-2xs">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400/80 animate-ping"></span>
            <span>Durumu değiştirmek için görseldeki parçalara tıklayın (NA ➜ OK ➜ BAD)</span>
          </div>
        )}
      </div>

      {/* Color legend */}
      <div className="relative z-10 mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono tracking-wide text-slate-300 md:text-2xs">
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
          Çalışıyor
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/25 border border-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
          Sorunlu
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-slate-600/70 bg-slate-800/60 px-2.5 py-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-dashed border-slate-600"></span>
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
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyResults, setHistoryResults] = useState<CustomerHistoryResult[]>([]);

  const [banks, setBanks] = useState<any[]>([]);
  const [editPaymentMethod, setEditPaymentMethod] = useState<"CASH" | "CREDIT_CARD" | "ON_ACCOUNT">("CASH");
  const [editBankAccountId, setEditBankAccountId] = useState<string>("");

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

  // A brand-new customer can never have registered devices, so "Kayıtlı Cihaz
  // Seç" is disabled for them (see the tab button below) — keep deviceMode in
  // sync so step-2 validation doesn't still expect a device SELECTion that the
  // UI no longer offers.
  useEffect(() => {
    if (customerMode === "CREATE") setDeviceMode("CREATE");
  }, [customerMode]);
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
      const [repRes, custRes, devRes, modelRes, settingsRes, bankRes] = await Promise.all([
        fetch("/api/repairs"),
        fetch("/api/customers"),
        fetch("/api/devices"),
        fetch("/api/device-models").catch(() => null),
        fetch("/api/settings").catch(() => null),
        fetch("/api/banks").catch(() => null),
      ]);
      const [repData, custData, devData, modelData, settingsData, bankData] = await Promise.all([
        repRes.json(),
        custRes.json(),
        devRes.json(),
        modelRes ? modelRes.json() : [],
        settingsRes ? settingsRes.json() : null,
        bankRes ? bankRes.json() : null,
      ]);

      setRepairs(Array.isArray(repData) ? repData : []);
      setCustomers(custData.data ?? (Array.isArray(custData) ? custData : []));
      setDevices(devData.data ?? (Array.isArray(devData) ? devData : []));
      setAvailableModels(Array.isArray(modelData) ? modelData : []);
      setSettings(settingsData?.data || settingsData || null);

      const loadedBanksRaw = bankData?.data ?? bankData;
      const loadedBanks = Array.isArray(loadedBanksRaw) ? loadedBanksRaw : [];
      setBanks(loadedBanks);
    } catch {
      toast.error("Teknik servis verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomerHistorySearch() {
    const q = historyQuery.trim();
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
    
    // Initialize payment states
    setEditPaymentMethod("CASH");
    if (banks && banks.length > 0) {
      setEditBankAccountId(banks[0].id);
    } else {
      setEditBankAccountId("");
    }
    
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
          paymentMethod: editStatus === "DELIVERED" ? editPaymentMethod : undefined,
          bankAccountId: (editStatus === "DELIVERED" && (editPaymentMethod === "CASH" || editPaymentMethod === "CREDIT_CARD")) ? editBankAccountId : undefined,
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
      .replace(/{servis_no}/g, getNumericServiceNo(repair));

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${phoneNum}&text=${encoded}`, "_blank");
  }

  function getNumericServiceNo(repair: RepairRecord) {
    const datePart = new Date(repair.receivedAt).toISOString().slice(0, 10).replace(/-/g, "");
    let hash = 0;
    for (let i = 0; i < repair.id.length; i++) {
      hash = (hash * 31 + repair.id.charCodeAt(i)) % 1000000;
    }
    return `${datePart}${String(Math.abs(hash)).padStart(6, "0")}`;
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

    const serviceNo = getNumericServiceNo(repair);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Servis Kabul Belgesi #${serviceNo}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            width: 74mm;
            margin: 0 auto;
            padding: 12px 5px;
            color: #0f172a;
            background: #fff;
            font-size: 12px;
            line-height: 1.4;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .mono { font-family: 'Courier New', Courier, monospace; letter-spacing: .2px; }
          .header { margin-bottom: 10px; border: 1px solid #0f172a; border-radius: 6px; padding: 8px; }
          .title { font-size: 14px; font-weight: 800; margin: 0 0 3px; }
          .info-table, .checklist-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .info-table td { padding: 2px 0; }
          .section-title { font-weight: 800; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; margin: 10px 0 6px; padding: 4px 6px; text-transform: uppercase; font-size: 11px; }
          .disclaimer { font-size: 9px; text-align: justify; margin-top: 10px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 6px; padding: 7px; line-height: 1.35; }
          .signatures { display: flex; justify-content: space-between; margin-top: 22px; font-size: 10px; }
          .signatures div { width: 30mm; text-align: center; border-top: 1px solid #94a3b8; padding-top: 3px; }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <div class="title">SERVIS KABUL BELGESI</div>
          <div style="font-size: 10px; font-weight: 600;">Teknik Servis Giris Formu</div>
          <div class="mono" style="font-size: 11px; margin-top: 4px;">No: ${serviceNo}</div>
        </div>

        <table class="info-table">
          <tr><td class="bold">Tarih:</td><td class="text-right">${dateStr}</td></tr>
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

    const serviceNo = getNumericServiceNo(repair);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Servis Teslim Belgesi #${serviceNo}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            width: 74mm;
            margin: 0 auto;
            padding: 12px 5px;
            color: #0f172a;
            background: #fff;
            font-size: 12px;
            line-height: 1.4;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .mono { font-family: 'Courier New', Courier, monospace; letter-spacing: .2px; }
          .header { margin-bottom: 10px; border: 1px solid #0f172a; border-radius: 6px; padding: 8px; }
          .title { font-size: 14px; font-weight: 800; margin: 0 0 3px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .info-table td { padding: 2px 0; }
          .section-title { font-weight: 800; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; margin: 10px 0 6px; padding: 4px 6px; text-transform: uppercase; font-size: 11px; }
          .totals-box { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 6px; padding: 7px; margin-top: 10px; }
          .totals-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 2px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 22px; font-size: 10px; }
          .signatures div { width: 30mm; text-align: center; border-top: 1px solid #94a3b8; padding-top: 3px; }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <div class="title">SERVIS TESLIM BELGESI</div>
          <div style="font-size: 10px; font-weight: 600;">Onarim Sonrasi Teslim Formu</div>
          <div class="mono" style="font-size: 11px; margin-top: 4px;">No: ${serviceNo}</div>
        </div>

        <table class="info-table">
          <tr><td class="bold">Teslim Tarihi:</td><td class="text-right">${dateStr}</td></tr>
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
    <section className="relative animate-fade-in">
      {/* Page Header Cards */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="page-title m-0">Teknik Servis Yönetimi</h2>
          <p className="text-slate-500 text-xs md:text-sm m-0 mt-1">Cihaz kayıtları, diagnostik ekspertizler ve onarım süreci takibi.</p>
        </div>
        <button onClick={() => { resetWizard(); setIsNewModalOpen(true); }} className="primary-btn shrink-0 flex items-center gap-2 px-5 py-2.5 font-semibold text-sm hover:shadow-lg transition-all duration-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Yeni Servis Kaydı
        </button>
      </div>

      {/* Premium Stats Grid */}
      <div className="stats-grid mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel overflow-hidden relative group p-5 bg-gradient-to-br from-blue-700 to-blue-800 text-white border-0 shadow-lg">
          <div className="absolute right-3 bottom-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>
          <p className="m-0 text-xs font-bold opacity-80 uppercase tracking-wider">Aktif Cihazlar</p>
          <h3 className="m-0 mt-2 text-3xl font-extrabold">{stats.active}</h3>
          <p className="m-0 mt-1 text-2xs opacity-75">Tamir ve parça bekleyenler</p>
        </div>

        <div className="panel overflow-hidden relative group p-5 bg-white">
          <div className="absolute right-3 bottom-3 opacity-10 text-emerald-800 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="m-0 text-xs font-bold text-slate-500 uppercase tracking-wider">Hazır / Teslim Edilecek</p>
          <h3 className="m-0 mt-2 text-3xl font-extrabold text-emerald-600">{stats.ready}</h3>
          <p className="m-0 mt-1 text-2xs text-slate-400">Onarımı biten cihazlar</p>
        </div>

        <div className="panel overflow-hidden relative group p-5 bg-white">
          <div className="absolute right-3 bottom-3 opacity-10 text-indigo-800 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375c1.08 0 1.958-.87 1.958-1.958a1.958 1.958 0 00-1.958-1.958H9V15zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="m-0 text-xs font-bold text-slate-500 uppercase tracking-wider">Bugün Teslim Edilen</p>
          <h3 className="m-0 mt-2 text-3xl font-extrabold text-indigo-600">{stats.deliveredToday}</h3>
          <p className="m-0 mt-1 text-2xs text-slate-400">Dükkandan çıkan cihazlar</p>
        </div>

        <div className="panel overflow-hidden relative group p-5 bg-white">
          <div className="absolute right-3 bottom-3 opacity-10 text-slate-800 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <p className="m-0 text-xs font-bold text-slate-500 uppercase tracking-wider">Kayıtlı Cihaz Sayısı</p>
          <h3 className="m-0 mt-2 text-3xl font-extrabold text-slate-900">{repairs.length}</h3>
          <p className="m-0 mt-1 text-2xs text-slate-400">Toplam arıza girdisi</p>
        </div>
      </div>

      {/* Control panel: Search & Filters */}
      <div className="panel p-4 mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          {["ALL", "RECEIVED", "IN_PROGRESS", "WAITING_PART", "READY", "DELIVERED", "CANCELED"].map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-xl border transition-all duration-200 shadow-sm ${
                  active 
                    ? "bg-blue-700 border-blue-700 text-white shadow-blue-700/10" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {st === "ALL" ? "Tümü" : STATUS_LABELS[st]}
              </button>
            );
          })}
        </div>
        <div className="w-full md:w-80 shrink-0">
          <input
            className="field w-full"
            placeholder="Müşteri, Model, IMEI veya Arıza Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="panel p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="w-full md:max-w-md">
            <input
              className="field w-full"
              placeholder="Müşteri adı veya telefon ile geçmiş sorgula..."
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCustomerHistorySearch();
              }}
            />
          </div>
          <button
            className="primary-btn"
            onClick={() => void handleCustomerHistorySearch()}
            disabled={historyLoading}
            style={{ minWidth: 180 }}
          >
            {historyLoading ? "Sorgulanıyor..." : "Müşteri Geçmiş Sorgula"}
          </button>
        </div>

        {historyResults.length > 0 && (
          <div className="mt-4 grid gap-3">
            {historyResults.map((item) => (
              <div key={item.customer.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>{item.customer.fullName}</strong>
                    <div className="text-xs text-slate-500">{item.customer.phone}</div>
                  </div>
                  <div className="text-xs text-slate-600">
                    Borç: <strong>{Number(item.summary.totalDebit).toLocaleString("tr-TR")} TL</strong> | Tahsilat:{" "}
                    <strong>{Number(item.summary.totalCredit).toLocaleString("tr-TR")} TL</strong> | Net:{" "}
                    <strong>{Number(item.summary.netBalance).toLocaleString("tr-TR")} TL</strong>
                  </div>
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  Tamir: {item.summary.repairCount} | İşlem: {item.summary.transactionCount} | Cihaz: {item.summary.deviceCount}
                </div>

                <div className="mt-2 overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Tip</th>
                        <th>Açıklama</th>
                        <th>Tutar</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.timeline.slice(0, 20).map((row) => (
                        <tr key={row.id}>
                          <td>{new Date(row.date).toLocaleString("tr-TR")}</td>
                          <td>{row.kind}</td>
                          <td>{row.title}{row.detail ? ` - ${row.detail}` : ""}</td>
                          <td>{row.amount == null ? "-" : `${Number(row.amount).toLocaleString("tr-TR")} TL`}</td>
                          <td>{row.status || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
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
                      <td style={{ fontWeight: 600, color: "#64748b" }}>#{getNumericServiceNo(item)}</td>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm grid place-items-center z-50 p-4 animate-fade-in">
          <div className="panel w-full max-w-2xl max-h-[90vh] flex flex-col p-0 border border-slate-200 shadow-2xl bg-white/95 backdrop-blur-md overflow-hidden rounded-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="m-0 text-lg font-bold text-slate-900">Yeni Servis Kaydı</h3>
                <p className="m-0 text-slate-400 text-xs mt-0.5">Adım adım müşteri, cihaz ve arıza kaydı oluşturun.</p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors w-8 h-8 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Step Indicators */}
            <div className="flex bg-slate-50/30 border-b border-slate-200">
              {[
                { label: "Müşteri Bilgileri", icon: "👤" },
                { label: "Cihaz Detayları", icon: "📱" },
                { label: "Ön Kontrol & Arıza", icon: "🛠️" }
              ].map((step, idx) => {
                const stepNum = idx + 1;
                const active = wizardStep === stepNum;
                const done = wizardStep > stepNum;
                return (
                  <div
                    key={step.label}
                    className={`flex-1 text-center py-3.5 px-2 text-xs md:text-sm font-semibold transition-all duration-300 relative ${
                      active ? "text-blue-700 bg-white" : done ? "text-emerald-600 bg-emerald-50/30" : "text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 flex-col sm:flex-row">
                      <span className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold transition-all duration-300 border ${
                        active 
                          ? "bg-blue-700 border-blue-700 text-white shadow-sm" 
                          : done 
                          ? "bg-emerald-600 border-emerald-600 text-white" 
                          : "bg-slate-100 border-slate-200 text-slate-400"
                      }`}>
                        {done ? "✓" : stepNum}
                      </span>
                      <span className="hidden sm:inline">{step.label}</span>
                      <span className="sm:hidden">{step.icon}</span>
                    </div>
                    {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700" />}
                    {done && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
                  </div>
                );
              })}
            </div>

            {/* Content Scroll Area */}
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {/* STEP 1: CUSTOMER */}
              {wizardStep === 1 && (
                <div className="grid gap-5">
                  <div className="flex gap-3 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setCustomerMode("SELECT")}
                      className={`flex-1 py-2.5 px-3 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                        customerMode === "SELECT" 
                          ? "bg-white text-slate-900 shadow-sm border border-slate-200/30" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Mevcut Müşteri Seç
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerMode("CREATE")}
                      className={`flex-1 py-2.5 px-3 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                        customerMode === "CREATE" 
                          ? "bg-white text-slate-900 shadow-sm border border-slate-200/30" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Yeni Müşteri Ekle
                    </button>
                  </div>

                  {customerMode === "SELECT" ? (
                    <div className="animate-fade-in">
                      <label className="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wide">Kayıtlı Müşteri</label>
                      <select
                        className="field w-full"
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
                    <div className="grid gap-4 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Ad Soyad *</label>
                          <input className="field w-full" placeholder="Müşteri ad soyad" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Telefon *</label>
                          <input className="field w-full" placeholder="Örn: 5554443322" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">E-posta</label>
                        <input className="field w-full" placeholder="E-posta adresi (opsiyonel)" value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Müşteri Notu</label>
                        <textarea className="field w-full min-h-[75px]" placeholder="Müşteri hakkında özel notlar..." value={newCustNotes} onChange={(e) => setNewCustNotes(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: DEVICE */}
              {wizardStep === 2 && (
                <div className="grid gap-5">
                  <div className="flex gap-3 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setDeviceMode("SELECT")}
                      className={`flex-1 py-2.5 px-3 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                        deviceMode === "SELECT" 
                          ? "bg-white text-slate-900 shadow-sm border border-slate-200/30" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      disabled={customerMode === "CREATE"}
                    >
                      Kayıtlı Cihaz Seç ({selectedCustomerDevices.length} adet)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviceMode("CREATE")}
                      className={`flex-1 py-2.5 px-3 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                        deviceMode === "CREATE" 
                          ? "bg-white text-slate-900 shadow-sm border border-slate-200/30" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Yeni Cihaz Tanımla
                    </button>
                  </div>

                  {deviceMode === "SELECT" && customerMode === "SELECT" ? (
                    <div className="animate-fade-in">
                      <label className="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wide">Cihaz Seçimi</label>
                      {selectedCustomerDevices.length === 0 ? (
                        <div className="empty-box m-0 p-6">
                          Müşteriye ait cihaz bulunamadı. Lütfen &quot;Yeni Cihaz Tanımla&quot; sekmesine geçin.
                        </div>
                      ) : (
                        <select
                          className="field w-full"
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
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 animate-fade-in">
                      {availableModels.length > 0 && (
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Hızlı Model Seçimi (Kayıtlı Listeden)</label>
                          <select
                            className="field w-full"
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
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Marka *</label>
                        <input className="field w-full" placeholder="Örn: Apple" value={newDevBrand} onChange={(e) => setNewDevBrand(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Model *</label>
                        <input className="field w-full" placeholder="Örn: iPhone 14 Pro" value={newDevModel} onChange={(e) => setNewDevModel(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Kapasite *</label>
                        <select className="field w-full" value={newDevStorage} onChange={(e) => setNewDevStorage(e.target.value)}>
                          <option value="64GB">64GB</option>
                          <option value="128GB">128GB</option>
                          <option value="256GB">256GB</option>
                          <option value="512GB">512GB</option>
                          <option value="1TB">1TB</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">IMEI (Opsiyonel)</label>
                        <input className="field w-full" placeholder="15 haneli numara" maxLength={16} value={newDevImei} onChange={(e) => setNewDevImei(e.target.value)} />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Renk (Hızlı Seçim)</label>
                        <select
                          className="field w-full"
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) setNewDevColor(val);
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
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Renk Detayı</label>
                        <input className="field w-full" placeholder="Örn: Grafit" value={newDevColor} onChange={(e) => setNewDevColor(e.target.value)} />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Kozmetik Durumu (Hızlı Seçim)</label>
                        <select
                          className="field w-full"
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) setNewDevCondNote(val);
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
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Kozmetik Detayı / Notu</label>
                        <input className="field w-full" placeholder="Örn: Temiz, Ekran Çizik" value={newDevCondNote} onChange={(e) => setNewDevCondNote(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: PRE-CHECK CHECKLIST & SERVICE DETAILS */}
              {wizardStep === 3 && (
                <div className="grid gap-6 animate-fade-in">
                  <div>
                    <h4 className="m-0 mb-2 text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1">
                      <span>📋</span> Cihaz Ön Kontrol Listesi
                    </h4>
                    <p className="m-0 mb-4 text-slate-400 text-2xs md:text-xs">Cihaz dükkana teslim edilirken parçaların durumunu işaretleyin. Bu çıktı fişe yansıyacaktır.</p>
                    <PhoneVisualExpertise value={checklist} onChange={setChecklist} />
                    
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                      {CHECKLIST_KEYS.map((ck) => {
                        const currentVal = checklist[ck.key];
                        return (
                          <div key={ck.key} className="flex justify-between items-center py-1.5 px-3 border border-slate-200/50 bg-white rounded-lg shadow-2xs">
                            <span className="text-xs font-semibold text-slate-700">{ck.label}</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setChecklist(prev => ({ ...prev, [ck.key]: "OK" }))}
                                className={`border-0 rounded-md w-7 h-6 cursor-pointer text-xs font-bold transition-colors ${
                                  currentVal === "OK" ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                }`}
                                title="Çalışıyor"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => setChecklist(prev => ({ ...prev, [ck.key]: "BAD" }))}
                                className={`border-0 rounded-md w-7 h-6 cursor-pointer text-xs font-bold transition-colors ${
                                  currentVal === "BAD" ? "bg-rose-500 text-white shadow-sm" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                }`}
                                title="Sorunlu"
                              >
                                &times;
                              </button>
                              <button
                                type="button"
                                onClick={() => setChecklist(prev => ({ ...prev, [ck.key]: "NA" }))}
                                className={`border-0 rounded-md w-7 h-6 cursor-pointer text-xs font-bold transition-colors ${
                                  currentVal === "NA" ? "bg-slate-500 text-white shadow-sm" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                }`}
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

                  <div className="border-t border-slate-200 pt-5">
                    <h4 className="m-0 mb-3 text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1">
                      <span>💰</span> Arıza & Fiyat Detayları
                    </h4>
                    <div className="grid gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Arıza Açıklaması / Talep Edilen İşlem *</label>
                        <div className="flex gap-2">
                          <input className="field w-full" placeholder="Örn: Ekran kırık, batarya şişmiş, değişecek" value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} />
                          <button
                            type="button"
                            onClick={handleAiRecommendation}
                            disabled={aiLoading || !issueDescription}
                            className="primary-btn shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none px-4 py-2 text-xs md:text-sm cursor-pointer"
                          >
                            {aiLoading ? "Analiz..." : "✨ AI Asistanı"}
                          </button>
                        </div>
                      </div>

                      {aiResult && (
                        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 text-blue-900 shadow-sm relative overflow-hidden animate-fade-in">
                          {/* Background decoration */}
                          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/10 rounded-full blur-xl pointer-events-none" />
                          <div className="flex items-center justify-between font-bold text-xs md:text-sm text-blue-800 mb-2 border-b border-blue-100 pb-1.5">
                            <span className="flex items-center gap-1.5">
                              <span className="animate-pulse">✨</span> Yapay Zeka Teşhisi ve Fiyatlandırma
                            </span>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                              ⏱️ {aiResult.predictedTime}
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-blue-700 leading-relaxed m-0 mb-3">{aiResult.reasoning}</p>
                          <div className="text-xs text-blue-800 font-semibold bg-white/80 border border-blue-100/50 rounded-lg p-2.5">
                            <strong className="text-blue-900">Önerilen Parçalar:</strong>{" "}
                            <span className="text-blue-700 font-normal">{aiResult.possibleParts.join(", ") || "Yok"}</span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Tahmini İşçilik Bedeli (TL)</label>
                          <input type="number" min={0} className="field w-full" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Tahmini Parça Bedeli (TL)</label>
                          <input type="number" min={0} className="field w-full" value={partCost} onChange={(e) => setPartCost(e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center border-t border-slate-200 pt-4 mt-2">
                        <div className="text-base md:text-lg font-extrabold text-slate-900">
                          Öngörülen Toplam: <span className="text-blue-700">{(Number(laborCost) + Number(partCost)).toLocaleString("tr-TR")} TL</span>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Cihaz Giriş Durumu</label>
                          <select className="field w-full" value={initialStatus} onChange={(e) => setInitialStatus(e.target.value as any)}>
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
            <div className="px-6 py-4 border-t border-slate-200 flex justify-between bg-slate-50/50 gap-3">
              {wizardStep > 1 ? (
                <button type="button" className="primary-btn px-4 py-2 bg-slate-600 text-white cursor-pointer" onClick={() => setWizardStep(prev => prev - 1)}>
                  Geri Dön
                </button>
              ) : (
                <button type="button" className="primary-btn px-4 py-2 bg-slate-600 text-white cursor-pointer" onClick={() => setIsNewModalOpen(false)}>
                  İptal Et
                </button>
              )}

              {wizardStep < 3 ? (
                <button
                  type="button"
                  className="primary-btn px-5 py-2 cursor-pointer ml-auto"
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
                    if (wizardStep === 2 && deviceMode === "CREATE" && (!newDevBrand || !newDevModel)) {
                      toast.warning("Lütfen cihaz marka ve model doldurun.");
                      return;
                    }

                    // Pre-fill fields for creation if using select modes to avoid blank submissions
                    setWizardStep(prev => prev + 1);
                  }}
                >
                  Sonraki Adım
                </button>
              ) : (
                <button type="button" className="primary-btn px-6 py-2 cursor-pointer ml-auto" onClick={handleCreateRepair} disabled={loading}>
                  {loading ? "Kaydediliyor..." : "Arıza Kaydını Aç"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. REPAIR DETAIL & STATUS ACTION MODAL */}
      {isDetailModalOpen && selectedRepair && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 p-3 backdrop-blur-sm animate-fade-in sm:p-4">
          <div className="flex h-full w-full items-center justify-center">
            <div className="panel translate-y-[200px] flex w-full max-w-5xl max-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-0 shadow-2xl backdrop-blur-md sm:max-h-[calc(100vh-2rem)]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="m-0 text-lg font-bold text-slate-900">Servis Kaydı Detayları</h3>
                <p className="m-0 text-slate-400 text-xs mt-0.5 font-mono">Kayıt No: #{getNumericServiceNo(selectedRepair)}</p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors w-8 h-8 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-white p-4 md:p-6 flex flex-col gap-6">
              {/* Row 1: Customer & Device Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="panel p-4 bg-slate-50/80 border-slate-200/60 shadow-xs hover:border-slate-200">
                  <h4 className="m-0 mb-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Müşteri Bilgileri</h4>
                  <div className="font-bold text-sm text-slate-900">{selectedRepair.device.customer.fullName}</div>
                  <div className="text-xs text-slate-600 mt-1">📞 {selectedRepair.device.customer.phone}</div>
                  {selectedRepair.device.customer.email && <div className="text-xs text-slate-500 mt-0.5">📧 {selectedRepair.device.customer.email}</div>}
                </div>

                <div className="panel p-4 bg-slate-50/80 border-slate-200/60 shadow-xs hover:border-slate-200">
                  <h4 className="m-0 mb-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Cihaz Bilgileri</h4>
                  <div className="font-bold text-sm text-slate-900">{selectedRepair.device.brand} {selectedRepair.device.model} {selectedRepair.device.storage || ""}</div>
                  <div className="text-xs text-slate-600 mt-1">🏷️ IMEI: {selectedRepair.device.imei || "-"}</div>
                  {selectedRepair.device.color && <div className="text-xs text-slate-500 mt-0.5">🎨 Renk: {selectedRepair.device.color}</div>}
                </div>
              </div>

              {/* Row 2: Condition Pre-Check Results */}
              <div>
                <h4 className="m-0 mb-3 text-xs font-bold text-slate-900 uppercase tracking-widest">Ön Kontrol Durumu</h4>
                <PhoneVisualExpertise value={editChecklist} onChange={setEditChecklist} />
                
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                  {CHECKLIST_KEYS.map((ck) => {
                    const state = editChecklist[ck.key] || "NA";
                    return (
                      <div key={ck.key} className="flex justify-between items-center py-1.5 px-3 border border-slate-200/50 bg-white rounded-lg shadow-2xs">
                        <span className="text-xs font-semibold text-slate-700">{ck.label}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setEditChecklist(prev => ({ ...prev, [ck.key]: "OK" }))}
                            className={`border-0 rounded-md w-7 h-6 cursor-pointer text-xs font-bold transition-colors ${
                              state === "OK" ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                            }`}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditChecklist(prev => ({ ...prev, [ck.key]: "BAD" }))}
                            className={`border-0 rounded-md w-7 h-6 cursor-pointer text-xs font-bold transition-colors ${
                              state === "BAD" ? "bg-rose-500 text-white shadow-sm" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                            }`}
                          >
                            &times;
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditChecklist(prev => ({ ...prev, [ck.key]: "NA" }))}
                            className={`border-0 rounded-md w-7 h-6 cursor-pointer text-xs font-bold transition-colors ${
                              state === "NA" ? "bg-slate-500 text-white shadow-sm" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                            }`}
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
                <h4 className="m-0 mb-3 text-xs font-bold text-slate-900 uppercase tracking-widest">Servis Kaydı Güncelle</h4>
                <div className="grid gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Müşteri Şikayeti / Arıza Tanımı</label>
                    <input className="field w-full" value={editIssue} onChange={(e) => setEditIssue(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Teknisyen Teşhis ve Kozmetik Notları</label>
                    <textarea className="field w-full min-h-[70px]" value={editCustomNote} onChange={(e) => setEditCustomNote(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">İşçilik Bedeli (TL)</label>
                      <input type="number" min={0} className="field w-full" value={editLabor} onChange={(e) => setEditLabor(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Yedek Parça Bedeli (TL)</label>
                      <input type="number" min={0} className="field w-full" value={editPart} onChange={(e) => setEditPart(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Güncel Durum</label>
                      <select
                        className="field w-full font-bold"
                        value={editStatus}
                        disabled={selectedRepair?.status === "DELIVERED" || selectedRepair?.status === "CANCELED"}
                        onChange={(e) => {
                          const newStatus = e.target.value as any;
                          setEditStatus(newStatus);
                          if (newStatus === "DELIVERED" && banks.length > 0 && !editBankAccountId) {
                            setEditBankAccountId(banks[0].id);
                          }
                        }}
                      >
                        <option value="RECEIVED">Teslim Alındı</option>
                        <option value="IN_PROGRESS">Onarımda</option>
                        <option value="WAITING_PART">Parça Bekliyor</option>
                        <option value="READY">Hazır (Tamamlandı)</option>
                        <option value="DELIVERED">Müşteriye Teslim Edildi</option>
                        <option value="CANCELED">İptal Edildi</option>
                      </select>
                      {(selectedRepair?.status === "DELIVERED" || selectedRepair?.status === "CANCELED") && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          Teslim edilmiş/iptal edilmiş kayıtların durumu, oluşturulan fatura ve kasa hareketi nedeniyle değiştirilemez.
                        </p>
                      )}
                    </div>
                  </div>

                  {editStatus === "DELIVERED" && selectedRepair?.status !== "DELIVERED" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-blue-200/50 bg-blue-50/20 p-4.5 rounded-2xl animate-fade-in col-span-full">
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Ödeme Yöntemi</label>
                        <select 
                          className="field w-full bg-white font-bold" 
                          value={editPaymentMethod} 
                          onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                        >
                          <option value="CASH">Nakit</option>
                          <option value="CREDIT_CARD">Kredi Kartı</option>
                          <option value="ON_ACCOUNT">Cari Hesap (Veresiye)</option>
                        </select>
                      </div>
                      
                      {(editPaymentMethod === "CASH" || editPaymentMethod === "CREDIT_CARD") && (
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase tracking-wide">Kasa / Banka Hesabı</label>
                          <select 
                            className="field w-full bg-white font-bold" 
                            value={editBankAccountId} 
                            onChange={(e) => setEditBankAccountId(e.target.value)}
                          >
                            {banks.map((b) => (
                              <option key={b.id} value={b.id}>{b.name} ({Number(b.balance).toLocaleString("tr-TR")} TL)</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-sm md:text-base font-extrabold mt-2 flex justify-between items-center border-t border-slate-200 pt-4">
                    <span>Toplam Hizmet Bedeli: <span className="text-blue-700">{(Number(editLabor) + Number(editPart)).toLocaleString("tr-TR")} TL</span></span>
                  </div>
                </div>
              </div>

              {/* Row 4: Action Tools (Print & Notification Hooks) */}
              <div className="border-t border-dashed border-slate-200 pt-4">
                <h4 className="m-0 mb-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Hızlı İşlemler</h4>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => printKabulFisi(selectedRepair)}
                    className="primary-btn bg-slate-600 hover:bg-slate-700 text-white text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 py-2.5 px-4 flex-1 min-w-[150px] cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.617 0-1.11-.5-1.12-1.129L6.34 18m11.32 0a3 3 0 000-6a3 3 0 00-11.32 0M16.5 6V4.5A1.5 1.5 0 0015 3H9a1.5 1.5 0 00-1.5 1.5V6m9 0H6" />
                    </svg>
                    Kabul Fişi Yazdır (80mm)
                  </button>

                  <button
                    onClick={() => printTeslimFisi(selectedRepair)}
                    className="primary-btn bg-slate-700 hover:bg-slate-800 text-white text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 py-2.5 px-4 flex-1 min-w-[150px] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    disabled={editStatus !== "DELIVERED" && selectedRepair.status !== "DELIVERED"}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Teslim Fişi Yazdır (80mm)
                  </button>

                  <button
                    onClick={() => sendWhatsAppNotification(selectedRepair)}
                    className="primary-btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 py-2.5 px-4 flex-[1.2] min-w-[180px] cursor-pointer border-0"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.022-.08-.103-.128-.352-.253-.25-.125-1.478-.73-1.705-.813-.228-.083-.393-.128-.559.127-.166.255-.641.81-.786.975-.145.166-.29.185-.54.06-.25-.125-1.048-.385-1.996-1.23-.737-.657-1.235-1.47-1.38-1.725-.144-.255-.015-.393.11-.517.113-.112.25-.29.375-.435.125-.145.166-.25.25-.417.083-.166.042-.31-.02-.435-.062-.125-.56-1.348-.767-1.85-.203-.491-.408-.423-.559-.43-.145-.008-.313-.01-.482-.01-.17 0-.445.064-.679.314-.234.25-.893.874-.893 2.132 0 1.258.916 2.474 1.043 2.643.127.17 1.8 2.748 4.36 3.856.61.264 1.085.422 1.458.54.613.195 1.17.168 1.61.102.49-.074 1.477-.604 1.684-1.19.207-.585.207-1.085.145-1.19m-5.466 7.42h-.008c-2.277 0-4.516-.612-6.47-1.767L3.5 21.048l1.398-5.105c-1.265-2.19-1.93-4.707-1.93-7.29 0-7.854 6.39-14.24 14.246-14.24 3.803 0 7.377 1.48 10.063 4.167A14.16 14.16 0 0124 8.65c0 7.855-6.39 14.242-14.243 14.242" />
                    </svg>
                    WhatsApp ile Bildir
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-4 py-3 md:px-6 md:py-4 flex justify-end gap-2">
              <button
                className="primary-btn px-4 py-2 bg-slate-600 text-white cursor-pointer"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Kapat
              </button>
              <button
                className="primary-btn px-5 py-2 cursor-pointer"
                onClick={handleUpdateRepair}
                disabled={savingEdit}
              >
                {savingEdit ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
