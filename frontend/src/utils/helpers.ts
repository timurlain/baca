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
 * Utility for joining tailwind classes.
 */
export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};
