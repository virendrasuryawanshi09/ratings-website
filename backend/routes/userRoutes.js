const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication and user role to all user routes
router.use(authenticateToken);
router.use(requireRole(['user']));

// Enhanced input validation
const validateStoreId = (storeId) => {
    const id = parseInt(storeId);
    return !isNaN(id) && id > 0;
};

const validateRating = (rating) => {
    const numRating = parseInt(rating);
    return !isNaN(numRating) && numRating >= 1 && numRating <= 5;
};

// List Stores for Normal User (Enhanced)
router.get('/stores', async (req, res) => {
    const { search, sort, limit = 50, offset = 0 } = req.query;
    
    let connection;
    try {
        // Validate pagination parameters
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

        let whereClause = 'WHERE 1=1';
        const params = [req.user.id]; // For user_rating subquery
        
        // Search functionality
        if (search && search.trim()) {
            const searchTerm = `%${search.trim()}%`;
            whereClause += ' AND (s.name LIKE ? OR s.address LIKE ? OR s.email LIKE ?)';
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        // Sorting
        let orderBy = 'ORDER BY s.name ASC';
        if (sort) {
            const validSorts = {
                'name_asc': 'ORDER BY s.name ASC',
                'name_desc': 'ORDER BY s.name DESC',
                'rating_desc': 'ORDER BY overall_rating DESC',
                'rating_asc': 'ORDER BY overall_rating ASC',
                'newest': 'ORDER BY s.created_at DESC',
                'oldest': 'ORDER BY s.created_at ASC'
            };
            
            if (validSorts[sort]) {
                orderBy = validSorts[sort];
            }
        }
        
        // Add pagination parameters
        params.push(limitNum, offsetNum);

        connection = await pool.getConnection();
        
        // Get stores with pagination
        const [rows] = await connection.query(
            `SELECT s.id, s.name, s.address, s.email,
             COALESCE(ROUND(AVG(r.rating), 2), 0) as overall_rating,
             COUNT(r.id) as rating_count,
             (SELECT rating FROM ratings WHERE user_id = ? AND store_id = s.id) as user_rating,
             s.created_at
             FROM stores s 
             LEFT JOIN ratings r ON s.id = r.store_id 
             ${whereClause} 
             GROUP BY s.id, s.name, s.address, s.email, s.created_at
             ${orderBy}
             LIMIT ? OFFSET ?`,
            params
        );
        
        // Get total count for pagination
        const countParams = params.slice(0, -2); // Remove limit and offset
        const [countResult] = await connection.query(
            `SELECT COUNT(DISTINCT s.id) as total
             FROM stores s 
             LEFT JOIN ratings r ON s.id = r.store_id 
             ${whereClause}`,
            countParams
        );
        
        const totalStores = countResult[0].total;
        const hasMore = offsetNum + limitNum < totalStores;
        
        console.log(`Fetched ${rows.length}/${totalStores} stores for user ${req.user.id}`);
        
        res.json({
            success: true,
            data: rows,
            pagination: {
                total: totalStores,
                limit: limitNum,
                offset: offsetNum,
                hasMore: hasMore
            },
            filters: {
                search: search || null,
                sort: sort || 'name_asc'
            }
        });
        
    } catch (error) {
        console.error('User stores list error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch stores',
            message: 'An error occurred while retrieving stores. Please try again.'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Submit/Update Rating (Enhanced)
router.post('/ratings', async (req, res) => {
    const { store_id, rating, comment = '' } = req.body;
    
    try {
    
        if (!store_id) {
            return res.status(400).json({ 
                error: 'Missing store ID',
                message: 'Store ID is required to submit a rating'
            });
        }
        
        if (!validateStoreId(store_id)) {
            return res.status(400).json({ 
                error: 'Invalid store ID',
                message: 'Store ID must be a positive integer'
            });
        }
        
        if (!rating) {
            return res.status(400).json({ 
                error: 'Missing rating',
                message: 'Rating is required'
            });
        }
        
        if (!validateRating(rating)) {
            return res.status(400).json({ 
                error: 'Invalid rating',
                message: 'Rating must be an integer between 1 and 5'
            });
        }
        
        if (comment && comment.length > 500) {
            return res.status(400).json({ 
                error: 'Comment too long',
                message: 'Comment cannot exceed 500 characters'
            });
        }
        
        const numericRating = parseInt(rating);
        
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Check if store exists
            const [storeCheck] = await connection.query(
                'SELECT id, name FROM stores WHERE id = ?', 
                [store_id]
            );
            
            if (storeCheck.length === 0) {
                return res.status(404).json({ 
                    error: 'Store not found',
                    message: 'The specified store does not exist'
                });
            }
            
            // Insert or update rating
            const [result] = await connection.query(
                `INSERT INTO ratings (user_id, store_id, rating, created_at, updated_at) 
                 VALUES (?, ?, ?, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE 
                 rating = VALUES(rating), 
                 updated_at = NOW()`,
                [req.user.id, store_id, numericRating]
            );
            
            // Get updated statistics
            const [stats] = await connection.query(
                `SELECT 
                 ROUND(AVG(rating), 2) as overall_rating, 
                 COUNT(*) as total_ratings 
                 FROM ratings WHERE store_id = ?`,
                [store_id]
            );
            
            // Update store's overall_rating field
            await connection.query(
                'UPDATE stores SET overall_rating = ? WHERE id = ?',
                [stats[0].overall_rating, store_id]
            );
            
            await connection.commit();
            
            const isUpdate = result.affectedRows === 2; // ON DUPLICATE KEY UPDATE affects 2 rows
            
            console.log(`Rating ${isUpdate ? 'updated' : 'submitted'}:`, {
                user_id: req.user.id,
                store_id,
                rating: numericRating,
                store_name: storeCheck[0].name
            });
            
            res.json({ 
                success: true,
                message: `Rating ${isUpdate ? 'updated' : 'submitted'} successfully`,
                data: {
                    overall_rating: parseFloat(stats[0].overall_rating),
                    total_ratings: stats[0].total_ratings,
                    user_rating: numericRating,
                    action: isUpdate ? 'updated' : 'created'
                }
            });
            
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Rating submission error:', error);
        res.status(500).json({ 
            error: 'Failed to submit rating',
            message: 'An error occurred while submitting your rating. Please try again.'
        });
    }
});

// Get user's ratings (Enhanced)
router.get('/ratings', async (req, res) => {
    const { sort = 'newest', limit = 50, offset = 0 } = req.query;
    
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
        
        // Sorting options
        const validSorts = {
            'newest': 'ORDER BY r.updated_at DESC',
            'oldest': 'ORDER BY r.updated_at ASC',
            'rating_high': 'ORDER BY r.rating DESC',
            'rating_low': 'ORDER BY r.rating ASC',
            'store_name': 'ORDER BY s.name ASC'
        };
        
        const orderBy = validSorts[sort] || validSorts['newest'];
        
        connection = await pool.getConnection();
        
        // Get user's ratings with pagination
        const [rows] = await connection.query(
            `SELECT r.id, r.rating, r.created_at, r.updated_at,
             s.id as store_id, s.name as store_name, s.address as store_address, s.email as store_email,
             COALESCE(ROUND(AVG(r2.rating), 2), 0) as store_overall_rating,
             COUNT(r2.id) as store_total_ratings
             FROM ratings r
             JOIN stores s ON r.store_id = s.id
             LEFT JOIN ratings r2 ON s.id = r2.store_id
             WHERE r.user_id = ?
             GROUP BY r.id, r.rating, r.created_at, r.updated_at, s.id, s.name, s.address, s.email
             ${orderBy}
             LIMIT ? OFFSET ?`,
            [req.user.id, limitNum, offsetNum]
        );
        
        // Get total count
        const [countResult] = await connection.query(
            'SELECT COUNT(*) as total FROM ratings WHERE user_id = ?',
            [req.user.id]
        );
        
        const totalRatings = countResult[0].total;
        const hasMore = offsetNum + limitNum < totalRatings;
        
        console.log(`Fetched ${rows.length}/${totalRatings} ratings for user ${req.user.id}`);
        
        res.json({
            success: true,
            data: rows,
            pagination: {
                total: totalRatings,
                limit: limitNum,
                offset: offsetNum,
                hasMore: hasMore
            },
            sort: sort
        });
        
    } catch (error) {
        console.error('Get ratings error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch ratings',
            message: 'An error occurred while retrieving your ratings. Please try again.'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Delete user's rating
router.delete('/ratings/:store_id', async (req, res) => {
    const { store_id } = req.params;
    
    let connection;
    try {
        if (!validateStoreId(store_id)) {
            return res.status(400).json({ 
                error: 'Invalid store ID',
                message: 'Store ID must be a positive integer'
            });
        }
        
        connection = await pool.getConnection();
        
        const [result] = await connection.query(
            'DELETE FROM ratings WHERE user_id = ? AND store_id = ?',
            [req.user.id, store_id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                error: 'Rating not found',
                message: 'No rating found for this store'
            });
        }
        
        console.log(`Rating deleted for user ${req.user.id}, store ${store_id}`);
        
        res.json({ 
            success: true,
            message: 'Rating deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete rating error:', error);
        res.status(500).json({ 
            error: 'Failed to delete rating',
            message: 'An error occurred while deleting your rating. Please try again.'
        });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
