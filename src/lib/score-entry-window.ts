import { prisma } from '@/lib/prisma';

export type ScoreEntryStatus = {
  term: string;
  configured: boolean;
  isOpen: boolean;
  isReopened: boolean;
  canReopen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  reopenUntil: string | null;
  reason: string;
  serverNow: string;
};

export function parseWATDateTime(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}:00+01:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const normalizedWAT = new Date(parsed.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
  return normalizedWAT === value ? parsed : null;
}

export function formatWATInput(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
}

const formatWAT = (value: Date) => `${new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }).format(value)} WAT`;

export function makeScoreEntryStatus(term: string, config: {
  opensAt: Date; closesAt: Date; reopenUntil: Date | null;
} | null, now = new Date()): ScoreEntryStatus {
  if (!config) return { term, configured: false, isOpen: false, isReopened: false, canReopen: false,
    opensAt: null, closesAt: null, reopenUntil: null,
    reason: 'Score entry is locked until the super admin sets this term’s window.', serverNow: now.toISOString() };
  const insideScheduled = now >= config.opensAt && now <= config.closesAt;
  const insideReopen = !!config.reopenUntil && now > config.closesAt && now <= config.reopenUntil;
  let reason: string;
  if (insideReopen) reason = `The super admin has temporarily reopened score entry until ${formatWAT(config.reopenUntil!)}.`;
  else if (insideScheduled) reason = `Score entry is open from ${formatWAT(config.opensAt)} until ${formatWAT(config.closesAt)}.`;
  else if (now < config.opensAt) reason = `Score entry opens ${formatWAT(config.opensAt)} and closes ${formatWAT(config.closesAt)}.`;
  else reason = `The score-entry deadline (${formatWAT(config.closesAt)}) has passed. Ask the super admin to temporarily reopen it.`;
  return { term, configured: true, isOpen: insideScheduled || insideReopen, isReopened: insideReopen,
    canReopen: now > config.closesAt && !insideReopen,
    opensAt: config.opensAt.toISOString(), closesAt: config.closesAt.toISOString(),
    reopenUntil: config.reopenUntil?.toISOString() || null, reason, serverNow: now.toISOString() };
}

export async function getScoreEntryStatus(termLabel: string, now = new Date()) {
  const term = termLabel.trim();
  if (!term) return makeScoreEntryStatus('', null, now);
  const config = await prisma.scoreEntryWindow.findUnique({ where: { term }, select: { opensAt: true, closesAt: true, reopenUntil: true } });
  return makeScoreEntryStatus(term, config, now);
}
