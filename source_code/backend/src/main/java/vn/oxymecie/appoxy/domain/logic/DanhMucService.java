package vn.oxymecie.appoxy.domain.logic;

import vn.oxymecie.appoxy.domain.model.TrangThai;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Ids;
import vn.oxymecie.appoxy.common.Texts;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.model.AnhXaTen;
import vn.oxymecie.appoxy.domain.model.ChamSocKH;
import vn.oxymecie.appoxy.domain.model.DongDeNghi;
import vn.oxymecie.appoxy.domain.model.DongHangBan;
import vn.oxymecie.appoxy.domain.model.DongHangMua;
import vn.oxymecie.appoxy.domain.model.DongKiemKe;
import vn.oxymecie.appoxy.domain.model.DongPhieuKho;
import vn.oxymecie.appoxy.domain.model.KhachHang;
import vn.oxymecie.appoxy.domain.model.Kho;
import vn.oxymecie.appoxy.domain.model.LoaiChiPhi;
import vn.oxymecie.appoxy.domain.model.LoaiHang;
import vn.oxymecie.appoxy.domain.model.NguonTien;
import vn.oxymecie.appoxy.domain.model.NhaCungCap;
import vn.oxymecie.appoxy.domain.perm.Perm;

/** Danh mục: khách hàng, NCC, nguồn tiền, loại chi phí, kho, mã hàng, ánh xạ tên (store.ts phần DANH MỤC). */
@Service
public class DanhMucService {
  private static final Pattern MST = Pattern.compile("^\\d{10}(-\\d{3})?$");
  private static final Set<String> TIEP_CAN = Set.of(TrangThai.CHUA_LIEN_HE, TrangThai.DANG_LIEN_HE, TrangThai.HOP_DONG, TrangThai.HUY);
  private static final Set<String> CO_HOI = Set.of(TrangThai.CHUA_TIEP_CAN, TrangThai.DA_BAO_GIA, TrangThai.DANG_DAM_PHAN, TrangThai.KY_HOP_DONG, TrangThai.DA_GIAO_HANG, TrangThai.HOAN_THANH, TrangThai.HUY);
  private static final Set<String> NHOM_HANG = Set.of("Khí chuẩn", "Dung dịch chuẩn", "Vỏ bình", "Thiết bị tái sử dụng", "Phụ kiện");

  /** MST Việt Nam: 10 số, hoặc 10 số + "-" + 3 số. Trống → bắt buộc nhập. */
  public static String loiMST(String mst) {
    String s = Texts.trim(mst);
    if (s.isEmpty()) return "Mã số thuế là bắt buộc";
    return MST.matcher(s).matches() ? null : "MST không hợp lệ — 10 số hoặc 10 số-3 số (VD 0101248141 / 0101248141-001)";
  }

  /** Chọn id cho bản ghi mới: id client đề xuất nếu hợp lệ và chưa dùng, không thì sinh mã kế tiếp. */
  static String idMoi(String deXuat, boolean daCo, String maKeTiep) {
    return Ids.safe(deXuat) && !daCo ? deXuat : maKeTiep;
  }

  // ── Khách hàng (HDB-13) ──────────────────────────────────────────────

  public void saveKhachHang(Ctx c, KhachHang k, boolean isNew) {
    KhachHang cu = isNew ? null : c.kh(k.getId());
    if (!isNew && cu == null) throw ApiException.notFound("Không tìm thấy khách hàng");
    c.require(Perm.khachHang, vn.oxymecie.appoxy.domain.perm.Level.edit, cu == null ? null : Texts.emptyToNull(cu.getPhuTrach()));
    if (Texts.blank(k.getTen())) throw ApiException.invalid("Chưa nhập tên khách hàng");
    String loiMst = loiMST(k.getMst());
    if (loiMst != null) throw ApiException.invalid(loiMst);
    if (k.getTiepCan() != null && !TIEP_CAN.contains(k.getTiepCan())) throw ApiException.invalid("Trạng thái tiếp cận không hợp lệ");
    if (k.getCoHoi() != null && !CO_HOI.contains(k.getCoHoi())) throw ApiException.invalid("Trạng thái cơ hội không hợp lệ");
    if (k.getTrangThai() != null && !List.of(TrangThai.DANG_DUNG, TrangThai.NGUNG).contains(k.getTrangThai())) throw ApiException.invalid("Trạng thái không hợp lệ");
    if (k.getPhuTrach() != null && !k.getPhuTrach().isEmpty() && c.taiKhoan(k.getPhuTrach()) == null)
      throw ApiException.invalid("Sale phụ trách không tồn tại");
    if (!c.canEdit(Perm.phanBoKH)) {
      // Không có quyền phân bổ: giữ nguyên Sale phụ trách; KH mới do Sale tạo thì Sale đó phụ trách.
      k.setPhuTrach(cu != null ? cu.getPhuTrach() : c.ownOnly(Perm.khachHang) ? c.me() : k.getPhuTrach());
    }
    String phuTrach = Texts.emptyToNull(k.getPhuTrach());
    k.setPhuTrach(phuTrach);
    if (!Objects.equals(phuTrach, cu == null ? null : Texts.emptyToNull(cu.getPhuTrach())))
      k.setNgayPhanBo(phuTrach != null ? c.today() : null);
    k.setTrangThaiData(phuTrach != null ? TrangThai.DA_PHAN_BO : TrangThai.CHUA_PHAN_BO);
    if (cu == null && Texts.blank(k.getNgayTiepNhan())) k.setNgayTiepNhan(c.today());
    if (k.getTiepCan() == null) k.setTiepCan(TrangThai.CHUA_LIEN_HE);
    if (k.getCoHoi() == null) k.setCoHoi(TrangThai.CHUA_TIEP_CAN);
    if (cu != null) {
      // Nhật ký chăm sóc chỉ thêm qua ghiChamSoc — không cho sửa / xoá qua lưu thông tin.
      k.setChamSoc(cu.getChamSoc());
      k.setLaImport(cu.getLaImport());
    } else {
      k.setChamSoc(null);
      List<String> ids = c.db().getKhachHang().stream().map(KhachHang::getId).toList();
      k.setId(idMoi(k.getId(), c.kh(k.getId()) != null, Ctx.nextMa("KH", ids)));
    }
    k.setMst(Texts.trim(k.getMst()));
    k.setTen(k.getTen().trim());
    Ctx.upsert(c.db().getKhachHang(), k, KhachHang::getId);
  }

  /** Giao nhiều KH cho một Sale (trống = trả về chưa phân bổ). */
  public void phanBoKH(Ctx c, List<String> ids, String sale) {
    c.require(Perm.phanBoKH);
    if (ids == null || ids.isEmpty()) throw ApiException.invalid("Chưa chọn khách hàng");
    String s = sale == null ? "" : sale;
    if (!s.isEmpty() && c.taiKhoan(s) == null) throw ApiException.invalid("Sale phụ trách không tồn tại");
    Set<String> set = new HashSet<>(ids);
    String ngay = c.today();
    for (KhachHang k : c.db().getKhachHang()) {
      if (!set.contains(k.getId()) || Texts.nz(k.getPhuTrach()).equals(s)) continue;
      k.setPhuTrach(s.isEmpty() ? null : s);
      k.setNgayPhanBo(s.isEmpty() ? null : ngay);
      k.setTrangThaiData(s.isEmpty() ? TrangThai.CHUA_PHAN_BO : TrangThai.DA_PHAN_BO);
    }
  }

  /** Ghi một lần chăm sóc; đổi trạng thái tiếp cận / cơ hội cùng lúc nếu chọn. */
  public void ghiChamSoc(Ctx c, String id, String noiDung, String tiepCanMoi, String coHoiMoi) {
    KhachHang k = c.kh(id);
    if (k == null) throw ApiException.notFound("Không tìm thấy khách hàng");
    c.require(Perm.khachHang, vn.oxymecie.appoxy.domain.perm.Level.edit, Texts.emptyToNull(k.getPhuTrach()));
    if (tiepCanMoi != null && !TIEP_CAN.contains(tiepCanMoi)) throw ApiException.invalid("Trạng thái tiếp cận không hợp lệ");
    if (coHoiMoi != null && !CO_HOI.contains(coHoiMoi)) throw ApiException.invalid("Trạng thái cơ hội không hợp lệ");
    String nd = Texts.trim(noiDung);
    String coHoi = coHoiMoi != null && !coHoiMoi.equals(k.getCoHoi()) ? coHoiMoi : null;
    String tiepCan = tiepCanMoi != null && !tiepCanMoi.equals(k.getTiepCan()) ? tiepCanMoi : null;
    if (nd.isEmpty() && coHoi == null && tiepCan == null) throw ApiException.invalid("Chưa nhập nội dung chăm sóc");
    List<String> doi = new ArrayList<>();
    if (tiepCan != null) doi.add("Tiếp cận → " + tiepCan);
    if (coHoi != null) doi.add("Cơ hội → " + coHoi);
    ChamSocKH dong = new ChamSocKH(c.uid("CS"), c.now(), c.me(), nd.isEmpty() ? String.join(" · ", doi) : nd, coHoi);
    if (tiepCan != null) k.setTiepCan(tiepCan);
    if (coHoi != null) k.setCoHoi(coHoi);
    List<ChamSocKH> ds = new ArrayList<>();
    ds.add(dong);
    if (k.getChamSoc() != null) ds.addAll(k.getChamSoc());
    k.setChamSoc(ds);
  }

  // ── Nhà cung cấp (HDM-10) ────────────────────────────────────────────

  public void saveNCC(Ctx c, NhaCungCap n, boolean isNew) {
    c.require(Perm.ncc);
    NhaCungCap cu = isNew ? null : c.ncc(n.getId());
    if (!isNew && cu == null) throw ApiException.notFound("Không tìm thấy nhà cung cấp");
    if (Texts.blank(n.getTen())) throw ApiException.invalid("Chưa nhập tên nhà cung cấp");
    if (n.getTrangThai() != null && !List.of(TrangThai.DANG_DUNG, TrangThai.NGUNG).contains(n.getTrangThai())) throw ApiException.invalid("Trạng thái không hợp lệ");
    if (isNew) {
      List<String> ids = c.db().getNcc().stream().map(NhaCungCap::getId).toList();
      n.setId(idMoi(n.getId(), c.ncc(n.getId()) != null, Ctx.nextMa("NCC", ids)));
    }
    n.setTen(n.getTen().trim());
    Ctx.upsert(c.db().getNcc(), n, NhaCungCap::getId);
  }

  // ── Nguồn tiền & loại chi phí (KT-01, KT-03) ─────────────────────────

  /** Nguồn đã có phiếu Đã duyệt thì khoá Số dư đầu kỳ, Ngày đầu kỳ. */
  public static boolean nguonDaPhatSinh(Ctx c, String id) {
    return c.db().getPhieuThuChi().stream().anyMatch(p -> TrangThai.DA_DUYET.equals(p.getTrangThai())
            && (id.equals(p.getNguonTien()) || id.equals(p.getNguonTienDen())))
        || c.db().getChiPhiHD().stream().anyMatch(x -> TrangThai.DA_DUYET.equals(x.getTrangThai()) && id.equals(x.getNguonTien()));
  }

  public void saveNguonTien(Ctx c, NguonTien n, boolean isNew) {
    c.require(Perm.nguonTien);
    if (Texts.blank(n.getId()) || Texts.blank(n.getTen())) throw ApiException.invalid("Cần nhập Mã nguồn và Tên");
    if (!Ids.safe(n.getId()) || n.getId().length() > 20) throw ApiException.invalid("Mã nguồn chỉ gồm chữ, số, gạch (tối đa 20 ký tự)");
    NguonTien cu = c.nguon(n.getId());
    if (isNew && cu != null) throw ApiException.conflict("Mã nguồn " + n.getId() + " đã có");
    if (!isNew && cu == null) throw ApiException.notFound("Không tìm thấy nguồn tiền");
    if (!List.of("Tiền mặt", "Ngân hàng").contains(n.getLoai())) throw ApiException.invalid("Loại nguồn tiền không hợp lệ");
    if (!List.of(TrangThai.DANG_DUNG, TrangThai.NGUNG).contains(n.getTrangThai())) throw ApiException.invalid("Trạng thái không hợp lệ");
    if (cu != null && nguonDaPhatSinh(c, n.getId())
        && (cu.getSoDuDauKy() != n.getSoDuDauKy() || !Objects.equals(cu.getNgayDauKy(), n.getNgayDauKy())))
      throw ApiException.invalid("Nguồn đã có phiếu được duyệt — không sửa Số dư đầu kỳ / Ngày đầu kỳ");
    Ctx.upsert(c.db().getNguonTien(), n, NguonTien::getId);
  }

  public void saveLoaiChiPhi(Ctx c, LoaiChiPhi l, boolean isNew) {
    c.require(Perm.nguonTien);
    if (Texts.blank(l.getTen())) throw ApiException.invalid("Chưa nhập tên loại chi phí");
    if (!List.of("Vận hành", "Thực hiện HĐ").contains(l.getNhom())) throw ApiException.invalid("Nhóm chi phí không hợp lệ");
    LoaiChiPhi cu = isNew ? null : c.lcp(l.getId());
    if (!isNew && cu == null) throw ApiException.notFound("Không tìm thấy loại chi phí");
    if (isNew) {
      String prefix = "Vận hành".equals(l.getNhom()) ? "VH-" : "CPTH-";
      List<String> ids = c.db().getLoaiChiPhi().stream().map(LoaiChiPhi::getId).toList();
      l.setId(idMoi(l.getId(), c.lcp(l.getId()) != null, Ctx.nextMa(prefix, ids)));
    }
    Ctx.upsert(c.db().getLoaiChiPhi(), l, LoaiChiPhi::getId);
  }

  // ── Kho & mã hàng (KHO-01, KHO-02) ───────────────────────────────────

  public void saveKho(Ctx c, Kho k, boolean isNew) {
    c.require(Perm.khoDanhMuc);
    if (Calc.KHO_CHUYEN_THANG.equals(k.getId())) throw ApiException.invalid("\"Chuyển thẳng\" là vị trí hệ thống, không sửa được");
    if (Texts.blank(k.getTen())) throw ApiException.invalid("Chưa nhập tên kho");
    Kho cu = isNew ? null : c.kho(k.getId());
    if (!isNew && cu == null) throw ApiException.notFound("Không tìm thấy kho");
    if (isNew) {
      List<String> ids = c.db().getKho().stream().map(Kho::getId).toList();
      k.setId(idMoi(k.getId(), c.kho(k.getId()) != null, Ctx.nextMa("KHO", ids)));
      k.setLoai("Kho thường");
    } else {
      k.setLoai(cu.getLoai());
    }
    Ctx.upsert(c.db().getKho(), k, Kho::getId);
  }

  public void saveLoaiHang(Ctx c, LoaiHang l, boolean isNew) {
    c.require(Perm.khoDanhMuc);
    if (Texts.blank(l.getId()) || Texts.blank(l.getTen())) throw ApiException.invalid("Cần nhập Mã hàng và Tên");
    if (l.getId().matches(".*\\s.*")) throw ApiException.invalid("Mã hàng không chứa khoảng trắng (VD KC-NO-8L)");
    if (!Ids.safe(l.getId())) throw ApiException.invalid("Mã hàng chỉ gồm chữ, số, gạch, chấm (tối đa 40 ký tự)");
    if (isNew && c.loaiHang(l.getId()) != null) throw ApiException.conflict("Mã " + l.getId() + " đã có");
    if (!isNew && c.loaiHang(l.getId()) == null) throw ApiException.notFound("Không có mã " + l.getId());
    if (!NHOM_HANG.contains(l.getNhom())) throw ApiException.invalid("Nhóm hàng không hợp lệ");
    if (l.getThuocTinh() == null) l.setThuocTinh(new ArrayList<>());
    Ctx.upsert(c.db().getLoaiHang(), l, LoaiHang::getId);
  }

  /**
   * Đổi mã hàng: đổi ở danh mục và mọi nơi đang dùng mã cũ (phiếu kho, dòng HĐ mua / HĐ bán, đề nghị vật tư,
   * kiểm kê, ánh xạ tên bán). DB đổi khoá chính bằng ON UPDATE CASCADE (xem DataStore).
   */
  public String doiMaHang(Ctx c, String cu, String moiRaw) {
    c.require(Perm.khoDanhMuc);
    String moi = Texts.trim(moiRaw).toUpperCase();
    if (moi.isEmpty() || moi.matches(".*\\s.*")) throw ApiException.invalid("Mã mới không hợp lệ (không chứa khoảng trắng)");
    if (!Ids.safe(moi)) throw ApiException.invalid("Mã mới chỉ gồm chữ, số, gạch, chấm (tối đa 40 ký tự)");
    if (moi.equals(cu)) return moi;
    LoaiHang l = c.loaiHang(cu);
    if (l == null) throw ApiException.notFound("Không có mã " + cu);
    if (c.loaiHang(moi) != null) throw ApiException.conflict("Mã " + moi + " đã có");
    if (c.dangChoXoa("DM_LoaiHang", cu)) throw ApiException.conflict("Mã đang chờ xoá");
    c.ghiDoiMaHang(cu, moi);
    l.setId(moi);
    for (var p : c.db().getPhieuKho()) for (DongPhieuKho x : p.getDong()) if (cu.equals(x.getLoaiHang())) x.setLoaiHang(moi);
    for (var m : c.db().getHopDongMua()) for (DongHangMua x : m.getChiTiet()) if (cu.equals(x.getLoaiHang())) x.setLoaiHang(moi);
    for (var h : c.db().getHopDongBan())
      if (h.getDongHang() != null) for (DongHangBan x : h.getDongHang()) if (cu.equals(x.getLoaiHang())) x.setLoaiHang(moi);
    for (var dn : c.db().getDeNghiVatTu()) for (DongDeNghi x : dn.getDong()) if (cu.equals(x.getLoaiHang())) x.setLoaiHang(moi);
    for (var k : c.db().getKiemKe()) for (DongKiemKe x : k.getDong()) if (cu.equals(x.getLoaiHang())) x.setLoaiHang(moi);
    for (AnhXaTen a : c.db().getAnhXaTen()) if (cu.equals(a.getLoaiHang())) a.setLoaiHang(moi);
    return moi;
  }

  /** Gán tên hàng HĐ bán → mã hàng / lô hay dùng. */
  public void saveAnhXa(Ctx c, String id, String loaiHang, String lo, String ghiChu) {
    c.require(Perm.khoDanhMuc);
    AnhXaTen a = c.anhXa(id);
    if (a == null) throw ApiException.notFound("Không tìm thấy tên hàng");
    String lh = Texts.emptyToNull(loaiHang);
    if (lh != null && c.loaiHang(lh) == null) throw ApiException.invalid("Không có mã " + lh);
    a.setLoaiHang(lh);
    a.setLo(lh != null ? Texts.emptyToNull(lo) : null);
    a.setGhiChu(Texts.trimToNull(ghiChu));
  }

  /** Thêm tên hàng mới vào bảng ánh xạ. */
  public void themAnhXa(Ctx c, AnhXaTen o) {
    c.require(Perm.khoDanhMuc);
    String ten = Texts.trim(o.getTen());
    if (ten.isEmpty()) throw ApiException.invalid("Chưa nhập tên hàng");
    String nongDo = Texts.nz(o.getNongDo());
    if (c.db().getAnhXaTen().stream().anyMatch(x -> x.getTen().equalsIgnoreCase(ten) && Texts.nz(x.getNongDo()).equals(nongDo)))
      throw ApiException.conflict("Tên hàng (cùng nồng độ) đã có");
    String lh = Texts.emptyToNull(o.getLoaiHang());
    if (lh != null && c.loaiHang(lh) == null) throw ApiException.invalid("Không có mã " + lh);
    String id = Ids.safe(o.getId()) && c.anhXa(o.getId()) == null ? o.getId() : c.uid("AX");
    AnhXaTen a = new AnhXaTen(id, ten, o.getTheTich(), o.getNongDo(), 0, 0, lh, Texts.emptyToNull(o.getLo()), o.getGhiChu());
    Ctx.upsert(c.db().getAnhXaTen(), a, AnhXaTen::getId);
  }
}
