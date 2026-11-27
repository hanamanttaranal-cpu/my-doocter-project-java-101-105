package com.mediconnect.doctorservice.repository;

import com.mediconnect.doctorservice.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    List<Doctor> findBySpecializationIgnoreCaseAndIsBlockedFalse(String specialization);
    List<Doctor> findByIsBlockedFalse();
    List<Doctor> findByYearsOfExperienceGreaterThanEqualAndIsBlockedFalse(Integer minExp);
}
