/**
 * Ana sayfadaki "Sık Sorulan Sorular" botunun içeriği.
 *
 * Yapay zekâ yok: her düğüm sabit bir cevap ve ziyaretçinin seçebileceği
 * sonraki soruları tutar. Yeni soru eklemek için FAQ_NODES'a bir düğüm ekleyip
 * ilgili kategorinin `options` listesine id'sini yazmak yeterli. `keywords`,
 * botun arama kutusunda sorunun bulunmasını sağlar.
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
  /** Arama kutusunda eşleşecek ek kelimeler. */
  keywords?: string[];
  /** Kategori menüleri aramada listelenmez. */
  isMenu?: boolean;
};

export const FAQ_ROOT_ID = "menu";

const fmt = (n: number) => n.toLocaleString("tr-TR");

const MENU: FaqOption = { label: "↩︎ Ana menü", next: FAQ_ROOT_ID };
const GENERAL: FaqOption = { label: "↩︎ Genel sorular", next: "c_general" };
const FEATURES: FaqOption = { label: "↩︎ Özellikler", next: "c_features" };
const PRICING: FaqOption = { label: "↩︎ Fiyat ve ödeme", next: "c_pricing" };
const START: FaqOption = { label: "↩︎ Başlarken", next: "c_start" };
const ACCOUNT: FaqOption = { label: "↩︎ Hesap ve güvenlik", next: "c_account" };

export const FAQ_NODES: Record<string, FaqNode> = {
  [FAQ_ROOT_ID]: {
    question: "Ana menü",
    isMenu: true,
    answer: [
      "Merhaba! 👋 Ben VibeGSM asistanı.",
      "Aşağıdan bir konu seçin ya da alttaki kutuya sorunuzu yazıp arayın. Cevabını bulamazsanız ekibimize WhatsApp'tan ulaşabilirsiniz.",
    ],
    options: [
      { label: "🏪 Genel sorular", next: "c_general" },
      { label: "🧩 Özellikler", next: "c_features" },
      { label: "💰 Fiyat ve ödeme", next: "c_pricing" },
      { label: "🚀 Başlarken", next: "c_start" },
      { label: "🔒 Hesap ve güvenlik", next: "c_account" },
      { label: "Fiyatlar ne kadar?", next: "pricing" },
      { label: "Ücretsiz deneme var mı?", next: "trial" },
    ],
  },

  // ─── Kategoriler ──────────────────────────────────────────────────────────
  c_general: {
    question: "Genel sorular",
    isMenu: true,
    answer: ["VibeGSM hakkında genel sorular:"],
    options: [
      { label: "VibeGSM nedir?", next: "what" },
      { label: "Kimler için uygun?", next: "who" },
      { label: "Excel / defterden farkı ne?", next: "vs_excel" },
      { label: "Hangi cihazlarda çalışır?", next: "devices" },
      { label: "Telefona uygulama olarak kurulur mu?", next: "mobile" },
      { label: "İnternet bağlantısı gerekir mi?", next: "internet" },
      { label: "Dükkanda olmadan takip edebilir miyim?", next: "remote" },
      MENU,
    ],
  },
  c_features: {
    question: "Özellikler",
    isMenu: true,
    answer: ["Tek pakette tüm modüller dahil, ek modül ücreti yok. Hangi konuyu detaylı görmek istersiniz?"],
    options: [
      { label: "Satış, POS ve cari", next: "f_sales" },
      { label: "Veresiye ve taksit takibi", next: "f_credit" },
      { label: "Teknik servis", next: "f_repair" },
      { label: "Müşteriye servis takip linki", next: "f_tracking" },
      { label: "Stok ve IMEI takibi", next: "f_stock" },
      { label: "Toptan alış ve tedarikçiler", next: "f_supply" },
      { label: "İkinci el alım", next: "f_buyback" },
      { label: "Kasa, gider ve kâr/zarar", next: "f_finance" },
      { label: "Raporlar ve uyarılar", next: "f_reports" },
      { label: "Fiş ve belge yazdırma", next: "f_print" },
      { label: "Müşterilere bildirim (WhatsApp / SMS)", next: "f_notify" },
      { label: "e-Fatura / e-Arşiv var mı?", next: "f_einvoice" },
      MENU,
    ],
  },
  c_pricing: {
    question: "Fiyat ve ödeme",
    isMenu: true,
    answer: ["Fiyatlandırma ve ödeme hakkında:"],
    options: [
      { label: "Fiyatlar ne kadar?", next: "pricing" },
      { label: "Fiyata neler dahil?", next: "included" },
      { label: "Yıllık ödemenin avantajı ne?", next: "annual" },
      { label: "Nasıl ödeme yaparım?", next: "payment" },
      { label: "Sözleşme / taahhüt var mı?", next: "contract" },
      { label: "Deneme bitince ne olur?", next: "after_trial" },
      MENU,
    ],
  },
  c_start: {
    question: "Başlarken",
    isMenu: true,
    answer: ["Sisteme geçiş ve başlangıç hakkında:"],
    options: [
      { label: "Ücretsiz deneme var mı?", next: "trial" },
      { label: "Nasıl kayıt olurum?", next: "signup" },
      { label: "Verilerimi nasıl aktarırım?", next: "migration" },
      { label: "Geçiş ne kadar sürer?", next: "migration_time" },
      { label: "Kurulum veya donanım gerekir mi?", next: "setup" },
      { label: "Kullanmayı nasıl öğrenirim?", next: "training" },
      { label: "Destek nasıl alırım?", next: "support" },
      MENU,
    ],
  },
  c_account: {
    question: "Hesap ve güvenlik",
    isMenu: true,
    answer: ["Hesap, personel ve veri güvenliği hakkında:"],
    options: [
      { label: "Verilerim güvende mi?", next: "security" },
      { label: "Verilerimi dışarı alabilir miyim?", next: "export" },
      { label: "Personel ekleyebilir miyim?", next: "staff" },
      { label: "Personelin yaptıklarını görebilir miyim?", next: "audit" },
      { label: "Birden fazla şubem var", next: "branches" },
      { label: "İptal etmek istersem?", next: "cancel" },
      MENU,
    ],
  },

  // ─── Genel ────────────────────────────────────────────────────────────────
  what: {
    question: "VibeGSM nedir?",
    keywords: ["program", "yazılım", "otomasyon", "ne işe yarar"],
    answer: [
      "VibeGSM, telefon bayileri ve teknik servisler için geliştirilmiş bulut tabanlı bir dükkan yönetim sistemidir.",
      "Satış (POS), teknik servis, IMEI bazlı stok, veresiye/cari, taksit, ikinci el alım, kasa, personel ve şube yönetimi tek panelde toplanır.",
    ],
    options: [{ label: "Kimler için uygun?", next: "who" }, { label: "Hangi özellikler var?", next: "c_features" }, GENERAL, MENU],
  },
  who: {
    question: "Kimler için uygun?",
    keywords: ["bayi", "telefoncu", "servis", "aksesuar", "küçük", "büyük", "zincir"],
    answer: [
      "• Cep telefonu bayileri ve telefoncular",
      "• Teknik servis ve tamir atölyeleri",
      "• İkinci el telefon alım-satımı yapan dükkanlar",
      "• Aksesuar ve yedek parça satan işletmeler",
      "Tek dükkanlı işletmeden çok şubeli bayilere kadar aynı sistem kullanılır.",
    ],
    options: [{ label: "Birden fazla şubem var", next: "branches" }, { label: "Fiyatlar ne kadar?", next: "pricing" }, GENERAL, MENU],
  },
  vs_excel: {
    question: "Excel / defterden farkı ne?",
    keywords: ["excel", "defter", "kağıt", "neden", "fark"],
    answer: [
      "• Excel'de stok elle güncellenir, kaydetmeyi unutunca bozulur; VibeGSM'de satış yapınca stok kendiliğinden düşer.",
      "• Defterdeki veresiye unutulur veya tartışma çıkar; VibeGSM'de her müşterinin bakiyesi anlık görünür.",
      "• Kağıt servis fişi kaybolur; VibeGSM'de cihaz kabulden teslime her adım kayıtlıdır.",
      "• Excel tek bilgisayardadır; VibeGSM'e her yerden, her cihazdan girersiniz.",
    ],
    options: [{ label: "Verilerimi nasıl aktarırım?", next: "migration" }, GENERAL, MENU],
  },
  devices: {
    question: "Hangi cihazlarda çalışır?",
    keywords: ["bilgisayar", "tablet", "telefon", "windows", "mac", "android", "iphone", "tarayıcı"],
    answer: [
      "İnternet tarayıcısı olan her cihazda çalışır: Windows veya Mac bilgisayar, tablet, Android veya iPhone.",
      "Ayrı program kurmanıza gerek yoktur; Chrome, Safari, Edge gibi bir tarayıcıdan giriş yaparsınız.",
    ],
    options: [{ label: "Telefona uygulama olarak kurulur mu?", next: "mobile" }, GENERAL, MENU],
  },
  mobile: {
    question: "Telefona uygulama olarak kurulur mu?",
    keywords: ["uygulama", "app", "mobil", "ana ekran", "indir"],
    answer: [
      "Mağazadan indirilen ayrı bir uygulama yok, ama gerek de yok: VibeGSM'i telefonunuzun tarayıcısından açıp \"Ana ekrana ekle\" dediğinizde uygulama gibi simgesiyle açılır.",
      "Telefonda da bilgisayardaki tüm ekranları kullanabilirsiniz.",
    ],
    options: [{ label: "Dükkanda olmadan takip edebilir miyim?", next: "remote" }, GENERAL, MENU],
  },
  internet: {
    question: "İnternet bağlantısı gerekir mi?",
    keywords: ["internet", "çevrimdışı", "offline", "bağlantı"],
    answer: [
      "Evet. VibeGSM bulut tabanlı olduğu için kullanırken internet bağlantısı gerekir.",
      "Bunun avantajı: verileriniz dükkandaki bilgisayara bağlı değildir, bilgisayar bozulsa da bir şey kaybolmaz ve her yerden erişirsiniz.",
    ],
    options: [{ label: "Verilerim güvende mi?", next: "security" }, GENERAL, MENU],
  },
  remote: {
    question: "Dükkanda olmadan takip edebilir miyim?",
    keywords: ["uzaktan", "evden", "tatil", "anlık", "cep"],
    answer: [
      "Evet. Evden, telefonunuzdan, hatta tatildeyken bile günlük satışları, kasayı, stoğu ve açık servis kayıtlarını anlık görebilirsiniz.",
    ],
    options: [{ label: "Personelin yaptıklarını görebilir miyim?", next: "audit" }, GENERAL, MENU],
  },

  // ─── Özellikler ───────────────────────────────────────────────────────────
  f_sales: {
    question: "Satış, POS ve cari",
    keywords: ["pos", "satış", "kasa", "barkod", "cari", "müşteri", "teklif"],
    answer: [
      "• Hızlı Satış (POS): barkod veya IMEI ile hızlı satış, satışta stok otomatik düşer.",
      "• Müşteriler ve cari: her müşterinin borç/alacak bakiyesi ve alışveriş geçmişi tek yerde.",
      "• Kurumsal teklifler: firmalara PDF olarak toplu teklif hazırlanır.",
    ],
    options: [{ label: "Veresiye ve taksit takibi", next: "f_credit" }, FEATURES, MENU],
  },
  f_credit: {
    question: "Veresiye ve taksit takibi",
    keywords: ["veresiye", "borç", "taksit", "vade", "tahsilat", "alacak", "limit"],
    answer: [
      "• Her müşterinin veresiye bakiyesi anlık görünür; müşteri bazlı borç limiti tanımlanabilir.",
      "• Taksitli satışlarda her taksidin vadesi takip edilir, vadesi gelen ve geciken ödemeler listelenir.",
      "• Müşteriye tek tıkla WhatsApp'tan ödeme hatırlatma mesajı gönderebilirsiniz.",
    ],
    options: [{ label: "Müşterilere bildirim (WhatsApp / SMS)", next: "f_notify" }, FEATURES, MENU],
  },
  f_repair: {
    question: "Teknik servis",
    keywords: ["tamir", "servis", "onarım", "cihaz kabul", "teknisyen", "arıza", "parça"],
    answer: [
      "• Cihaz kabul: cihazın fiziksel durumu (çizik, ekran, kamera vb.) ve ekran şifresi kabulde kayıt altına alınır; \"verirken bu çizik yoktu\" tartışmaları biter.",
      "• Tamir takip: cihaz kabulden teslime kadar hangi aşamada olduğu görünür.",
      "• Parça ve onarım fiyatları: model bazlı parça ve işçilik fiyat listesi.",
      "• Teknisyen hakedişleri: kim hangi işi yaptı, prim hesabı çıkar.",
    ],
    options: [{ label: "Müşteriye servis takip linki", next: "f_tracking" }, FEATURES, MENU],
  },
  f_tracking: {
    question: "Müşteriye servis takip linki",
    keywords: ["takip linki", "cihazım bitti mi", "durum", "canlı takip"],
    answer: [
      "Servis durumu değiştiğinde müşteriye tek tıkla WhatsApp mesajı gönderebilirsiniz. Mesajda cihazın durumu, tutarı ve canlı takip linki bulunur.",
      "Müşteri linke tıklayarak cihazının hangi aşamada olduğunu kendisi görür; \"cihazım bitti mi?\" aramaları azalır.",
    ],
    options: [{ label: "Fiş ve belge yazdırma", next: "f_print" }, FEATURES, MENU],
  },
  f_stock: {
    question: "Stok ve IMEI takibi",
    keywords: ["stok", "imei", "seri no", "ürün", "envanter", "depo"],
    answer: [
      "• Her cihaz tekil IMEI / seri numarasıyla kayıtlı; mükerrer veya hatalı kayıt oluşmaz.",
      "• Hangi cihaz hangi şubede, maliyeti ne, tek ekranda görünür.",
      "• Aksesuar ve yedek parça stokları satışta otomatik düşer, azalan ürünler için uyarı alırsınız.",
    ],
    options: [{ label: "Toptan alış ve tedarikçiler", next: "f_supply" }, FEATURES, MENU],
  },
  f_supply: {
    question: "Toptan alış ve tedarikçiler",
    keywords: ["toptan", "tedarikçi", "distribütör", "ithalat", "vadeli", "alış"],
    answer: [
      "• Toptan alışlarınızı ve distribütör ithalatlarınızı maliyetleriyle kaydedersiniz; ürünler doğrudan stoğa girer.",
      "• Tedarikçilere olan vadeli borçlarınızı ve ödeme tarihlerini takip edersiniz.",
    ],
    options: [{ label: "Kasa, gider ve kâr/zarar", next: "f_finance" }, FEATURES, MENU],
  },
  f_buyback: {
    question: "İkinci el alım",
    keywords: ["ikinci el", "2. el", "buyback", "takas", "muvafakatname", "çalıntı"],
    answer: [
      "• Vatandaştan cihaz alırken satıcının kimlik bilgisi ve cihazın IMEI'si kayıt altına alınır, muvafakatname belgesi hazırlanır.",
      "• Böylece cihazın geçmişi belgeli olur; alınan cihaz doğrudan stoğa girer.",
      "• Takas ve ikinci el fiyat hesaplaması yapılabilir.",
    ],
    options: [{ label: "Fiş ve belge yazdırma", next: "f_print" }, FEATURES, MENU],
  },
  f_finance: {
    question: "Kasa, gider ve kâr/zarar",
    keywords: ["kasa", "banka", "gider", "kâr", "kar", "zarar", "muhasebe", "finans"],
    answer: [
      "• Kasa ve banka: nakit, kart ve banka hareketleri.",
      "• İşletme giderleri: kira, fatura, maaş gibi giderlerinizi kaydedersiniz.",
      "• Kâr/zarar analizi: giderler düşüldükten sonra dükkanın gerçek kârını görürsünüz.",
    ],
    options: [{ label: "Raporlar ve uyarılar", next: "f_reports" }, FEATURES, MENU],
  },
  f_reports: {
    question: "Raporlar ve uyarılar",
    keywords: ["rapor", "analiz", "dashboard", "uyarı", "ciro", "grafik"],
    answer: [
      "• Ana panelde günlük satış, ciro, açık servis ve stok durumu bir bakışta görünür.",
      "• Uyarılar ekranı; kritik seviyedeki stokları, vadesi geçmiş taksit ve veresiyeleri tek listede toplar.",
      "• Stok, personel ve işlem kayıtlarını Excel'de açılabilen dosya olarak indirebilirsiniz.",
    ],
    options: [{ label: "Verilerimi dışarı alabilir miyim?", next: "export" }, FEATURES, MENU],
  },
  f_print: {
    question: "Fiş ve belge yazdırma",
    keywords: ["yazdır", "fiş", "yazıcı", "pdf", "belge", "form", "çıktı"],
    answer: [
      "• Satış fişi ve servis kabul formu yazdırılabilir (fiş veya A4).",
      "• Kurumsal teklifler ve ikinci el alım belgeleri PDF olarak oluşturulur.",
      "Bilgisayarınıza bağlı yazıcıdan tarayıcı üzerinden yazdırırsınız; ek bir program gerekmez.",
    ],
    options: [{ label: "e-Fatura / e-Arşiv var mı?", next: "f_einvoice" }, FEATURES, MENU],
  },
  f_notify: {
    question: "Müşterilere bildirim (WhatsApp / SMS)",
    keywords: ["sms", "whatsapp", "mesaj", "bildirim", "hatırlatma"],
    answer: [
      "Müşteri bildirimleri WhatsApp üzerinden yapılır: servis durumu ve takip linki, taksit/borç hatırlatmaları tek tıkla hazır mesaj olarak açılır.",
      "Mesaj şablonlarını kendi üslubunuza göre düzenleyebilirsiniz.",
      "Sistem üzerinden toplu SMS gönderimi şu an bulunmuyor.",
    ],
    options: [{ label: "Müşteriye servis takip linki", next: "f_tracking" }, FEATURES, MENU],
  },
  f_einvoice: {
    question: "e-Fatura / e-Arşiv var mı?",
    keywords: ["e-fatura", "efatura", "e-arşiv", "fatura", "gib"],
    answer: [
      "e-Fatura / e-Arşiv entegrasyonunun güncel durumunu ve sizin kullandığınız fatura yöntemine uyumunu ekibimiz netleştirsin.",
      "Aşağıdaki WhatsApp düğmesinden yazarsanız size hemen bilgi verelim.",
    ],
    options: [FEATURES, MENU],
  },

  // ─── Fiyat ve ödeme ───────────────────────────────────────────────────────
  pricing: {
    question: "Fiyatlar ne kadar?",
    keywords: ["fiyat", "ücret", "ne kadar", "tl", "paket", "abonelik", "aylık"],
    answer: [
      "Tek paket var ve tüm özellikler dahil:",
      `• Aylık: ${fmt(PLAN_PRICE_TRY.monthly)} TL`,
      `• Yıllık: ${fmt(PLAN_PRICE_TRY.annual)} TL (aylığa göre %${ANNUAL_DISCOUNT_PCT} indirimli, tek seferde ödenir)`,
      "Satın almadan önce 7 gün ücretsiz deneyebilirsiniz.",
    ],
    options: [{ label: "Fiyata neler dahil?", next: "included" }, { label: "Nasıl ödeme yaparım?", next: "payment" }, PRICING, MENU],
  },
  included: {
    question: "Fiyata neler dahil?",
    keywords: ["dahil", "ek ücret", "gizli", "modül", "kurulum ücreti"],
    answer: [
      "Tüm modüller tek fiyata dahil: POS, teknik servis, stok/IMEI, veresiye ve taksit, ikinci el, kasa ve kâr/zarar, personel ve şube yönetimi.",
      "Ek modül ücreti veya kurulum ücreti yoktur.",
    ],
    options: [{ label: "Yıllık ödemenin avantajı ne?", next: "annual" }, PRICING, MENU],
  },
  annual: {
    question: "Yıllık ödemenin avantajı ne?",
    keywords: ["yıllık", "indirim", "kampanya"],
    answer: [
      `Yıllık ödemede %${ANNUAL_DISCOUNT_PCT} indirim uygulanır: 12 ay × ${fmt(PLAN_PRICE_TRY.monthly)} TL yerine ${fmt(PLAN_PRICE_TRY.annual)} TL ödersiniz.`,
      "Yıllık tutar tek seferde tahsil edilir.",
    ],
    options: [{ label: "Nasıl ödeme yaparım?", next: "payment" }, PRICING, MENU],
  },
  payment: {
    question: "Nasıl ödeme yaparım?",
    keywords: ["ödeme", "kredi kartı", "kart", "havale", "satın al"],
    answer: [
      "Sitedeki \"Doğrudan Satın Al\" düğmesinden aylık veya yıllık paketi seçip kredi/banka kartınızla güvenli ödeme sayfasından ödeme yapabilirsiniz.",
      "Farklı bir ödeme yöntemi isterseniz WhatsApp'tan bize yazın.",
    ],
    options: [{ label: "Sözleşme / taahhüt var mı?", next: "contract" }, PRICING, MENU],
  },
  contract: {
    question: "Sözleşme / taahhüt var mı?",
    keywords: ["sözleşme", "taahhüt", "bağlayıcı", "süre"],
    answer: [
      "Uzun vadeli bir taahhüt yok. Aylık pakette ay ay devam edersiniz.",
      `Uzun süre kullanmayı düşünüyorsanız yıllık paket %${ANNUAL_DISCOUNT_PCT} daha avantajlıdır.`,
    ],
    options: [{ label: "İptal etmek istersem?", next: "cancel" }, PRICING, MENU],
  },
  after_trial: {
    question: "Deneme bitince ne olur?",
    keywords: ["deneme bitti", "süre doldu", "otomatik", "ücret kesilir"],
    answer: [
      "Deneme için kart bilgisi istenmez, süre bitince otomatik ücret çekilmez.",
      "7 gün dolduğunda ekibimiz sizinle WhatsApp'tan iletişime geçer; devam etmek isterseniz aboneliğinizi başlatırsınız.",
    ],
    options: [{ label: "Fiyatlar ne kadar?", next: "pricing" }, PRICING, MENU],
  },

  // ─── Başlarken ────────────────────────────────────────────────────────────
  trial: {
    question: "Ücretsiz deneme var mı?",
    keywords: ["deneme", "ücretsiz", "bedava", "demo", "test"],
    answer: [
      "Evet, 7 gün boyunca tüm özellikleri ücretsiz kullanabilirsiniz.",
      "Sitedeki \"7 Gün Ücretsiz Deneyin\" düğmesinden birkaç dakikada hesabınızı oluşturabilirsiniz.",
    ],
    options: [{ label: "Nasıl kayıt olurum?", next: "signup" }, { label: "Deneme bitince ne olur?", next: "after_trial" }, START, MENU],
  },
  signup: {
    question: "Nasıl kayıt olurum?",
    keywords: ["kayıt", "hesap aç", "üye", "başvuru"],
    answer: [
      "1. Sitedeki \"Ücretsiz Dene\" düğmesine basın.",
      "2. Bayi adınızı, adınızı, e-posta ve telefonunuzu girip bir şifre belirleyin (kredi kartı gerekmez).",
      "3. Hesabınız açılır ve hemen kullanmaya başlarsınız.",
    ],
    options: [{ label: "Verilerimi nasıl aktarırım?", next: "migration" }, START, MENU],
  },
  migration: {
    question: "Verilerimi nasıl aktarırım?",
    keywords: ["aktar", "taşı", "geçiş", "excel", "eski program", "veri"],
    answer: [
      "Ekibimiz mevcut Excel, defter ve stok listelerinizi sizinle birlikte VibeGSM'e aktarır.",
      "Aktarım sırasında hiçbir kayıt silinmez; stok, müşteri ve cari bilgileriniz sistemde karşılığını bulur.",
    ],
    options: [{ label: "Geçiş ne kadar sürer?", next: "migration_time" }, START, MENU],
  },
  migration_time: {
    question: "Geçiş ne kadar sürer?",
    keywords: ["ne kadar sürer", "süre", "hızlı", "kaç gün"],
    answer: [
      "Kayıt birkaç dakika sürer ve aynı gün satış, stok ve servis takibine başlayabilirsiniz.",
      "Eski kayıtlarınızın aktarımıyla birlikte çoğu bayi aynı hafta içinde tamamen VibeGSM'e geçiyor.",
    ],
    options: [{ label: "Kullanmayı nasıl öğrenirim?", next: "training" }, START, MENU],
  },
  setup: {
    question: "Kurulum veya donanım gerekir mi?",
    keywords: ["kurulum", "donanım", "sunucu", "bilgisayar al", "program kur"],
    answer: [
      "Hayır. VibeGSM tarayıcı üzerinden çalışır; program kurmanız, sunucu ya da özel donanım almanız gerekmez.",
      "Mevcut bilgisayarınız, tabletiniz veya telefonunuzla aynı gün kullanmaya başlayabilirsiniz.",
    ],
    options: [{ label: "Hangi cihazlarda çalışır?", next: "devices" }, START, MENU],
  },
  training: {
    question: "Kullanmayı nasıl öğrenirim?",
    keywords: ["eğitim", "öğren", "zor", "kullanım", "rehber", "kolay"],
    answer: [
      "Sistem Türkçe ve sade bir arayüzle hazırlandı; ilk girişte ekranları tanıtan kısa bir tur sizi karşılar.",
      "Sistem içindeki Yardım bölümünde başlangıç, tamir takip, stok ve ikinci el için rehberler var.",
      "Takıldığınız yerde ekibimiz WhatsApp'tan yardımcı olur.",
    ],
    options: [{ label: "Destek nasıl alırım?", next: "support" }, START, MENU],
  },
  support: {
    question: "Destek nasıl alırım?",
    keywords: ["destek", "yardım", "iletişim", "ulaş", "sorun"],
    answer: [
      "• Sistem içinden: sağ alttaki destek masasından talep açıp ekibimizle yazışabilirsiniz.",
      "• WhatsApp: aşağıdaki düğmeden doğrudan ekibimize yazabilirsiniz.",
      "Destek Türkçe ve yerli ekip tarafından verilir.",
    ],
    options: [START, MENU],
  },

  // ─── Hesap ve güvenlik ────────────────────────────────────────────────────
  security: {
    question: "Verilerim güvende mi?",
    keywords: ["güvenlik", "güvende", "yedek", "kaybolur", "kvkk", "gizlilik"],
    answer: [
      "Tüm verileriniz bulutta, düzenli yedeklemelerle saklanır; dükkandaki bilgisayar bozulsa da verileriniz kaybolmaz.",
      "Müşteri, stok ve satış kayıtlarınıza yalnızca siz ve yetki verdiğiniz personel erişebilir.",
    ],
    options: [{ label: "Verilerimi dışarı alabilir miyim?", next: "export" }, ACCOUNT, MENU],
  },
  export: {
    question: "Verilerimi dışarı alabilir miyim?",
    keywords: ["dışa aktar", "indir", "excel", "csv", "yedek al"],
    answer: [
      "Evet. Stok, personel ve işlem kayıtları gibi listeleri Excel'de açılabilen dosya olarak indirebilirsiniz.",
      "Verileriniz size aittir.",
    ],
    options: [{ label: "Verilerim güvende mi?", next: "security" }, ACCOUNT, MENU],
  },
  staff: {
    question: "Personel ekleyebilir miyim?",
    keywords: ["personel", "çalışan", "kullanıcı", "rol", "yetki", "kasiyer", "teknisyen"],
    answer: [
      "Evet. Personelinizi kasiyer, teknisyen, müdür, muhasebeci gibi rollerle ekleyebilir ve şubelere atayabilirsiniz.",
      "Her personel kendi e-posta adresi ve şifresiyle giriş yapar, böylece kimin ne yaptığı ayrı ayrı görünür.",
    ],
    options: [{ label: "Personelin yaptıklarını görebilir miyim?", next: "audit" }, ACCOUNT, MENU],
  },
  audit: {
    question: "Personelin yaptıklarını görebilir miyim?",
    keywords: ["denetim", "kayıt", "log", "hırsızlık", "kontrol", "güven"],
    answer: [
      "Evet. Denetim kayıtları ekranında stok ekleme, düzenleme, silme ve şubeler arası transfer gibi işlemlerin kim tarafından ve ne zaman yapıldığı listelenir.",
    ],
    options: [{ label: "Personel ekleyebilir miyim?", next: "staff" }, ACCOUNT, MENU],
  },
  branches: {
    question: "Birden fazla şubem var",
    keywords: ["şube", "mağaza", "zincir", "birden fazla"],
    answer: [
      "Sorun değil. Her şubenin stoğu ve kasası ayrı takip edilir, tüm şubelerin verisini tek panelden görürsünüz.",
      "Personelinizi şubelere atayabilir, hangi şubede ne satıldığını anlık izleyebilirsiniz.",
    ],
    options: [{ label: "Fiyatlar ne kadar?", next: "pricing" }, ACCOUNT, MENU],
  },
  cancel: {
    question: "İptal etmek istersem?",
    keywords: ["iptal", "bırak", "vazgeç", "kapat"],
    answer: [
      "Uzun vadeli taahhüt olmadığı için aylık pakette istediğiniz zaman bırakabilirsiniz.",
      "İptal için ekibimize WhatsApp'tan yazmanız yeterli.",
    ],
    options: [{ label: "Verilerimi dışarı alabilir miyim?", next: "export" }, ACCOUNT, MENU],
  },
};

const normalize = (s: string) => s.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** Arama kutusu için basit kelime eşleştirme; en çok eşleşen sorular önce gelir. */
export function searchFaq(query: string, limit = 6): string[] {
  const words = normalize(query).split(" ").filter((w) => w.length >= 2);
  if (words.length === 0) return [];
  const ranked = Object.entries(FAQ_NODES)
    .filter(([, node]) => !node.isMenu)
    .map(([id, node]) => {
      const haystack = normalize([node.question, ...(node.keywords ?? []), ...node.answer].join(" "));
      const title = normalize([node.question, ...(node.keywords ?? [])].join(" "));
      const score = words.reduce((sum, w) => sum + (title.includes(w) ? 3 : haystack.includes(w) ? 1 : 0), 0);
      return { id, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  // Başlıkta eşleşen soru varsa, kelimenin yalnızca cevap metninde geçtiği
  // sorular listeyi kalabalıklaştırmasın.
  const minScore = ranked.length && ranked[0].score >= 3 ? 3 : 1;
  return ranked
    .filter((r) => r.score >= minScore)
    .slice(0, limit)
    .map((r) => r.id);
}

/** WhatsApp bağlantısı; ziyaretçi bir konu okuduysa mesaj o konuyla başlar. */
export function salesWhatsAppHref(topic?: string): string {
  const text = topic && topic !== FAQ_NODES[FAQ_ROOT_ID].question
    ? `Merhaba, VibeGSM sitesinde "${topic}" konusunu okudum, detaylı bilgi almak istiyorum.`
    : "Merhaba, VibeGSM hakkında detaylı bilgi almak istiyorum.";
  return `https://wa.me/${SALES_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
