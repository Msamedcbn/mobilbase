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
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 className="page-title" style={{ margin: 0 }}>Distribütör Entegrasyonu</h2>
        <button onClick={handleDownloadTemplate} className="primary-btn" style={{ backgroundColor: "#0f766e" }}>
          📥 Örnek Şablon İndir ({distributor})
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: "2rem" }}>
        {/* Configurations panel */}
        <div className="panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontWeight: 700 }}>1. Distribütör Seçimi & Yükleme</h3>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Tedarikçi Firması</label>
            <select
              className="field"
              value={distributor}
              onChange={(e) => setDistributor(e.target.value)}
              disabled={isImporting}
            >
              <option value="KVK">KVK Yedek Parça & Cihaz</option>
              <option value="Genpa">Genpa Distribütörlük</option>
              <option value="Index">Index Bilişim</option>
              <option value="ToptanParca">Genel Toptancı CSV</option>
            </select>
          </div>

          <div 
            style={{
              border: "2px dashed var(--border)",
              borderRadius: "12px",
              padding: "2rem 1rem",
              textAlign: "center",
              cursor: "pointer",
              background: "rgba(255, 255, 255, 0.02)",
              transition: "border-color 0.2s",
            }}
            onClick={() => !isImporting && fileInputRef.current?.click()}
          >
            <span style={{ fontSize: 32, display: "block", marginBottom: 10 }}>📄</span>
            {fileName ? (
              <div>
                <p style={{ fontWeight: 600, margin: "0 0 4px", fontSize: 14 }}>{fileName}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Dosyayı değiştirmek için tıklayın</p>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 600, margin: "0 0 4px", fontSize: 14 }}>CSV Dosyasını Sürükleyin veya Seçin</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Desteklenen format: .csv (UTF-8)</p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              style={{ display: "none" }}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              onClick={handleImport}
              disabled={isImporting || !csvContent}
              className="primary-btn"
              style={{ width: "100%", padding: "10px", fontWeight: "bold" }}
            >
              {isImporting ? "Ürünler Aktarılıyor..." : "İçe Aktarmayı Başlat"}
            </button>
          </div>

          {/* Progress bar */}
          {isImporting && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span>Ayrıştırılıyor ve güncelleniyor...</span>
                <span>%{progress}</span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                <div 
                  style={{ 
                    height: "100%", 
                    width: `${progress}%`, 
                    background: "linear-gradient(90deg, #0f766e, #2dd4bf)", 
                    transition: "width 0.2s ease-out" 
                  }} 
                />
              </div>
            </div>
          )}

          {/* Import Result Notification */}
          {result && (
            <div 
              style={{ 
                marginTop: 20, 
                padding: "1rem", 
                backgroundColor: "rgba(16, 185, 129, 0.05)", 
                border: "1px solid rgba(16, 185, 129, 0.2)", 
                borderRadius: "8px" 
              }}
            >
              <h4 style={{ margin: "0 0 8px", color: "#10b981", fontWeight: 700 }}>Aktarım Özeti</h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                <li>Toplam İşlenen: <strong>{result.totalProcessed}</strong></li>
                <li>Yeni Eklenen Ürünler: <strong>{result.insertedCount}</strong></li>
                <li>Fiyatı/Stoğu Güncellenenler: <strong>{result.updatedCount}</strong></li>
              </ul>
            </div>
          )}
        </div>

        {/* Column mappings and info */}
        <div className="panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontWeight: 700 }}>Şablon Kuralları</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 12 }}>
            Sistemin yüklediğiniz CSV dosyasını doğru okuyabilmesi için aşağıdaki sütun sırasına tam olarak uymanız gerekmektedir:
          </p>
          
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                <th style={{ padding: "6px 4px" }}>Sıra</th>
                <th style={{ padding: "6px 4px" }}>Sütun Adı</th>
                <th style={{ padding: "6px 4px" }}>Tip</th>
                <th style={{ padding: "6px 4px" }}>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <td style={{ padding: "6px 4px" }}>1</td>
                <td style={{ padding: "6px 4px" }}><strong>Ürün Adı</strong></td>
                <td style={{ padding: "6px 4px", color: "var(--text-muted)" }}>Metin</td>
                <td style={{ padding: "6px 4px" }}>Ürünün katalog ismi.</td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <td style={{ padding: "6px 4px" }}>2</td>
                <td style={{ padding: "6px 4px" }}><strong>Barkod</strong></td>
                <td style={{ padding: "6px 4px", color: "var(--text-muted)" }}>Metin</td>
                <td style={{ padding: "6px 4px" }}>Benzersiz barkod numarası. (Mevcut ise güncellenir)</td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <td style={{ padding: "6px 4px" }}>3</td>
                <td style={{ padding: "6px 4px" }}><strong>Kategori</strong></td>
                <td style={{ padding: "6px 4px", color: "var(--text-muted)" }}>Metin</td>
                <td style={{ padding: "6px 4px" }}>Varsayılan: Aksesuar</td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <td style={{ padding: "6px 4px" }}>4</td>
                <td style={{ padding: "6px 4px" }}><strong>Alış Fiyatı</strong></td>
                <td style={{ padding: "6px 4px", color: "var(--text-muted)" }}>Sayı (Float)</td>
                <td style={{ padding: "6px 4px" }}>Tedarikçiden alış fiyatı.</td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <td style={{ padding: "6px 4px" }}>5</td>
                <td style={{ padding: "6px 4px" }}><strong>Satış Fiyatı</strong></td>
                <td style={{ padding: "6px 4px", color: "var(--text-muted)" }}>Sayı (Float)</td>
                <td style={{ padding: "6px 4px" }}>Mağaza satış fiyatı.</td>
              </tr>
              <tr>
                <td style={{ padding: "6px 4px" }}>6</td>
                <td style={{ padding: "6px 4px" }}><strong>Stok</strong></td>
                <td style={{ padding: "6px 4px", color: "var(--text-muted)" }}>Sayı (Int)</td>
                <td style={{ padding: "6px 4px" }}>Eklenecek stok miktarı. (Mevcut stoğa eklenir)</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 16, padding: 12, backgroundColor: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: 8, display: "flex", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
              <strong>Not:</strong> İçe aktarılan dosyadaki barkod sistemde zaten varsa, ürün adı, fiyatı ve kategorisi güncellenecek, yeni stok miktarı mevcut stoğun üzerine eklenecektir.
            </p>
          </div>
        </div>
      </div>

      {/* CSV Preview Table */}
      {previewProducts.length > 0 && (
        <div className="panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontWeight: 700 }}>Yüklenen Dosya Önizlemesi</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>İçe aktarılacak ilk 10 ürünün önizlemesi:</p>
          
          <div className="panel-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Barkod</th>
                  <th>Ürün Adı</th>
                  <th>Kategori</th>
                  <th style={{ textAlign: "right" }}>Alış Fiyatı</th>
                  <th style={{ textAlign: "right" }}>Satış Fiyatı</th>
                  <th style={{ textAlign: "right" }}>Eklenen Stok</th>
                </tr>
              </thead>
              <tbody>
                {previewProducts.slice(0, 10).map((prod, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{prod.barcode}</td>
                    <td style={{ fontWeight: 600 }}>{prod.name}</td>
                    <td><span style={{ fontSize: 11, padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>{prod.category}</span></td>
                    <td style={{ textAlign: "right" }}>{prod.purchasePrice.toFixed(2)} TL</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{prod.salePrice.toFixed(2)} TL</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#0f766e" }}>+{prod.stock} adet</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewProducts.length > 10 && (
            <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 12, marginBottom: 0 }}>
              ve diğer {previewProducts.length - 10} ürün daha...
            </p>
          )}
        </div>
      )}
    </section>
  );
}
