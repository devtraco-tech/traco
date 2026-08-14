export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/gu, "");
}

export function isPhoneAllowed(
  phone: string,
  allowedPhoneNumbers: string[],
): boolean {
  const normalized = normalizePhoneNumber(phone);
  return normalized.length > 0 && allowedPhoneNumbers.includes(normalized);
}

export function maskPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (normalized.length <= 4) return "****";
  return `${normalized.slice(0, 4)}***${normalized.slice(-4)}`;
}
