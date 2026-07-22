"use client";

import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function MobileMenu({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden text-slate-500 hover:text-slate-700 p-2"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative flex w-64 flex-col bg-[#0A192F] shadow-xl animation-fade-in-right h-full">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-5 text-white/50 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="h-full overflow-y-auto" onClick={() => setIsOpen(false)}>
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
