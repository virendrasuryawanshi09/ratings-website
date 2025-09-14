const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication and store owner role
router.use(authenticateToken);
router.use(requireRole(['store_owner']));

// Enhanced Store Owner Dashboard
router.get('/dashboard', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Get comprehensive store statistics
        const [storeStats] = await connection.query(
            `SELECT 
                COUNT(s.id) as total_stores,
                COALESCE(ROUND(AVG(r.rating), 2), 0) as overall_average_rating,
                COUNT(DISTINCT r.user_id) as unique_raters,
                COUNT(r.id) as total_ratings,
                MIN(r.created_at) as first_rating_date,
                MAX(r.created_at) as latest_rating_date
             FROM stores s 
             LEFT JOIN ratings r ON s.id = r.store_id 
             WHERE s.owner_id = ?`,
            [req.user.id]
        );
        
        // Get individual store details with ratings
        const [stores] = await connection.query(
            `SELECT s.id, s.name, s.email, s.address, s.created_at,
             COALESCE(ROUND(AVG(r.rating), 2), 0) as average_rating,
             COUNT(r.id) as rating_count,
             MAX(r.created_at) as latest_rating
             FROM stores s 
             LEFT JOIN ratings r ON s.id = r.store_id 
             WHERE s.owner_id = ? 
             GROUP BY s.id, s.name, s.email, s.address, s.created_at
             ORDER BY s.name ASC`,
            [req.user.id]
        );
        
        // Get recent ratings (last 10)
        const [recentRatings] = await connection.query(
            `SELECT r.id, r.rating, r.created_at, r.updated_at,
             s.name as store_name, s.id as store_id,
             u.name as user_name, u.email as user_email
             FROM ratings r
             JOIN stores s ON r.store_id = s.id
             JOIN users u ON r.user_id = u.id
             WHERE s.owner_id = ?
             ORDER BY r.created_at DESC
             LIMIT 10`,
            [req.user.id]
        );
        
        // Get rating distribution
        const [ratingDistribution] = await connection.query(
            `SELECT r.rating, COUNT(*) as count
             FROM ratings r
             JOIN stores s ON r.store_id = s.id
             WHERE s.owner_id = ?
             GROUP BY r.rating
             ORDER BY r.rating DESC`,
            [req.user.id]
        );

        // Get customers who rated the store owner's stores
        const [raters] = await connection.query(
            `SELECT DISTINCT u.id, u.name, u.email, u.address
             FROM users u
             JOIN ratings r ON u.id = r.user_id
             JOIN stores s ON r.store_id = s.id
             WHERE s.owner_id = ?
             ORDER BY u.name ASC`,
            [req.user.id]
        );
        
        console.log(`Dashboard data fetched for store owner ${req.user.id}`);
        
        res.json({
            success: true,
            data: {
                overview: storeStats[0],
                stores: stores,
                recentRatings: recentRatings,
                ratingDistribution: ratingDistribution,
                raters: raters
            }
        });
        
    } catch (error) {
        console.error('Store owner dashboard error:', error);
        res.status(500).json({ 
            error: 'Failed to load dashboard',
            message: 'An error occurred while loading your dashboard data. Please try again.'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Get detailed ratings for owner's stores
router.get('/ratings', async (req, res) => {
    const { store_id, rating, sort = 'newest', limit = 50, offset = 0 } = req.query;
    
    let connection;
    try {
        // Validate pagination
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);
        
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({ 
                error: 'Invalid limit parameter',
                message: 'Limit must be between 1 and 100'
            });
        }
        
        if (isNaN(offsetNum) || offsetNum < 0) {
            return res.status(400).json({ 
                error: 'Invalid offset parameter', 
                message: 'Offset must be a non-negative number'
            });
        }
        
        // Build filters
        let whereClause = 'WHERE s.owner_id = ?';
        const params = [req.user.id];
        
        if (store_id && !isNaN(parseInt(store_id))) {
            whereClause += ' AND s.id = ?';
            params.push(parseInt(store_id));
        }
        
        if (rating && !isNaN(parseInt(rating)) && parseInt(rating) >= 1 && parseInt(rating) <= 5) {
            whereClause += ' AND r.rating = ?';
            params.push(parseInt(rating));
        }
        
        // Sorting options
        const validSorts = {
            'newest': 'ORDER BY r.created_at DESC',
            'oldest': 'ORDER BY r.created_at ASC',
            'rating_high': 'ORDER BY r.rating DESC',
            'rating_low': 'ORDER BY r.rating ASC',
            'store_name': 'ORDER BY s.name ASC',
            'user_name': 'ORDER BY u.name ASC'
        };
        
        const orderBy = validSorts[sort] || validSorts['newest'];
        
        // Add pagination
        params.push(limitNum, offsetNum);
        
        connection = await pool.getConnection();
        
        const [ratings] = await connection.query(
            `SELECT r.id, r.rating, r.created_at, r.updated_at,
             s.id as store_id, s.name as store_name, s.address as store_address,
             u.id as user_id, u.name as user_name, u.email as user_email,
             u.address as user_address
             FROM ratings r
             JOIN stores s ON r.store_id = s.id
             JOIN users u ON r.user_id = u.id
             ${whereClause}
             ${orderBy}
             LIMIT ? OFFSET ?`,
            params
        );
        
        // Get total count for pagination
        const countParams = params.slice(0, -2); 
        const [countResult] = await connection.query(
            `SELECT COUNT(*) as total
             FROM ratings r
             JOIN stores s ON r.store_id = s.id
             JOIN users u ON r.user_id = u.id
             ${whereClause}`,
            countParams
        );
        
        const totalRatings = countResult[0].total;
        const hasMore = offsetNum + limitNum < totalRatings;
        
        console.log(`Fetched ${ratings.length}/${totalRatings} ratings for store owner ${req.user.id}`);
        
        res.json({
            success: true,
            data: ratings,
            pagination: {
                total: totalRatings,
                limit: limitNum,
                offset: offsetNum,
                hasMore: hasMore
            },
            filters: {
                store_id: store_id || null,
                rating: rating || null,
                sort: sort
            }
        });
        
    } catch (error) {
        console.error('Store owner ratings error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch ratings',
            message: 'An error occurred while retrieving ratings. Please try again.'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Get specific store details
router.get('/stores/:id', async (req, res) => {
    const storeId = parseInt(req.params.id);
    
    let connection;
    try {
        if (isNaN(storeId) || storeId <= 0) {
            return res.status(400).json({ 
                error: 'Invalid store ID',
                message: 'Store ID must be a positive integer'
            });
        }
        
        connection = await pool.getConnection();
        
        // Get store details with ratings
        const [storeData] = await connection.query(
            `SELECT s.id, s.name, s.email, s.address, s.created_at,
             COALESCE(ROUND(AVG(r.rating), 2), 0) as average_rating,
             COUNT(r.id) as total_ratings,
             COUNT(DISTINCT r.user_id) as unique_raters
             FROM stores s
             LEFT JOIN ratings r ON s.id = r.store_id
             WHERE s.id = ? AND s.owner_id = ?
             GROUP BY s.id, s.name, s.email, s.address, s.created_at`,
            [storeId, req.user.id]
        );
        
        if (storeData.length === 0) {
            return res.status(404).json({ 
                error: 'Store not found',
                message: 'Store not found or you do not have permission to view it'
            });
        }
        
        // Get rating distribution for this store
        const [ratingDistribution] = await connection.query(
            `SELECT rating, COUNT(*) as count
             FROM ratings
             WHERE store_id = ?
             GROUP BY rating
             ORDER BY rating DESC`,
            [storeId]
        );
        
        console.log(`Store details fetched: ${storeData[0].name}`);
        
        res.json({
            success: true,
            data: {
                store: storeData[0],
                ratingDistribution: ratingDistribution
            }
        });
        
    } catch (error) {
        console.error('Get store details error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch store details',
            message: 'An error occurred while retrieving store information. Please try again.'
        });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
