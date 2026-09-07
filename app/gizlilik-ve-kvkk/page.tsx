import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";

export const metadata: Metadata = {
  title: "Gizlilik Politikası ve KVKK Aydınlatma Metni | VibeGSM",
  description: "VibeGSM'in kişisel verilerinizi nasıl topladığı, işlediği ve koruduğuna ilişkin KVKK Aydınlatma Metni ve Gizlilik Politikası.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-black text-slate-900 md:text-xl">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-slate-600">{children}</div>
    </section>
  );
}

export default function GizlilikVeKvkkPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <PublicHeader />

      <div className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-20">
        <h1 className="text-3xl font-black text-slate-900 md:text-4xl">Gizlilik Politikası ve KVKK Aydınlatma Metni</h1>
        <p className="mt-3 text-sm text-slate-500">Son güncelleme: 7 Eylül 2026</p>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] leading-6 text-amber-800">
          <strong className="font-black">Not:</strong> Bu sayfa, VibeGSM&apos;in kişisel veri işleme süreçlerini şeffaf şekilde
          açıklamak amacıyla hazırlanmış bir taslaktır. Köşeli parantez içindeki alanlar ([...]) şirketinizin gerçek ticari
          sicil, vergi ve iletişim bilgileriyle doldurulmalı, yayına almadan önce bir hukuk danışmanına onaylatılmalıdır.
        </div>

        <Section title="1. Veri Sorumlusu">
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca kişisel verileriniz, veri sorumlusu
            sıfatıyla <strong>[ŞİRKET UNVANI — örn. VibeGSM Cloud Technologies A.Ş./Ltd. Şti.]</strong> (&quot;VibeGSM&quot;,
            &quot;biz&quot;) tarafından aşağıda açıklanan kapsamda işlenmektedir.
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Ticaret Sicil / MERSİS No: [MERSİS NUMARASI]</li>
            <li>Vergi Dairesi / Vergi No: [VERGİ DAİRESİ VE VKN]</li>
            <li>Adres: [TİCARİ ADRES]</li>
            <li>KEP Adresi: [KEP ADRESİ]</li>
          </ul>
        </Section>

        <Section title="2. Hangi Kişisel Verileri Topluyoruz">
          <p>VibeGSM&apos;i kullanırken veya satın alma/deneme talebinde bulunurken aşağıdaki verileri topluyoruz:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>Kimlik ve iletişim bilgileri:</strong> ad-soyad, işletme/bayi adı, e-posta adresi, telefon numarası.</li>
            <li><strong>Hesap ve kullanım bilgileri:</strong> giriş kayıtları, seçilen paket/plan, panel içi işlem kayıtları (satış, stok, servis vb. — yalnızca kendi bayi hesabınız kapsamında).</li>
            <li><strong>Ödeme bilgileri:</strong> kredi/banka kartı numaranız VibeGSM sunucularında <strong>hiçbir zaman saklanmaz</strong>; ödemeler doğrudan aşağıda açıklanan ödeme hizmet sağlayıcımız üzerinden, PCI-DSS uyumlu altyapıda işlenir.</li>
            <li><strong>Referans/pazarlama bilgileri:</strong> varsa kullandığınız referans kodu ve sizi yönlendiren kişi bilgisi.</li>
            <li><strong>Teknik veriler:</strong> IP adresi, tarayıcı bilgisi, çerezler (bkz. madde 6).</li>
          </ul>
        </Section>

        <Section title="3. Kişisel Verilerin İşlenme Amaçları">
          <ul className="ml-5 list-disc space-y-1">
            <li>Hesabınızı oluşturmak, kimliğinizi doğrulamak ve panele erişiminizi sağlamak,</li>
            <li>Abonelik/ödeme işlemlerini gerçekleştirmek ve faturalandırmak,</li>
            <li>Ücretsiz deneme, satın alma ve destek taleplerinizi karşılamak,</li>
            <li>Yasal yükümlülüklerimizi (fatura, muhasebe, denetim) yerine getirmek,</li>
            <li>Hizmet kalitesini artırmak, hataları tespit etmek ve güvenliği sağlamak,</li>
            <li>Açık rızanız bulunması hâlinde kampanya ve duyuru bildirimleri göndermek.</li>
          </ul>
        </Section>

        <Section title="4. Ödeme İşlemleri ve Üçüncü Taraf Hizmet Sağlayıcılar">
          <p>
            Abonelik ödemeleriniz VibeGSM tarafından değil, ödeme hizmet sağlayıcımız <strong>Polar Software, Inc.</strong>{" "}
            (&quot;Polar&quot;) tarafından, &quot;merchant of record&quot; (satışı gerçekleştiren taraf) sıfatıyla ve alt
            yüklenicisi <strong>Stripe, Inc.</strong> altyapısı üzerinden tahsil edilir. Ödeme sayfasında girdiğiniz kart
            bilgileri VibeGSM&apos;e hiçbir şekilde ulaşmaz; doğrudan Polar/Stripe&apos;ın güvenli, PCI-DSS uyumlu
            sistemlerinde işlenir. Fatura ve tahsilat kayıtlarınız bu nedenle Polar&apos;ın kayıtlarında da tutulur.
          </p>
          <p>Diğer alt yüklenicilerimiz:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong>Supabase, Inc.</strong> — veritabanı ve dosya depolama altyapısı.</li>
            <li><strong>Vercel Inc.</strong> — web sitesi ve uygulama barındırma (hosting) altyapısı.</li>
            <li><strong>[E-POSTA SAĞLAYICISI — örn. Mailtrap]</strong> — işlem/bildirim e-postalarının iletimi (eklendiğinde güncellenecektir).</li>
          </ul>
        </Section>

        <Section title="5. Yurt Dışına Veri Aktarımı">
          <p>
            Yukarıda sayılan hizmet sağlayıcıların (Polar, Stripe, Supabase, Vercel) sunucuları yurt dışında (başta ABD ve
            AB) bulunabilir. Bu kapsamda kişisel verileriniz, KVKK&apos;nın 9. maddesi uyarınca açık rızanız veya kanunda
            öngörülen diğer istisnalar çerçevesinde yurt dışına aktarılabilmektedir. Bu sağlayıcıların tamamı kendi
            gizlilik politikaları ve endüstri standardı güvenlik sertifikalarına (ör. SOC 2, PCI-DSS) sahiptir.
          </p>
        </Section>

        <Section title="6. Çerezler">
          <p>
            Web sitemiz, oturumunuzu açık tutmak ve site kullanımını analiz etmek amacıyla zorunlu ve isteğe bağlı çerezler
            kullanır. Tarayıcı ayarlarınızdan çerezleri yönetebilir veya silebilirsiniz; ancak bazı çerezlerin
            devre dışı bırakılması sitenin bazı bölümlerinin çalışmamasına yol açabilir.
          </p>
        </Section>

        <Section title="7. Saklama Süresi">
          <p>
            Kişisel verileriniz, işlenme amacının gerektirdiği süre boyunca ve ilgili mevzuatta (Vergi Usul Kanunu, Türk
            Ticaret Kanunu vb.) öngörülen zamanaşımı süreleri boyunca saklanır. Hesabınızı kapattığınızda, yasal saklama
            yükümlülüğü bulunmayan veriler makul bir süre içinde silinir veya anonimleştirilir.
          </p>
        </Section>

        <Section title="8. KVKK Madde 11 Kapsamındaki Haklarınız">
          <p>KVKK&apos;nın 11. maddesi uyarınca bize başvurarak:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
            <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
            <li>Yurt içinde/dışında aktarıldığı üçüncü kişileri bilme,</li>
            <li>Eksik/yanlış işlenmişse düzeltilmesini isteme,</li>
            <li>Kanuni şartlar çerçevesinde silinmesini/yok edilmesini isteme,</li>
            <li>Aktarıldığı üçüncü kişilere yukarıdaki işlemlerin bildirilmesini isteme,</li>
            <li>Otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonuç çıkmasına itiraz etme,</li>
            <li>Zarara uğramanız hâlinde tazminat talep etme haklarına sahipsiniz.</li>
          </ul>
        </Section>

        <Section title="9. Mesafeli Satış ve Cayma Hakkı">
          <p>
            Abonelik ödemesi, dijital bir hizmetin (yazılım erişiminin) satın alınmasıdır. 6502 sayılı Tüketicinin
            Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, elektronik ortamda anında ifa edilen
            hizmetlerde ve hizmet ifasına onayınızla başlanmış dijital içeriklerde cayma hakkı kullanılamayabilir. Buna
            karşın, abonelik iptali ve iade talepleri için her zaman panelinizdeki &quot;Fatura Geçmişi&quot; bölümünden
            veya WhatsApp destek hattımızdan bize ulaşabilirsiniz; talepler makul ölçüde değerlendirilir.
          </p>
        </Section>

        <Section title="10. Bize Nasıl Ulaşabilirsiniz">
          <p>
            Kişisel verilerinizle ilgili talepleriniz için <strong>[KVKK BAŞVURU E-POSTASI — örn. kvkk@vibegsm.com.tr]</strong>{" "}
            adresine yazılı olarak veya{" "}
            <a href="https://wa.me/905454403452" className="font-bold text-blue-600 hover:underline">WhatsApp destek hattımızdan</a>{" "}
            bize ulaşabilirsiniz. Başvurunuz en geç 30 gün içinde sonuçlandırılır.
          </p>
        </Section>

        <Section title="11. Değişiklikler">
          <p>
            Bu metin, mevzuat değişiklikleri veya hizmetlerimizdeki güncellemeler doğrultusunda zaman zaman revize
            edilebilir. Güncel sürüm her zaman bu sayfada yayınlanır.
          </p>
        </Section>
      </div>
    </div>
  );
}
