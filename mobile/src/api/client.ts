import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000/api';
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
  if (axios.isAxiosError(error)) return error.response?.data?.message ?? 'Unable to reach CivicFix.';
  return 'Something went wrong. Please try again.';
}

export function mediaUrl(url: string) {
  return url.startsWith('http') ? url : `${API_BASE_URL.replace(/\/api\/?$/, '')}${url}`;
}