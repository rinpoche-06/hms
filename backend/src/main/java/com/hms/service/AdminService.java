package com.hms.service;

import com.hms.dto.AddStudentRequest;
import com.hms.dto.StudentDto;
import com.hms.entity.Student;
import com.hms.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminService {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private MealService mealService;
    
    @Autowired
    private PaymentService paymentService;

    public StudentDto addStudent(AddStudentRequest request) {
        // Validate admission number is 4 digits
        if (request.getAdmissionNumber() == null || !request.getAdmissionNumber().matches("\\d{4}")) {
            throw new RuntimeException("Admission number must be exactly 4 digits");
        }

        // Check if admission number already exists
        if (studentRepository.findByAdmissionNumber(request.getAdmissionNumber()).isPresent()) {
            throw new RuntimeException("Student with admission number " + request.getAdmissionNumber() + " already exists");
        }

        // Create new student
        Student student = new Student();
        student.setName(request.getName());
        student.setAdmissionNumber(request.getAdmissionNumber());
        student.setEmail(request.getEmail());
        student.setPhone(request.getPhone());
        student.setRoomNumber(request.getRoomNumber());
        student.setIsActive(true);

        Student savedStudent = studentRepository.save(student);

        // Initialize default meals starting from tomorrow
        mealService.initializeDefaultMealsForStudent(savedStudent.getId());

        return convertToDto(savedStudent);
    }

    public List<StudentDto> getAllStudents() {
        List<Student> students = studentRepository.findAll();
        return students.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        
        long totalStudents = studentRepository.count();
        long activeStudents = studentRepository.countByIsActive(true);
        
        // Calculate today's meals and revenue
        int todayMeals = mealService.getTodayMealCount();
        double todayRevenue = todayMeals * 60.0; // Each meal is ₹60
        
        // Calculate pending payments
        double totalPending = calculateTotalPendingPayments();
        
        stats.put("totalStudents", totalStudents);
        stats.put("activeStudents", activeStudents);
        stats.put("todayMeals", todayMeals);
        stats.put("todayRevenue", todayRevenue);
        stats.put("pendingPayments", totalPending);
        
        return stats;
    }

    public void resetAllMealsToDefault() {
        List<Student> students = studentRepository.findByIsActive(true);
        for (Student student : students) {
            mealService.resetMealsToDefault(student.getId());
        }
    }

    private StudentDto convertToDto(Student student) {
        StudentDto dto = new StudentDto();
        dto.setId(student.getId());
        dto.setName(student.getName());
        dto.setAdmissionNumber(student.getAdmissionNumber());
        dto.setEmail(student.getEmail());
        dto.setPhone(student.getPhone());
        dto.setRoomNumber(student.getRoomNumber());
        dto.setIsActive(student.getIsActive());
        dto.setCreatedAt(student.getCreatedAt());
        
        // Calculate pending amount and meals for this student
        dto.setPendingAmount(calculatePendingAmount(student.getId()));
        dto.setTotalMealsThisMonth(mealService.getMonthlyMealCount(student.getId()));
        
        return dto;
    }

    private double calculatePendingAmount(Long studentId) {
        // This would calculate based on meals taken and payments made
        // For now, return a sample calculation
        int mealsThisMonth = mealService.getMonthlyMealCount(studentId);
        return mealsThisMonth * 60.0; // Each meal is ₹60
    }

    private double calculateTotalPendingPayments() {
        List<Student> students = studentRepository.findByIsActive(true);
        return students.stream()
                .mapToDouble(student -> calculatePendingAmount(student.getId()))
                .sum();
    }

    public List<Map<String, Object>> getPendingPayments() {
        return paymentService.getPendingPayments();
    }

    public void verifyPayment(Long paymentId) {
        boolean success = paymentService.verifyPayment(paymentId);
        if (!success) {
            throw new RuntimeException("Payment not found or already verified");
        }
    }

    public void rejectPayment(Long paymentId) {
    boolean success = paymentService.rejectPayment(paymentId);
    if (!success) {
        throw new RuntimeException("Payment not found or already processed");
    }
}

    public void deleteStudent(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
        
        // In a real system, you might want to:
        // 1. Check if student has pending payments
        // 2. Archive data instead of deleting
        // 3. Clean up related meal records
        
        studentRepository.delete(student);
        System.out.println("Student deleted: " + student.getName() + " (ID: " + studentId + ")");
    }
}