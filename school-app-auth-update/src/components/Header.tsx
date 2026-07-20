import { Bell, Search, User, Menu, LogOut } from 'lucide-react';
import { signOut } from '../../../src/auth'; // Server action to log out

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-slate-500 hover:text-slate-700">
          <Menu className="w-6 h-6" />
        </button>
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search students, staff, classes..." 
            className="pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none w-64 transition-all"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4 ml-2">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-slate-700">Jane Doe</p>
            <p className="text-xs text-slate-500">Administrator</p>
          </div>
          <div className="w-9 h-9 bg-blue-100 text-blue-700 flex items-center justify-center rounded-full font-bold">
            JD
          </div>
          
          {/* Logout Button */}
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: '/login' });
          }}>
            <button 
              type="submit" 
              className="ml-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
