"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Decorative warm background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-100/50 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-8 text-center shadow-xl shadow-slate-100/40 relative z-10 animate-fade-in">
        
        {/* Animated Warning Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-500 text-3xl shadow-sm mb-6 animate-pulse">
          ⚠️
        </div>

        <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
          Yetkisiz Erişim İstediği
        </h1>
        
        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          Bu sayfaya veya modüle erişim yetkiniz bulunmamaktadır. Yetki sınırlarınızın genişletilmesi için lütfen sistem yöneticinizle iletişime geçin.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all active:scale-[0.98]"
          >
            ⬅️ Geri Dön
          </button>
          
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md shadow-slate-900/10 transition-all active:scale-[0.98]"
          >
            Paneli Görüntüle 📊
          </Link>
        </div>
      </div>
      
      <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-8 relative z-10">
        MobiBase Cloud • Güvenlik Sistemi
      </p>
    </div>
  );
}
