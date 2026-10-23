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
import vn.oxymecie.appoxy.domain.model.ChecklistItem;
import vn.oxymecie.appoxy.domain.model.DongHangMua;
import vn.oxymecie.appoxy.domain.model.DongPhieuKho;
import vn.oxymecie.appoxy.domain.model.DotTTMua;
import vn.oxymecie.appoxy.domain.model.HopDongMua;
import vn.oxymecie.appoxy.domain.model.HopDongPhuTai;
import vn.oxymecie.appoxy.domain.model.NguonPhatSinh;
import vn.oxymecie.appoxy.domain.model.PhieuKho;
import vn.oxymecie.appoxy.domain.model.PhieuThuChi;
import vn.oxymecie.appoxy.domain.perm.Perm;

/** Hợp đồng mua (HDM-01…10). */
@Service
public class HdmService {
  public static final List<String> TRANG_THAI = List.of(TrangThai.NHAP, TrangThai.DA_KY, TrangThai.DANG_NHAN_HANG, TrangThai.DA_NHAN_DU, TrangThai.DA_TAT_TOAN, TrangThai.HUY);
  private static final Set<String> LOAI_TIEN = Set.of("VNĐ", "USD", "RMB");

  private final KhoService kho;

  public HdmService(KhoService kho) {
    this.kho = kho;
  }

  public boolean hdmKhoa(Ctx c, HopDongMua m) {
    return TrangThai.DA_TAT_TOAN.equals(m.getTrangThai()) || TrangThai.HUY.equals(m.getTrangThai()) || c.dangChoXoa("HopDongMua", m.getId());
  }

  /** Đợt trả NCC đã có phiếu chi còn hiệu lực (chưa bị từ chối) → khoá số tiền / hạn. */
  public boolean dotMuaKhoa(Ctx c, DotTTMua d) {
    PhieuThuChi p = d.getPhieuChiId() == null ? null : c.phieu(d.getPhieuChiId());
    return p != null && !TrangThai.TU_CHOI.equals(p.getTrangThai());
  }

  public HopDongMua saveHdm(Ctx c, HopDongMua input, boolean isNew) {
    HopDongMua m = c.copy(input, HopDongMua.class);
    HopDongMua cu = isNew ? null : c.hdm(m.getId());
    if (!isNew && cu == null) throw ApiException.notFound("Không tìm thấy HĐ");
    boolean canAll = c.canEdit(Perm.hdm);
    boolean canTab4 = c.canEdit(Perm.hdmTab4);
    if (!canAll && !(canTab4 && cu != null)) throw ApiException.forbidden("Tài khoản của bạn không có quyền sửa HĐ mua");
    if (cu != null && hdmKhoa(c, cu)) throw ApiException.conflict("HĐ đã khoá");
    if (!canAll) {
      // Kế toán chỉ sửa Tab 4.
      HopDongMua t4 = c.copy(cu, HopDongMua.class);
      t4.setDotTT(m.getDotTT());
      t4.setXuatHoaDon(m.getXuatHoaDon());
      t4.setChecklist(m.getChecklist());
      t4.setNhapTay(m.isNhapTay());
      t4.setTongNhapTay(m.getTongNhapTay());
      t4.setLyDoNhapTay(m.getLyDoNhapTay());
      m = t4;
    }
    // Trạng thái chỉ đổi qua lệnh chuyển trạng thái / nhập kho.
    m.setTrangThai(cu == null ? TrangThai.NHAP : cu.getTrangThai());
    m.setTaoLuc(cu == null ? c.now() : cu.getTaoLuc());
    if (cu != null) m.setLaImport(cu.getLaImport());
    if (Texts.blank(m.getSoHD())) throw ApiException.invalid("Số HĐ mua là bắt buộc");
    final String id = m.getId();
    final String soHD = m.getSoHD();
    if (c.db().getHopDongMua().stream().anyMatch(x -> !x.getId().equals(id) && Texts.fold(x.getSoHD()).equals(Texts.fold(soHD))))
      throw ApiException.conflict("Số HĐ mua " + m.getSoHD() + " đã tồn tại");
    if (Texts.blank(m.getMaNCC())) throw ApiException.invalid("Chưa chọn Nhà cung cấp");
    if (c.ncc(m.getMaNCC()) == null) throw ApiException.invalid("Nhà cung cấp không tồn tại");
    m.setHdbId(Texts.emptyToNull(m.getHdbId()));
    if (m.getHdbId() != null && c.hdb(m.getHdbId()) == null) throw ApiException.invalid("HĐ bán liên quan không tồn tại");
    if (m.isNhapTay() && Texts.blank(m.getLyDoNhapTay())) throw ApiException.invalid("Nhập tay tổng giá trị cần ghi lý do");
    if (m.getTongNhapTay() != null && m.getTongNhapTay() < 0) throw ApiException.invalid("Tổng giá trị không âm");
    if (m.getDotTT().size() > c.cauHinh().getSoDotToiDa()) throw ApiException.invalid("Tối đa " + c.cauHinh().getSoDotToiDa() + " đợt thanh toán");
    if (!"Đã".equals(m.getXuatHoaDon()) && !"Chưa".equals(m.getXuatHoaDon())) m.setXuatHoaDon("Chưa");
    if (m.getChecklist() == null || m.getChecklist().isEmpty()) {
      List<ChecklistItem> cl = new ArrayList<>();
      for (String ten : Calc.CHECKLIST_HDM) cl.add(new ChecklistItem(ten, false, null));
      m.setChecklist(cl);
    }
    Set<String> dongIds = new HashSet<>();
    for (DongHangMua d : m.getChiTiet()) {
      if (Texts.blank(d.getLoaiHang())) throw ApiException.invalid("Có dòng hàng chưa chọn Loại hàng");
      if (c.loaiHang(d.getLoaiHang()) == null) throw ApiException.invalid("Không có mã " + d.getLoaiHang());
      if (!(d.getSoLuong() > 0)) throw ApiException.invalid("Số lượng mỗi dòng phải > 0");
      if (d.getLoaiTien() == null || !LOAI_TIEN.contains(d.getLoaiTien())) throw ApiException.invalid("Loại tiền không hợp lệ");
      if (!"VNĐ".equals(d.getLoaiTien()) && !(d.getTyGia() > 0)) throw ApiException.invalid("Dòng ngoại tệ cần Tỷ giá");
      if ("VNĐ".equals(d.getLoaiTien())) d.setTyGia(1);
      if (d.getDonGia() < 0) throw ApiException.invalid("Đơn giá không âm");
      if (!Ids.safe(d.getId()) || !dongIds.add(d.getId())) d.setId(c.uid("DM"));
      d.setHdbId(Texts.emptyToNull(d.getHdbId()));
      if (d.getHdbId() != null && c.hdb(d.getHdbId()) == null) throw ApiException.invalid("HĐ bán của dòng hàng không tồn tại");
      // Dòng hàng mới không được trùng id với dòng của HĐ mua khác.
      final String did = d.getId();
      if (c.db().getHopDongMua().stream().anyMatch(x -> !x.getId().equals(id) && x.getChiTiet().stream().anyMatch(y -> y.getId().equals(did))))
        d.setId(c.uid("DM"));
    }
    Set<Integer> so = new HashSet<>();
    for (DotTTMua d : m.getDotTT()) {
      if (!so.add(d.getDot())) throw ApiException.invalid("Số đợt thanh toán bị trùng");
      if (d.getSoTien() < 0) throw ApiException.invalid("Số tiền đợt không âm");
      DotTTMua old = cu == null ? null : cu.getDotTT().stream().filter(x -> x.getDot() == d.getDot()).findFirst().orElse(null);
      // Phiếu chi chỉ gắn qua ghi nhận trả NCC.
      d.setPhieuChiId(old == null ? null : old.getPhieuChiId());
      if (old != null && old.getPhieuChiId() != null && !m.isThuocPhuTai()) {
        d.setNgayTra(old.getNgayTra());
        d.setSoTienTra(old.getSoTienTra());
        d.setNguonTien(old.getNguonTien());
      }
      d.setNguonTien(Texts.emptyToNull(d.getNguonTien()));
      if (d.getNguonTien() != null && c.nguon(d.getNguonTien()) == null) throw ApiException.invalid("Nguồn tiền không tồn tại");
    }
    if (cu != null) {
      for (DotTTMua old : cu.getDotTT())
        if (old.getPhieuChiId() != null && c.phieu(old.getPhieuChiId()) != null && !so.contains(old.getDot()))
          throw ApiException.conflict("Đợt " + old.getDot() + " đã có phiếu chi — không bỏ đợt này");
      for (DongHangMua d : cu.getChiTiet()) {
        double daNhap = Calc.slDaNhap(d.getId(), c.db());
        if (daNhap <= 0) continue;
        DongHangMua moi = m.getChiTiet().stream().filter(x -> x.getId().equals(d.getId())).findFirst().orElse(null);
        if (moi == null) throw ApiException.conflict("Dòng \"" + d.getTenHang() + "\" đã có phiếu nhập — không xoá được");
        if (moi.getSoLuong() < daNhap)
          throw ApiException.conflict("Dòng \"" + d.getTenHang() + "\": SL mua không nhỏ hơn SL đã nhập kho (" + Money.num(daNhap) + ")");
      }
      if (cu.isThuocPhuTai() && !m.isThuocPhuTai()) {
        HopDongPhuTai pt = c.db().getHopDongPhuTai().stream().filter(p -> p.getHdMua().contains(cu.getId())).findFirst().orElse(null);
        if (pt != null) throw ApiException.conflict("HĐ đang là giá đầu vào của HĐ Phú Tài " + pt.getSoHD() + " — bỏ HĐ này khỏi HĐ Phú Tài trước");
      }
      // Đợt đã có phiếu chi (chưa bị từ chối): giữ nguyên số tiền & hạn để khớp phiếu.
      for (DotTTMua d : m.getDotTT()) {
        DotTTMua old = cu.getDotTT().stream().filter(x -> x.getDot() == d.getDot()).findFirst().orElse(null);
        if (old != null && dotMuaKhoa(c, old)) {
          d.setSoTien(old.getSoTien());
          d.setHan(old.getHan());
        }
      }
    }
    Calc.apDungTuDongHdm(m);
    if (isNew) m.setId(Ids.safe(m.getId()) && c.hdm(m.getId()) == null ? m.getId() : c.uid("HDM"));
    Ctx.upsert(c.db().getHopDongMua(), m, HopDongMua::getId);
    final String hdmId = m.getId();
    // Đổi SL mua có thể làm đổi Đang nhận hàng ↔ Đã nhận đủ — chỉ tính lại khi HĐ đã có phiếu nhập tự động.
    if (cu != null && c.db().getPhieuKho().stream()
        .anyMatch(p -> hdmId.equals(p.getHdId()) && "Tự động HĐ Mua".equals(p.getNguonGoc()) && TrangThai.HIEU_LUC.equals(p.getTrangThai())))
      capNhatTrangThaiNhan(c, hdmId);
    return m;
  }

  public void chuyenTrangThaiHdm(Ctx c, String id, String toi) {
    HopDongMua m = c.hdm(id);
    if (m == null) throw ApiException.notFound("Không tìm thấy HĐ");
    c.require(Perm.hdm);
    if (toi == null || !TRANG_THAI.contains(toi)) throw ApiException.invalid("Trạng thái không hợp lệ");
    if (hdmKhoa(c, m)) throw ApiException.conflict("HĐ đã khoá (Đã tất toán, Huỷ hoặc đang chờ xoá)");
    // Trạng thái nhận hàng do phiếu nhập tự chuyển — tay chỉ chuyển Đã ký / Đã tất toán / Huỷ.
    if (!List.of(TrangThai.DA_KY, TrangThai.DA_TAT_TOAN, TrangThai.HUY).contains(toi)) throw ApiException.conflict("Trạng thái \"" + TrangThai.nhan(toi) + "\" do nhập kho tự chuyển");
    if (TrangThai.DA_KY.equals(toi) && !TrangThai.NHAP.equals(m.getTrangThai())) throw ApiException.conflict("Chỉ HĐ Nháp mới chuyển \"Đã ký\"");
    Calc.HdmCalc c2 = Calc.hdmCalc(m, c.db());
    if (TrangThai.DA_KY.equals(toi)) {
      if (Texts.blank(m.getSoHD()) || Texts.blank(m.getMaNCC()) || Texts.blank(m.getNgayKy())) throw ApiException.invalid("Cần Số HĐ, NCC và Ngày ký");
      if (m.getChiTiet().isEmpty() && c2.tong() <= 0) throw ApiException.invalid("Cần ít nhất 1 dòng hàng hoặc tổng giá trị");
    }
    if (TrangThai.DA_TAT_TOAN.equals(toi)) {
      if (TrangThai.NHAP.equals(m.getTrangThai())) throw ApiException.conflict("HĐ chưa ký");
      if (!m.isThuocPhuTai() && c2.slMua() > 0 && !TrangThai.DA_NHAN_DU.equals(m.getTrangThai()) && c2.slNhap() < c2.slMua())
        throw ApiException.invalid("Chưa nhận đủ hàng (đã nhập " + Money.num(c2.slNhap()) + " / " + Money.num(c2.slMua()) + ")");
      if (c2.conPhaiTra() > 0) throw ApiException.invalid("Còn phải trả NCC " + Money.vnd(c2.conPhaiTra()));
      if (!"Đã".equals(m.getXuatHoaDon())) throw ApiException.invalid("NCC chưa xuất hoá đơn");
      List<String> thieu = Calc.hoSoThieu(c.db(), "HDM", m.getId());
      if (!thieu.isEmpty()) throw ApiException.invalid("Thiếu hồ sơ: " + String.join(", ", thieu));
    }
    if (TrangThai.HUY.equals(toi)) {
      if (c2.slNhap() > 0 || c2.daTra() > 0) throw ApiException.conflict("Chỉ huỷ khi chưa có phiếu nhập và chưa trả tiền");
      if (m.getDotTT().stream().anyMatch(d -> dotMuaKhoa(c, d)))
        throw ApiException.conflict("Còn phiếu chi trả NCC đang chờ duyệt — từ chối hoặc xoá phiếu chi trước");
    }
    m.setTrangThai(toi);
  }

  /** HDM-03-ML: mở lại HĐ mua đã tất toán → về trạng thái nhận hàng tương ứng. */
  public void moLaiHdm(Ctx c, String id) {
    if (!c.canEdit(Perm.moLaiHdm)) throw ApiException.forbidden("Cần quyền \"Mở lại HĐ mua đã tất toán\" (HDM-03-ML)");
    HopDongMua m = c.hdm(id);
    if (m == null) throw ApiException.notFound("Không tìm thấy HĐ");
    if (!TrangThai.DA_TAT_TOAN.equals(m.getTrangThai())) throw ApiException.conflict("Chỉ mở lại HĐ đã tất toán");
    if (c.dangChoXoa("HopDongMua", id)) throw ApiException.conflict("HĐ đang chờ xoá");
    Calc.HdmCalc x = Calc.hdmCalc(m, c.db());
    boolean imp = Boolean.TRUE.equals(m.getLaImport());
    String toi = m.isThuocPhuTai() || x.slMua() == 0 ? TrangThai.DA_KY
        : x.slNhap() >= x.slMua() || (imp && x.slNhap() == 0) ? TrangThai.DA_NHAN_DU
        : x.slNhap() > 0 ? TrangThai.DANG_NHAN_HANG : TrangThai.DA_KY;
    m.setTrangThai(toi);
  }

  public record DongNhap(String dongId, double soLuong) {}

  /** HDM-06: nhập kho các dòng chọn → 1 phiếu Nhập kho tự động (mỗi dòng một lô). */
  public PhieuKho nhapKho(Ctx c, String hdmId, String ngay, String khoId, List<DongNhap> dongVao, String ghiChu, String soHoaDon, Double vat) {
    c.require(Perm.hdmNhapKho);
    HopDongMua m = c.hdm(hdmId);
    if (m == null) throw ApiException.notFound("Không tìm thấy HĐ");
    if (m.isThuocPhuTai()) throw ApiException.conflict("HĐ thuộc Phú Tài không nhập kho Oxy");
    if (TrangThai.NHAP.equals(m.getTrangThai()) || TrangThai.HUY.equals(m.getTrangThai())) throw ApiException.conflict("HĐ chưa ký hoặc đã huỷ");
    if (hdmKhoa(c, m)) throw ApiException.conflict("HĐ đã khoá");
    if (Texts.blank(khoId)) throw ApiException.invalid("Chưa chọn Vị trí kho");
    if (c.kho(khoId) == null) throw ApiException.invalid("Vị trí kho không tồn tại");
    if (Texts.blank(ngay)) throw ApiException.invalid("Chưa chọn Ngày");
    if (!"Đã".equals(m.getXuatHoaDon()))
      throw ApiException.invalid("NCC chưa xuất hoá đơn — chọn \"NCC đã xuất hoá đơn: Đã\" ở Tab 4 trước khi nhập kho");
    if (Texts.blank(soHoaDon)) throw ApiException.invalid("Cần Số hoá đơn NCC");
    List<DongPhieuKho> dong = new ArrayList<>();
    for (DongNhap x : dongVao == null ? List.<DongNhap>of() : dongVao) {
      if (!(x.soLuong() > 0)) continue;
      DongHangMua d = m.getChiTiet().stream().filter(y -> y.getId().equals(x.dongId())).findFirst().orElse(null);
      if (d == null) continue;
      double con = d.getSoLuong() - Calc.slDaNhap(d.getId(), c.db());
      if (x.soLuong() > con) throw ApiException.invalid("\"" + d.getTenHang() + "\": SL thực nhập vượt SL còn lại (" + Money.num(con) + ")");
      dong.add(new DongPhieuKho(d.getLoaiHang(), d.getThongSo(), x.soLuong(), null, (double) Math.round(Calc.donGiaVND(d)), vat, d.getId(),
          null, null, d.getGhiChu()));
    }
    if (dong.isEmpty()) throw ApiException.invalid("Chưa có dòng nào có SL thực nhập > 0");
    String soPhieu = c.nextSo(c.cauHinh().getTienToNK(), ngay);
    Set<String> daCo = kho.loDaCo(c);
    for (int i = 0; i < dong.size(); i++) dong.get(i).setLo(kho.maLoMoi(soPhieu, soHoaDon, i, daCo));
    PhieuKho p = new PhieuKho(c.uid("PK"), soPhieu, ngay, "Nhập", "Tự động HĐ Mua", hdmId, khoId, null, c.me(), TrangThai.HIEU_LUC, ghiChu,
        dong, Texts.trimToNull(soHoaDon), m.getMaNCC(), null);
    Ctx.upsert(c.db().getPhieuKho(), p, PhieuKho::getId);
    capNhatTrangThaiNhan(c, hdmId);
    return p;
  }

  /** Đang nhận hàng / Đã nhận đủ tự chuyển theo phiếu nhập (HDM-03); tích checklist "Nhập kho". */
  public void capNhatTrangThaiNhan(Ctx c, String hdmId) {
    HopDongMua m = c.hdm(hdmId);
    if (m == null || TrangThai.DA_TAT_TOAN.equals(m.getTrangThai()) || TrangThai.HUY.equals(m.getTrangThai()) || TrangThai.NHAP.equals(m.getTrangThai())) return;
    Calc.HdmCalc x = Calc.hdmCalc(m, c.db());
    String toi = x.slNhap() <= 0 ? TrangThai.DA_KY : x.slNhap() >= x.slMua() ? TrangThai.DA_NHAN_DU : TrangThai.DANG_NHAN_HANG;
    for (ChecklistItem it : m.getChecklist()) {
      if (!Calc.CL_NHAP_KHO.equals(it.getTen())) continue;
      it.setXong(TrangThai.DA_NHAN_DU.equals(toi));
      it.setNgay(TrangThai.DA_NHAN_DU.equals(toi) ? c.today() : null);
    }
    m.setTrangThai(toi);
  }

  /** HDM-08: ghi nhận trả NCC → phiếu Chi Chờ duyệt (HĐ thuộc Phú Tài chỉ ghi số đã trả). */
  public PhieuThuChi ghiTraNCC(Ctx c, String hdmId, int dot, String ngayTra, long soTienTra, String nguonTien) {
    c.require(Perm.hdmTab4);
    HopDongMua m = c.hdm(hdmId);
    if (m == null) throw ApiException.notFound("Không tìm thấy HĐ");
    if (hdmKhoa(c, m)) throw ApiException.conflict("HĐ đã khoá");
    DotTTMua d = m.getDotTT().stream().filter(x -> x.getDot() == dot).findFirst().orElse(null);
    if (d == null) throw ApiException.notFound("Không có đợt này");
    if (Texts.blank(ngayTra) || !(soTienTra > 0)) throw ApiException.invalid("Cần Ngày trả và Số tiền > 0");
    if (m.isThuocPhuTai()) {
      d.setNgayTra(ngayTra);
      d.setSoTienTra(soTienTra);
      return null;
    }
    if (Texts.blank(nguonTien)) throw ApiException.invalid("Chưa chọn Nguồn tiền");
    if (c.nguon(nguonTien) == null) throw ApiException.invalid("Nguồn tiền không tồn tại");
    PhieuThuChi cu = d.getPhieuChiId() == null ? null : c.phieu(d.getPhieuChiId());
    if (cu != null && TrangThai.DA_DUYET.equals(cu.getTrangThai()))
      throw ApiException.conflict("Phiếu chi của đợt này đã duyệt — muốn sửa thì bấm \"Yêu cầu xoá phiếu\" ở dòng đợt, duyệt xong ghi lại");
    PhieuThuChi p = cu != null ? cu : HdbService.phieuMoi(c, "Chi");
    p.setLoai("Chi");
    p.setNgayLap(ngayTra);
    p.setNguonTien(nguonTien);
    p.setNoiDung("Trả NCC đợt " + dot + " — HĐ mua " + m.getSoHD() + " (" + m.getTenNCC() + ")");
    p.setSoTienChi(soTienTra);
    p.setSoTienThu(0);
    p.setTrangThai(TrangThai.CHO_DUYET);
    p.setLyDoTuChoi(null);
    p.setPhatSinh(new NguonPhatSinh("HDM-DotTT", m.getId(), dot));
    p.setLichSu(KeToanService.ghiLichSu(c, cu == null ? null : cu.getLichSu(), "Gửi duyệt", cu != null ? "Sửa ghi nhận trả NCC" : "Sinh từ ghi nhận trả NCC"));
    if (p.getId() == null) {
      p.setId(c.uid("PTC"));
      p.setSoPhieu(c.nextSoThang(c.cauHinh().getTienToTC(), p.getNgayLap()));
    }
    Ctx.upsert(c.db().getPhieuThuChi(), p, PhieuThuChi::getId);
    d.setNgayTra(ngayTra);
    d.setSoTienTra(soTienTra);
    d.setNguonTien(nguonTien);
    d.setPhieuChiId(p.getId());
    return p;
  }

  static boolean phieuCuaHdm(PhieuKho p, String hdmId) {
    return Objects.equals(p.getHdId(), hdmId) && "Tự động HĐ Mua".equals(p.getNguonGoc());
  }
}
