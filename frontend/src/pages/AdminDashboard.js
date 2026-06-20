import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiCalendar, FiCreditCard, FiTrendingUp, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [meals, setMeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  // Load real data from API
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Check for new pending payments and student bill updates periodically
  useEffect(() => {
    let lastRefreshTrigger = localStorage.getItem('adminRefreshTrigger');
    
    const interval = setInterval(() => {
      // Check for new pending payments
      const pendingData = JSON.parse(localStorage.getItem('pendingPayments') || '[]');
      const filteredPendingPayments = pendingData.filter(p => p.status === 'pending_verification');
      
      // Check if student bills have been updated
      const currentRefreshTrigger = localStorage.getItem('adminRefreshTrigger');
      const paymentsChanged = filteredPendingPayments.length !== pendingPayments.length;
      const billsChanged = currentRefreshTrigger !== lastRefreshTrigger;
      
      if (paymentsChanged || billsChanged) {
        if (paymentsChanged) {
          setPendingPayments(filteredPendingPayments);
        }
        
        if (billsChanged) {
          refreshStudentAmounts();
          lastRefreshTrigger = currentRefreshTrigger;
        }
        
        updateDashboardStats(students, filteredPendingPayments);
        
        console.log('🔄 ADMIN REFRESH TRIGGERED:', {
          paymentsChanged,
          billsChanged,
          newPendingCount: filteredPendingPayments.length
        });
      }
    }, 2000); // Check every 2 seconds for faster updates

    return () => clearInterval(interval);
  }, [pendingPayments.length, students.length]);

  // Update dashboard stats when students or pending payments change
  useEffect(() => {
    updateDashboardStats(students, pendingPayments);
  }, [students.length, pendingPayments.length]);

  // Refresh student amounts periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStudentAmounts();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [students]);

  const loadDashboardData = async () => {
    try {
      
      // Load students
      const studentsResponse = await fetch('/api/admin/students');
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        
        // Filter out deleted students (stored in localStorage)
        const deletedStudents = JSON.parse(localStorage.getItem('deletedStudents') || '[]');
        const filteredStudents = studentsData.filter(student => 
          !deletedStudents.includes(student.id)
        );
        
        // Add locally added students (for demo)
        const addedStudents = JSON.parse(localStorage.getItem('addedStudents') || '[]');
        
        // Update student amounts with latest data
        const updatedAddedStudents = addedStudents.map(student => {
          const updatedAmounts = getUpdatedStudentAmount(student.id);
          return {
            ...student,
            ...updatedAmounts
          };
        });
        
        const allStudents = [...filteredStudents, ...updatedAddedStudents];
        
        setStudents(allStudents);
        
        // Load pending payments from localStorage for demo
        const pendingData = JSON.parse(localStorage.getItem('pendingPayments') || '[]');
        const filteredPendingPayments = pendingData.filter(p => p.status === 'pending_verification');
        setPendingPayments(filteredPendingPayments);

        // Generate today's meal data
        generateTodayMeals();
        
        // Load recent activity
        loadRecentActivity();
        
        // Calculate and update dashboard stats
        updateDashboardStats(allStudents, filteredPendingPayments);
        
        // Initialize empty payments array
        setPayments([]);
      } else {
        // If API fails, use only locally added students
        const addedStudents = JSON.parse(localStorage.getItem('addedStudents') || '[]');
        const allStudents = addedStudents;
        setStudents(allStudents);
        
        // Load pending payments from localStorage for demo
        const pendingData = JSON.parse(localStorage.getItem('pendingPayments') || '[]');
        const filteredPendingPayments = pendingData.filter(p => p.status === 'pending_verification');
        setPendingPayments(filteredPendingPayments);

        // Generate today's meal data
        generateTodayMeals();
        
        // Load recent activity
        loadRecentActivity();
        
        // Calculate and update dashboard stats
        updateDashboardStats(allStudents, filteredPendingPayments);
        
        // Initialize empty payments array
        setPayments([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0,
    todayMeals: 0,
    pendingPayments: 0
  });

  const stats = [
    {
      title: 'Total Students',
      value: dashboardStats.totalStudents,
      icon: <FiUsers />,
      color: 'blue',
      change: ''
    },
    {
      title: 'Today\'s Meals',
      value: dashboardStats.todayMeals,
      icon: <FiCalendar />,
      color: 'green',
      change: ''
    },
    {
      title: 'Pending Payments',
      value: `₹${dashboardStats.pendingPayments}`,
      icon: <FiTrendingUp />,
      color: 'red',
      change: pendingPayments.length > 0 ? `${pendingPayments.length} awaiting verification` : ''
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FiTrendingUp /> },
    { id: 'students', label: 'Students', icon: <FiUsers /> },
    { id: 'payments', label: 'Payments', icon: <FiCreditCard /> }
  ];

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    admissionNumber: '',
    email: '',
    phone: '',
    roomNumber: ''
  });

  const handleAddStudent = () => {
    setShowAddStudentModal(true);
  };

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    
    // Validate admission number is 4 digits
    if (!/^\d{4}$/.test(newStudent.admissionNumber)) {
      toast.error('Admission number must be exactly 4 digits');
      return;
    }

    // Check if admission number already exists
    const existingStudent = students.find(s => s.admissionNumber === newStudent.admissionNumber);
    if (existingStudent) {
      toast.error(`Student with admission number ${newStudent.admissionNumber} already exists`);
      return;
    }

    try {

      const newStudentData = {
        id: Date.now(), // Generate unique ID
        name: newStudent.name,
        admissionNumber: newStudent.admissionNumber,
        email: newStudent.email || '',
        phone: newStudent.phone || '',
        roomNumber: newStudent.roomNumber || '',
        isActive: true,
        createdAt: toDateStr(getSimulatedDate()),
        pendingAmount: calculateCurrentMonthAmount(), // Dynamic bill amount
        totalMealsThisMonth: calculateCurrentMonthMeals()
      };

      // Add to students list
      const updatedStudents = [...students, newStudentData];
      setStudents(updatedStudents);
      
      // Update dashboard stats with new student count
      updateDashboardStats(updatedStudents, pendingPayments);
      
      // Store in localStorage for persistence (optional)
      const addedStudents = JSON.parse(localStorage.getItem('addedStudents') || '[]');
      addedStudents.push(newStudentData);
      localStorage.setItem('addedStudents', JSON.stringify(addedStudents));
      
      // Update today's meals with new student count immediately
      generateTodayMealsWithStudentCount(updatedStudents.length);
      
      // Add to recent activity
      addActivity('add', `Student ${newStudentData.name} added`, newStudentData.name);
      
      setShowAddStudentModal(false);
      setNewStudent({ name: '', admissionNumber: '', email: '', phone: '', roomNumber: '' });
      toast.success(`Student ${newStudentData.name} added successfully!`);
      

    } catch (error) {
      toast.error('Failed to add student');
    }
  };



  const generateTodayMealsWithStudentCount = (studentCount) => {
    const today = getSimulatedDate();
    const todayStr = toDateStr(today);
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Use provided student count
    const breakfastOptedStudents = studentCount; // Show actual student count, can be 0
    const dinnerOptedStudents = studentCount; // Show actual student count, can be 0
    

    
    const todayMeals = [
      {
        id: 1,
        type: 'breakfast',
        date: todayStr,
        dayName: dayName,
        dateDisplay: `${dayName}, ${dateStr}`,
        studentsOpted: breakfastOptedStudents,
        revenue: breakfastOptedStudents * 60,
        status: 'active'
      },
      {
        id: 2,
        type: 'dinner',
        date: todayStr,
        dayName: dayName,
        dateDisplay: `${dayName}, ${dateStr}`,
        studentsOpted: dinnerOptedStudents,
        revenue: dinnerOptedStudents * 60,
        status: 'active'
      }
    ];
    
    setMeals(todayMeals);
    
    console.log('🍽️ ADMIN - Today\'s meals generated:', {
      studentCount: studentCount,
      breakfastOptedStudents: breakfastOptedStudents,
      dinnerOptedStudents: dinnerOptedStudents,
      totalMeals: breakfastOptedStudents + dinnerOptedStudents
    });
  };

  const generateTodayMeals = () => {
    generateTodayMealsWithStudentCount(students.length);
  };

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

  // Helper functions for dynamic billing calculation
  const calculateCurrentMonthAmount = () => {
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
    
    return totalAmount;
  };

  const calculateCurrentMonthMeals = () => {
    const today = getSimulatedDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const todayDate = today.getDate();
    
    // Calculate days from today to end of month
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const endDate = endOfMonth.getDate();
    const remainingDays = endDate - todayDate + 1; // Including today
    const totalMeals = remainingDays * 2; // 2 meals per day
    
    return totalMeals;
  };

  // Function to get updated student amounts from localStorage
  const getUpdatedStudentAmount = (studentId) => {
    const studentBills = JSON.parse(localStorage.getItem('studentBills') || '{}');
    const studentBill = studentBills[studentId];
    
    if (studentBill) {
      return {
        pendingAmount: studentBill.amount || calculateCurrentMonthAmount(),
        totalMealsThisMonth: studentBill.totalMeals || calculateCurrentMonthMeals()
      };
    }
    
    return {
      pendingAmount: calculateCurrentMonthAmount(),
      totalMealsThisMonth: calculateCurrentMonthMeals()
    };
  };

  // Function to update dashboard stats
  const updateDashboardStats = (studentsList = students, pendingPaymentsList = pendingPayments) => {
    const totalStudents = studentsList.length;
    const todayMeals = totalStudents * 2; // 2 meals per student per day
    
    // Calculate total pending payment amount from submitted payments awaiting verification
    const submittedPaymentsAmount = pendingPaymentsList.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    // Calculate unpaid bills (students who haven't submitted payments yet)
    const studentBills = JSON.parse(localStorage.getItem('studentBills') || '{}');
    const confirmedPayments = JSON.parse(localStorage.getItem('confirmedPayments') || '[]');
    const submittedPaymentStudents = pendingPaymentsList.map(p => p.studentId);
    const confirmedPaymentStudents = confirmedPayments.map(p => p.studentId);
    
    let unpaidBillsAmount = 0;
    studentsList.forEach(student => {
      // Skip if student has already submitted payment or payment is confirmed
      if (!submittedPaymentStudents.includes(student.id) && !confirmedPaymentStudents.includes(student.id)) {
        const studentBill = studentBills[student.id];
        const billAmount = studentBill ? studentBill.amount : calculateCurrentMonthAmount();
        unpaidBillsAmount += billAmount;
      }
    });
    
    // Total pending = submitted payments awaiting verification + unpaid bills
    const totalPendingAmount = submittedPaymentsAmount + unpaidBillsAmount;
    
    console.log('📊 DASHBOARD STATS UPDATE:', {
      totalStudents: totalStudents,
      todayMeals: todayMeals,
      submittedPaymentsAmount: submittedPaymentsAmount,
      unpaidBillsAmount: unpaidBillsAmount,
      totalPendingAmount: totalPendingAmount,
      pendingPaymentsCount: pendingPaymentsList.length
    });
    
    setDashboardStats({
      totalStudents: totalStudents,
      todayMeals: todayMeals,
      pendingPayments: totalPendingAmount
    });
  };

  // Function to refresh student amounts from localStorage
  const refreshStudentAmounts = () => {
    setStudents(prevStudents => {
      const updatedStudents = prevStudents.map(student => {
        const updatedAmounts = getUpdatedStudentAmount(student.id);
        const hasChanged = student.pendingAmount !== updatedAmounts.pendingAmount || 
                          student.totalMealsThisMonth !== updatedAmounts.totalMealsThisMonth;
        
        if (hasChanged) {
          console.log(`🔄 ADMIN - Updated amounts for ${student.name}:`, {
            oldAmount: student.pendingAmount,
            newAmount: updatedAmounts.pendingAmount,
            oldMeals: student.totalMealsThisMonth,
            newMeals: updatedAmounts.totalMealsThisMonth
          });
        }
        
        return {
          ...student,
          ...updatedAmounts
        };
      });
      
      return updatedStudents;
    });
  };

  // Activity management functions
  const addActivity = (type, message, studentName = '') => {
    const newActivity = {
      id: Date.now(),
      type: type, // 'add', 'delete', 'payment'
      message: message,
      studentName: studentName,
      timestamp: toDateStr(getSimulatedDate()),
      timeAgo: 'Just now'
    };
    
    setRecentActivity(prev => {
      const updated = [newActivity, ...prev];
      // Keep only last 5 activities
      return updated.slice(0, 5);
    });
    
    // Store in localStorage for persistence
    const existingActivity = JSON.parse(localStorage.getItem('recentActivity') || '[]');
    const updatedActivity = [newActivity, ...existingActivity].slice(0, 5);
    localStorage.setItem('recentActivity', JSON.stringify(updatedActivity));
  };

  const loadRecentActivity = () => {
    const savedActivity = JSON.parse(localStorage.getItem('recentActivity') || '[]');
    setRecentActivity(savedActivity);
  };

  const handleClearDemoData = () => {
    if (window.confirm('Clear all demo data? This will reset deleted students, payments, etc.')) {
      localStorage.removeItem('deletedStudents');
      localStorage.removeItem('addedStudents');
      localStorage.removeItem('pendingPayments');
      localStorage.removeItem('confirmedPayments');
      localStorage.removeItem('recentActivity');
      setRecentActivity([]);
      loadDashboardData();
      toast.success('Demo data cleared successfully!');
    }
  };

  const handleVerifyPayment = (paymentId) => {
    // Local workflow for demo
    const payment = pendingPayments.find(p => p.id === paymentId);
    if (payment) {
      // Update payment status to confirmed
      payment.status = 'confirmed';
      payment.verifiedDate = toDateStr(getSimulatedDate());
      
      // Update localStorage
      const allPayments = JSON.parse(localStorage.getItem('pendingPayments') || '[]');
      const updatedPayments = allPayments.map(p => 
        p.id === paymentId ? payment : p
      );
      localStorage.setItem('pendingPayments', JSON.stringify(updatedPayments));
      
      // Store confirmed payment for student to see
      const confirmedPayments = JSON.parse(localStorage.getItem('confirmedPayments') || '[]');
      confirmedPayments.push(payment);
      localStorage.setItem('confirmedPayments', JSON.stringify(confirmedPayments));
      
      console.log('Payment verified and stored:', payment);
      console.log('All confirmed payments:', confirmedPayments);
      
      // Remove from pending list
      const updatedPendingPayments = pendingPayments.filter(p => p.id !== paymentId);
      setPendingPayments(updatedPendingPayments);
      
      // Update dashboard stats with new pending payments
      updateDashboardStats(students, updatedPendingPayments);
      
      // Add to recent activity
      addActivity('payment', `Payment verified for ${payment.studentName}`, payment.studentName);
      
      toast.success(`Payment verified for ${payment.studentName}!`);
    }
  };

  const handleDeleteStudent = (studentId, studentName) => {
    setStudentToDelete({ id: studentId, name: studentName });
    setShowDeleteModal(true);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    
    try {
      // Store deleted student ID in localStorage for persistence
      const deletedStudents = JSON.parse(localStorage.getItem('deletedStudents') || '[]');
      deletedStudents.push(studentToDelete.id);
      localStorage.setItem('deletedStudents', JSON.stringify(deletedStudents));
      
      // Update local state
      const updatedStudents = students.filter(s => s.id !== studentToDelete.id);
      setStudents(updatedStudents);
      
      // Update dashboard stats with new student count
      updateDashboardStats(updatedStudents, pendingPayments);
      
      // Add to recent activity
      addActivity('delete', `Student ${studentToDelete.name} removed`, studentToDelete.name);
      
      setShowDeleteModal(false);
      setStudentToDelete(null);
      toast.success(`Student "${studentToDelete.name}" deleted successfully!`);
      
      // Update today's meals with new student count immediately
      generateTodayMealsWithStudentCount(updatedStudents.length);
      

    } catch (error) {
      toast.error('Failed to delete student');
    }
  };

  return (
    <div className="admin-dashboard">
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
              <h1>Admin Dashboard</h1>
              <p>Manage your hostel mess operations efficiently</p>
            </div>
            <div className="header-actions">
              <motion.button
                className="btn btn-secondary btn-sm"
                onClick={handleClearDemoData}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear Data
              </motion.button>
              <motion.button
                className="btn btn-primary"
                onClick={handleAddStudent}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiPlus />
                Add Student
              </motion.button>
              <motion.button
                className="btn btn-secondary"
                onClick={() => {
                  updateDashboardStats(students, pendingPayments);
                  toast.success('Dashboard stats refreshed!');
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🔄 Refresh Stats
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="stats-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className={`stat-card stat-${stat.color}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="stat-icon">
                {stat.icon}
              </div>
              <div className="stat-content">
                <h3 className="stat-value">{stat.value}</h3>
                <p className="stat-title">{stat.title}</p>
                {stat.change && (
                  <span className={`stat-change ${stat.change.startsWith('+') ? 'positive' : 'negative'}`}>
                    {stat.change} from last month
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

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
          {activeTab === 'overview' && (
            <div className="overview-content">
              <div className="overview-grid">
                <div className="overview-card">
                  <h3>Recent Activity</h3>
                  <div className="activity-list">
                    {recentActivity.length === 0 ? (
                      <div className="no-activity">
                        <p>No recent activity</p>
                        <span>Start by adding students to see activity here</span>
                      </div>
                    ) : (
                      recentActivity.map((activity) => (
                        <div key={activity.id} className="activity-item">
                          <div className="activity-icon">
                            {activity.type === 'add' ? '➕' : activity.type === 'delete' ? '🗑️' : '💳'}
                          </div>
                          <div className="activity-text">
                            <p>{activity.message}</p>
                            <span>{activity.timeAgo}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="overview-card">
                  <h3>Quick Actions</h3>
                  <div className="quick-actions">
                    <motion.button
                      className="action-btn"
                      onClick={handleAddStudent}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FiUsers />
                      <span>Add Student</span>
                    </motion.button>

                    <motion.button
                      className="action-btn"
                      onClick={() => {
                        setActiveTab('payments');
                        toast.success('Navigated to Payments section');
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FiCreditCard />
                      <span>View Payments</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="students-content">
              <div className="content-header">
                <h2>Student Management</h2>
                <div className="content-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      refreshStudentAmounts();
                      toast.success('Student amounts refreshed!');
                    }}
                  >
                    🔄 Refresh Amounts
                  </button>
                </div>
              </div>

              <div className="students-table">
                <div className="table-header">
                  <div className="table-cell">Name</div>
                  <div className="table-cell">Admission No.</div>
                  <div className="table-cell">Room</div>
                  <div className="table-cell">Total Meals</div>
                  <div className="table-cell">Pending Amount</div>
                  <div className="table-cell">Status</div>
                  <div className="table-cell">Actions</div>
                </div>
                {students.map((student) => (
                  <motion.div
                    key={student.id}
                    className="table-row"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="table-cell">
                      <div className="student-info">
                        <div className="student-avatar">
                          {student.name.charAt(0)}
                        </div>
                        <span>{student.name}</span>
                      </div>
                    </div>
                    <div className="table-cell">{student.admissionNumber}</div>
                    <div className="table-cell">{student.roomNumber}</div>
                    <div className="table-cell">{student.totalMeals}</div>
                    <div className="table-cell">₹{student.pendingAmount}</div>
                    <div className="table-cell">
                      <span className={`status ${student.isActive ? 'active' : 'inactive'}`}>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="table-cell">
                      <motion.button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteStudent(student.id, student.name)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Delete
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}



          {activeTab === 'payments' && (
            <div className="payments-content">
              <div className="content-header">
                <h2>Payment Management</h2>
                <div className="payment-summary">
                  <div className="summary-item">
                    <span>Total Collected: ₹{dashboardStats.monthlyRevenue}</span>
                  </div>
                  <div className="summary-item">
                    <span>Pending: ₹{dashboardStats.pendingPayments}</span>
                  </div>
                </div>
              </div>

              {/* Pending Verification Section */}
              <div className="pending-payments-section">
                <h3>Payments Pending Verification ({pendingPayments.length})</h3>
                <div className="pending-payments-list">
                  {pendingPayments.length === 0 ? (
                    <div className="no-pending-payments">
                      <p>No payments pending verification</p>
                    </div>
                  ) : (
                    pendingPayments.map((payment) => (
                      <div key={payment.id} className="pending-payment-item">
                        <div className="payment-info">
                          <h4>{payment.studentName}</h4>
                          <p>Admission: {payment.admissionNumber} • Amount: ₹{payment.amount}</p>
                          <small>Submitted: {new Date(payment.paymentDate).toLocaleString()}</small>
                        </div>
                        <div className="payment-actions">
                          <motion.button
                            className="btn btn-sm btn-success"
                            onClick={() => handleVerifyPayment(payment.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            ✓ Verify Payment
                          </motion.button>
                          <button className="btn btn-sm btn-secondary">
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="payments-table">
                <div className="table-header">
                  <div className="table-cell">Student</div>
                  <div className="table-cell">Amount</div>
                  <div className="table-cell">Date</div>
                  <div className="table-cell">Method</div>
                  <div className="table-cell">Status</div>
                  <div className="table-cell">Actions</div>
                </div>
                {payments.map((payment) => (
                  <motion.div
                    key={payment.id}
                    className="table-row"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="table-cell">{payment.studentName}</div>
                    <div className="table-cell">₹{payment.amount}</div>
                    <div className="table-cell">{payment.date}</div>
                    <div className="table-cell">{payment.method}</div>
                    <div className="table-cell">
                      <span className={`status ${payment.status}`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </div>
                    <div className="table-cell">
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          toast.info(`Payment Details: ₹${payment.amount} - ${payment.status}`);
                        }}
                      >
                        View
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowAddStudentModal(false)}
        >
          <motion.div
            className="add-student-modal"
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Add New Student</h3>
              <button 
                className="modal-close"
                onClick={() => setShowAddStudentModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="add-student-form">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                  placeholder="Enter student's full name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Admission Number *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newStudent.admissionNumber}
                  onChange={(e) => setNewStudent({...newStudent, admissionNumber: e.target.value})}
                  placeholder="Enter 4-digit admission number"
                  pattern="\d{4}"
                  maxLength="4"
                  required
                />
                <small className="form-help">Must be exactly 4 digits</small>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Room Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={newStudent.roomNumber}
                  onChange={(e) => setNewStudent({...newStudent, roomNumber: e.target.value})}
                  placeholder="Enter room number"
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddStudentModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                >
                  Add Student
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowDeleteModal(false)}
        >
          <motion.div
            className="delete-modal"
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Delete Student</h3>
            </div>

            <div className="modal-content">
              <div className="delete-warning">
                <div className="warning-icon">⚠️</div>
                <p>Are you sure you want to delete student <strong>"{studentToDelete?.name}"</strong>?</p>
                <p className="warning-text">This action cannot be undone and will remove all associated data.</p>
              </div>

              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={confirmDeleteStudent}
                >
                  Delete Student
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminDashboard;