import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Activity, Clock, Shield, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { getCurrentUser, getComplaintsByStudent } from '../db';
import { formatDistanceToNow } from 'date-fns';

const StatusBadge = ({ status }) => {
  if (status === 'Submitted') return <span className="px-3 py-1 text-xs font-bold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]">Submitted</span>;
  if (status === 'In Progress') return <span className="px-3 py-1 text-xs font-bold rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]">In Progress</span>;
  return <span className="px-3 py-1 text-xs font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]">Resolved</span>;
};

export default function StudentDashboard({ toggleAIBuddy }) {
  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'student') {
      navigate('/');
      return;
    }
    setUser(currentUser);
    setComplaints(getComplaintsByStudent(currentUser.studentId));
  }, [navigate]);

  if (!user) return null;

  const filtered = complaints.filter(c => filterStatus === 'All' || c.status === filterStatus);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 fade-in">
      <div className="mb-10">
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md mb-2">
          Welcome, <span className="glow-text">{user.name}</span>
        </h1>
        <p className="text-slate-400 text-lg font-medium">Your CampusFix Control Panel</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        
        {/* Left Column: Profile & Actions */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          
          {/* Profile Card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center shadow-inner">
                <User size={30} className="text-indigo-400 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">{user.name}</h2>
                <div className="text-sm font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded mt-1 inline-block border border-cyan-500/20">{user.studentId}</div>
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-white/5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Official Email</span>
                <span className="text-slate-300 truncate max-w-[150px]" title={user.email}>{user.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Last Login</span>
                <span className="text-slate-300">{formatDistanceToNow(new Date(user.loginTime), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10">
            <h3 className="text-lg font-bold text-white mb-5 tracking-wide flex items-center gap-2">
              <Activity size={18} className="text-indigo-400" /> Quick Actions
            </h3>
            
            <div className="space-y-3">
              <button onClick={() => navigate('/submit')} className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all flex items-center justify-between group shimmer-button">
                 <span className="flex items-center gap-2"><Plus size={18} /> New Complaint</span>
              </button>
              
              <button onClick={() => navigate('/track')} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-between group">
                 <span className="flex items-center gap-2"><Shield size={18} className="text-slate-400 group-hover:text-amber-400 transition-colors" /> Track Existing</span>
              </button>
              
              <button onClick={toggleAIBuddy} className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-between group shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                 <span className="flex items-center gap-2"><Sparkles size={18} className="text-indigo-400" /> Ask AI Buddy</span>
              </button>
            </div>
          </div>
          
        </div>

        {/* Right Column: Complaint History */}
        <div className="lg:col-span-2 glass-panel rounded-3xl border border-white/10 flex flex-col overflow-hidden">
           <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.01]">
             <h3 className="text-xl font-bold text-white tracking-wide">My Complaints</h3>
             <select 
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="appearance-none px-4 py-2 text-sm glass-input text-white cursor-pointer [&>option]:bg-slate-900"
              >
                <option value="All">All Status</option>
                <option value="Submitted">Submitted</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
           </div>
           
           <div className="flex-1 overflow-y-auto max-h-[500px]">
             {filtered.length > 0 ? (
               <div className="divide-y divide-white/5">
                 {filtered.map(comp => (
                   <div key={comp.id} className="p-6 hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => navigate('/track')}>
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                       <div className="flex items-center gap-3">
                         <span className="font-mono text-lg font-bold text-indigo-300 glow-text">{comp.id}</span>
                         <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">{comp.category}</span>
                       </div>
                       <StatusBadge status={comp.status} />
                     </div>
                     <p className="text-slate-400 text-sm mb-4 line-clamp-2">{comp.description}</p>
                     <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                       <span className="flex items-center gap-1.5"><Clock size={14} /> Updated {formatDistanceToNow(new Date(comp.updatedAt), { addSuffix: true })}</span>
                       <span className="flex items-center gap-1.5 border border-white/5 px-2 py-1 rounded bg-black/20">
                          Priority: <span className={comp.priority === 'High' ? 'text-red-400' : 'text-amber-400'}>{comp.priority}</span>
                       </span>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500 p-8 text-center">
                 <AlertCircle size={48} className="mb-4 opacity-50" />
                 <p className="text-lg font-medium text-slate-400 mb-1">No complaints found</p>
                 <p className="text-sm">You haven't filed any issues yet, or none match this filter.</p>
               </div>
             )}
           </div>
        </div>
        
      </div>
    </div>
  );
}
