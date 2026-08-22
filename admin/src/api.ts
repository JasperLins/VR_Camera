/**
 * 职责:API 客户端——统一信封解包/鉴权注入/会话存储(T21)
 * 口径:服务端契约 {code, message, data};code !== 0 抛业务错误
 */
const BASE = import.meta.env.VITE_API_BASE ?? '/v1';
const TOKEN_KEY = 'vrm-admin-token';

export interface Envelope<T> {
  code: number;
  message: string;
  data: T;
  requestId?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string
  ) {
    super(message);
  }
}

export const session = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY)
};

export async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8' };
  const token = session.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = (await response.json()) as Envelope<T>;
  if (payload.code !== 0) {
    throw new ApiError(payload.code, payload.message);
  }
  return payload.data;
}
