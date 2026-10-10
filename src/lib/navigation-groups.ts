import type { LucideIcon } from 'lucide-react';

export type PortalNavigationItem = {
  name: string;
  icon: LucideIcon;
  path: string;
  isNew?: boolean;
  isFun?: boolean;
};

export type PortalNavigationGroup = {
  name: string;
  items: PortalNavigationItem[];
};

const GROUP_ORDER = [
  'Overview',
  'Admissions & People',
  'School Operations',
  'Learning & Assessment',
  'Student Life',
  'Communication',
  'Finance',
  'Account & Support',
  'Other',
] as const;

type NavigationGroupName = (typeof GROUP_ORDER)[number];

function isRoute(path: string, base: string) {
  return path === base || path.startsWith(`${base}/`);
}

function groupForPath(path: string): NavigationGroupName {
  if (isRoute(path, '/dashboard')) return 'Overview';

  if (['/admissions', '/students', '/parents', '/staff', '/classes'].some(base => isRoute(path, base))) {
    return 'Admissions & People';
  }

  if (['/timetable', '/calendar', '/school-attendance', '/attendance', '/behavior'].some(base => isRoute(path, base))) {
    return 'School Operations';
  }

  if ([
    '/question-bank', '/internal-question-bank', '/exam-practice', '/internal-exams',
    '/internal-exams-new', '/entrance-exam', '/cbt', '/my-exams', '/broadsheet',
    '/assessment-format', '/lesson-notes',
  ].some(base => isRoute(path, base))) {
    return 'Learning & Assessment';
  }

  if (['/ai-tutor', '/portfolio', '/study-hub', '/hall-of-fame', '/trivia'].some(base => isRoute(path, base))) {
    return 'Student Life';
  }

  if (['/sms-notifications', '/video-meetings', '/chat', '/messaging'].some(base => isRoute(path, base))) {
    return 'Communication';
  }

  if (isRoute(path, '/payments')) return 'Finance';
  if (['/configuration', '/change-password', '/help'].some(base => isRoute(path, base))) return 'Account & Support';
  return 'Other';
}

export function groupNavigationItems(items: readonly PortalNavigationItem[]): PortalNavigationGroup[] {
  const grouped = new Map<NavigationGroupName, PortalNavigationItem[]>();

  for (const item of items) {
    const name = groupForPath(item.path);
    const existing = grouped.get(name) ?? [];
    existing.push(item);
    grouped.set(name, existing);
  }

  return GROUP_ORDER.flatMap(name => {
    const groupItems = grouped.get(name);
    return groupItems?.length ? [{ name, items: groupItems }] : [];
  });
}

export function isActiveNavigationItem(pathname: string | null, itemPath: string) {
  return pathname === itemPath || Boolean(pathname?.startsWith(`${itemPath}/`));
}

export function navigationGroupId(prefix: string, name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${prefix}-${slug}`;
}
