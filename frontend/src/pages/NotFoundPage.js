import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './NotFoundPage.css';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <motion.div
        className="not-found-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="not-found-code">404</div>
        <h2 className="not-found-title">Page Not Found</h2>
        <p className="not-found-description">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <button
          className="btn btn-primary btn-lg"
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>

      </motion.div>
    </div>
  );
};

export default NotFoundPage;