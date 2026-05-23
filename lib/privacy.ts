export function maskNationalId(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `${digits.slice(0, 2)}******${digits.slice(-2)}`;
}

export function maskImei(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return "***";
  return `${digits.slice(0, 3)}********${digits.slice(-3)}`;
}

export function maskEmail(value: string) {
  const normalized = value.trim();
  const at = normalized.indexOf("@");
  if (at <= 1) return "***";
  return `${normalized[0]}***${normalized.slice(at - 1)}`;
}

export function maskSensitiveText(text: string) {
  let out = text;
  out = out.replace(/\b\d{11}\b/g, (m) => maskNationalId(m));
  out = out.replace(/\b\d{14,16}\b/g, (m) => maskImei(m));
  out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, (m) => maskEmail(m));
  return out;
}
