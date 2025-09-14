const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// validation helpers
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
};

const validatePassword = (password) => {
    return /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,./<>?])(?=.{8,16}$)/.test(password);
};

const validateName = (name) => {
    return name && name.trim().length >= 20 && name.trim().length <= 60;
};

const validateAddress = (address) => {
    return address && address.trim().length >= 5 && address.trim().length <= 400;
};

// Apply authentication and admin role to ALL admin routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Enhanced Admin Dashboard Stats
router.get('/dashboard', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Get comprehensive statistics
        const [basicStats] = await connection.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM stores) as total_stores,
                (SELECT COUNT(*) FROM ratings) as total_ratings,
                (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
                (SELECT COUNT(*) FROM users WHERE role = 'user') as total_normal_users,
                (SELECT COUNT(*) FROM users WHERE role = 'store_owner') as total_store_owners,
                (SELECT COUNT(*) FROM stores WHERE owner_id IS NULL) as unassigned_stores,
                (SELECT ROUND(AVG(rating), 2) FROM ratings) as overall_average_rating
        `);
        
        // Get recent activities (last 5 users, stores, ratings)
        const [recentUsers] = await connection.query(`
            SELECT id, name, email, role, created_at 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        const [recentStores] = await connection.query(`
            SELECT s.id, s.name, s.email, u.name as owner_name, s.created_at
            FROM stores s
            LEFT JOIN users u ON s.owner_id = u.id
            ORDER BY s.created_at DESC 
            LIMIT 5
        `);
        
        const [recentRatings] = await connection.query(`
            SELECT r.rating, r.created_at, u.name as user_name, s.name as store_name
            FROM ratings r
            JOIN users u ON r.user_id = u.id
            JOIN stores s ON r.store_id = s.id
            ORDER BY r.created_at DESC 
            LIMIT 5
        `);
        
        // Get rating distribution
        const [ratingDistribution] = await connection.query(`
            SELECT rating, COUNT(*) as count
            FROM ratings
            GROUP BY rating
            ORDER BY rating DESC
        `);
        
        console.log('Admin dashboard stats fetched successfully');
        
        res.json({
            success: true,
            data: {
                overview: basicStats[0],
                recentActivity: {
                    users: recentUsers,
                    stores: recentStores,
                    ratings: recentRatings
                },
                ratingDistribution: ratingDistribution
            }
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch dashboard data',
            message: 'An error occurred while loading dashboard statistics'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Enhanced Add User (Admin only)
router.post('/users', async (req, res) => {
    const { name, email, password, address, role } = req.body;
    const validRoles = ['user', 'admin', 'store_owner'];
    
    let connection;
    try {
        // Comprehensive input validation
        if (!name || !email || !password || !address || !role) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                message: 'All fields are required: name, email, password, address, role',
                required: ['name', 'email', 'password', 'address', 'role']
            });
        }
        
        if (!validateName(name)) {
            return res.status(400).json({ 
                error: 'Invalid name',
                message: 'Name must be 20-60 characters long'
            });
        }
        
        if (!validateEmail(email)) {
            return res.status(400).json({ 
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
        }
        
        if (!validatePassword(password)) {
            return res.status(400).json({ 
                error: 'Invalid password',
                message: 'Password must be 8-16 characters with at least one uppercase letter and one special character'
            });
        }
        
        if (!validateAddress(address)) {
            return res.status(400).json({ 
                error: 'Invalid address',
                message: 'Address must be 5-400 characters long'
            });
        }
        
        if (!validRoles.includes(role)) {
            return res.status(400).json({ 
                error: 'Invalid role',
                message: 'Role must be one of: ' + validRoles.join(', '),
                validRoles: validRoles
            });
        }
        
        connection = await pool.getConnection();
        
        // Check if email already exists
        const [existing] = await connection.query(
            'SELECT id, email FROM users WHERE email = ?', 
            [email.toLowerCase().trim()]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({ 
                error: 'Email already exists',
                message: 'A user with this email address already exists'
            });
        }
        
        // Hash password with high salt rounds
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Insert user
        const [result] = await connection.query(
            'INSERT INTO users (name, email, password, address, role) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), email.toLowerCase().trim(), hashedPassword, address.trim(), role]
        );
        
        console.log('User created successfully:', { 
            insertId: result.insertId, 
            email: email.toLowerCase().trim(), 
            role 
        });
        
        res.status(201).json({ 
            success: true,
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} user created successfully`,
            data: {
                userId: result.insertId,
                name: name.trim(),
                email: email.toLowerCase().trim(),
                role: role
            }
        });
        
    } catch (error) {
        console.error('Add user error:', error);
        res.status(500).json({ 
            error: 'Failed to create user',
            message: 'An error occurred while creating the user. Please try again.'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Enhanced Add Store (Admin only)
router.post('/stores', async (req, res) => {
    const { name, email, address, owner_id } = req.body;
    
    let connection;
    try {
        // Input validation
        if (!name || !email || !address) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                message: 'Name, email, and address are required',
                required: ['name', 'email', 'address']
            });
        }
        
        if (!validateName(name)) {
            return res.status(400).json({ 
                error: 'Invalid store name',
                message: 'Store name must be 20-60 characters long'
            });
        }
        
        if (!validateEmail(email)) {
            return res.status(400).json({ 
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
        }
        
        if (!validateAddress(address)) {
            return res.status(400).json({ 
                error: 'Invalid address',
                message: 'Address must be 5-400 characters long'
            });
        }
        
        if (owner_id && (isNaN(parseInt(owner_id)) || parseInt(owner_id) <= 0)) {
            return res.status(400).json({ 
                error: 'Invalid owner ID',
                message: 'Owner ID must be a positive integer'
            });
        }
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Check if email already exists
        const [existing] = await connection.query(
            'SELECT id, email FROM stores WHERE email = ?', 
            [email.toLowerCase().trim()]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({ 
                error: 'Store email already exists',
                message: 'A store with this email address already exists'
            });
        }
        
        // If owner_id provided, verify the user exists and is a store_owner
        let ownerInfo = null;
        if (owner_id) {
            const [ownerCheck] = await connection.query(
                'SELECT id, name, role FROM users WHERE id = ?', 
                [parseInt(owner_id)]
            );
            
            if (ownerCheck.length === 0) {
                return res.status(404).json({ 
                    error: 'Owner not found',
                    message: 'The specified owner does not exist'
                });
            }
            
            if (ownerCheck[0].role !== 'store_owner') {
                return res.status(400).json({ 
                    error: 'Invalid owner role',
                    message: 'The specified user is not a store owner',
                    userRole: ownerCheck[0].role
                });
            }
            
            ownerInfo = ownerCheck[0];
        }
        
        // Insert store
        const [result] = await connection.query(
            'INSERT INTO stores (name, email, address, owner_id) VALUES (?, ?, ?, ?)',
            [name.trim(), email.toLowerCase().trim(), address.trim(), owner_id ? parseInt(owner_id) : null]
        );
        
        await connection.commit();
        
        console.log('Store created successfully:', { 
            insertId: result.insertId, 
            name: name.trim(), 
            email: email.toLowerCase().trim(),
            owner: ownerInfo?.name || 'Unassigned'
        });
        
        res.status(201).json({ 
            success: true,
            message: 'Store created successfully',
            data: {
                storeId: result.insertId,
                name: name.trim(),
                email: email.toLowerCase().trim(),
                address: address.trim(),
                owner: ownerInfo || null
            }
        });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Add store error:', error);
        res.status(500).json({ 
            error: 'Failed to create store',
            message: 'An error occurred while creating the store. Please try again.'
        });
    } finally {
        if (connection) connection.release();
    }
});

// List Users with enhanced filtering and sorting  
router.get('/users', async (req, res) => {
    const { name, email, address, role, sort, limit = 50, offset = 0 } = req.query;
    
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
        
        let whereClause = 'WHERE 1=1';
        const params = [];
        
        if (name && name.trim()) {
            whereClause += ' AND name LIKE ?';
            params.push(`%${name.trim()}%`);
        }
        if (email && email.trim()) {
            whereClause += ' AND email LIKE ?';
            params.push(`%${email.trim()}%`);
        }
        if (address && address.trim()) {
            whereClause += ' AND address LIKE ?';
            params.push(`%${address.trim()}%`);
        }
        if (role && role.trim()) {
            whereClause += ' AND role = ?';
            params.push(role.trim());
        }
        
        let orderBy = 'ORDER BY name ASC';
        if (sort) {
            const [field, dir] = sort.split(':');
            const validFields = ['name', 'email', 'address', 'role', 'created_at'];
            const validDirs = ['asc', 'desc'];
            if (validFields.includes(field) && validDirs.includes(dir?.toLowerCase())) {
                orderBy = `ORDER BY ${field} ${dir.toUpperCase()}`;
            }
        }
        
        // Add pagination
        params.push(limitNum, offsetNum);
        
        connection = await pool.getConnection();
        
        const [rows] = await connection.query(
            `SELECT id, name, email, address, role, created_at FROM users ${whereClause} ${orderBy} LIMIT ? OFFSET ?`,
            params
        );
        
        // Get total count
        const countParams = params.slice(0, -2);
        const [countResult] = await connection.query(
            `SELECT COUNT(*) as total FROM users ${whereClause}`,
            countParams
        );
        
        const totalUsers = countResult[0].total;
        const hasMore = offsetNum + limitNum < totalUsers;
        
        console.log(`Fetched ${rows.length}/${totalUsers} users with filters:`, { name, email, address, role, sort });
        
        res.json({
            success: true,
            data: rows,
            pagination: {
                total: totalUsers,
                limit: limitNum,
                offset: offsetNum,
                hasMore: hasMore
            },
            filters: { name, email, address, role, sort }
        });
        
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch users',
            message: 'An error occurred while retrieving users'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Get user by ID with enhanced details
router.get('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT id, name, email, address, role, created_at FROM users WHERE id = ?',
            [userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = rows[0];
        
        // Get additional data based on role
        if (user.role === 'store_owner') {
            const [stores] = await connection.query(
                'SELECT COUNT(*) as store_count FROM stores WHERE owner_id = ?',
                [userId]
            );
            const [avgRating] = await connection.query(
                `SELECT AVG(r.rating) as avg_rating, COUNT(r.id) as total_ratings 
                 FROM stores s 
                 LEFT JOIN ratings r ON s.id = r.store_id 
                 WHERE s.owner_id = ?`,
                [userId]
            );
            
            user.store_count = stores[0].store_count;
            user.average_rating = avgRating[0].avg_rating || 0;
            user.total_ratings = avgRating[0].total_ratings || 0;
        } else if (user.role === 'user') {
            const [userRatings] = await connection.query(
                'SELECT COUNT(*) as rating_count FROM ratings WHERE user_id = ?',
                [userId]
            );
            user.rating_count = userRatings[0].rating_count;
        }
        
        console.log('User details fetched:', { userId, role: user.role });
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    } finally {
        if (connection) connection.release();
    }
});

// List stores with enhanced filtering and sorting
router.get('/stores', async (req, res) => {
    const { name, email, address, sort, limit = 50, offset = 0 } = req.query;
    
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
        
        let whereClause = 'WHERE 1=1';
        const params = [];
        
        if (name && name.trim()) {
            whereClause += ' AND s.name LIKE ?';
            params.push(`%${name.trim()}%`);
        }
        if (email && email.trim()) {
            whereClause += ' AND s.email LIKE ?';
            params.push(`%${email.trim()}%`);
        }
        if (address && address.trim()) {
            whereClause += ' AND s.address LIKE ?';
            params.push(`%${address.trim()}%`);
        }
        
        let orderBy = 'ORDER BY s.name ASC';
        if (sort) {
            const [field, dir] = sort.split(':');
            const validFields = ['name', 'email', 'address'];
            const validDirs = ['asc', 'desc'];
            if (validFields.includes(field) && validDirs.includes(dir?.toLowerCase())) {
                orderBy = `ORDER BY s.${field} ${dir.toUpperCase()}`;
            } else if (field === 'rating') {
                orderBy = `ORDER BY rating ${dir?.toUpperCase() || 'DESC'}`;
            }
        }
        
        // Add pagination
        params.push(limitNum, offsetNum);
        
        connection = await pool.getConnection();
        
        const [rows] = await connection.query(
            `SELECT s.id, s.name, s.email, s.address, s.owner_id, s.created_at,
             COALESCE(ROUND(AVG(r.rating), 2), 0) as rating,
             COUNT(r.id) as rating_count,
             u.name as owner_name
             FROM stores s 
             LEFT JOIN ratings r ON s.id = r.store_id 
             LEFT JOIN users u ON s.owner_id = u.id
             ${whereClause} 
             GROUP BY s.id, s.name, s.email, s.address, s.owner_id, s.created_at, u.name
             ${orderBy}
             LIMIT ? OFFSET ?`,
            params
        );
        
        // Get total count
        const countParams = params.slice(0, -2);
        const [countResult] = await connection.query(
            `SELECT COUNT(DISTINCT s.id) as total
             FROM stores s 
             LEFT JOIN ratings r ON s.id = r.store_id 
             LEFT JOIN users u ON s.owner_id = u.id
             ${whereClause}`,
            countParams
        );
        
        const totalStores = countResult[0].total;
        const hasMore = offsetNum + limitNum < totalStores;
        
        console.log(`Fetched ${rows.length}/${totalStores} stores with filters:`, { name, email, address, sort });
        
        res.json({
            success: true,
            data: rows,
            pagination: {
                total: totalStores,
                limit: limitNum,
                offset: offsetNum,
                hasMore: hasMore
            },
            filters: { name, email, address, sort }
        });
        
    } catch (error) {
        console.error('List stores error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch stores',
            message: 'An error occurred while retrieving stores'
        });
    } finally {
        if (connection) connection.release();
    }
});

// Get store by ID.
router.get('/stores/:id', async (req, res) => {
    const storeId = parseInt(req.params.id);
    
    if (isNaN(storeId) || storeId <= 0) {
        return res.status(400).json({ error: 'Invalid store ID' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query(
            `SELECT s.id, s.name, s.email, s.address, s.owner_id, s.created_at,
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(r.id) as total_ratings,
             u.name as owner_name, u.email as owner_email
             FROM stores s 
             LEFT JOIN ratings r ON s.id = r.store_id 
             LEFT JOIN users u ON s.owner_id = u.id
             WHERE s.id = ?
             GROUP BY s.id, s.name, s.email, s.address, s.owner_id, s.created_at, u.name, u.email`,
            [storeId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Store not found' });
        }
        
        console.log('Store details fetched:', { storeId, name: rows[0].name });
        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Get store error:', error);
        res.status(500).json({ error: 'Failed to fetch store details' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
