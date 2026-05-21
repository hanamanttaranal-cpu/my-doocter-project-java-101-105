package com.mediconnect.doctorservice.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "doctors")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Display name cannot be blank")
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Email(message = "Invalid email formatting")
    @NotBlank(message = "Email is required")
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank(message = "Disease specialization is required")
    @Column(nullable = false)
    private String specialization;

    @NotNull(message = "Years of experience is required")
    @Column(name = "years_of_experience")
    private Integer yearsOfExperience;

    @Lob
    private String biography;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @Column(name = "certificates_url")
    private String certificatesUrl;

    @Builder.Default
    private Double rating = 4.8;

    @Builder.Default
    @Column(name = "is_blocked")
    private Boolean isBlocked = false;

    @Column(name = "availability_schedule")
    private String availabilitySchedule; // e.g., "Mon-Fri 09:00 - 17:00"

    @Column(name = "consultation_fee")
    private Double consultationFee;

    // Relationship placeholder
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "doctor_patients_treated", joinColumns = @JoinColumn(name = "doctor_id"))
    @Column(name = "patient_id")
    @Builder.Default
    private Set<Long> historicalPatientsTreated = new HashSet<>();
}
