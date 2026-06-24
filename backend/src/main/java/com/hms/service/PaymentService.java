package com.hms.service;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class PaymentService {
    
    // In-memory storage for demo purposes
    private final Map<Long, Map<String, Object>> payments = new HashMap<>();
    private final AtomicLong paymentIdCounter = new AtomicLong(1);
    
    public Long createPayment(Long studentId, String studentName, String admissionNumber, Double amount) {
        Long paymentId = paymentIdCounter.getAndIncrement();
        
        Map<String, Object> payment = new HashMap<>();
        payment.put("id", paymentId);
        payment.put("studentId", studentId);
        payment.put("studentName", studentName);
        payment.put("admissionNumber", admissionNumber);
        payment.put("amount", amount);
        payment.put("status", "pending_verification");
        payment.put("paymentDate", LocalDateTime.now());
        payment.put("verifiedDate", null);
        
        payments.put(paymentId, payment);
        
        System.out.println("Payment created: ID=" + paymentId + ", Student=" + studentName + ", Amount=₹" + amount);
        
        return paymentId;
    }
    
    public List<Map<String, Object>> getPendingPayments() {
        List<Map<String, Object>> pendingPayments = new ArrayList<>();
        
        for (Map<String, Object> payment : payments.values()) {
            if ("pending_verification".equals(payment.get("status"))) {
                pendingPayments.add(payment);
            }
        }
        
        return pendingPayments;
    }
    
    public boolean verifyPayment(Long paymentId) {
        Map<String, Object> payment = payments.get(paymentId);
        if (payment != null && "pending_verification".equals(payment.get("status"))) {
            payment.put("status", "confirmed");
            payment.put("verifiedDate", LocalDateTime.now());
            
            System.out.println("Payment verified: ID=" + paymentId + ", Student=" + payment.get("studentName"));
            return true;
        }
        return false;
    }

    public boolean rejectPayment(Long paymentId) {
    Map<String, Object> payment = payments.get(paymentId);
    if (payment != null && "pending_verification".equals(payment.get("status"))) {
        payment.put("status", "rejected");
        payment.put("verifiedDate", LocalDateTime.now());
        
        System.out.println("Payment rejected: ID=" + paymentId + ", Student=" + payment.get("studentName"));
        return true;
    }
    return false;
}
    
    public String getPaymentStatus(Long studentId) {
        
        for (Map<String, Object> payment : payments.values()) {
            if (studentId.equals(payment.get("studentId"))) {
                return (String) payment.get("status");
            }
        }
        return "pending"; 
    }
    
    public List<Map<String, Object>> getPaymentHistory(Long studentId) {
        List<Map<String, Object>> history = new ArrayList<>();
        
        for (Map<String, Object> payment : payments.values()) {
            if (studentId.equals(payment.get("studentId"))) {
                history.add(payment);
            }
        }
        
        return history;
    }
}