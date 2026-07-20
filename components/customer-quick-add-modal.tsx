"use client";

import { useState } from "react";
import { toast } from "sonner";

export type QuickAddedCustomer = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  creditLimit?: number;
};

export default function CustomerQuickAddModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (customer: QuickAddedCustomer) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [notes, setNotes] = useState("");
  const [creditLimit, setCreditLimit] = useState("0");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fullName.trim().length < 3) {
      toast.error("Müşteri adı en az 3 karakter olmalıdır.");
      return;
    }
    if (phone.trim().length < 10) {
      toast.error("Telefon numarası en az 10 karakter olmalıdır.");
      return;
    }
    if (nationalId && (nationalId.length !== 11 || !/^\d+$/.test(nationalId))) {
      toast.error("T.C. Kimlik Numarası 11 haneli ve sadece rakamlardan oluşmalıdır.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          nationalId: nationalId.trim() || null,
          notes: notes.trim() || null,
          creditLimit: creditLimit ? Number(creditLimit) : 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || "Müşteri eklenirken bir hata oluştu.");
      toast.success("Müşteri başarıyla eklendi.");
      onCreated(json.data || json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Yeni Müşteri Ekle</h3>
          <p className="text-sm text-slate-500 mt-1">Sisteme yeni bir müşteri kaydı oluşturun.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Ad Soyad *</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="örn. Ahmet Yılmaz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Telefon *</label>
              <input
                type="tel"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="örn. 05551234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">E-posta</label>
              <input
                type="email"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="örn. ahmet@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">T.C. Kimlik No</label>
              <input
                type="text"
                maxLength={11}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                placeholder="11 haneli T.C. No"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Başlangıç Veresiye Limiti (TL)</label>
            <input
              type="number"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
              placeholder="örn. 5000"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Özel Notlar</label>
            <textarea
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent h-20 resize-none"
              placeholder="Müşteri hakkında notlar girin..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
