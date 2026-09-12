// ─────────────────────────────────────────────
// Shared utility functions
// ─────────────────────────────────────────────

/**
 * Generate avatar initials from a user's name.
 * Returns first letter of first word + first letter of last word.
 * "Rizki Andalas" → "RA"
 * "Maya" → "M"
 */
export function getInitials(name: string): string {
 const words = name.trim().split(/\s+/);
 if (words.length === 1) return words[0][0].toUpperCase();
 return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Get the start of the current calendar week (Monday 00:00:00).
 */
export function getStartOfWeek(): Date {
 const now = new Date();
 const day = now.getDay();
 // Sunday = 0, Monday = 1 ... Saturday = 6
 // If Sunday (0), go back 6 days to get Monday
 const diff = day === 0 ? 6 : day - 1;
 const start = new Date(now);
 start.setDate(now.getDate() - diff);
 start.setHours(0, 0, 0, 0);
 return start;
}

/**
 * Build a wa.me link from the admin-configured WhatsApp number (logo-config `contactWA`).
 * Accepts display formats like "+62 898-7608-379"; returns null when unset/invalid
 * so callers hide WhatsApp affordances instead of showing a stale hardcoded number.
 */
export function waMeLink(contactWA?: string | null): string | null {
 const digits = contactWA?.replace(/\D/g, "");
 if (!digits || !/^\d{8,15}$/.test(digits)) return null;
 return `https://wa.me/${digits}`;
}

/**
 * Get the start of the current calendar month (1st day 00:00:00).
 */
export function getStartOfMonth(): Date {
 const now = new Date();
 const start = new Date(now.getFullYear(), now.getMonth(), 1);
 start.setHours(0, 0, 0, 0);
 return start;
}
