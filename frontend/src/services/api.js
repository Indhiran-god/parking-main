import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('username');
      localStorage.removeItem('vehicle_registration');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  adminLogin: (credentials) => api.post('/auth/admin/login', credentials),
  userLogin: (credentials) => api.post('/auth/user/login', credentials),
  verifyToken: () => api.post('/auth/verify'),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getSlots: () => api.get('/admin/slots'),
  updateSlot: (id, data) => api.put(`/admin/slots/${id}`, data),
  bulkCreateSlots: (data) => api.post('/admin/slots/bulk', data),
  getAdmins: () => api.get('/admin/admins'),
  changePassword: (data) => api.put('/admin/change-password', data),
};

// Parking API
export const parkingAPI = {
  getSlots: () => api.get('/parking/slots'),
  vehicleEntry: (data) => api.post('/parking/entry', data),
  vehicleExit: (data) => api.post('/parking/exit', data),
  getCurrentVehicles: () => api.get('/parking/current'),
  getHistory: (params) => api.get('/parking/history', { params }),
};

// User API
export const userAPI = {
  getDashboard: () => api.get('/user/dashboard'),
  getHistory: (params) => api.get('/user/history', { params }),
  updateProfile: (data) => api.put('/user/profile', data),
  submitEntryRequest: (data) => api.post('/user/entry-request', data),
  getExitDetails: () => api.get('/user/exit-details'),
};

// Reports API
export const reportsAPI = {
  getCurrentVehicles: (params) => api.get('/reports/current-vehicles', { params }),
  getParkingHistory: (params) => api.get('/reports/parking-history', { params }),
  getRevenueReport: (params) => api.get('/reports/revenue', { params }),
  getSlotUtilization: (params) => api.get('/reports/slot-utilization', { params }),
  exportReport: (params) => api.get('/reports/export', { params }),
};

// Settings API
export const settingsAPI = {
  getAllSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
  getSetting: (key) => api.get(`/settings/${key}`),
  updateHourlyRate: (data) => api.put('/settings/hourly-rate', data),
  getSystemInfo: () => api.get('/settings/system/info'),
  createBackup: () => api.get('/settings/backup', { responseType: 'blob' }),
};

// Payment API
export const paymentAPI = {
  getAllPayments: (params) => api.get('/payments', { params }),
  getPayment: (id) => api.get(`/payments/${id}`),
  manualUpdatePayment: (data) => api.put('/payments/manual-update', data),
  processRefund: (paymentId) => api.post(`/payments/${paymentId}/refund`),
  exportPayments: (params) => api.get('/payments/export', { params, responseType: 'blob' }),
  getPaymentMethods: () => api.get('/payments/methods'),
  getPaymentStats: () => api.get('/payments/stats'),
};

export default api;
