"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  UserPlus, 
  MonitorPlay, 
  Users, 
  UserCircle, 
  GraduationCap, 
  Library, 
  CalendarDays, 
  ClipboardCheck, 
  FileSpreadsheet, 
  Settings2, 
  BookOpen, 
  MessageSquare, 
  CreditCard, 
  HelpCircle, 
  Settings,
  School
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Admissions', icon: UserPlus, path: '/admissions' },
  { name: 'Entrance Exam (CBT)', icon: MonitorPlay, path: '/entrance-exam' },
  { name: 'Students', icon: Users, path: '/students' },
  { name: 'Parents', icon: UserCircle, path: '/parents' },
  { name: 'Staff', icon: GraduationCap, path: '/staff' },
  { name: 'Classes', icon: School, path: '/classes' },
  { name: 'Timetable', icon: CalendarDays, path: '/timetable' },      // Added
  { name: 'Attendance', icon: ClipboardCheck, path: '/attendance' },  // Added
  { name: 'Broadsheet', icon: FileSpreadsheet, path: '/broadsheet' },
  { name: 'Assessment Format', icon: Settings2, path: '/assessment-format' },
  { name: 'CBT', icon: MonitorPlay, path: '/cbt' },
  { name: 'Lesson Plan', icon: BookOpen, path: '/lesson-plan' },
  { name: 'Messaging', icon: MessageSquare, path: '/messaging' },
  { name: 'Payments', icon: CreditCard, path: '/payments' },
  { name: 'Configuration', icon: Settings, path: '/configuration' },
  { name: 'Help', icon: HelpCircle, path: '/help' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col hidden md:flex">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg">
          <School className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">EduManage</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <nav className="space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || (pathname?.startsWith(item.path) && item.path !== '/');
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
