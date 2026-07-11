"use client";

interface TrialTenant {
  id: string;
  name: string;
  email: string | null;
  daysRemaining: number;
  plan: string;
  leadStatus: string;
  lastLoginAt?: string;
}

function getStatusColor(daysRemaining: number) {
  if (daysRemaining <= 0) return "bg-red-50 text-red-700 border-red-200";
  if (daysRemaining <= 3) return "bg-amber-50 text-amber-700 border-amber-200";
  if (daysRemaining <= 7) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function getStatusLabel(daysRemaining: number) {
  if (daysRemaining <= 0) return "Süre Doldu";
  if (daysRemaining === 1) return "1 gün kaldı";
  return `${daysRemaining} gün kaldı`;
}

export function TrialHealthPanel({ customers }: { customers: any[] }) {
  const trialTenants: TrialTenant[] = customers
    .filter((c) => {
      try {
        const notes = c.notes ? JSON.parse(c.notes) : {};
        return notes.isTrial === true;
      } catch {
        return false;
      }
    })
    .map((c) => {
      let meta: any = {};
      try {
        meta = c.notes ? JSON.parse(c.notes) : {};
      } catch {}

      const expiresAt = meta.trialExpiresAt ? new Date(meta.trialExpiresAt) : null;
      const daysRemaining = expiresAt
        ? Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        : 0;

      return {
        id: c.id,
        name: c.fullName || "Adsız Bayi",
        email: c.email || null,
        daysRemaining,
        plan: meta.plan || "Pro",
        leadStatus: meta.leadStatus || "UNKNOWN",
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  if (trialTenants.length === 0) return null;

  const atRisk = trialTenants.filter((t) => t.daysRemaining <= 3).length;

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-800">Deneme Süreleri</h3>
          <p className="mt-1 text-xs text-slate-500">
            {trialTenants.length} deneme hesabı — {atRisk} risk altında
          </p>
        </div>
        {atRisk > 0 && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700 border border-amber-200">
            Dikkat
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
        {trialTenants.map((tenant) => (
          <div
            key={tenant.id}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-xs ${getStatusColor(tenant.daysRemaining)}`}
          >
            <div className="min-w-0">
              <p className="font-bold truncate">{tenant.name}</p>
              <p className="mt-0.5 opacity-70">{tenant.email || "—"}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-black">{getStatusLabel(tenant.daysRemaining)}</p>
              <p className="mt-0.5 opacity-60">{tenant.plan}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
