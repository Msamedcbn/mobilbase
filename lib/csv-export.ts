export type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
};

// Escapes a single CSV field: wraps in quotes whenever the value contains a
// comma, quote, or newline, doubling any embedded quotes per RFC 4180.
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvField(c.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvField(String(c.accessor(row) ?? ""))).join(",")
  );
  // UTF-8 BOM so Excel on Windows renders Turkish characters (ş, ğ, ı, ü, ö, ç) correctly.
  return "﻿" + [header, ...lines].join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
