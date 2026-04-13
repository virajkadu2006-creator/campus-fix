import React, { useState, useEffect } from 'react';
import { getInboxMessages, markInboxMessageRead } from '../db';
import { Inbox, CheckCircle2, ChevronRight, Mail, MailOpen, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const DEPARTMENTS = [
  "Housekeeping & Sanitation",
  "Dean of Students / Warden",
  "Mess Committee",
  "Academic Affairs Office",
  "Estate & Maintenance",
  "General Administration"
];

export default function DepartmentInboxView() {
  const [selectedDept, setSelectedDept] = useState(DEPARTMENTS[0]);
  const [messages, setMessages] = useState([]);
  const [activeMessage, setActiveMessage] = useState(null);

  const loadMessages = () => {
    const all = getInboxMessages();
    setMessages(all.filter(m => m.department === selectedDept));
  };

  useEffect(() => {
    loadMessages();
    setActiveMessage(null);
  }, [selectedDept]);

  const handleRead = (msg) => {
    if (!msg.read) {
      markInboxMessageRead(msg.id);
      loadMessages();
    }
    setActiveMessage(msg);
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 fade-in h-[calc(100vh-8rem)] flex flex-col relative">
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none z-[-1]"></div>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4 drop-shadow-md pb-1">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <Inbox size={24} />
            </div>
            Department <span className="glow-text">Inbox</span>
          </h1>
          <p className="text-slate-400 mt-3 font-medium text-lg ml-[4.5rem]">AI-Generated formal notifications from CampusFix.</p>
        </div>
        
        <div className="relative group">
          <select 
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="w-full md:w-80 appearance-none pl-5 pr-12 py-4 glass-input font-bold tracking-wide text-white cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-200"
          >
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500 rotate-90 pointer-events-none" size={20} />
        </div>
      </div>

      <div className="glass-panel rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-1 overflow-hidden bg-white/5 backdrop-blur-xl relative z-10">
        {/* Inbox List */}
        <div className="w-full md:w-1/3 border-r border-white/10 flex flex-col h-full bg-black/20">
          <div className="p-6 border-b border-white/10 font-bold text-slate-300 text-sm flex items-center justify-between tracking-widest uppercase bg-transparent">
            <span>Inbox ({messages.length})</span>
            <span className="text-xs text-cyan-400 font-bold font-mono bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.1)]">{messages.filter(m=>!m.read).length} Unread</span>
          </div>
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {messages.map(msg => (
              <button 
                key={msg.id}
                onClick={() => handleRead(msg)}
                className={`w-full text-left p-6 border-b border-white/5 hover:bg-white/5 transition-all ${activeMessage?.id === msg.id ? 'bg-white/5 border-l-4 border-l-cyan-400 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]' : 'border-l-4 border-l-transparent'} ${!msg.read ? 'bg-indigo-500/10 border-l-indigo-400' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    {!msg.read && <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>}
                    <span className={`text-sm tracking-wide ${!msg.read ? 'font-black text-white' : 'font-semibold text-slate-400'}`}>System Notification</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{format(new Date(msg.timestamp), 'MMM d')}</span>
                </div>
                <div className={`text-sm mb-3 ${!msg.read ? 'font-bold text-indigo-300' : 'text-slate-500'}`}>New ID: <span className="font-mono">{msg.trackingId}</span></div>
                <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed font-medium">{msg.message}</p>
              </button>
            ))}
            {messages.length === 0 && (
              <div className="p-12 text-center text-slate-500 text-base font-medium flex flex-col items-center gap-4">
                <MailOpen size={48} className="text-slate-600 mb-2 drop-shadow-md" />
                No notification messages found.
              </div>
            )}
          </div>
        </div>

        {/* Message Detail View */}
        <div className="hidden md:flex flex-col w-2/3 h-full bg-transparent relative">
          {activeMessage ? (
            <div className="h-full flex flex-col fade-in">
              <div className="p-8 border-b border-white/10 bg-black/20">
                <h2 className="text-2xl font-black text-white mb-3 tracking-wide">New CampusFix Assignment: <span className="text-cyan-400 font-mono">{activeMessage.trackingId}</span></h2>
                <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
                  <span className="flex items-center gap-2 font-bold text-indigo-300"><Mail size={16} className="text-indigo-400" /> CampusFix Automated Dispatch</span>
                  <span className="text-slate-600 font-black">•</span>
                  <span className="flex items-center gap-2 tracking-widest uppercase text-xs font-bold text-slate-500"><Calendar size={14} className="text-slate-500" /> {format(new Date(activeMessage.timestamp), 'MMM d, yyyy - h:mm a')}</span>
                </div>
              </div>
              <div className="p-8 overflow-y-auto flex-1 hide-scrollbar">
                <div className="glass-panel p-8 rounded-2xl border border-white/5 bg-white/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-cyan-400"></div>
                  {/* Since the AI generates plain text with line breaks, we need to map over split lines mapped to p tags */}
                  {activeMessage.message.split('\\n').map((paragraph, idx) => (
                    // We split by \n to preserve actual line breaks in strings
                    <p key={idx} className="mb-5 text-base text-slate-300 leading-loose font-medium last:mb-0">
                      {paragraph.trim() === '' ? <br/> : paragraph}
                    </p>
                  ))}
                </div>
                <div className="mt-10 flex justify-end">
                   <button 
                     onClick={() => {
                        alert("Navigation to the full ticket view is handled in the Admin portal.");
                     }}
                     className="px-8 py-3.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)] font-bold tracking-wide rounded-xl transition-all text-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-95"
                   >
                     View Details in Admin Portal
                   </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8">
               <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                 <Mail size={36} className="text-slate-400" />
               </div>
               <p className="font-medium text-lg">Select a message to display the notification details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
