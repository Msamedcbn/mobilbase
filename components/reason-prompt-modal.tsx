"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export function ReasonPromptModal({
  open,
  title,
  description,
  confirmLabel = "Onayla",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  const trimmed = reason.trim();
  const isValid = trimmed.length >= 5;

  function handleConfirm() {
    if (!isValid) return;
    onConfirm(trimmed);
    setReason("");
  }

  function handleCancel() {
    setReason("");
    onCancel();
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-800">{title}</h3>
          {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Gerekçe (zorunlu, en az 5 karakter)</label>
          <textarea
            className="field w-full min-h-[80px] text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Bu işlemi neden yapıyorsunuz?"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={handleCancel} className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200">
            Vazgeç
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 ${danger ? "bg-rose-600 hover:bg-rose-500" : "bg-indigo-600 hover:bg-indigo-500"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
