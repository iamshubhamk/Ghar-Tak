import axios from 'axios';
import { getToken } from '../utils/storage';

// Backend API URL: Use local PC IP for mobile device testing or live production server
const LOCAL_API_URL = 'http://192.168.1.7:8000/api/v1';
const LIVE_API_URL = 'https://ghar-tak-frontend.onrender.com/api/v1';

const BASE_URL = LOCAL_API_URL;


export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});


apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail?.message ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

// Auth Endpoints
export const loginApi = async (credentials: { email?: string; phone?: string; password: string }) => {
  const res = await apiClient.post('/auth/login', credentials);
  return res.data;
};


export const registerCustomerApi = async (payload: any) => {
  const res = await apiClient.post('/auth/register/customer', payload);
  return res.data;
};

export const registerProviderApi = async (payload: any) => {
  const res = await apiClient.post('/auth/register/provider', payload);
  return res.data;
};

export const getMeApi = async () => {
  const res = await apiClient.get('/auth/me');
  return res.data;
};

// Categories
export const getCategoriesApi = async () => {
  const res = await apiClient.get('/categories');
  return res.data;
};

// Providers
export const getProvidersApi = async (params?: { category_id?: string; locality?: string }) => {
  const res = await apiClient.get('/providers', { params });
  return res.data;
};

export const updateAvailabilityApi = async (status: 'online' | 'offline' | 'busy') => {
  const res = await apiClient.patch('/providers/me/availability', { availability_status: status });
  return res.data;
};

export const uploadProviderDocumentApi = async (formData: FormData) => {
  const res = await apiClient.post('/providers/me/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// Bookings
export const createBookingApi = async (payload: {
  category_id: string;
  provider_id?: string;
  service_address: string;
  locality: string;
  preferred_schedule?: string;
  issue_description?: string;
}) => {
  const res = await apiClient.post('/bookings', payload);
  return res.data;
};

export const getBookingsApi = async () => {
  const res = await apiClient.get('/bookings');
  return res.data;
};

export const getBookingDetailsApi = async (bookingId: string) => {
  const res = await apiClient.get(`/bookings/${bookingId}`);
  return res.data;
};

export const updateBookingStatusApi = async (bookingId: string, status: string, reason?: string) => {
  const res = await apiClient.patch(`/bookings/${bookingId}/status`, { status, reason });
  return res.data;
};

// Notifications
export const getNotificationsApi = async () => {
  const res = await apiClient.get('/notifications');
  return res.data;
};

export const registerPushTokenApi = async (pushToken: string) => {
  const res = await apiClient.post('/notifications/push-token', { push_token: pushToken });
  return res.data;
};

export const markNotificationReadApi = async (notificationId: string) => {
  const res = await apiClient.patch(`/notifications/${notificationId}/read`);
  return res.data;
};

// Reviews
export const createReviewApi = async (payload: { booking_id: string; rating: number; comment?: string }) => {
  const res = await apiClient.post('/reviews', payload);
  return res.data;
};

export const getProviderReviewsApi = async (providerId: string) => {
  const res = await apiClient.get(`/reviews/provider/${providerId}`);
  return res.data;
};
