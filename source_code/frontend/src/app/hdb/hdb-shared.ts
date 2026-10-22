import { DotTTBan, HopDongBan } from '../core/models';
import { apDungTuDongHdb } from '../core/calc';

/** Trường thực thu do Kế toán ghi qua store.ghiThucThu — không lấy từ bản nháp. */
type ThucThu = Pick<DotTTBan, 'ngayThu' | 'soTienThu' | 'nguonTienNhan' | 'phieuThuId'>;

function thucThu(d?: DotTTBan): ThucThu {
  return { ngayThu: d?.ngayThu, soTienThu: d?.soTienThu, nguonTienNhan: d?.nguonTienNhan, phieuThuId: d?.phieuThuId };
}

/**
 * Ghép bản nháp với bản đã lưu: Trạng thái và các trường thực thu luôn theo bản đã lưu
 * (chúng đổi qua luồng riêng — chuyển trạng thái, giao hàng, ghi thực thu).
 */
export function ghepNhap(nhap: HopDongBan, luu: HopDongBan | null | undefined): HopDongBan {
  if (!luu) return nhap;
  // Ngày hiệu lực / hạn TT phụ thuộc ngày thu tạm ứng (ghi ở luồng riêng) → tính lại sau khi ghép.
  return apDungTuDongHdb({
    ...nhap,
    trangThai: luu.trangThai,
    dotTT: nhap.dotTT.map((d) => ({ ...d, ...thucThu(luu.dotTT.find((x) => x.dot === d.dot)) })),
  });
}

/** Dấu vân tay phần người dùng sửa được (bỏ trạng thái + thực thu) để biết nháp có thay đổi chưa. */
export function vanTay(h: HopDongBan | null | undefined): string {
  if (!h) return '';
  return JSON.stringify({
    ...h,
    trangThai: '',
    dotTT: h.dotTT.map((d) => ({ dot: d.dot, tyLe: d.tyLe, soTien: d.soTien, han: d.han, hanNgay: d.hanNgay, ghiChu: d.ghiChu })),
  });
}
