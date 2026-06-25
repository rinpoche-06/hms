package com.hms.dto;

import java.time.LocalDate;

public class StudentBillDto {
    private Long studentId;
    private String month;
    private Integer totalMeals;
    private Integer totalDays;
    private Double amount;
    private Double totalAmount;
    private Double fine;
    private LocalDate billingPeriodStart;
    private LocalDate billingPeriodEnd;
    private String billingPeriod;
    private LocalDate dueDate;
    private String status;
    private Boolean paid;

    public StudentBillDto() {}

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public String getMonth() { return month; }
    public void setMonth(String month) { this.month = month; }

    public Integer getTotalMeals() { return totalMeals; }
    public void setTotalMeals(Integer totalMeals) { this.totalMeals = totalMeals; }

    public Integer getTotalDays() { return totalDays; }
    public void setTotalDays(Integer totalDays) { this.totalDays = totalDays; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public Double getFine() { return fine; }
    public void setFine(Double fine) { this.fine = fine; }

    public LocalDate getBillingPeriodStart() { return billingPeriodStart; }
    public void setBillingPeriodStart(LocalDate billingPeriodStart) { this.billingPeriodStart = billingPeriodStart; }

    public LocalDate getBillingPeriodEnd() { return billingPeriodEnd; }
    public void setBillingPeriodEnd(LocalDate billingPeriodEnd) { this.billingPeriodEnd = billingPeriodEnd; }

    public String getBillingPeriod() { return billingPeriod; }
    public void setBillingPeriod(String billingPeriod) { this.billingPeriod = billingPeriod; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getPaid() { return paid; }
    public void setPaid(Boolean paid) { this.paid = paid; }
}
