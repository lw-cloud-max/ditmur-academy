// Shared, school-approved SMS wording. This module contains no credentials.
export const SMS_TEMPLATES = {
  attendancePresent: (studentName: string, date: string) =>
    `Ditmur Academy: ${studentName} was marked present on ${date}. Contact the school if this is unexpected.`,
  attendanceAbsent: (studentName: string, date: string, isExcused: boolean, reason?: string) =>
    `Ditmur Academy: ${studentName} was absent on ${date}.${isExcused ? ' Absence marked excused.' : ' Please contact the school if this is unexpected.'}${reason ? ` Note: ${reason.slice(0, 60)}` : ''}`,
  attendanceLate: (studentName: string, date: string) =>
    `Ditmur Academy: ${studentName} was marked late on ${date}. Please contact the school if this is unexpected.`,
  resultPublished: (term: string) =>
    `Ditmur Academy: Approved results for ${term} are available. Sign in to the Parent Portal to view them.`,
  feeReminder: () =>
    'Ditmur Academy: A school fee invoice or reminder is available in your Parent Portal. Please sign in to review it.',
  announcement: (message: string) => `Ditmur Academy: ${message}`
};
