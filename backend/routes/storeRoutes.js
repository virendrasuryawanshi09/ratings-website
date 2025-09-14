const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /stores - Public endpoint with user ratings included
router.get('/stores', async (req, res) => {
  console.log('📍 GET /stores called'); // Debug log
  
  try {
    const { search } = req.query;
    const user_id = 1; // Default user for public access
    
    console.log('🔍 Search query:', search); // Debug log
    console.log('👤 User ID:', user_id); // Debug log
    
    let query = `
      SELECT 
        s.*,
        r.rating as user_rating,
        COALESCE(s.overall_rating, 0) as overall_rating
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id AND r.user_id = ?
    `;
    let params = [user_id];
    
    // Add search functionality
    if (search && search.trim()) {
      query += ' WHERE (s.name LIKE ? OR s.address LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ' ORDER BY s.id';
    
    
    const [stores] = await pool.execute(query, params);
    
    // Convert user_rating from null to undefined for frontend
    const processedStores = stores.map(store => ({
      ...store,
      user_rating: store.user_rating || undefined,
      overall_rating: parseFloat(store.overall_rating) || 0
    }));
    
    
    res.json({
      data: processedStores,
      success: true,
      count: processedStores.length
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch stores: ' + error.message,
      success: false,
      details: error.code || 'Unknown error'
    });
  }
});

module.exports = router;
