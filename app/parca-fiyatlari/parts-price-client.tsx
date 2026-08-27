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
interface ManagedPartRecord {
  id: string;
  brand: "iPhone" | "Android" | "iPad" | "MacBook";
  model: string;
  category: string;
  type: "original" | "equivalent" | "revision";
  partName: string;
  price: string;
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
  const [managedParts, setManagedParts] = useState<ManagedPartRecord[]>([]);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [manageBrand, setManageBrand] = useState<ManagedPartRecord["brand"]>("iPhone");
  const [manageModel, setManageModel] = useState("");
  const [manageCategory, setManageCategory] = useState("");
  const [manageType, setManageType] = useState<ManagedPartRecord["type"]>("original");
  const [managePartName, setManagePartName] = useState("");
  const [managePrice, setManagePrice] = useState("");
  const [manageSaving, setManageSaving] = useState(false);


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

  useEffect(() => {
    async function loadManagedParts() {
      try {
        const res = await fetch("/api/repair-price-items");
        const json = await res.json();
        if (res.ok) {
          const rows = Array.isArray(json?.data) ? json.data : [];
          setManagedParts(
            rows.map((row: any) => ({
              id: row.id,
              brand: row.brand,
              model: row.model,
              category: row.category,
              type: row.partType,
              partName: row.partName,
              price: String(Number(row.price || 0)),
            })),
          );
        }
      } catch {
        toast.error("Parca fiyat kayitlari yuklenemedi.");
      }
    }
    void loadManagedParts();
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

  const effectiveData = useMemo<PriceRecord[]>(() => {
    const dynamicRows = managedParts.map((r) => ({
      model: r.model.toUpperCase().includes(r.brand.toUpperCase()) ? r.model : `${r.brand} ${r.model}`,
      originalName: r.type === "original" ? r.partName : "SUNULMUYOR",
      originalPrice: r.type === "original" ? r.price : "",
      equivalentName: r.type === "equivalent" ? r.partName : "SUNULMUYOR",
      equivalentPrice: r.type === "equivalent" ? r.price : "",
      revisionName: r.type === "revision" ? r.partName : "SUNULMUYOR",
      revisionPrice: r.type === "revision" ? r.price : "",
    }));
    return [...initialData, ...dynamicRows];
  }, [initialData, managedParts]);

  // Group raw rows into structured models
  const groupedModels = useMemo(() => {
    const modelMap: Record<string, GroupedModel> = {};

    effectiveData.forEach((row) => {
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
  }, [effectiveData]);

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

  const resetManageForm = () => {
    setEditingPartId(null);
    setManageModel("");
    setManageCategory("");
    setManagePartName("");
    setManagePrice("");
  };

  const startEditPart = (row: ManagedPartRecord) => {
    setEditingPartId(row.id);
    setManageBrand(row.brand);
    setManageModel(row.model);
    setManageCategory(row.category);
    setManageType(row.type);
    setManagePartName(row.partName);
    setManagePrice(row.price);
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  const addManagedPart = async () => {
    if (!manageModel.trim() || !manageCategory.trim() || !managePartName.trim() || !managePrice.trim()) {
      toast.error("Marka/model/parça/fiyat alanlarını doldurun.");
      return;
    }
    setManageSaving(true);
    try {
      const url = editingPartId ? `/api/repair-price-items/${editingPartId}` : "/api/repair-price-items";
      const method = editingPartId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: manageBrand,
          model: manageModel.trim(),
          category: manageCategory.trim(),
          partType: manageType,
          partName: managePartName.trim(),
          price: Number(managePrice),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kayıt kaydedilemedi");
      const row = json.data;
      const updatedRecord: ManagedPartRecord = {
        id: row.id,
        brand: row.brand,
        model: row.model,
        category: row.category,
        type: row.partType,
        partName: row.partName,
        price: String(Number(row.price || 0)),
      };

      if (editingPartId) {
        setManagedParts((prev) => prev.map((x) => (x.id === editingPartId ? updatedRecord : x)));
        toast.success("Parça fiyat kaydı güncellendi.");
      } else {
        setManagedParts((prev) => [updatedRecord, ...prev]);
        toast.success("Yeni parça fiyat kaydı eklendi.");
      }
      resetManageForm();
    } catch (error: any) {
      toast.error(error?.message || "İşlem başarısız.");
    } finally {
      setManageSaving(false);
    }
  };

  const deleteManagedPart = async (id: string) => {
    try {
      const res = await fetch(`/api/repair-price-items/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Kayıt silinemedi");
      setManagedParts((prev) => prev.filter((x) => x.id !== id));
      if (editingPartId === id) resetManageForm();
      toast.success("Kayıt silindi.");
    } catch (error: any) {
      toast.error(error?.message || "Kayıt silinemedi.");
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
  const totalCategoryCount = useMemo(() => groupedModels.reduce((sum, model) => sum + model.categories.length, 0), [groupedModels]);
  const totalOptionCount = useMemo(() => groupedModels.reduce((sum, model) => sum + model.categories.reduce((s, c) => s + c.options.length, 0), 0), [groupedModels]);

  // --- Visual-only helpers (icons) — no business logic below this line ---
  const IconPencil = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
  const IconPlus = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
  const IconClose = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
  const IconChevronDown = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
  const IconWarning = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
  const IconSearch = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
  const IconSend = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );

  // Device icon by brand, used on model cards
  const getDeviceIcon = (brand: GroupedModel["brand"], className = "w-5 h-5") => {
    if (brand === "iPad") {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      );
    }
    if (brand === "MacBook") {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="2" y1="20" x2="22" y2="20" />
        </svg>
      );
    }
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="2" width="12" height="20" rx="2" ry="2" />
        <line x1="12" y1="17.5" x2="12.01" y2="17.5" />
      </svg>
    );
  };

  // Repair category icon, used inside each model card's accordion
  const getCategoryIcon = (category: string, className = "w-4 h-4") => {
    if (category === "BATARYA DEĞİŞİMİ") {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="18" height="10" rx="2" />
          <line x1="22" y1="10.5" x2="22" y2="13.5" />
        </svg>
      );
    }
    if (category === "EKRAN DEĞİŞİMİ") {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <line x1="9" y1="18" x2="15" y2="18" />
        </svg>
      );
    }
    if (category === "FACE ID TRUDEP DEĞİŞİMİ") {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8V6a2 2 0 0 1 2-2h2" />
          <path d="M4 16v2a2 2 0 0 0 2 2h2" />
          <path d="M20 8V6a2 2 0 0 0-2-2h-2" />
          <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
          <circle cx="9" cy="11" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="15" cy="11" r="0.8" fill="currentColor" stroke="none" />
          <path d="M9 15.2c1.2 1 4.8 1 6 0" />
        </svg>
      );
    }
    if (category === "ARKA CAM DEĞİŞİMİ") {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="3" />
          <circle cx="15" cy="6.5" r="1.4" />
        </svg>
      );
    }
    if (category === "ARKA KAMERA DEĞİŞİMİ") {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8a2 2 0 0 1 2-2h1.2l1.1-1.6A2 2 0 0 1 9.9 3.6h4.2a2 2 0 0 1 1.6.8L17 6h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
          <circle cx="12" cy="13" r="3.1" />
        </svg>
      );
    }
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  };

  const brandBadgeClass = (brand: GroupedModel["brand"]) => {
    if (brand === "iPhone") return "bg-emerald-500";
    if (brand === "iPad") return "bg-blue-500";
    if (brand === "MacBook") return "bg-indigo-500";
    return "bg-amber-500";
  };

  return (
    <div className="max-w-[1280px] mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-1.5">
          Cihaz Tamir Fiyatları
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Tüm cihaz modellerimiz için güncel tamir ve parça değişim fiyatlarımızı inceleyebilirsiniz.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Model Sayısı</p>
          <p className="mt-1 text-xl font-black text-slate-900 font-mono">{groupedModels.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Onarım Grubu</p>
          <p className="mt-1 text-xl font-black text-slate-900 font-mono">{totalCategoryCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Parça/Fiyat Kalemi</p>
          <p className="mt-1 text-xl font-black text-slate-900 font-mono">{totalOptionCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Filtre Sonucu</p>
          <p className="mt-1 text-xl font-black text-blue-600 font-mono">{filteredModels.length}</p>
        </div>
      </div>

      {/* Manage parts panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${editingPartId ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"}`}>
              {editingPartId ? <IconPencil className="w-3.5 h-3.5" /> : <IconPlus className="w-3.5 h-3.5" />}
            </span>
            {editingPartId ? "Parça Fiyat Kaydı Düzenle" : "Parça & Onarım Fiyat Yönetimi"}
          </h3>
          <span className="text-xs text-slate-500">Marka, model, arıza, parça tipi ve fiyat tanımlayın / güncelleyin.</span>
        </div>
        <div className="form-grid-4">
          <select className="field" value={manageBrand} onChange={(e) => setManageBrand(e.target.value as ManagedPartRecord["brand"])}>
            <option value="iPhone">iPhone</option>
            <option value="Android">Android</option>
            <option value="iPad">iPad</option>
            <option value="MacBook">MacBook</option>
          </select>
          <input className="field" placeholder="Model (örn: iPhone 13)" value={manageModel} onChange={(e) => setManageModel(e.target.value)} />
          <input className="field" placeholder="Arıza Grubu (örn: EKRAN DEG.)" value={manageCategory} onChange={(e) => setManageCategory(e.target.value)} />
          <select className="field" value={manageType} onChange={(e) => setManageType(e.target.value as ManagedPartRecord["type"])}>
            <option value="original">Orijinal</option>
            <option value="equivalent">Muadil</option>
            <option value="revision">Revize</option>
          </select>
        </div>
        <div className="form-grid-4">
          <input className="field" placeholder="Parça/İşlem Adı" value={managePartName} onChange={(e) => setManagePartName(e.target.value)} />
          <input className="field" placeholder="Fiyat (örn: 3500)" value={managePrice} onChange={(e) => setManagePrice(e.target.value)} />
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" className="primary-btn flex-1" onClick={() => void addManagedPart()} disabled={manageSaving}>
              {manageSaving ? "Kaydediliyor..." : editingPartId ? "Kaydı Güncelle" : "Kaydı Ekle"}
            </button>
            {editingPartId && (
              <button type="button" className="field w-24" onClick={resetManageForm}>
                Vazgeç
              </button>
            )}
          </div>
        </div>
        <div className="panel-scroll rounded-xl border border-slate-200" style={{ maxHeight: 220 }}>
          {managedParts.length === 0 ? (
            <div className="empty-box">Henüz özel/düzenlenmiş parça fiyat kaydı yok.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Marka</th>
                  <th>Model</th>
                  <th>Arıza</th>
                  <th>Tip</th>
                  <th>Parça</th>
                  <th>Fiyat</th>
                  <th className="text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {managedParts.map((row) => (
                  <tr key={row.id} className={editingPartId === row.id ? "bg-blue-50/60" : undefined}>
                    <td><strong>{row.brand}</strong></td>
                    <td>{row.model}</td>
                    <td>{row.category}</td>
                    <td>{row.type}</td>
                    <td>{row.partName}</td>
                    <td><strong className="text-blue-700 font-mono">{Number(row.price).toLocaleString("tr-TR")} TL</strong></td>
                    <td className="text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 transition"
                          onClick={() => startEditPart(row)}
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 transition"
                          onClick={() => void deleteManagedPart(row.id)}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Tabs and Search Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 space-y-4">
        {/* Tab buttons */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["Tümü", "iPhone", "Android", "iPad", "MacBook"] as const).map((tab) => {
            const active = selectedTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  active ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
            onClick={() => {
              setSelectedTab("Tümü");
              setSearchTerm("");
            }}
          >
            Filtreyi Sıfırla
          </button>
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
            onClick={() => setSearchTerm("ekran")}
          >
            Ekran İşleri
          </button>
          <button
            type="button"
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
            onClick={() => setSearchTerm("batarya")}
          >
            Batarya İşleri
          </button>
        </div>

        {/* Search box */}
        <div className="relative w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 flex items-center pointer-events-none">
            <IconSearch className="w-[18px] h-[18px]" />
          </span>
          <input
            type="text"
            placeholder="Model ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
          />
        </div>
      </div>

      {/* Pricing Grid */}
      {filteredModels.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl text-center py-16 px-8">
          <p className="text-base text-slate-500">Arama kriterlerinize uygun cihaz veya onarım bulunamadı.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(360px,1fr))]">
          {filteredModels.map((modelGroup) => (
            <div
              key={modelGroup.model}
              className="bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-slate-900/5 hover:border-blue-200"
            >
              {/* Card Header */}
              <div className="flex items-center gap-3 p-5 border-b border-slate-100 bg-slate-50/70">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  {getDeviceIcon(modelGroup.brand)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[1.05rem] font-black text-slate-900 truncate">
                    {modelGroup.model.toUpperCase()}
                  </h3>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide text-white ${brandBadgeClass(modelGroup.brand)}`}
                  >
                    {modelGroup.brand}
                  </span>
                </div>
              </div>

              {/* Accordion list of repairs */}
              <div className="flex-1 divide-y divide-slate-100">
                {modelGroup.categories.map((cat) => {
                  const isExpanded = expandedKeys[`${modelGroup.model}-${cat.category}`];
                  return (
                    <div key={cat.category}>
                      {/* Accordion Trigger */}
                      <button
                        type="button"
                        onClick={() => toggleAccordion(modelGroup.model, cat.category)}
                        className="w-full flex items-center justify-between gap-2 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
                      >
                        <span className="flex items-center gap-2 text-[0.83rem] font-bold text-slate-800">
                          <span className="text-slate-400 shrink-0">{getCategoryIcon(cat.category)}</span>
                          {cat.category}
                        </span>
                        <IconChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </button>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="px-5 pb-4 pt-1 bg-slate-50/70">
                          <div className="flex flex-col gap-2">
                            {cat.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[0.83rem]"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${opt.type === "equivalent" ? "bg-slate-400" : "bg-blue-500"}`} />
                                  <span className="font-semibold text-slate-700 truncate">{opt.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-black text-slate-900 font-mono text-[0.85rem]">
                                    {opt.price.includes("TEKLİF") ? opt.price : `${opt.price} TL`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const existing = managedParts.find(
                                        (m) => m.model.toLowerCase() === modelGroup.model.toLowerCase() && m.category === cat.category && m.type === opt.type
                                      );
                                      if (existing) {
                                        startEditPart(existing);
                                      } else {
                                        setEditingPartId(null);
                                        setManageBrand(modelGroup.brand);
                                        setManageModel(modelGroup.model);
                                        setManageCategory(cat.category);
                                        setManageType(opt.type);
                                        setManagePartName(opt.name);
                                        setManagePrice(cleanNumericPrice(opt.price));
                                        window.scrollTo({ top: 120, behavior: "smooth" });
                                      }
                                    }}
                                    className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition shrink-0"
                                    title="Bu parçanın fiyatını düzenle"
                                  >
                                    <IconPencil className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Card Footer Button */}
              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenModal(modelGroup)}
                  className="w-full py-2.5 rounded-xl border border-blue-600 text-blue-600 text-[0.85rem] font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:bg-blue-600 hover:text-white"
                >
                  <IconSend className="w-4 h-4" />
                  Servis Talebi Oluştur
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE TECHNICAL SERVICE REQUEST MODAL */}
      {selectedModel && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm grid place-items-center z-[100] p-4">
          <div className="w-full max-w-[640px] max-h-[90vh] flex flex-col overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-slate-100 bg-slate-50/70">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-900">Teknik Servis Talebi Oluştur</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{selectedModel.model} için yeni iş emri kaydı.</p>
              </div>
              <button
                onClick={() => setSelectedModel(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition shrink-0"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex flex-col">
              <div className="p-6 flex flex-col gap-6">
                {/* SECTION 1: CUSTOMER */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600 mb-3">1. Müşteri Bilgileri</h4>

                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Müşteri Seçimi</label>
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
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                      >
                        <option value="">-- Müşteri Seçin --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.fullName} ({c.phone})
                          </option>
                        ))}
                        <option value="new" className="font-bold text-blue-600">
                          [+] Yeni Müşteri Tanımla
                        </option>
                      </select>
                    </div>

                    {(customerMode === "CREATE" || selectedCustomerId === "new") && (
                      <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Müşteri Adı Soyadı *</label>
                          <input
                            type="text"
                            placeholder="Örn: Ahmet Sevim"
                            value={newCustName}
                            onChange={(e) => setNewCustName(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon Numarası *</label>
                          <input
                            type="text"
                            placeholder="Örn: 0555..."
                            value={newCustPhone}
                            onChange={(e) => setNewCustPhone(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">E-Posta Adresi</label>
                          <input
                            type="email"
                            placeholder="Örn: mail@adres.com"
                            value={newCustEmail}
                            onChange={(e) => setNewCustEmail(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 2: DEVICE */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600 mb-3">2. Cihaz Detayları</h4>

                  {/* Quick Device Selector */}
                  {selectedCustomerId && selectedCustomerId !== "new" && customerDevices.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Kayıtlı Cihazlardan Seç (Hızlı Seçim)</label>
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
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
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
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-amber-700">
                              <IconWarning className="w-3.5 h-3.5 shrink-0" />
                              Uyarı: Seçtiğiniz cihaz modeli ({selectedDev.brand} {selectedDev.model}) ile fiyatını incelediğiniz model ({selectedModel.model}) uyuşmuyor.
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Cihaz Markası</label>
                      <input
                        type="text"
                        value={getSaveDetails(selectedModel).brand}
                        disabled
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Model</label>
                      <input
                        type="text"
                        value={selectedModel.model}
                        disabled
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Kapasite / Hafıza</label>
                      <select
                        value={newDevStorage}
                        onChange={(e) => setNewDevStorage(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                      >
                        <option value="64GB">64 GB</option>
                        <option value="128GB">128 GB</option>
                        <option value="256GB">256 GB</option>
                        <option value="512GB">512 GB</option>
                        <option value="1TB">1 TB</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Renk</label>
                      <input
                        type="text"
                        placeholder="Örn: Uzay Grisi"
                        value={newDevColor}
                        onChange={(e) => setNewDevColor(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">IMEI Numarası</label>
                      <input
                        type="text"
                        placeholder="15 Haneli IMEI"
                        value={newDevImei}
                        onChange={(e) => setNewDevImei(e.target.value)}
                        maxLength={15}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fiziksel Durum / Çizikler</label>
                      <input
                        type="text"
                        placeholder="Örn: Ekranda hafif kılcal çizik"
                        value={newDevCondNote}
                        onChange={(e) => setNewDevCondNote(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: REPAIR SELECTION */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600 mb-3">3. Arıza & Fiyatlandırma</h4>

                  <div className="flex flex-col gap-3">
                    <div className="grid gap-3 items-end" style={{ gridTemplateColumns: "1fr 1.2fr auto" }}>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Arıza Grubu</label>
                        <select
                          value={selectedCategoryName}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                        >
                          {selectedModel.categories.map((c) => (
                            <option key={c.category} value={c.category}>
                              {c.category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Yedek Parça / Onarım Tipi</label>
                        <select
                          value={selectedOptionIndex}
                          onChange={(e) => handleOptionChange(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
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
                        className="h-9 px-5 rounded-lg border-none bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center transition-colors"
                      >
                        Listeye Ekle
                      </button>
                    </div>

                    {/* Selected repairs list */}
                    {selectedRepairsList.length > 0 && (
                      <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-2.5">
                          <span>Seçilen Onarım Kalemleri ({selectedRepairsList.length})</span>
                          <span className="text-blue-600 font-mono">
                            Toplam: {selectedRepairsList.reduce((sum, item) => sum + item.partCost + item.laborCost, 0)} TL
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {selectedRepairsList.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="font-bold text-blue-600">{item.category}:</span>{" "}
                                <span className="text-slate-800">{item.optionName}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-slate-500 font-semibold font-mono">
                                  {item.partCost} TL (P) + {item.laborCost} TL (İ)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRepair(item.id)}
                                  className="p-1 rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition"
                                  title="Sil"
                                >
                                  <IconClose className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Yapılacak İşlem Açıklaması *</label>
                      <textarea
                        value={issueDescription}
                        onChange={(e) => setIssueDescription(e.target.value)}
                        rows={2}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-[inherit] resize-none outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Yedek Parça Bedeli (TL)</label>
                        <input
                          type="number"
                          value={partCost}
                          onChange={(e) => setPartCost(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">İşçilik Bedeli (TL)</label>
                        <input
                          type="number"
                          value={laborCost}
                          onChange={(e) => setLaborCost(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-blue-600 mb-1">Toplam Fiyat</label>
                        <div className="w-full px-3 py-2 rounded-lg border border-blue-600 bg-blue-50 text-blue-600 font-black text-[0.95rem] font-mono text-center">
                          {Number(partCost || 0) + Number(laborCost || 0)} TL
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedModel(null)}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 bg-transparent text-slate-700 text-sm font-semibold hover:bg-slate-100 transition"
                >
                  İptal Et
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg border-none bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-bold flex items-center gap-1.5 transition-colors"
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
