const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const validatePassword = (password) => {
  // At least 8 chars, max 16, one uppercase, one special char
  return /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,./<>?])(?=.{8,16}$)/.test(password);
};

const validateName = (name) => {
  return name && name.trim().length >= 20 && name.trim().length <= 60;
};

const validateAddress = (address) => {
  return address && address.trim().length >= 5 && address.trim().length <= 400;
};

// One-time Admin Registration
router.post('/register-admin', async (req, res) => {
  console.log('Admin registration attempt:', { ...req.body, password: '***' });
  
  try {
    const { name, email, password, address, adminSecret } = req.body;

    // Security check
    if (adminSecret !== 'CREATE_FIRST_ADMIN_2025') {
      console.log('Invalid admin secret provided');
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Invalid admin secret'
      });
    }

    // Check if admin already exists
    const connection = await pool.getConnection();
    try {
      const [existingAdmin] = await connection.query(
        'SELECT id FROM users WHERE role = ?', 
        ['admin']
      );
      
      if (existingAdmin.length > 0) {
        console.log('Admin already exists');
        return res.status(409).json({
          error: 'Admin already exists',
          message: 'An admin user already exists in the system'
        });
      }

      // Validate inputs
      if (!name || !email || !password || !address) {
        return res.status(400).json({
          error: 'Missing fields',
          message: 'All fields are required: name, email, password, address'
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

      // Hash password and create admin
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const [result] = await connection.query(
        'INSERT INTO users (name, email, password, address, role) VALUES (?, ?, ?, ?, ?)',
        [name.trim(), email.toLowerCase().trim(), hashedPassword, address.trim(), 'admin']
      );

      console.log('Admin user created successfully:', { id: result.insertId, email: email.toLowerCase().trim() });

      res.status(201).json({
        success: true,
        message: 'Admin user created successfully',
        adminId: result.insertId,
        email: email.toLowerCase().trim()
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Admin registration error:', error.stack || error);
    res.status(500).json({
      error: 'Admin registration failed',
      message: error.message || 'An error occurred during admin registration'
    });
  }
});

// Register endpoint with updated validation
router.post('/register', async (req, res) => {
  const { name, email, password, address } = req.body;
  
  try {
    // Input validation
    if (!name || !email || !password || !address) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'All fields are required: name, email, password, address'
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

    const connection = await pool.getConnection();
    try {
      // Check if email exists
      const [existing] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [email.toLowerCase().trim()]
      );
      
      if (existing.length > 0) {
        return res.status(409).json({
          error: 'Email already exists',
          message: 'An account with this email address already exists'
        });
      }
      
      // Hash password with higher salt rounds for security
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Insert user
      const [result] = await connection.query(
        'INSERT INTO users (name, email, password, address, role) VALUES (?, ?, ?, ?, ?)',
        [name.trim(), email.toLowerCase().trim(), hashedPassword, address.trim(), 'user']
      );
      
      console.log('User registered:', { id: result.insertId, email: email.toLowerCase().trim() });
      
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        userId: result.insertId
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration. Please try again.'
    });
  }
});

//LOGIN ENDPOINT
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('LOGIN ATTEMPT:', { email, password: '***' });
  
  try {
    if (!email || !password) {
      console.log('Missing credentials');
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }
    
    if (!validateEmail(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
    }

    const connection = await pool.getConnection();
    try {
      console.log('Looking for user with email:', email.toLowerCase().trim());
      
      const [rows] = await connection.query(
        'SELECT * FROM users WHERE email = ?',
        [email.toLowerCase().trim()]
      );
      
      console.log('👤 Users found:', rows.length);
      
      if (rows.length === 0) {
        console.log('No user found with email:', email);
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }
      
      const user = rows[0];
      console.log('User found:', { id: user.id, email: user.email, role: user.role });
      
      const validPassword = await bcrypt.compare(password, user.password);
      console.log('Password comparison result:', validPassword);
      
      if (!validPassword) {
        console.log(' Invalid password for user:', email);
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }
      
      // Check JWT_SECRET exists
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET not found in environment variables');
        return res.status(500).json({
          error: 'Server configuration error',
          message: 'Authentication service not properly configured'
        });
      }
      
      // Create JWT token with longer expiry
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      console.log('Login successful for:', { id: user.id, email: user.email, role: user.role });
      
      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userWithoutPassword
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Login error:', error.stack || error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login. Please try again.'
    });
  }
});

// Token validation endpoint
router.get('/validate', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// Update password with better validation
router.put('/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admins cannot update password via this endpoint'
      });
    }
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing passwords',
        message: 'Current password and new password are required'
      });
    }
    
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        error: 'Invalid new password',
        message: 'New password must be 8-16 characters with at least one uppercase letter and one special character'
      });
    }

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT password FROM users WHERE id = ?',
        [req.user.id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User account not found'
        });
      }
      
      const validCurrentPassword = await bcrypt.compare(currentPassword, rows[0].password);
      if (!validCurrentPassword) {
        return res.status(400).json({
          error: 'Invalid current password',
          message: 'Current password is incorrect'
        });
      }
      
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      await connection.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedNewPassword, req.user.id]
      );
      
      console.log('Password updated for user:', req.user.id);
      
      res.json({
        success: true,
        message: 'Password updated successfully'
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({
      error: 'Password update failed',
      message: 'An error occurred while updating password'
    });
  }
});

module.exports = router;
