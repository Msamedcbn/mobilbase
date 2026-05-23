"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type SettingsState = {
  whatsappEnabled: boolean;
  whatsappNumber: string;
  repairTemplate: string;
  veresiyeTemplate: string;
  installmentTemplate: string;
};

const DEFAULT_SETTINGS: SettingsState = {
  whatsappEnabled: false,
  whatsappNumber: "",
  repairTemplate: "Merhaba {ad_soyad}, {cihaz_marka} {cihaz_model} cihazınızın teknik servis durumu güncellendi. Durum: {durum}. Toplam Tutar: {tutar} TL. Bilgi almak için bizi arayabilirsiniz. İyi günler dileriz. - TelefoncuPro",
  veresiyeTemplate: "Sayın {ad_soyad}, cari hesabınızdaki güncel borç bakiyeniz {bakiye} TL'dir. Ödemenizi en kısa sürede yapmanızı rica ederiz. İyi çalışmalar.",
  installmentTemplate: "Merhaba {ad_soyad}, {islem_no} numaralı alışverişinize ait {taksit_no}. taksit ödemeniz ({tutar} TL) vadesi ({vade}) gelmiştir. Ödemenizi en kısa sürede tamamlamanızı rica ederiz. İyi günler dileriz.",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"repair" | "veresiye" | "installment">("repair");

  useEffect(() => {
    // Check user auth role
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        setIsAdmin(json.user?.role === "ADMIN");
      })
      .catch(() => setIsAdmin(false));

    // Fetch existing settings
    fetch("/api/settings")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json) => {
        const data = json.data || json;
        setSettings({
          whatsappEnabled: data.whatsappEnabled ?? false,
          whatsappNumber: data.whatsappNumber ?? "",
          repairTemplate: data.repairTemplate || DEFAULT_SETTINGS.repairTemplate,
          veresiyeTemplate: data.veresiyeTemplate || DEFAULT_SETTINGS.veresiyeTemplate,
          installmentTemplate: data.installmentTemplate || DEFAULT_SETTINGS.installmentTemplate,
        });
      })
      .catch(() => {
        toast.error("Ayarlar yüklenirken bir hata oluştu.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Ayarları güncellemek için yönetici yetkiniz olmalıdır.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Güncellenemedi.");
      }

      toast.success("Ayarlar başarıyla kaydedildi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sistem hatası.");
    } finally {
      setSaving(false);
    }
  };

  // Helper function to mock replacing placeholders for live preview
  const getPreviewText = () => {
    if (activeTab === "repair") {
      return settings.repairTemplate
        .replace(/{ad_soyad}/g, "Ahmet Yılmaz")
        .replace(/{cihaz_marka}/g, "Apple")
        .replace(/{cihaz_model}/g, "iPhone 13")
        .replace(/{durum}/g, "HAZIR (Ekran Değişimi Tamamlandı)")
        .replace(/{tutar}/g, "2.500")
        .replace(/{servis_no}/g, "REP-8A2F");
    } else if (activeTab === "veresiye") {
      return settings.veresiyeTemplate
        .replace(/{ad_soyad}/g, "Ahmet Yılmaz")
        .replace(/{bakiye}/g, "1.750,00");
    } else {
      return settings.installmentTemplate
        .replace(/{ad_soyad}/g, "Ahmet Yılmaz")
        .replace(/{islem_no}/g, "POS-171629")
        .replace(/{taksit_no}/g, "2")
        .replace(/{tutar}/g, "850,00")
        .replace(/{vade}/g, "15.06.2026");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Sistem & Entegrasyon Ayarları</h2>
        <p className="text-sm text-slate-500 mt-1">
          Bildirim kanalları, şablonlar ve otomatik bilgilendirme kurulumlarını yönetin.
        </p>
      </div>

      {!isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm font-medium flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Görüntüleme Modu: Sistem ayarlarını sadece yönetici (ADMIN) rolündeki kullanıcılar düzenleyebilir.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Channel Setup status & SMS status */}
          <div className="lg:col-span-1 space-y-6">
            {/* WhatsApp setup status card */}
            <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 1.981 14.111.957 11.997.957c-5.439 0-9.862 4.37-9.866 9.801-.002 1.761.478 3.483 1.393 5.015l-.997 3.64 3.738-.97c1.547.842 3.12 1.282 4.379 1.282zm10.742-7.85c-.29-.145-1.716-.848-1.983-.945-.267-.097-.461-.145-.655.145-.194.29-.752.945-.921 1.14-.169.194-.339.219-.63.073-.29-.145-1.229-.453-2.34-1.445-.864-.77-1.447-1.722-1.617-2.013-.17-.29-.018-.447.127-.592.13-.13.29-.339.436-.509.145-.17.194-.29.291-.485.097-.194.049-.364-.024-.509-.073-.145-.655-1.577-.898-2.16-.236-.57-.478-.49-.655-.499-.17-.008-.364-.01-.558-.01-.194 0-.509.073-.776.364-.267.29-1.02 1.02-1.02 2.475 0 1.455 1.069 2.859 1.214 3.053.145.194 2.1 3.21 5.09 4.5 1.776.767 2.477.83 3.364.698.544-.08 1.716-.703 1.958-1.382.242-.679.242-1.261.169-1.382-.072-.12-.267-.194-.557-.339z" />
                    </svg>
                  </span>
                  WhatsApp
                </h3>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${settings.whatsappEnabled && settings.whatsappNumber ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                  {settings.whatsappEnabled && settings.whatsappNumber ? "Kurulum Aktif" : "Kurulum Bekliyor"}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Otomatik Bilgi İletimi</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.whatsappEnabled}
                      onChange={(e) => setSettings({ ...settings, whatsappEnabled: e.target.checked })}
                      disabled={!isAdmin}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">
                    İşletme WhatsApp Numarası
                  </label>
                  <input
                    type="text"
                    className="field border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                    placeholder="Örn: 905551234567"
                    value={settings.whatsappNumber}
                    onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                    disabled={!isAdmin}
                  />
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Numarayı ülke kodu dahil boşluksuz giriniz (Örn: 905XXXXXXXXX).
                  </p>
                </div>
              </div>
            </div>

            {/* SMS status card (Strictly disabled) */}
            <div className="panel bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-400 flex items-center gap-2">
                  <span className="p-1.5 bg-slate-200 text-slate-500 rounded-lg">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </span>
                  SMS Entegrasyonu
                </h3>
                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Sunulmamaktadır
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  TelefoncuPro altyapısı tenant işletmeler için doğrudan SMS entegrasyonu sunmamaktadır.
                </p>
                <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-rose-800 text-[11px] leading-normal font-medium">
                  WhatsApp üzerinden bilgi iletimi tamamen ücretsiz, sınırsız ve daha yüksek erişim oranına sahip olduğu için bu kanalı kullanmanız önerilir.
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">
                    SMS Servis Sağlayıcısı API Key
                  </label>
                  <input
                    type="password"
                    className="field bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed text-xs font-mono"
                    value="••••••••••••••••••••"
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Template Customization & Chat Preview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="panel bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              {/* Tab selector */}
              <div className="flex border-b border-slate-100 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setActiveTab("repair")}
                  className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition ${activeTab === "repair" ? "border-teal-600 text-teal-600 bg-white" : "border-transparent text-slate-600 hover:text-slate-900"}`}
                >
                  Teknik Servis Bildirimi
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("veresiye")}
                  className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition ${activeTab === "veresiye" ? "border-teal-600 text-teal-600 bg-white" : "border-transparent text-slate-600 hover:text-slate-900"}`}
                >
                  Veresiye Hatırlatması
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("installment")}
                  className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition ${activeTab === "installment" ? "border-teal-600 text-teal-600 bg-white" : "border-transparent text-slate-600 hover:text-slate-900"}`}
                >
                  Taksit Hatırlatması
                </button>
              </div>

              {/* Edit inputs and placeholders */}
              <div className="p-6 space-y-6 flex-1">
                {activeTab === "repair" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase">Şablon Mesajı</span>
                      <span className="text-xs text-slate-400 font-medium">Teknik servis durumu değiştiğinde gönderilir.</span>
                    </div>
                    <textarea
                      rows={5}
                      className="field font-sans border-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none text-slate-900 leading-relaxed"
                      value={settings.repairTemplate}
                      onChange={(e) => setSettings({ ...settings, repairTemplate: e.target.value })}
                      placeholder="Teknik servis şablonu..."
                      disabled={!isAdmin}
                    />
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                      <span className="block text-[11px] font-bold text-slate-600 uppercase">Kullanılabilir Değişkenler:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {["{ad_soyad}", "{cihaz_marka}", "{cihaz_model}", "{durum}", "{tutar}", "{servis_no}"].map((ph) => (
                          <code key={ph} className="px-2 py-0.5 bg-slate-200/60 rounded text-[11px] font-mono text-slate-700">
                            {ph}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "veresiye" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase">Şablon Mesajı</span>
                      <span className="text-xs text-slate-400 font-medium">Borçlu cari hesaba hatırlatma yaparken gönderilir.</span>
                    </div>
                    <textarea
                      rows={5}
                      className="field font-sans border-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none text-slate-900 leading-relaxed"
                      value={settings.veresiyeTemplate}
                      onChange={(e) => setSettings({ ...settings, veresiyeTemplate: e.target.value })}
                      placeholder="Veresiye şablonu..."
                      disabled={!isAdmin}
                    />
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                      <span className="block text-[11px] font-bold text-slate-600 uppercase">Kullanılabilir Değişkenler:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {["{ad_soyad}", "{bakiye}"].map((ph) => (
                          <code key={ph} className="px-2 py-0.5 bg-slate-200/60 rounded text-[11px] font-mono text-slate-700">
                            {ph}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "installment" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase">Şablon Mesajı</span>
                      <span className="text-xs text-slate-400 font-medium">Taksit vadesi gelen müşteriye gönderilir.</span>
                    </div>
                    <textarea
                      rows={5}
                      className="field font-sans border-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none text-slate-900 leading-relaxed"
                      value={settings.installmentTemplate}
                      onChange={(e) => setSettings({ ...settings, installmentTemplate: e.target.value })}
                      placeholder="Taksit şablonu..."
                      disabled={!isAdmin}
                    />
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                      <span className="block text-[11px] font-bold text-slate-600 uppercase">Kullanılabilir Değişkenler:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {["{ad_soyad}", "{islem_no}", "{taksit_no}", "{tutar}", "{vade}"].map((ph) => (
                          <code key={ph} className="px-2 py-0.5 bg-slate-200/60 rounded text-[11px] font-mono text-slate-700">
                            {ph}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* WhatsApp simulated chat preview */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Müşteri Mesaj Önizlemesi
                  </span>
                  <div className="rounded-2xl bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-cover p-4 min-h-[160px] flex items-end">
                    <div className="max-w-[85%] bg-[#d9fdd3] text-slate-900 text-[12.5px] rounded-xl rounded-bl-none p-3 shadow-md relative leading-relaxed">
                      <div className="whitespace-pre-wrap">{getPreviewText()}</div>
                      <span className="block text-[9px] text-slate-500 text-right mt-1 font-mono">
                        {new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action bar */}
        {isAdmin && (
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-600/10 active:scale-95 transition flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Ayarları Kaydet
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
