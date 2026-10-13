import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_BASE_URL = configuredApiUrl ? normalizeApiUrl(configuredApiUrl) : '';
const TOKEN_KEY = 'civicfix.jwt';
const ROLE_KEY = 'civicfix.role';

export const apiClient = axios.create({ baseURL: API_BASE_URL || undefined, timeout: 15000 });

apiClient.interceptors.request.use(async (config) => {
  if (!API_BASE_URL) throw new Error('CivicFix API URL is missing from the app configuration.');
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use((response) => {
  if (!response.data || typeof response.data !== 'object' || typeof response.data.success !== 'boolean') {
    const error = new Error('The CivicFix API returned an unexpected response.');
    error.name = 'ApiResponseError';
    throw error;
  }
  return response;
});

export async function saveToken(token: string) { await SecureStore.setItemAsync(TOKEN_KEY, token); }
export async function saveSession(token: string, role: string) { await SecureStore.setItemAsync(TOKEN_KEY, token); await SecureStore.setItemAsync(ROLE_KEY, role); }
export async function clearToken() { await SecureStore.deleteItemAsync(TOKEN_KEY); await SecureStore.deleteItemAsync(ROLE_KEY); }
export async function getToken() { return SecureStore.getItemAsync(TOKEN_KEY); }
export async function getSession() { return { token: await SecureStore.getItemAsync(TOKEN_KEY), role: await SecureStore.getItemAsync(ROLE_KEY) }; }
export async function register(name: string, email: string, password: string) {
  const response = await apiClient.post<{ data: { user: { id: string; name: string; email: string; role: string } } }>('/auth/register', { name, email, password });
  return response.data.data.user;
}
export async function getCurrentUser() {
  const response = await apiClient.get<{ data: { id: string; name: string; email: string; phone?: string; role: string } }>('/auth/me');
  return response.data.data;
}
export async function updateProfile(name: string, phone?: string) {
  const response = await apiClient.patch<{ data: { user: { id: string; name: string; email: string; role: string; phone?: string } } }>('/auth/me', { name, phone });
  return response.data.data.user;
}
export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
  await apiClient.patch('/auth/me/password', { currentPassword, newPassword, confirmPassword });
}

export function apiErrorMessage(error: unknown) {
  const category = apiErrorCategory(error);
  if (__DEV__) {
    const request = axios.isAxiosError(error) ? error.config?.url ?? 'unknown request' : 'unknown request';
    const status = axios.isAxiosError(error) ? error.response?.status ?? 'none' : 'none';
    console.warn(`[CivicFix API] ${category} path=${request} status=${status}`);
  }
  if (category === 'configuration') return 'CivicFix is not configured correctly. Rebuild the app after setting its API URL.';
  if (category === 'network') return 'CivicFix is unavailable. Check that the phone and computer are on the same Wi-Fi network.';
  if (category === 'authentication') return 'Authentication failed. Check your sign-in details and try again.';
  if (category === 'permission') return 'You do not have permission to perform this action.';
  if (category === 'not-found') return 'The requested CivicFix resource was not found.';
  if (category === 'server') return 'CivicFix is having trouble right now. Please try again shortly.';
  if (category === 'response') return 'CivicFix returned an unexpected response. Please try again.';
  if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
    return 'CivicFix could not process that request. Check the details and try again.';
  }
  return 'Something went wrong. Please try again.';
}

function normalizeApiUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return '';
  }
  if (!['http:', 'https:'].includes(url.protocol) || ['localhost', '127.0.0.1'].includes(url.hostname) || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) return '';
  const path = url.pathname.replace(/\/+$/, '');
  if (!path.endsWith('/api')) return '';
  return `${url.origin}${path}`;
}

function apiErrorCategory(error: unknown): 'configuration' | 'network' | 'authentication' | 'permission' | 'not-found' | 'server' | 'response' | 'unknown' {
  if (error instanceof Error && error.name === 'ApiResponseError') return 'response';
  if (error instanceof Error && error.message.includes('API URL')) return 'configuration';
  if (!axios.isAxiosError(error)) return 'unknown';
  if (!error.response) return 'network';
  if (error.response.status === 401) return 'authentication';
  if (error.response.status === 403) return 'permission';
  if (error.response.status === 404) return 'not-found';
  if (error.response.status >= 500) return 'server';
  return 'unknown';
}

export function mediaUrl(url: string) {
  return url.startsWith('http') ? url : `${API_BASE_URL.replace(/\/api\/?$/, '')}${url}`;
}
