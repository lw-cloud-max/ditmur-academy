"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard, UserPlus, MonitorPlay, Users, UserCircle,
  GraduationCap, CalendarDays, ClipboardCheck, FileSpreadsheet,
  Settings2, BookOpen, MessageSquare, MessageCircle, CreditCard, HelpCircle,
  Settings, School, Trophy, Gamepad2, Lightbulb, Bot, Award, FolderOpen, Video, Database, Lock,
  ChevronDown,
} from 'lucide-react';
import {
  groupNavigationItems,
  isActiveNavigationItem,
  navigationGroupId,
  type PortalNavigationItem,
} from '@/lib/navigation-groups';

const staffMenu: PortalNavigationItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Admissions', icon: UserPlus, path: '/admissions' },
  { name: 'Students', icon: Users, path: '/students' },
  { name: 'Parents', icon: UserCircle, path: '/parents' },
  { name: 'Staff', icon: GraduationCap, path: '/staff' },
  { name: 'Classes', icon: School, path: '/classes' },
  { name: 'Timetable', icon: CalendarDays, path: '/timetable' },
  { name: 'School Calendar', icon: CalendarDays, path: '/calendar' },
  { name: 'Attendance', icon: ClipboardCheck, path: '/school-attendance' },
  { name: 'SMS Notifications', icon: MessageSquare, path: '/sms-notifications' },
  { name: 'Behavior System', icon: Award, path: '/behavior' },
  { name: 'Question Bank', icon: Database, path: '/question-bank' },
  { name: 'Exam Practice', icon: BookOpen, path: '/exam-practice' },
  { name: 'Internal Exams', icon: BookOpen, path: '/internal-exams-new', isNew: true },
  { name: 'Student Portfolios', icon: FolderOpen, path: '/portfolio' },
  { name: 'Video Meetings', icon: Video, path: '/video-meetings' },
  { name: 'Broadsheet', icon: FileSpreadsheet, path: '/broadsheet' },
  { name: 'Assessment Format', icon: Settings2, path: '/assessment-format' },
  { name: 'Entrance Exam', icon: MonitorPlay, path: '/entrance-exam' },
  { name: 'CBT Portal', icon: MonitorPlay, path: '/cbt' },
  { name: 'Study Hub', icon: Gamepad2, path: '/study-hub', isFun: true },
  { name: 'Lesson Notes', icon: BookOpen, path: '/lesson-notes' },
  { name: 'Hall of Fame', icon: Trophy, path: '/hall-of-fame', isFun: true },
  { name: 'Daily Trivia', icon: Lightbulb, path: '/trivia', isFun: true },
  { name: 'Parent Chat', icon: MessageCircle, path: '/chat' },
  { name: 'Messaging', icon: MessageSquare, path: '/messaging' },
  { name: 'Payments', icon: CreditCard, path: '/payments' },
  { name: 'Configuration', icon: Settings, path: '/configuration' },
  { name: 'Change Password', icon: Lock, path: '/change-password' },
  { name: 'Help', icon: HelpCircle, path: '/help' },
];

const studentMenu: PortalNavigationItem[] = [
  { name: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'AI Tutor', icon: Bot, path: '/ai-tutor' },
  { name: 'My Exams', icon: BookOpen, path: '/my-exams', isNew: true },
  { name: 'Exam Practice', icon: BookOpen, path: '/exam-practice' },
  { name: 'My Portfolio', icon: FolderOpen, path: '/portfolio' },
  { name: 'Join Meetings', icon: Video, path: '/video-meetings' },
  { name: 'My Timetable', icon: CalendarDays, path: '/timetable' },
  { name: 'My Results', icon: GraduationCap, path: '/broadsheet' },
  { name: 'Study Hub', icon: Gamepad2, path: '/study-hub', isFun: true },
  { name: 'Hall of Fame', icon: Trophy, path: '/hall-of-fame', isFun: true },
  { name: 'Daily Trivia', icon: Lightbulb, path: '/trivia', isFun: true },
  { name: 'Change Password', icon: Lock, path: '/change-password' },
];

const parentMenu: PortalNavigationItem[] = [
  { name: 'Parent Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'My Children', icon: Users, path: '/students' },
  { name: 'Teacher Chat', icon: MessageCircle, path: '/chat' },
  { name: 'Join Meetings', icon: Video, path: '/video-meetings', isNew: true },
  { name: 'Child Portfolio', icon: FolderOpen, path: '/portfolio' },
  { name: 'Fee Payments', icon: CreditCard, path: '/payments' },
  { name: 'School Calendar', icon: CalendarDays, path: '/calendar' },
  { name: 'Change Password', icon: Lock, path: '/change-password' },
  { name: 'Support', icon: HelpCircle, path: '/help' },
];

const accountantMenu: PortalNavigationItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Payments & Fees', icon: CreditCard, path: '/payments' },
  { name: 'Change Password', icon: Lock, path: '/change-password' },
  { name: 'Help', icon: HelpCircle, path: '/help' },
];

export default function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'STAFF';
  const canSeeFinance = (userRole === 'ADMIN' && session?.user?.id === 'admin-1') || userRole === 'ACCOUNTANT' || (userRole === 'STAFF' && session?.user?.staffRole === 'ACCOUNTANT_TEACHER');

  const activeMenu = (userRole === 'STUDENT' ? studentMenu : userRole === 'PARENT' ? parentMenu : userRole === 'ACCOUNTANT' ? accountantMenu : staffMenu)
    .filter(item => item.path !== '/payments' || canSeeFinance || userRole === 'PARENT')
    .filter(item => !['/configuration', '/assessment-format'].includes(item.path) || (userRole === 'ADMIN' && session?.user?.id === 'admin-1'))
    .filter(item => item.path !== '/sms-notifications' || (userRole === 'ADMIN' && session?.user?.id === 'admin-1'));

  const groups = groupNavigationItems(activeMenu);
  const activeGroup = groups.find(group => group.items.some(item => isActiveNavigationItem(pathname, item.path)))?.name ?? 'Overview';
  const navigationContext = `${userRole}:${session?.user?.id ?? ''}:${pathname ?? ''}`;
  const [manualExpansion, setManualExpansion] = useState<{ context: string; group: string | null } | null>(null);
  const expandedGroup = manualExpansion?.context === navigationContext
    ? manualExpansion.group
    : activeGroup === 'Overview' ? null : activeGroup;

  return (
    <aside className={`w-64 bg-gradient-to-b from-[#0A192F] to-[#001744] text-white min-h-screen flex flex-col border-r border-[#0033A0]/50 shadow-xl ${isMobile ? '' : 'hidden md:flex'}`}>
      <div className="p-5 flex items-center gap-3 border-b border-[#112240] shrink-0 bg-[#0A192F]">
        <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
          <img src="/logo.jpg" alt="Ditmur Academy" className="w-full h-full object-contain mix-blend-screen" />
        </div>
        <div>
          <h1 className="text-base font-black tracking-tight text-white uppercase leading-tight drop-shadow-md">Ditmur<br/><span className="text-[#FFD700]">Academy</span></h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <nav aria-label="Primary navigation" className="space-y-2 px-3">
          {groups.map(group => {
            const isOverview = group.name === 'Overview';
            const isExpanded = isOverview || expandedGroup === group.name;
            const groupId = navigationGroupId('desktop-nav', group.name);

            return (
              <section key={group.name}>
                {!isOverview && (
                  <button
                    type="button"
                    onClick={() => setManualExpansion({ context: navigationContext, group: isExpanded ? null : group.name })}
                    aria-expanded={isExpanded}
                    aria-controls={groupId}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-[#FFD700]"
                  >
                    <span>{group.name}</span>
                    <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
                <div id={groupId} hidden={!isExpanded} className="space-y-1">
                  {group.items.map(item => {
                    const isActive = isActiveNavigationItem(pathname, item.path);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={`${item.name}-${item.path}`}
                        href={item.path}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#FFD700] focus-visible:outline-offset-1 ${
                          isActive
                            ? 'border-l-4 border-[#FFD700] bg-[#112240] text-[#FFD700]'
                            : 'text-slate-300 hover:bg-[#112240] hover:text-[#FFD700]'
                        }`}
                      >
                        <Icon aria-hidden="true" className={`h-5 w-5 flex-shrink-0 ${item.isFun && !isActive ? 'text-[#FFD700]/70' : ''}`} />
                        <span className="text-sm tracking-wide">{item.name}</span>
                        {item.isNew && (
                          <span className="ml-auto rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] px-2 py-0.5 text-[10px] font-black text-[#0A192F]">
                            NEW
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
