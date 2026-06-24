package com.hms.repository;

import com.hms.entity.Meal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MealRepository extends JpaRepository<Meal, Long> {
    Optional<Meal> findByMealTypeAndMealDate(Meal.MealType mealType, LocalDate mealDate);
    List<Meal> findByMealDateBetween(LocalDate startDate, LocalDate endDate);
}