"use client";

import { rowsToCsv, downloadCsv, type CsvColumn } from "@/lib/csv-export";

export function ExportCsvButton<T>({
  rows,
  columns,
  filename,
  label = "CSV İndir",
  className,
}: {
  rows: T[];
  columns: CsvColumn<T>[];
  filename: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(filename, rowsToCsv(rows, columns))}
      disabled={rows.length === 0}
      className={
        className ??
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      }
      title={rows.length === 0 ? "Aktarılacak veri yok" : `${rows.length} satır CSV olarak indirilecek`}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      {label}
    </button>
  );
}
