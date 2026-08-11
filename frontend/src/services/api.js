import axios from 'axios';

/**
 * Single axios instance for the whole app — base URL and interceptors
 * live here once, instead of every service file repeating config.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  // The production backend runs on a free-tier host that spins down after
  // idling and cold-starts on the next request — that alone can take
  // 30-50s, on top of MongoDB needing to reconnect. 10s was cutting requests
  // off mid-wake-up, surfacing as a generic "Something went wrong" even
  // though the request would've succeeded seconds later.
  timeout: 45000,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res.data.data,
  (err) => {
    const message = err.response?.data?.error || 'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);
