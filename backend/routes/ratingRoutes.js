const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/ratings - Return all ratings
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT rating FROM ratings');
    
    let averageRating = 0;
    if (rows.length > 0) {
      const totalPoints = rows.reduce((sum, row) => sum + row.rating, 0);
      averageRating = parseFloat((totalPoints / rows.length).toFixed(1));
    }
    
    res.json({ 
      data: rows,
      averageRating: averageRating,
      count: rows.length,
      success: true 
    });
  } catch (error) {
    console.error('GET Rating API Error:', error);
    res.status(500).json({ error: 'Failed to fetch ratings', success: false });
  }
});

// POST /api/ratings - Submit or Update rating (Public endpoint with hardcoded user)
router.post('/', async (req, res) => {
  console.log('POST /api/ratings called with body:', req.body);
  
  try {
    const { store_id, rating } = req.body;
    
    // Validate input
    if (!store_id || !rating) {
      console.log('Missing store_id or rating:', { store_id, rating });
      return res.status(400).json({
        error: 'Store ID and rating are required',
        success: false
      });
    }
    
    if (rating < 1 || rating > 5) {
      console.log('Invalid rating value:', rating);
      return res.status(400).json({
        error: 'Rating must be between 1 and 5',
        success: false
      });
    }
    
    // For public endpoint, use user_id = 1 (this should be updated to use auth in production)
    const user_id = 1;
    console.log('Processing rating:', { user_id, store_id, rating });
    
    // Check if user already rated this store
    const [existingRating] = await pool.execute(
      'SELECT id, rating as old_rating FROM ratings WHERE user_id = ? AND store_id = ?',
      [user_id, store_id]
    );
    
    let isUpdate = false;
    if (existingRating.length > 0) {
      console.log('Updating existing rating from', existingRating[0].old_rating, 'to', rating);
      isUpdate = true;
      // Update existing rating
      await pool.execute(
        'UPDATE ratings SET rating = ?, updated_at = NOW() WHERE user_id = ? AND store_id = ?',
        [rating, user_id, store_id]
      );
    } else {
      console.log('Inserting new rating');
      // Insert new rating
      await pool.execute(
        'INSERT INTO ratings (user_id, store_id, rating, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [user_id, store_id, rating]
      );
    }
    
    // Calculate new average rating for this store
    const [storeRatings] = await pool.execute(
      'SELECT rating FROM ratings WHERE store_id = ?',
      [store_id]
    );
    
    let averageRating = 0;
    if (storeRatings.length > 0) {
      const totalPoints = storeRatings.reduce((sum, row) => sum + row.rating, 0);
      averageRating = parseFloat((totalPoints / storeRatings.length).toFixed(1));
    }
    
    // Update store's overall rating
    try {
      await pool.execute(
        'UPDATE stores SET overall_rating = ? WHERE id = ?',
        [averageRating, store_id]
      );
      console.log('Updated store overall rating to:', averageRating);
    } catch (storeUpdateError) {
      console.log('Could not update store overall_rating:', storeUpdateError.message);
      // Continue anyway - this is not critical
    }
    
    console.log('Rating', isUpdate ? 'updated' : 'submitted', 'successfully');
    res.json({
      message: isUpdate ? 'Rating updated successfully' : 'Rating submitted successfully',
      success: true,
      data: {
        user_id,
        store_id,
        rating,
        overall_rating: averageRating,
        is_update: isUpdate
      }
    });
    
  } catch (error) {
    console.error('Error submitting/updating rating:', error);
    res.status(500).json({
      error: 'Failed to submit rating: ' + error.message,
      success: false
    });
  }
});

// GET /api/ratings/store/:storeId - Get all ratings for a specific store
router.get('/store/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const [ratings] = await pool.execute(`
      SELECT 
        r.rating, 
        r.created_at, 
        r.updated_at,
        u.name as user_name 
      FROM ratings r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.store_id = ? 
      ORDER BY r.updated_at DESC
    `, [storeId]);
    
    // Calculate average
    let averageRating = 0;
    if (ratings.length > 0) {
      const totalPoints = ratings.reduce((sum, row) => sum + row.rating, 0);
      averageRating = parseFloat((totalPoints / ratings.length).toFixed(1));
    }
    
    res.json({
      data: ratings,
      averageRating,
      count: ratings.length,
      success: true
    });
    
  } catch (error) {
    console.error('Error fetching store ratings:', error);
    res.status(500).json({
      error: 'Failed to fetch store ratings',
      success: false
    });
  }
});

// GET /api/ratings/user/:userId - Get all ratings by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [ratings] = await pool.execute(`
      SELECT 
        r.rating,
        r.created_at,
        r.updated_at,
        s.name as store_name,
        s.address as store_address
      FROM ratings r
      JOIN stores s ON r.store_id = s.id
      WHERE r.user_id = ?
      ORDER BY r.updated_at DESC
    `, [userId]);
    
    res.json({
      data: ratings,
      count: ratings.length,
      success: true
    });
    
  } catch (error) {
    console.error('Error fetching user ratings:', error);
    res.status(500).json({
      error: 'Failed to fetch user ratings',
      success: false
    });
  }
});

module.exports = router;
