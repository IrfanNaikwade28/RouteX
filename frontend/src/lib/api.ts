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
