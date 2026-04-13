import React, { useState, useEffect } from 'react';
import { getComplaints } from '../db';
import { Search, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RoutingTable() {
  const [complaints, setComplaints] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  useEffect(() => {
    setComplaints(getComplaints());
  }, []);

  const filtered = complaints.filter(c => {
    const matchesSearch = c.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
    const matchesCat = filterCategory === 'All' || c.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCat;
  });

  const getRowColor = (status) => {
    if (status === 'Submitted') return 'bg-amber-500/5 hover:bg-amber-500/10';
    if (status === 'In Progress') return 'bg-cyan-500/5 hover:bg-cyan-500/10';
    if (status === 'Resolved') return 'bg-emerald-500/5 hover:bg-emerald-500/10';
    return 'hover:bg-white/5';
  };

  const StatusBadge = ({ status }) => {
    if (status === 'Submitted') return <span className="px-3 py-1 text-xs font-bold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]">Submitted</span>;
    if (status === 'In Progress') return <span className="px-3 py-1 text-xs font-bold rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]">In Progress</span>;
    return <span className="px-3 py-1 text-xs font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]">Resolved</span>;
  };

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-6 fade-in relative">
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none z-[-1]"></div>
      <div className="mb-10">
        <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-md">Intelligent <span className="glow-text">Routing System</span></h1>
        <p className="text-slate-400 mt-3 text-lg font-medium">Live global feed of all complaints and their AI-assigned departments.</p>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
        <div className="p-6 border-b border-white/10 bg-white/5 flex flex-col md:flex-row gap-5 items-center justify-between backdrop-blur-xl">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] group-focus-within:text-cyan-300 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search ID or keyword..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-5 py-3.5 glass-input font-medium"
            />
          </div>
          
          <div className="flex w-full md:w-auto gap-4">
            <div className="relative flex-1 md:w-64">
              <select 
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full appearance-none pl-5 pr-10 py-3.5 glass-input text-white cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-200"
              >
                <option value="All">All Categories</option>
                <option value="Bathroom & Hygiene">Bathroom & Hygiene</option>
                <option value="Anti-Ragging & Safety">Anti-Ragging & Safety</option>
                <option value="Mess & Food Quality">Mess & Food Quality</option>
                <option value="Academic Issues">Academic Issues</option>
                <option value="Infrastructure/Maintenance">Infrastructure/Maintenance</option>
                <option value="Other">Other</option>
              </select>
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500 pointer-events-none" size={16} />
            </div>

            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="md:w-48 appearance-none px-5 py-3.5 glass-input text-white cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-200"
            >
              <option value="All">All Status</option>
              <option value="Submitted">Submitted</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-black/40 border-b border-white/10 tracking-widest">
              <tr>
                <th className="px-8 py-5 font-bold">Tracking ID</th>
                <th className="px-8 py-5 font-bold max-w-xs">Description</th>
                <th className="px-8 py-5 font-bold">Category</th>
                <th className="px-8 py-5 font-bold">Dept Assigned</th>
                <th className="px-8 py-5 font-bold">Conf.</th>
                <th className="px-8 py-5 font-bold">Priority</th>
                <th className="px-8 py-5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="bg-transparent/50">
              {filtered.map(item => (
                <tr key={item.id} className={`border-b border-white/5 transition-all duration-300 ${getRowColor(item.status)}`}>
                  <td className="px-8 py-5 font-black text-indigo-300 whitespace-nowrap">{item.id}</td>
                  <td className="px-8 py-5 truncate max-w-xs text-slate-400 font-medium" title={item.description}>{item.description}</td>
                  <td className="px-8 py-5 font-semibold tracking-wide"><span className="bg-slate-800/50 px-2 py-1 rounded text-slate-300">{item.category}</span></td>
                  <td className="px-8 py-5 text-white/90 font-medium">{item.department}</td>
                  <td className="px-8 py-5 font-mono text-cyan-400">{item.confidence}%</td>
                  <td className="px-8 py-5">
                    <span className={`w-2.5 h-2.5 rounded-full inline-block mr-2 shadow-sm ${item.priority === 'High' ? 'bg-red-400 shadow-red-400/50' : item.priority === 'Medium' ? 'bg-amber-400 shadow-amber-400/50' : 'bg-emerald-400 shadow-emerald-400/50'}`}></span>
                    <span className="font-semibold text-slate-300 tracking-wide">{item.priority}</span>
                  </td>
                  <td className="px-8 py-5">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-8 py-16 text-center text-slate-500 font-medium text-lg bg-black/10">
                    No complaints match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
