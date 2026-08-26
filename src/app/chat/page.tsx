"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { MessageCircle, Send, Loader2, Search, Plus, ArrowLeft, User, GraduationCap, Check, CheckCheck } from 'lucide-react';

interface Conversation {
  id: string;
  lastMessage: string | null;
  updatedAt: string;
  parent?: { id: string; fullName: string; email: string; phone: string };
  teacher?: { id: string; firstName: string; lastName: string; role: string };
  student?: { id: string; firstName: string; lastName: string } | null;
  messages: { content: string; createdAt: string }[];
  _count: { messages: number };
}

interface Message {
  id: string;
  senderId: string;
  senderType: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export default function ChatPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'STAFF';
  const userId = session?.user?.id || '';
  const isParent = userRole === 'PARENT';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/chat');
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/chat/${conversationId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    try {
      const res = await fetch(`/api/chat/${selectedConversation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() })
      });

      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        setNewMessage('');
        fetchConversations(); // Refresh conversation list
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const getOtherParty = (conversation: Conversation) => {
    if (isParent) {
      return conversation.teacher 
        ? `${conversation.teacher.firstName} ${conversation.teacher.lastName}`
        : 'Teacher';
    }
    return conversation.parent?.fullName || 'Parent';
  };

  const getStudentName = (conversation: Conversation) => {
    return conversation.student 
      ? `${conversation.student.firstName} ${conversation.student.lastName}`
      : null;
  };

  const filteredConversations = conversations.filter(conv => {
    const otherParty = getOtherParty(conv).toLowerCase();
    const studentName = getStudentName(conv)?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return otherParty.includes(query) || studentName.includes(query);
  });

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-200px)] flex animation-fade-in">
      
      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 bg-white rounded-l-2xl border border-slate-200 shadow-sm overflow-hidden`}>
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#0033A0]" />
            {isParent ? 'Teacher Chats' : 'Parent Messages'}
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0033A0]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm mt-1">
                {isParent ? 'Start a chat with your child\'s teacher' : 'Parents will appear here when they message you'}
              </p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                  selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-l-[#0033A0]' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#0033A0] text-white rounded-full flex items-center justify-center shrink-0">
                    {isParent ? <GraduationCap className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{getOtherParty(conv)}</h3>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(conv.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {getStudentName(conv) && (
                      <p className="text-xs text-[#0033A0] font-medium mb-1">
                        Re: {getStudentName(conv)}
                      </p>
                    )}
                    <p className="text-sm text-slate-500 truncate">{conv.lastMessage || 'No messages yet'}</p>
                  </div>
                  {conv._count.messages > 0 && (
                    <span className="w-5 h-5 bg-[#0033A0] text-white rounded-full text-[10px] font-bold flex items-center justify-center shrink-0">
                      {conv._count.messages}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-white rounded-r-2xl border-t border-r border-b border-slate-200 shadow-sm overflow-hidden`}>
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageCircle className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="font-bold text-slate-700 text-lg">Select a conversation</h3>
            <p className="text-slate-500 text-sm mt-1">Choose a chat from the left to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="w-10 h-10 bg-[#0033A0] text-white rounded-full flex items-center justify-center">
                {isParent ? <GraduationCap className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{getOtherParty(selectedConversation)}</h3>
                {getStudentName(selectedConversation) && (
                  <p className="text-xs text-[#0033A0]">Student: {getStudentName(selectedConversation)}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30">
              {messages.map(msg => {
                const isOwnMessage = msg.senderType === (isParent ? 'PARENT' : 'TEACHER');
                return (
                  <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      isOwnMessage
                        ? 'bg-[#0033A0] text-white rounded-tr-md'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-md shadow-sm'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${
                        isOwnMessage ? 'text-blue-200' : 'text-slate-400'
                      }`}>
                        <span className="text-[10px]">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOwnMessage && (
                          msg.isRead ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0033A0] outline-none text-sm"
                  disabled={sendingMessage}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="px-6 py-3 bg-[#0033A0] hover:bg-[#002277] text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
