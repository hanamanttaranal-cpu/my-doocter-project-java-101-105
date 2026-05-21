package com.mediconnect.doctorservice.controller;

import com.mediconnect.doctorservice.model.Doctor;
import com.mediconnect.doctorservice.repository.DoctorRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/doctors")
@Tag(name = "Doctor Consultation Controller", description = "Query, modify, and authorize clinical profiles of doctors")
public class DoctorController {

    private final DoctorRepository doctorRepository;

    @Autowired
    public DoctorController(DoctorRepository doctorRepository) {
        this.doctorRepository = doctorRepository;
    }

    @GetMapping
    @Operation(summary = "Search all available doctors", description = "Retrieves profiles, ratings, and schedules of active doctors")
    public ResponseEntity<List<Doctor>> getAllDoctors(
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) Integer minExperience) {
        
        List<Doctor> doctors;
        if (specialization != null && minExperience != null) {
            doctors = doctorRepository.findBySpecializationAndYearsOfExperienceGreaterThanEqual(specialization, minExperience);
        } else if (specialization != null) {
            doctors = doctorRepository.findBySpecialization(specialization);
        } else {
            doctors = doctorRepository.findAll();
        }
        return ResponseEntity.ok(doctors);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get specific doctor details", description = "Load biodata and ratings for individual clinicians")
    public ResponseEntity<Doctor> getDoctorById(@PathVariable Long id) {
        return doctorRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR')")
    @Operation(summary = "Register doctor credential profiles", description = "Create clinical record after credential check")
    public ResponseEntity<Doctor> createDoctorProfile(@Valid @RequestBody Doctor doctor) {
        Doctor savedDoctor = doctorRepository.save(doctor);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedDoctor);
    }

    @PutMapping("/{id}/block")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Toggle doctor block state", description = "Restrict credentials from accessing MediConnect pathways")
    public ResponseEntity<Doctor> toggleBlockState(@PathVariable Long id, @RequestParam Boolean blocked) {
        Optional<Doctor> existing = doctorRepository.findById(id);
        if (existing.isPresent()) {
            Doctor d = existing.get();
            d.setIsBlocked(blocked);
            return ResponseEntity.ok(doctorRepository.save(d));
        }
        return ResponseEntity.notFound().build();
    }
}
