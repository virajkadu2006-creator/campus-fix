import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, User, Bot, AlertTriangle } from 'lucide-react';
import { askAIBuddy } from '../aiService';
import { getAIBuddyChats, saveAIBuddyChats, getCurrentUser } from '../db';
import { useNavigate } from 'react-router-dom';

const SUGGESTIONS = [
  "My fan is not working",
  "Mess food is bad today",
  "How to contact Warden?",
  "Report an emergency"
];

export default function AIBuddyWidget({ isOpen, setIsOpen }) {
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser?.role === 'student') {
      setUser(currentUser);
      const history = getAIBuddyChats(currentUser.studentId);
      if (history.length === 0) {
        setMessages([
          {
            id: 'init',
            role: 'model',
            content: `Hi ${currentUser.name}! I am your CampusFix AI Buddy. How can I help you today?`,
            timestamp: new Date().toISOString()
          }
        ]);
      } else {
        setMessages(history);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (user && messages.length > 1) {
      saveAIBuddyChats(user.studentId, messages);
    }
  }, [messages, user]);

  const handleSend = async (text = inputMsg) => {
    if (!text.trim() || isTyping) return;
    
    setInputMsg("");
    
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsTyping(true);

    try {
      // Map properties for Gemini format
      const chatHistoryForAPI = newHistory.map(m => ({ role: m.role, content: m.content }));
      
      const responseText = await askAIBuddy(chatHistoryForAPI, `(Note: User name is ${user?.name}. Note: If they want to file a complaint, tell them to 'submit a complaint'). User says: ${text}`);
      
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const showSubmitButton = (msgContent) => {
    const lower = msgContent.toLowerCase();
    return lower.includes('submit a complaint') || lower.includes('report an issue') || lower.includes('file a complaint');
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Button if closed */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-110 transition-all flex items-center justify-center text-white z-50 animate-bounce"
        >
          <Sparkles size={28} />
        </button>
      )}

      {/* Chat Panel */}
      <div 
        className={`fixed bottom-6 right-6 w-full max-w-[380px] h-[600px] max-h-[80vh] glass-panel rounded-3xl border border-white/10 z-50 flex flex-col overflow-hidden transition-all duration-500 transform ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="bg-slate-900/60 p-5 font-bold text-white border-b border-white/5 flex justify-between items-center backdrop-blur-xl">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
               <Bot size={18} />
             </div>
             <div>
               <h3 className="text-sm tracking-wide glow-text">CampusFix AI Buddy</h3>
               <p className="text-[10px] text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online</p>
             </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent scroll-smooth">
           {messages.map((msg, idx) => (
             <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full fade-in`}>
               <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500/20 border border-indigo-500/30 text-white rounded-tr-sm shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-white/5 border border-white/10 text-slate-300 rounded-tl-sm'}`}>
                 <p>{msg.content}</p>
                 
                 {/* Auto Action Button feature */}
                 {msg.role === 'model' && showSubmitButton(msg.content) && (
                   <button 
                     onClick={() => navigate('/submit')}
                     className="mt-3 text-xs w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 py-2 rounded-lg font-bold flex text-center justify-center gap-2 transition-colors shimmer-button"
                   >
                     <AlertTriangle size={14} /> Submit this as complaint
                   </button>
                 )}
               </div>
             </div>
           ))}
           
           {isTyping && (
             <div className="flex justify-start w-full slide-in-right">
               <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 w-16 flex justify-center gap-1">
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
               </div>
             </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions (if no messages or just started) */}
        {!isTyping && messages.length <= 2 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto scroolbar-hide snap-x">
             {SUGGESTIONS.map((sug, i) => (
               <button 
                 key={i} 
                 onClick={() => handleSend(sug)}
                 className="whitespace-nowrap shrink-0 snap-start text-xs font-semibold px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-full transition-colors"
               >
                 {sug}
               </button>
             ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-white/5 bg-slate-900/60 backdrop-blur-xl">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input 
              type="text" 
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              placeholder="Ask AI Buddy anything..."
              className="flex-1 glass-input py-3 px-4 text-sm"
              disabled={isTyping}
            />
            <button 
              type="submit"
              disabled={!inputMsg.trim() || isTyping}
              className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 disabled:opacity-50 disabled:grayscale transition-colors border border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
