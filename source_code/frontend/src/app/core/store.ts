/**
 * Kho dữ liệu trung tâm + toàn bộ luồng nghiệp vụ ghi dữ liệu.
 *
 * Quy ước (bám "Quy ước code" của spec):
 *  - Mọi hàm ghi gọi this.require(...) TRƯỚC khi ghi (tương đương _requireCanEdit_).
 *  - Hàm ghi trả `string | null`: chuỗi = lỗi tiếng Việt để hiện lên giao diện, null = thành công.
 *  - Dữ liệu lưu ở localStorage (bản chạy thử); thay lớp này bằng lời gọi Apps Script khi triển khai,
 *    giữ nguyên chữ ký hàm để các màn hình không phải sửa.
 */
import { Injectable, computed, effect, signal } from '@angular/core';
import {
  CauHinh,
  CauHinhKey,
  ChiPhiHD,
  ChuHoSo,
  Db,
  DoiTuong,
  DOI_TUONG_LABEL,
  DongPhieuKho,
  DongTienPT,
  FileRef,
  HoSo,
  HoaDon,
  HopDongBan,
  HopDongMua,
  HopDongPhuTai,
  KHO_CHUYEN_THANG,
  KhachHang,
  ChamSocKH,
  DeNghiVatTu,
  ViecGiao,
  CoHoi,
  TiepCan,
  AnhXaTen,
  Kho,
  KiemKe,
  LCP_HOA_HONG,
  LichSuDuyet,
  LoaiChiPhi,
  LoaiHang,
  LoaiHoSo,
  NhaCungCap,
  NguonTien,
  PhieuKho,
  PhieuThuChi,
  NhomQuyen,
  TableKey,
  TaiKhoan,
  TrangThaiHDB,
  TrangThaiHDM,
  TrangThaiPT,
  YeuCauXoa,
  CHECKLIST_HDM,
} from './models';
import { CHUC_NANG, KE_TOAN_DUYET_XOA, Level, Perm, atLeast, levelOf } from './perm';
import { CAU_HINH_MAC_DINH, DB_VERSION, buildSeed, ghepDataKH, nangCapKhoV5, nangCapKhoV6, nangCapV7, nangCapV8, themHdDemo, themTaiKhoanSale } from './seed';
import {
  apDungTuDongHdb,
  hdmChoHdb,
  donGiaChuyenThang,
  donGiaVND,
  hdbCalc,
  hdbKhongGiaoHang,
  hdbThieuDeChuyen,
  hdmCalc,
  hoSoThieu,
  ptCalc,
  slDaNhap,
  soDuQuyPT,
  soDuNguon,
  tamUngChoQuyetToan,
  lechKiemKe,
  maLo,
  tonTheoLo,
} from './calc';
import { deleteBlob, luuTep } from './files';
import { fold, money, nowIso, todayIso, uid, vnd, yy } from './util';

const KEY = 'app-oxy:db';

/** MST Việt Nam: 10 số, hoặc 10 số + "-" + 3 số (chi nhánh). Trống → bắt buộc nhập. */
export function kiemMST(mst: string | undefined): string | null {
  const s = (mst ?? '').trim();
  if (!s) return 'Mã số thuế là bắt buộc';
  return /^\d{10}(-\d{3})?$/.test(s) ? null : 'MST không hợp lệ — 10 số hoặc 10 số-3 số (VD 0101248141 / 0101248141-001)';
}
type Result = string | null;

/** Một dòng xuất kho do người dùng nhập: chỉ định lô, hoặc bỏ trống để tự trừ lô nhập trước (FIFO). */
export interface DongXuat {
  loaiHang: string;
  lo?: string;
  soLuong: number;
  tenTrenHD?: string;
  ghiChu?: string;
}

/** Một dòng nhập lô: mã hàng cố định + quy cách / nồng độ, SL, đơn giá, VAT nhập tay. */
export interface DongNhapLo {
  loaiHang: string;
  thuocTinh: string;
  soLuong: number;
  donGia: number;
  vat?: number;
  ghiChu?: string;
}

@Injectable({ providedIn: 'root' })
export class Store {
  readonly db = signal<Db>(null as unknown as Db);
  readonly ready = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly toast = signal<string | null>(null);
  /** Id tài khoản đang đăng nhập (Auth đặt). */
  readonly meId = signal<string | null>(null);

  readonly firstLoad: Promise<void>;

  constructor() {
    this.firstLoad = this.load();
    let t: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      const d = this.db();
      if (!this.ready() || !d) return;
      clearTimeout(t);
      t = setTimeout(() => {
        try {
          localStorage.setItem(KEY, JSON.stringify(d));
        } catch {
          this.say('Không lưu được vào bộ nhớ trình duyệt — dữ liệu chỉ còn tới khi tải lại trang');
        }
      }, 250);
    });
  }

  private async load(): Promise<void> {
    try {
      let d: Db | null = null;
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) d = JSON.parse(raw) as Db;
      } catch {
        d = null;
      }
      // v1 = dữ liệu mẫu dựng bằng bộ import cũ (sai tổng HĐ mua VNĐ) + vai trò cố định → nạp lại mẫu đã sửa.
      // v2 → v3: giữ dữ liệu đang có trên máy, chỉ ghép thêm data khách hàng Kinh doanh.
      if (d && d.version === 2) {
        ghepDataKH(d);
        // Quyền mới HDB-13-PB (phân bổ data KH): nhóm hệ thống Admin kinh doanh có sẵn như mẫu mặc định.
        const nhomQuyen = d.nhomQuyen.map((g) => (g.id === 'NQ-ADMIN' && !g.quyen['HDB-13-PB'] ? { ...g, quyen: { ...g.quyen, 'HDB-13-PB': 'edit' as const } } : g));
        d = { ...d, nhomQuyen, version: 3 };
      }
      // v3 → v4: thêm tài khoản Sale KD (Hồng Hà, Linh Chi, Sales 3) nếu máy chưa có.
      if (d && d.version === 3) {
        d = { ...d, taiKhoan: [...d.taiKhoan] };
        await themTaiKhoanSale(d);
        d.version = 4;
      }
      // v4 → v5: kho theo LÔ — ghép danh mục mã hàng cố định, gán mã lô / đơn giá cho phiếu cũ.
      if (d && d.version === 4) {
        d = structuredClone(d);
        nangCapKhoV5(d);
        d.version = 5;
      }
      // v5 → v6: bảng ánh xạ tên hàng HĐ bán → mã hàng / lô.
      if (d && d.version === 5) {
        d = structuredClone(d);
        nangCapKhoV6(d);
        d.version = 6;
      }
      // v6 → v7: đề nghị cấp vật tư, dòng hàng / tạm ứng / phạt của HĐ bán.
      if (d && d.version === 6) {
        d = structuredClone(d);
        nangCapV7(d);
        d.version = 7;
      }
      // v7 → v8: việc được giao + quyền TD-01.
      if (d && d.version === 7) {
        d = structuredClone(d);
        nangCapV8(d);
        d.version = 8;
      }
      // v8 → v9: trạng thái data KH "Data thô" đổi tên thành "Chưa phân bổ".
      if (d && d.version === 8) {
        d = structuredClone(d);
        for (const k of d.khachHang) if ((k.trangThaiData as string) === 'Data thô') k.trangThaiData = 'Chưa phân bổ';
        d.version = 9;
      }
      // v9 → v10: giả lập mỗi trạng thái HĐ bán / HĐ mua 1 bản ghi (gồm HĐ mua Huỷ).
      if (d && d.version === 9) {
        d = structuredClone(d);
        themHdDemo(d);
        d.version = DB_VERSION;
      }
      if (!d || d.version !== DB_VERSION) d = await buildSeed();
      // Tham số mới thêm sau (VD PT_CACH_CHIA) — dữ liệu cũ trên máy lấy giá trị mặc định.
      else d = { ...d, cauHinh: { ...CAU_HINH_MAC_DINH, ...d.cauHinh } };
      this.db.set(d);
      this.ready.set(true);
    } catch (e) {
      this.loadError.set(e instanceof Error ? e.message : 'Không dựng được dữ liệu');
    }
  }

  /** Xoá toàn bộ dữ liệu trên máy này và nạp lại dữ liệu mẫu. */
  async resetToSeed(): Promise<void> {
    const d = await buildSeed();
    this.db.set(d);
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {
      /* bỏ qua */
    }
  }

  /** Kiểu toast hiện tại: ok (xanh) / bad (đỏ, hiện lâu hơn). */
  readonly toastTone = signal<'ok' | 'bad'>('ok');

  /**
   * Hiện thông báo. Không truyền tone thì tự đoán: câu bắt đầu "Đã …" là thành công, còn lại là lỗi /
   * cảnh báo — khớp quy ước của mọi màn (`say(err ?? 'Đã …')`).
   */
  say(msg: string, tone?: 'ok' | 'bad'): void {
    const t = tone ?? (/^Đã\s/.test(msg) ? 'ok' : 'bad');
    this.toast.set(msg);
    this.toastTone.set(t);
    setTimeout(() => this.toast() === msg && this.toast.set(null), t === 'bad' ? 5000 : 2800);
  }

  // ── Bảng (chỉ đọc) ────────────────────────────────────────────────────
  readonly taiKhoan = computed(() => this.db().taiKhoan);
  readonly cauHinh = computed(() => this.db().cauHinh);
  readonly cauHinhLog = computed(() => this.db().cauHinhLog);
  readonly yeuCauXoa = computed(() => this.db().yeuCauXoa);
  readonly hoSo = computed(() => this.db().hoSo);
  readonly hoaDon = computed(() => this.db().hoaDon);
  readonly nguonTien = computed(() => this.db().nguonTien);
  readonly loaiChiPhi = computed(() => this.db().loaiChiPhi);
  readonly khachHang = computed(() => this.db().khachHang);
  readonly ncc = computed(() => this.db().ncc);
  readonly kho = computed(() => this.db().kho);
  readonly loaiHang = computed(() => this.db().loaiHang);
  readonly phieuThuChi = computed(() => this.db().phieuThuChi);
  readonly chiPhiHD = computed(() => this.db().chiPhiHD);
  readonly hopDongBan = computed(() => this.db().hopDongBan);
  readonly hopDongMua = computed(() => this.db().hopDongMua);
  readonly phieuKho = computed(() => this.db().phieuKho);
  readonly kiemKe = computed(() => this.db().kiemKe);
  readonly anhXaTen = computed(() => this.db().anhXaTen);
  readonly deNghiVatTu = computed(() => this.db().deNghiVatTu);
  /** Việc được giao: "Sửa của mình" chỉ thấy việc mình giao hoặc được giao. */
  readonly viecVisible = computed(() => {
    const me = this.meId();
    const all = this.db().viecGiao ?? [];
    return this.ownOnly('viec') ? all.filter((v) => v.nguoiTao === me || v.nguoiNhan.includes(me ?? '')) : all;
  });
  /** Việc chưa xong giao cho tôi (hoặc việc của tôi) — số trên menu. */
  readonly viecCuaToi = computed(() => {
    const me = this.meId() ?? '';
    return (this.db().viecGiao ?? []).filter((v) => !v.xongLuc && (v.nguoiNhan.includes(me) || (!v.nguoiNhan.length && v.nguoiTao === me))).length;
  });
  /** Tồn theo lô (mọi kho) — dùng chung cho các màn kho. */
  readonly loKho = computed(() => tonTheoLo(this.db()));
  readonly hopDongPhuTai = computed(() => this.db().hopDongPhuTai);
  readonly dongTienPT = computed(() => this.db().dongTienPT);

  // ── Người dùng & quyền ────────────────────────────────────────────────
  readonly me = computed<TaiKhoan | null>(() => {
    const id = this.meId();
    return id ? (this.db()?.taiKhoan.find((t) => t.id === id) ?? null) : null;
  });
  readonly nhomQuyen = computed(() => this.db().nhomQuyen);
  /** Nhóm quyền (đang hoạt động) của người đăng nhập. */
  readonly myGroups = computed<NhomQuyen[]>(() => this.nhomCua(this.me()));
  /** Thuộc nhóm toàn quyền (Giám đốc / Owner). */
  readonly isGD = computed(() => this.myGroups().some((g) => g.toanQuyen));

  nhomCua(t: TaiKhoan | null | undefined): NhomQuyen[] {
    if (!t) return [];
    const all = this.db()?.nhomQuyen ?? [];
    return all.filter((g) => t.nhom.includes(g.id) && g.trangThai === 'Hoạt động');
  }
  /** Tên các nhóm của một tài khoản, VD "Kế toán · Kho". */
  tenNhom(t: TaiKhoan | null | undefined): string {
    const all = this.db()?.nhomQuyen ?? [];
    return (t?.nhom ?? []).map((id) => all.find((g) => g.id === id)?.ten ?? id).join(' · ') || '(chưa có nhóm)';
  }
  /** Quyền của một tài khoản bất kỳ trên một chức năng (VD lọc danh sách Sale phụ trách). */
  levelOfUser(t: TaiKhoan, p: Perm): Level {
    return levelOf(this.nhomCua(t), p);
  }

  level(p: Perm): Level {
    return levelOf(this.myGroups(), p);
  }
  /** Thấy được mục này (ở bất kỳ mức nào). */
  canView(p: Perm): boolean {
    return this.level(p) !== 'none';
  }
  /** Sửa được; với mức own chỉ khi ownerId là mình. */
  canEdit(p: Perm, ownerId?: string): boolean {
    const l = this.level(p);
    if (atLeast(l, 'edit')) return true;
    if (l === 'own') return ownerId === undefined || ownerId === this.meId();
    return false;
  }
  canApprove(p: Perm): boolean {
    return this.level(p) === 'approve';
  }
  /** Chỉ thấy bản ghi của mình (Sale). */
  ownOnly(p: Perm): boolean {
    const l = this.level(p);
    return l === 'own' || l === 'ownView';
  }

  private require(p: Perm, min: Level = 'edit', ownerId?: string): Result {
    const l = this.level(p);
    if (min === 'edit' && l === 'own' && (ownerId === undefined || ownerId === this.meId())) return null;
    return atLeast(l, min) ? null : 'Tài khoản của bạn không có quyền thực hiện thao tác này';
  }

  userName(id?: string): string {
    if (!id) return '—';
    return this.db().taiKhoan.find((t) => t.id === id)?.hoTen ?? id;
  }

  // ── Tra cứu ──────────────────────────────────────────────────────────
  khById = (id?: string) => this.db().khachHang.find((x) => x.id === id);
  nccById = (id?: string) => this.db().ncc.find((x) => x.id === id);
  nguonById = (id?: string) => this.db().nguonTien.find((x) => x.id === id);
  nguonTen = (id?: string) => this.nguonById(id)?.ten ?? (id ? id : '—');
  lcpById = (id?: string) => this.db().loaiChiPhi.find((x) => x.id === id);
  lcpTen = (id?: string) => this.lcpById(id)?.ten ?? '—';
  khoById = (id?: string) => this.db().kho.find((x) => x.id === id);
  khoTen = (id?: string) => this.khoById(id)?.ten ?? '—';
  loaiHangById = (id?: string) => this.db().loaiHang.find((x) => x.id === id);
  loaiHangTen = (id?: string) => this.loaiHangById(id)?.ten ?? (id ?? '—');
  hdbById = (id?: string) => this.db().hopDongBan.find((x) => x.id === id);
  hdmById = (id?: string) => this.db().hopDongMua.find((x) => x.id === id);
  ptById = (id?: string) => this.db().hopDongPhuTai.find((x) => x.id === id);
  phieuById = (id?: string) => this.db().phieuThuChi.find((x) => x.id === id);

  /** HĐ Bán người dùng được thấy (Sale: chỉ HĐ mình phụ trách). */
  readonly hdbVisible = computed(() => {
    const all = this.db().hopDongBan;
    return this.ownOnly('hdb') ? all.filter((h) => h.sale === this.meId()) : all;
  });
  /** HĐ Mua: Sale chỉ xem HĐ liên quan HĐ bán của mình. */
  readonly hdmVisible = computed(() => {
    const all = this.db().hopDongMua;
    if (!this.ownOnly('hdm')) return all;
    const mine = new Set(this.hdbVisible().map((h) => h.id));
    return all.filter((m) => [...mine].some((id) => hdmChoHdb(m, id)));
  });

  readonly nguonDangDung = computed(() => this.db().nguonTien.filter((n) => n.trangThai === 'Đang dùng'));
  readonly lcpVanHanh = computed(() => this.db().loaiChiPhi.filter((l) => l.nhom === 'Vận hành' && l.dangDung));
  readonly lcpThucHien = computed(() => this.db().loaiChiPhi.filter((l) => l.nhom === 'Thực hiện HĐ' && l.dangDung));
  readonly khoDangDung = computed(() => this.db().kho.filter((k) => k.dangDung));
  /** Tài khoản nhận được KH / HĐ bán: đang hoạt động và có quyền HĐ bán từ "Sửa của mình" trở lên. */
  readonly dsSale = computed(() =>
    this.db().taiKhoan.filter((t) => t.trangThai === 'Hoạt động' && atLeast(this.levelOfUser(t, 'hdb'), 'own')),
  );

  /**
   * Lựa chọn "Sale phụ trách" (HĐ bán, Khách hàng) — danh mục = bảng Tài khoản (dsSale), sắp theo tên.
   * Giá trị đang gán mà nay khoá / mất quyền vẫn giữ trong danh sách để hiện đúng tên.
   */
  saleOpts(dangChon?: string): { value: string; label: string; hint: string }[] {
    const ds = this.dsSale();
    const out = ds.map((t) => ({ value: t.id, label: t.hoTen, hint: t.email }));
    if (dangChon && !ds.some((t) => t.id === dangChon)) {
      const t = this.db().taiKhoan.find((x) => x.id === dangChon);
      out.push({ value: dangChon, label: t?.hoTen ?? dangChon, hint: (t?.email ?? '') + ' · không còn hoạt động / không có quyền HĐ bán' });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }

  // ── Đếm việc chờ (menu, dashboard) ───────────────────────────────────
  readonly phieuChoDuyet = computed(() => this.db().phieuThuChi.filter((p) => p.trangThai === 'Chờ duyệt'));
  readonly cpChoDuyet = computed(() => this.db().chiPhiHD.filter((p) => p.trangThai === 'Chờ duyệt'));
  readonly xoaChoDuyet = computed(() => this.db().yeuCauXoa.filter((y) => y.trangThai === 'Chờ duyệt'));

  // ── Ghi chung ────────────────────────────────────────────────────────
  private patch<K extends TableKey>(k: K, fn: (rows: Db[K]) => Db[K]): void {
    this.db.update((d) => ({ ...d, [k]: fn(d[k]) }));
  }
  private upsert<K extends TableKey>(k: K, row: Db[K][number] & { id: string }): void {
    this.patch(k, (rows) => {
      const arr = rows as unknown as { id: string }[];
      const i = arr.findIndex((x) => x.id === row.id);
      const out = [...arr];
      if (i >= 0) out[i] = row;
      else out.unshift(row);
      return out as unknown as Db[K];
    });
  }
  private drop<K extends TableKey>(k: K, id: string): void {
    this.patch(k, (rows) => (rows as unknown as { id: string }[]).filter((x) => x.id !== id) as unknown as Db[K]);
  }

  /** KT-06 / D-31: {tiền tố}{yy}-{nnnn} theo năm của ngày chứng từ, không tái dùng số. */
  private nextSo(prefix: string, ngay: string): string {
    const k = prefix + yy(ngay || todayIso());
    const n = (this.db().boDem[k] ?? 0) + 1;
    this.db.update((d) => ({ ...d, boDem: { ...d.boDem, [k]: n } }));
    return `${k}-${String(n).padStart(4, '0')}`;
  }

  // ═════════════════════════════════════════════════════════════════════
  // DANH MỤC
  // ═════════════════════════════════════════════════════════════════════

  private nextMa(prefix: string, ids: string[]): string {
    let max = 0;
    for (const id of ids) if (id.startsWith(prefix)) max = Math.max(max, Number(id.slice(prefix.length)) || 0);
    return prefix + String(max + 1).padStart(4, '0');
  }

  /** Bản ghi trùng MST / tên để cảnh báo (HDB-13, HDM-10). */
  trungKhachHang(k: Partial<KhachHang>): KhachHang | undefined {
    return this.db().khachHang.find(
      (x) => x.id !== k.id && ((!!k.mst && x.mst === k.mst) || (!!k.ten && fold(x.ten) === fold(k.ten))),
    );
  }
  trungNCC(n: Partial<NhaCungCap>): NhaCungCap | undefined {
    return this.db().ncc.find(
      (x) => x.id !== n.id && ((!!n.mst && x.mst === n.mst) || (!!n.ten && fold(x.ten) === fold(n.ten))),
    );
  }

  /** Sửa được KH này: quyền Sửa, hoặc Sửa của mình khi KH do mình phụ trách / chưa phân bổ. */
  canEditKH(k?: KhachHang | null): boolean {
    return this.canEdit('khachHang', k?.phuTrach || undefined);
  }

  saveKhachHang(k: KhachHang): Result {
    const cu = k.id ? this.khById(k.id) : undefined;
    const e = this.require('khachHang', 'edit', cu?.phuTrach || undefined);
    if (e) return e;
    if (!k.ten.trim()) return 'Chưa nhập tên khách hàng';
    const loiMst = kiemMST(k.mst);
    if (loiMst) return loiMst;
    const phanBo = this.canEdit('phanBoKH');
    if (!phanBo) {
      // Không có quyền phân bổ: giữ nguyên Sale phụ trách; KH mới do mình tạo thì mình phụ trách (nếu là Sale).
      k.phuTrach = cu ? cu.phuTrach : this.ownOnly('khachHang') ? (this.meId() ?? undefined) : k.phuTrach;
    }
    if ((k.phuTrach || undefined) !== (cu?.phuTrach || undefined)) k.ngayPhanBo = k.phuTrach ? todayIso() : undefined;
    k.trangThaiData = k.phuTrach ? 'Đã phân bổ' : 'Chưa phân bổ';
    if (!cu) k.ngayTiepNhan ||= todayIso();
    k.tiepCan ??= 'Chưa liên hệ';
    k.coHoi ??= 'Chưa tiếp cận';
    // Mã mới gán ngược vào object truyền vào (như saveHdb) để màn gọi biết bản ghi vừa tạo.
    if (!k.id) k.id = this.nextMa('KH', this.db().khachHang.map((x) => x.id));
    this.upsert('khachHang', { ...k });
    return null;
  }

  /** Giao nhiều KH cho một Sale (trống = trả về chưa phân bổ). */
  phanBoKH(ids: readonly string[], sale: string): Result {
    const e = this.require('phanBoKH');
    if (e) return e;
    if (!ids.length) return 'Chưa chọn khách hàng';
    const set = new Set(ids);
    const ngay = todayIso();
    this.patch('khachHang', (rows) =>
      rows.map((k) =>
        set.has(k.id) && (k.phuTrach || '') !== sale
          ? { ...k, phuTrach: sale || undefined, ngayPhanBo: sale ? ngay : undefined, trangThaiData: sale ? 'Đã phân bổ' : 'Chưa phân bổ' }
          : k,
      ),
    );
    return null;
  }

  /** Ghi một lần chăm sóc; đổi trạng thái tiếp cận / cơ hội cùng lúc nếu chọn. */
  ghiChamSoc(id: string, noiDung: string, doi: { tiepCan?: TiepCan; coHoi?: CoHoi } = {}): Result {
    const k = this.khById(id);
    if (!k) return 'Không tìm thấy khách hàng';
    const e = this.require('khachHang', 'edit', k.phuTrach || undefined);
    if (e) return e;
    const nd = noiDung.trim();
    const coHoi = doi.coHoi && doi.coHoi !== k.coHoi ? doi.coHoi : undefined;
    const tiepCan = doi.tiepCan && doi.tiepCan !== k.tiepCan ? doi.tiepCan : undefined;
    if (!nd && !coHoi && !tiepCan) return 'Chưa nhập nội dung chăm sóc';
    const doiChu = [tiepCan && `Tiếp cận → ${tiepCan}`, coHoi && `Cơ hội → ${coHoi}`].filter(Boolean).join(' · ');
    const dong: ChamSocKH = { id: uid('CS'), luc: nowIso(), nguoi: this.meId() ?? '', noiDung: nd || doiChu, coHoi };
    this.upsert('khachHang', {
      ...k,
      tiepCan: tiepCan ?? k.tiepCan,
      coHoi: coHoi ?? k.coHoi,
      chamSoc: [dong, ...(k.chamSoc ?? [])],
    });
    return null;
  }
  saveNCC(n: NhaCungCap): Result {
    const e = this.require('ncc');
    if (e) return e;
    if (!n.ten.trim()) return 'Chưa nhập tên nhà cung cấp';
    if (!n.id) n.id = this.nextMa('NCC', this.db().ncc.map((x) => x.id));
    this.upsert('ncc', { ...n });
    return null;
  }
  /** Nguồn đã có phiếu Đã duyệt thì khoá Số dư đầu kỳ, Ngày đầu kỳ (KT-01). */
  nguonDaPhatSinh(id: string): boolean {
    const d = this.db();
    return (
      d.phieuThuChi.some((p) => p.trangThai === 'Đã duyệt' && (p.nguonTien === id || p.nguonTienDen === id)) ||
      d.chiPhiHD.some((c) => c.trangThai === 'Đã duyệt' && c.nguonTien === id)
    );
  }
  saveNguonTien(n: NguonTien, isNew: boolean): Result {
    const e = this.require('nguonTien');
    if (e) return e;
    if (!n.id.trim() || !n.ten.trim()) return 'Cần nhập Mã nguồn và Tên';
    if (isNew && this.nguonById(n.id)) return `Mã nguồn ${n.id} đã có`;
    const cu = this.nguonById(n.id);
    if (cu && this.nguonDaPhatSinh(n.id) && (cu.soDuDauKy !== n.soDuDauKy || cu.ngayDauKy !== n.ngayDauKy))
      return 'Nguồn đã có phiếu được duyệt — không sửa Số dư đầu kỳ / Ngày đầu kỳ';
    this.upsert('nguonTien', n);
    return null;
  }
  saveLoaiChiPhi(l: LoaiChiPhi): Result {
    const e = this.require('nguonTien');
    if (e) return e;
    if (!l.ten.trim()) return 'Chưa nhập tên loại chi phí';
    if (!l.id) l = { ...l, id: this.nextMa(l.nhom === 'Vận hành' ? 'VH-' : 'CPTH-', this.db().loaiChiPhi.map((x) => x.id)) };
    this.upsert('loaiChiPhi', l);
    return null;
  }
  saveKho(k: Kho): Result {
    const e = this.require('khoDanhMuc');
    if (e) return e;
    if (k.id === KHO_CHUYEN_THANG) return '"Chuyển thẳng" là vị trí hệ thống, không sửa được';
    if (!k.ten.trim()) return 'Chưa nhập tên kho';
    if (!k.id) k = { ...k, id: this.nextMa('KHO', this.db().kho.map((x) => x.id)), loai: 'Kho thường' };
    this.upsert('kho', k);
    return null;
  }
  saveLoaiHang(l: LoaiHang, isNew: boolean): Result {
    const e = this.require('khoDanhMuc');
    if (e) return e;
    if (!l.id.trim() || !l.ten.trim()) return 'Cần nhập Mã hàng và Tên';
    if (/\s/.test(l.id)) return 'Mã hàng không chứa khoảng trắng (VD KC-NO-8L)';
    if (isNew && this.loaiHangById(l.id)) return `Mã ${l.id} đã có`;
    this.upsert('loaiHang', l);
    return null;
  }

  // ═════════════════════════════════════════════════════════════════════
  // KẾ TOÁN — Sổ quỹ (KT-04…KT-10)
  // ═════════════════════════════════════════════════════════════════════

  newPhieu(loai: PhieuThuChi['loai'] = 'Chi'): PhieuThuChi {
    return {
      id: '',
      soPhieu: '',
      ngayLap: todayIso(),
      loai,
      nguonTien: this.nguonDangDung()[0]?.id ?? '',
      noiDung: '',
      soTienThu: 0,
      soTienChi: 0,
      nguoiDeNghi: this.meId() ?? '',
      trangThai: 'Nháp',
      files: [],
    };
  }

  /** Kiểm tra quy tắc KT-05/08/10; trả danh sách lỗi. */
  loiPhieu(p: PhieuThuChi): string[] {
    const e: string[] = [];
    if (!p.ngayLap) e.push('Chưa có Ngày lập');
    if (!p.nguonTien) e.push(p.loai === 'Luân chuyển' ? 'Chưa chọn Nguồn đi' : 'Chưa chọn Nguồn tiền');
    if (!p.noiDung.trim()) e.push('Chưa nhập Nội dung');
    switch (p.loai) {
      case 'Thu':
        if (!(p.soTienThu > 0)) e.push('Số tiền Thu phải > 0');
        break;
      case 'Chi':
      case 'Tạm ứng':
        if (!(p.soTienChi > 0)) e.push('Số tiền Chi phải > 0');
        if (!p.loaiChiPhi) e.push('Chưa chọn Loại chi phí (nhóm Vận hành)');
        if (p.loai === 'Tạm ứng' && !p.nguoiNhan?.trim()) e.push('Chưa nhập Người nhận tạm ứng');
        break;
      case 'Quyết toán tạm ứng':
        if (!p.phieuTamUngGoc) e.push('Chưa chọn phiếu Tạm ứng gốc');
        else if (!tamUngChoQuyetToan(this.db(), p.id).some((x) => x.id === p.phieuTamUngGoc))
          e.push('Phiếu tạm ứng gốc chưa duyệt hoặc đã được quyết toán');
        if (!((p.soTienThucChi ?? -1) >= 0)) e.push('Chưa nhập Số tiền thực chi');
        if (!p.loaiChiPhi) e.push('Chưa chọn Loại chi phí');
        break;
      case 'Luân chuyển':
        if (!p.nguonTienDen) e.push('Chưa chọn Nguồn đến');
        else if (p.nguonTienDen === p.nguonTien) e.push('Nguồn đi phải khác Nguồn đến');
        if (!(p.soTienChi > 0)) e.push('Số tiền phải > 0');
        break;
    }
    return e;
  }

  phieuSuaDuoc(p: PhieuThuChi): boolean {
    if (p.id && p.trangThai !== 'Nháp' && p.trangThai !== 'Từ chối') return false;
    if (p.phatSinh) return false;
    if (this.dangChoXoa('PhieuThuChi', p.id)) return false;
    const l = this.level('soQuy');
    if (atLeast(l, 'edit')) return true;
    return l === 'draft' && (!p.id || p.nguoiDeNghi === this.meId());
  }

  /** Lưu nháp (gui=false) hoặc Gửi duyệt (gui=true). Trả lỗi hoặc null. */
  savePhieu(p: PhieuThuChi, gui: boolean): Result {
    const e = this.require('soQuy', 'draft');
    if (e) return e;
    if (!this.phieuSuaDuoc(p)) return 'Phiếu này không sửa được (đã gửi duyệt, đã duyệt hoặc đang chờ xoá)';
    if (gui) {
      const loi = this.loiPhieu(p);
      if (loi.length) return loi.join(' · ');
    }
    // Chỉ giữ trường của loại phiếu đang chọn — đổi loại không để sót dữ liệu cũ.
    const clean: PhieuThuChi = { ...p };
    if (clean.loai === 'Thu') clean.soTienChi = 0;
    else clean.soTienThu = 0;
    if (clean.loai === 'Quyết toán tạm ứng') clean.soTienChi = 0;
    if (clean.loai !== 'Luân chuyển') clean.nguonTienDen = undefined;
    if (clean.loai === 'Thu' || clean.loai === 'Luân chuyển') clean.loaiChiPhi = undefined;
    if (clean.loai !== 'Tạm ứng' && clean.loai !== 'Quyết toán tạm ứng') clean.nguoiNhan = undefined;
    if (clean.loai !== 'Quyết toán tạm ứng') {
      clean.phieuTamUngGoc = undefined;
      clean.soTienThucChi = undefined;
    }
    if (!clean.id) {
      clean.id = uid('PTC');
      clean.soPhieu = this.nextSo(this.cauHinh().TIEN_TO_TC, clean.ngayLap);
    }
    const truoc = clean.trangThai;
    clean.trangThai = gui ? 'Chờ duyệt' : 'Nháp';
    clean.lyDoTuChoi = gui ? undefined : clean.lyDoTuChoi;
    if (gui || truoc !== 'Nháp' || !clean.lichSu?.length) clean.lichSu = this.ghiLichSu(clean.lichSu, gui ? 'Gửi duyệt' : 'Lưu nháp');
    this.upsert('phieuThuChi', clean);
    return null;
  }

  /** Thêm 1 bước vào lịch sử duyệt của chứng từ (giữ lý do từ chối cũ khi gửi lại). */
  private ghiLichSu(ls: LichSuDuyet[] | undefined, hanhDong: LichSuDuyet['hanhDong'], ghiChu?: string): LichSuDuyet[] {
    return [...(ls ?? []), { luc: nowIso(), nguoi: this.meId() ?? '', hanhDong, ghiChu }];
  }

  /** Người lập (hoặc người có quyền Sửa sổ quỹ) thao tác được trên phiếu tay chưa duyệt. */
  private chuPhieu(p: PhieuThuChi): boolean {
    return !p.phatSinh && (p.nguoiDeNghi === this.meId() ? atLeast(this.level('soQuy'), 'draft') : this.canEdit('soQuy'));
  }

  /** Nhóm D: phiếu Nháp (chưa gửi duyệt, chưa tác động số dư) xoá thẳng, không qua Duyệt xoá. */
  xoaNhapPhieu(id: string): Result {
    const p = this.phieuById(id);
    if (!p) return 'Không tìm thấy phiếu';
    if (p.trangThai !== 'Nháp') return 'Chỉ xoá thẳng phiếu Nháp — phiếu khác gửi yêu cầu xoá';
    if (!this.chuPhieu(p)) return 'Tài khoản của bạn không có quyền xoá phiếu này';
    this.drop('phieuThuChi', id);
    return null;
  }

  /** Nhóm D: người lập rút phiếu Chờ duyệt về Nháp để sửa (trước khi được duyệt). */
  rutLaiPhieu(id: string): Result {
    const p = this.phieuById(id);
    if (!p) return 'Không tìm thấy phiếu';
    if (p.trangThai !== 'Chờ duyệt') return 'Chỉ rút lại phiếu đang Chờ duyệt';
    if (!this.chuPhieu(p)) return 'Tài khoản của bạn không có quyền rút phiếu này';
    this.upsert('phieuThuChi', { ...p, trangThai: 'Nháp', lichSu: this.ghiLichSu(p.lichSu, 'Rút lại') });
    return null;
  }

  /** Người lập không tự duyệt phiếu của mình (trừ Giám đốc) — D-10. */
  private tuDuyet(nguoiLap: string): boolean {
    return nguoiLap === this.meId() && !this.canEdit('tuDuyet');
  }

  duyetPhieu(ids: string[]): Result {
    const e = this.require('soQuyDuyet', 'approve');
    if (e) return e;
    const bo: string[] = [];
    this.patch('phieuThuChi', (rows) =>
      rows.map((p) => {
        if (!ids.includes(p.id) || p.trangThai !== 'Chờ duyệt') return p;
        if (this.tuDuyet(p.nguoiDeNghi)) {
          bo.push(p.soPhieu);
          return p;
        }
        return { ...p, trangThai: 'Đã duyệt', nguoiDuyet: this.meId()!, ngayDuyet: nowIso(), lichSu: this.ghiLichSu(p.lichSu, 'Duyệt') };
      }),
    );
    return bo.length ? `Không tự duyệt phiếu của mình: ${bo.join(', ')}` : null;
  }

  tuChoiPhieu(ids: string[], lyDo: string): Result {
    const e = this.require('soQuyDuyet', 'approve');
    if (e) return e;
    if (!lyDo.trim()) return 'Cần nhập lý do từ chối';
    this.patch('phieuThuChi', (rows) =>
      rows.map((p) =>
        ids.includes(p.id) && p.trangThai === 'Chờ duyệt'
          ? { ...p, trangThai: 'Từ chối', lyDoTuChoi: lyDo, nguoiDuyet: this.meId()!, ngayDuyet: nowIso(), lichSu: this.ghiLichSu(p.lichSu, 'Từ chối', lyDo) }
          : p,
      ),
    );
    return null;
  }

  // ── Chi phí thực hiện HĐ (KT-12…KT-15) ──

  newChiPhi(hdbId = ''): ChiPhiHD {
    return {
      id: '',
      maCP: '',
      hdbId,
      ngay: todayIso(),
      loaiChiPhi: this.lcpThucHien()[0]?.id ?? '',
      noiDung: '',
      soTien: 0,
      nguonTien: this.nguonDangDung()[0]?.id ?? '',
      nguoiThucHien: this.meId() ?? '',
      trangThai: 'Nháp',
      files: [],
    };
  }

  loiChiPhi(c: ChiPhiHD): string[] {
    const e: string[] = [];
    const h = this.hdbById(c.hdbId);
    if (!h) e.push('Chưa chọn Số HĐ bán');
    else if (h.trangThai === 'Báo giá') e.push('HĐ đang ở Báo giá — chỉ ghi chi phí cho HĐ từ Hiệu lực trở đi');
    if (!c.loaiChiPhi || this.lcpById(c.loaiChiPhi)?.nhom !== 'Thực hiện HĐ') e.push('Chưa chọn Loại chi phí thực hiện HĐ');
    if (!c.noiDung.trim()) e.push('Chưa nhập Nội dung');
    if (!(c.soTien > 0)) e.push('Số tiền phải > 0');
    if (!c.nguonTien) e.push('Chưa chọn Nguồn tiền chi ra');
    if (c.loaiChiPhi === LCP_HOA_HONG && !c.nguoiNhan?.trim()) e.push('Hoa hồng cần Người nhận');
    return e;
  }

  chiPhiSuaDuoc(c: ChiPhiHD): boolean {
    if (c.id && c.trangThai !== 'Nháp' && c.trangThai !== 'Từ chối') return false;
    if (this.dangChoXoa('ChiPhiThucHienHD', c.id)) return false;
    const h = this.hdbById(c.hdbId);
    return this.canEdit('cpHD', h?.sale);
  }

  saveChiPhi(c: ChiPhiHD, gui: boolean): Result {
    const h = this.hdbById(c.hdbId);
    const e = this.require('cpHD', 'edit', h?.sale);
    if (e) return e;
    if (!this.chiPhiSuaDuoc(c)) return 'Chi phí này không sửa được';
    if (gui) {
      const loi = this.loiChiPhi(c);
      if (loi.length) return loi.join(' · ');
    }
    const out = { ...c };
    if (!out.id) {
      out.id = uid('CP');
      out.maCP = this.nextSo(this.cauHinh().TIEN_TO_CP, out.ngay);
    }
    const truoc = out.trangThai;
    out.trangThai = gui ? 'Chờ duyệt' : 'Nháp';
    if (gui) out.lyDoTuChoi = undefined;
    if (gui || truoc !== 'Nháp' || !out.lichSu?.length) out.lichSu = this.ghiLichSu(out.lichSu, gui ? 'Gửi duyệt' : 'Lưu nháp');
    this.upsert('chiPhiHD', out);
    return null;
  }

  duyetChiPhi(ids: string[]): Result {
    const e = this.require('cpHDDuyet', 'approve');
    if (e) return e;
    const bo: string[] = [];
    this.patch('chiPhiHD', (rows) =>
      rows.map((c) => {
        if (!ids.includes(c.id) || c.trangThai !== 'Chờ duyệt') return c;
        if (this.tuDuyet(c.nguoiThucHien)) {
          bo.push(c.maCP);
          return c;
        }
        return { ...c, trangThai: 'Đã duyệt', nguoiDuyet: this.meId()!, ngayDuyet: nowIso(), lichSu: this.ghiLichSu(c.lichSu, 'Duyệt') };
      }),
    );
    return bo.length ? `Không tự duyệt chi phí của mình: ${bo.join(', ')}` : null;
  }

  tuChoiChiPhi(ids: string[], lyDo: string): Result {
    const e = this.require('cpHDDuyet', 'approve');
    if (e) return e;
    if (!lyDo.trim()) return 'Cần nhập lý do từ chối';
    this.patch('chiPhiHD', (rows) =>
      rows.map((c) =>
        ids.includes(c.id) && c.trangThai === 'Chờ duyệt'
          ? { ...c, trangThai: 'Từ chối', lyDoTuChoi: lyDo, nguoiDuyet: this.meId()!, ngayDuyet: nowIso(), lichSu: this.ghiLichSu(c.lichSu, 'Từ chối', lyDo) }
          : c,
      ),
    );
    return null;
  }

  /** Chi phí Nháp xoá thẳng (nhóm D). */
  xoaNhapChiPhi(id: string): Result {
    const c = this.db().chiPhiHD.find((x) => x.id === id);
    if (!c) return 'Không tìm thấy chi phí';
    if (c.trangThai !== 'Nháp') return 'Chỉ xoá thẳng chi phí Nháp — chi phí khác gửi yêu cầu xoá';
    if (!this.canEdit('cpHD', this.hdbById(c.hdbId)?.sale)) return 'Tài khoản của bạn không có quyền xoá chi phí này';
    this.drop('chiPhiHD', id);
    return null;
  }

  /** Rút chi phí Chờ duyệt về Nháp (nhóm D). */
  rutLaiChiPhi(id: string): Result {
    const c = this.db().chiPhiHD.find((x) => x.id === id);
    if (!c) return 'Không tìm thấy chi phí';
    if (c.trangThai !== 'Chờ duyệt') return 'Chỉ rút lại chi phí đang Chờ duyệt';
    if (!this.canEdit('cpHD', this.hdbById(c.hdbId)?.sale)) return 'Tài khoản của bạn không có quyền rút chi phí này';
    this.upsert('chiPhiHD', { ...c, trangThai: 'Nháp', lichSu: this.ghiLichSu(c.lichSu, 'Rút lại') });
    return null;
  }

  soDu(nguonId: string, denNgay?: string) {
    return soDuNguon(nguonId, this.db(), denNgay);
  }

  // ═════════════════════════════════════════════════════════════════════
  // KINH DOANH — HĐ Bán (HDB-01…13)
  // ═════════════════════════════════════════════════════════════════════

  /** HĐ bán mới; truyền mã KH (VD từ màn Khách hàng) thì chép sẵn Tên / MST / Địa chỉ. */
  newHdb(maKH?: string): HopDongBan {
    const c = this.cauHinh();
    const k = maKH ? this.khById(maKH) : undefined;
    return {
      id: '',
      soHD: '',
      maKH: k?.id ?? '',
      tenKH: k?.ten ?? '',
      mst: k?.mst ?? '',
      diaChi: k?.diaChi ?? '',
      trangThai: 'Báo giá',
      sale: this.meId() ?? '',
      ghiChu: '',
      truocVAT: 0,
      vat: 8,
      thucTeTruocVAT: 0,
      thamSoThue: { nguong: c.TNDN_NGUONG, muc1: c.TNDN_MUC1, muc2: c.TNDN_MUC2 },
      dotTT: [],
      dongHang: [],
      coTamUng: false,
      taoLuc: nowIso(),
    };
  }

  hdbKhoa(h: HopDongBan): boolean {
    return h.trangThai === 'Đã tất toán' || this.dangChoXoa('HopDongBan', h.id);
  }

  /** Lưu HĐ (Tab 1 + Tab 3). Trả id khi thành công qua out.id. */
  saveHdb(h: HopDongBan): Result {
    const id0 = h.id;
    const goc = h;
    h = apDungTuDongHdb(h);
    const cu = h.id ? this.hdbById(h.id) : undefined;
    const e = this.require('hdb', 'edit', cu?.sale ?? h.sale);
    if (e) return e;
    if (cu && this.hdbKhoa(cu)) return 'HĐ đã khoá (Đã tất toán hoặc đang chờ xoá)';
    // F-08: Báo giá chưa cần Số HĐ; bắt buộc từ Hiệu lực (hdbThieuDeChuyen).
    const baoGia = (cu?.trangThai ?? 'Báo giá') === 'Báo giá';
    if (!h.soHD.trim() && !baoGia) return 'Số HĐ bán là bắt buộc';
    if (h.soHD.trim() && this.db().hopDongBan.some((x) => x.id !== h.id && fold(x.soHD) === fold(h.soHD))) return `Số HĐ ${h.soHD} đã tồn tại`;
    if (!h.maKH) return 'Chưa chọn Khách hàng';
    if (h.mst?.trim()) {
      const loiMst = kiemMST(h.mst);
      if (loiMst) return loiMst;
    }
    if ((h.phatHD ?? 0) < 0) return 'Tiền phạt HĐ không âm';
    if (cu && !baoGia && (cu.soHD !== h.soHD || cu.maKH !== h.maKH)) return 'Từ "Hiệu lực" không đổi Số HĐ / Khách hàng';
    if (cu && this.hdbCoPhieuThu(cu) && (cu.truocVAT !== h.truocVAT || cu.vat !== h.vat))
      return 'HĐ đã có phiếu Thu — không đổi Giá trị trước VAT / VAT (xoá phiếu Thu trước nếu cần sửa)';
    if (h.ngayKy && h.ngayHieuLuc && h.ngayHieuLuc < h.ngayKy) return 'Ngày hiệu lực (ngày thu tạm ứng) phải ≥ Ngày ký';
    if (h.dotTT.length > this.cauHinh().SO_DOT_TOI_DA) return `Tối đa ${this.cauHinh().SO_DOT_TOI_DA} đợt thanh toán`;
    if (cu && cu.trangThai !== 'Báo giá' && h.trangThai === cu.trangThai) {
      const thieu = hdbThieuDeChuyen(h, 'Hiệu lực', this.db());
      if (thieu.length) return thieu.join(' · ');
    }
    // Ngày & số thực thu chỉ Kế toán / Giám đốc nhập (Ma trận quyền).
    if (cu && !this.canEdit('hdbThucThu')) {
      h = {
        ...h,
        dotTT: h.dotTT.map((d) => {
          const old = cu.dotTT.find((x) => x.dot === d.dot);
          return { ...d, ngayThu: old?.ngayThu, soTienThu: old?.soTienThu, nguonTienNhan: old?.nguonTienNhan, phieuThuId: old?.phieuThuId };
        }),
      };
    }
    const out: HopDongBan = { ...h, id: h.id || uid('HDB') };
    this.upsert('hopDongBan', out);
    if (!id0) goc.id = out.id;
    // KH chưa có MST / địa chỉ mà HĐ đã nhập → ghi ngược về danh mục khách hàng (không phải quay lại sửa KH).
    const k = this.khById(h.maKH);
    if (k && ((!k.mst?.trim() && h.mst?.trim()) || (!k.diaChi?.trim() && h.diaChi?.trim())))
      this.upsert('khachHang', { ...k, mst: k.mst?.trim() || h.mst.trim(), diaChi: k.diaChi?.trim() || h.diaChi.trim() });
    return null;
  }

  /** HĐ đã có phiếu Thu sinh từ đợt TT (chưa bị từ chối) — F-08: khoá Giá trị / VAT. */
  hdbCoPhieuThu(h: HopDongBan): boolean {
    return h.dotTT.some((d) => {
      const p = d.phieuThuId ? this.phieuById(d.phieuThuId) : undefined;
      return !!p && p.trangThai !== 'Từ chối';
    });
  }

  /** Bảng trạng thái kế tiếp hợp lệ (HDB-03). */
  hdbKeTiep(h: HopDongBan): TrangThaiHDB | null {
    const order: TrangThaiHDB[] = ['Báo giá', 'Hiệu lực', 'Đang giao hàng', 'Hoàn thành', 'Đã tất toán'];
    // F-07: HĐ không giao hàng (dịch vụ) đi thẳng Hiệu lực → Hoàn thành.
    if (h.trangThai === 'Hiệu lực' && hdbKhongGiaoHang(h, this.db())) return 'Hoàn thành';
    const i = order.indexOf(h.trangThai);
    return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
  }

  chuyenTrangThaiHdb(id: string, toi: TrangThaiHDB): Result {
    const h = this.hdbById(id);
    if (!h) return 'Không tìm thấy HĐ';
    const e = this.require('hdb', 'edit', h.sale);
    if (e) return e;
    if (this.dangChoXoa('HopDongBan', id)) return 'HĐ đang chờ xoá';
    if (h.trangThai === 'Đã tất toán') return 'HĐ đã tất toán — dùng "Mở lại" (HDB-03-ML)';
    // Chỉ đi đúng bước kế tiếp; "Đang giao hàng" do ghi nhận giao hàng tự chuyển.
    if (toi !== this.hdbKeTiep(h) || toi === 'Đang giao hàng') return `Không chuyển được từ "${h.trangThai}" sang "${toi}"`;
    const thieu = hdbThieuDeChuyen(h, toi, this.db());
    if (thieu.length) return thieu.join(' · ');
    this.upsert('hopDongBan', { ...h, trangThai: toi });
    return null;
  }

  /** Giám đốc mở lại HĐ đã tất toán → Hoàn thành. */
  moLaiHdb(id: string): Result {
    if (!this.canEdit('moLaiHdb')) return 'Cần quyền "Mở lại HĐ đã tất toán" (HDB-03-ML)';
    const h = this.hdbById(id);
    if (!h) return 'Không tìm thấy HĐ';
    if (h.trangThai !== 'Đã tất toán') return 'Chỉ mở lại HĐ đã tất toán';
    if (this.dangChoXoa('HopDongBan', id)) return 'HĐ đang chờ xoá';
    this.upsert('hopDongBan', { ...h, trangThai: 'Hoàn thành' });
    return null;
  }

  /** HDB-04: ghi nhận một lần giao → sinh 1 phiếu Xuất kho trừ theo lô (giá vốn = đơn giá lô, KHO-10). */
  ghiNhanGiaoHang(hdbId: string, o: { ngay: string; kho: string; dong: DongXuat[]; ghiChu?: string }): Result {
    const h = this.hdbById(hdbId);
    if (!h) return 'Không tìm thấy HĐ';
    const e = this.require('hdbGiaoHang', 'edit', h.sale);
    if (e) return e;
    if (h.trangThai === 'Báo giá') return 'HĐ chưa Hiệu lực';
    if (h.trangThai === 'Hoàn thành') return 'HĐ đã Hoàn thành — không ghi nhận giao thêm';
    if (this.hdbKhoa(h)) return 'HĐ đã khoá';
    if (!o.kho) return 'Chưa chọn Vị trí kho';
    const dong = this.dongXuatTheoLo(o.kho, hdbId, o.dong, o.ngay);
    if (typeof dong === 'string') return dong;
    if (dong.length === 0) return 'Cần ít nhất 1 dòng hàng có số lượng > 0';
    const p: PhieuKho = {
      id: uid('PK'),
      soPhieu: this.nextSo(this.cauHinh().TIEN_TO_XK, o.ngay),
      ngay: o.ngay,
      loai: 'Xuất',
      nguonGoc: 'Tự động HĐ Bán',
      hdId: hdbId,
      kho: o.kho,
      nguoiThucHien: this.meId()!,
      trangThai: 'Hiệu lực',
      ghiChu: o.ghiChu,
      dong,
    };
    this.upsert('phieuKho', p);
    if (h.trangThai === 'Hiệu lực') this.upsert('hopDongBan', { ...h, trangThai: 'Đang giao hàng' });
    return null;
  }

  /**
   * Dòng xuất → dòng phiếu theo LÔ (sheet "2. XuatKho"): chỉ định lô thì trừ đúng lô đó, bỏ trống thì trừ
   * lô nhập trước (FIFO, có thể tách nhiều dòng). Chặn xuất quá tồn lô. Giá vốn = đơn giá của lô.
   * Chỉ trừ lô đã nhập tới ngày xuất. Kho Chuyển thẳng không có lô: giá gốc đích danh theo HĐ Mua liên quan (KHO-07).
   */
  private dongXuatTheoLo(kho: string, hdbId: string | undefined, vao: DongXuat[], ngay: string): DongPhieuKho[] | string {
    const db = this.db();
    const tatCa = tonTheoLo(db).map((l) => ({ ...l }));
    const lots = tatCa.filter((l) => !ngay || l.ngay <= ngay);
    const out: DongPhieuKho[] = [];
    for (const d of vao) {
      if (!d.loaiHang || !(d.soLuong > 0)) continue;
      const tenTrenHD = d.tenTrenHD?.trim() || undefined;
      const ghiChu = d.ghiChu?.trim() || undefined;
      if (kho === KHO_CHUYEN_THANG) {
        out.push({ loaiHang: d.loaiHang, thuocTinh: '', soLuong: d.soLuong, donGiaGoc: donGiaChuyenThang(db, hdbId, d.loaiHang), tenTrenHD, ghiChu });
        continue;
      }
      if (d.lo) {
        const l = tatCa.find((x) => x.lo === d.lo);
        if (l && ngay && l.ngay > ngay) return `Lô ${d.lo} nhập ngày ${l.ngay.split('-').reverse().join('/')} — sau ngày xuất`;
      }
      const chon = d.lo ? lots.filter((l) => l.lo === d.lo) : lots;
      if (d.lo && (!chon[0] || chon[0].kho !== kho || chon[0].loaiHang !== d.loaiHang)) return `Lô ${d.lo} không phải ${d.loaiHang} tại kho đã chọn`;
      let con = d.soLuong;
      for (const l of chon) {
        if (con <= 0) break;
        if (l.loaiHang !== d.loaiHang || l.kho !== kho || l.ton <= 0) continue;
        const sl = Math.min(con, l.ton);
        l.ton -= sl;
        con -= sl;
        out.push({ loaiHang: d.loaiHang, thuocTinh: l.quyCach, soLuong: sl, lo: l.lo, donGiaGoc: l.donGia, tenTrenHD, ghiChu });
      }
      if (con > 0)
        return d.lo
          ? `Lô ${d.lo} không đủ tồn (thiếu ${con}) — không xuất quá tồn`
          : `${d.loaiHang}: tồn tại kho tới ngày xuất không đủ (thiếu ${con}) — cần nhập / đặt mua NCC trước khi xuất`;
    }
    return out;
  }

  /** Kiểm tra trước (không ghi) một bộ dòng xuất — trả lỗi đầu tiên hoặc null. */
  loiXuat(kho: string, hdbId: string | undefined, dong: DongXuat[], ngay: string): string | null {
    if (!kho) return null;
    const r = this.dongXuatTheoLo(kho, hdbId, dong, ngay);
    return typeof r === 'string' ? r : null;
  }

  /** Mã lô cho dòng mới: "L<số hoá đơn>-<nn>" như file kho; không có số hoá đơn thì "<số phiếu>-<nn>". Không trùng lô cũ. */
  private maLoMoi(soPhieu: string, soHoaDon: string | undefined, i: number, daCo: Set<string>): string {
    const so = soHoaDon?.replace(/\D/g, '');
    const goc = so ? `L${so}` : soPhieu;
    const nn = String(i + 1).padStart(2, '0');
    let ma = `${goc}-${nn}`;
    for (let k = 2; daCo.has(ma); k++) ma = `${goc}-${nn}.${k}`;
    daCo.add(ma);
    return ma;
  }
  private loDaCo(): Set<string> {
    const s = new Set<string>();
    for (const p of this.db().phieuKho) if (p.loai === 'Nhập') p.dong.forEach((_, i) => s.add(maLo(p, i)));
    return s;
  }

  /**
   * Kế toán ghi nhận thực thu một đợt (HDB-10). Sinh kèm phiếu Thu Chờ duyệt ở Sổ quỹ để số dư
   * nguồn tiền tăng khi được duyệt [Inference — spec không nói rõ; đối xứng với HDM-08].
   */
  ghiThucThu(hdbId: string, dot: number, o: { ngayThu: string; soTienThu: number; nguonTienNhan: string }): Result {
    const e = this.require('hdbThucThu');
    if (e) return e;
    const h = this.hdbById(hdbId);
    if (!h) return 'Không tìm thấy HĐ';
    if (this.hdbKhoa(h)) return 'HĐ đã khoá';
    // HĐ có tạm ứng: đợt 1 (tạm ứng) thu ngay ở Báo giá — ngày thu đợt 1 chính là Ngày hiệu lực.
    if (h.trangThai === 'Báo giá' && !(h.coTamUng && dot === 1)) return 'HĐ đang ở Báo giá — chỉ ghi thực thu từ Hiệu lực trở đi (trừ đợt tạm ứng)';
    const d = h.dotTT.find((x) => x.dot === dot);
    if (!d) return 'Không có đợt này';
    if (!o.ngayThu || !(o.soTienThu > 0) || !o.nguonTienNhan) return 'Cần Ngày thực thu, Số tiền > 0 và Nguồn tiền nhận';
    const conLai = this.hdbConThuDuoc(h, dot);
    if (o.soTienThu > conLai) return `Số thu vượt phần còn phải thu của HĐ (tối đa ${vnd(conLai)})`;
    let phieuThuId = d.phieuThuId;
    const cu = phieuThuId ? this.phieuById(phieuThuId) : undefined;
    if (cu && cu.trangThai === 'Đã duyệt') return 'Phiếu thu của đợt này đã duyệt — muốn sửa thì bấm "Yêu cầu xoá phiếu" ở dòng đợt, duyệt xong ghi lại';
    const p: PhieuThuChi = {
      ...(cu ?? this.newPhieu('Thu')),
      loai: 'Thu',
      ngayLap: o.ngayThu,
      nguonTien: o.nguonTienNhan,
      noiDung: `Thu đợt ${dot} — HĐ bán ${h.soHD} (${h.tenKH})`,
      soTienThu: o.soTienThu,
      soTienChi: 0,
      trangThai: 'Chờ duyệt',
      lyDoTuChoi: undefined,
      phatSinh: { loai: 'HDB-DotTT', hdId: h.id, dot },
    };
    p.lichSu = this.ghiLichSu(cu?.lichSu, 'Gửi duyệt', cu ? 'Sửa ghi nhận thực thu' : 'Sinh từ ghi nhận thực thu');
    if (!p.id) {
      p.id = uid('PTC');
      p.soPhieu = this.nextSo(this.cauHinh().TIEN_TO_TC, p.ngayLap);
    }
    phieuThuId = p.id;
    this.upsert('phieuThuChi', p);
    this.upsert(
      'hopDongBan',
      apDungTuDongHdb({
        ...h,
        dotTT: h.dotTT.map((x) => (x.dot === dot ? { ...x, ...o, phieuThuId } : x)),
      }),
    );
    return null;
  }

  // ── Việc được giao (ToDoList) ──

  giaoViec(o: { noiDung: string; nguoiNhan: string[]; hdbId?: string; han?: string; gio?: string }): Result {
    const e = this.require('viec', 'own');
    if (e) return e;
    const noiDung = o.noiDung.trim();
    if (!noiDung) return 'Nhập nội dung việc';
    const me = this.meId()!;
    const v: ViecGiao = {
      id: uid('VG'),
      noiDung,
      nguoiTao: me,
      taoLuc: nowIso(),
      nguoiNhan: [...new Set(o.nguoiNhan.filter((x) => x && x !== me))],
      hdbId: o.hdbId || undefined,
      han: o.han || todayIso(),
      gio: o.gio || undefined,
      uuTien: this.coToanQuyen(),
      phanHoi: [],
    };
    this.upsert('viecGiao', v);
    return null;
  }

  /** Người liên quan (giao / nhận) hoặc người thấy mọi việc mới được phản hồi / đổi trạng thái. */
  lienQuanViec(v: ViecGiao): boolean {
    const me = this.meId() ?? '';
    return v.nguoiTao === me || v.nguoiNhan.includes(me) || this.canEdit('viec');
  }

  phanHoiViec(id: string, noiDung: string): Result {
    const v = this.db().viecGiao.find((x) => x.id === id);
    if (!v) return 'Không tìm thấy việc';
    if (!this.lienQuanViec(v)) return 'Bạn không liên quan việc này';
    if (!noiDung.trim()) return 'Nhập nội dung phản hồi';
    this.upsert('viecGiao', { ...v, phanHoi: [...v.phanHoi, { nguoi: this.meId()!, luc: nowIso(), noiDung: noiDung.trim() }] });
    return null;
  }

  xongViec(id: string, xong: boolean): Result {
    const v = this.db().viecGiao.find((x) => x.id === id);
    if (!v) return 'Không tìm thấy việc';
    if (!this.lienQuanViec(v)) return 'Bạn không liên quan việc này';
    const me = this.meId()!;
    const dong = { nguoi: me, luc: nowIso(), noiDung: xong ? 'Đã hoàn thành' : 'Mở lại việc', heThong: true };
    this.upsert('viecGiao', { ...v, xongLuc: xong ? nowIso() : undefined, nguoiXong: xong ? me : undefined, phanHoi: [...v.phanHoi, dong] });
    return null;
  }

  /** Tài khoản thuộc nhóm toàn quyền (Giám đốc) — việc giao được đánh dấu ưu tiên. */
  private coToanQuyen(): boolean {
    const t = this.me();
    return !!t && this.db().nhomQuyen.some((g) => g.toanQuyen && g.trangThai === 'Hoạt động' && t.nhom.includes(g.id));
  }

  // ── Đề nghị cấp vật tư ──

  /**
   * HĐ bán thiếu hàng trong kho → lập đề nghị cấp vật tư (đầu vào cho HĐ mua).
   * Mỗi dòng sản phẩm thiếu = 1 đề nghị riêng: cùng mã, cùng nồng độ vẫn có thể mua của NCC khác nhau.
   */
  taoDeNghiVatTu(hdbId: string, dong: { loaiHang: string; tenHang: string; soLuong: number; ghiChu?: string; dongBanId?: string }[], ghiChu?: string): Result | { ids: string[] } {
    const h = this.hdbById(hdbId);
    if (!h) return 'Không tìm thấy HĐ bán';
    const e = this.require('hdb', 'edit', h.sale);
    if (e) return e;
    if (this.hdbKhoa(h)) return 'HĐ đã khoá';
    const ds = dong.filter((d) => d.loaiHang && d.soLuong > 0);
    if (!ds.length) return 'Không có dòng nào cần đề nghị (SL > 0)';
    const ngay = todayIso();
    const ids: string[] = [];
    for (const d of ds) {
      const dn: DeNghiVatTu = {
        id: uid('DN'),
        soPhieu: this.nextSo('DN', ngay),
        ngay,
        hdbId,
        nguoiDeNghi: this.meId()!,
        ghiChu: ghiChu?.trim() || undefined,
        dong: [{ id: uid('DND'), loaiHang: d.loaiHang, tenHang: d.tenHang.trim(), soLuong: d.soLuong, ghiChu: d.ghiChu?.trim() || undefined, dongBanId: d.dongBanId }],
      };
      this.upsert('deNghiVatTu', dn);
      ids.push(dn.id);
    }
    return { ids };
  }

  huyDeNghiVatTu(id: string, lyDo: string): Result {
    const dn = this.db().deNghiVatTu.find((x) => x.id === id);
    if (!dn) return 'Không tìm thấy đề nghị';
    const e = this.require('hdb', 'edit', this.hdbById(dn.hdbId)?.sale);
    if (e) return e;
    if (!lyDo.trim()) return 'Cần lý do huỷ';
    if (this.db().hopDongMua.some((m) => m.trangThai !== 'Huỷ' && m.chiTiet.some((d) => d.dnvtId === id)))
      return 'Đề nghị đã lên HĐ mua — bỏ dòng ở HĐ mua trước khi huỷ';
    this.upsert('deNghiVatTu', { ...dn, lyDoHuy: lyDo.trim() });
    return null;
  }

  /** Số tối đa còn ghi thực thu được cho một đợt = Sau VAT − Σ thực thu các đợt khác. */
  hdbConThuDuoc(h: HopDongBan, dot: number): number {
    const sau = hdbCalc(h, this.db()).sauVAT;
    const khac = h.dotTT.filter((x) => x.dot !== dot).reduce((s, x) => s + (x.soTienThu ?? 0), 0);
    return Math.max(0, sau - khac);
  }

  /** HDB-09: thêm nhanh tiền trả khách = 1 CP HĐ loại Hoa hồng, Chờ duyệt. */
  themTienTraKhach(hdbId: string, o: { nguoiNhan: string; soTien: number; ngay: string; nguonTien: string }): Result {
    const c: ChiPhiHD = {
      ...this.newChiPhi(hdbId),
      loaiChiPhi: LCP_HOA_HONG,
      noiDung: `Hoa hồng kinh doanh — ${o.nguoiNhan}`,
      ...o,
    };
    return this.saveChiPhi(c, true);
  }

  // ── Hồ sơ & hoá đơn (NT-12, HDB-05/06) ──

  hoSoCua(chu: ChuHoSo, chuId: string, loai: LoaiHoSo): HoSo | undefined {
    return this.db().hoSo.find((h) => h.chu === chu && h.chuId === chuId && h.loai === loai);
  }

  private permOfChu(chu: ChuHoSo): Perm {
    return chu === 'HDB' ? 'hdb' : chu === 'HDM' ? 'hdm' : 'phuTai';
  }
  private ownerOfChu(chu: ChuHoSo, id: string): string | undefined {
    return chu === 'HDB' ? this.hdbById(id)?.sale : undefined;
  }

  async uploadHoSo(chu: ChuHoSo, chuId: string, loai: LoaiHoSo, files: File[]): Promise<Result> {
    const e = this.require(this.permOfChu(chu), 'edit', this.ownerOfChu(chu, chuId));
    if (e) return e;
    const refs: FileRef[] = [];
    try {
      for (const f of files) refs.push(await luuTep(f, this.meId()!));
    } catch (err) {
      return err instanceof Error ? err.message : 'Không lưu được tệp';
    }
    const cu = this.hoSoCua(chu, chuId, loai);
    const h: HoSo = cu
      ? { ...cu, files: [...cu.files, ...refs], daLuu: true }
      : { id: uid('HS'), chu, chuId, loai, files: refs, daLuu: true, daScan: false };
    this.upsert('hoSo', h);
    return null;
  }

  /** Tích tay Đã lưu (bản giấy, bắt buộc ghi chú) / Đã scan. */
  setHoSoCo(chu: ChuHoSo, chuId: string, loai: LoaiHoSo, co: { daLuu?: boolean; daScan?: boolean; ghiChu?: string }): Result {
    const e = this.require(this.permOfChu(chu), 'edit', this.ownerOfChu(chu, chuId));
    if (e) return e;
    const cu = this.hoSoCua(chu, chuId, loai) ?? { id: uid('HS'), chu, chuId, loai, files: [], daLuu: false, daScan: false };
    const next = { ...cu, ...co };
    if (co.daLuu && next.files.length === 0 && !next.ghiChu?.trim()) return 'Tích "Đã lưu" bản giấy cần ghi chú';
    this.upsert('hoSo', next);
    return null;
  }

  saveHoaDon(x: HoaDon): Result {
    const e = this.require(this.permOfChu(x.chu), 'edit', this.ownerOfChu(x.chu, x.chuId));
    if (e) return e;
    if (!x.soHoaDon.trim() || !x.ngayHoaDon) return 'Số hoá đơn và Ngày hoá đơn là bắt buộc';
    this.upsert('hoaDon', { ...x, id: x.id || uid('HDN') });
    return null;
  }

  // ═════════════════════════════════════════════════════════════════════
  // KINH DOANH — HĐ Mua (HDM-01…10)
  // ═════════════════════════════════════════════════════════════════════

  newHdm(): HopDongMua {
    return {
      id: '',
      soHD: '',
      maNCC: '',
      tenNCC: '',
      diaChi: '',
      mst: '',
      thuocPhuTai: false,
      trangThai: 'Nháp',
      ghiChu: '',
      chiTiet: [],
      nhapTay: false,
      dotTT: [],
      xuatHoaDon: 'Chưa',
      checklist: CHECKLIST_HDM.map((ten) => ({ ten, xong: false })),
      taoLuc: nowIso(),
    };
  }

  hdmKhoa(m: HopDongMua): boolean {
    return m.trangThai === 'Đã tất toán' || m.trangThai === 'Huỷ' || this.dangChoXoa('HopDongMua', m.id);
  }

  saveHdm(m: HopDongMua): Result {
    const cu = m.id ? this.hdmById(m.id) : undefined;
    const canAll = this.canEdit('hdm');
    const canTab4 = this.canEdit('hdmTab4');
    if (!canAll && !canTab4) return 'Tài khoản của bạn không có quyền sửa HĐ mua';
    if (cu && this.hdmKhoa(cu)) return 'HĐ đã khoá';
    if (!canAll && cu) {
      // Kế toán chỉ sửa Tab 4.
      m = { ...cu, dotTT: m.dotTT, xuatHoaDon: m.xuatHoaDon, checklist: m.checklist, nhapTay: m.nhapTay, tongNhapTay: m.tongNhapTay, lyDoNhapTay: m.lyDoNhapTay };
    }
    if (!m.soHD.trim()) return 'Số HĐ mua là bắt buộc';
    if (this.db().hopDongMua.some((x) => x.id !== m.id && fold(x.soHD) === fold(m.soHD))) return `Số HĐ mua ${m.soHD} đã tồn tại`;
    if (!m.maNCC) return 'Chưa chọn Nhà cung cấp';
    if (m.nhapTay && !m.lyDoNhapTay?.trim()) return 'Nhập tay tổng giá trị cần ghi lý do';
    if (m.dotTT.length > this.cauHinh().SO_DOT_TOI_DA) return `Tối đa ${this.cauHinh().SO_DOT_TOI_DA} đợt thanh toán`;
    for (const d of m.chiTiet) {
      if (!d.loaiHang) return 'Có dòng hàng chưa chọn Loại hàng';
      if (!(d.soLuong > 0)) return 'Số lượng mỗi dòng phải > 0';
      if (d.loaiTien !== 'VNĐ' && !(d.tyGia > 0)) return 'Dòng ngoại tệ cần Tỷ giá';
      if (d.loaiTien === 'VNĐ') d.tyGia = 1;
    }
    if (cu) {
      for (const d of cu.chiTiet) {
        const daNhap = slDaNhap(d.id, this.db());
        if (daNhap <= 0) continue;
        const moi = m.chiTiet.find((x) => x.id === d.id);
        if (!moi) return `Dòng "${d.tenHang}" đã có phiếu nhập — không xoá được`;
        if (moi.soLuong < daNhap) return `Dòng "${d.tenHang}": SL mua không nhỏ hơn SL đã nhập kho (${daNhap})`;
      }
      if (cu.thuocPhuTai && !m.thuocPhuTai) {
        const pt = this.db().hopDongPhuTai.find((p) => p.hdMua.includes(cu.id));
        if (pt) return `HĐ đang là giá đầu vào của HĐ Phú Tài ${pt.soHD} — bỏ HĐ này khỏi HĐ Phú Tài trước`;
      }
      // Đợt đã có phiếu chi (chưa bị từ chối): giữ nguyên số tiền & hạn để khớp phiếu.
      m = {
        ...m,
        dotTT: m.dotTT.map((d) => {
          const old = cu.dotTT.find((x) => x.dot === d.dot);
          return old && this.dotMuaKhoa(old) ? { ...d, soTien: old.soTien, han: old.han } : d;
        }),
      };
    }
    const out: HopDongMua = { ...m, id: m.id || uid('HDM') };
    this.upsert('hopDongMua', out);
    if (!m.id) m.id = out.id;
    // Đổi SL mua có thể làm đổi Đang nhận hàng ↔ Đã nhận đủ — chỉ tính lại khi HĐ đã có phiếu nhập
    // (HĐ import chưa có phiếu nhập giữ nguyên trạng thái).
    if (cu && this.db().phieuKho.some((p) => p.hdId === out.id && p.nguonGoc === 'Tự động HĐ Mua' && p.trangThai === 'Hiệu lực'))
      this.capNhatTrangThaiNhan(out.id);
    return null;
  }

  /** Đợt trả NCC đã có phiếu chi còn hiệu lực (chưa bị từ chối) → khoá số tiền / hạn. */
  dotMuaKhoa(d: HopDongMua['dotTT'][number]): boolean {
    const p = d.phieuChiId ? this.phieuById(d.phieuChiId) : undefined;
    return !!p && p.trangThai !== 'Từ chối';
  }

  chuyenTrangThaiHdm(id: string, toi: TrangThaiHDM): Result {
    const m = this.hdmById(id);
    if (!m) return 'Không tìm thấy HĐ';
    const e = this.require('hdm');
    if (e) return e;
    const c = hdmCalc(m, this.db());
    if (toi === 'Đã ký') {
      if (!m.soHD || !m.maNCC || !m.ngayKy) return 'Cần Số HĐ, NCC và Ngày ký';
      if (m.chiTiet.length === 0 && c.tong <= 0) return 'Cần ít nhất 1 dòng hàng hoặc tổng giá trị';
    }
    if (toi === 'Đã tất toán') {
      // F-13: HĐ Oxy có dòng hàng phải nhận đủ (HĐ import đã ở "Đã nhận đủ" không cần phiếu nhập).
      if (!m.thuocPhuTai && c.slMua > 0 && m.trangThai !== 'Đã nhận đủ' && c.slNhap < c.slMua) return `Chưa nhận đủ hàng (đã nhập ${c.slNhap} / ${c.slMua})`;
      if (c.conPhaiTra > 0) return `Còn phải trả NCC ${vnd(c.conPhaiTra)}`;
      if (m.xuatHoaDon !== 'Đã') return 'NCC chưa xuất hoá đơn';
      // HDM-04: cùng quy tắc HDB-05 — thiếu hồ sơ bắt buộc thì chặn tất toán (D-23).
      const thieu = hoSoThieu(this.db(), 'HDM', m.id);
      if (thieu.length) return `Thiếu hồ sơ: ${thieu.join(', ')}`;
    }
    if (toi === 'Huỷ') {
      if (c.slNhap > 0 || c.daTra > 0) return 'Chỉ huỷ khi chưa có phiếu nhập và chưa trả tiền';
      if (m.dotTT.some((d) => this.dotMuaKhoa(d))) return 'Còn phiếu chi trả NCC đang chờ duyệt — từ chối hoặc xoá phiếu chi trước';
    }
    this.upsert('hopDongMua', { ...m, trangThai: toi });
    return null;
  }

  /** HDM-03-ML: mở lại HĐ mua đã tất toán → về trạng thái nhận hàng tương ứng để sửa. */
  moLaiHdm(id: string): Result {
    if (!this.canEdit('moLaiHdm')) return 'Cần quyền "Mở lại HĐ mua đã tất toán" (HDM-03-ML)';
    const m = this.hdmById(id);
    if (!m) return 'Không tìm thấy HĐ';
    if (m.trangThai !== 'Đã tất toán') return 'Chỉ mở lại HĐ đã tất toán';
    if (this.dangChoXoa('HopDongMua', id)) return 'HĐ đang chờ xoá';
    const c = hdmCalc(m, this.db());
    // HĐ import (nhận hàng trước khi có app, không có phiếu nhập) coi như đã nhận đủ.
    const toi: TrangThaiHDM =
      m.thuocPhuTai || c.slMua === 0 ? 'Đã ký' : c.slNhap >= c.slMua || (m.import && c.slNhap === 0) ? 'Đã nhận đủ' : c.slNhap > 0 ? 'Đang nhận hàng' : 'Đã ký';
    this.upsert('hopDongMua', { ...m, trangThai: toi });
    return null;
  }

  /** HDM-06: nhập kho các dòng chọn → 1 phiếu Nhập kho tự động. */
  nhapKho(hdmId: string, o: { ngay: string; kho: string; dong: { dongId: string; soLuong: number }[]; ghiChu?: string; soHoaDon?: string; vat?: number }): Result {
    const e = this.require('hdmNhapKho');
    if (e) return e;
    const m = this.hdmById(hdmId);
    if (!m) return 'Không tìm thấy HĐ';
    if (m.thuocPhuTai) return 'HĐ thuộc Phú Tài không nhập kho Oxy';
    if (m.trangThai === 'Nháp' || m.trangThai === 'Huỷ') return 'HĐ chưa ký hoặc đã huỷ';
    if (!o.kho) return 'Chưa chọn Vị trí kho';
    const db = this.db();
    const dong: DongPhieuKho[] = [];
    for (const x of o.dong) {
      if (!(x.soLuong > 0)) continue;
      const d = m.chiTiet.find((c) => c.id === x.dongId);
      if (!d) continue;
      const con = d.soLuong - slDaNhap(d.id, db);
      if (x.soLuong > con) return `"${d.tenHang}": SL thực nhập vượt SL còn lại (${con})`;
      dong.push({ loaiHang: d.loaiHang, thuocTinh: d.thongSo, soLuong: x.soLuong, dongHDMua: d.id, donGia: Math.round(donGiaVND(d)), vat: o.vat, ghiChu: d.ghiChu });
    }
    if (dong.length === 0) return 'Chưa có dòng nào có SL thực nhập > 0';
    const soPhieu = this.nextSo(this.cauHinh().TIEN_TO_NK, o.ngay);
    const daCo = this.loDaCo();
    dong.forEach((d, i) => (d.lo = this.maLoMoi(soPhieu, o.soHoaDon, i, daCo)));
    const p: PhieuKho = {
      id: uid('PK'),
      soPhieu,
      soHoaDon: o.soHoaDon?.trim() || undefined,
      ncc: m.maNCC,
      ngay: o.ngay,
      loai: 'Nhập',
      nguonGoc: 'Tự động HĐ Mua',
      hdId: hdmId,
      kho: o.kho,
      nguoiThucHien: this.meId()!,
      trangThai: 'Hiệu lực',
      ghiChu: o.ghiChu,
      dong,
    };
    this.upsert('phieuKho', p);
    this.capNhatTrangThaiNhan(hdmId);
    return null;
  }

  /** Đang nhận hàng / Đã nhận đủ tự chuyển theo phiếu nhập (HDM-03). */
  private capNhatTrangThaiNhan(hdmId: string): void {
    const m = this.hdmById(hdmId);
    if (!m || m.trangThai === 'Đã tất toán' || m.trangThai === 'Huỷ' || m.trangThai === 'Nháp') return;
    const c = hdmCalc(m, this.db());
    const toi: TrangThaiHDM = c.slNhap <= 0 ? 'Đã ký' : c.slNhap >= c.slMua ? 'Đã nhận đủ' : 'Đang nhận hàng';
    const checklist = m.checklist.map((x) =>
      x.ten === 'Đã nhập kho' ? { ...x, xong: toi === 'Đã nhận đủ', ngay: toi === 'Đã nhận đủ' ? todayIso() : undefined } : x,
    );
    this.upsert('hopDongMua', { ...m, trangThai: toi, checklist });
  }

  /** HDM-08: ghi nhận trả NCC → phiếu Chi Chờ duyệt (không với HĐ Thuộc Phú Tài). */
  ghiTraNCC(hdmId: string, dot: number, o: { ngayTra: string; soTienTra: number; nguonTien?: string }): Result {
    const e = this.require('hdmTab4');
    if (e) return e;
    const m = this.hdmById(hdmId);
    if (!m) return 'Không tìm thấy HĐ';
    if (this.hdmKhoa(m)) return 'HĐ đã khoá';
    const d = m.dotTT.find((x) => x.dot === dot);
    if (!d) return 'Không có đợt này';
    if (!o.ngayTra || !(o.soTienTra > 0)) return 'Cần Ngày trả và Số tiền > 0';
    if (m.thuocPhuTai) {
      this.upsert('hopDongMua', { ...m, dotTT: m.dotTT.map((x) => (x.dot === dot ? { ...x, ngayTra: o.ngayTra, soTienTra: o.soTienTra } : x)) });
      return null;
    }
    if (!o.nguonTien) return 'Chưa chọn Nguồn tiền';
    const cu = d.phieuChiId ? this.phieuById(d.phieuChiId) : undefined;
    if (cu && cu.trangThai === 'Đã duyệt') return 'Phiếu chi của đợt này đã duyệt — muốn sửa thì bấm "Yêu cầu xoá phiếu" ở dòng đợt, duyệt xong ghi lại';
    const p: PhieuThuChi = {
      ...(cu ?? this.newPhieu('Chi')),
      loai: 'Chi',
      ngayLap: o.ngayTra,
      nguonTien: o.nguonTien,
      noiDung: `Trả NCC đợt ${dot} — HĐ mua ${m.soHD} (${m.tenNCC})`,
      soTienChi: o.soTienTra,
      soTienThu: 0,
      trangThai: 'Chờ duyệt',
      lyDoTuChoi: undefined,
      phatSinh: { loai: 'HDM-DotTT', hdId: m.id, dot },
    };
    p.lichSu = this.ghiLichSu(cu?.lichSu, 'Gửi duyệt', cu ? 'Sửa ghi nhận trả NCC' : 'Sinh từ ghi nhận trả NCC');
    if (!p.id) {
      p.id = uid('PTC');
      p.soPhieu = this.nextSo(this.cauHinh().TIEN_TO_TC, p.ngayLap);
    }
    this.upsert('phieuThuChi', p);
    this.upsert('hopDongMua', {
      ...m,
      dotTT: m.dotTT.map((x) => (x.dot === dot ? { ...x, ngayTra: o.ngayTra, soTienTra: o.soTienTra, nguonTien: o.nguonTien, phieuChiId: p.id } : x)),
    });
    return null;
  }

  // ═════════════════════════════════════════════════════════════════════
  // KHO (KHO-01…10)
  // ═════════════════════════════════════════════════════════════════════

  /**
   * KHO-06: phiếu nhập / xuất tay — chỉ Kho / Giám đốc.
   * Nhập: mỗi dòng = một lô mới, bắt buộc đơn giá; có số hoá đơn NCC thì không cần lý do.
   * Xuất: trừ theo lô (chặn quá tồn); có HĐ bán thì không cần lý do.
   */
  savePhieuKhoTay(
    p: { ngay: string; loai: PhieuKho['loai']; hdId?: string; kho: string; lyDo?: string; ghiChu?: string; soHoaDon?: string; ncc?: string; kiemKeId?: string },
    dongNhap: DongNhapLo[],
    dongXuat: DongXuat[],
    o: { choGia0?: boolean } = {},
  ): Result | { id: string } {
    const e = this.require('khoPhieuTay');
    if (e) return e;
    if (!p.ngay) return 'Chưa chọn Ngày';
    if (!p.kho) return 'Chưa chọn Vị trí kho';
    const coChungTu = p.loai === 'Nhập' ? !!p.soHoaDon?.trim() : !!p.hdId;
    if (!coChungTu && !p.lyDo?.trim()) return p.loai === 'Nhập' ? 'Cần Số hoá đơn NCC hoặc Lý do nhập' : 'Cần chọn HĐ bán hoặc ghi Lý do xuất';
    // Cấp số phiếu chỉ khi dữ liệu hợp lệ — lưu lỗi không làm nhảy số.
    let dong: DongPhieuKho[];
    let soPhieu = '';
    if (p.loai === 'Nhập') {
      const vao = dongNhap.filter((d) => d.loaiHang && d.soLuong > 0);
      if (vao.length === 0) return 'Cần ít nhất 1 dòng hàng có SL > 0';
      const thieuGia = vao.findIndex((d) => !(d.donGia > 0));
      if (thieuGia >= 0 && !o.choGia0) return `Dòng ${thieuGia + 1}: chưa có đơn giá — nhập kho phải có đơn giá của lô`;
      soPhieu = this.nextSo(this.cauHinh().TIEN_TO_NK, p.ngay);
      const daCo = this.loDaCo();
      dong = vao.map((d, i) => ({
        loaiHang: d.loaiHang,
        thuocTinh: d.thuocTinh.trim(),
        soLuong: d.soLuong,
        donGia: Math.max(d.donGia || 0, 0),
        vat: d.vat,
        ghiChu: d.ghiChu?.trim() || undefined,
        lo: this.maLoMoi(soPhieu, p.soHoaDon, i, daCo),
      }));
    } else {
      const r = this.dongXuatTheoLo(p.kho, p.hdId, dongXuat, p.ngay);
      if (typeof r === 'string') return r;
      if (r.length === 0) return 'Cần ít nhất 1 dòng hàng có SL > 0';
      dong = r;
      soPhieu = this.nextSo(this.cauHinh().TIEN_TO_XK, p.ngay);
    }
    const out: PhieuKho = {
      id: uid('PK'),
      soPhieu,
      ngay: p.ngay,
      loai: p.loai,
      hdId: p.hdId || undefined,
      kho: p.kho,
      lyDo: p.lyDo?.trim() || undefined,
      ghiChu: p.ghiChu?.trim() || undefined,
      soHoaDon: p.loai === 'Nhập' ? p.soHoaDon?.trim() || undefined : undefined,
      ncc: p.loai === 'Nhập' ? p.ncc || undefined : undefined,
      kiemKeId: p.kiemKeId,
      dong,
      nguonGoc: 'Nhập tay – điều chỉnh',
      trangThai: 'Hiệu lực',
      nguoiThucHien: this.meId()!,
    };
    this.upsert('phieuKho', out);
    return { id: out.id };
  }

  // ── Kiểm kê ──

  saveKiemKe(k: Pick<KiemKe, 'ngay' | 'kho' | 'ghiChu' | 'dong'> & { id?: string }): Result {
    const e = this.require('khoPhieuTay');
    if (e) return e;
    if (!k.ngay) return 'Chưa chọn Ngày kiểm kê';
    if (!k.kho || k.kho === KHO_CHUYEN_THANG) return 'Chọn một kho thường để kiểm kê';
    const dong = k.dong.filter((d) => d.loaiHang && d.soLuong >= 0);
    if (dong.length === 0) return 'Cần ít nhất 1 dòng mã hàng';
    const cu = k.id ? this.db().kiemKe.find((x) => x.id === k.id) : undefined;
    if (cu?.phieuDieuChinh?.length) return 'Đợt kiểm kê đã sinh phiếu điều chỉnh — không sửa được';
    const out: KiemKe = {
      ...(cu ?? { id: uid('KK'), soPhieu: this.nextSo('KK', k.ngay), nguoiThucHien: this.meId()! }),
      ngay: k.ngay,
      kho: k.kho,
      ghiChu: k.ghiChu?.trim() || undefined,
      dong: dong.map((d) => ({
        loaiHang: d.loaiHang,
        soLuong: d.soLuong,
        tenHang: d.tenHang?.trim() || undefined,
        xuatXu: d.xuatXu?.trim() || undefined,
        nongDo: d.nongDo?.trim() || undefined,
        ghiChu: d.ghiChu?.trim() || undefined,
      })),
    };
    this.upsert('kiemKe', out);
    return null;
  }

  xoaKiemKe(id: string): Result {
    const e = this.require('khoPhieuTay');
    if (e) return e;
    const k = this.db().kiemKe.find((x) => x.id === id);
    if (!k) return 'Không tìm thấy đợt kiểm kê';
    if (this.db().phieuKho.some((p) => p.kiemKeId === id && p.trangThai === 'Hiệu lực')) return 'Đã có phiếu điều chỉnh Hiệu lực — huỷ phiếu trước';
    this.drop('kiemKe', id);
    return null;
  }

  /**
   * Sinh phiếu điều chỉnh theo chênh lệch kiểm kê: thực tế > sổ → phiếu nhập (đơn giá = lô gần nhất của mã, chưa có thì 0);
   * thực tế < sổ → phiếu xuất trừ lô nhập trước. Ngày phiếu = ngày kiểm kê.
   */
  dieuChinhKiemKe(id: string): Result {
    const e = this.require('khoPhieuTay');
    if (e) return e;
    const k = this.db().kiemKe.find((x) => x.id === id);
    if (!k) return 'Không tìm thấy đợt kiểm kê';
    if (this.db().phieuKho.some((p) => p.kiemKeId === id && p.trangThai === 'Hiệu lực')) return 'Đợt này đã có phiếu điều chỉnh';
    const lech = lechKiemKe(this.db(), k).filter((r) => r.lech !== 0);
    if (!lech.length) return 'Không có chênh lệch — không cần điều chỉnh';
    const lots = tonTheoLo(this.db());
    const giaGanNhat = (lh: string) => [...lots].reverse().find((l) => l.loaiHang === lh)?.donGia ?? 0;
    const lyDo = `Điều chỉnh theo kiểm kê ${k.soPhieu} ngày ${k.ngay.split('-').reverse().join('/')}`;
    const ids: string[] = [];
    const thua = lech.filter((r) => r.lech > 0);
    const thieu = lech.filter((r) => r.lech < 0);
    if (thieu.length) {
      const r = this.savePhieuKhoTay(
        { ngay: k.ngay, loai: 'Xuất', kho: k.kho, lyDo, kiemKeId: id },
        [],
        thieu.map((x) => ({ loaiHang: x.loaiHang, soLuong: -x.lech })),
      );
      if (typeof r === 'string') return r;
      if (r) ids.push(r.id);
    }
    if (thua.length) {
      const r = this.savePhieuKhoTay(
        { ngay: k.ngay, loai: 'Nhập', kho: k.kho, lyDo, kiemKeId: id },
        thua.map((x) => ({ loaiHang: x.loaiHang, thuocTinh: 'Theo kiểm kê', soLuong: x.lech, donGia: giaGanNhat(x.loaiHang) })),
        [],
        { choGia0: true },
      );
      if (typeof r === 'string') return r;
      if (r) ids.push(r.id);
    }
    this.upsert('kiemKe', { ...k, phieuDieuChinh: ids });
    return null;
  }

  /** Phiếu tự động chỉ sửa Ngày, Ghi chú (KHO-04/05). */
  suaPhieuKho(id: string, o: { ngay: string; ghiChu?: string }): Result {
    const p = this.db().phieuKho.find((x) => x.id === id);
    if (!p) return 'Không tìm thấy phiếu';
    const e = this.quyenPhieu(p);
    if (e) return e;
    if (o.ngay !== p.ngay) {
      const lots = tonTheoLo(this.db());
      if (p.loai === 'Nhập') {
        const los = new Set(p.dong.map((_, i) => maLo(p, i)));
        const x = this.db().phieuKho.find((q) => q.loai === 'Xuất' && q.trangThai === 'Hiệu lực' && q.ngay < o.ngay && q.dong.some((d) => d.lo && los.has(d.lo)));
        if (x) return `Lô của phiếu đã xuất ngày ${x.ngay.split('-').reverse().join('/')} (phiếu ${x.soPhieu}) — ngày nhập không được sau ngày xuất`;
      } else {
        const l = p.dong.map((d) => lots.find((x) => x.lo === d.lo)).find((x) => x && x.ngay > o.ngay);
        if (l) return `Lô ${l.lo} nhập ngày ${l.ngay.split('-').reverse().join('/')} — ngày xuất không được trước ngày nhập`;
      }
    }
    this.upsert('phieuKho', { ...p, ...o });
    return null;
  }

  private quyenPhieu(p: PhieuKho): Result {
    const e = this.require(p.nguonGoc === 'Tự động HĐ Mua' ? 'hdmNhapKho' : p.nguonGoc === 'Tự động HĐ Bán' ? 'hdbGiaoHang' : 'khoPhieuTay');
    if (e) return e;
    if (p.trangThai === 'Đã huỷ') return 'Phiếu đã huỷ';
    if (this.dangChoXoa('PhieuKho', p.id)) return 'Phiếu đang chờ huỷ — khoá sửa';
    return null;
  }

  /**
   * Sửa thông tin một lô đã nhập (quy cách / nồng độ, đơn giá, VAT, ghi chú) — SL không sửa.
   * Như công thức file kho: giá vốn các dòng xuất đã trừ lô này tự lấy lại theo đơn giá mới. Trả số dòng xuất được cập nhật.
   */
  suaLo(phieuId: string, i: number, o: { thuocTinh: string; donGia: number; vat?: number; ghiChu?: string }): string | { capNhat: number } {
    const p = this.db().phieuKho.find((x) => x.id === phieuId);
    if (!p || p.loai !== 'Nhập' || !p.dong[i]) return 'Không tìm thấy dòng nhập';
    const e = this.quyenPhieu(p);
    if (e) return e;
    if (!(o.donGia >= 0)) return 'Đơn giá không hợp lệ';
    const lo = maLo(p, i);
    const thuocTinh = o.thuocTinh.trim();
    this.upsert('phieuKho', {
      ...p,
      dong: p.dong.map((d, j) => (j === i ? { ...d, lo, thuocTinh, donGia: o.donGia, vat: o.vat, ghiChu: o.ghiChu?.trim() || undefined } : d)),
    });
    let capNhat = 0;
    this.patch('phieuKho', (rows) =>
      rows.map((q) => {
        if (q.loai !== 'Xuất' || !q.dong.some((d) => d.lo === lo)) return q;
        return {
          ...q,
          dong: q.dong.map((d) => {
            if (d.lo !== lo) return d;
            capNhat++;
            return { ...d, donGiaGoc: o.donGia, thuocTinh };
          }),
        };
      }),
    );
    return { capNhat };
  }

  /**
   * Đổi mã hàng (cột "ANH SỬA" của DM mã hàng): đổi ở danh mục và mọi nơi đang dùng mã cũ
   * (phiếu kho, dòng HĐ mua, kiểm kê, ánh xạ tên bán).
   */
  doiMaHang(cu: string, moi: string): Result {
    const e = this.require('khoDanhMuc');
    if (e) return e;
    moi = moi.trim().toUpperCase();
    if (!moi || /\s/.test(moi)) return 'Mã mới không hợp lệ (không chứa khoảng trắng)';
    if (moi === cu) return null;
    if (!this.loaiHangById(cu)) return `Không có mã ${cu}`;
    if (this.loaiHangById(moi)) return `Mã ${moi} đã có`;
    if (this.dangChoXoa('DM_LoaiHang', cu)) return 'Mã đang chờ xoá';
    const doi = (x: string) => (x === cu ? moi : x);
    this.db.update((d) => ({
      ...d,
      loaiHang: d.loaiHang.map((l) => (l.id === cu ? { ...l, id: moi } : l)),
      phieuKho: d.phieuKho.map((p) => (p.dong.some((x) => x.loaiHang === cu) ? { ...p, dong: p.dong.map((x) => ({ ...x, loaiHang: doi(x.loaiHang) })) } : p)),
      hopDongMua: d.hopDongMua.map((m) => (m.chiTiet.some((x) => x.loaiHang === cu) ? { ...m, chiTiet: m.chiTiet.map((x) => ({ ...x, loaiHang: doi(x.loaiHang) })) } : m)),
      kiemKe: d.kiemKe.map((k) => (k.dong.some((x) => x.loaiHang === cu) ? { ...k, dong: k.dong.map((x) => ({ ...x, loaiHang: doi(x.loaiHang) })) } : k)),
      anhXaTen: d.anhXaTen.map((a) => (a.loaiHang === cu ? { ...a, loaiHang: moi } : a)),
    }));
    return null;
  }

  /** Gán tên hàng HĐ bán → mã hàng / lô hay dùng (sheet "5. AnhXaTenBan"). */
  saveAnhXa(id: string, o: Pick<AnhXaTen, 'loaiHang' | 'lo' | 'ghiChu'>): Result {
    const e = this.require('khoDanhMuc');
    if (e) return e;
    const a = this.db().anhXaTen.find((x) => x.id === id);
    if (!a) return 'Không tìm thấy tên hàng';
    if (o.loaiHang && !this.loaiHangById(o.loaiHang)) return `Không có mã ${o.loaiHang}`;
    this.upsert('anhXaTen', { ...a, loaiHang: o.loaiHang || undefined, lo: (o.loaiHang && o.lo) || undefined, ghiChu: o.ghiChu?.trim() || undefined });
    return null;
  }

  /** Thêm tên hàng mới vào bảng ánh xạ (tên chưa có trong danh sách). */
  themAnhXa(o: Pick<AnhXaTen, 'ten' | 'theTich' | 'nongDo' | 'loaiHang' | 'lo' | 'ghiChu'>): Result {
    const e = this.require('khoDanhMuc');
    if (e) return e;
    const ten = o.ten.trim();
    if (!ten) return 'Chưa nhập tên hàng';
    if (this.db().anhXaTen.some((x) => x.ten.toLowerCase() === ten.toLowerCase() && (x.nongDo ?? '') === (o.nongDo ?? ''))) return 'Tên hàng (cùng nồng độ) đã có';
    this.upsert('anhXaTen', { ...o, ten, id: uid('AX'), tongSL: 0, soLan: 0, loaiHang: o.loaiHang || undefined, lo: o.lo || undefined });
    return null;
  }

  // ═════════════════════════════════════════════════════════════════════
  // PHÚ TÀI (PT-01…11)
  // ═════════════════════════════════════════════════════════════════════

  newPt(): HopDongPhuTai {
    const c = this.cauHinh();
    return {
      id: '',
      soHD: '',
      maKH: '',
      tenKH: '',
      mst: '',
      trangThai: 'Báo giá',
      ghiChu: '',
      truocVAT: 0,
      vat: 8,
      hdMua: [],
      chiPhi: [],
      dotKH: [],
      dotTraNCC: [],
      tyLeThue: c.PT_THUE,
      tyLeGiu: c.PT_GIU,
      cachChia: c.PT_CACH_CHIA,
      tyLeLog: [],
      hoaHongKieu: 'Số tiền',
      hoaHongGiaTri: 0,
      doiChieu: [],
      taoLuc: nowIso(),
    };
  }

  ptKhoa(p: HopDongPhuTai): boolean {
    return p.trangThai === 'Đã tất toán' || p.trangThai === 'Huỷ' || this.dangChoXoa('HopDongPhuTai', p.id);
  }

  /** lyDoTyLe: bắt buộc khi đổi tỷ lệ chia (ghi vào lịch sử tỷ lệ). */
  savePt(p: HopDongPhuTai, lyDoTyLe?: string): Result {
    const e = this.require('phuTai');
    if (e) return e;
    const cu = p.id ? this.ptById(p.id) : undefined;
    if (cu && this.ptKhoa(cu)) return 'HĐ đã khoá';
    if (!p.soHD.trim()) return 'Số HĐ là bắt buộc';
    if (this.db().hopDongPhuTai.some((x) => x.id !== p.id && fold(x.soHD) === fold(p.soHD))) return `Số HĐ ${p.soHD} đã tồn tại`;
    if (!p.maKH) return 'Chưa chọn Khách hàng cuối';
    if (p.ngayKy && p.ngayHieuLuc && p.ngayHieuLuc < p.ngayKy) return 'Ngày hiệu lực phải ≥ Ngày ký';
    if (p.truocVAT < 0) return 'Giá bán phải ≥ 0';
    if (p.hoaHongGiaTri < 0) return 'Hoa hồng phải ≥ 0';
    if (p.chiPhi.some((x) => x.soTien < 0)) return 'Chi phí phải ≥ 0';
    if (p.dotKH.some((x) => x.soTien < 0 || !x.ngay)) return 'Mỗi đợt khách hàng trả cần Ngày và Số tiền ≥ 0';
    const sauVAT = ptCalc(p, this.db()).sauVAT;
    if (sauVAT > 0 && p.dotKH.reduce((s, x) => s + x.soTien, 0) > sauVAT) return 'Tổng các đợt khách hàng trả vượt Giá bán sau VAT';
    for (const x of p.dotTraNCC) {
      if (!x.hdmId) return 'Dòng "Phú Tài trả NCC" chưa chọn HĐ mua';
      if (x.soTien < 0 || !x.ngay) return 'Dòng "Phú Tài trả NCC" cần Ngày và Số tiền ≥ 0';
      if (x.loaiTien !== 'VNĐ' && !(x.tyGia > 0)) return 'Dòng "Phú Tài trả NCC" bằng ngoại tệ cần Tỷ giá > 0';
    }
    if (p.doiChieu.some((x) => x.loaiTien !== 'VNĐ' && x.soTienNguyenTe > 0 && !(x.tyGia > 0))) return 'Dòng đối chiếu bằng ngoại tệ cần Tỷ giá > 0';
    const ok = new Set(this.db().hopDongMua.filter((m) => m.thuocPhuTai).map((m) => m.id));
    if (p.hdMua.some((id) => !ok.has(id))) return 'Chỉ chọn HĐ Mua có cờ "Thuộc Phú Tài"';
    // P2-08: một HĐ mua chỉ làm giá đầu vào cho một HĐ Phú Tài (tránh tính giá vốn 2 lần).
    const moiThem = p.hdMua.filter((id) => !(cu?.hdMua ?? []).includes(id));
    const trung = this.db().hopDongPhuTai.find((x) => x.id !== p.id && x.hdMua.some((id) => moiThem.includes(id)));
    if (trung) return `HĐ mua ${trung.hdMua.filter((id) => moiThem.includes(id)).map((id) => this.hdmById(id)?.soHD ?? id).join(', ')} đang là giá đầu vào của HĐ Phú Tài ${trung.soHD}`;
    if (cu && (cu.tyLeThue !== p.tyLeThue || cu.tyLeGiu !== p.tyLeGiu || (cu.cachChia ?? 'Nhân') !== (p.cachChia ?? 'Nhân'))) {
      if (!this.canEdit('phuTaiTyLe')) return 'Cần quyền "Sửa tỷ lệ chia lợi nhuận" (PT-06)';
      if (!lyDoTyLe?.trim()) return 'Đổi tỷ lệ chia cần ghi lý do';
      p = {
        ...p,
        tyLeLog: [
          ...p.tyLeLog,
          {
            truoc: `Thuế ${phanTram(cu.tyLeThue)} · PT giữ ${phanTram(cu.tyLeGiu)} · chia ${cu.cachChia ?? 'Nhân'}`,
            sau: `Thuế ${phanTram(p.tyLeThue)} · PT giữ ${phanTram(p.tyLeGiu)} · chia ${p.cachChia ?? 'Nhân'}`,
            nguoi: this.meId()!,
            luc: nowIso(),
            lyDo: lyDoTyLe?.trim(),
          },
        ],
      };
    }
    const out = { ...p, id: p.id || uid('HDPT') };
    this.upsert('hopDongPhuTai', out);
    this.syncDongTienTuDoiChieu(out);
    if (!p.id) p.id = out.id;
    return null;
  }

  chuyenTrangThaiPt(id: string, toi: TrangThaiPT, lyDoHuy?: string): Result {
    const p = this.ptById(id);
    if (!p) return 'Không tìm thấy HĐ';
    const e = this.require('phuTai');
    if (e) return e;
    if (this.ptKhoa(p)) return 'HĐ đã khoá (Đã tất toán, Huỷ hoặc đang chờ xoá)';
    const order: TrangThaiPT[] = ['Báo giá', 'Hiệu lực', 'Đang thực hiện', 'Hoàn thành', 'Đã tất toán'];
    if (toi !== 'Huỷ' && order.indexOf(toi) !== order.indexOf(p.trangThai) + 1) return `Không chuyển được từ "${p.trangThai}" sang "${toi}"`;
    if (toi === 'Hiệu lực' && (!p.soHD || !p.ngayKy || p.truocVAT <= 0)) return 'Cần Số HĐ, Ngày ký và Giá bán';
    if (toi === 'Đã tất toán') {
      // PT-03 (chốt F-04): KH đã trả Phú Tài đủ VÀ Σ "Chi từ PT" (Phú Tài chuyển trả Oxy) của HĐ ≥ Oxy được hưởng (gộp)
      // — hoa hồng do Oxy tự chi từ phần của mình nên so với phần gộp.
      const c = ptCalc(p, this.db());
      if (c.khDaTra < c.sauVAT) return `Khách hàng chưa trả Phú Tài đủ (còn ${vnd(c.sauVAT - c.khDaTra)})`;
      const daChuyen = soDuQuyPT(this.db(), { hdptId: p.id }).chi;
      if (c.oxyGop > 0 && daChuyen < c.oxyGop)
        return `Phú Tài chưa chuyển đủ phần Oxy được hưởng (đã ghi ${money(daChuyen)} / ${vnd(c.oxyGop)} ở sổ dòng tiền, chiều "Chi từ PT")`;
    }
    if (toi === 'Huỷ' && !lyDoHuy?.trim()) return 'Huỷ HĐ cần ghi lý do';
    this.upsert('hopDongPhuTai', { ...p, trangThai: toi, lyDoHuy: toi === 'Huỷ' ? lyDoHuy!.trim() : p.lyDoHuy });
    return null;
  }

  /** PT-08 → PT-09: mỗi dòng "Oxy chuyển PT" sinh 1 dòng "Thu về PT" tự động trong quỹ ảo. */
  private syncDongTienTuDoiChieu(p: HopDongPhuTai): void {
    this.patch('dongTienPT', (rows) => {
      const giu = rows.filter((r) => !(r.nguon === 'Tự động' && r.hdptId === p.id));
      const auto: DongTienPT[] = p.doiChieu
        .filter((d) => d.soTienVND > 0 && d.ngayOxyChuyen)
        .map((d) => ({
          id: `DT-${d.id}`,
          ngay: d.ngayOxyChuyen!,
          chieu: 'Thu về PT',
          hdptId: p.id,
          soTien: d.soTienVND,
          nguon: 'Tự động',
          refId: d.id,
          ghiChu: `Oxy chuyển Phú Tài — ${p.soHD}`,
        }));
      return [...auto, ...giu];
    });
  }

  themDongTienTay(d: Omit<DongTienPT, 'id' | 'nguon'>): Result {
    const e = this.require('phuTai');
    if (e) return e;
    if (!d.ngay || !(d.soTien > 0)) return 'Cần Ngày và Số tiền > 0';
    if (!d.ghiChu?.trim()) return 'Dòng điều chỉnh tay cần lý do';
    const pt = d.hdptId ? this.ptById(d.hdptId) : undefined;
    if (pt && this.ptKhoa(pt)) return `HĐ ${pt.soHD} đã khoá — không ghi thêm dòng tiền`;
    this.upsert('dongTienPT', { ...d, id: uid('DT'), nguon: 'Nhập tay' });
    return null;
  }

  // ═════════════════════════════════════════════════════════════════════
  // DUYỆT XOÁ (NT-11)
  // ═════════════════════════════════════════════════════════════════════

  dangChoXoa(loai: DoiTuong, id: string): boolean {
    return !!id && this.db().yeuCauXoa.some((y) => y.loai === loai && y.maDoiTuong === id && y.trangThai === 'Chờ duyệt');
  }

  guiYeuCauXoa(loai: DoiTuong, maDoiTuong: string, moTa: string, lyDo: string): Result {
    if (this.level('duyetXoa') === 'none') return 'Tài khoản của bạn không gửi được yêu cầu xoá';
    if (!lyDo.trim()) return 'Cần nhập lý do xoá';
    if (this.dangChoXoa(loai, maDoiTuong)) return 'Bản ghi này đang có yêu cầu xoá chờ duyệt';
    const khoa = this.khoaXoa(loai, maDoiTuong);
    if (khoa) return khoa;
    const vuong = this.thamChieu(loai, maDoiTuong);
    if (vuong) return vuong;
    const y: YeuCauXoa = {
      id: this.nextMa('YC', this.db().yeuCauXoa.map((x) => x.id)),
      loai,
      maDoiTuong,
      moTa,
      lyDo,
      nguoiGui: this.meId()!,
      ngayGui: nowIso(),
      trangThai: 'Chờ duyệt',
    };
    this.upsert('yeuCauXoa', y);
    return null;
  }

  canDuyetXoa(y: YeuCauXoa): boolean {
    return this.canApprove('duyetXoa') || (this.canApprove('duyetXoaKT') && KE_TOAN_DUYET_XOA.includes(y.loai));
  }

  /** Nhóm D: không tự duyệt / từ chối yêu cầu xoá do chính mình gửi (nguyên tắc 2 người) — trừ quyền KT-07-TD; người gửi dùng "Rút yêu cầu". */
  duyetXoaDuoc(y: YeuCauXoa): boolean {
    return this.canDuyetXoa(y) && (y.nguoiGui !== this.meId() || this.canEdit('tuDuyet'));
  }

  /** Duyệt được ít nhất một loại yêu cầu xoá (mọi loại — NT-11, hoặc chứng từ kế toán — NT-11-KT). */
  readonly coQuyenDuyetXoa = computed(() => this.canApprove('duyetXoa') || this.canApprove('duyetXoaKT'));

  /** Dữ liệu bị xoá / thay đổi kèm khi duyệt yêu cầu — hiện cho người duyệt trước khi bấm. */
  anhHuongXoa(y: YeuCauXoa): string[] {
    const d = this.db();
    const id = y.maDoiTuong;
    const hoSo = (chu: ChuHoSo) => {
      const n = d.hoSo.filter((h) => h.chu === chu && h.chuId === id).reduce((s, h) => s + h.files.length, 0);
      const hd = d.hoaDon.filter((h) => h.chu === chu && h.chuId === id).length;
      const out: string[] = [];
      if (n) out.push(`Xoá ${n} tệp hồ sơ đính kèm`);
      if (hd) out.push(`Xoá ${hd} hoá đơn đã nhập`);
      return out;
    };
    switch (y.loai) {
      case 'HopDongBan':
        return hoSo('HDB');
      case 'HopDongMua':
        return hoSo('HDM');
      case 'HopDongPhuTai': {
        const rows = d.dongTienPT.filter((x) => x.hdptId === id);
        const tay = rows.filter((x) => x.nguon === 'Nhập tay').length;
        return rows.length ? [`Xoá ${rows.length} dòng sổ quỹ ảo Phú Tài của HĐ (${tay} dòng nhập tay)`] : [];
      }
      case 'PhieuThuChi': {
        const p = this.phieuById(id);
        if (!p?.phatSinh) return p?.trangThai === 'Đã duyệt' ? ['Số dư nguồn tiền tính lại (phiếu đã duyệt)'] : [];
        const so = p.phatSinh.loai === 'HDB-DotTT' ? this.hdbById(p.phatSinh.hdId)?.soHD : this.hdmById(p.phatSinh.hdId)?.soHD;
        return [
          `Bỏ ghi nhận ${p.phatSinh.loai === 'HDB-DotTT' ? 'thực thu' : 'trả NCC'} đợt ${p.phatSinh.dot} của ${p.phatSinh.loai === 'HDB-DotTT' ? 'HĐ bán' : 'HĐ mua'} ${so ?? ''} — ghi lại ở hợp đồng`,
          ...(p.trangThai === 'Đã duyệt' ? ['Số dư nguồn tiền tính lại (phiếu đã duyệt)'] : []),
        ];
      }
      case 'PhieuKho': {
        const p = d.phieuKho.find((x) => x.id === id);
        if (!p) return [];
        const out = ['Phiếu chuyển "Đã huỷ", tồn kho tính lại'];
        if (p.nguonGoc === 'Tự động HĐ Mua') out.push('Trạng thái nhận hàng của HĐ mua tính lại');
        if (p.nguonGoc === 'Tự động HĐ Bán') out.push('HĐ bán không còn lần giao nào thì về lại "Hiệu lực"');
        return out;
      }
      default:
        return [];
    }
  }

  /** Tóm tắt bản ghi cần xoá (nhãn, giá trị) để người duyệt xem mà không phải rời màn. */
  tomTatDoiTuong(loai: DoiTuong, id: string): [string, string][] {
    const d = this.db();
    switch (loai) {
      case 'HopDongBan': {
        const h = this.hdbById(id);
        return h ? [['Số HĐ', h.soHD], ['Khách hàng', h.tenKH], ['Trạng thái', h.trangThai], ['Giá trị sau VAT', vnd(hdbCalc(h, d).sauVAT)], ['Sale', this.userName(h.sale)]] : [];
      }
      case 'HopDongMua': {
        const m = this.hdmById(id);
        return m ? [['Số HĐ', m.soHD], ['NCC', m.tenNCC], ['Trạng thái', m.trangThai], ['Tổng VNĐ', vnd(hdmCalc(m, d).tong)]] : [];
      }
      case 'HopDongPhuTai': {
        const p = this.ptById(id);
        return p ? [['Số HĐ', p.soHD], ['Khách hàng cuối', p.tenKH], ['Trạng thái', p.trangThai], ['Giá bán trước VAT', vnd(p.truocVAT)]] : [];
      }
      case 'PhieuThuChi': {
        const p = this.phieuById(id);
        return p
          ? [['Số phiếu', p.soPhieu], ['Loại', p.loai], ['Ngày lập', p.ngayLap.split('-').reverse().join('/')], ['Nội dung', p.noiDung], ['Số tiền', vnd(p.soTienThu || p.soTienChi)], ['Nguồn tiền', this.nguonTen(p.nguonTien)], ['Trạng thái', p.trangThai]]
          : [];
      }
      case 'ChiPhiThucHienHD': {
        const c = d.chiPhiHD.find((x) => x.id === id);
        return c ? [['Mã CP', c.maCP], ['HĐ bán', this.hdbById(c.hdbId)?.soHD ?? '—'], ['Loại', this.lcpTen(c.loaiChiPhi)], ['Nội dung', c.noiDung], ['Số tiền', vnd(c.soTien)], ['Trạng thái', c.trangThai]] : [];
      }
      case 'PhieuKho': {
        const p = d.phieuKho.find((x) => x.id === id);
        return p ? [['Số phiếu', p.soPhieu], ['Loại', p.loai], ['Nguồn gốc', p.nguonGoc], ['Kho', this.khoTen(p.kho)], ['Số dòng hàng', String(p.dong.length)]] : [];
      }
      case 'DongTienPhuTai': {
        const x = d.dongTienPT.find((r) => r.id === id);
        return x ? [['Ngày', x.ngay.split('-').reverse().join('/')], ['Chiều', x.chieu], ['Số tiền', vnd(x.soTien)], ['HĐ PT', this.ptById(x.hdptId)?.soHD ?? '—'], ['Ghi chú', x.ghiChu ?? '']] : [];
      }
      case 'DM_KhachHang': {
        const k = this.khById(id);
        return k ? [['Tên', k.ten], ['MST', k.mst], ['Địa chỉ', k.diaChi]] : [];
      }
      case 'DM_NCC': {
        const n = this.nccById(id);
        return n ? [['Tên', n.ten], ['MST', n.mst], ['Quốc gia', n.quocGia]] : [];
      }
      default:
        return [];
    }
  }

  rutYeuCau(id: string): Result {
    const y = this.db().yeuCauXoa.find((x) => x.id === id);
    if (!y || y.trangThai !== 'Chờ duyệt') return 'Yêu cầu không còn chờ duyệt';
    if (y.nguoiGui !== this.meId()) return 'Chỉ người gửi được rút yêu cầu';
    this.upsert('yeuCauXoa', { ...y, trangThai: 'Đã rút', ngayDuyet: nowIso() });
    return null;
  }

  tuChoiXoa(id: string, lyDo: string): Result {
    const y = this.db().yeuCauXoa.find((x) => x.id === id);
    if (!y || y.trangThai !== 'Chờ duyệt') return 'Yêu cầu không còn chờ duyệt';
    if (!this.canDuyetXoa(y)) return 'Bạn không có quyền duyệt yêu cầu này';
    if (!this.duyetXoaDuoc(y)) return 'Không tự duyệt yêu cầu xoá do chính mình gửi — người khác duyệt, hoặc bấm "Rút yêu cầu"';
    if (!lyDo.trim()) return 'Cần nhập lý do từ chối';
    this.upsert('yeuCauXoa', { ...y, trangThai: 'Từ chối', lyDoTuChoi: lyDo, nguoiDuyet: this.meId()!, ngayDuyet: nowIso() });
    return null;
  }

  duyetXoa(id: string): Result {
    const y = this.db().yeuCauXoa.find((x) => x.id === id);
    if (!y || y.trangThai !== 'Chờ duyệt') return 'Yêu cầu không còn chờ duyệt';
    if (!this.canDuyetXoa(y)) return 'Bạn không có quyền duyệt yêu cầu này';
    if (!this.duyetXoaDuoc(y)) return 'Không tự duyệt yêu cầu xoá do chính mình gửi — người khác duyệt, hoặc bấm "Rút yêu cầu"';
    const vuong = this.thamChieu(y.loai, y.maDoiTuong);
    if (vuong) return vuong;
    this.thucHienXoa(y.loai, y.maDoiTuong);
    this.upsert('yeuCauXoa', { ...y, trangThai: 'Đã duyệt', nguoiDuyet: this.meId()!, ngayDuyet: nowIso() });
    return null;
  }

  /** Lý do không gửi được yêu cầu xoá (đang khoá / được tham chiếu) — để màn hình disable nút Xoá kèm giải thích. */
  lyDoKhongXoa(loai: DoiTuong, id: string): string | null {
    return this.khoaXoa(loai, id) ?? this.thamChieu(loai, id);
  }

  /**
   * P1-04: HĐ đã tất toán không xoá được — phải mở lại trước (HĐ Huỷ vẫn xoá được để dọn dữ liệu).
   * F-03: phiếu sinh từ đợt TT của HĐ đã tất toán cũng phải mở lại HĐ trước.
   */
  private khoaXoa(loai: DoiTuong, id: string): string | null {
    const tt = (s?: string) => s === 'Đã tất toán';
    if (loai === 'HopDongBan' && tt(this.hdbById(id)?.trangThai)) return 'HĐ đã tất toán — mở lại HĐ trước khi xoá';
    if (loai === 'HopDongMua' && tt(this.hdmById(id)?.trangThai)) return 'HĐ đã tất toán — mở lại HĐ trước khi xoá';
    if (loai === 'HopDongPhuTai' && tt(this.ptById(id)?.trangThai)) return 'HĐ đã tất toán — không xoá được';
    if (loai === 'PhieuThuChi') {
      const ps = this.phieuById(id)?.phatSinh;
      const hd = ps ? (ps.loai === 'HDB-DotTT' ? this.hdbById(ps.hdId) : this.hdmById(ps.hdId)) : undefined;
      if (hd && tt(hd.trangThai)) return `${ps!.loai === 'HDB-DotTT' ? 'HĐ bán' : 'HĐ mua'} ${hd.soHD} đã tất toán — mở lại HĐ trước khi xoá phiếu`;
    }
    return null;
  }

  /** Không xoá bản ghi đang được tham chiếu — phải xoá bản ghi con trước (NT-11). */
  private thamChieu(loai: DoiTuong, id: string): string | null {
    const d = this.db();
    const coKho = (hdId: string) => d.phieuKho.some((p) => p.hdId === hdId && p.trangThai === 'Hiệu lực');
    switch (loai) {
      case 'HopDongBan':
        if (coKho(id)) return 'HĐ đã có phiếu kho — huỷ phiếu kho trước';
        // Phiếu Thu sinh từ đợt TT (kể cả Chờ duyệt) — xoá HĐ sẽ làm phiếu mồ côi mà vẫn cộng vào quỹ.
        if (d.phieuThuChi.some((p) => p.phatSinh?.loai === 'HDB-DotTT' && p.phatSinh.hdId === id && p.trangThai !== 'Từ chối'))
          return 'HĐ đã có phiếu thu từ đợt thanh toán — xoá phiếu thu trước';
        if (d.chiPhiHD.some((c) => c.hdbId === id)) return 'HĐ đã có chi phí thực hiện — xoá chi phí trước';
        if (d.hopDongMua.some((m) => hdmChoHdb(m, id))) return 'Có HĐ mua đang trỏ tới HĐ này — bỏ liên kết trước';
        if (d.deNghiVatTu.some((x) => x.hdbId === id && !x.lyDoHuy)) return 'HĐ có đề nghị cấp vật tư — huỷ đề nghị trước';
        return null;
      case 'HopDongMua':
        if (coKho(id)) return 'HĐ đã có phiếu nhập — huỷ phiếu nhập trước';
        if (d.hopDongPhuTai.some((p) => p.hdMua.includes(id))) return 'HĐ đang làm giá đầu vào của HĐ Phú Tài';
        if (this.hdmById(id)?.dotTT.some((x) => x.phieuChiId)) return 'HĐ đã có phiếu chi trả NCC — xoá phiếu chi trước';
        return null;
      case 'PhieuThuChi':
        if (d.phieuThuChi.some((p) => p.phieuTamUngGoc === id && p.trangThai !== 'Từ chối')) return 'Phiếu tạm ứng đã có quyết toán';
        return null;
      case 'PhieuKho': {
        const p = d.phieuKho.find((x) => x.id === id);
        if (!p || p.loai !== 'Nhập') return null;
        const los = new Set(p.dong.map((_, i) => maLo(p, i)));
        const x = d.phieuKho.find((q) => q.loai === 'Xuất' && q.trangThai === 'Hiệu lực' && q.dong.some((r) => r.lo && los.has(r.lo)));
        return x ? `Lô của phiếu này đã xuất ở phiếu ${x.soPhieu} — huỷ phiếu xuất trước` : null;
      }
      case 'DM_KhachHang':
        return d.hopDongBan.some((h) => h.maKH === id) || d.hopDongPhuTai.some((h) => h.maKH === id) ? 'Khách hàng đã có hợp đồng' : null;
      case 'DM_NCC':
        return d.hopDongMua.some((m) => m.maNCC === id) ? 'Nhà cung cấp đã có HĐ mua' : null;
      case 'DM_NguonTien':
        return d.phieuThuChi.some((p) => p.nguonTien === id || p.nguonTienDen === id) || d.chiPhiHD.some((c) => c.nguonTien === id)
          ? 'Nguồn đã có phiếu — chỉ chuyển Ngưng'
          : null;
      case 'DM_LoaiChiPhi':
        return d.phieuThuChi.some((p) => p.loaiChiPhi === id) || d.chiPhiHD.some((c) => c.loaiChiPhi === id) ? 'Loại đã dùng — chỉ ngưng' : null;
      case 'DM_Kho':
        if (id === KHO_CHUYEN_THANG) return '"Chuyển thẳng" là vị trí hệ thống';
        return d.phieuKho.some((p) => p.kho === id) ? 'Kho đã có phiếu — chỉ ngưng' : null;
      case 'DM_LoaiHang':
        return d.phieuKho.some((p) => p.dong.some((x) => x.loaiHang === id)) || d.hopDongMua.some((m) => m.chiTiet.some((x) => x.loaiHang === id))
          ? 'Loại hàng đã dùng — chỉ ngưng'
          : null;
      default:
        return null;
    }
  }

  private thucHienXoa(loai: DoiTuong, id: string): void {
    switch (loai) {
      case 'PhieuThuChi': {
        const p = this.phieuById(id);
        this.drop('phieuThuChi', id);
        // Bỏ liên kết ở đợt thanh toán đã sinh ra phiếu.
        if (p?.phatSinh?.loai === 'HDM-DotTT') {
          const m = this.hdmById(p.phatSinh.hdId);
          if (m) this.upsert('hopDongMua', { ...m, dotTT: m.dotTT.map((x) => (x.phieuChiId === id ? { ...x, phieuChiId: undefined, ngayTra: undefined, soTienTra: undefined } : x)) });
        }
        if (p?.phatSinh?.loai === 'HDB-DotTT') {
          const h = this.hdbById(p.phatSinh.hdId);
          if (h) this.upsert('hopDongBan', { ...h, dotTT: h.dotTT.map((x) => (x.phieuThuId === id ? { ...x, phieuThuId: undefined, ngayThu: undefined, soTienThu: undefined, nguonTienNhan: undefined } : x)) });
        }
        break;
      }
      case 'ChiPhiThucHienHD':
        return this.drop('chiPhiHD', id);
      case 'HopDongBan':
        this.patch('hoSo', (r) => r.filter((x) => !(x.chu === 'HDB' && x.chuId === id)));
        this.patch('hoaDon', (r) => r.filter((x) => !(x.chu === 'HDB' && x.chuId === id)));
        return this.drop('hopDongBan', id);
      case 'HopDongMua':
        this.patch('hoSo', (r) => r.filter((x) => !(x.chu === 'HDM' && x.chuId === id)));
        this.patch('hoaDon', (r) => r.filter((x) => !(x.chu === 'HDM' && x.chuId === id)));
        return this.drop('hopDongMua', id);
      case 'HopDongPhuTai':
        this.patch('dongTienPT', (r) => r.filter((x) => x.hdptId !== id));
        return this.drop('hopDongPhuTai', id);
      case 'PhieuKho': {
        // KHO-08: phiếu chuyển "Đã huỷ", tồn tính lại; cập nhật trạng thái nhận của HĐ Mua.
        const p = this.db().phieuKho.find((x) => x.id === id);
        this.patch('phieuKho', (r) => r.map((x) => (x.id === id ? { ...x, trangThai: 'Đã huỷ' } : x)));
        if (p?.nguonGoc === 'Tự động HĐ Mua' && p.hdId) this.capNhatTrangThaiNhan(p.hdId);
        // HĐ bán không còn lần giao nào → về lại "Hiệu lực".
        if (p?.nguonGoc === 'Tự động HĐ Bán' && p.hdId) {
          const h = this.hdbById(p.hdId);
          const conGiao = this.db().phieuKho.some((x) => x.hdId === p.hdId && x.nguonGoc === 'Tự động HĐ Bán' && x.trangThai === 'Hiệu lực');
          if (h && h.trangThai === 'Đang giao hàng' && !conGiao) this.upsert('hopDongBan', { ...h, trangThai: 'Hiệu lực' });
        }
        return;
      }
      case 'HoaDon':
        return this.drop('hoaDon', id);
      case 'HoSo': {
        const [hsId, fileId] = id.split(':');
        this.patch('hoSo', (r) =>
          r.map((h) => {
            if (h.id !== hsId) return h;
            const files = h.files.filter((f) => f.id !== fileId);
            return { ...h, files, daLuu: files.length > 0 ? h.daLuu : !!h.ghiChu?.trim() && h.daLuu };
          }),
        );
        void deleteBlob(fileId).catch(() => undefined);
        return;
      }
      case 'DongTienPhuTai':
        return this.drop('dongTienPT', id);
      case 'DM_KhachHang':
        return this.drop('khachHang', id);
      case 'DM_NCC':
        return this.drop('ncc', id);
      case 'DM_NguonTien':
        return this.drop('nguonTien', id);
      case 'DM_LoaiChiPhi':
        return this.drop('loaiChiPhi', id);
      case 'DM_Kho':
        return this.drop('kho', id);
      case 'DM_LoaiHang':
        return this.drop('loaiHang', id);
    }
  }

  nhanDoiTuong(loai: DoiTuong): string {
    return DOI_TUONG_LABEL[loai];
  }

  // ═════════════════════════════════════════════════════════════════════
  // CẤU HÌNH (NT-14) & TÀI KHOẢN (NT-03)
  // ═════════════════════════════════════════════════════════════════════

  setCauHinh<K extends CauHinhKey>(k: K, v: CauHinh[K]): Result {
    if (!this.canEdit('cauHinh')) return 'Cần quyền sửa Tham số cấu hình (NT-14)';
    const cu = this.cauHinh()[k];
    if (cu === v) return null;
    this.db.update((d) => ({
      ...d,
      cauHinh: { ...d.cauHinh, [k]: v },
      cauHinhLog: [{ khoa: k, giaTriCu: String(cu), giaTriMoi: String(v), nguoiSua: this.meId()!, ngaySua: nowIso() }, ...d.cauHinhLog],
    }));
    return null;
  }

  /** Ghi tài khoản (Auth gọi sau khi đã băm mật khẩu). */
  putTaiKhoan(t: TaiKhoan): void {
    this.upsert('taiKhoan', t);
  }
  setPhien(fn: (rows: Db['phien']) => Db['phien']): void {
    this.patch('phien', fn);
  }

  // ═════════════════════════════════════════════════════════════════════
  // NHÓM QUYỀN & PHÂN QUYỀN (NT-03, NT-04)
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Kiểm tra sau một thay đổi giả định: phải còn ít nhất 1 tài khoản Hoạt động có quyền sửa
   * "Tài khoản, nhóm quyền & phân quyền" — không cho ai tự khoá cả hệ thống ra ngoài.
   */
  conQuanTri(taiKhoan: TaiKhoan[], nhom: NhomQuyen[]): boolean {
    return taiKhoan.some((t) => {
      if (t.trangThai !== 'Hoạt động') return false;
      const gs = nhom.filter((g) => t.nhom.includes(g.id));
      return atLeast(levelOf(gs, 'taiKhoan'), 'edit');
    });
  }

  newNhom(): NhomQuyen {
    return { id: '', ma: '', ten: '', moTa: '', toanQuyen: false, trangThai: 'Hoạt động', quyen: {}, taoLuc: nowIso() };
  }

  /**
   * Lưu nhóm và (tuỳ chọn) danh sách thành viên trong MỘT lần ghi: kiểm tra hết rồi mới ghi,
   * không để lưu dở nửa chừng khi bước gán thành viên bị từ chối.
   */
  saveNhom(n: NhomQuyen, tkIds?: string[]): Result {
    const e = this.require('taiKhoan');
    if (e) return e;
    const ma = n.ma.trim().toUpperCase();
    if (!/^[A-Z0-9_]{2,30}$/.test(ma)) return 'Mã nhóm 2–30 ký tự: chữ in hoa không dấu, số, gạch dưới (VD KE_TOAN)';
    if (!n.ten.trim()) return 'Chưa nhập tên nhóm';
    if (this.db().nhomQuyen.some((g) => g.id !== n.id && g.ma === ma)) return `Mã nhóm ${ma} đã có`;
    // Chỉ giữ mức hợp lệ của từng chức năng; bỏ mức "—" cho gọn dữ liệu.
    const quyen: Record<string, Level> = {};
    for (const c of CHUC_NANG) {
      const l = n.quyen[c.ma];
      if (l && l !== 'none' && c.mucDo.includes(l)) quyen[c.ma] = l;
    }
    const out: NhomQuyen = {
      ...n,
      id: n.id || this.nextMa('NQ-', this.db().nhomQuyen.map((g) => g.id)),
      ma,
      ten: n.ten.trim(),
      moTa: n.moTa.trim(),
      quyen,
      capNhat: nowIso(),
      nguoiCapNhat: this.meId() ?? undefined,
    };
    const nhom = [...this.db().nhomQuyen.filter((g) => g.id !== out.id), out];
    const tk = tkIds ? this.ganNhom(this.db().taiKhoan, out.id, tkIds) : this.db().taiKhoan;
    if (typeof tk === 'string') return tk;
    if (!this.conQuanTri(tk, nhom)) return 'Thay đổi này làm hệ thống không còn ai quản trị tài khoản — giữ quyền NT-03 "Sửa" cho ít nhất 1 nhóm có thành viên';
    this.db.update((d) => ({ ...d, nhomQuyen: d.nhomQuyen.some((g) => g.id === out.id) ? d.nhomQuyen.map((g) => (g.id === out.id ? out : g)) : [...d.nhomQuyen, out], taiKhoan: tk }));
    if (!n.id) n.id = out.id;
    return null;
  }

  /** Danh sách tài khoản sau khi đặt lại thành viên nhóm; chuỗi = lỗi (tài khoản bị bỏ hết nhóm). */
  private ganNhom(taiKhoan: TaiKhoan[], nhomId: string, tkIds: string[]): TaiKhoan[] | string {
    const out = taiKhoan.map((t) => {
      const co = t.nhom.includes(nhomId);
      const can = tkIds.includes(t.id);
      if (co === can) return t;
      return { ...t, nhom: can ? [...t.nhom, nhomId] : t.nhom.filter((x) => x !== nhomId) };
    });
    const rong = out.filter((t, i) => t !== taiKhoan[i] && t.nhom.length === 0);
    if (rong.length) return `Tài khoản phải thuộc ít nhất 1 nhóm: ${rong.map((t) => t.hoTen).join(', ')} sẽ không còn nhóm nào`;
    return out;
  }

  /** Xoá nhóm: chỉ nhóm tự tạo và không còn thành viên (cấu hình hệ thống, không qua duyệt xoá). */
  xoaNhom(id: string): Result {
    const e = this.require('taiKhoan');
    if (e) return e;
    const g = this.db().nhomQuyen.find((x) => x.id === id);
    if (!g) return 'Không tìm thấy nhóm';
    if (g.heThong) return 'Nhóm khởi tạo sẵn không xoá được — có thể chuyển "Ngưng"';
    const n = this.db().taiKhoan.filter((t) => t.nhom.includes(id)).length;
    if (n) return `Nhóm còn ${n} tài khoản — bỏ các tài khoản ra khỏi nhóm trước`;
    this.drop('nhomQuyen', id);
    return null;
  }

  /** Đặt lại danh sách thành viên của một nhóm (gán / bỏ tài khoản). */
  ganThanhVien(nhomId: string, tkIds: string[]): Result {
    const e = this.require('taiKhoan');
    if (e) return e;
    const taiKhoan = this.ganNhom(this.db().taiKhoan, nhomId, tkIds);
    if (typeof taiKhoan === 'string') return taiKhoan;
    if (!this.conQuanTri(taiKhoan, this.db().nhomQuyen)) return 'Thay đổi này làm hệ thống không còn ai quản trị tài khoản';
    this.db.update((d) => ({ ...d, taiKhoan }));
    return null;
  }
}


/** 0.07 → "7%" (làm tròn 0,1% để tránh số lẻ dấu phẩy động như 7.000000000000001%). */
function phanTram(x: number): string {
  return `${Math.round(x * 1000) / 10}%`;
}
