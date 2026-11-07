/**
 * Ana sayfadaki "Sık Sorulan Sorular" botunun içeriği.
 *
 * Yapay zekâ yok: her düğüm sabit bir cevap ve ziyaretçinin seçebileceği
 * sonraki soruları tutar. Yeni soru eklemek için FAQ_NODES'a bir düğüm ekleyip
 * ilgili menünün `options` listesine id'sini yazmak yeterli.
 */
import { ANNUAL_DISCOUNT_PCT, PLAN_PRICE_TRY } from "@/lib/subscription-plans";

export const SALES_WHATSAPP_NUMBER = "905525751101";

export type FaqOption = { label: string; next: string };

export type FaqNode = {
  /** Ziyaretçinin seçtiği soru — sohbet balonunda ve WhatsApp mesajında görünür. */
  question: string;
  /** Botun cevabı. Her eleman ayrı bir paragraf olarak gösterilir. */
  answer: string[];
  options: FaqOption[];
};

export const FAQ_ROOT_ID = "menu";

const fmt = (n: number) => n.toLocaleString("tr-TR");

const BACK_TO_MENU: FaqOption = { label: "↩︎ Ana menü", next: FAQ_ROOT_ID };
const FEATURES_MENU: FaqOption = { label: "↩︎ Diğer özellikler", next: "features" };

export const FAQ_NODES: Record<string, FaqNode> = {
  [FAQ_ROOT_ID]: {
    question: "Ana menü",
    answer: [
      "Merhaba! 👋 Ben VibeGSM asistanı.",
      "Aşağıdan merak ettiğiniz konuyu seçin, hemen cevaplayayım. Cevabını bulamazsanız ekibimize WhatsApp'tan ulaşabilirsiniz.",
    ],
    options: [
      { label: "VibeGSM nedir?", next: "what" },
      { label: "Hangi özellikler var?", next: "features" },
      { label: "Fiyatlar ne kadar?", next: "pricing" },
      { label: "Ücretsiz deneme var mı?", next: "trial" },
      { label: "Verilerimi nasıl aktarırım?", next: "migration" },
      { label: "Kurulum veya donanım gerekir mi?", next: "setup" },
      { label: "Birden fazla şubem var", next: "branches" },
      { label: "Verilerim güvende mi?", next: "security" },
      { label: "Sözleşme / iptal", next: "contract" },
    ],
  },

  what: {
    question: "VibeGSM nedir?",
    answer: [
      "VibeGSM, telefon bayileri ve teknik servisler için geliştirilmiş bulut tabanlı bir dükkan yönetim sistemidir.",
      "Satış (POS), teknik servis, IMEI bazlı stok, veresiye/cari, ikinci el alım, kasa ve şube yönetimi tek panelde toplanır.",
      "Bilgisayar, tablet veya telefondan tarayıcıyla girersiniz; dükkanda olmasanız da ciro, kâr ve stoğu anlık görebilirsiniz.",
    ],
    options: [
      { label: "Hangi özellikler var?", next: "features" },
      { label: "Fiyatlar ne kadar?", next: "pricing" },
      BACK_TO_MENU,
    ],
  },

  features: {
    question: "Hangi özellikler var?",
    answer: [
      "Tek pakette tüm modüller dahil, ek modül ücreti yok. Hangi konuyu detaylı görmek istersiniz?",
    ],
    options: [
      { label: "Satış, POS ve cari", next: "f_sales" },
      { label: "Teknik servis", next: "f_repair" },
      { label: "Stok ve IMEI takibi", next: "f_stock" },
      { label: "İkinci el alım", next: "f_buyback" },
      { label: "Kasa, personel ve raporlar", next: "f_finance" },
      BACK_TO_MENU,
    ],
  },

  f_sales: {
    question: "Satış, POS ve cari",
    answer: [
      "• Hızlı Satış (POS): barkod veya IMEI ile saniyeler içinde satış.",
      "• Müşteriler ve cari: her müşterinin borç/alacak bakiyesi anlık görünür; müşteri bazlı borç limiti tanımlanabilir.",
      "• Taksit yönetimi: taksitli satışlar ve vadesi gelen ödemeler takip edilir, müşteriye tek tıkla WhatsApp hatırlatması gönderilir.",
      "• Kurumsal teklifler: firmalara toplu teklif hazırlanır.",
    ],
    options: [{ label: "Teknik servis", next: "f_repair" }, FEATURES_MENU, BACK_TO_MENU],
  },

  f_repair: {
    question: "Teknik servis",
    answer: [
      "• Cihaz kabul: kabulde cihazın fiziksel durumu (çizik, ekran, kamera vb.) ve ekran şifresi kayıt altına alınır; \"verirken bu çizik yoktu\" tartışmaları biter.",
      "• Tamir takip: cihaz kabulden teslime kadar hangi aşamada olduğu görünür.",
      "• Parça ve onarım fiyatları: model bazlı parça ve işçilik fiyat listesi.",
      "• Teknisyen hakedişleri: kim hangi işi yaptı, prim hesabı otomatik çıkar.",
    ],
    options: [{ label: "Stok ve IMEI takibi", next: "f_stock" }, FEATURES_MENU, BACK_TO_MENU],
  },

  f_stock: {
    question: "Stok ve IMEI takibi",
    answer: [
      "• Her cihaz tekil IMEI / seri numarasıyla kayıtlı; mükerrer veya hatalı kayıt oluşmaz.",
      "• Hangi cihaz hangi şubede, maliyeti ne, tek ekranda görünür.",
      "• Aksesuar ve yedek parça stokları satışta otomatik düşer.",
      "• Toptan alış, distribütör ithalatı ve tedarikçiye vadeli borçlar da takip edilir.",
    ],
    options: [{ label: "İkinci el alım", next: "f_buyback" }, FEATURES_MENU, BACK_TO_MENU],
  },

  f_buyback: {
    question: "İkinci el alım",
    answer: [
      "• Vatandaştan cihaz alırken satıcının kimlik bilgisi ve cihazın IMEI'si kayıt altına alınır, muvafakatname belgesi hazırlanır.",
      "• Böylece cihazın geçmişi belgeli olur; alınan cihaz doğrudan stoğa girer.",
      "• Takas ve ikinci el fiyat hesaplaması yapılabilir.",
    ],
    options: [{ label: "Kasa, personel ve raporlar", next: "f_finance" }, FEATURES_MENU, BACK_TO_MENU],
  },

  f_finance: {
    question: "Kasa, personel ve raporlar",
    answer: [
      "• Kasa ve banka: nakit, kart ve banka hareketleri.",
      "• İşletme giderleri ve kâr/zarar analizi: dükkanın gerçek kârını görürsünüz.",
      "• Personel ve hakediş: personel kayıtları ve prim hesapları.",
      "• Denetim kayıtları: personelin sistemde yaptığı işlemler kayıt altında.",
    ],
    options: [{ label: "Birden fazla şubem var", next: "branches" }, FEATURES_MENU, BACK_TO_MENU],
  },

  pricing: {
    question: "Fiyatlar ne kadar?",
    answer: [
      "Tek paket var ve tüm özellikler dahil:",
      `• Aylık: ${fmt(PLAN_PRICE_TRY.monthly)} TL`,
      `• Yıllık: ${fmt(PLAN_PRICE_TRY.annual)} TL (aylığa göre %${ANNUAL_DISCOUNT_PCT} indirimli, tek seferde ödenir)`,
      "Ek modül veya kurulum ücreti yok. Satın almadan önce 7 gün ücretsiz deneyebilirsiniz.",
    ],
    options: [
      { label: "Ücretsiz deneme var mı?", next: "trial" },
      { label: "Sözleşme / iptal", next: "contract" },
      BACK_TO_MENU,
    ],
  },

  trial: {
    question: "Ücretsiz deneme var mı?",
    answer: [
      "Evet, 7 gün boyunca tüm özellikleri ücretsiz kullanabilirsiniz.",
      "Sitedeki \"7 Gün Ücretsiz Deneyin\" düğmesinden birkaç dakikada hesabınızı oluşturabilirsiniz. Deneme süresi bitince ekibimiz sizinle WhatsApp'tan iletişime geçer.",
    ],
    options: [
      { label: "Verilerimi nasıl aktarırım?", next: "migration" },
      { label: "Fiyatlar ne kadar?", next: "pricing" },
      BACK_TO_MENU,
    ],
  },

  migration: {
    question: "Verilerimi nasıl aktarırım?",
    answer: [
      "Ekibimiz mevcut Excel, defter ve stok listelerinizi sizinle birlikte VibeGSM'e aktarır.",
      "Aktarım sırasında hiçbir kayıt silinmez; stok, müşteri ve cari bilgileriniz sistemde karşılığını bulur.",
      "Çoğu bayi aynı hafta içinde sistemle satışa başlıyor.",
    ],
    options: [
      { label: "Kurulum veya donanım gerekir mi?", next: "setup" },
      { label: "Ücretsiz deneme var mı?", next: "trial" },
      BACK_TO_MENU,
    ],
  },

  setup: {
    question: "Kurulum veya donanım gerekir mi?",
    answer: [
      "Hayır. VibeGSM tarayıcı üzerinden çalışır; program kurmanız, sunucu ya da özel donanım almanız gerekmez.",
      "Mevcut bilgisayarınız, tabletiniz veya telefonunuzla aynı gün kullanmaya başlayabilirsiniz.",
    ],
    options: [
      { label: "Verilerimi nasıl aktarırım?", next: "migration" },
      { label: "Verilerim güvende mi?", next: "security" },
      BACK_TO_MENU,
    ],
  },

  branches: {
    question: "Birden fazla şubem var",
    answer: [
      "Sorun değil. Her şubenin stoğu ve kasası ayrı takip edilir, tüm şubelerin verisini tek panelden görürsünüz.",
      "Personelinizi şubelere atayabilir, hangi şubede ne satıldığını anlık izleyebilirsiniz.",
    ],
    options: [
      { label: "Fiyatlar ne kadar?", next: "pricing" },
      { label: "Hangi özellikler var?", next: "features" },
      BACK_TO_MENU,
    ],
  },

  security: {
    question: "Verilerim güvende mi?",
    answer: [
      "Tüm verileriniz bulutta, düzenli yedeklemelerle saklanır.",
      "Müşteri, stok ve satış kayıtlarınıza yalnızca siz ve yetki verdiğiniz personel erişebilir.",
    ],
    options: [
      { label: "Sözleşme / iptal", next: "contract" },
      BACK_TO_MENU,
    ],
  },

  contract: {
    question: "Sözleşme / iptal",
    answer: [
      "Uzun vadeli bir taahhüt yok. Aylık pakette istediğiniz zaman bırakabilirsiniz.",
      `Yıllık ödemede %${ANNUAL_DISCOUNT_PCT} indirim uygulanır.`,
    ],
    options: [
      { label: "Fiyatlar ne kadar?", next: "pricing" },
      BACK_TO_MENU,
    ],
  },
};

/** WhatsApp bağlantısı; ziyaretçi bir konu okuduysa mesaj o konuyla başlar. */
export function salesWhatsAppHref(topic?: string): string {
  const text = topic && topic !== FAQ_NODES[FAQ_ROOT_ID].question
    ? `Merhaba, VibeGSM sitesinde "${topic}" konusunu okudum, detaylı bilgi almak istiyorum.`
    : "Merhaba, VibeGSM hakkında detaylı bilgi almak istiyorum.";
  return `https://wa.me/${SALES_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
