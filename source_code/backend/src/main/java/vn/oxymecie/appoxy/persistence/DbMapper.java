package vn.oxymecie.appoxy.persistence;

import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import vn.oxymecie.appoxy.common.Dates;
import vn.oxymecie.appoxy.common.Texts;
import vn.oxymecie.appoxy.domain.logic.HeThongService;
import vn.oxymecie.appoxy.domain.model.*;
import vn.oxymecie.appoxy.persistence.entity.*;
import vn.oxymecie.appoxy.persistence.repo.*;

/**
 * Chuyển đổi giữa mô hình nghiệp vụ (domain, cùng hình dạng JSON với frontend) và entity JPA (bảng chuẩn hoá).
 * - toDomain: dựng Db từ toàn bộ bảng.
 * - apply*: chép một bản ghi domain vào entity đang được quản lý (đồng bộ bảng con theo id / thứ tự).
 */
@Component
public class DbMapper {
  private final EntityManager em;
  private final Repos r;

  public DbMapper(EntityManager em, Repos r) {
    this.em = em;
    this.r = r;
  }

  // ── Kiểu dữ liệu ─────────────────────────────────────────────────────

  static String d(LocalDate x) {
    return Dates.date(x);
  }

  static LocalDate ld(String s) {
    return Dates.parseDate(s);
  }

  static String t(Instant x) {
    return Dates.iso(x);
  }

  static Instant in(String s) {
    return Dates.parseInstant(s);
  }

  static <T> List<T> orNull(List<T> l) {
    return l == null || l.isEmpty() ? null : l;
  }

  static Boolean trueOrNull(boolean b) {
    return b ? Boolean.TRUE : null;
  }

  public FileRef file(TepTinEntity e) {
    return new FileRef(e.getId(), e.getTen(), e.getMime(), e.getKichThuoc(), e.getThumb(), t(e.getNgayUpload()), e.getNguoiUpload());
  }

  private List<TepTinEntity> tepRefs(List<FileRef> files) {
    List<TepTinEntity> out = new ArrayList<>();
    if (files != null) for (FileRef f : files) out.add(em.getReference(TepTinEntity.class, f.getId()));
    return out;
  }

  private static void audit(Audited e, String me, Instant now) {
    if (e.getCreatedAt() == null) {
      e.setCreatedAt(now);
      e.setCreatedBy(me);
    }
    e.setUpdatedAt(now);
    e.setUpdatedBy(me);
  }

  // ═════════════════════════════ ĐỌC ═════════════════════════════════

  /** Nạp toàn bộ dữ liệu nghiệp vụ thành Db (không gồm phiên đăng nhập / mật khẩu). */
  public Db loadAll() {
    Db db = new Db();
    db.setNhomQuyen(new ArrayList<>(r.nhomQuyen().findAll(Sort.by("id")).stream().map(this::nhomQuyen).toList()));
    db.setTaiKhoan(new ArrayList<>(r.taiKhoan().findAll(Sort.by("createdAt", "id")).stream().map(this::taiKhoan).toList()));
    CauHinh ch = new CauHinh();
    for (CauHinhEntity e : r.cauHinh().findAll()) HeThongService.dat(ch, e.getKhoa(), e.getGiaTri());
    db.setCauHinh(ch);
    db.setCauHinhLog(new ArrayList<>(r.cauHinhLog().findAll(Sort.by(Sort.Direction.DESC, "ngaySua", "id")).stream()
        .map(e -> new CauHinhLog(e.getKhoa(), e.getGiaTriCu(), e.getGiaTriMoi(), e.getNguoiSua(), t(e.getNgaySua()))).toList()));
    Map<String, Integer> boDem = new LinkedHashMap<>();
    for (BoDemEntity e : r.boDem().findAll(Sort.by("khoa"))) boDem.put(e.getKhoa(), e.getGiaTri());
    db.setBoDem(boDem);
    db.setYeuCauXoa(list(r.yeuCauXoa().findAll(Sort.by(Sort.Direction.DESC, "ngayGui")), this::yeuCauXoa));
    db.setHoSo(list(r.hoSo().findAll(Sort.by("id")), this::hoSo));
    db.setHoaDon(list(r.hoaDon().findAll(Sort.by("ngayHoaDon", "id")), this::hoaDon));
    db.setNguonTien(list(r.nguonTien().findAll(Sort.by("id")), this::nguonTien));
    db.setLoaiChiPhi(list(r.loaiChiPhi().findAll(Sort.by("id")), this::loaiChiPhi));
    db.setKhachHang(list(r.khachHang().findAll(Sort.by("id")), this::khachHang));
    db.setNcc(list(r.nhaCungCap().findAll(Sort.by("id")), this::ncc));
    db.setKho(list(r.kho().findAll(Sort.by("id")), this::kho));
    db.setLoaiHang(list(r.loaiHang().findAll(Sort.by("id")), this::loaiHang));
    db.setPhieuThuChi(list(r.phieuThuChi().findAll(Sort.by(Sort.Direction.DESC, "ngayLap", "soPhieu")), this::phieuThuChi));
    db.setChiPhiHD(list(r.chiPhiHD().findAll(Sort.by(Sort.Direction.DESC, "ngay", "maCP")), this::chiPhiHD));
    db.setHopDongBan(list(r.hopDongBan().findAll(Sort.by(Sort.Direction.DESC, "createdAt")), this::hopDongBan));
    db.setHopDongMua(list(r.hopDongMua().findAll(Sort.by(Sort.Direction.DESC, "createdAt")), this::hopDongMua));
    db.setPhieuKho(list(r.phieuKho().findAll(Sort.by(Sort.Direction.DESC, "ngay", "soPhieu")), this::phieuKho));
    db.setKiemKe(list(r.kiemKe().findAll(Sort.by(Sort.Direction.DESC, "ngay", "soPhieu")), this::kiemKe));
    db.setAnhXaTen(list(r.anhXaTen().findAll(Sort.by("ten", "id")), this::anhXaTen));
    db.setBinhKhi(list(r.binhKhi().findAll(Sort.by("id")), this::binhKhi));
    db.setDeNghiVatTu(list(r.deNghiVatTu().findAll(Sort.by(Sort.Direction.DESC, "ngay", "soPhieu")), this::deNghiVatTu));
    db.setViecGiao(list(r.viecGiao().findAll(Sort.by(Sort.Direction.DESC, "taoLuc")), this::viecGiao));
    db.setCanhBao(list(r.canhBao().findAll(Sort.by(Sort.Direction.DESC, "taoLuc")), this::canhBao));
    db.setHopDongPhuTai(list(r.hopDongPhuTai().findAll(Sort.by(Sort.Direction.DESC, "createdAt")), this::hopDongPhuTai));
    db.setDongTienPT(list(r.dongTienPT().findAll(Sort.by(Sort.Direction.DESC, "ngay", "id")), this::dongTienPT));
    return db;
  }

  private static <E, D> List<D> list(List<E> rows, Function<E, D> f) {
    return new ArrayList<>(rows.stream().map(f).toList());
  }

  public NhomQuyen nhomQuyen(NhomQuyenEntity e) {
    Map<String, String> q = new LinkedHashMap<>();
    e.getQuyen().entrySet().stream().sorted(Map.Entry.comparingByKey()).forEach(x -> q.put(x.getKey(), x.getValue()));
    return new NhomQuyen(e.getId(), e.getMa(), e.getTen(), e.getMoTa(), e.isToanQuyen(), e.getTrangThai(), q, trueOrNull(e.isHeThong()),
        t(e.getTaoLuc()), t(e.getCapNhat()), e.getNguoiCapNhat());
  }

  public TaiKhoan taiKhoan(TaiKhoanEntity e) {
    return new TaiKhoan(e.getId(), e.getEmail(), e.getHoTen(), new ArrayList<>(e.getNhom()), e.getTrangThai(), e.isBatDoiMK(), e.getSoLanSai(),
        t(e.getKhoaDen()), t(e.getLanDangNhapCuoi()));
  }

  YeuCauXoa yeuCauXoa(YeuCauXoaEntity e) {
    return new YeuCauXoa(e.getId(), e.getLoai(), e.getMaDoiTuong(), e.getMoTa(), e.getLyDo(), e.getNguoiGui(), t(e.getNgayGui()),
        e.getTrangThai(), e.getNguoiDuyet(), t(e.getNgayDuyet()), e.getLyDoTuChoi());
  }

  HoSo hoSo(HoSoEntity e) {
    return new HoSo(e.getId(), e.getChu(), e.getChuId(), e.getLoai(), new ArrayList<>(e.getFiles().stream().map(this::file).toList()),
        e.isDaLuu(), e.isDaScan(), e.getGhiChu());
  }

  HoaDon hoaDon(HoaDonEntity e) {
    return new HoaDon(e.getId(), e.getChu(), e.getChuId(), e.getSoHoaDon(), d(e.getNgayHoaDon()), e.getGiaTri(), e.getTepId(), e.isThuocPhuTai());
  }

  NguonTien nguonTien(NguonTienEntity e) {
    return new NguonTien(e.getId(), e.getTen(), e.getLoai(), e.getSoTaiKhoan(), e.getNganHang(), e.getSoDuDauKy(), d(e.getNgayDauKy()),
        e.getTrangThai());
  }

  LoaiChiPhi loaiChiPhi(LoaiChiPhiEntity e) {
    return new LoaiChiPhi(e.getId(), e.getTen(), e.getNhom(), e.isDangDung());
  }

  KhachHang khachHang(KhachHangEntity e) {
    List<ChamSocKH> cs = e.getChamSoc().stream()
        .map(x -> new ChamSocKH(x.getId(), t(x.getLuc()), x.getNguoi(), x.getNoiDung(), x.getCoHoi(), x.getKenh(), x.getKetQua())).toList();
    List<CoHoiKH> ch = e.getDsCoHoi().stream().map(x -> new CoHoiKH(x.getId(), x.getHuongBan(), x.getNhomHang(), x.getGiaTri(), x.getGiaiDoan(),
        d(x.getNgayTao()), d(x.getNgayBaoGia()), d(x.getNgayChot()), x.getLyDoThua(), x.getTuongTacTiep(), d(x.getNgayTuongTac()),
        d(x.getNgayTaiTiepCan()))).toList();
    return new KhachHang(e.getId(), e.getTen(), e.getTenVietTat(), e.getMst(), e.getDiaChi(), e.getNguoiLienHe(), e.getDienThoai(), e.getEmail(), Texts.nz(e.getGhiChu()),
        e.getTrangThai(), e.getTinh(), e.getChucVu(), e.getPhanLoai(), e.getNguon(), e.getLoaiSP(), e.getHinhThucHD(), e.getTiepCan(),
        e.getCoHoi(), e.getPhuTrach(), e.getTrangThaiData(), d(e.getNgayTiepNhan()), d(e.getNgayPhanBo()), e.getGiaTriCoHoi(),
        orNull(new ArrayList<>(cs)), orNull(new ArrayList<>(ch)), trueOrNull(e.isLaImport()));
  }

  NhaCungCap ncc(NhaCungCapEntity e) {
    return new NhaCungCap(e.getId(), e.getTen(), e.getMst(), e.getDiaChi(), e.getQuocGia(), e.getNguoiLienHe(), e.getDienThoai(), e.getEmail(),
        Texts.nz(e.getGhiChu()), e.getTrangThai());
  }

  Kho kho(KhoEntity e) {
    return new Kho(e.getId(), e.getTen(), e.getLoai(), e.isDangDung());
  }

  LoaiHang loaiHang(LoaiHangEntity e) {
    return new LoaiHang(e.getId(), e.getTen(), e.getMoTa(), e.getNhom(), e.getDvt(), new ArrayList<>(e.getThuocTinh()), e.isDangDung(),
        e.getLoaiKhi(), e.getTheTich(), orNull(new ArrayList<>(e.getBietDanh())));
  }

  PhieuThuChi phieuThuChi(PhieuThuChiEntity e) {
    List<LichSuDuyet> ls = e.getLichSu().stream()
        .map(x -> new LichSuDuyet(t(x.getLuc()), x.getNguoi(), x.getHanhDong(), x.getGhiChu())).toList();
    NguonPhatSinh ps = e.getPsLoai() == null ? null : new NguonPhatSinh(e.getPsLoai(), e.getPsHdId(), e.getPsDot() == null ? 0 : e.getPsDot());
    return new PhieuThuChi(e.getId(), e.getSoPhieu(), d(e.getNgayLap()), e.getLoai(), Texts.nz(e.getNguonTien()), e.getNguonTienDen(),
        e.getLoaiChiPhi(), e.getNoiDung(), e.getSoTienThu(), e.getSoTienChi(), e.getPhieuTamUngGoc(), e.getSoTienThucChi(), e.getNguoiNhan(),
        e.getNguoiDeNghi(), e.getTrangThai(), e.getNguoiDuyet(), t(e.getNgayDuyet()), e.getLyDoTuChoi(),
        new ArrayList<>(e.getFiles().stream().map(this::file).toList()), e.getGhiChu(), ps, trueOrNull(e.isLaImport()),
        orNull(new ArrayList<>(ls)));
  }

  ChiPhiHD chiPhiHD(ChiPhiHDEntity e) {
    List<LichSuDuyet> ls = e.getLichSu().stream()
        .map(x -> new LichSuDuyet(t(x.getLuc()), x.getNguoi(), x.getHanhDong(), x.getGhiChu())).toList();
    return new ChiPhiHD(e.getId(), e.getMaCP(), Texts.nz(e.getHdbId()), d(e.getNgay()), Texts.nz(e.getLoaiChiPhi()), e.getNoiDung(),
        e.getSoTien(), Texts.nz(e.getNguonTien()), e.getNguoiThucHien(), e.getNguoiNhan(), e.getDonViVanChuyen(), e.getTrangThai(),
        e.getNguoiDuyet(), t(e.getNgayDuyet()), e.getLyDoTuChoi(), new ArrayList<>(e.getFiles().stream().map(this::file).toList()),
        e.getGhiChu(), orNull(new ArrayList<>(ls)));
  }

  HopDongBan hopDongBan(HopDongBanEntity e) {
    List<DotTTBan> dot = new ArrayList<>(e.getDotTT().stream().map(x -> new DotTTBan(x.getDot(), x.getTyLe(), x.getSoTien(), d(x.getHan()),
        x.getHanNgay(), d(x.getNgayThu()), x.getSoTienThu(), x.getNguonTienNhan(), x.getGhiChu(), x.getPhieuThuId())).toList());
    List<DongHangBan> dong = new ArrayList<>(e.getDongHang().stream().map(x -> new DongHangBan(x.getId(), x.getLoaiHang(), x.getTenHang(),
        x.getSoLuong(), x.getDonGia(), x.getDonGiaTH(), x.getGhiChu())).toList());
    return new HopDongBan(e.getId(), Texts.nz(e.getSoHD()), e.getMaKH(), e.getTenKH(), e.getMst(), e.getDiaChi(), d(e.getNgayKy()),
        d(e.getNgayHieuLuc()), e.getTrangThai(), Texts.nz(e.getSale()), Texts.nz(e.getGhiChu()), e.getTruocVAT(), e.getVat(),
        e.getThucTeTruocVAT(), new ThamSoThue(e.getTsNguong(), e.getTsMuc1(), e.getTsMuc2()), dot, orNull(dong), e.getCoTamUng(),
        e.getPhatHD(), e.getLyDoPhat(), e.getLyDoHuy(), e.getGhiChuHoSoThieu(), t(e.getTaoLuc()), trueOrNull(e.isLaImport()), trueOrNull(e.isThuocPhuTai()));
  }

  ViecGiao viecGiao(ViecGiaoEntity e) {
    List<PhanHoiViec> ph = new ArrayList<>(e.getPhanHoi().stream()
        .map(x -> new PhanHoiViec(x.getNguoi(), t(x.getLuc()), x.getNoiDung(), x.getHeThong())).toList());
    return new ViecGiao(e.getId(), e.getNoiDung(), e.getNguoiTao(), t(e.getTaoLuc()), new ArrayList<>(e.getNguoiNhan()), e.getHdbId(),
        d(e.getHan()), e.getGio(), e.isUuTien(), t(e.getXongLuc()), e.getNguoiXong(), ph, e.getMa(), e.getNhom(), d(e.getBatDau()),
        e.getMucUuTien(), e.getNguonLoai(), e.getHdmId(), yeuCauHan(e), new ArrayList<>(e.getFiles().stream().map(this::file).toList()),
        e.getKhId(), e.getKenh(), e.getNhacTruoc(), trueOrNull(e.isSuCo()));
  }

  CanhBao canhBao(CanhBaoEntity e) {
    return new CanhBao(e.getId(), e.getMa(), e.getMuc(), e.getNoiDung(), e.getAnhHuong(), e.getTheoDoi(), e.getHdbId(), e.getHdmId(),
        e.getNguoiTao(), t(e.getTaoLuc()), t(e.getXuLyLuc()), e.getNguoiXuLy(), e.getGhiChuXuLy(), e.getNguon(), e.getKhoaHeThong(),
        e.getNguoiPhuTrach(), new ArrayList<>(e.getLichSu().stream().map(x -> new LichSuDuyet(t(x.getLuc()), x.getNguoi(), x.getHanhDong(), x.getGhiChu())).toList()));
  }

  public void applyCanhBao(CanhBao x, CanhBaoEntity e) {
    e.setId(x.getId());
    e.setMa(x.getMa());
    e.setMuc(x.getMuc());
    e.setNoiDung(x.getNoiDung());
    e.setAnhHuong(x.getAnhHuong());
    e.setTheoDoi(Texts.emptyToNull(x.getTheoDoi()));
    e.setHdbId(Texts.emptyToNull(x.getHdbId()));
    e.setHdmId(Texts.emptyToNull(x.getHdmId()));
    e.setNguoiTao(x.getNguoiTao());
    e.setTaoLuc(in(x.getTaoLuc()));
    e.setXuLyLuc(in(x.getXuLyLuc()));
    e.setNguoiXuLy(x.getNguoiXuLy());
    e.setGhiChuXuLy(Texts.emptyToNull(x.getGhiChuXuLy()));
    e.setNguon(x.getNguon() == null ? CanhBao.TAY : x.getNguon());
    e.setKhoaHeThong(Texts.emptyToNull(x.getKhoaHeThong()));
    e.setNguoiPhuTrach(Texts.emptyToNull(x.getNguoiPhuTrach()));
    e.getLichSu().clear();
    if (x.getLichSu() != null) for (LichSuDuyet l : x.getLichSu()) {
      CanhBaoEntity.LichSu o = new CanhBaoEntity.LichSu();
      o.setLuc(in(l.getLuc()));
      o.setNguoi(Texts.nz(l.getNguoi()));
      o.setHanhDong(l.getHanhDong());
      o.setGhiChu(l.getGhiChu());
      e.getLichSu().add(o);
    }
  }

  private YeuCauHan yeuCauHan(ViecGiaoEntity e) {
    if (e.getYcTrangThai() == null) return null;
    return new YeuCauHan(e.getYcNguoi(), t(e.getYcLuc()), d(e.getYcHanMoi()), e.getYcGioMoi(), e.getYcLyDo(),
        new ArrayList<>(e.getYcFiles().stream().map(this::file).toList()), e.getYcTrangThai());
  }

  DeNghiVatTu deNghiVatTu(DeNghiVatTuEntity e) {
    List<DongDeNghi> dong = new ArrayList<>(e.getDong().stream().map(x -> new DongDeNghi(x.getId(), x.getLoaiHang(), x.getTenHang(),
        x.getSoLuong(), x.getGhiChu(), x.getDongBanId())).toList());
    return new DeNghiVatTu(e.getId(), e.getSoPhieu(), d(e.getNgay()), e.getHdbId(), e.getNguoiDeNghi(), dong, e.getGhiChu(), e.getLyDoHuy());
  }

  HopDongMua hopDongMua(HopDongMuaEntity e) {
    List<DongHangMua> ct = new ArrayList<>(e.getChiTiet().stream().map(x -> new DongHangMua(x.getId(), x.getLoaiHang(), x.getTenHang(),
        x.getThongSo(), x.getSoLuong(), x.getDvt(), x.getDonGia(), x.getLoaiTien(), x.getTyGia(), x.getGhiChu(), x.getDnvtId(),
        x.getDnvtDong(), x.getHdbId())).toList());
    List<DotTTMua> dot = new ArrayList<>(e.getDotTT().stream().map(x -> new DotTTMua(x.getDot(), x.getTyLe(), x.getSoTien(), x.getHanMoc(),
        x.getHanNgay(), d(x.getHan()), d(x.getNgayTra()), x.getSoTienTra(), x.getNguonTien(), x.getPhieuChiId(), x.getGhiChu())).toList());
    List<ChecklistItem> cl = new ArrayList<>(e.getChecklist().stream().map(x -> new ChecklistItem(x.getTen(), x.isXong(), d(x.getNgay()))).toList());
    return new HopDongMua(e.getId(), e.getSoHD(), e.getMaNCC(), e.getTenNCC(), e.getDiaChi(), e.getMst(), d(e.getNgayKy()), e.getHdbId(),
        e.isThuocPhuTai(), e.getTrangThai(), Texts.nz(e.getGhiChu()), ct, e.isNhapTay(), e.getTongNhapTay(), e.getLyDoNhapTay(), dot,
        e.getXuatHoaDon(), cl, e.getGhiChuHoSoThieu(), t(e.getTaoLuc()), trueOrNull(e.isLaImport()));
  }

  PhieuKho phieuKho(PhieuKhoEntity e) {
    List<DongPhieuKho> dong = new ArrayList<>(e.getDong().stream().map(x -> new DongPhieuKho(x.getLoaiHang(), x.getThuocTinh(), x.getSoLuong(),
        x.getLo(), x.getDonGia(), x.getVat(), x.getDongHDMua(), x.getDonGiaGoc(), x.getTenTrenHD(), x.getGhiChu())).toList());
    return new PhieuKho(e.getId(), e.getSoPhieu(), d(e.getNgay()), e.getLoai(), e.getNguonGoc(), e.getHdId(), e.getKho(), e.getLyDo(),
        e.getNguoiThucHien(), e.getTrangThai(), e.getGhiChu(), dong, e.getSoHoaDon(), e.getNcc(), e.getKiemKeId());
  }

  KiemKe kiemKe(KiemKeEntity e) {
    List<DongKiemKe> dong = new ArrayList<>(e.getDong().stream().map(x -> new DongKiemKe(x.getLoaiHang(), x.getSoLuong(), x.getTenHang(),
        x.getXuatXu(), x.getNongDo(), x.getGhiChu())).toList());
    return new KiemKe(e.getId(), e.getSoPhieu(), d(e.getNgay()), e.getKho(), e.getNguoiThucHien(), e.getGhiChu(), dong,
        orNull(new ArrayList<>(e.getPhieuDieuChinh())));
  }

  BinhKhi binhKhi(BinhKhiEntity e) {
    return new BinhKhi(e.getId(), e.getLoaiHang(), e.getXuatXu(), d(e.getNgaySX()), d(e.getHanSD()), e.getKho(), e.getSoLanIn(), d(e.getLanInCuoi()),
        e.getNguoiIn(), e.getGhiChu());
  }

  AnhXaTen anhXaTen(AnhXaTenEntity e) {
    return new AnhXaTen(e.getId(), e.getTen(), e.getTheTich(), e.getNongDo(), e.getTongSL(), e.getSoLan(), e.getLoaiHang(), e.getLo(),
        e.getGhiChu());
  }

  HopDongPhuTai hopDongPhuTai(HopDongPhuTaiEntity e) {
    HopDongPhuTai p = new HopDongPhuTai();
    p.setId(e.getId());
    p.setSoHD(e.getSoHD());
    p.setMaKH(e.getMaKH());
    p.setTenKH(e.getTenKH());
    p.setMst(e.getMst());
    p.setNgayKy(d(e.getNgayKy()));
    p.setNgayHieuLuc(d(e.getNgayHieuLuc()));
    p.setTrangThai(e.getTrangThai());
    p.setGhiChu(Texts.nz(e.getGhiChu()));
    p.setTruocVAT(e.getTruocVAT());
    p.setVat(e.getVat());
    p.setHdMua(new ArrayList<>(e.getHdMua()));
    p.setChiPhi(new ArrayList<>(e.getChiPhi().stream().map(x -> new ChiPhiPT(x.getId(), x.getLoai(), x.getNoiDung(), d(x.getNgay()),
        x.getSoTien())).toList()));
    p.setDotKH(new ArrayList<>(e.getDotKH().stream().map(x -> new DotKHTraPT(x.getDot(), x.getSoTien(), d(x.getNgay()), x.getGhiChu())).toList()));
    p.setDotTraNCC(new ArrayList<>(e.getDotTraNCC().stream().map(x -> new DotPTTraNCC(x.getId(), x.getHdmId(), d(x.getNgay()), x.getSoTien(),
        x.getLoaiTien(), x.getTyGia())).toList()));
    p.setTyLeThue(e.getTyLeThue());
    p.setTyLeGiu(e.getTyLeGiu());
    p.setCachChia(e.getCachChia());
    p.setTyLeLog(new ArrayList<>(e.getTyLeLog().stream().map(x -> new TyLePTLog(x.getTruoc(), x.getSau(), x.getNguoi(), t(x.getLuc()),
        x.getLyDo())).toList()));
    p.setHoaHongKieu(e.getHoaHongKieu());
    p.setHoaHongGiaTri(e.getHoaHongGiaTri());
    p.setNguoiNhanHH(e.getNguoiNhanHH());
    p.setNgayChiHH(d(e.getNgayChiHH()));
    p.setDoiChieu(new ArrayList<>(e.getDoiChieu().stream().map(x -> new DoiChieuPT(x.getId(), d(x.getNgayOxyChuyen()), x.getSoTienVND(),
        d(x.getNgayPTChuyenNCC()), x.getSoTienNguyenTe(), x.getLoaiTien(), x.getTyGia(), x.getGhiChu())).toList()));
    p.setGhiChuHoSoThieu(e.getGhiChuHoSoThieu());
    p.setLyDoHuy(e.getLyDoHuy());
    p.setTaoLuc(t(e.getTaoLuc()));
    p.setLaImport(trueOrNull(e.isLaImport()));
    return p;
  }

  DongTienPT dongTienPT(DongTienPTEntity e) {
    return new DongTienPT(e.getId(), d(e.getNgay()), e.getChieu(), e.getHdptId(), e.getSoTien(), e.getNguon(), e.getRefId(), e.getGhiChu());
  }

  // ═════════════════════════════ GHI ═════════════════════════════════

  public void applyNhomQuyen(NhomQuyen x, NhomQuyenEntity e) {
    e.setId(x.getId());
    e.setMa(x.getMa());
    e.setTen(x.getTen());
    e.setMoTa(Texts.nz(x.getMoTa()));
    e.setToanQuyen(x.isToanQuyen());
    e.setTrangThai(x.getTrangThai());
    e.setHeThong(Boolean.TRUE.equals(x.getHeThong()));
    e.setTaoLuc(in(x.getTaoLuc()));
    e.setCapNhat(in(x.getCapNhat()));
    e.setNguoiCapNhat(x.getNguoiCapNhat());
    if (!e.getQuyen().equals(x.getQuyen())) {
      e.getQuyen().clear();
      e.getQuyen().putAll(x.getQuyen());
    }
  }

  /** Mật khẩu không nằm trong domain — matKhauBam null = giữ nguyên mật khẩu đang có. */
  public void applyTaiKhoan(TaiKhoan x, TaiKhoanEntity e, String matKhauBam, String me, Instant now) {
    e.setId(x.getId());
    e.setEmail(x.getEmail());
    e.setHoTen(x.getHoTen());
    if (matKhauBam != null) e.setMatKhauBam(matKhauBam);
    e.setTrangThai(x.getTrangThai());
    e.setBatDoiMK(x.isBatDoiMK());
    e.setSoLanSai(x.getSoLanSai());
    e.setKhoaDen(in(x.getKhoaDen()));
    e.setLanDangNhapCuoi(in(x.getLanDangNhapCuoi()));
    LinkedHashSet<String> nhom = new LinkedHashSet<>(x.getNhom());
    if (!e.getNhom().equals(nhom)) {
      e.getNhom().clear();
      e.getNhom().addAll(nhom);
    }
    audit(e, me, now);
  }

  public void applyYeuCauXoa(YeuCauXoa x, YeuCauXoaEntity e) {
    e.setId(x.getId());
    e.setLoai(x.getLoai());
    e.setMaDoiTuong(x.getMaDoiTuong());
    e.setMoTa(Texts.nz(x.getMoTa()));
    e.setLyDo(x.getLyDo());
    e.setNguoiGui(x.getNguoiGui());
    e.setNgayGui(in(x.getNgayGui()));
    e.setTrangThai(x.getTrangThai());
    e.setNguoiDuyet(x.getNguoiDuyet());
    e.setNgayDuyet(in(x.getNgayDuyet()));
    e.setLyDoTuChoi(x.getLyDoTuChoi());
  }

  public void applyHoSo(HoSo x, HoSoEntity e) {
    e.setId(x.getId());
    e.setChu(x.getChu());
    e.setChuId(x.getChuId());
    e.setLoai(x.getLoai());
    e.setDaLuu(x.isDaLuu());
    e.setDaScan(x.isDaScan());
    e.setGhiChu(x.getGhiChu());
    e.getFiles().clear();
    e.getFiles().addAll(tepRefs(x.getFiles()));
  }

  public void applyHoaDon(HoaDon x, HoaDonEntity e) {
    e.setId(x.getId());
    e.setChu(x.getChu());
    e.setChuId(x.getChuId());
    e.setSoHoaDon(x.getSoHoaDon());
    e.setNgayHoaDon(ld(x.getNgayHoaDon()));
    e.setGiaTri(x.getGiaTri());
    e.setTepId(Texts.emptyToNull(x.getFileId()));
    e.setThuocPhuTai(x.isThuocPhuTai());
  }

  public void applyNguonTien(NguonTien x, NguonTienEntity e) {
    e.setId(x.getId());
    e.setTen(x.getTen());
    e.setLoai(x.getLoai());
    e.setSoTaiKhoan(Texts.emptyToNull(x.getSoTaiKhoan()));
    e.setNganHang(Texts.emptyToNull(x.getNganHang()));
    e.setSoDuDauKy(x.getSoDuDauKy());
    e.setNgayDauKy(ld(x.getNgayDauKy()));
    e.setTrangThai(x.getTrangThai());
  }

  public void applyLoaiChiPhi(LoaiChiPhi x, LoaiChiPhiEntity e) {
    e.setId(x.getId());
    e.setTen(x.getTen());
    e.setNhom(x.getNhom());
    e.setDangDung(x.isDangDung());
  }

  public void applyKhachHang(KhachHang x, KhachHangEntity e, String me, Instant now) {
    e.setId(x.getId());
    e.setTen(x.getTen());
    e.setTenVietTat(Texts.emptyToNull(x.getTenVietTat()));
    e.setMst(Texts.nz(x.getMst()));
    e.setDiaChi(Texts.nz(x.getDiaChi()));
    e.setNguoiLienHe(Texts.nz(x.getNguoiLienHe()));
    e.setDienThoai(Texts.nz(x.getDienThoai()));
    e.setEmail(Texts.nz(x.getEmail()));
    e.setGhiChu(Texts.emptyToNull(x.getGhiChu()));
    e.setTrangThai(x.getTrangThai());
    e.setTinh(Texts.emptyToNull(x.getTinh()));
    e.setChucVu(Texts.emptyToNull(x.getChucVu()));
    e.setPhanLoai(Texts.emptyToNull(x.getPhanLoai()));
    e.setNguon(Texts.emptyToNull(x.getNguon()));
    e.setLoaiSP(Texts.emptyToNull(x.getLoaiSP()));
    e.setHinhThucHD(Texts.emptyToNull(x.getHinhThucHD()));
    e.setTiepCan(x.getTiepCan());
    e.setCoHoi(x.getCoHoi());
    e.setPhuTrach(Texts.emptyToNull(x.getPhuTrach()));
    e.setTrangThaiData(x.getTrangThaiData());
    e.setNgayTiepNhan(ld(x.getNgayTiepNhan()));
    e.setNgayPhanBo(ld(x.getNgayPhanBo()));
    e.setGiaTriCoHoi(x.getGiaTriCoHoi());
    e.setLaImport(Boolean.TRUE.equals(x.getLaImport()));
    Map<String, ChamSocKHEntity> cu = new HashMap<>();
    for (ChamSocKHEntity c : e.getChamSoc()) cu.put(c.getId(), c);
    List<ChamSocKHEntity> moi = new ArrayList<>();
    List<ChamSocKH> ds = x.getChamSoc() == null ? List.of() : x.getChamSoc();
    for (int i = 0; i < ds.size(); i++) {
      ChamSocKH c = ds.get(i);
      ChamSocKHEntity ce = cu.getOrDefault(c.getId(), new ChamSocKHEntity());
      ce.setId(c.getId());
      ce.setThuTu(i);
      ce.setLuc(in(c.getLuc()));
      ce.setNguoi(c.getNguoi());
      ce.setNoiDung(c.getNoiDung());
      ce.setCoHoi(c.getCoHoi());
      ce.setKenh(c.getKenh());
      ce.setKetQua(c.getKetQua());
      ce.setKhachHang(e);
      moi.add(ce);
    }
    e.getChamSoc().retainAll(moi);
    for (ChamSocKHEntity ce : moi) if (!e.getChamSoc().contains(ce)) e.getChamSoc().add(ce);
    Map<String, CoHoiKHEntity> chCu = new HashMap<>();
    for (CoHoiKHEntity c : e.getDsCoHoi()) chCu.put(c.getId(), c);
    List<CoHoiKHEntity> chMoi = new ArrayList<>();
    List<CoHoiKH> chDs = x.getDsCoHoi() == null ? List.of() : x.getDsCoHoi();
    for (int i = 0; i < chDs.size(); i++) {
      CoHoiKH c = chDs.get(i);
      CoHoiKHEntity ce = chCu.getOrDefault(c.getId(), new CoHoiKHEntity());
      ce.setId(c.getId());
      ce.setThuTu(i);
      ce.setHuongBan(Texts.nz(c.getHuongBan()));
      ce.setNhomHang(Texts.emptyToNull(c.getNhomHang()));
      ce.setGiaTri(c.getGiaTri() == null ? 0 : c.getGiaTri());
      ce.setGiaiDoan(c.getGiaiDoan());
      ce.setNgayTao(ld(c.getNgayTao()));
      ce.setNgayBaoGia(ld(c.getNgayBaoGia()));
      ce.setNgayChot(ld(c.getNgayChot()));
      ce.setLyDoThua(Texts.emptyToNull(c.getLyDoThua()));
      ce.setTuongTacTiep(Texts.emptyToNull(c.getTuongTacTiep()));
      ce.setNgayTuongTac(ld(c.getNgayTuongTac()));
      ce.setNgayTaiTiepCan(ld(c.getNgayTaiTiepCan()));
      ce.setKhachHang(e);
      chMoi.add(ce);
    }
    e.getDsCoHoi().retainAll(chMoi);
    for (CoHoiKHEntity ce : chMoi) if (!e.getDsCoHoi().contains(ce)) e.getDsCoHoi().add(ce);
    audit(e, me, now);
  }

  public void applyNcc(NhaCungCap x, NhaCungCapEntity e, String me, Instant now) {
    e.setId(x.getId());
    e.setTen(x.getTen());
    e.setMst(Texts.nz(x.getMst()));
    e.setDiaChi(Texts.nz(x.getDiaChi()));
    e.setQuocGia(Texts.nz(x.getQuocGia()));
    e.setNguoiLienHe(Texts.nz(x.getNguoiLienHe()));
    e.setDienThoai(Texts.nz(x.getDienThoai()));
    e.setEmail(Texts.nz(x.getEmail()));
    e.setGhiChu(Texts.emptyToNull(x.getGhiChu()));
    e.setTrangThai(x.getTrangThai());
    audit(e, me, now);
  }

  public void applyKho(Kho x, KhoEntity e) {
    e.setId(x.getId());
    e.setTen(x.getTen());
    e.setLoai(x.getLoai());
    e.setDangDung(x.isDangDung());
  }

  public void applyLoaiHang(LoaiHang x, LoaiHangEntity e) {
    e.setId(x.getId());
    e.setTen(x.getTen());
    e.setMoTa(Texts.emptyToNull(x.getMoTa()));
    e.setNhom(x.getNhom());
    e.setDvt(Texts.nz(x.getDvt()));
    e.setDangDung(x.isDangDung());
    e.setLoaiKhi(Texts.emptyToNull(x.getLoaiKhi()));
    e.setTheTich(Texts.emptyToNull(x.getTheTich()));
    List<String> tt = x.getThuocTinh() == null ? List.of() : x.getThuocTinh();
    if (!e.getThuocTinh().equals(tt)) {
      e.getThuocTinh().clear();
      e.getThuocTinh().addAll(tt);
    }
    List<String> bd = x.getBietDanh() == null ? List.of() : x.getBietDanh();
    if (!e.getBietDanh().equals(bd)) {
      e.getBietDanh().clear();
      e.getBietDanh().addAll(bd);
    }
  }

  private static List<PhieuThuChiEntity.LichSu> lichSuPtc(List<LichSuDuyet> ls) {
    List<PhieuThuChiEntity.LichSu> out = new ArrayList<>();
    if (ls != null) for (LichSuDuyet l : ls) {
      PhieuThuChiEntity.LichSu x = new PhieuThuChiEntity.LichSu();
      x.setLuc(in(l.getLuc()));
      x.setNguoi(Texts.nz(l.getNguoi()));
      x.setHanhDong(l.getHanhDong());
      x.setGhiChu(l.getGhiChu());
      out.add(x);
    }
    return out;
  }

  public void applyPhieuThuChi(PhieuThuChi x, PhieuThuChiEntity e, String me, Instant now) {
    e.setId(x.getId());
    e.setSoPhieu(x.getSoPhieu());
    e.setNgayLap(ld(x.getNgayLap()));
    e.setLoai(x.getLoai());
    e.setNguonTien(Texts.emptyToNull(x.getNguonTien()));
    e.setNguonTienDen(Texts.emptyToNull(x.getNguonTienDen()));
    e.setLoaiChiPhi(Texts.emptyToNull(x.getLoaiChiPhi()));
    e.setNoiDung(Texts.nz(x.getNoiDung()));
    e.setSoTienThu(x.getSoTienThu());
    e.setSoTienChi(x.getSoTienChi());
    e.setPhieuTamUngGoc(Texts.emptyToNull(x.getPhieuTamUngGoc()));
    e.setSoTienThucChi(x.getSoTienThucChi());
    e.setNguoiNhan(x.getNguoiNhan());
    e.setNguoiDeNghi(Texts.nz(x.getNguoiDeNghi()));
    e.setTrangThai(x.getTrangThai());
    e.setNguoiDuyet(x.getNguoiDuyet());
    e.setNgayDuyet(in(x.getNgayDuyet()));
    e.setLyDoTuChoi(x.getLyDoTuChoi());
    e.setGhiChu(x.getGhiChu());
    e.setPsLoai(x.getPhatSinh() == null ? null : x.getPhatSinh().getLoai());
    e.setPsHdId(x.getPhatSinh() == null ? null : x.getPhatSinh().getHdId());
    e.setPsDot(x.getPhatSinh() == null ? null : x.getPhatSinh().getDot());
    e.setLaImport(Boolean.TRUE.equals(x.getLaImport()));
    e.getLichSu().clear();
    e.getLichSu().addAll(lichSuPtc(x.getLichSu()));
    e.getFiles().clear();
    e.getFiles().addAll(tepRefs(x.getFiles()));
    audit(e, me, now);
  }

  public void applyChiPhiHD(ChiPhiHD x, ChiPhiHDEntity e, String me, Instant now) {
    e.setId(x.getId());
    e.setMaCP(x.getMaCP());
    e.setHdbId(Texts.emptyToNull(x.getHdbId()));
    e.setNgay(ld(x.getNgay()));
    e.setLoaiChiPhi(Texts.emptyToNull(x.getLoaiChiPhi()));
    e.setNoiDung(Texts.nz(x.getNoiDung()));
    e.setSoTien(x.getSoTien());
    e.setNguonTien(Texts.emptyToNull(x.getNguonTien()));
    e.setNguoiThucHien(Texts.nz(x.getNguoiThucHien()));
    e.setNguoiNhan(x.getNguoiNhan());
    e.setDonViVanChuyen(x.getDonViVanChuyen());
    e.setTrangThai(x.getTrangThai());
    e.setNguoiDuyet(x.getNguoiDuyet());
    e.setNgayDuyet(in(x.getNgayDuyet()));
    e.setLyDoTuChoi(x.getLyDoTuChoi());
    e.setGhiChu(x.getGhiChu());
    e.getLichSu().clear();
    if (x.getLichSu() != null) for (LichSuDuyet l : x.getLichSu()) {
      ChiPhiHDEntity.LichSu s = new ChiPhiHDEntity.LichSu();
      s.setLuc(in(l.getLuc()));
      s.setNguoi(Texts.nz(l.getNguoi()));
      s.setHanhDong(l.getHanhDong());
      s.setGhiChu(l.getGhiChu());
      e.getLichSu().add(s);
    }
    e.getFiles().clear();
    e.getFiles().addAll(tepRefs(x.getFiles()));
    audit(e, me, now);
  }

  public void applyHopDongBan(HopDongBan x, HopDongBanEntity e, String me, Instant now) {
    e.setId(x.getId());
    e.setSoHD(Texts.emptyToNull(Texts.trim(x.getSoHD())) == null ? null : x.getSoHD());
    e.setMaKH(x.getMaKH());
    e.setTenKH(Texts.nz(x.getTenKH()));
    e.setMst(Texts.nz(x.getMst()));
    e.setDiaChi(Texts.nz(x.getDiaChi()));
    e.setNgayKy(ld(x.getNgayKy()));
    e.setNgayHieuLuc(ld(x.getNgayHieuLuc()));
    e.setTrangThai(x.getTrangThai());
    e.setSale(Texts.emptyToNull(x.getSale()));
    e.setGhiChu(Texts.emptyToNull(x.getGhiChu()));
    e.setTruocVAT(x.getTruocVAT());
    e.setVat(x.getVat());
    e.setThucTeTruocVAT(x.getThucTeTruocVAT());
    e.setTsNguong(x.getThamSoThue().getNguong());
    e.setTsMuc1(x.getThamSoThue().getMuc1());
    e.setTsMuc2(x.getThamSoThue().getMuc2());
    e.setCoTamUng(x.getCoTamUng());
    e.setPhatHD(x.getPhatHD());
    e.setLyDoPhat(x.getLyDoPhat());
    e.setLyDoHuy(x.getLyDoHuy());
    e.setGhiChuHoSoThieu(x.getGhiChuHoSoThieu());
    e.setThuocPhuTai(Boolean.TRUE.equals(x.getThuocPhuTai()));
    e.setTaoLuc(in(x.getTaoLuc()));
    e.setLaImport(Boolean.TRUE.equals(x.getLaImport()));
    e.getDotTT().clear();
    for (DotTTBan d : x.getDotTT()) {
      HopDongBanEntity.DotTT o = new HopDongBanEntity.DotTT();
      o.setDot(d.getDot());
      o.setTyLe(d.getTyLe());
      o.setSoTien(d.getSoTien());
      o.setHan(ld(d.getHan()));
      o.setHanNgay(d.getHanNgay());
      o.setNgayThu(ld(d.getNgayThu()));
      o.setSoTienThu(d.getSoTienThu());
      o.setNguonTienNhan(Texts.emptyToNull(d.getNguonTienNhan()));
      o.setGhiChu(d.getGhiChu());
      o.setPhieuThuId(Texts.emptyToNull(d.getPhieuThuId()));
      e.getDotTT().add(o);
    }
    Map<String, HdbDongHangEntity> cu = new HashMap<>();
    for (HdbDongHangEntity c : e.getDongHang()) cu.put(c.getId(), c);
    List<HdbDongHangEntity> moi = new ArrayList<>();
    List<DongHangBan> ds = x.getDongHang() == null ? List.of() : x.getDongHang();
    for (int i = 0; i < ds.size(); i++) {
      DongHangBan d = ds.get(i);
      HdbDongHangEntity o = cu.getOrDefault(d.getId(), new HdbDongHangEntity());
      o.setId(d.getId());
      o.setThuTu(i);
      o.setLoaiHang(Texts.emptyToNull(d.getLoaiHang()));
      o.setTenHang(Texts.nz(d.getTenHang()));
      o.setSoLuong(d.getSoLuong());
      o.setDonGia(d.getDonGia());
      o.setDonGiaTH(d.getDonGiaTH());
      o.setGhiChu(d.getGhiChu());
      o.setHdb(e);
      moi.add(o);
    }
    e.getDongHang().retainAll(moi);
    for (HdbDongHangEntity o : moi) if (!e.getDongHang().contains(o)) e.getDongHang().add(o);
    audit(e, me, now);
  }

  public void applyViecGiao(ViecGiao x, ViecGiaoEntity e) {
    e.setId(x.getId());
    e.setNoiDung(x.getNoiDung());
    e.setNguoiTao(x.getNguoiTao());
    e.setTaoLuc(in(x.getTaoLuc()));
    e.setHdbId(Texts.emptyToNull(x.getHdbId()));
    e.setHan(ld(x.getHan()));
    e.setGio(Texts.emptyToNull(x.getGio()));
    e.setUuTien(Boolean.TRUE.equals(x.getUuTien()));
    e.setXongLuc(in(x.getXongLuc()));
    e.setNguoiXong(x.getNguoiXong());
    e.setMa(x.getMa());
    e.setNhom(Texts.emptyToNull(x.getNhom()));
    e.setBatDau(ld(x.getBatDau()));
    e.setMucUuTien(Texts.emptyToNull(x.getMucUuTien()));
    e.setNguonLoai(Texts.emptyToNull(x.getNguonLoai()));
    e.setHdmId(Texts.emptyToNull(x.getHdmId()));
    e.setKhId(Texts.emptyToNull(x.getKhId()));
    e.setKenh(Texts.emptyToNull(x.getKenh()));
    e.setNhacTruoc(x.getNhacTruoc());
    e.setSuCo(Boolean.TRUE.equals(x.getSuCo()));
    YeuCauHan y = x.getYeuCauHan();
    e.setYcNguoi(y == null ? null : y.getNguoi());
    e.setYcLuc(y == null ? null : in(y.getLuc()));
    e.setYcHanMoi(y == null ? null : ld(y.getHanMoi()));
    e.setYcGioMoi(y == null ? null : Texts.emptyToNull(y.getGioMoi()));
    e.setYcLyDo(y == null ? null : y.getLyDo());
    e.setYcTrangThai(y == null ? null : y.getTrangThai());
    e.getFiles().clear();
    e.getFiles().addAll(tepRefs(x.getFiles()));
    e.getYcFiles().clear();
    if (y != null) e.getYcFiles().addAll(tepRefs(y.getFiles()));
    if (!e.getNguoiNhan().equals(x.getNguoiNhan())) {
      e.getNguoiNhan().clear();
      e.getNguoiNhan().addAll(x.getNguoiNhan());
    }
    e.getPhanHoi().clear();
    for (PhanHoiViec p : x.getPhanHoi()) {
      ViecGiaoEntity.PhanHoi o = new ViecGiaoEntity.PhanHoi();
      o.setNguoi(p.getNguoi());
      o.setLuc(in(p.getLuc()));
      o.setNoiDung(p.getNoiDung());
      o.setHeThong(p.getHeThong());
      e.getPhanHoi().add(o);
    }
  }

  public void applyDeNghiVatTu(DeNghiVatTu x, DeNghiVatTuEntity e) {
    e.setId(x.getId());
    e.setSoPhieu(x.getSoPhieu());
    e.setNgay(ld(x.getNgay()));
    e.setHdbId(x.getHdbId());
    e.setNguoiDeNghi(x.getNguoiDeNghi());
    e.setGhiChu(x.getGhiChu());
    e.setLyDoHuy(x.getLyDoHuy());
    Map<String, DeNghiVatTuDongEntity> cu = new HashMap<>();
    for (DeNghiVatTuDongEntity c : e.getDong()) cu.put(c.getId(), c);
    List<DeNghiVatTuDongEntity> moi = new ArrayList<>();
    for (int i = 0; i < x.getDong().size(); i++) {
      DongDeNghi d = x.getDong().get(i);
      DeNghiVatTuDongEntity o = cu.getOrDefault(d.getId(), new DeNghiVatTuDongEntity());
      o.setId(d.getId());
      o.setThuTu(i);
      o.setLoaiHang(d.getLoaiHang());
      o.setTenHang(Texts.nz(d.getTenHang()));
      o.setSoLuong(d.getSoLuong());
      o.setGhiChu(d.getGhiChu());
      o.setDongBanId(Texts.emptyToNull(d.getDongBanId()));
      o.setDeNghi(e);
      moi.add(o);
    }
    e.getDong().retainAll(moi);
    for (DeNghiVatTuDongEntity o : moi) if (!e.getDong().contains(o)) e.getDong().add(o);
  }

  public void applyHopDongMua(HopDongMua x, HopDongMuaEntity e, String me, Instant now) {
    e.setId(x.getId());
    e.setSoHD(x.getSoHD());
    e.setMaNCC(x.getMaNCC());
    e.setTenNCC(Texts.nz(x.getTenNCC()));
    e.setDiaChi(Texts.nz(x.getDiaChi()));
    e.setMst(Texts.nz(x.getMst()));
    e.setNgayKy(ld(x.getNgayKy()));
    e.setHdbId(Texts.emptyToNull(x.getHdbId()));
    e.setThuocPhuTai(x.isThuocPhuTai());
    e.setTrangThai(x.getTrangThai());
    e.setGhiChu(Texts.emptyToNull(x.getGhiChu()));
    e.setNhapTay(x.isNhapTay());
    e.setTongNhapTay(x.getTongNhapTay());
    e.setLyDoNhapTay(x.getLyDoNhapTay());
    e.setXuatHoaDon(x.getXuatHoaDon());
    e.setGhiChuHoSoThieu(x.getGhiChuHoSoThieu());
    e.setTaoLuc(in(x.getTaoLuc()));
    e.setLaImport(Boolean.TRUE.equals(x.getLaImport()));
    Map<String, HdmDongHangEntity> cu = new HashMap<>();
    for (HdmDongHangEntity c : e.getChiTiet()) cu.put(c.getId(), c);
    List<HdmDongHangEntity> moi = new ArrayList<>();
    for (int i = 0; i < x.getChiTiet().size(); i++) {
      DongHangMua d = x.getChiTiet().get(i);
      HdmDongHangEntity o = cu.getOrDefault(d.getId(), new HdmDongHangEntity());
      o.setId(d.getId());
      o.setThuTu(i);
      o.setLoaiHang(d.getLoaiHang());
      o.setTenHang(Texts.nz(d.getTenHang()));
      o.setThongSo(Texts.nz(d.getThongSo()));
      o.setSoLuong(d.getSoLuong());
      o.setDvt(Texts.nz(d.getDvt()));
      o.setDonGia(d.getDonGia());
      o.setLoaiTien(d.getLoaiTien());
      o.setTyGia(d.getTyGia());
      o.setGhiChu(d.getGhiChu());
      o.setDnvtId(Texts.emptyToNull(d.getDnvtId()));
      o.setDnvtDong(Texts.emptyToNull(d.getDnvtDong()));
      o.setHdbId(Texts.emptyToNull(d.getHdbId()));
      o.setHdm(e);
      moi.add(o);
    }
    e.getChiTiet().retainAll(moi);
    for (HdmDongHangEntity o : moi) if (!e.getChiTiet().contains(o)) e.getChiTiet().add(o);
    e.getDotTT().clear();
    for (DotTTMua d : x.getDotTT()) {
      HopDongMuaEntity.DotTT o = new HopDongMuaEntity.DotTT();
      o.setDot(d.getDot());
      o.setTyLe(d.getTyLe());
      o.setSoTien(d.getSoTien());
      o.setHanMoc(Texts.emptyToNull(d.getHanMoc()));
      o.setHanNgay(d.getHanNgay());
      o.setHan(ld(d.getHan()));
      o.setNgayTra(ld(d.getNgayTra()));
      o.setSoTienTra(d.getSoTienTra());
      o.setNguonTien(Texts.emptyToNull(d.getNguonTien()));
      o.setPhieuChiId(Texts.emptyToNull(d.getPhieuChiId()));
      o.setGhiChu(d.getGhiChu());
      e.getDotTT().add(o);
    }
    e.getChecklist().clear();
    for (ChecklistItem c : x.getChecklist()) {
      HopDongMuaEntity.Checklist o = new HopDongMuaEntity.Checklist();
      o.setTen(c.getTen());
      o.setXong(c.isXong());
      o.setNgay(ld(c.getNgay()));
      e.getChecklist().add(o);
    }
    audit(e, me, now);
  }

  public void applyPhieuKho(PhieuKho x, PhieuKhoEntity e, String me, Instant now) {
    e.setId(x.getId());
    e.setSoPhieu(x.getSoPhieu());
    e.setNgay(ld(x.getNgay()));
    e.setLoai(x.getLoai());
    e.setNguonGoc(x.getNguonGoc());
    e.setHdId(Texts.emptyToNull(x.getHdId()));
    e.setKho(x.getKho());
    e.setLyDo(x.getLyDo());
    e.setNguoiThucHien(Texts.nz(x.getNguoiThucHien()));
    e.setTrangThai(x.getTrangThai());
    e.setGhiChu(x.getGhiChu());
    e.setSoHoaDon(x.getSoHoaDon());
    e.setNcc(Texts.emptyToNull(x.getNcc()));
    e.setKiemKeId(Texts.emptyToNull(x.getKiemKeId()));
    e.getDong().clear();
    for (DongPhieuKho d : x.getDong()) {
      PhieuKhoEntity.Dong o = new PhieuKhoEntity.Dong();
      o.setLoaiHang(d.getLoaiHang());
      o.setThuocTinh(Texts.nz(d.getThuocTinh()));
      o.setSoLuong(d.getSoLuong());
      o.setLo(Texts.emptyToNull(d.getLo()));
      o.setDonGia(d.getDonGia());
      o.setVat(d.getVat());
      o.setDongHDMua(Texts.emptyToNull(d.getDongHDMua()));
      o.setDonGiaGoc(d.getDonGiaGoc());
      o.setTenTrenHD(d.getTenTrenHD());
      o.setGhiChu(d.getGhiChu());
      e.getDong().add(o);
    }
    audit(e, me, now);
  }

  public void applyKiemKe(KiemKe x, KiemKeEntity e) {
    e.setId(x.getId());
    e.setSoPhieu(x.getSoPhieu());
    e.setNgay(ld(x.getNgay()));
    e.setKho(x.getKho());
    e.setNguoiThucHien(x.getNguoiThucHien());
    e.setGhiChu(x.getGhiChu());
    e.getDong().clear();
    for (DongKiemKe d : x.getDong()) {
      KiemKeEntity.Dong o = new KiemKeEntity.Dong();
      o.setLoaiHang(d.getLoaiHang());
      o.setSoLuong(d.getSoLuong());
      o.setTenHang(d.getTenHang());
      o.setXuatXu(d.getXuatXu());
      o.setNongDo(d.getNongDo());
      o.setGhiChu(d.getGhiChu());
      e.getDong().add(o);
    }
    List<String> dc = x.getPhieuDieuChinh() == null ? List.of() : x.getPhieuDieuChinh();
    if (!e.getPhieuDieuChinh().equals(dc)) {
      e.getPhieuDieuChinh().clear();
      e.getPhieuDieuChinh().addAll(dc);
    }
  }

  public void applyBinhKhi(BinhKhi x, BinhKhiEntity e) {
    e.setId(x.getId());
    e.setLoaiHang(x.getLoaiHang());
    e.setXuatXu(x.getXuatXu());
    e.setNgaySX(ld(x.getNgaySX()));
    e.setHanSD(ld(x.getHanSD()));
    e.setKho(x.getKho());
    e.setSoLanIn(x.getSoLanIn());
    e.setLanInCuoi(ld(x.getLanInCuoi()));
    e.setNguoiIn(Texts.emptyToNull(x.getNguoiIn()));
    e.setGhiChu(Texts.emptyToNull(x.getGhiChu()));
  }

  public void applyAnhXaTen(AnhXaTen x, AnhXaTenEntity e) {
    e.setId(x.getId());
    e.setTen(x.getTen());
    e.setTheTich(x.getTheTich());
    e.setNongDo(x.getNongDo());
    e.setTongSL(x.getTongSL());
    e.setSoLan(x.getSoLan());
    e.setLoaiHang(Texts.emptyToNull(x.getLoaiHang()));
    e.setLo(Texts.emptyToNull(x.getLo()));
    e.setGhiChu(x.getGhiChu());
  }

  public void applyHopDongPhuTai(HopDongPhuTai x, HopDongPhuTaiEntity e, String me, Instant now) {
    e.setId(x.getId());
    e.setSoHD(x.getSoHD());
    e.setMaKH(x.getMaKH());
    e.setTenKH(Texts.nz(x.getTenKH()));
    e.setMst(Texts.nz(x.getMst()));
    e.setNgayKy(ld(x.getNgayKy()));
    e.setNgayHieuLuc(ld(x.getNgayHieuLuc()));
    e.setTrangThai(x.getTrangThai());
    e.setGhiChu(Texts.emptyToNull(x.getGhiChu()));
    e.setTruocVAT(x.getTruocVAT());
    e.setVat(x.getVat());
    e.setTyLeThue(x.getTyLeThue());
    e.setTyLeGiu(x.getTyLeGiu());
    e.setCachChia(x.getCachChia());
    e.setHoaHongKieu(x.getHoaHongKieu());
    e.setHoaHongGiaTri(x.getHoaHongGiaTri());
    e.setNguoiNhanHH(x.getNguoiNhanHH());
    e.setNgayChiHH(ld(x.getNgayChiHH()));
    e.setGhiChuHoSoThieu(x.getGhiChuHoSoThieu());
    e.setLyDoHuy(x.getLyDoHuy());
    e.setTaoLuc(in(x.getTaoLuc()));
    e.setLaImport(Boolean.TRUE.equals(x.getLaImport()));
    if (!e.getHdMua().equals(x.getHdMua())) {
      e.getHdMua().clear();
      e.getHdMua().addAll(x.getHdMua());
    }
    e.getChiPhi().clear();
    for (ChiPhiPT c : x.getChiPhi()) {
      HopDongPhuTaiEntity.ChiPhi o = new HopDongPhuTaiEntity.ChiPhi();
      o.setId(c.getId());
      o.setLoai(c.getLoai());
      o.setNoiDung(Texts.nz(c.getNoiDung()));
      o.setNgay(ld(c.getNgay()));
      o.setSoTien(c.getSoTien());
      e.getChiPhi().add(o);
    }
    e.getDotKH().clear();
    for (DotKHTraPT c : x.getDotKH()) {
      HopDongPhuTaiEntity.DotKH o = new HopDongPhuTaiEntity.DotKH();
      o.setDot(c.getDot());
      o.setSoTien(c.getSoTien());
      o.setNgay(ld(c.getNgay()));
      o.setGhiChu(c.getGhiChu());
      e.getDotKH().add(o);
    }
    e.getDotTraNCC().clear();
    for (DotPTTraNCC c : x.getDotTraNCC()) {
      HopDongPhuTaiEntity.TraNCC o = new HopDongPhuTaiEntity.TraNCC();
      o.setId(c.getId());
      o.setHdmId(Texts.nz(c.getHdmId()));
      o.setNgay(ld(c.getNgay()));
      o.setSoTien(c.getSoTien());
      o.setLoaiTien(c.getLoaiTien());
      o.setTyGia(c.getTyGia());
      e.getDotTraNCC().add(o);
    }
    e.getDoiChieu().clear();
    for (DoiChieuPT c : x.getDoiChieu()) {
      HopDongPhuTaiEntity.DoiChieu o = new HopDongPhuTaiEntity.DoiChieu();
      o.setId(c.getId());
      o.setNgayOxyChuyen(ld(c.getNgayOxyChuyen()));
      o.setSoTienVND(c.getSoTienVND());
      o.setNgayPTChuyenNCC(ld(c.getNgayPTChuyenNCC()));
      o.setSoTienNguyenTe(c.getSoTienNguyenTe());
      o.setLoaiTien(c.getLoaiTien());
      o.setTyGia(c.getTyGia());
      o.setGhiChu(c.getGhiChu());
      e.getDoiChieu().add(o);
    }
    e.getTyLeLog().clear();
    for (TyLePTLog c : x.getTyLeLog()) {
      HopDongPhuTaiEntity.TyLeLog o = new HopDongPhuTaiEntity.TyLeLog();
      o.setTruoc(c.getTruoc());
      o.setSau(c.getSau());
      o.setNguoi(c.getNguoi());
      o.setLuc(in(c.getLuc()));
      o.setLyDo(c.getLyDo());
      e.getTyLeLog().add(o);
    }
    audit(e, me, now);
  }

  public void applyDongTienPT(DongTienPT x, DongTienPTEntity e) {
    e.setId(x.getId());
    e.setNgay(ld(x.getNgay()));
    e.setChieu(x.getChieu());
    e.setHdptId(Texts.emptyToNull(x.getHdptId()));
    e.setSoTien(x.getSoTien());
    e.setNguon(x.getNguon());
    e.setRefId(x.getRefId());
    e.setGhiChu(x.getGhiChu());
  }
}
