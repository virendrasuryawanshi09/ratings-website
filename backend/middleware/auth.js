const jwt = require('jsonwebtoken');
const pool = require('../config/db');


if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET environment variable is required');
    process.exit(1);
}

//auth middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                error: 'Access token required',
                message: 'Please provide a valid JWT token'
            });
        }


        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded.id) {
            return res.status(401).json({ 
                error: 'Invalid token payload',
                message: 'Token does not contain valid user information'
            });
        }

        // Get user from database
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(
                'SELECT id, name, email, role, created_at FROM users WHERE id = ?', 
                [decoded.id]
            );
            
            if (rows.length === 0) {
                return res.status(401).json({ 
                    error: 'User not found',
                    message: 'User associated with token no longer exists'
                });
            }
            
            req.user = rows[0];
            next();
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid token',
                message: 'The provided token is malformed or invalid'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired',
                message: 'Please log in again to continue'
            });
        }
        
        return res.status(500).json({ 
            error: 'Authentication failed',
            message: 'An error occurred during authentication'
        });
    }
};

//role check middleware
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ 
                error: 'Authentication required',
                message: 'User must be authenticated to access this resource'
            });
        }
        
        if (!Array.isArray(allowedRoles)) {
            allowedRoles = [allowedRoles];
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
                userRole: req.user.role
            });
        }
        
        next();
    };
};

module.exports = { authenticateToken, requireRole };
