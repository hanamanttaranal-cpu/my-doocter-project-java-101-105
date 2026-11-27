package com.mediconnect.doctorservice.controller;

import com.mediconnect.doctorservice.model.Doctor;
import com.mediconnect.doctorservice.repository.DoctorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/doctors")
@CrossOrigin(origins = "*")
public class DoctorController {

    @Autowired
    private DoctorRepository doctorRepository;

    @GetMapping
    @Cacheable(value = "doctorsCache", key = "T(String).format('%s:%s:%s', #specialization ?: 'All', #minExp ?: 0, #query ?: '')")
    public ResponseEntity<List<Doctor>> getAllDoctors(
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) Integer minExp,
            @RequestParam(required = false) String query) {

        List<Doctor> doctors = doctorRepository.findByIsBlockedFalse();

        if (specialization != null && !specialization.isBlank() && !specialization.equalsIgnoreCase("All")) {
            doctors = doctors.stream()
                    .filter(d -> d.getSpecialization() != null && d.getSpecialization().equalsIgnoreCase(specialization))
                    .collect(Collectors.toList());
        }

        if (minExp != null && minExp > 0) {
            doctors = doctors.stream()
                    .filter(d -> d.getYearsOfExperience() != null && d.getYearsOfExperience() >= minExp)
                    .collect(Collectors.toList());
        }

        if (query != null && !query.isBlank()) {
            String q = query.toLowerCase();
            doctors = doctors.stream()
                    .filter(d -> (d.getFullName() != null && d.getFullName().toLowerCase().contains(q))
                            || (d.getBiography() != null && d.getBiography().toLowerCase().contains(q))
                            || (d.getSpecialization() != null && d.getSpecialization().toLowerCase().contains(q)))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(doctors);
    }

    @GetMapping("/all")
    public ResponseEntity<List<Doctor>> getAllDoctorsIncludingBlocked() {
        return ResponseEntity.ok(doctorRepository.findAll());
    }

    @GetMapping("/{id}")
    @Cacheable(value = "doctorProfileCache", key = "#id")
    public ResponseEntity<Doctor> getDoctorById(@PathVariable Long id) {
        Optional<Doctor> doctor = doctorRepository.findById(id);
        return doctor.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    @CacheEvict(value = {"doctorsCache", "doctorProfileCache"}, allEntries = true)
    public ResponseEntity<Doctor> addDoctor(@RequestBody Doctor doctor) {
        if (doctor.getIsBlocked() == null) {
            doctor.setIsBlocked(false);
        }
        if (doctor.getRating() == null) {
            doctor.setRating(4.5);
        }
        Doctor saved = doctorRepository.save(doctor);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/{id}/toggle-block")
    @CacheEvict(value = {"doctorsCache", "doctorProfileCache"}, allEntries = true)
    public ResponseEntity<Doctor> toggleBlockStatus(@PathVariable Long id) {
        Optional<Doctor> existing = doctorRepository.findById(id);
        if (existing.isPresent()) {
            Doctor doc = existing.get();
            doc.setIsBlocked(!Boolean.TRUE.equals(doc.getIsBlocked()));
            doctorRepository.save(doc);
            return ResponseEntity.ok(doc);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }
}
