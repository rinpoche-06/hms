package com.hms.repository;

import com.hms.entity.Meal;
import com.hms.entity.Student;
import com.hms.entity.StudentMeal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentMealRepository extends JpaRepository<StudentMeal, Long> {
    Optional<StudentMeal> findByStudentAndMeal(Student student, Meal meal);
    List<StudentMeal> findByStudent(Student student);

    long countByStudentAndIsOptedTrueAndMeal_MealDateBetween(
            Student student, LocalDate startDate, LocalDate endDate);

    long countByIsOptedTrueAndMeal_MealDate(LocalDate mealDate);
}