"use client";

import { LogOut } from 'lucide-react';
import { useState } from 'react';

export default function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      // Method 1: Try NextAuth signout
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
    } catch (error) {
      console.log('Signout API error (continuing anyway):', error);
    }

    // Method 2: Clear all storage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.log('Storage clear error:', e);
    }

    // Method 3: Clear cookies manually
    try {
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    } catch (e) {
      console.log('Cookie clear error:', e);
    }

    // Method 4: Force redirect to login page
    // Use a small delay to ensure cleanup completes
    setTimeout(() => {
      window.location.replace('/login');
    }, 100);
  };

  return (
    <button 
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="ml-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
      title="Sign Out"
    >
      {isLoggingOut ? (
        <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <LogOut className="w-5 h-5" />
      )}
    </button>
  );
}
