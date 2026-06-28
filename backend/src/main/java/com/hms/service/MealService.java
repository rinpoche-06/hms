package com.hms.service;

import com.hms.entity.Meal;
import com.hms.entity.Student;
import com.hms.entity.StudentMeal;
import com.hms.repository.MealRepository;
import com.hms.repository.StudentMealRepository;
import com.hms.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class MealService {

    @Autowired
    private MealRepository mealRepository;

    @Autowired
    private StudentMealRepository studentMealRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Transactional
    public void initializeDefaultMealsForStudent(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());

        for (LocalDate date = startOfMonth; !date.isAfter(endOfMonth); date = date.plusDays(1)) {
            for (Meal.MealType mealType : Meal.MealType.values()) {
                Meal meal = findOrCreateMeal(mealType, date);
                ensureStudentMealExists(student, meal);
            }
        }
    }

    public boolean[] getMealStatusForDate(Long studentId, LocalDate date) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        boolean breakfast = getMealStatus(student, date, Meal.MealType.breakfast);
        boolean dinner = getMealStatus(student, date, Meal.MealType.dinner);
        return new boolean[]{breakfast, dinner};
    }

    @Transactional
    public void skipDay(Long studentId, LocalDate date) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        setMealStatusForDate(student, date, false);
    }

    @Transactional
    public void enableDay(Long studentId, LocalDate date) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        setMealStatusForDate(student, date, true);
    }

    @Transactional
    public void resetMealsToDefault(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());

        for (LocalDate date = startOfMonth; !date.isAfter(endOfMonth); date = date.plusDays(1)) {
            setMealStatusForDate(student, date, true);
        }
    }

    public int getMonthlyMealCount(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate endOfMonth = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());

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

    private void setMealStatusForDate(Student student, LocalDate date, boolean enabled) {
        for (Meal.MealType mealType : Meal.MealType.values()) {
            Meal meal = findOrCreateMeal(mealType, date);
            ensureStudentMealExists(student, meal);
        }

        List<StudentMeal> studentMeals = studentMealRepository.findByStudentAndMeal_MealDate(student, date);
        for (StudentMeal studentMeal : studentMeals) {
            studentMeal.setIsOpted(enabled);
            studentMeal.setSkippedDate(enabled ? null : LocalDateTime.now());
            studentMealRepository.save(studentMeal);
        }
    }

    private Meal findOrCreateMeal(Meal.MealType mealType, LocalDate date) {
        return mealRepository.findByMealTypeAndMealDate(mealType, date)
                .orElseGet(() -> mealRepository.save(new Meal(mealType, date)));
    }

    private StudentMeal ensureStudentMealExists(Student student, Meal meal) {
        return studentMealRepository.findByStudentAndMeal(student, meal)
                .orElseGet(() -> studentMealRepository.save(new StudentMeal(student, meal)));
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
