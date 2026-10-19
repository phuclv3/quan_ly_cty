/** Hàm tiện ích dùng chung: ngày, tiền, mã, tìm kiếm. */

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** ISO ngắn 'YYYY-MM-DD'. */
export function isoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayIso(): string {
  return isoDate(new Date());
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** dd/mm/yyyy từ ISO; trống → '—'. */
export function viDate(iso?: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** dd/mm/yyyy HH:MM từ mốc ISO đầy đủ (giờ địa phương). */
export function viMoment(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Đọc ngày người dùng gõ: 'dd/mm/yyyy', 'dd/mm/yy', 'ddmmyy', 'ddmmyyyy', 'd-m-yy'
 * hoặc ISO. Trả ISO hoặc null.
 */
export function parseViDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  let d: number, m: number, y: number;
  const parts = s.split(/[/.\-\s]+/);
  if (parts.length === 3) {
    [d, m, y] = parts.map(Number);
  } else if (/^\d{6}$/.test(s) || /^\d{8}$/.test(s)) {
    d = +s.slice(0, 2);
    m = +s.slice(2, 4);
    y = +s.slice(4);
  } else return null;
  if (y < 100) y += 2000;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return isoDate(dt);
}

/** Số ngày từ hôm nay tới ngày ISO; âm = đã qua. */
export function daysFromToday(iso?: string | null): number {
  if (!iso) return 0;
  const t = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  const b = new Date(`${todayIso()}T00:00:00`).getTime();
  return Math.round((t - b) / 86_400_000);
}

/** 1.234.567 — phân cách nghìn bằng dấu chấm, không thập phân (NT-08). */
export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const r = Math.round(n);
  const s = Math.abs(r)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return r < 0 ? `−${s}` : s;
}

/** Tiền kèm đơn vị: 1.234.567 đ */
export function vnd(n: number | null | undefined): string {
  const s = money(n);
  return s === '—' ? s : `${s} đ`;
}

/** Rút gọn cho thẻ số liệu: 1,25 tỷ · 350 tr. */
export function vndShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1e9) return `${sign}${(a / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  if (a >= 1e6) return `${sign}${(a / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  return `${sign}${money(a)} đ`;
}

/** Số có phần thập phân (đơn giá ngoại tệ, tỷ giá). */
export function num(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN', { maximumFractionDigits: digits });
}

/** 0.25 → '25%' */
export function pct(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toLocaleString('vi-VN', { maximumFractionDigits: digits })}%`;
}

/** Đọc số tiền người dùng gõ: bỏ dấu chấm nghìn, nhận dấu phẩy thập phân. */
export function parseMoney(raw: string): number {
  const s = raw.replace(/\s|đ/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(s.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function sum<T>(arr: readonly T[], f: (x: T) => number): number {
  let s = 0;
  for (const x of arr) s += f(x) || 0;
  return s;
}

/** Bỏ dấu tiếng Việt, chữ thường — dùng cho tìm kiếm free-text. */
export function fold(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Mọi từ trong q đều có mặt trong một trong các trường. */
export function matches(q: string, ...fields: (string | number | null | undefined)[]): boolean {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = fold(fields.map((f) => (f === null || f === undefined ? '' : String(f))).join(' '));
  return words.every((w) => hay.includes(w));
}

export function uid(prefix = ''): string {
  const r = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}${Date.now().toString(36)}${r[0].toString(36)}${r[1].toString(36)}`.slice(0, 24);
}

/** 'KH' + 4 chữ số kế tiếp trong danh sách mã hiện có. */
export function nextCode(prefix: string, existing: readonly string[], width = 4): string {
  let max = 0;
  for (const c of existing) {
    if (!c.startsWith(prefix)) continue;
    const n = Number(c.slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return prefix + String(max + 1).padStart(width, '0');
}

/** Năm 2 chữ số theo ngày ISO. */
export function yy(iso: string): string {
  return iso.slice(2, 4);
}

export function quarterOf(iso: string): number {
  return Math.floor((Number(iso.slice(5, 7)) - 1) / 3) + 1;
}

/** Đọc tiền bằng chữ (in phiếu). */
export function moneyInWords(n: number): string {
  const units = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const big = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];
  const v = Math.round(Math.abs(n));
  if (v === 0) return 'Không đồng';
  const read3 = (x: number, full: boolean): string => {
    const h = Math.floor(x / 100);
    const t = Math.floor((x % 100) / 10);
    const u = x % 10;
    const out: string[] = [];
    if (full || h > 0) out.push(`${units[h]} trăm`);
    if (t > 1) {
      out.push(`${units[t]} mươi`);
      if (u === 1) out.push('mốt');
      else if (u === 5) out.push('lăm');
      else if (u > 0) out.push(units[u]);
    } else if (t === 1) {
      out.push('mười');
      if (u === 5) out.push('lăm');
      else if (u > 0) out.push(units[u]);
    } else if (u > 0) {
      if (full || h > 0) out.push('lẻ');
      out.push(units[u]);
    }
    return out.join(' ');
  };
  const groups: number[] = [];
  let x = v;
  while (x > 0) {
    groups.push(x % 1000);
    x = Math.floor(x / 1000);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    parts.push(read3(groups[i], i < groups.length - 1) + big[i]);
  }
  const s = parts.join(' ').replace(/\s+/g, ' ').trim();
  return `${s.charAt(0).toUpperCase()}${s.slice(1)} đồng`;
}
