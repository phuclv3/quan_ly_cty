/**
 * Dựng cơ sở dữ liệu ban đầu từ dữ liệu thực tế (seed-data.ts) theo quy tắc import NT-13 / D-27:
 *  - Trường bắt buộc thiếu → "(Chưa xác định)", bản ghi gắn cờ import để lọc bổ sung.
 *  - Phiếu thu chi cũ ở trạng thái Đã duyệt, Người duyệt = "Import".
 *  - "Rút tiền nhập quỹ" trong sổ tiền mặt → phiếu Luân chuyển Ngân hàng → Tiền mặt (KT-10).
 *
 * Những gì KHÔNG có trong file gốc và được đặt giả định (ghi rõ trong README):
 *  - Tài khoản đăng nhập demo, Sale phụ trách của HĐ bán (gán cho tài khoản Sale demo).
 *  - Số dư đầu kỳ các nguồn tiền.
 *  - HĐ Mua đầu vào của HĐ Phú Tài (dựng từ cột giá mua của sheet "Hợp đồng ký về Phú Tài").
 */
import {
  CauHinh,
  ChiPhiHD,
  Db,
  DongHangMua,
  HopDongBan,
  HopDongMua,
  HopDongPhuTai,
  KHO_CHUYEN_THANG,
  KhachHang,
  LCP_HOA_HONG,
  LCP_VAN_CHUYEN,
  LoaiChiPhi,
  LoaiHang,
  LoaiTien,
  NhaCungCap,
  NhomHang,
  PhieuKho,
  PhieuThuChi,
  TaiKhoan,
  CHECKLIST_HDM,
} from './models';
import { RAW } from './seed-data';
import { hashPassword, randomHex } from './crypto';
import { nhomMacDinh } from './perm';
import { fold, nowIso, todayIso, uid, yy } from './util';

/** v2: phân quyền theo nhóm (NhomQuyen) thay cho vai trò cố định. */
export const DB_VERSION = 2;

export const CAU_HINH_MAC_DINH: CauHinh = {
  TNDN_NGUONG: 0.2,
  TNDN_MUC1: 0.25,
  TNDN_MUC2: 0.5,
  PT_THUE: 0.2,
  PT_GIU: 0.1,
  SO_DOT_TOI_DA: 3,
  TIEN_TO_TC: 'TC',
  TIEN_TO_CP: 'CP',
  TIEN_TO_NK: 'NK',
  TIEN_TO_XK: 'XK',
};

/** Mật khẩu chung của các tài khoản demo — đổi ngay khi dùng thật. */
export const MAT_KHAU_DEMO = 'Oxy@2026';

export const TAI_KHOAN_DEMO: { email: string; hoTen: string; nhom: string[]; nhan: string }[] = [
  { email: 'giamdoc@oxymecie.vn', hoTen: 'Giám đốc (demo)', nhom: ['NQ-GD'], nhan: 'Giám đốc' },
  { email: 'ketoan@oxymecie.vn', hoTen: 'Kế toán (demo)', nhom: ['NQ-KT'], nhan: 'Kế toán' },
  { email: 'sale@oxymecie.vn', hoTen: 'Sale (demo)', nhom: ['NQ-SALE'], nhan: 'Sale' },
  { email: 'admin@oxymecie.vn', hoTen: 'Admin kinh doanh (demo)', nhom: ['NQ-ADMIN'], nhan: 'Admin kinh doanh' },
  { email: 'kho@oxymecie.vn', hoTen: 'Thủ kho (demo)', nhom: ['NQ-KHO'], nhan: 'Kho' },
  { email: 'chixem@oxymecie.vn', hoTen: 'Chỉ xem (demo)', nhom: ['NQ-XEM'], nhan: 'Chỉ xem' },
];

const CXD = '(Chưa xác định)';
const pad4 = (n: number) => String(n).padStart(4, '0');

export async function buildSeed(): Promise<Db> {
  const db: Db = {
    version: DB_VERSION,
    taiKhoan: [],
    nhomQuyen: nhomMacDinh(nowIso()),
    phien: [],
    cauHinh: { ...CAU_HINH_MAC_DINH },
    cauHinhLog: [],
    yeuCauXoa: [],
    hoSo: [],
    hoaDon: [],
    nguonTien: [],
    loaiChiPhi: [],
    khachHang: [],
    ncc: [],
    kho: [],
    loaiHang: [],
    phieuThuChi: [],
    chiPhiHD: [],
    hopDongBan: [],
    hopDongMua: [],
    phieuKho: [],
    hopDongPhuTai: [],
    dongTienPT: [],
    boDem: {},
  };
  const so = (prefix: string, ngay: string) => {
    const k = prefix + yy(ngay);
    db.boDem[k] = (db.boDem[k] ?? 0) + 1;
    return `${k}-${pad4(db.boDem[k])}`;
  };

  // ── Tài khoản demo ──
  for (const t of TAI_KHOAN_DEMO) {
    const salt = randomHex();
    const acc: TaiKhoan = {
      id: uid('TK'),
      email: t.email,
      hoTen: t.hoTen,
      nhom: t.nhom,
      trangThai: 'Hoạt động',
      matKhauBam: await hashPassword(MAT_KHAU_DEMO, salt),
      salt,
      batDoiMK: false,
      soLanSai: 0,
    };
    db.taiKhoan.push(acc);
  }
  const idOf = (email: string) => db.taiKhoan.find((t) => t.email === email)!.id;
  const SALE = idOf('sale@oxymecie.vn');
  const KT = idOf('ketoan@oxymecie.vn');
  const KHO = idOf('kho@oxymecie.vn');
  const ADMIN = idOf('admin@oxymecie.vn');

  // ── Danh mục cố định theo spec ──
  db.nguonTien.push(
    { id: 'NT-TM', ten: 'Tiền mặt', loai: 'Tiền mặt', soDuDauKy: 50_000_000, ngayDauKy: '2026-01-01', trangThai: 'Đang dùng' },
    {
      id: 'NT-NH',
      ten: 'Ngân hàng (UNC)',
      loai: 'Ngân hàng',
      nganHang: CXD,
      soDuDauKy: 900_000_000,
      ngayDauKy: '2026-01-01',
      trangThai: 'Đang dùng',
    },
  );
  const lcp: LoaiChiPhi[] = [
    { id: 'VH-VP', ten: 'Văn phòng', nhom: 'Vận hành', dangDung: true },
    { id: 'VH-MKT', ten: 'Marketing', nhom: 'Vận hành', dangDung: true },
    { id: 'VH-LUONG', ten: 'Lương/Thưởng', nhom: 'Vận hành', dangDung: true },
    { id: 'VH-CTP', ten: 'Công tác phí', nhom: 'Vận hành', dangDung: true },
    { id: 'VH-THUE', ten: 'Thuế / phí', nhom: 'Vận hành', dangDung: true },
    { id: 'VH-KHAC', ten: 'Chi vận hành khác', nhom: 'Vận hành', dangDung: true },
    { id: LCP_VAN_CHUYEN, ten: 'Vận chuyển', nhom: 'Thực hiện HĐ', dangDung: true },
    { id: 'CPTH-KD', ten: 'Kiểm định', nhom: 'Thực hiện HĐ', dangDung: true },
    { id: LCP_HOA_HONG, ten: 'Hoa hồng kinh doanh', nhom: 'Thực hiện HĐ', dangDung: true },
    { id: 'CPTH-KHAC', ten: 'Phát sinh khác', nhom: 'Thực hiện HĐ', dangDung: true },
  ];
  db.loaiChiPhi.push(...lcp);
  db.kho.push(
    { id: 'KHO-TC', ten: 'Kho Toàn Cầu', loai: 'Kho thường', dangDung: true },
    { id: 'KHO-PT', ten: 'Kho Phú Tài', loai: 'Kho thường', dangDung: true },
    { id: 'KHO-HT', ten: 'Kho Huy Thịnh', loai: 'Kho thường', dangDung: true },
    { id: 'KHO-OM', ten: 'Kho OxyMecie', loai: 'Kho thường', dangDung: true },
    { id: KHO_CHUYEN_THANG, ten: 'Chuyển thẳng — không qua kho', loai: 'Chuyển thẳng', dangDung: true },
  );

  // ── Khách hàng, NCC ──
  RAW.khachHang.forEach((k, i) => db.khachHang.push(kh(`KH${pad4(i + 1)}`, k.ten, k.mst, k.diaChi)));
  RAW.ncc.forEach((n, i) =>
    db.ncc.push({
      id: `NCC${pad4(i + 1)}`,
      ten: n.ten,
      mst: n.mst ?? '',
      diaChi: n.diaChi ?? '',
      quocGia: n.quocGia ?? 'Việt Nam',
      nguoiLienHe: '',
      dienThoai: '',
      email: '',
      ghiChu: '',
    }),
  );
  const timKH = (ten: string, mst?: string): KhachHang => {
    const f = fold(ten);
    let k = db.khachHang.find((x) => (mst && x.mst === mst) || fold(x.ten) === f);
    if (!k) {
      k = kh(`KH${pad4(db.khachHang.length + 1)}`, ten, mst, '');
      db.khachHang.push(k);
    }
    return k;
  };
  const timNCC = (ten: string): NhaCungCap => {
    const f = fold(ten);
    let n = db.ncc.find((x) => fold(x.ten) === f) ?? db.ncc.find((x) => f.includes(fold(x.ten)) || fold(x.ten).includes(f));
    if (!n) {
      n = { id: `NCC${pad4(db.ncc.length + 1)}`, ten, mst: '', diaChi: '', quocGia: 'Việt Nam', nguoiLienHe: '', dienThoai: '', email: '', ghiChu: '' };
      db.ncc.push(n);
    }
    return n;
  };

  // ── Loại hàng ──
  for (const l of RAW.loaiHang) {
    db.loaiHang.push({
      id: l.ma,
      ten: l.ten,
      nhom: (l.nhom as NhomHang) ?? 'Phụ kiện',
      dvt: l.dvt ?? 'Cái',
      thuocTinh: thuocTinhTheoNhom(l.nhom as NhomHang),
      dangDung: true,
    });
  }
  db.loaiHang.push({ id: 'HH-KHAC', ten: 'Hàng khác (import)', nhom: 'Phụ kiện', dvt: 'Cái', thuocTinh: [], dangDung: true });
  const timLoaiHang = (ma: string): LoaiHang => {
    let l = db.loaiHang.find((x) => x.id === ma);
    if (!l) {
      const m = ma.match(/^KC-(.+)-(\d+L)$/);
      l = {
        id: ma,
        ten: m ? `Khí chuẩn ${m[1]} ${m[2]}` : ma,
        nhom: m ? 'Khí chuẩn' : ma.startsWith('VO') ? 'Vỏ bình' : 'Phụ kiện',
        dvt: 'Bình',
        thuocTinh: m ? ['Nồng độ', 'Thể tích'] : [],
        dangDung: true,
      };
      db.loaiHang.push(l);
    }
    return l;
  };
  /** "Khí chuẩn HCl" + "100mg/Nm3 - 10L" → KC-HCL-10L (nếu có), không thì cùng khí bất kỳ thể tích. */
  const doanLoaiHang = (ten: string, thongSo = ''): string => {
    const f = fold(ten);
    const vol = (thongSo.match(/(\d+)\s*l\b/i) ?? ten.match(/(\d+)\s*l\b/i))?.[1];
    const co = (id: string) => db.loaiHang.some((x) => x.id === id);
    if (/van dieu ap|regulator/.test(f)) return 'TB-KHAC';
    if (/vo nhom/.test(f) && co(`VO-NHOM-${vol}L`)) return `VO-NHOM-${vol}L`;
    if (/vo thep/.test(f) && co(`VO-THEP-${vol}L`)) return `VO-THEP-${vol}L`;
    if (/empty bottle|vo binh|^vo /.test(f)) {
      const id = `VO-KHAC-${vol}L`;
      return co(id) ? id : 'VO-KHAC-10L';
    }
    const gas = ten
      .replace(/^.*?(khí chuẩn|khí)\s*/i, '')
      .replace(/^hỗn hợp\s*/i, '')
      .split(/[\s,(]/)[0]
      ?.replace(/\//g, '')
      .toUpperCase();
    if (gas) {
      const exact = `KC-${gas}-${vol}L`;
      if (db.loaiHang.some((x) => x.id === exact)) return exact;
      const any = db.loaiHang.find((x) => x.id.startsWith(`KC-${gas}-`));
      if (any) return any.id;
    }
    return 'HH-KHAC';
  };

  // ── HĐ Bán ──
  const ts = { nguong: db.cauHinh.TNDN_NGUONG, muc1: db.cauHinh.TNDN_MUC1, muc2: db.cauHinh.TNDN_MUC2 };
  for (const r of RAW.hopDongBan) {
    const k = timKH(r.khachHang, r.mst);
    const vat = r.vat && r.giaTriTruocVAT ? (Math.round((r.vat / r.giaTriTruocVAT) * 100) as 0 | 8 | 10) : 8;
    const daGiao = r.trangThai === 'Đã giao hàng';
    const h: HopDongBan = {
      id: uid('HDB'),
      soHD: r.soHD,
      maKH: k.id,
      tenKH: k.ten,
      mst: k.mst,
      diaChi: k.diaChi,
      ngayKy: r.ngayKy,
      ngayHieuLuc: r.ngayKy,
      trangThai: daGiao ? 'Hoàn thành' : 'Hiệu lực',
      sale: SALE,
      ghiChu: [r.ghiChu, r.trangThai && !daGiao ? `Tình trạng hàng (file cũ): ${r.trangThai}` : '', r.phuongAnTT ? `Phương án TT: ${r.phuongAnTT.replace(/\n/g, '; ')}` : '']
        .filter(Boolean)
        .join(' · '),
      truocVAT: r.giaTriTruocVAT,
      vat: [0, 8, 10].includes(vat) ? vat : 8,
      thucTeTruocVAT: r.giaTriThucTe ?? 0,
      thamSoThue: ts,
      dotTT: r.dotTT.slice(0, 3).map((d, i) => ({
        dot: i + 1,
        soTien: d.soTien,
        ngayThu: d.daThu ? d.ngayThu : undefined,
        soTienThu: d.daThu ? d.soTien : undefined,
        nguonTienNhan: d.daThu ? 'NT-NH' : undefined,
      })),
      taoLuc: nowIso(),
      import: true,
    };
    db.hopDongBan.push(h);
  }

  // ── HĐ Mua ──
  const pushHdm = (m: Omit<HopDongMua, 'id' | 'taoLuc' | 'checklist' | 'xuatHoaDon'> & Partial<HopDongMua>): HopDongMua => {
    const full: HopDongMua = {
      id: uid('HDM'),
      taoLuc: nowIso(),
      xuatHoaDon: 'Chưa',
      checklist: CHECKLIST_HDM.map((ten) => ({ ten, xong: false })),
      ...m,
    };
    db.hopDongMua.push(full);
    return full;
  };
  for (const r of RAW.hopDongMua) {
    const n = timNCC(r.ncc);
    const lt: LoaiTien = r.loaiTien === 'USD' ? 'USD' : r.loaiTien === 'CNY' || r.loaiTien === 'RMB' ? 'RMB' : 'VNĐ';
    const dongs: DongHangMua[] = [];
    let tongFile = 0;
    let coDongLe = false;
    for (const c of r.chiTiet) {
      tongFile += c.thanhTienVND ?? 0;
      // Dòng VNĐ trong file gốc không có cột Thành tiền → vẫn là dòng hàng hợp lệ.
      // Bỏ dòng phí / hoàn vỏ (không đơn giá hoặc thành tiền âm) — đã nằm trong tổng nhập tay.
      if (!c.donGia || !c.soLuong || (c.thanhTienVND !== undefined && c.thanhTienVND <= 0)) {
        coDongLe = true;
        continue;
      }
      const loai = doanLoaiHang(c.tenHang, c.thongSo);
      dongs.push({
        id: uid('DM'),
        loaiHang: loai,
        tenHang: c.tenHang,
        thongSo: c.thongSo ?? '',
        soLuong: c.soLuong,
        dvt: db.loaiHang.find((x) => x.id === loai)?.dvt ?? 'Bình',
        donGia: c.donGia,
        loaiTien: lt,
        tyGia: lt === 'VNĐ' ? 1 : (r.tyGia ?? 0),
      });
    }
    const hdb = r.hdBanLienQuan ? db.hopDongBan.find((h) => fold(h.tenKH).includes(fold(r.hdBanLienQuan))) : undefined;
    const pt = !!r.thuocPhuTai;
    // Đợt trả trong file là số SAU VAT; HĐ mua của spec không có trường VAT → lấy tổng sau VAT
    // theo sổ cũ làm Tổng giá trị (nhập tay, ghi lý do) để Còn phải trả trừ cùng một cơ sở.
    const sauVATFile = typeof r['giaTriSauVAT'] === 'number' ? Math.round(r['giaTriSauVAT'] as number) : 0;
    const tongDong = dongs.reduce((s, d) => s + Math.round(d.soLuong * d.donGia * (d.loaiTien === 'VNĐ' ? 1 : d.tyGia)), 0);
    const dungSauVAT = sauVATFile > 0 && Math.abs(sauVATFile - tongDong) > 1;
    const daTraFile = (r.dotTT ?? []).reduce((s, d) => s + d.soTien, 0);
    const tongHD = dungSauVAT ? sauVATFile : coDongLe && tongFile > 0 ? Math.round(tongFile) : tongDong;
    // Đợt trả vượt xa giá trị HĐ (sheet Phú Tài gộp nhiều lô) → không nhập đợt, ghi chú để đối chiếu.
    const botDot = tongHD > 0 && daTraFile > tongHD * 1.05;
    const m = pushHdm({
      soHD: r.soHD,
      maNCC: n.id,
      tenNCC: n.ten,
      diaChi: n.diaChi,
      mst: n.mst,
      ngayKy: r.ngayKy,
      hdbId: hdb?.id,
      thuocPhuTai: pt,
      trangThai: 'Đã ký',
      ghiChu: [
        r.ghiChu,
        r.hdBanLienQuan && !hdb ? `Dùng cho (file cũ): ${r.hdBanLienQuan}` : '',
        botDot ? `Sổ cũ ghi đã trả ${daTraFile.toLocaleString('vi-VN')} đ — vượt giá trị HĐ, chưa nhập đợt trả, cần đối chiếu` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      chiTiet: dongs,
      nhapTay: dungSauVAT || (coDongLe && tongFile > 0),
      tongNhapTay: dungSauVAT || (coDongLe && tongFile > 0) ? tongHD : undefined,
      lyDoNhapTay: dungSauVAT
        ? 'Import: tổng SAU VAT theo sổ cũ (đợt trả NCC ghi theo số sau VAT)'
        : coDongLe
          ? 'Import: tổng theo sổ cũ, gồm phí vận chuyển / hoàn vỏ'
          : undefined,
      dotTT: [],
      import: true,
    });
    m.dotTT = (botDot ? [] : (r.dotTT ?? [])).slice(0, 3).map((d, i) => {
      if (pt || !d.ngayTra) return { dot: i + 1, soTien: Math.round(d.soTien), ngayTra: d.ngayTra, soTienTra: d.ngayTra ? Math.round(d.soTien) : undefined };
      const p = phieu(db, so, {
        ngayLap: d.ngayTra,
        loai: 'Chi',
        nguonTien: 'NT-NH',
        loaiChiPhi: undefined,
        noiDung: `Trả NCC đợt ${i + 1} — HĐ mua ${r.soHD}`,
        soTienChi: Math.round(d.soTien),
        phatSinh: { loai: 'HDM-DotTT', hdId: m.id, dot: i + 1 },
      });
      return { dot: i + 1, soTien: Math.round(d.soTien), ngayTra: d.ngayTra, soTienTra: Math.round(d.soTien), nguonTien: 'NT-NH', phieuChiId: p.id };
    });
  }

  // ── Kho: lô nhập theo hoá đơn Phú Tài Miền Nam (sheet 1. NhapKho) → HĐ Mua + phiếu nhập tự động ──
  const nhom = new Map<string, typeof RAW.phieuKho>();
  for (const r of RAW.phieuKho) {
    const k = `${r.soHD}|${r.ngay}`;
    nhom.set(k, [...(nhom.get(k) ?? []), r]);
  }
  for (const rows of nhom.values()) {
    const r0 = rows[0];
    const n = timNCC(r0.ncc ?? 'Phú Tài Miền Nam');
    const dongs = rows.map((r) => {
      const l = timLoaiHang(r.hang);
      return {
        id: uid('DM'),
        loaiHang: l.id,
        tenHang: l.ten,
        thongSo: thuocTinhTuMa(r.hang),
        soLuong: r.soLuong,
        dvt: l.dvt,
        donGia: r.donGia ?? 0,
        loaiTien: 'VNĐ' as LoaiTien,
        tyGia: 1,
        ghiChu: r.maLo ? `Lô ${r.maLo}` : undefined,
      };
    });
    const m = pushHdm({
      soHD: `${r0.soHD} (${n.ten})`,
      maNCC: n.id,
      tenNCC: n.ten,
      diaChi: n.diaChi,
      mst: n.mst,
      ngayKy: r0.ngay,
      thuocPhuTai: false,
      trangThai: 'Đã nhận đủ',
      ghiChu: 'Dựng từ sheet "1. NhapKho" của KhoOxyMecie_v3 (lô nhập theo hoá đơn).',
      chiTiet: dongs,
      nhapTay: false,
      dotTT: [],
      xuatHoaDon: 'Đã',
      import: true,
    });
    m.checklist = m.checklist.map((c) => (c.ten === 'Đã nhập kho' || c.ten === 'Hàng đã về' ? { ...c, xong: true, ngay: r0.ngay } : c));
    const pk: PhieuKho = {
      id: uid('PK'),
      soPhieu: so(db.cauHinh.TIEN_TO_NK, r0.ngay),
      ngay: r0.ngay,
      loai: 'Nhập',
      nguonGoc: 'Tự động HĐ Mua',
      hdId: m.id,
      kho: 'KHO-OM',
      nguoiThucHien: KHO,
      trangThai: 'Hiệu lực',
      ghiChu: 'Import KhoOxyMecie_v3',
      dong: dongs.map((d) => ({ loaiHang: d.loaiHang, thuocTinh: d.thongSo, soLuong: d.soLuong, dongHDMua: d.id })),
    };
    db.phieuKho.push(pk);
  }

  // ── Phú Tài ──
  for (const r of RAW.phuTai) {
    const k = timKH(r.khachHang, r.mst);
    const vat = r.vat && r.giaBanTruocVAT ? Math.round((r.vat / r.giaBanTruocVAT) * 100) : 8;
    const hdMua: string[] = [];
    if (r.giaMua && r.giaMua > 0) {
      const nccTen = r.chiTiet?.find((c) => c.nccMua)?.nccMua ?? 'Phú Tài Miền Nam';
      const n = timNCC(nccTen);
      const m = pushHdm({
        soHD: `Đầu vào ${r.soHD.split(' ')[0]}`,
        maNCC: n.id,
        tenNCC: n.ten,
        diaChi: n.diaChi,
        mst: n.mst,
        ngayKy: r.ngayKy,
        thuocPhuTai: true,
        trangThai: 'Đã ký',
        ghiChu: 'Dựng từ cột giá mua của sheet "Hợp đồng ký về Phú Tài" (Công nợ Phú Tài Miền Nam).',
        chiTiet: [],
        nhapTay: true,
        tongNhapTay: Math.round(r.giaMua),
        lyDoNhapTay: 'Import: giá mua theo sổ Phú Tài',
        dotTT: [],
        import: true,
      });
      hdMua.push(m.id);
    }
    const daTra = (r.khTraPT ?? []).reduce((s, d) => s + d.soTien, 0);
    const sau = Math.round(r.giaBanTruocVAT * (1 + vat / 100));
    const p: HopDongPhuTai = {
      id: uid('HDPT'),
      soHD: r.soHD,
      maKH: k.id,
      tenKH: k.ten,
      mst: k.mst,
      ngayKy: r.ngayKy,
      ngayHieuLuc: r.ngayKy,
      trangThai: daTra >= sau && sau > 0 ? 'Hoàn thành' : 'Đang thực hiện',
      ghiChu: r.ghiChu ?? '',
      truocVAT: r.giaBanTruocVAT,
      vat: ([0, 8, 10].includes(vat) ? vat : 8) as 0 | 8 | 10,
      hdMua,
      chiPhi: r.cpKhac ? [{ id: uid('CPPT'), loai: 'Khác', noiDung: 'Chi phí khác (theo sổ Phú Tài)', ngay: r.ngayKy ?? todayIso(), soTien: r.cpKhac }] : [],
      dotKH: (r.khTraPT ?? []).map((d, i) => ({ dot: i + 1, soTien: d.soTien, ngay: d.ngay ?? r.ngayKy ?? todayIso() })),
      dotTraNCC: [],
      tyLeThue: db.cauHinh.PT_THUE,
      tyLeGiu: db.cauHinh.PT_GIU,
      tyLeLog: [],
      hoaHongKieu: 'Số tiền',
      hoaHongGiaTri: 0,
      doiChieu: [],
      taoLuc: nowIso(),
      import: true,
    };
    db.hopDongPhuTai.push(p);
  }

  // ── Sổ quỹ (Tiền Mặt OXY) ──
  const rows = [...RAW.phieuThuChi].sort((a, b) => (a.ngay < b.ngay ? -1 : 1));
  for (const r of rows) {
    const nguon = r.nguon === 'Ngân hàng' ? 'NT-NH' : 'NT-TM';
    if (r.loai === 'Thu' && /r[uú]t ti[eề]n/i.test(r.noiDung)) {
      phieu(db, so, { ngayLap: r.ngay, loai: 'Luân chuyển', nguonTien: 'NT-NH', nguonTienDen: 'NT-TM', noiDung: r.noiDung, soTienChi: r.soTien });
    } else if (r.loai === 'Thu') {
      phieu(db, so, { ngayLap: r.ngay, loai: 'Thu', nguonTien: nguon, noiDung: r.noiDung, soTienThu: r.soTien });
    } else {
      // Đã có phiếu chi sinh từ đợt trả NCC cùng số HĐ thì không nhập trùng.
      const trung = db.phieuThuChi.some(
        (p) => p.phatSinh && p.soTienChi === Math.round(r.soTien) && p.ngayLap === r.ngay,
      );
      if (trung) continue;
      const tamUng = /^t[aạ]m [uứ]ng/i.test(r.noiDung.trim());
      phieu(db, so, {
        ngayLap: r.ngay,
        loai: tamUng ? 'Tạm ứng' : 'Chi',
        nguonTien: nguon,
        loaiChiPhi: loaiChiPhiTu(r.loaiChiPhi),
        noiDung: r.noiDung,
        soTienChi: r.soTien,
        nguoiNhan: tamUng ? CXD : undefined,
      });
    }
  }

  // ── Vài bản ghi [Demo] để thấy luồng duyệt (không có trong dữ liệu thật) ──
  const hdbDemo = db.hopDongBan[db.hopDongBan.length - 1];
  if (hdbDemo) {
    const cp = (o: Partial<ChiPhiHD>): ChiPhiHD => ({
      id: uid('CP'),
      maCP: so(db.cauHinh.TIEN_TO_CP, todayIso()),
      hdbId: hdbDemo.id,
      ngay: todayIso(),
      loaiChiPhi: LCP_VAN_CHUYEN,
      noiDung: '',
      soTien: 0,
      nguonTien: 'NT-TM',
      nguoiThucHien: ADMIN,
      trangThai: 'Chờ duyệt',
      files: [],
      ...o,
    });
    db.chiPhiHD.push(
      cp({ noiDung: '[Demo] Vận chuyển giao hàng', soTien: 850_000, donViVanChuyen: 'Viettel Post' }),
      cp({ loaiChiPhi: LCP_HOA_HONG, noiDung: '[Demo] Hoa hồng kinh doanh', soTien: 1_500_000, nguoiNhan: CXD, nguoiThucHien: SALE }),
    );
  }
  db.phieuThuChi.push({
    ...phieuRong(),
    id: uid('PTC'),
    soPhieu: so(db.cauHinh.TIEN_TO_TC, todayIso()),
    ngayLap: todayIso(),
    loai: 'Chi',
    nguonTien: 'NT-TM',
    loaiChiPhi: 'VH-VP',
    noiDung: '[Demo] Mua văn phòng phẩm tháng này',
    soTienChi: 640_000,
    nguoiDeNghi: SALE,
    trangThai: 'Chờ duyệt',
  });
  void KT;
  return db;
}

// ── Hàm phụ ─────────────────────────────────────────────────────────────

function kh(id: string, ten: string, mst?: string, diaChi?: string): KhachHang {
  return { id, ten, mst: mst ?? '', diaChi: diaChi ?? '', nguoiLienHe: '', dienThoai: '', email: '', ghiChu: '' };
}

export function thuocTinhTheoNhom(n: NhomHang): string[] {
  if (n === 'Khí chuẩn') return ['Nồng độ', 'Thể tích'];
  if (n === 'Dung dịch chuẩn') return ['Nồng độ', 'Thể tích'];
  if (n === 'Vỏ bình') return ['Thể tích', 'Vật liệu'];
  return [];
}

/** 'KC-O2-10L' → '10L' (thuộc tính biến thể của phiếu kho import). */
function thuocTinhTuMa(ma: string): string {
  return ma.match(/-(\d+L)$/)?.[1] ?? '';
}

function loaiChiPhiTu(raw?: string): string {
  const f = fold(raw);
  if (!f) return 'VH-KHAC';
  if (f.includes('quang cao')) return 'VH-MKT';
  if (f.includes('luong') || f.includes('cong doan')) return 'VH-LUONG';
  if (f.includes('cong tac')) return 'VH-CTP';
  if (f.includes('thue')) return 'VH-THUE';
  if (f.includes('van phong') || f.includes('chuyen phat')) return 'VH-VP';
  return 'VH-KHAC';
}

function phieuRong(): Omit<PhieuThuChi, 'id' | 'soPhieu' | 'ngayLap' | 'loai' | 'nguonTien' | 'noiDung' | 'nguoiDeNghi' | 'trangThai'> {
  return { soTienThu: 0, soTienChi: 0, files: [] };
}

function phieu(
  db: Db,
  so: (prefix: string, ngay: string) => string,
  o: Partial<PhieuThuChi> & Pick<PhieuThuChi, 'ngayLap' | 'loai' | 'nguonTien' | 'noiDung'>,
): PhieuThuChi {
  const p: PhieuThuChi = {
    ...phieuRong(),
    id: uid('PTC'),
    soPhieu: so(db.cauHinh.TIEN_TO_TC, o.ngayLap),
    nguoiDeNghi: CXD,
    trangThai: 'Đã duyệt',
    nguoiDuyet: 'Import',
    ngayDuyet: o.ngayLap,
    import: true,
    ...o,
    soTienThu: Math.round(o.soTienThu ?? 0),
    soTienChi: Math.round(o.soTienChi ?? 0),
  };
  db.phieuThuChi.push(p);
  return p;
}
