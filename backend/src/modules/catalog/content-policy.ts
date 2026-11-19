// Deliberately simple keyword heuristic, not a classifier: catches the obvious case of
// someone uploading an actual exam/assessment paper (academic-integrity/copyright risk),
// without blocking the upload outright - it only flags the file for manual review.
const DISALLOWED_TERMS = [
  'exam paper',
  'question paper',
  'answer key',
  'answer sheet',
  'final exam',
  'midterm exam',
  'past exam',
  'solved paper',
];

export function matchesDisallowedTerms(...texts: Array<string | null | undefined>): boolean {
  const haystack = texts.filter(Boolean).join(' ').toLowerCase();
  return DISALLOWED_TERMS.some((term) => haystack.includes(term));
}
