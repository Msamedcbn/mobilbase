"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

interface PriceRecord {
  model: string;
  originalName: string;
  originalPrice: string;
  equivalentName: string;
  equivalentPrice: string;
  revisionName: string;
  revisionPrice: string;
}

interface GroupedOption {
  type: "original" | "equivalent" | "revision";
  name: string;
  price: string;
}

interface GroupedCategory {
  category: string;
  options: GroupedOption[];
}

interface GroupedModel {
  model: string;
  brand: "iPhone" | "iPad" | "MacBook" | "Android";
  categories: GroupedCategory[];
}

export function PartsPriceClient({ initialData }: { initialData: PriceRecord[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState<"Tümü" | "iPhone" | "Android" | "iPad" | "MacBook">("Tümü");
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [customers, setCustomers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  // Modal states
  const [selectedModel, setSelectedModel] = useState<GroupedModel | null>(null);
  const [customerMode, setCustomerMode] = useState<"SELECT" | "CREATE">("SELECT");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  // Multiple repairs state
  interface SelectedRepairItem {
    id: string;
    category: string;
    optionName: string;
    partCost: number;
    laborCost: number;
  }
  const [selectedRepairsList, setSelectedRepairsList] = useState<SelectedRepairItem[]>([]);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");

  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);

  const [newDevStorage, setNewDevStorage] = useState("128GB");
  const [newDevImei, setNewDevImei] = useState("");
  const [newDevColor, setNewDevColor] = useState("");
  const [newDevCondNote, setNewDevCondNote] = useState("");

  const [laborCost, setLaborCost] = useState("250"); // Default labor cost
  const [partCost, setPartCost] = useState("0");
  const [issueDescription, setIssueDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Fetch customers and devices on load
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/customers");
        const json = await res.json();
        if (res.ok && json.data) {
          setCustomers(json.data);
        } else if (Array.isArray(json)) {
          setCustomers(json);
        }
      } catch (err) {
        console.error("Müşteri listesi çekilirken hata oluştu:", err);
      }

      try {
        const res = await fetch("/api/devices");
        const json = await res.json();
        if (res.ok && json.data) {
          setDevices(json.data);
        } else if (Array.isArray(json)) {
          setDevices(json);
        }
      } catch (err) {
        console.error("Cihaz listesi çekilirken hata oluştu:", err);
      }
    }
    loadData();
  }, []);

  // Filter devices belonging to the selected customer
  const customerDevices = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === "new") return [];
    return devices.filter((d) => d.customerId === selectedCustomerId);
  }, [devices, selectedCustomerId]);

  // Helper: brand classification & name cleaning
  const detectBrand = (model: string): { brand: "iPhone" | "iPad" | "MacBook" | "Android"; cleanModel: string } => {
    const m = model.trim();
    const upper = m.toUpperCase();
    if (upper.includes("İPHONE") || upper.includes("IPHONE")) {
      return { brand: "iPhone", cleanModel: m };
    }
    if (upper.includes("İPAD") || upper.includes("IPAD")) {
      return { brand: "iPad", cleanModel: m };
    }
    if (upper.includes("MACBOOK")) {
      return { brand: "MacBook", cleanModel: m };
    }
    // Default fallback to Android if it's Samsung, Xiaomi, or otherwise
    return { brand: "Android", cleanModel: m };
  };

  // Helper: group repair label from a row
  const getCategoryFromRow = (row: PriceRecord): string => {
    const checkStr = `${row.originalName} ${row.equivalentName} ${row.revisionName}`.toUpperCase();
    if (checkStr.includes("BATARYA")) return "BATARYA DEĞİŞİMİ";
    if (checkStr.includes("EKRAN")) return "EKRAN DEĞİŞİMİ";
    if (checkStr.includes("FACE ID") || checkStr.includes("TRUDEP")) return "FACE ID TRUDEP DEĞİŞİMİ";
    if (checkStr.includes("ARKA CAM")) return "ARKA CAM DEĞİŞİMİ";
    if (checkStr.includes("ARKA KAMERA") || checkStr.includes("ÖN KAMERA") || checkStr.includes("KAMERA")) return "ARKA KAMERA DEĞİŞİMİ";
    if (checkStr.includes("DİĞER")) return "DİĞER HASAR ONARIMLARI";

    const first = [row.originalName, row.equivalentName, row.revisionName].find(Boolean) || "";
    if (first) {
      return first.replace(/ORJİNAL|MUADİL|REVİZE/gi, "").trim().toUpperCase();
    }
    return "DİĞER ONARIMLAR";
  };

  // Helper: clean numeric price string
  const cleanNumericPrice = (priceStr: string): string => {
    if (!priceStr) return "0";
    const cleaned = priceStr.replace(/[^0-9]/g, "");
    return cleaned || "0";
  };

  // Group raw rows into structured models
  const groupedModels = useMemo(() => {
    const modelMap: Record<string, GroupedModel> = {};

    initialData.forEach((row) => {
      const rawModel = row.model.trim();
      if (!rawModel) return;

      if (!modelMap[rawModel]) {
        const { brand } = detectBrand(rawModel);
        modelMap[rawModel] = {
          model: rawModel,
          brand,
          categories: [],
        };
      }

      const modelGroup = modelMap[rawModel];
      const categoryName = getCategoryFromRow(row);

      const options: GroupedOption[] = [];
      if (row.originalName && !row.originalName.toUpperCase().includes("SUNULMUYOR")) {
        options.push({
          type: "original",
          name: row.originalName.trim(),
          price: row.originalPrice.trim(),
        });
      }
      if (row.equivalentName && !row.equivalentName.toUpperCase().includes("SUNULMUYOR")) {
        options.push({
          type: "equivalent",
          name: row.equivalentName.trim(),
          price: row.equivalentPrice.trim(),
        });
      }
      if (row.revisionName && !row.revisionName.toUpperCase().includes("SUNULMUYOR")) {
        options.push({
          type: "revision",
          name: row.revisionName.trim(),
          price: row.revisionPrice.trim(),
        });
      }

      if (options.length > 0) {
        let catGroup = modelGroup.categories.find((c) => c.category === categoryName);
        if (!catGroup) {
          catGroup = { category: categoryName, options: [] };
          modelGroup.categories.push(catGroup);
        }
        options.forEach((opt) => {
          if (!catGroup!.options.some((existing) => existing.name === opt.name)) {
            catGroup!.options.push(opt);
          }
        });
      }
    });

    return Object.values(modelMap);
  }, [initialData]);

  // Filtered models by search and tab
  const filteredModels = useMemo(() => {
    return groupedModels.filter((m) => {
      // 1. Tab filter
      if (selectedTab !== "Tümü" && m.brand !== selectedTab) {
        return false;
      }

      // 2. Search query filter
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      if (m.model.toLowerCase().includes(term)) return true;

      return m.categories.some((cat) => {
        if (cat.category.toLowerCase().includes(term)) return true;
        return cat.options.some((opt) => opt.name.toLowerCase().includes(term));
      });
    });
  }, [groupedModels, selectedTab, searchTerm]);

  // Accordion toggle
  const toggleAccordion = (model: string, category: string) => {
    const key = `${model}-${category}`;
    setExpandedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Open modal handler
  const handleOpenModal = (modelGroup: GroupedModel) => {
    setSelectedModel(modelGroup);
    setCustomerMode("SELECT");
    setSelectedCustomerId("");
    setSelectedDeviceId("");
    setNewCustName("");
    setNewCustPhone("");
    setNewCustEmail("");
    setNewDevStorage("128GB");
    setNewDevImei("");
    setNewDevColor("");
    setNewDevCondNote("");

    // Prefill first available category and option
    if (modelGroup.categories.length > 0) {
      const firstCat = modelGroup.categories[0];
      setSelectedCategoryName(firstCat.category);
      if (firstCat.options.length > 0) {
        const firstOpt = firstCat.options[0];
        setSelectedOptionIndex(0);
        const cost = Number(cleanNumericPrice(firstOpt.price));
        const initialItem: SelectedRepairItem = {
          id: Math.random().toString(36).substring(7),
          category: firstCat.category,
          optionName: firstOpt.name,
          partCost: cost,
          laborCost: 250,
        };
        setSelectedRepairsList([initialItem]);
        setPartCost(String(cost));
        setLaborCost("250");
        setIssueDescription(`${modelGroup.model} ${firstOpt.name}`);
      } else {
        setSelectedOptionIndex(0);
        setSelectedRepairsList([]);
        setPartCost("0");
        setLaborCost("250");
        setIssueDescription(`${modelGroup.model} Teknik Servis Onarımı`);
      }
    } else {
      setSelectedCategoryName("");
      setSelectedOptionIndex(0);
      setSelectedRepairsList([]);
      setPartCost("0");
      setLaborCost("250");
      setIssueDescription(`${modelGroup.model} Teknik Servis Onarımı`);
    }
  };

  // Recalculate totals helper
  const recalculateTotals = (list: SelectedRepairItem[]) => {
    if (list.length === 0) {
      setIssueDescription("");
      setPartCost("0");
      setLaborCost("0");
      return;
    }
    const desc = list.map((item) => `${selectedModel?.model} ${item.optionName}`).join(" + ");
    setIssueDescription(desc);

    const totalPart = list.reduce((sum, item) => sum + item.partCost, 0);
    setPartCost(String(totalPart));

    const totalLabor = list.reduce((sum, item) => sum + item.laborCost, 0);
    setLaborCost(String(totalLabor));
  };

  // Add repair to selected list
  const handleAddRepair = () => {
    if (!selectedCategoryName || !selectedModel) return;
    const catObj = selectedModel.categories.find((c) => c.category === selectedCategoryName);
    const opt = catObj?.options[selectedOptionIndex];
    if (!opt) return;

    if (selectedRepairsList.some((item) => item.category === selectedCategoryName && item.optionName === opt.name)) {
      toast.warning("Bu arıza zaten eklenmiş.");
      return;
    }

    const cost = Number(cleanNumericPrice(opt.price));
    const newItem: SelectedRepairItem = {
      id: Math.random().toString(36).substring(7),
      category: selectedCategoryName,
      optionName: opt.name,
      partCost: cost,
      laborCost: 250,
    };

    const updatedList = [...selectedRepairsList, newItem];
    setSelectedRepairsList(updatedList);
    recalculateTotals(updatedList);
    toast.success("Arıza listeye eklendi.");
  };

  // Remove repair from selected list
  const handleRemoveRepair = (id: string) => {
    const updatedList = selectedRepairsList.filter((item) => item.id !== id);
    setSelectedRepairsList(updatedList);
    recalculateTotals(updatedList);
  };

  // Handle Category selection change inside modal
  const handleCategoryChange = (catName: string) => {
    setSelectedCategoryName(catName);
    setSelectedOptionIndex(0);
    const catObj = selectedModel?.categories.find((c) => c.category === catName);
    if (catObj && catObj.options.length > 0) {
      const opt = catObj.options[0];
      setPartCost(cleanNumericPrice(opt.price));
      setIssueDescription(`${selectedModel?.model} ${opt.name}`);
    } else {
      setPartCost("0");
      setIssueDescription(`${selectedModel?.model} Onarımı`);
    }
  };

  // Handle Option selection change inside modal
  const handleOptionChange = (optIdx: number) => {
    setSelectedOptionIndex(optIdx);
    const catObj = selectedModel?.categories.find((c) => c.category === selectedCategoryName);
    if (catObj && catObj.options[optIdx]) {
      const opt = catObj.options[optIdx];
      setPartCost(cleanNumericPrice(opt.price));
      setIssueDescription(`${selectedModel?.model} ${opt.name}`);
    }
  };

  // Helper: map brand to manufacturer for the database
  const getSaveDetails = (modelGroup: GroupedModel) => {
    const raw = modelGroup.model.trim();
    if (modelGroup.brand === "iPhone" || modelGroup.brand === "iPad" || modelGroup.brand === "MacBook") {
      return { brand: "Apple", model: raw };
    }
    // Android matching
    const upper = raw.toUpperCase();
    if (upper.includes("SAMSUNG")) return { brand: "Samsung", model: raw.replace(/SAMSUNG/gi, "").trim() };
    if (upper.includes("XIAOMI")) return { brand: "Xiaomi", model: raw.replace(/XIAOMI/gi, "").trim() };
    if (upper.includes("REDMI")) return { brand: "Xiaomi", model: raw };
    if (upper.includes("HUAWEI")) return { brand: "Huawei", model: raw.replace(/HUAWEI/gi, "").trim() };

    return { brand: "Diğer", model: raw };
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let finalCustomerId = selectedCustomerId;

      // 1. Create customer if new
      if (customerMode === "CREATE" || selectedCustomerId === "new") {
        if (!newCustName || !newCustPhone) {
          toast.warning("Lütfen müşteri adı ve telefonunu doldurun.");
          setSubmitting(false);
          return;
        }

        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: newCustName,
            phone: newCustPhone,
            email: newCustEmail || null,
            notes: "Cihaz Fiyat Listesinden otomatik müşteri kaydı.",
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Müşteri oluşturulamadı.");
        finalCustomerId = json.id || json.data?.id;
      }

      if (!finalCustomerId) {
        toast.warning("Lütfen bir müşteri seçin veya yeni kayıt oluşturun.");
        setSubmitting(false);
        return;
      }

      let finalDeviceId = selectedDeviceId;

      if (selectedDeviceId) {
        // Optionally update existing device details if they were modified in the form
        const existingDev = devices.find((d) => d.id === selectedDeviceId);
        const hasChanges =
          existingDev &&
          (existingDev.storage !== newDevStorage ||
            existingDev.color !== newDevColor ||
            existingDev.imei !== newDevImei ||
            existingDev.conditionNote !== newDevCondNote);

        if (hasChanges) {
          try {
            await fetch(`/api/devices/${selectedDeviceId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                storage: newDevStorage,
                imei: newDevImei || null,
                color: newDevColor || null,
                conditionNote: newDevCondNote || null,
              }),
            });
          } catch (err) {
            console.error("Cihaz bilgileri güncellenirken hata oluştu:", err);
          }
        }
      } else {
        // 2. Create device
        const { brand, model } = getSaveDetails(selectedModel!);
        const devRes = await fetch("/api/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: finalCustomerId,
            brand,
            model,
            storage: newDevStorage,
            imei: newDevImei || null,
            color: newDevColor || null,
            conditionNote: newDevCondNote || null,
          }),
        });
        const devJson = await devRes.json();
        if (!devRes.ok) throw new Error(devJson.error ?? "Cihaz oluşturulamadı.");
        finalDeviceId = devJson.id || devJson.data?.id;
      }

      // 3. Create repair record
      const totalCost = Number(partCost) + Number(laborCost);

      const autoChecklist: Record<string, "OK" | "BAD" | "NA"> = {
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
      };

      selectedRepairsList.forEach((item) => {
        const checkStr = `${item.category} ${item.optionName}`.toUpperCase();
        if (checkStr.includes("EKRAN") || checkStr.includes("DOKUNMATİK")) {
          autoChecklist.screen = "BAD";
        }
        if (checkStr.includes("BATARYA") || checkStr.includes("PİL") || checkStr.includes("BATTERY")) {
          autoChecklist.battery = "BAD";
        }
        if (checkStr.includes("ÖN KAMERA")) {
          autoChecklist.frontCam = "BAD";
        } else if (checkStr.includes("ARKA KAMERA") || checkStr.includes("KAMERA")) {
          autoChecklist.backCam = "BAD";
        }
        if (
          checkStr.includes("ŞARJ") ||
          checkStr.includes("SOKET") ||
          checkStr.includes("KONNEKTÖR") ||
          checkStr.includes("TYPE-C") ||
          checkStr.includes("LIGHTNING")
        ) {
          autoChecklist.chargingPort = "BAD";
        }
        if (checkStr.includes("AHİZE") || checkStr.includes("HOPARLÖR") || checkStr.includes("SES")) {
          if (checkStr.includes("SES TUŞ")) {
            autoChecklist.buttons = "BAD";
          } else {
            autoChecklist.speaker = "BAD";
          }
        }
        if (checkStr.includes("MİKROFON")) {
          autoChecklist.mic = "BAD";
        }
        if (checkStr.includes("WİFİ") || checkStr.includes("BLUETOOTH")) {
          autoChecklist.wifi = "BAD";
        }
        if (checkStr.includes("ŞEBEKE") || checkStr.includes("SİNYAL") || checkStr.includes("ANTEN")) {
          autoChecklist.network = "BAD";
        }
        if (checkStr.includes("TUŞ") || checkStr.includes("BUTON") || checkStr.includes("POWER") || checkStr.includes("HOME")) {
          autoChecklist.buttons = "BAD";
        }
        if (checkStr.includes("FACE ID") || checkStr.includes("TRUDEP")) {
          autoChecklist.frontCam = "BAD";
        }
      });

      const repRes = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: finalDeviceId,
          issueDescription: issueDescription || "Cihaz Onarımı",
          diagnosisNote: JSON.stringify({
            checklist: autoChecklist,
            note: newDevCondNote || "",
          }),
          laborCost: Number(laborCost),
          partCost: Number(partCost),
          totalCost,
          status: "RECEIVED",
        }),
      });

      const repJson = await repRes.json();
      if (!repRes.ok) throw new Error(repJson.error ?? "Servis kaydı oluşturulamadı.");

      toast.success("Teknik servis talebi başarıyla açıldı!");

      // Refresh customers and devices lists
      const custRes = await fetch("/api/customers");
      const custJson = await custRes.json();
      if (custRes.ok) {
        setCustomers(custJson.data || custJson);
      }

      const devResList = await fetch("/api/devices");
      const devJsonList = await devResList.json();
      if (devResList.ok) {
        setDevices(devJsonList.data || devJsonList);
      }

      setSelectedModel(null);
    } catch (error: any) {
      toast.error(error.message || "Bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryObj = selectedModel?.categories.find((c) => c.category === selectedCategoryName);

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header section matching premium white design */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "800",
            color: "var(--text)",
            margin: "0 0 0.5rem 0",
            letterSpacing: "-0.025em",
          }}
        >
          Cihaz Tamir Fiyatları
        </h1>
        <p style={{ fontSize: "1rem", color: "var(--muted)", margin: 0, maxWidth: "600px", marginInline: "auto" }}>
          Tüm cihaz modellerimiz için güncel tamir ve parça değişim fiyatlarımızı inceleyebilirsiniz.
        </p>
      </div>

      {/* Tabs and Search Panel */}
      <div
        className="panel"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            justifyContent: "space-between",
            alignItems: "stretch",
          }}
        >
          {/* Tab buttons */}
          <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "4px" }}>
            {(["Tümü", "iPhone", "Android", "iPad", "MacBook"] as const).map((tab) => {
              const active = selectedTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  style={{
                    border: active ? "none" : "1px solid var(--border)",
                    backgroundColor: active ? "var(--accent)" : "transparent",
                    color: active ? "white" : "var(--text)",
                    padding: "0.55rem 1.25rem",
                    borderRadius: "10px",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Search box with SVG icon */}
          <div style={{ position: "relative", width: "100%" }}>
            <span
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Model ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem 1rem 0.75rem 2.75rem",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--surface-soft)",
                color: "var(--text)",
                fontSize: "0.95rem",
                outline: "none",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
        </div>
      </div>

      {/* Pricing Grid matching screenshot style */}
      {filteredModels.length === 0 ? (
        <div
          className="panel"
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          <p style={{ fontSize: "1.1rem", color: "var(--muted)", margin: 0 }}>
            Arama kriterlerinize uygun cihaz veya onarım bulunamadı.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          }}
        >
          {filteredModels.map((modelGroup) => {
            // Pick icon depending on brand type
            let deviceIcon = (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
            );
            if (modelGroup.brand === "iPad") {
              deviceIcon = (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="20" x2="12.01" y2="20"></line>
                </svg>
              );
            } else if (modelGroup.brand === "MacBook") {
              deviceIcon = (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="2" y1="20" x2="22" y2="20"></line>
                  <line x1="12" y1="17" x2="12" y2="17"></line>
                </svg>
              );
            }

            return (
              <div
                key={modelGroup.model}
                className="panel"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow)",
                  display: "flex",
                  flexDirection: "column",
                  padding: 0,
                  overflow: "hidden",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    padding: "1.25rem",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    background: "var(--surface-soft)",
                  }}
                >
                  <div style={{ color: "var(--accent)", display: "flex", alignItems: "center" }}>{deviceIcon}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "var(--text)" }}>
                      {modelGroup.model.toUpperCase()}
                    </h3>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: "700",
                        color: "white",
                        backgroundColor:
                          modelGroup.brand === "iPhone"
                            ? "#10b981"
                            : modelGroup.brand === "iPad"
                            ? "#3b82f6"
                            : modelGroup.brand === "MacBook"
                            ? "#6366f1"
                            : "#f59e0b",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "6px",
                        textTransform: "uppercase",
                        display: "inline-block",
                        marginTop: "2px",
                      }}
                    >
                      {modelGroup.brand}
                    </span>
                  </div>
                </div>

                {/* Accordion list of repairs */}
                <div style={{ flex: 1, padding: "0.5rem 0" }}>
                  {modelGroup.categories.map((cat) => {
                    const isExpanded = expandedKeys[`${modelGroup.model}-${cat.category}`];
                    return (
                      <div
                        key={cat.category}
                        style={{
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {/* Accordion Trigger */}
                        <div
                          onClick={() => toggleAccordion(modelGroup.model, cat.category)}
                          style={{
                            padding: "0.9rem 1.25rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            fontWeight: "700",
                            fontSize: "0.85rem",
                            color: "var(--text)",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-soft)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {cat.category === "BATARYA DEĞİŞİMİ" ? (
                              <span>🔋</span>
                            ) : cat.category === "EKRAN DEĞİŞİMİ" ? (
                              <span>📱</span>
                            ) : cat.category === "FACE ID TRUDEP DEĞİŞİMİ" ? (
                              <span>😊</span>
                            ) : cat.category === "ARKA CAM DEĞİŞİMİ" ? (
                              <span>📱</span>
                            ) : cat.category === "ARKA KAMERA DEĞİŞİMİ" ? (
                              <span>📷</span>
                            ) : (
                              <span>⚙️</span>
                            )}
                            {cat.category}
                          </div>
                          <span style={{ color: "var(--muted)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                            ▼
                          </span>
                        </div>

                        {/* Accordion Content */}
                        {isExpanded && (
                          <div style={{ padding: "0.5rem 1.25rem 1rem 1.25rem", backgroundColor: "var(--surface-soft)" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              {cat.options.map((opt, oIdx) => {
                                let badgeColor = "#64748b"; // Muadil (grey)
                                let bg = "#f8fafc";
                                let text = "#334155";
                                if (opt.type === "original") {
                                  badgeColor = "#14b8a6"; // Original (teal)
                                  bg = "#f0fdfa";
                                  text = "#0f766e";
                                } else if (opt.type === "revision") {
                                  badgeColor = "#3b82f6"; // Revision (blue)
                                  bg = "#eff6ff";
                                  text = "#1d4ed8";
                                }

                                return (
                                  <div
                                    key={oIdx}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "0.6rem 0.8rem",
                                      borderRadius: "8px",
                                      border: "1px solid var(--border)",
                                      backgroundColor: bg,
                                      fontSize: "0.85rem",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                      <span
                                        style={{
                                          width: "6px",
                                          height: "6px",
                                          borderRadius: "50%",
                                          backgroundColor: badgeColor,
                                        }}
                                      ></span>
                                      <span style={{ fontWeight: "600", color: text }}>{opt.name}</span>
                                    </div>
                                    <span style={{ fontWeight: "800", color: "var(--text)" }}>
                                      {opt.price.includes("TEKLİF") ? opt.price : `${opt.price} TL`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Card Footer Button */}
                <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border)" }}>
                  <button
                    onClick={() => handleOpenModal(modelGroup)}
                    style={{
                      width: "100%",
                      padding: "0.65rem",
                      backgroundColor: "transparent",
                      border: "1px solid var(--accent)",
                      color: "var(--accent)",
                      borderRadius: "10px",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "0.4rem",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--accent)";
                      e.currentTarget.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "var(--accent)";
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    Servis Talebi Oluştur
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE TECHNICAL SERVICE REQUEST MODAL */}
      {selectedModel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <div
            className="panel"
            style={{
              width: "min(640px, 95vw)",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              overflow: "hidden",
              background: "var(--surface)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--surface-soft)",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "800", color: "var(--text)" }}>
                  Teknik Servis Talebi Oluştur
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>
                  {selectedModel.model} için yeni iş emri kaydı.
                </p>
              </div>
              <button
                onClick={() => setSelectedModel(null)}
                style={{
                  border: 0,
                  background: "transparent",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: "0.2rem",
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} style={{ overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                
                {/* SECTION 1: CUSTOMER */}
                <div>
                  <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", fontWeight: "700", textTransform: "uppercase", color: "var(--accent)" }}>
                    1. Müşteri Bilgileri
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--muted)", marginBottom: "4px" }}>
                        Müşteri Seçimi
                      </label>
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedCustomerId(val);
                          setSelectedDeviceId("");
                          setNewDevStorage("128GB");
                          setNewDevColor("");
                          setNewDevImei("");
                          setNewDevCondNote("");
                          if (val === "new") {
                            setCustomerMode("CREATE");
                          } else {
                            setCustomerMode("SELECT");
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "0.6rem 0.8rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--surface)",
                          fontSize: "0.9rem",
                        }}
                      >
                        <option value="">-- Müşteri Seçin --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.fullName} ({c.phone})
                          </option>
                        ))}
                        <option value="new" style={{ fontWeight: "bold", color: "var(--accent)" }}>
                          [+] Yeni Müşteri Tanımla
                        </option>
                      </select>
                    </div>

                    {(customerMode === "CREATE" || selectedCustomerId === "new") && (
                      <div
                        style={{
                          display: "grid",
                          gap: "0.75rem",
                          gridTemplateColumns: "1fr 1fr",
                          padding: "1rem",
                          background: "var(--surface-soft)",
                          borderRadius: "10px",
                          border: "1px dashed var(--border)",
                        }}
                      >
                        <div style={{ gridColumn: "span 2" }}>
                          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                            Müşteri Adı Soyadı *
                          </label>
                          <input
                            type="text"
                            placeholder="Örn: Ahmet Sevim"
                            value={newCustName}
                            onChange={(e) => setNewCustName(e.target.value)}
                            required
                            style={{
                              width: "100%",
                              padding: "0.55rem 0.75rem",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                              fontSize: "0.85rem",
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                            Telefon Numarası *
                          </label>
                          <input
                            type="text"
                            placeholder="Örn: 0555..."
                            value={newCustPhone}
                            onChange={(e) => setNewCustPhone(e.target.value)}
                            required
                            style={{
                              width: "100%",
                              padding: "0.55rem 0.75rem",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                              fontSize: "0.85rem",
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                            E-Posta Adresi
                          </label>
                          <input
                            type="email"
                            placeholder="Örn: mail@adres.com"
                            value={newCustEmail}
                            onChange={(e) => setNewCustEmail(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "0.55rem 0.75rem",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                              fontSize: "0.85rem",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 2: DEVICE */}
                <div>
                  <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", fontWeight: "700", textTransform: "uppercase", color: "var(--accent)" }}>
                    2. Cihaz Detayları
                  </h4>

                  {/* Quick Device Selector */}
                  {selectedCustomerId && selectedCustomerId !== "new" && customerDevices.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                        Kayıtlı Cihazlardan Seç (Hızlı Seçim)
                      </label>
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => {
                          const devId = e.target.value;
                          setSelectedDeviceId(devId);
                          if (devId) {
                            const dev = customerDevices.find((d) => d.id === devId);
                            if (dev) {
                              setNewDevStorage(dev.storage || "128GB");
                              setNewDevColor(dev.color || "");
                              setNewDevImei(dev.imei || "");
                              setNewDevCondNote(dev.conditionNote || "");
                            }
                          } else {
                            setNewDevStorage("128GB");
                            setNewDevColor("");
                            setNewDevImei("");
                            setNewDevCondNote("");
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "0.6rem 0.8rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--surface)",
                          fontSize: "0.85rem",
                          outline: "none",
                        }}
                      >
                        <option value="">-- Yeni Cihaz Tanımla (Boş Bırakın) --</option>
                        {customerDevices.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.brand} {d.model} ({d.storage || "Kapasite Yok"} - {d.color || "Renk Yok"} - {d.imei || "IMEI Yok"})
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const selectedDev = customerDevices.find((d) => d.id === selectedDeviceId);
                        if (selectedDev && selectedDev.model.toLowerCase().replace(/\s+/g, "") !== selectedModel.model.toLowerCase().replace(/\s+/g, "")) {
                          return (
                            <div style={{ marginTop: "4px", fontSize: "0.75rem", color: "#eab308", fontWeight: "600" }}>
                              ⚠️ Uyarı: Seçtiğiniz cihaz modeli ({selectedDev.brand} {selectedDev.model}) ile fiyatını incelediğiniz model ({selectedModel.model}) uyuşmuyor.
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--muted)", marginBottom: "4px" }}>
                        Cihaz Markası
                      </label>
                      <input
                        type="text"
                        value={getSaveDetails(selectedModel).brand}
                        disabled
                        style={{
                          width: "100%",
                          padding: "0.55rem 0.75rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--surface-soft)",
                          color: "var(--muted)",
                          fontSize: "0.85rem",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--muted)", marginBottom: "4px" }}>
                        Model
                      </label>
                      <input
                        type="text"
                        value={selectedModel.model}
                        disabled
                        style={{
                          width: "100%",
                          padding: "0.55rem 0.75rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--surface-soft)",
                          color: "var(--muted)",
                          fontSize: "0.85rem",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                        Kapasite / Hafıza
                      </label>
                      <select
                        value={newDevStorage}
                        onChange={(e) => setNewDevStorage(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.55rem 0.75rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          fontSize: "0.85rem",
                        }}
                      >
                        <option value="64GB">64 GB</option>
                        <option value="128GB">128 GB</option>
                        <option value="256GB">256 GB</option>
                        <option value="512GB">512 GB</option>
                        <option value="1TB">1 TB</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                        Renk
                      </label>
                      <input
                        type="text"
                        placeholder="Örn: Uzay Grisi"
                        value={newDevColor}
                        onChange={(e) => setNewDevColor(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.55rem 0.75rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          fontSize: "0.85rem",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                        IMEI Numarası
                      </label>
                      <input
                        type="text"
                        placeholder="15 Haneli IMEI"
                        value={newDevImei}
                        onChange={(e) => setNewDevImei(e.target.value)}
                        maxLength={15}
                        style={{
                          width: "100%",
                          padding: "0.55rem 0.75rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          fontSize: "0.85rem",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                        Fiziksel Durum / Çizikler
                      </label>
                      <input
                        type="text"
                        placeholder="Örn: Ekranda hafif kılcal çizik"
                        value={newDevCondNote}
                        onChange={(e) => setNewDevCondNote(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.55rem 0.75rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          fontSize: "0.85rem",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: REPAIR SELECTION */}
                <div>
                  <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", fontWeight: "700", textTransform: "uppercase", color: "var(--accent)" }}>
                    3. Arıza & Fiyatlandırma
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1.2fr auto", alignItems: "end" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                          Arıza Grubu
                        </label>
                        <select
                          value={selectedCategoryName}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.55rem 0.75rem",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--surface)",
                            color: "var(--text)",
                            fontSize: "0.85rem",
                            outline: "none",
                          }}
                        >
                          {selectedModel.categories.map((c) => (
                            <option key={c.category} value={c.category}>
                              {c.category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                          Yedek Parça / Onarım Tipi
                        </label>
                        <select
                          value={selectedOptionIndex}
                          onChange={(e) => handleOptionChange(Number(e.target.value))}
                          style={{
                            width: "100%",
                            padding: "0.55rem 0.75rem",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--surface)",
                            color: "var(--text)",
                            fontSize: "0.85rem",
                            outline: "none",
                          }}
                        >
                          {selectedCategoryObj?.options.map((opt, idx) => (
                            <option key={idx} value={idx}>
                              {opt.name} ({opt.price.includes("TEKLİF") ? opt.price : `${opt.price} TL`})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddRepair}
                        style={{
                          padding: "0.55rem 1.25rem",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: "var(--accent)",
                          color: "white",
                          fontSize: "0.85rem",
                          fontWeight: "700",
                          cursor: "pointer",
                          height: "36px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "filter 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.filter = "brightness(0.9)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.filter = "none";
                        }}
                      >
                        Listeye Ekle
                      </button>
                    </div>

                    {/* Selected repairs list */}
                    {selectedRepairsList.length > 0 && (
                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          padding: "0.75rem",
                          backgroundColor: "var(--surface-soft)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: "700",
                            marginBottom: "0.6rem",
                            color: "var(--text)",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>Seçilen Onarım Kalemleri ({selectedRepairsList.length})</span>
                          <span style={{ color: "var(--accent)" }}>
                            Toplam: {selectedRepairsList.reduce((sum, item) => sum + item.partCost + item.laborCost, 0)} TL
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {selectedRepairsList.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "0.5rem 0.75rem",
                                backgroundColor: "var(--surface)",
                                border: "1px solid var(--border)",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: "700", color: "var(--accent)" }}>{item.category}:</span>{" "}
                                <span style={{ color: "var(--text)" }}>{item.optionName}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <span style={{ color: "var(--muted)", fontWeight: "600" }}>
                                  {item.partCost} TL (P) + {item.laborCost} TL (İ)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRepair(item.id)}
                                  style={{
                                    border: "none",
                                    background: "none",
                                    color: "#ef4444",
                                    cursor: "pointer",
                                    fontSize: "1.25rem",
                                    lineHeight: "1",
                                    padding: "0 4px",
                                    display: "flex",
                                    alignItems: "center",
                                    fontWeight: "bold",
                                    transition: "color 0.2s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "#dc2626";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "#ef4444";
                                  }}
                                  title="Sil"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                        Yapılacak İşlem Açıklaması *
                      </label>
                      <textarea
                        value={issueDescription}
                        onChange={(e) => setIssueDescription(e.target.value)}
                        rows={2}
                        required
                        style={{
                          width: "100%",
                          padding: "0.55rem 0.75rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          fontSize: "0.85rem",
                          fontFamily: "inherit",
                          resize: "none",
                        }}
                      />
                    </div>

                    <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr 1fr" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                          Yedek Parça Bedeli (TL)
                        </label>
                        <input
                          type="number"
                          value={partCost}
                          onChange={(e) => setPartCost(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.55rem 0.75rem",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            fontSize: "0.85rem",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                          İşçilik Bedeli (TL)
                        </label>
                        <input
                          type="number"
                          value={laborCost}
                          onChange={(e) => setLaborCost(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.55rem 0.75rem",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            fontSize: "0.85rem",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--accent)", marginBottom: "4px" }}>
                          Toplam Fiyat
                        </label>
                        <div
                          style={{
                            width: "100%",
                            padding: "0.55rem 0.75rem",
                            borderRadius: "8px",
                            border: "1px solid var(--accent)",
                            backgroundColor: "var(--surface-soft)",
                            color: "var(--accent)",
                            fontWeight: "800",
                            fontSize: "0.95rem",
                            textAlign: "center",
                          }}
                        >
                          {Number(partCost || 0) + Number(laborCost || 0)} TL
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Actions */}
              <div
                style={{
                  padding: "1rem 1.5rem",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  background: "var(--surface-soft)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedModel(null)}
                  disabled={submitting}
                  style={{
                    padding: "0.6rem 1.25rem",
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                    color: "var(--text)",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  İptal Et
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "0.6rem 1.5rem",
                    border: "none",
                    backgroundColor: "var(--accent)",
                    color: "white",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {submitting ? "Kaydediliyor..." : "Servis Talebi Aç"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
