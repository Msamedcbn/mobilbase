export type BlogSection = {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  /** SEO title tag override. Falls back to `title` when omitted — same idea as AIOSEO's separate "SEO Title" field. */
  metaTitle?: string;
  description: string;
  /** Primary keyword this post targets. Drives keyword checks and internal linking, mirrors AIOSEO's "Focus Keyphrase". */
  focusKeyword: string;
  keywords: string[];
  tags: string[];
  date: string;
  readingMinutes: number;
  excerpt: string;
  sections: BlogSection[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "telefon-bayii-stok-takip-sistemi",
    title: "Telefon Bayii İçin Stok Takip Sistemi Nasıl Kurulur?",
    focusKeyword: "telefon bayii stok takibi",
    description:
      "Telefon bayilerinde stok takibi neden Excel ile yürümez? IMEI bazlı envanter, kritik stok uyarısı ve şube bazlı stok yönetimi için pratik bir rehber.",
    keywords: ["telefon bayii stok takibi", "telefoncu stok programı", "IMEI stok takibi", "envanter yönetimi"],
    tags: ["Stok Yönetimi"],
    date: "2026-06-10",
    readingMinutes: 6,
    excerpt:
      "Bir telefon bayisinde stok, tek bir sayıdan ibaret değildir: her cihazın kendine ait bir IMEI'si, her aksesuarın bir alış/satış maliyeti vardır. Excel bu karmaşıklığı bir yere kadar taşır.",
    sections: [
      {
        paragraphs: [
          "Bir telefon bayisinde \"stok\" tek bir sayı değildir. Bir tarafta seri numarasıyla takip edilmesi gereken tekil cihazlar (her iPhone, her Samsung kendi IMEI'siyle ayrı bir kayıttır), diğer tarafta adetle satılan aksesuarlar (şarj kablosu, kılıf, ekran koruyucu) vardır. İkisini aynı Excel dosyasında tutmaya çalışmak, er ya da geç \"kaç üründen kaç adet kaldı\" sorusuna doğru cevap verememenize yol açar.",
        ],
      },
      {
        heading: "Excel neden bir noktadan sonra yetersiz kalır?",
        paragraphs: ["Excel'de telefon bayii stok takibinin kırılma noktaları genelde şunlardır:"],
        list: [
          "Birden fazla kişi aynı anda dosyayı güncellediğinde çakışan versiyonlar oluşur.",
          "Satış anında stok düşümü elle yapıldığı için unutulan satırlar zamanla stok sayısını gerçek durumdan uzaklaştırır.",
          "IMEI numaraları elle girildiği için aynı cihaz yanlışlıkla iki kez stoğa eklenebilir.",
          "Şube sayısı arttıkça \"hangi şubede kaç adet var\" sorusu ayrı sekmelere, ayrı dosyalara bölünür.",
        ],
      },
      {
        heading: "IMEI bazlı stok takibinin sağladığı fark",
        paragraphs: [
          "Seri numaralı (IMEI'li) bir ürün satıldığında, o stok kartının artık hiçbir karşılığı kalmaz — çünkü elinizdeki o tekil cihaz gitmiştir. Doğru kurgulanmış bir sistemde bu satır otomatik olarak kapanır (silinir veya pasif hale gelir), aynı IMEI ile ikinci bir cihazın yanlışlıkla stokta görünmesi de baştan engellenir. Bu, hem stok sayımlarını hem de olası bir garanti/servis sorgusunda \"bu IMEI bizde satıldı mı\" sorusuna anında cevap vermeyi mümkün kılar.",
        ],
      },
      {
        heading: "Kritik stok seviyesi ve otomatik uyarı",
        paragraphs: [
          "Aksesuar tarafında ise asıl mesele adet değil, zamanlamadır. Bir ürün için minimum stok eşiği tanımlandığında, o eşiğin altına düşen kalemler otomatik olarak listelenir; sipariş verme kararını hafızaya değil, sisteme bırakırsınız.",
        ],
      },
      {
        heading: "Pratik bir kontrol listesi",
        paragraphs: ["Bir stok takip sistemine geçmeden önce şunları netleştirmek işinizi kolaylaştırır:"],
        list: [
          "IMEI'li ürünler ve adetli ürünler ayrı mantıkla mı yönetilecek?",
          "Şube sayınız birden fazlaysa, şube bazlı stok görünürlüğü var mı?",
          "Satış anında stok otomatik mi düşüyor, yoksa elle mi güncelleniyor?",
          "Stok sıfırlandığında/negatife düştüğünde sistem sizi uyarıyor mu, yoksa sessizce mi geçiyor?",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'de stok modülü tam olarak bu ayrımı gözeterek kuruldu: IMEI'li cihazlar satıldığında kart otomatik kapanır, aynı IMEI iki kez stokta görünemez, aksesuarlarda kritik stok seviyesi anlık takip edilir. Bayinizde stok takibini Excel'den çıkarmayı düşünüyorsanız, mevcut süreci konuşmak için bize yazabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "teknik-servis-yonetim-yazilimi",
    title: "Teknik Servis Yönetim Yazılımı: Kağıt Fişten Dijitale Geçiş Rehberi",
    focusKeyword: "teknik servis yönetim yazılımı",
    description:
      "Teknik serviste cihaz kabulden teslime kadar her aşamayı dijitalde takip etmek neden önemli? Kağıt fiş sisteminin riskleri ve dijital servis takibine geçiş adımları.",
    keywords: ["teknik servis yönetim yazılımı", "servis takip programı", "cihaz kabul fişi", "telefon tamiri takip"],
    tags: ["Teknik Servis"],
    date: "2026-06-17",
    readingMinutes: 5,
    excerpt:
      "Cihaz hangi aşamada, teknisyen dışında kimse bilmiyorsa, müşteriye \"ne zaman hazır olur\" sorusuna güvenilir bir cevap veremezsiniz. Kağıt fişten dijital servis takibine geçişin mantığı.",
    sections: [
      {
        paragraphs: [
          "Teknik serviste en sık karşılaşılan sorun aslında tamirin kendisi değil, tamirin \"nerede olduğunu\" bilememektir. Cihaz teknisyenin elinde mi, parça mı bekliyor, test aşamasında mı — bu bilgi sadece teknisyenin hafızasında veya masasındaki kağıt fişte yaşıyorsa, o teknisyen izinli olduğunda müşteriye cevap veren kimse kalmaz. İyi bir teknik servis yönetim yazılımı, bu bilgiyi kişiden bağımsız hale getirir.",
        ],
      },
      {
        heading: "Kağıt fiş sisteminin somut riskleri",
        paragraphs: ["Kağıt üzerinden yürüyen bir servis takibinde şu sorunlar zamanla birikir:"],
        list: [
          "Fiş kaybolduğunda cihazın hangi arızayla geldiğine dair kayıt da kaybolur.",
          "Fiyat teklifi/onay süreci sözlü yürüdüğü için müşteriyle anlaşmazlık riski artar.",
          "Parça bekleyen cihazlar unutulabilir, müşteri aramadan kimse hatırlamaz.",
          "Teslim edilen cihazların garanti/tekrar geliş geçmişi tutulamaz.",
        ],
      },
      {
        heading: "Dijital servis takibinde olması gereken temel akış",
        paragraphs: [
          "İyi kurgulanmış bir servis takip sistemi, cihazı kabul ettiğiniz andan teslim ettiğiniz ana kadar net durum adımlarından geçirir: Teslim Alındı → Onarımda → Parça Bekliyor → Tamamlandı (Hazır) → Teslim Edildi. Her adım değiştiğinde kim, ne zaman değiştirdi bilgisi kaydedilir; bu hem ekip içi hesap verebilirliği hem de müşteriye \"cihazınız şu aşamada\" diyebilmeyi sağlar.",
        ],
      },
      {
        heading: "Müşteri geçmişi neden önemli?",
        paragraphs: [
          "Bir müşterinin daha önce hangi cihazla, hangi arızayla geldiğini görebilmek, tekrarlayan arızaları (örneğin kötü tamir edilmiş bir batarya değişimi) fark etmenizi sağlar. Müşteri adı veya telefon numarasıyla geçmiş sorgulama özelliği, özellikle garanti kapsamındaki tartışmalarda elinizi güçlendirir.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'in Tamir Takip modülü, cihaz kabulden teslime kadar bu akışı dijitalde tutar ve müşteri geçmişini tek aramayla sorgulamanıza izin verir. Servis sürecinizi kağıttan çıkarmak isterseniz demo talebinizi iletebilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "imei-seri-no-takibi-neden-onemli",
    title: "IMEI ve Seri No Takibi: Telefoncular İçin Neden Vazgeçilmez?",
    focusKeyword: "IMEI takibi",
    description:
      "IMEI takibi sadece kayıt tutmak değil, çalıntı/kayıp cihaz riskinden korunmak ve garanti süreçlerini sağlama almaktır. Telefoncular için IMEI takibi rehberi.",
    keywords: ["IMEI takibi", "seri no takibi", "telefon güvenliği", "çalıntı telefon kontrolü"],
    tags: ["IMEI & Güvenlik", "Stok Yönetimi"],
    date: "2026-06-24",
    readingMinutes: 5,
    excerpt:
      "Aynı IMEI numarasına sahip iki cihazın aynı anda stokta görünmesi, ya bir veri hatasıdır ya da ciddi bir sorunun belirtisidir. IMEI takibinin telefoncular için neden bu kadar kritik olduğunu anlatıyoruz.",
    sections: [
      {
        paragraphs: [
          "Bir telefonun IMEI numarası, o cihaza özgü tek kimliktir — iki farklı fiziksel cihazın aynı IMEI'ye sahip olması mümkün değildir. Bu yüzden bir stok sisteminde aynı IMEI'nin aynı anda birden fazla kayıtta \"stokta\" görünmesi, sistemin bir yerde hata yaptığının kanıtıdır ve düzeltilmesi gerekir. IMEI takibi burada sadece bir kayıt formalitesi değil, envanter doğruluğunun temelidir.",
        ],
      },
      {
        heading: "IMEI takibi hangi sorunları önler?",
        list: [
          "Aynı cihazın yanlışlıkla iki kez stoğa eklenip iki kez satılmaya çalışılması.",
          "İkinci el (buyback) alımlarda, daha önce satılmış bir cihazın farklı bir kayıtla tekrar sisteme girmesi.",
          "Garanti/servis sorgusunda \"bu cihazı biz mi sattık\" sorusuna hızlı ve güvenilir cevap verilememesi.",
          "Stok raporlarının gerçek fiziksel envanterden sapması.",
        ],
      },
      {
        heading: "Satış anında IMEI'nin otomatik kapanması",
        paragraphs: [
          "Seri numaralı bir ürün satıldığında, o IMEI'nin stok kaydının orada durmaya devam etmesi bir anlam ifade etmez — çünkü elinizde o cihaz artık yok. Bu satırın satışla birlikte otomatik kapanması (ya pasif hale gelmesi ya da tamamen kaldırılması), hem stok listenizin gerçek durumu yansıtmasını sağlar hem de aynı IMEI'nin bir hata sonucu yeniden \"stokta\" görünmesinin önüne geçer.",
        ],
      },
      {
        heading: "İkinci el (buyback) tarafında IMEI kontrolü",
        paragraphs: [
          "İkinci el alım yapan bayiler için IMEI kontrolü ayrı bir önem taşır: aynı IMEI'ye sahip bir cihazın daha önce satılıp satılmadığının, hâlâ stokta olup olmadığının bilinmesi, hem envanter tutarlılığı hem de olası uyuşmazlıkların önlenmesi açısından kritiktir.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM, IMEI bazlı stok kartlarında aynı IMEI'nin ikinci kez (hâlâ stoktayken) eklenmesini veya düzenleme sırasında başka bir stoktaki cihazla çakışmasını sistemsel olarak engeller; satışla birlikte kart otomatik kapanır. Seri no takibinizi güçlendirmek isterseniz bizimle iletişime geçebilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "telefon-tamiri-isletmesi-nasil-buyutulur",
    title: "Telefon Tamiri İşletmesi Nasıl Büyütülür? 7 Pratik Adım",
    focusKeyword: "telefon tamiri işletmesi",
    description:
      "Tek şubeden çoklu şubeye geçerken telefon tamiri işletmenizin operasyonel olarak dağılmaması için 7 pratik adım: süreç standardizasyonu, stok, tahsilat ve raporlama.",
    keywords: ["telefon tamiri işletmesi", "teknik servis büyütme", "telefoncu şube yönetimi"],
    tags: ["Büyüme", "Teknik Servis"],
    date: "2026-07-01",
    readingMinutes: 7,
    excerpt:
      "Bir telefon tamiri işletmesi büyürken karşılaşılan en büyük risk, operasyonun kişilere değil süreçlere dayanmasıdır. Şube sayısı artınca bu bağımlılık hızla sorun çıkarır.",
    sections: [
      {
        paragraphs: [
          "Tek şubeyle çalışırken çoğu şey \"kafada\" yürüyebilir: kim ne kadar borçlu, hangi cihaz hangi aşamada, hangi üründen kaç adet var — bunları işletme sahibi zihninde tutabilir. Şube sayısı ikiye, üçe çıktığında bu bilgi artık tek bir kişinin hafızasına sığmaz. Büyüyen bir telefon tamiri işletmesinde karşılaşılan sorunların çoğu aslında bir \"süreç sorunu\"dur, ürün ya da hizmet kalitesiyle ilgili değildir.",
        ],
      },
      {
        heading: "1. Stok ve fiyatlandırmayı merkezileştirin",
        paragraphs: [
          "Her şubenin kendi fiyatını belirlediği, kendi stok defterini tuttuğu bir yapıda merkezi raporlama neredeyse imkansız hale gelir. Ürün kartları ve fiyatlar merkezi tanımlanmalı, şube bazlı stok miktarı ayrı takip edilmelidir.",
        ],
      },
      {
        heading: "2. Tahsilat ve veresiye riskini erken görün",
        paragraphs: [
          "Veresiye satışlar büyümeyi finanse edebilir ama takip edilmezse nakit akışını da boğabilir. Müşteri bazlı cari bakiye ve vade takibinin merkezi bir yerden görülebilmesi, tahsilat riskini erken fark etmenizi sağlar.",
        ],
      },
      {
        heading: "3. Personel bazlı performansı ölçün",
        paragraphs: [
          "Şube sayısı arttıkça hangi personelin ne kadar satış/servis ciro yaptığı, prim hesaplamalarının neye dayandığı netleşmelidir. Bu hem adil bir prim sistemi hem de hangi şubenin/kişinin desteğe ihtiyacı olduğunu görmek için gereklidir.",
        ],
      },
      {
        heading: "4. Servis süreçlerini standardize edin",
        paragraphs: [
          "Her teknisyenin kendi yöntemiyle çalıştığı bir serviste, cihaz kabul-teslim süreçleri şubeden şubeye farklılaşır. Kabul, teşhis, onay, tamir, teslim adımlarının her şubede aynı şekilde işlemesi, müşteri deneyimini tutarlı kılar.",
        ],
      },
      {
        heading: "5. İkinci el ve buyback akışını ayrı yönetin",
        paragraphs: [
          "İkinci el cihaz alım-satımı yapıyorsanız, bu akışın normal satıştan ayrı ama entegre yönetilmesi gerekir — alınan cihazın servise mi gideceği yoksa direkt satışa mı çıkacağı net olmalı.",
        ],
      },
      {
        heading: "6. Raporlamayı günlük karar aracına dönüştürün",
        paragraphs: [
          "Ay sonunda bakılan bir rapor, o ay içinde alınabilecek kararları kaçırmış olur. Günlük satış, açık servis sayısı, kritik stok ve bekleyen tahsilat gibi rakamların anlık görülebilmesi, büyüme sürecinde erken müdahale imkânı verir.",
        ],
      },
      {
        heading: "7. Excel ve WhatsApp'tan tek sisteme geçin",
        paragraphs: [
          "Tüm bu süreçler ayrı ayrı Excel dosyalarında, WhatsApp mesajlarında ve kağıt fişlerde yürüdüğü sürece, büyüme operasyonel karmaşayı da beraberinde getirir. Tek bir sistemde birleştirilmiş satış, servis, stok ve tahsilat verisi, büyürken kontrolü kaybetmemenin en pratik yoludur.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM, çoklu şube yapısını baştan destekleyecek şekilde tasarlandı: stok, POS, servis ve tahsilat verisi tek panelden, şube bazlı görünürlükle yönetilir. Büyüme sürecinizi konuşmak isterseniz bize ulaşabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "telefoncu-yonetim-yazilimi-secim-rehberi",
    title: "Telefoncu Yönetim Yazılımı Seçerken Nelere Dikkat Edilmeli?",
    focusKeyword: "telefoncu yönetim yazılımı",
    description:
      "Telefoncu yönetim yazılımı seçerken stok, POS, servis takibi ve tahsilatın tek sistemde birleşip birleşmediğine bakın. Doğru yazılımı seçmek için pratik kontrol listesi.",
    keywords: ["telefoncu yönetim yazılımı", "telefon bayii programı", "erp seçimi", "pos programı telefoncu"],
    tags: ["Yazılım Seçimi"],
    date: "2026-07-08",
    readingMinutes: 6,
    excerpt:
      "Piyasada birbirinden farklı onlarca program var; ama telefoncuya özgü ihtiyaçları (IMEI takibi, buyback, teknik servis) karşılamayan genel bir POS programı, bir noktadan sonra yetersiz kalır.",
    sections: [
      {
        paragraphs: [
          "Telefon bayileri ve teknik servisler için telefoncu yönetim yazılımı ararken karşılaşılan en yaygın hata, genel amaçlı bir POS/muhasebe programını sektöre \"uydurmaya\" çalışmaktır. Bu programlar market, giyim gibi sektörler için tasarlandığından IMEI takibi, teknik servis akışı veya ikinci el (buyback) süreci gibi telefoncuya özgü ihtiyaçları karşılamaz.",
        ],
      },
      {
        heading: "Kontrol listesi: Sormanız gereken sorular",
        list: [
          "Seri numaralı (IMEI'li) ürünler ile adetli ürünler ayrı mantıkla mı yönetiliyor?",
          "Aynı IMEI'nin iki kez stokta görünmesi sistemsel olarak engelleniyor mu?",
          "Teknik servis modülü var mı, yoksa ayrı bir program mı gerekiyor?",
          "Çoklu şube yapısını (stok, kasa, personel bazında) destekliyor mu?",
          "Veresiye/cari takibi ve vade uyarısı yapabiliyor mu?",
          "İkinci el alım (buyback) sürecini destekliyor mu?",
          "Personel bazlı satış/prim raporu alınabiliyor mu?",
          "Verileriniz bulutta mı tutuluyor, yoksa tek bir bilgisayara mı bağımlı?",
        ],
      },
      {
        heading: "Tek program, dağınık veri riskini ortadan kaldırır",
        paragraphs: [
          "Stok ayrı bir Excel'de, servis takibi ayrı bir deftere, tahsilat ayrı bir kasa defterinde tutulduğunda, bu verileri bir araya getirip \"bugün ne durumdayız\" sorusuna cevap vermek saatler alır. Tek bir sistemde birleşen satış, stok, servis ve tahsilat verisi bu sorunu kökten çözer.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM, yukarıdaki kontrol listesinin tamamını telefon bayileri ve teknik servisler için tek panelde karşılayacak şekilde geliştirildi. Mevcut sürecinizi anlatırsanız, size uygun paketi birlikte belirleyebiliriz.",
        ],
      },
    ],
  },
  {
    slug: "ikinci-el-telefon-alim-satim-buyback-sureci",
    title: "İkinci El Telefon Alım Satımında (Buyback) Doğru Süreç Yönetimi",
    focusKeyword: "ikinci el telefon alım satım",
    description:
      "İkinci el telefon alım satımında (buyback) doğru fiyatlandırma, cihaz değerlendirme ve stok entegrasyonu nasıl yönetilir? Telefoncular için buyback süreç rehberi.",
    keywords: ["ikinci el telefon alım satım", "buyback süreci", "telefon takas", "cihaz değerlendirme"],
    tags: ["İkinci El"],
    date: "2026-07-15",
    readingMinutes: 6,
    excerpt:
      "İkinci el alım, doğru yönetilmediğinde iki ayrı sorun doğurur: yanlış fiyatlandırma ve stokla entegre olmayan kayıtlar. Buyback sürecini sağlam kurmanın yolları.",
    sections: [
      {
        paragraphs: [
          "İkinci el (buyback) telefon alımı, doğru yönetildiğinde hem ek bir gelir kalemi hem de müşteri sadakati yaratan bir hizmettir. Ancak süreç düzgün kurgulanmazsa iki tipik sorun ortaya çıkar: cihaza teklif edilen fiyatın gerçek piyasa değerini yansıtmaması, ve alınan cihazın stok sistemine doğru şekilde işlenmemesi.",
        ],
      },
      {
        heading: "Cihaz değerlendirme aşaması",
        paragraphs: [
          "Bir cihazın teklif fiyatı; marka, model, hafıza, kozmetik durum ve fonksiyonel testlerden (ekran, batarya sağlığı, kamera, ses vb.) geçip geçmediğine göre belirlenir. Bu değerlendirmenin standart bir soru/kontrol listesiyle yapılması, farklı personelin farklı fiyat teklif etmesinin önüne geçer.",
        ],
      },
      {
        heading: "Alınan cihazın stok sistemine entegrasyonu",
        paragraphs: [
          "Alınan bir cihaz, servise mi gönderilecek yoksa doğrudan satışa mı çıkacak — bu karar süreç içinde net olmalı. Cihaz stoğa girerken kendi IMEI'siyle kayıt altına alınmalı; aynı IMEI'nin sistemde zaten (başka bir kaynaktan) aktif olarak bulunmaması ayrıca kontrol edilmelidir, aksi halde stok verisinde çakışma oluşur.",
        ],
      },
      {
        heading: "Ödeme ve belge süreci",
        paragraphs: [
          "Buyback işleminde ödeme yöntemi (nakit, banka, cari mahsup) ve ilgili belgelerin (sözleşme, kimlik doğrulama) düzenli tutulması, hem yasal uyum hem de olası uyuşmazlıklarda kanıt açısından önemlidir.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'in buyback modülü, cihaz kabulünden servise yönlendirmeye, stoğa girişten satışa kadar tüm süreci tek akışta birleştirir ve IMEI çakışmalarını sistemsel olarak engeller. İkinci el sürecinizi dijitalleştirmek isterseniz bize yazabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "telefon-bayii-pos-sistemi-nasil-secilir",
    title: "Telefon Bayii İçin POS Sistemi Nasıl Seçilir?",
    focusKeyword: "telefon bayii pos sistemi",
    description:
      "Telefon bayii POS sisteminde barkodlu sepet, parçalı ödeme, veresiye ve stok entegrasyonu neden bir arada olmalı? Doğru POS seçimi için pratik kriterler.",
    keywords: ["telefon bayii pos sistemi", "telefoncu pos programı", "hızlı satış ekranı", "parçalı ödeme pos"],
    tags: ["POS & Satış"],
    date: "2026-07-22",
    readingMinutes: 5,
    excerpt:
      "Kasadaki her satış, arka planda stoktan düşmüyorsa gün sonunda iki ayrı sayım yapmak zorunda kalırsınız. Telefon bayii için POS seçerken asıl bakılması gereken budur.",
    sections: [
      {
        paragraphs: [
          "Bir telefon bayisinde POS ekranı sadece \"tutar hesaplayıp fiş kesen\" bir araç değildir. Satılan ürün aynı anda stoktan düşmeli, ödeme nakit/kart/veresiye arasında bölünebilmeli ve müşteri cari hesabına doğru şekilde işlenmelidir. Bunlardan biri eksikse, gün sonunda kasa ile stok raporu birbirini tutmaz.",
        ],
      },
      {
        heading: "Stokla entegre olmayan POS'un maliyeti",
        paragraphs: [
          "Satış anında stok otomatik düşmüyorsa, gün içinde kaç adet satıldığını akşam tekrar sayarak öğrenirsiniz. Bu hem zaman kaybıdır hem de IMEI'li bir cihaz söz konusuysa hangi cihazın satıldığını geriye dönük tespit etmeyi zorlaştırır.",
        ],
      },
      {
        heading: "Parçalı ödeme (mixed payment) neden önemli?",
        paragraphs: [
          "Müşterinin tutarın bir kısmını nakit, kalanını kartla veya veresiye ödediği durumlar telefon bayilerinde sık görülür. POS ekranının bu tür bölünmüş ödemeleri tek satışta, doğru şekilde kayıt altına alabilmesi gerekir — aksi halde muhasebe tarafında elle düzeltme yapmak zorunda kalırsınız.",
        ],
      },
      {
        heading: "Şube bazlı stok görünürlüğü",
        paragraphs: [
          "Birden fazla şubeniz varsa, POS ekranının hangi şubede satış yapıldığını bilip o şubenin stoğundan düşmesi gerekir. Genel/merkezi stokla şube stoğunu karıştıran sistemler, bir şubede \"stokta\" görünen ürünün aslında başka bir şubede olduğu karışıklığını yaratır.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'in POS modülü barkodlu hızlı satış, parçalı ödeme, veresiye ve şube bazlı stok düşümünü tek ekranda birleştirir; satılan her ürün anında stoktan düşer. POS sürecinizi tek sisteme taşımak isterseniz bize yazabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "veresiye-cari-hesap-takibi-telefoncu",
    title: "Veresiye ve Cari Hesap Takibi: Telefoncular İçin Risk Yönetimi",
    focusKeyword: "veresiye takip programı",
    description:
      "Veresiye satış büyümeyi finanse eder ama takip edilmezse nakit akışını boğar. Telefoncular için cari hesap ve vade takibi nasıl doğru yönetilir?",
    keywords: ["veresiye takip programı", "cari hesap takibi", "telefoncu tahsilat yönetimi", "vade takibi"],
    tags: ["Tahsilat & Cari"],
    date: "2026-07-29",
    readingMinutes: 5,
    excerpt:
      "\"Kim ne kadar borçlu\" sorusunun cevabı elle tutulan bir deftere bağlıysa, o cevap her zaman güncel değildir. Veresiye riskini erken görmenin yolu doğru bir cari takip sisteminden geçer.",
    sections: [
      {
        paragraphs: [
          "Telefon bayilerinde ve teknik servislerde veresiye satış (özellikle kurumsal veya tanıdık müşterilere) yaygın bir uygulamadır. Doğru yönetildiğinde satışları artırır; ancak deftere elle yazılan, güncel tutulmayan bir veresiye takibi, farkında olmadan büyüyen bir alacak riskine dönüşür.",
        ],
      },
      {
        heading: "Elle tutulan defterin kör noktaları",
        list: [
          "Bir müşterinin güncel toplam bakiyesini görmek için birden fazla sayfayı toplamak gerekir.",
          "Vade tarihi geçen borçlar sistem tarafından hatırlatılmadığı için gözden kaçar.",
          "Kredi limiti tanımlı değilse, zaten borçlu bir müşteriye yeni veresiye satış yapılabilir.",
          "Tahsilat yapıldığında deftere işlenmesi unutulursa, bakiye gerçek durumu yansıtmaz.",
        ],
      },
      {
        heading: "Kredi limiti ve otomatik uyarı",
        paragraphs: [
          "Her müşteri için bir kredi limiti tanımlanması ve yeni bir veresiye satışın bu limiti aşıp aşmadığının satış anında kontrol edilmesi, riskin büyümeden önce görülmesini sağlar. Bu kontrol POS ekranıyla entegre çalıştığında, satış anında \"bu müşterinin limiti doldu\" uyarısı almak mümkün olur.",
        ],
      },
      {
        heading: "Vade takibinin günlük karar aracına dönüşmesi",
        paragraphs: [
          "Bekleyen tahsilatların vadeye göre sıralanabildiği bir görünüm, hangi müşteriyi önce aramanız gerektiğine hızlıca karar vermenizi sağlar. Bu bilgi ay sonunda değil, her gün kontrol edilebilir olmalıdır.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'de müşteri bazlı cari bakiye, kredi limiti kontrolü ve vade takibi POS ile entegre çalışır; tahsilat riskini deftere değil, sisteme bırakırsınız. Veresiye sürecinizi gözden geçirmek isterseniz bize ulaşabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "yedek-parca-stok-yonetimi-telefon-tamircisi",
    title: "Yedek Parça Stok Yönetimi: Telefon Tamircileri İçin Rehber",
    focusKeyword: "yedek parça stok yönetimi",
    description:
      "Ekran, batarya, konnektör gibi yedek parçalarda stok yönetimi neden özel dikkat ister? Telefon tamircileri için maliyet ve kritik stok takibi rehberi.",
    keywords: ["yedek parça stok yönetimi", "telefon tamiri parça stoğu", "ekran batarya stok takibi"],
    tags: ["Stok Yönetimi", "Teknik Servis"],
    date: "2026-08-05",
    readingMinutes: 5,
    excerpt:
      "Bir tamirin ne kadar kâr bıraktığını bilmek için işçilik değil, kullanılan parçanın gerçek alış maliyetini bilmeniz gerekir. Yedek parça stokunun en çok gözden kaçan yanı budur.",
    sections: [
      {
        paragraphs: [
          "Teknik serviste kullanılan ekran, batarya, konnektör, kamera modülü gibi yedek parçalar, aksesuardan farklı bir dikkat ister: her tamirde kullanılan parçanın maliyeti, o tamirin gerçek kârını doğrudan etkiler. Parça maliyeti doğru takip edilmezse, \"bu tamir bize kaça mal oldu\" sorusuna verilen cevap tahminden ibaret kalır.",
        ],
      },
      {
        heading: "Parça maliyetinin tamir fiyatına doğru yansıması",
        paragraphs: [
          "Bir tamirde kullanılan parçanın alış fiyatı ile işçilik ayrı ayrı kayıt altına alındığında, hem tamirin gerçek kârlılığı görülür hem de aynı parçanın farklı tamirlerde tutarlı fiyatlandırılması sağlanır.",
        ],
      },
      {
        heading: "Kritik stok seviyesi neden burada daha da önemli?",
        paragraphs: [
          "Bir aksesuarın tükenmesi satışı geciktirir; ama en çok talep gören bir ekran modelinin tükenmesi, servise gelen müşteriyi günlerce bekletebilir. Yedek parçalarda minimum stok eşiğinin gerçekçi belirlenmesi ve eşik altına düşüldüğünde otomatik uyarı alınması, servis kapasitesini doğrudan etkiler.",
        ],
      },
      {
        heading: "Parça-model eşleştirmesinin netliği",
        paragraphs: [
          "\"iPhone 13 batarya\" gibi genel bir tanım yerine, marka/model/varyant bilgisinin stok kartında net tutulması, hem sipariş verirken hem de teknisyenin doğru parçayı bulmasında karışıklığı önler.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'de yedek parça stokları kendi kategorisinde, marka/model bilgisiyle ve kritik stok uyarısıyla takip edilir; tamir maliyeti ile parça maliyeti ayrı görünür kalır. Parça stok sürecinizi düzenlemek isterseniz bize yazabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "coklu-sube-yonetimi-telefon-bayii",
    title: "Çoklu Şube Yönetimi: Telefon Bayii Zincirlerinde Merkezi Kontrol",
    focusKeyword: "çoklu şube yönetimi",
    description:
      "Şube sayısı arttıkça stok, kasa ve personel verisi nasıl merkezi tutulur? Telefon bayii zincirleri için çoklu şube yönetimi rehberi.",
    keywords: ["çoklu şube yönetimi", "telefon bayii şube kontrolü", "merkezi stok yönetimi"],
    tags: ["Şube Yönetimi", "Büyüme"],
    date: "2026-08-12",
    readingMinutes: 6,
    excerpt:
      "İkinci şubeyi açtığınız gün, tek şubede işe yarayan alışkanlıklar yetersiz kalmaya başlar. Çoklu şube yönetiminde asıl mesele merkezi görünürlüktür.",
    sections: [
      {
        paragraphs: [
          "Tek şubeyle çalışırken \"bugün ne sattık, kasada ne var\" sorusunun cevabı işletme sahibinin gözünün önündedir. İkinci, üçüncü şube açıldığında bu görünürlük otomatik olarak kaybolur — her şube kendi adasına dönüşme riski taşır. Çoklu şube yönetiminin amacı, bu adaları tek bir merkezi görünümde birleştirmektir.",
        ],
      },
      {
        heading: "Şube bazlı stok, merkezi ürün kartı",
        paragraphs: [
          "Ürün kartı (isim, fiyat, kategori) merkezi tanımlanmalı; stok miktarı ise her şube için ayrı tutulmalıdır. Böylece bir üründe fiyat güncellendiğinde tüm şubelere yansır, ama \"hangi şubede kaç adet var\" sorusu şube bazlı doğru cevaplanır.",
        ],
      },
      {
        heading: "Şubeler arası stok transferi",
        paragraphs: [
          "Bir şubede tükenen ürünün başka bir şubeden transfer edilmesi sık karşılaşılan bir ihtiyaçtır. Bu transferin sistem üzerinden, iki şubenin stok kaydını da doğru güncelleyerek yapılması, elle takip edilen transferlerde oluşan tutarsızlıkları önler.",
        ],
      },
      {
        heading: "Personel ve kasa ayrımı",
        paragraphs: [
          "Her şubenin kendi kasası, kendi personeli ve kendi günlük satış rakamı olmalı; ama işletme sahibi tüm şubelerin toplam performansını tek ekrandan görebilmelidir. Bu ayrım, hem yerinde yönetimi kolaylaştırır hem de merkezi kararları besler.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM, çoklu şube yapısını baştan destekleyecek şekilde kuruldu: stok, kasa ve personel verisi şube bazlı tutulurken, tüm rakamlar merkezi panelden tek bakışta görülür. Şube yapınızı sisteme taşımak isterseniz bize ulaşabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "telefon-tamiri-fiyat-listesi-yonetimi",
    title: "Telefon Tamiri Fiyat Listesi Nasıl Yönetilir?",
    focusKeyword: "telefon tamiri fiyat listesi",
    description:
      "Model ve arıza bazlı tamir fiyatları elle hesaplandığında tutarsızlık kaçınılmazdır. Telefon tamiri fiyat listesini merkezi ve tutarlı yönetmenin yolları.",
    keywords: ["telefon tamiri fiyat listesi", "onarım fiyatlandırma", "servis fiyat yönetimi"],
    tags: ["Fiyatlandırma", "Teknik Servis"],
    date: "2026-08-19",
    readingMinutes: 5,
    excerpt:
      "Aynı arıza için iki farklı teknisyenin iki farklı fiyat söylemesi, müşteri güvenini en hızlı sarsan şeydir. Fiyat listesini merkezi tutmak bunun basit çözümüdür.",
    sections: [
      {
        paragraphs: [
          "Telefon tamirinde fiyatlandırma, model ve arıza türüne göre değişir — bir iPhone ekranı ile bir Samsung ekranının maliyeti aynı değildir. Bu fiyatlar teknisyenlerin hafızasında veya dağınık notlarda tutulduğunda, aynı arıza için farklı zamanlarda farklı fiyat söylenmesi kaçınılmaz hale gelir.",
        ],
      },
      {
        heading: "Merkezi fiyat listesinin sağladığı tutarlılık",
        paragraphs: [
          "Parça ve onarım fiyatlarının marka/model bazında merkezi bir listede tutulması, hangi personel karşılık verirse versin aynı arızaya aynı fiyatın söylenmesini sağlar. Bu hem müşteri güvenini korur hem de fiyat teklifi verme sürecini hızlandırır.",
        ],
      },
      {
        heading: "İşçilik ve parça maliyetinin ayrılması",
        paragraphs: [
          "Tamir fiyatının parça maliyeti ve işçilik olarak ayrı görünmesi, hem kârlılık analizini kolaylaştırır hem de parça fiyatları değiştiğinde (örneğin döviz kuru hareketiyle) sadece parça tarafının güncellenmesine imkân verir.",
        ],
      },
      {
        heading: "Fiyat güncellemesinin tüm şubelere yansıması",
        paragraphs: [
          "Birden fazla şubeniz varsa, fiyat listesindeki bir güncellemenin tüm şubelere aynı anda yansıması gerekir. Aksi halde aynı tamir için şubeler arasında fiyat farkı oluşur ve bu durum müşteri şikayetlerine yol açabilir.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'in Parça & Onarım Fiyatları modülü, model bazlı fiyatları merkezi tutar ve tüm şubelere aynı anda yansıtır. Fiyatlandırma sürecinizi standardize etmek isterseniz bize yazabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "distributor-ithalat-takibi-toplu-stok",
    title: "Distribütör İthalat Takibi: Toplu Alımda Stok Senkronizasyonu",
    focusKeyword: "distribütör ithalat takibi",
    description:
      "Distribütörden toplu alınan ürünler stoğa tek tek mi işleniyor? Toplu ithalat/alım listelerini stokla senkronize etmenin pratik yöntemleri.",
    keywords: ["distribütör ithalat takibi", "toplu stok girişi", "telefon aksesuar toptan alım"],
    tags: ["Tedarik", "Stok Yönetimi"],
    date: "2026-08-26",
    readingMinutes: 5,
    excerpt:
      "Yüzlerce kalemlik bir distribütör faturasını tek tek elle stoğa işlemek hem zaman kaybettirir hem de satır atlama riskini artırır. Toplu ithalat takibinde asıl mesele hız ve doğruluktur.",
    sections: [
      {
        paragraphs: [
          "Distribütörden veya toptancıdan toplu ürün alan telefon bayileri için en büyük operasyonel yük, gelen faturadaki onlarca/yüzlerce kalemi stok sistemine doğru işlemektir. Bu işlem elle yapıldığında hem zaman alır hem de satır atlama, yanlış adet girme gibi hatalara açık hale gelir.",
        ],
      },
      {
        heading: "Toplu listeyi elle işlemenin riskleri",
        list: [
          "Uzun bir listede bir veya birkaç satırın atlanması stok sayımını baştan bozar.",
          "Aynı SKU'nun farklı yazımlarla (büyük/küçük harf, boşluk) iki kez girilmesi mükerrer kayıt oluşturur.",
          "Alış fiyatındaki güncellemelerin mevcut stoğa yansıtılıp yansıtılmadığı belirsizleşir.",
        ],
      },
      {
        heading: "SKU eşleştirmesinin önemi",
        paragraphs: [
          "Distribütörün kullandığı ürün kodu ile kendi sisteminizdeki SKU her zaman birebir örtüşmeyebilir. Toplu girişte bu eşleştirmenin net yapılması, aynı ürünün sistemde iki farklı kayıt olarak açılmasını önler.",
        ],
      },
      {
        heading: "Alış maliyetinin güncel tutulması",
        paragraphs: [
          "Toplu alımlarda birim maliyetler zamanla değişir. Yeni alınan parti stoğa eklenirken alış fiyatının güncellenmesi, kâr marjı hesaplamalarının doğru kalması için gereklidir.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'in Distribütör İthalat modülü, toplu ürün listelerini stok sistemine hızlı ve tutarlı şekilde aktarmak için tasarlandı. Toplu alım sürecinizi hızlandırmak isterseniz bize ulaşabilirsiniz.",
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}
