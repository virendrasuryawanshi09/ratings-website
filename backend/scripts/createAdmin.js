require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function createAdminUser() {
  let connection;
  try {
    // Wait a bit for database initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    connection = await pool.getConnection();
    
    // Check if admin user already exists
    const [existing] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      ['virendrasuryawanshi901@gmail.com']
    );
    
    if (existing.length > 0) {
      console.log('Admin user already exists with email: virendrasuryawanshi901@gmail.com');
      console.log('You can now login with:');
      console.log('Email: virendrasuryawanshi901@gmail.com');
      console.log('Password: AdminPass123!');
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('AdminPass123!', 12);
    
    // Create admin user
    const [result] = await connection.query(
      'INSERT INTO users (name, email, password, address, role) VALUES (?, ?, ?, ?, ?)',
      [
        'System Administrator',
        'virendrasuryawanshi901@gmail.com',
        hashedPassword,
        'Admin Address, System Location',
        'admin'
      ]
    );
    
    console.log('Admin user created successfully!');
    console.log('Admin Details:');
    console.log('- ID:', result.insertId);
    console.log('- Email: virendrasuryawanshi901@gmail.com');
    console.log('- Password: AdminPass123!');
    console.log('- Role: admin');
    console.log(' You can now login to the application!');
    
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log(' Solution: Update your .env file with correct database credentials:');
      console.log('DB_HOST=localhost');
      console.log('DB_USER=root');
      console.log('DB_PASS=your_mysql_password');
      console.log('DB_NAME=ratings_app');
    }
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;
