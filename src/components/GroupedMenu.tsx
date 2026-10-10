'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Sparkles, type LucideIcon } from 'lucide-react';

export type MenuItem = { name: string; path: string; icon: LucideIcon; isNew?: boolean; isFun?: boolean };
export const GROUPS = [
  'Overview', 'Admissions & People', 'School Operations', 'Learning & Assessment',
  'Student Life', 'Communication', 'Finance', 'Account & Support'
] as const;
type Group = typeof GROUPS[number];
const PATH_GROUP: Record<string, Group> = {
  '/dashboard': 'Overview',
  '/admissions': 'Admissions & People', '/students': 'Admissions & People',
  '/parents': 'Admissions & People', '/staff': 'Admissions & People',
  '/classes': 'School Operations', '/timetable': 'School Operations',
  '/calendar': 'School Operations', '/school-attendance': 'School Operations',
  '/configuration': 'School Operations',
  '/question-bank': 'Learning & Assessment', '/exam-practice': 'Learning & Assessment',
  '/internal-exams-new': 'Learning & Assessment', '/broadsheet': 'Learning & Assessment',
  '/assessment-format': 'Learning & Assessment', '/entrance-exam': 'Learning & Assessment',
  '/cbt': 'Learning & Assessment', '/my-exams': 'Learning & Assessment',
  '/ai-tutor': 'Learning & Assessment', '/lesson-notes': 'Learning & Assessment',
  '/behavior': 'Student Life', '/portfolio': 'Student Life', '/study-hub': 'Student Life',
  '/hall-of-fame': 'Student Life', '/trivia': 'Student Life',
  '/chat': 'Communication', '/messaging': 'Communication',
  '/sms-notifications': 'Communication', '/video-meetings': 'Communication',
  '/payments': 'Finance',
  '/change-password': 'Account & Support', '/help': 'Account & Support'
};
export const isCurrentPath = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`) ||
  (path === '/broadsheet' && pathname.startsWith('/reportsheet/')) ||
  (path === '/parents' && pathname.startsWith('/parent-reconciliation'));
export function groupForPath(path: string): Group { return PATH_GROUP[path] || 'Account & Support'; }

export default function GroupedMenu({ items, pathname, onNavigate, idPrefix }: {
  items: MenuItem[]; pathname: string; onNavigate?: () => void; idPrefix: string;
}) {
  const uid = useId().replace(/:/g, '');
  const currentItem = items.find(item => isCurrentPath(pathname, item.path));
  // The component is keyed by pathname by its callers, so a route change
  // remounts it with the new route's group expanded; users may still collapse it.
  const [expanded, setExpanded] = useState<Group[]>([currentItem ? groupForPath(currentItem.path) : 'Overview']);
  return <nav aria-label="Portal navigation" className="space-y-2 px-3 pb-5">
    {GROUPS.map(group => {
      const links = items.filter(item => groupForPath(item.path) === group);
      if (!links.length) return null;
      const open = expanded.includes(group);
      const current = links.some(item => isCurrentPath(pathname, item.path));
      const regionId = `${idPrefix}-${uid}-${GROUPS.indexOf(group)}`;
      return <section key={group}>
        <h2>
          <button type="button" aria-expanded={open} aria-controls={regionId}
            onClick={() => setExpanded(previous => open ? previous.filter(item => item !== group) : [...previous, group])}
            className={`flex w-full min-h-10 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD700] ${current ? 'bg-white/10 text-[#FFD700]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
            <span className="flex min-w-0 items-center gap-2">{group === 'Student Life' && <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-[#FFD700]" />}<span>{group}</span></span>
            <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </h2>
        <div id={regionId} hidden={!open} className="mt-1 space-y-0.5 pl-1">
          {links.map((item, index) => {
            const active = isCurrentPath(pathname, item.path);
            const Icon = item.icon;
            return <Link key={`${item.path}-${item.name}-${index}`} href={item.path} onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD700] ${active ? 'border-l-4 border-[#FFD700] bg-[#112240] text-[#FFD700]' : 'text-slate-200 hover:bg-[#112240] hover:text-[#FFD700]'}`}>
              <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 ${item.isFun && !active ? 'text-[#FFD700]' : ''}`} />
              <span className="min-w-0 flex-1 break-words">{item.name}</span>
              {item.isFun && <Sparkles aria-label="Student Life" className="h-3.5 w-3.5 shrink-0 text-[#FFD700]" />}
              {item.isNew && <span className="shrink-0 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] px-2 py-0.5 text-[10px] font-black text-[#0A192F]">NEW</span>}
            </Link>;
          })}
        </div>
      </section>;
    })}
  </nav>;
}
