import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import UserManagement from './UserManagement';
import StoreManagement from './StoreManagement';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    totalStores: 0,
    totalRatings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      let totalUsers = 0;
      let totalStores = 0;
      let ratingCount = 0;

      // Fetch users
      try {
        const usersResponse = await adminAPI.getUsers({});
        const usersArray = usersResponse.data?.data || [];
        totalUsers = Array.isArray(usersArray) ? usersArray.length : 0;
      } catch (userError) {
        console.error('Error fetching users:', userError);
        totalUsers = 0;
      }

      // Fetch stores
      try {
        const storesResponse = await adminAPI.getStores({});
        const storesArray = storesResponse.data?.data || [];
        totalStores = Array.isArray(storesArray) ? storesArray.length : 0;
      } catch (storeError) {
        console.error('Error fetching stores:', storeError);
        totalStores = 0;
      }

      // Fetch ratings count from public API
      try {
        const ratingsResponse = await fetch('http://localhost:5000/api/ratings', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!ratingsResponse.ok) {
          throw new Error(`HTTP error! status: ${ratingsResponse.status}`);
        }

        const ratingsData = await ratingsResponse.json();
        if (ratingsData && ratingsData.data && Array.isArray(ratingsData.data)) {
          ratingCount = ratingsData.data.length;
        } else {
          ratingCount = 0;
        }
      } catch (ratingError) {
        console.error('Error fetching ratings:', ratingError);
        ratingCount = 0;
      }

      setDashboardData({
        totalUsers,
        totalStores,
        totalRatings: ratingCount
      });

    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setError('Failed to load dashboard statistics');
      setDashboardData({
        totalUsers: 0,
        totalStores: 0,
        totalRatings: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="loading-spinner-large"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Navigation Tabs */}
      <nav className="admin-nav">
        <div className="admin-nav-container">
          <button
            className={`admin-nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`admin-nav-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
          <button
            className={`admin-nav-tab ${activeTab === 'stores' ? 'active' : ''}`}
            onClick={() => setActiveTab('stores')}
          >
            Store Management
          </button>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="admin-main">
        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            <span className="error-text">{error}</span>
            <button onClick={fetchDashboardData} className="retry-btn">
              Retry
            </button>
          </div>
        )}

        {/* Content Based on Active Tab */}
        <div className="admin-content">
          {activeTab === 'overview' && (
            <div className="overview-section">
              <div className="overview-header">
                <h2>System Overview</h2>
                <p>Monitor your platform's key metrics and performance</p>
              </div>

              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card users-card">
                  <div className="stat-icon">
                    <span>👥</span>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-value">{dashboardData.totalUsers.toLocaleString()}</h3>
                    <p className="stat-label">Total Users</p>
                  </div>
                  <div className="stat-trend positive">↗</div>
                </div>

                <div className="stat-card stores-card">
                  <div className="stat-icon">
                    <span>🏪</span>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-value">{dashboardData.totalStores.toLocaleString()}</h3>
                    <p className="stat-label">Total Stores</p>
                  </div>
                  <div className="stat-trend positive">↗</div>
                </div>

                <div className="stat-card ratings-card">
                  <div className="stat-icon">
                    <span>⭐</span>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-value">{dashboardData.totalRatings}</h3>
                    <p className="stat-label">Total Ratings</p>
                  </div>
                  <div className="stat-trend positive">↗</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h3 className="section-title">Quick Actions</h3>
                <div className="actions-grid">
                  <div className="action-card" onClick={() => setActiveTab('users')}>
                    <div className="action-icon">
                      <span>👤</span>
                    </div>
                    <h4>Add New User</h4>
                    <p>Create user accounts for customers, store owners, and admins</p>
                  </div>

                  <div className="action-card" onClick={() => setActiveTab('stores')}>
                    <div className="action-icon">
                      <span>🏪</span>
                    </div>
                    <h4>Register Store</h4>
                    <p>Add new stores to the platform and assign owners</p>
                  </div>

                  <div className="action-card" onClick={fetchDashboardData}>
                    <div className="action-icon">
                      <span>📊</span>
                    </div>
                    <h4>Refresh Data</h4>
                    <p>Update platform statistics and performance metrics</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'stores' && <StoreManagement />}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
