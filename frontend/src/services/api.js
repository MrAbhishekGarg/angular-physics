import axios from 'axios';

/**
 * Single axios instance for the whole app — base URL and interceptors
 * live here once, instead of every service file repeating config.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res.data.data,
  (err) => {
    const message = err.response?.data?.error || 'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);
