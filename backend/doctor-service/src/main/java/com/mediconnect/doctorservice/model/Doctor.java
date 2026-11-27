package com.mediconnect.doctorservice.model;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

@Entity
@Table(name = "doctors")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Doctor implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, name = "full_name")
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String specialization;

    @Column(nullable = false, name = "years_of_experience")
    private Integer yearsOfExperience;

    @Column(length = 1000)
    private String biography;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @Column(name = "certificates_url")
    private String certificatesUrl;

    @Builder.Default
    @Column(nullable = false)
    private Double rating = 4.5;

    @Builder.Default
    @Column(nullable = false, name = "is_blocked")
    private Boolean isBlocked = false;

    @Column(name = "availability_schedule")
    private String availabilitySchedule;

    @Column(nullable = false, name = "consultation_fee")
    private Double consultationFee;
}
