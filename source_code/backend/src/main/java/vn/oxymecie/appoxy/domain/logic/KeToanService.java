package vn.oxymecie.appoxy.domain.logic;

import vn.oxymecie.appoxy.domain.model.TrangThai;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Ids;
import vn.oxymecie.appoxy.common.Texts;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.model.ChiPhiHD;
import vn.oxymecie.appoxy.domain.model.FileRef;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.LichSuDuyet;
import vn.oxymecie.appoxy.domain.model.LoaiChiPhi;
import vn.oxymecie.appoxy.domain.model.PhieuThuChi;
import vn.oxymecie.appoxy.domain.perm.Level;
import vn.oxymecie.appoxy.domain.perm.Perm;

/** Kế toán: Sổ quỹ (KT-04…KT-10) và Chi phí thực hiện HĐ (KT-12…KT-15). */
@Service
public class KeToanService {
  public static final List<String> LOAI_PHIEU = List.of("Thu", "Chi", "Tạm ứng", "Quyết toán tạm ứng", "Luân chuyển");

  /** Thêm 1 bước vào lịch sử duyệt (giữ lý do từ chối cũ khi gửi lại). */
  static List<LichSuDuyet> ghiLichSu(Ctx c, List<LichSuDuyet> ls, String hanhDong, String ghiChu) {
    List<LichSuDuyet> out = new ArrayList<>(ls == null ? List.of() : ls);
    out.add(new LichSuDuyet(c.now(), c.me(), hanhDong, ghiChu));
    return out;
  }

  /** Người lập không tự duyệt chứng từ của mình — trừ quyền KT-07-TD (D-10). */
  static boolean tuDuyet(Ctx c, String nguoiLap) {
    return Objects.equals(nguoiLap, c.me()) && !c.canEdit(Perm.tuDuyet);
  }

  /** Thay danh sách tệp client gửi bằng siêu dữ liệu đã lưu ở kho tệp (chặn tệp không tồn tại). */
  static List<FileRef> tepHopLe(Ctx c, List<FileRef> files) {
    List<FileRef> out = new ArrayList<>();
    if (files == null) return out;
    for (FileRef f : files) {
      FileRef that = c.tep(f.getId());
      if (that == null) throw ApiException.invalid("Tệp đính kèm \"" + Texts.nz(f.getName()) + "\" chưa được tải lên máy chủ");
      out.add(that);
    }
    return out;
  }

  // ═════════════════════════════ SỔ QUỸ ═══════════════════════════════

  /** Kiểm tra quy tắc KT-05/08/10; trả danh sách lỗi. */
  public List<String> loiPhieu(Ctx c, PhieuThuChi p) {
    List<String> e = new ArrayList<>();
    if (Texts.blank(p.getNgayLap())) e.add("Chưa có Ngày lập");
    if (Texts.blank(p.getNguonTien())) e.add("Luân chuyển".equals(p.getLoai()) ? "Chưa chọn Nguồn đi" : "Chưa chọn Nguồn tiền");
    if (Texts.blank(p.getNoiDung())) e.add("Chưa nhập Nội dung");
    switch (p.getLoai()) {
      case "Thu" -> {
        if (!(p.getSoTienThu() > 0)) e.add("Số tiền Thu phải > 0");
      }
      case "Chi", "Tạm ứng" -> {
        if (!(p.getSoTienChi() > 0)) e.add("Số tiền Chi phải > 0");
        if (Texts.blank(p.getLoaiChiPhi())) e.add("Chưa chọn Loại chi phí (nhóm Vận hành)");
        if ("Tạm ứng".equals(p.getLoai()) && Texts.blank(p.getNguoiNhan())) e.add("Chưa nhập Người nhận tạm ứng");
      }
      case "Quyết toán tạm ứng" -> {
        if (Texts.blank(p.getPhieuTamUngGoc())) e.add("Chưa chọn phiếu Tạm ứng gốc");
        else if (Calc.tamUngChoQuyetToan(c.db(), p.getId()).stream().noneMatch(x -> x.getId().equals(p.getPhieuTamUngGoc())))
          e.add("Phiếu tạm ứng gốc chưa duyệt hoặc đã được quyết toán");
        if (!((p.getSoTienThucChi() == null ? -1 : p.getSoTienThucChi()) >= 0)) e.add("Chưa nhập Số tiền thực chi");
        if (Texts.blank(p.getLoaiChiPhi())) e.add("Chưa chọn Loại chi phí");
      }
      case "Luân chuyển" -> {
        if (Texts.blank(p.getNguonTienDen())) e.add("Chưa chọn Nguồn đến");
        else if (p.getNguonTienDen().equals(p.getNguonTien())) e.add("Nguồn đi phải khác Nguồn đến");
        if (!(p.getSoTienChi() > 0)) e.add("Số tiền phải > 0");
      }
      default -> e.add("Loại phiếu không hợp lệ");
    }
    return e;
  }

  /** Phiếu sửa được: Nháp / Từ chối, không phải phiếu phát sinh, không chờ xoá, đủ quyền. */
  public boolean phieuSuaDuoc(Ctx c, PhieuThuChi p, boolean isNew) {
    if (!isNew && !TrangThai.NHAP.equals(p.getTrangThai()) && !TrangThai.TU_CHOI.equals(p.getTrangThai())) return false;
    if (p.getPhatSinh() != null) return false;
    if (!isNew && c.dangChoXoa("PhieuThuChi", p.getId())) return false;
    Level l = c.level(Perm.soQuy);
    if (l.atLeast(Level.edit)) return true;
    return l == Level.draft && (isNew || Objects.equals(p.getNguoiDeNghi(), c.me()));
  }

  /** Lưu nháp (gui=false) hoặc Gửi duyệt (gui=true). */
  public PhieuThuChi savePhieu(Ctx c, PhieuThuChi p, boolean gui, boolean isNew) {
    c.require(Perm.soQuy, Level.draft);
    PhieuThuChi cu = isNew ? null : c.phieu(p.getId());
    if (!isNew && cu == null) throw ApiException.notFound("Không tìm thấy phiếu");
    if (!phieuSuaDuoc(c, cu != null ? cu : p, isNew))
      throw ApiException.conflict("Phiếu này không sửa được (đã gửi duyệt, đã duyệt hoặc đang chờ xoá)");
    if (!LOAI_PHIEU.contains(p.getLoai())) throw ApiException.invalid("Loại phiếu không hợp lệ");
    if (Texts.blank(p.getNgayLap())) throw ApiException.invalid("Chưa có Ngày lập");
    if (p.getSoTienThu() < 0 || p.getSoTienChi() < 0 || (p.getSoTienThucChi() != null && p.getSoTienThucChi() < 0))
      throw ApiException.invalid("Số tiền không âm");
    PhieuThuChi clean = c.copy(p, PhieuThuChi.class);
    clean.setNguonTien(Texts.emptyToNull(clean.getNguonTien()));
    clean.setLoaiChiPhi(Texts.emptyToNull(clean.getLoaiChiPhi()));
    // Không cho client tự gắn nguồn phát sinh / cờ import / lịch sử / người duyệt.
    clean.setPhatSinh(null);
    clean.setLaImport(cu == null ? null : cu.getLaImport());
    clean.setNguoiDuyet(cu == null ? null : cu.getNguoiDuyet());
    clean.setNgayDuyet(cu == null ? null : cu.getNgayDuyet());
    clean.setLichSu(cu == null ? null : cu.getLichSu());
    if (c.level(Perm.soQuy) == Level.draft) clean.setNguoiDeNghi(cu == null ? c.me() : cu.getNguoiDeNghi());
    else if (Texts.blank(clean.getNguoiDeNghi())) clean.setNguoiDeNghi(cu == null ? c.me() : cu.getNguoiDeNghi());
    // Chỉ giữ trường của loại phiếu đang chọn.
    if ("Thu".equals(clean.getLoai())) clean.setSoTienChi(0);
    else clean.setSoTienThu(0);
    if ("Quyết toán tạm ứng".equals(clean.getLoai())) clean.setSoTienChi(0);
    if (!"Luân chuyển".equals(clean.getLoai())) clean.setNguonTienDen(null);
    if ("Thu".equals(clean.getLoai()) || "Luân chuyển".equals(clean.getLoai())) clean.setLoaiChiPhi(null);
    if (!"Tạm ứng".equals(clean.getLoai()) && !"Quyết toán tạm ứng".equals(clean.getLoai())) clean.setNguoiNhan(null);
    if (!"Quyết toán tạm ứng".equals(clean.getLoai())) {
      clean.setPhieuTamUngGoc(null);
      clean.setSoTienThucChi(null);
    }
    kiemThamChieu(c, clean.getNguonTien(), clean.getNguonTienDen(), clean.getLoaiChiPhi());
    if (clean.getPhieuTamUngGoc() != null && c.phieu(clean.getPhieuTamUngGoc()) == null) throw ApiException.invalid("Phiếu tạm ứng gốc không tồn tại");
    clean.setFiles(tepHopLe(c, clean.getFiles()));
    if (isNew) {
      clean.setId(Ids.safe(p.getId()) && c.phieu(p.getId()) == null ? p.getId() : c.uid("PTC"));
    }
    if (gui) {
      List<String> loi = loiPhieu(c, clean);
      if (!loi.isEmpty()) throw ApiException.invalid(String.join(" · ", loi));
    }
    if (isNew) clean.setSoPhieu(c.nextSoThang(c.cauHinh().getTienToTC(), clean.getNgayLap()));
    else clean.setSoPhieu(soPhieuTheoThang(c, cu.getSoPhieu(), clean.getNgayLap()));
    String truoc = cu == null ? TrangThai.NHAP : cu.getTrangThai();
    clean.setTrangThai(gui ? TrangThai.CHO_DUYET : TrangThai.NHAP);
    clean.setLyDoTuChoi(gui ? null : cu == null ? null : cu.getLyDoTuChoi());
    if (gui || !TrangThai.NHAP.equals(truoc) || clean.getLichSu() == null || clean.getLichSu().isEmpty())
      clean.setLichSu(ghiLichSu(c, clean.getLichSu(), gui ? "Gửi duyệt" : "Lưu nháp", null));
    Ctx.upsert(c.db().getPhieuThuChi(), clean, PhieuThuChi::getId);
    return clean;
  }

  /** Số phiếu mang yyMM của Ngày lập: phiếu chưa duyệt đổi sang tháng khác thì cấp số mới của tháng đó (số cũ không tái dùng). */
  private static String soPhieuTheoThang(Ctx c, String soCu, String ngayLap) {
    String tienTo = c.cauHinh().getTienToTC() + vn.oxymecie.appoxy.common.Dates.yy(ngayLap) + ngayLap.substring(5, 7) + "-";
    return soCu.startsWith(tienTo) ? soCu : c.nextSoThang(c.cauHinh().getTienToTC(), ngayLap);
  }

  static void kiemThamChieu(Ctx c, String nguon, String nguonDen, String lcp) {
    if (nguon != null && c.nguon(nguon) == null) throw ApiException.invalid("Nguồn tiền không tồn tại");
    if (nguonDen != null && c.nguon(nguonDen) == null) throw ApiException.invalid("Nguồn đến không tồn tại");
    if (lcp != null && c.lcp(lcp) == null) throw ApiException.invalid("Loại chi phí không tồn tại");
  }

  /** Người lập (hoặc người có quyền Sửa sổ quỹ) thao tác được trên phiếu tay chưa duyệt. */
  private boolean chuPhieu(Ctx c, PhieuThuChi p) {
    return p.getPhatSinh() == null
        && (Objects.equals(p.getNguoiDeNghi(), c.me()) ? c.level(Perm.soQuy).atLeast(Level.draft) : c.canEdit(Perm.soQuy));
  }

  /** Phiếu Nháp xoá thẳng, không qua Duyệt xoá. */
  public void xoaNhapPhieu(Ctx c, String id) {
    PhieuThuChi p = c.phieu(id);
    if (p == null) throw ApiException.notFound("Không tìm thấy phiếu");
    if (!TrangThai.NHAP.equals(p.getTrangThai())) throw ApiException.conflict("Chỉ xoá thẳng phiếu Nháp — phiếu khác gửi yêu cầu xoá");
    if (!chuPhieu(c, p)) throw ApiException.forbidden("Tài khoản của bạn không có quyền xoá phiếu này");
    if (c.db().getPhieuThuChi().stream().anyMatch(x -> id.equals(x.getPhieuTamUngGoc())))
      throw ApiException.conflict("Phiếu tạm ứng đã có quyết toán");
    Ctx.drop(c.db().getPhieuThuChi(), PhieuThuChi::getId, id);
  }

  /** Người lập rút phiếu Chờ duyệt về Nháp để sửa. */
  public void rutLaiPhieu(Ctx c, String id) {
    PhieuThuChi p = c.phieu(id);
    if (p == null) throw ApiException.notFound("Không tìm thấy phiếu");
    if (!TrangThai.CHO_DUYET.equals(p.getTrangThai())) throw ApiException.conflict("Chỉ rút lại phiếu đang Chờ duyệt");
    if (!chuPhieu(c, p)) throw ApiException.forbidden("Tài khoản của bạn không có quyền rút phiếu này");
    p.setTrangThai(TrangThai.NHAP);
    p.setLichSu(ghiLichSu(c, p.getLichSu(), "Rút lại", null));
  }

  /** Duyệt hàng loạt — bỏ qua phiếu do chính mình lập (trả cảnh báo), các phiếu khác vẫn duyệt. */
  public String duyetPhieu(Ctx c, List<String> ids) {
    c.require(Perm.soQuyDuyet, Level.approve);
    List<String> bo = new ArrayList<>();
    java.util.Set<String> nguonChi = new java.util.LinkedHashSet<>();
    for (PhieuThuChi p : c.db().getPhieuThuChi()) {
      if (!ids.contains(p.getId()) || !TrangThai.CHO_DUYET.equals(p.getTrangThai())) continue;
      if (tuDuyet(c, p.getNguoiDeNghi())) {
        bo.add(p.getSoPhieu());
        continue;
      }
      p.setTrangThai(TrangThai.DA_DUYET);
      p.setNguoiDuyet(c.me());
      p.setNgayDuyet(c.now());
      p.setLichSu(ghiLichSu(c, p.getLichSu(), "Duyệt", null));
      if (!"Thu".equals(p.getLoai()) && p.getNguonTien() != null) nguonChi.add(p.getNguonTien());
    }
    List<String> canhBao = new ArrayList<>();
    if (!bo.isEmpty()) canhBao.add("Không tự duyệt phiếu của mình: " + String.join(", ", bo));
    // Cảnh báo không chặn: phiếu chi / luân chuyển đã duyệt làm số dư nguồn tiền âm.
    for (String id : nguonChi) {
      var n = c.nguon(id);
      if (n != null && Calc.soDuNguon(id, c.db(), "9999-12-31").soDu() < 0) canhBao.add("Nguồn tiền " + n.getTen() + " bị âm quỹ sau khi duyệt");
    }
    return canhBao.isEmpty() ? null : String.join(" · ", canhBao);
  }

  public void tuChoiPhieu(Ctx c, List<String> ids, String lyDo) {
    c.require(Perm.soQuyDuyet, Level.approve);
    if (Texts.blank(lyDo)) throw ApiException.invalid("Cần nhập lý do từ chối");
    for (PhieuThuChi p : c.db().getPhieuThuChi()) {
      if (!ids.contains(p.getId()) || !TrangThai.CHO_DUYET.equals(p.getTrangThai())) continue;
      p.setTrangThai(TrangThai.TU_CHOI);
      p.setLyDoTuChoi(lyDo);
      p.setNguoiDuyet(c.me());
      p.setNgayDuyet(c.now());
      p.setLichSu(ghiLichSu(c, p.getLichSu(), "Từ chối", lyDo));
    }
  }

  // ═════════════════════ CHI PHÍ THỰC HIỆN HĐ ═════════════════════════

  public List<String> loiChiPhi(Ctx c, ChiPhiHD x) {
    List<String> e = new ArrayList<>();
    HopDongBan h = c.hdb(x.getHdbId());
    if (h == null) e.add("Chưa chọn Số HĐ bán");
    else if (TrangThai.BAO_GIA.equals(h.getTrangThai())) e.add("HĐ đang ở Báo giá — chỉ ghi chi phí cho HĐ từ Hiệu lực trở đi");
    LoaiChiPhi l = c.lcp(x.getLoaiChiPhi());
    if (l == null || !"Thực hiện HĐ".equals(l.getNhom())) e.add("Chưa chọn Loại chi phí thực hiện HĐ");
    if (Texts.blank(x.getNoiDung())) e.add("Chưa nhập Nội dung");
    if (!(x.getSoTien() > 0)) e.add("Số tiền phải > 0");
    if (Texts.blank(x.getNguonTien())) e.add("Chưa chọn Nguồn tiền chi ra");
    if (Calc.LCP_HOA_HONG.equals(x.getLoaiChiPhi()) && Texts.blank(x.getNguoiNhan())) e.add("Hoa hồng cần Người nhận");
    return e;
  }

  private String saleCua(Ctx c, String hdbId) {
    HopDongBan h = c.hdb(hdbId);
    return h == null ? null : Texts.emptyToNull(h.getSale());
  }

  public ChiPhiHD saveChiPhi(Ctx c, ChiPhiHD x, boolean gui, boolean isNew) {
    c.require(Perm.cpHD, Level.edit, saleCua(c, x.getHdbId()));
    ChiPhiHD cu = isNew ? null : c.chiPhi(x.getId());
    if (!isNew && cu == null) throw ApiException.notFound("Không tìm thấy chi phí");
    if (cu != null) {
      if (!TrangThai.NHAP.equals(cu.getTrangThai()) && !TrangThai.TU_CHOI.equals(cu.getTrangThai())) throw ApiException.conflict("Chi phí này không sửa được");
      if (c.dangChoXoa("ChiPhiThucHienHD", cu.getId())) throw ApiException.conflict("Chi phí này không sửa được");
      if (!c.canEdit(Perm.cpHD, saleCua(c, cu.getHdbId()))) throw ApiException.forbidden(Ctx.KHONG_QUYEN);
    }
    if (Texts.blank(x.getNgay())) throw ApiException.invalid("Chưa có Ngày");
    if (x.getSoTien() < 0) throw ApiException.invalid("Số tiền không âm");
    ChiPhiHD out = c.copy(x, ChiPhiHD.class);
    out.setHdbId(Texts.emptyToNull(out.getHdbId()));
    out.setLoaiChiPhi(Texts.emptyToNull(out.getLoaiChiPhi()));
    out.setNguonTien(Texts.emptyToNull(out.getNguonTien()));
    if (out.getHdbId() != null && c.hdb(out.getHdbId()) == null) throw ApiException.invalid("HĐ bán không tồn tại");
    kiemThamChieu(c, out.getNguonTien(), null, out.getLoaiChiPhi());
    out.setFiles(tepHopLe(c, out.getFiles()));
    out.setNguoiDuyet(cu == null ? null : cu.getNguoiDuyet());
    out.setNgayDuyet(cu == null ? null : cu.getNgayDuyet());
    out.setLichSu(cu == null ? null : cu.getLichSu());
    if (Texts.blank(out.getNguoiThucHien())) out.setNguoiThucHien(cu == null ? c.me() : cu.getNguoiThucHien());
    if (gui) {
      List<String> loi = loiChiPhi(c, out);
      if (!loi.isEmpty()) throw ApiException.invalid(String.join(" · ", loi));
    }
    if (isNew) {
      out.setId(Ids.safe(x.getId()) && c.chiPhi(x.getId()) == null ? x.getId() : c.uid("CP"));
      out.setMaCP(c.nextSo(c.cauHinh().getTienToCP(), out.getNgay()));
    } else {
      out.setMaCP(cu.getMaCP());
    }
    String truoc = cu == null ? TrangThai.NHAP : cu.getTrangThai();
    out.setTrangThai(gui ? TrangThai.CHO_DUYET : TrangThai.NHAP);
    out.setLyDoTuChoi(gui ? null : cu == null ? null : cu.getLyDoTuChoi());
    if (gui || !TrangThai.NHAP.equals(truoc) || out.getLichSu() == null || out.getLichSu().isEmpty())
      out.setLichSu(ghiLichSu(c, out.getLichSu(), gui ? "Gửi duyệt" : "Lưu nháp", null));
    Ctx.upsert(c.db().getChiPhiHD(), out, ChiPhiHD::getId);
    return out;
  }

  public String duyetChiPhi(Ctx c, List<String> ids) {
    c.require(Perm.cpHDDuyet, Level.approve);
    List<String> bo = new ArrayList<>();
    for (ChiPhiHD x : c.db().getChiPhiHD()) {
      if (!ids.contains(x.getId()) || !TrangThai.CHO_DUYET.equals(x.getTrangThai())) continue;
      if (tuDuyet(c, x.getNguoiThucHien())) {
        bo.add(x.getMaCP());
        continue;
      }
      x.setTrangThai(TrangThai.DA_DUYET);
      x.setNguoiDuyet(c.me());
      x.setNgayDuyet(c.now());
      x.setLichSu(ghiLichSu(c, x.getLichSu(), "Duyệt", null));
    }
    return bo.isEmpty() ? null : "Không tự duyệt chi phí của mình: " + String.join(", ", bo);
  }

  public void tuChoiChiPhi(Ctx c, List<String> ids, String lyDo) {
    c.require(Perm.cpHDDuyet, Level.approve);
    if (Texts.blank(lyDo)) throw ApiException.invalid("Cần nhập lý do từ chối");
    for (ChiPhiHD x : c.db().getChiPhiHD()) {
      if (!ids.contains(x.getId()) || !TrangThai.CHO_DUYET.equals(x.getTrangThai())) continue;
      x.setTrangThai(TrangThai.TU_CHOI);
      x.setLyDoTuChoi(lyDo);
      x.setNguoiDuyet(c.me());
      x.setNgayDuyet(c.now());
      x.setLichSu(ghiLichSu(c, x.getLichSu(), "Từ chối", lyDo));
    }
  }

  public void xoaNhapChiPhi(Ctx c, String id) {
    ChiPhiHD x = c.chiPhi(id);
    if (x == null) throw ApiException.notFound("Không tìm thấy chi phí");
    if (!TrangThai.NHAP.equals(x.getTrangThai())) throw ApiException.conflict("Chỉ xoá thẳng chi phí Nháp — chi phí khác gửi yêu cầu xoá");
    if (!c.canEdit(Perm.cpHD, saleCua(c, x.getHdbId()))) throw ApiException.forbidden("Tài khoản của bạn không có quyền xoá chi phí này");
    Ctx.drop(c.db().getChiPhiHD(), ChiPhiHD::getId, id);
  }

  public void rutLaiChiPhi(Ctx c, String id) {
    ChiPhiHD x = c.chiPhi(id);
    if (x == null) throw ApiException.notFound("Không tìm thấy chi phí");
    if (!TrangThai.CHO_DUYET.equals(x.getTrangThai())) throw ApiException.conflict("Chỉ rút lại chi phí đang Chờ duyệt");
    if (!c.canEdit(Perm.cpHD, saleCua(c, x.getHdbId()))) throw ApiException.forbidden("Tài khoản của bạn không có quyền rút chi phí này");
    x.setTrangThai(TrangThai.NHAP);
    x.setLichSu(ghiLichSu(c, x.getLichSu(), "Rút lại", null));
  }
}
