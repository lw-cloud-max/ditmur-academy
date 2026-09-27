// Store small lesson-note attachments in the existing LessonPlan.fileUrl TEXT
// column. Files on Vercel's local filesystem disappear between deployments.
// Maximum 3 MB (below Vercel's request body limit). Never return this field
// from list/detail APIs; serve it only through the authenticated download route.
export const MAX_NOTE_FILE_SIZE = 3 * 1024 * 1024;
export const STORED_FILE_PREFIX = 'dbfile:';

const formats: Record<string, { mime: string; signature: (b: Buffer) => boolean }> = {
  pdf: { mime: 'application/pdf', signature: b => b.subarray(0, 5).toString() === '%PDF-' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', signature: b => b.subarray(0, 2).toString() === 'PK' },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', signature: b => b.subarray(0, 2).toString() === 'PK' }
};

export async function readNoteFile(file: File): Promise<{
  fileUrl: string; fileName: string; fileType: string; fileSize: number
}> {
  if (!file.size || file.size > MAX_NOTE_FILE_SIZE) {
    throw new Error('File must be between 1 byte and 3 MB');
  }
  const fileName = file.name.split(/[\\/]/).pop()?.replace(/[\r\n"\\]/g, '').slice(0, 120) || '';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const format = formats[ext];
  if (!format) throw new Error('Only PDF, DOCX and PPTX files are supported');
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!format.signature(buffer)) throw new Error('File contents do not match its extension');
  return { fileUrl: STORED_FILE_PREFIX + buffer.toString('base64'), fileName,
    fileType: format.mime, fileSize: file.size };
}

export function noteHasAttachment(fileUrl: string | null) {
  return !!fileUrl?.startsWith(STORED_FILE_PREFIX);
}
