
# Store Rating Web Application

This is a **full-stack web application** that allows users to register, log in, and submit ratings for stores. It supports multiple user roles with distinct functionalities, including system administrators, normal users, and store owners. The application is built using **Express.js**, **React.js**, and **MySQL**, with a focus on scalability, security, and best practices.

# Tech Stack

- **Backend:** Express.js  
- **Frontend:** React.js  
- **Database:** MySQL

# Features

## Common Features
- Single login system for all users.
- Role-based access control.
- Secure password management.
- Form validations with specific rules for name, email, password, and address.
- Sorting and filtering capabilities on listings.

## System Administrator

- Add new stores, normal users, and admin users.
- View a dashboard with:
  - Total users count.
  - Total stores count.
  - Total submitted ratings.
- Manage users with details like name, email, address, and role.
- Manage stores with name, email, address, and rating.
- Filter users and stores based on name, email, address, and role.
- View detailed information of all users and stores.
- Secure logout functionality.

## Normal User

- Register via signup form with:
  - Name
  - Email
  - Address
  - Password
- Login/logout functionality.
- Update password after login.
- Browse and search registered stores by name and address.
- View store details like name, address, overall rating, and user's rating.
- Submit or update ratings (1 to 5) for stores.

## Store Owner

- Login/logout functionality.
- Update password after login.
- View a list of users who rated their store.
- See the average rating of their store.

# Form Validation Rules

- **Name:** Minimum 20 characters, maximum 60 characters.
- **Address:** Maximum 400 characters.
- **Password:** 8 to 16 characters, must include at least one uppercase letter and one special character.
- **Email:** Must follow standard email format rules.

# Additional Notes

- All tables support sorting in ascending and descending order.
- Backend and frontend code follows best development practices.
- Database schema is designed for optimal performance and maintainability.
- The system ensures data integrity and security at all levels.

# How to Run

## Backend Setup
1. Install dependencies:
   ```bash
   npm install express mysql2 dotenv bcrypt jsonwebtoken cors

