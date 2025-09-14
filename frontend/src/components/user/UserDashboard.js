import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, authAPI } from '../../services/api';
import './UserDashboard.css';

const StarRating = ({ rating, onRate, readonly = false, size = 'medium' }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className={`star-rating ${size} ${readonly ? 'readonly' : 'interactive'}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`star ${star <= (hovered || rating) ? 'filled' : 'empty'}`}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => !readonly && onRate(star)}
          disabled={readonly}
          title={readonly ? `${rating} stars` : `Rate ${star} star${star !== 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

const UserDashboard = () => {
  const { user, logout } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState('stores');

  // Password update state
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Store management state
  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingStores, setLoadingStores] = useState(true);

  // Rating state
  const [ratingModal, setRatingModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Message state
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // User ratings state
  const [userRatings, setUserRatings] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(false);

  // Fetch stores on component mount
  useEffect(() => {
    fetchStores();
  }, []);

  // Filter stores when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStores(stores);
    } else {
      const filtered = stores.filter(store => {
        return (
          (store.name && store.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (store.address && store.address.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      });
      setFilteredStores(filtered);
    }
  }, [searchTerm, stores]);

  // Fetch user ratings when switching to ratings tab
  useEffect(() => {
    if (activeTab === 'ratings') {
      fetchUserRatings();
    }
  }, [activeTab]);

  // Fetch stores from API
  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const response = await userAPI.getStores({ search: searchTerm.trim() });
      setStores(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
      setStores([]);
      showMessage('Failed to load stores. Please try again.', 'error');
    } finally {
      setLoadingStores(false);
    }
  };

  // Fetch user ratings
  const fetchUserRatings = async () => {
    setLoadingRatings(true);
    try {
      const response = await userAPI.getUserRatings();
      setUserRatings(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch user ratings:', error);
      setUserRatings([]);
      showMessage('Failed to load your ratings. Please try again.', 'error');
    } finally {
      setLoadingRatings(false);
    }
  };

  // Show message helper
  const showMessage = (msg, type = 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  // Handle password update
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
        setPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (error) {
      setPasswordError(error.response?.data?.error || 'Failed to update password');
    }
  };

  // Open rating modal
  const openRatingModal = (store) => {
    setSelectedStore(store);
    setSelectedRating(store.user_rating || 0);
    setRatingModal(true);
  };

  // Close rating modal
  const closeRatingModal = () => {
    setSelectedStore(null);
    setSelectedRating(0);
    setRatingModal(false);
  };

  // Submit rating
  const submitRating = async () => {
    if (!selectedStore || selectedRating < 1 || selectedRating > 5) {
      showMessage('Please select a rating between 1 and 5', 'error');
      return;
    }

    setSubmittingRating(true);
    try {
      await userAPI.submitRating({
        store_id: selectedStore.id,
        rating: selectedRating
      });

      // Update the store in the list
      setStores(prev => prev.map(store => 
        store.id === selectedStore.id 
          ? { ...store, user_rating: selectedRating }
          : store
      ));

      showMessage('Rating submitted successfully!', 'success');
      closeRatingModal();
      
      // Refresh stores to get updated overall rating
      setTimeout(() => {
        fetchStores();
      }, 1000);

    } catch (error) {
      console.error('Rating submission error:', error);
      showMessage('Failed to submit rating: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchStores();
  };

  // Delete rating
  const deleteRating = async (storeId) => {
    if (!window.confirm('Are you sure you want to delete this rating?')) {
      return;
    }

    try {
      await userAPI.deleteRating(storeId);
      
      // Update stores list
      setStores(prev => prev.map(store => 
        store.id === storeId 
          ? { ...store, user_rating: undefined }
          : store
      ));
      
      // Refresh ratings list
      if (activeTab === 'ratings') {
        fetchUserRatings();
      }
      
      showMessage('Rating deleted successfully!', 'success');
    } catch (error) {
      console.error('Delete rating error:', error);
      showMessage('Failed to delete rating', 'error');
    }
  };

  return (
    <div className="user-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Welcome, {user?.name}!</h1>
            <p>Discover and rate amazing stores</p>
          </div>
          <div className="header-actions">
            <button 
              onClick={() => setPasswordModal(true)}
              className="btn btn-outline"
            >
              Update Password
            </button>
          </div>
        </div>
      </header>

      {/* Global Message */}
      {message && (
        <div className={`message-banner ${messageType}`}>
          <span>{message}</span>
          <button 
            className="message-close"
            onClick={() => setMessage('')}
          >
            ×
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <nav className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'stores' ? 'active' : ''}`}
          onClick={() => setActiveTab('stores')}
        >
          Browse Stores
        </button>
        <button
          className={`tab-button ${activeTab === 'ratings' ? 'active' : ''}`}
          onClick={() => setActiveTab('ratings')}
        >
          My Ratings
        </button>
      </nav>

      {/* Main Content */}
      <main className="dashboard-content">
        {activeTab === 'stores' && (
          <div className="stores-section">
            {/* Search Form */}
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-group">
                <input
                  type="text"
                  placeholder="Search stores by name or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="search-button">
                  Search
                </button>
              </div>
            </form>

            {/* Store Results */}
            <div className="stores-container">
              {loadingStores ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading amazing stores...</p>
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏪</div>
                  <h3>No stores found</h3>
                  <p>
                    {searchTerm 
                      ? 'Try adjusting your search terms or browse all stores.' 
                      : 'No stores available at the moment.'
                    }
                  </p>
                  {searchTerm && (
                    <button 
                      onClick={() => {setSearchTerm(''); fetchStores();}}
                      className="btn btn-outline"
                    >
                      Show All Stores
                    </button>
                  )}
                </div>
              ) : (
                <div className="stores-grid">
                  {filteredStores.map((store) => (
                    <div key={store.id} className="store-card">
                      <div className="store-header">
                        <h3 className="store-name">{store.name}</h3>
                        <div className="overall-rating">
                          <StarRating 
                            rating={Math.round(store.overall_rating || 0)} 
                            readonly 
                            size="small"
                          />
                          <span className="rating-value">
                            ({parseFloat(store.overall_rating || 0).toFixed(1)})
                          </span>
                        </div>
                      </div>
                      
                      <div className="store-details">
                        <div className="store-info">
                          <div className="info-item">
                            <span className="info-icon">📍</span>
                            <span className="info-text">{store.address}</span>
                          </div>
                        </div>

                        <div className="user-rating-section">
                          <div className="rating-header">
                            <span className="rating-label">Your Rating:</span>
                            {store.user_rating ? (
                              <span className="current-rating-badge">
                                {store.user_rating} ⭐
                              </span>
                            ) : (
                              <span className="no-rating-badge">Not rated</span>
                            )}
                          </div>
                          
                          <div className="rating-actions">
                            {store.user_rating ? (
                              <div className="rating-display">
                                <StarRating rating={store.user_rating} readonly size="small" />
                                <button
                                  onClick={() => openRatingModal(store)}
                                  className="btn btn-outline btn-sm"
                                >
                                  Update Rating
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => openRatingModal(store)}
                                className="btn btn-primary btn-sm"
                              >
                                Rate This Store
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ratings' && (
          <div className="ratings-section">
            <div className="section-header">
              <h2>My Ratings</h2>
              <p>View and manage your store ratings</p>
            </div>

            {loadingRatings ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading your ratings...</p>
              </div>
            ) : userRatings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⭐</div>
                <h3>No ratings yet</h3>
                <p>Start rating stores to see them here!</p>
                <button 
                  onClick={() => setActiveTab('stores')}
                  className="btn btn-primary"
                >
                  Browse Stores
                </button>
              </div>
            ) : (
              <div className="ratings-grid">
                {userRatings.map((rating) => (
                  <div key={rating.id} className="rating-card">
                    <div className="rating-header">
                      <h3 className="store-name">{rating.store_name}</h3>
                      <div className="rating-value">
                        <StarRating rating={rating.rating} readonly size="small" />
                        <span>{rating.rating}/5</span>
                      </div>
                    </div>
                    
                    <div className="rating-details">
                      <p className="store-address">📍 {rating.store_address}</p>
                      <p className="rating-date">
                        Rated on {new Date(rating.created_at).toLocaleDateString()}
                        {rating.updated_at !== rating.created_at && 
                          ` (Updated: ${new Date(rating.updated_at).toLocaleDateString()})`
                        }
                      </p>
                    </div>
                    
                    <div className="rating-actions">
                      <button
                        onClick={() => openRatingModal({
                          id: rating.store_id,
                          name: rating.store_name,
                          address: rating.store_address,
                          user_rating: rating.rating,
                          overall_rating: rating.store_overall_rating
                        })}
                        className="btn btn-outline btn-sm"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => deleteRating(rating.store_id)}
                        className="btn btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Password Update Modal */}
      {passwordModal && (
        <div className="modal-overlay" onClick={() => setPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Password</h3>
              <button 
                onClick={() => setPasswordModal(false)}
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
                    setPasswordData(prev => ({...prev, currentPassword: e.target.value}));
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
                    setPasswordData(prev => ({...prev, newPassword: e.target.value}));
                    setPasswordError('');
                  }}
                  required
                  className="form-input"
                  placeholder="8-16 chars, uppercase & special character"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => {
                    setPasswordData(prev => ({...prev, confirmPassword: e.target.value}));
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
                  onClick={() => setPasswordModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && selectedStore && (
        <div className="modal-overlay" onClick={closeRatingModal}>
          <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Rate {selectedStore.name}</h3>
              <button onClick={closeRatingModal} className="close-button">
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="store-preview">
                <h4>{selectedStore.name}</h4>
                <p className="store-address">{selectedStore.address}</p>
                <div className="current-rating">
                  <span>Overall Rating: </span>
                  <StarRating 
                    rating={Math.round(selectedStore.overall_rating || 0)} 
                    readonly 
                    size="small"
                  />
                  <span>({parseFloat(selectedStore.overall_rating || 0).toFixed(1)})</span>
                </div>
              </div>

              <div className="rating-input-section">
                <label className="rating-label">Your Rating:</label>
                <div className="rating-stars-container">
                  <StarRating 
                    rating={selectedRating} 
                    onRate={setSelectedRating}
                    size="large"
                  />
                </div>
                {selectedRating > 0 && (
                  <div className="rating-feedback">
                    <span className="rating-text">
                      {selectedRating} star{selectedRating !== 1 ? 's' : ''} - 
                      {selectedRating === 1 && ' Poor'}
                      {selectedRating === 2 && ' Fair'}
                      {selectedRating === 3 && ' Good'}
                      {selectedRating === 4 && ' Very Good'}
                      {selectedRating === 5 && ' Excellent'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                onClick={closeRatingModal} 
                className="btn btn-secondary"
                disabled={submittingRating}
              >
                Cancel
              </button>
              <button 
                onClick={submitRating}
                className="btn btn-primary"
                disabled={selectedRating === 0 || submittingRating}
              >
                {submittingRating ? (
                  <>
                    <span className="spinner"></span>
                    Submitting...
                  </>
                ) : (
                  selectedStore.user_rating ? 'Update Rating' : 'Submit Rating'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
