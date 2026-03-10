/**
 * Formats a date string to a Czech locale date string.
 */
export const formatDate = (date: string | null | undefined): string => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('cs-CZ');
};

/**
 * Checks if a date is in the past (overdue).
 */
export const isOverdue = (date: string | null | undefined): boolean => {
  if (!date) return false;
  const d = new Date(date);
  // Set time to end of day to avoid false positives during the day
  d.setHours(23, 59, 59, 999);
  return d < new Date();
};

/**
 * Generates initials from a name (e.g., "Jan Novák" -> "JN").
 */
export const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Generates a Gravatar URL from an email address.
 * Returns null if no email is provided.
 * Uses d=404 so the Avatar component can detect missing images.
 */
export const getGravatarUrl = async (email: string | null | undefined): Promise<string | null> => {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  const msgBuffer = new TextEncoder().encode(trimmed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `https://www.gravatar.com/avatar/${hashHex}?s=80&d=404`;
};

/**
 * Utility for joining tailwind classes.
 */
export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};
