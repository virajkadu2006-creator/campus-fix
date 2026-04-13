import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Send, X, ShieldAlert, CheckCircle2, Copy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { classifyComplaint, generateNotificationMessage } from '../aiService';
import { addComplaint, addInboxMessage, getDepartmentContact, getCurrentUser } from '../db';
import { sendEmailNotification } from '../emailService';
import { sendWhatsAppNotification } from '../whatsappService';
import { useNavigate } from 'react-router-dom';

const getCategoryColor = (cat) => {
  if (cat.includes("Bathroom")) return "text-teal-300 bg-teal-500/10 border-teal-400/30 shadow-[0_0_15px_rgba(45,212,191,0.2)]";
  if (cat.includes("Anti-Ragging")) return "text-red-300 bg-red-500/10 border-red-400/30 shadow-[0_0_15px_rgba(248,113,113,0.2)]";
  if (cat.includes("Mess")) return "text-amber-300 bg-amber-500/10 border-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.2)]";
  if (cat.includes("Academic")) return "text-blue-300 bg-blue-500/10 border-blue-400/30 shadow-[0_0_15px_rgba(96,165,250,0.2)]";
  if (cat.includes("Infrastructure")) return "text-purple-300 bg-purple-500/10 border-purple-400/30 shadow-[0_0_15px_rgba(192,132,252,0.2)]";
  return "text-slate-300 bg-slate-500/10 border-slate-400/30 shadow-[0_0_15px_rgba(148,163,184,0.2)]";
};

const getPriorityColor = (pri) => {
  if (pri === 'High') return 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]';
  if (pri === 'Medium') return 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]';
  return 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]';
};

export default function SubmitView() {
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState('');
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (description.length < 20) {
      setError("Please provide more details (minimum 20 characters)");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      setLoadingState('🤖 AI analyzing your complaint...');
      const result = await classifyComplaint(description, image);
      
      const trackingId = 'CP-' + Math.floor(1000 + Math.random() * 9000);
      
      const currentUser = getCurrentUser();
      
      const complaintData = {
        id: trackingId,
        description,
        imageBase64: image,
        ...result,
        status: "Submitted",
        submittedBy: currentUser?.studentId || 'unknown',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        adminResponse: null
      };

      addComplaint(complaintData);
      
      setLoadingState('🧠 Generating AI Department Mail...');
      // Generate the personalized department notification message
      const notificationMsg = await generateNotificationMessage(complaintData);
      addInboxMessage(complaintData.department, trackingId, notificationMsg);

      const contact = getDepartmentContact(complaintData.department);

      setLoadingState('📧 Dispatching Email...');
      await sendEmailNotification(contact, notificationMsg, complaintData.id);

      setLoadingState('📱 Dispatching WhatsApp Alert...');
      await sendWhatsAppNotification(contact, notificationMsg, complaintData.id);

      setSuccessData(complaintData);
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

    } catch (err) {
      console.error(err);
      setError("Failed to process complaint. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingState('');
    }
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto pt-16 lg:pt-24 fade-in">
        <div className="glass-panel p-8 md:p-10 rounded-3xl text-center mb-8 relative overflow-hidden group hover:shadow-[0_20px_50px_rgba(52,211,153,0.15)] transition-all duration-500">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80 blur-[2px]"></div>
          
          <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-8 fade-in shadow-[0_0_30px_rgba(52,211,153,0.2)]" style={{ animationDelay: '0.2s' }}>
            <CheckCircle2 className="text-emerald-400 w-10 h-10 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight drop-shadow-md">Complaint Submitted!</h2>
          <p className="text-slate-400 mb-10 text-lg">The AI has analyzed your issue and routed it to the correct department.</p>

          <div className="bg-white/[0.02] rounded-2xl p-6 md:p-8 border border-white/[0.05] text-left mb-10 shadow-inner group-hover:bg-white/[0.03] transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tracking ID</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl lg:text-4xl font-black glow-text tracking-tight">{successData.id}</span>
                  <button onClick={() => handleCopy(successData.id)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white relative">
                    <Copy size={20} />
                    {copied && <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white border border-white/20 text-xs py-1.5 px-3 rounded-lg font-medium fade-in shadow-xl">Copied!</span>}
                  </button>
                </div>
              </div>
              <div className="text-left md:text-right">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 border ${getCategoryColor(successData.category)}`}>
                  {successData.category}
                </span>
                <div className="mt-3 flex items-center md:justify-end gap-2.5">
                  <span className="text-xs font-medium text-slate-400">Priority:</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${getPriorityColor(successData.priority)}`}></span>
                  <span className="text-sm font-bold text-slate-200">{successData.priority}</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Confidence Score</span>
                 <span className="text-sm font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{successData.confidence}%</span>
               </div>
               <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden border border-slate-800">
                 <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 animate-w-fill rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]" style={{ width: `${successData.confidence}%` }}></div>
               </div>
            </div>

            <div className={`p-5 rounded-2xl border text-sm leading-relaxed mb-6 font-medium shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] ${successData.isFallback ? 'bg-amber-500/10 text-amber-100 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-100 border-indigo-500/20'}`}>
              <span className={`font-bold mr-2 ${successData.isFallback ? 'text-amber-300' : 'text-indigo-300'}`}>
                {successData.isFallback ? '⚠️ AI Fallback Reasoning:' : 'AI Reasoning:'}
              </span> 
              <span className="text-slate-300">"{successData.reasoning}"</span>
            </div>

            {!successData.isFallback && (
              <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold fade-in">
                <CheckCircle2 size={14} />
                AI successfully analyzed your complaint
              </div>
            )}

            <div className="pt-6 border-t border-white/10">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Routed To</span>
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                 <span className="font-bold text-white text-lg tracking-wide drop-shadow-sm">{successData.department}</span>
                 <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.1)]">
                   <Send size={14} />
                   Notification Delivered
                 </span>
               </div>
            </div>
          </div>

          <button 
            onClick={() => navigate('/track')}
            className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold py-4 px-6 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all transform hover:-translate-y-1 active:scale-95 border border-white/10 shimmer-button"
          >
            Track My Complaint
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 lg:py-20 relative">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none z-[-1]"></div>
      
      <div className="mb-10 text-center flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-lg leading-tight">
          Your Campus, <br className="md:hidden" /><span className="glow-text">Powered by AI Intelligence</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-xl font-medium">Describe the issue in detail. Our AI will automatically categorize and route it instantly.</p>
      </div>

      <div className="glass-panel p-6 md:p-10 rounded-3xl relative hover:shadow-[0_15px_40px_rgba(99,102,241,0.1)] transition-all duration-500">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-50"></div>
        
        <div className="mb-8 relative group">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={isLoading}
            placeholder="E.g., The bathroom on the 3rd floor of the computer science block has no running water since morning..."
            className={`w-full min-h-[180px] p-5 rounded-2xl border ${error && description.length < 20 ? 'border-red-500/50 focus:ring-red-500/20' : ''} glass-input resize-y disabled:opacity-50`}
          ></textarea>
          <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-500 bg-[#05070d]/50 px-2 py-1 rounded-md backdrop-blur-sm">
            {description.length} / 500+
          </div>
        </div>
        
        {error && (
           <div className="mb-6 flex items-center gap-3 text-red-300 bg-red-500/10 border border-red-500/20 px-5 py-4 rounded-xl fade-in text-sm font-semibold shadow-[0_0_15px_rgba(248,113,113,0.1)]">
              <ShieldAlert size={20} className="drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]" />
              {error}
           </div>
        )}

        <div className="flex flex-col sm:flex-row gap-5 mb-10">
          <div className="flex-1">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden" 
              disabled={isLoading}
            />
            {!image ? (
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 border border-dashed border-white/20 rounded-2xl text-slate-400 hover:border-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/5 transition-all disabled:opacity-50 font-semibold bg-white/[0.01]"
              >
                <Camera size={22} className="group-hover:scale-110 transition-transform" />
                Attach Photo Evidence
              </button>
            ) : (
              <div className="relative inline-block w-full sm:w-auto mt-2 fade-in group">
                <img src={image} alt="Preview" className="h-28 w-28 object-cover rounded-2xl shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10" />
                <button 
                  onClick={() => setImage(null)}
                  disabled={isLoading}
                  className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-[0_0_10px_rgba(248,113,113,0.5)] hover:bg-red-400 hover:scale-110 transition-all z-10"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isLoading || description.length === 0}
          className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold text-lg py-5 px-6 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] transition-all transform hover:-translate-y-1 active:scale-95 border border-white/10 group group-disabled:pointer-events-none disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] flex items-center justify-center gap-3 relative shimmer-button"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span className="animate-pulse tracking-wide font-semibold">{loadingState}</span>
            </>
          ) : (
            <>
              <span className="tracking-wide">Submit & Analyze</span>
              <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
