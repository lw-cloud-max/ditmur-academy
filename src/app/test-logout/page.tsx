"use client";

import { useState } from 'react';
import { LogOut, RefreshCw, Trash2, ExternalLink } from 'lucide-react';

export default function TestLogoutPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testLogout = async () => {
    setIsTesting(true);
    setLogs([]);
    
    addLog('Starting logout test...');
    
    // Test 1: Check current cookies
    addLog(`Current cookies: ${document.cookie || 'none'}`);
    
    // Test 2: Check localStorage
    addLog(`localStorage keys: ${Object.keys(localStorage).join(', ') || 'none'}`);
    
    // Test 3: Try NextAuth signout
    try {
      addLog('Calling /api/auth/signout...');
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      addLog(`Signout response status: ${response.status}`);
      const data = await response.text();
      addLog(`Signout response: ${data.substring(0, 100)}...`);
    } catch (error: any) {
      addLog(`Signout error: ${error.message}`);
    }
    
    // Test 4: Clear storage
    try {
      localStorage.clear();
      sessionStorage.clear();
      addLog('Cleared localStorage and sessionStorage');
    } catch (e: any) {
      addLog(`Storage clear error: ${e.message}`);
    }
    
    // Test 5: Clear cookies
    try {
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      addLog('Cleared cookies');
    } catch (e: any) {
      addLog(`Cookie clear error: ${e.message}`);
    }
    
    addLog('After cleanup:');
    addLog(`Cookies: ${document.cookie || 'none'}`);
    addLog(`localStorage: ${Object.keys(localStorage).join(', ') || 'none'}`);
    
    setIsTesting(false);
  };

  const forceLogout = () => {
    addLog('Forcing redirect to /login...');
    window.location.href = '/login';
  };

  const forceLogoutReplace = () => {
    addLog('Forcing redirect to /login (replace)...');
    window.location.replace('/login');
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Logout Diagnostic Tool</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={testLogout}
          disabled={isTesting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isTesting ? 'animate-spin' : ''}`} />
          Test Logout Process
        </button>
        
        <button
          onClick={forceLogout}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-2"
        >
          <ExternalLink className="w-5 h-5" />
          Force Logout (href)
        </button>
        
        <button
          onClick={forceLogoutReplace}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold flex items-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Force Logout (replace)
        </button>
      </div>
      
      <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-slate-500">Click "Test Logout Process" to see diagnostic logs...</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="mb-1">{log}</div>
          ))
        )}
      </div>
      
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h3 className="font-bold text-amber-900 mb-2">Current Domain:</h3>
        <p className="text-amber-800 font-mono">{typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
      </div>
    </div>
  );
}
