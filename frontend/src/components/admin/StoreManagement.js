import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import './StoreManagement.css';

const AddStoreModal = ({ isOpen, onClose, onStoreAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    owner_id: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const storeData = {
        ...formData,
        owner_id: formData.owner_id ? parseInt(formData.owner_id) : null
      };
      
      console.log('Creating store with data:', storeData);
      const response = await adminAPI.createStore(storeData);
      console.log('Store created successfully:', response);
      
      onStoreAdded();
      onClose();
      setFormData({
        name: '',
        email: '',
        address: '',
        owner_id: ''
      });
    } catch (error) {
      console.error('Failed to create store:', error);
      setError(error.response?.data?.error || error.message || 'Failed to create store');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      address: '',
      owner_id: ''
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
          <h3 className="modal-title">Add New Store</h3>
          <button onClick={handleClose} className="close-button" type="button">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} id="addStoreForm">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="storeName" className="form-label">Store Name</label>
              <input
                type="text"
                id="storeName"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({...prev, name: e.target.value}));
                  setError('');
                }}
                required
                placeholder="Enter store name (20-60 characters)"
                className="form-input"
                minLength="20"
                maxLength="60"
              />
            </div>

            <div className="form-group">
              <label htmlFor="storeEmail" className="form-label">Store Email</label>
              <input
                type="email"
                id="storeEmail"
                value={formData.email}
                onChange={(e) => {
                  setFormData(prev => ({...prev, email: e.target.value}));
                  setError('');
                }}
                required
                placeholder="store@example.com"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="storeAddress" className="form-label">Store Address</label>
              <textarea
                id="storeAddress"
                value={formData.address}
                onChange={(e) => {
                  setFormData(prev => ({...prev, address: e.target.value}));
                  setError('');
                }}
                required
                placeholder="Enter complete store address (max 400 characters)"
                className="form-textarea"
                rows="3"
                maxLength="400"
              />
            </div>

            <div className="form-group">
              <label htmlFor="ownerId" className="form-label">Owner ID (Optional)</label>
              <input
                type="number"
                id="ownerId"
                value={formData.owner_id}
                onChange={(e) => setFormData(prev => ({...prev, owner_id: e.target.value}))}
                placeholder="Leave empty if no owner assigned"
                className="form-input"
                min="1"
              />
              <small className="form-help">
                Enter the user ID of the store owner (optional)
              </small>
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
            form="addStoreForm"
            disabled={loading} 
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Creating...
              </>
            ) : (
              'Create Store'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const StoreManagement = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    address: '',
    sort: 'name:asc'
  });
  const [showAddModal, setShowAddModal] = useState(false);

  // Debug state changes
  useEffect(() => {
    console.log('Stores state changed:', {
      stores,
      type: typeof stores,
      isArray: Array.isArray(stores),
      length: stores?.length
    });
  }, [stores]);

  useEffect(() => {
    fetchStores();
  }, [filters]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Fetching stores with filters:', filters);
      const response = await adminAPI.getStores(filters);
      
      // Comprehensive debugging
      console.log('Full Stores API Response:', response);
      console.log('Response.data:', response.data);
      console.log('Type of response.data:', typeof response.data);
      console.log('Is Array?', Array.isArray(response.data));
      console.log('Length:', response.data?.length);

      // Handle different response structures
      let storeData = [];
      
      if (Array.isArray(response.data)) {
        storeData = response.data;
      } else if (response.data && Array.isArray(response.data.stores)) {
        console.log('Found stores in response.data.stores');
        storeData = response.data.stores;
      } else if (response.data && Array.isArray(response.data.data)) {
        console.log('Found stores in response.data.data');
        storeData = response.data.data;
      } else if (response && Array.isArray(response)) {
        console.log('Response itself is array');
        storeData = response;
      } else {
        console.warn('⚠️ Unexpected stores API response structure:', response.data);
        storeData = [];
      }

      console.log('Final store data to set:', storeData);
      setStores(storeData);
      
    } catch (error) {
      console.error('Failed to fetch stores:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      
      setError(error.response?.data?.error || error.message || 'Failed to fetch stores');
      setStores([]); // Always fallback to empty array
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    console.log(`Filter changed: ${key} = ${value}`);
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    console.log('Clearing all filters');
    setFilters({
      name: '',
      email: '',
      address: '',
      sort: 'name:asc'
    });
  };

  // Debug component render
  console.log('StoreManagement render:', {
    loading,
    storesCount: stores?.length,
    error,
    storesType: typeof stores,
    isStoresArray: Array.isArray(stores)
  });

  // Handle loading state
  if (loading && stores.length === 0) {
    return (
      <div className="store-management">
        <div className="management-header">
          <div className="header-content">
            <h2 className="page-title">Store Management</h2>
            <p className="page-subtitle">Loading stores...</p>
          </div>
        </div>
        <div className="table-section">
          <div className="table-loading" style={{ padding: '2rem', textAlign: 'center' }}>
            <span className="loading-spinner"></span>
            <p>Loading stores...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error && stores.length === 0) {
    return (
      <div className="store-management">
        <div className="management-header">
          <div className="header-content">
            <h2 className="page-title">Store Management</h2>
            <p className="page-subtitle">Error loading stores</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary btn-add"
          >
            <span className="btn-icon">+</span>
            Add New Store
          </button>
        </div>
        
        <div className="error-section" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="error-message" style={{ display: 'block', margin: '1rem auto', maxWidth: '500px' }}>
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
            <button onClick={fetchStores} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Retry Loading Stores
            </button>
          </div>
        </div>
        
        <AddStoreModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onStoreAdded={fetchStores}
        />
      </div>
    );
  }

  return (
    <div className="store-management">
      <div className="management-header">
        <div className="header-content">
          <h2 className="page-title">Store Management</h2>
          <p className="page-subtitle">Manage all stores in the system</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary btn-add"
        >
          <span className="btn-icon">+</span>
          Add New Store
        </button>
      </div>

      {/* Error Banner */}
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

      {/* Filters */}
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
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="form-select"
          >
            <option value="name:asc">Name (A-Z)</option>
            <option value="name:desc">Name (Z-A)</option>
            <option value="email:asc">Email (A-Z)</option>
            <option value="email:desc">Email (Z-A)</option>
            <option value="rating:desc">Rating (High-Low)</option>
            <option value="rating:asc">Rating (Low-High)</option>
          </select>
        </div>
      </div>

      {/* Stores Table - 4 Columns Only */}
      <div className="table-section">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Address</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="loading-row">
                    <div className="table-loading">
                      <span className="loading-spinner"></span>
                      Loading stores...
                    </div>
                  </td>
                </tr>
              ) : !Array.isArray(stores) ? (
                <tr>
                  <td colSpan="4" className="no-data">
                    <div className="empty-state">
                      <span className="empty-icon">⚠️</span>
                      <p>Invalid data format received</p>
                      <p>Expected array, got: {typeof stores}</p>
                      <button onClick={fetchStores} className="btn btn-primary btn-sm">
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : stores.length === 0 ? (
                <tr>
                  <td colSpan="4" className="no-data">
                    <div className="empty-state">
                      <span className="empty-icon">🏪</span>
                      <p>No stores found</p>
                      <p>Be the first to add a store to the system</p>
                      <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
                        Add First Store
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                stores.map((store, index) => {
                  if (!store || typeof store !== 'object') {
                    console.warn('⚠️ Invalid store object at index', index, ':', store);
                    return null;
                  }
                  
                  return (
                    <tr key={store.id || index}>
                      <td className="name-cell">
                        <div className="store-info">
                          <span className="store-name">{store.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td>{store.email || 'N/A'}</td>
                      <td className="address-cell">
                        <span className="address-text" title={store.address}>
                          {store.address || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="rating-display">
                          <span className="rating-value">
                            {store.rating || store.average_rating ? 
                              parseFloat(store.rating || store.average_rating).toFixed(1) : 'N/A'}
                          </span>
                          {(store.rating || store.average_rating) && (
                            <span className="rating-stars">
                              {'⭐'.repeat(Math.round(store.rating || store.average_rating))}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Store Modal */}
      <AddStoreModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onStoreAdded={fetchStores}
      />
    </div>
  );
};

export default StoreManagement;
