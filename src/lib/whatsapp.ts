/**
 * Builds a WhatsApp link (wa.me) for a Brazilian phone number.
 * Strips non-numeric characters and prefixes the country code (55) when missing.
 * Optionally appends a pre-filled message.
 * Returns null when there is no valid number.
 */
export const buildWhatsappUrl = (phone?: string | null, message?: string | null): string | null => {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits || digits.length < 10) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  const base = `https://wa.me/${withCountry}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

/** Default greeting message pre-filled when contacting a patient via WhatsApp. */
export const buildPatientWhatsappMessage = (name?: string | null): string => {
  const firstName = (name || "").trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `Olá, ${firstName}!` : "Olá!";
  return `${greeting} Aqui é da ABO Goiás. Estamos entrando em contato sobre o seu atendimento odontológico.`;
};

/**
 * Opens the WhatsApp conversation for the given number in a new tab.
 */
export const openWhatsapp = (phone?: string | null, message?: string | null) => {
  const url = buildWhatsappUrl(phone, message);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
};
