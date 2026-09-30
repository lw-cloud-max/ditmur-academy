"use client";

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      // NextAuth removes the cookie and refreshes its session provider.
      // Navigate within this origin; do not force an additional full reload.
      await signOut({ redirect: false, redirectTo: '/login' });
      // Never clear ALL localStorage: an in-progress student's exam answers
      // may be saved there for recovery after a temporary connection failure.
      router.replace('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
      alert('Could not sign out. Check your connection and try again.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      aria-label={isLoggingOut ? 'Signing out' : 'Sign out'}
      className="ml-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-70"
      title="Sign Out"
    >
      {isLoggingOut ? (
        <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : <LogOut className="w-5 h-5" />}
    </button>
  );
}
