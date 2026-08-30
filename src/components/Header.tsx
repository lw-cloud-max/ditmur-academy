import { Bell, Search } from 'lucide-react';
import { auth } from '@/auth';
import MobileMenu from './MobileMenu';
import Sidebar from './Sidebar';
import LogoutButton from './LogoutButton';

export default async function Header() {
  const session = await auth();
  const userName = session?.user?.name || "Guest User";
  const userRole = session?.user?.role || "GUEST";
  
  // Format the initials for the avatar (e.g. "Jane Doe" -> "JD")
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "U";
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 shrink-0 shadow-sm">
      <div className="flex items-center gap-4">
        <MobileMenu>
          <Sidebar isMobile={true} />
        </MobileMenu>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4 ml-2">
          <div className="hidden md:block text-right">
            <p className="text-sm font-bold text-slate-700">{userName}</p>
            <p className="text-xs font-bold text-[#0033A0] uppercase tracking-wider">{userRole}</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 text-[#0033A0] shadow-inner border border-blue-300 flex items-center justify-center rounded-full font-black text-sm">
            {getInitials(userName)}
          </div>
          
          {/* Logout Button */}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
