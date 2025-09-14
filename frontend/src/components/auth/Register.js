import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Hide error popup when user starts typing
    if (showErrorPopup) {
      setShowErrorPopup(false);
      setErrorMessage('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 20 || formData.name.trim().length > 60) {
      newErrors.name = 'Name must be 20-60 characters long';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length > 400) {
      newErrors.address = 'Address cannot exceed 400 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,./<>?])(?=.{8,16}$)/.test(formData.password)) {
      newErrors.password = 'Password must be 8-16 characters with at least one uppercase letter and one special character';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setShowErrorPopup(false);
    
    try {
      await authAPI.register(formData);
      navigate('/login', { 
        state: { message: 'Account created successfully! Please sign in.' }
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMsg = 'Registration failed. Please try again.';
      
      if (error.response) {
        errorMsg = error.response.data?.message || 
                  error.response.data?.error || 
                  `Error: ${error.response.status}`;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      setShowErrorPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeErrorPopup = () => {
    setShowErrorPopup(false);
    setErrorMessage('');
  };

  return (
    <div className="auth-container">
      {/* Error Popup Modal */}
      {showErrorPopup && (
        <div className="error-popup-overlay" onClick={closeErrorPopup}>
          <div className="error-popup" onClick={(e) => e.stopPropagation()}>
            <div className="error-popup-header">
              <h3>Registration Failed</h3>
              <button onClick={closeErrorPopup} className="popup-close-btn">×</button>
            </div>
            <div className="error-popup-body">
              <div className="error-icon">⚠️</div>
              <p>{errorMessage}</p>
            </div>
            <div className="error-popup-footer">
              <button onClick={closeErrorPopup} className="btn btn-primary">
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="auth-card">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join our platform today</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="Enter your full name (20-60 characters)"
              disabled={isSubmitting}
            />
            {errors.name && (
              <span className="error-text">{errors.name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="Enter your email"
              disabled={isSubmitting}
            />
            {errors.email && (
              <span className="error-text">{errors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={`form-input form-textarea ${errors.address ? 'error' : ''}`}
              placeholder="Enter your address (max 400 characters)"
              rows="3"
              disabled={isSubmitting}
            />
            {errors.address && (
              <span className="error-text">{errors.address}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Create a strong password"
              disabled={isSubmitting}
            />
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
            <small className="form-hint">
              8-16 characters with uppercase letter and special character
            </small>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
