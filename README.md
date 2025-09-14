
# Store Rating Web Application

This is a **full-stack web application** that allows users to register, log in, and submit ratings for stores. It supports multiple user roles with distinct functionalities, including system administrators, normal users, and store owners. The application is built using **Express.js**, **React.js**, and **MySQL**, with a focus on scalability, security, and best practices.

# Overview
This project provides an end‑to‑end implementation for a production‑ready store rating website, including authentication, store management, review workflows, and an opinionated database schema.
# Core features
- Account signup/login with JWT sessions and salted password hashing.
- Store profiles with categories, photos, and owner assignment.
- Review and rating system with voting, edit windows, and abuse reporting hooks.
- Search and filter by name, category, rating, and location fields.
- Role‑based access control for admins, owners, and members.
- Production‑ready configs: environment variables, migrations, seed data, logging, and rate limiting.

# Architecture
- HTTP API: Express routes call controllers that delegate to services, which interact with repositories/queries for MySQL access.
- Auth: JWT access tokens, refresh tokens, and per‑route authorization based on roles.
- Data: Normalized schema with strict foreign keys, unique constraints, and indexes for hot queries.

# API overview
- All routes are versioned under /api/v1 and return JSON with a consistent envelope of data and errors.
- Auth is via Bearer access tokens, with refresh token rotation for session renewal.
- Auth: POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout.
- Users: GET /users/me, PATCH /users/me, GET /users/:id (admin only).
- Stores: GET /stores, GET /stores/:slug, POST /stores (owner/admin), PATCH /stores/:id (owner/admin), DELETE /stores/:id (admin).
- Reviews: GET /stores/:id/reviews, POST /stores/:id/reviews, PATCH /reviews/:id, DELETE /reviews/:id, POST /reviews/:id/vote.


# How to Run

## Backend Setup
  1. Install dependencies:
     ```bash
  
     
     npm install express mysql2 dotenv bcrypt jsonwebtoken cors
     npm run dev 
  
  2. Navigate to the frontend folder.
     ```bash
  
  
  
       npm install react react-dom react-router-dom axios
       npm install express mysql2 dotenv bcrypt jsonwebtoken cors
  
  3. Run the React app:
       ```bash

       npm start
  # Project Structure
  ## 1. Backend Tree
  ```text
    backend/
    ├─ config/
    │  └─ db.js
    ├─ middleware/
    │  └─ auth.js
    ├─ node_modules/
    ├─ routes/
    │  ├─ adminRoutes.js
    │  ├─ authRoutes.js
    │  ├─ ratingRoutes.js
    │  ├─ storeOwnerRoutes.js
    │  ├─ storeRoutes.js
    │  └─ userRoutes.js
    ├─ scripts/
    │  └─ createAdmin.js
    ├─ .env
    ├─ package-lock.json
    ├─ package.json
    ├─ schema.sql
    └─ server.js
```
## 2. Frontend tree
  ```text
  frontend/
  ├─ node_modules/
  ├─ public/
  │  ├─ index.html
  │  └─ manifest.json
  ├─ src/
  │  ├─ components/
  │  │  ├─ admin/
  │  │  │  ├─ AdminDashboard.css
  │  │  │  ├─ AdminDashboard.js
  │  │  │  ├─ StoreManagement.css
  │  │  │  ├─ StoreManagement.js
  │  │  │  ├─ UserManagement.css
  │  │  │  └─ UserManagement.js
  │  │  ├─ auth/
  │  │  │  ├─ Auth.css
  │  │  │  ├─ Login.js
  │  │  │  └─ Register.js
  │  │  ├─ common/
  │  │  │  ├─ Header.css
  │  │  │  ├─ Header.js
  │  │  │  ├─ LoadingSpinner.css
  │  │  │  ├─ LoadingSpinner.js
  │  │  │  └─ ProtectedRoute.js
  │  │  ├─ store-owner/
  │  │  │  ├─ StoreOwner.css
  │  │  │  └─ StoreOwner.js
  │  │  └─ user/
  │  │     ├─ StoreList.css
  │  │     ├─ StoreList.js
  │  │     ├─ UserDashboard.css
  │  │     └─ UserDashboard.js
  │  ├─ context/
  │  │  └─ AuthContext.js
  │  ├─ services/
  │  │  └─ api.js
  │  ├─ styles/
  │  │  └─ main.css
  │  ├─ App.js
  │  ├─ index.css
  │  └─ index.js
  ├─ package-lock.json
  └─ package.json
```

# MySQL Schema

  ```text
    -- Create database if not exists
CREATE DATABASE IF NOT EXISTS ratings_app;
USE ratings_app;

-- Users table (FIXED: Removed 20-character minimum constraint)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    address VARCHAR(400) NOT NULL,
    role ENUM('admin', 'user', 'store_owner') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (LENGTH(name) >= 2 AND LENGTH(name) <= 60),
    CHECK (LENGTH(address) <= 400)
);

-- Stores table
CREATE TABLE stores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    address VARCHAR(400) NOT NULL,
    owner_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Ratings table
-- Ratings table with proper structure
CREATE TABLE IF NOT EXISTS ratings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  store_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_store (user_id, store_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);


-- Indexes for better performance
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_address ON users(address);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_stores_name ON stores(name);
CREATE INDEX idx_stores_email ON stores(email);
CREATE INDEX idx_stores_address ON stores(address);
CREATE INDEX idx_stores_owner ON stores(owner_id);
CREATE INDEX idx_ratings_user ON ratings(user_id);
CREATE INDEX idx_ratings_store ON ratings(store_id);


SELECT * FROM stores;
```
