"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { AlertsResponse } from "@/app/api/alerts/route";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
}

function daysOverdue(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export default function UyarilarPage() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) setData(json.data);
        else if (json?.criticalStock) setData(json);
        else throw new Error(json?.error || "Uyarılar yüklenemedi");
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Uyarılar yüklenemedi"))
      .finally(() => setLoading(false));
  }, []);

  const totalCount = data ? data.criticalStock.length + data.overdueInstallments.length + data.overdueCredit.length : 0;

  return (
    <section className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h2 className="page-title !m-0">Uyarılar</h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Kritik stok, vadesi geçmiş taksit ve veresiye — tek bakışta.</p>
        </div>
      </div>

      {loading ? (
        <div className="panel p-8 text-center text-slate-400 text-sm">Yükleniyor...</div>
      ) : !data ? (
        <div className="panel p-8 text-center text-slate-400 text-sm">Uyarılar yüklenemedi.</div>
      ) : totalCount === 0 ? (
        <div className="panel p-10 text-center space-y-2">
          <div className="text-3xl">✅</div>
          <h3 className="text-base font-bold text-slate-800">Şu anda aktif bir uyarı yok</h3>
          <p className="text-sm text-slate-500">Kritik stok, vadesi geçmiş taksit veya veresiye bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Kritik Stok</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">{data.criticalStock.length}</span>
            </div>
            {data.criticalStock.length === 0 ? (
              <p className="text-xs text-slate-400">Kritik seviyede ürün yok.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {data.criticalStock.map((a) => (
                  <Link key={a.id} href="/stok" className="block rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50/40 transition-colors p-3">
                    <p className="text-sm font-semibold text-slate-800">{a.name}</p>
                    <p className="text-2xs text-slate-400 mt-0.5">SKU: {a.sku}</p>
                    <p className="text-xs mt-1 font-bold text-rose-600">{a.quantity} adet kaldı (eşik: {a.minThreshold})</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Vadesi Geçmiş Taksit</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{data.overdueInstallments.length}</span>
            </div>
            {data.overdueInstallments.length === 0 ? (
              <p className="text-xs text-slate-400">Vadesi geçmiş taksit yok.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {data.overdueInstallments.map((a) => (
                  <Link key={a.id} href="/taksit-yonetimi" className="block rounded-xl border border-slate-200 hover:border-amber-200 hover:bg-amber-50/40 transition-colors p-3">
                    <p className="text-sm font-semibold text-slate-800">{a.customerName ?? "Bilinmeyen müşteri"}</p>
                    <p className="text-2xs text-slate-400 mt-0.5">{a.saleTransactionNo} · {a.installmentNo}. taksit</p>
                    <p className="text-xs mt-1 font-bold text-amber-700">
                      {a.amount.toLocaleString("tr-TR")} TL · {formatDate(a.dueDate)} ({daysOverdue(a.dueDate)} gün gecikme)
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Vadesi Geçmiş Veresiye</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{data.overdueCredit.length}</span>
            </div>
            {data.overdueCredit.length === 0 ? (
              <p className="text-xs text-slate-400">Vadesi geçmiş veresiye borcu yok.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {data.overdueCredit.map((a) => (
                  <Link key={a.id} href="/musteriler-veresiye" className="block rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/40 transition-colors p-3">
                    <p className="text-sm font-semibold text-slate-800">{a.customerName}</p>
                    <p className="text-xs mt-1 font-bold text-blue-700">
                      {a.balance.toLocaleString("tr-TR")} TL · vade {formatDate(a.dueDate)} ({daysOverdue(a.dueDate)} gün gecikme)
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
