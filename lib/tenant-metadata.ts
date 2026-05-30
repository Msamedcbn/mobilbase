export type TenantMetadata = Record<string, unknown> & {
  isSaaS?: boolean;
  isFrozen?: boolean;
};

export function parseTenantMetadata(notes: string | null | undefined): TenantMetadata {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === "object" ? (parsed as TenantMetadata) : {};
  } catch {
    return {};
  }
}

export function stringifyTenantMetadata(metadata: TenantMetadata): string {
  return JSON.stringify(metadata);
}

export function isTenantFrozenFromNotes(notes: string | null | undefined): boolean {
  const metadata = parseTenantMetadata(notes);
  return metadata.isFrozen === true;
}
