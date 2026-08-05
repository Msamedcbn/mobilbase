"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-modal";
import CustomerQuickAddModal from "@/components/customer-quick-add-modal";

type Branch = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  barcode: string;
  stock: number;
  salePrice: string;
  branchStocks?: Array<{
    id: string;
    branchId: string;
    stock: number;
  }>;
};
type Customer = { id: string; fullName: string; phone: string };
type SessionUser = { role: "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT" | "PLATFORM_OWNER" };
type CartItem = {
  productId: string;
  name: string;
  barcode: string;
  unitPrice: number;
  quantity: number;
  stock: number;
  discountPct: number;
};
type PaymentLine = {
  method: "CASH" | "CREDIT_CARD" | "ON_ACCOUNT" | "INSTALLMENT";
  amount: number;
  bankAccountId?: string;
  installmentCount?: number;
  interestRate?: number;
};

type Receipt = {
  transactionNo: string;
  paymentMethod: string;
  totalAmount: number;
  customerId?: string;
  items: { productName: string; quantity: number; lineTotal: number }[];
  installments?: Array<{ installmentNo: number; dueDate: string; amount: number; status: string }>;
  installmentCount?: number;
  interestRate?: number;
  payments?: PaymentLine[];
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kart",
  ON_ACCOUNT: "Veresiye",
  INSTALLMENT: "Taksitli",
};

type InvoiceData = {
  invoiceUuid: string;
  invoiceNo: string;
  signedAt: string;
  xmlUrl: string;
  pdfUrl: string;
  gibStatus: string;
  message: string;
};

type BankAccount = {
  id: string;
  name: string;
  balance: number | string;
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

type HeldCart = {
  id: string;
  label: string;
  items: CartItem[];
  createdAt: string;
  branchId: string;
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

export default function PosPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [session, setSession] = useState<SessionUser | null>(null);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState("");
  
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "payment">("cart");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CREDIT_CARD" | "ON_ACCOUNT" | "INSTALLMENT">("CASH");
  const [customerId, setCustomerId] = useState("");
  const [installmentCount, setInstallmentCount] = useState(6);
  const [interestRate, setInterestRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tenantName, setTenantName] = useState("VibeGSM");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  // e-Archive Invoice Simulation State
  const [isSigningInvoice, setIsSigningInvoice] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  // New Credit Card Installment configuration states
  const [cardConfigs, setCardConfigs] = useState<CardInstallmentConfig[]>([]);
  const [selectedCardBrand, setSelectedCardBrand] = useState<{ id: string; name: string } | null>(null);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [activeModalBrandId, setActiveModalBrandId] = useState<string>("");

  // Held carts state
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  // Cash change calculator state
  const [receivedCash, setReceivedCash] = useState<string>("");

  // Split / partial payment state — added payment legs + the amount pending
  // for the currently-selected method (defaults to whatever remains unpaid).
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [legAmount, setLegAmount] = useState<string>("");
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [customerHistoryOpen, setCustomerHistoryOpen] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<any | null>(null);
  const [customerHistoryLoading, setCustomerHistoryLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("vibegsm_held_carts");
    if (saved) {
      try {
        setHeldCarts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse held carts", e);
      }
    }
  }, []);

  const saveHeldCarts = (newCarts: HeldCart[]) => {
    setHeldCarts(newCarts);
    localStorage.setItem("vibegsm_held_carts", JSON.stringify(newCarts));
  };

  const handleHoldCart = () => {
    if (cart.length === 0) {
      toast.warning("Boş sepet beklemeye alınamaz.");
      return;
    }
    const label = window.prompt("Sepet için bir isim girin (örn: Masa 3, Müşteri Ahmet):", `Sepet #${heldCarts.length + 1}`);
    if (label === null) return; // cancelled
    
    const newCart: HeldCart = {
      id: `held-${Date.now()}`,
      label: label.trim() || `Sepet #${heldCarts.length + 1}`,
      items: cart,
      createdAt: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
      branchId: selectedBranchId
    };
    
    saveHeldCarts([...heldCarts, newCart]);
    setCart([]);
    setReceivedCash("");
    toast.success("Sepet beklemeye alındı.");
  };

  // Popular items configuration and helper
  const fastCatalogItems = useMemo(() => {
    // 1. Try to find by specific barcodes
    const targetBarcodes = ["869000000001", "869000000002"];
    const foundByBarcode = products.filter(p => targetBarcodes.includes(p.barcode));
    
    // 2. Try to find by keywords
    const keywords = ["kulaklık", "kablo", "kılıf", "adaptör"];
    const foundByKeyword = products.filter(p => 
      !targetBarcodes.includes(p.barcode) && 
      keywords.some(k => p.name.toLowerCase().includes(k))
    );
    
    // Combine them
    let combined = [...foundByBarcode, ...foundByKeyword];
    
    // If we have fewer than 4 items, fill with other active products
    if (combined.length < 4) {
      const remaining = products.filter(p => !combined.some(c => c.id === p.id));
      combined = [...combined, ...remaining.slice(0, 4 - combined.length)];
    }
    
    return combined.slice(0, 4); // Display exactly 4 popular items to look clean on grid
  }, [products]);

  const getFastItemStyle = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("şarj") || lower.includes("adaptör") || lower.includes("kablo")) {
      return { icon: "⚡", bg: "bg-emerald-50 hover:bg-emerald-100/60 text-emerald-700 border-emerald-200/50" };
    }
    if (lower.includes("cam") || lower.includes("ekran") || lower.includes("kılıf")) {
      return { icon: "📱", bg: "bg-blue-50 hover:bg-blue-100/60 text-blue-700 border-blue-200/50" };
    }
    if (lower.includes("kulaklık") || lower.includes("ses")) {
      return { icon: "🎧", bg: "bg-purple-50 hover:bg-purple-100/60 text-purple-700 border-purple-200/50" };
    }
    return { icon: "📦", bg: "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200" };
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/products"),
      fetch("/api/customers"),
      fetch("/api/auth/me"),
      fetch("/api/branches"),
      fetch("/api/banks"),
      fetch("/api/installments/settings")
    ])
      .then(async ([pRes, cRes, sRes, bRes, bankRes, instRes]) => {
        const [pData, cData, sData, bData, bankData, instData] = await Promise.all([
          pRes.json(),
          cRes.json(),
          sRes.json(),
          bRes.json(),
          bankRes.json(),
          instRes.json()
        ]);
        setProducts(Array.isArray(pData) ? pData : []);
        setCustomers(Array.isArray(cData) ? cData : []);
        setSession(sData.user ?? null);
        if (sData.tenantName) setTenantName(sData.tenantName);
        const loadedBranches = Array.isArray(bData) ? bData : [];
        setBranches(loadedBranches);
        const loadedBanksRaw = bankData?.data ?? bankData;
        const loadedBanks = Array.isArray(loadedBanksRaw) ? loadedBanksRaw : [];
        setBanks(loadedBanks);
        if (loadedBanks.length > 0) {
          setBankAccountId(loadedBanks[0].id);
        }
        setCardConfigs(Array.isArray(instData) ? instData : []);
      })
      .catch(() => toast.error("Veriler yüklenemedi"));
  }, []);

  // Stok sayfasındaki "Satışa Ekle" butonundan `/pos?add=<sku>` ile açıldığında,
  // ürün kataloğu yüklenir yüklenmez o ürünü otomatik sepete ekler.
  useEffect(() => {
    if (products.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const addSku = params.get("add");
    if (!addSku) return;

    const found = products.find((p) => p.barcode === addSku);
    if (found) {
      addToCart(found);
      toast.success(`${found.name} sepete eklendi`);
    } else {
      toast.warning("Stoktan gönderilen ürün POS kataloğunda bulunamadı");
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("add");
    window.history.replaceState({}, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Helper to fetch branch-specific stock of a product
  const getStockForBranch = (product: Product, branchId: string): number => {
    if (!branchId) return product.stock;
    const match = product.branchStocks?.find((bs) => bs.branchId === branchId);
    return match ? match.stock : 0;
  };

  const filteredProducts = useMemo(() => {
    const key = query.trim().toLowerCase();
    if (!key) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(key) || p.barcode.toLowerCase().includes(key)
    );
  }, [products, query]);

  const total = useMemo(() => {
    return cart.reduce((sum, i) => {
      const lineBase = i.unitPrice * i.quantity;
      return sum + lineBase - lineBase * (i.discountPct / 100);
    }, 0);
  }, [cart]);

  const paymentsSum = useMemo(() => Math.round(payments.reduce((s, p) => s + p.amount, 0) * 100) / 100, [payments]);
  const remaining = useMemo(() => Math.max(0, Math.round((total - paymentsSum) * 100) / 100), [total, paymentsSum]);

  // Keep the pending-amount field tracking the unpaid remainder until the cashier
  // starts splitting the sale (once a leg is added, they control it manually).
  useEffect(() => {
    if (payments.length === 0) {
      setLegAmount(total > 0 ? String(total) : "");
    }
  }, [total, payments.length]);

  function addPaymentLine() {
    const amt = Number(legAmount);
    if (!amt || amt <= 0) return toast.warning("Geçerli bir ödeme tutarı girin");
    if (amt > remaining + 0.01) {
      return toast.warning(`Girilen tutar kalan tutardan (${remaining.toLocaleString("tr-TR")} TL) büyük olamaz`);
    }
    if (paymentMethod === "ON_ACCOUNT" && !customerId) {
      return toast.warning("Veresiye ödemesi için müşteri seçimi zorunlu");
    }
    const line: PaymentLine = {
      method: paymentMethod,
      amount: Math.round(amt * 100) / 100,
      bankAccountId: paymentMethod !== "ON_ACCOUNT" && paymentMethod !== "INSTALLMENT" && bankAccountId ? bankAccountId : undefined,
      installmentCount: paymentMethod === "INSTALLMENT" ? installmentCount : undefined,
      interestRate: paymentMethod === "INSTALLMENT" ? interestRate : undefined,
    };
    setPayments((prev) => {
      const next = [...prev, line];
      const nextRemaining = Math.max(0, Math.round((total - next.reduce((s, p) => s + p.amount, 0)) * 100) / 100);
      setLegAmount(nextRemaining > 0 ? String(nextRemaining) : "");
      return next;
    });
  }

  function removePaymentLine(idx: number) {
    setPayments((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      const nextRemaining = Math.max(0, Math.round((total - next.reduce((s, p) => s + p.amount, 0)) * 100) / 100);
      setLegAmount(nextRemaining > 0 ? String(nextRemaining) : String(total));
      return next;
    });
  }

  async function loadCustomerHistory() {
    if (customerHistoryOpen) {
      setCustomerHistoryOpen(false);
      return;
    }
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;
    setCustomerHistoryOpen(true);
    setCustomerHistoryLoading(true);
    try {
      const res = await fetch(`/api/customers/history?q=${encodeURIComponent(cust.fullName)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Müşteri geçmişi getirilemedi.");
      const match = Array.isArray(data.items) ? data.items.find((item: any) => item.customer.id === customerId) : null;
      setCustomerHistory(match || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Müşteri geçmişi getirilemedi.");
      setCustomerHistoryOpen(false);
    } finally {
      setCustomerHistoryLoading(false);
    }
  }

  const installmentPreviewList = useMemo(() => {
    if (paymentMethod !== "INSTALLMENT" || installmentCount <= 0) return [];
    const instTotal = total * (1 + interestRate / 100);
    const monthlyAmount = Math.round((instTotal / installmentCount) * 100) / 100;
    let addedAmount = 0;
    const preview = [];
    for (let i = 1; i <= installmentCount; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);
      let currentInstAmount = monthlyAmount;
      if (i === installmentCount) {
        currentInstAmount = Math.round((instTotal - addedAmount) * 100) / 100;
      } else {
        addedAmount += monthlyAmount;
      }
      preview.push({
        installmentNo: i,
        dueDate: dueDate.toLocaleDateString("tr-TR"),
        amount: currentInstAmount
      });
    }
    return preview;
  }, [paymentMethod, total, installmentCount, interestRate]);
  const cartLineCount = cart.length;
  const cartUnitCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  function addToCart(product: Product) {
    const branchStock = getStockForBranch(product, selectedBranchId);

    setCart((prev) => {
      const found = prev.find((i) => i.productId === product.id);
      if (found) {
        if (found.quantity >= branchStock) {
          toast.warning(
            selectedBranchId
              ? `Bu şubedeki stok adedi (${branchStock}) aşılamaz.`
              : `Genel stok adedi (${branchStock}) aşılamaz.`
          );
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      if (branchStock <= 0) {
        toast.warning(
          selectedBranchId
            ? "Seçilen şubede bu ürünün stoğu bulunmamaktadır."
            : "Genel stokta bu ürünün stoğu bulunmamaktadır."
        );
        return prev;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          barcode: product.barcode,
          unitPrice: Number(product.salePrice),
          quantity: 1,
          stock: branchStock,
          discountPct: 0
        }
      ];
    });
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const found = products.find((p) => p.barcode === query.trim());
    if (!found) return toast.warning("Barkod ile ürün bulunamadı");
    addToCart(found);
    setQuery("");
  }

  async function checkout() {
    if (!cart.length) return toast.warning("Sepet boş");
    if (!customerId) {
      return toast.warning("Satış için müşteri seçimi zorunlu — seçin veya '+ Yeni Müşteri' ile ekleyin");
    }

    let finalPayments: PaymentLine[];
    if (payments.length > 0) {
      if (remaining > 0.01) {
        return toast.warning(`Kalan ${remaining.toLocaleString("tr-TR")} TL için bir ödeme yöntemi daha ekleyin`);
      }
      finalPayments = payments;
    } else {
      if (paymentMethod === "ON_ACCOUNT" && !customerId) {
        return toast.warning("Cari hesap satışı için müşteri seçimi zorunlu");
      }
      finalPayments = [
        {
          method: paymentMethod,
          amount: total,
          bankAccountId: paymentMethod !== "ON_ACCOUNT" && paymentMethod !== "INSTALLMENT" && bankAccountId ? bankAccountId : undefined,
          installmentCount: paymentMethod === "INSTALLMENT" ? installmentCount : undefined,
          interestRate: paymentMethod === "INSTALLMENT" ? interestRate : undefined,
        },
      ];
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPct: item.discountPct
          })),
          payments: finalPayments,
          customerId,
          branchId: selectedBranchId || undefined,
        })
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        // Non-JSON response fallback
      }
      if (!res.ok) {
        throw new Error(
          json?.error ??
          json?.message ??
          `POS işlemi tamamlanamadı (HTTP ${res.status})`
        );
      }

      // Set the receipt state
      setReceipt({
        transactionNo: json.data?.transactionNo || json.transactionNo,
        paymentMethod: json.data?.paymentMethod || json.paymentMethod || paymentMethod,
        totalAmount: json.data?.totalAmount || json.totalAmount || total,
        customerId: customerId || undefined,
        items: json.data?.items || json.items || cart.map(c => ({ productName: c.name, quantity: c.quantity, lineTotal: c.unitPrice * c.quantity - (c.unitPrice * c.quantity * c.discountPct / 100) })),
        installments: json.data?.installments || json.installments,
        installmentCount: json.data?.installmentCount || json.installmentCount,
        interestRate: json.data?.interestRate || json.interestRate,
        payments: json.data?.payments || json.payments,
      });

      setCart([]);
      setCustomerId("");
      setCheckoutStep("cart");
      setSelectedCardBrand(null);
      setInstallmentCount(6);
      setInterestRate(0);
      setReceivedCash("");
      setPayments([]);
      setLegAmount("");
      toast.success(json.message ?? "Satış başarıyla tamamlandı");

      // Reload products to update stock quantities
      const pRes = await fetch("/api/products");
      const pJson = await pRes.json();
      setProducts(Array.isArray(pJson) ? pJson : []);

      // Reload bank accounts to update balances
      const bankRes = await fetch("/api/banks");
      const bankJson = await bankRes.json();
      const nextBanksRaw = bankJson?.data ?? bankJson;
      setBanks(Array.isArray(nextBanksRaw) ? nextBanksRaw : []);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "POS işlemi sırasında beklenmeyen bir hata oluştu";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function generateEArchiveInvoice() {
    if (!receipt) return;
    setIsSigningInvoice(true);
    
    // GİB signing portal simulated delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const res = await fetch("/api/invoices/e-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionNo: receipt.transactionNo,
          totalAmount: receipt.totalAmount,
          customerId: receipt.customerId
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "e-Arşiv Fatura oluşturulamadı");

      setInvoice(json.data);
      toast.success("e-Arşiv Fatura GİB portalında imzalandı!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fatura oluşturulamadı");
    } finally {
      setIsSigningInvoice(false);
    }
  }

  function printReceipt(r: Receipt) {
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const itemsHtml = r.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 4px 0; font-size: 13px;">${item.productName}<br/><span style="font-size: 11px; color: #555;">x${item.quantity}</span></td>
          <td style="text-align: right; padding: 4px 0; font-size: 13px; vertical-align: top;">${item.lineTotal.toLocaleString("tr-TR")} TL</td>
        </tr>
      `
      )
      .join("");

    const dateStr = new Date().toLocaleString("tr-TR");
    const displayPayment =
      r.paymentMethod === "CASH"
        ? "Nakit"
        : r.paymentMethod === "CREDIT_CARD"
        ? "Kredi Kartı"
        : r.paymentMethod === "INSTALLMENT"
        ? "Taksitli Satış"
        : r.paymentMethod === "MIXED"
        ? "Parçalı Ödeme"
        : "Cari Hesap";

    let paymentBreakdownHtml = "";
    if (r.payments && r.payments.length > 1) {
      const rows = r.payments.map((p) => `
        <tr>
          <td style="padding: 2px 0; font-size: 11px;">${PAYMENT_LABELS[p.method] ?? p.method}${p.method === "INSTALLMENT" ? ` (${p.installmentCount} Taksit)` : ""}</td>
          <td style="text-align: right; padding: 2px 0; font-size: 11px;">${p.amount.toLocaleString("tr-TR")} TL</td>
        </tr>
      `).join("");
      paymentBreakdownHtml = `
        <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 6px;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; text-align: center;">ÖDEME DAĞILIMI</div>
          <table style="width: 100%; border-collapse: collapse;">
            ${rows}
          </table>
        </div>
      `;
    }

    let installmentTableHtml = "";
    if (r.installments && r.installments.length > 0) {
      const rows = r.installments.map(inst => `
        <tr>
          <td style="padding: 2px 0; font-size: 11px;">Taksit #${inst.installmentNo} (${new Date(inst.dueDate).toLocaleDateString("tr-TR")})</td>
          <td style="text-align: right; padding: 2px 0; font-size: 11px;">${inst.amount.toLocaleString("tr-TR")} TL</td>
        </tr>
      `).join("");
      installmentTableHtml = `
        <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 6px;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; text-align: center;">TAKSİT TABLOSU</div>
          <table style="width: 100%; border-collapse: collapse;">
            ${rows}
          </table>
        </div>
      `;
    }

    const branchName = selectedBranchId
      ? (branches.find((b) => b.id === selectedBranchId)?.name || "Şube")
      : "Genel Stok (Şubesiz)";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Fiş #${r.transactionNo}</title>
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
          .title { font-size: 16px; font-weight: bold; margin: 0 0 4px; }
          .info-table, .items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          .items-table th { border-bottom: 1px dashed #000; text-align: left; padding: 4px 0; font-size: 11px; }
          .items-table td { border-bottom: 1px dotted #ccc; }
          .totals { margin-top: 8px; border-top: 1px dashed #000; padding-top: 6px; }
          .totals-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px; }
          .footer { margin-top: 16px; border-top: 1px dashed #000; padding-top: 8px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <div class="title">${(tenantName || "VibeGSM").toUpperCase()}</div>
          <div>${branchName}</div>
          <div style="font-size: 10px; margin-top: 4px;">Tel: +90 555 123 4567</div>
        </div>
        
        <table class="info-table">
          <tr>
            <td class="bold">Tarih:</td>
            <td class="text-right">${dateStr}</td>
          </tr>
          <tr>
            <td class="bold">Fiş No:</td>
            <td class="text-right">${r.transactionNo}</td>
          </tr>
          <tr>
            <td class="bold">Ödeme:</td>
            <td class="text-right">${displayPayment}</td>
          </tr>
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th>Ürün Adı / Miktar</th>
              <th style="text-align: right;">Tutar</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row bold" style="font-size: 15px;">
            <span>TOPLAM:</span>
            <span>${r.totalAmount.toLocaleString("tr-TR")} TL</span>
          </div>
        </div>

        ${paymentBreakdownHtml}
        ${installmentTableHtml}

        <div class="footer text-center">
          <p style="margin: 0 0 4px;">Ürünlerimizi tercih ettiğiniz için teşekkür ederiz.</p>
          <p style="margin: 0; font-size: 10px;">Fişinizi garanti işlemleri için saklayınız.</p>
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
    }, 500);
  }

  return (
    <section className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
            Bulut POS Satış Terminali
          </h2>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">Hızlı perakende satışı, barkodlu sepet yönetimi ve cari veresiye işlemlerini anlık yönetin.</p>
        </div>
        
        {/* Branch Selector Dropdown */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 px-3 rounded-2xl shadow-inner shrink-0 transition hover:border-slate-350">
          <div className="flex items-center gap-2 text-blue-600 pl-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">ŞUBE:</span>
          </div>
          <select 
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-2" 
            value={selectedBranchId}
            onChange={(e) => {
              setSelectedBranchId(e.target.value);
              setCart([]); // Reset cart to prevent stock validation mismatch across branches
            }}
          >
            <option value="">Şube Seçilmedi (Genel Stok)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sepet Kalemi */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow transition duration-200 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sepet Kalemi</p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{cartLineCount}</p>
          </div>
        </div>

        {/* Card 2: Toplam Adet */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow transition duration-200 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50/50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/30 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toplam Adet</p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{cartUnitCount}</p>
          </div>
        </div>

        {/* Card 3: Bulunan Ürün */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow transition duration-200 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50/50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/30 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bulunan Ürün</p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{filteredProducts.length}</p>
          </div>
        </div>

        {/* Card 4: Toplam Tutar */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-950 border border-blue-950 p-5 rounded-2xl shadow-md flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
            <svg className="w-20 h-20 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16V5" />
            </svg>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-inner">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16V5" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Toplam Tutar</p>
            <p className="text-2xl font-black text-white font-mono mt-0.5">{total.toLocaleString("tr-TR")} TL</p>
          </div>
        </div>
      </div>

      <div className="pos-grid">
        {/* Left Side: Product Discovery & Catalog */}
        <div className="bg-white/50 backdrop-blur-sm border border-slate-200/60 p-6 rounded-3xl shadow-sm">
          {/* Hızlı Ürünler Grid */}
          {fastCatalogItems.length > 0 && (
            <div className="mb-6 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3.5 flex items-center gap-1.5 pl-0.5">
                <span>⚡ HIZLI KATEGORİ KATALOĞU</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {fastCatalogItems.map((item) => {
                  const style = getFastItemStyle(item.name);
                  const bStock = getStockForBranch(item, selectedBranchId);
                  const isOutOfStock = bStock <= 0;
                  
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(item)}
                      className={`p-3.5 rounded-xl border text-left transition duration-200 flex flex-col justify-between gap-2 active:scale-[0.98] select-none shadow-sm hover:shadow hover:scale-[1.02] ${style.bg} ${isOutOfStock ? 'opacity-40 cursor-not-allowed transform-none shadow-none' : ''}`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-xl">{style.icon}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                          isOutOfStock 
                            ? "bg-rose-50 text-rose-600 border-rose-100/50" 
                            : bStock <= 5 
                              ? "bg-amber-50 text-amber-600 border-amber-100/50 animate-pulse" 
                              : "bg-white/90 text-slate-700 border-slate-200/50"
                        }`}>
                          {isOutOfStock ? "Tükendi" : `Stok: ${bStock}`}
                        </span>
                      </div>
                      <div>
                        <p className="font-extrabold text-[11px] sm:text-xs line-clamp-1 truncate w-full">
                          {item.name}
                        </p>
                        <p className="text-[10px] font-black font-mono mt-0.5 opacity-90">
                          {Number(item.salePrice).toLocaleString("tr-TR")} TL
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Box */}
          <div className="relative mb-6">
            <input
              className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-inner text-sm font-semibold"
              placeholder="Ürün barkodunu okutun veya isim araması yapın..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
            />
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-650 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-white/40">
                <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm font-semibold">Gösterilecek ürün bulunamadı</p>
                <p className="text-xs text-slate-400 mt-1">Arama kelimesini değiştirmeyi veya yeni ürün eklemeyi deneyin.</p>
              </div>
            )}
            
            {filteredProducts.map((product) => {
              const bStock = getStockForBranch(product, selectedBranchId);
              const isOutOfStock = bStock <= 0;
              const isLowStock = bStock > 0 && bStock <= 5;
              
              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && addToCart(product)}
                  className={`group relative flex flex-col justify-between p-4.5 bg-white border rounded-2xl transition-all duration-300 select-none ${
                    isOutOfStock
                      ? "border-slate-100 opacity-60 cursor-not-allowed bg-slate-50/50"
                      : "border-slate-200/80 hover:border-blue-500/50 hover:shadow-md hover:scale-[1.01] hover:-translate-y-0.5 cursor-pointer active:scale-[0.99]"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2.5">
                      <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/40">
                        {product.barcode}
                      </span>
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100/50">
                          Tükendi
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100/55 animate-pulse">
                          Kritik ({bStock})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100/55">
                          Stok: {bStock}
                        </span>
                      )}
                    </div>
                    
                    <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm line-clamp-2 min-h-[40px] group-hover:text-blue-700 transition-colors leading-snug">
                      {product.name}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-end">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                      Fiyat
                    </span>
                    <span className="font-extrabold text-slate-900 font-mono text-sm sm:text-base">
                      {Number(product.salePrice).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Cart Sidebar */}
        <aside className="bg-white/95 backdrop-blur-lg border border-slate-200 p-6 rounded-3xl shadow-md sticky top-6 align-self-start flex flex-col justify-between min-h-[580px]">
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-lg">Aktif Sepet</h3>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                {cartLineCount} Kalem
              </span>
            </div>

            {/* Held Carts list */}
            {heldCarts.length > 0 && (
              <div className="mb-4 bg-slate-50 border border-slate-200/60 rounded-2xl p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bekleyen Sepetler</p>
                <div className="space-y-2 max-h-[15vh] overflow-y-auto pr-1">
                  {heldCarts.map((hc) => (
                    <div key={hc.id} className="flex justify-between items-center bg-white border border-slate-200/50 p-2 rounded-xl text-xs shadow-sm hover:border-blue-200 transition">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-bold text-slate-800 truncate">{hc.label}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{hc.createdAt} • {hc.items.reduce((sum, i) => sum + i.quantity, 0)} Ürün</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            if (cart.length > 0) {
                              const confirmMerge = await confirm("Aktif sepetinizde ürünler var. Bekleyen sepeti aktif sepetle birleştirmek istiyor musunuz? (İptal derseniz aktif sepet silinip yerine bu yüklenir)");
                              if (confirmMerge) {
                                setCart((prev) => {
                                  let updated = [...prev];
                                  for (const item of hc.items) {
                                    const exist = updated.find(i => i.productId === item.productId);
                                    if (exist) {
                                      exist.quantity = Math.min(exist.stock, exist.quantity + item.quantity);
                                    } else {
                                      updated.push(item);
                                    }
                                  }
                                  return updated;
                                });
                              } else {
                                setCart(hc.items);
                              }
                            } else {
                              setCart(hc.items);
                            }
                            if (hc.branchId !== undefined && hc.branchId !== selectedBranchId) {
                              setSelectedBranchId(hc.branchId);
                              toast.info("Şube seçimi sepetin şubesi ile senkronize edildi.");
                            }
                            saveHeldCarts(heldCarts.filter((c) => c.id !== hc.id));
                            toast.success("Sepet geri yüklendi.");
                          }}
                          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-[10px] border border-blue-100"
                        >
                          Yükle
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            saveHeldCarts(heldCarts.filter((c) => c.id !== hc.id));
                            toast.success("Bekleyen sepet silindi.");
                          }}
                          className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="max-h-[38vh] overflow-y-auto space-y-3 pr-1">
              {cart.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/55">
                  <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <p className="text-sm font-semibold">Sepetiniz boş</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Katalogdan ürün seçin veya barkod okutarak ekleyin.</p>
                </div>
              )}

              {cart.map((item) => (
                <div key={item.productId} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-2 hover:bg-slate-100/50 transition">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-bold text-slate-800 text-xs line-clamp-1">{item.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono tracking-wide mt-0.5">{item.barcode}</p>
                    </div>
                    <button
                      onClick={() => setCart((prev) => prev.filter((i) => i.productId !== item.productId))}
                      className="text-red-500 hover:text-red-700 transition p-1 hover:bg-red-50 rounded-lg shrink-0"
                      title="Sil"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/50">
                    {/* Quantity adjustment buttons */}
                    <div className="flex gap-1 items-center bg-white border border-slate-200 rounded-xl p-1 shrink-0">
                      <button
                        type="button"
                        className="w-6 h-6 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition flex items-center justify-center font-bold"
                        onClick={() =>
                          setCart((prev) =>
                            prev.map((i) =>
                              i.productId === item.productId
                                ? { ...i, quantity: Math.max(1, i.quantity - 1) }
                                : i
                            )
                          )
                        }
                      >
                        -
                      </button>
                      <span className="font-bold font-mono text-xs w-6 text-center text-slate-800">{item.quantity}</span>
                      <button
                        type="button"
                        className="w-6 h-6 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition flex items-center justify-center font-bold"
                        onClick={() =>
                          setCart((prev) =>
                            prev.map((i) =>
                              i.productId === item.productId
                                ? { ...i, quantity: Math.min(item.stock, i.quantity + 1) }
                                : i
                            )
                          )
                        }
                      >
                        +
                      </button>
                    </div>

                    {/* Discount / Admin block */}
                    {(session?.role === "ADMIN" || session?.role === "MANAGER") && (
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-0.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">%</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-8 text-center font-bold font-mono text-xs text-slate-800 border-0 focus:outline-none p-0.5"
                          value={item.discountPct}
                          onChange={(e) =>
                            setCart((prev) =>
                              prev.map((i) =>
                                i.productId === item.productId
                                  ? { ...i, discountPct: Math.min(100, Math.max(0, Number(e.target.value))) }
                                  : i
                              )
                            )
                          }
                        />
                      </div>
                    )}

                    {/* Line price */}
                    <span className="font-extrabold text-slate-950 font-mono text-xs sm:text-sm">
                      {(item.unitPrice * item.quantity - (item.unitPrice * item.quantity * item.discountPct) / 100).toLocaleString("tr-TR")} TL
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Genel Toplam</span>
              <span className="text-3xl font-black font-mono text-blue-600">
                {total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
              </span>
            </div>

            {checkoutStep === "cart" ? (
              <button
                type="button"
                onClick={() => setCheckoutStep("payment")}
                disabled={cart.length === 0}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 active:scale-[0.99] transition duration-200 text-sm flex items-center justify-center gap-2"
              >
                Ödemeye Geç
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            ) : (
            <>
            <button
              type="button"
              onClick={() => setCheckoutStep("cart")}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Sepete Dön
            </button>

            {/* Payment Segment Selector */}
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setPaymentMethod("CASH"); setReceivedCash(""); }}
                className={`py-2 text-[10px] font-bold rounded-lg transition-all ${
                  paymentMethod === "CASH"
                    ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Nakit
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMethod("CREDIT_CARD"); setReceivedCash(""); }}
                className={`py-2 text-[10px] font-bold rounded-lg transition-all ${
                  paymentMethod === "CREDIT_CARD"
                    ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Kart
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMethod("ON_ACCOUNT"); setReceivedCash(""); }}
                className={`py-2 text-[10px] font-bold rounded-lg transition-all ${
                  paymentMethod === "ON_ACCOUNT"
                    ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Veresiye
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMethod("INSTALLMENT"); setReceivedCash(""); }}
                className={`py-2 text-[10px] font-bold rounded-lg transition-all ${
                  paymentMethod === "INSTALLMENT"
                    ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Taksitli
              </button>
            </div>

            {/* Installment Options */}
            {paymentMethod === "INSTALLMENT" && (
              <div className="space-y-3 bg-slate-50/50 border border-slate-200/40 p-3 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    const firstActive = cardConfigs.find(c => c.isActive);
                    if (firstActive) {
                      setActiveModalBrandId(firstActive.brandId);
                    } else if (cardConfigs.length > 0) {
                      setActiveModalBrandId(cardConfigs[0].brandId);
                    }
                    setShowInstallmentModal(true);
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-emerald-600 hover:from-blue-600 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  💳 Taksit Seçeneklerini Göster
                </button>

                {selectedCardBrand && (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${getBrandStyle(selectedCardBrand.id).bg}`} />
                      <span className="font-bold text-slate-800">{selectedCardBrand.name}</span>
                    </div>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      {installmentCount} Taksit (%{interestRate})
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Taksit Sayısı
                    </label>
                    <select
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                      value={installmentCount}
                      onChange={(e) => {
                        setInstallmentCount(Number(e.target.value));
                        setSelectedCardBrand(null);
                      }}
                    >
                      {[2, 3, 6, 9, 12, 18, 24].map((n) => (
                        <option key={n} value={n}>
                          {n} Taksit
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Vade Farkı (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold font-mono"
                      value={interestRate}
                      onChange={(e) => {
                        setInterestRate(Math.max(0, Number(e.target.value)));
                        setSelectedCardBrand(null);
                      }}
                    />
                  </div>
                </div>

                {interestRate > 0 && (
                  <div className="flex justify-between text-xs text-amber-700 font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-100/50 font-mono">
                    <span>Faizli Toplam:</span>
                    <span>{(total * (1 + interestRate / 100)).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</span>
                  </div>
                )}

                {installmentPreviewList.length > 0 && (
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Ödeme Planı Önizleme
                    </label>
                    <div className="border border-slate-200/50 rounded-xl max-h-[14vh] overflow-y-auto p-2.5 bg-white space-y-1">
                      {installmentPreviewList.map((item) => (
                        <div key={item.installmentNo} className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>{item.installmentNo}. Taksit ({item.dueDate})</span>
                          <span className="font-bold text-slate-800">{item.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bank Account Selector */}
            {paymentMethod !== "ON_ACCOUNT" && paymentMethod !== "INSTALLMENT" && (
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Tahsilat Kasası/Bankası
                </label>
                <div className="relative">
                  <select
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer font-semibold"
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                  >
                    <option value="">Seçiniz...</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({Number(b.balance).toLocaleString("tr-TR")} TL)
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Cash Change Calculator */}
            {paymentMethod === "CASH" && (
              <div className="space-y-2 bg-slate-50 border border-slate-200/50 p-3 rounded-2xl animate-in slide-in-from-top-1 duration-200">
                <div className="flex justify-between items-center">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Alınan Nakit (TL)
                  </label>
                  {receivedCash && Number(receivedCash) > 0 && (
                    <span className="text-[10px] font-bold font-mono text-slate-500">
                      Ödenen: {Number(receivedCash).toLocaleString("tr-TR")} TL
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    placeholder="0.00"
                    className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={receivedCash}
                    onChange={(e) => setReceivedCash(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    TL
                  </div>
                </div>

                {/* Quick cash shortcuts */}
                <div className="grid grid-cols-3 gap-1">
                  {[50, 100, 200, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setReceivedCash((prev) => {
                        const current = Number(prev) || 0;
                        return (current + amt).toString();
                      })}
                      className="py-1 px-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-bold font-mono transition text-slate-700 active:scale-95"
                    >
                      +{amt} TL
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setReceivedCash(total.toString())}
                    className="py-1 px-2 bg-blue-50 border border-blue-100 hover:bg-blue-100/50 rounded-lg text-[10px] font-extrabold transition text-blue-700 active:scale-95"
                  >
                    Tam Tutar
                  </button>
                </div>

                {/* Change calculation */}
                {(() => {
                  const cashVal = Number(receivedCash) || 0;
                  if (cashVal <= 0) return null;
                  const diff = cashVal - total;
                  if (diff >= 0) {
                    return (
                      <div className="flex justify-between items-center text-xs font-bold bg-emerald-50 text-emerald-700 p-2.5 rounded-xl border border-emerald-100/60 font-mono animate-in fade-in-50 duration-200">
                        <span>Para Üstü:</span>
                        <span>{diff.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex justify-between items-center text-xs font-bold bg-rose-50 text-rose-700 p-2.5 rounded-xl border border-rose-100/60 font-mono animate-in fade-in-50 duration-200">
                        <span>Kalan Ödeme:</span>
                        <span>{Math.abs(diff).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</span>
                      </div>
                    );
                  }
                })()}
              </div>
            )}

            {/* Customer Selector — mandatory for every sale. */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Müşteri *
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickAddCustomer(true)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition"
                >
                  + Yeni Müşteri
                </button>
              </div>
              <div className="relative">
                <select
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer font-semibold"
                  value={customerId}
                  onChange={(e) => { setCustomerId(e.target.value); setCustomerHistoryOpen(false); setCustomerHistory(null); }}
                >
                  <option value="">Müşteri Seçiniz...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {customerId && (
                <button
                  type="button"
                  onClick={loadCustomerHistory}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-700 transition"
                >
                  {customerHistoryOpen ? "▾ Son İşlemleri Gizle" : "▸ Son İşlemleri Göster"}
                </button>
              )}
              {customerHistoryOpen && (
                <div className="mt-1 p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl max-h-[16vh] overflow-y-auto space-y-1">
                  {customerHistoryLoading ? (
                    <p className="text-[10px] text-slate-400">Yükleniyor...</p>
                  ) : customerHistory && customerHistory.timeline?.length > 0 ? (
                    <>
                      <p className="text-[10px] font-bold text-slate-500 pb-1 border-b border-slate-200/60">
                        Net Bakiye: {Number(customerHistory.summary?.netBalance ?? 0).toLocaleString("tr-TR")} TL
                      </p>
                      {customerHistory.timeline.slice(0, 8).map((row: any) => (
                        <div key={row.id} className="flex justify-between text-[10px] text-slate-600">
                          <span>{new Date(row.date).toLocaleDateString("tr-TR")} — {row.title}</span>
                          <span className="font-bold font-mono">{row.amount == null ? "-" : `${Number(row.amount).toLocaleString("tr-TR")} TL`}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-400">Geçmiş işlem bulunamadı.</p>
                  )}
                </div>
              )}
            </div>

            {/* Split / Partial Payment controls */}
            <div className="space-y-2 bg-indigo-50/40 border border-indigo-100 p-3 rounded-2xl">
              <div className="flex items-center justify-between">
                <label className="block text-[9px] font-bold text-indigo-500 uppercase tracking-wider">
                  Ödeme Tutarı ({PAYMENT_LABELS[paymentMethod]})
                </label>
                <span className="text-[10px] font-bold text-slate-500">
                  Kalan:{" "}
                  <span className={remaining > 0.01 ? "text-amber-600" : "text-emerald-600"}>
                    {remaining.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                  </span>
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={legAmount}
                  onChange={(e) => setLegAmount(e.target.value)}
                  placeholder="0.00"
                />
                <button
                  type="button"
                  onClick={addPaymentLine}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-xl active:scale-95 transition whitespace-nowrap"
                >
                  + Ödemeyi Ekle
                </button>
              </div>
              <p className="text-[9px] text-slate-400">
                Satışı tek yöntemle tamamlamak için doğrudan &quot;Satışı Tamamla&quot;ya basabilirsiniz. Birden fazla ödeme yöntemi kullanmak (örn. kısmen nakit, kalanı kart) için tutarı girip &quot;Ödemeyi Ekle&quot;ye basın.
              </p>

              {payments.length > 0 && (
                <div className="space-y-1 pt-1">
                  {payments.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px]">
                      <span className="font-bold text-slate-700">
                        {PAYMENT_LABELS[p.method]}
                        {p.method === "INSTALLMENT" ? ` (${p.installmentCount} Taksit)` : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">{p.amount.toLocaleString("tr-TR")} TL</span>
                        <button
                          type="button"
                          onClick={() => removePaymentLine(idx)}
                          className="text-rose-500 hover:text-rose-700 font-bold px-1"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={checkout}
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 active:scale-[0.99] transition duration-200 text-sm"
            >
              {loading ? "Tamamlanıyor..." : "Satışı Tamamla"}
            </button>
            </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleHoldCart}
                className="py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100/50 text-indigo-700 text-xs font-bold rounded-xl transition active:scale-95 flex items-center justify-center gap-1"
              >
                📥 Beklet
              </button>
              <button
                type="button"
                onClick={() => {
                  setCart([]);
                  setCheckoutStep("cart");
                  setReceivedCash("");
                  setPayments([]);
                  setLegAmount("");
                }}
                className="py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-xl transition active:scale-95 flex items-center justify-center gap-1"
              >
                🗑️ Temizle
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showQuickAddCustomer && (
        <CustomerQuickAddModal
          onClose={() => setShowQuickAddCustomer(false)}
          onCreated={(created) => {
            setCustomers((prev) => [{ id: created.id, fullName: created.fullName, phone: created.phone }, ...prev]);
            setCustomerId(created.id);
            setShowQuickAddCustomer(false);
          }}
        />
      )}

      {/* MODAL: Checkout Success Receipt */}
      {receipt && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-md z-50 p-4 flex items-center justify-center animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl max-w-md w-full animate-scale-in">
            <div className="flex justify-between items-center pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100">✓</span>
                <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">Satış Başarılı</h4>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">POS TAMAMLANDI</span>
            </div>
            
            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 border border-slate-200/50 p-3.5 rounded-2xl">
              <p className="flex justify-between"><span>İşlem No:</span> <span className="font-mono font-bold text-slate-800">{receipt.transactionNo}</span></p>
              <p className="flex justify-between"><span>Ödeme Tipi:</span> <span className="font-bold text-slate-850">{receipt.paymentMethod === "CASH" ? "Nakit" : receipt.paymentMethod === "CREDIT_CARD" ? "Kredi Kartı" : receipt.paymentMethod === "INSTALLMENT" ? "Taksitli Satış" : receipt.paymentMethod === "MIXED" ? "Parçalı Ödeme" : "Cari Hesap"}</span></p>
              {receipt.paymentMethod === "INSTALLMENT" && receipt.installmentCount && (
                <p className="flex justify-between"><span>Taksit Planı:</span> <span className="font-bold text-slate-850">{receipt.installmentCount} Taksit / Oran: %{receipt.interestRate}</span></p>
              )}
            </div>

            {receipt.payments && receipt.payments.length > 1 && (
              <div className="my-3.5 p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-1.5 text-[11px]">
                <p className="font-bold text-indigo-700 mb-1 border-b border-indigo-100 pb-1.5">Ödeme Dağılımı</p>
                {receipt.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700">
                    <span>{PAYMENT_LABELS[p.method] ?? p.method}{p.method === "INSTALLMENT" ? ` (${p.installmentCount} Taksit)` : ""}</span>
                    <span className="font-bold font-mono text-slate-850">{p.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</span>
                  </div>
                ))}
              </div>
            )}

            {receipt.installments && receipt.installments.length > 0 && (
              <div className="my-3.5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5 max-h-[18vh] overflow-y-auto font-mono text-[11px] panel-scroll">
                <p className="font-bold text-slate-750 mb-1 border-b pb-1.5">Taksit Ödeme Tablosu</p>
                {receipt.installments.map((inst) => (
                  <div key={inst.installmentNo} className="flex justify-between text-slate-650">
                    <span>{inst.installmentNo}. Taksit ({new Date(inst.dueDate).toLocaleDateString("tr-TR")})</span>
                    <span className="font-bold text-slate-800">{inst.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="my-4 py-2 border-t border-b border-slate-100 space-y-2.5 max-h-[22vh] overflow-y-auto panel-scroll">
              {receipt.items.map((i, idx) => (
                <div key={`${i.productName}-${idx}`} className="flex justify-between text-xs text-slate-750">
                  <span className="font-medium text-slate-805">{i.productName} <span className="text-slate-400 font-bold font-mono">x{i.quantity}</span></span>
                  <span className="font-bold font-mono">{i.lineTotal.toLocaleString("tr-TR")} TL</span>
                </div>
              ))}
            </div>
            
            <p className="font-extrabold text-slate-900 text-base sm:text-lg my-4 flex justify-between items-center border-b pb-3 mb-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">GENEL TOPLAM</span>
              <span className="font-mono text-blue-600 text-xl">{receipt.totalAmount.toLocaleString("tr-TR")} TL</span>
            </p>
            
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button 
                  className="py-3 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow active:scale-95 transition flex items-center justify-center gap-1.5" 
                  onClick={() => printReceipt(receipt)}
                >
                  🖨️ Fiş Yazdır
                </button>
                <button 
                  className="py-3 bg-blue-700 hover:bg-blue-650 text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow active:scale-95 transition flex items-center justify-center gap-1.5 disabled:opacity-50" 
                  onClick={generateEArchiveInvoice}
                  disabled={isSigningInvoice}
                >
                  {isSigningInvoice ? "⚡ Bağlanıyor..." : "⚡ e-Arşiv Fatura"}
                </button>
              </div>
              <button 
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-bold rounded-2xl transition active:scale-95" 
                onClick={() => setReceipt(null)}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GİB Signing Progress Overlay */}
      {isSigningInvoice && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 p-4 flex flex-col justify-center items-center">
          <div className="text-center space-y-4 max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-scale-in">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent shadow-md"></div>
            <h3 className="text-white font-extrabold text-base">Gelir İdaresi Başkanlığı</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Fatura verileri şifreleniyor, GİB portalı imza onayı bekleniyor...</p>
            <div className="w-48 h-1 bg-slate-850 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full animate-pulse" style={{ width: "70%" }} />
            </div>
          </div>
        </div>
      )}

      {/* e-Archive Invoice Details Modal */}
      {invoice && receipt && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-md z-50 p-4 flex items-center justify-center animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-200 space-y-6">
            
            {/* GİB official look header */}
            <div className="border-b-2 border-red-600 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="margin: 0 text-xs font-black text-red-600 uppercase tracking-wider">T.C. HAZİNE VE MALİYE BAKANLIĞI</h4>
                <p className="margin: 0 text-[10px] font-bold text-slate-500">Gelir İdaresi Başkanlığı e-Arşiv Sistemi</p>
              </div>
              <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-black tracking-wider uppercase shadow-sm">
                🔒 GİB ONAYLI
              </span>
            </div>

            <h3 className="text-center font-black text-slate-900 tracking-widest text-lg">e-ARŞİV FATURA</h3>

            <div className="grid grid-cols-2 gap-6 text-xs border-b border-slate-100 pb-5">
              <div className="space-y-1.5">
                <p><strong>Fatura No:</strong> <span className="font-mono text-slate-800 font-bold">{invoice.invoiceNo}</span></p>
                <p className="flex flex-col">
                  <strong>ETTN (UUID):</strong> 
                  <span className="font-mono text-[9px] text-slate-400 select-all font-semibold mt-0.5">{invoice.invoiceUuid}</span>
                </p>
                <p><strong>İmza Tarihi:</strong> <span className="text-slate-800">{new Date(invoice.signedAt).toLocaleString("tr-TR")}</span></p>
              </div>
              <div className="space-y-1.5 text-right">
                <p><strong>Gönderici:</strong> <span className="text-slate-800 font-bold">VibeGSM A.Ş.</span></p>
                <p><strong>Vergi Dairesi:</strong> <span className="text-slate-800">Kadıköy V.D.</span></p>
                <p><strong>VKN:</strong> <span className="font-mono text-slate-800">8760054321</span></p>
              </div>
            </div>

            {/* XML/PDF Action buttons */}
            <div className="grid grid-cols-3 gap-2">
              <a 
                href={`${invoice.pdfUrl}&print=true`} 
                target="_blank" 
                rel="noreferrer"
                className="py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 text-center" 
              >
                🖨️ Yazdır (A4)
              </a>
              <a 
                href={invoice.pdfUrl} 
                target="_blank" 
                rel="noreferrer"
                className="py-3 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 text-center" 
              >
                📄 PDF İndir
              </a>
              <a 
                href={invoice.xmlUrl} 
                target="_blank" 
                rel="noreferrer"
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 text-center" 
              >
                🔗 XML Görüntüle
              </a>
            </div>

            {/* KDV Summary Details */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Matrah (KDV Hariç):</span>
                <span className="font-mono font-bold">{(receipt.totalAmount / 1.2).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Hesaplanan KDV (%20):</span>
                <span className="font-mono font-bold">{(receipt.totalAmount - (receipt.totalAmount / 1.2)).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-sm border-t border-slate-200/50 pt-2.5">
                <span>Fatura Genel Toplamı:</span>
                <span className="font-mono text-blue-600 text-base">{receipt.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition active:scale-95" 
                onClick={() => {
                  setInvoice(null);
                  setReceipt(null);
                }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Credit Card Installment Options (Taksit Seçenekleri) */}
      {showInstallmentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 p-4 flex items-center justify-center">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  💳 Taksit Seçenekleri
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kart markalarına göre güncel taksit planları ve oranları listesi.
                </p>
              </div>
              <button
                onClick={() => setShowInstallmentModal(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-100 rounded-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Total Sale Info Banner */}
            <div className="my-4 bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-100 rounded-2xl p-4 flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Sepet Tutarı</span>
                <h4 className="text-xl font-black text-blue-900 font-mono">
                  {total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ödeme Yöntemi</span>
                <p className="text-xs font-extrabold text-slate-700">Taksitli Kredi Kartı</p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6 min-h-[300px]">
              {/* Left Column: Credit Card Brands List */}
              <div className="w-full md:w-1/3 border-r border-slate-100 pr-0 md:pr-4 overflow-y-auto space-y-2 py-1 flex md:flex-col gap-2 md:gap-0 select-none shrink-0 scrollbar-thin">
                {cardConfigs
                  .filter((cfg) => cfg.isActive)
                  .map((cfg) => {
                    const style = getBrandStyle(cfg.brandId);
                    const isSelected = activeModalBrandId === cfg.brandId;
                    return (
                      <button
                        key={cfg.brandId}
                        onClick={() => setActiveModalBrandId(cfg.brandId)}
                        className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition-all border shrink-0 ${
                          isSelected
                            ? "bg-slate-50 border-slate-300 shadow-sm"
                            : "bg-white border-transparent hover:bg-slate-50/70"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${style.bg} shadow-sm shrink-0`} />
                          <span className={`font-bold text-xs sm:text-sm ${isSelected ? "text-slate-900" : "text-slate-600"}`}>
                            {cfg.brandName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {cfg.installments.filter((i) => i.isActive).length > 0 ? (
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md border">
                              {cfg.installments.filter((i) => i.isActive).length} Seçenek
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-md border border-rose-100">
                              Pasif
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                {cardConfigs.filter((cfg) => cfg.isActive).length === 0 && (
                  <div className="text-center p-6 text-slate-400">
                    <p className="text-xs font-semibold">Aktif kart tanımı bulunamadı.</p>
                  </div>
                )}
              </div>

              {/* Right Column: Installment Rates Table */}
              <div className="flex-1 overflow-y-auto py-1 pr-1">
                {(() => {
                  const activeConfig = cardConfigs.find((c) => c.brandId === activeModalBrandId);
                  if (!activeConfig) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-12">
                        <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <p className="text-xs font-semibold">Soldan bir kredi kartı markası seçin.</p>
                      </div>
                    );
                  }

                  const activeInstallments = activeConfig.installments.filter((inst) => inst.isActive);

                  if (activeInstallments.length === 0) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-12">
                        <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-xs font-semibold">{activeConfig.brandName} için aktif taksit oranı bulunmuyor.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <div className="hidden sm:grid grid-cols-4 px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <div>Taksit Sayısı</div>
                        <div className="text-center">Oran</div>
                        <div className="text-right">Aylık Ödeme</div>
                        <div className="text-right">Toplam Tutar</div>
                      </div>

                      <div className="space-y-2">
                        {activeInstallments.map((inst) => {
                          const markupRate = inst.rate;
                          const finalTotal = total * (1 + markupRate / 100);
                          const monthly = Math.round((finalTotal / inst.count) * 100) / 100;
                          const hasPlus = inst.plusInstallment > 0;

                          return (
                            <button
                              key={inst.count}
                              onClick={() => {
                                setInstallmentCount(inst.count);
                                setInterestRate(inst.rate);
                                setSelectedCardBrand({
                                  id: activeConfig.brandId,
                                  name: activeConfig.brandName,
                                });
                                setPaymentMethod("INSTALLMENT");
                                setShowInstallmentModal(false);
                                toast.success(
                                  `${activeConfig.brandName} - ${inst.count} Taksit başarıyla uygulandı.`
                                );
                              }}
                              className="w-full text-left p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 rounded-2xl transition-all duration-200 grid grid-cols-1 sm:grid-cols-4 items-center gap-2 group shadow-sm hover:shadow"
                            >
                              {/* Count & Info */}
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-800 text-sm sm:text-xs font-mono">
                                  {inst.count} Taksit
                                </span>
                                {hasPlus && (
                                  <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-lg border border-emerald-100 flex items-center gap-0.5 whitespace-nowrap animate-pulse">
                                    +{inst.plusInstallment} Taksit
                                  </span>
                                )}
                              </div>

                              {/* Interest Rate */}
                              <div className="text-left sm:text-center">
                                <span className="text-[10px] sm:hidden text-slate-400 font-bold mr-1">Vade Farkı:</span>
                                {markupRate === 0 ? (
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                    Peşin Fiyatına
                                  </span>
                                ) : (
                                  <span className="font-bold text-slate-700 text-xs font-mono">
                                    %{markupRate}
                                  </span>
                                )}
                              </div>

                              {/* Monthly Payment */}
                              <div className="text-left sm:text-right">
                                <span className="text-[10px] sm:hidden text-slate-400 font-bold mr-1">Aylık:</span>
                                <span className="font-black text-slate-900 text-sm sm:text-xs font-mono">
                                  {monthly.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                                </span>
                              </div>

                              {/* Total Price */}
                              <div className="text-left sm:text-right flex items-center justify-between sm:justify-end gap-2">
                                <div>
                                  <span className="text-[10px] sm:hidden text-slate-400 font-bold mr-1">Toplam:</span>
                                  <span className="font-black text-blue-600 text-sm sm:text-xs font-mono group-hover:text-blue-700">
                                    {finalTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                                  </span>
                                </div>
                                <span className="hidden sm:inline-flex w-6 h-6 rounded-full bg-slate-200 group-hover:bg-blue-500 group-hover:text-white items-center justify-center text-xs font-bold text-slate-600 transition-all">
                                  →
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setShowInstallmentModal(false)}
                className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition active:scale-95"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog}
    </section>
  );
}
