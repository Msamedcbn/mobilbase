"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ConfirmOptions = {
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function useConfirm() {
  const [state, setState] = useState<{ message: string; options?: ConfirmOptions } | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string, options?: ConfirmOptions) => {
    setState({ message, options });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function resolveWith(value: boolean) {
    setState(null);
    resolver.current?.(value);
    resolver.current = null;
  }

  const confirmDialog = state
    ? createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-5">
            <p className="text-sm font-semibold text-slate-800 leading-relaxed">{state.message}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => resolveWith(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer"
              >
                {state.options?.cancelLabel ?? "Vazgeç"}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => resolveWith(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer ${
                  state.options?.danger ? "bg-rose-600 hover:bg-rose-500" : "bg-blue-700 hover:bg-blue-800"
                }`}
              >
                {state.options?.confirmLabel ?? "Onayla"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return { confirm, confirmDialog };
}
