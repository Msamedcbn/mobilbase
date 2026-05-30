export type LeadStatus = "LEAD" | "NEGOTIATION" | "OFFER_SENT" | "WON" | "LOST";

export type CrmTaskType = "CALL" | "DEMO" | "FOLLOW_UP" | "OFFER_REVIEW" | "RENEWAL_TOUCH";
export type CrmTaskStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "SNOOZED";

export type CrmTask = {
  id: string;
  type: CrmTaskType;
  title: string;
  description?: string;
  dueDate: string;
  ownerUserId?: string;
  status: CrmTaskStatus;
  leadStatus?: LeadStatus;
  createdAt: string;
  updatedAt?: string;
  source?: "MANUAL" | "SUGGESTION";
};

export type CrmSuggestionType =
  | "NO_CONTACT_3_DAYS"
  | "OFFER_NO_RESPONSE"
  | "HIGH_MRR_CANDIDATE"
  | "TICKET_FOLLOW_UP";

export type CrmSuggestion = {
  id: string;
  tenantId: string;
  type: CrmSuggestionType;
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  reason: string;
  suggestedTask: Omit<CrmTask, "id" | "createdAt" | "updatedAt">;
};

export const DEFAULT_CRM_FIELDS = {
  nextActionDate: "",
  ownerUserId: "",
  expectedDealAmount: 0,
  lostReason: "",
  wonSource: "",
  crmTasks: [] as CrmTask[],
};

export function normalizeCrmTask(raw: any): CrmTask {
  return {
    id: String(raw?.id || `crm-task-${Date.now()}`),
    type: ["CALL", "DEMO", "FOLLOW_UP", "OFFER_REVIEW", "RENEWAL_TOUCH"].includes(raw?.type) ? raw.type : "FOLLOW_UP",
    title: String(raw?.title || "CRM Gorevi"),
    description: raw?.description ? String(raw.description) : "",
    dueDate: String(raw?.dueDate || new Date().toISOString().split("T")[0]),
    ownerUserId: raw?.ownerUserId ? String(raw.ownerUserId) : "",
    status: ["OPEN", "IN_PROGRESS", "DONE", "SNOOZED"].includes(raw?.status) ? raw.status : "OPEN",
    leadStatus: ["LEAD", "NEGOTIATION", "OFFER_SENT", "WON", "LOST"].includes(raw?.leadStatus) ? raw.leadStatus : undefined,
    createdAt: String(raw?.createdAt || new Date().toISOString()),
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,
    source: raw?.source === "SUGGESTION" ? "SUGGESTION" : "MANUAL",
  };
}

export function daysFrom(dateStr?: string) {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 999;
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function inferSuggestions(input: {
  tenantId: string;
  tenantName: string;
  leadStatus: LeadStatus;
  leadHistory?: Array<{ date?: string; note?: string; author?: string }>;
  nextActionDate?: string;
  expectedDealAmount?: number;
  planPrice?: number;
  openTicketCount?: number;
  ownerUserId?: string;
}): CrmSuggestion[] {
  const suggestions: CrmSuggestion[] = [];
  const lastContactDate = input.leadHistory?.[0]?.date;
  const contactGap = daysFrom(lastContactDate);
  const today = new Date().toISOString().split("T")[0];

  if (input.leadStatus !== "WON" && input.leadStatus !== "LOST" && contactGap >= 3) {
    suggestions.push({
      id: `${input.tenantId}-no-contact`,
      tenantId: input.tenantId,
      type: "NO_CONTACT_3_DAYS",
      severity: "MEDIUM",
      title: "3 gun temassiz lead",
      reason: `${input.tenantName} icin son temas ${contactGap} gun once.` ,
      suggestedTask: {
        type: "FOLLOW_UP",
        title: "Temas yenileme aramasi",
        description: "Lead ile tekrar temas kur ve engel nedenini ogren.",
        dueDate: today,
        ownerUserId: input.ownerUserId || "",
        status: "OPEN",
        leadStatus: input.leadStatus,
        source: "SUGGESTION",
      },
    });
  }

  if (input.leadStatus === "OFFER_SENT" && contactGap >= 2) {
    suggestions.push({
      id: `${input.tenantId}-offer-no-response`,
      tenantId: input.tenantId,
      type: "OFFER_NO_RESPONSE",
      severity: "HIGH",
      title: "Teklif gonderildi, donus yok",
      reason: "Teklif sonrasi geri donus alinmadi.",
      suggestedTask: {
        type: "OFFER_REVIEW",
        title: "Teklif geri donus takibi",
        description: "Teklifte fiyat/icerik revizyon ihtiyaci var mi kontrol et.",
        dueDate: today,
        ownerUserId: input.ownerUserId || "",
        status: "OPEN",
        leadStatus: "OFFER_SENT",
        source: "SUGGESTION",
      },
    });
  }

  if ((input.expectedDealAmount || 0) >= 20000 || (input.planPrice || 0) >= 3500) {
    suggestions.push({
      id: `${input.tenantId}-high-mrr`,
      tenantId: input.tenantId,
      type: "HIGH_MRR_CANDIDATE",
      severity: "HIGH",
      title: "Yuksek MRR adayi",
      reason: "Beklenen anlasma tutari yuksek.",
      suggestedTask: {
        type: "DEMO",
        title: "Karar verici ile demo",
        description: "Karar vericiye odakli demo/teklif toplantisi planla.",
        dueDate: today,
        ownerUserId: input.ownerUserId || "",
        status: "OPEN",
        leadStatus: input.leadStatus,
        source: "SUGGESTION",
      },
    });
  }

  if ((input.openTicketCount || 0) > 0 && input.leadStatus !== "LOST") {
    suggestions.push({
      id: `${input.tenantId}-ticket-follow-up`,
      tenantId: input.tenantId,
      type: "TICKET_FOLLOW_UP",
      severity: "MEDIUM",
      title: "Acik ticket sonrasi musteri temasi",
      reason: "Acik destek kaydi bulunan lead icin guven tazeleme temasi onerilir.",
      suggestedTask: {
        type: "RENEWAL_TOUCH",
        title: "Destek sonrasi memnuniyet gorusmesi",
        description: "Ticket sureci sonrasi memnuniyet ve ek ihtiyac kontrolu.",
        dueDate: today,
        ownerUserId: input.ownerUserId || "",
        status: "OPEN",
        leadStatus: input.leadStatus,
        source: "SUGGESTION",
      },
    });
  }

  return suggestions;
}
