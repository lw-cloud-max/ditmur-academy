"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  LayoutDashboard, UserPlus, MonitorPlay, Users, UserCircle, 
  GraduationCap, CalendarDays, ClipboardCheck, FileSpreadsheet,
  Settings2, BookOpen, MessageSquare, MessageCircle, CreditCard, HelpCircle,
  Settings, School, FileQuestion, Trophy, Gamepad2, Lightbulb, Library, FileText, Bot, Award, FolderOpen, Video
} from 'lucide-react';

export default function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Default to STAFF if session hasn't loaded yet
  const userRole = session?.user?.role || 'STAFF';

  // 1. ADMIN / STAFF MENU
  const staffMenu = [
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
    { name: 'Student Portfolios', icon: FolderOpen, path: '/portfolio', isNew: true },
    { name: 'Video Meetings', icon: Video, path: '/video-meetings', isNew: true },
    { name: 'Broadsheet', icon: FileSpreadsheet, path: '/broadsheet' },
    { name: 'Assessment Format', icon: Settings2, path: '/assessment-format' },
    { name: 'Internal Exams', icon: FileQuestion, path: '/internal-exams' },
    { name: 'Entrance Exam', icon: MonitorPlay, path: '/entrance-exam' },
    { name: 'CBT Portal', icon: MonitorPlay, path: '/cbt' },
    { name: 'Scheme of Work', icon: Library, path: '/schemes' }, 
    { name: 'Lesson Plan', icon: BookOpen, path: '/lesson-plan' },
    { name: 'Study Hub', icon: Gamepad2, path: '/study-hub', isFun: true },
    { name: 'Hall of Fame', icon: Trophy, path: '/hall-of-fame', isFun: true },
    { name: 'Daily Trivia', icon: Lightbulb, path: '/trivia', isFun: true },
    { name: 'Parent Chat', icon: MessageCircle, path: '/chat' },
    { name: 'Messaging', icon: MessageSquare, path: '/messaging' },
    { name: 'Payments', icon: CreditCard, path: '/payments' },
    { name: 'Configuration', icon: Settings, path: '/configuration' },
    { name: 'Help', icon: HelpCircle, path: '/help' },
  ];

  // 2. STUDENT MENU
  const studentMenu = [
    { name: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'AI Tutor', icon: Bot, path: '/ai-tutor' },
    { name: 'My Portfolio', icon: FolderOpen, path: '/portfolio', isNew: true },
    { name: 'Join Meetings', icon: Video, path: '/video-meetings' },
    { name: 'My Timetable', icon: CalendarDays, path: '/timetable' },
    { name: 'Study Notes', icon: FileText, path: '/lesson-plan' },
    { name: 'Take Exam (CBT)', icon: MonitorPlay, path: '/cbt' },
    { name: 'My Results', icon: GraduationCap, path: '/broadsheet' },
    { name: 'Study Hub', icon: Gamepad2, path: '/study-hub', isFun: true },
    { name: 'Hall of Fame', icon: Trophy, path: '/hall-of-fame', isFun: true },
    { name: 'Daily Trivia', icon: Lightbulb, path: '/trivia', isFun: true },
  ];

  // 3. PARENT MENU
  const parentMenu = [
    { name: 'Parent Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'My Children', icon: Users, path: '/students' },
    { name: 'Teacher Chat', icon: MessageCircle, path: '/chat' },
    { name: 'Join Meetings', icon: Video, path: '/video-meetings', isNew: true },
    { name: 'Child Portfolio', icon: FolderOpen, path: '/portfolio' },
    { name: 'Fee Payments', icon: CreditCard, path: '/payments' },
    { name: 'School Calendar', icon: CalendarDays, path: '/calendar' },
    { name: 'Support', icon: HelpCircle, path: '/help' },
  ];

  // Select the active menu based on the user's role
  const activeMenu = userRole === 'STUDENT' ? studentMenu : userRole === 'PARENT' ? parentMenu : staffMenu;

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
        <nav className="space-y-1 px-3">
          {activeMenu.map((item) => {
            const isActive = pathname === item.path || (pathname?.startsWith(item.path) && item.path !== '/');

            return (
              <div key={item.name}>
                {(item as any).isFun && <div className="h-px bg-[#112240] my-3 mx-2"></div>}
                {(item as any).isFun && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Student Life</p>}
                
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium ${
                    isActive 
                      ? 'bg-[#112240] text-[#FFD700] border-l-4 border-[#FFD700]' 
                      : 'text-slate-300 hover:bg-[#112240] hover:text-[#FFD700]'
                  }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${((item as any).isFun) && !isActive ? 'text-[#FFD700]/70' : ''}`} />
                  <span className="text-sm tracking-wide">{item.name}</span>
                  {(item as any).isNew && (
                    <span className="ml-auto px-2 py-0.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[10px] font-black rounded-full text-[#0A192F]">
                      NEW
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
