"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";

type ParsedProduct = {
  name: string;
  barcode: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
};

export default function DistributorImportPage() {
  const [distributor, setDistributor] = useState("KVK");
  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [previewProducts, setPreviewProducts] = useState<ParsedProduct[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    insertedCount: number;
    updatedCount: number;
    totalProcessed: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV template string
  const templateCsv = `Ürün Adı,Barkod,Kategori,Alış Fiyatı,Satış Fiyatı,Stok\nSamsung Galaxy S23 Ekran,868000100201,Yedek Parça,2450.00,3200.00,15\niPhone 14 Pro Max Kilif,868000100202,Aksesuar,250.00,450.00,50\nXiaomi Redmi Note 12 Batarya,868000100203,Yedek Parça,450.00,750.00,20`;

  function handleDownloadTemplate() {
    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${distributor.toLowerCase()}_sablon.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Şablon CSV dosyası indirildi.");
  }

  function parseCsvContent(text: string) {
    try {
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lines.length < 2) {
        toast.warning("Dosyada yeterli satır bulunmuyor.");
        return;
      }

      const header = lines[0];
      const delimiter = header.includes(";") ? ";" : ",";
      const dataLines = lines.slice(1);

      const parsed: ParsedProduct[] = dataLines
        .map((line) => {
          const parts = line.split(delimiter).map((p) => p.trim());
          return {
            name: parts[0] || "",
            barcode: parts[1] || "",
            category: parts[2] || "Aksesuar",
            purchasePrice: parseFloat(parts[3] || "0") || 0,
            salePrice: parseFloat(parts[4] || "0") || 0,
            stock: parseInt(parts[5] || "0", 10) || 0,
          };
        })
        .filter((r) => r.name && r.barcode);

      setPreviewProducts(parsed);
      setCsvContent(text);
      if (parsed.length === 0) {
        toast.warning("Geçerli ürün bulunamadı. Lütfen kolon sırasını kontrol edin.");
      } else {
        toast.success(`${parsed.length} ürün önizleme için başarıyla yüklendi.`);
      }
    } catch {
      toast.error("CSV ayrıştırma hatası. Dosya formatını kontrol edin.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);
    setProgress(0);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCsvContent(text);
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImport() {
    if (!csvContent || previewProducts.length === 0) {
      toast.warning("Lütfen öncelikle geçerli bir CSV dosyası yükleyin.");
      return;
    }

    setIsImporting(true);
    setProgress(10);
    setResult(null);

    // Simulate progress animation for UX
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 80) {
          clearInterval(interval);
          return 80;
        }
        return prev + 15;
      });
    }, 200);

    try {
      const res = await fetch("/api/distributors/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distributor,
          csvContent,
        }),
      });

      const data = await res.json();
      clearInterval(interval);
      setProgress(100);

      if (!res.ok) {
        throw new Error(data.error || "İçe aktarım başarısız oldu.");
      }

      setResult({
        insertedCount: data.data?.insertedCount || 0,
        updatedCount: data.data?.updatedCount || 0,
        totalProcessed: data.data?.totalProcessed || 0,
      });

      toast.success(data.message || "İçe aktarım tamamlandı!");
      setPreviewProducts([]);
      setCsvContent("");
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      clearInterval(interval);
      setProgress(0);
      toast.error(err instanceof Error ? err.message : "İşlem sırasında bir hata oluştu");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="space-y-6 pb-12 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-black tracking-tight text-slate-900">Distribütör Entegrasyonu</h2>
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all shadow-sm active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
          Örnek Şablon İndir ({distributor})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurations panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">1. Distribütör Seçimi &amp; Yükleme</h3>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-2">Tedarikçi Firması</label>
            <select
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={distributor}
              onChange={(e) => setDistributor(e.target.value)}
              disabled={isImporting}
            >
              <option value="KVK">KVK Yedek Parça &amp; Cihaz</option>
              <option value="Genpa">Genpa Distribütörlük</option>
              <option value="Index">Index Bilişim</option>
              <option value="ToptanParca">Genel Toptancı CSV</option>
            </select>
          </div>

          <div
            onClick={() => !isImporting && fileInputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-300 bg-slate-50/60 hover:bg-blue-50/30 transition-colors cursor-pointer text-center py-10 px-4"
          >
            <svg className="w-8 h-8 mx-auto mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v6m0 0l-2.5-2.5M12 17l2.5-2.5" />
            </svg>
            {fileName ? (
              <div>
                <p className="font-semibold text-sm text-slate-900 mb-1 font-mono">{fileName}</p>
                <p className="text-xs text-slate-500">Dosyayı değiştirmek için tıklayın</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-sm text-slate-900 mb-1">CSV Dosyasını Sürükleyin veya Seçin</p>
                <p className="text-xs text-slate-500">Desteklenen format: .csv (UTF-8)</p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
          </div>

          <button
            onClick={handleImport}
            disabled={isImporting || !csvContent}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95"
          >
            {isImporting ? "Ürünler Aktarılıyor..." : "İçe Aktarmayı Başlat"}
          </button>

          {/* Progress bar */}
          {isImporting && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Ayrıştırılıyor ve güncelleniyor...</span>
                <span className="font-mono font-semibold text-blue-600">%{progress}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-200 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Import Result Notification */}
          {result && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
              <h4 className="text-sm font-bold text-emerald-700">Aktarım Özeti</h4>
              <ul className="space-y-1 text-sm text-emerald-800">
                <li className="flex justify-between">
                  <span>Toplam İşlenen</span>
                  <span className="font-mono font-semibold">{result.totalProcessed}</span>
                </li>
                <li className="flex justify-between">
                  <span>Yeni Eklenen Ürünler</span>
                  <span className="font-mono font-semibold">{result.insertedCount}</span>
                </li>
                <li className="flex justify-between">
                  <span>Fiyatı/Stoğu Güncellenenler</span>
                  <span className="font-mono font-semibold">{result.updatedCount}</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Column mappings and info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-2">Şablon Kuralları</h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">
            Sistemin yüklediğiniz CSV dosyasını doğru okuyabilmesi için aşağıdaki sütun sırasına tam olarak uymanız gerekmektedir:
          </p>

          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs border-collapse min-w-[420px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 px-1 font-semibold">Sıra</th>
                  <th className="py-2 px-1 font-semibold">Sütun Adı</th>
                  <th className="py-2 px-1 font-semibold">Tip</th>
                  <th className="py-2 px-1 font-semibold">Açıklama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-2 px-1 font-mono">1</td>
                  <td className="py-2 px-1 font-semibold">Ürün Adı</td>
                  <td className="py-2 px-1 text-slate-500">Metin</td>
                  <td className="py-2 px-1">Ürünün katalog ismi.</td>
                </tr>
                <tr>
                  <td className="py-2 px-1 font-mono">2</td>
                  <td className="py-2 px-1 font-semibold">Barkod</td>
                  <td className="py-2 px-1 text-slate-500">Metin</td>
                  <td className="py-2 px-1">Benzersiz barkod numarası. (Mevcut ise güncellenir)</td>
                </tr>
                <tr>
                  <td className="py-2 px-1 font-mono">3</td>
                  <td className="py-2 px-1 font-semibold">Kategori</td>
                  <td className="py-2 px-1 text-slate-500">Metin</td>
                  <td className="py-2 px-1">Varsayılan: Aksesuar</td>
                </tr>
                <tr>
                  <td className="py-2 px-1 font-mono">4</td>
                  <td className="py-2 px-1 font-semibold">Alış Fiyatı</td>
                  <td className="py-2 px-1 text-slate-500">Sayı (Float)</td>
                  <td className="py-2 px-1">Tedarikçiden alış fiyatı.</td>
                </tr>
                <tr>
                  <td className="py-2 px-1 font-mono">5</td>
                  <td className="py-2 px-1 font-semibold">Satış Fiyatı</td>
                  <td className="py-2 px-1 text-slate-500">Sayı (Float)</td>
                  <td className="py-2 px-1">Mağaza satış fiyatı.</td>
                </tr>
                <tr>
                  <td className="py-2 px-1 font-mono">6</td>
                  <td className="py-2 px-1 font-semibold">Stok</td>
                  <td className="py-2 px-1 text-slate-500">Sayı (Int)</td>
                  <td className="py-2 px-1">Eklenecek stok miktarı. (Mevcut stoğa eklenir)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-8.25 3.75h.008v.008h-.008v-.008z" />
            </svg>
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong className="font-semibold">Not:</strong> İçe aktarılan dosyadaki barkod sistemde zaten varsa, ürün adı, fiyatı ve kategorisi güncellenecek, yeni stok miktarı mevcut stoğun üzerine eklenecektir.
            </p>
          </div>
        </div>
      </div>

      {/* CSV Preview Table */}
      {previewProducts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1">Yüklenen Dosya Önizlemesi</h3>
          <p className="text-sm text-slate-500 mb-4">İçe aktarılacak ilk 10 ürünün önizlemesi:</p>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-3">Barkod</th>
                  <th className="px-4 py-3">Ürün Adı</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3 text-right">Alış Fiyatı</th>
                  <th className="px-4 py-3 text-right">Satış Fiyatı</th>
                  <th className="px-4 py-3 text-right">Eklenen Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {previewProducts.slice(0, 10).map((prod, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{prod.barcode}</td>
                    <td className="px-4 py-3 font-semibold">{prod.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{prod.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{prod.purchasePrice.toFixed(2)} TL</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{prod.salePrice.toFixed(2)} TL</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">+{prod.stock} adet</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewProducts.length > 10 && (
            <p className="text-center text-xs text-slate-500 mt-3">
              ve diğer <span className="font-mono">{previewProducts.length - 10}</span> ürün daha...
            </p>
          )}
        </div>
      )}
    </section>
  );
}
