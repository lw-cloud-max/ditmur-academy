"use client";

import { useState, useEffect } from 'react';
import { Menu, X, LayoutDashboard, UserPlus, Users, UserCircle, GraduationCap, School, CalendarDays, ClipboardCheck, MessageSquare, Award, Database, BookOpen, FolderOpen, Video, FileSpreadsheet, Settings2, FileQuestion, MonitorPlay, Library, Gamepad2, Trophy, Lightbulb, MessageCircle, CreditCard, Settings, HelpCircle, Bot } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'STAFF';

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Menu items based on role
  const getMenuItems = () => {
    if (userRole === 'STUDENT') {
      return [
        { name: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'AI Tutor', icon: Bot, path: '/ai-tutor' },
        { name: 'Exam Practice', icon: BookOpen, path: '/exam-practice', isNew: true },
        { name: 'My Portfolio', icon: FolderOpen, path: '/portfolio' },
        { name: 'Join Meetings', icon: Video, path: '/video-meetings' },
        { name: 'My Timetable', icon: CalendarDays, path: '/timetable' },
        { name: 'Study Notes', icon: FileSpreadsheet, path: '/lesson-plan' },
        { name: 'Take Exam (CBT)', icon: MonitorPlay, path: '/cbt' },
        { name: 'My Results', icon: GraduationCap, path: '/broadsheet' },
        { name: 'Study Hub', icon: Gamepad2, path: '/study-hub' },
        { name: 'Hall of Fame', icon: Trophy, path: '/hall-of-fame' },
        { name: 'Daily Trivia', icon: Lightbulb, path: '/trivia' },
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
        { name: 'Support', icon: HelpCircle, path: '/help' },
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
        { name: 'Question Bank', icon: Database, path: '/question-bank', isNew: true },
        { name: 'Exam Practice', icon: BookOpen, path: '/exam-practice' },
        { name: 'Student Portfolios', icon: FolderOpen, path: '/portfolio' },
        { name: 'Video Meetings', icon: Video, path: '/video-meetings' },
        { name: 'Broadsheet', icon: FileSpreadsheet, path: '/broadsheet' },
        { name: 'Assessment Format', icon: Settings2, path: '/assessment-format' },
        { name: 'Internal Exams', icon: FileQuestion, path: '/internal-exams' },
        { name: 'Entrance Exam', icon: MonitorPlay, path: '/entrance-exam' },
        { name: 'CBT Portal', icon: MonitorPlay, path: '/cbt' },
        { name: 'Scheme of Work', icon: Library, path: '/schemes' },
        { name: 'Lesson Plan', icon: BookOpen, path: '/lesson-plan' },
        { name: 'Study Hub', icon: Gamepad2, path: '/study-hub' },
        { name: 'Hall of Fame', icon: Trophy, path: '/hall-of-fame' },
        { name: 'Daily Trivia', icon: Lightbulb, path: '/trivia' },
        { name: 'Parent Chat', icon: MessageCircle, path: '/chat' },
        { name: 'Messaging', icon: MessageSquare, path: '/messaging' },
        { name: 'Payments', icon: CreditCard, path: '/payments' },
        { name: 'Configuration', icon: Settings, path: '/configuration' },
        { name: 'Help', icon: HelpCircle, path: '/help' },
      ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Hamburger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden text-slate-500 hover:text-slate-700 p-2"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Menu Overlay - Rendered at root level */}
      {isOpen && (
        <>
          {/* Backdrop - Highest z-index */}
          <div 
            className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', zIndex: 99998 }}
          />
          
          {/* Menu Panel - Above everything */}
          <div 
            className="md:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-gradient-to-b from-[#0A192F] to-[#001744] shadow-2xl"
            style={{ position: 'fixed', zIndex: 99999 }}
          >
            {/* Header */}
            <div className="p-5 flex items-center justify-between border-b border-[#112240]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center">
                  <img src="/logo.jpg" alt="Ditmur Academy" className="w-full h-full object-contain mix-blend-screen" />
                </div>
                <div>
                  <h1 className="text-sm font-black tracking-tight text-white uppercase leading-tight">Ditmur</h1>
                  <p className="text-[10px] text-[#FFD700] font-bold">Academy</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/50 hover:text-white p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-4 px-3" style={{ height: 'calc(100vh - 80px)' }}>
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.path || (pathname?.startsWith(item.path) && item.path !== '/');
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors font-medium ${
                        isActive 
                          ? 'bg-[#112240] text-[#FFD700] border-l-4 border-[#FFD700]' 
                          : 'text-slate-300 hover:bg-[#112240] hover:text-[#FFD700]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#FFD700]' : ''}`} />
                      <span className="text-sm tracking-wide">{item.name}</span>
                      {(item as any).isNew && (
                        <span className="ml-auto px-2 py-0.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[10px] font-black rounded-full text-[#0A192F]">
                          NEW
                        </span>
                      )}
                    </Link>
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
