import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storeOwnerAPI, authAPI } from '../../services/api';
import './StoreOwnerDashboard.css';

const StoreOwnerDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    stores: [],
    raters: []
  });
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await storeOwnerAPI.getDashboard();
      console.log('Store Owner Dashboard API data:', response.data);
      setDashboardData({
        stores: response.data?.data?.stores || [],
        raters: response.data?.data?.raters || []
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setDashboardData({
        stores: [],
        raters: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,./<>?])(?=.{8,16}$)/;
    if (!passwordRegex.test(passwordData.newPassword)) {
      setPasswordError('Password must be 8-16 characters with at least one uppercase letter and one special character');
      return;
    }

    try {
      await authAPI.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordSuccess('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (error) {
      setPasswordError(error.response?.data?.error || 'Failed to update password');
    }
  };

  if (loading) {
    return (
      <div className="store-owner-dashboard">
        <div className="loading-container">
          <div className="loading-spinner-large"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="store-owner-dashboard">
      {/* Clean Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome, {user?.name}!</h1>
          <p>Manage your stores and view customer feedback</p>
        </div>
        <div className="owner-actions">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="btn btn-outline"
          >
            Update Password
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Your Stores */}
        <div className="stores-section">
          <h2>Your Stores</h2>
          {dashboardData.stores?.length === 0 ? (
            <div className="no-stores">
              <h3>No Stores Assigned</h3>
              <p>No stores are currently assigned to your account. Please contact an administrator to assign stores to you.</p>
            </div>
          ) : (
            <div className="stores-grid">
              {dashboardData.stores.map((store) => (
                <div key={store.id} className="store-card owner-store">
                  <div className="store-info">
                    <h3>{store.name}</h3>
                    <p className="store-address">📍 {store.address}</p>
                    <p className="store-email">📧 {store.email}</p>
                    <div className="rating-section">
                      <div className="average-rating">
                        <span className="rating-value">
                          {parseFloat(store.average_rating || 0).toFixed(1)}
                        </span>
                        <div className="rating-stars">
                          {'⭐'.repeat(Math.round(store.average_rating || 0))}
                        </div>
                      </div>
                      <p className="rating-count">
                        {store.rating_count || 0} rating{(store.rating_count || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customers Who Rated */}
        <div className="raters-section">
          <h2>Customers Who Rated Your Stores</h2>
          {dashboardData.raters?.length === 0 ? (
            <div className="no-raters">
              <h3>No Customer Ratings Yet</h3>
              <p>No customers have rated your stores yet. Encourage customers to visit and rate your stores!</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Email</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.raters.map((rater, index) => (
                    <tr key={rater.id || index}>
                      <td>{rater.name}</td>
                      <td>{rater.email}</td>
                      <td className="address-cell">{rater.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Password Update Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="close-button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePasswordUpdate} className="form">
              {passwordError && (
                <div className="error-message">{passwordError}</div>
              )}
              {passwordSuccess && (
                <div className="success-message">{passwordSuccess}</div>
              )}

              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={(e) => {
                    setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }));
                    setPasswordError('');
                  }}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => {
                    setPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
                    setPasswordError('');
                  }}
                  required
                  placeholder="8-16 chars, uppercase & special character"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => {
                    setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                    setPasswordError('');
                  }}
                  required
                  className="form-input"
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreOwnerDashboard;
