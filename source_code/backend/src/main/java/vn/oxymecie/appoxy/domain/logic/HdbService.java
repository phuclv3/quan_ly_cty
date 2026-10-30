package vn.oxymecie.appoxy.domain.logic;

import vn.oxymecie.appoxy.domain.model.TrangThai;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Service;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Ids;
import vn.oxymecie.appoxy.common.Money;
import vn.oxymecie.appoxy.common.Texts;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.model.ChiPhiHD;
import vn.oxymecie.appoxy.domain.model.DeNghiVatTu;
import vn.oxymecie.appoxy.domain.model.DongDeNghi;
import vn.oxymecie.appoxy.domain.model.DongHangBan;
import vn.oxymecie.appoxy.domain.model.DongPhieuKho;
import vn.oxymecie.appoxy.domain.model.DotTTBan;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.KhachHang;
import vn.oxymecie.appoxy.domain.model.NguonPhatSinh;
import vn.oxymecie.appoxy.domain.model.PhieuKho;
import vn.oxymecie.appoxy.domain.model.PhieuThuChi;
import vn.oxymecie.appoxy.domain.model.ThamSoThue;
import vn.oxymecie.appoxy.domain.perm.Level;
import vn.oxymecie.appoxy.domain.perm.Perm;

/** Hợp đồng bán (HDB-01…13), đề nghị cấp vật tư. */
@Service
public class HdbService {
  public static final List<String> TRANG_THAI = List.of(TrangThai.BAO_GIA, TrangThai.HIEU_LUC, TrangThai.DANG_GIAO_HANG, TrangThai.HOAN_THANH, TrangThai.DA_TAT_TOAN, TrangThai.HUY);
  private static final List<String> THU_TU = List.of(TrangThai.BAO_GIA, TrangThai.HIEU_LUC, TrangThai.DANG_GIAO_HANG, TrangThai.HOAN_THANH, TrangThai.DA_TAT_TOAN);

  private final KhoService kho;
  private final KeToanService keToan;

  public HdbService(KhoService kho, KeToanService keToan) {
    this.kho = kho;
    this.keToan = keToan;
  }

  public boolean hdbKhoa(Ctx c, HopDongBan h) {
    return TrangThai.DA_TAT_TOAN.equals(h.getTrangThai()) || TrangThai.HUY.equals(h.getTrangThai()) || c.dangChoXoa("HopDongBan", h.getId());
  }

  /** HĐ đã có phiếu Thu sinh từ đợt TT (chưa bị từ chối) — khoá Giá trị / VAT (F-08). */
  public boolean hdbCoPhieuThu(Ctx c, HopDongBan h) {
    for (DotTTBan d : h.getDotTT()) {
      PhieuThuChi p = d.getPhieuThuId() == null ? null : c.phieu(d.getPhieuThuId());
      if (p != null && !TrangThai.TU_CHOI.equals(p.getTrangThai())) return true;
    }
    return false;
  }

  private static String sale(HopDongBan h) {
    return h == null ? null : Texts.emptyToNull(h.getSale());
  }

  /** Lưu HĐ (Tab 1 + Tab 3). Trạng thái chỉ đổi qua các lệnh chuyển trạng thái. */
  public HopDongBan saveHdb(Ctx c, HopDongBan input, boolean isNew) {
    HopDongBan h = c.copy(input, HopDongBan.class);
    HopDongBan cu = isNew ? null : c.hdb(h.getId());
    if (!isNew && cu == null) throw ApiException.notFound("Không tìm thấy HĐ");
    c.require(Perm.hdb, Level.edit, cu != null ? sale(cu) : sale(h));
    if (cu != null && hdbKhoa(c, cu)) throw ApiException.conflict("HĐ đã khoá (Đã tất toán hoặc đang chờ xoá)");
    // Trạng thái, lý do huỷ, tham số thuế và cờ import không đổi qua lưu thông tin.
    h.setTrangThai(cu == null ? TrangThai.BAO_GIA : cu.getTrangThai());
    h.setLyDoHuy(cu == null ? null : cu.getLyDoHuy());
    if (cu == null) {
      h.setThamSoThue(new ThamSoThue(c.cauHinh().getTndnNguong(), c.cauHinh().getTndnMuc1(), c.cauHinh().getTndnMuc2()));
      h.setTaoLuc(c.now());
    } else {
      h.setThamSoThue(cu.getThamSoThue());
      h.setTaoLuc(cu.getTaoLuc());
      h.setLaImport(cu.getLaImport());
    }
    // Sale chỉ lập / sửa HĐ của chính mình.
    if (c.level(Perm.hdb) == Level.own) h.setSale(cu != null ? cu.getSale() : c.me());
    if (Texts.blank(h.getSale())) h.setSale(cu != null ? cu.getSale() : c.me());
    if (c.taiKhoan(h.getSale()) == null) throw ApiException.invalid("Sale phụ trách không tồn tại");
    if (h.getVat() != 0 && h.getVat() != 8 && h.getVat() != 10) throw ApiException.invalid("VAT chỉ 0, 8 hoặc 10%");
    if (h.getTruocVAT() < 0 || h.getThucTeTruocVAT() < 0) throw ApiException.invalid("Giá trị HĐ không âm");
    chuanHoaDong(c, h);
    chuanHoaDot(c, h, cu);
    Calc.apDungTuDongHdb(h);
    String loiDot = Calc.loiDotTT(h.getDotTT().stream().map(d -> new Calc.DotRow(d.getTyLe(), d.getSoTien(), d.getHan())).toList(),
        Calc.sauVAT(h.getTruocVAT(), h.getVat()));
    if (loiDot != null) throw ApiException.invalid(loiDot);
    boolean baoGia = cu == null || TrangThai.BAO_GIA.equals(cu.getTrangThai());
    String soHD = Texts.trim(h.getSoHD());
    if (soHD.isEmpty() && !baoGia) throw ApiException.invalid("Số HĐ bán là bắt buộc");
    if (!soHD.isEmpty() && c.db().getHopDongBan().stream()
        .anyMatch(x -> !x.getId().equals(h.getId()) && Texts.fold(x.getSoHD()).equals(Texts.fold(soHD))))
      throw ApiException.conflict("Số HĐ " + h.getSoHD() + " đã tồn tại");
    if (Texts.blank(h.getMaKH())) throw ApiException.invalid("Chưa chọn Khách hàng");
    if (c.kh(h.getMaKH()) == null) throw ApiException.invalid("Khách hàng không tồn tại");
    if (!Texts.blank(h.getMst())) {
      String loi = DanhMucService.loiMST(h.getMst());
      if (loi != null) throw ApiException.invalid(loi);
    }
    if (h.getPhatHD() != null && h.getPhatHD() < 0) throw ApiException.invalid("Tiền phạt HĐ không âm");
    if (cu != null && !baoGia && (!Objects.equals(cu.getSoHD(), h.getSoHD()) || !Objects.equals(cu.getMaKH(), h.getMaKH())))
      throw ApiException.conflict("Từ \"Hiệu lực\" không đổi Số HĐ / Khách hàng");
    if (cu != null && hdbCoPhieuThu(c, cu) && (cu.getTruocVAT() != h.getTruocVAT() || cu.getVat() != h.getVat()))
      throw ApiException.conflict("HĐ đã có phiếu Thu — không đổi Giá trị trước VAT / VAT (xoá phiếu Thu trước nếu cần sửa)");
    if (h.getNgayKy() != null && h.getNgayHieuLuc() != null && h.getNgayHieuLuc().compareTo(h.getNgayKy()) < 0)
      throw ApiException.invalid("Ngày hiệu lực (ngày thu tạm ứng) phải ≥ Ngày ký");
    if (h.getDotTT().size() > c.cauHinh().getSoDotToiDa())
      throw ApiException.invalid("Tối đa " + c.cauHinh().getSoDotToiDa() + " đợt thanh toán");
    if (cu != null && !TrangThai.BAO_GIA.equals(cu.getTrangThai())) {
      List<String> thieu = Calc.hdbThieuDeChuyen(h, TrangThai.HIEU_LUC, c.db());
      if (!thieu.isEmpty()) throw ApiException.invalid(String.join(" · ", thieu));
    }
    h.setSoHD(soHD.isEmpty() ? "" : h.getSoHD());
    if (isNew) h.setId(Ids.safe(h.getId()) && c.hdb(h.getId()) == null ? h.getId() : c.uid("HDB"));
    Ctx.upsert(c.db().getHopDongBan(), h, HopDongBan::getId);
    // KH chưa có MST / địa chỉ mà HĐ đã nhập → ghi ngược về danh mục khách hàng.
    KhachHang k = c.kh(h.getMaKH());
    if (k != null && ((Texts.blank(k.getMst()) && !Texts.blank(h.getMst())) || (Texts.blank(k.getDiaChi()) && !Texts.blank(h.getDiaChi())))) {
      if (Texts.blank(k.getMst())) k.setMst(h.getMst().trim());
      if (Texts.blank(k.getDiaChi())) k.setDiaChi(h.getDiaChi().trim());
    }
    return h;
  }

  private void chuanHoaDong(Ctx c, HopDongBan h) {
    if (h.getDongHang() == null) return;
    Set<String> ids = new HashSet<>();
    for (DongHangBan d : h.getDongHang()) {
      if (!Ids.safe(d.getId()) || !ids.add(d.getId())) d.setId(c.uid("DB"));
      d.setLoaiHang(Texts.emptyToNull(d.getLoaiHang()));
      if (d.getLoaiHang() != null && c.loaiHang(d.getLoaiHang()) == null) throw ApiException.invalid("Không có mã " + d.getLoaiHang());
      if (d.getSoLuong() < 0 || d.getDonGia() < 0 || d.getDonGiaTH() < 0) throw ApiException.invalid("Số lượng / đơn giá không âm");
      if (d.getTenHang() == null) d.setTenHang("");
    }
  }

  /** Đợt thanh toán: số đợt không trùng; phần thực thu đã có phiếu Thu giữ theo phiếu (chỉ sửa qua ghi nhận thực thu). */
  private void chuanHoaDot(Ctx c, HopDongBan h, HopDongBan cu) {
    Set<Integer> so = new HashSet<>();
    boolean thucThu = c.canEdit(Perm.hdbThucThu);
    for (DotTTBan d : h.getDotTT()) {
      if (!so.add(d.getDot())) throw ApiException.invalid("Số đợt thanh toán bị trùng");
      if (d.getSoTien() < 0) throw ApiException.invalid("Số tiền đợt không âm");
      DotTTBan old = cu == null ? null : cu.getDotTT().stream().filter(x -> x.getDot() == d.getDot()).findFirst().orElse(null);
      boolean coPhieu = old != null && old.getPhieuThuId() != null;
      // Ngày & số thực thu: đã có phiếu Thu thì theo phiếu; chưa có thì chỉ người có quyền HDB-10 nhập tay (dữ liệu cũ).
      if (coPhieu || !thucThu) {
        d.setNgayThu(old == null ? null : old.getNgayThu());
        d.setSoTienThu(old == null ? null : old.getSoTienThu());
        d.setNguonTienNhan(old == null ? null : old.getNguonTienNhan());
      }
      if (d.getSoTienThu() != null && d.getSoTienThu() < 0) throw ApiException.invalid("Số tiền thực thu không âm");
      d.setPhieuThuId(old == null ? null : old.getPhieuThuId());
      d.setNguonTienNhan(Texts.emptyToNull(d.getNguonTienNhan()));
      if (d.getNguonTienNhan() != null && c.nguon(d.getNguonTienNhan()) == null) throw ApiException.invalid("Nguồn tiền nhận không tồn tại");
    }
    if (cu != null) {
      // Đợt đã có phiếu Thu không được bỏ khỏi HĐ (phiếu sẽ mồ côi).
      for (DotTTBan old : cu.getDotTT())
        if (old.getPhieuThuId() != null && c.phieu(old.getPhieuThuId()) != null && !so.contains(old.getDot()))
          throw ApiException.conflict("Đợt " + old.getDot() + " đã có phiếu Thu — không bỏ đợt này");
    }
  }

  /** Trạng thái kế tiếp hợp lệ (HDB-03). */
  public String hdbKeTiep(Ctx c, HopDongBan h) {
    if (TrangThai.HIEU_LUC.equals(h.getTrangThai()) && Calc.hdbKhongGiaoHang(h, c.db())) return TrangThai.HOAN_THANH;
    int i = THU_TU.indexOf(h.getTrangThai());
    return i >= 0 && i < THU_TU.size() - 1 ? THU_TU.get(i + 1) : null;
  }

  public void chuyenTrangThaiHdb(Ctx c, String id, String toi) {
    HopDongBan h = c.hdb(id);
    if (h == null) throw ApiException.notFound("Không tìm thấy HĐ");
    c.require(Perm.hdb, Level.edit, sale(h));
    if (c.dangChoXoa("HopDongBan", id)) throw ApiException.conflict("HĐ đang chờ xoá");
    if (TrangThai.DA_TAT_TOAN.equals(h.getTrangThai())) throw ApiException.conflict("HĐ đã tất toán — dùng \"Mở lại\" (HDB-03-ML)");
    if (TrangThai.HUY.equals(h.getTrangThai())) throw ApiException.conflict("HĐ đã huỷ");
    // Chỉ đi đúng bước kế tiếp; "Đang giao hàng" do ghi nhận giao hàng tự chuyển.
    if (!Objects.equals(toi, hdbKeTiep(c, h)) || TrangThai.DANG_GIAO_HANG.equals(toi))
      throw ApiException.conflict("Không chuyển được từ \"" + TrangThai.nhan(h.getTrangThai()) + "\" sang \"" + TrangThai.nhan(toi) + "\"");
    List<String> thieu = Calc.hdbThieuDeChuyen(h, toi, c.db());
    if (!thieu.isEmpty()) throw ApiException.invalid(String.join(" · ", thieu));
    h.setTrangThai(toi);
  }

  /** Huỷ HĐ bán: chỉ khi chưa thu tiền, chưa xuất kho, không còn chi phí / đề nghị vật tư hiệu lực. */
  public void huyHdb(Ctx c, String id, String lyDo) {
    HopDongBan h = c.hdb(id);
    if (h == null) throw ApiException.notFound("Không tìm thấy HĐ");
    c.require(Perm.hdb, Level.edit, sale(h));
    if (hdbKhoa(c, h)) throw ApiException.conflict(TrangThai.HUY.equals(h.getTrangThai()) ? "HĐ đã huỷ" : "HĐ đã khoá (Đã tất toán hoặc đang chờ xoá)");
    if (Texts.blank(lyDo)) throw ApiException.invalid("Cần lý do huỷ");
    if (hdbCoPhieuThu(c, h)) throw ApiException.conflict("Chỉ huỷ khi chưa thu tiền — xoá / từ chối phiếu Thu trước");
    if (c.db().getPhieuKho().stream().anyMatch(p -> "Xuất".equals(p.getLoai()) && id.equals(p.getHdId()) && TrangThai.HIEU_LUC.equals(p.getTrangThai())))
      throw ApiException.conflict("Chỉ huỷ khi chưa xuất kho giao hàng");
    if (c.db().getChiPhiHD().stream().anyMatch(x -> id.equals(x.getHdbId()) && !TrangThai.TU_CHOI.equals(x.getTrangThai())))
      throw ApiException.conflict("HĐ còn chi phí thực hiện — xoá / từ chối chi phí trước");
    if (c.db().getDeNghiVatTu().stream().anyMatch(x -> id.equals(x.getHdbId()) && x.getLyDoHuy() == null))
      throw ApiException.conflict("HĐ có đề nghị cấp vật tư — huỷ đề nghị trước");
    h.setTrangThai(TrangThai.HUY);
    h.setLyDoHuy(lyDo.trim());
  }

  /** Mở lại HĐ đã tất toán → Hoàn thành (HDB-03-ML). */
  public void moLaiHdb(Ctx c, String id) {
    if (!c.canEdit(Perm.moLaiHdb)) throw ApiException.forbidden("Cần quyền \"Mở lại HĐ đã tất toán\" (HDB-03-ML)");
    HopDongBan h = c.hdb(id);
    if (h == null) throw ApiException.notFound("Không tìm thấy HĐ");
    if (!TrangThai.DA_TAT_TOAN.equals(h.getTrangThai())) throw ApiException.conflict("Chỉ mở lại HĐ đã tất toán");
    if (c.dangChoXoa("HopDongBan", id)) throw ApiException.conflict("HĐ đang chờ xoá");
    h.setTrangThai(TrangThai.HOAN_THANH);
  }

  private static String so(double v) {
    return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
  }

  /** HDB-04: ghi nhận một lần giao → sinh 1 phiếu Xuất kho trừ theo lô (giá vốn = đơn giá lô). */
  public PhieuKho ghiNhanGiaoHang(Ctx c, String hdbId, String ngay, String khoId, List<KhoService.DongXuat> dong, String ghiChu) {
    HopDongBan h = c.hdb(hdbId);
    if (h == null) throw ApiException.notFound("Không tìm thấy HĐ");
    c.require(Perm.hdbGiaoHang, Level.edit, sale(h));
    if (TrangThai.BAO_GIA.equals(h.getTrangThai())) throw ApiException.conflict("HĐ chưa Hiệu lực");
    if (TrangThai.HOAN_THANH.equals(h.getTrangThai())) throw ApiException.conflict("HĐ đã Hoàn thành — không ghi nhận giao thêm");
    if (hdbKhoa(c, h)) throw ApiException.conflict("HĐ đã khoá");
    if (Texts.blank(khoId)) throw ApiException.invalid("Chưa chọn Vị trí kho");
    if (c.kho(khoId) == null) throw ApiException.invalid("Vị trí kho không tồn tại");
    if (Texts.blank(ngay)) throw ApiException.invalid("Chưa chọn Ngày");
    // Chỉ giao đúng mã hàng trong Sản phẩm & giá của HĐ, tổng đã giao không vượt số lượng HĐ.
    java.util.Map<String, Double> con = Calc.hdbGioiHanGiao(h, c.db());
    if (con != null) {
      java.util.Map<String, Double> moi = new java.util.LinkedHashMap<>();
      for (KhoService.DongXuat d : dong == null ? List.<KhoService.DongXuat>of() : dong)
        if (!Texts.blank(d.loaiHang()) && d.soLuong() > 0) moi.merge(d.loaiHang(), d.soLuong(), Double::sum);
      for (var e : moi.entrySet()) {
        Double r = con.get(e.getKey());
        if (r == null) throw ApiException.invalid("Mã hàng " + e.getKey() + " không có trong Sản phẩm & giá của HĐ bán");
        if (e.getValue() > r + 1e-9)
          throw ApiException.invalid("Mã hàng " + e.getKey() + ": giao " + so(e.getValue()) + " vượt số còn phải giao " + so(Math.max(0, r)));
      }
    }
    List<DongPhieuKho> ds = kho.dongXuatTheoLo(c, khoId, hdbId, dong, ngay);
    if (ds.isEmpty()) throw ApiException.invalid("Cần ít nhất 1 dòng hàng có số lượng > 0");
    PhieuKho p = new PhieuKho(c.uid("PK"), c.nextSo(c.cauHinh().getTienToXK(), ngay), ngay, "Xuất", "Tự động HĐ Bán", hdbId, khoId,
        null, c.me(), TrangThai.HIEU_LUC, ghiChu, ds, null, null, null);
    Ctx.upsert(c.db().getPhieuKho(), p, PhieuKho::getId);
    if (TrangThai.HIEU_LUC.equals(h.getTrangThai())) h.setTrangThai(TrangThai.DANG_GIAO_HANG);
    return p;
  }

  /** Số tối đa còn ghi thực thu được cho một đợt = Sau VAT − Σ thực thu các đợt khác. */
  public long hdbConThuDuoc(HopDongBan h, int dot) {
    long sau = Calc.sauVAT(h.getTruocVAT(), h.getVat());
    long khac = 0;
    for (DotTTBan x : h.getDotTT()) if (x.getDot() != dot) khac += x.getSoTienThu() == null ? 0 : x.getSoTienThu();
    return Math.max(0, sau - khac);
  }

  /**
   * Kế toán ghi nhận thực thu một đợt (HDB-10) — sinh kèm phiếu Thu Chờ duyệt ở Sổ quỹ (số dư nguồn tăng khi duyệt).
   * [Giả định của frontend — spec không nói rõ; xem docs/business-analysis.md]
   */
  public PhieuThuChi ghiThucThu(Ctx c, String hdbId, int dot, String ngayThu, long soTienThu, String nguonTienNhan) {
    c.require(Perm.hdbThucThu);
    HopDongBan h = c.hdb(hdbId);
    if (h == null) throw ApiException.notFound("Không tìm thấy HĐ");
    if (hdbKhoa(c, h)) throw ApiException.conflict("HĐ đã khoá");
    if (TrangThai.BAO_GIA.equals(h.getTrangThai()) && !(Boolean.TRUE.equals(h.getCoTamUng()) && dot == 1))
      throw ApiException.conflict("HĐ đang ở Báo giá — chỉ ghi thực thu từ Hiệu lực trở đi (trừ đợt tạm ứng)");
    DotTTBan d = h.getDotTT().stream().filter(x -> x.getDot() == dot).findFirst().orElse(null);
    if (d == null) throw ApiException.notFound("Không có đợt này");
    PhieuThuChi cu = d.getPhieuThuId() == null ? null : c.phieu(d.getPhieuThuId());
    // HĐ thuộc Phú Tài: tiền về quỹ ảo Phú Tài (PhuTaiBaoCaoService.soQuy đọc thẳng từ đợt TT), không sinh phiếu ở Sổ quỹ / Nguồn tiền Oxy.
    boolean phuTai = Boolean.TRUE.equals(h.getThuocPhuTai()) && cu == null;
    if (Texts.blank(ngayThu) || !(soTienThu > 0) || (!phuTai && Texts.blank(nguonTienNhan)))
      throw ApiException.invalid(phuTai ? "Cần Ngày thực thu và Số tiền > 0" : "Cần Ngày thực thu, Số tiền > 0 và Nguồn tiền nhận");
    if (!phuTai && c.nguon(nguonTienNhan) == null) throw ApiException.invalid("Nguồn tiền nhận không tồn tại");
    long conLai = hdbConThuDuoc(h, dot);
    if (soTienThu > conLai) throw ApiException.invalid("Số thu vượt phần còn phải thu của HĐ (tối đa " + Money.vnd(conLai) + ")");
    if (phuTai) {
      d.setNgayThu(ngayThu);
      d.setSoTienThu(soTienThu);
      d.setNguonTienNhan(null);
      Calc.apDungTuDongHdb(h);
      return null;
    }
    if (cu != null && TrangThai.DA_DUYET.equals(cu.getTrangThai()))
      throw ApiException.conflict("Phiếu thu của đợt này đã duyệt — muốn sửa thì bấm \"Yêu cầu xoá phiếu\" ở dòng đợt, duyệt xong ghi lại");
    PhieuThuChi p = cu != null ? cu : phieuMoi(c, "Thu");
    p.setLoai("Thu");
    p.setNgayLap(ngayThu);
    p.setNguonTien(nguonTienNhan);
    p.setNoiDung("Thu đợt " + dot + " — HĐ bán " + h.getSoHD() + " (" + h.getTenKH() + ")");
    p.setSoTienThu(soTienThu);
    p.setSoTienChi(0);
    p.setTrangThai(TrangThai.CHO_DUYET);
    p.setLyDoTuChoi(null);
    p.setPhatSinh(new NguonPhatSinh("HDB-DotTT", h.getId(), dot));
    p.setLichSu(KeToanService.ghiLichSu(c, cu == null ? null : cu.getLichSu(), "Gửi duyệt", cu != null ? "Sửa ghi nhận thực thu" : "Sinh từ ghi nhận thực thu"));
    if (p.getId() == null) {
      p.setId(c.uid("PTC"));
      p.setSoPhieu(c.nextSoThang(KeToanService.tienToPhieu(c, p.getLoai()), p.getNgayLap()));
    }
    Ctx.upsert(c.db().getPhieuThuChi(), p, PhieuThuChi::getId);
    d.setNgayThu(ngayThu);
    d.setSoTienThu(soTienThu);
    d.setNguonTienNhan(nguonTienNhan);
    d.setPhieuThuId(p.getId());
    Calc.apDungTuDongHdb(h);
    return p;
  }

  /** Phiếu thu chi mới (store.newPhieu) — dùng cho phiếu phát sinh từ đợt thanh toán. */
  static PhieuThuChi phieuMoi(Ctx c, String loai) {
    PhieuThuChi p = new PhieuThuChi();
    p.setNgayLap(c.today());
    p.setLoai(loai);
    p.setNguonTien(c.db().getNguonTien().stream().filter(n -> TrangThai.DANG_DUNG.equals(n.getTrangThai())).map(n -> n.getId()).findFirst().orElse(null));
    p.setNoiDung("");
    p.setNguoiDeNghi(c.me());
    p.setTrangThai(TrangThai.NHAP);
    p.setFiles(new ArrayList<>());
    return p;
  }

  /** HDB-09: thêm nhanh tiền trả khách = 1 chi phí HĐ loại Hoa hồng, gửi duyệt luôn. */
  public ChiPhiHD themTienTraKhach(Ctx c, String hdbId, String nguoiNhan, long soTien, String ngay, String nguonTien) {
    ChiPhiHD x = new ChiPhiHD();
    x.setHdbId(hdbId);
    x.setNgay(Texts.blank(ngay) ? c.today() : ngay);
    x.setLoaiChiPhi(Calc.LCP_HOA_HONG);
    x.setNoiDung("Hoa hồng kinh doanh — " + Texts.nz(nguoiNhan));
    x.setSoTien(soTien);
    x.setNguonTien(nguonTien);
    x.setNguoiThucHien(c.me());
    x.setNguoiNhan(nguoiNhan);
    x.setTrangThai(TrangThai.NHAP);
    x.setFiles(new ArrayList<>());
    return keToan.saveChiPhi(c, x, true, true);
  }

  // ── Đề nghị cấp vật tư ───────────────────────────────────────────────

  /** HĐ bán thiếu hàng → mỗi dòng sản phẩm thiếu = 1 đề nghị riêng (có thể mua của NCC khác nhau). */
  public List<String> taoDeNghiVatTu(Ctx c, String hdbId, List<DongDeNghi> dong, String ghiChu) {
    HopDongBan h = c.hdb(hdbId);
    if (h == null) throw ApiException.notFound("Không tìm thấy HĐ bán");
    c.require(Perm.hdb, Level.edit, sale(h));
    if (hdbKhoa(c, h)) throw ApiException.conflict("HĐ đã khoá");
    List<DongDeNghi> ds = (dong == null ? List.<DongDeNghi>of() : dong).stream()
        .filter(d -> !Texts.blank(d.getLoaiHang()) && d.getSoLuong() > 0).toList();
    if (ds.isEmpty()) throw ApiException.invalid("Không có dòng nào cần đề nghị (SL > 0)");
    String ngay = c.today();
    List<String> ids = new ArrayList<>();
    for (DongDeNghi d : ds) {
      if (c.loaiHang(d.getLoaiHang()) == null) throw ApiException.invalid("Không có mã " + d.getLoaiHang());
      DeNghiVatTu dn = new DeNghiVatTu(c.uid("DN"), c.nextSo("DN", ngay), ngay, hdbId, c.me(),
          new ArrayList<>(List.of(new DongDeNghi(c.uid("DND"), d.getLoaiHang(), Texts.trim(d.getTenHang()), d.getSoLuong(),
              Texts.trimToNull(d.getGhiChu()), Texts.emptyToNull(d.getDongBanId())))),
          Texts.trimToNull(ghiChu), null);
      Ctx.upsert(c.db().getDeNghiVatTu(), dn, DeNghiVatTu::getId);
      ids.add(dn.getId());
    }
    return ids;
  }

  public void huyDeNghiVatTu(Ctx c, String id, String lyDo) {
    DeNghiVatTu dn = c.deNghi(id);
    if (dn == null) throw ApiException.notFound("Không tìm thấy đề nghị");
    c.require(Perm.hdb, Level.edit, sale(c.hdb(dn.getHdbId())));
    if (Texts.blank(lyDo)) throw ApiException.invalid("Cần lý do huỷ");
    if (c.db().getHopDongMua().stream().anyMatch(m -> !TrangThai.HUY.equals(m.getTrangThai())
        && m.getChiTiet().stream().anyMatch(d -> id.equals(d.getDnvtId()))))
      throw ApiException.conflict("Đề nghị đã lên HĐ mua — bỏ dòng ở HĐ mua trước khi huỷ");
    dn.setLyDoHuy(lyDo.trim());
  }
}
