import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'sylora.session.v1';
const localDevelopmentBase = Platform.OS === 'android' ? 'http://10.0.2.2:8787' : 'http://127.0.0.1:8787';
const configuredBase = String(Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_SYLORA_API_URL || localDevelopmentBase);

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const api = {
  baseUrl: configuredBase.replace(/\/$/, ''),
  async getToken() { return SecureStore.getItemAsync(TOKEN_KEY); },
  async setToken(token: string | null) {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
  url(path: string) { return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`; },
  async request<T>(path: string, options: RequestInit & { auth?: boolean } = {}): Promise<T> {
    const { auth = true, ...request } = options;
    const token = auth ? await this.getToken() : null;
    const headers = new Headers(request.headers || {});
    headers.set('accept', 'application/json');
    if (token) headers.set('authorization', `Bearer ${token}`);
    if (request.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json');
    const response = await fetch(this.url(path), { ...request, headers });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new ApiError(response.status, String(body.error || `HTTP_${response.status}`));
    return body as T;
  },
  async post<T>(path: string, body: unknown = {}) { return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
};
