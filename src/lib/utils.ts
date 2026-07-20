import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Parse date string (YYYY-MM-DD) as local time to avoid timezone shift
export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  } catch {
    return null;
  }
}
