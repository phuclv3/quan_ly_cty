/**
 * Băm mật khẩu SHA-256 + salt riêng từng tài khoản (NT-01).
 *
 * GIỚI HẠN [Unverified]: bản này chạy hoàn toàn trên trình duyệt (localStorage), nên
 * chuỗi băm nằm ở máy người dùng. Khi lên Apps Script, việc so khớp phải làm ở server
 * (Auth.gs) và không bao giờ gửi chuỗi băm về client.
 */

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomHex(bytes = 16): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hashPassword(raw: string, salt: string): Promise<string> {
  return sha256Hex(`${raw.normalize('NFKC')}:${salt}`);
}

export const MAT_KHAU_TOI_THIEU = 8;

/** NT-02: ≥ 8 ký tự, khác mật khẩu cũ. Trả câu lỗi hoặc null. */
export function loiMatKhauMoi(moi: string, cu?: string): string | null {
  if (moi.length < MAT_KHAU_TOI_THIEU) return `Mật khẩu mới phải có ít nhất ${MAT_KHAU_TOI_THIEU} ký tự`;
  if (/\s/.test(moi)) return 'Mật khẩu không được chứa dấu cách';
  if (cu !== undefined && moi === cu) return 'Mật khẩu mới phải khác mật khẩu cũ';
  return null;
}

/** Mật khẩu tạm 10 ký tự, bỏ ký tự dễ nhầm. */
export function matKhauTam(): string {
  const set = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint32Array(10));
  return [...r].map((x) => set[x % set.length]).join('');
}
