package vn.oxymecie.appoxy.domain.logic;

import vn.oxymecie.appoxy.domain.model.TrangThai;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Dates;
import vn.oxymecie.appoxy.common.Ids;
import vn.oxymecie.appoxy.domain.model.AnhXaTen;
import vn.oxymecie.appoxy.domain.model.CauHinh;
import vn.oxymecie.appoxy.domain.model.ChiPhiHD;
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.domain.model.DeNghiVatTu;
import vn.oxymecie.appoxy.domain.model.FileRef;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.HopDongMua;
import vn.oxymecie.appoxy.domain.model.HopDongPhuTai;
import vn.oxymecie.appoxy.domain.model.KhachHang;
import vn.oxymecie.appoxy.domain.model.Kho;
import vn.oxymecie.appoxy.domain.model.KiemKe;
import vn.oxymecie.appoxy.domain.model.LoaiChiPhi;
import vn.oxymecie.appoxy.domain.model.LoaiHang;
import vn.oxymecie.appoxy.domain.model.NguonTien;
import vn.oxymecie.appoxy.domain.model.NhaCungCap;
import vn.oxymecie.appoxy.domain.model.NhomQuyen;
import vn.oxymecie.appoxy.domain.model.PhieuKho;
import vn.oxymecie.appoxy.domain.model.PhieuThuChi;
import vn.oxymecie.appoxy.domain.model.TaiKhoan;
import vn.oxymecie.appoxy.domain.model.ViecGiao;
import vn.oxymecie.appoxy.domain.perm.Level;
import vn.oxymecie.appoxy.domain.perm.Perm;
import vn.oxymecie.appoxy.domain.perm.Quyen;

/**
 * Ngữ cảnh một lệnh ghi: bản làm việc của dữ liệu (sao chép từ cache), người thực hiện và đồng hồ.
 * Các hàm tra cứu / quyền / ghi chung tương đương phần đầu của frontend core/store.ts.
 * Lệnh lỗi (ném ApiException) thì bản làm việc bị bỏ, không ghi gì xuống DB.
 */
public final class Ctx {
  public static final String KHONG_QUYEN = "Tài khoản của bạn không có quyền thực hiện thao tác này";

  private final Db db;
  private final String meId;
  private final Clock clock;
  private final ObjectMapper mapper;
  private final Function<String, FileRef> tepLookup;
  private List<NhomQuyen> groups;

  /**
   * @param tepLookup tra siêu dữ liệu tệp đã tải lên (bảng ht_tep_tin) theo id; null khi không cần
   */
  public Ctx(Db db, String meId, Clock clock, ObjectMapper mapper, Function<String, FileRef> tepLookup) {
    this.db = db;
    this.meId = meId;
    this.clock = clock;
    this.mapper = mapper;
    this.tepLookup = tepLookup == null ? id -> null : tepLookup;
  }

  /** Bản sao sâu (đối tượng client gửi lên không bị dùng chung với dữ liệu làm việc). */
  public <T> T copy(Object o, Class<T> type) {
    return mapper.convertValue(o, type);
  }

  /** Siêu dữ liệu tệp đã lưu ở kho tệp, null nếu chưa tải lên. */
  public FileRef tep(String id) {
    return id == null ? null : tepLookup.apply(id);
  }

  private final java.util.Set<String> tepXoa = new java.util.LinkedHashSet<>();

  /** Đánh dấu tệp cần xoá khỏi kho tệp sau khi lệnh ghi thành công (bản ghi tep_tin + nội dung). */
  public void xoaTep(String id) {
    if (id != null) tepXoa.add(id);
  }

  public java.util.Set<String> tepCanXoa() {
    return tepXoa;
  }

  private final java.util.Map<String, String> matKhauMoi = new java.util.HashMap<>();
  private final List<String[]> doiMa = new java.util.ArrayList<>();
  private String doiTuong;
  private String maDoiTuong;
  private String moTa;

  /** Mật khẩu (đã băm BCrypt) cần ghi cho tài khoản — mật khẩu không nằm trong dữ liệu domain. */
  public void datMatKhau(String taiKhoanId, String bam) {
    matKhauMoi.put(taiKhoanId, bam);
  }

  public java.util.Map<String, String> matKhauMoi() {
    return matKhauMoi;
  }

  /** Đổi khoá chính mã hàng — DataStore chạy UPDATE … (ON UPDATE CASCADE) trước khi ghi các bản ghi khác. */
  public void ghiDoiMaHang(String cu, String moi) {
    doiMa.add(new String[] {cu, moi});
  }

  public List<String[]> doiMaHang() {
    return doiMa;
  }

  /** Đối tượng chính của lệnh — ghi vào nhật ký thao tác (audit_log). */
  public void nhatKy(String doiTuong, String maDoiTuong, String moTa) {
    this.doiTuong = doiTuong;
    this.maDoiTuong = maDoiTuong;
    this.moTa = moTa;
  }

  public String nkDoiTuong() {
    return doiTuong;
  }

  public String nkMaDoiTuong() {
    return maDoiTuong;
  }

  public String nkMoTa() {
    return moTa;
  }

  public Db db() {
    return db;
  }

  /** Id tài khoản đang thực hiện lệnh. */
  public String me() {
    return meId;
  }

  public Clock clock() {
    return clock;
  }

  public String now() {
    return Dates.nowIso(clock);
  }

  public String today() {
    return Dates.todayIso(clock);
  }

  public String uid(String prefix) {
    return Ids.uid(prefix);
  }

  public CauHinh cauHinh() {
    return db.getCauHinh();
  }

  // ── Người dùng & quyền ───────────────────────────────────────────────

  public TaiKhoan meTk() {
    return db.getTaiKhoan().stream().filter(t -> t.getId().equals(meId)).findFirst().orElse(null);
  }

  public List<NhomQuyen> myGroups() {
    if (groups == null) groups = Quyen.nhomCua(meTk(), db.getNhomQuyen());
    return groups;
  }

  public Level level(Perm p) {
    return Quyen.levelOf(myGroups(), p);
  }

  public boolean canView(Perm p) {
    return level(p) != Level.none;
  }

  public boolean canEdit(Perm p) {
    return canEdit(p, null);
  }

  /** Sửa được; mức "own" chỉ khi ownerId là mình (hoặc không xét chủ). */
  public boolean canEdit(Perm p, String ownerId) {
    Level l = level(p);
    if (l.atLeast(Level.edit)) return true;
    if (l == Level.own) return ownerId == null || ownerId.equals(meId);
    return false;
  }

  public boolean canApprove(Perm p) {
    return level(p) == Level.approve;
  }

  public boolean ownOnly(Perm p) {
    Level l = level(p);
    return l == Level.own || l == Level.ownView;
  }

  /** Nhóm toàn quyền (Giám đốc / Owner). */
  public boolean isGD() {
    return myGroups().stream().anyMatch(NhomQuyen::isToanQuyen);
  }

  public void require(Perm p) {
    require(p, Level.edit, null);
  }

  public void require(Perm p, Level min) {
    require(p, min, null);
  }

  /** Tương đương _requireCanEdit_ / store.require — ném 403 khi không đủ quyền. */
  public void require(Perm p, Level min, String ownerId) {
    Level l = level(p);
    if (min == Level.edit && l == Level.own && (ownerId == null || ownerId.equals(meId))) return;
    if (!l.atLeast(min)) throw ApiException.forbidden(KHONG_QUYEN);
  }

  public String userName(String id) {
    if (id == null || id.isEmpty()) return "—";
    return db.getTaiKhoan().stream().filter(t -> t.getId().equals(id)).map(TaiKhoan::getHoTen).findFirst().orElse(id);
  }

  // ── Tra cứu ──────────────────────────────────────────────────────────

  private static <T> T find(List<T> list, Function<T, String> id, String key) {
    if (key == null) return null;
    for (T x : list) if (key.equals(id.apply(x))) return x;
    return null;
  }

  public KhachHang kh(String id) { return find(db.getKhachHang(), KhachHang::getId, id); }
  public NhaCungCap ncc(String id) { return find(db.getNcc(), NhaCungCap::getId, id); }
  public NguonTien nguon(String id) { return find(db.getNguonTien(), NguonTien::getId, id); }
  public LoaiChiPhi lcp(String id) { return find(db.getLoaiChiPhi(), LoaiChiPhi::getId, id); }
  public Kho kho(String id) { return find(db.getKho(), Kho::getId, id); }
  public LoaiHang loaiHang(String id) { return find(db.getLoaiHang(), LoaiHang::getId, id); }
  public HopDongBan hdb(String id) { return find(db.getHopDongBan(), HopDongBan::getId, id); }
  public HopDongMua hdm(String id) { return find(db.getHopDongMua(), HopDongMua::getId, id); }
  public HopDongPhuTai pt(String id) { return find(db.getHopDongPhuTai(), HopDongPhuTai::getId, id); }
  public PhieuThuChi phieu(String id) { return find(db.getPhieuThuChi(), PhieuThuChi::getId, id); }
  public ChiPhiHD chiPhi(String id) { return find(db.getChiPhiHD(), ChiPhiHD::getId, id); }
  public PhieuKho phieuKho(String id) { return find(db.getPhieuKho(), PhieuKho::getId, id); }
  public KiemKe kiemKe(String id) { return find(db.getKiemKe(), KiemKe::getId, id); }
  public AnhXaTen anhXa(String id) { return find(db.getAnhXaTen(), AnhXaTen::getId, id); }
  public DeNghiVatTu deNghi(String id) { return find(db.getDeNghiVatTu(), DeNghiVatTu::getId, id); }
  public ViecGiao viec(String id) { return find(db.getViecGiao(), ViecGiao::getId, id); }
  /** Tài khoản ẩn coi như không tồn tại với người khác (không sửa / khoá / gán nhóm / chọn làm người phụ trách được). */
  public TaiKhoan taiKhoan(String id) {
    if (TaiKhoan.laAn(id) && !TaiKhoan.laAn(meId)) return null;
    return find(db.getTaiKhoan(), TaiKhoan::getId, id);
  }
  public NhomQuyen nhom(String id) { return find(db.getNhomQuyen(), NhomQuyen::getId, id); }

  public String nguonTen(String id) {
    NguonTien n = nguon(id);
    return n != null ? n.getTen() : id != null ? id : "—";
  }

  // ── Ghi chung ────────────────────────────────────────────────────────

  /** Thay bản ghi cùng id, chưa có thì thêm lên đầu (store.upsert). */
  public static <T> void upsert(List<T> list, T row, Function<T, String> id) {
    String key = id.apply(row);
    for (int i = 0; i < list.size(); i++) {
      if (Objects.equals(id.apply(list.get(i)), key)) {
        list.set(i, row);
        return;
      }
    }
    list.add(0, row);
  }

  public static <T> void drop(List<T> list, Function<T, String> id, String key) {
    list.removeIf(x -> Objects.equals(id.apply(x), key));
  }

  /** KT-06 / D-31: {tiền tố}{yy}-{nnnn} theo năm của ngày chứng từ, không tái dùng số. */
  public String nextSo(String prefix, String ngay) {
    String k = prefix + Dates.yy(ngay == null || ngay.isEmpty() ? today() : ngay);
    int n = db.getBoDem().getOrDefault(k, 0) + 1;
    db.getBoDem().put(k, n);
    return k + "-" + String.format("%04d", n);
  }

  /** Mã danh mục kế tiếp: tiền tố + 4 chữ số (store.nextMa). */
  public static String nextMa(String prefix, List<String> ids) {
    int max = 0;
    for (String id : ids) {
      if (id == null || !id.startsWith(prefix)) continue;
      try {
        max = Math.max(max, Integer.parseInt(id.substring(prefix.length())));
      } catch (NumberFormatException ignored) {
        // mã không theo mẫu số — bỏ qua như Number(...) || 0
      }
    }
    return prefix + String.format("%04d", max + 1);
  }

  /** Bản ghi đang có yêu cầu xoá chờ duyệt. */
  public boolean dangChoXoa(String loai, String id) {
    if (id == null || id.isEmpty()) return false;
    return db.getYeuCauXoa().stream()
        .anyMatch(y -> loai.equals(y.getLoai()) && id.equals(y.getMaDoiTuong()) && TrangThai.CHO_DUYET.equals(y.getTrangThai()));
  }
}
