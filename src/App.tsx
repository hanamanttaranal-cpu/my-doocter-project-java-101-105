import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MessageSquare,
  Upload,
  Shield,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Code2,
  Terminal,
  Folder,
  FileCode,
  Copy,
  ChevronDown,
  ArrowRight,
  RefreshCw,
  Star,
  Stethoscope,
  LogOut,
  X,
  Sun,
  Moon,
  LifeBuoy,
  Video,
  Phone,
  PhoneOff,
} from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import {
  UserSession,
  Doctor,
  Appointment,
  ChatMessage,
  TriageResult,
  DevFileNode,
  ChatPresenceUser,
  AdminPatientSummary,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketMessage,
  IncomingVideoCall,
} from './types';
import { DoctorAvatar } from './components/DoctorAvatar';
import { AuthScreen } from './components/AuthScreen';
import { SupportPortal } from './components/SupportPortal';
import { VideoCallModal } from './components/VideoCallModal';

type ViewKey = 'auth' | 'patient' | 'doctor' | 'admin' | 'support' | 'devops';
type ThemeMode = 'light' | 'dark';

const SESSION_STORAGE_KEY = 'mediconnect_user_session';
const THEME_STORAGE_KEY = 'mediconnect_theme';

const VIEW_TO_PATH: Record<ViewKey, string> = {
  auth: '/login',
  patient: '/patients',
  doctor: '/doctor',
  admin: '/admin',
  support: '/support',
  devops: '/architecture',
};

function resolveViewFromPath(pathname: string): ViewKey | null {
  const clean = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  if (clean === '/patients' || clean === '/patienst' || clean === '/patient') return 'patient';
  if (clean === '/doctor' || clean === '/docter' || clean === '/doctors') return 'doctor';
  if (clean === '/admin' || clean === '/admins') return 'admin';
  if (clean === '/support') return 'support';
  if (clean === '/architecture' || clean === '/devops') return 'devops';
  if (clean === '/login' || clean === '/signup' || clean === '/auth') return 'auth';
  return null;
}

export default function App() {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as UserSession) : null;
    } catch {
      return null;
    }
  });

  const [activeView, setActiveView] = useState<ViewKey>(() => {
    const pathView = resolveViewFromPath(window.location.pathname);
    if (pathView) return pathView;
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as UserSession;
        if (parsed.role === 'DOCTOR') return 'doctor';
        if (parsed.role === 'ADMIN') return 'admin';
        return 'patient';
      }
    } catch {
      // ignore storage errors
    }
    return 'auth';
  });

  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>(() =>
    window.location.pathname.toLowerCase().startsWith('/signup') ? 'signup' : 'login'
  );
  const [pendingBookingDoctor, setPendingBookingDoctor] = useState<Doctor | null>(null);

  // Domain Data State
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>([]);
  const [chatMessagesList, setChatMessagesList] = useState<ChatMessage[]>([]);
  const [activeChatAppointment, setActiveChatAppointment] = useState<Appointment | null>(null);

  // Doctor Directory Filters
  const [specFilter, setSpecFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Patient AI Assistant & Symptom Checker State
  const [aiTab, setAiTab] = useState<'assistant' | 'triage'>('assistant');
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [aiInput, setAiInput] = useState<string>('');
  const [isAiReplying, setIsAiReplying] = useState<boolean>(false);
  const [aiChatError, setAiChatError] = useState<string | null>(null);
  const aiChatBottomRef = useRef<HTMLDivElement>(null);

  const [symptomInput, setSymptomInput] = useState<string>('');
  const [isTriaging, setIsTriaging] = useState<boolean>(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [triageError, setTriageError] = useState<string | null>(null);

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookDate, setBookDate] = useState<string>('');
  const [bookNotes, setBookNotes] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState<boolean>(false);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Real-time WebSocket Chat State
  const [enteredMessage, setEnteredMessage] = useState<string>('');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting');
  const [roomParticipants, setRoomParticipants] = useState<ChatPresenceUser[]>([]);
  const [remoteTypingName, setRemoteTypingName] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const remoteTypingClearRef = useRef<number | null>(null);
  const activeChatRef = useRef<Appointment | null>(null);
  const userRef = useRef<UserSession | null>(user);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Architecture / DevOps Explorer State
  const [devopsFiles, setDevopsFiles] = useState<DevFileNode[]>([]);
  const [selectedDevFile, setSelectedDevFile] = useState<DevFileNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['k8s', 'database', 'gateway', 'backend']);

  // Admin State
  const [adminStats, setAdminStats] = useState<any | null>(null);
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [adminModeration, setAdminModeration] = useState<{
    doctors: Doctor[];
    patients: AdminPatientSummary[];
    feedbacks: any[];
  }>({
    doctors: [],
    patients: [],
    feedbacks: [],
  });

  // Support Portal State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [isSupportLoading, setIsSupportLoading] = useState<boolean>(false);

  // Real-time Video Consultation State (WebRTC + WS Signaling)
  const [activeVideoAppointment, setActiveVideoAppointment] = useState<Appointment | null>(null);
  const [isVideoInitiator, setIsVideoInitiator] = useState<boolean>(false);
  const [incomingVideoCall, setIncomingVideoCall] = useState<IncomingVideoCall | null>(null);
  const videoSignalHandlerRef = useRef<((event: any) => void) | null>(null);
  const activeVideoRef = useRef<Appointment | null>(null);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const navigateView = (nextView: ViewKey, replace = false) => {
    setActiveView(nextView);
    const targetPath = VIEW_TO_PATH[nextView];
    const currentViewFromUrl = resolveViewFromPath(window.location.pathname);
    if (currentViewFromUrl !== nextView || window.location.pathname === '/') {
      if (replace) {
        window.history.replaceState({}, '', targetPath);
      } else {
        window.history.pushState({}, '', targetPath);
      }
    }
  };

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', VIEW_TO_PATH[activeView]);
    }
    const handlePopState = () => {
      const matched = resolveViewFromPath(window.location.pathname);
      if (matched) {
        setActiveView(matched);
      } else if (userRef.current) {
        const role = userRef.current.role;
        setActiveView(role === 'DOCTOR' ? 'doctor' : role === 'ADMIN' ? 'admin' : 'patient');
      } else {
        setActiveView('auth');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    activeChatRef.current = activeChatAppointment;
  }, [activeChatAppointment]);

  useEffect(() => {
    activeVideoRef.current = activeVideoAppointment;
  }, [activeVideoAppointment]);

  // Sync data when session or view changes
  useEffect(() => {
    fetchDoctors();
    if (user) {
      fetchAppointments();
      fetchSupportTickets();
    } else {
      setAppointmentsList([]);
      setSupportTickets([]);
    }
    if (activeView === 'devops') {
      fetchDevopsFiles();
    }
    if (activeView === 'admin') {
      fetchAdminStats();
      fetchAdminModeration();
    }
  }, [user, activeView]);

  useEffect(() => {
    fetchDoctors();
  }, [specFilter, searchQuery]);

  // WebSocket lifecycle for real-time Doctor <-> Patient chat & live appointment updates
  useEffect(() => {
    if (!user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      setRoomParticipants([]);
      setRemoteTypingName(null);
      return;
    }

    let isDisposed = false;
    let attempt = 0;

    const connectWebSocket = () => {
      if (isDisposed) return;
      setWsStatus(attempt === 0 ? 'connecting' : 'reconnecting');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);
      wsRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setWsStatus('connected');
        const currentApt = activeChatRef.current;
        const currentUser = userRef.current;
        if (currentUser) {
          socket.send(
            JSON.stringify({
              type: 'auth:identify',
              userId: currentUser.id,
              fullName: currentUser.fullName,
              role: currentUser.role,
            })
          );
        }
        if (currentApt && currentUser) {
          socket.send(
            JSON.stringify({
              type: 'chat:join',
              appointmentId: currentApt.id,
              userId: currentUser.id,
              fullName: currentUser.fullName,
              role: currentUser.role,
            })
          );
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const currentApt = activeChatRef.current;
          const currentUser = userRef.current;

          if (data.type === 'chat:history' && currentApt && data.appointmentId === currentApt.id) {
            setChatMessagesList(Array.isArray(data.messages) ? data.messages : []);
            return;
          }

          if (data.type === 'chat:message' && data.message) {
            const incoming = data.message as ChatMessage;
            if (currentApt && incoming.appointmentId === currentApt.id) {
              setChatMessagesList((prev) =>
                prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
              );
              if (currentUser && incoming.senderId !== currentUser.id) {
                setRemoteTypingName(null);
              }
            }
            return;
          }

          if (data.type === 'chat:presence' && currentApt && data.appointmentId === currentApt.id) {
            setRoomParticipants(Array.isArray(data.participants) ? data.participants : []);
            return;
          }

          if (data.type === 'chat:typing' && currentApt && data.appointmentId === currentApt.id) {
            if (currentUser && Number(data.userId) === currentUser.id) return;
            if (data.isTyping) {
              setRemoteTypingName(String(data.fullName || 'Participant'));
              if (remoteTypingClearRef.current) {
                window.clearTimeout(remoteTypingClearRef.current);
              }
              remoteTypingClearRef.current = window.setTimeout(() => {
                setRemoteTypingName(null);
              }, 3000);
            } else {
              setRemoteTypingName(null);
            }
            return;
          }

          if (data.type === 'appointment:sync') {
            fetchAppointments();
            if (currentUser?.role === 'ADMIN') {
              fetchAdminStats();
              fetchAdminModeration();
            }
            return;
          }

          if (data.type === 'support:sync' && data.ticket) {
            const incomingTicket = data.ticket as SupportTicket;
            const belongsToUser =
              currentUser?.role === 'ADMIN' ||
              (currentUser &&
                (incomingTicket.requesterId === currentUser.id ||
                  incomingTicket.requesterEmail.toLowerCase() === currentUser.email.toLowerCase()));
            if (!belongsToUser) return;
            setSupportTickets((prev) => {
              const exists = prev.some((t) => t.id === incomingTicket.id);
              if (exists) {
                return prev.map((t) => (t.id === incomingTicket.id ? incomingTicket : t));
              }
              return [incomingTicket, ...prev];
            });
            return;
          }

          if (data.type === 'support:message' && data.message && data.ticketId) {
            const incomingMsg = data.message as SupportTicketMessage;
            const targetTicketId = Number(data.ticketId);
            setSupportTickets((prev) =>
              prev.map((ticket) => {
                if (ticket.id !== targetTicketId) return ticket;
                const alreadyExists = ticket.messages.some((m) => m.id === incomingMsg.id);
                return {
                  ...ticket,
                  status: (data.status as SupportTicketStatus) || ticket.status,
                  updatedAt: String(data.updatedAt || ticket.updatedAt),
                  messages: alreadyExists ? ticket.messages : [...ticket.messages, incomingMsg],
                };
              })
            );
            return;
          }

          if (data.type === 'video:incoming' && data.appointment) {
            const callPayload = data as IncomingVideoCall;
            if (
              activeVideoRef.current?.id !== Number(callPayload.appointmentId) &&
              currentUser &&
              Number(callPayload.callerId) !== currentUser.id
            ) {
              setIncomingVideoCall(callPayload);
            }
            return;
          }

          if (
            data.type === 'video:peers' ||
            data.type === 'video:signal' ||
            data.type === 'video:media-state' ||
            data.type === 'video:accepted' ||
            data.type === 'video:declined' ||
            data.type === 'video:ended'
          ) {
            if (data.type === 'video:ended' || data.type === 'video:declined') {
              setIncomingVideoCall((prev) =>
                prev && prev.appointmentId === Number(data.appointmentId) ? null : prev
              );
            }
            videoSignalHandlerRef.current?.(data);
          }
        } catch {
          // Ignore invalid socket frames
        }
      };

      socket.onclose = () => {
        if (wsRef.current === socket) {
          wsRef.current = null;
        }
        if (!isDisposed) {
          setWsStatus('reconnecting');
          attempt += 1;
          const delay = Math.min(1500 * attempt, 6000);
          reconnectTimerRef.current = window.setTimeout(connectWebSocket, delay);
        }
      };
    };

    connectWebSocket();

    return () => {
      isDisposed = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user?.id]);

  // Join or leave WebSocket appointment room when activeChatAppointment changes
  useEffect(() => {
    setRoomParticipants([]);
    setRemoteTypingName(null);

    if (!activeChatAppointment) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'chat:leave' }));
      }
      return;
    }

    fetchChatMessages(activeChatAppointment.id);

    if (wsRef.current?.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:join',
          appointmentId: activeChatAppointment.id,
          userId: user.id,
          fullName: user.fullName,
          role: user.role,
        })
      );
    }
  }, [activeChatAppointment?.id]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessagesList, remoteTypingName]);

  // --- API Calls ---

  const fetchDoctors = async () => {
    try {
      const params = new URLSearchParams();
      if (specFilter && specFilter !== 'All') params.set('specialization', specFilter);
      if (searchQuery.trim()) params.set('query', searchQuery.trim());
      const url = `/api/doctors${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setDoctorsList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAppointments = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/appointments?userId=${user.id}&role=${user.role}`);
      if (!res.ok) return;
      const data = await res.json();
      setAppointmentsList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChatMessages = async (aid: number) => {
    try {
      const res = await fetch(`/api/chat?appointmentId=${aid}`);
      if (!res.ok) return;
      const data = await res.json();
      setChatMessagesList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDevopsFiles = async () => {
    try {
      const res = await fetch('/api/backend-files');
      if (!res.ok) return;
      const data = await res.json();
      setDevopsFiles(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !selectedDevFile) {
        setSelectedDevFile(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/admin/analytics');
      if (!res.ok) return;
      const data = await res.json();
      setAdminStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminModeration = async () => {
    try {
      const res = await fetch('/api/admin/moderation');
      if (!res.ok) return;
      const data = await res.json();
      setAdminModeration({
        doctors: Array.isArray(data.doctors) ? data.doctors : [],
        patients: Array.isArray(data.patients) ? data.patients : [],
        feedbacks: Array.isArray(data.feedbacks) ? data.feedbacks : [],
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSupportTickets = async () => {
    if (!user) return;
    setIsSupportLoading(true);
    try {
      const res = await fetch(`/api/support/tickets?userId=${user.id}&role=${user.role}`);
      if (!res.ok) return;
      const data = await res.json();
      setSupportTickets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSupportLoading(false);
    }
  };

  const handleCreateSupportTicket = async (payload: {
    category: SupportTicketCategory;
    priority: SupportTicketPriority;
    subject: string;
    message: string;
  }): Promise<SupportTicket | null> => {
    if (!user) return null;
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: user.id,
          requesterName: user.fullName,
          requesterEmail: user.email,
          requesterRole: user.role === 'DOCTOR' ? 'DOCTOR' : 'PATIENT',
          ...payload,
        }),
      });
      if (!res.ok) return null;
      const created = (await res.json()) as SupportTicket;
      setSupportTickets((prev) =>
        prev.some((t) => t.id === created.id) ? prev : [created, ...prev]
      );
      showToast(`Support ticket #${created.id} submitted.`);
      return created;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleSendSupportReply = async (ticketId: number, text: string) => {
    if (!user) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'support:send',
          ticketId,
          senderId: user.id,
          senderName: user.fullName,
          senderRole: user.role,
          text,
        })
      );
      return;
    }

    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          senderName: user.fullName,
          senderRole: user.role,
          text,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ticket) {
          setSupportTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? (data.ticket as SupportTicket) : t))
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSupportStatus = async (ticketId: number, status: SupportTicketStatus) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = (await res.json()) as SupportTicket;
        setSupportTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
        showToast(`Ticket #${ticketId} marked as ${status}.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Auth Handlers ---

  const handleAuthSuccess = (session: UserSession, isNewAccount = false) => {
    setUser(session);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore storage errors
    }

    setActiveChatAppointment(null);
    setActiveVideoAppointment(null);
    setIncomingVideoCall(null);

    if (session.role === 'DOCTOR') {
      navigateView('doctor');
      showToast(isNewAccount ? `Account created. Welcome, ${session.fullName}.` : `Welcome back, ${session.fullName}.`);
      setPendingBookingDoctor(null);
      return;
    }

    if (session.role === 'ADMIN') {
      navigateView('admin');
      showToast(`Signed in as ${session.fullName}.`);
      setPendingBookingDoctor(null);
      return;
    }

    navigateView('patient');
    showToast(isNewAccount ? `Account created. Welcome, ${session.fullName}!` : `Welcome back, ${session.fullName}.`);

    if (pendingBookingDoctor) {
      setSelectedDoctor(pendingBookingDoctor);
      setIsBookingOpen(true);
      setPendingBookingDoctor(null);
    }
  };

  const handleQuickDemoRoleLogin = async (role: 'DOCTOR' | 'ADMIN' | 'PATIENT') => {
    const email =
      role === 'DOCTOR'
        ? 'doctor@mediconnect.pro'
        : role === 'ADMIN'
        ? 'admin@mediconnect.pro'
        : 'patient@mediconnect.pro';
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      handleAuthSuccess(data as UserSession, false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveChatAppointment(null);
    setActiveVideoAppointment(null);
    setIncomingVideoCall(null);
    setPendingBookingDoctor(null);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
    setAuthInitialMode('login');
    navigateView('auth');
    showToast('You have been logged out.');
  };

  const openAuthScreen = (mode: 'login' | 'signup') => {
    setAuthInitialMode(mode);
    navigateView('auth');
  };

  // --- Clinical Workflows ---

  const handleAITriage = async () => {
    if (!symptomInput.trim()) {
      setTriageError('Please type a brief description of your symptoms first.');
      return;
    }
    setIsTriaging(true);
    setTriageResult(null);
    setTriageError(null);
    try {
      const res = await fetch('/api/gemini/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: symptomInput }),
      });
      const data = await res.json();
      if (res.ok && data.triageResult) {
        setTriageResult(data.triageResult);
      } else {
        setTriageError(data.error || 'Could not analyze symptoms right now. Please try again.');
      }
    } catch {
      setTriageError('Symptom assistant is currently unavailable. You can still browse doctors below.');
    } finally {
      setIsTriaging(false);
    }
  };

  const handleSendAiQuestion = async (overrideText?: string) => {
    const question = (overrideText ?? aiInput).trim();
    if (!question || isAiReplying) return;

    const historySnapshot = aiMessages;
    setAiMessages((prev) => [...prev, { role: 'user', text: question }]);
    if (!overrideText) setAiInput('');
    setAiChatError(null);
    setIsAiReplying(true);

    window.setTimeout(() => {
      aiChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          history: historySnapshot,
        }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setAiMessages((prev) => [...prev, { role: 'model', text: data.reply }]);
        window.setTimeout(() => {
          aiChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      } else {
        setAiChatError(data.error || 'Could not get a reply from the AI Health Assistant.');
      }
    } catch {
      setAiChatError('AI Health Assistant is temporarily unavailable. Please try again.');
    } finally {
      setIsAiReplying(false);
    }
  };

  const detectMentionedSpecialty = (text: string): string | null => {
    const specs = ['Cardiology', 'Neurology', 'Dermatology', 'General Physician', 'Orthopedics'];
    const lower = text.toLowerCase();
    return specs.find((s) => lower.includes(s.toLowerCase())) || null;
  };

  const applyTriageFilter = (spec: string) => {
    setSpecFilter(spec);
    showToast(`Showing ${spec} specialists.`);
    const el = document.getElementById('doctor-directory-pane');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBookClick = (doc: Doctor) => {
    if (!user) {
      setPendingBookingDoctor(doc);
      setAuthInitialMode('signup');
      navigateView('auth');
      showToast(`Create an account or log in to book a visit with ${doc.fullName}.`);
      return;
    }
    setSelectedDoctor(doc);
    setIsBookingOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadedFileName(file.name);
    try {
      const res = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      if (res.ok) {
        showToast(`Attached "${file.name}" to your request.`);
      } else {
        showToast('Unable to attach file.');
      }
    } catch {
      showToast('Unable to attach file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!user || !selectedDoctor) return;
    if (!bookDate) {
      showToast('Please choose a preferred date for your visit.');
      return;
    }
    setIsBookingSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: user.id,
          doctorId: selectedDoctor.id,
          date: bookDate,
          notes: bookNotes,
          medicalReportUrl: uploadedFileName,
        }),
      });
      if (res.ok) {
        showToast(`Visit request sent to ${selectedDoctor.fullName}.`);
        setIsBookingOpen(false);
        setBookDate('');
        setBookNotes('');
        setUploadedFileName('');
        await fetchAppointments();
        const el = document.getElementById('appointments-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        const data = await res.json();
        showToast(data.error || 'Could not complete booking.');
      }
    } catch {
      showToast('Network error while submitting booking.');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const handleChatInputChange = (val: string) => {
    setEnteredMessage(val);
    if (!activeChatAppointment || !user) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:typing',
          appointmentId: activeChatAppointment.id,
          userId: user.id,
          fullName: user.fullName,
          role: user.role,
          isTyping: val.trim().length > 0,
        })
      );
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (val.trim().length > 0) {
        typingTimeoutRef.current = window.setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN && activeChatRef.current && userRef.current) {
            wsRef.current.send(
              JSON.stringify({
                type: 'chat:typing',
                appointmentId: activeChatRef.current.id,
                userId: userRef.current.id,
                fullName: userRef.current.fullName,
                role: userRef.current.role,
                isTyping: false,
              })
            );
          }
        }, 1800);
      }
    }
  };

  const handleSendMessage = async () => {
    const cleanText = enteredMessage.trim();
    if (!cleanText || !activeChatAppointment || !user) return;

    const payload = {
      appointmentId: activeChatAppointment.id,
      senderId: user.id,
      senderName: user.fullName,
      text: cleanText,
    };
    setEnteredMessage('');

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:typing',
          appointmentId: activeChatAppointment.id,
          userId: user.id,
          fullName: user.fullName,
          role: user.role,
          isTyping: false,
        })
      );
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:send',
          ...payload,
        })
      );
      return;
    }

    // Fallback to REST endpoint if WebSocket is momentarily reconnecting
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = (await res.json()) as ChatMessage;
        setChatMessagesList((prev) =>
          prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveAppointment = async (aptId: number, status: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch(`/api/appointments/${aptId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showToast(status === 'Approved' ? 'Appointment approved. Chat is now open.' : 'Appointment declined.');
        fetchAppointments();
        fetchAdminStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startVideoCall = (apt: Appointment) => {
    if (!user) return;
    if (apt.status !== 'Approved') {
      showToast('Video calls open once the appointment is approved.');
      return;
    }
    setIncomingVideoCall(null);
    setIsVideoInitiator(true);
    setActiveVideoAppointment(apt);
  };

  const acceptIncomingVideoCall = () => {
    if (!incomingVideoCall || !user) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'video:accept',
          appointmentId: incomingVideoCall.appointmentId,
          accepterId: user.id,
          accepterName: user.fullName,
          accepterRole: user.role,
        })
      );
    }
    setIsVideoInitiator(false);
    setActiveVideoAppointment(incomingVideoCall.appointment);
    setIncomingVideoCall(null);
  };

  const declineIncomingVideoCall = () => {
    if (!incomingVideoCall || !user) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'video:decline',
          appointmentId: incomingVideoCall.appointmentId,
          declinerId: user.id,
          declinerName: user.fullName,
          declinerRole: user.role,
        })
      );
    }
    setIncomingVideoCall(null);
  };

  const handleToggleBlockDoctor = async (docId: number) => {
    try {
      const res = await fetch('/api/admin/toggle-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: docId }),
      });
      if (res.ok) {
        showToast('Doctor account status updated.');
        fetchDoctors();
        fetchAdminModeration();
        fetchAdminStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFeedback = async (feedbackId: number) => {
    try {
      const res = await fetch(`/api/admin/feedback/${feedbackId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Review removed.');
        fetchAdminModeration();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToSection = (sectionId: string) => {
    if (activeView !== 'patient') {
      navigateView('patient');
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Resolve current doctor profile when logged in as DOCTOR
  const activeDoctorProfile =
    user?.role === 'DOCTOR'
      ? doctorsList.find(
          (d) =>
            d.email.toLowerCase() === user.email.toLowerCase() ||
            (user.email === 'doctor@mediconnect.pro' && d.id === 1)
        ) || doctorsList[0]
      : null;

  // Helper to render status text + icon (never hue-only)
  const renderAppointmentStatus = (status: string) => {
    if (status === 'Approved') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          Approved
        </span>
      );
    }
    if (status === 'Rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
          <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
          Declined
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        Waiting for approval
      </span>
    );
  };

  // Recursive DevOps file tree renderer
  const renderDevFolder = (item: DevFileNode) => {
    if (item.type === 'file') {
      const isSelected = selectedDevFile?.path === item.path;
      return (
        <button
          type="button"
          key={item.path}
          onClick={() => setSelectedDevFile(item)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-xs font-mono transition-colors cursor-pointer ${
            isSelected
              ? 'bg-teal-700 text-white font-medium'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{item.name}</span>
        </button>
      );
    }

    const folderId = item.path || item.name;
    const isExpanded = expandedFolders.includes(folderId);

    return (
      <div key={folderId} className="mt-1">
        <button
          type="button"
          onClick={() =>
            setExpandedFolders((prev) =>
              isExpanded ? prev.filter((f) => f !== folderId) : [...prev, folderId]
            )
          }
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Folder className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="truncate">{item.name}</span>
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
        </button>
        {isExpanded && item.children && (
          <div className="pl-3 ml-2 border-l border-slate-800 mt-0.5 space-y-0.5">
            {item.children.map((child) => renderDevFolder(child))}
          </div>
        )}
      </div>
    );
  };

  // Shared Live Real-Time Chat Panel (WebSocket-backed)
  const renderLiveChatPanel = () => {
    if (!activeChatAppointment) return null;
    const isDoctorUser = user?.role === 'DOCTOR';
    const counterpartyName = isDoctorUser
      ? activeChatAppointment.patientName
      : activeChatAppointment.doctorName;
    const isCounterpartyOnline = roomParticipants.some(
      (p) => user && p.userId !== user.id
    );

    return (
      <motion.section
        id="live-chat-panel"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3 min-w-0">
            <DoctorAvatar
              doctorId={activeChatAppointment.doctorId}
              name={counterpartyName}
              sizeClass="w-10 h-10"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {counterpartyName}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCounterpartyOnline
                        ? 'bg-emerald-500'
                        : wsStatus === 'connected'
                        ? 'bg-teal-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  {isCounterpartyOnline
                    ? 'Online in chat'
                    : wsStatus === 'connected'
                    ? 'Live connected'
                    : 'Reconnecting...'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums truncate mt-0.5">
                {activeChatAppointment.specialization} · Visit on {activeChatAppointment.date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeChatAppointment.status === 'Approved' && (
              <button
                type="button"
                onClick={() => startVideoCall(activeChatAppointment)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Video className="w-3.5 h-3.5" />
                Video Call
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveChatAppointment(null)}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Close Chat
            </button>
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-950/70 space-y-4 max-h-[380px] overflow-y-auto">
          {chatMessagesList.length === 0 ? (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
              No messages yet. Say hello to start your real-time consultation.
            </p>
          ) : (
            chatMessagesList.map((m) => {
              const isSelf = user ? m.senderId === user.id : m.senderId !== 2;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex flex-col max-w-[78%] ${
                    isSelf ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 px-1">
                    {m.senderName}
                  </span>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isSelf
                        ? 'bg-teal-700 text-white rounded-br-sm'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums mt-1 px-1">
                    {m.timestamp}
                  </span>
                </motion.div>
              );
            })
          )}

          {remoteTypingName && (
            <div className="flex flex-col mr-auto items-start max-w-[78%]">
              <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 px-1">
                {remoteTypingName}
              </span>
              <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl rounded-bl-sm text-xs">
                Typing...
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <input
            type="text"
            placeholder={`Write a live message to ${counterpartyName}...`}
            value={enteredMessage}
            onChange={(e) => handleChatInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            className="flex-1 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white dark:focus:bg-slate-950"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!enteredMessage.trim()}
            aria-label="Send message"
            className="h-11 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-medium rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </motion.section>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Toast Feedback Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.16 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 border border-slate-700"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar: Clean 3-Zone Contract */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              if (!user) {
                navigateView('auth');
              } else if (user.role === 'DOCTOR') {
                navigateView('doctor');
              } else if (user.role === 'ADMIN') {
                navigateView('admin');
              } else {
                navigateView('patient');
              }
            }}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
          >
            <Stethoscope className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0" />
            MediConnect
          </button>

          {/* Zone 2: 4 Clean Single-Line Nav Links */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            {!user && (
              <>
                <button
                  type="button"
                  onClick={() => navigateView('patient')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'patient'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Patients
                </button>
                <button
                  type="button"
                  onClick={() => navigateView('doctor')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'doctor'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Doctor
                </button>
                <button
                  type="button"
                  onClick={() => navigateView('admin')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'admin'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => navigateView('support')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'support'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Support
                </button>
              </>
            )}

            {user?.role === 'PATIENT' && (
              <>
                <button
                  type="button"
                  onClick={() => scrollToSection('doctor-directory-pane')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'patient'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Find Doctors
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('symptom-helper')}
                  className="py-1 whitespace-nowrap shrink-0 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  AI Assistant
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('appointments-section')}
                  className="py-1 whitespace-nowrap shrink-0 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  My Visits
                </button>
                <button
                  type="button"
                  onClick={() => navigateView('support')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'support'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Support
                </button>
              </>
            )}

            {user?.role === 'DOCTOR' && (
              <>
                <button
                  type="button"
                  onClick={() => navigateView('doctor')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'doctor'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  My Schedule
                </button>
                <button
                  type="button"
                  onClick={() => navigateView('patient')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'patient'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Doctor Directory
                </button>
                <button
                  type="button"
                  onClick={() => navigateView('support')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'support'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Support
                </button>
                <button
                  type="button"
                  onClick={() => navigateView('devops')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'devops'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Architecture
                </button>
              </>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <button
                  type="button"
                  onClick={() => navigateView('admin')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'admin'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Admin Overview
                </button>
                <button
                  type="button"
                  onClick={() => navigateView('support')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'support'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Support Desk
                </button>
                <button
                  type="button"
                  onClick={() => navigateView('patient')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'patient'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Doctor Directory
                </button>
                <button
                  type="button"
                  onClick={() => navigateView('devops')}
                  className={`py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeView === 'devops'
                      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-teal-700 dark:decoration-teal-400'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Architecture
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[180px] truncate">
                  {user.fullName}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out
                </button>
              </div>
            ) : activeView === 'auth' ? (
              <button
                type="button"
                onClick={() => navigateView('patient')}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-teal-700 hover:bg-slate-800 dark:hover:bg-teal-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Browse Doctors
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthScreen('login')}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Log In / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Non-sticky Mobile Navigation Strip */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center gap-5 overflow-x-auto text-xs font-medium text-slate-600 dark:text-slate-300">
        {!user && (
          <>
            <button type="button" onClick={() => navigateView('patient')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">Patients</button>
            <button type="button" onClick={() => navigateView('doctor')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">Doctor</button>
            <button type="button" onClick={() => navigateView('admin')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">Admin</button>
            <button type="button" onClick={() => navigateView('support')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">Support</button>
          </>
        )}
        {user?.role === 'PATIENT' && (
          <>
            <button type="button" onClick={() => scrollToSection('doctor-directory-pane')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">Find Doctors</button>
            <button type="button" onClick={() => scrollToSection('symptom-helper')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">AI Assistant</button>
            <button type="button" onClick={() => scrollToSection('appointments-section')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">My Visits</button>
            <button type="button" onClick={() => navigateView('support')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">Support</button>
          </>
        )}
        {user?.role === 'DOCTOR' && (
          <>
            <button type="button" onClick={() => navigateView('doctor')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">My Schedule</button>
            <button type="button" onClick={() => navigateView('patient')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">Doctor Directory</button>
            <button type="button" onClick={() => navigateView('support')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">Support</button>
            <button type="button" onClick={() => navigateView('devops')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">Architecture</button>
          </>
        )}
        {user?.role === 'ADMIN' && (
          <>
            <button type="button" onClick={() => navigateView('admin')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">Admin Overview</button>
            <button type="button" onClick={() => navigateView('support')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">Support Desk</button>
            <button type="button" onClick={() => navigateView('patient')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">Doctor Directory</button>
            <button type="button" onClick={() => navigateView('devops')} className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white">Architecture</button>
          </>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {/* AUTH SCREEN (LOGIN & SIGN UP) */}
        {activeView === 'auth' && (
          <AuthScreen
            initialMode={authInitialMode}
            onAuthSuccess={handleAuthSuccess}
            onBrowseAsGuest={() => navigateView('patient')}
          />
        )}

        {/* PATIENT / GUEST PORTAL */}
        {activeView === 'patient' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
            {/* Clear Hero / Summary Section + Theme Switcher */}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
                    {user ? `Signed in as ${user.fullName}` : 'Guest Preview'}
                  </p>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        theme === 'light'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        theme === 'dark'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      Dark
                    </button>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
                  {user
                    ? 'Book a consultation or check your upcoming visits'
                    : 'Find a verified doctor and book an online consultation'}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  {user
                    ? 'Use the symptom helper if you are unsure which specialist to pick, request an appointment date, and chat live once approved.'
                    : 'Browse available specialists below or sign up in seconds to book a visit and message your doctor.'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 sm:gap-6 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-5 lg:pt-0 lg:pl-8">
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                    {doctorsList.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Available doctors</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                    {appointmentsList.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Your visits</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                    {appointmentsList.filter((a) => a.status === 'Approved').length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Open chats</div>
                </div>
              </div>
            </motion.section>

            {/* Patient AI Health Assistant & Symptom Checker */}
            <motion.section
              id="symptom-helper"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Patient AI Health Assistant
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Ask health questions in plain language, prepare for your visit, or check which specialist fits your symptoms.
                  </p>
                </div>

                {/* Clean Segmented Toggle */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start md:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setAiTab('assistant')}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      aiTab === 'assistant'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    AI Assistant Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiTab('triage')}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      aiTab === 'triage'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Symptom Checker
                  </button>
                </div>
              </div>

              {aiTab === 'assistant' ? (
                <div className="space-y-4">
                  {/* Conversation Area */}
                  <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 max-h-80 overflow-y-auto">
                    {aiMessages.length === 0 ? (
                      <div className="space-y-3 py-2">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Try asking a question or pick one of these common topics:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            'Which doctor should I see for chest fluttering?',
                            'How should I prepare for a neurology visit?',
                            'What questions should I ask about a changing mole?',
                          ].map((prompt) => (
                            <button
                              key={prompt}
                              type="button"
                              onClick={() => handleSendAiQuestion(prompt)}
                              className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-600 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-left"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      aiMessages.map((msg, idx) => {
                        const suggestedSpec =
                          msg.role === 'model' ? detectMentionedSpecialty(msg.text) : null;
                        return (
                          <div
                            key={idx}
                            className={`flex flex-col max-w-[85%] ${
                              msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                            }`}
                          >
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 px-1">
                              {msg.role === 'user' ? user?.fullName || 'You' : 'AI Health Assistant'}
                            </span>
                            <div
                              className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                msg.role === 'user'
                                  ? 'bg-teal-700 text-white rounded-br-sm'
                                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                              }`}
                            >
                              {msg.text}
                            </div>
                            {suggestedSpec && (
                              <button
                                type="button"
                                onClick={() => applyTriageFilter(suggestedSpec)}
                                className="mt-2 px-3 py-1.5 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                Show {suggestedSpec} Doctors
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}

                    {isAiReplying && (
                      <div className="flex flex-col mr-auto items-start">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 px-1">
                          AI Health Assistant
                        </span>
                        <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl rounded-bl-sm text-xs inline-flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-700 dark:text-teal-400" />
                          Thinking...
                        </div>
                      </div>
                    )}
                    <div ref={aiChatBottomRef} />
                  </div>

                  {aiChatError && (
                    <div
                      role="alert"
                      className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-sm text-rose-800 dark:text-rose-200 flex items-start gap-2.5"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <span>{aiChatError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Ask about symptoms, lab tests, or which specialist to book..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendAiQuestion();
                      }}
                      className="flex-1 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white dark:focus:bg-slate-950"
                    />
                    {aiMessages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAiMessages([]);
                          setAiChatError(null);
                        }}
                        className="h-11 px-3.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSendAiQuestion()}
                      disabled={isAiReplying || !aiInput.trim()}
                      className="h-11 px-5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Send className="w-4 h-4" />
                      Ask AI
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                    For informational guidance only — contact emergency services immediately for urgent symptoms.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    rows={3}
                    placeholder="Example: I have had mild chest fluttering during evening walks for the past three days..."
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white dark:focus:bg-slate-950 resize-none"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Shield className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                      Educational guidance only — call emergency services for urgent care
                    </span>

                    <div className="flex items-center gap-3">
                      {symptomInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setSymptomInput('');
                            setTriageResult(null);
                            setTriageError(null);
                          }}
                          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleAITriage}
                        disabled={isTriaging}
                        className="px-5 py-2.5 bg-slate-900 dark:bg-teal-700 hover:bg-slate-800 dark:hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {isTriaging ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Checking symptoms...
                          </>
                        ) : (
                          <>
                            Get Specialist Suggestion
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {triageError && (
                    <div
                      role="alert"
                      className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-sm text-rose-800 dark:text-rose-200 flex items-start gap-2.5"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <span>{triageError}</span>
                    </div>
                  )}

                  {triageResult && (
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Suggested specialty:</span>
                          <strong className="text-slate-900 dark:text-slate-100">{triageResult.specialty}</strong>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-slate-500 dark:text-slate-400">Urgency:</span>
                          <span
                            className={`font-semibold inline-flex items-center gap-1 ${
                              triageResult.urgency === 'High'
                                ? 'text-rose-700 dark:text-rose-400'
                                : triageResult.urgency === 'Medium'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            {triageResult.urgency}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => applyTriageFilter(triageResult.specialty)}
                          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Show {triageResult.specialty} Doctors
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {triageResult.insights}
                      </p>

                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Questions you can ask during your visit
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {triageResult.questionsToAsk.map((q, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 flex gap-2.5"
                            >
                              <span className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-400 mt-0.5 tabular-nums">
                                0{idx + 1}.
                              </span>
                              <span>{q}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.section>

            {/* Doctor Directory */}
            <section id="doctor-directory-pane" className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Available Doctors</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Compare specialties, hours, and consultation fees before requesting an appointment.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    aria-label="Filter by specialty"
                    value={specFilter}
                    onChange={(e) => setSpecFilter(e.target.value)}
                    className="h-10 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                  >
                    <option value="All">All specialties</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="General Physician">General Physician</option>
                    <option value="Orthopedics">Orthopedics</option>
                  </select>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search doctor or condition..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 pl-9 pr-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 w-64"
                    />
                  </div>
                </div>
              </div>

              {doctorsList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {doctorsList.map((doc) => (
                    <motion.article
                      key={doc.id}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-5"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <DoctorAvatar
                            doctorId={doc.id}
                            email={doc.email}
                            name={doc.fullName}
                            profileImageUrl={doc.profileImageUrl}
                            sizeClass="w-14 h-14"
                          />
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {doc.fullName}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
                              <span className="font-medium text-teal-700 dark:text-teal-400">{doc.specialization}</span>
                              <span aria-hidden="true">·</span>
                              <span>{doc.yearsOfExperience} yrs exp</span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200 font-medium">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                {doc.rating}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                          {doc.biography}
                        </p>

                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {doc.availabilitySchedule}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            ${doc.consultationFee} / visit
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleBookClick(doc)}
                        className="w-full h-10 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {user ? 'Book Visit' : 'Sign In to Book'}
                      </button>
                    </motion.article>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    No doctors matched your current filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSpecFilter('All');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-lg cursor-pointer"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </section>

            {/* Your Appointments & Chat */}
            <section id="appointments-section" className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Your Visits & Messages</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Track your appointment requests. Once approved by the doctor, you can open a real-time chat.
                </p>
              </div>

              {!user ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Log in to view your appointments
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Sign in or create a free patient account to manage visit requests and chat live with doctors.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => openAuthScreen('login')}
                      className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer whitespace-nowrap"
                    >
                      Log In
                    </button>
                    <button
                      type="button"
                      onClick={() => openAuthScreen('signup')}
                      className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl cursor-pointer whitespace-nowrap"
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3.5 px-5">Doctor</th>
                        <th className="py-3.5 px-5">Specialty</th>
                        <th className="py-3.5 px-5">Date</th>
                        <th className="py-3.5 px-5">Attached File</th>
                        <th className="py-3.5 px-5">Status</th>
                        <th className="py-3.5 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {appointmentsList.length > 0 ? (
                        appointmentsList.map((apt) => (
                          <tr key={apt.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                            <td className="py-4 px-5 font-semibold text-slate-900 dark:text-slate-100">
                              {apt.doctorName}
                            </td>
                            <td className="py-4 px-5 text-slate-600 dark:text-slate-300">{apt.specialization}</td>
                            <td className="py-4 px-5 font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                              {apt.date}
                            </td>
                            <td className="py-4 px-5 text-xs text-slate-600 dark:text-slate-300">
                              {apt.medicalReportUrl ? (
                                <span className="inline-flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                                  <FileCode className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                                  {apt.medicalReportUrl}
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">None</span>
                              )}
                            </td>
                            <td className="py-4 px-5">{renderAppointmentStatus(apt.status)}</td>
                            <td className="py-4 px-5 text-right">
                              {apt.status === 'Approved' ? (
                                <div className="inline-flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startVideoCall(apt)}
                                    className="px-3.5 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                    Video Call
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveChatAppointment(apt)}
                                    className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Open Chat
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                  {apt.status === 'Rejected' ? 'Unavailable' : 'Chat opens after approval'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-10 px-5 text-center text-sm text-slate-500 dark:text-slate-400">
                            You have no appointments yet. Choose a doctor above to book your first visit.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {renderLiveChatPanel()}
          </div>
        )}

        {/* DOCTOR CONSOLE */}
        {activeView === 'doctor' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {user?.role !== 'DOCTOR' && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Sign in with a Doctor account to approve visits and chat with patients
                  </h2>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    You are viewing the Doctor Console route (`/doctor`). Load the sample doctor workspace or sign in with your clinician credentials.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoRoleLogin('DOCTOR')}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    Use Demo Doctor
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthScreen('login')}
                    className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Doctor Schedule</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {user?.fullName || activeDoctorProfile?.fullName || 'Doctor Workspace'}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                  Review incoming patient requests, approve visits to open real-time chat, and read any medical reports shared with you.
                </p>
              </div>

              <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-8 shrink-0">
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                    {appointmentsList.filter((a) => a.status === 'Pending').length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pending requests</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                    {appointmentsList.filter((a) => a.status === 'Approved').length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Approved visits</div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Pending Requests */}
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    New Visit Requests ({appointmentsList.filter((a) => a.status === 'Pending').length})
                  </h2>

                  {appointmentsList.filter((a) => a.status === 'Pending').length > 0 ? (
                    appointmentsList
                      .filter((a) => a.status === 'Pending')
                      .map((apt) => (
                        <div
                          key={apt.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                {apt.patientName}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                                Requested date: {apt.date}
                              </p>
                            </div>
                            {apt.medicalReportUrl && (
                              <span className="text-xs text-slate-700 dark:text-slate-300 font-mono inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                <FileCode className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                                {apt.medicalReportUrl}
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl leading-relaxed">
                            {apt.notes}
                          </p>

                          <div className="flex items-center justify-end gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => handleApproveAppointment(apt.id, 'Rejected')}
                              className="px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveAppointment(apt.id, 'Approved')}
                              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Approve Visit
                            </button>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No pending appointment requests right now.
                    </div>
                  )}
                </div>

                {/* Approved Visits */}
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Approved Visits ({appointmentsList.filter((a) => a.status === 'Approved').length})
                  </h2>

                  {appointmentsList.filter((a) => a.status === 'Approved').length > 0 ? (
                    appointmentsList
                      .filter((a) => a.status === 'Approved')
                      .map((apt) => (
                        <div
                          key={apt.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                {apt.patientName}
                              </h3>
                              {renderAppointmentStatus(apt.status)}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                              Scheduled for {apt.date}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{apt.notes}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => startVideoCall(apt)}
                              className="px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <Video className="w-3.5 h-3.5" />
                              Video Call
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveChatAppointment(apt)}
                              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Open Chat
                            </button>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      Approved consultations will appear here so you can chat with patients live.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Signed-in Doctor Profile */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your Profile</h2>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <DoctorAvatar
                      doctorId={activeDoctorProfile?.id}
                      email={user?.email || activeDoctorProfile?.email}
                      name={user?.fullName || activeDoctorProfile?.fullName || 'Doctor'}
                      sizeClass="w-14 h-14"
                    />
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {user?.fullName || activeDoctorProfile?.fullName}
                      </h3>
                      <p className="text-xs font-medium text-teal-700 dark:text-teal-400 mt-0.5">
                        {activeDoctorProfile?.specialization || 'General Physician'}
                      </p>
                    </div>
                  </div>

                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500 dark:text-slate-400">Hours</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                        {activeDoctorProfile?.availabilitySchedule || 'Mon-Fri 09:00 - 17:00'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500 dark:text-slate-400">Visit fee</dt>
                      <dd className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        ${activeDoctorProfile?.consultationFee ?? 100}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500 dark:text-slate-400">Experience</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                        {activeDoctorProfile?.yearsOfExperience ?? 5} years
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500 dark:text-slate-400">Rating</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100 inline-flex items-center gap-1 tabular-nums">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        {activeDoctorProfile?.rating ?? 4.8}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {renderLiveChatPanel()}
          </div>
        )}

        {/* ADMIN OVERVIEW */}
        {activeView === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {user?.role !== 'ADMIN' && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Sign in as Clinic Admin for full management access
                  </h2>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    You are viewing the Admin route (`/admin`). Sign in with your Admin credentials or load the demo Admin account to respond to support tickets and moderate accounts.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoRoleLogin('ADMIN')}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    Use Demo Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthScreen('login')}
                    className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Clinic Administration</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
                  Platform Overview, Patients & Doctor Verification
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
                  Monitor appointments, review registered patients, manage active doctor accounts, respond to support tickets, and moderate patient feedback.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateView('support')}
                className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start lg:self-auto"
              >
                <LifeBuoy className="w-4 h-4" />
                Open Support Desk ({supportTickets.filter((t) => t.status !== 'Resolved').length})
              </button>
            </section>

            {/* 4-column KPI strip */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Registered Patients</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                  {adminModeration.patients.length}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {adminStats?.summary?.totalUsers ?? 3} total platform accounts
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Doctors</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                  {adminStats?.summary?.activeDoctors ?? doctorsList.length}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {adminModeration.doctors.length || doctorsList.length} total registered
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Appointments</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                  {adminStats?.summary?.totalAppointments ?? appointmentsList.length}
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium tabular-nums">
                  {appointmentsList.filter((a) => a.status === 'Pending').length} awaiting approval
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Approved Consultation Fees</span>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                  ${adminStats?.summary?.totalRevenue ?? appointmentsList.filter((a) => a.status === 'Approved').length * 130}
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Completed & approved bookings</p>
              </div>
            </section>

            {/* Charts */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Weekly Appointments</h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Last 7 days</span>
                </div>
                <div className="h-44 flex items-end justify-between border-b border-l border-slate-200 dark:border-slate-800 pb-2 pl-2 pt-4">
                  {(adminStats?.chartData?.weeklyAppointments ?? [
                    { day: 'Mon', count: 8 },
                    { day: 'Tue', count: 12 },
                    { day: 'Wed', count: 15 },
                    { day: 'Thu', count: 11 },
                    { day: 'Fri', count: 18 },
                    { day: 'Sat', count: 6 },
                    { day: 'Sun', count: 4 },
                  ]).map((item: any, i: number, arr: any[]) => {
                    const maxCount = Math.max(...arr.map((x: any) => x.count || 1), 1);
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group px-1"
                      >
                        <span className="text-xs font-mono font-medium text-teal-700 dark:text-teal-400 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.count}
                        </span>
                        <div
                          className="w-full bg-slate-800 dark:bg-slate-600 group-hover:bg-teal-700 dark:group-hover:bg-teal-500 rounded-t transition-colors"
                          style={{ height: `${(item.count / maxCount) * 100}%` }}
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{item.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Doctors by Specialty</h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Active roster</span>
                </div>
                <div className="space-y-3 h-44 flex flex-col justify-center">
                  {(adminStats?.chartData?.specializationDistribution ?? [
                    { name: 'Cardiology', value: 3 },
                    { name: 'Neurology', value: 2 },
                    { name: 'Dermatology', value: 3 },
                    { name: 'General Physician', value: 6 },
                  ]).map((v: any, i: number, arr: any[]) => {
                    const maxVal = Math.max(...arr.map((x: any) => x.value || 1), 1);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{v.name}</span>
                          <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">{v.value} doctors</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-teal-700 dark:bg-teal-500 h-full rounded-full"
                            style={{ width: `${(v.value / maxVal) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Registered Patients Registry */}
            <section className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Registered Patients ({adminModeration.patients.length})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    All patient accounts and their consultation activity.
                  </p>
                </div>
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search patients by name or email..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full h-10 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-5">Patient</th>
                      <th className="py-3.5 px-5">Email</th>
                      <th className="py-3.5 px-5 text-right">Total Visits</th>
                      <th className="py-3.5 px-5 text-right">Open Chats</th>
                      <th className="py-3.5 px-5">Latest Visit</th>
                      <th className="py-3.5 px-5 text-right">Account</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {adminModeration.patients
                      .filter((p) => {
                        const q = patientSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          p.fullName.toLowerCase().includes(q) ||
                          p.email.toLowerCase().includes(q)
                        );
                      })
                      .map((patient) => (
                        <tr key={patient.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <DoctorAvatar
                                name={patient.fullName}
                                profileImageUrl={patient.profileImageUrl}
                                sizeClass="w-8 h-8"
                              />
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {patient.fullName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">{patient.email}</td>
                          <td className="py-3.5 px-5 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                            {patient.totalVisits ?? 0}
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono tabular-nums text-teal-700 dark:text-teal-400">
                            {patient.approvedVisits ?? 0}
                          </td>
                          <td className="py-3.5 px-5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                            {patient.lastVisitDate || 'No visits yet'}
                          </td>
                          <td className="py-3.5 px-5 text-right text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            Active Patient
                          </td>
                        </tr>
                      ))}
                    {adminModeration.patients.filter((p) => {
                      const q = patientSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        p.fullName.toLowerCase().includes(q) ||
                        p.email.toLowerCase().includes(q)
                      );
                    }).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 px-5 text-center text-sm text-slate-500 dark:text-slate-400">
                          No registered patients matched your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Doctor Registry */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Registered Doctors</h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-5">Doctor</th>
                      <th className="py-3.5 px-5">Email</th>
                      <th className="py-3.5 px-5">Specialty</th>
                      <th className="py-3.5 px-5">Experience</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(adminModeration.doctors.length > 0 ? adminModeration.doctors : doctorsList).map(
                      (doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <DoctorAvatar
                                doctorId={doc.id}
                                email={doc.email}
                                name={doc.fullName}
                                profileImageUrl={doc.profileImageUrl}
                                sizeClass="w-8 h-8"
                              />
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{doc.fullName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">{doc.email}</td>
                          <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">{doc.specialization}</td>
                          <td className="py-3.5 px-5 tabular-nums text-slate-600 dark:text-slate-300">
                            {doc.yearsOfExperience} yrs
                          </td>
                          <td className="py-3.5 px-5">
                            {doc.isBlocked ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                                <XCircle className="w-3.5 h-3.5" />
                                Suspended
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleBlockDoctor(doc.id)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                                doc.isBlocked
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                              }`}
                            >
                              {doc.isBlocked ? 'Reactivate' : 'Suspend'}
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Patient Reviews */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Patient Reviews</h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-5">Patient</th>
                      <th className="py-3.5 px-5">Doctor</th>
                      <th className="py-3.5 px-5">Rating</th>
                      <th className="py-3.5 px-5">Comment</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {adminModeration.feedbacks.length > 0 ? (
                      adminModeration.feedbacks.map((fb: any) => (
                        <tr key={fb.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="py-3.5 px-5 font-semibold text-slate-900 dark:text-slate-100">{fb.patientName}</td>
                          <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">{fb.doctorName}</td>
                          <td className="py-3.5 px-5 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                            {fb.rating} / 5
                          </td>
                          <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">{fb.comment}</td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteFeedback(fb.id)}
                              className="px-3 py-1.5 text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800 cursor-pointer"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 px-5 text-center text-sm text-slate-500 dark:text-slate-400">
                          No patient reviews to moderate.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* SUPPORT PORTAL (PATIENTS, DOCTORS & ADMIN) */}
        {activeView === 'support' && (
          <SupportPortal
            user={user}
            tickets={supportTickets}
            isLoading={isSupportLoading}
            theme={theme}
            onToggleTheme={setTheme}
            wsStatus={wsStatus}
            onCreateTicket={handleCreateSupportTicket}
            onSendReply={handleSendSupportReply}
            onUpdateStatus={handleUpdateSupportStatus}
            onOpenAuth={openAuthScreen}
          />
        )}

        {/* ARCHITECTURE & BACKEND CODE EXPLORER */}
        {activeView === 'devops' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-2">
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 text-sm font-medium">
                <Code2 className="w-4 h-4" />
                Backend & Deployment Files
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Java Spring Boot, Docker, and Kubernetes Architecture
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
                Browse the Java 17 microservices (`doctor-service` and `appointment-service`), MySQL initialization scripts, Nginx gateway configuration, Docker Compose, and AWS EKS manifests.
              </p>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 min-h-[480px] flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-400 px-3 pb-2">
                    Repository Files
                  </div>
                  {devopsFiles.map((item) => renderDevFolder(item))}
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden min-h-[480px]">
                <div className="bg-slate-900 text-slate-200 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Terminal className="w-4 h-4 text-teal-400 shrink-0" />
                    <span className="text-xs font-mono font-medium text-white truncate">
                      {selectedDevFile ? selectedDevFile.path : 'Select a file'}
                    </span>
                  </div>
                  {selectedDevFile && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedDevFile.content || '');
                        showToast('Copied file contents to clipboard.');
                      }}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-700 inline-flex items-center gap-1.5 cursor-pointer font-medium whitespace-nowrap shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                  )}
                </div>

                <div className="flex-1 p-4 overflow-auto max-h-[500px] font-mono text-xs text-slate-200 leading-relaxed">
                  {selectedDevFile ? (
                    <pre className="whitespace-pre">
                      <code>{selectedDevFile.content}</code>
                    </pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-12">
                      <Code2 className="w-8 h-8 text-slate-600" />
                      <span>Select a file from the tree on the left to inspect its source.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingOpen && selectedDoctor && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden shadow-xl p-6 space-y-5"
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <DoctorAvatar
                    doctorId={selectedDoctor.id}
                    email={selectedDoctor.email}
                    name={selectedDoctor.fullName}
                    profileImageUrl={selectedDoctor.profileImageUrl}
                    sizeClass="w-12 h-12"
                  />
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Book Visit with {selectedDoctor.fullName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                      {selectedDoctor.specialization} · ${selectedDoctor.consultationFee} per visit
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close booking dialog"
                  onClick={() => setIsBookingOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="booking-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Preferred date
                  </label>
                  <input
                    id="booking-date"
                    type="date"
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 font-mono tabular-nums"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Doctor hours: {selectedDoctor.availabilitySchedule}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="booking-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Reason for visit
                  </label>
                  <textarea
                    id="booking-notes"
                    rows={3}
                    placeholder="Briefly describe your symptoms, how long they have lasted, or any medications you take..."
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Attach medical report (optional)
                  </span>
                  <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/60 flex flex-col items-center justify-center text-center text-xs text-slate-600 dark:text-slate-400 space-y-1.5 relative">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {isUploading ? (
                      <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-medium">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Uploading file...</span>
                      </div>
                    ) : uploadedFileName ? (
                      <div className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Attached: {uploadedFileName}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span>
                          <strong className="text-slate-800 dark:text-slate-200">Click to upload</strong> PDF, JPG, or PNG
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBookingSubmitting}
                  onClick={handleConfirmBooking}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isBookingSubmitting ? 'Sending...' : 'Send Booking Request'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Incoming Video Call Banner */}
      <AnimatePresence>
        {incomingVideoCall && !activeVideoAppointment && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-50 w-[min(92vw,380px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-center gap-3.5">
              <DoctorAvatar
                doctorId={incomingVideoCall.appointment.doctorId}
                name={incomingVideoCall.callerName}
                sizeClass="w-12 h-12"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  Incoming Video Consultation
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                  {incomingVideoCall.callerName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums truncate">
                  {incomingVideoCall.appointment.specialization} · {incomingVideoCall.appointment.date}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={declineIncomingVideoCall}
                className="flex-1 py-2.5 px-3 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <PhoneOff className="w-4 h-4" />
                Decline
              </button>
              <button
                type="button"
                onClick={acceptIncomingVideoCall}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Phone className="w-4 h-4" />
                Join Video
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-Time Video Consultation Modal */}
      <AnimatePresence>
        {activeVideoAppointment && user && (
          <VideoCallModal
            user={user}
            appointment={activeVideoAppointment}
            isInitiator={isVideoInitiator}
            wsRef={wsRef}
            onRegisterSignalHandler={(handler) => {
              videoSignalHandlerRef.current = handler;
            }}
            onOpenChat={() => {
              setActiveChatAppointment(activeVideoAppointment);
              setActiveVideoAppointment(null);
            }}
            onClose={() => setActiveVideoAppointment(null)}
          />
        )}
      </AnimatePresence>

      {/* Clean Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 MediConnect. Online Doctor Consultation Platform.</span>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => navigateView('patient')}
              className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              Patients
            </button>
            <button
              type="button"
              onClick={() => navigateView('doctor')}
              className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              Doctor
            </button>
            <button
              type="button"
              onClick={() => navigateView('admin')}
              className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => navigateView('support')}
              className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              Support
            </button>
            <button
              type="button"
              onClick={() => navigateView('devops')}
              className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              Architecture
            </button>
          </div>
        </div>
      </footer>
    </div>
    </MotionConfig>
  );
}
