package com.mediconnect.doctorservice.repository;

import com.mediconnect.doctorservice.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    List<Doctor> findBySpecialization(String specialization);
    List<Doctor> findBySpecializationAndYearsOfExperienceGreaterThanEqual(String specialization, Integer experience);
    List<Doctor> findByIsBlockedFalse();
}
