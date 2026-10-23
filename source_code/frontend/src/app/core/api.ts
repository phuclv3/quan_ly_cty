/**
 * Gọi backend REST (source_code/backend). Token phiên giữ ở localStorage như trước; mọi lỗi trả về
 * ApiError với câu tiếng Việt từ máy chủ để hiện thẳng lên toast.
 *
 * Địa chỉ API lấy từ src/environments (file duy nhất, gọi thẳng backend).
 */
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'app-oxy:token';
export const API_BASE = environment.apiUrl;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeToken(t: string | null): void {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* trình duyệt chặn bộ nhớ: phiên chỉ sống tới khi tải lại */
  }
}

/** Được gọi khi máy chủ trả 401 (phiên hết hạn / bị huỷ) — Auth đăng ký để đưa về màn đăng nhập. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

export function authHeaders(): Record<string, string> {
  const t = readToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Gửi một request JSON; trả JSON (hoặc null với 204). */
export async function api<T = unknown>(method: string, path: string, body?: unknown, o: { form?: FormData } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers: { ...authHeaders(), ...(body !== undefined && !o.form ? { 'Content-Type': 'application/json' } : {}) },
      body: o.form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError('Không kết nối được máy chủ — kiểm tra mạng hoặc backend', 0, 'NETWORK');
  }
  if (res.status === 204) return null as T;
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const e = (data ?? {}) as { message?: string; code?: string };
    if (res.status === 401 && path !== '/auth/login') onUnauthorized?.();
    throw new ApiError(e.message || `Lỗi máy chủ (${res.status})`, res.status, e.code);
  }
  return data as T;
}

/** Tải nội dung tệp (cần token) thành Blob. */
export async function apiBlob(path: string): Promise<Blob> {
  const res = await fetch(API_BASE + path, { headers: authHeaders() });
  if (!res.ok) {
    let msg = 'Không tải được tệp';
    try {
      msg = ((await res.json()) as { message?: string }).message ?? msg;
    } catch {
      /* thân lỗi không phải JSON */
    }
    throw new ApiError(msg, res.status);
  }
  return res.blob();
}
