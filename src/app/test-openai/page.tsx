"use client";

import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, RefreshCw, Sparkles } from 'lucide-react';

export default function TestOpenAIPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  const checkConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-openai');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: 'Failed to check configuration' });
    } finally {
      setLoading(false);
    }
  };

  const testAI = async () => {
    setTesting(true);
    setAiResponse('');
    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Say hello and introduce yourself briefly.' })
      });
      const data = await res.json();
      if (data.success) {
        setAiResponse(data.response);
      } else {
        setAiResponse(`Error: ${data.error}`);
      }
    } catch (err) {
      setAiResponse('Connection error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-[#0A192F] rounded-2xl p-8 text-white">
        <h1 className="text-2xl font-black mb-2">OpenAI API Test</h1>
        <p className="text-blue-200 text-sm">Verify your OpenAI API key is working</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={checkConfig}
          disabled={loading}
          className="px-6 py-3 bg-[#0033A0] text-white rounded-xl font-bold hover:bg-[#002277] transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          Check API Key
        </button>
        
        {result?.success && (
          <button
            onClick={testAI}
            disabled={testing}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Test AI Chat
          </button>
        )}
      </div>

      {result && (
        <div className={`rounded-xl p-6 border-2 ${result.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            {result.success ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            ) : (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
            <div>
              <h2 className={`text-xl font-black ${result.success ? 'text-emerald-900' : 'text-red-900'}`}>
                {result.success ? 'API Key Valid!' : 'API Key Issue'}
              </h2>
              <p className={`text-sm ${result.success ? 'text-emerald-700' : 'text-red-700'}`}>
                {result.message || result.error}
              </p>
            </div>
          </div>
          {result.keyPrefix && (
            <p className="text-xs text-slate-500 mt-2">Key: {result.keyPrefix}</p>
          )}
        </div>
      )}

      {aiResponse && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-3">AI Response:</h3>
          <p className="text-slate-700 bg-slate-50 p-4 rounded-lg whitespace-pre-wrap">{aiResponse}</p>
        </div>
      )}

      {!result && !loading && (
        <div className="text-center p-8 text-slate-500">
          Click "Check API Key" to verify your OpenAI configuration
        </div>
      )}
    </div>
  );
}
