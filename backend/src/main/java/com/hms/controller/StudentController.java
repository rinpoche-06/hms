package com.hms.controller;

import com.hms.dto.MealScheduleDto;
import com.hms.dto.PaymentSummaryDto;
import com.hms.dto.StudentBillDto;
import com.hms.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student")
@CrossOrigin(origins = "http://localhost:3000")
public class StudentController {

    @Autowired
    private StudentService studentService;

    @GetMapping("/{studentId}/meals")
    public ResponseEntity<List<MealScheduleDto>> getMealSchedule(@PathVariable Long studentId) {
        List<MealScheduleDto> meals = studentService.getMealSchedule(studentId);
        return ResponseEntity.ok(meals);
    }

    @PostMapping("/{studentId}/meals/skip-day")
    public ResponseEntity<?> skipDay(@PathVariable Long studentId, @RequestParam String date) {
        try {
            LocalDate skipDate = LocalDate.parse(date);
            studentService.skipEntireDay(studentId, skipDate);
            return ResponseEntity.ok("{\"message\": \"Day skipped successfully\"}");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @PostMapping("/{studentId}/meals/enable-day")
    public ResponseEntity<?> enableDay(@PathVariable Long studentId, @RequestParam String date) {
        try {
            LocalDate enableDate = LocalDate.parse(date);
            studentService.enableEntireDay(studentId, enableDate);
            return ResponseEntity.ok("{\"message\": \"Day enabled successfully\"}");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/{studentId}/payment-summary")
    public ResponseEntity<PaymentSummaryDto> getPaymentSummary(@PathVariable Long studentId) {
        PaymentSummaryDto summary = studentService.getPaymentSummary(studentId);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/{studentId}/bill")
    public ResponseEntity<StudentBillDto> getCurrentBill(@PathVariable Long studentId) {
        StudentBillDto bill = studentService.getCurrentBill(studentId);
        return ResponseEntity.ok(bill);
    }

    @PostMapping("/{studentId}/payment")
    public ResponseEntity<?> makePayment(@PathVariable Long studentId, @RequestBody Map<String, Object> paymentData) {
        try {
            Object amountValue = paymentData.get("amount");
            if (!(amountValue instanceof Number)) {
                throw new RuntimeException("Payment amount is required");
            }

            Double amount = ((Number) amountValue).doubleValue();
            String status = (String) paymentData.get("status");
            studentService.makePayment(studentId, amount, status);
            return ResponseEntity.ok("{\"message\": \"Payment processed successfully\"}");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/{studentId}/payments")
    public ResponseEntity<?> getPaymentHistory(@PathVariable Long studentId) {
        try {
            List<Map<String, Object>> history = studentService.getPaymentHistory(studentId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
