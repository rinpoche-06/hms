package com.hms.repository;

import com.hms.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    // For Admin: Fetch all pending payments matching the string status
    List<Payment> findByPaymentStatus(Payment.PaymentStatus paymentStatus);
    
    // For Student: fetch history through MonthlyBill → Student
    List<Payment> findByBillStudentId(Long studentId);
}