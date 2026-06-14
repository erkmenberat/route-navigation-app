import axios from 'axios';
import { router } from 'expo-router';

import { deleteAuthToken, getAuthToken } from './auth-token';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4001',
  timeout: 8000,
});

api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      await deleteAuthToken();
      router.replace('/login');
    }

    return Promise.reject(error);
  },
);
