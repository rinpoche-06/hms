import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiCreditCard, FiClock, FiCheck, FiX, FiSquare } from 'react-icons/fi';
import QRCode from 'qrcode.react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('meals');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [meals, setMeals] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [currentBill, setCurrentBill] = useState(null);


  // Load real data from API
  useEffect(() => {
    if (user?.id) {
      loadStudentData();
    }
  }, [user?.id]);

  // Check for confirmed payments periodically
  useEffect(() => {
    if (user?.id) {
      const interval = setInterval(() => {
        checkConfirmedPayments();
      }, 2000); // Check every 2 seconds

      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // Get the actual current date in IST (UTC+5:30)
  const getSimulatedDate = () => {
    const now = new Date();
    // Get IST date parts using Intl API (reliable across all browsers)
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).formatToParts(now);
    const get = (type) => parseInt(parts.find(p => p.type === type).value, 10);
    return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  };

  // Format a Date object to YYYY-MM-DD using its local components (no UTC shift)
  const toDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Helper function to show current date info
  const getCurrentDateInfo = () => {
    const today = getSimulatedDate();
    return {
      today: toDateStr(today),
      todayFormatted: today.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      month: today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    };
  };

  const loadStudentData = async () => {
    try {
      
      // Get current user from context
      const studentId = user?.id;
      if (!studentId) return;

      generateDefaultMeals();

      // Use dynamic calculation based on actual current date
      const today = getSimulatedDate();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const todayDate = today.getDate();
      
      // Calculate days from today to end of month
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      const endDate = endOfMonth.getDate();
      const remainingDays = endDate - todayDate + 1; // Including today
      const totalMeals = remainingDays * 2; // 2 meals per day
      const totalAmount = totalMeals * 60; // ₹60 per meal
      
      // Dynamic month name and dates
      const currentMonthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const dueDate = toDateStr(endOfMonth);
      const billingPeriod = `${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
      console.log('💰 BILLING CALCULATION - Current date:', {
        today: today.toDateString(),
        todayDate: todayDate,
        endDate: endDate,
        remainingDays: remainingDays,
        totalMeals: totalMeals,
        totalAmount: totalAmount,
        currentMonthName: currentMonthName,
        billingPeriod: billingPeriod,
        dueDate: dueDate
      });
      
      setCurrentBill({
        month: currentMonthName,
        totalMeals: totalMeals,
        totalDays: remainingDays,
        amount: totalAmount,
        fine: 0,
        dueDate: dueDate,
        billingPeriod: billingPeriod,
        status: 'pending'
      });
      
    } catch (error) {
      console.error('Error loading student data:', error);
      generateDefaultMeals();
    }
    
    // Check for confirmed payments after everything is loaded
    checkConfirmedPayments();
  };

  const checkConfirmedPayments = () => {
    // Check for confirmed payments in localStorage
    const confirmedPayments = JSON.parse(localStorage.getItem('confirmedPayments') || '[]');
    const myConfirmedPayments = confirmedPayments.filter(p => p.studentId === user.id);
    
    if (myConfirmedPayments.length > 0) {
      console.log('Found confirmed payments:', myConfirmedPayments);
      
      // Update payment history with confirmed payments (replace, don't append)
      const updatedHistory = myConfirmedPayments.map(p => ({
        id: p.id,
        month: p.month || getSimulatedDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        amount: p.amount,
        status: 'confirmed',
        date: p.verifiedDate ? p.verifiedDate.split('T')[0] : toDateStr(getSimulatedDate()),
        fine: p.fine || 0
      }));
      
      // Only update if the history has changed (avoid duplicates)
      setPaymentHistory(prev => {
        // Check if we already have these payments
        const existingIds = prev.map(p => p.id);
        const newPayments = updatedHistory.filter(p => !existingIds.includes(p.id));
        
        if (newPayments.length > 0) {
          return [...newPayments, ...prev];
        }
        return prev;
      });
      
      // Update current bill status to confirmed
      setCurrentBill(prev => {
        if (prev && (prev.status === 'pending_verification' || prev.status === 'pending')) {
          return {
            ...prev,
            status: 'confirmed'
          };
        }
        return prev;
      });
    }
  };

  const generateDefaultMeals = () => {
    const meals = [];
    const today = getSimulatedDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayDate = today.getDate();
    
    // Get last day of current month
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const endDate = endOfMonth.getDate();
    
    console.log('📅 DATE CALCULATION:', {
      simulatedToday: today.toDateString(),
      todayDate: todayDate,
      endOfMonth: endOfMonth.toDateString(),
      endDate: endDate,
      willIncludeOct31: endDate >= 31
    });
    
    // Load saved meal preferences for this student
    const studentMealPrefs = JSON.parse(localStorage.getItem('studentMealPreferences') || '{}');
    const userMealPrefs = studentMealPrefs[user?.id] || {};
    
    // Generate meals from today to end of current month (dynamic)
    for (let day = todayDate; day <= endDate; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = toDateStr(date);
      const canModify = day > todayDate; // Can modify future dates only (tomorrow onwards)
      
      // Check if this date has saved preferences, otherwise default to opted
      const isOptedForDay = userMealPrefs[dateStr] !== undefined ? userMealPrefs[dateStr] : true;
      
      console.log(`🗓️ MEAL SKIP LOGIC - Day ${day}:`, {
        todayDate: todayDate,
        day: day,
        dateStr: dateStr,
        canModify: canModify,
        isToday: day === todayDate,
        isFuture: day > todayDate,
        savedPreference: userMealPrefs[dateStr],
        isOptedForDay: isOptedForDay
      });
      
      meals.push({
        id: `${dateStr}-breakfast`,
        type: 'breakfast',
        date: dateStr,
        isOpted: isOptedForDay, // Use saved preference or default to opted
        canSkip: canModify,
        cost: 60
      });
      
      meals.push({
        id: `${dateStr}-dinner`,
        type: 'dinner',
        date: dateStr,
        isOpted: isOptedForDay, // Use saved preference or default to opted
        canSkip: canModify,
        cost: 60
      });
      

    }
    
    setMeals(meals);
    
    // Calculate dynamically based on actual days from today to end of month
    const totalDays = endDate - todayDate + 1; // Days from today to end of month
    const totalMeals = totalDays * 2; // 2 meals per day
    const totalAmount = totalMeals * 60; // ₹60 per meal
    
    // Get current month name dynamically
    const currentMonthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const dueDate = toDateStr(new Date(currentYear, currentMonth + 1, 0)); // Last day of current month
    const billingPeriod = `${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(currentYear, currentMonth + 1, 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    
    console.log('🍽️ MEAL GENERATION - Dynamic calculation:', {
      todayDate: todayDate,
      endDate: endDate,
      totalDays: totalDays,
      totalMeals: totalMeals,
      totalAmount: totalAmount,
      mealsGenerated: meals.length,
      currentMonth: currentMonthName,
      billingPeriod: billingPeriod,
      firstMealDate: meals[0]?.date,
      lastMealDate: meals[meals.length - 1]?.date,
      allDates: meals.map(m => m.date).filter((date, index) => index % 2 === 0) // Show unique dates only
    });
    
    // Note: Current bill is set in loadStudentData, not here
    // This function only generates meals, billing is handled separately
    
    setPaymentHistory([]);
  };

  const handleSkipDay = async (date) => {
    try {
      // Validate that the date is in the future (1 day before rule)
      const today = getSimulatedDate();
      const skipDate = new Date(date);
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const skipDateOnly = new Date(skipDate.getFullYear(), skipDate.getMonth(), skipDate.getDate());
      
      if (skipDateOnly <= todayDateOnly) {
        toast.error('Cannot skip meals for today or past dates. You can only skip meals 1 day in advance.');
        return;
      }
      
      const updatedMeals = meals.map(meal => 
        meal.date === date 
          ? { ...meal, isOpted: false }
          : meal
      );
      setMeals(updatedMeals);
      
      // Save skipped meals to localStorage for persistence
      if (user?.id) {
        const studentMealPrefs = JSON.parse(localStorage.getItem('studentMealPreferences') || '{}');
        if (!studentMealPrefs[user.id]) {
          studentMealPrefs[user.id] = {};
        }
        studentMealPrefs[user.id][date] = false; // false = skipped
        localStorage.setItem('studentMealPreferences', JSON.stringify(studentMealPrefs));
        console.log('💾 SAVED meal skip:', { studentId: user.id, date: date, skipped: true });
      }
      
      // Recalculate payment amount
      recalculatePayment(updatedMeals);
      
      toast.success('Day skipped successfully!');
      

    } catch (error) {
      toast.error('Failed to skip day');
    }
  };

  const handleEnableDay = async (date) => {
    try {
      // Validate that the date is in the future (1 day before rule)
      const today = getSimulatedDate();
      const enableDate = new Date(date);
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const enableDateOnly = new Date(enableDate.getFullYear(), enableDate.getMonth(), enableDate.getDate());
      
      if (enableDateOnly <= todayDateOnly) {
        toast.error('Cannot modify meals for today or past dates. You can only modify meals 1 day in advance.');
        return;
      }
      
      const updatedMeals = meals.map(meal => 
        meal.date === date 
          ? { ...meal, isOpted: true }
          : meal
      );
      setMeals(updatedMeals);
      
      // Save enabled meals to localStorage for persistence
      if (user?.id) {
        const studentMealPrefs = JSON.parse(localStorage.getItem('studentMealPreferences') || '{}');
        if (!studentMealPrefs[user.id]) {
          studentMealPrefs[user.id] = {};
        }
        studentMealPrefs[user.id][date] = true; // true = opted
        localStorage.setItem('studentMealPreferences', JSON.stringify(studentMealPrefs));
        console.log('💾 SAVED meal enable:', { studentId: user.id, date: date, opted: true });
      }
      
      // Recalculate payment amount
      recalculatePayment(updatedMeals);
      
      toast.success('Day enabled successfully!');
      

    } catch (error) {
      toast.error('Failed to enable day');
    }
  };

  const recalculatePayment = (updatedMeals) => {
    // Simply count all opted meals
    const optedMeals = updatedMeals.filter(meal => meal.isOpted);
    const totalAmount = optedMeals.length * 60; // ₹60 per meal

    console.log('💰 RECALCULATION - Updated amounts:', {
      totalMeals: updatedMeals.length,
      optedMeals: optedMeals.length,
      skippedMeals: updatedMeals.length - optedMeals.length,
      totalAmount: totalAmount,
      studentId: user?.id
    });

    // Update current bill
    setCurrentBill(prev => ({
      ...prev,
      totalMeals: optedMeals.length,
      amount: totalAmount
    }));

    // Save updated amounts to localStorage for AdminDashboard to read
    if (user?.id) {
      const studentBills = JSON.parse(localStorage.getItem('studentBills') || '{}');
      studentBills[user.id] = {
        amount: totalAmount,
        totalMeals: optedMeals.length,
        lastUpdated: toDateStr(getSimulatedDate())
      };
      localStorage.setItem('studentBills', JSON.stringify(studentBills));
      
      // Trigger admin dashboard refresh by updating a timestamp
      localStorage.setItem('adminRefreshTrigger', toDateStr(getSimulatedDate()));
      
      console.log('💾 SAVED to localStorage:', studentBills[user.id]);
    }
  };

  const handlePayment = () => {
    setShowPaymentModal(true);
  };

  const confirmPayment = () => {
    // Check if payment already exists for this student
    const existingPayments = JSON.parse(localStorage.getItem('pendingPayments') || '[]');
    const alreadyPaid = existingPayments.some(p => 
      p.studentId === user.id && p.status === 'pending_verification'
    );
    
    if (alreadyPaid) {
      toast.error('You already have a pending payment. Please wait for admin verification.');
      setShowPaymentModal(false);
      return;
    }

    setShowPaymentModal(false);
    
    // Update current bill status
    setCurrentBill(prev => ({
      ...prev,
      status: 'pending_verification'
    }));
    
    // Add to payment history
    const paymentId = Date.now();
    const newPayment = {
      id: paymentId,
      month: currentBill.month,
      amount: currentBill.amount,
      status: 'pending_verification',
      date: toDateStr(getSimulatedDate()),
      fine: currentBill.fine || 0
    };
    setPaymentHistory([newPayment, ...paymentHistory]);
    
    // Store in localStorage so admin can see it
    const adminPayment = {
      id: paymentId,
      studentId: user.id,
      studentName: user.name,
      admissionNumber: user.admissionNumber,
      amount: currentBill.amount,
      status: 'pending_verification',
      paymentDate: toDateStr(getSimulatedDate()),
      fine: currentBill.fine || 0
    };
    existingPayments.push(adminPayment);
    localStorage.setItem('pendingPayments', JSON.stringify(existingPayments));
    
    // Trigger admin dashboard refresh
    localStorage.setItem('adminRefreshTrigger', toDateStr(getSimulatedDate()));
    
    toast.success('Payment marked as paid! Waiting for admin verification.');
    
    // Check for confirmation after a short delay
    setTimeout(() => {
      checkConfirmedPayments();
    }, 1000);
  };

  const tabs = [
    { id: 'meals', label: 'My Meals', icon: <FiCalendar /> },
    { id: 'payments', label: 'Payments', icon: <FiCreditCard /> }
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="student-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <motion.div
          className="dashboard-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="header-content">
            <div className="header-text">
              <h1>My Dashboard</h1>
              <p>Manage your meals and payments</p>
            </div>
            <div className="header-stats">
              <div className="stat-item">
                <span className="stat-value">{meals.filter(m => m.isOpted).length}</span>
                <span className="stat-label">Meals This Month</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">₹{currentBill?.amount || 0}</span>
                <span className="stat-label">Amount to Pay</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Current Bill Alert */}
        {currentBill && currentBill.status === 'pending' && (
          <motion.div
            className="bill-alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="alert-content">
              <div className="alert-icon">
                <FiClock />
              </div>
              <div className="alert-text">
                <h4>Payment Due</h4>
                <p>Your {currentBill.month} bill of ₹{currentBill.amount} is due on {currentBill.dueDate}</p>
              </div>
              <motion.button
                className="btn btn-primary"
                onClick={handlePayment}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Pay Now
              </motion.button>
            </div>
          </motion.div>
        )}

        {currentBill && currentBill.status === 'pending_verification' && (
          <motion.div
            className="bill-alert verification-alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="alert-content">
              <div className="alert-icon">
                <FiClock />
              </div>
              <div className="alert-text">
                <h4>Payment Verification Pending</h4>
                <p>Your payment of ₹{currentBill.amount} is being verified by admin</p>
              </div>
              <motion.button
                className="btn btn-secondary btn-sm"
                onClick={checkConfirmedPayments}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Check Status
              </motion.button>
            </div>
          </motion.div>
        )}

        {currentBill && currentBill.status === 'confirmed' && (
          <motion.div
            className="bill-alert success-alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="alert-content">
              <div className="alert-icon">
                <FiCheck />
              </div>
              <div className="alert-text">
                <h4>Payment Confirmed</h4>
                <p>Your payment of ₹{currentBill.amount} has been verified and confirmed!</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation Tabs */}
        <motion.div
          className="dashboard-tabs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Content Area */}
        <motion.div
          className="dashboard-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {activeTab === 'meals' && (
            <div className="meals-content">
              <div className="content-header">
                <h2>Meal Schedule</h2>
                <div className="meal-info">
                  <span>Each meal costs ₹60 • Daily rate: ₹120 (2 meals) • You can skip meals 1 day in advance only</span>
                  <br />
                  <small style={{ color: '#666', fontSize: '0.85em' }}>
                    📅 Showing meals from {getCurrentDateInfo().todayFormatted} onwards • ⚠️ Today's meals cannot be modified
                  </small>
                </div>
              </div>

              <div className="meals-grid">
                {meals.map((meal) => (
                  <motion.div
                    key={meal.id}
                    className={`meal-card ${meal.isOpted ? 'opted' : 'skipped'} ${!meal.canSkip ? 'today-meal' : ''}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ y: -5 }}
                  >
                    <div className="meal-header">
                      <div className="meal-icon">
                        {meal.type === 'breakfast' ? '🌅' : '🌙'}
                      </div>
                      <div className="meal-info">
                        <h3>{meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}</h3>
                        <p>{formatDate(meal.date)}</p>
                      </div>
                      <div className="meal-cost">
                        ₹{meal.cost}
                      </div>
                    </div>

                    <div className="meal-status">
                      {meal.isOpted ? (
                        <div className="status-opted">
                          <FiCheck />
                          <span>Opted</span>
                        </div>
                      ) : (
                        <div className="status-skipped">
                          <FiX />
                          <span>Skipped</span>
                        </div>
                      )}
                    </div>

                    <div className="meal-actions">
                      {meal.canSkip ? (
                        <div className="action-buttons">
                          {meal.isOpted ? (
                            <motion.button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleSkipDay(meal.date)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Skip Day
                            </motion.button>
                          ) : (
                            <motion.button
                              className="btn btn-sm btn-success"
                              onClick={() => handleEnableDay(meal.date)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Enable Day
                            </motion.button>
                          )}
                        </div>
                      ) : (
                        <div className="action-disabled">
                          <span>Cannot modify (Today's meals)</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="payments-content">
              <div className="content-header">
                <h2>Payment History</h2>
                {currentBill && currentBill.status === 'pending' && (
                  <motion.button
                    className="btn btn-primary"
                    onClick={handlePayment}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiCreditCard />
                    Pay Current Bill
                  </motion.button>
                )}
              </div>

              {/* Current Bill */}
              {currentBill && (
                <motion.div
                  className="current-bill-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="bill-header">
                    <h3>Current Bill - {currentBill.month}</h3>
                    <span className={`bill-status ${currentBill.status}`}>
                      {currentBill.status.charAt(0).toUpperCase() + currentBill.status.slice(1)}
                    </span>
                  </div>
                  <div className="bill-details">
                    <div className="bill-item">
                      <span>Billing Period:</span>
                      <span>{currentBill.billingPeriod || 'Current Month'} ({currentBill.totalDays} days)</span>
                    </div>
                    <div className="bill-item">
                      <span>Total Meals:</span>
                      <span>{currentBill.totalMeals} meals</span>
                    </div>
                    <div className="bill-item">
                      <span>Rate:</span>
                      <span>₹60 per meal</span>
                    </div>
                    <div className="bill-item">
                      <span>Meal Amount:</span>
                      <span>₹{currentBill.amount}</span>
                    </div>
                    {currentBill.fine > 0 && (
                      <div className="bill-item fine">
                        <span>Late Fine:</span>
                        <span>₹{currentBill.fine}</span>
                      </div>
                    )}
                    <div className="bill-item total">
                      <span>Total Amount:</span>
                      <span>₹{currentBill.amount + (currentBill.fine || 0)}</span>
                    </div>
                    <div className="bill-item">
                      <span>Due Date:</span>
                      <span>{currentBill.dueDate}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Payment History */}
              <div className="payment-history">
                <h3>Previous Payments</h3>
                <div className="payments-list">
                  {paymentHistory.map((payment) => (
                    <motion.div
                      key={payment.id}
                      className="payment-card"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="payment-info">
                        <h4>{payment.month}</h4>
                        <p>Paid on {payment.date}</p>
                      </div>
                      <div className="payment-amount">
                        <span className="amount">₹{payment.amount}</span>
                        {payment.fine > 0 && (
                          <span className="fine">+₹{payment.fine} fine</span>
                        )}
                      </div>
                      <div className="payment-status">
                        <span className={`status ${payment.status}`}>
                          {payment.status === 'confirmed' && <FiCheck />}
                          {payment.status === 'pending_verification' && <FiClock />}
                          {payment.status === 'pending' && <FiX />}
                          {payment.status === 'confirmed' ? 'Confirmed' : 
                           payment.status === 'pending_verification' ? 'Pending Verification' : 
                           'Pending'}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowPaymentModal(false)}
        >
          <motion.div
            className="payment-modal"
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Pay Your Bill</h3>
              <button 
                className="modal-close"
                onClick={() => setShowPaymentModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="modal-content">
              <div className="payment-details">
                <div className="detail-item">
                  <span>Bill Month:</span>
                  <span>{currentBill?.month}</span>
                </div>
                <div className="detail-item">
                  <span>Total Amount:</span>
                  <span>₹{currentBill?.amount + (currentBill?.fine || 0)}</span>
                </div>
              </div>

              <div className="qr-section">
                <div className="qr-header">
                  <FiSquare />
                  <h4>Scan QR Code to Pay</h4>
                </div>
                <div className="qr-code">
                  <QRCode 
                    value={`upi://pay?pa=rintocherian2006@oksbi&pn=HMS&am=${currentBill?.amount + (currentBill?.fine || 0)}&cu=INR&tn=Hostel Mess Payment`}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="upi-info">
                  <p>UPI ID: <strong>rintocherian2006@oksbi</strong></p>
                  <p>Amount: <strong>₹{currentBill?.amount + (currentBill?.fine || 0)}</strong></p>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={confirmPayment}
                >
                  I've Paid
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default StudentDashboard;