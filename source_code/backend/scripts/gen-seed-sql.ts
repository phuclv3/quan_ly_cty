/**
 * Sinh SQL dữ liệu khởi tạo cho backend từ chính mã frontend (perm.ts, seed.ts) — để danh mục chức năng,
 * nhóm quyền mặc định và dữ liệu mẫu dev luôn khớp những gì giao diện đang dùng.
 *
 *   cd source_code/frontend
 *   npx esbuild ../backend/scripts/gen-seed-sql.ts --bundle --platform=node --format=esm --outfile=../backend/scripts/.gen-seed-sql.mjs
 *   node ../backend/scripts/.gen-seed-sql.mjs "<BCrypt của mật khẩu demo>"
 *
 * Ra 2 tệp:
 *   src/main/resources/db/migration/V2__default_data.sql — mọi môi trường: chức năng, nhóm quyền mặc định, tham số, vị trí hệ thống, loại chi phí.
 *   src/main/resources/db/dev/V2_1__dev_seed.sql         — chỉ hồ sơ dev: tài khoản demo + dữ liệu mẫu trích từ file Excel thực tế.
 * Mật khẩu demo KHÔNG nằm trong tệp — chỉ chuỗi BCrypt truyền vào khi chạy.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHUC_NANG, nhomMacDinh } from '../../frontend/src/app/core/perm';
import { CAU_HINH_MAC_DINH, TAI_KHOAN_DEMO, buildSeed } from '../../frontend/src/app/core/seed';
import type { Db } from '../../frontend/src/app/core/models';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const BCRYPT = process.argv[2];
if (!BCRYPT || !/^\$2[aby]\$\d{2}\$.{53}$/.test(BCRYPT)) {
  console.error('Thiếu / sai chuỗi BCrypt của mật khẩu demo (tham số 1)');
  process.exit(1);
}

type V = string | number | boolean | null | undefined;
const q = (v: V): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\r/g, '\\r').replace(/\n/g, '\\n')}'`;
};
/** Ngày 'YYYY-MM-DD' (bỏ phần giờ nếu có). */
const d = (s?: string | null): string => (s ? q(s.slice(0, 10)) : 'NULL');
/** Mốc thời gian → DATETIME(3) UTC; ngày trơn = 00:00 giờ Việt Nam. */
const t = (s?: string | null): string => {
  if (!s) return 'NULL';
  const iso = s.length === 10 ? new Date(`${s}T00:00:00+07:00`).toISOString() : new Date(s).toISOString();
  return q(iso.replace('T', ' ').replace('Z', ''));
};
const nz = (s?: string | null) => s ?? '';
const en = (s?: string | null) => (s ? s : null);
const num = (x: number) => (Number.isInteger(x) ? String(x) : String(x));

function insert(table: string, cols: string[], rows: string[][]): string {
  if (!rows.length) return '';
  const out: string[] = [];
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    out.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES\n${chunk.map((r) => `  (${r.join(', ')})`).join(',\n')};`);
  }
  return out.join('\n') + '\n';
}

// ═════════════════════ V2 — dữ liệu mặc định (mọi môi trường) ═════════════════════
const now = new Date().toISOString();
const v2: string[] = [];
v2.push(`-- ════════════════════════════════════════════════════════════════════
-- App Oxy — dữ liệu khởi tạo cần cho hệ thống chạy (mọi môi trường).
-- TỆP SINH TỰ ĐỘNG bởi backend/scripts/gen-seed-sql.ts từ frontend/src/app/core/perm.ts + seed.ts.
-- Kèm 6 tài khoản demo (mật khẩu dùng chung, xem README) — đổi mật khẩu trước khi dùng thật.
-- ════════════════════════════════════════════════════════════════════

INSERT INTO ht_trang_thai (id, phien_ban, cap_nhat) VALUES (1, 0, NULL);
`);
v2.push('-- Danh mục chức năng phân quyền (mã spec) và mức được phép chọn');
v2.push(insert('ht_chuc_nang', ['ma', 'module', 'ten', 'mo_ta', 'muc_cho_phep'],
  CHUC_NANG.map((c) => [q(c.ma), q(c.module), q(c.ten), q(c.moTa), q(c.mucDo.filter((l) => l !== 'none').join(','))])));
const nhom = nhomMacDinh(now);
v2.push('-- Nhóm quyền mặc định (sheet "Ma trận quyền", D-25)');
v2.push(insert('ht_nhom', ['id', 'ma', 'ten', 'mo_ta', 'toan_quyen', 'trang_thai', 'he_thong', 'tao_luc'],
  nhom.map((g) => [q(g.id), q(g.ma), q(g.ten), q(g.moTa), q(g.toanQuyen), q(g.trangThai), q(!!g.heThong), t(g.taoLuc)])));
v2.push(insert('ht_nhom_chuc_nang', ['nhom_id', 'chuc_nang_ma', 'muc_quyen'],
  nhom.flatMap((g) => Object.entries(g.quyen).map(([ma, l]) => [q(g.id), q(ma), q(l)]))));
v2.push('-- Tham số cấu hình mặc định (NT-14)');
v2.push(insert('ht_cau_hinh', ['khoa', 'gia_tri'], Object.entries(CAU_HINH_MAC_DINH).map(([k, v]) => [q(k), q(String(v))])));

// Danh mục mặc định lấy từ dữ liệu mẫu: vị trí hệ thống "Chuyển thẳng" và danh mục loại chi phí theo spec.
const seed: Db = await buildSeed();
const demoEmails = new Set(TAI_KHOAN_DEMO.map((x) => x.email));
const taiKhoanDemo = seed.taiKhoan.filter((x) => demoEmails.has(x.email));
v2.push('-- Tài khoản demo — 1 mỗi nhóm quyền mặc định (mật khẩu dùng chung, xem README backend)');
v2.push(insert('ht_nhanvien', ['id', 'email', 'ho_ten', 'mat_khau_bam', 'trang_thai', 'bat_doi_mk', 'so_lan_sai', 'created_at', 'updated_at'],
  taiKhoanDemo.map((x) => [q(x.id), q(x.email), q(x.hoTen), q(BCRYPT), q(x.trangThai), q(x.batDoiMK), '0', t(now), t(now)])));
v2.push(insert('ht_nhanvien_nhom', ['tai_khoan_id', 'nhom_id'], taiKhoanDemo.flatMap((x) => x.nhom.map((g) => [q(x.id), q(g)]))));
v2.push('-- Vị trí kho hệ thống "Chuyển thẳng — không qua kho" (KHO-01, không sửa / xoá)');
v2.push(insert('kho_vi_tri', ['id', 'ten', 'loai', 'dang_dung'], seed.kho.filter((k) => k.id === 'KHO-CT').map((k) => [q(k.id), q(k.ten), q(k.loai), q(k.dangDung)])));
v2.push('-- Loại chi phí (KT-03): CPTH-HH (hoa hồng) và CPTH-VC (vận chuyển) có quy tắc riêng trong mã');
v2.push(insert('kt_loai_chi_phi', ['id', 'ten', 'nhom', 'dang_dung'], seed.loaiChiPhi.map((l) => [q(l.id), q(l.ten), q(l.nhom), q(l.dangDung)])));
writeFileSync(resolve(ROOT, 'src/main/resources/db/migration/V2__default_data.sql'), v2.join('\n'));

// ═════════════════════ V2_1 — dữ liệu mẫu dev ═════════════════════
const s: string[] = [];
s.push(`-- ════════════════════════════════════════════════════════════════════
-- App Oxy — DỮ LIỆU MẪU CHO MÔI TRƯỜNG PHÁT TRIỂN (chỉ nạp khi chạy hồ sơ "dev").
-- TỆP SINH TỰ ĐỘNG bởi backend/scripts/gen-seed-sql.ts từ frontend/src/app/core/seed.ts
-- (trích các file Excel thực tế trong tai_lieu/du_lieu_thuc_te — xem frontend README).
-- Tài khoản demo dùng chung một mật khẩu phát triển (ghi ở README backend); KHÔNG dùng cho môi trường thật.
-- ════════════════════════════════════════════════════════════════════
`);
const audit = (x: { taoLuc?: string }) => [t(x.taoLuc ?? now), t(x.taoLuc ?? now)];

// 6 tài khoản demo cốt lõi đã nạp ở V2__default_data.sql (mọi môi trường) — ở đây chỉ còn tài khoản mẫu khác (Sale KD...).
const taiKhoanDev = seed.taiKhoan.filter((x) => !demoEmails.has(x.email));
s.push(insert('ht_nhanvien', ['id', 'email', 'ho_ten', 'mat_khau_bam', 'trang_thai', 'bat_doi_mk', 'so_lan_sai', 'created_at', 'updated_at'],
  taiKhoanDev.map((x) => [q(x.id), q(x.email), q(x.hoTen), q(BCRYPT), q(x.trangThai), q(x.batDoiMK), '0', t(now), t(now)])));
s.push(insert('ht_nhanvien_nhom', ['tai_khoan_id', 'nhom_id'], taiKhoanDev.flatMap((x) => x.nhom.map((g) => [q(x.id), q(g)]))));
s.push(insert('kt_nguon_tien', ['id', 'ten', 'loai', 'so_tai_khoan', 'ngan_hang', 'so_du_dau_ky', 'ngay_dau_ky', 'trang_thai'],
  seed.nguonTien.map((x) => [q(x.id), q(x.ten), q(x.loai), q(en(x.soTaiKhoan)), q(en(x.nganHang)), num(x.soDuDauKy), d(x.ngayDauKy), q(x.trangThai)])));
s.push(insert('kho_vi_tri', ['id', 'ten', 'loai', 'dang_dung'], seed.kho.filter((k) => k.id !== 'KHO-CT').map((k) => [q(k.id), q(k.ten), q(k.loai), q(k.dangDung)])));
s.push(insert('kho_loai_hang', ['id', 'ten', 'mo_ta', 'nhom', 'dvt', 'dang_dung', 'loai_khi', 'the_tich'],
  seed.loaiHang.map((x) => [q(x.id), q(x.ten), q(en(x.moTa)), q(x.nhom), q(nz(x.dvt)), q(x.dangDung), q(en(x.loaiKhi)), q(en(x.theTich))])));
s.push(insert('kho_loai_hang_thuoc_tinh', ['loai_hang_id', 'thu_tu', 'gia_tri'], seed.loaiHang.flatMap((x) => x.thuocTinh.map((v, i) => [q(x.id), String(i), q(v)]))));
s.push(insert('kho_loai_hang_biet_danh', ['loai_hang_id', 'thu_tu', 'gia_tri'], seed.loaiHang.flatMap((x) => (x.bietDanh ?? []).map((v, i) => [q(x.id), String(i), q(v)]))));
s.push(insert('kd_khach_hang', ['id', 'ten', 'mst', 'dia_chi', 'nguoi_lien_he', 'dien_thoai', 'email', 'ghi_chu', 'trang_thai', 'tinh', 'chuc_vu',
  'phan_loai', 'nguon', 'loai_sp', 'hinh_thuc_hd', 'tiep_can', 'co_hoi', 'phu_trach', 'trang_thai_data', 'ngay_tiep_nhan', 'ngay_phan_bo',
  'gia_tri_co_hoi', 'la_import', 'created_at', 'updated_at'],
  seed.khachHang.map((x) => [q(x.id), q(x.ten), q(nz(x.mst)), q(nz(x.diaChi)), q(nz(x.nguoiLienHe)), q(nz(x.dienThoai)), q(nz(x.email)), q(en(x.ghiChu)),
    q(x.trangThai), q(en(x.tinh)), q(en(x.chucVu)), q(en(x.phanLoai)), q(en(x.nguon)), q(en(x.loaiSP)), q(en(x.hinhThucHD)), q(x.tiepCan),
    q(x.coHoi), q(en(x.phuTrach)), q(x.trangThaiData), d(x.ngayTiepNhan), d(x.ngayPhanBo), x.giaTriCoHoi == null ? 'NULL' : num(x.giaTriCoHoi),
    q(!!x.import), t(now), t(now)])));
s.push(insert('kd_cham_soc_kh', ['id', 'khach_hang_id', 'thu_tu', 'luc', 'nguoi', 'noi_dung', 'co_hoi'],
  seed.khachHang.flatMap((x) => (x.chamSoc ?? []).map((c, i) => [q(c.id), q(x.id), String(i), t(c.luc), q(c.nguoi), q(c.noiDung), q(c.coHoi)]))));
s.push(insert('kd_nha_cung_cap', ['id', 'ten', 'mst', 'dia_chi', 'quoc_gia', 'nguoi_lien_he', 'dien_thoai', 'email', 'ghi_chu', 'trang_thai', 'created_at', 'updated_at'],
  seed.ncc.map((x) => [q(x.id), q(x.ten), q(nz(x.mst)), q(nz(x.diaChi)), q(nz(x.quocGia)), q(nz(x.nguoiLienHe)), q(nz(x.dienThoai)), q(nz(x.email)),
    q(en(x.ghiChu)), q(x.trangThai), t(now), t(now)])));

const ptcCols = ['id', 'so_phieu', 'ngay_lap', 'loai', 'nguon_tien', 'nguon_tien_den', 'loai_chi_phi', 'noi_dung', 'so_tien_thu', 'so_tien_chi',
  'phieu_tam_ung_goc', 'so_tien_thuc_chi', 'nguoi_nhan', 'nguoi_de_nghi', 'trang_thai', 'nguoi_duyet', 'ngay_duyet', 'ly_do_tu_choi', 'ghi_chu',
  'ps_loai', 'ps_hd_id', 'ps_dot', 'la_import', 'created_at', 'updated_at'];
// Tạm ứng gốc phải có trước quyết toán (khoá ngoại tự tham chiếu).
const ptc = [...seed.phieuThuChi].sort((a, b) => Number(!!a.phieuTamUngGoc) - Number(!!b.phieuTamUngGoc));
s.push(insert('kt_phieu_thu_chi', ptcCols, ptc.map((x) => [q(x.id), q(x.soPhieu), d(x.ngayLap), q(x.loai), q(en(x.nguonTien)), q(en(x.nguonTienDen)),
  q(en(x.loaiChiPhi)), q(nz(x.noiDung)), num(x.soTienThu), num(x.soTienChi), q(en(x.phieuTamUngGoc)), x.soTienThucChi == null ? 'NULL' : num(x.soTienThucChi),
  q(en(x.nguoiNhan)), q(nz(x.nguoiDeNghi)), q(x.trangThai), q(en(x.nguoiDuyet)), t(x.ngayDuyet), q(en(x.lyDoTuChoi)), q(en(x.ghiChu)),
  q(x.phatSinh?.loai), q(x.phatSinh?.hdId), x.phatSinh ? String(x.phatSinh.dot) : 'NULL', q(!!x.import), t(now), t(now)])));
s.push(insert('kt_phieu_thu_chi_lich_su', ['phieu_id', 'thu_tu', 'luc', 'nguoi', 'hanh_dong', 'ghi_chu'],
  seed.phieuThuChi.flatMap((x) => (x.lichSu ?? []).map((l, i) => [q(x.id), String(i), t(l.luc), q(nz(l.nguoi)), q(l.hanhDong), q(en(l.ghiChu))]))));

s.push(insert('kd_hop_dong_ban', ['id', 'so_hd', 'ma_kh', 'ten_kh', 'mst', 'dia_chi', 'ngay_ky', 'ngay_hieu_luc', 'trang_thai', 'sale', 'ghi_chu',
  'truoc_vat', 'vat', 'thuc_te_truoc_vat', 'ts_nguong', 'ts_muc1', 'ts_muc2', 'co_tam_ung', 'phat_hd', 'ly_do_phat', 'ly_do_huy',
  'ghi_chu_ho_so_thieu', 'tao_luc', 'la_import', 'created_at', 'updated_at'],
  seed.hopDongBan.map((x) => [q(x.id), q(x.soHD.trim() ? x.soHD : null), q(x.maKH), q(nz(x.tenKH)), q(nz(x.mst)), q(nz(x.diaChi)), d(x.ngayKy),
    d(x.ngayHieuLuc), q(x.trangThai), q(en(x.sale)), q(en(x.ghiChu)), num(x.truocVAT), String(x.vat), num(x.thucTeTruocVAT), num(x.thamSoThue.nguong),
    num(x.thamSoThue.muc1), num(x.thamSoThue.muc2), q(x.coTamUng), x.phatHD == null ? 'NULL' : num(x.phatHD), q(en(x.lyDoPhat)), q(en(x.lyDoHuy)),
    q(en(x.ghiChuHoSoThieu)), t(x.taoLuc), q(!!x.import), ...audit(x)])));
s.push(insert('kd_hdb_dot_tt', ['hdb_id', 'thu_tu', 'dot', 'ty_le', 'so_tien', 'han', 'han_ngay', 'ngay_thu', 'so_tien_thu', 'nguon_tien_nhan', 'ghi_chu', 'phieu_thu_id'],
  seed.hopDongBan.flatMap((x) => x.dotTT.map((o, i) => [q(x.id), String(i), String(o.dot), o.tyLe == null ? 'NULL' : num(o.tyLe), num(o.soTien), d(o.han),
    o.hanNgay == null ? 'NULL' : String(o.hanNgay), d(o.ngayThu), o.soTienThu == null ? 'NULL' : num(o.soTienThu), q(en(o.nguonTienNhan)), q(en(o.ghiChu)),
    q(en(o.phieuThuId))]))));
s.push(insert('kd_hdb_dong_hang', ['id', 'hdb_id', 'thu_tu', 'loai_hang', 'ten_hang', 'so_luong', 'don_gia', 'don_gia_th', 'ghi_chu'],
  seed.hopDongBan.flatMap((x) => (x.dongHang ?? []).map((o, i) => [q(o.id), q(x.id), String(i), q(en(o.loaiHang)), q(nz(o.tenHang)), num(o.soLuong),
    num(o.donGia), num(o.donGiaTH), q(en(o.ghiChu))]))));

s.push(insert('kt_chi_phi_hd', ['id', 'ma_cp', 'hdb_id', 'ngay', 'loai_chi_phi', 'noi_dung', 'so_tien', 'nguon_tien', 'nguoi_thuc_hien', 'nguoi_nhan',
  'don_vi_van_chuyen', 'trang_thai', 'nguoi_duyet', 'ngay_duyet', 'ly_do_tu_choi', 'ghi_chu', 'created_at', 'updated_at'],
  seed.chiPhiHD.map((x) => [q(x.id), q(x.maCP), q(en(x.hdbId)), d(x.ngay), q(en(x.loaiChiPhi)), q(nz(x.noiDung)), num(x.soTien), q(en(x.nguonTien)),
    q(nz(x.nguoiThucHien)), q(en(x.nguoiNhan)), q(en(x.donViVanChuyen)), q(x.trangThai), q(en(x.nguoiDuyet)), t(x.ngayDuyet), q(en(x.lyDoTuChoi)),
    q(en(x.ghiChu)), t(now), t(now)])));
s.push(insert('kt_chi_phi_hd_lich_su', ['chi_phi_id', 'thu_tu', 'luc', 'nguoi', 'hanh_dong', 'ghi_chu'],
  seed.chiPhiHD.flatMap((x) => (x.lichSu ?? []).map((l, i) => [q(x.id), String(i), t(l.luc), q(nz(l.nguoi)), q(l.hanhDong), q(en(l.ghiChu))]))));

s.push(insert('kd_de_nghi_vat_tu', ['id', 'so_phieu', 'ngay', 'hdb_id', 'nguoi_de_nghi', 'ghi_chu', 'ly_do_huy'],
  seed.deNghiVatTu.map((x) => [q(x.id), q(x.soPhieu), d(x.ngay), q(x.hdbId), q(x.nguoiDeNghi), q(en(x.ghiChu)), q(en(x.lyDoHuy))])));
s.push(insert('kd_de_nghi_vat_tu_dong', ['id', 'dnvt_id', 'thu_tu', 'loai_hang', 'ten_hang', 'so_luong', 'ghi_chu', 'dong_ban_id'],
  seed.deNghiVatTu.flatMap((x) => x.dong.map((o, i) => [q(o.id), q(x.id), String(i), q(o.loaiHang), q(nz(o.tenHang)), num(o.soLuong), q(en(o.ghiChu)),
    q(en(o.dongBanId))]))));

s.push(insert('kd_hop_dong_mua', ['id', 'so_hd', 'ma_ncc', 'ten_ncc', 'dia_chi', 'mst', 'ngay_ky', 'hdb_id', 'thuoc_phu_tai', 'trang_thai', 'ghi_chu',
  'nhap_tay', 'tong_nhap_tay', 'ly_do_nhap_tay', 'xuat_hoa_don', 'ghi_chu_ho_so_thieu', 'tao_luc', 'la_import', 'created_at', 'updated_at'],
  seed.hopDongMua.map((x) => [q(x.id), q(x.soHD), q(x.maNCC), q(nz(x.tenNCC)), q(nz(x.diaChi)), q(nz(x.mst)), d(x.ngayKy), q(en(x.hdbId)),
    q(x.thuocPhuTai), q(x.trangThai), q(en(x.ghiChu)), q(x.nhapTay), x.tongNhapTay == null ? 'NULL' : num(x.tongNhapTay), q(en(x.lyDoNhapTay)),
    q(x.xuatHoaDon), q(en(x.ghiChuHoSoThieu)), t(x.taoLuc), q(!!x.import), ...audit(x)])));
s.push(insert('kd_hdm_dong_hang', ['id', 'hdm_id', 'thu_tu', 'loai_hang', 'ten_hang', 'thong_so', 'so_luong', 'dvt', 'don_gia', 'loai_tien', 'ty_gia',
  'ghi_chu', 'dnvt_id', 'dnvt_dong', 'hdb_id'],
  seed.hopDongMua.flatMap((x) => x.chiTiet.map((o, i) => [q(o.id), q(x.id), String(i), q(o.loaiHang), q(nz(o.tenHang)), q(nz(o.thongSo)), num(o.soLuong),
    q(nz(o.dvt)), num(o.donGia), q(o.loaiTien), num(o.loaiTien === 'VNĐ' ? 1 : o.tyGia), q(en(o.ghiChu)), q(en(o.dnvtId)), q(en(o.dnvtDong)),
    q(en(o.hdbId))]))));
s.push(insert('kd_hdm_dot_tt', ['hdm_id', 'thu_tu', 'dot', 'ty_le', 'so_tien', 'han_moc', 'han_ngay', 'han', 'ngay_tra', 'so_tien_tra', 'nguon_tien',
  'phieu_chi_id', 'ghi_chu'],
  seed.hopDongMua.flatMap((x) => x.dotTT.map((o, i) => [q(x.id), String(i), String(o.dot), o.tyLe == null ? 'NULL' : num(o.tyLe), num(o.soTien),
    q(en(o.hanMoc)), o.hanNgay == null ? 'NULL' : String(o.hanNgay), d(o.han), d(o.ngayTra), o.soTienTra == null ? 'NULL' : num(o.soTienTra),
    q(en(o.nguonTien)), q(en(o.phieuChiId)), q(en(o.ghiChu))]))));
s.push(insert('kd_hdm_checklist', ['hdm_id', 'thu_tu', 'ten', 'xong', 'ngay'],
  seed.hopDongMua.flatMap((x) => x.checklist.map((o, i) => [q(x.id), String(i), q(o.ten), q(o.xong), d(o.ngay)]))));

s.push(insert('kho_kiem_ke', ['id', 'so_phieu', 'ngay', 'kho', 'nguoi_thuc_hien', 'ghi_chu'],
  seed.kiemKe.map((x) => [q(x.id), q(x.soPhieu), d(x.ngay), q(x.kho), q(x.nguoiThucHien), q(en(x.ghiChu))])));
s.push(insert('kho_kiem_ke_dong', ['kiem_ke_id', 'thu_tu', 'loai_hang', 'so_luong', 'ten_hang', 'xuat_xu', 'nong_do', 'ghi_chu'],
  seed.kiemKe.flatMap((x) => x.dong.map((o, i) => [q(x.id), String(i), q(o.loaiHang), num(o.soLuong), q(en(o.tenHang)), q(en(o.xuatXu)),
    q(en(o.nongDo)), q(en(o.ghiChu))]))));
s.push(insert('kho_kiem_ke_phieu_dc', ['kiem_ke_id', 'thu_tu', 'phieu_kho_id'],
  seed.kiemKe.flatMap((x) => (x.phieuDieuChinh ?? []).map((p, i) => [q(x.id), String(i), q(p)]))));
s.push(insert('kho_phieu', ['id', 'so_phieu', 'ngay', 'loai', 'nguon_goc', 'hd_id', 'kho', 'ly_do', 'nguoi_thuc_hien', 'trang_thai', 'ghi_chu',
  'so_hoa_don', 'ncc', 'kiem_ke_id', 'created_at', 'updated_at'],
  seed.phieuKho.map((x) => [q(x.id), q(x.soPhieu), d(x.ngay), q(x.loai), q(x.nguonGoc), q(en(x.hdId)), q(x.kho), q(en(x.lyDo)), q(nz(x.nguoiThucHien)),
    q(x.trangThai), q(en(x.ghiChu)), q(en(x.soHoaDon)), q(en(x.ncc)), q(en(x.kiemKeId)), t(now), t(now)])));
s.push(insert('kho_phieu_dong', ['phieu_id', 'thu_tu', 'loai_hang', 'thuoc_tinh', 'so_luong', 'lo', 'don_gia', 'vat', 'dong_hdm_id', 'don_gia_goc',
  'ten_tren_hd', 'ghi_chu'],
  seed.phieuKho.flatMap((x) => x.dong.map((o, i) => [q(x.id), String(i), q(o.loaiHang), q(nz(o.thuocTinh)), num(o.soLuong), q(en(o.lo)),
    o.donGia == null ? 'NULL' : num(o.donGia), o.vat == null ? 'NULL' : num(o.vat), q(en(o.dongHDMua)), o.donGiaGoc == null ? 'NULL' : num(o.donGiaGoc),
    q(en(o.tenTrenHD)), q(en(o.ghiChu))]))));
s.push(insert('kho_anh_xa_ten', ['id', 'ten', 'the_tich', 'nong_do', 'tong_sl', 'so_lan', 'loai_hang', 'lo', 'ghi_chu'],
  seed.anhXaTen.map((x) => [q(x.id), q(x.ten), q(en(x.theTich)), q(en(x.nongDo)), num(x.tongSL), String(x.soLan), q(en(x.loaiHang)), q(en(x.lo)),
    q(en(x.ghiChu))])));

s.push(insert('pt_hop_dong', ['id', 'so_hd', 'ma_kh', 'ten_kh', 'mst', 'ngay_ky', 'ngay_hieu_luc', 'trang_thai', 'ghi_chu', 'truoc_vat', 'vat',
  'ty_le_thue', 'ty_le_giu', 'cach_chia', 'hoa_hong_kieu', 'hoa_hong_gia_tri', 'nguoi_nhan_hh', 'ngay_chi_hh', 'ghi_chu_ho_so_thieu', 'ly_do_huy',
  'tao_luc', 'la_import', 'created_at', 'updated_at'],
  seed.hopDongPhuTai.map((x) => [q(x.id), q(x.soHD), q(x.maKH), q(nz(x.tenKH)), q(nz(x.mst)), d(x.ngayKy), d(x.ngayHieuLuc), q(x.trangThai),
    q(en(x.ghiChu)), num(x.truocVAT), String(x.vat), num(x.tyLeThue), num(x.tyLeGiu), q(en(x.cachChia)), q(x.hoaHongKieu), num(x.hoaHongGiaTri),
    q(en(x.nguoiNhanHH)), d(x.ngayChiHH), q(en(x.ghiChuHoSoThieu)), q(en(x.lyDoHuy)), t(x.taoLuc), q(!!x.import), ...audit(x)])));
s.push(insert('pt_hop_dong_mua', ['hdpt_id', 'thu_tu', 'hdm_id'], seed.hopDongPhuTai.flatMap((x) => x.hdMua.map((m, i) => [q(x.id), String(i), q(m)]))));
s.push(insert('pt_chi_phi', ['hdpt_id', 'thu_tu', 'id', 'loai', 'noi_dung', 'ngay', 'so_tien'],
  seed.hopDongPhuTai.flatMap((x) => x.chiPhi.map((o, i) => [q(x.id), String(i), q(o.id), q(o.loai), q(nz(o.noiDung)), d(o.ngay), num(o.soTien)]))));
s.push(insert('pt_dot_kh', ['hdpt_id', 'thu_tu', 'dot', 'so_tien', 'ngay', 'ghi_chu'],
  seed.hopDongPhuTai.flatMap((x) => x.dotKH.map((o, i) => [q(x.id), String(i), String(o.dot), num(o.soTien), d(o.ngay), q(en(o.ghiChu))]))));
s.push(insert('pt_dot_tra_ncc', ['hdpt_id', 'thu_tu', 'id', 'hdm_id', 'ngay', 'so_tien', 'loai_tien', 'ty_gia'],
  seed.hopDongPhuTai.flatMap((x) => x.dotTraNCC.map((o, i) => [q(x.id), String(i), q(o.id), q(nz(o.hdmId)), d(o.ngay), num(o.soTien), q(o.loaiTien),
    num(o.tyGia)]))));
s.push(insert('pt_doi_chieu', ['hdpt_id', 'thu_tu', 'id', 'ngay_oxy_chuyen', 'so_tien_vnd', 'ngay_pt_chuyen_ncc', 'so_tien_nguyen_te', 'loai_tien',
  'ty_gia', 'ghi_chu'],
  seed.hopDongPhuTai.flatMap((x) => x.doiChieu.map((o, i) => [q(x.id), String(i), q(o.id), d(o.ngayOxyChuyen), num(o.soTienVND), d(o.ngayPTChuyenNCC),
    num(o.soTienNguyenTe), q(o.loaiTien), num(o.tyGia), q(en(o.ghiChu))]))));
s.push(insert('pt_ty_le_log', ['hdpt_id', 'thu_tu', 'truoc', 'sau', 'nguoi', 'luc', 'ly_do'],
  seed.hopDongPhuTai.flatMap((x) => x.tyLeLog.map((o, i) => [q(x.id), String(i), q(o.truoc), q(o.sau), q(o.nguoi), t(o.luc), q(en(o.lyDo))]))));
s.push(insert('pt_dong_tien', ['id', 'ngay', 'chieu', 'hdpt_id', 'so_tien', 'nguon', 'ref_id', 'ghi_chu'],
  seed.dongTienPT.map((x) => [q(x.id), d(x.ngay), q(x.chieu), q(en(x.hdptId)), num(x.soTien), q(x.nguon), q(en(x.refId)), q(en(x.ghiChu))])));
s.push(insert('cv_viec', ['id', 'noi_dung', 'nguoi_tao', 'tao_luc', 'hdb_id', 'han', 'gio', 'uu_tien', 'xong_luc', 'nguoi_xong'],
  seed.viecGiao.map((x) => [q(x.id), q(x.noiDung), q(x.nguoiTao), t(x.taoLuc), q(en(x.hdbId)), d(x.han), q(en(x.gio)), q(!!x.uuTien), t(x.xongLuc),
    q(en(x.nguoiXong))])));
s.push(insert('ht_bo_dem', ['khoa', 'gia_tri'], Object.entries(seed.boDem).map(([k, v]) => [q(k), String(v)])));
s.push('UPDATE ht_trang_thai SET phien_ban = 1 WHERE id = 1;\n');
writeFileSync(resolve(ROOT, 'src/main/resources/db/dev/V2_1__dev_seed.sql'), s.filter(Boolean).join('\n'));
console.log('Đã sinh V2__default_data.sql và V2_1__dev_seed.sql');
