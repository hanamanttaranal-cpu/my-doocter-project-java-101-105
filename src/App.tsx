import React, { useState, useEffect, useRef } from 'react';
import { 
  HeartPulse, 
  Search, 
  Calendar, 
  MessageSquare, 
  Upload, 
  Shield, 
  Users, 
  Activity, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Send, 
  Sparkles, 
  Code2, 
  Terminal, 
  Folder, 
  FileCode, 
  Download, 
  ChevronRight, 
  Menu, 
  Star, 
  Filter, 
  User, 
  ChevronDown,
  ArrowRight,
  RefreshCw,
  Mail,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces mapping to backend Java Models
interface Doctor {
  id: number;
  fullName: string;
  email: string;
  specialization: string;
  yearsOfExperience: number;
  biography: string;
  profileImageUrl: string;
  certificatesUrl: string;
  rating: number;
  isBlocked: boolean;
  availabilitySchedule: string;
  consultationFee: number;
}

interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  specialization: string;
  date: string;
  notes: string;
  status: string;
  medicalReportUrl: string;
}

interface ChatMessage {
  id: number;
  appointmentId: number;
  senderId: number;
  senderName: string;
  text: string;
  timestamp: string;
  type: string;
}

interface TriageResult {
  specialty: string;
  urgency: 'Low' | 'Medium' | 'High';
  insights: string;
  questionsToAsk: string[];
}

export default function App() {
  // Navigation / Workspace portals selection
  // PORTALS: 'patient' | 'doctor' | 'admin' | 'devops'
  const [activePortal, setActivePortal] = useState<'patient' | 'doctor' | 'admin' | 'devops'>('patient');
  
  // User Authentication State
  const [user, setUser] = useState<{ id: number; fullName: string; email: string; role: string; token: string; profileImageUrl: string } | null>({
    id: 1,
    fullName: "John Carter",
    email: "patient@mediconnect.pro",
    role: "PATIENT",
    token: "dummy_jwt_token_1",
    profileImageUrl: ""
  });

  // Global Loaded State Lists
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>([]);
  const [chatMessagesList, setChatMessagesList] = useState<ChatMessage[]>([]);
  const [activeChatAppointment, setActiveChatAppointment] = useState<Appointment | null>(null);
  
  // Doctor filtering states
  const [specFilter, setSpecFilter] = useState<string>('All');
  const [expFilter, setExpFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Symptom Triage State
  const [symptomInput, setSymptomInput] = useState<string>('');
  const [isTriaging, setIsTriaging] = useState<boolean>(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookDate, setBookDate] = useState<string>('');
  const [bookNotes, setBookNotes] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Chat conversation state
  const [enteredMessage, setEnteredMessage] = useState<string>('');
  const [isDoctorTyping, setIsDoctorTyping] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // DevOps File Explorer state
  const [devopsFiles, setDevopsFiles] = useState<any[]>([]);
  const [selectedDevFile, setSelectedDevFile] = useState<any | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['backend', 'backend/doctor-service', 'backend/doctor-service/src', 'backend/docker']);

  // Admin platform stats state
  const [adminStats, setAdminStats] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initial Data fetchers
  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
    fetchDevopsFiles();
    fetchAdminStats();
  }, [user, activePortal]);

  useEffect(() => {
    if (activeChatAppointment) {
      fetchChatMessages(activeChatAppointment.id);
    }
  }, [activeChatAppointment]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessagesList, isDoctorTyping]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // --- API Integrations ---

  const fetchDoctors = async () => {
    try {
      const url = `/api/doctors?specialization=${specFilter}&minExp=${expFilter}&query=${searchQuery}`;
      const res = await fetch(url);
      const data = await res.json();
      setDoctorsList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAppointments = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/appointments?userId=${user.id}&role=${user.role}`);
      const data = await res.json();
      setAppointmentsList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChatMessages = async (aid: number) => {
    try {
      const res = await fetch(`/api/chat?appointmentId=${aid}`);
      const data = await res.json();
      setChatMessagesList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDevopsFiles = async () => {
    try {
      const res = await fetch('/api/backend-files');
      const data = await res.json();
      setDevopsFiles(data);
      // Pre-select first file if not selected
      if (data.length > 0 && !selectedDevFile) {
        setSelectedDevFile(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/admin/analytics');
      const data = await res.json();
      setAdminStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Run secure Gemini-powered symptom triage
  const handleAITriage = async () => {
    if (!symptomInput.trim()) {
      showToast("Please enter some symptoms first.");
      return;
    }
    setIsTriaging(true);
    setTriageResult(null);
    try {
      const res = await fetch('/api/gemini/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: symptomInput })
      });
      const data = await res.json();
      if (data.triageResult) {
        setTriageResult(data.triageResult);
        showToast("Gemini AI clinical triage evaluation successfully compiled.");
      } else {
        showToast("Rate-limited. Falling back to local assessment.");
      }
    } catch (err) {
      showToast("Triage service currently busy. Please retry shortly.");
    } finally {
      setIsTriaging(false);
    }
  };

  // Cloudinary Simulated File uploader
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadedFileName(file.name);
    try {
      const res = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type })
      });
      const data = await res.json();
      setUploadedUrl(data.secure_url);
      showToast("Attachment secure storage successfully routed via Cloudinary simulation.");
    } catch (e) {
      showToast("Attachment upload error.");
    } finally {
      setIsUploading(false);
    }
  };

  // Confirm booking
  const handleConfirmBooking = async () => {
    if (!user || !selectedDoctor) return;
    if (!bookDate) {
      showToast("Please select a convenient clinical appointment date.");
      return;
    }
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: user.id,
          doctorId: selectedDoctor.id,
          date: bookDate,
          notes: bookNotes,
          medicalReportUrl: uploadedFileName
        })
      });
      if (res.ok) {
        showToast("Appointment consultation request securely dispatched.");
        setIsBookingOpen(false);
        setBookDate('');
        setBookNotes('');
        setUploadedFileName('');
        setUploadedUrl('');
        fetchAppointments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!enteredMessage.trim() || !activeChatAppointment || !user) return;
    
    const patientMsg = {
      appointmentId: activeChatAppointment.id,
      senderId: user.id,
      senderName: user.fullName,
      text: enteredMessage
    };

    setEnteredMessage('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientMsg)
      });
      const saved = await res.json();
      
      // Update message list
      setChatMessagesList(prev => [...prev, saved]);
      
      // Simulate doctor typing & reply
      setIsDoctorTyping(true);
      setTimeout(() => {
        setIsDoctorTyping(false);
        // Refresh chat messages to pull doctor's automated reply
        fetchChatMessages(activeChatAppointment.id);
      }, 2100);

    } catch (e) {
      console.error(e);
    }
  };

  // Doctor approving appointments
  const handleApproveAppointment = async (aptId: number, status: string) => {
    try {
      const res = await fetch(`/api/appointments/${aptId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`Consultation request has been successfully ${status}.`);
        fetchAppointments();
        fetchAdminStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Admin toggling doctor blocking status
  const handleToggleBlockDoctor = async (docId: number) => {
    try {
      const res = await fetch('/api/admin/toggle-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: docId })
      });
      if (res.ok) {
        showToast("Physician license status updated successfully.");
        fetchDoctors();
        fetchAdminStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper trigger to search doctors suggested by AI
  const applyAITriageFilter = (spec: string) => {
    setSpecFilter(spec);
    showToast(`Filtering directory for ${spec} specialists.`);
    setTimeout(() => {
      const dirElement = document.getElementById('doctor-directory-pane');
      if (dirElement) {
        dirElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Recursively render visual folders for DevOps section
  const renderDevFolder = (item: any) => {
    if (item.type === 'file') {
      const isSelected = selectedDevFile?.path === item.path;
      return (
        <div 
          key={item.path}
          onClick={() => setSelectedDevFile(item)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition text-xs font-mono select-none ${isSelected ? 'bg-indigo-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'}`}
        >
          <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{item.name}</span>
        </div>
      );
    }

    const folderId = item.name;
    const isExpanded = expandedFolders.includes(folderId);

    return (
      <div key={item.name} className="mt-1">
        <div 
          onClick={() => {
            if (isExpanded) {
              setExpandedFolders(prev => prev.filter(f => f !== folderId));
            } else {
              setExpandedFolders(prev => [...prev, folderId]);
            }
          }}
          className="flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span>{item.name}</span>
          </div>
          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
        </div>
        {isExpanded && item.children && (
          <div className="pl-4 ml-1.5 border-l border-slate-800 mt-0.5 space-y-0.5">
            {item.children.map((child: any) => renderDevFolder(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="mediconnect-main-canvas" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl flex items-center gap-2.5 z-50 border border-slate-700"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Portal Selector Rail */}
      <div className="w-full bg-slate-900 text-slate-100 py-2.5 px-4 sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <HeartPulse className="w-5 h-5 text-rose-500 animate-pulse" />
            <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
              MediConnect <span className="text-xs bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold">PRO</span>
            </span>
          </div>

          {/* Selector Tabs */}
          <div className="flex items-center flex-wrap gap-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
            <button 
              onClick={() => { setActivePortal('patient'); setUser({ id: 1, fullName: "John Carter", email: "patient@mediconnect.pro", role: "PATIENT", token: "jwt_tok", profileImageUrl: "" }); }}
              className={`text-[11px] px-3 py-1 rounded transition duration-150 font-medium cursor-pointer ${activePortal === 'patient' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              🟢 Patient Portal
            </button>
            <button 
              onClick={() => { setActivePortal('doctor'); setUser({ id: 2, fullName: "Dr. Sarah Jenkins", email: "doctor@mediconnect.pro", role: "DOCTOR", token: "jwt_tok", profileImageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250" }); }}
              className={`text-[11px] px-3 py-1 rounded transition duration-150 font-medium cursor-pointer ${activePortal === 'doctor' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              🔵 Doctor Console
            </button>
            <button 
              onClick={() => { setActivePortal('admin'); setUser({ id: 3, fullName: "Director Vance", email: "admin@mediconnect.pro", role: "ADMIN", token: "jwt_tok", profileImageUrl: "" }); }}
              className={`text-[11px] px-3 py-1 rounded transition duration-150 font-medium cursor-pointer ${activePortal === 'admin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              🟣 Admin Panel
            </button>
            <button 
              onClick={() => { setActivePortal('devops'); }}
              className={`text-[11px] px-3 py-1 rounded transition duration-150 font-medium cursor-pointer ${activePortal === 'devops' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              🛠️ Spring Boot & DevOps Code
            </button>
          </div>

          {/* Active Persona Badge */}
          <div className="hidden md:flex items-center gap-2 text-slate-300 text-xs">
            {user ? (
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded border border-slate-700">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                <span>Role: <strong className="text-white">{user.role}</strong> ({user.fullName})</span>
              </div>
            ) : (
              <span>Guest Session</span>
            )}
          </div>
        </div>
      </div>

      {/* Primary Layout Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">

        {/* 1. PATIENT PORTAL PORTLET */}
        {activePortal === 'patient' && (
          <div className="space-y-8">
            
            {/* Header Jumbotron */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 rounded-full translate-x-12 -translate-y-12 -z-10 blur-3xl opacity-30"></div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <HeartPulse className="w-3.5 h-3.5" />
                  Hi, John! Your health overview is active.
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Welcome to MediConnect Pro
                </h1>
                <p className="text-sm text-slate-500 max-w-xl">
                  Consult securely with top certified cardiologists, neurologists, and clinical general practitioners inside our integrated hospital dashboard.
                </p>
              </div>
              
              {/* Quick statistics widgets */}
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-800">{appointmentsList.length}</div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Consultations</div>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-800">Gemini</div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Triage Assist</div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Patient Symptom Triage Box (Gemini SDK integration) */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1 bg-white/10 text-indigo-300 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    AI Triage Clinical Engine
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">AI diagnostic Consultation Assistant</h2>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                    Powered server-side by <strong>Gemini 3.5 Flash</strong>. Insert details regarding what hurts, where it flares up, any irritation or fever. Instantly receive specialty recommendations and pre-consultation inquiries.
                  </p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 hidden md:block">
                  <HeartPulse className="w-8 h-8 text-rose-500 animate-pulse" />
                </div>
              </div>

              {/* Symptom checker inputs */}
              <div className="mt-5 space-y-4">
                <div className="relative">
                  <textarea 
                    rows={3}
                    placeholder="e.g. I have persistent mild chest discomfort and a feeling of irregular heart vibrations during fast evening walks. Is it typical or highly urgent?"
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                  ></textarea>
                </div>
                
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-400" /> Secure Clinical assessment. Always consult certified care paths.
                  </span>
                  <button
                    onClick={handleAITriage}
                    disabled={isTriaging}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg transition duration-150 cursor-pointer"
                  >
                    {isTriaging ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Analyzing Clinical Indicators...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Process Symptom Triage
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Triage assessment response container */}
              <AnimatePresence>
                {triageResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-5 bg-slate-950/80 border border-indigo-500/30 rounded-xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase text-slate-400 font-bold tracking-wider">Suggested Specialty:</span>
                        <span className="text-xs font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{triageResult.specialty}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase text-slate-400 font-bold tracking-wider">Estimated Urgency:</span>
                        <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                          triageResult.urgency === 'High' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                          triageResult.urgency === 'Medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {triageResult.urgency}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-slate-300">Detailed Educational Insights</h4>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono">{triageResult.insights}</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-400" />
                        Standard Checklist: 3 Questions to Ask Your Doctor
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {triageResult.questionsToAsk.map((q, idx) => (
                          <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-300 font-mono flex gap-2">
                            <span className="text-indigo-400 font-bold">0{idx+1}.</span>
                            <span>{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-2 border-t border-slate-800">
                      <button
                        onClick={() => applyAITriageFilter(triageResult.specialty)}
                        className="text-xs bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg border border-indigo-500/20 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        Search {triageResult.specialty} Specialists Now <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Doctors Lookup & Book Appointments Directory */}
            <div id="doctor-directory-pane" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Consult Verified Platform Doctors</h3>
                  <p className="text-xs text-slate-400">Search credentials, reviews, and clinical biodata to request appointment approvals.</p>
                </div>

                {/* Filter and select settings */}
                <div className="flex items-center flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600">
                    <Filter className="w-3.5 h-3.5" />
                    <select 
                      value={specFilter} 
                      onChange={(e) => { setSpecFilter(e.target.value); setTimeout(() => fetchDoctors(), 50); }}
                      className="bg-transparent focus:outline-none focus:no-ring font-medium select-none cursor-pointer"
                    >
                      <option value="All">All Specialties</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="General Physician">General Physician</option>
                      <option value="Orthopedics">Orthopedics</option>
                    </select>
                  </div>

                  <input 
                    type="text" 
                    placeholder="Search doctor name..." 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setTimeout(() => fetchDoctors(), 50); }}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Grid listing */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {doctorsList.length > 0 ? (
                  doctorsList.map((doc) => (
                    <div key={doc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <img 
                            src={doc.profileImageUrl} 
                            alt={doc.fullName} 
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100"
                          />
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                              {doc.fullName}
                              <span className="text-[9px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">BOARD RECENT</span>
                            </h4>
                            <div className="text-[10px] text-indigo-600 font-bold tracking-wide uppercase mt-0.5">{doc.specialization}</div>
                            
                            {/* Stars rating */}
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <strong className="text-slate-800">{doc.rating}</strong> ({doc.yearsOfExperience} Years Exp)
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                          {doc.biography}
                        </p>

                        <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" /> {doc.availabilitySchedule}
                          </span>
                          <span className="font-extrabold text-slate-900">${doc.consultationFee} fee</span>
                        </div>
                      </div>

                      <button
                        onClick={() => { setSelectedDoctor(doc); setIsBookingOpen(true); }}
                        className="w-full bg-slate-900 hover:bg-indigo-600 text-white text-xs py-2 rounded-lg font-medium transition cursor-pointer"
                      >
                        Request Appointment
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400 space-y-2">
                    <Users className="w-8 h-8 mx-auto text-slate-300" />
                    <div>No active platform clinicians matched the query.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Existing Patient Appointments Track List & Live Chat triggers */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Your Consultations Queue & Chatrooms</h3>
              
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Physician Consultant</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Desired Date</th>
                      <th className="p-4">Reports attached</th>
                      <th className="p-4">Status Code</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointmentsList.length > 0 ? (
                      appointmentsList.map((apt) => (
                        <tr key={apt.id} className="hover:bg-slate-50">
                          <td className="p-4 font-extrabold text-slate-800">{apt.doctorName}</td>
                          <td className="p-4">{apt.specialization}</td>
                          <td className="p-4 font-mono">{apt.date}</td>
                          <td className="p-4">
                            {apt.medicalReportUrl ? (
                              <span className="text-[10px] bg-slate-100 hover:bg-slate-200 p-1.5 rounded inline-flex items-center gap-1 font-mono text-slate-600">
                                <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                                {apt.medicalReportUrl}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">None attached</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              apt.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" :
                              apt.status === "Rejected" ? "bg-rose-50 text-rose-700 border border-rose-200/50" :
                              "bg-amber-50 text-amber-700 border border-amber-200/50"
                            }`}>
                              {apt.status === "Approved" ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> :
                               apt.status === "Rejected" ? <XCircle className="w-3 h-3 text-rose-500" /> :
                               <Clock className="w-3 h-3 text-amber-500" />}
                              {apt.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {apt.status === "Approved" ? (
                              <button
                                onClick={() => setActiveChatAppointment(apt)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 ml-auto transition cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> Start Live Chat
                              </button>
                            ) : (
                              <button 
                                disabled
                                className="bg-slate-100 text-slate-400 text-[10px] px-3 py-1.5 rounded-lg italic cursor-not-allowed ml-auto"
                              >
                                Locks till Approval
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          No historical consultation bookings found. Search doctors above to secure approvals.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dynamic Simulated WhatsApp Chat Interface */}
            <AnimatePresence>
              {activeChatAppointment && (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[500px]"
                >
                  {/* Left Side: Consultation roster list */}
                  <div className="border-r border-slate-100 bg-slate-50 flex flex-col justify-between">
                    <div>
                      <div className="p-4 border-b border-slate-200 bg-white">
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Ongoing Clinic Dialogs</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Approved clinic communication pathways</p>
                      </div>
                      
                      <div className="p-2 space-y-1">
                        <div className="flex items-center gap-3 p-3 bg-white border border-slate-200/85 rounded-xl cursor-pointer">
                          <img 
                            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250" 
                            alt="avatar" 
                            className="w-9 h-9 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 truncate">{activeChatAppointment.doctorName}</span>
                              <span className="text-[9px] text-slate-400 font-mono">10:17 AM</span>
                            </div>
                            <p className="text-[10px] text-indigo-600 font-extrabold tracking-wide uppercase truncate">{activeChatAppointment.specialization}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 font-mono text-[9px] text-slate-400 uppercase tracking-wider bg-slate-50 flex items-center justify-between">
                      <span>Simulated STOMP over WS</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </div>
                  </div>

                  {/* Right Side: Chat box dialog */}
                  <div className="md:col-span-2 flex flex-col justify-between bg-slate-50">
                    
                    {/* Header info */}
                    <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250" 
                          alt="avatar" 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                            {activeChatAppointment.doctorName}
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                          </h4>
                          <p className="text-[10px] text-slate-400">Consultation ID:MC-A0{activeChatAppointment.id} | Active Online</p>
                        </div>
                      </div>

                      <button 
                        onClick={() => setActiveChatAppointment(null)}
                        className="text-slate-400 hover:text-slate-600 text-xs py-1 px-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        Exit Chat
                      </button>
                    </div>

                    {/* Chat dialog logs */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[350px]">
                      {chatMessagesList.map((m) => {
                        const isDoctor = m.senderId === 2; // Simulated Doctor ID
                        return (
                          <div 
                            key={m.id} 
                            className={`flex flex-col max-w-[80%] ${isDoctor ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                          >
                            <span className="text-[9px] font-bold text-slate-400 px-1 mb-0.5">{m.senderName}</span>
                            <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                              isDoctor 
                                ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none' 
                                : 'bg-emerald-600 text-white rounded-tr-none shadow-sm'
                            }`}>
                              {m.text}
                            </div>
                            <span className="text-[8px] text-slate-400 font-mono px-1 mt-0.5">{m.timestamp}</span>
                          </div>
                        );
                      })}

                      {/* Doctor typing animation simulation */}
                      {isDoctorTyping && (
                        <div className="flex flex-col mr-auto items-start max-w-[80%]">
                          <span className="text-[9px] font-bold text-slate-400 px-1 mb-0.5">{activeChatAppointment.doctorName}</span>
                          <div className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-none text-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-100"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-200"></span>
                            <span className="italic text-[10px] text-slate-400 ml-1">Evaluating clinical parameters...</span>
                          </div>
                        </div>
                      )}
                      
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Messages dispatch input tool */}
                    <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Write standard message to your physician..." 
                        value={enteredMessage}
                        onChange={(e) => setEnteredMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        onClick={handleSendMessage}
                        className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition cursor-pointer shadow-md shadow-emerald-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}

        {/* 2. CLINICIAN / DOCTOR PORTAL WORKSPACE */}
        {activePortal === 'doctor' && (
          <div className="space-y-8">
            
            {/* Header banner */}
            <div className="bg-sky-900 text-white p-6 rounded-2xl flex items-center justify-between flex-wrap gap-4 shadow-sm border border-sky-800">
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded inline-block text-sky-200">
                  Verified Doctor Console
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight">Active Duty: Dr. Sarah Jenkins</h1>
                <p className="text-xs text-sky-100 max-w-lg font-mono">
                  Review incoming requests, manage scheduling checklists, join approved online conversation streams, and inspect patient clinical files.
                </p>
              </div>

              {/* Quick summaries stats */}
              <div className="flex items-center gap-3">
                <div className="bg-white/10 px-4 py-2.5 rounded-xl text-center border border-white/5">
                  <div className="text-lg font-extrabold">{appointmentsList.filter(a => a.status === 'Pending').length}</div>
                  <div className="text-[9px] uppercase tracking-wider text-sky-200">Pending Req</div>
                </div>
                <div className="bg-white/10 px-4 py-2.5 rounded-xl text-center border border-white/5">
                  <div className="text-lg font-extrabold">{appointmentsList.filter(a => a.status === 'Approved').length}</div>
                  <div className="text-[9px] uppercase tracking-wider text-sky-200">Active Consult</div>
                </div>
              </div>
            </div>

            {/* Main Action layout split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Waiting Consult requests desk */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-md font-bold text-slate-900 flex items-center gap-1.5">
                  Incoming Patient Consultation Requests ({appointmentsList.filter(a => a.status === 'Pending').length})
                </h3>

                <div className="space-y-3.5">
                  {appointmentsList.filter(a => a.status === 'Pending').length > 0 ? (
                    appointmentsList.filter(a => a.status === 'Pending').map((apt) => (
                      <div key={apt.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="text-xs font-extrabold text-slate-800">Patient Subject Name: {apt.patientName}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">Dispatched: {apt.date} | Request ID: MC-ST{apt.id}</p>
                          </div>
                          
                          {/* File badge if exists */}
                          {apt.medicalReportUrl && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded inline-flex items-center gap-1 font-mono hover:bg-slate-200">
                              <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                              {apt.medicalReportUrl}
                            </span>
                          )}
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs leading-relaxed font-mono text-slate-600">
                          {apt.notes}
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-50 pt-3">
                          <button
                            onClick={() => handleApproveAppointment(apt.id, 'Rejected')}
                            className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-1.5 rounded-lg border border-rose-200/50 transition cursor-pointer"
                          >
                            Reject Consultation
                          </button>
                          <button
                            onClick={() => handleApproveAppointment(apt.id, 'Approved')}
                            className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-4 py-1.5 rounded-lg transition cursor-pointer shadow"
                          >
                            Approve & Register Chat
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                      <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                      There are no consultation pending requests on file. Good job!
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Availability control & rating credentials check */}
              <div className="space-y-4">
                <h3 className="text-md font-bold text-slate-900">Clinician Credentials & Schedule</h3>

                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="text-center pb-4 border-b border-slate-100">
                    <img 
                      src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250" 
                      alt="Sarah Jenkins" 
                      className="w-16 h-16 rounded-full object-cover mx-auto ring-4 ring-sky-50"
                    />
                    <h4 className="text-xs font-extrabold text-slate-900 mt-2">Dr. Sarah Jenkins</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest block w-max mx-auto mt-1">CARDIOLOGIST</span>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Availability:</span>
                      <span className="font-mono text-slate-700 font-medium">Mon-Wed 09:00-15:00</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Consultation Fee:</span>
                      <strong className="text-slate-800">$150.00 / session</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Clinic Rank:</span>
                      <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                        ⭐ 4.9 <span className="text-[9px] text-slate-400 font-normal ml-1">(120 reviews)</span>
                      </span>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Verification Board</h5>
                    <div className="p-3 bg-emerald-50 rounded-lg text-[11px] text-emerald-800 font-mono border border-emerald-100 leading-normal flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>Your cardiothoracic certificates have been validated by Admin Board on 2026-05-21Z. Status: ACTIVE DUTY.</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 3. PLATFORM ADMIN MODULE SECTION */}
        {activePortal === 'admin' && (
          <div className="space-y-8">
            
            {/* Header */}
            <div className="bg-indigo-900 text-white p-6 rounded-2xl flex items-center justify-between flex-wrap gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="text-[9.5px] font-bold tracking-wider uppercase bg-white/20 p-1 rounded inline-block text-indigo-200">
                  Superuser Command Center
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight">MediConnect Board Administration</h1>
                <p className="text-xs text-indigo-100 max-w-lg font-mono">
                  Perform physician audits, moderate patient reviews, lock/block accounts, and view dynamic weekly appointment charts.
                </p>
              </div>
            </div>

            {/* platform KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Platform Users Registered</span>
                <div className="text-2xl font-extrabold text-slate-900">{adminStats?.summary.totalUsers || 3} Users</div>
                <p className="text-[9px] text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Real-time MySQL sync active
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Commissioned Doctors</span>
                <div className="text-2xl font-extrabold text-slate-900">{doctorsList.length} Doctors</div>
                <p className="text-[9px] text-slate-400">Across 5 disease specialties</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Total Consultations</span>
                <div className="text-2xl font-extrabold text-slate-900">{appointmentsList.length} Bookings</div>
                <p className="text-[9px] text-amber-600 font-bold">2 in active queue</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">System Revenue Gross</span>
                <div className="text-2xl font-extrabold text-slate-900">
                  ${appointmentsList.filter(a => a.status === 'Approved').length * 150} USD
                </div>
                <p className="text-[9px] text-emerald-600 font-medium">Approved clinical fees</p>
              </div>
            </div>

            {/* Dynamic Charts visual placeholders (using pure responsive SVG layout for maximum robustness & aesthetic) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Weekly Consultations Traffic</span>
                  <span className="text-[10px] font-mono text-indigo-500">Weekly count</span>
                </div>
                
                {/* Custom SVG Line Chart */}
                <div className="h-44 flex items-end justify-between border-b border-l border-slate-200 pb-2 pl-2 pt-4">
                  {[8, 12, 15, 11, 18, 6, 4].map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group px-1">
                      <span className="text-[9px] font-mono text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition duration-150">{v}</span>
                      <div 
                        className="w-full bg-slate-900 group-hover:bg-indigo-600 rounded-t transition-all duration-300"
                        style={{ height: `${(v / 18) * 100}%` }}
                      ></div>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Disease Specialty Distribution</span>
                  <span className="text-[10px] font-mono text-emerald-500">Verification load</span>
                </div>
                
                {/* Bar display */}
                <div className="space-y-2.5 h-44 flex flex-col justify-center">
                  {[
                    { spec: "Cardiology", count: 3 },
                    { spec: "Neurology", count: 2 },
                    { spec: "Dermatology", count: 1 },
                    { spec: "General Physician", count: 4 }
                  ].map((v, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-700">{v.spec}</span>
                        <span className="font-mono text-slate-500 font-medium">{v.count} clinicians</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(v.count / 4) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Platform Doctors Moderation List */}
            <div className="space-y-4">
              <h3 className="text-md font-bold text-slate-900">Physicians Registration Registry</h3>
              
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Physician Consultant</th>
                      <th className="p-4">Clinic Email</th>
                      <th className="p-4">Specialty Category</th>
                      <th className="p-4">Experience Rank</th>
                      <th className="p-4">Security Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doctorsList.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="p-4 flex items-center gap-2">
                          <img src={doc.profileImageUrl} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
                          <span className="font-extrabold text-slate-800">{doc.fullName}</span>
                        </td>
                        <td className="p-4 font-mono">{doc.email}</td>
                        <td className="p-4 font-medium text-emerald-700">{doc.specialization}</td>
                        <td className="p-4 font-mono">{doc.yearsOfExperience} Years of practice</td>
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleBlockDoctor(doc.id)}
                            className={`px-2.5 py-1 text-[10px] rounded border transition font-bold font-mono cursor-pointer ${
                              doc.isBlocked 
                                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" 
                                : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            {doc.isBlocked ? "❌ SUSPENDED (Block)" : "✅ ACTIVE LICENSED"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 4. DEVOPS & SPRING BOOT SOURCE CODE EXPLORER */}
        {activePortal === 'devops' && (
          <div className="space-y-6">
            
            {/* Description head */}
            <div className="bg-indigo-950 text-slate-100 p-6 rounded-2xl border border-indigo-900 shadow-lg space-y-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <span className="text-xs uppercase tracking-widest font-extrabold text-indigo-300">Java Microservice Project Scaffold Explorer</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">MediConnect Pro Production Code & Assets</h1>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed font-mono">
                Inspect physical Java 17, Spring Boot 3 configurations with JWT Token Authentication filters, Dockerfiles, docker-compose orchestration, and Jenkins pipelines. Select any file to access pristine downloadable codes.
              </p>
            </div>

            {/* Split layout: Tree + Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Directories filetree */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 min-h-[450px] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-3 px-3">Microservices Workspace Root</h3>
                  
                  <div className="space-y-1">
                    {devopsFiles.map((item) => renderDevFolder(item))}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-400 font-mono mt-4">
                  🎯 Click any java class or descriptor to fetch raw code block.
                </div>
              </div>

              {/* Right Column: Code viewer display terminal */}
              <div className="lg:col-span-2 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-[450px]">
                
                {/* Tab header */}
                <div className="bg-slate-900 text-slate-200 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-semibold text-white">
                      {selectedDevFile ? selectedDevFile.path : 'None Selected'}
                    </span>
                  </div>

                  {selectedDevFile && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedDevFile.content);
                        showToast("Raw source code copied successfully to system clipboard.");
                      }}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-700 transition flex items-center gap-1 cursor-pointer font-mono font-medium"
                    >
                      <Download className="w-3 h-3" /> Copy Code
                    </button>
                  )}
                </div>

                {/* Dark workspace console */}
                <div className="flex-1 p-4 overflow-auto max-h-[420px] font-mono text-xs text-indigo-200 leading-relaxed bg-[#0c1017]">
                  {selectedDevFile ? (
                    <pre className="whitespace-pre">
                      <code>{selectedDevFile.content}</code>
                    </pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-12">
                      <Code2 className="w-8 h-8 text-slate-600" />
                      <span>Select a codebase target in the directory tree on the left to review architecture.</span>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* --- Patient Clinical Booking Modal Dialog --- */}
      <AnimatePresence>
        {isBookingOpen && selectedDoctor && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl p-6 space-y-5"
            >
              
              {/* Doctor details head */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <img 
                  src={selectedDoctor.profileImageUrl} 
                  alt={selectedDoctor.fullName} 
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">Booking: {selectedDoctor.fullName}</h4>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide">{selectedDoctor.specialization}</p>
                </div>
              </div>

              {/* Form Input elements */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consultation Target Date</label>
                  <input 
                    type="date" 
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <span className="text-[9px] text-slate-400">Consultant hours: {selectedDoctor.availabilitySchedule}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Health Symptoms Description notes</label>
                  <textarea 
                    rows={3} 
                    placeholder="Describe symptoms, duration of fever, discomfort indicators, or historical medication files..."
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-none"
                  ></textarea>
                </div>

                {/* Cloudinary Drag/Drop simulated attachment box */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upload Medical Records / Reports (Cloudinary Integrated)</label>
                  
                  <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center text-xs text-slate-500 space-y-2 relative">
                    <input 
                      type="file" 
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    
                    {isUploading ? (
                      <div className="flex items-center gap-2 text-indigo-600 font-medium">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Uploading files to Cloudinary secure credentials node...</span>
                      </div>
                    ) : uploadedFileName ? (
                      <div className="space-y-1">
                        <div className="text-emerald-700 font-bold text-[11px] font-mono flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Reports attached successfully!
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{uploadedFileName}</div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-400" />
                        <div>
                          <strong className="text-slate-700 font-medium cursor-pointer hover:underline">Click to browse file</strong> or drag & drop records here
                        </div>
                        <span className="text-[9px] text-slate-400 uppercase">PDF, JPG, PNG formats accepted</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsBookingOpen(false)}
                  className="text-xs text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBooking}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-xl font-medium shadow-md shadow-indigo-100 transition duration-150 cursor-pointer"
                >
                  Submit Approval Proposal
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Corporate Clinical footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            <span>© 2026 MediConnect Pro Systems Ltd.</span>
          </div>
          <div className="flex items-center gap-4">
            <span>MySQL 8 Active Connection Node</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Gateway Online</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
