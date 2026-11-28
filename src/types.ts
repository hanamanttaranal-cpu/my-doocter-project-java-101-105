export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface UserSession {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  token: string;
  profileImageUrl: string;
}

export interface Doctor {
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

export interface Appointment {
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

export interface ChatMessage {
  id: number;
  appointmentId: number;
  senderId: number;
  senderName: string;
  text: string;
  timestamp: string;
  type: string;
}

export interface TriageResult {
  specialty: string;
  urgency: 'Low' | 'Medium' | 'High';
  insights: string;
  questionsToAsk: string[];
}

export interface ChatPresenceUser {
  userId: number;
  fullName: string;
  role: string;
}

export interface AdminPatientSummary {
  id: number;
  fullName: string;
  email: string;
  role: string;
  profileImageUrl: string;
  totalVisits: number;
  approvedVisits: number;
  lastVisitDate: string | null;
}

export type SupportTicketCategory =
  | 'Appointments'
  | 'Billing & Payments'
  | 'Technical Issue'
  | 'Account & Verification'
  | 'Medical Records';

export type SupportTicketPriority = 'Low' | 'Normal' | 'Urgent';

export type SupportTicketStatus = 'Open' | 'In Progress' | 'Resolved';

export interface SupportTicketMessage {
  id: number;
  ticketId: number;
  senderId: number;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
}

export interface SupportTicket {
  id: number;
  requesterId: number;
  requesterName: string;
  requesterEmail: string;
  requesterRole: 'PATIENT' | 'DOCTOR';
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  subject: string;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: SupportTicketMessage[];
}

export interface DevFileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  content?: string;
  children?: DevFileNode[];
}
