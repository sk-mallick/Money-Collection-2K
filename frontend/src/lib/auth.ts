import { getApiBase } from './constants';

// ─── JWT Auth Helpers ───────────────────────────────

const TOKEN_KEY = 'mcms_jwt_token';
const USER_KEY = 'mcms_user';

export interface AuthUser {
  id: number;
  username: string;
  name: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('mcms_last_pull_timestamp');
}

/**
 * Decode JWT payload without verification (for local offline check)
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated (locally)
 * Works offline by checking JWT expiry without server call
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const exp = payload.exp as number;
  if (!exp) return false;

  // Check if token is expired
  return exp > Date.now() / 1000;
}

/**
 * Login via API
 */
export async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (data.success && data.token) {
      setAuth(data.token, data.user);
      return { success: true };
    }

    return { success: false, error: data.error || 'Login failed' };
  } catch {
    return { success: false, error: 'Cannot connect to server. Please check your internet connection.' };
  }
}

/**
 * Logout
 */
export function logout(): void {
  clearAuth();
}
