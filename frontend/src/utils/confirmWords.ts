const CONFIRM_WORDS = new Set([
  'jo', 'ano', 'ok', 'okay', 'hotovo', 'yes', 'jasně', 'jasne', 'správně', 'spravne', 'tak',
]);

export function isConfirmWord(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized.length > 0 && CONFIRM_WORDS.has(normalized);
}
