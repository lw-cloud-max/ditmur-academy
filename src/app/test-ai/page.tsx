"use client";

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export default function TestAIPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/test-ai');
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      setError('Failed to fetch configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-[#0A192F] rounded-2xl p-8 text-white">
        <h1 className="text-2xl font-black mb-2">AI Configuration Test</h1>
        <p className="text-blue-200 text-sm">Check if your AgentRouter API key is configured correctly</p>
      </div>

      <button
        onClick={fetchConfig}
        disabled={loading}
        className="px-6 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
        Refresh Configuration
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 font-medium">
          {error}
        </div>
      )}

      {config && (
        <div className="space-y-4">
          <div className={`rounded-xl p-6 border-2 ${config.isConfigured ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              {config.isConfigured ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600" />
              )}
              <div>
                <h2 className={`text-xl font-black ${config.isConfigured ? 'text-emerald-900' : 'text-red-900'}`}>
                  {config.isConfigured ? 'AI is Configured!' : 'AI Not Configured'}
                </h2>
                <p className={`text-sm ${config.isConfigured ? 'text-emerald-700' : 'text-red-700'}`}>
                  {config.instructions}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-900">Environment Variables</h3>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="p-4 flex justify-between items-center">
                <span className="font-medium text-slate-700">AGENTROUTER_API_KEY</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${config.config.hasAgentRouterKey ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {config.config.hasAgentRouterKey ? `✅ Set (${config.config.agentRouterKeyLength} chars)` : '❌ Not Set'}
                </span>
              </div>
              <div className="p-4 flex justify-between items-center">
                <span className="font-medium text-slate-700">OPENAI_API_KEY</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${config.config.hasOpenAIKey ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {config.config.hasOpenAIKey ? '✅ Set' : '⚪ Not Set (optional)'}
                </span>
              </div>
              <div className="p-4 flex justify-between items-center">
                <span className="font-medium text-slate-700">AGENTROUTER_BASE_URL</span>
                <span className="text-sm text-slate-600 font-mono bg-slate-50 px-3 py-1 rounded">
                  {config.config.baseURL}
                </span>
              </div>
              <div className="p-4 flex justify-between items-center">
                <span className="font-medium text-slate-700">AI_MODEL</span>
                <span className="text-sm text-slate-600 font-mono bg-slate-50 px-3 py-1 rounded">
                  {config.config.aiModel}
                </span>
              </div>
            </div>
          </div>

          {!config.isConfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="font-bold text-amber-900 mb-3">How to Fix:</h3>
              <ol className="space-y-2 text-sm text-amber-800">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  Go to <a href="https://vercel.com/dashboard" target="_blank" className="text-blue-600 underline">Vercel Dashboard</a>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  Select your project → Settings → Environment Variables
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  Add: <code className="bg-amber-100 px-2 py-0.5 rounded font-mono">AGENTROUTER_API_KEY</code> = your-api-key
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">4.</span>
                  Add: <code className="bg-amber-100 px-2 py-0.5 rounded font-mono">AGENTROUTER_BASE_URL</code> = https://api.agentrouter.org/v1
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">5.</span>
                  Redeploy your app
                </li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
