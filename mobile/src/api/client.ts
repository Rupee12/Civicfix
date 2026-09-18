import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

export const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`
  : 'http://10.0.2.2:4000/api';
const TOKEN_KEY = 'civicfix.jwt';
const ROLE_KEY = 'civicfix.role';

export const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function saveToken(token: string) { await SecureStore.setItemAsync(TOKEN_KEY, token); }
export async function saveSession(token: string, role: string) { await SecureStore.setItemAsync(TOKEN_KEY, token); await SecureStore.setItemAsync(ROLE_KEY, role); }
export async function clearToken() { await SecureStore.deleteItemAsync(TOKEN_KEY); await SecureStore.deleteItemAsync(ROLE_KEY); }
export async function getToken() { return SecureStore.getItemAsync(TOKEN_KEY); }
export async function getSession() { return { token: await SecureStore.getItemAsync(TOKEN_KEY), role: await SecureStore.getItemAsync(ROLE_KEY) }; }

export function apiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (!status) return error.code === 'ECONNABORTED' ? 'CivicFix did not respond in time. Check the backend and Wi-Fi connection.' : `Cannot reach CivicFix at ${API_BASE_URL}. Check EXPO_PUBLIC_API_URL, the backend, and that your phone is on the same Wi-Fi network.`;
    if (status === 401) return 'Your session is invalid or expired. Please sign in again.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested CivicFix resource was not found.';
    if (status === 500 || status === 503) return 'CivicFix is temporarily unavailable. Please try again shortly.';
    return error.response?.data?.message ?? `CivicFix request failed (${status}).`;
  }
  return 'Something went wrong. Please try again.';
}

export function mediaUrl(url: string) {
  return url.startsWith('http') ? url : `${API_BASE_URL.replace(/\/api\/?$/, '')}${url}`;
}
