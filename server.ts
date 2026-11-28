import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

// Helper to initialize Google Gemini AI securely on the server
let cachedKey = '';
let cachedClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const rawKey = (process.env.GEMINI_API_KEY || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
  if (!rawKey || rawKey === 'MY_GEMINI_API_KEY' || rawKey === 'your_gemini_api_key') {
    return null;
  }
  if (!cachedClient || cachedKey !== rawKey) {
    cachedClient = new GoogleGenAI({
      apiKey: rawKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedKey = rawKey;
  }
  return cachedClient;
}

function formatGeminiError(err: any, fallbackMessage: string): { status: number; message: string } {
  const rawMsg = String(err?.message || '');
  if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid') || err?.status === 400) {
    return {
      status: 400,
      message: 'The Gemini API key is invalid. Please check or update your GEMINI_API_KEY in the Settings > Secrets panel.',
    };
  }
  if (rawMsg.includes('PERMISSION_DENIED') || err?.status === 403) {
    return {
      status: 403,
      message: 'Gemini API access was denied. Please verify your GEMINI_API_KEY permissions in the Settings > Secrets panel.',
    };
  }
  if (rawMsg.includes('RESOURCE_EXHAUSTED') || err?.status === 429) {
    return {
      status: 429,
      message: 'Gemini API quota exceeded. Please wait a moment or check your plan in Settings > Secrets.',
    };
  }
  return {
    status: 500,
    message: rawMsg || fallbackMessage,
  };
}

// In-Memory Database representing MySQL tables with pre-built clinical mock records
let doctors = [
  {
    id: 1,
    fullName: "Dr. Sarah Jenkins",
    email: "sarah.jenkins@mediconnect.pro",
    specialization: "Cardiology",
    yearsOfExperience: 14,
    biography: "Board-certified cardiologist specializing in preventive medicine, heart failure recovery, and non-invasive imaging diagnostics.",
    profileImageUrl: "",
    certificatesUrl: "certification_cardio_board_certified.pdf",
    rating: 4.9,
    isBlocked: false,
    availabilitySchedule: "Mon, Wed, Fri 09:00 - 15:00",
    consultationFee: 150
  },
  {
    id: 2,
    fullName: "Dr. David Chen",
    email: "david.chen@mediconnect.pro",
    specialization: "Neurology",
    yearsOfExperience: 12,
    biography: "Senior clinical researcher and neurologist focusing on cognitive decline, persistent migraine treatments, and peripheral neuropathy.",
    profileImageUrl: "",
    certificatesUrl: "certification_neuro_board_certified.pdf",
    rating: 4.8,
    isBlocked: false,
    availabilitySchedule: "Tue, Thu 10:00 - 16:00",
    consultationFee: 175
  },
  {
    id: 3,
    fullName: "Dr. Jessica Taylor",
    email: "jessica.taylor@mediconnect.pro",
    specialization: "Dermatology",
    yearsOfExperience: 8,
    biography: "Expert pediatric and adult dermatologist focusing on skin cancer screening, severe eczema protocols, and laser treatments.",
    profileImageUrl: "",
    certificatesUrl: "certification_derm_board_certified.pdf",
    rating: 4.7,
    isBlocked: false,
    availabilitySchedule: "Mon, Tue, Thu 08:30 - 14:00",
    consultationFee: 120
  },
  {
    id: 4,
    fullName: "Dr. Marcus Vance",
    email: "marcus.vance@mediconnect.pro",
    specialization: "General Physician",
    yearsOfExperience: 10,
    biography: "Comprehensive primary care, chronic condition auditing, metabolic management, and early-stage disease screenings.",
    profileImageUrl: "",
    certificatesUrl: "certification_general_board_certified.pdf",
    rating: 4.9,
    isBlocked: false,
    availabilitySchedule: "Mon-Fri 09:00 - 17:00",
    consultationFee: 90
  },
  {
    id: 5,
    fullName: "Dr. Chloe Bennett",
    email: "chloe.bennett@mediconnect.pro",
    specialization: "Orthopedics",
    yearsOfExperience: 11,
    biography: "Reconstructive joint surgeon and sports medicine specialist. Expert in skeletal biomechanics and microscopic arthroscopy.",
    profileImageUrl: "",
    certificatesUrl: "certification_ortho_board_certified.pdf",
    rating: 4.6,
    isBlocked: false,
    availabilitySchedule: "Wed, Thu 11:00 - 18:00",
    consultationFee: 160
  }
];

let users = [
  { id: 1, email: "patient@mediconnect.pro", password: "password", fullName: "John Carter", role: "PATIENT", profileImageUrl: "" },
  { id: 2, email: "doctor@mediconnect.pro", password: "password", fullName: "Dr. Sarah Jenkins", role: "DOCTOR", profileImageUrl: "" },
  { id: 3, email: "admin@mediconnect.pro", password: "password", fullName: "Director Vance", role: "ADMIN", profileImageUrl: "" }
];

let appointments = [
  {
    id: 1,
    patientId: 1,
    patientName: "John Carter",
    doctorId: 1,
    doctorName: "Dr. Sarah Jenkins",
    specialization: "Cardiology",
    date: "2026-05-24",
    notes: "Requesting consultation regarding occasional mild heart palpitation episodes during high-stress cardiovascular training.",
    status: "Approved",
    medicalReportUrl: "report_stress_test_cooper.pdf",
  },
  {
    id: 2,
    patientId: 1,
    patientName: "John Carter",
    doctorId: 3,
    doctorName: "Dr. Jessica Taylor",
    specialization: "Dermatology",
    date: "2026-06-02",
    notes: "Checking a mole on my shoulder that seems to have changed size slightly.",
    status: "Pending",
    medicalReportUrl: "",
  }
];

let chatMessages = [
  { id: 1, appointmentId: 1, senderId: 1, senderName: "John Carter", text: "Hello Dr. Jenkins, thanks for approving the request. I wanted to send over my heart rate graphs.", timestamp: "10:15 AM", type: "text" },
  { id: 2, appointmentId: 1, senderId: 2, senderName: "Dr. Sarah Jenkins", text: "Hello John, I see the reports you uploaded. Did these palpitations occur under high cardio or rest?", timestamp: "10:17 AM", type: "text" }
];

let feedbacks = [
  { id: 1, patientName: "Aria Montgomery", doctorName: "Dr. Sarah Jenkins", rating: 5, comment: "Incredibly attentive and thorough. Explained complex cardiac tests with exceptional clarity." },
  { id: 2, patientName: "Michael Thorne", doctorName: "Dr. David Chen", rating: 4, comment: "Prompt and professional. Provided comforting guidance for persistent migraines." }
];

async function startServer() {
  const app = express();
  app.use(express.json());

  // Log requests securely
  app.use((req, res, next) => {
    console.log(`[MediConnect Pro Engine] ${req.method} ${req.url}`);
    next();
  });

  // -------- REST APIS --------

  // 0. Health Check for Docker / AWS EKS Probes
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'UP', service: 'mediconnect-frontend-bff' });
  });

  // 1. JWT and User Login Routing
  app.post('/api/users/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: "Please enter both your email address and password." });
    }
    const user = users.find(u => u.email.toLowerCase() === email && u.password === password);
    if (user) {
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token_${user.id}_${user.role}`;
      return res.json({ token, role: user.role, email: user.email, fullName: user.fullName, id: user.id, profileImageUrl: user.profileImageUrl });
    }
    return res.status(401).json({ error: "Incorrect email or password. Please check your details and try again." });
  });

  // 2. Mock Google Sign-In Emulator
  app.post('/api/users/google-login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const { name, imageUrl } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }
    let user = users.find(u => u.email.toLowerCase() === email);
    if (!user) {
      user = {
        id: users.length + 1,
        email,
        password: "oauth_generated_password",
        fullName: name || "Google User",
        role: "PATIENT",
        profileImageUrl: imageUrl || ""
      };
      users.push(user);
    }
    const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.oauth_${user.id}_${user.role}`;
    return res.json({ token, role: user.role, email: user.email, fullName: user.fullName, id: user.id, profileImageUrl: user.profileImageUrl });
  });

  // 3. User Register Endpoint (Sign Up)
  app.post('/api/users/register', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const fullName = String(req.body?.fullName || '').trim();
    const role = String(req.body?.role || 'PATIENT').toUpperCase();
    const specialization = String(req.body?.specialization || 'General Physician').trim();
    const yearsOfExperience = Number(req.body?.yearsOfExperience) || 5;
    const consultationFee = Number(req.body?.consultationFee) || 100;
    const biography = String(req.body?.biography || '').trim();

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "Full name, email address, and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }
    if (!['PATIENT', 'DOCTOR'].includes(role)) {
      return res.status(400).json({ error: "Invalid account type selected." });
    }
    if (users.find(u => u.email.toLowerCase() === email)) {
      return res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
    }

    const newUser = {
      id: users.length + 1,
      email,
      password,
      fullName,
      role,
      profileImageUrl: ""
    };
    users.push(newUser);

    if (role === "DOCTOR") {
      const displayDocName = fullName.startsWith("Dr.") ? fullName : `Dr. ${fullName}`;
      newUser.fullName = displayDocName;
      doctors.push({
        id: doctors.length + 1,
        fullName: displayDocName,
        email,
        specialization: specialization || "General Physician",
        yearsOfExperience,
        biography: biography || `Board-certified ${specialization || "General Physician"} providing online consultations on MediConnect.`,
        profileImageUrl: "",
        certificatesUrl: "verified_credentials.pdf",
        rating: 4.8,
        isBlocked: false,
        availabilitySchedule: "Mon-Fri 09:00 - 17:00",
        consultationFee
      });
    }

    const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token_${newUser.id}_${newUser.role}`;
    return res.status(201).json({ token, role: newUser.role, email: newUser.email, fullName: newUser.fullName, id: newUser.id, profileImageUrl: "" });
  });

  // 4. Retrieve Doctors list with filters
  app.get('/api/doctors', (req, res) => {
    const { specialization, minExp, query } = req.query;
    let filtered = doctors.filter(d => !d.isBlocked);

    if (specialization && specialization !== "All") {
      filtered = filtered.filter(d => d.specialization.toLowerCase() === (specialization as string).toLowerCase());
    }
    if (minExp) {
      filtered = filtered.filter(d => d.yearsOfExperience >= parseInt(minExp as string, 10));
    }
    if (query) {
      const q = (query as string).toLowerCase();
      filtered = filtered.filter(d => d.fullName.toLowerCase().includes(q) || d.biography.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q));
    }
    res.json(filtered);
  });

  // 5. Update Patient Personal Details / Profile Picture (mock Cloudinary URL)
  app.post('/api/patients/profile', (req, res) => {
    const { userId, fullName, imageUrl } = req.body;
    const user = users.find(u => u.id === parseInt(userId));
    if (user) {
      user.fullName = fullName || user.fullName;
      if (imageUrl) user.profileImageUrl = imageUrl;
      // Update appointment helper name listings
      appointments.forEach(a => {
        if (a.patientId === user.id) a.patientName = user.fullName;
      });
      return res.json({ success: true, user });
    }
    res.status(404).json({ error: "System Patient details not located." });
  });

  // 6. Local attachment metadata endpoint
  app.post('/api/cloudinary/upload', (req, res) => {
    const { fileName } = req.body;
    return res.json({
      asset_id: `file_asset_${Math.random().toString(36).slice(2, 11)}`,
      public_id: `mediconnect/${fileName}`,
      secure_url: `/uploads/${encodeURIComponent(fileName || 'record.pdf')}`,
      created_at: new Date().toISOString()
    });
  });

  // 7. View Patient & Appointments Listings
  app.get('/api/appointments', (req, res) => {
    const { userId, role } = req.query;
    const uid = parseInt(userId as string);
    if (role === 'DOCTOR') {
      const user = users.find(u => u.id === uid);
      const doc = doctors.find(d => d.email.toLowerCase() === user?.email.toLowerCase() || (user?.email === 'doctor@mediconnect.pro' && d.id === 1));
      if (doc) {
        return res.json(appointments.filter(a => a.doctorId === doc.id));
      }
      return res.json([]);
    } else if (role === 'ADMIN') {
      return res.json(appointments);
    } else {
      return res.json(appointments.filter(a => a.patientId === uid));
    }
  });

  // 8. Place Appointment Booking Request
  app.post('/api/appointments', (req, res) => {
    const { patientId, doctorId, date, notes, medicalReportUrl } = req.body;
    const patientUser = users.find(u => u.id === parseInt(patientId));
    const targetDoc = doctors.find(d => d.id === parseInt(doctorId));

    if (!patientUser || !targetDoc) {
      return res.status(404).json({ error: "Patient or clinician credentials reference not validated." });
    }

    const newAppointment = {
      id: appointments.length + 1,
      patientId: patientUser.id,
      patientName: patientUser.fullName,
      doctorId: targetDoc.id,
      doctorName: targetDoc.fullName,
      specialization: targetDoc.specialization,
      date: date || new Date().toISOString().split('T')[0],
      notes: notes || "Routine healthcare consultation review.",
      status: "Pending",
      medicalReportUrl: medicalReportUrl || ""
    };

    appointments.push(newAppointment);
    res.status(201).json(newAppointment);
  });

  // 9. Update Consult / Appointment requests (Approve / Reject)
  app.post('/api/appointments/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Approved or Rejected
    const apt = appointments.find(a => a.id === parseInt(id));
    if (apt) {
      apt.status = status;
      return res.json(apt);
    }
    return res.status(404).json({ error: "Target appointment not found." });
  });

  // 10. Fetch Chat Message history for specific consultations
  app.get('/api/chat', (req, res) => {
    const { appointmentId } = req.query;
    const aid = parseInt(appointmentId as string);
    const msgs = chatMessages.filter(m => m.appointmentId === aid);
    res.json(msgs);
  });

  // 11. Send Chat Message and Trigger Instant Automated/AI Doctor response
  app.post('/api/chat', (req, res) => {
    const { appointmentId, senderId, senderName, text } = req.body;
    const aid = parseInt(appointmentId);
    
    // Save patient message
    const patientMsg = {
      id: chatMessages.length + 1,
      appointmentId: aid,
      senderId: parseInt(senderId),
      senderName,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: "text"
    };
    chatMessages.push(patientMsg);

    res.json(patientMsg);

    // Simulate doctor reply only when a patient sends a message
    const apt = appointments.find(a => a.id === aid);
    const senderUser = users.find(u => u.id === patientMsg.senderId);
    if (apt && senderUser?.role !== 'DOCTOR') {
      setTimeout(() => {
        const docAnswers = [
          "Thank you for sharing those details. I have added them to your visit notes.",
          "I am reviewing your information now. Please let me know when you started noticing these symptoms.",
          "Please keep monitoring how you feel and let me know if anything worsens before our appointment.",
          "Stay hydrated and avoid strenuous activity until we speak during your scheduled visit.",
          "Got it — I see your uploaded file and will walk through the results with you."
        ];
        const randomAnswer = docAnswers[Math.floor(Math.random() * docAnswers.length)];
        const doctorMsg = {
          id: chatMessages.length + 1,
          appointmentId: aid,
          senderId: 2,
          senderName: apt.doctorName,
          text: randomAnswer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: "text"
        };
        chatMessages.push(doctorMsg);
      }, 2000);
    }
  });

  // 12. Admin Moderation Capabilities (Block clinicians, edit profiles, moderate reviews)
  app.get('/api/admin/moderation', (req, res) => {
    res.json({
      doctors: doctors,
      patients: users.filter(u => u.role === "PATIENT"),
      feedbacks: feedbacks
    });
  });

  app.post('/api/admin/toggle-doctor', (req, res) => {
    const { doctorId } = req.body;
    const doc = doctors.find(d => d.id === parseInt(doctorId));
    if (doc) {
      doc.isBlocked = !doc.isBlocked;
      return res.json({ success: true, doc });
    }
    res.status(404).json({ error: "Doctor profile not found." });
  });

  app.delete('/api/admin/feedback/:id', (req, res) => {
    const id = parseInt(req.params.id);
    feedbacks = feedbacks.filter(f => f.id !== id);
    res.json({ success: true, feedbacks });
  });

  // 13. Recharts-friendly Analytics endpoint for interactive dashboards
  app.get('/api/admin/analytics', (req, res) => {
    res.json({
      summary: {
        totalUsers: users.length,
        activeDoctors: doctors.filter(d => !d.isBlocked).length,
        totalAppointments: appointments.length,
        totalChats: chatMessages.length,
        totalRevenue: appointments.filter(a => a.status === "Approved").reduce((sum, item) => sum + 130, 0)
      },
      chartData: {
        weeklyAppointments: [
          { day: "Mon", count: 8, visits: 5 },
          { day: "Tue", count: 12, visits: 9 },
          { day: "Wed", count: 15, visits: 12 },
          { day: "Thu", count: 11, visits: 8 },
          { day: "Fri", count: 18, visits: 14 },
          { day: "Sat", count: 6, visits: 4 },
          { day: "Sun", count: 4, visits: 2 }
        ],
        specializationDistribution: [
          { name: "Cardiology", value: doctors.filter(d => d.specialization === "Cardiology").length + 2 },
          { name: "Neurology", value: doctors.filter(d => d.specialization === "Neurology").length + 1 },
          { name: "Dermatology", value: doctors.filter(d => d.specialization === "Dermatology").length + 2 },
          { name: "General Physician", value: doctors.filter(d => d.specialization === "General Physician").length + 5 },
          { name: "Orthopedics", value: doctors.filter(d => d.specialization === "Orthopedics").length + 2 }
        ],
        dailyChats: [
          { hour: "08:00", active: 10 },
          { hour: "10:00", active: 25 },
          { hour: "12:00", active: 40 },
          { hour: "14:00", active: 30 },
          { hour: "16:00", active: 45 },
          { hour: "18:00", active: 15 }
        ]
      }
    });
  });

  // 14. Advanced Symptom Triage with Gemini AI
  app.post('/api/gemini/triage', async (req, res) => {
    const { symptoms } = req.body;
    if (!symptoms || !String(symptoms).trim()) {
      return res.status(400).json({ error: "Please describe your symptoms first." });
    }

    const aiClient = getAiClient();
    if (!aiClient) {
      return res.status(503).json({
        error: "Gemini AI triage requires a valid GEMINI_API_KEY in Settings > Secrets."
      });
    }

    try {
      const triagePrompt = `You are an elite, board-certified medical triage specialist assistant.
A patient has provided the following symptoms: "${symptoms}".
Perform a safe, educational medical triage evaluation.
CRITICAL: Never state a final diagnosis, only provide educational insights, select the best matching clinical specialty from: [Cardiology, Neurology, Dermatology, General Physician, Orthopedics], define an estimated urgency level: [Low, Medium, High], and list EXACTLY 3 helpful questions the patient should prepare to ask their consultant during their online call.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: triagePrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              specialty: {
                type: Type.STRING,
                description: 'Best matching specialty from Cardiology, Neurology, Dermatology, General Physician, Orthopedics'
              },
              urgency: {
                type: Type.STRING,
                description: 'Low, Medium, or High'
              },
              insights: {
                type: Type.STRING,
                description: 'Detailed educational insight with warning instructions to call emergency services if symptoms turn severe'
              },
              questionsToAsk: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 3 helpful questions for the patient to ask their doctor'
              }
            },
            required: ['specialty', 'urgency', 'insights', 'questionsToAsk']
          }
        }
      });

      const responseText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(responseText);
      return res.json({ triageResult: parsed });
    } catch (err: any) {
      const formatted = formatGeminiError(err, 'AI Symptom Triage service failed to process the request.');
      if (formatted.status >= 500) {
        console.error('Gemini triage error:', formatted.message);
      } else {
        console.warn('Gemini triage notice:', formatted.message);
      }
      return res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 14b. Conversational Patient AI Health Assistant (Gemini Chat)
  app.post('/api/gemini/assistant', async (req, res) => {
    const message = String(req.body?.message || '').trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message) {
      return res.status(400).json({ error: "Please enter a question for the AI Health Assistant." });
    }

    const aiClient = getAiClient();
    if (!aiClient) {
      return res.status(503).json({
        error: "AI Health Assistant requires a valid GEMINI_API_KEY in Settings > Secrets."
      });
    }

    try {
      const formattedHistory = history
        .filter(
          (item: any) =>
            item &&
            (item.role === 'user' || item.role === 'model') &&
            typeof item.text === 'string' &&
            item.text.trim().length > 0
        )
        .slice(-12)
        .map((item: any) => ({
          role: item.role,
          parts: [{ text: item.text.trim() }],
        }));

      const availableSpecs = doctors
        .filter((d) => !d.isBlocked)
        .map((d) => `${d.fullName} (${d.specialization}, $${d.consultationFee}/visit)`)
        .join('; ');

      const chat = aiClient.chats.create({
        model: 'gemini-4-hydrogen',
        history: formattedHistory,
        config: {
          systemInstruction: `You are the MediConnect Patient AI Health Assistant. Speak in clear, calm, everyday language that any patient can easily understand.
Your role:
- Help patients understand general symptoms, prepare for their doctor appointment, and choose which medical specialty to book from: Cardiology, Neurology, Dermatology, General Physician, or Orthopedics.
- Currently available MediConnect doctors: ${availableSpecs}.
- Keep responses concise (3-6 sentences or short bullet points).
- Never claim to give an official medical diagnosis or prescribe medication.
- If the patient describes severe emergency symptoms (e.g., chest pain, trouble breathing, sudden numbness/weakness), clearly advise calling local emergency services right away.`,
        },
      });

      const response = await chat.sendMessage({ message });
      const reply = (response.text ?? '').trim();
      if (!reply) {
        return res.status(502).json({ error: "The AI Health Assistant returned an empty response. Please try again." });
      }
      return res.json({ reply });
    } catch (err: any) {
      const formatted = formatGeminiError(err, 'AI Health Assistant could not process your question right now.');
      if (formatted.status >= 500) {
        console.error('Gemini assistant error:', formatted.message);
      } else {
        console.warn('Gemini assistant notice:', formatted.message);
      }
      return res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 15. Dynamic files scanner to serve to DevOps file tree
  app.get('/api/backend-files', (_req, res) => {
    const rootDir = process.cwd();

    const listFiles = (dir: string): any[] => {
      const results: any[] = [];
      if (!fs.existsSync(dir)) return results;
      const list = fs.readdirSync(dir).sort();
      list.forEach((file) => {
        if (file === 'node_modules' || file === 'target' || file === 'dist') return;
        const fullPath = path.resolve(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results.push({
            name: file,
            type: 'directory',
            path: path.relative(rootDir, fullPath),
            children: listFiles(fullPath)
          });
        } else {
          let content = '';
          try {
            content = fs.readFileSync(fullPath, 'utf8');
          } catch (e) {}
          results.push({
            name: file,
            type: 'file',
            path: path.relative(rootDir, fullPath),
            content
          });
        }
      });
      return results;
    };

    const readRootFile = (fileName: string) => {
      const fullPath = path.resolve(rootDir, fileName);
      return {
        name: fileName,
        type: 'file',
        path: fileName,
        content: fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : ''
      };
    };

    const buildFolderNode = (folderName: string) => ({
      name: folderName,
      type: 'directory',
      path: folderName,
      children: listFiles(path.resolve(rootDir, folderName))
    });

    const devopsTree = [
      readRootFile('docker-compose.yml'),
      readRootFile('Dockerfile'),
      readRootFile('Jenkinsfile'),
      buildFolderNode('k8s'),
      buildFolderNode('database'),
      buildFolderNode('gateway'),
      buildFolderNode('backend')
    ];

    res.json(devopsTree);
  });

  // --------- VITE INTEGRATION FOR PORT 3000 ---------
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware is attached successfully.');
  } else {
    // Serve static files from compiled dist in production
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MediConnect Server Host] Running online at: http://localhost:${PORT}`);
  });
}

startServer();
