import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/common/Header';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Dashboard Components
import UserDashboard from './components/user/UserDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import StoreOwnerDashboard from './components/store-owner/StoreOwnerDashboard';

// Management Components
import UserManagement from './components/admin/UserManagement';
import StoreManagement from './components/admin/StoreManagement';

// Component to handle root routing logic
const RootRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'store_owner':
      return <Navigate to="/store-owner/dashboard" replace />;
    case 'user':
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

// Component to protect public routes (redirect if already logged in)
const PublicRouteCheck = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }
  
  if (user) {
    switch (user.role) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'store_owner':
        return <Navigate to="/store-owner/dashboard" replace />;
      case 'user':
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }
  
  return children;
};

// Main App Content Component
const AppContent = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="app-loading">
        <LoadingSpinner message="Initializing application..." />
      </div>
    );
  }

  return (
    <div className="app">
      {user && <Header />}
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRouteCheck>
                <Login />
              </PublicRouteCheck>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRouteCheck>
                <Register />
              </PublicRouteCheck>
            }
          />
          
          {/* User Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Admin Protected Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stores"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <StoreManagement />
              </ProtectedRoute>
            }
          />
          
          {/* Store Owner Protected Routes */}
          <Route
            path="/store-owner/dashboard"
            element={
              <ProtectedRoute allowedRoles={['store_owner']}>
                <StoreOwnerDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Error Pages */}
          <Route
            path="/unauthorized"
            element={
              <div className="error-page unauthorized">
                <div className="error-content">
                  <h2>Access Denied</h2>
                  <p>You don't have permission to access this page.</p>
                  <button 
                    onClick={() => window.history.back()} 
                    className="btn btn-primary"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            }
          />
          
          <Route
            path="*"
            element={
              <div className="error-page not-found">
                <div className="error-content">
                  <h2>Page Not Found</h2>
                  <p>The page you're looking for doesn't exist.</p>
                  <button 
                    onClick={() => window.location.href = '/'} 
                    className="btn btn-primary"
                  >
                    Go Home
                  </button>
                </div>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
