import { CoHoiKH, GiaiDoanCH, KhachHang } from '../core/models';

/** Một cơ hội kèm khách hàng sở hữu. */
export interface CoHoiRow {
  c: CoHoiKH;
  k: KhachHang;
}

export const dangMo = (g: GiaiDoanCH) => g === 'Mới' || g === 'Đã báo giá' || g === 'Đang đàm phán';

export function layCoHoi(ks: readonly KhachHang[]): CoHoiRow[] {
  return ks.flatMap((k) => (k.dsCoHoi ?? []).map((c) => ({ c, k })));
}

/** Toạ độ polyline của đường sparkline (khung w×h, có lề 2px). Ít hơn 2 điểm thì vẽ đường phẳng. */
export function diemSpark(vals: readonly number[], w = 96, h = 30): string {
  const v = vals.length > 1 ? vals : [0, 0];
  const max = Math.max(...v);
  const min = Math.min(...v);
  const kd = max - min || 1;
  return v.map((x, i) => `${((i / (v.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 2 - ((x - min) / kd) * (h - 4)).toFixed(1)}`).join(' ');
}

/** "▲ 2" / "▼ 1" / "" so với kỳ trước. */
export const chenhLech = (nay: number, truoc: number) => (nay === truoc ? 0 : nay > truoc ? 1 : -1);

/** Mã CH kế tiếp (CH-0001…) theo mã lớn nhất đang có. */
export function maCoHoiMoi(ks: readonly KhachHang[]): string {
  let max = 0;
  for (const { c } of layCoHoi(ks)) max = Math.max(max, Number(/(\d+)$/.exec(c.id)?.[1] ?? 0));
  return 'CH-' + String(max + 1).padStart(4, '0');
}
