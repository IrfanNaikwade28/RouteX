import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const tokens = localStorage.getItem('tokens');
    if (tokens) {
      const { access } = JSON.parse(tokens);
      config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokens = localStorage.getItem('tokens');
        if (tokens) {
          const { refresh } = JSON.parse(tokens);
          
          // Try to refresh the token
          const response = await axios.post(
            `${api.defaults.baseURL}/auth/token/refresh/`,
            { refresh }
          );

          const { access } = response.data;
          
          // Update stored tokens
          const updatedTokens = { ...JSON.parse(tokens), access };
          localStorage.setItem('tokens', JSON.stringify(updatedTokens));

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        localStorage.removeItem('tokens');
        localStorage.removeItem('currentUser');
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API endpoints
export const authAPI = {
  register: (data: {
    full_name: string;
    email: string;
    password: string;
    phone_number: string;
    role?: string;
  }) => api.post('/auth/register/', data),

  login: (data: { email: string; password: string; role: string }) => 
    api.post('/auth/login/', data),

  logout: () => {
    // Clear local storage
    localStorage.removeItem('tokens');
    localStorage.removeItem('currentUser');
  },
};

// Admin API endpoints
export const adminAPI = {
  // Drivers
  getDrivers: () => api.get('/admin/drivers/'),
  getDriver: (id: number) => api.get(`/admin/drivers/${id}/`),
  createDriver: (data: any) => api.post('/admin/drivers/', data),
  updateDriver: (id: number, data: any) => api.put(`/admin/drivers/${id}/`, data),
  deleteDriver: (id: number) => api.delete(`/admin/drivers/${id}/`),

  // Parcel Requests
  getParcelRequests: () => api.get('/admin/parcel-requests/'),
  acceptParcel: (id: number) => api.patch(`/admin/parcel-requests/${id}/accept/`),
  rejectParcel: (id: number, notes?: string) => 
    api.patch(`/admin/parcel-requests/${id}/reject/`, { notes }),
  
  // Driver Assignment
  assignDriver: (data: { parcel_id: number; driver_id: number }) => 
    api.post('/admin/assign-driver/', data),
  
  // Live Tracking
  getLiveDrivers: () => api.get('/admin/live-drivers/'),
  getLiveParcels: () => api.get('/admin/live-parcels/'),
  getParcelRoute: (parcelId: number) => api.get(`/admin/parcel/${parcelId}/route/`),
};

// Client API endpoints
export const clientAPI = {
  // Profile
  getProfile: () => api.get('/client/profile/'),
  updateProfile: (data: any) => api.put('/client/profile/', data),
  patchProfile: (data: any) => api.patch('/client/profile/', data),

  // Parcels
  getParcels: (params?: { status?: string; search?: string }) => 
    api.get('/client/parcels/', { params }),
  getParcel: (id: number) => api.get(`/client/parcels/${id}/`),
  createParcel: (data: any) => api.post('/client/parcels/create/', data),
  trackParcel: (parcelId: number) => api.get(`/client/parcels/${parcelId}/track/`),
  getDriverContact: (parcelId: number) => api.get(`/client/parcels/${parcelId}/driver-contact/`),

  // Statistics
  getStats: () => api.get('/client/stats/'),

  // Notifications
  getNotifications: () => api.get('/client/notifications/'),
  getNotification: (id: number) => api.get(`/client/notifications/${id}/`),
  markNotificationAsRead: (notificationId: number) => 
    api.patch(`/client/notifications/${notificationId}/mark-read/`),
  markAllNotificationsAsRead: () => api.post('/client/notifications/mark-all-read/'),

  // Pricing Rules
  getPricingRules: () => api.get('/client/pricing-rules/'),
  
  // Price Calculation
  calculatePrice: (data: { weight: number; distance_km: number }) => 
    api.post('/client/pricing/calculate/', data),
};

// Driver API endpoints
export const driverAPI = {
  // Tasks
  getTasks: () => api.get('/driver/tasks/'),
  
  // Parcel Status
  updateParcelStatus: (parcelId: number, data: { current_status: string }) => 
    api.patch(`/driver/parcel/${parcelId}/update-status/`, data),
  
  // Route
  getRoute: (parcelId: number) => api.get(`/driver/route/${parcelId}/`),
  
  // Vehicle Info
  getVehicleInfo: () => api.get('/driver/vehicle-info/'),
  
  // Client Contact
  getClientContact: (parcelId: number) => api.get(`/driver/parcel/${parcelId}/client-contact/`),
};
