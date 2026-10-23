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
import vn.oxymecie.appoxy.domain.model.ChiPhiPT;
import vn.oxymecie.appoxy.domain.model.DoiChieuPT;
import vn.oxymecie.appoxy.domain.model.DongTienPT;
import vn.oxymecie.appoxy.domain.model.DotKHTraPT;
import vn.oxymecie.appoxy.domain.model.DotPTTraNCC;
import vn.oxymecie.appoxy.domain.model.HopDongMua;
import vn.oxymecie.appoxy.domain.model.HopDongPhuTai;
import vn.oxymecie.appoxy.domain.model.TyLePTLog;
import vn.oxymecie.appoxy.domain.perm.Perm;

/** HĐ Phú Tài & quỹ ảo (PT-01…11). */
@Service
public class PhuTaiService {
  public static final List<String> TRANG_THAI = List.of(TrangThai.BAO_GIA, TrangThai.HIEU_LUC, TrangThai.DANG_THUC_HIEN, TrangThai.HOAN_THANH, TrangThai.DA_TAT_TOAN, TrangThai.HUY);
  private static final List<String> THU_TU = List.of(TrangThai.BAO_GIA, TrangThai.HIEU_LUC, TrangThai.DANG_THUC_HIEN, TrangThai.HOAN_THANH, TrangThai.DA_TAT_TOAN);
  private static final Set<String> LOAI_TIEN = Set.of("VNĐ", "USD", "RMB");

  public boolean ptKhoa(Ctx c, HopDongPhuTai p) {
    return TrangThai.DA_TAT_TOAN.equals(p.getTrangThai()) || TrangThai.HUY.equals(p.getTrangThai()) || c.dangChoXoa("HopDongPhuTai", p.getId());
  }

  private static String cachChia(HopDongPhuTai p) {
    return p.getCachChia() == null ? "Nhân" : p.getCachChia();
  }

  /** lyDoTyLe: bắt buộc khi đổi tỷ lệ chia (ghi vào lịch sử tỷ lệ). */
  public HopDongPhuTai savePt(Ctx c, HopDongPhuTai input, String lyDoTyLe, boolean isNew) {
    c.require(Perm.phuTai);
    HopDongPhuTai p = c.copy(input, HopDongPhuTai.class);
    HopDongPhuTai cu = isNew ? null : c.pt(p.getId());
    if (!isNew && cu == null) throw ApiException.notFound("Không tìm thấy HĐ");
    if (cu != null && ptKhoa(c, cu)) throw ApiException.conflict("HĐ đã khoá");
    p.setTrangThai(cu == null ? TrangThai.BAO_GIA : cu.getTrangThai());
    p.setLyDoHuy(cu == null ? null : cu.getLyDoHuy());
    p.setTyLeLog(cu == null ? new ArrayList<>() : new ArrayList<>(cu.getTyLeLog()));
    p.setTaoLuc(cu == null ? c.now() : cu.getTaoLuc());
    if (cu != null) p.setLaImport(cu.getLaImport());
    if (Texts.blank(p.getSoHD())) throw ApiException.invalid("Số HĐ là bắt buộc");
    final String id = p.getId();
    final String soHD = p.getSoHD();
    if (c.db().getHopDongPhuTai().stream().anyMatch(x -> !x.getId().equals(id) && Texts.fold(x.getSoHD()).equals(Texts.fold(soHD))))
      throw ApiException.conflict("Số HĐ " + p.getSoHD() + " đã tồn tại");
    if (Texts.blank(p.getMaKH())) throw ApiException.invalid("Chưa chọn Khách hàng cuối");
    if (c.kh(p.getMaKH()) == null) throw ApiException.invalid("Khách hàng không tồn tại");
    if (p.getNgayKy() != null && p.getNgayHieuLuc() != null && p.getNgayHieuLuc().compareTo(p.getNgayKy()) < 0)
      throw ApiException.invalid("Ngày hiệu lực phải ≥ Ngày ký");
    if (p.getVat() != 0 && p.getVat() != 8 && p.getVat() != 10) throw ApiException.invalid("VAT chỉ 0, 8 hoặc 10%");
    if (p.getTruocVAT() < 0) throw ApiException.invalid("Giá bán phải ≥ 0");
    if (p.getHoaHongGiaTri() < 0) throw ApiException.invalid("Hoa hồng phải ≥ 0");
    if (!"Số tiền".equals(p.getHoaHongKieu()) && !"%".equals(p.getHoaHongKieu())) throw ApiException.invalid("Kiểu hoa hồng không hợp lệ");
    if (p.getCachChia() != null && !List.of("Nhân", "Cộng").contains(p.getCachChia())) throw ApiException.invalid("Cách chia không hợp lệ");
    if (p.getTyLeThue() < 0 || p.getTyLeThue() > 1 || p.getTyLeGiu() < 0 || p.getTyLeGiu() > 1)
      throw ApiException.invalid("Tỷ lệ thuế / Phú Tài giữ phải từ 0 đến 100%");
    Set<String> seen = new HashSet<>();
    for (ChiPhiPT x : p.getChiPhi()) {
      if (x.getSoTien() < 0) throw ApiException.invalid("Chi phí phải ≥ 0");
      if (x.getLoai() == null || !List.of("Vận chuyển", "Hải quan", "Khác").contains(x.getLoai())) throw ApiException.invalid("Loại chi phí Phú Tài không hợp lệ");
      if (!Ids.safe(x.getId()) || !seen.add(x.getId())) x.setId(c.uid("CPPT"));
    }
    for (DotKHTraPT x : p.getDotKH()) if (x.getSoTien() < 0 || Texts.blank(x.getNgay())) throw ApiException.invalid("Mỗi đợt khách hàng trả cần Ngày và Số tiền ≥ 0");
    long sauVAT = Calc.ptCalc(p, c.db()).sauVAT();
    long tongKH = 0;
    for (DotKHTraPT x : p.getDotKH()) tongKH += x.getSoTien();
    if (sauVAT > 0 && tongKH > sauVAT) throw ApiException.invalid("Tổng các đợt khách hàng trả vượt Giá bán sau VAT");
    seen.clear();
    for (DotPTTraNCC x : p.getDotTraNCC()) {
      if (Texts.blank(x.getHdmId())) throw ApiException.invalid("Dòng \"Phú Tài trả NCC\" chưa chọn HĐ mua");
      if (x.getSoTien() < 0 || Texts.blank(x.getNgay())) throw ApiException.invalid("Dòng \"Phú Tài trả NCC\" cần Ngày và Số tiền ≥ 0");
      if (x.getLoaiTien() == null || !LOAI_TIEN.contains(x.getLoaiTien())) throw ApiException.invalid("Loại tiền không hợp lệ");
      if (!"VNĐ".equals(x.getLoaiTien()) && !(x.getTyGia() > 0)) throw ApiException.invalid("Dòng \"Phú Tài trả NCC\" bằng ngoại tệ cần Tỷ giá > 0");
      if (!Ids.safe(x.getId()) || !seen.add(x.getId())) x.setId(c.uid("TN"));
    }
    seen.clear();
    for (DoiChieuPT x : p.getDoiChieu()) {
      if (x.getLoaiTien() == null || !LOAI_TIEN.contains(x.getLoaiTien())) throw ApiException.invalid("Loại tiền không hợp lệ");
      if (!"VNĐ".equals(x.getLoaiTien()) && x.getSoTienNguyenTe() > 0 && !(x.getTyGia() > 0))
        throw ApiException.invalid("Dòng đối chiếu bằng ngoại tệ cần Tỷ giá > 0");
      if (x.getSoTienVND() < 0 || x.getSoTienNguyenTe() < 0) throw ApiException.invalid("Số tiền đối chiếu không âm");
      if (!Ids.safe(x.getId()) || !seen.add(x.getId())) x.setId(c.uid("DC"));
    }
    Set<String> ok = new HashSet<>();
    for (HopDongMua m : c.db().getHopDongMua()) if (m.isThuocPhuTai()) ok.add(m.getId());
    if (p.getHdMua().stream().anyMatch(x -> !ok.contains(x))) throw ApiException.invalid("Chỉ chọn HĐ Mua có cờ \"Thuộc Phú Tài\"");
    if (new HashSet<>(p.getHdMua()).size() != p.getHdMua().size()) throw ApiException.invalid("HĐ mua bị chọn trùng");
    // P2-08: một HĐ mua chỉ làm giá đầu vào cho một HĐ Phú Tài.
    List<String> moiThem = p.getHdMua().stream().filter(x -> cu == null || !cu.getHdMua().contains(x)).toList();
    HopDongPhuTai trung = c.db().getHopDongPhuTai().stream()
        .filter(x -> !x.getId().equals(id) && x.getHdMua().stream().anyMatch(moiThem::contains)).findFirst().orElse(null);
    if (trung != null) {
      List<String> so = trung.getHdMua().stream().filter(moiThem::contains)
          .map(x -> c.hdm(x) == null ? x : c.hdm(x).getSoHD()).toList();
      throw ApiException.conflict("HĐ mua " + String.join(", ", so) + " đang là giá đầu vào của HĐ Phú Tài " + trung.getSoHD());
    }
    if (cu != null && (cu.getTyLeThue() != p.getTyLeThue() || cu.getTyLeGiu() != p.getTyLeGiu() || !cachChia(cu).equals(cachChia(p)))) {
      if (!c.canEdit(Perm.phuTaiTyLe)) throw ApiException.forbidden("Cần quyền \"Sửa tỷ lệ chia lợi nhuận\" (PT-06)");
      if (Texts.blank(lyDoTyLe)) throw ApiException.invalid("Đổi tỷ lệ chia cần ghi lý do");
      p.getTyLeLog().add(new TyLePTLog(
          "Thuế " + Money.phanTram(cu.getTyLeThue()) + " · PT giữ " + Money.phanTram(cu.getTyLeGiu()) + " · chia " + cachChia(cu),
          "Thuế " + Money.phanTram(p.getTyLeThue()) + " · PT giữ " + Money.phanTram(p.getTyLeGiu()) + " · chia " + cachChia(p),
          c.me(), c.now(), lyDoTyLe.trim()));
    }
    if (isNew) p.setId(Ids.safe(p.getId()) && c.pt(p.getId()) == null ? p.getId() : c.uid("HDPT"));
    Ctx.upsert(c.db().getHopDongPhuTai(), p, HopDongPhuTai::getId);
    syncDongTienTuDoiChieu(c, p);
    return p;
  }

  public void chuyenTrangThaiPt(Ctx c, String id, String toi, String lyDoHuy) {
    HopDongPhuTai p = c.pt(id);
    if (p == null) throw ApiException.notFound("Không tìm thấy HĐ");
    c.require(Perm.phuTai);
    if (ptKhoa(c, p)) throw ApiException.conflict("HĐ đã khoá (Đã tất toán, Huỷ hoặc đang chờ xoá)");
    if (!TrangThai.HUY.equals(toi) && THU_TU.indexOf(toi) != THU_TU.indexOf(p.getTrangThai()) + 1)
      throw ApiException.conflict("Không chuyển được từ \"" + TrangThai.nhan(p.getTrangThai()) + "\" sang \"" + TrangThai.nhan(toi) + "\"");
    if (TrangThai.HIEU_LUC.equals(toi) && (Texts.blank(p.getSoHD()) || Texts.blank(p.getNgayKy()) || p.getTruocVAT() <= 0))
      throw ApiException.invalid("Cần Số HĐ, Ngày ký và Giá bán");
    if (TrangThai.DA_TAT_TOAN.equals(toi)) {
      // PT-03 (F-04): KH đã trả Phú Tài đủ VÀ Σ "Chi từ PT" của HĐ ≥ Oxy được hưởng (gộp).
      Calc.PtCalc x = Calc.ptCalc(p, c.db());
      if (x.khDaTra() < x.sauVAT()) throw ApiException.invalid("Khách hàng chưa trả Phú Tài đủ (còn " + Money.vnd(x.sauVAT() - x.khDaTra()) + ")");
      long daChuyen = Calc.soDuQuyPT(c.db(), p.getId())[1];
      if (x.oxyGop() > 0 && daChuyen < x.oxyGop())
        throw ApiException.invalid("Phú Tài chưa chuyển đủ phần Oxy được hưởng (đã ghi " + Money.money(daChuyen) + " / "
            + Money.vnd(x.oxyGop()) + " ở sổ dòng tiền, chiều \"Chi từ PT\")");
    }
    if (TrangThai.HUY.equals(toi) && Texts.blank(lyDoHuy)) throw ApiException.invalid("Huỷ HĐ cần ghi lý do");
    p.setTrangThai(toi);
    if (TrangThai.HUY.equals(toi)) p.setLyDoHuy(lyDoHuy.trim());
  }

  /** PT-08 → PT-09: mỗi dòng "Oxy chuyển PT" sinh 1 dòng "Thu về PT" tự động trong quỹ ảo. */
  void syncDongTienTuDoiChieu(Ctx c, HopDongPhuTai p) {
    List<DongTienPT> rows = c.db().getDongTienPT();
    List<DongTienPT> giu = rows.stream().filter(r -> !("Tự động".equals(r.getNguon()) && Objects.equals(r.getHdptId(), p.getId()))).toList();
    List<DongTienPT> auto = new ArrayList<>();
    for (DoiChieuPT d : p.getDoiChieu()) {
      if (!(d.getSoTienVND() > 0) || Texts.blank(d.getNgayOxyChuyen())) continue;
      auto.add(new DongTienPT("DT-" + d.getId(), d.getNgayOxyChuyen(), "Thu về PT", p.getId(), d.getSoTienVND(), "Tự động", d.getId(),
          "Oxy chuyển Phú Tài — " + p.getSoHD()));
    }
    List<DongTienPT> out = new ArrayList<>(auto);
    out.addAll(giu);
    rows.clear();
    rows.addAll(out);
  }

  public DongTienPT themDongTienTay(Ctx c, DongTienPT d) {
    c.require(Perm.phuTai);
    if (Texts.blank(d.getNgay()) || !(d.getSoTien() > 0)) throw ApiException.invalid("Cần Ngày và Số tiền > 0");
    if (Texts.blank(d.getGhiChu())) throw ApiException.invalid("Dòng điều chỉnh tay cần lý do");
    if (!"Thu về PT".equals(d.getChieu()) && !"Chi từ PT".equals(d.getChieu())) throw ApiException.invalid("Chiều dòng tiền không hợp lệ");
    String hdptId = Texts.emptyToNull(d.getHdptId());
    HopDongPhuTai pt = hdptId == null ? null : c.pt(hdptId);
    if (hdptId != null && pt == null) throw ApiException.invalid("HĐ Phú Tài không tồn tại");
    if (pt != null && ptKhoa(c, pt)) throw ApiException.conflict("HĐ " + pt.getSoHD() + " đã khoá — không ghi thêm dòng tiền");
    DongTienPT out = new DongTienPT(c.uid("DT"), d.getNgay(), d.getChieu(), hdptId, d.getSoTien(), "Nhập tay", null, d.getGhiChu());
    Ctx.upsert(c.db().getDongTienPT(), out, DongTienPT::getId);
    return out;
  }
}
