export { cn } from "cn"

/** Generate avatar initials from the first and last words of a name. */
export function getInitials(name: string): string {
 const words = name.trim().split(/\s+/);
 if (words.length === 1) return words[0][0].toUpperCase();
 return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Get the start of the current calendar week (Monday 00:00:00). */
export function getStartOfWeek(): Date {
 const now = new Date();
 const day = now.getDay();
 const diff = day === 0 ? 6 : day - 1;
 const start = new Date(now);
 start.setDate(now.getDate() - diff);
 start.setHours(0, 0, 0, 0);
 return start;
}

/** Build a WhatsApp link from the configured number, or null when invalid. */
export function waMeLink(contactWA?: string | null): string | null {
 const digits = contactWA?.replace(/\D/g, "");
 if (!digits || !/^\d{8,15}$/.test(digits)) return null;
 return `https://wa.me/${digits}`;
}

/** Get the start of the current calendar month (1st day 00:00:00). */
export function getStartOfMonth(): Date {
 const now = new Date();
 const start = new Date(now.getFullYear(), now.getMonth(), 1);
 start.setHours(0, 0, 0, 0);
 return start;
}
