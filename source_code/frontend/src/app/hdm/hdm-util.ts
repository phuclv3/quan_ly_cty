/** Hàm thuần riêng màn HĐ Mua: đọc dữ liệu dán từ Excel (HDM-05). */
import { DongHangMua, LoaiHang, LoaiTien } from '../core/models';
import { fold, uid } from '../core/util';

/** Đọc số từ ô Excel: nhận "1.234,5", "1,234.5", "1234.5", "1.234" (= 1234). */
export function parseSo(raw: string | undefined): number {
  let s = (raw ?? '').replace(/[\s đ$¥]/g, '');
  if (!s) return 0;
  const coPhay = s.includes(',');
  const coCham = s.includes('.');
  if (coPhay && coCham) {
    // Dấu xuất hiện sau cùng là dấu thập phân.
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (coPhay) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) && s.split(',').length > 2 ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (coCham) {
    if (s.split('.').length > 2 || /^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
  }
  const n = Number(s.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function parseLoaiTien(raw: string | undefined): LoaiTien {
  const s = fold(raw).replace(/[^a-z]/g, '');
  if (s === 'usd' || s === 'us') return 'USD';
  if (s === 'rmb' || s === 'cny' || s === 'ndt' || s === 'te') return 'RMB';
  return 'VNĐ';
}

/** Đoán Loại hàng theo tên: trùng tên → tên loại nằm trong tên hàng (dài nhất trước). */
export function doanLoaiHang(ten: string, ds: readonly LoaiHang[]): LoaiHang | undefined {
  const t = fold(ten).trim();
  if (!t) return undefined;
  const dung = ds.filter((l) => l.dangDung);
  return (
    dung.find((l) => fold(l.ten).trim() === t) ??
    [...dung].sort((a, b) => b.ten.length - a.ten.length).find((l) => t.includes(fold(l.ten).trim()))
  );
}

/** Thứ tự cột khi dán / tải file (HDM-05). */
export const COT_DONG_HANG = ['Tên hàng', 'Thông số', 'SL', 'Đơn giá', 'Loại tiền', 'Tỷ giá'];

/**
 * Mỗi dòng: Tên hàng, Thông số, SL, Đơn giá, Loại tiền, Tỷ giá (cột thừa bỏ qua).
 * Bỏ dòng trống (không đếm) và dòng tiêu đề / thiếu tên / SL không phải số > 0 (đếm vào boQua).
 */
export function parseDongHang(rows: readonly string[][], ds: readonly LoaiHang[]): { dong: DongHangMua[]; boQua: number } {
  const dong: DongHangMua[] = [];
  let boQua = 0;
  for (const c of rows) {
    if (!c.some((x) => x.trim())) continue;
    const ten = c[0] ?? '';
    const sl = parseSo(c[2]);
    if (!ten || !(sl > 0)) {
      boQua++;
      continue;
    }
    const loaiTien = parseLoaiTien(c[4]);
    const lh = doanLoaiHang(ten, ds);
    dong.push({
      id: uid('DM'),
      loaiHang: lh?.id ?? '',
      tenHang: ten,
      thongSo: c[1] ?? '',
      soLuong: sl,
      dvt: lh?.dvt ?? '',
      donGia: parseSo(c[3]),
      loaiTien,
      tyGia: loaiTien === 'VNĐ' ? 1 : parseSo(c[5]),
    });
  }
  return { dong, boQua };
}

/** Dữ liệu dán từ Excel: các cột cách nhau bằng Tab. */
export function parseDanExcel(text: string, ds: readonly LoaiHang[]): { dong: DongHangMua[]; boQua: number } {
  return parseDongHang(text.split(/\r?\n/).map((l) => l.split('\t').map((x) => x.trim())), ds);
}
