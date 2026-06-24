package com.hms.scheduler;

import com.hms.entity.Meal;
import com.hms.entity.MonthlyBill;
import com.hms.entity.Student;
import com.hms.entity.StudentMeal;
import com.hms.repository.MealRepository;
import com.hms.repository.MonthlyBillRepository;
import com.hms.repository.StudentMealRepository;
import com.hms.repository.StudentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Automates the recurring billing operations for the hostel mess:
 *  1. Monthly bill generation on the 1st of every month.
 *  2. Daily late-fine application on unpaid bills past the grace period.
 *  3. Monthly reset of meal preferences for the new billing period.
 *
 * All cron expressions are evaluated in IST (Asia/Kolkata) regardless of the
 * server's default timezone, via the `zone` attribute on @Scheduled.
 */
@Component
public class BillingScheduler {

    private static final Logger logger = LoggerFactory.getLogger(BillingScheduler.class);
    private static final String IST = "Asia/Kolkata";

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private MealRepository mealRepository;

    @Autowired
    private StudentMealRepository studentMealRepository;

    @Autowired
    private MonthlyBillRepository monthlyBillRepository;

    @Value("${app.meal.cost}")
    private double mealCost;

    @Value("${app.meal.fine-per-day}")
    private double finePerDay;

    @Value("${app.meal.payment-grace-days}")
    private int paymentGraceDays;

    /**
     * Runs at 00:00 IST on the 1st of every month.
     * For every active student: ensures this month's Meal rows exist,
     * ensures StudentMeal opt-in rows exist (defaulting to opted-in),
     * then generates a MonthlyBill based on opted meal count.
     */
    @Scheduled(cron = "0 0 0 1 * ?", zone = IST)
    @Transactional
    public void generateMonthlyBills() {
        LocalDate today = LocalDate.now();
        int month = today.getMonthValue();
        int year = today.getYear();
        LocalDate dueDate = today.withDayOfMonth(today.lengthOfMonth());

        logger.info("Starting monthly bill generation for {}/{}", month, year);

        // Make sure this month's Meal rows exist before we try to count opted meals
        List<Meal> monthMeals = ensureMealsExistForMonth(today);
        List<Student> activeStudents = studentRepository.findByIsActive(true);

        for (Student student : activeStudents) {
            // Make sure every active student has opted-in StudentMeal rows for the new month
            ensureStudentMealsOptedIn(student, monthMeals);

            boolean alreadyExists = monthlyBillRepository
                    .findByStudentAndMonthAndYear(student, month, year)
                    .isPresent();
            if (alreadyExists) {
                // Avoid duplicate bills if this job somehow runs twice for the same month
                logger.info("Bill already exists for student {} ({}/{}), skipping",
                        student.getId(), month, year);
                continue;
            }

            long optedMealCount = studentMealRepository
                    .countByStudentAndIsOptedTrueAndMeal_MealDateBetween(
                            student, today.withDayOfMonth(1), dueDate);

            BigDecimal totalAmount = BigDecimal.valueOf(mealCost)
                    .multiply(BigDecimal.valueOf(optedMealCount));

            MonthlyBill bill = new MonthlyBill(student, month, year, dueDate);
            bill.setTotalMeals((int) optedMealCount);
            bill.setTotalAmount(totalAmount);

            monthlyBillRepository.save(bill);
            logger.info("Generated bill for student {}: {} meals, ₹{}",
                    student.getId(), optedMealCount, totalAmount);
        }

        logger.info("Monthly bill generation complete for {} active student(s)", activeStudents.size());
    }

    /**
     * Runs daily at 01:00 IST. Applies a daily fine to every unpaid bill
     * whose due date has passed the configured grace period.
     */
    @Scheduled(cron = "0 0 1 * * ?", zone = IST)
    @Transactional
    public void applyLateFines() {
        LocalDate cutoffDate = LocalDate.now().minusDays(paymentGraceDays);

        List<MonthlyBill> overdueBills = monthlyBillRepository
                .findByIsPaidFalseAndDueDateBefore(cutoffDate);

        if (overdueBills.isEmpty()) {
            logger.info("No overdue unpaid bills found past the {}-day grace period", paymentGraceDays);
            return;
        }

        for (MonthlyBill bill : overdueBills) {
            // Increment fineAmount by the configured daily fine
            BigDecimal updatedFine = bill.getFineAmount().add(BigDecimal.valueOf(finePerDay));
            bill.setFineAmount(updatedFine);
            monthlyBillRepository.save(bill);
            logger.info("Applied ₹{} fine to bill {} (student {}), new fine total ₹{}",
                    finePerDay, bill.getId(), bill.getStudent().getId(), updatedFine);
        }

        logger.info("Late fines applied to {} overdue bill(s)", overdueBills.size());
    }

    /**
     * Runs at 00:05 IST on the 1st of every month, shortly after bill
     * generation. Resets every active student's meal preference for the new
     * month back to opted-in. Acts as a safety-net pass in case new students
     * were added, or rows are missing after the main job ran.
     */
    @Scheduled(cron = "0 5 0 1 * ?", zone = IST)
    @Transactional
    public void resetMealPreferencesForNewMonth() {
        LocalDate today = LocalDate.now();
        List<Meal> monthMeals = ensureMealsExistForMonth(today);
        List<Student> activeStudents = studentRepository.findByIsActive(true);

        for (Student student : activeStudents) {
            ensureStudentMealsOptedIn(student, monthMeals);
        }

        logger.info("Meal preference reset complete for {} active student(s)", activeStudents.size());
    }

    /**
     * Ensures a Meal row (breakfast and dinner) exists for every day of the
     * month containing the given date. Returns all Meal rows for that month.
     */
    private List<Meal> ensureMealsExistForMonth(LocalDate anyDateInMonth) {
        LocalDate start = anyDateInMonth.withDayOfMonth(1);
        LocalDate end = anyDateInMonth.withDayOfMonth(anyDateInMonth.lengthOfMonth());

        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            for (Meal.MealType type : Meal.MealType.values()) {
                boolean exists = mealRepository.findByMealTypeAndMealDate(type, date).isPresent();
                if (!exists) {
                    Meal meal = new Meal(type, date);
                    meal.setCost(BigDecimal.valueOf(mealCost));
                    mealRepository.save(meal);
                }
            }
        }

        return mealRepository.findByMealDateBetween(start, end);
    }

    /**
     * Ensures the given student has a StudentMeal row, defaulted to
     * opted-in, for every Meal passed in. Existing rows are left untouched
     * so prior skip/enable choices for the current month are not overwritten.
     */
    private void ensureStudentMealsOptedIn(Student student, List<Meal> meals) {
        for (Meal meal : meals) {
            boolean exists = studentMealRepository.findByStudentAndMeal(student, meal).isPresent();
            if (!exists) {
                StudentMeal studentMeal = new StudentMeal(student, meal);
                studentMeal.setIsOpted(true);
                studentMealRepository.save(studentMeal);
            }
        }
    }
}