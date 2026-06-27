package com.hms.service;

import com.hms.entity.MonthlyBill;
import com.hms.entity.Payment;
import com.hms.entity.Student;
import com.hms.repository.MonthlyBillRepository;
import com.hms.repository.PaymentRepository;
import com.hms.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private MonthlyBillRepository monthlyBillRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Transactional
    public Long createPayment(Long studentId, String studentName, String admissionNumber, Double amount) {
        // Find the student
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));

        // Get current month/year
        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();
        int year = now.getYear();
        LocalDate dueDate = now.withDayOfMonth(now.lengthOfMonth());

        // Find or create MonthlyBill for this student/month/year
        Optional<MonthlyBill> existingBill = monthlyBillRepository
                .findByStudentAndMonthAndYear(student, month, year);

        MonthlyBill bill;
        if (existingBill.isPresent()) {
            bill = existingBill.get();
        } else {
            bill = new MonthlyBill(student, month, year, dueDate);
            bill.setTotalAmount(BigDecimal.valueOf(amount));
            bill = monthlyBillRepository.save(bill);
        }

        // Create Payment record linked to MonthlyBill
        Payment payment = new Payment(bill, BigDecimal.valueOf(amount));
        payment.setPaymentMethod("UPI");
        payment.setPaymentStatus(Payment.PaymentStatus.pending);

        Payment saved = paymentRepository.save(payment);

        System.out.println("Payment created in DB: ID=" + saved.getId()
                + ", Student=" + studentName + ", Amount=₹" + amount);

        return saved.getId();
    }

    public List<Map<String, Object>> getPendingPayments() {
        List<Payment> pending = paymentRepository
                .findByPaymentStatus(Payment.PaymentStatus.pending);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Payment p : pending) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("studentId", p.getBill().getStudent().getId());
            map.put("studentName", p.getBill().getStudent().getName());
            map.put("admissionNumber", p.getBill().getStudent().getAdmissionNumber());
            map.put("amount", p.getAmount());
            map.put("status", p.getPaymentStatus().name());
            map.put("paymentDate", p.getPaymentDate());
            map.put("paymentMethod", p.getPaymentMethod());
            result.add(map);
        }
        return result;
    }

    @Transactional
    public boolean verifyPayment(Long paymentId) {
        Optional<Payment> opt = paymentRepository.findById(paymentId);
        if (opt.isPresent() && opt.get().getPaymentStatus() == Payment.PaymentStatus.pending) {
            Payment payment = opt.get();
            payment.setPaymentStatus(Payment.PaymentStatus.completed);

            // Mark MonthlyBill as paid
            MonthlyBill bill = payment.getBill();
            bill.setIsPaid(true);
            bill.setPaymentDate(LocalDateTime.now());
            monthlyBillRepository.save(bill);

            paymentRepository.save(payment);

            System.out.println("Payment verified in DB: ID=" + paymentId
                    + ", Student=" + bill.getStudent().getName());
            return true;
        }
        return false;
    }

    @Transactional
    public boolean rejectPayment(Long paymentId) {
        Optional<Payment> opt = paymentRepository.findById(paymentId);
        if (opt.isPresent() && opt.get().getPaymentStatus() == Payment.PaymentStatus.pending) {
            Payment payment = opt.get();
            payment.setPaymentStatus(Payment.PaymentStatus.failed);
            paymentRepository.save(payment);

            System.out.println("Payment rejected in DB: ID=" + paymentId
                    + ", Student=" + payment.getBill().getStudent().getName());
            return true;
        }
        return false;
    }

    public String getPaymentStatus(Long studentId) {
        List<Payment> payments = paymentRepository.findByBillStudentId(studentId);
        if (payments.isEmpty()) return "pending";
        // Return status of most recent payment
        return payments.get(payments.size() - 1).getPaymentStatus().name();
    }

    public List<Map<String, Object>> getPaymentHistory(Long studentId) {
        List<Payment> payments = paymentRepository.findByBillStudentId(studentId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Payment p : payments) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("amount", p.getAmount());
            map.put("status", p.getPaymentStatus().name());
            map.put("paymentDate", p.getPaymentDate());
            map.put("paymentMethod", p.getPaymentMethod());
            map.put("month", p.getBill().getMonth());
            map.put("year", p.getBill().getYear());
            result.add(map);
        }
        return result;
    }
}