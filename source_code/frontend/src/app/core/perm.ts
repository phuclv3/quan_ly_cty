/**
 * Phân quyền theo NHÓM QUYỀN và MÃ CHỨC NĂNG.
 *
 *   ChucNang (danh mục, định nghĩa trong mã — mỗi chức năng có mã cố định, khớp mã spec)
 *   NhomQuyen ── quyen[maChucNang] = mức quyền          (bảng NhomQuyen_ChucNang)
 *   TaiKhoan  ── nhom[]                                   (bảng TaiKhoan_Nhom)
 *
 * Một tài khoản thuộc nhiều nhóm → quyền là HỢP các nhóm (lấy mức cao nhất từng chức năng).
 * Nhóm có cờ toanQuyen → mức cao nhất của mọi chức năng.
 * Đây là kiểm tra ở giao diện; khi có máy chủ, máy chủ phải kiểm lại theo đúng bảng này (NT-04).
 */
import { NhomQuyen } from './models';

/**
 * Mức quyền, xếp từ thấp tới cao:
 *   none — không thấy · view — xem · ownView — xem bản ghi của mình · request — gửi yêu cầu
 *   draft — lập nháp / gửi duyệt · own — sửa bản ghi của mình · edit — sửa tất cả · approve — duyệt
 */
export type Level = 'none' | 'view' | 'ownView' | 'request' | 'draft' | 'own' | 'edit' | 'approve';

export const LEVEL_LABEL: Record<Level, string> = {
  none: '—',
  view: 'Xem',
  ownView: 'Xem của mình',
  request: 'Gửi yêu cầu',
  draft: 'Lập nháp',
  own: 'Sửa của mình',
  edit: 'Sửa',
  approve: 'Duyệt',
};

const RANK: Record<Level, number> = { none: 0, ownView: 1, view: 1, request: 2, draft: 3, own: 4, edit: 5, approve: 6 };

export const atLeast = (l: Level, min: Level) => RANK[l] >= RANK[min];

/** Khoá quyền dùng trong mã nguồn (ổn định); mỗi khoá gắn 1 mã chức năng ở CHUC_NANG. */
export type Perm =
  | 'taiKhoan'
  | 'cauHinh'
  | 'duyetXoa'
  | 'duyetXoaKT'
  | 'nguonTien'
  | 'soQuy'
  | 'soQuyDuyet'
  | 'tuDuyet'
  | 'cpHD'
  | 'cpHDDuyet'
  | 'congNo'
  | 'khachHang'
  | 'phanBoKH'
  | 'ncc'
  | 'hdb'
  | 'hdbTab3'
  | 'hdbThucThu'
  | 'hdbGiaoHang'
  | 'moLaiHdb'
  | 'moLaiHdm'
  | 'hdm'
  | 'hdmTab4'
  | 'hdmNhapKho'
  | 'khoDanhMuc'
  | 'khoPhieuTay'
  | 'khoTon'
  | 'phuTai'
  | 'phuTaiTyLe'
  | 'baoCao';

export interface ChucNang {
  /** Mã chức năng — khoá chính bảng ChucNang, lưu trong NhomQuyen_ChucNang. */
  ma: string;
  perm: Perm;
  ten: string;
  module: string;
  moTa: string;
  /** Các mức được phép chọn (luôn gồm 'none'). */
  mucDo: Level[];
}

/** Danh mục chức năng phân quyền. Mã bám sheet "Chức năng theo Spec"; mã có hậu tố là quyền tách riêng. */
export const CHUC_NANG: ChucNang[] = [
  // Hệ thống
  { ma: 'NT-03', perm: 'taiKhoan', module: 'Hệ thống', ten: 'Tài khoản, nhóm quyền & phân quyền', moTa: 'Tạo tài khoản, nhóm quyền, gán quyền và gán tài khoản vào nhóm', mucDo: ['none', 'view', 'edit'] },
  { ma: 'NT-14', perm: 'cauHinh', module: 'Hệ thống', ten: 'Tham số cấu hình', moTa: 'Bậc thuế TNDN, tỷ lệ Phú Tài, tiền tố số phiếu, số đợt tối đa', mucDo: ['none', 'view', 'edit'] },
  { ma: 'NT-11', perm: 'duyetXoa', module: 'Hệ thống', ten: 'Duyệt xoá', moTa: 'Gửi yêu cầu xoá; Duyệt = duyệt mọi loại đối tượng', mucDo: ['none', 'request', 'approve'] },
  { ma: 'NT-11-KT', perm: 'duyetXoaKT', module: 'Hệ thống', ten: 'Duyệt xoá chứng từ kế toán', moTa: 'Chỉ duyệt xoá phiếu thu chi, chi phí HĐ, nguồn tiền, loại chi phí', mucDo: ['none', 'approve'] },
  // Kế toán
  { ma: 'KT-01', perm: 'nguonTien', module: 'Kế toán', ten: 'Nguồn tiền & loại chi phí', moTa: 'Danh mục nguồn tiền, số dư; danh mục loại chi phí', mucDo: ['none', 'view', 'edit'] },
  { ma: 'KT-04', perm: 'soQuy', module: 'Kế toán', ten: 'Sổ quỹ — lập phiếu', moTa: 'Lập nháp: chỉ lập đề nghị của mình và gửi duyệt', mucDo: ['none', 'view', 'draft', 'edit'] },
  { ma: 'KT-07', perm: 'soQuyDuyet', module: 'Kế toán', ten: 'Duyệt phiếu thu chi', moTa: 'Duyệt / từ chối phiếu — phiếu đã duyệt mới cộng trừ quỹ', mucDo: ['none', 'approve'] },
  { ma: 'KT-07-TD', perm: 'tuDuyet', module: 'Kế toán', ten: 'Tự duyệt chứng từ của mình', moTa: 'Mặc định người lập không tự duyệt (D-10); bật cho người được ngoại lệ', mucDo: ['none', 'edit'] },
  { ma: 'KT-12', perm: 'cpHD', module: 'Kế toán', ten: 'Chi phí thực hiện HĐ — lập', moTa: 'Sửa của mình: chỉ chi phí của HĐ mình phụ trách', mucDo: ['none', 'view', 'own', 'edit'] },
  { ma: 'KT-14', perm: 'cpHDDuyet', module: 'Kế toán', ten: 'Duyệt chi phí thực hiện HĐ', moTa: 'Duyệt / từ chối chi phí thực hiện HĐ', mucDo: ['none', 'approve'] },
  { ma: 'KT-17', perm: 'congNo', module: 'Kế toán', ten: 'Công nợ phải thu / phải trả', moTa: 'Báo cáo công nợ 2 chiều', mucDo: ['none', 'ownView', 'view'] },
  // Kinh doanh
  { ma: 'HDB-13', perm: 'khachHang', module: 'Kinh doanh', ten: 'Khách hàng & theo dõi kinh doanh', moTa: 'Sửa của mình: KH mình phụ trách và data thô chưa phân bổ', mucDo: ['none', 'view', 'own', 'edit'] },
  { ma: 'HDB-13-PB', perm: 'phanBoKH', module: 'Kinh doanh', ten: 'Phân bổ data khách hàng', moTa: 'Giao / đổi Sale phụ trách khách hàng', mucDo: ['none', 'edit'] },
  { ma: 'HDM-10', perm: 'ncc', module: 'Kinh doanh', ten: 'Danh mục nhà cung cấp', moTa: '', mucDo: ['none', 'view', 'edit'] },
  { ma: 'HDB-01', perm: 'hdb', module: 'Kinh doanh', ten: 'Hợp đồng bán — thông tin, hồ sơ', moTa: 'Của mình: chỉ HĐ mình là Sale phụ trách', mucDo: ['none', 'ownView', 'view', 'own', 'edit'] },
  { ma: 'HDB-07', perm: 'hdbTab3', module: 'Kinh doanh', ten: 'HĐ bán — giá trị & đợt thanh toán', moTa: 'Tab 3', mucDo: ['none', 'view', 'own', 'edit'] },
  { ma: 'HDB-10', perm: 'hdbThucThu', module: 'Kinh doanh', ten: 'HĐ bán — ghi nhận thực thu', moTa: 'Ngày & số tiền khách thực trả (sinh phiếu Thu)', mucDo: ['none', 'edit'] },
  { ma: 'HDB-04', perm: 'hdbGiaoHang', module: 'Kinh doanh', ten: 'HĐ bán — ghi nhận giao hàng', moTa: 'Sinh phiếu xuất kho', mucDo: ['none', 'own', 'edit'] },
  { ma: 'HDB-03-ML', perm: 'moLaiHdb', module: 'Kinh doanh', ten: 'Mở lại HĐ đã tất toán', moTa: 'HĐ quay về Hoàn thành để sửa', mucDo: ['none', 'edit'] },
  { ma: 'HDM-01', perm: 'hdm', module: 'Kinh doanh', ten: 'Hợp đồng mua — thông tin, hàng hoá, hồ sơ', moTa: 'Xem của mình: HĐ mua gắn HĐ bán của mình', mucDo: ['none', 'ownView', 'view', 'edit'] },
  { ma: 'HDM-08', perm: 'hdmTab4', module: 'Kinh doanh', ten: 'HĐ mua — thanh toán NCC', moTa: 'Tab 4: đợt trả NCC, xuất hoá đơn, checklist', mucDo: ['none', 'ownView', 'view', 'edit'] },
  { ma: 'HDM-03-ML', perm: 'moLaiHdm', module: 'Kinh doanh', ten: 'Mở lại HĐ mua đã tất toán', moTa: 'HĐ quay về trạng thái nhận hàng để sửa đợt trả / phiếu chi', mucDo: ['none', 'edit'] },
  { ma: 'HDM-06', perm: 'hdmNhapKho', module: 'Kinh doanh', ten: 'HĐ mua — nhập kho', moTa: 'Sinh phiếu nhập kho', mucDo: ['none', 'edit'] },
  // Kho
  { ma: 'KHO-01', perm: 'khoDanhMuc', module: 'Kho', ten: 'Danh mục kho & loại hàng', moTa: '', mucDo: ['none', 'view', 'edit'] },
  { ma: 'KHO-06', perm: 'khoPhieuTay', module: 'Kho', ten: 'Phiếu nhập / xuất điều chỉnh', moTa: 'Phiếu nhập tay — điều chỉnh', mucDo: ['none', 'view', 'edit'] },
  { ma: 'KHO-09', perm: 'khoTon', module: 'Kho', ten: 'Tồn kho & giá trị theo HĐ', moTa: '', mucDo: ['none', 'view'] },
  // Phú Tài
  { ma: 'PT-01', perm: 'phuTai', module: 'Phú Tài', ten: 'HĐ Phú Tài & quỹ ảo', moTa: '', mucDo: ['none', 'view', 'edit'] },
  { ma: 'PT-06', perm: 'phuTaiTyLe', module: 'Phú Tài', ten: 'Sửa tỷ lệ chia lợi nhuận', moTa: 'Tỷ lệ thuế / Phú Tài giữ theo từng HĐ', mucDo: ['none', 'edit'] },
  // Báo cáo
  { ma: 'BC-01', perm: 'baoCao', module: 'Báo cáo', ten: 'Báo cáo doanh thu, lợi nhuận, thanh toán', moTa: 'Theo nghiep_vu/06_BaoCao', mucDo: ['none', 'ownView', 'view'] },
];

export const MODULES = [...new Set(CHUC_NANG.map((c) => c.module))];
const BY_PERM = new Map(CHUC_NANG.map((c) => [c.perm, c]));
export const chucNangOf = (p: Perm) => BY_PERM.get(p)!;
export const maOf = (p: Perm) => BY_PERM.get(p)!.ma;

/** Mức cao nhất cho phép của một chức năng. */
export const maxLevel = (c: ChucNang): Level => c.mucDo.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'none' as Level);

/** Quyền thực tế của tập nhóm trên một chức năng (hợp các nhóm). */
export function levelOf(groups: readonly NhomQuyen[], p: Perm): Level {
  const c = BY_PERM.get(p);
  if (!c) return 'none';
  let best: Level = 'none';
  for (const g of groups) {
    if (g.trangThai !== 'Hoạt động') continue;
    if (g.toanQuyen) return maxLevel(c);
    const l = g.quyen[c.ma] ?? 'none';
    if (!c.mucDo.includes(l)) continue;
    if (RANK[l] > RANK[best]) best = l;
    // Cùng hạng: "Xem" (tất cả) rộng hơn "Xem của mình".
    else if (RANK[l] === RANK[best] && l === 'view') best = l;
  }
  return best;
}

/** Loại đối tượng mà quyền "Duyệt xoá chứng từ kế toán" (NT-11-KT) được duyệt. */
export const KE_TOAN_DUYET_XOA = ['PhieuThuChi', 'ChiPhiThucHienHD', 'DM_NguonTien', 'DM_LoaiChiPhi'];

// ── Nhóm quyền mặc định — sheet "Ma trận quyền" (D-25, chờ Q-06) ──────────

type Mau = Partial<Record<Perm, Level>>;
const MAU: { id: string; ma: string; ten: string; moTa: string; toanQuyen?: boolean; q: Mau }[] = [
  { id: 'NQ-GD', ma: 'GIAM_DOC', ten: 'Giám đốc', moTa: 'Toàn quyền mọi chức năng', toanQuyen: true, q: {} },
  {
    id: 'NQ-KT', ma: 'KE_TOAN', ten: 'Kế toán', moTa: 'Sổ quỹ, duyệt phiếu, công nợ, Phú Tài',
    q: { cauHinh: 'view', duyetXoa: 'request', duyetXoaKT: 'approve', nguonTien: 'edit', soQuy: 'edit', soQuyDuyet: 'approve', cpHD: 'edit', cpHDDuyet: 'approve', congNo: 'view', khachHang: 'view', ncc: 'view', hdb: 'view', hdbTab3: 'view', hdbThucThu: 'edit', hdm: 'view', hdmTab4: 'edit', khoDanhMuc: 'view', khoPhieuTay: 'view', khoTon: 'view', phuTai: 'edit', phuTaiTyLe: 'edit', baoCao: 'view' },
  },
  {
    id: 'NQ-SALE', ma: 'SALE', ten: 'Sale', moTa: 'Chỉ HĐ bán mình phụ trách; danh mục khách hàng',
    q: { duyetXoa: 'request', soQuy: 'draft', cpHD: 'own', congNo: 'ownView', khachHang: 'own', hdb: 'own', hdbTab3: 'own', hdbGiaoHang: 'own', hdm: 'ownView', hdmTab4: 'ownView', khoDanhMuc: 'view', khoTon: 'view', baoCao: 'ownView' },
  },
  {
    id: 'NQ-ADMIN', ma: 'ADMIN_KD', ten: 'Admin kinh doanh', moTa: 'HĐ bán / mua, hồ sơ, giao nhận',
    q: { duyetXoa: 'request', soQuy: 'draft', cpHD: 'edit', congNo: 'view', khachHang: 'edit', phanBoKH: 'edit', ncc: 'edit', hdb: 'edit', hdbTab3: 'edit', hdbGiaoHang: 'edit', hdm: 'edit', hdmTab4: 'edit', hdmNhapKho: 'edit', khoDanhMuc: 'view', khoTon: 'view', phuTai: 'view', baoCao: 'view' },
  },
  {
    id: 'NQ-KHO', ma: 'KHO', ten: 'Kho', moTa: 'Tồn kho, nhập / xuất, phiếu điều chỉnh',
    q: { duyetXoa: 'request', ncc: 'view', hdb: 'view', hdbGiaoHang: 'edit', hdm: 'view', hdmTab4: 'view', hdmNhapKho: 'edit', khoDanhMuc: 'edit', khoPhieuTay: 'edit', khoTon: 'view' },
  },
  {
    id: 'NQ-XEM', ma: 'CHI_XEM', ten: 'Chỉ xem', moTa: 'Xem mọi số liệu, không có nút hành động',
    q: { nguonTien: 'view', soQuy: 'view', cpHD: 'view', congNo: 'view', khachHang: 'view', ncc: 'view', hdb: 'view', hdbTab3: 'view', hdm: 'view', hdmTab4: 'view', khoDanhMuc: 'view', khoPhieuTay: 'view', khoTon: 'view', phuTai: 'view', baoCao: 'view' },
  },
];

export function nhomMacDinh(now: string): NhomQuyen[] {
  return MAU.map((m) => ({
    id: m.id,
    ma: m.ma,
    ten: m.ten,
    moTa: m.moTa,
    toanQuyen: !!m.toanQuyen,
    trangThai: 'Hoạt động',
    heThong: true,
    quyen: Object.fromEntries(Object.entries(m.q).map(([p, l]) => [maOf(p as Perm), l as Level])),
    taoLuc: now,
  }));
}

