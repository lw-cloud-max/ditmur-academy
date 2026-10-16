// Internal Question Bank's paste-only bulk format. Do not change the
// underlying question model or the per-question editor fields.
export type BulkQuestionRow = {
  text: string; optionA: string; optionB: string; optionC: string;
  optionD: string; correctAnswer: string;
};

export function parseInternalQuestionUpload(input: string): { questions: BulkQuestionRow[]; errors: string[] } {
  const questions: BulkQuestionRow[] = [];
  const errors: string[] = [];
  let firstNonEmpty = true;
  input.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const parts = line.split('|').map(part => part.trim());
    // A header copied with an Excel template is optional.
    if (firstNonEmpty && parts.length === 6 && parts[0].toLowerCase() === 'question' &&
      parts[5].toLowerCase() === 'correct answer') { firstNonEmpty = false; return; }
    firstNonEmpty = false;
    if (parts.length !== 6) {
      errors.push(`Line ${index + 1}: use exactly six fields separated by |.`);
      return;
    }
    const [text, optionA, optionB, optionC, optionD, answer] = parts;
    if (![text, optionA, optionB, optionC, optionD].every(Boolean)) {
      errors.push(`Line ${index + 1}: question and all four options are required.`);
      return;
    }
    if (!/^[ABCD]$/i.test(answer)) {
      errors.push(`Line ${index + 1}: answer must be A, B, C or D.`);
      return;
    }
    questions.push({ text, optionA, optionB, optionC, optionD, correctAnswer: answer.toUpperCase() });
  });
  if (!questions.length && !errors.length) errors.push('Enter at least one question.');
  return { questions, errors };
}
