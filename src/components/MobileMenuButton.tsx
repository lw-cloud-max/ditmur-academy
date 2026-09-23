"use client";

import { Menu } from 'lucide-react';

export default function MobileMenuButton() {
  const openMenu = () => {
    window.dispatchEvent(new CustomEvent('open-mobile-menu'));
  };

  return (
    <button 
      onClick={openMenu}
      className="md:hidden text-slate-500 hover:text-slate-700 p-2"
    >
      <Menu className="w-6 h-6" />
    </button>
  );
}
