import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LifeBuoy,
  Send,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Plus,
  Shield,
  Sun,
  Moon,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  UserSession,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from '../types';

interface SupportPortalProps {
  user: UserSession | null;
  tickets: SupportTicket[];
  isLoading: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: (mode: 'light' | 'dark') => void;
  wsStatus: 'connecting' | 'connected' | 'reconnecting';
  onCreateTicket: (payload: {
    category: SupportTicketCategory;
    priority: SupportTicketPriority;
    subject: string;
    message: string;
  }) => Promise<SupportTicket | null>;
  onSendReply: (ticketId: number, text: string) => Promise<void>;
  onUpdateStatus: (ticketId: number, status: SupportTicketStatus) => Promise<void>;
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

const PATIENT_CATEGORIES: SupportTicketCategory[] = [
  'Appointments',
  'Medical Records',
  'Billing & Payments',
  'Technical Issue',
  'Account & Verification',
];

const DOCTOR_CATEGORIES: SupportTicketCategory[] = [
  'Account & Verification',
  'Appointments',
  'Billing & Payments',
  'Technical Issue',
  'Medical Records',
];

export const SupportPortal: React.FC<SupportPortalProps> = ({
  user,
  tickets,
  isLoading,
  theme,
  onToggleTheme,
  wsStatus,
  onCreateTicket,
  onSendReply,
  onUpdateStatus,
  onOpenAuth,
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | SupportTicketStatus>('All');
  const [roleFilter, setRoleFilter] = useState<'All' | 'PATIENT' | 'DOCTOR'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  const [category, setCategory] = useState<SupportTicketCategory>(
    user?.role === 'DOCTOR' ? 'Account & Verification' : 'Appointments'
  );
  const [priority, setPriority] = useState<SupportTicketPriority>('Normal');
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const threadBottomRef = useRef<HTMLDivElement>(null);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (statusFilter !== 'All' && ticket.status !== statusFilter) return false;
      if (user?.role === 'ADMIN' && roleFilter !== 'All' && ticket.requesterRole !== roleFilter) {
        return false;
      }
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        ticket.subject.toLowerCase().includes(q) ||
        ticket.requesterName.toLowerCase().includes(q) ||
        ticket.requesterEmail.toLowerCase().includes(q) ||
        ticket.category.toLowerCase().includes(q) ||
        String(ticket.id).includes(q)
      );
    });
  }, [tickets, statusFilter, roleFilter, searchTerm, user?.role]);

  const activeTicket = useMemo(() => {
    if (selectedTicketId) {
      const match = filteredTickets.find((t) => t.id === selectedTicketId) ||
        tickets.find((t) => t.id === selectedTicketId);
      if (match) return match;
    }
    return filteredTickets[0] || null;
  }, [selectedTicketId, filteredTickets, tickets]);

  useEffect(() => {
    if (threadBottomRef.current) {
      threadBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicket?.id, activeTicket?.messages.length]);

  const openCount = tickets.filter((t) => t.status === 'Open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved').length;
  const urgentCount = tickets.filter((t) => t.priority === 'Urgent' && t.status !== 'Resolved').length;

  const renderStatusLabel = (status: SupportTicketStatus) => {
    if (status === 'Resolved') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Resolved
        </span>
      );
    }
    if (status === 'In Progress') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        Open
      </span>
    );
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !initialMessage.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const created = await onCreateTicket({
        category,
        priority,
        subject: subject.trim(),
        message: initialMessage.trim(),
      });
      if (created) {
        setSelectedTicketId(created.id);
        setSubject('');
        setInitialMessage('');
        setPriority('Normal');
        setIsNewTicketOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendThreadReply = async () => {
    const clean = replyText.trim();
    if (!clean || !activeTicket || isSendingReply) return;
    setIsSendingReply(true);
    setReplyText('');
    try {
      await onSendReply(activeTicket.id, clean);
    } finally {
      setIsSendingReply(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
              MediConnect Support Portal
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
              Help Desk for Patients, Doctors, and Clinic Administrators
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Sign in with your Patient, Doctor, or Admin account to open live support tickets, upload visit inquiries, or coordinate directly with clinic operations in real time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              Sign In to Open Ticket
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Patient Support
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Get help rescheduling appointments, attaching lab PDFs, billing questions, and joining doctor chat rooms.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Doctor Desk
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Coordinate consultation schedules, credential verification, consultation fee updates, and technical support.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Admin Operations
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Triage live patient and doctor support threads from one unified inbox with real-time WebSocket updates.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const isAdmin = user.role === 'ADMIN';
  const categories = user.role === 'DOCTOR' ? DOCTOR_CATEGORIES : PATIENT_CATEGORIES;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Support Portal Header */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5 text-sm font-medium text-teal-700 dark:text-teal-400">
            <LifeBuoy className="w-4 h-4 shrink-0" />
            <span>
              {isAdmin
                ? 'Admin Support Desk'
                : user.role === 'DOCTOR'
                ? 'Doctor Support Portal'
                : 'Patient Support Portal'}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {wsStatus === 'connected' ? 'Live sync active' : 'Reconnecting...'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
            {isAdmin
              ? 'Support Requests from Patients & Doctors'
              : user.role === 'DOCTOR'
              ? 'Clinician Help Desk & Schedule Support'
              : 'Help Center & Direct Clinic Support'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {isAdmin
              ? 'Reply to open patient and doctor inquiries in real time, update ticket progress, and mark issues resolved.'
              : 'Submit a new request or continue an active conversation with MediConnect clinic administration.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => onToggleTheme('light')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
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
              onClick={() => onToggleTheme('dark')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                theme === 'dark'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Dark
            </button>
          </div>

          {!isAdmin && (
            <button
              type="button"
              onClick={() => setIsNewTicketOpen((prev) => !prev)}
              className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              {isNewTicketOpen ? 'Hide Ticket Form' : 'New Support Ticket'}
            </button>
          )}
        </div>
      </motion.section>

      {/* KPI Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Tickets</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{openCount}</div>
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Awaiting response</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">In Progress</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{inProgressCount}</div>
          <p className="text-xs text-teal-700 dark:text-teal-400 font-medium">Active conversations</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Resolved</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{resolvedCount}</div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Completed requests</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Urgent Queue</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">{urgentCount}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400">High-priority items</p>
        </div>
      </section>

      {/* New Ticket Composer (Patients & Doctors) */}
      {!isAdmin && isNewTicketOpen && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Create New Support Ticket
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Your message is delivered immediately to the MediConnect Admin Support Desk.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="support-category" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <select
                  id="support-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                  className="w-full h-10 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="support-priority" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Priority
                </label>
                <select
                  id="support-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
                  className="w-full h-10 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="support-subject" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Subject
                </label>
                <input
                  id="support-subject"
                  type="text"
                  required
                  placeholder={
                    user.role === 'DOCTOR'
                      ? 'Example: Update consultation hours for next week'
                      : 'Example: Need help rescheduling my appointment'
                  }
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-10 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="support-message" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Details
              </label>
              <textarea
                id="support-message"
                rows={3}
                required
                placeholder="Describe what you need assistance with..."
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Shield className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                For medical emergencies, always contact local emergency services immediately.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !subject.trim() || !initialMessage.trim()}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </div>
          </form>
        </motion.section>
      )}

      {/* Two-Column Inbox & Live Thread */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ticket List Column */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isAdmin ? 'Search tickets, patient, or doctor...' : 'Search your tickets...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
                {(['All', 'Open', 'In Progress', 'Resolved'] as const).map((statusTab) => (
                  <button
                    key={statusTab}
                    type="button"
                    onClick={() => setStatusFilter(statusTab)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      statusFilter === statusTab
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {statusTab}
                  </button>
                ))}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {(['All', 'PATIENT', 'DOCTOR'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRoleFilter(r)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        roleFilter === r
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {r === 'All' ? 'All Roles' : r === 'PATIENT' ? 'Patients' : 'Doctors'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[540px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Loading support tickets...
              </div>
            ) : filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => {
                const isSelected = activeTicket?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer block ${
                      isSelected
                        ? 'bg-teal-50/70 dark:bg-teal-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        #{ticket.id} · {ticket.requesterRole === 'DOCTOR' ? 'Doctor' : 'Patient'}
                      </span>
                      {renderStatusLabel(ticket.status)}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {ticket.subject}
                    </h3>
                    <div className="flex items-center justify-between gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="truncate">
                        {ticket.requesterName} · {ticket.category}
                      </span>
                      <span
                        className={`font-medium shrink-0 ${
                          ticket.priority === 'Urgent'
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-10 text-center space-y-3">
                <AlertCircle className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No support tickets matched this filter.
                </p>
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsNewTicketOpen(true)}
                    className="px-3.5 py-2 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-lg cursor-pointer"
                  >
                    Open Your First Ticket
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Live Ticket Conversation Column */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          {activeTicket ? (
            <>
              <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        Ticket #{activeTicket.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{activeTicket.requesterName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeTicket.requesterRole === 'DOCTOR' ? 'Doctor Account' : 'Patient Account'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeTicket.category}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {activeTicket.subject}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin ? (
                      <select
                        aria-label="Update ticket status"
                        value={activeTicket.status}
                        onChange={(e) =>
                          onUpdateStatus(activeTicket.id, e.target.value as SupportTicketStatus)
                        }
                        className="h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-3">
                        {renderStatusLabel(activeTicket.status)}
                        {activeTicket.status !== 'Resolved' && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(activeTicket.id, 'Resolved')}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Created {activeTicket.createdAt} · Last updated {activeTicket.updatedAt} · Priority: {activeTicket.priority}
                </p>
              </div>

              <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-950/70 space-y-4 max-h-[380px] overflow-y-auto">
                {activeTicket.messages.map((msg) => {
                  const isSelf = msg.senderId === user.id || msg.senderRole === user.role;
                  const roleLabel =
                    msg.senderRole === 'ADMIN'
                      ? 'Support Admin'
                      : msg.senderRole === 'DOCTOR'
                      ? 'Doctor'
                      : 'Patient';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className={`flex flex-col max-w-[82%] ${
                        isSelf ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 px-1">
                        {msg.senderName} · {roleLabel}
                      </span>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isSelf
                            ? 'bg-teal-700 text-white rounded-br-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums mt-1 px-1">
                        {msg.timestamp}
                      </span>
                    </motion.div>
                  );
                })}
                <div ref={threadBottomRef} />
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <input
                  type="text"
                  placeholder={
                    isAdmin
                      ? `Reply to ${activeTicket.requesterName}...`
                      : 'Write a follow-up message to Clinic Support...'
                  }
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendThreadReply();
                  }}
                  className="flex-1 h-11 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white dark:focus:bg-slate-950"
                />
                <button
                  type="button"
                  onClick={handleSendThreadReply}
                  disabled={isSendingReply || !replyText.trim()}
                  className="h-11 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-medium rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Send className="w-4 h-4" />
                  Reply
                </button>
              </div>
            </>
          ) : (
            <div className="p-14 text-center space-y-3">
              <LifeBuoy className="w-9 h-9 mx-auto text-slate-300 dark:text-slate-600" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Select or create a support ticket
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {isAdmin
                  ? 'Choose any patient or doctor ticket on the left to inspect its details and reply live.'
                  : 'Open a new support ticket to reach MediConnect clinic administration for scheduling, billing, or technical help.'}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
