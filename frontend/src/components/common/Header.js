import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const getRoleDisplayName = (role) => {
    switch(role) {
      case 'admin':
        return 'Administrator';
      case 'store_owner':
        return 'Store Owner';
      case 'user':
        return 'User';
      default:
        return 'User';
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin':
        return '#dc2626'; // Red
      case 'store_owner':
        return '#059669'; // Green
      case 'user':
        return '#2563eb'; // Blue
      default:
        return '#6b7280'; // Gray
    }
  };

  if (!user) return null;

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <div className="logo-section">
            <h1 className="app-title">
              ⭐ RatingsApp
            </h1>
          </div>
        </div>
        
        <div className="header-right">
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span 
                className="user-role"
                style={{ color: getRoleColor(user.role) }}
              >
                {getRoleDisplayName(user.role)}
              </span>
            </div>
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="logout-btn"
            title="Logout"
          >
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
