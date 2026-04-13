import React, { useState, useEffect, useMemo } from 'react';
import { getComplaints, updateComplaintStatus, updateComplaintCategory, getLogs } from '../db';
import { generateAdminInsights } from '../aiService';
import { Search, Filter, Lock, Unlock, BarChart, Activity, CheckSquare, Clock, AlertTriangle, X, LayoutDashboard, List, TrendingUp, Users, Bell, Brain, Zap, FolderTree, RefreshCw, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatDistanceToNow, format, subDays, differenceInHours } from 'date-fns';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("AdminDashboard Component Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center fade-in">
          <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)] border border-red-500/20">
            <AlertTriangle size={36} />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-3">System Override</h2>
          <p className="text-slate-400 max-w-md mb-8 text-lg font-medium leading-relaxed">A visual module failed to render. We have safely isolated the crash to protect your session.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.05)] font-bold transition-all border border-white/10">Reload Operations</button>
        </div>
      );
    }
    return this.props.children; 
  }
}

const StatusBadge = ({ status }) => {
  if (status === 'Submitted') return <span className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]">Pending</span>;
  if (status === 'In Progress') return <span className="px-3 py-1 text-xs font-bold rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">In Progress</span>;
  return <span className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]">Resolved</span>;
};

const PriorityBadge = ({ priority }) => {
  if (priority === 'High') return <span className="flex items-center gap-1.5 text-xs font-black text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md border border-red-500/20 uppercase tracking-widest"><AlertTriangle size={12}/> High</span>;
  if (priority === 'Medium') return <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 uppercase tracking-widest">Medium</span>;
  return <span className="text-xs font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10 uppercase tracking-widest">Low</span>;
};

const COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f87171', '#c084fc'];

const DEPT_MAPPING = {
  "Bathroom & Hygiene": "Housekeeping & Sanitation",
  "Anti-Ragging & Safety": "Dean of Students / Warden",
  "Mess & Food Quality": "Mess Committee",
  "Academic Issues": "Academic Affairs Office",
  "Infrastructure/Maintenance": "Estate & Maintenance",
  "Other": "General Administration",
  "Needs Admin Review": "Admin Review Required"
};

function DashboardContent() {
  const [complaints, setComplaints] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, complaints, priority, clusters, ai
  
  // Slide-over panel state
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [panelStatus, setPanelStatus] = useState('');
  const [panelCategory, setPanelCategory] = useState('');
  const [panelResponse, setPanelResponse] = useState('');

  // AI & Filtering
  const [aiInsights, setAiInsights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = () => {
    setComplaints(getComplaints());
    setLogs(getLogs());
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = () => {
    if (!selectedComplaint) return;
    
    // Check if category changed
    if (panelCategory && panelCategory !== selectedComplaint.category) {
      const newDept = DEPT_MAPPING[panelCategory] || "General Administration";
      updateComplaintCategory(selectedComplaint.id, panelCategory, newDept);
    }
    
    updateComplaintStatus(selectedComplaint.id, panelStatus, panelResponse || null);
    setSelectedComplaint(null);
    refreshData();
  };

  const handleRunAnalytics = async () => {
    setIsAnalyzing(true);
    const insights = await generateAdminInsights(complaints.filter(c => c.status !== 'Resolved'));
    setAiInsights(insights);
    setIsAnalyzing(false);
  };

  // 1. Core Analytics
  const totals = useMemo(() => {
    const list = complaints;
    return {
      all: list.length,
      pending: list.filter(c => c.status === 'Submitted').length,
      inProgress: list.filter(c => c.status === 'In Progress').length,
      resolved: list.filter(c => c.status === 'Resolved').length,
      highPriority: list.filter(c => c.priority === 'High' && c.status !== 'Resolved').length,
      critical: list.filter(c => differenceInHours(new Date(), new Date(c.submittedAt)) > 24 && c.status === 'Submitted').length
    };
  }, [complaints]);

  // 2. Trend Graph Data
  const trendData = useMemo(() => {
    const last7Days = Array.from({length: 7}, (_, i) => format(subDays(new Date(), 6 - i), 'MMM dd'));
    return last7Days.map(dateStr => {
      const dayComplaints = complaints.filter(c => format(new Date(c.submittedAt), 'MMM dd') === dateStr);
      return { 
        name: dateStr, 
        count: dayComplaints.length,
        resolved: dayComplaints.filter(c => c.status === 'Resolved').length 
      };
    });
  }, [complaints]);

  // 3. Category Data
  const catData = useMemo(() => {
    const counts = {};
    complaints.forEach(c => counts[c.category] = (counts[c.category] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [complaints]);

  // 4. Clustering Data
  const clusters = useMemo(() => {
    const grouped = {};
    complaints.filter(c => c.status !== 'Resolved').forEach(c => {
      if (!grouped[c.category]) grouped[c.category] = [];
      grouped[c.category].push(c);
    });
    return Object.entries(grouped).map(([category, items]) => ({
      category,
      count: items.length,
      highPriority: items.filter(c => c.priority === 'High').length,
      sample: items[0].description
    })).sort((a,b) => b.count - a.count);
  }, [complaints]);

  // Filtering
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      if (!searchQuery) return true;
      return c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
             c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
             c.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    }).sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }, [complaints, searchQuery]);

  // Priority Queue Logic
  const priorityQueue = useMemo(() => {
    const pending = complaints.filter(c => c.status !== 'Resolved');
    return pending.sort((a, b) => {
      if (a.priority === 'High' && b.priority !== 'High') return -1;
      if (b.priority === 'High' && a.priority !== 'High') return 1;
      if (a.priority === 'Medium' && b.priority === 'Low') return -1;
      if (b.priority === 'Medium' && a.priority === 'Low') return 1;
      return new Date(a.submittedAt) - new Date(b.submittedAt); // oldest first within same priority
    });
  }, [complaints]);

  const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'priority', label: 'Priority Queue', icon: Zap },
    { id: 'complaints', label: 'All Tickets', icon: List },
    { id: 'clusters', label: 'Issue Clusters', icon: FolderTree },
    { id: 'ai', label: 'AI Analyst', icon: Brain },
    { id: 'departments', label: 'Departments', icon: Users },
    { id: 'logs', label: 'Activity Feed', icon: Bell },
  ];

  const openPanel = (c) => {
    setSelectedComplaint(c);
    setPanelStatus(c.status);
    setPanelCategory(c.category);
    setPanelResponse(c.adminResponse || '');
  };

  return (
    <div className="pb-8 pt-6 w-full max-w-[1400px] mx-auto min-h-screen flex flex-col relative">
      
      {/* Dynamic Background */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none z-[-1]"></div>
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/5 blur-[150px] rounded-full pointer-events-none z-[-1]"></div>

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-6 z-10 relative">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-3">
            <Lock size={12} /> Secure Connection
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-lg pb-1">
            Command <span className="glow-text">Center</span>
          </h1>
          <p className="text-slate-400 font-medium text-lg mt-2 tracking-wide">Monitor, analyze, and deploy fixes across campus.</p>
        </div>
        
        <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-x-auto hide-scrollbar w-full lg:w-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${isActive ? 'bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]' : 'border border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <Icon size={16} className={isActive ? "drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : ""} /> {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="flex-1 relative z-10 w-full animate-fade-in-up">
        
        {/* OVERVIEW SECTION */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
              <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
                <p className="text-slate-400 font-bold text-xs tracking-widest uppercase mb-2">Total Volume</p>
                <div className="text-4xl font-black text-white">{totals.all}</div>
              </div>
              <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 shadow-[0_0_15px_#fbbf24]"></div>
                <p className="text-amber-400 font-bold text-xs tracking-widest uppercase mb-2 flex items-center gap-1.5"><Activity size={14}/> Pending</p>
                <div className="text-4xl font-black text-white">{totals.pending}</div>
              </div>
              <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400 shadow-[0_0_15px_#22d3ee]"></div>
                <p className="text-cyan-400 font-bold text-xs tracking-widest uppercase mb-2 flex items-center gap-1.5"><Clock size={14}/> In Progress</p>
                <div className="text-4xl font-black text-white">{totals.inProgress}</div>
              </div>
              <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400 shadow-[0_0_15px_#34d399]"></div>
                <p className="text-emerald-400 font-bold text-xs tracking-widest uppercase mb-2 flex items-center gap-1.5"><CheckSquare size={14}/> Resolved</p>
                <div className="text-4xl font-black text-white">{totals.resolved}</div>
              </div>
              <div className="glass-panel p-6 rounded-3xl border border-red-500/20 bg-red-500/5 relative overflow-hidden group shadow-[0_0_30px_rgba(239,68,68,0.05)]">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_15px_#ef4444]"></div>
                <p className="text-red-400 font-bold text-xs tracking-widest uppercase mb-2 flex items-center gap-1.5"><AlertTriangle size={14}/> Critical (&gt;24h)</p>
                <div className="text-4xl font-black text-white glow-text">{totals.critical}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-panel p-8 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                 <div className="flex justify-between items-center mb-8">
                   <h3 className="font-bold text-white tracking-wide text-lg">Ticket Velocity (7 Days)</h3>
                   <div className="flex gap-4">
                     <span className="flex items-center gap-2 text-xs font-bold text-slate-400"><div className="w-3 h-3 rounded-full bg-cyan-400"></div> Total Filed</span>
                     <span className="flex items-center gap-2 text-xs font-bold text-slate-400"><div className="w-3 h-3 rounded-full bg-emerald-400"></div> Resolved</span>
                   </div>
                 </div>
                 <div className="h-72 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={trendData}>
                       <defs>
                         <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                         </linearGradient>
                         <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff1a" />
                       <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                       <YAxis tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                       <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}} cursor={{stroke: 'rgba(255,255,255,0.1)'}} />
                       <Area type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                       <Area type="monotone" dataKey="resolved" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorRes)" />
                     </AreaChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col">
                 <h3 className="font-bold text-white tracking-wide text-lg mb-4">Category Distribution</h3>
                 <div className="h-56 w-full flex-1">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie data={catData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                         {catData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                       </Pie>
                       <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff'}} itemStyle={{color: '#fff'}} />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
                 <div className="grid grid-cols-2 gap-3 mt-4">
                   {catData.slice(0, 4).map((c, i) => (
                     <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-300 truncate">
                       <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[i]}}></div> {c.name.split(' ')[0]}
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* PRIORITY QUEUE */}
        {activeTab === 'priority' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="glass-panel border border-amber-500/20 bg-amber-500/5 p-6 rounded-3xl mb-6 shadow-[0_10px_30px_rgba(251,191,36,0.05)] flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center border border-amber-500/30">
                  <AlertTriangle size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Active Priority Queue</h3>
                  <p className="text-amber-400/80 text-sm font-semibold max-w-xl">These issues have been algorithmically sorted by Gemini category severity and wait time. Action from top to bottom.</p>
                </div>
              </div>
              <div className="text-right hidden md:block">
                <div className="text-3xl font-black text-amber-400 glow-text">{priorityQueue.length}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Pending</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {priorityQueue.map((item, idx) => (
                <div key={item.id} className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all flex flex-col h-full bg-[#0a0f1d]/50 hover:bg-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                  {item.priority === 'High' && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>}
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-black text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-lg text-sm border border-indigo-500/20">{item.id}</span>
                    <PriorityBadge priority={item.priority} />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2 leading-tight">{item.category}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6 line-clamp-3 flex-1">{item.description}</p>
                  
                  <div className="mt-auto border-t border-white/5 pt-4 flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5"><Clock size={12}/> {formatDistanceToNow(new Date(item.submittedAt))} ago</span>
                     <button onClick={() => openPanel(item)} className="text-cyan-400 hover:text-cyan-300 text-sm font-bold flex items-center gap-1 transition-colors">Resolve <ChevronRight size={16}/></button>
                  </div>
                </div>
              ))}
              {priorityQueue.length === 0 && <div className="col-span-full py-20 text-center text-emerald-400 font-bold text-xl">🎉 Priority queue is completely clear!</div>}
            </div>
          </div>
        )}

        {/* ISSUE CLUSTERS */}
        {activeTab === 'clusters' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="glass-panel border border-cyan-500/20 bg-cyan-500/5 p-6 rounded-3xl mb-6 flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                   <FolderTree size={24} />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-white">Dynamic Issue Clusters</h3>
                   <p className="text-cyan-400/80 text-sm font-medium">Similar tickets are mathematically grouped to help you deploy bulk solutions.</p>
                 </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {clusters.map((cluster, i) => (
                <div key={i} className="glass-panel p-8 rounded-3xl border border-white/10 hover:border-cyan-500/30 transition-all shadow-xl group">
                  <div className="flex justify-between items-start mb-6">
                    <h4 className="text-2xl font-black text-white tracking-tight">{cluster.category}</h4>
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center shadow-inner group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 transition-colors">
                      <span className="text-xl font-bold text-cyan-400">{cluster.count}</span>
                      <span className="text-[9px] uppercase tracking-widest text-slate-500">Tickets</span>
                    </div>
                  </div>
                  
                  <div className="bg-[#05070d]/50 p-4 rounded-xl border border-white/5 mb-6">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sample Report Format</p>
                    <p className="text-slate-300 text-sm italic border-l-2 border-cyan-500/50 pl-3 leading-relaxed w-full break-words">"{cluster.sample.substring(0, 150)}{cluster.sample.length > 150 ? '...' : ''}"</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-400 flex items-center gap-2"><AlertTriangle size={16} className={cluster.highPriority > 0 ? "text-red-400" : "text-slate-500"}/> {cluster.highPriority} High Priority</span>
                    <button className="px-5 py-2 glass-input font-bold text-sm text-white hover:bg-white/10 transition-all">Bulk Forward to Dept.</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI ANALYST */}
        {activeTab === 'ai' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="glass-panel p-10 rounded-3xl border border-indigo-500/30 bg-indigo-500/5 text-center shadow-[0_20px_60px_rgba(99,102,241,0.1)] relative overflow-hidden">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none z-[-1]"></div>
               <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-3xl p-[1px] shadow-[0_0_40px_rgba(99,102,241,0.4)] mb-8">
                 <div className="w-full h-full bg-[#0a0f1d] rounded-3xl flex items-center justify-center text-white">
                   <Brain size={48} className={isAnalyzing ? "animate-pulse" : ""} />
                 </div>
               </div>
               <h2 className="text-4xl font-black text-white tracking-tight mb-4">Gemini Executive Analyst</h2>
               <p className="text-indigo-200/80 text-lg max-w-2xl mx-auto mb-10 leading-relaxed font-medium">Pass the entire campus queue through Google Gemini 1.5 Flash to automatically detect underlying systemic risks, forecast trends, and generate strategic recommendations.</p>
               
               <button 
                 onClick={handleRunAnalytics}
                 disabled={isAnalyzing}
                 className={`px-10 py-5 font-black text-lg rounded-2xl transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)] border flex items-center justify-center gap-3 mx-auto ${isAnalyzing ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 cursor-not-allowed scale-95' : 'bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 border-white/20 text-white hover:scale-105 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)]'}`}
               >
                 {isAnalyzing ? <><RefreshCw className="animate-spin" /> Processing Queue Data...</> : <><Zap /> Generate Executive Report</>}
               </button>
            </div>

            {aiInsights && aiInsights.length > 0 && (
              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                 {aiInsights.map((insight, idx) => {
                   let borderColor = 'border-slate-500';
                   let icon = <Brain />;
                   if (insight.type === 'risk') { borderColor = 'border-red-500'; icon = <AlertTriangle className="text-red-400"/>; }
                   if (insight.type === 'trend') { borderColor = 'border-amber-500'; icon = <TrendingUp className="text-amber-400"/>; }
                   if (insight.type === 'positive') { borderColor = 'border-emerald-500'; icon = <CheckSquare className="text-emerald-400"/>; }

                   return (
                     <div key={idx} className={`glass-panel p-8 rounded-3xl border-t-4 ${borderColor} shadow-xl hover:-translate-y-2 transition-transform duration-300`}>
                       <div className="flex items-center gap-3 mb-6 bg-white/5 w-max px-4 py-2 rounded-xl border border-white/10">
                         {icon} <span className="text-xs font-bold uppercase tracking-widest text-slate-300">{insight.type}</span>
                       </div>
                       <h3 className="text-2xl font-black text-white leading-tight mb-4">{insight.title}</h3>
                       <p className="text-slate-400 leading-relaxed mb-8 font-medium">{insight.description}</p>
                       <div className="bg-[#05070d]/50 p-5 rounded-2xl border border-white/5 border-l-4 border-l-indigo-500">
                         <span className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Suggested Action</span>
                         <span className="text-white font-medium text-sm leading-relaxed">{insight.recommendation}</span>
                       </div>
                     </div>
                   )
                 })}
              </div>
            )}
          </div>
        )}

        {/* COMPLAINTS / ALL TICKETS */}
        {activeTab === 'complaints' && (
          <div className="glass-panel rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] fade-in border border-white/10 bg-[#0a0f1d] flex flex-col min-h-[600px]">
             
            {/* Toolbar */}
            <div className="p-6 border-b border-white/10 bg-white/5 backdrop-blur-xl flex flex-col md:flex-row gap-4 justify-between items-center z-10">
              <div className="relative w-full md:w-96">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search tracking ID or keyword..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 glass-input rounded-xl border-white/10 focus:border-cyan-500/50 transition-colors"
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto hide-scrollbar pb-1 md:pb-0">
                <Filter size={18} className="text-slate-500" />
                {['All', 'Submitted', 'In Progress', 'Resolved'].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setFilterStatus(s)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterStatus === s ? 'bg-cyan-500 text-[#02040a]' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'}`}
                  >{s}</button>
                ))}
              </div>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs text-slate-400 uppercase tracking-widest bg-black/40 border-b border-white/10 sticky top-0 backdrop-blur-xl z-10">
                  <tr>
                    <th className="px-6 py-5 font-bold whitespace-nowrap">Ticket ID</th>
                    <th className="px-6 py-5 font-bold">Category & Details</th>
                    <th className="px-6 py-5 font-bold">Priority</th>
                    <th className="px-6 py-5 font-bold">Status</th>
                    <th className="px-6 py-5 font-bold text-center">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.filter(c => filterStatus === 'All' || c.status === filterStatus).map(item => (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => openPanel(item)}>
                      <td className="px-6 py-5 align-top">
                        <span className="font-black text-indigo-300 font-mono tracking-tight block">{item.id}</span>
                        <span className="text-[10px] uppercase text-slate-500 mt-1 font-bold">{format(new Date(item.submittedAt), 'MM/dd - HH:mm')}</span>
                      </td>
                      <td className="px-6 py-5 max-w-sm align-top">
                        <div className="font-bold text-white mb-1.5">{item.category}</div>
                        <div className="truncate text-slate-400 group-hover:text-slate-300 transition-colors">{item.description}</div>
                      </td>
                      <td className="px-6 py-5 align-top">
                         <PriorityBadge priority={item.priority} />
                      </td>
                      <td className="px-6 py-5 align-top"><StatusBadge status={item.status} /></td>
                      <td className="px-6 py-5 align-top text-center">
                        <div className="w-8 h-8 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 flex items-center justify-center mx-auto transition-all border border-transparent hover:border-cyan-500/30">
                           <ChevronRight size={18} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredComplaints.length === 0 && (
                     <tr><td colSpan="5" className="text-center py-20 text-slate-500 text-lg font-medium">No tickets match your query.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="space-y-6 animate-fade-in-up">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  "Housekeeping & Sanitation", 
                  "Dean of Students / Warden", 
                  "Mess Committee", 
                  "Academic Affairs Office", 
                  "Estate & Maintenance", 
                   "General Administration"
                ].map((dept, i) => {
                   const deptComplaints = complaints.filter(c => c.department === dept);
                   const pendingCount = deptComplaints.filter(c => c.status !== 'Resolved').length;
                   return (
                     <div key={i} className="glass-panel p-8 rounded-3xl border border-white/10 shadow-xl group hover:border-indigo-500/30 transition-all flex flex-col">
                       <h4 className="text-xl font-black text-white mb-6 pr-8 leading-tight h-12">{dept}</h4>
                       
                       <div className="flex justify-between items-center mb-5 bg-[#05070d]/50 p-4 rounded-2xl border border-white/5">
                         <div>
                           <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Active Tickets</div>
                           <div className="text-3xl font-black text-white">{pendingCount}</div>
                         </div>
                         <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                           <Users size={20} />
                         </div>
                       </div>
                       
                       <div className="mt-auto space-y-3">
                         <button className="w-full py-3 glass-input font-bold text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors border-white/5 hover:border-cyan-500/30 text-left px-5 flex justify-between items-center bg-white/5 disabled:opacity-50" disabled={pendingCount === 0}>
                           Send Reminder Alert <Bell size={14}/>
                         </button>
                         <button className="w-full py-3 glass-input font-bold text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border-white/5 hover:border-red-500/30 text-left px-5 flex justify-between items-center bg-white/5 disabled:opacity-50" disabled={pendingCount === 0}>
                           Escalate to Authority <AlertTriangle size={14}/>
                         </button>
                       </div>
                     </div>
                   );
                })}
             </div>
          </div>
        )}

        {/* LOGS */}
        {activeTab === 'logs' && (
          <div className="glass-panel p-8 rounded-3xl fade-in max-w-4xl pt-10 relative border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] bg-transparent mx-auto">
            <div className="absolute top-0 bottom-0 left-12 w-0.5 bg-white/10 z-0 hidden sm:block"></div>
            <h3 className="text-2xl font-black text-white mb-10 pl-4 sm:pl-0">System Activity Log</h3>
            {logs.map((log) => (
               <div key={log.id} className="relative z-10 flex flex-col sm:flex-row gap-6 mb-10 group pl-4 sm:pl-0">
                 <div className="w-16 text-right hidden sm:block">
                   <div className="text-xs font-bold text-slate-500 mt-2 tracking-widest">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                 </div>
                 <div className="absolute left-0 sm:left-12 w-4 h-4 rounded-full bg-cyan-400 border-4 border-[#0a0f1d] shadow-[0_0_15px_rgba(34,211,238,0.6)] -ml-2.5 mt-1.5 transition-all group-hover:scale-125"></div>
                 <div className="glass-panel border border-white/5 p-6 rounded-2xl flex-1 ml-4 sm:ml-4 group-hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover:border-white/10 transition-all bg-white/5">
                   <div className="flex items-center gap-3 mb-3">
                     <span className="font-black text-cyan-300 drop-shadow-md tracking-widest">{log.trackingId}</span>
                     <StatusBadge status={log.status} />
                   </div>
                   <p className="text-slate-300 text-sm font-medium leading-relaxed">{log.message}</p>
                   <div className="text-xs font-bold text-slate-500 mt-4 sm:hidden tracking-widest">{new Date(log.timestamp).toLocaleTimeString()}</div>
                 </div>
               </div>
            ))}
            {logs.length === 0 && <p className="text-slate-500 text-center py-16 font-medium text-lg">No activity logged yet.</p>}
          </div>
        )}

      </div>

      {/* Slide-over Ticket Resolution Panel */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-[#02040a]/80 backdrop-blur-md" onClick={() => setSelectedComplaint(null)}></div>
          <div className="relative w-full max-w-lg bg-[#0a0f1d] border-l border-white/10 h-full shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col slide-in-right">
            
            <div className="p-8 border-b border-white/10 bg-gradient-to-b from-indigo-500/10 to-transparent flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-indigo-400 text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10 mb-3 inline-block">Manage Ticket</span>
                <h2 className="text-3xl font-black text-white mt-1 drop-shadow-md">{selectedComplaint.id}</h2>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all shadow-inner border border-transparent hover:border-white/10 mt-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 bg-transparent hide-scrollbar">
              
              {/* Ticket Content */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10 mb-8 bg-white/[0.02]">
                <p className="text-slate-300 text-base leading-relaxed font-medium mb-5">{selectedComplaint.description}</p>
                {selectedComplaint.imageBase64 && (
                  <div className="relative group rounded-xl overflow-hidden mb-5 border border-white/10">
                    <div className="absolute inset-0 bg-cyan-500/20 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <img src={selectedComplaint.imageBase64} alt="Complaint Evidence" className="w-full object-cover max-h-56 filter group-hover:brightness-110 transition-all" />
                  </div>
                )}
                <div className="flex items-center justify-between mt-5 pt-5 border-t border-white/5">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center font-bold text-indigo-300 text-xs border border-indigo-500/30">ID</div>
                     <span className="text-sm font-bold text-white tracking-wide">{selectedComplaint.studentId}</span>
                   </div>
                   <span className="text-sm font-semibold text-slate-400">{formatDistanceToNow(new Date(selectedComplaint.submittedAt))} ago</span>
                </div>
              </div>

              {/* AI Classification / Categorization Block */}
              <div className={`mb-8 bg-gradient-to-br border p-6 rounded-2xl relative overflow-hidden shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] ${selectedComplaint.category === 'Needs Admin Review' ? 'from-amber-500/10 to-red-500/5 border-amber-500/40' : 'from-indigo-500/10 to-cyan-500/5 border-indigo-500/20'}`}>
                 <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 blur-[40px] pointer-events-none"></div>
                 <div className="flex justify-between items-center mb-4 relative z-10">
                   <span className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5"><Brain size={14}/> Classification Core</span>
                   <span className={`text-xs font-bold px-3 py-1 rounded-lg backdrop-blur-md border ${selectedComplaint.confidence < 50 ? 'bg-amber-500/30 text-amber-200 border-amber-500/50' : 'bg-indigo-500/30 text-indigo-200 border-indigo-500/50'}`}>{selectedComplaint.confidence}% Certainty</span>
                 </div>
                 
                 <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">Ticket Category Override</label>
                 <select 
                    value={panelCategory}
                    onChange={e => setPanelCategory(e.target.value)}
                    className="w-full px-4 py-3 mb-3 glass-input font-bold text-white appearance-none cursor-pointer [&>option]:bg-slate-900 border-white/10 hover:border-cyan-500/30 transition-colors"
                  >
                    <option value="Bathroom & Hygiene">Bathroom & Hygiene</option>
                    <option value="Anti-Ragging & Safety">Anti-Ragging & Safety</option>
                    <option value="Mess & Food Quality">Mess & Food Quality</option>
                    <option value="Academic Issues">Academic Issues</option>
                    <option value="Infrastructure/Maintenance">Infrastructure/Maintenance</option>
                    <option value="Other">Other</option>
                    {selectedComplaint.category === 'Needs Admin Review' && <option value="Needs Admin Review">Needs Admin Review (Unresolved)</option>}
                  </select>

                 <p className="text-sm text-slate-300 italic border-l-2 border-cyan-500/50 pl-4 py-1 leading-relaxed relative z-10">"{selectedComplaint.reasoning || selectedComplaint.aiReasoning || "Classified dynamically by AI parameters."}"</p>
              </div>

              {/* Controls */}
              <div className="mb-8">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Update Operations Status</label>
                <div className="relative">
                  <select 
                    value={panelStatus}
                    onChange={e => setPanelStatus(e.target.value)}
                    className="w-full px-5 py-4 glass-input font-bold tracking-wide text-white appearance-none cursor-pointer [&>option]:bg-slate-900 border-white/10 hover:border-white/20 transition-colors"
                  >
                    <option value="Submitted">Pending (Awaiting Action)</option>
                    <option value="In Progress">In Progress (Active Dispatch)</option>
                    <option value="Resolved">Resolved (Complete)</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><Filter size={16} /></div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Resolution Protocol Notes</label>
                <textarea 
                  placeholder="Enter response visible to student portal..."
                  value={panelResponse}
                  onChange={e => setPanelResponse(e.target.value)}
                  className="w-full p-5 glass-input resize-y min-h-[140px] text-base leading-relaxed border-white/10 hover:border-white/20 transition-colors placeholder:text-slate-600 focus:bg-white/5"
                ></textarea>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-8 border-t border-white/10 bg-[#0a0f1d] backdrop-blur-3xl z-10">
              <button 
                onClick={handleUpdateStatus}
                className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] active:scale-95 flex items-center justify-center gap-3 border border-white/10"
              >
                Commit System Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardWrapper() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
