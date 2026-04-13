import React, { useState, useEffect } from 'react';
import { getComplaintById, getComplaints } from '../db';
import { Search, MapPin, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function TrackView() {
  const [trackingId, setTrackingId] = useState('');
  const [complaint, setComplaint] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Show some recent submissions randomly or just top 3
    const all = getComplaints().sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    setRecent(all.slice(0, 3));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return;
    
    // Auto-prefix CP- if user forgot it, typical hackathon feature
    let searchId = trackingId.toUpperCase();
    if (!searchId.startsWith('CP-') && /^\d{4}$/.test(searchId)) {
        searchId = `CP-${searchId}`;
    }

    const result = getComplaintById(searchId);
    if (result) {
      setComplaint(result);
      setError('');
    } else {
      setComplaint(null);
      setError('No complaint found with this Tracking ID.');
    }
  };

  const StatusIcon = ({ status }) => {
    if (status === 'Resolved') return <CheckCircle2 className="text-emerald-500 w-12 h-12" />;
    if (status === 'In Progress') return <Clock className="text-indigo-500 w-12 h-12" />;
    return <AlertCircle className="text-amber-500 w-12 h-12" />;
  };

  return (
    <div className="max-w-2xl mx-auto py-12 lg:py-20 relative">
      <div className="absolute top-1/4 right-1/4 w-96 h-[300px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none z-[-1]"></div>
      
      <div className="mb-10 text-center flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-lg leading-tight">Track <span className="glow-text">Complaint</span></h1>
        <p className="text-slate-400 text-lg md:text-xl font-medium">Enter your tracking ID below to monitor live resolution status.</p>
      </div>

      <form onSubmit={handleSearch} className="relative mb-10 fade-in group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-400 w-6 h-6 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] group-focus-within:text-indigo-400 transition-colors" />
        <input 
          type="text" 
          placeholder="e.g. CP-1234"
          value={trackingId}
          onChange={e => setTrackingId(e.target.value)}
          className="w-full pl-16 pr-36 py-6 glass-panel rounded-3xl text-xl font-bold tracking-wider placeholder:text-slate-500/50 text-white focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/20 outline-none shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all uppercase"
        />
        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] border border-white/10 active:scale-95">
          Track
        </button>
      </form>

      {error && (
        <div className="glass-panel text-center p-6 rounded-2xl text-red-400 bg-red-500/10 fade-in border border-red-500/20 font-medium shadow-[0_0_20px_rgba(248,113,113,0.1)]">
          {error}
        </div>
      )}

      {complaint && (
        <div className="glass-panel rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-12 fade-in relative border border-white/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-purple-500 opacity-80"></div>
          
          <div className="p-10 text-center border-b border-white/5 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
            <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] backdrop-blur-md relative z-10">
               <StatusIcon status={complaint.status} />
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 relative z-10">Live Status</div>
            <h2 className={`text-4xl font-black drop-shadow-lg relative z-10 ${complaint.status === 'Resolved' ? 'text-emerald-400' : complaint.status === 'In Progress' ? 'text-cyan-400' : 'text-amber-400'}`}>
              {complaint.status}
            </h2>
            <div className="text-sm font-medium text-slate-400 mt-3 relative z-10">
              Last updated {formatDistanceToNow(new Date(complaint.updatedAt))} ago
            </div>
          </div>

          <div className="p-8 md:p-10 bg-black/20">
            {/* Visual Timeline */}
            <div className="mb-12 px-2 md:px-6">
              <div className="relative border-l border-white/10 mt-2 ml-4">
                 <div className="mb-10 relative pl-8">
                   <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]"></div>
                   <h3 className="font-bold text-white text-lg -mt-1 tracking-wide">Submitted</h3>
                   <span className="text-sm text-slate-400 font-medium">{new Date(complaint.submittedAt).toLocaleString()}</span>
                 </div>
                 
                 <div className="mb-10 relative pl-8">
                   <div className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full ${complaint.status === 'In Progress' || complaint.status === 'Resolved' ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]' : 'bg-slate-800 border-2 border-slate-700'}`}></div>
                   <h3 className={`font-bold text-lg -mt-1 tracking-wide ${complaint.status === 'In Progress' || complaint.status === 'Resolved' ? 'text-white' : 'text-slate-600'}`}>In Progress</h3>
                   {(complaint.status === 'In Progress' || complaint.status === 'Resolved') && (
                     <span className="text-sm text-slate-400 font-medium">Department notified and actively working</span>
                   )}
                 </div>
                 
                 <div className="relative pl-8">
                   <div className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full ${complaint.status === 'Resolved' ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]' : 'bg-slate-800 border-2 border-slate-700'}`}></div>
                   <h3 className={`font-bold text-lg -mt-1 tracking-wide ${complaint.status === 'Resolved' ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'text-slate-600'}`}>Resolved</h3>
                   {complaint.status === 'Resolved' && complaint.adminResponse && (
                      <span className="text-sm text-emerald-300 font-medium tracking-wide">Resolution provided</span>
                   )}
                 </div>
              </div>
            </div>

            <div className="bg-white/5 p-6 md:p-8 rounded-2xl border border-white/10 shadow-inner mb-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center items-start gap-4 mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Issue Details</span>
                <span className="text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg shadow-[0_0_10px_rgba(34,211,238,0.1)]">{complaint.category}</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-base font-medium mb-6">{complaint.description}</p>
              
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 mt-6 pt-5 border-t border-white/5">
                <MapPin size={16} className="text-indigo-400 drop-shadow-[0_0_5px_rgba(129,140,248,0.8)]" />
                Handled by <span className="text-slate-200">{complaint.department}</span>
              </div>
            </div>

            {complaint.status === 'Resolved' && complaint.adminResponse && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl fade-in relative overflow-hidden shadow-[inset_0_0_30px_rgba(52,211,153,0.05)]">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-400 rounded-full opacity-10 blur-2xl"></div>
                <h3 className="text-base font-bold text-emerald-400 mb-3 flex items-center gap-2 drop-shadow-sm">
                  <CheckCircle2 size={20} className="drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> Official Response
                </h3>
                <p className="text-emerald-100/90 text-base leading-relaxed">{complaint.adminResponse}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent quick links */}
      {!complaint && recent.length > 0 && (
        <div className="fade-in mt-16 max-w-xl mx-auto">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 text-center">Recent Network Activity</h3>
          <div className="grid gap-4">
            {recent.map(c => (
              <button 
                key={c.id}
                onClick={() => { setTrackingId(c.id); setComplaint(c); setError(''); }}
                className="glass-panel p-5 rounded-2xl flex items-center justify-between hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(99,102,241,0.15)] transition-all text-left w-full border border-white/[0.05] group"
              >
                <div>
                  <div className="font-bold text-indigo-400 group-hover:text-cyan-300 transition-colors drop-shadow-sm text-lg tracking-wide">{c.id}</div>
                  <div className="text-sm text-slate-400 font-medium truncate max-w-[200px] md:max-w-xs">{c.category}</div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm border ${c.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : c.status === 'In Progress' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                  {c.status}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
