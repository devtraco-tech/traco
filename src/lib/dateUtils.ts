/**
 * Format date to Brazil timezone (Brasilia)
 * @param date - Date to format (ISO string or Date object)
 * @param showTime - Whether to show time (default: true)
 * @returns Formatted date string in pt-BR locale
 */
export const formatBrazilDate = (
  date: string | Date | null,
  showTime: boolean = true
): string => {
  if (!date) return "N/A";

  const d = new Date(date);
  
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  };

  if (showTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
    options.second = "2-digit";
  }

  return new Intl.DateTimeFormat("pt-BR", options).format(d);
};

/**
 * Format date for display in time ago format (e.g., "2 hours ago")
 * @param date - Date to format
 * @returns Time ago string in Portuguese
 */
export const formatTimeAgo = (date: string | Date | null): string => {
  if (!date) return "N/A";

  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  const intervals: Record<string, number> = {
    ano: 31536000,
    mês: 2592000,
    semana: 604800,
    dia: 86400,
    hora: 3600,
    minuto: 60,
  };

  for (const [label, secondsInInterval] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInInterval);
    if (interval >= 1) {
      return `${interval} ${label}${interval > 1 ? "s" : ""} atrás`;
    }
  }

  return "agora mesmo";
};
