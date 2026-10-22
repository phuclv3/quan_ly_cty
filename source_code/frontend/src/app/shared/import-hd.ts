import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Store, kiemMST } from '../core/store';
import { DongHangBan, DongHangMua, HopDongBan, HopDongMua, KhachHang, LoaiHang, NhaCungCap } from '../core/models';
import { apDungTuDongHdb, hdbThieuDeChuyen, hdmTong, sauVAT, tongDongBan } from '../core/calc';
import { fold, money, uid } from '../core/util';
import { taiBlob } from '../core/files';
import { doanLoaiHang, parseLoaiTien, parseSo } from '../hdm/hdm-util';
import { docBang, taoXlsx } from './excel';
import { Modal } from './ui-kit';
import { Icon } from './icon';

/**
 * Import nhiều HĐ bán / HĐ mua từ 1 file Excel.
 * Mỗi dòng = 1 dòng hàng; các dòng cùng "Số HĐ" gộp thành 1 HĐ (thông tin HĐ lấy ở dòng đầu tiên của nhóm).
 * Cột đọc theo TÊN tiêu đề (đổi thứ tự cột vẫn được). KH / NCC chưa có trong danh mục → tạo mới (cần MST với KH).
 */
export type LoaiImport = 'ban' | 'mua';

interface CotMau {
  ten: string;
  rong: number;
  huongDan: string;
}

const COT_BAN: CotMau[] = [
  { ten: 'Số HĐ', rong: 22, huongDan: 'Bắt buộc. Các dòng cùng Số HĐ gộp thành 1 HĐ (mỗi dòng 1 sản phẩm). Trùng Số HĐ đã có trong app → bỏ qua.' },
  { ten: 'Ngày ký', rong: 12, huongDan: 'dd/mm/yyyy. Bắt buộc khi Trạng thái = Hiệu lực. Ngày hiệu lực tự = Ngày ký.' },
  { ten: 'Trạng thái', rong: 12, huongDan: '"Báo giá" (mặc định) hoặc "Hiệu lực" (cần Số HĐ, MST, Ngày ký, Giá trị > 0).' },
  { ten: 'Mã KH', rong: 10, huongDan: 'Tuỳ chọn. Tìm KH theo Mã KH → MST → Tên. Không thấy → tạo KH mới (cần Tên + MST).' },
  { ten: 'Tên khách hàng', rong: 34, huongDan: 'Bắt buộc nếu không có Mã KH.' },
  { ten: 'MST', rong: 14, huongDan: '10 số hoặc 10 số-3 số. Bắt buộc khi tạo KH mới.' },
  { ten: 'Địa chỉ', rong: 30, huongDan: 'Tuỳ chọn — trống thì lấy theo danh mục KH.' },
  { ten: 'Email Sale', rong: 22, huongDan: 'Email tài khoản Sale phụ trách. Trống = người import.' },
  { ten: 'VAT %', rong: 7, huongDan: '0, 8 hoặc 10 (mặc định 8).' },
  { ten: 'Giá trị trước VAT', rong: 16, huongDan: 'Chỉ dùng khi HĐ không có dòng sản phẩm. Có sản phẩm thì tự cộng SL × Đơn giá.' },
  { ten: 'GTHĐ thực tế trước VAT', rong: 16, huongDan: 'Chỉ dùng khi không có dòng sản phẩm (giá vốn dự kiến).' },
  { ten: 'Đợt TT (%)', rong: 12, huongDan: 'Tỷ lệ các đợt cách nhau dấu ;  VD "30;70". Số tiền đợt = % × Giá trị sau VAT.' },
  { ten: 'Hạn đợt (ngày)', rong: 12, huongDan: 'Số ngày từ ngày hiệu lực cho từng đợt, VD "15;30" (mặc định 30).' },
  { ten: 'Ghi chú', rong: 24, huongDan: 'Tuỳ chọn.' },
  { ten: 'Mã hàng', rong: 14, huongDan: 'Mã trong danh mục kho (xem sheet "Mã hàng"). Trống cả Mã hàng và SL → dòng chỉ có thông tin HĐ.' },
  { ten: 'Tên hàng trên HĐ', rong: 30, huongDan: 'Tên + nồng độ như trên HĐ. Trống = tên mã hàng.' },
  { ten: 'SL', rong: 6, huongDan: 'Số > 0 khi có Mã hàng.' },
  { ten: 'Đơn giá HĐ', rong: 14, huongDan: 'Trước VAT. Nhận 1.234.567 / 1,234,567 / 1234567.' },
  { ten: 'Đơn giá thực hiện', rong: 14, huongDan: 'Giá vốn dự kiến trước VAT (tuỳ chọn).' },
];

const COT_MUA: CotMau[] = [
  { ten: 'Số HĐ', rong: 22, huongDan: 'Bắt buộc. Các dòng cùng Số HĐ gộp thành 1 HĐ (mỗi dòng 1 mặt hàng). Trùng Số HĐ đã có trong app → bỏ qua.' },
  { ten: 'Ngày ký', rong: 12, huongDan: 'dd/mm/yyyy.' },
  { ten: 'Trạng thái', rong: 10, huongDan: '"Nháp" (mặc định) hoặc "Đã ký".' },
  { ten: 'Mã NCC', rong: 10, huongDan: 'Tuỳ chọn. Tìm NCC theo Mã → MST → Tên. Không thấy → tạo NCC mới.' },
  { ten: 'Tên nhà cung cấp', rong: 34, huongDan: 'Bắt buộc nếu không có Mã NCC.' },
  { ten: 'MST', rong: 14, huongDan: 'Tuỳ chọn.' },
  { ten: 'Địa chỉ', rong: 30, huongDan: 'Tuỳ chọn.' },
  { ten: 'Thuộc Phú Tài', rong: 10, huongDan: '"Có" / "Không" (mặc định Không).' },
  { ten: 'Số HĐ bán liên quan', rong: 22, huongDan: 'Tuỳ chọn — Số HĐ bán đã có trong app.' },
  { ten: 'Đợt TT (%)', rong: 12, huongDan: 'Tỷ lệ các đợt cách nhau dấu ;  VD "50;50". Số tiền đợt = % × Tổng giá trị HĐ (VNĐ).' },
  { ten: 'Hạn đợt', rong: 22, huongDan: 'Ngày hạn từng đợt dd/mm/yyyy cách nhau dấu ;  VD "15/11/2026;15/12/2026".' },
  { ten: 'Ghi chú', rong: 24, huongDan: 'Tuỳ chọn.' },
  { ten: 'Mã hàng', rong: 14, huongDan: 'Mã trong danh mục kho (sheet "Mã hàng"). Trống → đoán theo Tên hàng.' },
  { ten: 'Tên hàng', rong: 30, huongDan: 'Bắt buộc nếu không có Mã hàng.' },
  { ten: 'Thông số', rong: 18, huongDan: 'Quy cách / nồng độ, VD "NO 500ppm · 10L".' },
  { ten: 'SL', rong: 6, huongDan: 'Bắt buộc, số > 0.' },
  { ten: 'ĐVT', rong: 8, huongDan: 'Trống = ĐVT của mã hàng.' },
  { ten: 'Đơn giá', rong: 14, huongDan: 'Theo Loại tiền.' },
  { ten: 'Loại tiền', rong: 9, huongDan: 'VNĐ (mặc định), USD, RMB.' },
  { ten: 'Tỷ giá', rong: 9, huongDan: 'Bắt buộc khi Loại tiền khác VNĐ.' },
];

const VI_DU_BAN: (string | number)[][] = [
  ['260901/HĐKT/OMV-ABC', '01/09/2026', 'Hiệu lực', '', 'Công ty TNHH Ví Dụ', '0101248141', 'Hà Nội', '', 8, '', '', '30;70', '15;30', '', 'KC-NO-8L', 'Bình khí chuẩn NO 500ppm', 2, 6500000, 5200000],
  ['260901/HĐKT/OMV-ABC', '', '', '', '', '', '', '', '', '', '', '', '', '', 'KC-NO-8L', 'Bình khí chuẩn NO 1000ppm', 1, 6800000, 5400000],
];
const VI_DU_MUA: (string | number)[][] = [
  ['HDM-2026-001', '05/09/2026', 'Đã ký', '', 'Nhà cung cấp Ví Dụ', '', '', 'Không', '260901/HĐKT/OMV-ABC', '50;50', '15/10/2026;15/11/2026', '', 'KC-NO-8L', 'Bình khí chuẩn NO 500ppm', 'NO 500ppm', 2, '', 5200000, 'VNĐ', ''],
  ['HDM-2026-001', '', '', '', '', '', '', '', '', '', '', '', '', 'Van điều áp CGA', 'Inox 316', 1, 'Cái', 120, 'USD', 25400],
];

/** Ngày từ ô Excel: số serial, dd/mm/yyyy, d/m/yy, yyyy-mm-dd → 'YYYY-MM-DD'; sai → null. */
export function parseNgay(raw: string | undefined): string | null | undefined {
  const s = (raw ?? '').trim();
  if (!s) return undefined;
  const p2 = (n: number) => String(n).padStart(2, '0');
  const iso = (y: number, m: number, d: number) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${p2(m)}-${p2(d)}` : null;
  };
  if (/^\d{4,6}(\.\d+)?$/.test(s)) {
    // Serial Excel: ngày 0 = 30/12/1899.
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 864e5);
    return `${dt.getUTCFullYear()}-${p2(dt.getUTCMonth() + 1)}-${p2(dt.getUTCDate())}`;
  }
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
  if (m) return iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  return null;
}

const tach = (s: string | undefined) => (s ?? '').split(/[;|]/).map((x) => x.trim()).filter(Boolean);

/** Bảng đọc theo tên cột: tìm dòng tiêu đề (có ô "Số HĐ"), trả hàm lấy ô theo tên cột. */
function docTheoTieuDe(rows: string[][]): { du: string[][]; o: (r: string[], ten: string) => string; dauDong: number } | string {
  const i = rows.findIndex((r) => r.some((c) => fold(c) === fold('Số HĐ')));
  if (i < 0) return 'Không thấy dòng tiêu đề có cột "Số HĐ" — dùng file mẫu';
  const idx = new Map(rows[i].map((c, j) => [fold(c), j] as const));
  return { du: rows.slice(i + 1), o: (r, ten) => (r[idx.get(fold(ten)) ?? -1] ?? '').trim(), dauDong: i + 2 };
}

export interface KetQuaHd<T> {
  soHD: string;
  /** Số dòng Excel (để người dùng tìm lại). */
  dong: number[];
  doiTac: string;
  doiTacMoi: boolean;
  soDongHang: number;
  giaTri: number;
  trangThai: string;
  loi: string[];
  hd?: T;
  khMoi?: KhachHang;
  nccMoi?: NhaCungCap;
}

function nhom(du: string[][], o: (r: string[], ten: string) => string, dauDong: number): { soHD: string; rows: { r: string[]; n: number }[] }[] {
  const out = new Map<string, { soHD: string; rows: { r: string[]; n: number }[] }>();
  du.forEach((r, i) => {
    if (!r.some((c) => c.trim())) return;
    const so = o(r, 'Số HĐ');
    const k = fold(so) || `__trong_${i}`;
    if (!out.has(k)) out.set(k, { soHD: so, rows: [] });
    out.get(k)!.rows.push({ r, n: dauDong + i });
  });
  return [...out.values()];
}

const timMa = (ds: readonly LoaiHang[], ma: string) => ds.find((l) => fold(l.id) === fold(ma));

export function docHdBan(rows: string[][], store: Store): KetQuaHd<HopDongBan>[] | string {
  const t = docTheoTieuDe(rows);
  if (typeof t === 'string') return t;
  const { o } = t;
  const db = store.db();
  const ds = store.loaiHang();
  const khMoiTheoMst = new Map<string, KhachHang>();
  return nhom(t.du, o, t.dauDong).map(({ soHD, rows: g }) => {
    const r0 = g[0].r;
    const loi: string[] = [];
    if (!soHD) loi.push('Thiếu Số HĐ');
    else if (db.hopDongBan.some((x) => fold(x.soHD) === fold(soHD))) loi.push(`Số HĐ ${soHD} đã có trong app`);
    // Khách hàng
    const maKH = o(r0, 'Mã KH');
    const tenKH = o(r0, 'Tên khách hàng');
    const mst = o(r0, 'MST');
    let k = (maKH && store.khById(maKH)) || (mst && db.khachHang.find((x) => x.mst === mst)) || (tenKH && db.khachHang.find((x) => fold(x.ten) === fold(tenKH))) || undefined;
    let khMoi: KhachHang | undefined;
    if (!k) {
      if (maKH) loi.push(`Không thấy Mã KH ${maKH}`);
      else if (!tenKH) loi.push('Thiếu Tên khách hàng');
      else if (!mst) loi.push('KH mới cần MST');
      else if (kiemMST(mst)) loi.push(`KH mới: ${kiemMST(mst)}`);
      else {
        khMoi = khMoiTheoMst.get(mst) ?? { id: '', ten: tenKH, mst, diaChi: o(r0, 'Địa chỉ'), nguoiLienHe: '', dienThoai: '', email: '', ghiChu: '', import: true };
        khMoiTheoMst.set(mst, khMoi);
        k = khMoi;
      }
    }
    // Sale
    const email = o(r0, 'Email Sale');
    const sale = email ? db.taiKhoan.find((x) => fold(x.email) === fold(email))?.id : (store.meId() ?? '');
    if (email && !sale) loi.push(`Không thấy tài khoản Sale ${email}`);
    // Ngày, trạng thái, VAT
    const ngayKy = parseNgay(o(r0, 'Ngày ký'));
    if (ngayKy === null) loi.push(`Ngày ký "${o(r0, 'Ngày ký')}" không hợp lệ`);
    const tt = fold(o(r0, 'Trạng thái'));
    const trangThai = !tt || tt === fold('Báo giá') ? 'Báo giá' : tt === fold('Hiệu lực') ? 'Hiệu lực' : null;
    if (!trangThai) loi.push(`Trạng thái "${o(r0, 'Trạng thái')}" không hợp lệ (Báo giá / Hiệu lực)`);
    const vatRaw = o(r0, 'VAT %').replace('%', '');
    const vatN = vatRaw ? parseSo(vatRaw) : 8;
    const vat = vatN === 0 || vatN === 8 || vatN === 10 ? vatN : null;
    if (vat === null) loi.push(`VAT "${vatRaw}" không hợp lệ (0 / 8 / 10)`);
    // Dòng hàng
    const dongHang: DongHangBan[] = [];
    for (const { r, n } of g) {
      const ma = o(r, 'Mã hàng');
      const slRaw = o(r, 'SL');
      if (!ma && !slRaw) continue;
      const l = ma ? timMa(ds, ma) : undefined;
      const sl = parseSo(slRaw);
      if (!ma) loi.push(`Dòng ${n}: thiếu Mã hàng`);
      else if (!l) loi.push(`Dòng ${n}: không thấy Mã hàng ${ma}`);
      if (!(sl > 0)) loi.push(`Dòng ${n}: SL phải > 0`);
      dongHang.push({ id: uid('DB'), loaiHang: l?.id ?? ma, tenHang: o(r, 'Tên hàng trên HĐ') || l?.ten || ma, soLuong: sl, donGia: parseSo(o(r, 'Đơn giá HĐ')), donGiaTH: parseSo(o(r, 'Đơn giá thực hiện')) });
    }
    const truocVAT = dongHang.length ? tongDongBan(dongHang) : parseSo(o(r0, 'Giá trị trước VAT'));
    const sau = sauVAT(truocVAT, vat ?? 8);
    // Đợt thanh toán
    const tyLe = tach(o(r0, 'Đợt TT (%)')).map((x) => parseSo(x.replace('%', '')));
    const han = tach(o(r0, 'Hạn đợt (ngày)')).map((x) => parseSo(x));
    if (tyLe.some((x) => !(x > 0))) loi.push('Đợt TT (%) phải là số > 0');
    else if (tyLe.length && Math.abs(tyLe.reduce((a, b) => a + b, 0) - 100) > 0.01) loi.push(`Tổng Đợt TT = ${tyLe.reduce((a, b) => a + b, 0)}% (phải = 100%)`);
    if (tyLe.length > store.cauHinh().SO_DOT_TOI_DA) loi.push(`Tối đa ${store.cauHinh().SO_DOT_TOI_DA} đợt thanh toán`);
    let h: HopDongBan = {
      ...store.newHdb(),
      soHD,
      maKH: k?.id ?? '',
      tenKH: k?.ten ?? tenKH,
      mst: mst || k?.mst || '',
      diaChi: o(r0, 'Địa chỉ') || k?.diaChi || '',
      ngayKy: ngayKy || undefined,
      trangThai: trangThai ?? 'Báo giá',
      sale: sale ?? '',
      ghiChu: o(r0, 'Ghi chú'),
      vat: vat ?? 8,
      truocVAT,
      thucTeTruocVAT: dongHang.length ? 0 : parseSo(o(r0, 'GTHĐ thực tế trước VAT')),
      dongHang,
      dotTT: tyLe.map((p, i) => ({ dot: i + 1, tyLe: p, soTien: Math.round((p / 100) * sau), hanNgay: han[i] > 0 ? han[i] : 30 })),
      import: true,
    };
    h = apDungTuDongHdb(h);
    if (trangThai === 'Hiệu lực') {
      const thieu = hdbThieuDeChuyen(h, 'Hiệu lực', db);
      if (thieu.length) loi.push(`Chưa đủ để Hiệu lực: ${thieu.join(', ')}`);
    }
    return { soHD, dong: g.map((x) => x.n), doiTac: k?.ten ?? tenKH, doiTacMoi: !!khMoi, soDongHang: dongHang.length, giaTri: sau, trangThai: h.trangThai, loi, hd: h, khMoi };
  });
}

export function docHdMua(rows: string[][], store: Store): KetQuaHd<HopDongMua>[] | string {
  const t = docTheoTieuDe(rows);
  if (typeof t === 'string') return t;
  const { o } = t;
  const db = store.db();
  const ds = store.loaiHang();
  const nccMoiTheoTen = new Map<string, NhaCungCap>();
  return nhom(t.du, o, t.dauDong).map(({ soHD, rows: g }) => {
    const r0 = g[0].r;
    const loi: string[] = [];
    if (!soHD) loi.push('Thiếu Số HĐ');
    else if (db.hopDongMua.some((x) => fold(x.soHD) === fold(soHD))) loi.push(`Số HĐ ${soHD} đã có trong app`);
    // Nhà cung cấp
    const maNCC = o(r0, 'Mã NCC');
    const ten = o(r0, 'Tên nhà cung cấp');
    const mst = o(r0, 'MST');
    let n = (maNCC && store.nccById(maNCC)) || (mst && db.ncc.find((x) => x.mst === mst)) || (ten && db.ncc.find((x) => fold(x.ten) === fold(ten))) || undefined;
    let nccMoi: NhaCungCap | undefined;
    if (!n) {
      if (maNCC) loi.push(`Không thấy Mã NCC ${maNCC}`);
      else if (!ten) loi.push('Thiếu Tên nhà cung cấp');
      else {
        nccMoi = nccMoiTheoTen.get(fold(ten)) ?? { id: '', ten, mst, diaChi: o(r0, 'Địa chỉ'), quocGia: '', nguoiLienHe: '', dienThoai: '', email: '', ghiChu: '' };
        nccMoiTheoTen.set(fold(ten), nccMoi);
        n = nccMoi;
      }
    }
    const ngayKy = parseNgay(o(r0, 'Ngày ký'));
    if (ngayKy === null) loi.push(`Ngày ký "${o(r0, 'Ngày ký')}" không hợp lệ`);
    const tt = fold(o(r0, 'Trạng thái'));
    const trangThai = !tt || tt === fold('Nháp') ? 'Nháp' : tt === fold('Đã ký') ? 'Đã ký' : null;
    if (!trangThai) loi.push(`Trạng thái "${o(r0, 'Trạng thái')}" không hợp lệ (Nháp / Đã ký)`);
    const soHDB = o(r0, 'Số HĐ bán liên quan');
    const hdb = soHDB ? db.hopDongBan.find((x) => fold(x.soHD) === fold(soHDB)) : undefined;
    if (soHDB && !hdb) loi.push(`Không thấy HĐ bán ${soHDB}`);
    // Dòng hàng
    const chiTiet: DongHangMua[] = [];
    for (const { r, n: so } of g) {
      const ma = o(r, 'Mã hàng');
      const tenHang = o(r, 'Tên hàng');
      const slRaw = o(r, 'SL');
      if (!ma && !tenHang && !slRaw) continue;
      const l = ma ? timMa(ds, ma) : doanLoaiHang(tenHang, ds);
      const sl = parseSo(slRaw);
      const loaiTien = parseLoaiTien(o(r, 'Loại tiền'));
      const tyGia = loaiTien === 'VNĐ' ? 1 : parseSo(o(r, 'Tỷ giá'));
      if (!l) loi.push(ma ? `Dòng ${so}: không thấy Mã hàng ${ma}` : `Dòng ${so}: không đoán được Mã hàng từ "${tenHang}" — điền cột Mã hàng`);
      if (!(sl > 0)) loi.push(`Dòng ${so}: SL phải > 0`);
      if (!(tyGia > 0)) loi.push(`Dòng ${so}: ${loaiTien} cần Tỷ giá`);
      chiTiet.push({ id: uid('DM'), loaiHang: l?.id ?? '', tenHang: tenHang || l?.ten || ma, thongSo: o(r, 'Thông số'), soLuong: sl, dvt: o(r, 'ĐVT') || l?.dvt || '', donGia: parseSo(o(r, 'Đơn giá')), loaiTien, tyGia, hdbId: hdb?.id });
    }
    if (!chiTiet.length) loi.push('Chưa có dòng hàng');
    const m0: HopDongMua = {
      ...store.newHdm(),
      soHD,
      maNCC: n?.id ?? '',
      tenNCC: n?.ten ?? ten,
      mst: mst || n?.mst || '',
      diaChi: o(r0, 'Địa chỉ') || n?.diaChi || '',
      ngayKy: ngayKy || undefined,
      hdbId: hdb?.id,
      thuocPhuTai: fold(o(r0, 'Thuộc Phú Tài')) === fold('Có'),
      trangThai: trangThai ?? 'Nháp',
      ghiChu: o(r0, 'Ghi chú'),
      chiTiet,
      import: true,
    };
    const tong = hdmTong(m0);
    const tyLe = tach(o(r0, 'Đợt TT (%)')).map((x) => parseSo(x.replace('%', '')));
    const hanRaw = tach(o(r0, 'Hạn đợt'));
    const han = hanRaw.map((x) => parseNgay(x));
    if (tyLe.some((x) => !(x > 0))) loi.push('Đợt TT (%) phải là số > 0');
    else if (tyLe.length && Math.abs(tyLe.reduce((a, b) => a + b, 0) - 100) > 0.01) loi.push(`Tổng Đợt TT = ${tyLe.reduce((a, b) => a + b, 0)}% (phải = 100%)`);
    if (tyLe.length > store.cauHinh().SO_DOT_TOI_DA) loi.push(`Tối đa ${store.cauHinh().SO_DOT_TOI_DA} đợt thanh toán`);
    han.forEach((x, i) => x === null && loi.push(`Hạn đợt "${hanRaw[i]}" không hợp lệ`));
    const m: HopDongMua = { ...m0, dotTT: tyLe.map((p, i) => ({ dot: i + 1, soTien: Math.round((p / 100) * tong), han: han[i] || undefined })) };
    return { soHD, dong: g.map((x) => x.n), doiTac: n?.ten ?? ten, doiTacMoi: !!nccMoi, soDongHang: chiTiet.length, giaTri: tong, trangThai: m.trangThai, loi, hd: m, nccMoi };
  });
}

/** Nút "Import Excel" + popup: tải file mẫu → chọn file → xem trước từng HĐ (lỗi / hợp lệ) → import HĐ hợp lệ. */
@Component({
  selector: 'app-import-hd',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Icon],
  template: `
    <button type="button" class="btn quiet" (click)="mo()"><app-icon name="upload" [size]="16" /> Import Excel</button>
    <app-modal [open]="open()" [title]="'Import ' + tenHd() + ' từ Excel'" sub="Tải file mẫu → điền → chọn file → kiểm tra → Import" size="lg" [dirty]="!!kq().length" (closed)="dong()">
      <section class="dan-buoc">
        <h3><span class="so">1</span> Tải file mẫu, điền {{ tenHd() }}</h3>
        <p class="sub">Mỗi dòng 1 {{ loai() === 'ban' ? 'sản phẩm' : 'mặt hàng' }}; các dòng cùng <b>Số HĐ</b> gộp thành 1 HĐ. Xem cách điền từng cột ở sheet "Hướng dẫn", mã hàng ở sheet "Mã hàng".</p>
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
          <h3><span class="so">3</span> Kiểm tra: {{ hopLe().length }} HĐ hợp lệ · {{ kq().length - hopLe().length }} HĐ lỗi (bỏ qua)</h3>
          <div class="tbl-wrap">
            <table class="tbl compact">
              <thead><tr><th>Dòng Excel</th><th>Số HĐ</th><th>{{ loai() === 'ban' ? 'Khách hàng' : 'Nhà cung cấp' }}</th><th class="num">Dòng hàng</th><th class="num">{{ loai() === 'ban' ? 'Giá trị sau VAT' : 'Tổng giá trị (VNĐ)' }}</th><th>Trạng thái</th><th>Kết quả</th></tr></thead>
              <tbody>
                @for (x of kq(); track $index) {
                  <tr>
                    <td class="sub">{{ x.dong.length > 1 ? x.dong[0] + '–' + x.dong[x.dong.length - 1] : x.dong[0] }}</td>
                    <td><b>{{ x.soHD || '—' }}</b></td>
                    <td>{{ x.doiTac || '—' }} @if (x.doiTacMoi) { <span class="tag info">Mới</span> }</td>
                    <td class="num">{{ x.soDongHang }}</td>
                    <td class="num">{{ money(x.giaTri) }}</td>
                    <td>{{ x.trangThai }}</td>
                    <td>
                      @if (x.loi.length) { <div class="neg sub">@for (e of x.loi; track $index) { <div>{{ e }}</div> }</div> }
                      @else { <span class="tag ok">Hợp lệ</span> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (soDoiTacMoi()) { <p class="sub">Sẽ tạo mới {{ soDoiTacMoi() }} {{ loai() === 'ban' ? 'khách hàng' : 'nhà cung cấp' }} (tag "Mới").</p> }
        </section>
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="dong()">Huỷ</button>
        <button type="button" class="btn" [disabled]="!hopLe().length" (click)="chay()">Import {{ hopLe().length }} HĐ</button>
      </div>
    </app-modal>
  `,
})
export class ImportHd {
  private readonly store = inject(Store);
  readonly loai = input.required<LoaiImport>();
  protected readonly money = money;
  protected readonly open = signal(false);
  protected readonly dangDoc = signal(false);
  protected readonly tenFile = signal('');
  protected readonly loiFile = signal('');
  protected readonly kq = signal<KetQuaHd<HopDongBan | HopDongMua>[]>([]);
  protected readonly hopLe = computed(() => this.kq().filter((x) => !x.loi.length));
  protected readonly soDoiTacMoi = computed(() => new Set(this.hopLe().map((x) => x.khMoi ?? x.nccMoi).filter(Boolean)).size);
  protected readonly tenHd = computed(() => (this.loai() === 'ban' ? 'HĐ bán' : 'HĐ mua'));

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
    const cot = this.loai() === 'ban' ? COT_BAN : COT_MUA;
    const viDu = this.loai() === 'ban' ? VI_DU_BAN : VI_DU_MUA;
    const ma = this.store.loaiHang().filter((l) => l.dangDung);
    const blob = taoXlsx([
      { ten: this.tenHd(), tieuDe: true, rong: cot.map((c) => c.rong), dong: [cot.map((c) => c.ten), ...viDu] },
      {
        ten: 'Hướng dẫn',
        tieuDe: true,
        rong: [24, 100],
        dong: [
          ['Cột', 'Cách điền'],
          ...cot.map((c) => [c.ten, c.huongDan]),
          ['Lưu ý', 'Chỉ sheet đầu tiên được đọc. Xoá các dòng ví dụ trước khi điền. Giữ nguyên dòng tiêu đề (đổi thứ tự cột được).'],
        ],
      },
      { ten: 'Mã hàng', tieuDe: true, rong: [18, 40, 10], dong: [['Mã hàng', 'Tên', 'ĐVT'], ...ma.map((l) => [l.id, l.ten, l.dvt])] },
    ]);
    taiBlob(this.loai() === 'ban' ? 'mau-import-hd-ban.xlsx' : 'mau-import-hd-mua.xlsx', blob);
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
      const rows = await docBang(file);
      const r = this.loai() === 'ban' ? docHdBan(rows, this.store) : docHdMua(rows, this.store);
      if (typeof r === 'string') this.loiFile.set(r);
      else if (!r.length) this.loiFile.set('File không có dòng dữ liệu nào dưới dòng tiêu đề');
      else this.kq.set(r);
    } catch (err) {
      this.loiFile.set(err instanceof Error ? err.message : 'Không đọc được tệp');
    } finally {
      this.dangDoc.set(false);
    }
  }

  /** Tạo KH / NCC mới (mỗi đối tác 1 lần) rồi lưu từng HĐ qua Store — lỗi của Store ghi lại theo Số HĐ. */
  protected chay(): void {
    const s = this.store;
    let ok = 0;
    const loi: string[] = [];
    const daTao = new Map<object, string>();
    for (const x of this.hopLe()) {
      const moi = x.khMoi ?? x.nccMoi;
      let maDoiTac = '';
      if (moi) {
        if (!daTao.has(moi)) {
          const dt = { ...moi } as KhachHang & NhaCungCap;
          const e = x.khMoi ? s.saveKhachHang(dt) : s.saveNCC(dt);
          if (e) {
            loi.push(`${x.soHD}: ${e}`);
            continue;
          }
          daTao.set(moi, dt.id);
        }
        maDoiTac = daTao.get(moi)!;
      }
      const e =
        this.loai() === 'ban'
          ? s.saveHdb({ ...(x.hd as HopDongBan), ...(maDoiTac ? { maKH: maDoiTac } : {}) })
          : s.saveHdm({ ...(x.hd as HopDongMua), ...(maDoiTac ? { maNCC: maDoiTac } : {}) });
      if (e) loi.push(`${x.soHD}: ${e}`);
      else ok++;
    }
    s.say(`Đã import ${ok} ${this.tenHd()}${loi.length ? ` · ${loi.length} lỗi: ${loi.slice(0, 3).join('; ')}${loi.length > 3 ? '…' : ''}` : ''}`, loi.length ? 'bad' : 'ok');
    if (!loi.length) this.open.set(false);
    else this.kq.set([]);
  }
}
