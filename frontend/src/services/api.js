import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasToken: !!token,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Handle token expiration and responses
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      dataLength: response.data ? Object.keys(response.data).length : 0
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      message: error.message
    });
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  updatePassword: (passwordData) => api.put('/auth/password', passwordData),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  createUser: (userData) => api.post('/admin/users', userData),
  getStores: (params) => api.get('/admin/stores', { params }),
  getStoreById: (id) => api.get(`/admin/stores/${id}`),
  createStore: (storeData) => api.post('/admin/stores', storeData),
};

// User API
export const userAPI = {
  getStores: (params) => api.get('/user/stores', { params }),
  submitRating: (ratingData) => api.post('/user/ratings', ratingData),
  getUserRatings: (params) => api.get('/user/ratings', { params }),
  deleteRating: (storeId) => api.delete(`/user/ratings/${storeId}`),
};

// Store Owner API
export const storeOwnerAPI = {
  getDashboard: () => api.get('/store-owner/dashboard'),
  getRatings: (params) => api.get('/store-owner/ratings', { params }),
  getStoreDetails: (id) => api.get(`/store-owner/stores/${id}`),
};

// Public API (for unauthenticated access)
export const publicAPI = {
  getStores: (params) => api.get('/stores', { params }),
  submitRating: (ratingData) => api.post('/ratings', ratingData),
};

export default api;
