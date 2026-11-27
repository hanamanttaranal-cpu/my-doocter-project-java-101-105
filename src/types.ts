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

export interface DevFileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  content?: string;
  children?: DevFileNode[];
}
