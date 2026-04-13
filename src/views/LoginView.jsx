import React, { useState } from 'react';
import { User, Shield, GraduationCap, ArrowRight, ShieldAlert, Key } from 'lucide-react';
import { loginUser } from '../db';

export default function LoginView({ onLoginSuccess }) {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isShaking, setIsShaking] = useState(false);

  const triggerError = (msg) => {
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleStudentLogin = (e) => {
    e.preventDefault();
    if (!email) return triggerError("Email is required.");
    
    // Validate format ending with @iiitranchi.ac.in
    if (!email.endsWith('@iiitranchi.ac.in')) {
      return triggerError("Use your official IIIT Ranchi email.");
    }
    
    const prefix = email.split('@')[0]; // expected: name.yearugXXXX
    const parts = prefix.split('.');
    
    if (parts.length < 2 || !parts[1].includes('ug')) {
       return triggerError("Invalid college email format (e.g. name.yearugXXXX@...)");
    }

    const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const studentId = parts[1];

    const userObj = {
      role: "student",
      name: name,
      email: email,
      studentId: studentId,
      loginTime: new Date().toISOString()
    };

    loginUser(userObj);
    onLoginSuccess(userObj);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (!email) return triggerError("Email is required.");
    
    if (!email.endsWith('@iiitranchi.ac.in')) {
      return triggerError("Admin must use @iiitranchi.ac.in email.");
    }

    if (password === 'admin123') {
      const namePiece = email.split('@')[0].split('.')[0];
      const userObj = {
        role: "admin",
        name: namePiece.charAt(0).toUpperCase() + namePiece.slice(1) + " (Admin)",
        email: email,
        loginTime: new Date().toISOString()
      };
      loginUser(userObj);
      onLoginSuccess(userObj);
    } else {
      triggerError("Invalid credentials.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4 bg-transparent z-10 w-full overflow-hidden">
      {/* Dynamic Backgrounds */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 blur-[150px] rounded-full pointer-events-none z-[-1]"></div>
      
      <div className={`glass-panel w-full max-w-md p-8 md:p-10 rounded-3xl relative overflow-hidden transition-transform duration-300 ${isShaking ? 'translate-x-[-10px] sm:translate-x-[10px]' : ''}`} style={{ animation: isShaking ? 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both' : 'none' }}>
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 blur-[2px]"></div>

        <div className="text-center mb-8">
           <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 p-[1px] shadow-[0_0_20px_rgba(99,102,241,0.4)] mb-5">
             <div className="w-full h-full bg-[#05070d] rounded-2xl flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-cyan-300 font-black text-2xl">C</div>
           </div>
           <h1 className="text-3xl font-black text-white glow-text mb-2">CampusFix</h1>
           <p className="text-slate-400 font-medium">Log in to your personalized hub</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex p-1 bg-white/5 rounded-xl mb-8 border border-white/10 relative">
           <button 
             type="button"
             onClick={() => { setRole('student'); setError(null); }}
             className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all z-10 ${role === 'student' ? 'text-white' : 'text-slate-400 hover:text-slate-300'}`}
           >
             <GraduationCap size={16} /> Student
           </button>
           <button 
             type="button"
             onClick={() => { setRole('admin'); setError(null); }}
             className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all z-10 ${role === 'admin' ? 'text-white' : 'text-slate-400 hover:text-slate-300'}`}
           >
             <Shield size={16} /> Admin
           </button>
           
           {/* Tab Highlight Background */}
           <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-indigo-500/30 border border-indigo-500/50 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all duration-300 ${role === 'student' ? 'left-1' : 'left-[calc(50%+3px)]'}`}></div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 text-red-300 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl fade-in text-xs font-semibold shadow-[0_0_10px_rgba(248,113,113,0.1)]">
            <ShieldAlert size={16} className="shrink-0 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]" />
            <span>{error}</span>
          </div>
        )}

        {role === 'student' ? (
          <form onSubmit={handleStudentLogin} className="fade-in">
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Official College Email</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name.yearugXXXX@iiitranchi.ac.in"
                  className="w-full pl-11 pr-4 py-3.5 glass-input text-sm"
                />
              </div>
            </div>
            <button type="submit" className="w-full mt-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold py-3.5 px-6 rounded-xl transition-all transform hover:-translate-y-1 active:scale-95 border border-white/10 flex items-center justify-center gap-2 group shimmer-button">
              Continue as Student
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin} className="fade-in">
             <div className="mb-5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Admin Email</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin.name@iiitranchi.ac.in"
                  className="w-full pl-11 pr-4 py-3.5 glass-input text-sm"
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3.5 glass-input text-sm"
                />
              </div>
            </div>
            <button type="submit" className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2">
              Login as Administrator
              <ArrowRight size={18} />
            </button>
          </form>
        )}
        
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}} />
    </div>
  );
}
