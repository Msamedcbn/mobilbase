"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

interface TicketMessage {
  sender: "Tenant" | "Admin";
  body: string;
  date: string;
}

interface Ticket {
  id: string;
  title: string;
  category: "BUG" | "FEATURE" | "BILLING" | "OTHER";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  messages: TicketMessage[];
  assignee?: string;
}

export function SupportBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [loading, setLoading] = useState(false);

  // New ticket form
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Ticket["category"]>("OTHER");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Reply message
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch tickets
  const fetchTickets = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/tenant/tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch {
      if (!silent) toast.error("Destek talepleri yüklenemedi.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Poll for new messages when open
  useEffect(() => {
    if (isOpen) {
      fetchTickets(tickets.length > 0); // silent load if we already have tickets
      const interval = setInterval(() => {
        fetchTickets(true);
      }, 7000); // Poll every 7 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen, tickets.length]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (view === "detail" && selectedTicketId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [view, selectedTicketId, tickets]);

  const activeTicket = tickets.find((t) => t.id === selectedTicketId);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/tenant/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, message }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Destek talebiniz oluşturuldu.");
        setTitle("");
        setMessage("");
        setCategory("OTHER");
        setView("list");
        await fetchTickets();
        if (data.ticket) {
          setSelectedTicketId(data.ticket.id);
          setView("detail");
        }
      } else {
        toast.error("Talep gönderilemedi.");
      }
    } catch {
      toast.error("Sunucu hatası.");
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicketId) return;

    setReplying(true);
    try {
      const res = await fetch("/api/tenant/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedTicketId, message: replyMessage }),
      });
      if (res.ok) {
        setReplyMessage("");
        await fetchTickets(true); // silent update
      } else {
        toast.error("Cevap gönderilemedi.");
      }
    } catch {
      toast.error("Bağlantı hatası.");
    } finally {
      setReplying(false);
    }
  };

  const getCategoryLabel = (cat: Ticket["category"]) => {
    switch (cat) {
      case "BUG":
        return "Hata Bildirimi 🐛";
      case "FEATURE":
        return "Özellik İsteği 💡";
      case "BILLING":
        return "Ödeme & Fatura 💳";
      default:
        return "Diğer ⚙️";
    }
  };

  const getStatusBadge = (status: Ticket["status"]) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            Bekliyor
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
            İşlemde
          </span>
        );
      case "RESOLVED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-450 text-emerald-400 border border-emerald-500/30">
            Çözüldü
          </span>
        );
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* TRIGGER FLOATING BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center justify-center w-14 h-14 rounded-full bg-slate-950 text-white shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:shadow-indigo-500/20 border border-slate-800 transition-all duration-300 hover:scale-105 active:scale-95"
          title="Destek Masası"
        >
          <div className="relative">
            <svg
              className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {/* Pulsing indicator if there are open support requests */}
            {tickets.some((t) => t.status === "OPEN" || t.status === "IN_PROGRESS") && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            )}
          </div>
        </button>
      )}

      {/* CHAT BOX CONTAINER */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[500px] flex flex-col bg-slate-950/90 border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-5 fade-in duration-200">
          
          {/* HEADER */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-indigo-650 flex items-center justify-center font-black text-white text-sm bg-indigo-600">
                  TP
                </div>
                <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                </span>
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-100 leading-tight">Müşteri Destek Masası</h3>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">TelefoncuPro Merkez Yönetimi</span>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* MAIN VIEW CONTENT */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/30">
            
            {/* VIEW 1: TICKETS LIST */}
            {view === "list" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800/50">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Talepleriniz</span>
                  <button
                    onClick={() => setView("create")}
                    className="px-2.5 py-1 text-[11px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-all"
                  >
                    + Yeni Talep Aç
                  </button>
                </div>

                {loading && tickets.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <span className="text-xs text-slate-450 text-slate-400 font-semibold block">Talepler yükleniyor...</span>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <svg className="w-12 h-12 text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400">Henüz destek talebiniz yok.</p>
                      <p className="text-[10px] text-slate-500">Merkez yöneticisine iletmek istediğiniz soru veya sorunlar için talep açın.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tickets.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTicketId(t.id);
                          setView("detail");
                        }}
                        className="w-full text-left p-3.5 bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl transition-all hover:scale-[1.01] flex flex-col gap-2 relative group"
                      >
                        <div className="flex justify-between items-start gap-3 w-full">
                          <span className="font-extrabold text-xs text-slate-200 group-hover:text-indigo-400 transition-colors leading-tight line-clamp-1">
                            {t.title}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono flex-shrink-0">{t.createdAt}</span>
                        </div>
                        
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {getCategoryLabel(t.category)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {getStatusBadge(t.status)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: CREATE TICKET FORM */}
            {view === "create" && (
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/50">
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-850 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-xs font-bold text-slate-300">Yeni Destek Talebi</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Talep Başlığı</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                      placeholder="Konuyu kısaca özetleyin..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Kategori</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                    >
                      <option value="BUG">Hata Bildirimi 🐛</option>
                      <option value="FEATURE">Özellik İsteği 💡</option>
                      <option value="BILLING">Ödeme & Fatura 💳</option>
                      <option value="OTHER">Diğer Konular ⚙️</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Detaylı Mesajınız</label>
                    <textarea
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-semibold resize-none"
                      placeholder="Yaşadığınız sorunu veya talebinizi detaylıca açıklayın..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white text-xs font-bold rounded-xl transition-all shadow-[0_4px_20px_rgba(79,70,229,0.3)] active:scale-95 bg-indigo-600"
                  >
                    {sending ? "Gönderiliyor..." : "Destek Talebini Gönder"}
                  </button>
                </div>
              </form>
            )}

            {/* VIEW 3: TICKET DETAILS & CHAT */}
            {view === "detail" && activeTicket && (
              <div className="flex flex-col h-full space-y-3">
                {/* Back bar */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setView("list")}
                      className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="max-w-[180px]">
                      <span className="text-[10px] text-slate-400 font-semibold block truncate leading-tight">
                        {activeTicket.title}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(activeTicket.status)}
                  </div>
                </div>

                {/* Assigned support info */}
                <div className="px-2.5 py-1.5 bg-slate-900/50 border border-slate-800/40 rounded-xl text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Yetkili: <strong className="text-slate-350 text-slate-300 font-bold">{activeTicket.assignee || "Atanmamış"}</strong></span>
                  <span className="font-mono text-slate-500">No: {activeTicket.id}</span>
                </div>

                {/* Messages scroll box */}
                <div className="flex-1 min-h-[220px] max-h-[250px] overflow-y-auto space-y-3 p-1.5 border border-slate-800/30 rounded-2xl bg-slate-900/20">
                  {activeTicket.messages.map((msg, idx) => {
                    const isSelf = msg.sender === "Tenant";
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col max-w-[85%] ${
                          isSelf ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <span className="text-[8px] font-bold text-slate-500 mb-0.5">
                          {isSelf ? "Siz" : "Destek Ekibi"} • {msg.date}
                        </span>
                        <div
                          className={`p-2.5 rounded-2xl text-xs font-semibold leading-relaxed border ${
                            isSelf
                              ? "bg-indigo-600 border-indigo-750 text-white rounded-tr-none"
                              : "bg-slate-900 border-slate-800 text-slate-300 rounded-tl-none"
                          }`}
                        >
                          {msg.body}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply textbox form */}
                {activeTicket.status !== "RESOLVED" ? (
                  <form onSubmit={handleSendReply} className="flex gap-2 pt-1 border-t border-slate-800/30">
                    <input
                      type="text"
                      className="flex-grow px-3.5 py-2 bg-slate-900 border border-slate-850 border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                      placeholder="Cevabınızı yazın..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      disabled={replying}
                      required
                    />
                    <button
                      type="submit"
                      disabled={replying || !replyMessage.trim()}
                      className="px-3 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95 bg-indigo-600"
                    >
                      Gönder
                    </button>
                  </form>
                ) : (
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs font-bold text-teal-400">
                    Bu talep çözüldü olarak işaretlenmiştir. Yeniden mesaj yazarak talebi açabilirsiniz.
                    <form onSubmit={handleSendReply} className="flex gap-2 pt-2.5 border-t border-slate-800/30 mt-2">
                      <input
                        type="text"
                        className="flex-grow px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                        placeholder="Reaksiyon yazarak yeniden açın..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        disabled={replying}
                        required
                      />
                      <button
                        type="submit"
                        disabled={replying || !replyMessage.trim()}
                        className="px-3 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl transition-all bg-indigo-600"
                      >
                        Aç
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
