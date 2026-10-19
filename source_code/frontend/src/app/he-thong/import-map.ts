/** NT-13 — bảng mapping cột cũ → field mới của các file nguồn, và bộ đọc CSV cho công cụ chạy thử. */

export interface MapCot {
  cu: string;
  moi: string;
  ghiChu?: string;
}

export interface FileNguon {
  ten: string;
  moTa: string;
  dich: string;
  cot: MapCot[];
}

export const FILE_NGUON: FileNguon[] = [
  {
    ten: 'THEO DÕI 2026',
    moTa: 'Sổ theo dõi hợp đồng bán, đợt thanh toán và công nợ khách hàng.',
    dich: 'HopDongBan, KhachHang',
    cot: [
      { cu: 'Ngày ký', moi: 'HopDongBan.ngayKy' },
      { cu: 'Số HĐ bán ra', moi: 'HopDongBan.soHD', ghiChu: 'Thiếu → "(Chưa xác định)" + cờ import' },
      { cu: 'Tên công ty', moi: 'KhachHang.ten → HopDongBan.maKH / tenKH', ghiChu: 'Tạo khách hàng nếu chưa có (so MST, tên)' },
      { cu: 'MST', moi: 'KhachHang.mst, HopDongBan.mst' },
      { cu: 'Địa chỉ', moi: 'KhachHang.diaChi, HopDongBan.diaChi' },
      { cu: 'Tổng GTHĐ sau VAT', moi: '(đối chiếu) = truocVAT × (1 + VAT)', ghiChu: 'Dùng suy ra VAT 8% / 10%' },
      { cu: 'Tổng GTHĐ trước VAT', moi: 'HopDongBan.truocVAT' },
      { cu: 'GTHĐ thực tế', moi: 'HopDongBan.thucTeTruocVAT' },
      { cu: 'Chênh lệch', moi: '(tự tính — chỉ đối chiếu)' },
      { cu: 'Thu 25% TNDN', moi: '(tự tính theo bậc thuế — chỉ đối chiếu)' },
      { cu: 'Tiền trả khách', moi: 'ChiPhiHD loại Hoa hồng' },
      { cu: 'Số tiền TT1 / Ngày TT1', moi: 'HopDongBan.dotTT[1].soTienThu / ngayThu' },
      { cu: 'Số tiền TT2 / Ngày TT2', moi: 'HopDongBan.dotTT[2].soTienThu / ngayThu' },
      { cu: 'Công nợ', moi: '(tự tính — Còn phải thu)' },
      { cu: 'Tình trạng hàng hóa', moi: 'HopDongBan.trangThai', ghiChu: 'Đã giao → Hoàn thành; còn lại → Hiệu lực' },
      { cu: 'Mã HĐ mua', moi: 'HopDongMua.hdbId (liên kết ngược)' },
    ],
  },
  {
    ten: 'HỢP ĐỒNG MUA',
    moTa: 'Các hợp đồng nhập hàng với nhà cung cấp trong / ngoài nước.',
    dich: 'HopDongMua, HopDongMua.chiTiet, NhaCungCap',
    cot: [
      { cu: 'Mã HĐ', moi: 'HopDongMua.soHD' },
      { cu: 'Ngày', moi: 'HopDongMua.ngayKy' },
      { cu: 'Sản phẩm', moi: 'chiTiet.tenHang → loaiHang', ghiChu: 'Không khớp loại hàng → "Hàng khác (import)"' },
      { cu: 'Thông số', moi: 'chiTiet.thongSo' },
      { cu: 'Thể tích', moi: 'chiTiet.thongSo (ghép)' },
      { cu: 'SL', moi: 'chiTiet.soLuong' },
      { cu: 'Đơn giá (RMB/USD)', moi: 'chiTiet.donGia + loaiTien' },
      { cu: 'Tỷ giá', moi: 'chiTiet.tyGia', ghiChu: 'VNĐ → 1' },
      { cu: 'Thành tiền VNĐ', moi: '(tự tính — đối chiếu)' },
      { cu: 'Ngày thanh toán', moi: 'dotTT[n].ngayTra + soTienTra' },
    ],
  },
  {
    ten: 'Bảng kê Thanh Toán / Tiền mặt',
    moTa: 'Sổ quỹ tiền mặt và ngân hàng.',
    dich: 'PhieuThuChi',
    cot: [
      { cu: 'Ngày', moi: 'PhieuThuChi.ngayLap' },
      { cu: 'Số phiếu', moi: 'PhieuThuChi.soPhieu', ghiChu: 'Cấp lại số theo tiền tố TC + năm (KT-06)' },
      { cu: 'Nội dung', moi: 'PhieuThuChi.noiDung', ghiChu: '"Rút tiền nhập quỹ" → loại Luân chuyển Ngân hàng → Tiền mặt' },
      { cu: 'Thu', moi: 'soTienThu (loại Thu)', ghiChu: 'Trạng thái Đã duyệt, Người duyệt = Import' },
      { cu: 'Chi', moi: 'soTienChi (loại Chi / Tạm ứng)', ghiChu: 'Bỏ dòng trùng phiếu chi đã sinh từ đợt trả NCC' },
      { cu: 'Tồn', moi: '(tự tính — số dư nguồn, chỉ đối chiếu)' },
      { cu: 'Đã TT (Tiền mặt/Ngân hàng)', moi: 'PhieuThuChi.nguonTien' },
    ],
  },
  {
    ten: 'Công nợ Phú Tài Miền Nam',
    moTa: 'Các hợp đồng ký qua Phú Tài và công nợ giữa hai bên.',
    dich: 'HopDongPhuTai, HopDongMua (Thuộc Phú Tài)',
    cot: [
      { cu: 'Số HĐ', moi: 'HopDongPhuTai.soHD' },
      { cu: 'KH', moi: 'HopDongPhuTai.maKH / tenKH' },
      { cu: 'Giá bán', moi: 'HopDongPhuTai.truocVAT' },
      { cu: 'Giá mua', moi: 'HopDongMua (Thuộc Phú Tài) → hdMua', ghiChu: 'Dựng 1 HĐ mua đầu vào' },
      { cu: 'Chênh lệch', moi: '(tự tính — LN trước thuế)' },
      { cu: '10% PT', moi: '(tự tính — tyLeGiu)' },
      { cu: 'TNDN 20%', moi: '(tự tính — tyLeThue)' },
      { cu: 'Chi phí khác', moi: 'HopDongPhuTai.chiPhi[] loại Khác' },
      { cu: 'KH trả PT', moi: 'HopDongPhuTai.dotKH[]' },
    ],
  },
  {
    ten: 'KhoOxyMecie_v3',
    moTa: 'Tồn kho đầu kỳ theo mã hàng, lô và kho.',
    dich: 'LoaiHang, HopDongMua (dựng từ sheet NhapKho), PhieuKho nhập',
    cot: [
      { cu: 'Mã hàng', moi: 'DongPhieuKho.loaiHang + thuocTinh' },
      { cu: 'Lô', moi: 'Ghi chú dòng ("Lô …")' },
      { cu: 'SL', moi: 'DongPhieuKho.soLuong' },
      { cu: 'Đơn giá', moi: 'chiTiet.donGia của HĐ mua dựng kèm → giá gốc xuất kho' },
      { cu: 'Kho', moi: 'PhieuKho.kho' },
    ],
  },
];

/** Đọc CSV (dấu ; hoặc , tự nhận theo dòng đầu), có xử lý ô trong ngoặc kép. */
export function docCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, '');
  const dau = s.split(/\r?\n/, 1)[0] ?? '';
  const sep = (dau.match(/;/g)?.length ?? 0) >= (dau.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((x) => x !== ''));
}
