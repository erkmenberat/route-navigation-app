import axios from 'axios';
import { router } from 'expo-router';

import { deleteAllTokens, getAuthToken, refreshAccessToken } from './auth-token';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4001';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
});

// Attach access token to every request
api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Queue of requests waiting for a token refresh to complete
let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function settlePendingRequests(err: unknown, token: string | null) {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (err) reject(err);
    else resolve(token!);
  });
  pendingRequests = [];
}

async function clearSessionAndRedirect() {
  await deleteAllTokens();
  router.replace('/login');
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalRequest = error.config as any;

    // Don't retry the refresh call itself — avoids infinite loops
    if (originalRequest._isRetry) {
      await clearSessionAndRedirect();
      return Promise.reject(error);
    }

    // Another request is already refreshing — queue this one until done
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      });
    }

    originalRequest._isRetry = true;
    isRefreshing = true;

    try {
      const accessToken = await refreshAccessToken();

      if (!accessToken) {
        throw new Error('No refresh token available');
      }

      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      settlePendingRequests(null, accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      settlePendingRequests(refreshError, null);
      await clearSessionAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
