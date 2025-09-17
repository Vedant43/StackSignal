import axios from "axios";

const API_BASE = process.env.API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

const TOKEN_KEY = "stacksignal_token"; 

export const setAuthToken = (token) => {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
    }
  } catch (_) {}
};

export const getAuthToken = () => {
  try {
    if (typeof window !== "undefined") {
      return localStorage.getItem(TOKEN_KEY);
    }
  } catch (_) {}
  return null;
};

export const clearAuthToken = () => {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (_) {}
};

// Attach token automatically if present
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
