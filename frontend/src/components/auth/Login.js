import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const successMessage = location.state?.message;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: '' }));
    }
    // Hide popup when user starts typing
    if (showErrorPopup) {
      setShowErrorPopup(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showErrorWithPopup = (message) => {
    setErrorMessage(message);
    setShowErrorPopup(true);
    setTimeout(() => {
      setShowErrorPopup(false);
    }, 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});
    
    try {
      console.log('Attempting login with:', { email: formData.email, hasPassword: !!formData.password });
      
      const result = await login(formData);
      
      if (result.success) {
        console.log('Login successful, redirecting...');
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        console.log('Login failed:', result.error);
        showErrorWithPopup(result.error || 'Login failed. Please check your credentials.');
        setErrors({ submit: result.error || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Invalid email or password';
      
      if (error.response) {
        errorMessage = error.response.data?.message || 
                      error.response.data?.error || 
                      `Server Error: ${error.response.status}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showErrorWithPopup(errorMessage);
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Error Popup */}
      {showErrorPopup && (
        <div className="error-popup-overlay">
          <div className="error-popup">
            <div className="error-popup-header">
              <span className="error-icon">⚠️</span>
              <h3>Login Failed</h3>
            </div>
            <div className="error-popup-body">
              <p>{errorMessage}</p>
            </div>
            <div className="error-popup-footer">
              <button 
                onClick={() => setShowErrorPopup(false)}
                className="btn btn-primary btn-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your account</p>
        </div>

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {errors.submit && !showErrorPopup && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {errors.submit}
            </div>
          )}

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
              autoComplete="email"
            />
            {errors.email && (
              <span className="error-text">{errors.email}</span>
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
              placeholder="Enter your password"
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="loading-spinner-small"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
