import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Settings, Home, Activity, List, LayoutDashboard, Search, Inbox, Plus, LogOut } from 'lucide-react';
import { initDB, getCurrentUser, logoutUser } from './db';

// Views
import LoginView from './views/LoginView';
import StudentDashboard from './views/StudentDashboard';
import SubmitView from './views/SubmitView';
import AIDemoView from './views/AIDemoView';
import AdminDashboard from './views/AdminDashboard';
import TrackView from './views/TrackView';
import RoutingTable from './views/RoutingTable';
import DepartmentInboxView from './views/DepartmentInboxView';
import AIBuddyWidget from './components/AIBuddyWidget';

// Settings Modal
const SettingsModal = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('campusFixGeminiKey') || '');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/80 backdrop-blur-sm p-4 fade-in">
      <div className="glass-panel rounded-2xl max-w-md w-full p-8 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 blur-[2px]"></div>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)] p-2.5 rounded-xl text-indigo-400">
            <Settings size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">API Key Setup</h2>
        </div>
        <p className="text-slate-400 text-sm mb-6">
          Enter your Google Gemini API Key to enable the AI features. 
          <br/><span className="text-xs font-semibold mt-2 inline-block text-indigo-300">Your key is stored only in your browser.</span>
        </p>
        <input 
          type="password" 
          placeholder="AIzaSy..."
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          className="w-full px-4 py-3 mb-6 glass-input"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium">Close</button>
          <button 
            onClick={() => {
              if (apiKey) localStorage.setItem('campusFixGeminiKey', apiKey);
              else localStorage.removeItem('campusFixGeminiKey');
              onClose();
            }} 
            className="px-5 py-2.5 bg-indigo-500/20 border border-indigo-500/50 hover:bg-indigo-500/30 text-white rounded-xl transition-all font-medium"
          >Save & Continue</button>
        </div>
      </div>
    </div>
  );
};

const Navigation = ({ user, onRequestKeys, onLogout }) => {
  const location = useLocation();
  
  const studentNav = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/submit', icon: Plus, label: 'Submit Issue' },
    { path: '/track', icon: Search, label: 'Track' }
  ];

  const adminNav = [
    { path: '/admin', icon: LayoutDashboard, label: 'Admin Hub' },
    { path: '/inbox', icon: Inbox, label: 'Inbox' },
    { path: '/routing', icon: List, label: 'Routing Rules' }
  ];

  const navItems = user.role === 'admin' ? adminNav : studentNav;

  return (
    <>
      <nav className="fixed md:left-0 md:top-0 md:bottom-0 md:w-64 bg-slate-900/40 backdrop-blur-2xl md:border-r border-white/10 flex md:flex-col
                      bottom-0 w-full flex-row justify-around md:justify-start z-40 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        
        {/* Desktop Header */}
        <div className="hidden md:flex p-8 items-center gap-4 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 p-[1px] shadow-[0_0_20px_rgba(99,102,241,0.4)]">
             <div className="w-full h-full bg-[#05070d] rounded-xl flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-cyan-300 font-black text-xl">C</div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight glow-text drop-shadow-md">CampusFix</h1>
        </div>

        {/* User Badge */}
        <div className="hidden md:flex flex-col px-6 py-4 border-b border-white/5 bg-white/[0.02]">
           <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{user.role}</span>
           <span className="text-sm font-medium text-slate-300 truncate">{user.name}</span>
        </div>

        <div className="flex w-full px-2 py-3 md:py-6 md:px-4 md:flex-col md:flex-1 gap-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link key={path} to={path} className={`flex flex-col md:flex-row items-center md:justify-start justify-center gap-1 md:gap-4 py-2 md:py-3.5 px-3 md:px-4 rounded-xl transition-all duration-300
                  ${isActive ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-[inset_0_0_12px_rgba(99,102,241,0.2)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}>
                <Icon size={20} className={isActive ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : ""} />
                <span className="text-[10px] md:text-sm font-semibold tracking-wide">{label}</span>
              </Link>
            )
          })}
        </div>

        {/* Global Settings & Logout */}
        <div className="hidden md:flex flex-col gap-2 p-4 mt-auto border-t border-white/5">
          <button 
            onClick={onRequestKeys}
            className="flex items-center gap-3 w-full py-3 px-4 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl transition-all text-sm font-semibold border border-transparent">
            <Settings size={20} />
            <span>API Settings</span>
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 w-full py-3 px-4 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all text-sm font-semibold border border-transparent">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </nav>
      {/* Mobile top header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900/80 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 p-[1px]">
             <div className="w-full h-full bg-[#05070d] rounded-lg flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-cyan-300 font-black text-sm">C</div>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight glow-text">CampusFix</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onRequestKeys} className="text-slate-400 hover:text-white p-2"><Settings size={20} /></button>
          <button onClick={onLogout} className="text-red-400/80 hover:text-red-400 p-2"><LogOut size={20} /></button>
        </div>
      </div>
    </>
  );
};

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState(null);
  const [isBuddyOpen, setIsBuddyOpen] = useState(false);

  useEffect(() => {
    initDB();
    const currUser = getCurrentUser();
    if (currUser) setUser(currUser);
    // Disable forced API popup since key is baked into the service natively
    // if (!localStorage.getItem('campusFixGeminiKey')) {
    //   setShowSettings(true);
    // }
  }, []);

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  // If not logged in, render Login View solely
  if (!user) {
    return (
      <div className="min-h-screen font-sans">
        <LoginView onLoginSuccess={setUser} />
        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-transparent md:pl-64 flex flex-col pt-20 md:pt-0 pb-20 md:pb-0 font-sans">
        
        {/* Soft glowing horizon line */}
        <div className="fixed top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none z-[-1] blur-[40px]"></div>
        
        <Navigation user={user} onRequestKeys={() => setShowSettings(true)} onLogout={handleLogout} />
        
        <main className="flex-1 p-4 md:p-10 lg:p-16 max-w-7xl mx-auto w-full relative z-10 fade-in">
          <Routes>
            {/* Student Routes */}
            {user.role === 'student' && (
              <>
                <Route path="/" element={<StudentDashboard toggleAIBuddy={() => setIsBuddyOpen(true)} />} />
                <Route path="/submit" element={<SubmitView />} />
                <Route path="/track" element={<TrackView />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
            
            {/* Admin Routes */}
            {user.role === 'admin' && (
              <>
                <Route path="/" element={<Navigate to="/admin" replace />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/inbox" element={<DepartmentInboxView />} />
                <Route path="/routing" element={<RoutingTable />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </>
            )}
          </Routes>
        </main>

        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
        
        {/* AIBuddy Widget globally available to students */}
        {user.role === 'student' && (
           <AIBuddyWidget isOpen={isBuddyOpen} setIsOpen={setIsBuddyOpen} />
        )}

      </div>
    </Router>
  );
}
