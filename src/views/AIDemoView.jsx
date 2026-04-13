import React, { useState, useEffect } from 'react';
import { Bot, Play, ShieldAlert } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { classifyComplaint } from '../aiService';
import { getComplaints } from '../db';

const COLORS = {
  "Bathroom & Hygiene": "#2dd4bf", // teal-400
  "Anti-Ragging & Safety": "#fb7185", // rose-400
  "Mess & Food Quality": "#fbbf24", // amber-400
  "Academic Issues": "#60a5fa", // blue-400
  "Infrastructure/Maintenance": "#c084fc", // purple-400
  "Other": "#94a3b8" // slate-400
};

export default function AIDemoView() {
  const [testText, setTestText] = useState("There is sparking happening near the main switchboard in class 2A when we turn on the fans.");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState([]);
  
  useEffect(() => {
    // Generate stats
    const complaints = getComplaints();
    const counts = {};
    complaints.forEach(c => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    
    setStats(Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    })));
  }, []);

  const handleTest = async () => {
    if (!testText.trim()) return;
    setIsLoading(true);
    setResult(null);
    try {
      const resp = await classifyComplaint(testText);
      setResult(resp);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const hasApiKey = !!localStorage.getItem("campusFixGeminiKey");

  return (
    <div className="max-w-5xl mx-auto py-12 px-6 relative">
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none z-[-1]"></div>
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-5 drop-shadow-md pb-1">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
            <Bot size={30} />
          </div>
          AI Classification <span className="glow-text">Engine</span>
        </h1>
        <p className="text-slate-400 mt-4 text-lg font-medium ml-[4.5rem]">Test the core AI categorization live. Watch how it routes natural language to the correct departments.</p>
        
        {!hasApiKey && (
          <div className="mt-8 ml-[4.5rem] flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 p-5 rounded-2xl shadow-[0_0_20px_rgba(251,191,36,0.1)]">
            <ShieldAlert className="shrink-0 mt-0.5 drop-shadow-md" size={20} />
            <div className="text-sm tracking-wide leading-relaxed">
              <strong className="text-amber-300">API Key Not Found.</strong> You are currently using the fallback keyword matcher. To see the true power of the LLM, please specify your Google Gemini API Key in settings.
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Test Panel */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden group hover:shadow-[0_20px_60px_rgba(34,211,238,0.1)] transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] rounded-full pointer-events-none"></div>
          <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-3 tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse"></span>
            Live Demo
          </h2>
          <textarea
            value={testText}
            onChange={e => setTestText(e.target.value)}
            className="w-full h-36 p-5 glass-input resize-y mb-6 text-base"
          ></textarea>
          
          <button 
            onClick={handleTest}
            disabled={isLoading || !testText}
            className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] border border-white/10 tracking-widest uppercase text-sm shimmer-button"
          >
            {isLoading ? (
              <span className="animate-pulse">Classifying Insights...</span>
            ) : (
              <>
                Classify Now
                <Play size={18} fill="currentColor" />
              </>
            )}
          </button>

          {result && (
            <div className="mt-8 border-t border-white/10 pt-8 fade-in flex flex-col h-full bg-transparent">
              <div className="flex items-center justify-between mb-5 opacity-90">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detection Result</span>
                <span className="text-xs font-black text-white px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 uppercase shadow-[0_0_10px_rgba(99,102,241,0.2)]">{result.priority} Priority</span>
              </div>
              
              <div className="bg-black/20 rounded-2xl p-6 border border-white/5 mb-5 flex flex-col justify-center min-h-[100px]">
                <div className="font-black text-2xl mb-2 drop-shadow-md" style={{ color: COLORS[result.category] || COLORS["Other"], textShadow: `0 0 10px ${COLORS[result.category]}40` }}>
                  {result.category}
                </div>
                <div className="text-sm text-slate-300 flex items-center gap-2 font-medium">
                  Routed to: <strong className="text-white tracking-wide">{result.department}</strong>
                </div>
              </div>

              <div className="mb-6 opacity-90">
                <div className="flex justify-between items-center mb-2 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-widest">Confidence</span>
                  <span className="font-black text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">{result.confidence}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 animate-w-fill rounded-full relative">
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-500/10 text-indigo-200 p-5 rounded-2xl border border-indigo-500/20 italic text-sm leading-relaxed shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] font-medium mt-auto">
                "{result.reasoning}"
              </div>
            </div>
          )}
        </div>

        {/* Stats Panel */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden bg-transparent">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>
          <h2 className="text-xl font-bold text-white mb-8 tracking-wide z-10">Database Distribution</h2>
          {stats.length > 0 ? (
            <div className="h-[350px] w-full z-10 relative left-[-10px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats}
                    cx="50%"
                    cy="40%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS["Other"]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" height={60} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm font-medium">
              No data yet.
            </div>
          )}
          
          <div className="mt-auto pt-6 border-t border-white/10 text-center z-10">
            <span className="text-xs text-indigo-300 font-bold bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full tracking-widest shadow-[0_0_15px_rgba(99,102,241,0.1)] inline-block">
              POWERED BY GEMINI 1.5 FLASH
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
