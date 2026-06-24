package com.hms.service;

import com.hms.entity.Meal;
import com.hms.entity.Student;
import com.hms.entity.StudentMeal;
import com.hms.repository.MealRepository;
import com.hms.repository.StudentMealRepository;
import com.hms.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Optional;

@Service
public class MealService {

    // Repositories backing real Meal / StudentMeal persistence
    // Replaces the old in-memory HashMap storage
    @Autowired
    private MealRepository mealRepository;

    @Autowired
    private StudentMealRepository studentMealRepository;

    @Autowired
    private StudentRepository studentRepository;

    public void initializeDefaultMealsForStudent(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        LocalDate tomorrow = LocalDate.now().plusDays(1);

        // Initialize default meals for next 30 days
        for (int i = 0; i < 30; i++) {
            LocalDate date = tomorrow.plusDays(i);

            // By default, both breakfast and dinner are enabled
            setMealStatus(student, date, Meal.MealType.breakfast, true);
            setMealStatus(student, date, Meal.MealType.dinner, true);
        }
    }

    public boolean[] getMealStatusForDate(Long studentId, LocalDate date) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        boolean breakfast = getMealStatus(student, date, Meal.MealType.breakfast);
        boolean dinner = getMealStatus(student, date, Meal.MealType.dinner);
        return new boolean[]{breakfast, dinner};
    }

    public void skipDay(Long studentId, LocalDate date) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        setMealStatus(student, date, Meal.MealType.breakfast, false);
        setMealStatus(student, date, Meal.MealType.dinner, false);
    }

    public void enableDay(Long studentId, LocalDate date) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        setMealStatus(student, date, Meal.MealType.breakfast, true);
        setMealStatus(student, date, Meal.MealType.dinner, true);
    }

    public void resetMealsToDefault(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        LocalDate tomorrow = LocalDate.now().plusDays(1);

        // Reset meals for next 30 days to default (enabled)
        for (int i = 0; i < 30; i++) {
            LocalDate date = tomorrow.plusDays(i);
            setMealStatus(student, date, Meal.MealType.breakfast, true);
            setMealStatus(student, date, Meal.MealType.dinner, true);
        }
    }

    public int getMonthlyMealCount(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate endOfMonth = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());

        // Single count query against student_meals joined to meals,
        // replaces the old day-by-day HashMap loop
        long optedCount = studentMealRepository
                .countByStudentAndIsOptedTrueAndMeal_MealDateBetween(student, startOfMonth, endOfMonth);

        return (int) optedCount;
    }

    public int getTodayMealCount() {
        // Calculate actual meals for today
        // Now backed by a real database query instead of the old "return 0" stub
        LocalDate today = LocalDate.now();
        return (int) studentMealRepository.countByIsOptedTrueAndMeal_MealDate(today);
    }

    private void setMealStatus(Student student, LocalDate date, Meal.MealType mealType, boolean enabled) {
        // Find or create the Meal row for this type/date
        Meal meal = mealRepository.findByMealTypeAndMealDate(mealType, date)
                .orElseGet(() -> mealRepository.save(new Meal(mealType, date)));

        // Find or create the StudentMeal row linking this student to that meal
        StudentMeal studentMeal = studentMealRepository.findByStudentAndMeal(student, meal)
                .orElseGet(() -> new StudentMeal(student, meal));

        studentMeal.setIsOpted(enabled);
        studentMealRepository.save(studentMeal);
    }

    private boolean getMealStatus(Student student, LocalDate date, Meal.MealType mealType) {
        Optional<Meal> mealOpt = mealRepository.findByMealTypeAndMealDate(mealType, date);
        if (mealOpt.isEmpty()) {
            return true; // No row yet means default (opted-in)
        }

        Optional<StudentMeal> studentMealOpt = studentMealRepository.findByStudentAndMeal(student, mealOpt.get());
        return studentMealOpt.map(StudentMeal::getIsOpted).orElse(true); // Default is enabled
    }
}