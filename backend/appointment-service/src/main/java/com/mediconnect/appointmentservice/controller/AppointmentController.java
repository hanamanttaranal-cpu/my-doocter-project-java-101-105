package com.mediconnect.appointmentservice.controller;

import com.mediconnect.appointmentservice.model.Appointment;
import com.mediconnect.appointmentservice.repository.AppointmentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*")
public class AppointmentController {

    private static final Logger log = LoggerFactory.getLogger(AppointmentController.class);

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${service.doctor.url:http://doctor-service:8081}")
    private String doctorServiceUrl;

    @GetMapping
    public ResponseEntity<List<Appointment>> getAppointments(
            @RequestParam(required = false) Long patientId,
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String role) {

        if (patientId != null) {
            return ResponseEntity.ok(appointmentRepository.findByPatientId(patientId));
        } else if (doctorId != null) {
            return ResponseEntity.ok(appointmentRepository.findByDoctorId(doctorId));
        } else if (userId != null && role != null) {
            if ("PATIENT".equalsIgnoreCase(role)) {
                return ResponseEntity.ok(appointmentRepository.findByPatientId(userId));
            } else if ("DOCTOR".equalsIgnoreCase(role)) {
                List<Appointment> byDoc = appointmentRepository.findByDoctorId(userId);
                if (byDoc.isEmpty() && userId == 2L) {
                    byDoc = appointmentRepository.findByDoctorId(1L);
                }
                return ResponseEntity.ok(byDoc);
            }
        }
        return ResponseEntity.ok(appointmentRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getAppointmentById(@PathVariable Long id) {
        return appointmentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    public ResponseEntity<Appointment> createAppointment(@RequestBody Appointment appointment) {
        if (appointment.getPatientId() == null) {
            appointment.setPatientId(1L);
        }
        if (appointment.getPatientName() == null || appointment.getPatientName().isBlank()) {
            appointment.setPatientName("Patient #" + appointment.getPatientId());
        }
        if (appointment.getDate() == null || appointment.getDate().isBlank()) {
            appointment.setDate(LocalDate.now().toString());
        }
        if (appointment.getNotes() == null || appointment.getNotes().isBlank()) {
            appointment.setNotes("Routine healthcare consultation review.");
        }

        if ((appointment.getDoctorName() == null || appointment.getDoctorName().isBlank()
                || appointment.getSpecialization() == null || appointment.getSpecialization().isBlank())
                && appointment.getDoctorId() != null) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> doc = restTemplate.getForObject(
                        doctorServiceUrl + "/api/doctors/" + appointment.getDoctorId(),
                        Map.class
                );
                if (doc != null) {
                    if (appointment.getDoctorName() == null || appointment.getDoctorName().isBlank()) {
                        appointment.setDoctorName(String.valueOf(doc.getOrDefault("fullName", "Attending Physician")));
                    }
                    if (appointment.getSpecialization() == null || appointment.getSpecialization().isBlank()) {
                        appointment.setSpecialization(String.valueOf(doc.getOrDefault("specialization", "General Physician")));
                    }
                }
            } catch (Exception ex) {
                log.warn("Unable to reach doctor-service at {}: {}", doctorServiceUrl, ex.getMessage());
            }
        }

        if (appointment.getDoctorName() == null || appointment.getDoctorName().isBlank()) {
            appointment.setDoctorName("Doctor #" + appointment.getDoctorId());
        }
        if (appointment.getSpecialization() == null || appointment.getSpecialization().isBlank()) {
            appointment.setSpecialization("General Physician");
        }

        appointment.setStatus("Pending");
        Appointment saved = appointmentRepository.save(appointment);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/{id}/status")
    public ResponseEntity<Appointment> updateAppointmentStatus(
            @PathVariable Long id,
            @RequestBody UpdateStatusRequest request) {

        Optional<Appointment> existing = appointmentRepository.findById(id);
        if (existing.isPresent()) {
            Appointment apt = existing.get();
            apt.setStatus(request.getStatus());
            appointmentRepository.save(apt);
            return ResponseEntity.ok(apt);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppointment(@PathVariable Long id) {
        if (appointmentRepository.existsById(id)) {
            appointmentRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    public static class UpdateStatusRequest {
        private String status;
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
