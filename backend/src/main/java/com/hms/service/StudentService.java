package com.hms.service;

import com.hms.dto.MealScheduleDto;
import com.hms.dto.PaymentSummaryDto;
import com.hms.dto.StudentBillDto;
import com.hms.entity.MonthlyBill;
import com.hms.entity.Student;
import com.hms.repository.MonthlyBillRepository;
import com.hms.repository.StudentMealRepository;
import com.hms.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class StudentService {
    private static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("MMMM yyyy");
    private static final DateTimeFormatter PERIOD_FORMATTER = DateTimeFormatter.ofPattern("MMM d");

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentMealRepository studentMealRepository;

    @Autowired
    private MonthlyBillRepository monthlyBillRepository;

    @Autowired
    private MealService mealService;
    
    @Autowired
    private PaymentService paymentService;

    @Value("${app.meal.cost}")
    private double mealCost;

    public List<MealScheduleDto> getMealSchedule(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        List<MealScheduleDto> schedule = new ArrayList<>();
        LocalDate today = LocalDate.now();
        
        // Show schedule for next 14 days
        for (int i = 0; i < 14; i++) {
            LocalDate date = today.plusDays(i);
            boolean canModify = date.isAfter(today); // Can only modify future dates
            
            // Get meal status for this date
            boolean[] mealStatus = mealService.getMealStatusForDate(studentId, date);
            boolean isBreakfastEnabled = mealStatus[0];
            boolean isDinnerEnabled = mealStatus[1];
            
            MealScheduleDto daySchedule = new MealScheduleDto(date, isBreakfastEnabled, isDinnerEnabled, canModify);
            schedule.add(daySchedule);
        }
        
        return schedule;
    }

    public void skipEntireDay(Long studentId, LocalDate date) {
        LocalDate today = LocalDate.now();
        
        // Can only skip future dates
        if (!date.isAfter(today)) {
            throw new RuntimeException("Can only skip meals for future dates");
        }
        
        // Skip both breakfast and dinner for the day
        mealService.skipDay(studentId, date);
    }

    public void enableEntireDay(Long studentId, LocalDate date) {
        LocalDate today = LocalDate.now();
        
        // Can only enable future dates
        if (!date.isAfter(today)) {
            throw new RuntimeException("Can only enable meals for future dates");
        }
        
        // Enable both breakfast and dinner for the day
        mealService.enableDay(studentId, date);
    }

    public PaymentSummaryDto getPaymentSummary(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        PaymentSummaryDto summary = new PaymentSummaryDto();
        
        // Calculate this month's meals and amount
        int thisMonthMeals = mealService.getMonthlyMealCount(studentId);
        double thisMonthAmount = thisMonthMeals * 60.0; // Each meal is ₹60
        
        summary.setTotalMealsThisMonth(thisMonthMeals);
        summary.setThisMonthAmount(thisMonthAmount);
        
        // Check payment status
        String paymentStatus = paymentService.getPaymentStatus(studentId);
        if ("confirmed".equals(paymentStatus)) {
            summary.setTotalPendingAmount(0.0); // Payment confirmed
        } else {
            summary.setTotalPendingAmount(thisMonthAmount); // Still pending
        }
        
        // Set next payment due (end of current month)
        LocalDate today = LocalDate.now();
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());
        summary.setNextPaymentDue(monthEnd);
        
        // Get payment history - for now, return empty list
        summary.setPaymentHistory(new ArrayList<>());
        
        return summary;
    }

    public StudentBillDto getCurrentBill(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        LocalDate today = LocalDate.now(IST_ZONE);
        LocalDate periodStart = today.withDayOfMonth(1);
        LocalDate periodEnd = today.withDayOfMonth(today.lengthOfMonth());
        int month = today.getMonthValue();
        int year = today.getYear();

        long optedMealCount = studentMealRepository
                .countByStudentAndIsOptedTrueAndMeal_MealDateBetween(student, periodStart, periodEnd);
        double mealAmount = BigDecimal.valueOf(mealCost)
                .multiply(BigDecimal.valueOf(optedMealCount))
                .doubleValue();

        Optional<MonthlyBill> monthlyBill = monthlyBillRepository
                .findByStudentAndMonthAndYear(student, month, year);
        double fine = monthlyBill
                .map(MonthlyBill::getFineAmount)
                .orElse(BigDecimal.ZERO)
                .doubleValue();
        boolean paid = monthlyBill
                .map(MonthlyBill::getIsPaid)
                .orElse(false);

        String status = paid ? "confirmed" : paymentService.getPaymentStatus(studentId);

        StudentBillDto bill = new StudentBillDto();
        bill.setStudentId(studentId);
        bill.setMonth(today.format(MONTH_FORMATTER));
        bill.setTotalMeals((int) optedMealCount);
        bill.setTotalDays((int) ChronoUnit.DAYS.between(periodStart, periodEnd) + 1);
        bill.setAmount(mealAmount);
        bill.setTotalAmount(mealAmount + fine);
        bill.setFine(fine);
        bill.setBillingPeriodStart(periodStart);
        bill.setBillingPeriodEnd(periodEnd);
        bill.setBillingPeriod(periodStart.format(PERIOD_FORMATTER) + " - " + periodEnd.format(PERIOD_FORMATTER));
        bill.setDueDate(monthlyBill.map(MonthlyBill::getDueDate).orElse(periodEnd));
        bill.setStatus(status);
        bill.setPaid(paid);
        return bill;
    }

    public void makePayment(Long studentId, Double amount, String status) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        // Create a payment record with pending verification status
        Long paymentId = paymentService.createPayment(
            studentId, 
            student.getName(), 
            student.getAdmissionNumber(), 
            amount
        );
        
        System.out.println("Payment created with ID: " + paymentId + " for student: " + student.getName());
    }
}
