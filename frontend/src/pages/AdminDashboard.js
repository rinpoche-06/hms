import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiCalendar, FiCreditCard, FiTrendingUp, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../config/api';
import './AdminDashboard.css';

/**compute elapsed time from ISO timestamp at render time, "Just Now","5 min ago","2 hours ago","Yesterday", "N days ago"
 called during render so it always reflects current moment instead of a stale snapshot**/
const getTimeAgo = (timestamp) => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs/60000);
  const diffHr = Math.floor(diffMin/60);
  const diffDay = Math.floor(diffHr/24);

  if(diffMin < 1) return 'Just now';
  if(diffMin < 60) return `${diffMin} min ago`;
  if(diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's':''} ago`;
  if(diffDay ===1 ) return 'Yesterday';
  return `${diffDay} days ago`
};



const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [meals, setMeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [errors, setErrors] = useState({});

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

// load activity once on mount - not on every poll

useEffect(()=>{
  loadRecentActivity();
},[]);


  // Load real data from API
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Check for new pending payments periodically
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const studentsResponse = await api.get('/admin/students');
      const studentsData = studentsResponse.data;
      setStudents(studentsData);
      updateDashboardStats(studentsData, pendingPayments);

      generateTodayMeals();
      //loadRecentActivity removed from here
      setPayments([]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Could not connect to server');
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
      title: "Today's Meals",
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

    const newErrors = {};

    if (!newStudent.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!/^\d{4}$/.test(newStudent.admissionNumber)) {
      newErrors.admissionNumber = 'Admission number must be exactly 4 digits';
    }

    if (newStudent.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStudent.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (newStudent.phone && !/^[6-9]\d{9}$/.test(newStudent.phone)) {
      newErrors.phone = 'Enter a valid 10-digit Indian mobile number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const response = await api.post('/admin/students', {
        name: newStudent.name,
        admissionNumber: newStudent.admissionNumber,
        email: newStudent.email || '',
        phone: newStudent.phone || '',
        roomNumber: newStudent.roomNumber || ''
      });
      const savedStudent = response.data;
      const updatedStudents = [...students, savedStudent];
      setStudents(updatedStudents);
      updateDashboardStats(updatedStudents, pendingPayments);
      generateTodayMealsWithStudentCount(updatedStudents.length);
      addActivity('add', `Student ${savedStudent.name} added`, savedStudent.name);

      setShowAddStudentModal(false);
      setErrors({});
      setNewStudent({ name: '', admissionNumber: '', email: '', phone: '', roomNumber: '' });
      toast.success(`Student ${savedStudent.name} added successfully!`);
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Failed to add student';
      toast.error(message);
    }
  };

  const generateTodayMealsWithStudentCount = (studentCount) => {
    const today = getSimulatedDate();
    const todayStr = toDateStr(today);
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const breakfastOptedStudents = studentCount;
    const dinnerOptedStudents = studentCount;

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
  };

  const generateTodayMeals = () => {
    generateTodayMealsWithStudentCount(students.length);
  };

  const getSimulatedDate = () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).formatToParts(now);
    const get = (type) => parseInt(parts.find(p => p.type === type).value, 10);
    return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  };

  const toDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const updateDashboardStats = (studentsList = students, pendingPaymentsList = pendingPayments) => {
    const totalStudents = studentsList.length;
    const todayMeals = totalStudents * 2;
    const totalPendingAmount = pendingPaymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);

    setDashboardStats({
      totalStudents,
      todayMeals,
      pendingPayments: totalPendingAmount
    });
  };

  const addActivity = (type, message, studentName = '') => {
    const newActivity = {
      id: Date.now(),
      type: type,
      message: message,
      studentName: studentName,
      timestamp: new Date().toISOString(), //store full ISO timestamp so getTimeAgo() can compute elapsed time on render and dropped redundant timeAgo variabke
    };

    setRecentActivity(prev => {
      const updated = [newActivity, ...prev];
      return updated.slice(0, 5);
    });

    const existingActivity = JSON.parse(localStorage.getItem('recentActivity') || '[]');
    const updatedActivity = [newActivity, ...existingActivity].slice(0, 5);
    localStorage.setItem('recentActivity', JSON.stringify(updatedActivity));
  };

  const loadRecentActivity = () => {
    const savedActivity = JSON.parse(localStorage.getItem('recentActivity') || '[]');
    setRecentActivity(savedActivity);
  };

  const handleVerifyPayment = (paymentId) => {
    const payment = pendingPayments.find(p => p.id === paymentId);
    if (payment) {
      payment.status = 'confirmed';
      payment.verifiedDate = toDateStr(getSimulatedDate());

      const allPayments = JSON.parse(localStorage.getItem('pendingPayments') || '[]');
      const updatedPayments = allPayments.map(p => p.id === paymentId ? payment : p);
      localStorage.setItem('pendingPayments', JSON.stringify(updatedPayments));

      const confirmedPayments = JSON.parse(localStorage.getItem('confirmedPayments') || '[]');
      confirmedPayments.push(payment);
      localStorage.setItem('confirmedPayments', JSON.stringify(confirmedPayments));

      const updatedPendingPayments = pendingPayments.filter(p => p.id !== paymentId);
      setPendingPayments(updatedPendingPayments);
      updateDashboardStats(students, updatedPendingPayments);
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
      await api.delete(`/admin/students/${studentToDelete.id}`);

      const updatedStudents = students.filter(s => s.id !== studentToDelete.id);
      setStudents(updatedStudents);
      updateDashboardStats(updatedStudents, pendingPayments);
      generateTodayMealsWithStudentCount(updatedStudents.length);
      addActivity('delete', `Student ${studentToDelete.name} removed`, studentToDelete.name);

      setShowDeleteModal(false);
      setStudentToDelete(null);
      toast.success(`Student "${studentToDelete.name}" deleted successfully!`);
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Failed to delete student';
      toast.error(message);
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
              <div className="stat-icon">{stat.icon}</div>
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
                            <span>{getTimeAgo(activity.timestamp)}</span>
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
                        <div className="student-avatar">{student.name.charAt(0)}</div>
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
                          <button className="btn btn-sm btn-secondary">✗ Reject</button>
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
                        onClick={() => toast.info(`Payment Details: ₹${payment.amount} - ${payment.status}`)}
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
                onClick={() => { setShowAddStudentModal(false); setErrors({}); }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="add-student-form">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? 'input-error' : ''}`}
                  value={newStudent.name}
                  onChange={(e) => {
                    setNewStudent({...newStudent, name: e.target.value});
                    setErrors({...errors, name: ''});
                  }}
                  placeholder="Enter student's full name"
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Admission Number *</label>
                <input
                  type="text"
                  className={`form-input ${errors.admissionNumber ? 'input-error' : ''}`}
                  value={newStudent.admissionNumber}
                  onChange={(e) => {
                    setNewStudent({...newStudent, admissionNumber: e.target.value});
                    setErrors({...errors, admissionNumber: ''});
                  }}
                  placeholder="Enter 4-digit admission number"
                  maxLength="4"
                />
                {errors.admissionNumber
                  ? <span className="form-error">{errors.admissionNumber}</span>
                  : <small className="form-help">Must be exactly 4 digits</small>
                }
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="text"
                  className={`form-input ${errors.email ? 'input-error' : ''}`}
                  value={newStudent.email}
                  onChange={(e) => {
                    setNewStudent({...newStudent, email: e.target.value});
                    setErrors({...errors, email: ''});
                  }}
                  placeholder="Enter email address"
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className={`form-input ${errors.phone ? 'input-error' : ''}`}
                  value={newStudent.phone}
                  onChange={(e) => {
                    setNewStudent({...newStudent, phone: e.target.value});
                    setErrors({...errors, phone: ''});
                  }}
                  placeholder="Enter 10-digit mobile number"
                />
                {errors.phone && <span className="form-error">{errors.phone}</span>}
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
                  onClick={() => { setShowAddStudentModal(false); setErrors({}); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
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
