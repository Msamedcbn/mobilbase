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
  {
    slug: "telefon-bayii-yazilim-maliyeti-ve-getirisi",
    title: "Telefon Bayii Yazılımı Maliyeti: Yatırımın Kendini Ne Kadar Sürede Çıkarır?",
    focusKeyword: "telefon bayii yazılımı fiyatları",
    description:
      "Telefon bayii yazılımına yapılan aylık ödeme, stok hatası, unutulan tahsilat ve kaybedilen zamanın maliyetiyle karşılaştırıldığında genelde kendini hızlıca amorti eder. Maliyet-getiri analizi.",
    keywords: ["telefon bayii yazılımı fiyatları", "telefoncu programı maliyeti", "yazılım yatırım getirisi"],
    tags: ["Yazılım Seçimi", "Büyüme"],
    date: "2026-09-02",
    readingMinutes: 6,
    excerpt:
      "Aylık yazılım ücretine bakıp 'gerekli mi' diye sormak yanlış soru. Doğru soru: yazılımsız çalışmanın gerçek maliyeti ne kadar?",
    sections: [
      {
        paragraphs: [
          "Bir telefon bayii yazılımına bakarken ilk soru genelde \"aylık kaça mal olur\" olur. Oysa doğru soru bu değil: Excel, WhatsApp ve kağıt fişle çalışmaya devam etmenin gerçek maliyeti ne kadar? Bu maliyet fatura olarak gelmediği için görünmez, ama stok hatası, unutulan tahsilat ve kaybedilen zaman şeklinde her ay cebinizden çıkar.",
        ],
      },
      {
        heading: "Excel'in görünmeyen maliyeti",
        paragraphs: ["\"Ücretsiz\" görünen Excel'in asıl maliyeti, harcanan zamanda ve kaçan fırsatta saklıdır:"],
        list: [
          "Gün sonu stok sayımı için harcanan saatler.",
          "Aynı bilgiyi (satış, stok, cari) birden fazla dosyaya elle işlemenin zaman kaybı.",
          "Dosya çakışması veya yanlışlıkla silinen bir satırın yol açtığı veri kaybı.",
          "Raporlama için ayrı ayrı dosyaların bir araya toplanma süresi.",
        ],
      },
      {
        heading: "Bir stok hatasının gerçek bedeli",
        paragraphs: [
          "Aynı IMEI'nin iki kez satılmaya çalışılması, ya da stokta göründüğü halde fiziken bulunmayan bir üründen dolayı müşteriye \"yok\" denmesi — bunların her biri somut bir gelir kaybı veya müşteri memnuniyetsizliğidir. Bu tür hatalar ayda birkaç kez bile yaşansa, biriken maliyet çoğu zaman bir yazılım aboneliğinin çok üzerine çıkar.",
        ],
      },
      {
        heading: "Unutulan tahsilatın maliyeti",
        paragraphs: [
          "Vadesi geçmiş bir veresiye borcunun hatırlatılmaması, doğrudan nakit akışını etkiler. Sistematik bir vade takibi olmadan, kaç TL'lik tahsilatın gecikmiş olduğunu ay sonuna kadar fark etmeyebilirsiniz — bu gecikme bazen aylık yazılım maliyetinin kat kat üzerinde bir tutara denk gelir.",
        ],
      },
      {
        heading: "Yatırımın geri dönüş süresini hesaplamanın basit yolu",
        paragraphs: [
          "Bir ayda kaç saatin stok sayımı, dosya birleştirme ve manuel takibe gittiğini, kaç TL'lik stok/tahsilat hatasıyla karşılaşıldığını kabaca toplayın. Çoğu bayide bu rakam, doğru kurgulanmış bir sistemin aylık maliyetini birkaç haftada karşılar; kalan süre net kazanca dönüşür.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'in paketleri, işletme büyüklüğüne göre kademeli fiyatlandırılır; hangi paketin sizin operasyonunuz için en hızlı geri dönüşü sağlayacağını birlikte hesaplayabiliriz. Mevcut sürecinizi anlatırsanız size uygun paketi önerelim.",
        ],
      },
    ],
  },
  {
    slug: "telefon-tamiri-garanti-takip-sistemi",
    title: "Telefon Tamirinde Garanti Takibi Nasıl Yapılır?",
    focusKeyword: "garanti takip sistemi",
    description:
      "Yapılan tamirin garanti süresi kağıtta kaldığında, tekrar gelen arızalarda ne zaman ücretsiz ne zaman ücretli olduğu tartışma konusu olur. Dijital garanti takibi bunu netleştirir.",
    keywords: ["garanti takip sistemi", "telefon tamiri garanti süresi", "servis garanti yönetimi"],
    tags: ["Teknik Servis"],
    date: "2026-09-09",
    readingMinutes: 5,
    excerpt:
      "Müşteri 'bu arıza garanti kapsamında değil miydi' dediğinde elinizde tarih ve işlem geçmişi yoksa, tartışmayı kaybedersiniz.",
    sections: [
      {
        paragraphs: [
          "Bir cihaz aynı arızayla ikinci kez servise geldiğinde ilk soru şudur: bu, önceki tamirin garanti süresi içinde mi? Bu sorunun cevabı teknisyenin hafızasına veya elle tutulan bir deftere bağlıysa, hem müşteriyle tartışma riski doğar hem de işletme haksız yere ücretsiz tamir yapabilir ya da tam tersi, garanti kapsamındaki bir işi ücretli görebilir.",
        ],
      },
      {
        heading: "Garanti tartışmalarının kök nedeni",
        paragraphs: [
          "Sorun genelde kötü niyetten değil, kayıt eksikliğinden kaynaklanır. Hangi tarihte hangi işlem yapıldığı, hangi parçanın kullanıldığı ve garanti süresinin ne zaman dolduğu net tutulmadığında, aynı konuşma her seferinde sıfırdan ve güvene dayalı olarak yürür.",
        ],
      },
      {
        heading: "Hangi bilgiler kayıt altında olmalı",
        list: [
          "Tamirin yapıldığı tarih ve uygulanan işlem.",
          "Kullanılan parça (varsa) ve bu parçanın kendi garanti süresi.",
          "İşlemi yapan teknisyen.",
          "Garanti süresinin başlangıç ve bitiş tarihi.",
        ],
      },
      {
        heading: "Tekrarlayan arızayı fark etmek",
        paragraphs: [
          "Aynı müşterinin veya aynı cihazın geçmiş servis kayıtlarına hızlıca ulaşabilmek, sadece garanti sorularını değil, tekrarlayan bir arızanın (örneğin kötü değiştirilmiş bir batarya) fark edilmesini de kolaylaştırır. Bu, hem kalite kontrolü hem de müşteri güveni açısından değerlidir.",
        ],
      },
      {
        heading: "Garanti süresi dolan cihazlarda şeffaflık",
        paragraphs: [
          "Garanti süresi dolmuş bir cihaz için ücretli işlem gerektiğinde, önceki işlemin tarihini ve garanti süresini müşteriye net gösterebilmek, \"neden ücretli\" tartışmasını en aza indirir.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'in Tamir Takip modülünde müşteri ve cihaz geçmişi tek aramayla sorgulanabilir; hangi tarihte ne yapıldığı kayıt altındadır. Garanti süreçlerinizi netleştirmek isterseniz bize yazabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "taksitli-telefon-satisi-takip-yonetimi",
    title: "Taksitli Telefon Satışında Takip ve Tahsilat Yönetimi",
    focusKeyword: "taksitli satış takibi",
    description:
      "Taksitli telefon satışında her ayın ödemesini elle takip etmek, gecikmeleri fark etmeyi geciktirir. Taksit takvimi ve otomatik hatırlatmanın önemi.",
    keywords: ["taksitli satış takibi", "telefon taksit yönetimi", "taksit ödeme takvimi"],
    tags: ["Tahsilat & Cari", "POS & Satış"],
    date: "2026-09-16",
    readingMinutes: 5,
    excerpt:
      "Bir müşteriye 12 taksitte satış yaptığınızda, o 12 ayın her birinde 'ödedi mi' sorusunu hatırlamak size değil sisteme ait olmalı.",
    sections: [
      {
        paragraphs: [
          "Taksitli telefon satışı, özellikle yüksek fiyatlı cihazlarda satışı kapatmanın en pratik yollarından biridir. Ama her taksitin vadesini, ödenip ödenmediğini elle takip etmeye kalkışmak, müşteri sayısı arttıkça sürdürülemez hale gelir.",
        ],
      },
      {
        heading: "Taksit takviminin elle takibi neden zorlaşır",
        list: [
          "Onlarca müşterinin farklı vade tarihleri tek bir defterde karışır.",
          "Bir taksidin ödendiği unutulup tekrar hatırlatma yapılabilir, bu da müşteri güvenini sarsar.",
          "Gecikmiş taksitler ancak müşteri aranınca ya da hiç fark edilmeden geç anlaşılır.",
        ],
      },
      {
        heading: "Gecikmiş taksidi erken görmek",
        paragraphs: [
          "Taksit takviminin vadeye göre sıralanabildiği bir görünüm, hangi müşterinin ödemesinin geciktiğini ay beklemeden, gününde görmenizi sağlar. Bu erken görünürlük, tahsilat sürecini bir hatırlatmaya değil bir alışkanlığa dönüştürür.",
        ],
      },
      {
        heading: "Taksitli satışın kâr ve nakit akışı üzerindeki etkisi",
        paragraphs: [
          "Taksitli satış cironuzu büyütebilir, ama nakit akışınızı da geciktirir — satışı bugün yaparsınız, parası aylara yayılır. Bu yüzden açık taksit toplamının ve tahsil edilmemiş tutarın anlık görülebilmesi, önümüzdeki ayların nakit planlamasını yapabilmeniz için gereklidir.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'in Taksit Yönetimi modülü, her satışın taksit takvimini otomatik oluşturur ve gecikmiş ödemeleri tek ekranda gösterir. Taksitli satış sürecinizi düzenlemek isterseniz bize ulaşabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "teknik-servis-personel-prim-sistemi",
    title: "Teknik Serviste Personel Prim ve Hakediş Sistemi Nasıl Kurulur?",
    focusKeyword: "personel prim sistemi teknik servis",
    description:
      "Sabit maaş + satış veya kâr payı şeklinde kurulan prim sistemleri, doğru hesaplanmadığında personel güvenini sarsar. Adil bir prim/hakediş sistemi nasıl kurulur?",
    keywords: ["personel prim sistemi teknik servis", "hakediş hesaplama", "telefoncu personel maaş sistemi"],
    tags: ["Personel & Prim"],
    date: "2026-09-23",
    readingMinutes: 6,
    excerpt:
      "Prim hesaplaması elle, ay sonunda hafızadan yapıldığında hem personel hem işveren için şeffaflık kaybolur.",
    sections: [
      {
        paragraphs: [
          "Sabit maaşa ek olarak satış cirosundan veya kârından pay veren bir prim sistemi, personeli doğru şekilde motive eder — ama bu hesaplama ay sonunda hafızadan, kağıt üzerinde yapılıyorsa, hem hata payı yüksektir hem de personel \"bu rakam nereden çıktı\" diye sorduğunda net bir cevap veremezsiniz.",
        ],
      },
      {
        heading: "Sabit maaş + prim modelleri",
        paragraphs: [
          "En yaygın iki model, kâr payı (satılan ürün/hizmetin maliyeti düşüldükten sonraki kârdan yüzde) ve ciro payı (toplam satış tutarından yüzde) şeklindedir. Hangi model seçilirse seçilsin, oranın ve hangi satışların dahil edildiğinin net tanımlanması gerekir.",
        ],
      },
      {
        heading: "Prim hesaplamasının şeffaf olması neden önemli",
        paragraphs: [
          "Personel kendi yaptığı satışı, bu satıştan doğan kârı ve buna karşılık gelen primi görebildiğinde, sisteme güveni artar. Hesaplama sadece işveren tarafında, görünmez bir şekilde yapılıyorsa, en adil hesaplama bile şüpheyle karşılanabilir.",
        ],
      },
      {
        heading: "Avans ve hakedişin aynı hesapta netleşmesi",
        paragraphs: [
          "Personele ay içinde verilen avanslar ile ay sonunda hesaplanan hakediş aynı cari hesapta tutulduğunda, \"ne kadar borcu var, ne kadar alacağı var\" sorusunun cevabı otomatik netleşir — ayrıca bir \"avansı düş\" hesaplaması yapmaya gerek kalmaz.",
        ],
      },
      {
        heading: "Personel bazlı performansı günlük görmek",
        paragraphs: [
          "Hakediş raporunu sadece ay sonunda değil, günlük ciro ve satış adedi olarak da görebilmek, hem personeli hem işletme sahibini ay bitmeden bilgilendirir — sürpriz bir ay sonu rakamıyla karşılaşılmaz.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'in Personel Yönetimi modülünde sabit maaş, kâr/ciro payı oranı ve ek haklar personel bazında tanımlanır; hakediş dönemsel hesaplanıp cari hesaba işlenir, avanslar aynı hesapta otomatik netleşir. Prim sisteminizi kurmak isterseniz bize yazabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "kurumsal-telefon-satisi-teklif-hazirlama",
    title: "Kurumsal Telefon Satışında Teklif Hazırlama Süreci",
    focusKeyword: "kurumsal teklif hazırlama",
    description:
      "Kurumsal müşterilere toplu telefon satışında hızlı, profesyonel teklif hazırlamak satışı kapatma hızını doğrudan etkiler.",
    keywords: ["kurumsal teklif hazırlama", "toplu telefon satışı", "b2b telefon satışı"],
    tags: ["Kurumsal Satış"],
    date: "2026-09-30",
    readingMinutes: 5,
    excerpt:
      "Kurumsal bir müşteri fiyat teklifi istediğinde, o teklifi bir gün içinde profesyonel bir PDF olarak gönderemiyorsanız, rakibiniz sizden önce davranır.",
    sections: [
      {
        paragraphs: [
          "Kurumsal müşteriler genelde birden fazla tedarikçiden teklif ister ve karşılaştırma yapar. Bu ortamda hızlı ve profesyonel görünen bir teklif, fiyat kadar belirleyici olabilir — teklifi bir gün geç gönderen bayi, çoğu zaman listeden çıkar.",
        ],
      },
      {
        heading: "Kurumsal satışta hız neden belirleyici",
        paragraphs: [
          "Kurumsal alım süreçleri genelde birkaç teklifi yan yana koyarak karar verir. Teklifi elle, Word/Excel'de hazırlayıp göndermek hem zaman kaybettirir hem de son anda fiyat/adet hatası riski taşır.",
        ],
      },
      {
        heading: "Teklif içeriğinde olması gerekenler",
        list: [
          "Model, adet ve birim fiyat bazında net döküm.",
          "Toplu alım indirimi varsa bunun ayrıca gösterilmesi.",
          "Teklifin geçerlilik süresi.",
          "Ödeme koşulları (peşin, vadeli, taksitli).",
        ],
      },
      {
        heading: "Teklifin takibi ve onay süreci",
        paragraphs: [
          "Gönderilen bir teklifin hangi aşamada olduğunu (beklemede, onaylandı, reddedildi) takip edebilmek, kurumsal müşteri sayısı arttıkça hangi fırsatların takipte kalması gerektiğini unutmamanızı sağlar.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'in Kurumsal Teklifler modülü, model/adet bazlı teklifleri hızlıca PDF olarak hazırlar ve onay durumunu takip etmenizi sağlar. Kurumsal satış sürecinizi hızlandırmak isterseniz bize ulaşabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "telefon-bayii-e-fatura-muhasebe-entegrasyonu",
    title: "Telefon Bayii İçin E-Fatura ve Muhasebe Entegrasyonu",
    focusKeyword: "telefon bayii e-fatura",
    description:
      "Satış sisteminden çıkan verinin muhasebeye elle aktarılması hem zaman kaybettirir hem hata riski taşır. E-fatura ve muhasebe entegrasyonunun sağladığı fark.",
    keywords: ["telefon bayii e-fatura", "muhasebe entegrasyonu", "e-arşiv fatura telefoncu"],
    tags: ["Muhasebe & Fatura"],
    date: "2026-10-07",
    readingMinutes: 5,
    excerpt:
      "Satışı POS'ta yapıp faturayı ayrı bir muhasebe programında elle kesmek, aynı bilgiyi iki kez yazmak demektir.",
    sections: [
      {
        paragraphs: [
          "Satış anında POS'a girilen bilgi (müşteri, ürün, tutar) ile faturanın kesildiği program birbirinden bağımsızsa, aynı veriyi iki kez, iki farklı yerde girmiş olursunuz. Bu hem zaman kaybıdır hem de iki kayıt arasında tutarsızlık çıkma riskidir.",
        ],
      },
      {
        heading: "Elle fatura kesmenin biriken riski",
        list: [
          "Satış ile fatura arasında tutar veya müşteri bilgisi uyuşmazlığı oluşabilir.",
          "Bir satışın faturasının kesilmesi unutulabilir.",
          "Ay sonunda satış raporu ile kesilen fatura toplamı birbirini tutmayabilir.",
        ],
      },
      {
        heading: "Satış ve fatura verisinin tek kaynaktan gelmesi",
        paragraphs: [
          "Satış anında girilen bilgiden doğrudan fatura üretilebildiğinde, iki ayrı kayıt tutma ihtiyacı ortadan kalkar; satış raporu ile kesilen faturalar otomatik olarak birbiriyle tutarlı kalır.",
        ],
      },
      {
        heading: "Mali müşavirle veri paylaşımı",
        paragraphs: [
          "Ay sonunda mali müşavirinize gönderdiğiniz verinin, satış sisteminizle birebir örtüşmesi, hem sizin hem onun zamandan tasarruf etmesini sağlar; ayrı ayrı Excel dosyaları hazırlama ihtiyacı azalır.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'de satış ve fatura kayıtları aynı sistemde tutulur, e-arşiv fatura süreciyle entegre çalışır. Muhasebe akışınızı sadeleştirmek isterseniz bize yazabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "telefonculukta-kasa-banka-yonetimi",
    title: "Telefonculukta Çoklu Kasa ve Banka Hesabı Yönetimi",
    focusKeyword: "kasa banka yönetimi telefoncu",
    description:
      "Nakit kasa, POS hesabı ve banka hesapları ayrı ayrı takip edildiğinde gün sonu mutabakatı saatler alır. Çoklu kasa/banka yönetimini tek ekranda birleştirmek.",
    keywords: ["kasa banka yönetimi telefoncu", "çoklu kasa takibi", "gün sonu kasa mutabakatı"],
    tags: ["Tahsilat & Cari"],
    date: "2026-10-14",
    readingMinutes: 5,
    excerpt:
      "Nakit kasanız, banka hesabınız ve POS cihazınızın hesabı üç ayrı yerde tutuluyorsa, gün sonunda üç ayrı sayım yapıyorsunuz demektir.",
    sections: [
      {
        paragraphs: [
          "Bir telefon bayisinde para tek bir yerden akmaz: nakit kasa, kredi kartı POS hesabı, banka havale/EFT hesabı ve bazen birden fazla banka şubesi aynı anda kullanılır. Bunlar ayrı ayrı defterlerde tutulduğunda, gün sonunda \"toplamda ne kadar paramız var\" sorusuna cevap vermek zaman alır.",
        ],
      },
      {
        heading: "Neden birden fazla kasa/hesap gerekir",
        paragraphs: [
          "Farklı ödeme yöntemleri farklı hesaplara düşer ve her birinin kendi bakiyesi, kendi hareket geçmişi olmalıdır. Bunları tek bir \"kasa\" gibi düşünmek, hangi hesapta ne kadar olduğunu bulanıklaştırır.",
        ],
      },
      {
        heading: "Her satışın doğru hesaba düşmesi",
        paragraphs: [
          "POS ekranından yapılan bir satışta ödeme yöntemi seçildiğinde, tutarın otomatik olarak ilgili kasa/banka hesabına işlenmesi, gün içinde elle hesap aktarımı yapma ihtiyacını ortadan kaldırır.",
        ],
      },
      {
        heading: "Gün sonu mutabakatını hızlandırmak",
        paragraphs: [
          "Her hesabın güncel bakiyesi ve hareket dökümü anlık görülebildiğinde, gün sonu kapanışı saatler değil dakikalar alır; fiziksel kasadaki nakit ile sistemdeki rakamı karşılaştırmak yeterlidir.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'in Banka & Kasa modülü, birden fazla kasa/banka hesabını ayrı ayrı takip eder; her satış ödeme yöntemine göre doğru hesaba otomatik işlenir. Kasa sürecinizi sadeleştirmek isterseniz bize ulaşabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "whatsapptan-telefon-satisi-yonetmenin-riskleri",
    title: "WhatsApp'tan Telefon Satışı Yönetmenin 5 Riski",
    focusKeyword: "whatsapp ile satış takibi riskleri",
    description:
      "WhatsApp hızlı iletişim için harika ama sipariş, stok ve tahsilat takibi için tasarlanmadı. WhatsApp üzerinden satış yönetmenin beş somut riski.",
    keywords: ["whatsapp ile satış takibi riskleri", "whatsapp sipariş takibi", "telefon bayii whatsapp"],
    tags: ["Büyüme", "POS & Satış"],
    date: "2026-10-21",
    readingMinutes: 5,
    excerpt:
      "'Ayarladık hocam' mesajının altında hangi sipariş, hangi stoktan, ne zaman teslim edilecek — bu bilgi bir sohbet balonunda kaybolmaya çok müsait.",
    sections: [
      {
        paragraphs: [
          "WhatsApp, müşteriyle hızlı iletişim kurmak için mükemmel bir araç — ama bir sipariş, stok ve tahsilat yönetim sistemi olarak tasarlanmadı. Satış sürecinin tamamını WhatsApp sohbetlerine yaymak, kısa vadede pratik görünse de büyüdükçe ciddi riskler biriktirir.",
        ],
      },
      {
        heading: "Risk 1: Sipariş geçmişi aranabilir değil",
        paragraphs: [
          "Bir müşterinin \"geçen ay aldığım telefon\" dediği siparişi bulmak için yüzlerce mesajı kaydırmak gerekir. Bu bilgi bir veritabanında değil, dağınık sohbet geçmişinde yaşar.",
        ],
      },
      {
        heading: "Risk 2: Stok bilgisi güncel değil",
        paragraphs: [
          "\"Stokta var mı\" sorusuna cevap verirken elinizdeki bilgi güncel olmayabilir — aynı ürün başka bir müşteriye de \"var\" denmiş olabilir, bu da çift satış riskini doğurur.",
        ],
      },
      {
        heading: "Risk 3: Ödeme ve veresiye takibi dağınıklaşır",
        paragraphs: [
          "\"Kalanını sonra öderim\" şeklindeki anlaşmalar mesaj geçmişinde kalır; kimin ne kadar borcu olduğunu görmek için tek tek sohbetleri kontrol etmek gerekir.",
        ],
      },
      {
        heading: "Risk 4: Personel değiştiğinde bilgi de gider",
        paragraphs: [
          "Satışı yürüten personelin telefonundaki WhatsApp'a bağımlı bir süreçte, o kişi işten ayrıldığında müşteri geçmişi ve devam eden görüşmeler de işletmeden kopar.",
        ],
      },
      {
        heading: "Risk 5: Raporlama neredeyse imkansız",
        paragraphs: [
          "Bu ay kaç sipariş alındığı, hangi ürünlerin en çok satıldığı gibi sorulara WhatsApp sohbetlerinden cevap üretmek pratikte mümkün değildir.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "WhatsApp'ı müşteriyle iletişim için kullanmaya devam edin — ama siparişi, stoğu ve tahsilatı ayrı bir sistemde kayıt altına alın. VibeGSM bu ayrımı net tutar: iletişim WhatsApp'ta kalır, kayıt sistemde. Geçiş sürecinizi konuşmak isterseniz bize yazabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "cihaz-teslim-tutanagi-hasar-tespit-formu",
    title: "Cihaz Teslim Tutanağı ve Hasar Tespit Formunu Dijitalleştirmek",
    focusKeyword: "cihaz teslim tutanağı",
    description:
      "Cihaz servise gelirken mevcut hasarların kayıt altına alınmaması, teslim anında 'bu çizik zaten var mıydı' tartışmasına yol açar. Dijital ön kontrol formu bunu önler.",
    keywords: ["cihaz teslim tutanağı", "hasar tespit formu", "servis ön kontrol listesi"],
    tags: ["Teknik Servis"],
    date: "2026-10-28",
    readingMinutes: 5,
    excerpt:
      "Cihazı kabul ederken ekranda çizik var mıydı, kamerada leke var mıydı — bu sorunun cevabı kabul anında kayıt altına alınmadıysa, teslimde ispat sizde olur.",
    sections: [
      {
        paragraphs: [
          "Bir cihaz servise geldiğinde, sadece bildirilen arıza değil, cihazın genel kozmetik ve fonksiyonel durumu da kayıt altına alınmalıdır. Bu yapılmazsa, teslim anında \"bu çizik siz de mi yaptınız\" tartışması işletmenin aleyhine sonuçlanabilir — çünkü ispat yükü elinizde değildir.",
        ],
      },
      {
        heading: "Tutanaksız kabul neden risklidir",
        paragraphs: [
          "Kabul anında not alınmayan bir hasar, teslim anında fark edildiğinde kimin sorumlu olduğu belirsizleşir. Bu belirsizlik hem müşteri güvenini zedeler hem de haksız yere işletmenin tazminat ödemesine yol açabilir.",
        ],
      },
      {
        heading: "Ön yüz / arka yüz kontrol listesinin mantığı",
        paragraphs: [
          "Cihazın ön ve arka yüzü üzerinde ekran, kamera, hoparlör, şarj soketi gibi bileşenlerin kabul anında \"çalışıyor / sorunlu / kontrol edilmedi\" olarak işaretlenmesi, hem teknisyene hem müşteriye net bir başlangıç noktası sağlar. Bu liste sonradan yorumlanmaya değil, kabul anındaki gözleme dayanmalıdır.",
        ],
      },
      {
        heading: "Teslimde karşılaştırma",
        paragraphs: [
          "Cihaz teslim edilirken kabul anındaki kontrol listesiyle mevcut durumun karşılaştırılabilmesi, olası bir anlaşmazlıkta somut bir referans noktası sunar — sözlü hafızaya değil, kayıtlı veriye dayanan bir tartışma çok daha hızlı çözülür.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'in Tamir Takip modülünde her cihaz kabul edilirken ön/arka yüz üzerinden görsel bir kontrol listesi doldurulur ve bu kayıt cihazın dosyasında kalıcı olarak tutulur. Kabul-teslim sürecinizi netleştirmek isterseniz bize yazabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "telefon-bayii-karlilik-analizi-kar-zarar-raporu",
    title: "Telefon Bayii İçin Kârlılık Analizi ve Kâr-Zarar Raporlama",
    focusKeyword: "telefon bayii kârlılık analizi",
    description:
      "Ciro yüksek görünse de gerçek kârlılık maliyetler düşülmeden bilinmez. Telefon bayii için doğru kâr-zarar raporlamasının temel bileşenleri.",
    keywords: ["telefon bayii kârlılık analizi", "kâr zarar raporu", "işletme maliyeti analizi telefoncu"],
    tags: ["Raporlama", "Büyüme"],
    date: "2026-11-04",
    readingMinutes: 6,
    excerpt:
      "Bu ay 500 bin TL ciro yaptınız — peki kaç TL kâr kaldı? Çoğu bayi bu sorunun cevabını ancak yıl sonunda, muhasebeciyle konuşunca öğrenir.",
    sections: [
      {
        paragraphs: [
          "Ciro, bir işletmenin sağlığını gösteren tek başına yanıltıcı bir rakamdır. Yüksek ciroya rağmen düşük kârla, hatta zararla çalışan bayiler vardır — çünkü ürün maliyeti, parça maliyeti, personel gideri ve işletme giderleri ciro rakamının içinde görünmez.",
        ],
      },
      {
        heading: "Ciro ile kâr karıştırılınca ne olur",
        paragraphs: [
          "Bir işletme sahibi \"bu ay iyi geçti\" derken genelde ciroyu kastediyordur. Ama satılan ürünlerin maliyeti, verilen primler ve sabit giderler düşülmeden yapılan bu değerlendirme, gerçek durumu yansıtmayabilir — ciro artarken kâr aynı oranda artmayabilir, hatta düşebilir.",
        ],
      },
      {
        heading: "Maliyetin doğru bileşenleri",
        list: [
          "Satılan ürünün gerçek alış maliyeti (güncel liste fiyatı değil, o an alınan fiyat).",
          "Tamirlerde kullanılan yedek parçanın maliyeti.",
          "Personel sabit maaş ve prim/hakediş ödemeleri.",
          "Kira, fatura gibi sabit işletme giderleri.",
        ],
      },
      {
        heading: "Günlük/haftalık kârlılığı görmek neden önemli",
        paragraphs: [
          "Kârlılığı sadece ay sonunda, muhasebeciyle görüşünce öğrenmek, o ay içinde alınabilecek düzeltici kararları (fiyat güncellemesi, gider kısma, kampanya) kaçırmak demektir. Ciro, maliyet ve kârın gün/hafta bazında görülebilmesi, karar almayı ay sonunu beklemeden mümkün kılar.",
        ],
      },
      {
        heading: "Sonuç",
        paragraphs: [
          "VibeGSM'in Veri Analizi ve P&L raporlama ekranları, satılan ürünün maliyetini, ödeme yöntemini ve personel bazlı dağılımı bir araya getirerek gerçek kârlılığı gösterir. Kârlılık raporlamanızı netleştirmek isterseniz bize ulaşabilirsiniz.",
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}
