-- MediConnect Pro MySQL 8.0 Schema & Seed Script
CREATE DATABASE IF NOT EXISTS mediconnect_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mediconnect_db;

-- 1. Doctors table (matches com.mediconnect.doctorservice.model.Doctor)
CREATE TABLE IF NOT EXISTS doctors (
    id BIGINT NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    years_of_experience INT NOT NULL,
    biography VARCHAR(1000),
    profile_image_url VARCHAR(512),
    certificates_url VARCHAR(512),
    rating DOUBLE NOT NULL DEFAULT 4.5,
    is_blocked TINYINT(1) NOT NULL DEFAULT 0,
    availability_schedule VARCHAR(255),
    consultation_fee DOUBLE NOT NULL DEFAULT 100.0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_doctors_email (email),
    INDEX idx_doctors_spec (specialization),
    INDEX idx_doctors_blocked (is_blocked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Appointments table (matches com.mediconnect.appointmentservice.model.Appointment)
CREATE TABLE IF NOT EXISTS appointments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    patient_id BIGINT NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    doctor_id BIGINT NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    date VARCHAR(50) NOT NULL,
    notes VARCHAR(2000),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    medical_report_url VARCHAR(512),
    PRIMARY KEY (id),
    INDEX idx_appointments_patient (patient_id),
    INDEX idx_appointments_doctor (doctor_id),
    INDEX idx_appointments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Users table (shared platform accounts)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'PATIENT',
    profile_image_url VARCHAR(512),
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    appointment_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    text VARCHAR(2000) NOT NULL,
    timestamp VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'text',
    PRIMARY KEY (id),
    INDEX idx_chat_appointment (appointment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
    id BIGINT NOT NULL AUTO_INCREMENT,
    patient_name VARCHAR(255) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    rating INT NOT NULL,
    comment VARCHAR(1000) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed initial clinicians (idempotent)
INSERT IGNORE INTO doctors (id, full_name, email, specialization, years_of_experience, biography, profile_image_url, certificates_url, rating, is_blocked, availability_schedule, consultation_fee) VALUES
(1, 'Dr. Sarah Jenkins', 'sarah.jenkins@mediconnect.pro', 'Cardiology', 14, 'Board-certified cardiologist specializing in preventive medicine, heart failure recovery, and non-invasive imaging diagnostics.', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250', 'certification_cardio_board_certified.pdf', 4.9, 0, 'Mon, Wed, Fri 09:00 - 15:00', 150.0),
(2, 'Dr. David Chen', 'david.chen@mediconnect.pro', 'Neurology', 12, 'Senior clinical researcher and neurologist focusing on cognitive decline, persistent migraine treatments, and peripheral neuropathy.', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=250', 'certification_neuro_board_certified.pdf', 4.8, 0, 'Tue, Thu 10:00 - 16:00', 175.0),
(3, 'Dr. Jessica Taylor', 'jessica.taylor@mediconnect.pro', 'Dermatology', 8, 'Expert pediatric and adult dermatologist focusing on skin cancer screening, severe eczema protocols, and laser treatments.', 'https://images.unsplash.com/photo-1594824813573-246434e33963?auto=format&fit=crop&q=80&w=250', 'certification_derm_board_certified.pdf', 4.7, 0, 'Mon, Tue, Thu 08:30 - 14:00', 120.0),
(4, 'Dr. Marcus Vance', 'marcus.vance@mediconnect.pro', 'General Physician', 10, 'Comprehensive primary care, chronic condition auditing, metabolic management, and early-stage disease screenings.', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=250', 'certification_general_board_certified.pdf', 4.9, 0, 'Mon-Fri 09:00 - 17:00', 90.0),
(5, 'Dr. Chloe Bennett', 'chloe.bennett@mediconnect.pro', 'Orthopedics', 11, 'Reconstructive joint surgeon and sports medicine specialist. Expert in skeletal biomechanics and microscopic arthroscopy.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250', 'certification_ortho_board_certified.pdf', 4.6, 0, 'Wed, Thu 11:00 - 18:00', 160.0);

-- Seed platform users
INSERT IGNORE INTO users (id, email, password, full_name, role, profile_image_url) VALUES
(1, 'patient@mediconnect.pro', 'password', 'John Carter', 'PATIENT', ''),
(2, 'doctor@mediconnect.pro', 'password', 'Dr. Sarah Jenkins', 'DOCTOR', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250'),
(3, 'admin@mediconnect.pro', 'password', 'Director Vance', 'ADMIN', '');

-- Seed sample appointments
INSERT IGNORE INTO appointments (id, patient_id, patient_name, doctor_id, doctor_name, specialization, date, notes, status, medical_report_url) VALUES
(1, 1, 'John Carter', 1, 'Dr. Sarah Jenkins', 'Cardiology', '2026-05-24', 'Requesting consultation regarding occasional mild heart palpitation episodes during high-stress cardiovascular training.', 'Approved', 'report_stress_test_cooper.pdf'),
(2, 1, 'John Carter', 3, 'Dr. Jessica Taylor', 'Dermatology', '2026-06-02', 'Checking a mole on my shoulder that seems to have changed size slightly.', 'Pending', '');

-- Seed sample chat messages
INSERT IGNORE INTO chat_messages (id, appointment_id, sender_id, sender_name, text, timestamp, type) VALUES
(1, 1, 1, 'John Carter', 'Hello Dr. Jenkins, thanks for approving the request. I wanted to send over my heart rate graphs.', '10:15 AM', 'text'),
(2, 1, 2, 'Dr. Sarah Jenkins', 'Hello John, I see the reports you uploaded. Did these palpitations occur under high cardio or rest?', '10:17 AM', 'text');

-- Seed sample patient feedbacks
INSERT IGNORE INTO feedbacks (id, patient_name, doctor_name, rating, comment) VALUES
(1, 'Aria Montgomery', 'Dr. Sarah Jenkins', 5, 'Incredibly attentive and thorough. Explained complex cardiac tests with exceptional clarity.'),
(2, 'Michael Thorne', 'Dr. David Chen', 4, 'Prompt and professional. Provided comforting guidance for persistent migraines.');
