import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ApiConfigurationError, resolveApiBaseUrl } from './apiConfig';

let apiConfigurationError: ApiConfigurationError | undefined;
export let API_BASE_URL: string;
try {
  API_BASE_URL = resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_URL, process.env.NODE_ENV === 'production');
} catch (error) {
  if (!(error instanceof ApiConfigurationError)) throw error;
  API_BASE_URL = '';
  apiConfigurationError = error;
}
const TOKEN_KEY = 'civicfix.jwt';
const ROLE_KEY = 'civicfix.role';

export const apiClient = axios.create({ baseURL: API_BASE_URL || undefined, timeout: 60000 });

apiClient.interceptors.request.use(async (config) => {
  if (apiConfigurationError) throw apiConfigurationError;
  if (!API_BASE_URL) throw new ApiConfigurationError('CivicFix API URL is missing from the app configuration.');
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }
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
  if (category === 'configuration') return 'CivicFix is not configured correctly. Please contact support or install a correctly configured build.';
  if (category === 'network' && axios.isAxiosError(error) && ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code ?? '')) {
    return 'CivicFix is taking longer than expected to respond. It may be starting up; please try again shortly.';
  }
  if (category === 'network') return 'Unable to reach CivicFix. Check your internet connection and try again.';
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

export function isAuthenticationError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

function apiErrorCategory(error: unknown): 'configuration' | 'network' | 'authentication' | 'permission' | 'not-found' | 'server' | 'response' | 'unknown' {
  if (error instanceof ApiConfigurationError) return 'configuration';
  if (error instanceof Error && error.name === 'ApiResponseError') return 'response';
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
