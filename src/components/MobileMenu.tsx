"use client";

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function MobileMenu({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden text-slate-500 hover:text-slate-700 p-2"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[100]">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Menu Panel */}
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-[#0A192F] shadow-xl transform transition-transform duration-300 ease-in-out">
            {/* Close Button */}
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-5 text-white/50 hover:text-white z-10 p-2"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Menu Content */}
            <div className="h-full overflow-y-auto pt-16 pb-4">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
