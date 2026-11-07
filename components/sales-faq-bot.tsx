"use client";

import { useEffect, useRef, useState } from "react";
import { FAQ_NODES, FAQ_ROOT_ID, salesWhatsAppHref, searchFaq } from "@/lib/sales-faq";

type ChatMessage = { from: "bot" | "user"; lines: string[] };

const TYPING_DELAY_MS = 450;

/**
 * Ziyaretçiler WhatsApp'a yazmadan önce sık sorulan soruların cevaplarını
 * görebilsin diye hazır cevaplı soru-cevap botu. Yapay zekâ kullanmaz;
 * içerik lib/sales-faq.ts dosyasındadır.
 */
export function SalesFaqBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ from: "bot", lines: FAQ_NODES[FAQ_ROOT_ID].answer }]);
  const [currentId, setCurrentId] = useState(FAQ_ROOT_ID);
  const [typing, setTyping] = useState(false);
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing, isOpen]);

  const choose = (nextId: string, label: string) => {
    const node = FAQ_NODES[nextId];
    if (!node || typing) return;
    setMessages((prev) => [...prev, { from: "user", lines: [label] }]);
    setQuery("");
    setTyping(true);
    timerRef.current = setTimeout(() => {
      const lines = nextId === FAQ_ROOT_ID ? ["Başka hangi konuda yardımcı olabilirim?"] : node.answer;
      setMessages((prev) => [...prev, { from: "bot", lines }]);
      setCurrentId(nextId);
      setTyping(false);
    }, TYPING_DELAY_MS);
  };

  const current = FAQ_NODES[currentId];
  const searching = query.trim().length >= 2;
  const options = searching
    ? searchFaq(query).map((id) => ({ label: FAQ_NODES[id].question, next: id }))
    : current.options;

  return (
    <div className="fixed bottom-20 right-5 z-[80] flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {isOpen && (
        <div
          role="dialog"
          aria-label="VibeGSM sık sorulan sorular"
          className="flex h-[min(560px,calc(100dvh-9rem))] w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-15px_rgba(15,23,42,0.35)] sm:w-[380px]"
        >
          <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-black">V</span>
              <div>
                <p className="text-sm font-black leading-tight">VibeGSM Asistan</p>
                <p className="text-[11px] font-semibold text-slate-400">Sık sorulan sorular</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Kapat"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4" aria-live="polite">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[88%] space-y-1.5 rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  m.from === "bot"
                    ? "mr-auto rounded-tl-sm border border-slate-200 bg-white text-slate-700"
                    : "ml-auto rounded-tr-sm bg-blue-600 font-semibold text-white"
                }`}
              >
                {m.lines.map((line, j) => (
                  <p key={j}>{line}</p>
                ))}
              </div>
            ))}

            {typing ? (
              <div className="mr-auto flex w-14 items-center justify-center gap-1 rounded-2xl rounded-tl-sm border border-slate-200 bg-white py-3">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {searching && (
                  <p className="w-full text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {options.length ? "Bulunan sorular" : "Bu konuda hazır cevap bulamadım, aşağıdan WhatsApp'tan sorabilirsiniz."}
                  </p>
                )}
                {options.map((o) => (
                  <button
                    key={o.next + o.label}
                    type="button"
                    onClick={() => choose(o.next, o.label)}
                    className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-left text-[12.5px] font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98]"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2.5 border-t border-slate-200 bg-white px-4 py-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sorunuzu arayın (ör. taksit, fiyat, yazıcı)"
              aria-label="Sorularda ara"
              className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none"
            />
            <a
              href={salesWhatsAppHref(current.question)}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-2.5 text-[13px] font-black text-white shadow-md shadow-[#25D366]/25 transition hover:brightness-105"
            >
              Cevabını bulamadınız mı? WhatsApp&apos;tan yazın
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Soru-cevap penceresini kapat" : "Sık sorulan sorular"}
        aria-expanded={isOpen}
        className="group relative flex h-14 items-center gap-2 rounded-full bg-blue-600 pl-4 pr-5 text-white shadow-[0_10px_30px_-8px_rgba(37,99,235,0.6)] transition-transform hover:scale-105 active:scale-95"
      >
        {!isOpen && <span className="absolute inset-0 animate-ping rounded-full bg-blue-600 opacity-30" />}
        {isOpen ? (
          <svg className="relative h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="relative h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
        )}
        <span className="relative text-sm font-black">{isOpen ? "Kapat" : "Sorularınız mı var?"}</span>
      </button>
    </div>
  );
}
