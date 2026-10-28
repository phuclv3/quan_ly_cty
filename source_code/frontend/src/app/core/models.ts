/**
 * Mô hình dữ liệu App Oxy — bám sheet "Trường dữ liệu" của
 * tai_lieu/AppOxy _Spec_Quản_Lý_Nội_Bộ_rev.xlsx (mỗi interface = 1 sheet nguồn).
 *
 * Quy ước:
 *  - Mọi ngày lưu dạng ISO 'YYYY-MM-DD'; mốc giờ lưu ISO đầy đủ.
 *  - Mọi số tiền là VNĐ, số nguyên (trừ đơn giá ngoại tệ ở HĐ Mua).
 *  - Trường "tự tính" (Số dư, Còn phải thu, Tồn…) KHÔNG lưu — tính ở core/calc.ts.
 */
import { TT } from './trang-thai';

// ── Nền tảng ────────────────────────────────────────────────────────────

/**
 * Nhóm quyền (bảng NhomQuyen + NhomQuyen_ChucNang). quyen: mã chức năng (core/perm.ts CHUC_NANG)
 * → mức quyền. Lưu DB thì tách quyen thành bảng con (MaNhom, MaChucNang, MucQuyen).
 */
export interface NhomQuyen {
  id: string;
  /** Mã nhóm, VD KE_TOAN — duy nhất. */
  ma: string;
  ten: string;
  moTa: string;
  /** Toàn quyền: mức cao nhất mọi chức năng (Giám đốc / Owner). */
  toanQuyen: boolean;
  trangThai: typeof TT.HOAT_DONG | typeof TT.NGUNG;
  quyen: Record<string, import('./perm').Level>;
  /** Nhóm khởi tạo sẵn (không xoá được). */
  heThong?: boolean;
  taoLuc: string;
  capNhat?: string;
  nguoiCapNhat?: string;
}

export interface TaiKhoan {
  id: string;
  email: string;
  hoTen: string;
  /** Id các nhóm quyền (bảng TaiKhoan_Nhom). */
  nhom: string[];
  trangThai: typeof TT.HOAT_DONG | typeof TT.KHOA;
  /** Mật khẩu băm (BCrypt) chỉ nằm ở máy chủ — không bao giờ gửi về trình duyệt. */
  batDoiMK: boolean;
  soLanSai: number;
  /** Khoá đăng nhập tạm tới mốc này (sai 5 lần → 15 phút). */
  khoaDen?: string;
  lanDangNhapCuoi?: string;
}

export interface PhienDangNhap {
  token: string;
  email: string;
  /** Lần hoạt động cuối + 12 giờ. */
  hetHan: string;
}

export interface CauHinh {
  /** Mốc bậc thuế TNDN HĐ Bán: tỷ lệ × GTHĐ thực tế trước VAT. */
  TNDN_NGUONG: number;
  TNDN_MUC1: number;
  TNDN_MUC2: number;
  /** Phú Tài đóng TNDN trên LN trước thuế. */
  PT_THUE: number;
  /** Phú Tài giữ (phí quản lý) trên LN sau thuế. */
  PT_GIU: number;
  /**
   * Cách chia lợi nhuận Phú Tài (Q-03): "Nhân" — Oxy = (1 − thuế) × (1 − PT giữ), mặc định 72%;
   * "Cộng" — Oxy = 1 − thuế − PT giữ, đều tính trên LN trước thuế, mặc định 70%.
   */
  PT_CACH_CHIA: CachChiaPT;
  SO_DOT_TOI_DA: number;
  TIEN_TO_TC: string;
  TIEN_TO_CP: string;
  TIEN_TO_NK: string;
  TIEN_TO_XK: string;
}

export type CachChiaPT = 'Nhân' | 'Cộng';
export const CACH_CHIA_PT: CachChiaPT[] = ['Nhân', 'Cộng'];

export type CauHinhKey = keyof CauHinh;

export interface CauHinhLog {
  khoa: CauHinhKey;
  giaTriCu: string;
  giaTriMoi: string;
  nguoiSua: string;
  ngaySua: string;
}

export type DoiTuong =
  | 'PhieuThuChi'
  | 'ChiPhiThucHienHD'
  | 'HopDongBan'
  | 'HopDongMua'
  | 'PhieuKho'
  | 'HopDongPhuTai'
  | 'HoaDon'
  | 'HoSo'
  | 'DongTienPhuTai'
  | 'DM_KhachHang'
  | 'DM_NCC'
  | 'DM_NguonTien'
  | 'DM_LoaiChiPhi'
  | 'DM_Kho'
  | 'DM_LoaiHang';

export const DOI_TUONG_LABEL: Record<DoiTuong, string> = {
  PhieuThuChi: 'Phiếu thu chi',
  ChiPhiThucHienHD: 'Chi phí thực hiện HĐ',
  HopDongBan: 'Hợp đồng bán',
  HopDongMua: 'Hợp đồng mua',
  PhieuKho: 'Phiếu kho',
  HopDongPhuTai: 'HĐ Phú Tài',
  HoaDon: 'Hoá đơn',
  HoSo: 'Tệp hồ sơ',
  DongTienPhuTai: 'Dòng tiền Phú Tài',
  DM_KhachHang: 'Khách hàng',
  DM_NCC: 'Nhà cung cấp',
  DM_NguonTien: 'Nguồn tiền',
  DM_LoaiChiPhi: 'Loại chi phí',
  DM_Kho: 'Kho',
  DM_LoaiHang: 'Mã hàng',
};

export type TrangThaiYC = typeof TT.CHO_DUYET | typeof TT.DA_DUYET | typeof TT.TU_CHOI | typeof TT.DA_RUT;

export interface YeuCauXoa {
  id: string;
  loai: DoiTuong;
  maDoiTuong: string;
  /** Mô tả đối tượng lúc gửi (số phiếu, số HĐ…) để màn duyệt đọc được khi bản ghi đã bị xoá. */
  moTa: string;
  lyDo: string;
  nguoiGui: string;
  ngayGui: string;
  trangThai: TrangThaiYC;
  nguoiDuyet?: string;
  ngayDuyet?: string;
  lyDoTuChoi?: string;
}

// ── Hồ sơ & hoá đơn (NT-12) ─────────────────────────────────────────────

export type ChuHoSo = 'HDB' | 'HDM' | 'HDPT';
export type LoaiHoSo = 'Hợp đồng' | 'BBGH/BBNT' | 'Hoá đơn' | 'Scan khác';
export const LOAI_HO_SO: LoaiHoSo[] = ['Hợp đồng', 'BBGH/BBNT', 'Hoá đơn', 'Scan khác'];
/** Hồ sơ bắt buộc để chuyển "Đã tất toán" (HDB-03). */
export const HO_SO_BAT_BUOC: LoaiHoSo[] = ['Hợp đồng', 'BBGH/BBNT', 'Hoá đơn'];

export interface FileRef {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** Ảnh thu nhỏ dạng data URL (≤160px), chỉ có với ảnh. */
  thumb?: string;
  ngayUpload: string;
  nguoiUpload: string;
}

export interface HoSo {
  id: string;
  chu: ChuHoSo;
  chuId: string;
  loai: LoaiHoSo;
  files: FileRef[];
  daLuu: boolean;
  daScan: boolean;
  /** Bắt buộc khi tích tay "Đã lưu" (bản giấy). */
  ghiChu?: string;
}

export interface HoaDon {
  id: string;
  chu: ChuHoSo;
  chuId: string;
  soHoaDon: string;
  ngayHoaDon: string;
  /** Sau VAT. */
  giaTri: number;
  fileId?: string;
}

// ── Danh mục ────────────────────────────────────────────────────────────

export interface NguonTien {
  id: string;
  ten: string;
  loai: 'Tiền mặt' | 'Ngân hàng';
  soTaiKhoan?: string;
  nganHang?: string;
  soDuDauKy: number;
  ngayDauKy: string;
  trangThai: typeof TT.DANG_DUNG | typeof TT.NGUNG;
}

export type NhomChiPhi = 'Vận hành' | 'Thực hiện HĐ';

export interface LoaiChiPhi {
  id: string;
  ten: string;
  nhom: NhomChiPhi;
  dangDung: boolean;
}

/** Mã cố định của các loại chi phí có quy tắc riêng. */
export const LCP_HOA_HONG = 'CPTH-HH';
export const LCP_VAN_CHUYEN = 'CPTH-VC';

// ── Khách hàng & theo dõi kinh doanh (danh mục theo sheet "DANH MỤC" của file theo dõi KH) ──
export const TIEP_CAN = [TT.CHUA_LIEN_HE, TT.DANG_LIEN_HE, TT.HOP_DONG, TT.HUY] as const;
export type TiepCan = (typeof TIEP_CAN)[number];
export const CO_HOI = [TT.CHUA_TIEP_CAN, TT.DA_BAO_GIA, TT.DANG_DAM_PHAN, TT.KY_HOP_DONG, TT.DA_GIAO_HANG, TT.HOAN_THANH, TT.HUY] as const;
export type CoHoi = (typeof CO_HOI)[number];
export const PHAN_LOAI_KH = ['End-user Tư nhân', 'End-user FDI', 'Thương mại'] as const;
export const NGUON_KH = ['Hotline', 'Đối tác', 'Khách cũ', 'Tự tìm kiếm'] as const;
export const HINH_THUC_HD = ['Trực tiếp', 'Đấu thầu'] as const;
export const LOAI_SP_KH = ['Khí chuẩn', 'Khí công nghiệp', 'Dung dịch chuẩn', 'Khác'] as const;
export const TRANG_THAI_DATA = [TT.CHUA_PHAN_BO, TT.DA_PHAN_BO] as const;
export type TrangThaiData = (typeof TRANG_THAI_DATA)[number];
export const TINH_THANH = [
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
  'Bình Thuận', 'Cà Mau', 'Cần Thơ', 'Cao Bằng', 'Đà Nẵng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai',
  'Hà Giang', 'Hà Nam', 'Hà Nội', 'Hà Tĩnh', 'Hải Dương', 'Hải Phòng', 'Hậu Giang', 'Hòa Bình', 'Hồ Chí Minh', 'Hưng Yên', 'Khánh Hòa',
  'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An', 'Ninh Bình', 'Ninh Thuận',
  'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh',
  'Thái Bình', 'Thái Nguyên', 'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc',
  'Yên Bái', 'Nước ngoài', 'Chưa xác định',
];

/** Một lần chăm sóc / trao đổi với khách (nhật ký, không sửa — chỉ thêm). */
export interface ChamSocKH {
  id: string;
  /** ISO thời điểm ghi. */
  luc: string;
  /** Id tài khoản ghi; "Import" với dòng chuyển từ file Excel. */
  nguoi: string;
  noiDung: string;
  /** Trạng thái cơ hội đổi sang ở lần ghi này (nếu có). */
  coHoi?: CoHoi;
}

/** Giai đoạn một cơ hội bán hàng. */
export const GIAI_DOAN_CH = ['Mới', 'Đã báo giá', 'Đang đàm phán', 'Thắng', 'Thua'] as const;
export type GiaiDoanCH = (typeof GIAI_DOAN_CH)[number];
export const LY_DO_THUA = ['Giá cao hơn đối thủ', 'Dự án hoãn', 'Chọn nhà cung cấp khác', 'Không đáp ứng kỹ thuật', 'Khác'] as const;

/** Một cơ hội bán hàng của khách hàng (lưu cùng bản ghi khách, như nhật ký chăm sóc). */
export interface CoHoiKH {
  /** CH-0001 */
  id: string;
  huongBan: string;
  nhomHang?: string;
  giaTri: number;
  giaiDoan: GiaiDoanCH;
  ngayTao?: string;
  ngayBaoGia?: string;
  /** Ngày chốt Thắng / Thua. */
  ngayChot?: string;
  lyDoThua?: string;
  tuongTacTiep?: string;
  ngayTuongTac?: string;
  /** Cơ hội Thua cần tiếp cận lại vào ngày này. */
  ngayTaiTiepCan?: string;
}

export interface KhachHang {
  id: string;
  ten: string;
  /** Tên viết tắt (VD KCN-A) — tuỳ chọn. */
  tenVietTat?: string;
  mst: string;
  diaChi: string;
  nguoiLienHe: string;
  dienThoai: string;
  email: string;
  ghiChu: string;
  /** F-09: Ngưng → không chọn được cho HĐ mới (thiếu = Đang dùng). */
  trangThai?: typeof TT.DANG_DUNG | typeof TT.NGUNG;
  // ── Theo dõi kinh doanh (thiếu = chưa khai thác) ──
  tinh?: string;
  chucVu?: string;
  phanLoai?: string;
  nguon?: string;
  loaiSP?: string;
  hinhThucHD?: string;
  tiepCan?: TiepCan;
  coHoi?: CoHoi;
  /** Id tài khoản Sale phụ trách; trống = KH chưa phân bổ. */
  phuTrach?: string;
  trangThaiData?: TrangThaiData;
  ngayTiepNhan?: string;
  ngayPhanBo?: string;
  /** Giá trị cơ hội (đã chào giá / dự kiến), VNĐ chưa VAT. */
  giaTriCoHoi?: number;
  chamSoc?: ChamSocKH[];
  dsCoHoi?: CoHoiKH[];
  /** Bản ghi đến từ file theo dõi KH (Excel). */
  import?: boolean;
}

export interface NhaCungCap {
  id: string;
  ten: string;
  mst: string;
  diaChi: string;
  quocGia: string;
  nguoiLienHe: string;
  dienThoai: string;
  email: string;
  ghiChu: string;
  /** F-09: Ngưng → không chọn được cho HĐ mới (thiếu = Đang dùng). */
  trangThai?: typeof TT.DANG_DUNG | typeof TT.NGUNG;
}

export interface Kho {
  id: string;
  ten: string;
  loai: 'Kho thường' | 'Chuyển thẳng';
  dangDung: boolean;
}

/** Vị trí hệ thống "Chuyển thẳng — không qua kho": không sửa, không xoá (KHO-01). */
export const KHO_CHUYEN_THANG = 'KHO-CT';

/**
 * Spec (KHO-02) nêu 3 nhóm Vỏ bình / Thiết bị tái sử dụng / Phụ kiện; dữ liệu kho thực tế
 * (KhoOxyMecie_v3) có thêm Khí chuẩn và Dung dịch chuẩn — giữ cả 5, chờ chốt Q-01.
 */
export type NhomHang = 'Khí chuẩn' | 'Dung dịch chuẩn' | 'Vỏ bình' | 'Thiết bị tái sử dụng' | 'Phụ kiện';
export const NHOM_HANG: NhomHang[] = ['Khí chuẩn', 'Dung dịch chuẩn', 'Vỏ bình', 'Thiết bị tái sử dụng', 'Phụ kiện'];

/**
 * Mã hàng CỐ ĐỊNH (sheet "DM. Mã hàng"): Nhóm × Loại khí / vật liệu × Thể tích, VD KC-NO-8L.
 * Nồng độ (khách đặt khác nhau) và đơn giá không nằm ở mã — ghi theo từng LÔ nhập (DongPhieuKho).
 */
export interface LoaiHang {
  id: string;
  ten: string;
  /** Mô tả hàng hoá ngắn gọn (hiện ở Tồn kho). */
  moTa?: string;
  nhom: NhomHang;
  dvt: string;
  /** Thuộc tính ghi khi nhập lô, VD ['Nồng độ']. */
  thuocTinh: string[];
  dangDung: boolean;
  /** VD "NO", "SO2/NO/CO", "NHOM". */
  loaiKhi?: string;
  /** VD "8L", "500ml". */
  theTich?: string;
  /** Tên đang ghi trên hoá đơn / hợp đồng → mã này (tìm kiếm, gợi ý khi lập HĐ). */
  bietDanh?: string[];
}

// ── Kế toán ─────────────────────────────────────────────────────────────

export type TrangThaiDuyet = typeof TT.NHAP | typeof TT.CHO_DUYET | typeof TT.DA_DUYET | typeof TT.TU_CHOI;

export type LoaiPhieu = 'Thu' | 'Chi' | 'Tạm ứng' | 'Quyết toán tạm ứng' | 'Luân chuyển';
export const LOAI_PHIEU: LoaiPhieu[] = ['Thu', 'Chi', 'Tạm ứng', 'Quyết toán tạm ứng', 'Luân chuyển'];

/** Một bước trong vòng đời chứng từ (gửi duyệt / duyệt / từ chối) — giữ lại cả lý do từ chối cũ. */
export interface LichSuDuyet {
  luc: string;
  /** Id tài khoản. */
  nguoi: string;
  hanhDong: 'Lưu nháp' | 'Gửi duyệt' | 'Rút lại' | 'Duyệt' | 'Từ chối';
  ghiChu?: string;
}

/** Phiếu do nghiệp vụ khác sinh ra (để truy ngược và không cho sửa tay). */
export interface NguonPhatSinh {
  loai: 'HDM-DotTT' | 'HDB-DotTT';
  hdId: string;
  dot: number;
}

export interface PhieuThuChi {
  id: string;
  soPhieu: string;
  ngayLap: string;
  loai: LoaiPhieu;
  /** Nguồn đi với Luân chuyển. */
  nguonTien: string;
  nguonTienDen?: string;
  loaiChiPhi?: string;
  noiDung: string;
  soTienThu: number;
  soTienChi: number;
  phieuTamUngGoc?: string;
  soTienThucChi?: number;
  nguoiNhan?: string;
  /** Id tài khoản. */
  nguoiDeNghi: string;
  trangThai: TrangThaiDuyet;
  nguoiDuyet?: string;
  ngayDuyet?: string;
  lyDoTuChoi?: string;
  files: FileRef[];
  ghiChu?: string;
  phatSinh?: NguonPhatSinh;
  /** Dữ liệu import (NT-13). */
  import?: boolean;
  lichSu?: LichSuDuyet[];
}

export interface ChiPhiHD {
  id: string;
  maCP: string;
  hdbId: string;
  ngay: string;
  loaiChiPhi: string;
  noiDung: string;
  soTien: number;
  nguonTien: string;
  nguoiThucHien: string;
  nguoiNhan?: string;
  donViVanChuyen?: string;
  trangThai: TrangThaiDuyet;
  nguoiDuyet?: string;
  ngayDuyet?: string;
  lyDoTuChoi?: string;
  files: FileRef[];
  ghiChu?: string;
  lichSu?: LichSuDuyet[];
}

// ── Kinh doanh ──────────────────────────────────────────────────────────

export type TrangThaiHDB = typeof TT.BAO_GIA | typeof TT.HIEU_LUC | typeof TT.DANG_GIAO_HANG | typeof TT.HOAN_THANH | typeof TT.DA_TAT_TOAN | typeof TT.HUY;
export const TRANG_THAI_HDB: TrangThaiHDB[] = [
  TT.BAO_GIA,
  TT.HIEU_LUC,
  TT.DANG_GIAO_HANG,
  TT.HOAN_THANH,
  TT.DA_TAT_TOAN,
  TT.HUY,
];

export interface ThamSoThue {
  nguong: number;
  muc1: number;
  muc2: number;
}

export interface DotTTBan {
  dot: number;
  tyLe?: number;
  soTien: number;
  han?: string;
  /** Hạn = Ngày hiệu lực + N ngày (5/10/20/30…) — chọn thay cho gõ ngày tay; han tự tính. */
  hanNgay?: number;
  ngayThu?: string;
  soTienThu?: number;
  nguonTienNhan?: string;
  ghiChu?: string;
  /** Phiếu Thu sinh kèm khi Kế toán ghi nhận thực thu. */
  phieuThuId?: string;
}

/**
 * Một dòng hàng của HĐ bán / báo giá: chọn mã hàng từ danh mục kho, đơn giá HĐ và đơn giá thực hiện
 * (giá vốn dự kiến — dùng cho Bảng tính giá / Tờ trình). Nồng độ khách đặt ghi ở Tên hàng.
 */
export interface DongHangBan {
  id: string;
  loaiHang: string;
  tenHang: string;
  soLuong: number;
  /** Đơn giá HĐ trước VAT. */
  donGia: number;
  /** Đơn giá thực hiện trước VAT (giá vốn dự kiến). */
  donGiaTH: number;
  ghiChu?: string;
}

/**
 * Việc được giao / lịch hẹn (nghiep_vu 09 — ToDoList): giao cho 1 hoặc nhiều người (trống = việc của mình),
 * gắn HĐ bán tuỳ chọn, có hạn, trao đổi dạng hội thoại, đánh dấu xong / mở lại.
 */
export interface ViecGiao {
  id: string;
  noiDung: string;
  /** Id tài khoản người giao. */
  nguoiTao: string;
  taoLuc: string;
  /** Id tài khoản người nhận — rỗng = việc của chính người tạo. */
  nguoiNhan: string[];
  hdbId?: string;
  /** Hạn 'YYYY-MM-DD' và giờ 'HH:mm' (tuỳ chọn). */
  han?: string;
  gio?: string;
  /** Giám đốc giao → ưu tiên. */
  uuTien?: boolean;
  xongLuc?: string;
  nguoiXong?: string;
  phanHoi: { nguoi: string; luc: string; noiDung: string; heThong?: boolean }[];
  /** Mã việc VIEC-0001. */
  ma?: string;
  nhom?: NhomViec;
  /** Ngày bắt đầu; `han` là ngày kết thúc. */
  batDau?: string;
  mucUuTien?: MucUuTien;
  nguonLoai?: NguonViec;
  hdmId?: string;
  yeuCauHan?: YeuCauHan;
  /** Tệp đính kèm khi giao việc. */
  files?: FileRef[];
}

/**
 * Cảnh báo rủi ro nhập tay (tab Cảnh báo) — nghiệp vụ riêng với việc được giao, bảng riêng.
 * Cảnh báo hệ thống tự phát hiện không lưu, tính lại từ dữ liệu mỗi lần xem.
 */
export interface CanhBaoTay {
  id: string;
  /** Mã CB-0001. */
  ma: string;
  muc: MucCanhBao;
  noiDung: string;
  anhHuong: string;
  /** Người theo dõi: nhóm phụ trách. */
  theoDoi?: NhomViec;
  hdbId?: string;
  hdmId?: string;
  nguoiTao: string;
  taoLuc: string;
  /** Có = đã xử lý. */
  xuLyLuc?: string;
  nguoiXuLy?: string;
  /** Ghi chú khi xử lý. */
  ghiChuXuLy?: string;
  /** TAY = người dùng báo rủi ro; HE_THONG = vết xử lý của cảnh báo hệ thống tự phát hiện (nội dung là ảnh chụp lúc có người thao tác đầu tiên). */
  nguon: 'TAY' | 'HE_THONG';
  /** Khoá ổn định của cảnh báo hệ thống (VD tc-thu-<id HĐ bán>). */
  khoaHeThong?: string;
  /** Id tài khoản được giao xử lý. */
  nguoiPhuTrach?: string;
  lichSu: LichSuCanhBao[];
}

export interface LichSuCanhBao {
  luc: string;
  nguoi: string;
  hanhDong: 'Báo rủi ro' | 'Giao người phụ trách' | 'Đã xử lý' | 'Mở lại';
  ghiChu?: string;
}

/** Nguyên tắc đánh mức: P0 rủi ro nghiêm trọng đang xảy ra / sắp xảy ra, cần can thiệp ngay; P1 đáng kể, có khả năng ảnh hưởng cam kết hoặc tài chính; P2 dấu hiệu sớm, còn thời gian phòng ngừa. */
export const MUC_CANH_BAO = ['P0', 'P1', 'P2'] as const;
export type MucCanhBao = (typeof MUC_CANH_BAO)[number];
export const MUC_CANH_BAO_TEN: Record<MucCanhBao, string> = { P0: 'Khẩn cấp', P1: 'Cao', P2: 'Cảnh báo sớm' };
export const MUC_CANH_BAO_MOTA: Record<MucCanhBao, string> = {
  P0: 'Rủi ro nghiêm trọng đang xảy ra hoặc sắp xảy ra, cần can thiệp ngay',
  P1: 'Rủi ro đáng kể, có khả năng ảnh hưởng cam kết hoặc tài chính',
  P2: 'Dấu hiệu rủi ro còn ở mức thấp, có thời gian phòng ngừa',
};

export const NHOM_VIEC = ['Kinh doanh', 'Marketing', 'Mua hàng', 'Kho', 'Kế toán', 'Hành chính', 'Kỹ thuật'] as const;
export type NhomViec = (typeof NHOM_VIEC)[number];
export const MUC_UU_TIEN = ['Cao', 'Trung bình', 'Thấp'] as const;
export type MucUuTien = (typeof MUC_UU_TIEN)[number];
export type NguonViec = 'HDB' | 'HDM' | 'NOI_BO';
/** Người giao phải duyệt yêu cầu đổi hạn trong thời gian này, quá giờ thì hạn giữ nguyên. */
export const PHUT_DUYET_HAN = 60;

/** Yêu cầu còn trong thời hạn duyệt (≤ 60 phút kể từ lúc gửi). */
export const ycConHan = (y: YeuCauHan | undefined, now = Date.now()): boolean =>
  !!y && y.trangThai === 'Chờ duyệt' && now < new Date(y.luc).getTime() + PHUT_DUYET_HAN * 60_000;

/** Người nhận đề nghị đổi hạn (kèm tệp); người giao duyệt. */
export interface YeuCauHan {
  nguoi: string;
  luc: string;
  hanMoi: string;
  gioMoi?: string;
  lyDo: string;
  files: FileRef[];
  trangThai: 'Chờ duyệt' | 'Đã duyệt' | 'Từ chối' | 'Hết hạn';
}

/** Phiếu đề nghị cấp vật tư: HĐ bán thiếu hàng trong kho → đề nghị mua; HĐ mua lấy dòng từ đề nghị. */
export interface DeNghiVatTu {
  id: string;
  soPhieu: string;
  ngay: string;
  hdbId: string;
  /** Id tài khoản. */
  nguoiDeNghi: string;
  /** dongBanId: dòng sản phẩm HĐ bán sinh ra dòng đề nghị (dữ liệu cũ không có → tính gộp theo mã). */
  dong: { id: string; loaiHang: string; tenHang: string; soLuong: number; ghiChu?: string; dongBanId?: string }[];
  ghiChu?: string;
  /** Huỷ đề nghị (không mua nữa). */
  lyDoHuy?: string;
}

export interface HopDongBan {
  id: string;
  soHD: string;
  maKH: string;
  tenKH: string;
  mst: string;
  diaChi: string;
  ngayKy?: string;
  ngayHieuLuc?: string;
  trangThai: TrangThaiHDB;
  /** Id tài khoản Sale. */
  sale: string;
  ghiChu: string;
  truocVAT: number;
  vat: 0 | 8 | 10;
  thucTeTruocVAT: number;
  thamSoThue: ThamSoThue;
  dotTT: DotTTBan[];
  /** Dòng hàng chọn từ kho — có dòng thì Giá trị trước VAT / GTHĐ thực tế tự cộng từ dòng. */
  dongHang?: DongHangBan[];
  /** Có tạm ứng: Ngày hiệu lực = ngày thực thu đợt 1; không: = Ngày ký (tự điền, không nhập tay). */
  coTamUng?: boolean;
  /** Phạt HĐ khi quyết toán (VNĐ, giảm số phải thu): Giá trị quyết toán = Sau VAT − Phạt. */
  phatHD?: number;
  lyDoPhat?: string;
  /** Lý do huỷ HĐ (trạng thái Huỷ). */
  lyDoHuy?: string;
  ghiChuHoSoThieu?: string;
  taoLuc: string;
  import?: boolean;
}

export type TrangThaiHDM = typeof TT.NHAP | typeof TT.DA_KY | typeof TT.DANG_NHAN_HANG | typeof TT.DA_NHAN_DU | typeof TT.DA_TAT_TOAN | typeof TT.HUY;
export const TRANG_THAI_HDM: TrangThaiHDM[] = [
  TT.NHAP,
  TT.DA_KY,
  TT.DANG_NHAN_HANG,
  TT.DA_NHAN_DU,
  TT.DA_TAT_TOAN,
  TT.HUY,
];

export type LoaiTien = 'VNĐ' | 'USD' | 'RMB';
export const LOAI_TIEN: LoaiTien[] = ['VNĐ', 'USD', 'RMB'];

export interface DongHangMua {
  id: string;
  loaiHang: string;
  tenHang: string;
  thongSo: string;
  soLuong: number;
  dvt: string;
  donGia: number;
  loaiTien: LoaiTien;
  tyGia: number;
  ghiChu?: string;
  /** Dòng lấy từ đề nghị cấp vật tư — 1 HĐ mua có thể gom đề nghị của nhiều HĐ bán. */
  dnvtId?: string;
  dnvtDong?: string;
  /** HĐ bán mà dòng này mua cho (khi HĐ mua phục vụ nhiều HĐ bán). */
  hdbId?: string;
}

export interface DotTTMua {
  dot: number;
  /** Tỷ lệ % trên Tổng giá trị HĐ mua — có thì Số tiền tự tính lại khi tổng đổi. */
  tyLe?: number;
  soTien: number;
  /** Hạn theo tiến độ: mốc ('Ngày ký' hoặc một mục checklist HĐ mua) + hanNgay ngày. Không có = nhập ngày tay. */
  hanMoc?: string;
  hanNgay?: number;
  han?: string;
  ngayTra?: string;
  soTienTra?: number;
  nguonTien?: string;
  /** Phiếu Chi ở Sổ quỹ — đợt chỉ tính "đã trả" khi phiếu được duyệt (HDM-08). */
  phieuChiId?: string;
  ghiChu?: string;
}

export interface ChecklistItem {
  ten: string;
  xong: boolean;
  ngay?: string;
}

export const CHECKLIST_HDM = ['Đặt hàng', 'Thanh toán Đợt 1', 'Hàng về', 'Kiểm định', 'Nhập kho'];
/** Mục checklist tự tích theo phiếu nhập — chỉ nhập kho khi đã có hoá đơn NCC. */
export const CL_NHAP_KHO = 'Nhập kho';
/** Tên checklist cũ (trước v13) → tên mới. */
export const CHECKLIST_HDM_CU: Record<string, string> = {
  'Đã đặt hàng': 'Đặt hàng',
  'Đã thanh toán đợt 1': 'Thanh toán Đợt 1',
  'Hàng đã về': 'Hàng về',
  'Đã kiểm định': 'Kiểm định',
  'Đã nhập kho': 'Nhập kho',
};

export interface HopDongMua {
  id: string;
  soHD: string;
  maNCC: string;
  tenNCC: string;
  diaChi: string;
  mst: string;
  ngayKy?: string;
  hdbId?: string;
  thuocPhuTai: boolean;
  trangThai: TrangThaiHDM;
  ghiChu: string;
  chiTiet: DongHangMua[];
  nhapTay: boolean;
  tongNhapTay?: number;
  lyDoNhapTay?: string;
  dotTT: DotTTMua[];
  xuatHoaDon: 'Đã' | 'Chưa';
  checklist: ChecklistItem[];
  ghiChuHoSoThieu?: string;
  taoLuc: string;
  import?: boolean;
}

// ── Kho ─────────────────────────────────────────────────────────────────

export type NguonGocPhieuKho = 'Tự động HĐ Mua' | 'Tự động HĐ Bán' | 'Nhập tay – điều chỉnh';

/**
 * Phiếu nhập: mỗi dòng = một LÔ (mã lô là khoá trừ kho), có đơn giá riêng.
 * Phiếu xuất: mỗi dòng trừ đúng một lô → giá vốn = đơn giá của lô đó (đích danh, không bình quân).
 */
export interface DongPhieuKho {
  /** Mã hàng (DM mã hàng). */
  loaiHang: string;
  /** Quy cách / nồng độ theo hoá đơn — nhập tự do (VD "NO 500ppm", "COD 50ppm"). Phiếu xuất: chép từ lô. */
  thuocTinh: string;
  soLuong: number;
  /** Nhập: mã lô sinh ra (VD L259-05). Xuất: mã lô bị trừ. */
  lo?: string;
  /** Nhập: đơn giá chưa VAT của lô (VNĐ). */
  donGia?: number;
  /** Nhập: VAT % của hoá đơn. */
  vat?: number;
  /** Phiếu nhập tự động: id dòng HĐ Mua. */
  dongHDMua?: string;
  /** Phiếu xuất: đơn giá vốn = đơn giá của lô, chốt lúc lập (KHO-10). */
  donGiaGoc?: number;
  /** Phiếu xuất: tên hàng ghi trên hợp đồng bán (nhập tay). */
  tenTrenHD?: string;
  /** Ghi chú của dòng (cột "Ghi chú" sheet NhapKho / XuatKho). */
  ghiChu?: string;
}

export interface PhieuKho {
  id: string;
  soPhieu: string;
  ngay: string;
  loai: 'Nhập' | 'Xuất';
  nguonGoc: NguonGocPhieuKho;
  /** Id HĐ Mua (phiếu nhập) hoặc HĐ Bán (phiếu xuất). */
  hdId?: string;
  kho: string;
  lyDo?: string;
  nguoiThucHien: string;
  trangThai: typeof TT.HIEU_LUC | typeof TT.DA_HUY;
  ghiChu?: string;
  dong: DongPhieuKho[];
  /** Phiếu nhập: số hoá đơn NCC (VD "HĐ 259"). */
  soHoaDon?: string;
  /** Phiếu nhập: mã nhà cung cấp. */
  ncc?: string;
  /** Phiếu sinh từ đợt kiểm kê. */
  kiemKeId?: string;
}

/** Một đợt kiểm kê thực tế tại kho — đối chiếu với tồn sổ theo mã hàng. */
export interface KiemKe {
  id: string;
  soPhieu: string;
  ngay: string;
  kho: string;
  nguoiThucHien: string;
  ghiChu?: string;
  /** Một dòng đếm — cùng mã có thể nhiều dòng (khác xuất xứ / nồng độ). */
  dong: DongKiemKe[];
  /** Phiếu nhập / xuất điều chỉnh đã sinh từ chênh lệch. */
  phieuDieuChinh?: string[];
}

export interface DongKiemKe {
  loaiHang: string;
  soLuong: number;
  /** Tên hàng như ghi trên bình / nhãn khi đếm. */
  tenHang?: string;
  xuatXu?: string;
  nongDo?: string;
  ghiChu?: string;
}

/**
 * Ánh xạ tên hàng ghi trong HĐ bán → mã hàng / lô hay dùng (sheet "5. AnhXaTenBan").
 * Nồng độ ghi tự do nên máy không tự khớp — người biết hàng gán một lần, lần sau xuất kho chọn theo tên là ra mã + lô.
 */
export interface AnhXaTen {
  id: string;
  ten: string;
  theTich?: string;
  nongDo?: string;
  /** Tổng SL đã bán / số lần xuất hiện trong các HĐ bán (số liệu khi lập bảng). */
  tongSL: number;
  soLan: number;
  loaiHang?: string;
  lo?: string;
  ghiChu?: string;
}

// ── Phú Tài ─────────────────────────────────────────────────────────────

export type TrangThaiPT = typeof TT.BAO_GIA | typeof TT.HIEU_LUC | typeof TT.DANG_THUC_HIEN | typeof TT.HOAN_THANH | typeof TT.DA_TAT_TOAN | typeof TT.HUY;
export const TRANG_THAI_PT: TrangThaiPT[] = [
  TT.BAO_GIA,
  TT.HIEU_LUC,
  TT.DANG_THUC_HIEN,
  TT.HOAN_THANH,
  TT.DA_TAT_TOAN,
  TT.HUY,
];

export interface ChiPhiPT {
  id: string;
  loai: 'Vận chuyển' | 'Hải quan' | 'Khác';
  noiDung: string;
  ngay: string;
  soTien: number;
}

export interface DotKHTraPT {
  dot: number;
  soTien: number;
  ngay: string;
  ghiChu?: string;
}

export interface DotPTTraNCC {
  id: string;
  hdmId: string;
  ngay: string;
  soTien: number;
  loaiTien: LoaiTien;
  tyGia: number;
}

export interface DoiChieuPT {
  id: string;
  ngayOxyChuyen?: string;
  soTienVND: number;
  ngayPTChuyenNCC?: string;
  soTienNguyenTe: number;
  loaiTien: LoaiTien;
  tyGia: number;
  ghiChu?: string;
}

export interface TyLePTLog {
  truoc: string;
  sau: string;
  nguoi: string;
  luc: string;
  lyDo?: string;
}

export interface HopDongPhuTai {
  id: string;
  soHD: string;
  maKH: string;
  tenKH: string;
  mst: string;
  ngayKy?: string;
  ngayHieuLuc?: string;
  trangThai: TrangThaiPT;
  ghiChu: string;
  truocVAT: number;
  vat: 0 | 8 | 10;
  hdMua: string[];
  chiPhi: ChiPhiPT[];
  dotKH: DotKHTraPT[];
  dotTraNCC: DotPTTraNCC[];
  tyLeThue: number;
  tyLeGiu: number;
  /** Cách chia lưu theo HĐ lúc tạo (thiếu = "Nhân", như các HĐ trước khi có tham số). */
  cachChia?: CachChiaPT;
  tyLeLog: TyLePTLog[];
  hoaHongKieu: 'Số tiền' | '%';
  hoaHongGiaTri: number;
  nguoiNhanHH?: string;
  ngayChiHH?: string;
  doiChieu: DoiChieuPT[];
  ghiChuHoSoThieu?: string;
  /** Lý do huỷ HĐ (bắt buộc khi chuyển "Huỷ"). */
  lyDoHuy?: string;
  taoLuc: string;
  import?: boolean;
}

export interface DongTienPT {
  id: string;
  ngay: string;
  chieu: 'Thu về PT' | 'Chi từ PT';
  hdptId?: string;
  soTien: number;
  nguon: 'Tự động' | 'Nhập tay';
  /** Dòng tự động: id dòng đối chiếu sinh ra nó. */
  refId?: string;
  ghiChu?: string;
}

// ── Toàn bộ cơ sở dữ liệu ───────────────────────────────────────────────

export interface Db {
  version: number;
  taiKhoan: TaiKhoan[];
  nhomQuyen: NhomQuyen[];
  phien: PhienDangNhap[];
  cauHinh: CauHinh;
  cauHinhLog: CauHinhLog[];
  yeuCauXoa: YeuCauXoa[];
  hoSo: HoSo[];
  hoaDon: HoaDon[];
  nguonTien: NguonTien[];
  loaiChiPhi: LoaiChiPhi[];
  khachHang: KhachHang[];
  ncc: NhaCungCap[];
  kho: Kho[];
  loaiHang: LoaiHang[];
  phieuThuChi: PhieuThuChi[];
  chiPhiHD: ChiPhiHD[];
  hopDongBan: HopDongBan[];
  hopDongMua: HopDongMua[];
  phieuKho: PhieuKho[];
  kiemKe: KiemKe[];
  anhXaTen: AnhXaTen[];
  deNghiVatTu: DeNghiVatTu[];
  viecGiao: ViecGiao[];
  /** Cảnh báo rủi ro nhập tay — bảng riêng, không lẫn với việc được giao. */
  canhBao: CanhBaoTay[];
  hopDongPhuTai: HopDongPhuTai[];
  dongTienPT: DongTienPT[];
  /** Bộ đếm số chứng từ theo tiền tố + năm, VD { 'TC26': 12 } — không tái dùng số đã xoá. */
  boDem: Record<string, number>;
}

export type TableKey = Exclude<keyof Db, 'version' | 'cauHinh' | 'boDem'>;
