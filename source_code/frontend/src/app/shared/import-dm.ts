import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Store, kiemMST } from '../core/store';
import { ChiPhiHD, KhachHang, Kho, LoaiChiPhi, LoaiHang, NHOM_HANG, NguonTien, NhaCungCap, NhomHang, PhieuThuChi } from '../core/models';
import { TT } from '../core/trang-thai';
import { fold, money, todayIso } from '../core/util';
import { parseSo } from '../hdm/hdm-util';
import { docBang } from './excel';
import { parseNgay } from './import-hd';
import { xuatXlsx } from './export';
import { Modal } from './ui-kit';
import { Icon } from './icon';

/**
 * Import từ Excel: danh mục (Khách hàng, Nhà cung cấp, Mã hàng, Kho) và Kế toán (Nguồn tiền, Loại chi phí, Phiếu thu, Phiếu chi, Chi phí HĐ).
 * Phiếu thu / chi và Chi phí HĐ vào ở trạng thái Nháp — kế toán kiểm tra rồi Gửi duyệt như thường.
 * Tải file mẫu (backend dựng .xlsx) → điền → chọn file → xem trước từng dòng → import dòng hợp lệ.
 * Cột đọc theo TÊN tiêu đề. Dòng trùng bản ghi đã có (hoặc trùng trong file) bị bỏ qua, không ghi đè.
 */
export type LoaiDm = 'kh' | 'ncc' | 'mh' | 'kho' | 'nguon' | 'lcp' | 'thu' | 'chi' | 'cp';

interface Cot {
  ten: string;
  rong: number;
  huongDan: string;
}

interface DongKq {
  /** Số dòng trong Excel. */
  dong: number;
  ten: string;
  khoa: string;
  loi: string[];
  /** Ghi vào Store; trả lỗi (nếu có). */
  luu: () => string | null;
}

interface CauHinhDm {
  ten: string;
  tenSo: string;
  tep: string;
  /** Cột bắt buộc có trong tiêu đề — dùng để tìm dòng tiêu đề. */
  neo: string;
  cot: Cot[];
  viDu: string[][];
}

const CAU_HINH: Record<LoaiDm, CauHinhDm> = {
  kh: {
    ten: 'khách hàng',
    tenSo: 'Khách hàng',
    tep: 'mau-import-khach-hang.xlsx',
    neo: 'Tên khách hàng',
    cot: [
      { ten: 'Tên khách hàng', rong: 34, huongDan: 'Bắt buộc.' },
      { ten: 'Tên viết tắt', rong: 16, huongDan: 'Tuỳ chọn, VD KCN-A.' },
      { ten: 'MST', rong: 16, huongDan: 'Bắt buộc, 10 số hoặc 10 số-3 số (VD 0101248141-001). Trùng MST đã có → bỏ qua. Nên định dạng ô là Text để giữ số 0 đầu.' },
      { ten: 'Địa chỉ', rong: 36, huongDan: 'Tuỳ chọn.' },
      { ten: 'Người liên hệ', rong: 20, huongDan: 'Tuỳ chọn.' },
      { ten: 'Điện thoại', rong: 14, huongDan: 'Tuỳ chọn.' },
      { ten: 'Email', rong: 24, huongDan: 'Tuỳ chọn.' },
      { ten: 'Tỉnh', rong: 14, huongDan: 'Tuỳ chọn.' },
      { ten: 'Email Sale phụ trách', rong: 24, huongDan: 'Email tài khoản Sale. Trống = theo quy tắc của app (Sale tự import thì mình phụ trách, còn lại chưa phân bổ). Cần quyền phân bổ KH.' },
      { ten: 'Ghi chú', rong: 24, huongDan: 'Tuỳ chọn.' },
    ],
    viDu: [['Công ty TNHH Ví Dụ (xoá dòng này)', 'VIDU', '0101234567', '12 Phố Mẫu, Hà Nội', 'Nguyễn Văn A', '0900000000', 'a@vidu.vn', 'Hà Nội', '', '']],
  },
  ncc: {
    ten: 'nhà cung cấp',
    tenSo: 'Nhà cung cấp',
    tep: 'mau-import-nha-cung-cap.xlsx',
    neo: 'Tên nhà cung cấp',
    cot: [
      { ten: 'Tên nhà cung cấp', rong: 34, huongDan: 'Bắt buộc. Trùng tên hoặc MST đã có → bỏ qua.' },
      { ten: 'MST', rong: 16, huongDan: 'Tuỳ chọn (NCC nước ngoài có thể trống).' },
      { ten: 'Địa chỉ', rong: 36, huongDan: 'Tuỳ chọn.' },
      { ten: 'Quốc gia', rong: 14, huongDan: 'Tuỳ chọn, VD Việt Nam, Trung Quốc.' },
      { ten: 'Người liên hệ', rong: 20, huongDan: 'Tuỳ chọn.' },
      { ten: 'Điện thoại', rong: 14, huongDan: 'Tuỳ chọn.' },
      { ten: 'Email', rong: 24, huongDan: 'Tuỳ chọn.' },
      { ten: 'Ghi chú', rong: 24, huongDan: 'Tuỳ chọn.' },
    ],
    viDu: [['Công ty Ví Dụ (xoá dòng này)', '', 'Thượng Hải', 'Trung Quốc', 'Mr. Li', '', 'li@vidu.cn', '']],
  },
  mh: {
    ten: 'mã hàng',
    tenSo: 'Mã hàng',
    tep: 'mau-import-ma-hang.xlsx',
    neo: 'Mã hàng',
    cot: [
      { ten: 'Mã hàng', rong: 16, huongDan: 'Bắt buộc, không có khoảng trắng (VD KC-NO-8L). Trùng mã đã có → bỏ qua.' },
      { ten: 'Tên', rong: 34, huongDan: 'Bắt buộc.' },
      { ten: 'Nhóm', rong: 20, huongDan: `Một trong: ${NHOM_HANG.join(' / ')}. Trống = Khí chuẩn.` },
      { ten: 'ĐVT', rong: 8, huongDan: 'Đơn vị tính, VD Bình, Chai, Cái. Trống = Bình.' },
      { ten: 'Mô tả', rong: 30, huongDan: 'Tuỳ chọn — hiện ở Tồn kho.' },
      { ten: 'Loại khí', rong: 14, huongDan: 'Tuỳ chọn, VD NO, SO2/NO/CO.' },
      { ten: 'Thể tích', rong: 10, huongDan: 'Tuỳ chọn, VD 8L, 500ml.' },
      { ten: 'Thuộc tính', rong: 20, huongDan: 'Thuộc tính ghi khi nhập lô, cách nhau dấu ;  VD "Nồng độ".' },
      { ten: 'Tên tham chiếu', rong: 30, huongDan: 'Tên đang ghi trên hoá đơn / hợp đồng → mã này, cách nhau dấu ;  (tuỳ chọn).' },
    ],
    viDu: [['KC-VIDU-8L', 'Khí chuẩn ví dụ 8L (xoá dòng này)', 'Khí chuẩn', 'Bình', 'Khí chuẩn NO bình 8L', 'NO', '8L', 'Nồng độ', 'NO chuẩn 8 lít']],
  },
  kho: {
    ten: 'kho',
    tenSo: 'Kho',
    tep: 'mau-import-kho.xlsx',
    neo: 'Tên kho',
    cot: [{ ten: 'Tên kho', rong: 34, huongDan: 'Bắt buộc. Mã kho tự sinh, loại "Kho thường". Trùng tên kho đã có → bỏ qua.' }],
    viDu: [['Kho ví dụ (xoá dòng này)']],
  },
  nguon: {
    ten: 'nguồn tiền',
    tenSo: 'Nguồn tiền',
    tep: 'mau-import-nguon-tien.xlsx',
    neo: 'Mã nguồn',
    cot: [
      { ten: 'Mã nguồn', rong: 14, huongDan: 'Bắt buộc, duy nhất (VD VCB-OXY), không có khoảng trắng. Trùng mã đã có → bỏ qua.' },
      { ten: 'Tên', rong: 30, huongDan: 'Bắt buộc.' },
      { ten: 'Công ty', rong: 10, huongDan: 'Bắt buộc: OXY hoặc KOXY (KHÍ OXY).' },
      { ten: 'Loại', rong: 14, huongDan: 'Tiền mặt hoặc Ngân hàng. Trống = Ngân hàng.' },
      { ten: 'Số tài khoản', rong: 18, huongDan: 'Tuỳ chọn. Nên định dạng ô là Text để giữ số 0 đầu.' },
      { ten: 'Ngân hàng', rong: 20, huongDan: 'Tuỳ chọn.' },
      { ten: 'Số dư đầu kỳ', rong: 16, huongDan: 'Số tiền VNĐ. Trống = 0.' },
      { ten: 'Ngày đầu kỳ', rong: 14, huongDan: 'dd/mm/yyyy. Trống = hôm nay.' },
    ],
    viDu: [['VIDU-OXY', 'Tài khoản ví dụ (xoá dòng này)', 'OXY', 'Ngân hàng', '0123456789', 'Vietcombank', '50000000', '01/01/2026']],
  },
  lcp: {
    ten: 'loại chi phí',
    tenSo: 'Loại chi phí',
    tep: 'mau-import-loai-chi-phi.xlsx',
    neo: 'Tên loại chi phí',
    cot: [
      { ten: 'Tên loại chi phí', rong: 34, huongDan: 'Bắt buộc. Trùng tên trong cùng nhóm → bỏ qua. Mã tự sinh.' },
      { ten: 'Nhóm', rong: 18, huongDan: 'Bắt buộc: Vận hành (chi sổ quỹ chung) hoặc Thực hiện HĐ (chi phí theo HĐ bán).' },
    ],
    viDu: [['Tiền điện ví dụ (xoá dòng này)', 'Vận hành']],
  },
  thu: {
    ten: 'phiếu thu',
    tenSo: 'Phiếu thu',
    tep: 'mau-import-phieu-thu.xlsx',
    neo: 'Ngày lập',
    cot: [
      { ten: 'Ngày lập', rong: 14, huongDan: 'Bắt buộc, dd/mm/yyyy.' },
      { ten: 'Nguồn tiền', rong: 20, huongDan: 'Bắt buộc: mã hoặc tên nguồn tiền đang dùng.' },
      { ten: 'Nội dung', rong: 40, huongDan: 'Bắt buộc.' },
      { ten: 'Số tiền', rong: 16, huongDan: 'Bắt buộc, > 0 (VNĐ).' },
      { ten: 'Ghi chú', rong: 24, huongDan: 'Tuỳ chọn.' },
    ],
    viDu: [['15/10/2026', 'VIDU-OXY', 'Thu tiền ví dụ (xoá dòng này)', '10000000', '']],
  },
  chi: {
    ten: 'phiếu chi',
    tenSo: 'Phiếu chi',
    tep: 'mau-import-phieu-chi.xlsx',
    neo: 'Ngày lập',
    cot: [
      { ten: 'Ngày lập', rong: 14, huongDan: 'Bắt buộc, dd/mm/yyyy.' },
      { ten: 'Nguồn tiền', rong: 20, huongDan: 'Bắt buộc: mã hoặc tên nguồn tiền đang dùng.' },
      { ten: 'Loại chi phí', rong: 24, huongDan: 'Bắt buộc: mã hoặc tên loại chi phí nhóm Vận hành.' },
      { ten: 'Nội dung', rong: 40, huongDan: 'Bắt buộc.' },
      { ten: 'Số tiền', rong: 16, huongDan: 'Bắt buộc, > 0 (VNĐ).' },
      { ten: 'Người nhận', rong: 20, huongDan: 'Tuỳ chọn.' },
      { ten: 'Ghi chú', rong: 24, huongDan: 'Tuỳ chọn.' },
    ],
    viDu: [['15/10/2026', 'VIDU-OXY', 'Tiền điện ví dụ', 'Chi tiền ví dụ (xoá dòng này)', '2000000', '', '']],
  },
  cp: {
    ten: 'chi phí HĐ',
    tenSo: 'Chi phí HĐ',
    tep: 'mau-import-chi-phi-hd.xlsx',
    neo: 'Số HĐ bán',
    cot: [
      { ten: 'Số HĐ bán', rong: 24, huongDan: 'Bắt buộc, đúng số HĐ bán đã có (từ Hiệu lực trở đi, không phải Báo giá).' },
      { ten: 'Ngày', rong: 14, huongDan: 'Bắt buộc, dd/mm/yyyy.' },
      { ten: 'Loại chi phí', rong: 24, huongDan: 'Bắt buộc: mã hoặc tên loại chi phí nhóm Thực hiện HĐ.' },
      { ten: 'Nội dung', rong: 40, huongDan: 'Bắt buộc.' },
      { ten: 'Số tiền', rong: 16, huongDan: 'Bắt buộc, > 0 (VNĐ).' },
      { ten: 'Nguồn tiền', rong: 20, huongDan: 'Bắt buộc: mã hoặc tên nguồn tiền chi ra.' },
      { ten: 'Người nhận', rong: 20, huongDan: 'Bắt buộc với Hoa hồng.' },
      { ten: 'Đơn vị vận chuyển', rong: 20, huongDan: 'Tuỳ chọn.' },
      { ten: 'Ghi chú', rong: 24, huongDan: 'Tuỳ chọn.' },
    ],
    viDu: [['260901/HĐKT/OMV-ABC', '15/10/2026', 'Vận chuyển', 'Chi phí ví dụ (xoá dòng này)', '1500000', 'VIDU-OXY', '', '', '']],
  },
};

/** Tìm dòng tiêu đề (có ô cột neo) → hàm lấy ô theo tên cột. */
function docTheoTieuDe(rows: string[][], neo: string): { du: string[][]; o: (r: string[], ten: string) => string; dauDong: number } | string {
  const i = rows.findIndex((r) => r.some((c) => fold(c) === fold(neo)));
  if (i < 0) return `Không thấy dòng tiêu đề có cột "${neo}" — dùng file mẫu`;
  const idx = new Map(rows[i].map((c, j) => [fold(c), j] as const));
  return { du: rows.slice(i + 1), o: (r, ten) => (r[idx.get(fold(ten)) ?? -1] ?? '').trim(), dauDong: i + 2 };
}

/** Tìm theo mã hoặc tên (không phân biệt hoa thường / dấu). */
const tim = <T extends { id: string; ten: string }>(ds: readonly T[], v: string): T | undefined => (v ? ds.find((x) => fold(x.id) === fold(v) || fold(x.ten) === fold(v)) : undefined);

const tach = (s: string) => s.split(/[;|]/).map((x) => x.trim()).filter(Boolean);

function docDong(loai: LoaiDm, rows: string[][], store: Store): DongKq[] | string {
  const t = docTheoTieuDe(rows, CAU_HINH[loai].neo);
  if (typeof t === 'string') return t;
  const { o } = t;
  const db = store.db();
  const trongFile = new Set<string>();
  const kq: DongKq[] = [];
  t.du.forEach((r, i) => {
    if (!r.some((c) => c.trim())) return;
    const dong = t.dauDong + i;
    const loi: string[] = [];
    const lap = (khoa: string, nhan: string) => {
      if (!khoa) return;
      if (trongFile.has(`${loai}:${khoa}`)) loi.push(`${nhan} trùng với dòng khác trong file`);
      else trongFile.add(`${loai}:${khoa}`);
    };
    if (loai === 'kh') {
      const ten = o(r, 'Tên khách hàng');
      const mst = o(r, 'MST');
      if (!ten) loi.push('Thiếu Tên khách hàng');
      const e = kiemMST(mst);
      if (e) loi.push(e);
      else if (db.khachHang.some((x) => fold(x.mst) === fold(mst))) loi.push(`MST ${mst} đã có trong danh mục`);
      else lap(fold(mst), 'MST');
      const email = o(r, 'Email Sale phụ trách');
      const sale = email ? db.taiKhoan.find((x) => fold(x.email) === fold(email))?.id : undefined;
      if (email && !sale) loi.push(`Không thấy tài khoản Sale ${email}`);
      const k: KhachHang = {
        id: '', ten, tenVietTat: o(r, 'Tên viết tắt') || undefined, mst, diaChi: o(r, 'Địa chỉ'), nguoiLienHe: o(r, 'Người liên hệ'),
        dienThoai: o(r, 'Điện thoại'), email: o(r, 'Email'), ghiChu: o(r, 'Ghi chú'), tinh: o(r, 'Tỉnh') || undefined, phuTrach: sale || undefined, import: true,
      };
      kq.push({ dong, ten: ten || '—', khoa: mst, loi, luu: () => store.saveKhachHang(k) });
    } else if (loai === 'ncc') {
      const ten = o(r, 'Tên nhà cung cấp');
      const mst = o(r, 'MST');
      if (!ten) loi.push('Thiếu Tên nhà cung cấp');
      else if (db.ncc.some((x) => fold(x.ten) === fold(ten))) loi.push(`Tên "${ten}" đã có trong danh mục`);
      else lap(fold(ten), 'Tên');
      if (mst) {
        if (db.ncc.some((x) => fold(x.mst) === fold(mst))) loi.push(`MST ${mst} đã có trong danh mục`);
        else lap(`mst:${fold(mst)}`, 'MST');
      }
      const n: NhaCungCap = {
        id: '', ten, mst, diaChi: o(r, 'Địa chỉ'), quocGia: o(r, 'Quốc gia'), nguoiLienHe: o(r, 'Người liên hệ'), dienThoai: o(r, 'Điện thoại'),
        email: o(r, 'Email'), ghiChu: o(r, 'Ghi chú'),
      };
      kq.push({ dong, ten: ten || '—', khoa: mst, loi, luu: () => store.saveNCC(n) });
    } else if (loai === 'mh') {
      const ma = o(r, 'Mã hàng');
      const ten = o(r, 'Tên');
      if (!ma) loi.push('Thiếu Mã hàng');
      else if (/\s/.test(ma)) loi.push('Mã hàng không chứa khoảng trắng');
      else if (store.loaiHangById(ma)) loi.push(`Mã ${ma} đã có trong danh mục`);
      else lap(fold(ma), 'Mã hàng');
      if (!ten) loi.push('Thiếu Tên');
      const nhomRaw = o(r, 'Nhóm');
      const nhom = nhomRaw ? NHOM_HANG.find((x) => fold(x) === fold(nhomRaw)) : 'Khí chuẩn';
      if (!nhom) loi.push(`Nhóm "${nhomRaw}" không hợp lệ (${NHOM_HANG.join(' / ')})`);
      const l: LoaiHang = {
        id: ma, ten, moTa: o(r, 'Mô tả') || undefined, nhom: (nhom ?? 'Khí chuẩn') as NhomHang, dvt: o(r, 'ĐVT') || 'Bình',
        thuocTinh: tach(o(r, 'Thuộc tính')), dangDung: true, loaiKhi: o(r, 'Loại khí') || undefined, theTich: o(r, 'Thể tích') || undefined,
        bietDanh: tach(o(r, 'Tên tham chiếu')),
      };
      kq.push({ dong, ten: ma ? `${ma} — ${ten}` : ten || '—', khoa: ma, loi, luu: () => store.saveLoaiHang(l, true) });
    } else if (loai === 'nguon') {
      const ma = o(r, 'Mã nguồn');
      const ten = o(r, 'Tên');
      if (!ma) loi.push('Thiếu Mã nguồn');
      else if (/\s/.test(ma)) loi.push('Mã nguồn không chứa khoảng trắng');
      else if (store.nguonById(ma)) loi.push(`Mã ${ma} đã có`);
      else lap(fold(ma), 'Mã nguồn');
      if (!ten) loi.push('Thiếu Tên');
      const ct = fold(o(r, 'Công ty')).replace(/\s/g, '');
      const congTy = ct === 'oxy' ? 'OXY' : ct === 'koxy' || ct === 'khioxy' ? 'KOXY' : undefined;
      if (!congTy) loi.push('Công ty phải là OXY hoặc KOXY');
      const loaiRaw = o(r, 'Loại');
      const loaiN = !loaiRaw ? 'Ngân hàng' : fold(loaiRaw) === fold('Tiền mặt') ? 'Tiền mặt' : fold(loaiRaw) === fold('Ngân hàng') ? 'Ngân hàng' : undefined;
      if (!loaiN) loi.push('Loại phải là Tiền mặt hoặc Ngân hàng');
      const ngay = parseNgay(o(r, 'Ngày đầu kỳ'));
      if (ngay === null) loi.push('Ngày đầu kỳ không hợp lệ (dd/mm/yyyy)');
      const n: NguonTien = {
        id: ma, ten, congTy: congTy ?? 'OXY', loai: loaiN ?? 'Ngân hàng', soTaiKhoan: o(r, 'Số tài khoản') || undefined, nganHang: o(r, 'Ngân hàng') || undefined,
        soDuDauKy: parseSo(o(r, 'Số dư đầu kỳ')), ngayDauKy: ngay || todayIso(), trangThai: TT.DANG_DUNG,
      };
      kq.push({ dong, ten: ma ? `${ma} — ${ten}` : ten || '—', khoa: '', loi, luu: () => store.saveNguonTien(n, true) });
    } else if (loai === 'lcp') {
      const ten = o(r, 'Tên loại chi phí');
      const nhomRaw = o(r, 'Nhóm');
      const nhom = (['Vận hành', 'Thực hiện HĐ'] as const).find((x) => fold(x) === fold(nhomRaw));
      if (!ten) loi.push('Thiếu Tên loại chi phí');
      if (!nhom) loi.push('Nhóm phải là Vận hành hoặc Thực hiện HĐ');
      else if (ten) {
        if (db.loaiChiPhi.some((x) => x.nhom === nhom && fold(x.ten) === fold(ten))) loi.push(`"${ten}" đã có trong nhóm ${nhom}`);
        else lap(`${nhom}:${fold(ten)}`, 'Tên');
      }
      const l: LoaiChiPhi = { id: '', ten, nhom: nhom ?? 'Vận hành', dangDung: true };
      kq.push({ dong, ten: ten || '—', khoa: nhom ?? '', loi, luu: () => store.saveLoaiChiPhi(l) });
    } else if (loai === 'thu' || loai === 'chi') {
      const ngay = parseNgay(o(r, 'Ngày lập'));
      if (!ngay) loi.push(ngay === null ? 'Ngày lập không hợp lệ (dd/mm/yyyy)' : 'Thiếu Ngày lập');
      const nguon = tim(store.nguonDangDung(), o(r, 'Nguồn tiền'));
      if (!nguon) loi.push(o(r, 'Nguồn tiền') ? `Không thấy nguồn tiền "${o(r, 'Nguồn tiền')}" đang dùng` : 'Thiếu Nguồn tiền');
      const soTien = parseSo(o(r, 'Số tiền'));
      const p: PhieuThuChi = { ...store.newPhieu(loai === 'thu' ? 'Thu' : 'Chi'), ngayLap: ngay || '', nguonTien: nguon?.id ?? '', noiDung: o(r, 'Nội dung'), ghiChu: o(r, 'Ghi chú') || undefined };
      if (loai === 'thu') p.soTienThu = soTien;
      else {
        p.soTienChi = soTien;
        p.nguoiNhan = o(r, 'Người nhận') || undefined;
        const lcp = tim(store.lcpVanHanh(), o(r, 'Loại chi phí'));
        if (!lcp) loi.push(o(r, 'Loại chi phí') ? `Không thấy loại chi phí nhóm Vận hành "${o(r, 'Loại chi phí')}"` : 'Thiếu Loại chi phí');
        p.loaiChiPhi = lcp?.id;
      }
      if (!loi.length) loi.push(...store.loiPhieu(p));
      kq.push({ dong, ten: p.noiDung || '—', khoa: soTien > 0 ? `${money(soTien)} đ` : '', loi, luu: () => store.savePhieu(p, false) });
    } else if (loai === 'cp') {
      const soHD = o(r, 'Số HĐ bán');
      const hdb = soHD ? db.hopDongBan.find((x) => fold(x.soHD) === fold(soHD)) : undefined;
      if (!soHD) loi.push('Thiếu Số HĐ bán');
      else if (!hdb) loi.push(`Không thấy HĐ bán "${soHD}"`);
      const ngay = parseNgay(o(r, 'Ngày'));
      if (!ngay) loi.push(ngay === null ? 'Ngày không hợp lệ (dd/mm/yyyy)' : 'Thiếu Ngày');
      const lcp = tim(store.lcpThucHien(), o(r, 'Loại chi phí'));
      if (!lcp) loi.push(o(r, 'Loại chi phí') ? `Không thấy loại chi phí nhóm Thực hiện HĐ "${o(r, 'Loại chi phí')}"` : 'Thiếu Loại chi phí');
      const nguon = tim(store.nguonDangDung(), o(r, 'Nguồn tiền'));
      if (!nguon) loi.push(o(r, 'Nguồn tiền') ? `Không thấy nguồn tiền "${o(r, 'Nguồn tiền')}" đang dùng` : 'Thiếu Nguồn tiền');
      const soTien = parseSo(o(r, 'Số tiền'));
      const c: ChiPhiHD = {
        ...store.newChiPhi(hdb?.id ?? ''), ngay: ngay || '', loaiChiPhi: lcp?.id ?? '', noiDung: o(r, 'Nội dung'), soTien, nguonTien: nguon?.id ?? '',
        nguoiNhan: o(r, 'Người nhận') || undefined, donViVanChuyen: o(r, 'Đơn vị vận chuyển') || undefined, ghiChu: o(r, 'Ghi chú') || undefined,
      };
      if (!loi.length) loi.push(...store.loiChiPhi(c));
      kq.push({ dong, ten: c.noiDung || '—', khoa: soHD, loi, luu: () => store.saveChiPhi(c, false) });
    } else {
      const ten = o(r, 'Tên kho');
      if (!ten) loi.push('Thiếu Tên kho');
      else if (db.kho.some((x) => fold(x.ten) === fold(ten))) loi.push(`Kho "${ten}" đã có`);
      else lap(fold(ten), 'Tên kho');
      const k: Kho = { id: '', ten, loai: 'Kho thường', dangDung: true };
      kq.push({ dong, ten: ten || '—', khoa: '', loi, luu: () => store.saveKho(k) });
    }
  });
  return kq;
}

/** Nút "Import Excel" + popup cho danh mục và dữ liệu kế toán: tải file mẫu → chọn file → kiểm tra → import dòng hợp lệ. */
@Component({
  selector: 'app-import-dm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Icon],
  template: `
    <button type="button" class="btn quiet" (click)="mo()"><app-icon name="upload" [size]="16" /> Import Excel</button>
    <app-modal [open]="open()" [title]="'Import ' + ch().ten + ' từ Excel'" sub="Tải file mẫu → điền → chọn file → kiểm tra → Import" size="lg" [dirty]="!!kq().length" (closed)="dong()">
      <section class="dan-buoc">
        <h3><span class="so">1</span> Tải file mẫu, điền {{ ch().ten }}</h3>
        <p class="sub">Mỗi dòng 1 {{ ch().ten }}. Xem cách điền từng cột ở sheet "Hướng dẫn"; xoá dòng ví dụ trước khi điền.</p>
        <button type="button" class="btn quiet" (click)="taiMau()"><app-icon name="download" [size]="16" /> Tải file mẫu (.xlsx)</button>
      </section>
      <section class="dan-buoc">
        <h3><span class="so">2</span> Chọn file đã điền</h3>
        <label class="drop">
          <input type="file" accept=".xlsx,.csv,.txt" (change)="chonFile($event)" />
          <app-icon name="upload" [size]="16" />
          <span>{{ dangDoc() ? 'Đang đọc tệp…' : tenFile() || 'Chọn file Excel (.xlsx) hoặc CSV' }}</span>
        </label>
        @if (loiFile()) { <div class="note bad">{{ loiFile() }}</div> }
      </section>
      @if (kq().length) {
        <section class="dan-buoc">
          <h3><span class="so">3</span> Kiểm tra: {{ hopLe().length }} dòng hợp lệ · {{ kq().length - hopLe().length }} dòng lỗi (bỏ qua)</h3>
          <div class="tbl-wrap">
            <table class="tbl compact">
              <thead><tr><th>Dòng Excel</th><th>{{ ch().tenSo }}</th><th>Kết quả</th></tr></thead>
              <tbody>
                @for (x of kq(); track x.dong) {
                  <tr>
                    <td class="sub">{{ x.dong }}</td>
                    <td><b>{{ x.ten }}</b>@if (x.khoa) { <span class="sub"> · {{ x.khoa }}</span> }</td>
                    <td>
                      @if (x.loi.length) { <div class="neg sub">@for (e of x.loi; track $index) { <div>{{ e }}</div> }</div> }
                      @else { <span class="tag ok">Hợp lệ</span> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="dong()">Huỷ</button>
        <button type="button" class="btn" [disabled]="!hopLe().length" (click)="chay()">Import {{ hopLe().length }} {{ ch().ten }}</button>
      </div>
    </app-modal>
  `,
})
export class ImportDm {
  private readonly store = inject(Store);
  readonly loai = input.required<LoaiDm>();
  protected readonly ch = computed(() => CAU_HINH[this.loai()]);
  protected readonly open = signal(false);
  protected readonly dangDoc = signal(false);
  protected readonly tenFile = signal('');
  protected readonly loiFile = signal('');
  protected readonly kq = signal<DongKq[]>([]);
  protected readonly hopLe = computed(() => this.kq().filter((x) => !x.loi.length));

  protected mo(): void {
    this.kq.set([]);
    this.tenFile.set('');
    this.loiFile.set('');
    this.open.set(true);
  }
  protected dong(): void {
    this.open.set(false);
  }

  protected taiMau(): void {
    const c = this.ch();
    void xuatXlsx(c.tep, [
      { ten: c.tenSo, tieuDe: true, rong: c.cot.map((x) => x.rong), dong: [c.cot.map((x) => x.ten), ...c.viDu] },
      {
        ten: 'Hướng dẫn',
        tieuDe: true,
        rong: [24, 100],
        dong: [
          ['Cột', 'Cách điền'],
          ...c.cot.map((x) => [x.ten, x.huongDan]),
          ['Lưu ý', 'Chỉ sheet đầu tiên được đọc. Xoá dòng ví dụ trước khi điền. Giữ nguyên dòng tiêu đề (đổi thứ tự cột được).'],
        ],
      },
    ]);
  }

  protected async chonFile(e: Event): Promise<void> {
    const el = e.target as HTMLInputElement;
    const file = el.files?.[0];
    el.value = '';
    if (!file) return;
    this.dangDoc.set(true);
    this.loiFile.set('');
    this.kq.set([]);
    this.tenFile.set(file.name);
    try {
      const r = docDong(this.loai(), await docBang(file), this.store);
      if (typeof r === 'string') this.loiFile.set(r);
      else if (!r.length) this.loiFile.set('File không có dòng dữ liệu nào dưới dòng tiêu đề');
      else this.kq.set(r);
    } catch (err) {
      this.loiFile.set(err instanceof Error ? err.message : 'Không đọc được tệp');
    } finally {
      this.dangDoc.set(false);
    }
  }

  /** Lưu từng dòng hợp lệ qua Store (đẩy lên backend); lỗi của Store ghi lại theo số dòng Excel. */
  protected chay(): void {
    let ok = 0;
    const loi: string[] = [];
    for (const x of this.hopLe()) {
      const e = x.luu();
      if (e) loi.push(`dòng ${x.dong}: ${e}`);
      else ok++;
    }
    this.store.say(`Đã import ${ok} ${this.ch().ten}${loi.length ? ` · ${loi.length} lỗi: ${loi.slice(0, 3).join('; ')}${loi.length > 3 ? '…' : ''}` : ''}`, loi.length ? 'bad' : 'ok');
    if (!loi.length) this.open.set(false);
    else this.kq.set([]);
  }
}
