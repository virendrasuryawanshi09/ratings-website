import React, { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';
import './StoreList.css';

const StarRating = ({ rating, onRate, readonly = false }) => {
  const [hoveredStar, setHoveredStar] = useState(0);

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star ${
            star <= (hoveredStar || rating) ? 'filled' : ''
          } ${readonly ? 'readonly' : ''}`}
          onMouseEnter={() => !readonly && setHoveredStar(star)}
          onMouseLeave={() => !readonly && setHoveredStar(0)}
          onClick={() => !readonly && onRate(star)}
          disabled={readonly}
        >
          ★
        </button>
      ))}
    </div>
  );
};

const StoreList = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStores();
  }, []);

 const fetchStores = async () => {
  try {
    setLoading(true);
    console.log('Fetching stores...');
    
    // Use direct fetch to your backend API endpoint
    const url = searchTerm 
      ? `http://localhost:5000/api/stores?search=${encodeURIComponent(searchTerm)}`
      : 'http://localhost:5000/api/stores';
    
    const response = await fetch(url);
    console.log(' Raw Response Status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Extract the nested data array
    const storesArray = data.data || [];
    setStores(Array.isArray(storesArray) ? storesArray : []);
    
  } catch (error) {
    console.error('Failed to fetch stores:', error);
    setStores([]);
  } finally {
    setLoading(false);
  }
};


  const handleSearch = () => {
    fetchStores();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const openRatingModal = (store) => {
    setSelectedStore(store);
    setSelectedRating(store.user_rating || 0);
    setShowRatingModal(true);
  };

  const closeRatingModal = () => {
    setShowRatingModal(false);
    setSelectedStore(null);
    setSelectedRating(0);
  };

  const handleSubmitRating = async () => {
    if (selectedRating === 0) {
      setMessage('Please select a rating');
      return;
    }

    try {
      setIsSubmitting(true);
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

      setMessage('Rating submitted successfully!');
      closeRatingModal();
      
      // Refresh stores to get updated overall rating
      setTimeout(() => {
        fetchStores();
        setMessage('');
      }, 1500);

    } catch (error) {
      console.error('Rating submission error:', error);
      setMessage('Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStores = stores.filter(store =>
  (store.name && store.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
  (store.address && store.address.toLowerCase().includes(searchTerm.toLowerCase()))
);


  return (
    <div className="store-list">
      {/* Message */}
      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Simple Search */}
      <div className="search-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search stores by name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="search-input"
          />
          <button onClick={handleSearch} className="search-button">
            🔍 Search
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="loading">Loading stores...</div>
      ) : (
        /* Clean Store Grid */
        <div className="stores-grid">
          {filteredStores.length === 0 ? (
            <div className="no-stores">
              <h3>No stores found</h3>
              <p>Try a different search term or browse all stores.</p>
            </div>
          ) : (
            filteredStores.map((store) => (
              <div key={store.id} className="store-card">
                <div className="store-header">
                  <h3 className="store-name">{store.name}</h3>
                  <div className="overall-rating">
                    <StarRating rating={Math.round(store.overall_rating || 0)} readonly />
                    <span className="rating-text">
                      ({parseFloat(store.overall_rating || 0).toFixed(1)})
                    </span>
                  </div>
                </div>
                
                <div className="store-info">
                  <p className="store-address">📍 {store.address}</p>
                  <p className="store-email">📧 {store.email}</p>
                </div>

                <div className="rating-section">
                  <div className="user-rating">
                    <span className="rating-label">Your Rating:</span>
                    {store.user_rating ? (
                      <div className="current-rating">
                        <StarRating rating={store.user_rating} readonly />
                        <button
                          onClick={() => openRatingModal(store)}
                          className="btn btn-sm btn-outline"
                        >
                          Update Rating
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openRatingModal(store)}
                        className="btn btn-sm btn-primary"
                      >
                        Rate Store
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rating Modal with Submit Button */}
      {showRatingModal && selectedStore && (
        <div className="modal-overlay" onClick={closeRatingModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Rate {selectedStore.name}</h3>
              <button onClick={closeRatingModal} className="close-button">×</button>
            </div>

            <div className="modal-body">
              <div className="store-info">
                <p><strong>Address:</strong> {selectedStore.address}</p>
                <p><strong>Current Rating:</strong> {parseFloat(selectedStore.overall_rating || 0).toFixed(1)} ⭐</p>
              </div>

              <div className="rating-section">
                <label>Your Rating:</label>
                <StarRating 
                  rating={selectedRating} 
                  onRate={setSelectedRating} 
                />
                {selectedRating > 0 && (
                  <p className="rating-feedback">
                    You selected: {selectedRating} star{selectedRating !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={closeRatingModal} 
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleSubmitRating}
                  className="btn btn-primary"
                  disabled={selectedRating === 0 || isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreList;
