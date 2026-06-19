import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiLock, FiEye, FiEyeOff, FiUserCheck, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './LoginPage.css';

const LoginPage = () => {
  const { login, loading } = useAuth();
  const [loginType, setLoginType] = useState('student'); // 'admin' or 'student'
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    admissionNumber: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (loginType === 'admin') {
      if (!formData.username || !formData.password) {
        toast.error('Please fill in all fields');
        return;
      }
    } else {
      if (!formData.name || !formData.admissionNumber) {
        toast.error('Please fill in all fields');
        return;
      }
    }

    const credentials = loginType === 'admin' 
      ? { username: formData.username, password: formData.password, role: 'admin' }
      : { name: formData.name, admissionNumber: formData.admissionNumber, role: 'student' };

    const result = await login(credentials);
    if (!result.success) {
      // Error is already handled in AuthContext
    }
  };

  const switchLoginType = (type) => {
    setLoginType(type);
    setFormData({
      username: '',
      password: '',
      name: '',
      admissionNumber: ''
    });
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-shapes">
          <motion.div 
            className="login-shape login-shape-1"
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.div 
            className="login-shape login-shape-2"
            animate={{ 
              rotate: [360, 0],
              y: [0, -20, 0]
            }}
            transition={{ 
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="login-shape login-shape-3"
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 10, 0]
            }}
            transition={{ 
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </div>

      <div className="login-container">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="login-header">
            <motion.div
              className="login-logo"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            >
              <span>🍽️</span>
            </motion.div>
            <h1 className="login-title">Welcome to HMS</h1>
            <p className="login-subtitle">Sign in to your mess management account</p>
          </div>

          {/* Login Type Selector */}
          <div className="login-type-selector">
            <motion.button
              className={`type-btn ${loginType === 'student' ? 'active' : ''}`}
              onClick={() => switchLoginType('student')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiUserCheck />
              <span>Student</span>
            </motion.button>
            <motion.button
              className={`type-btn ${loginType === 'admin' ? 'active' : ''}`}
              onClick={() => switchLoginType('admin')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiShield />
              <span>Admin</span>
            </motion.button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {loginType === 'admin' ? (
              <>
                <motion.div
                  className="form-group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <label className="form-label">Username</label>
                  <div className="input-wrapper">
                    <FiUser className="input-icon" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter admin username"
                      required
                    />
                  </div>
                </motion.div>

                <motion.div
                  className="form-group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <label className="form-label">Password</label>
                  <div className="input-wrapper">
                    <FiLock className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter admin password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div
                  className="form-group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <label className="form-label">Full Name</label>
                  <div className="input-wrapper">
                    <FiUser className="input-icon" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </motion.div>

                <motion.div
                  className="form-group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <label className="form-label">Admission Number</label>
                  <div className="input-wrapper">
                    <FiLock className="input-icon" />
                    <input
                      type="text"
                      name="admissionNumber"
                      value={formData.admissionNumber}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Enter admission number"
                      required
                    />
                  </div>
                </motion.div>
              </>
            )}

            <motion.button
              type="submit"
              className="login-btn"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {loading ? (
                <div className="login-spinner">
                  <div className="spinner"></div>
                  <span>Signing in..</span>
                </div>
              ) : (
                <span>Sign In</span>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;