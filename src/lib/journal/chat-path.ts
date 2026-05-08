export function shouldUseJournalStarterFastPath(input: {
  entryText?: string;
  message?: string;
}) {
  return Boolean(input.entryText?.trim()) && !input.message?.trim();
}
