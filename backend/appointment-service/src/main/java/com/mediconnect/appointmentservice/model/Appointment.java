package com.mediconnect.appointmentservice.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "appointments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, name = "patient_id")
    private Long patientId;

    @Column(nullable = false, name = "patient_name")
    private String patientName;

    @Column(nullable = false, name = "doctor_id")
    private Long doctorId;

    @Column(nullable = false, name = "doctor_name")
    private String doctorName;

    @Column(nullable = false)
    private String specialization;

    @Column(nullable = false)
    private String date;

    @Column(length = 2000)
    private String notes;

    @Builder.Default
    @Column(nullable = false)
    private String status = "Pending";

    @Column(name = "medical_report_url")
    private String medicalReportUrl;
}
