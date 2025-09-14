import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import './UserManagement.css';

const AddUserModal = ({ isOpen, onClose, onUserAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    address: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await adminAPI.createUser(formData);
      onUserAdded();
      onClose();
      setFormData({
        name: '',
        email: '',
        password: '',
        address: '',
        role: 'user'
      });
    } catch (error) {
      setError(error.response?.data?.error || error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      address: '',
      role: 'user'
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add New User</h3>
          <button onClick={handleClose} className="close-button" type="button">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} id="addUserForm">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="name" className="form-label">Full Name</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  setError('');
                }}
                required
                placeholder="Enter full name (20-60 characters)"
                className="form-input"
                minLength="20"
                maxLength="60"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, email: e.target.value }));
                  setError('');
                }}
                required
                placeholder="user@example.com"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, password: e.target.value }));
                  setError('');
                }}
                required
                placeholder="8-16 chars, uppercase & special character"
                className="form-input"
                minLength="8"
                maxLength="16"
              />
            </div>

            <div className="form-group">
              <label htmlFor="address" className="form-label">Address</label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, address: e.target.value }));
                  setError('');
                }}
                required
                placeholder="Enter complete address (max 400 characters)"
                className="form-textarea"
                rows="3"
                maxLength="400"
              />
            </div>

            <div className="form-group">
              <label htmlFor="role" className="form-label">Role</label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="form-select"
              >
                <option value="user">User</option>
                <option value="admin">Administrator</option>
                <option value="store_owner">Store Owner</option>
              </select>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="addUserForm"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <span className="loading-spinner-small"></span>
                Creating...
              </>
            ) : (
              'Create User'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const UserDetailsModal = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">User Details</h3>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="user-details">
            <div className="detail-row">
              <span className="detail-label">ID:</span>
              <span className="detail-value">{user.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{user.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{user.email}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Address:</span>
              <span className="detail-value">{user.address}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Role:</span>
              <span className="detail-value">
                <span className={`role-badge role-${user.role}`}>
                  {user.role.replace('_', ' ')}
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Created:</span>
              <span className="detail-value">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>

            {user.role === 'store_owner' && (
              <>
                <div className="detail-row">
                  <span className="detail-label">Stores:</span>
                  <span className="detail-value">{user.store_count || 0}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Avg Rating:</span>
                  <span className="detail-value">
                    {user.average_rating ? parseFloat(user.average_rating).toFixed(1) : 'N/A'}
                  </span>
                </div>
              </>
            )}

            {user.role === 'user' && user.rating_count !== undefined && (
              <div className="detail-row">
                <span className="detail-label">Ratings Given:</span>
                <span className="detail-value">{user.rating_count}</span>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    address: '',
    role: '',
    sort: 'name:asc'
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    console.log('👥 Users state changed:', {
      users,
      type: typeof users,
      isArray: Array.isArray(users),
      length: users?.length
    });
  }, [users]);

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await adminAPI.getUsers(filters);

      let userData = [];
      if (Array.isArray(response.data)) {
        userData = response.data;
      } else if (response.data && Array.isArray(response.data.users)) {
        userData = response.data.users;
      } else if (response.data && Array.isArray(response.data.data)) {
        userData = response.data.data;
      } else if (response && Array.isArray(response)) {
        userData = response;
      } else {
        console.warn('Unexpected API response structure:', response.data);
        userData = [];
      }

      setUsers(userData);
    } catch (error) {
      setError(error.response?.data?.error || error.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const viewUserDetails = async (userId) => {
    try {
      setLoading(true);
      const response = await adminAPI.getUserById(userId);
      setSelectedUser(response.data.data || response.data);
      setShowDetailsModal(true);
    } catch (error) {
      alert('Failed to fetch user details: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      name: '',
      email: '',
      address: '',
      role: '',
      sort: 'name:asc'
    });
  };

  if (loading && users.length === 0) {
    return (
      <div className="user-management">
        <div className="management-header">
          <div className="header-content">
            <h2 className="page-title">User Management</h2>
            <p className="page-subtitle">Loading users...</p>
          </div>
        </div>
        <div className="table-section">
          <div className="table-loading" style={{ padding: '2rem', textAlign: 'center' }}>
            <span className="loading-spinner-small"></span>
            <p>Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="user-management">
        <div className="management-header">
          <div className="header-content">
            <h2 className="page-title">User Management</h2>
            <p className="page-subtitle">Error loading users</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary btn-add"
          >
            <span className="btn-icon">+</span>
            Add New User
          </button>
        </div>

        <div className="error-section" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="error-message" style={{ display: 'block', margin: '1rem auto', maxWidth: '500px' }}>
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
            <button onClick={fetchUsers} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Retry Loading Users
            </button>
          </div>
        </div>

        <AddUserModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onUserAdded={fetchUsers}
        />
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="management-header">
        <div className="header-content">
          <h2 className="page-title">User Management</h2>
          <p className="page-subtitle">Manage all users in the system</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary btn-add"
        >
          <span className="btn-icon">+</span>
          Add New User
        </button>
      </div>

      {error && (
        <div className="error-banner" style={{
          backgroundColor: '#fee',
          color: '#c33',
          padding: '1rem',
          margin: '1rem 0',
          borderRadius: '4px',
          border: '1px solid #fcc'
        }}>
          <span className="error-icon">⚠️</span>
          {error}
          <button
            onClick={() => setError('')}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="filters-section">
        <div className="filters-header">
          <h3>Filters</h3>
          <button onClick={clearFilters} className="btn btn-text">
            Clear All
          </button>
        </div>
        <div className="filters-grid">
          <input
            type="text"
            placeholder="Filter by name..."
            value={filters.name}
            onChange={(e) => handleFilterChange('name', e.target.value)}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Filter by email..."
            value={filters.email}
            onChange={(e) => handleFilterChange('email', e.target.value)}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Filter by address..."
            value={filters.address}
            onChange={(e) => handleFilterChange('address', e.target.value)}
            className="form-input"
          />
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="form-select"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Administrator</option>
            <option value="store_owner">Store Owner</option>
          </select>
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="form-select"
          >
            <option value="name:asc">Name (A-Z)</option>
            <option value="name:desc">Name (Z-A)</option>
            <option value="email:asc">Email (A-Z)</option>
            <option value="email:desc">Email (Z-A)</option>
            <option value="role:asc">Role (A-Z)</option>
            <option value="role:desc">Role (Z-A)</option>
            <option value="created_at:desc">Newest First</option>
            <option value="created_at:asc">Oldest First</option>
          </select>
        </div>
      </div>

      <div className="table-section">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Address</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="loading-row">
                    <div className="table-loading">
                      <span className="loading-spinner-small"></span>
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : !Array.isArray(users) ? (
                <tr>
                  <td colSpan="5" className="no-data">
                    <div className="empty-state">
                      <span className="empty-icon">⚠️</span>
                      <p>Invalid data format received</p>
                      <p>Expected array, got: {typeof users}</p>
                      <button onClick={fetchUsers} className="btn btn-primary btn-sm">
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">
                    <div className="empty-state">
                      <span className="empty-icon">👥</span>
                      <p>No users found</p>
                      <p>Be the first to add a user to the system</p>
                      <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
                        Add First User
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user, index) => {
                  if (!user || typeof user !== 'object') {
                    console.warn('⚠️ Invalid user object at index', index, ':', user);
                    return null;
                  }

                  return (
                    <tr key={user.id || index}>
                      <td className="name-cell">
                        <div className="user-info">
                          <span className="user-name">{user.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td>{user.email || 'N/A'}</td>
                      <td className="address-cell">
                        <span className="address-text" title={user.address}>
                          {user.address || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className={`role-badge role-${user.role || 'unknown'}`}>
                          {user.role ? user.role.replace('_', ' ') : 'Unknown'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => viewUserDetails(user.id)}
                          className="btn btn-outline btn-sm"
                          disabled={loading || !user.id}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onUserAdded={fetchUsers}
      />

      <UserDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />
    </div>
  );
};

export default UserManagement;
