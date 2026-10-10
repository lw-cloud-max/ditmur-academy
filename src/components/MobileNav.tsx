"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, LayoutDashboard, UserPlus, Users, UserCircle, GraduationCap, School, CalendarDays, ClipboardCheck, MessageSquare, Award, Database, BookOpen, FolderOpen, Video, FileSpreadsheet, Settings2, MonitorPlay, Gamepad2, Trophy, Lightbulb, MessageCircle, CreditCard, Settings, HelpCircle, Bot, Lock } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import GroupedMenu, { type MenuItem } from './GroupedMenu';

export default function MobileNav() {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const isOpen = openPath === pathname;
  const closeMenu = () => setOpenPath(null);
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'STAFF';
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    const trigger = openButton.current;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => closeButton.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return; }
      if (event.key !== 'Tab' || !panel.current) return;
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter(element => !element.closest('[hidden]') && element.getClientRects().length > 0);
      if (!focusable.length) { event.preventDefault(); panel.current.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
      else trigger?.focus();
    };
  }, [isOpen]);
  // Route selections close explicitly. This also covers route changes made
  // elsewhere while the drawer is open.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpenPath(null));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  // Menu items based on role
  const getMenuItems = () => {
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
    } else if (userRole === 'PARENT') {
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
    } else if (userRole === 'ACCOUNTANT') {
      return [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'Payments & Fees', icon: CreditCard, path: '/payments' },
        { name: 'Change Password', icon: Lock, path: '/change-password' },
        { name: 'Help', icon: HelpCircle, path: '/help' }
      ];
    } else {
      // Admin/Staff
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
        { name: 'Question Bank', icon: Database, path: '/question-bank' },
        { name: 'Exam Practice', icon: BookOpen, path: '/exam-practice' },
        { name: 'Internal Exams', icon: BookOpen, path: '/internal-exams-new' },
        { name: 'Student Portfolios', icon: FolderOpen, path: '/portfolio' },
        { name: 'Video Meetings', icon: Video, path: '/video-meetings' },
        { name: 'Broadsheet', icon: FileSpreadsheet, path: '/broadsheet' },
        { name: 'Assessment Format', icon: Settings2, path: '/assessment-format' },
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
    }
  };

  const canSeeFinance = (userRole === 'ADMIN' && session?.user?.id === 'admin-1') || userRole === 'ACCOUNTANT' || (userRole === 'STAFF' && session?.user?.staffRole === 'ACCOUNTANT_TEACHER');
  const menuItems = getMenuItems().filter(item => item.path !== '/payments' || canSeeFinance || userRole === 'PARENT')
    .filter(item => !['/configuration', '/assessment-format'].includes(item.path) || (userRole === 'ADMIN' && session?.user?.id === 'admin-1'))
    .filter(item => item.path !== '/sms-notifications' || (userRole === 'ADMIN' && session?.user?.id === 'admin-1'));

  const portalTarget = typeof document !== 'undefined' ? document.getElementById('mobile-menu-portal') || document.body : null;
  return <>
    <button ref={openButton} type="button" onClick={() => setOpenPath(pathname)}
      aria-label="Open portal navigation" aria-expanded={isOpen} aria-controls="portal-navigation-dialog"
      className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0033A0]">
      <Menu aria-hidden="true" className="h-6 w-6" />
    </button>
    {portalTarget && isOpen && createPortal(
      <div className="fixed inset-0 z-[99999] md:hidden">
        <button type="button" aria-label="Close portal navigation" tabIndex={-1}
          onClick={closeMenu} className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm" />
        <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="portal-navigation-title"
          id="portal-navigation-dialog" tabIndex={-1}
          className="absolute inset-y-0 left-0 flex h-[100dvh] max-h-screen w-80 max-w-[85vw] min-w-0 flex-col bg-gradient-to-b from-[#0A192F] to-[#001744] text-white shadow-2xl">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#112240] p-4">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/logo.jpg" alt="" className="h-10 w-10 shrink-0 object-contain mix-blend-screen" />
              <h2 id="portal-navigation-title" className="text-sm font-black uppercase leading-tight">Ditmur <span className="text-[#FFD700]">Academy</span><span className="block text-[10px] text-slate-200">Portal navigation</span></h2>
            </div>
            <button ref={closeButton} type="button" aria-label="Close portal navigation" onClick={closeMenu}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD700]">
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 custom-scrollbar">
            <GroupedMenu key={pathname} idPrefix="mobile-menu" items={menuItems as MenuItem[]} pathname={pathname} onNavigate={closeMenu} />
          </div>
        </div>
      </div>, portalTarget)}
  </>;
}
