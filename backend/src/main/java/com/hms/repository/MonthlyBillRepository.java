package com.hms.repository;

import com.hms.entity.MonthlyBill;
import com.hms.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MonthlyBillRepository extends JpaRepository<MonthlyBill, Long> {
    Optional<MonthlyBill> findByStudentAndMonthAndYear(Student student, Integer month, Integer year);
    List<MonthlyBill> findByIsPaidFalseAndDueDateBefore(LocalDate cutoffDate);
}