import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import NotFoundPage from './pages/NotFoundPage';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// Styles
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (loading || isInitialLoad) {
    return <LoadingSpinner />;
  }

  return (
    <div className="App">
      <AnimatePresence mode="wait">
        <Router>
          {user && <Navbar />}
          
          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="main-content"
          >
            <Routes>
              <Route 
                path="/" 
                element={
                  user ? (
                    user.role === 'admin' ? (
                      <Navigate to="/admin/dashboard" replace />
                    ) : (
                      <Navigate to="/student/dashboard" replace />
                    )
                  ) : (
                    <LandingPage />
                  )
                } 
              />
              
              <Route 
                path="/login" 
                element={
                  user ? (
                    user.role === 'admin' ? (
                      <Navigate to="/admin/dashboard" replace />
                    ) : (
                      <Navigate to="/student/dashboard" replace />
                    )
                  ) : (
                    <LoginPage />
                  )
                } 
              />
              
              <Route 
                path="/admin/dashboard" 
                element={
                  user && user.role === 'admin' ? (
                    <AdminDashboard />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              
              <Route 
                path="/student/dashboard" 
                element={
                  user && user.role === 'student' ? (
                    <StudentDashboard />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } 
              />
              
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </motion.main>
          
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#374151',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Router>
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;