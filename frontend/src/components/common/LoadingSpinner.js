import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  message = 'Loading...', 
  size = 'medium',
  fullScreen = false 
}) => {
  const containerClass = fullScreen ? 'loading-fullscreen' : 'loading-container';
  const spinnerClass = `loading-spinner loading-spinner-${size}`;

  return (
    <div className={containerClass}>
      <div className={spinnerClass}></div>
      <p className="loading-message">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
