import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('gcb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('gcb_token');
      localStorage.removeItem('gcb_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ───────────────────────────────────────────────────────────────────
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const getProfile = () => API.get('/auth/me');
export const updateProfile = (data) => API.put('/auth/me', data);

// ─── Complaints ─────────────────────────────────────────────────────────────
export const submitComplaint = (formData) =>
  API.post('/complaints/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const getMyComplaints = (status) =>
  API.get('/complaints/my', { params: { status } });

export const getComplaint = (id) => API.get(`/complaints/${id}`);

export const getAllComplaints = (params) => API.get('/complaints/', { params });

export const updateComplaintStatus = (id, data) =>
  API.put(`/complaints/${id}/status`, data);

export const assignOfficer = (id, officer_id) =>
  API.put(`/complaints/${id}/assign`, { officer_id });

export const getAnalytics = () => API.get('/complaints/analytics/summary');

export const getMapPoints = () => API.get('/complaints/map/points');

// ─── Admin ──────────────────────────────────────────────────────────────────
export const listUsers = (role) => API.get('/admin/users', { params: { role } });
export const updateUser = (id, data) => API.put(`/admin/users/${id}`, data);
export const createOfficer = (data) => API.post('/admin/create-officer', data);
export const getAdminStats = () => API.get('/admin/stats');

// ─── Notifications ──────────────────────────────────────────────────────────
export const getNotifications = () => API.get('/notifications/');
export const markAllRead = () => API.put('/notifications/read-all');
export const markRead = (id) => API.put(`/notifications/${id}/read`);

export default API;
