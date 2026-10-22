/**
 * Mọi công thức tự tính của spec — hàm thuần, không đụng tới signal hay DOM.
 * Mỗi hàm ghi mã chức năng spec để tra ngược (sheet "Chức năng theo Spec").
 */
import {
  ChiPhiHD,
  Db,
  DongHangMua,
  DongPhieuKho,
  DotTTBan,
  HO_SO_BAT_BUOC,
  HopDongBan,
  HopDongMua,
  HopDongPhuTai,
  KHO_CHUYEN_THANG,
  KiemKe,
  LCP_HOA_HONG,
  LoaiHoSo,
  LoaiTien,
  PhieuKho,
  PhieuThuChi,
  ThamSoThue,
} from './models';
import { daysFromToday, sum, todayIso, vnd } from './util';

// ── Chung ───────────────────────────────────────────────────────────────

export const sauVAT = (truoc: number, vat: number) => Math.round(truoc * (1 + vat / 100));

/** Một bước trong bảng "hiển thị từng bước tính". */
export interface Buoc {
  nhan: string;
  congThuc: string;
  giaTri: number;
  /** Dòng kết quả chính (in đậm). */
  chinh?: boolean;
  /** Đơn vị khác tiền, VD tỷ lệ. */
  kieu?: 'tien' | 'pct';
}

// ── HĐ Bán ──────────────────────────────────────────────────────────────

/** HDB-08: thuế TNDN luỹ tiến trên chênh lệch, mốc = nguong × GTHĐ thực tế trước VAT. */
export function thueTNDN(chenhLech: number, thucTe: number, ts: ThamSoThue) {
  const moc = ts.nguong * thucTe;
  if (chenhLech <= 0) return { moc, phan1: 0, phan2: 0, thue1: 0, thue2: 0, thue: 0 };
  const phan1 = Math.min(chenhLech, moc);
  const phan2 = Math.max(chenhLech - moc, 0);
  const thue1 = Math.round(phan1 * ts.muc1);
  const thue2 = Math.round(phan2 * ts.muc2);
  return { moc, phan1, phan2, thue1, thue2, thue: thue1 + thue2 };
}

/** Đợt quá hạn: quá Hạn mà chưa thu đủ (HDB-10). */
export function dotQuaHan(d: { han?: string; soTien: number }, daTra: number): boolean {
  return !!d.han && d.han < todayIso() && daTra < d.soTien;
}

export function soNgayQuaHan(han?: string): number {
  return han ? Math.max(0, -daysFromToday(han)) : 0;
}

/**
 * Số tiền đã thu của một đợt HĐ Bán — chỉ tính khi phiếu Thu được DUYỆT (F-02, đối xứng HDM-08).
 * Đợt import không có phiếu Thu (dữ liệu lịch sử) tính theo số đã ghi.
 */
export function dotBanDaThu(d: DotTTBan, db: Db): number {
  if (!d.phieuThuId) return d.soTienThu ?? 0;
  const p = db.phieuThuChi.find((x) => x.id === d.phieuThuId);
  return p && p.trangThai === 'Đã duyệt' ? p.soTienThu : 0;
}

/** Phần thực thu đã ghi nhận nhưng phiếu Thu còn Chờ duyệt. */
export function dotBanChoDuyet(d: DotTTBan, db: Db): number {
  if (!d.phieuThuId) return 0;
  const p = db.phieuThuChi.find((x) => x.id === d.phieuThuId);
  return p && p.trangThai === 'Chờ duyệt' ? p.soTienThu : 0;
}

export type GiaoHangTT = 'Chưa giao' | 'Đang giao' | 'Đã giao';

export interface HdbCalc {
  sauVAT: number;
  chenhLech: number;
  tyLeCL: number;
  thue: ReturnType<typeof thueTNDN>;
  /** Chỉ phiếu Thu đã duyệt (F-02). */
  daThu: number;
  /** Đã ghi nhận, phiếu Thu đang chờ duyệt — chưa tính vào Đã thu. */
  daThuCho: number;
  conPhaiThu: number;
  pctThu: number;
  /** Tổng hoa hồng (tiền trả khách) mọi trạng thái trừ Từ chối, và phần đã duyệt. */
  tienTraKhach: number;
  tienTraKhachDuyet: number;
  /** Gợi ý tối đa tiền trả khách = Chênh lệch − Thuế TNDN. */
  traKhachToiDa: number;
  cpDuyet: number;
  cpCho: number;
  giaVon: number;
  giaVonNguon: 'Xuất kho' | 'HĐ Mua liên quan' | 'Chưa có';
  lnGop: number;
  lnSauThue: number;
  hoSoThieu: LoaiHoSo[];
  daXuatHD: number;
  conPhaiXuatHD: number;
  giaoHang: GiaoHangTT;
  soLanGiao: number;
  dotGanNhat?: DotTTBan;
  quaHan: number;
}

export function hdbCalc(h: HopDongBan, db: Db): HdbCalc {
  const sau = sauVAT(h.truocVAT, h.vat);
  const chenhLech = h.thucTeTruocVAT > 0 ? h.truocVAT - h.thucTeTruocVAT : 0;
  const tyLeCL = h.thucTeTruocVAT > 0 ? chenhLech / h.thucTeTruocVAT : 0;
  const thue = thueTNDN(chenhLech, h.thucTeTruocVAT, h.thamSoThue);
  const daThu = sum(h.dotTT, (d) => dotBanDaThu(d, db));
  const daThuCho = sum(h.dotTT, (d) => dotBanChoDuyet(d, db));
  const cps = db.chiPhiHD.filter((c) => c.hdbId === h.id);
  const hh = cps.filter((c) => c.loaiChiPhi === LCP_HOA_HONG && c.trangThai !== 'Từ chối');
  const cpDuyet = sum(
    cps.filter((c) => c.trangThai === 'Đã duyệt'),
    (c) => c.soTien,
  );
  const cpCho = sum(
    cps.filter((c) => c.trangThai === 'Chờ duyệt'),
    (c) => c.soTien,
  );
  const xk = db.phieuKho.filter((p) => p.loai === 'Xuất' && p.hdId === h.id && p.trangThai === 'Hiệu lực');
  const giaVonXK = sum(xk, (p) => sum(p.dong, (d) => (d.donGiaGoc ?? 0) * d.soLuong));
  const hdms = db.hopDongMua.filter((m) => m.hdbId === h.id && m.trangThai !== 'Huỷ');
  const giaVonHDM = sum(hdms, (m) => hdmTong(m));
  const giaVon = giaVonXK > 0 ? giaVonXK : giaVonHDM;
  const giaVonNguon = giaVonXK > 0 ? 'Xuất kho' : giaVonHDM > 0 ? 'HĐ Mua liên quan' : 'Chưa có';
  const lnGop = h.truocVAT - giaVon - cpDuyet;
  const hoaDons = db.hoaDon.filter((x) => x.chu === 'HDB' && x.chuId === h.id);
  const daXuatHD = sum(hoaDons, (x) => x.giaTri);
  const chuaQua = h.dotTT.filter((d) => dotBanDaThu(d, db) < d.soTien && d.han);
  chuaQua.sort((a, b) => (a.han! < b.han! ? -1 : 1));
  return {
    sauVAT: sau,
    chenhLech,
    tyLeCL,
    thue,
    daThu,
    daThuCho,
    conPhaiThu: sau - daThu,
    pctThu: sau > 0 ? daThu / sau : 0,
    tienTraKhach: sum(hh, (c) => c.soTien),
    tienTraKhachDuyet: sum(
      hh.filter((c) => c.trangThai === 'Đã duyệt'),
      (c) => c.soTien,
    ),
    traKhachToiDa: Math.max(0, chenhLech - thue.thue),
    cpDuyet,
    cpCho,
    giaVon,
    giaVonNguon,
    lnGop,
    lnSauThue: lnGop - thue.thue,
    hoSoThieu: hoSoThieu(db, 'HDB', h.id),
    daXuatHD,
    conPhaiXuatHD: sau - daXuatHD,
    giaoHang:
      h.trangThai === 'Hoàn thành' || h.trangThai === 'Đã tất toán'
        ? 'Đã giao'
        : xk.length > 0
          ? 'Đang giao'
          : 'Chưa giao',
    soLanGiao: xk.length,
    dotGanNhat: chuaQua[0],
    quaHan: h.dotTT.filter((d) => dotQuaHan(d, dotBanDaThu(d, db))).length,
  };
}

/** HDB-11 — bảng từng bước lợi nhuận gộp tạm tính. */
export function hdbBuocLoiNhuan(h: HopDongBan, c: HdbCalc): Buoc[] {
  return [
    { nhan: 'GTHĐ trước VAT', congThuc: 'Tab 3', giaTri: h.truocVAT },
    { nhan: `Giá vốn (${c.giaVonNguon})`, congThuc: 'Σ giá gốc xuất kho, chưa xuất thì Σ HĐ Mua liên quan', giaTri: c.giaVon },
    { nhan: 'Chi phí thực hiện đã duyệt', congThuc: 'Σ ChiPhiThucHienHD (Đã duyệt)', giaTri: c.cpDuyet },
    { nhan: 'Lợi nhuận gộp tạm tính', congThuc: 'GTHĐ trước VAT − Giá vốn − Chi phí', giaTri: c.lnGop, chinh: true },
    { nhan: 'Thuế TNDN trên chênh lệch', congThuc: 'HDB-08', giaTri: c.thue.thue },
    { nhan: 'Lợi nhuận sau thuế', congThuc: 'LN gộp − Thuế TNDN', giaTri: c.lnSauThue, chinh: true },
  ];
}

/** Điều kiện chuyển trạng thái HĐ Bán (HDB-03). Trả danh sách điều kiện còn thiếu. */
export function hdbThieuDeChuyen(h: HopDongBan, toi: HopDongBan['trangThai'], db: Db): string[] {
  const c = hdbCalc(h, db);
  const out: string[] = [];
  if (toi === 'Hiệu lực') {
    if (!h.soHD.trim()) out.push('Chưa có Số HĐ');
    if (!h.ngayKy) out.push('Chưa có Ngày ký');
    if (h.truocVAT <= 0) out.push('Chưa có Giá trị HĐ');
  }
  if (toi === 'Đã tất toán') {
    if (c.conPhaiThu > 0) out.push(`Còn phải thu ${vnd(c.conPhaiThu)}`);
    if (c.hoSoThieu.length) out.push(`Thiếu hồ sơ: ${c.hoSoThieu.join(', ')}`);
    if (c.cpCho > 0) out.push('Còn chi phí thực hiện Chờ duyệt');
    if (c.daThuCho > 0) out.push(`Còn phiếu Thu chờ duyệt ${vnd(c.daThuCho)} (chưa tính vào Đã thu)`);
  }
  return out;
}

// ── HĐ Mua ──────────────────────────────────────────────────────────────

export const thanhTienVND = (d: DongHangMua) =>
  Math.round(d.soLuong * d.donGia * (d.loaiTien === 'VNĐ' ? 1 : d.tyGia || 0));

export const donGiaVND = (d: DongHangMua) => d.donGia * (d.loaiTien === 'VNĐ' ? 1 : d.tyGia || 0);

/** HDM-07: tổng giá trị HĐ (VNĐ) — nhập tay hoặc Σ dòng. */
export function hdmTong(m: HopDongMua): number {
  return m.nhapTay ? (m.tongNhapTay ?? 0) : sum(m.chiTiet, thanhTienVND);
}

/** Số lượng đã nhập kho của một dòng HĐ Mua (KHO-04). */
export function slDaNhap(dongId: string, db: Db): number {
  let s = 0;
  for (const p of db.phieuKho) {
    if (p.loai !== 'Nhập' || p.trangThai !== 'Hiệu lực') continue;
    for (const d of p.dong) if (d.dongHDMua === dongId) s += d.soLuong;
  }
  return s;
}

/** Số tiền đã trả của một đợt HĐ Mua — chỉ tính khi phiếu chi được duyệt (HDM-08). */
export function dotMuaDaTra(m: HopDongMua, dot: HopDongMua['dotTT'][number], db: Db): number {
  if (m.thuocPhuTai) return dot.soTienTra ?? 0;
  if (!dot.phieuChiId) return 0;
  const p = db.phieuThuChi.find((x) => x.id === dot.phieuChiId);
  return p && p.trangThai === 'Đã duyệt' ? p.soTienChi : 0;
}

export interface HdmCalc {
  tongDong: number;
  tong: number;
  nguyenTe: Partial<Record<LoaiTien, number>>;
  daTra: number;
  conPhaiTra: number;
  pctTra: number;
  slMua: number;
  slNhap: number;
  pctNhap: number;
  quaHan: number;
}

export function hdmCalc(m: HopDongMua, db: Db): HdmCalc {
  const tongDong = sum(m.chiTiet, thanhTienVND);
  const tong = hdmTong(m);
  const nguyenTe: Partial<Record<LoaiTien, number>> = {};
  for (const d of m.chiTiet) nguyenTe[d.loaiTien] = (nguyenTe[d.loaiTien] ?? 0) + d.soLuong * d.donGia;
  const daTra = sum(m.dotTT, (d) => dotMuaDaTra(m, d, db));
  const slMua = sum(m.chiTiet, (d) => d.soLuong);
  const slNhap = sum(m.chiTiet, (d) => slDaNhap(d.id, db));
  return {
    tongDong,
    tong,
    nguyenTe,
    daTra,
    conPhaiTra: tong - daTra,
    pctTra: tong > 0 ? daTra / tong : 0,
    slMua,
    slNhap,
    pctNhap: slMua > 0 ? slNhap / slMua : 0,
    quaHan: m.dotTT.filter((d) => dotQuaHan(d, dotMuaDaTra(m, d, db))).length,
  };
}

// ── Kế toán ─────────────────────────────────────────────────────────────

export interface SoDuNguon {
  dauKy: number;
  thu: number;
  chi: number;
  lcVao: number;
  lcRa: number;
  qtThu: number;
  qtChi: number;
  cpHD: number;
  soDu: number;
}

/** KT-02 / KT-11: số dư một nguồn tiền tại ngày (mặc định: hiện tại). Chỉ phiếu Đã duyệt. */
export function soDuNguon(nguonId: string, db: Db, denNgay?: string): SoDuNguon {
  const n = db.nguonTien.find((x) => x.id === nguonId);
  const out: SoDuNguon = { dauKy: n?.soDuDauKy ?? 0, thu: 0, chi: 0, lcVao: 0, lcRa: 0, qtThu: 0, qtChi: 0, cpHD: 0, soDu: 0 };
  // Phiếu trước Ngày đầu kỳ đã nằm trong Số dư đầu kỳ.
  const tu = n?.ngayDauKy ?? '';
  const inRange = (d: string) => d >= tu && (!denNgay || d <= denNgay);
  for (const p of db.phieuThuChi) {
    if (p.trangThai !== 'Đã duyệt' || !inRange(p.ngayLap)) continue;
    if (p.loai === 'Luân chuyển') {
      if (p.nguonTien === nguonId) out.lcRa += p.soTienChi;
      if (p.nguonTienDen === nguonId) out.lcVao += p.soTienChi;
      continue;
    }
    if (p.nguonTien !== nguonId) continue;
    if (p.loai === 'Thu') out.thu += p.soTienThu;
    else if (p.loai === 'Chi' || p.loai === 'Tạm ứng') out.chi += p.soTienChi;
    else if (p.loai === 'Quyết toán tạm ứng') {
      const cl = chenhLechQuyetToan(p, db);
      if (cl > 0) out.qtThu += cl;
      else out.qtChi += -cl;
    }
  }
  for (const c of db.chiPhiHD) {
    if (c.trangThai === 'Đã duyệt' && c.nguonTien === nguonId && inRange(c.ngay)) out.cpHD += c.soTien;
  }
  out.soDu = out.dauKy + out.thu - out.chi + out.qtThu - out.qtChi + out.lcVao - out.lcRa - out.cpHD;
  return out;
}

/** KT-08: chênh lệch = Tạm ứng − Thực chi. > 0: hoàn ứng (thu), < 0: chi bổ sung. */
export function chenhLechQuyetToan(p: PhieuThuChi, db: Db): number {
  const goc = db.phieuThuChi.find((x) => x.id === p.phieuTamUngGoc);
  return (goc?.soTienChi ?? 0) - (p.soTienThucChi ?? 0);
}

/** KT-09: phiếu tạm ứng đã duyệt mà chưa có quyết toán đã duyệt. */
export function tamUngTreo(db: Db): PhieuThuChi[] {
  const daQT = new Set(
    db.phieuThuChi
      .filter((p) => p.loai === 'Quyết toán tạm ứng' && p.trangThai === 'Đã duyệt')
      .map((p) => p.phieuTamUngGoc),
  );
  return db.phieuThuChi.filter((p) => p.loai === 'Tạm ứng' && p.trangThai === 'Đã duyệt' && !daQT.has(p.id));
}

/** Tạm ứng có thể chọn làm gốc khi lập quyết toán: đã duyệt, chưa có quyết toán nào chưa bị từ chối. */
export function tamUngChoQuyetToan(db: Db, truPhieu?: string): PhieuThuChi[] {
  const dangQT = new Set(
    db.phieuThuChi
      .filter((p) => p.loai === 'Quyết toán tạm ứng' && p.trangThai !== 'Từ chối' && p.id !== truPhieu)
      .map((p) => p.phieuTamUngGoc),
  );
  return db.phieuThuChi.filter((p) => p.loai === 'Tạm ứng' && p.trangThai === 'Đã duyệt' && !dangQT.has(p.id));
}

export const isHoaHong = (c: ChiPhiHD) => c.loaiChiPhi === LCP_HOA_HONG;

// ── Kho ─────────────────────────────────────────────────────────────────

/** Mã lô của dòng i trong phiếu nhập — dòng cũ chưa có mã lô dùng "<số phiếu>-<thứ tự dòng>". */
export const maLo = (p: PhieuKho, i: number): string => p.dong[i]?.lo || `${p.soPhieu}-${String(i + 1).padStart(2, '0')}`;

/** Một lô nhập (sheet "3. TonTheoLo"). */
export interface DongLo {
  lo: string;
  loaiHang: string;
  /** Quy cách / nồng độ theo hoá đơn. */
  quyCach: string;
  kho: string;
  ngay: string;
  phieuId: string;
  soHoaDon?: string;
  ncc?: string;
  /** Đơn giá chưa VAT (VNĐ). */
  donGia: number;
  vat: number;
  nhap: number;
  xuat: number;
  ton: number;
  giaTriTon: number;
}

/** Đơn giá lô: ghi trên dòng nhập; dòng cũ chưa ghi thì lấy theo dòng HĐ Mua (VNĐ). */
function donGiaNhap(d: DongPhieuKho, dongMua: Map<string, DongHangMua>): number {
  if (d.donGia != null) return d.donGia;
  const m = d.dongHDMua ? dongMua.get(d.dongHDMua) : undefined;
  return m ? Math.round(donGiaVND(m)) : 0;
}

/**
 * KHO-09 tồn theo LÔ: mỗi dòng phiếu nhập Hiệu lực là một lô; trừ các dòng xuất ghi đúng mã lô đó.
 * Giá trị tồn = tồn × đơn giá của chính lô (không bình quân — cùng mã hàng giá các lô chênh nhau nhiều).
 */
export function tonTheoLo(db: Db, denNgay?: string): DongLo[] {
  const dongMua = new Map<string, DongHangMua>();
  for (const m of db.hopDongMua) for (const d of m.chiTiet) dongMua.set(d.id, d);
  const hl = db.phieuKho.filter((p) => p.trangThai === 'Hiệu lực' && (!denNgay || p.ngay <= denNgay));
  const map = new Map<string, DongLo>();
  for (const p of hl) {
    if (p.loai !== 'Nhập') continue;
    p.dong.forEach((d, i) => {
      const lo = maLo(p, i);
      const g = map.get(lo);
      if (g) g.nhap += d.soLuong;
      else
        map.set(lo, {
          lo,
          loaiHang: d.loaiHang,
          quyCach: d.thuocTinh,
          kho: p.kho,
          ngay: p.ngay,
          phieuId: p.id,
          soHoaDon: p.soHoaDon,
          ncc: p.ncc,
          donGia: donGiaNhap(d, dongMua),
          vat: d.vat ?? 0,
          nhap: d.soLuong,
          xuat: 0,
          ton: 0,
          giaTriTon: 0,
        });
    });
  }
  for (const p of hl) {
    if (p.loai !== 'Xuất') continue;
    for (const d of p.dong) {
      const g = d.lo ? map.get(d.lo) : undefined;
      if (g) g.xuat += d.soLuong;
    }
  }
  for (const g of map.values()) {
    g.ton = g.nhap - g.xuat;
    g.giaTriTon = g.ton * g.donGia;
  }
  return [...map.values()].sort((a, b) => (a.ngay === b.ngay ? a.lo.localeCompare(b.lo) : a.ngay < b.ngay ? -1 : 1));
}

/** Tồn gộp theo mã hàng × kho (sheet "3b. TonTheoMaHang"). */
export interface DongTon {
  loaiHang: string;
  kho: string;
  nhap: number;
  xuat: number;
  ton: number;
  /** Σ giá trị tồn các lô. */
  giaTri: number;
  /** Số lô còn hàng. */
  soLo: number;
}

/** KHO-09: tồn theo Mã hàng × Vị trí kho. Bỏ phiếu Đã huỷ. */
export function tonKho(db: Db, denNgay?: string): DongTon[] {
  const map = new Map<string, DongTon>();
  const row = (loaiHang: string, kho: string) => {
    const k = `${loaiHang}\u0001${kho}`;
    let r = map.get(k);
    if (!r) {
      r = { loaiHang, kho, nhap: 0, xuat: 0, ton: 0, giaTri: 0, soLo: 0 };
      map.set(k, r);
    }
    return r;
  };
  for (const p of db.phieuKho) {
    if (p.trangThai !== 'Hiệu lực' || (denNgay && p.ngay > denNgay)) continue;
    for (const d of p.dong) {
      const r = row(d.loaiHang, p.kho);
      if (p.loai === 'Nhập') r.nhap += d.soLuong;
      else r.xuat += d.soLuong;
    }
  }
  for (const l of tonTheoLo(db, denNgay)) {
    const r = row(l.loaiHang, l.kho);
    r.giaTri += l.giaTriTon;
    if (l.ton > 0) r.soLo++;
  }
  for (const r of map.values()) r.ton = r.nhap - r.xuat;
  return [...map.values()];
}

/** Tồn hiện tại của một mã hàng — một kho, hoặc mọi kho thường khi bỏ trống (Chuyển thẳng luôn 0 — KHO-07). */
export function tonTai(db: Db, loaiHang: string, kho?: string): number {
  if (kho === KHO_CHUYEN_THANG) return 0;
  return sum(
    tonKho(db).filter((r) => r.loaiHang === loaiHang && (kho ? r.kho === kho : r.kho !== KHO_CHUYEN_THANG)),
    (r) => r.ton,
  );
}

/** Các lô còn hàng của một mã hàng (kho bỏ trống = mọi kho thường), lô nhập trước đứng trước. */
export function loConHang(db: Db, loaiHang: string, kho?: string): DongLo[] {
  return tonTheoLo(db).filter(
    (l) => l.loaiHang === loaiHang && l.ton > 0 && (kho ? l.kho === kho : l.kho !== KHO_CHUYEN_THANG),
  );
}

/** Tự chọn lô khi không chỉ định: trừ lô nhập trước (FIFO). `thieu` > 0 = không đủ tồn. */
export function phanBoLo(
  db: Db,
  o: { loaiHang: string; kho: string; soLuong: number },
): { dong: { lo: string; soLuong: number; donGia: number; quyCach: string }[]; thieu: number } {
  let con = o.soLuong;
  const dong: { lo: string; soLuong: number; donGia: number; quyCach: string }[] = [];
  for (const l of loConHang(db, o.loaiHang, o.kho)) {
    if (con <= 0) break;
    const sl = Math.min(con, l.ton);
    dong.push({ lo: l.lo, soLuong: sl, donGia: l.donGia, quyCach: l.quyCach });
    con -= sl;
  }
  return { dong, thieu: Math.max(con, 0) };
}

/**
 * Kiểm tra kho cho một dòng hàng (dùng khi lập HĐ bán / báo giá): đủ → xuất kho; thiếu → cần đặt mua NCC.
 * Tồn tính trên mọi kho thường.
 */
export function kiemTraKho(db: Db, loaiHang: string, soLuong: number): { ton: number; du: boolean; thieu: number } {
  const ton = tonTai(db, loaiHang);
  return { ton, du: ton >= soLuong, thieu: Math.max(soLuong - ton, 0) };
}

/**
 * Chuyển thẳng (không qua lô, KHO-07): đơn giá gốc đích danh theo HĐ Mua liên quan của HĐ Bán, đúng mã hàng.
 * Không có HĐ Mua liên quan → 0.
 */
export function donGiaChuyenThang(db: Db, hdbId: string | undefined, loaiHang: string): number {
  if (!hdbId) return 0;
  const d = db.hopDongMua
    .filter((m) => m.hdbId === hdbId && m.trangThai !== 'Huỷ')
    .flatMap((m) => m.chiTiet)
    .find((x) => x.loaiHang === loaiHang);
  return d ? Math.round(donGiaVND(d)) : 0;
}

export interface DongLechKK {
  loaiHang: string;
  soSach: number;
  thucTe: number;
  lech: number;
  ghiChu?: string;
}

/**
 * Đối chiếu kiểm kê (sheet "6. KiemKe" ↔ "3b"): tồn sổ tới ngày kiểm kê tại kho với số đếm thực tế, theo mã hàng.
 * Mã có tồn sổ mà không đếm → thực tế 0. Không tính phiếu điều chỉnh sinh từ chính đợt này.
 */
export function lechKiemKe(db: Db, k: KiemKe): DongLechKK[] {
  const goc = { ...db, phieuKho: db.phieuKho.filter((p) => p.kiemKeId !== k.id) };
  const out = new Map<string, DongLechKK>();
  for (const r of tonKho(goc, k.ngay))
    if (r.kho === k.kho && r.ton !== 0) out.set(r.loaiHang, { loaiHang: r.loaiHang, soSach: r.ton, thucTe: 0, lech: 0 });
  for (const d of k.dong) {
    const r = out.get(d.loaiHang) ?? { loaiHang: d.loaiHang, soSach: 0, thucTe: 0, lech: 0 };
    r.thucTe += d.soLuong;
    const mo = [d.tenHang, d.xuatXu, d.nongDo, d.ghiChu].filter(Boolean).join(' · ');
    r.ghiChu = [r.ghiChu, mo && `${mo} × ${d.soLuong}`].filter(Boolean).join('; ');
    out.set(d.loaiHang, r);
  }
  for (const r of out.values()) r.lech = r.thucTe - r.soSach;
  return [...out.values()].sort((a, b) => a.loaiHang.localeCompare(b.loaiHang));
}

export const tongSL = (p: PhieuKho) => sum(p.dong, (d) => d.soLuong);

/** Giá trị phiếu: nhập = Σ SL × đơn giá lô; xuất = Σ SL × đơn giá vốn. */
export const giaTriPhieu = (p: PhieuKho) =>
  sum(p.dong, (d) => d.soLuong * ((p.loai === 'Nhập' ? d.donGia : d.donGiaGoc) ?? 0));

// ── Hồ sơ ───────────────────────────────────────────────────────────────

export function hoSoThieu(db: Db, chu: 'HDB' | 'HDM' | 'HDPT', chuId: string): LoaiHoSo[] {
  return HO_SO_BAT_BUOC.filter((loai) => !db.hoSo.some((h) => h.chu === chu && h.chuId === chuId && h.loai === loai && h.daLuu));
}

// ── Phú Tài ─────────────────────────────────────────────────────────────

export interface PtCalc {
  sauVAT: number;
  giaMua: number;
  vanChuyen: number;
  haiQuan: number;
  cpKhac: number;
  giaDauVao: number;
  lnTruoc: number;
  thue: number;
  lnSau: number;
  ptGiu: number;
  oxyGop: number;
  /** Tỷ lệ Oxy được hưởng trên LN trước thuế theo cách chia (72% / 70% với tham số mặc định). */
  tyLeOxy: number;
  hoaHong: number;
  lnThuc: number;
  khDaTra: number;
  pctKH: number;
  ptTraNCC: number;
  oxyChuyenPT: number;
  ptChuyenNCC: number;
  chenhDoiChieu: number;
  buoc: Buoc[];
}

/** PT-06: chia lợi nhuận từng bước. Lỗ: thuế = 0, Phú Tài giữ = 0, Oxy chịu toàn bộ (D-21). */
export function ptCalc(p: HopDongPhuTai, db: Db): PtCalc {
  const giaMua = sum(
    db.hopDongMua.filter((m) => p.hdMua.includes(m.id) && m.trangThai !== 'Huỷ'),
    hdmTong,
  );
  const by = (l: string) => sum(p.chiPhi.filter((c) => c.loai === l), (c) => c.soTien);
  const vanChuyen = by('Vận chuyển');
  const haiQuan = by('Hải quan');
  const cpKhac = by('Khác');
  const giaDauVao = giaMua + vanChuyen + haiQuan + cpKhac;
  const lnTruoc = p.truocVAT - giaDauVao;
  const loi = lnTruoc > 0;
  // Q-03 → tham số PT_CACH_CHIA: "Nhân" (PT giữ % của LN sau thuế) hoặc "Cộng" (PT giữ % của LN trước thuế).
  const cong = (p.cachChia ?? 'Nhân') === 'Cộng';
  const thue = loi ? Math.round(lnTruoc * p.tyLeThue) : 0;
  const lnSau = lnTruoc - thue;
  const ptGiu = loi ? Math.round((cong ? lnTruoc : lnSau) * p.tyLeGiu) : 0;
  const oxyGop = lnSau - ptGiu;
  const tyLeOxy = cong ? 1 - p.tyLeThue - p.tyLeGiu : (1 - p.tyLeThue) * (1 - p.tyLeGiu);
  const hoaHong =
    p.hoaHongKieu === '%' ? Math.round(Math.max(0, oxyGop) * (p.hoaHongGiaTri / 100)) : p.hoaHongGiaTri;
  const lnThuc = oxyGop - hoaHong;
  const sau = sauVAT(p.truocVAT, p.vat);
  const khDaTra = sum(p.dotKH, (d) => d.soTien);
  const oxyChuyenPT = sum(p.doiChieu, (d) => d.soTienVND);
  const ptChuyenNCC = sum(p.doiChieu, (d) => Math.round(d.soTienNguyenTe * (d.loaiTien === 'VNĐ' ? 1 : d.tyGia)));
  const pT = (x: number) => `${Math.round(x * 1000) / 10}%`;
  return {
    sauVAT: sau,
    giaMua,
    vanChuyen,
    haiQuan,
    cpKhac,
    giaDauVao,
    lnTruoc,
    thue,
    lnSau,
    ptGiu,
    oxyGop,
    tyLeOxy,
    hoaHong,
    lnThuc,
    khDaTra,
    pctKH: sau > 0 ? khDaTra / sau : 0,
    // F-05: nguồn chuẩn "Phú Tài trả NCC" = đợt trả NCC (Tab 4) của các HĐ mua thuộc Phú Tài đã chọn.
    ptTraNCC: sum(
      db.hopDongMua.filter((m) => p.hdMua.includes(m.id)),
      (m) => sum(m.dotTT, (d) => d.soTienTra ?? 0),
    ),
    oxyChuyenPT,
    ptChuyenNCC,
    chenhDoiChieu: oxyChuyenPT - ptChuyenNCC,
    buoc: [
      { nhan: '1. Giá đầu vào trước VAT', congThuc: 'Giá mua + Vận chuyển + Hải quan + CP khác', giaTri: giaDauVao },
      { nhan: '2. LN trước thuế', congThuc: 'Giá bán trước VAT − Giá đầu vào', giaTri: lnTruoc },
      {
        nhan: '3. LN sau thuế',
        congThuc: loi ? `LN trước thuế × ${pT(1 - p.tyLeThue)} (Phú Tài đóng TNDN ${pT(p.tyLeThue)})` : 'Lỗ: không tính thuế',
        giaTri: lnSau,
      },
      {
        nhan: '4. Phú Tài giữ (phí quản lý)',
        congThuc: loi ? `${pT(p.tyLeGiu)} × ${cong ? 'LN trước thuế (cách chia "Cộng")' : 'LN sau thuế (cách chia "Nhân")'}` : 'Lỗ: Phú Tài không giữ',
        giaTri: ptGiu,
      },
      { nhan: '5. Oxy được hưởng (gộp)', congThuc: `LN sau thuế − Phú Tài giữ = ${pT(tyLeOxy)} × LN trước thuế`, giaTri: oxyGop },
      {
        nhan: '6. Hoa hồng khách hàng',
        congThuc: p.hoaHongKieu === '%' ? `${p.hoaHongGiaTri}% × Oxy được hưởng (gộp)` : 'Nhập tay',
        giaTri: hoaHong,
      },
      { nhan: '7. Lợi nhuận thực của Oxy', congThuc: 'Oxy được hưởng (gộp) − Hoa hồng', giaTri: lnThuc, chinh: true },
    ],
  };
}

/** PT-10: số dư quỹ ảo Phú Tài (tuỳ chọn theo HĐ / tới ngày). */
export function soDuQuyPT(db: Db, o: { hdptId?: string; denNgay?: string } = {}): { thu: number; chi: number; soDu: number } {
  let thu = 0;
  let chi = 0;
  for (const d of db.dongTienPT) {
    if (o.hdptId && d.hdptId !== o.hdptId) continue;
    if (o.denNgay && d.ngay > o.denNgay) continue;
    if (d.chieu === 'Thu về PT') thu += d.soTien;
    else chi += d.soTien;
  }
  return { thu, chi, soDu: thu - chi };
}

/**
 * F-07: hàng theo các HĐ mua liên quan (không Huỷ) còn chưa giao cho HĐ bán — so khớp theo Mã hàng
 * với các phiếu xuất Hiệu lực (nồng độ ghi theo lô nên không so). Dùng để cảnh báo khi chuyển "Hoàn thành".
 */
export function hdbConChuaGiao(h: HopDongBan, db: Db): { loaiHang: string; con: number }[] {
  const daGiao = new Map<string, number>();
  for (const p of db.phieuKho) {
    if (p.loai !== 'Xuất' || p.hdId !== h.id || p.trangThai !== 'Hiệu lực') continue;
    for (const d of p.dong) daGiao.set(d.loaiHang, (daGiao.get(d.loaiHang) ?? 0) + d.soLuong);
  }
  const out: { loaiHang: string; con: number }[] = [];
  for (const m of db.hopDongMua) {
    if (m.hdbId !== h.id || m.trangThai === 'Huỷ') continue;
    for (const d of m.chiTiet) {
      const tru = Math.min(daGiao.get(d.loaiHang) ?? 0, d.soLuong);
      daGiao.set(d.loaiHang, (daGiao.get(d.loaiHang) ?? 0) - tru);
      if (d.soLuong - tru > 0) out.push({ loaiHang: d.loaiHang, con: d.soLuong - tru });
    }
  }
  return out;
}

/** F-07: HĐ bán không giao hàng (dịch vụ) — không có HĐ mua liên quan và chưa có phiếu xuất: được chuyển thẳng Hiệu lực → Hoàn thành. */
export function hdbKhongGiaoHang(h: HopDongBan, db: Db): boolean {
  return (
    !db.hopDongMua.some((m) => m.hdbId === h.id && m.trangThai !== 'Huỷ') &&
    !db.phieuKho.some((p) => p.loai === 'Xuất' && p.hdId === h.id && p.trangThai === 'Hiệu lực')
  );
}
