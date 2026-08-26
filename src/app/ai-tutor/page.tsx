"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Send, Bot, User, BookOpen, Sparkles, Loader2, GraduationCap, Lightbulb } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AITutorPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const subjects = [
    'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
    'Economics', 'Government', 'Literature', 'Computer Science', 'General'
  ];

  const suggestedQuestions = [
    "Explain quadratic equations simply",
    "Help me with essay writing structure",
    "What is photosynthesis?",
    "Explain Newton's laws of motion",
  ];

  useEffect(() => {
    // Welcome message
    setMessages([{
      id: '1',
      role: 'assistant',
      content: `Hello ${session?.user?.name || 'there'}! 👋 I'm your AI Tutor from Ditmur Academy.\n\nI'm here to help you with any subject. You can:\n• Ask me to explain concepts\n• Get help with homework\n• Practice with examples\n• Understand difficult topics\n\nWhat would you like to learn today? 📚`,
      timestamp: new Date()
    }]);
  }, [session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: textToSend,
          subject: selectedSubject || 'General',
          studentLevel: 'Secondary School'
        })
      });

      const data = await res.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again or ask a different question.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col animation-fade-in">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0A192F] to-[#0033A0] rounded-t-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700] rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <Bot className="w-8 h-8 text-[#FFD700]" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">AI Tutor</h1>
            <p className="text-blue-200 text-sm font-medium">Your personal learning assistant</p>
          </div>
        </div>
      </div>

      {/* Subject Selector */}
      <div className="bg-white border-x border-slate-200 p-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          <span className="text-sm font-bold text-slate-500 shrink-0 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> Subject:
          </span>
          <button
            onClick={() => setSelectedSubject('')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all shrink-0 ${
              !selectedSubject 
                ? 'bg-[#0033A0] text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Subjects
          </button>
          {subjects.map(subject => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all shrink-0 ${
                selectedSubject === subject 
                  ? 'bg-[#0033A0] text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 border-x border-slate-200 p-6 space-y-6 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                msg.role === 'user' 
                  ? 'bg-[#0033A0] text-white' 
                  : 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-white'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              
              {/* Message Bubble */}
              <div className={`rounded-2xl px-5 py-4 ${
                msg.role === 'user'
                  ? 'bg-[#0033A0] text-white rounded-tr-md'
                  : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-md'
              }`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                <div className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-white flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 1 && (
        <div className="bg-white border-x border-t border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" /> Try asking:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="px-4 py-2 bg-slate-50 hover:bg-[#0033A0] hover:text-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white rounded-b-3xl border border-t-0 border-slate-200 p-4 shadow-lg">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your studies..."
            className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0033A0] focus:border-transparent outline-none text-sm"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="px-6 py-4 bg-[#0033A0] hover:bg-[#002277] text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
