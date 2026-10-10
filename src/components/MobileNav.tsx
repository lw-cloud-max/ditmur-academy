"use client";

import { useEffect, useId, useRef, useState } from 'react';
import {
  Menu, X, LayoutDashboard, UserPlus, Users, UserCircle, GraduationCap, School,
  CalendarDays, ClipboardCheck, MessageSquare, Award, Database, BookOpen, FolderOpen,
  Video, FileSpreadsheet, Settings2, FileQuestion, MonitorPlay, Gamepad2, Trophy,
  Lightbulb, MessageCircle, CreditCard, Settings, HelpCircle, Bot, Lock, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  groupNavigationItems,
  isActiveNavigationItem,
  navigationGroupId,
  type PortalNavigationItem,
} from '@/lib/navigation-groups';

export default function MobileNav() {
  const [openPath, setOpenPath] = useState<string | null>(null);
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'STAFF';
  const isOpen = openPath !== null && openPath === (pathname ?? '');
  const menuId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const getMenuItems = (): PortalNavigationItem[] => {
    if (userRole === 'STUDENT') {
      return [
        { name: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'AI Tutor', icon: Bot, path: '/ai-tutor' },
        { name: 'My Exams', icon: BookOpen, path: '/my-exams' },
        { name: 'Exam Practice', icon: BookOpen, path: '/exam-practice', isNew: true },
        { name: 'My Portfolio', icon: FolderOpen, path: '/portfolio' },
        { name: 'Join Meetings', icon: Video, path: '/video-meetings' },
        { name: 'My Timetable', icon: CalendarDays, path: '/timetable' },
        { name: 'Take Exam (CBT)', icon: MonitorPlay, path: '/cbt' },
        { name: 'My Results', icon: GraduationCap, path: '/broadsheet' },
        { name: 'Study Hub', icon: Gamepad2, path: '/study-hub' },
        { name: 'Hall of Fame', icon: Trophy, path: '/hall-of-fame' },
        { name: 'Daily Trivia', icon: Lightbulb, path: '/trivia' },
        { name: 'Change Password', icon: Lock, path: '/change-password' },
      ];
    }

    if (userRole === 'PARENT') {
      return [
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
    }

    return [
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
      { name: 'Question Bank', icon: Database, path: '/question-bank', isNew: true },
      { name: 'Exam Practice', icon: BookOpen, path: '/exam-practice' },
      { name: 'Internal Exams', icon: BookOpen, path: '/internal-exams-new' },
      { name: 'Student Portfolios', icon: FolderOpen, path: '/portfolio' },
      { name: 'Video Meetings', icon: Video, path: '/video-meetings' },
      { name: 'Broadsheet', icon: FileSpreadsheet, path: '/broadsheet' },
      { name: 'Assessment Format', icon: Settings2, path: '/assessment-format' },
      { name: 'Internal Exams (Legacy)', icon: FileQuestion, path: '/internal-exams' },
      { name: 'Entrance Exam', icon: MonitorPlay, path: '/entrance-exam' },
      { name: 'CBT Portal', icon: MonitorPlay, path: '/cbt' },
      { name: 'Study Hub', icon: Gamepad2, path: '/study-hub' },
      { name: 'Lesson Notes', icon: BookOpen, path: '/lesson-notes' },
      { name: 'Hall of Fame', icon: Trophy, path: '/hall-of-fame' },
      { name: 'Daily Trivia', icon: Lightbulb, path: '/trivia' },
      { name: 'Parent Chat', icon: MessageCircle, path: '/chat' },
      { name: 'Messaging', icon: MessageSquare, path: '/messaging' },
      { name: 'Payments', icon: CreditCard, path: '/payments' },
      { name: 'Configuration', icon: Settings, path: '/configuration' },
      { name: 'Change Password', icon: Lock, path: '/change-password' },
      { name: 'Help', icon: HelpCircle, path: '/help' },
    ];
  };

  const canSeeFinance = (userRole === 'ADMIN' && session?.user?.id === 'admin-1') || userRole === 'ACCOUNTANT' || (userRole === 'STAFF' && session?.user?.staffRole === 'ACCOUNTANT_TEACHER');
  const menuItems = getMenuItems()
    .filter(item => item.path !== '/payments' || canSeeFinance || userRole === 'PARENT')
    .filter(item => !['/configuration', '/assessment-format'].includes(item.path) || (userRole === 'ADMIN' && session?.user?.id === 'admin-1'))
    .filter(item => item.path !== '/sms-notifications' || (userRole === 'ADMIN' && session?.user?.id === 'admin-1'));
  const groups = groupNavigationItems(menuItems);
  const activeGroup = groups.find(group => group.items.some(item => isActiveNavigationItem(pathname, item.path)))?.name ?? 'Overview';
  const navigationContext = `${userRole}:${session?.user?.id ?? ''}:${pathname ?? ''}`;
  const [manualExpansion, setManualExpansion] = useState<{ context: string; group: string | null } | null>(null);
  const expandedGroup = manualExpansion?.context === navigationContext
    ? manualExpansion.group
    : activeGroup === 'Overview' ? null : activeGroup;

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpenPath(null);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])
        .filter(element => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenPath(pathname ?? '')}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        className="md:hidden rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-[#0033A0]"
      >
        <Menu aria-hidden="true" className="h-6 w-6" />
      </button>

      {isOpen && (
        <div className="md:hidden fixed inset-0" style={{ zIndex: 99999 }}>
          <button
            type="button"
            onClick={() => setOpenPath(null)}
            aria-label="Close navigation menu"
            className="fixed inset-0 cursor-default bg-slate-900/60 backdrop-blur-sm"
            style={{ zIndex: 99998 }}
          />

          <div
            id={menuId}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${menuId}-title`}
            className="fixed inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-gradient-to-b from-[#0A192F] to-[#001744] text-white shadow-2xl"
            style={{ zIndex: 99999 }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#112240] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center">
                  <img src="/logo.jpg" alt="" className="h-full w-full object-contain mix-blend-screen" />
                </div>
                <div>
                  <h2 id={`${menuId}-title`} className="text-sm font-black uppercase leading-tight tracking-tight">Ditmur</h2>
                  <p className="text-[10px] font-bold text-[#FFD700]">Academy</p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpenPath(null)}
                aria-label="Close navigation menu"
                className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#FFD700]"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="h-[calc(100dvh-80px)] flex-1 overflow-y-auto py-4 pl-3 pr-2">
              <nav aria-label="Portal navigation" className="space-y-2">
                {groups.map(group => {
                  const isOverview = group.name === 'Overview';
                  const isExpanded = isOverview || expandedGroup === group.name;
                  const groupId = navigationGroupId('mobile-nav', group.name);

                  return (
                    <section key={group.name}>
                      {!isOverview && (
                        <button
                          type="button"
                          onClick={() => setManualExpansion({ context: navigationContext, group: isExpanded ? null : group.name })}
                          aria-expanded={isExpanded}
                          aria-controls={groupId}
                          className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-[#FFD700]"
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
                              onClick={() => setOpenPath(null)}
                              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#FFD700] focus-visible:outline-offset-1 ${
                                isActive
                                  ? 'border-l-4 border-[#FFD700] bg-[#112240] text-[#FFD700]'
                                  : 'text-slate-300 hover:bg-[#112240] hover:text-[#FFD700]'
                              }`}
                            >
                              <Icon aria-hidden="true" className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-[#FFD700]' : ''}`} />
                              <span className="text-sm tracking-wide">{item.name}</span>
                              {item.isNew && (
                                <span className="ml-auto rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] px-2 py-0.5 text-[10px] font-black text-[#0A192F]">NEW</span>
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
          </div>
        </div>
      )}
    </>
  );
}
