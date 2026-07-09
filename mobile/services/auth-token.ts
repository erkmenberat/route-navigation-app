import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4001';

const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ROLE_KEY = 'user_role';

// --- Access Token ---

export async function getAuthToken() {
  if (Platform.OS === 'web') {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function saveAuthToken(token: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function deleteAuthToken() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

// --- Refresh Token ---

export async function getRefreshToken() {
  if (Platform.OS === 'web') {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveRefreshToken(token: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function deleteRefreshToken() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// --- Role ---

export async function getRole(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(ROLE_KEY);
  }
  return SecureStore.getItemAsync(ROLE_KEY);
}

export async function saveRole(role: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(ROLE_KEY, role);
    return;
  }
  await SecureStore.setItemAsync(ROLE_KEY, role);
}

export async function deleteRole(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(ROLE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(ROLE_KEY);
}

export async function deleteAllTokens() {
  await Promise.all([deleteAuthToken(), deleteRefreshToken(), deleteRole()]);
}

// --- Refresh (shared by the REST client and the socket service, so a REST
// 401 and a socket disconnect racing at the same time only ever trigger a
// single /auth/refresh call — refresh tokens rotate, so a second concurrent
// call would use an already-invalidated token and fail) ---

async function doRefresh(): Promise<string | null> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
      `${BASE_URL}/auth/refresh`,
      { refreshToken },
    );

    await saveAuthToken(data.access_token);
    await saveRefreshToken(data.refresh_token);

    return data.access_token;
  } catch {
    return null;
  }
}

let inFlight: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (inFlight) return inFlight;
  inFlight = doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
