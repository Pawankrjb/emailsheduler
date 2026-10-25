import axios from 'axios';

// In production (Azure), both frontend & backend run on the same domain,
// so we use a relative base URL. In local dev we fall back to localhost:4000.
const api = axios.create({
  baseURL: import.meta.env.PROD ? '/' : (import.meta.env.VITE_API_URL || 'http://localhost:4000'),
  withCredentials: true,
});

export default api;