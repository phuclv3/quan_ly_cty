package vn.oxymecie.appoxy.domain.logic;

import vn.oxymecie.appoxy.domain.model.TrangThai;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Dates;
import vn.oxymecie.appoxy.common.Money;
import vn.oxymecie.appoxy.common.Texts;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.calc.Calc.DongLo;
import vn.oxymecie.appoxy.domain.model.BinhKhi;
import vn.oxymecie.appoxy.domain.model.ChecklistItem;
import vn.oxymecie.appoxy.domain.model.DongKiemKe;
import vn.oxymecie.appoxy.domain.model.DongPhieuKho;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.HopDongMua;
import vn.oxymecie.appoxy.domain.model.KiemKe;
import vn.oxymecie.appoxy.domain.model.PhieuKho;
import vn.oxymecie.appoxy.domain.model.YeuCauXuatKho;
import vn.oxymecie.appoxy.domain.perm.Level;
import vn.oxymecie.appoxy.domain.perm.Perm;

/** Kho (KHO-01…10): phiếu nhập / xuất tay, kiểm kê, sửa phiếu, sửa lô; trừ kho theo lô dùng chung cho HĐ bán / mua. */
@Service
public class KhoService {

  /** Một dòng xuất do người dùng nhập: chỉ định lô, hoặc bỏ trống để tự trừ lô nhập trước (FIFO). */
  public record DongXuat(String loaiHang, String lo, double soLuong, String tenTrenHD, String ghiChu) {}

  /** Một dòng nhập lô: mã hàng + quy cách / nồng độ, SL, đơn giá, VAT. */
  public record DongNhapLo(String loaiHang, String thuocTinh, double soLuong, double donGia, Double vat, String ghiChu) {}

  /** Thông tin đầu phiếu nhập / xuất tay. */
  public record PhieuTay(String ngay, String loai, String hdId, String kho, String lyDo, String ghiChu, String soHoaDon,
                         String ncc, String kiemKeId) {}

  /**
   * Dòng xuất → dòng phiếu theo LÔ: chỉ định lô thì trừ đúng lô đó, bỏ trống thì trừ lô nhập trước (FIFO, có thể tách
   * nhiều dòng). Chặn xuất quá tồn lô; chỉ trừ lô đã nhập tới ngày xuất. Giá vốn = đơn giá của lô.
   */
  public List<DongPhieuKho> dongXuatTheoLo(Ctx c, String kho, String hdbId, List<DongXuat> vao, String ngay) {
    List<DongLo> tatCa = Calc.tonTheoLo(c.db(), null);
    List<DongLo> lots = tatCa.stream().filter(l -> ngay == null || ngay.isEmpty() || l.ngay.compareTo(ngay) <= 0).toList();
    List<DongPhieuKho> out = new ArrayList<>();
    for (DongXuat d : vao == null ? List.<DongXuat>of() : vao) {
      if (Texts.blank(d.loaiHang()) || !(d.soLuong() > 0)) continue;
      if (c.loaiHang(d.loaiHang()) == null) throw ApiException.invalid("Không có mã " + d.loaiHang());
      String tenTrenHD = Texts.trimToNull(d.tenTrenHD());
      String ghiChu = Texts.trimToNull(d.ghiChu());
      String lo = Texts.emptyToNull(d.lo());
      if (lo != null) {
        DongLo l = tatCa.stream().filter(x -> x.lo.equals(lo)).findFirst().orElse(null);
        if (l != null && ngay != null && !ngay.isEmpty() && l.ngay.compareTo(ngay) > 0)
          throw ApiException.invalid("Lô " + lo + " nhập ngày " + Dates.vi(l.ngay) + " — sau ngày xuất");
      }
      List<DongLo> chon = lo != null ? lots.stream().filter(l -> l.lo.equals(lo)).toList() : lots;
      if (lo != null && (chon.isEmpty() || !chon.get(0).kho.equals(kho) || !chon.get(0).loaiHang.equals(d.loaiHang())))
        throw ApiException.invalid("Lô " + lo + " không phải " + d.loaiHang() + " tại kho đã chọn");
      double con = d.soLuong();
      for (DongLo l : chon) {
        if (con <= 0) break;
        if (!l.loaiHang.equals(d.loaiHang()) || !l.kho.equals(kho) || l.ton <= 0) continue;
        double sl = Math.min(con, l.ton);
        l.ton -= sl;
        con -= sl;
        out.add(new DongPhieuKho(d.loaiHang(), l.quyCach, sl, l.lo, null, null, null, l.donGia, tenTrenHD, ghiChu));
      }
      if (con > 0) {
        throw ApiException.invalid(lo != null
            ? "Lô " + lo + " không đủ tồn (thiếu " + Money.num(con) + ") — không xuất quá tồn"
            : d.loaiHang() + ": tồn tại kho tới ngày xuất không đủ (thiếu " + Money.num(con) + ") — cần nhập / đặt mua NCC trước khi xuất");
      }
    }
    return out;
  }

  /** Mã lô cho dòng mới: "L<số hoá đơn>-<nn>"; không có số hoá đơn thì "<số phiếu>-<nn>". Không trùng lô cũ. */
  public String maLoMoi(String soPhieu, String soHoaDon, int i, Set<String> daCo) {
    String so = soHoaDon == null ? "" : soHoaDon.replaceAll("\\D", "");
    String goc = !so.isEmpty() ? "L" + so : soPhieu;
    String nn = String.format("%02d", i + 1);
    String ma = goc + "-" + nn;
    for (int k = 2; daCo.contains(ma); k++) ma = goc + "-" + nn + "." + k;
    daCo.add(ma);
    return ma;
  }

  public Set<String> loDaCo(Ctx c) {
    Set<String> s = new HashSet<>();
    for (PhieuKho p : c.db().getPhieuKho())
      if ("Nhập".equals(p.getLoai())) for (int i = 0; i < p.getDong().size(); i++) s.add(Calc.maLo(p, i));
    return s;
  }

  /**
   * KHO-06: phiếu nhập / xuất tay. Nhập: mỗi dòng = một lô mới, bắt buộc đơn giá; có số hoá đơn NCC thì không cần lý do.
   * Xuất: trừ theo lô (chặn quá tồn); có HĐ bán thì không cần lý do.
   */
  public PhieuKho savePhieuKhoTay(Ctx c, PhieuTay p, List<DongNhapLo> dongNhap, List<DongXuat> dongXuat, boolean choGia0, String idDeXuat) {
    c.require(Perm.khoPhieuTay);
    if (Texts.blank(p.ngay())) throw ApiException.invalid("Chưa chọn Ngày");
    if (Texts.blank(p.kho())) throw ApiException.invalid("Chưa chọn Vị trí kho");
    if (c.kho(p.kho()) == null) throw ApiException.invalid("Vị trí kho không tồn tại");
    if (!"Nhập".equals(p.loai()) && !"Xuất".equals(p.loai())) throw ApiException.invalid("Loại phiếu kho không hợp lệ");
    String hdId = Texts.emptyToNull(p.hdId());
    if ("Nhập".equals(p.loai()) && hdId != null) {
      HopDongMua m = c.hdm(hdId);
      if (m == null) throw ApiException.invalid("HĐ mua không tồn tại");
      if (!"Đã".equals(m.getXuatHoaDon()))
        throw ApiException.invalid("HĐ mua " + Texts.nz(m.getSoHD()) + ": NCC chưa xuất hoá đơn — chọn \"NCC đã xuất hoá đơn: Đã\" ở HĐ mua trước khi nhập kho");
      if (Texts.blank(p.soHoaDon())) throw ApiException.invalid("Cần Số hoá đơn NCC");
    }
    if ("Xuất".equals(p.loai()) && hdId != null && c.hdb(hdId) == null) throw ApiException.invalid("HĐ bán không tồn tại");
    String ncc = Texts.emptyToNull(p.ncc());
    if (ncc != null && c.ncc(ncc) == null) throw ApiException.invalid("Nhà cung cấp không tồn tại");
    boolean coChungTu = "Nhập".equals(p.loai()) ? !Texts.blank(p.soHoaDon()) : hdId != null;
    if (!coChungTu && Texts.blank(p.lyDo()))
      throw ApiException.invalid("Nhập".equals(p.loai()) ? "Cần Số hoá đơn NCC hoặc Lý do nhập" : "Cần chọn HĐ bán hoặc ghi Lý do xuất");
    List<DongPhieuKho> dong;
    String soPhieu;
    if ("Nhập".equals(p.loai())) {
      List<DongNhapLo> vao = (dongNhap == null ? List.<DongNhapLo>of() : dongNhap).stream()
          .filter(d -> !Texts.blank(d.loaiHang()) && d.soLuong() > 0).toList();
      if (vao.isEmpty()) throw ApiException.invalid("Cần ít nhất 1 dòng hàng có SL > 0");
      for (int i = 0; i < vao.size(); i++) {
        if (c.loaiHang(vao.get(i).loaiHang()) == null) throw ApiException.invalid("Không có mã " + vao.get(i).loaiHang());
        if (!(vao.get(i).donGia() > 0) && !choGia0)
          throw ApiException.invalid("Dòng " + (i + 1) + ": chưa có đơn giá — nhập kho phải có đơn giá của lô");
      }
      soPhieu = c.nextSoThang(c.cauHinh().getTienToNK(), p.ngay());
      Set<String> daCo = loDaCo(c);
      dong = new ArrayList<>();
      for (int i = 0; i < vao.size(); i++) {
        DongNhapLo d = vao.get(i);
        dong.add(new DongPhieuKho(d.loaiHang(), Texts.trim(d.thuocTinh()), d.soLuong(), maLoMoi(soPhieu, p.soHoaDon(), i, daCo),
            Math.max(d.donGia(), 0), d.vat(), null, null, null, Texts.trimToNull(d.ghiChu())));
      }
    } else {
      dong = dongXuatTheoLo(c, p.kho(), hdId, dongXuat, p.ngay());
      if (dong.isEmpty()) throw ApiException.invalid("Cần ít nhất 1 dòng hàng có SL > 0");
      soPhieu = c.nextSoThang(c.cauHinh().getTienToXK(), p.ngay());
    }
    String id = vn.oxymecie.appoxy.common.Ids.safe(idDeXuat) && c.phieuKho(idDeXuat) == null ? idDeXuat : c.uid("PK");
    boolean nhap = "Nhập".equals(p.loai());
    PhieuKho out = new PhieuKho(id, soPhieu, p.ngay(), p.loai(), "Nhập tay – điều chỉnh", hdId, p.kho(), Texts.trimToNull(p.lyDo()),
        c.me(), TrangThai.HIEU_LUC, Texts.trimToNull(p.ghiChu()), dong, nhap ? Texts.trimToNull(p.soHoaDon()) : null, nhap ? ncc : null,
        Texts.emptyToNull(p.kiemKeId()));
    Ctx.upsert(c.db().getPhieuKho(), out, PhieuKho::getId);
    // Thủ kho xuất hàng cho HĐ bán ở màn Kho → HĐ bán tự sang "Đang giao hàng" (như ghi nhận giao hàng ở HĐ bán).
    if (!nhap && hdId != null) {
      HopDongBan h = c.hdb(hdId);
      if (h != null && TrangThai.HIEU_LUC.equals(h.getTrangThai())) h.setTrangThai(TrangThai.DANG_GIAO_HANG);
    }
    return out;
  }

  // ── Yêu cầu xuất kho & giao hàng ─────────────────────────────────────

  /**
   * HĐ bán tự sang "Đã giao hàng" khi đã giao đủ SL (theo phiếu Xuất hiệu lực) và không còn yêu cầu xuất kho dở dang
   * (Chờ kho / Đã xuất kho chưa có ngày giao); ngược lại (xoá phiếu, có yêu cầu mới…) lùi về "Đang giao hàng".
   */
  public static void capNhatTrangThaiGiao(Ctx c, String hdbId) {
    HopDongBan h = c.hdb(hdbId);
    if (h == null) return;
    boolean dang = TrangThai.DANG_GIAO_HANG.equals(h.getTrangThai());
    boolean da = TrangThai.DA_GIAO_HANG.equals(h.getTrangThai());
    if (!dang && !da) return;
    boolean doDang = c.db().getYeuCauXuatKho().stream().anyMatch(y -> hdbId.equals(y.getHdbId())
        && (TrangThai.CHO_KHO.equals(y.getTrangThai()) || TrangThai.DA_XUAT_KHO.equals(y.getTrangThai())));
    java.util.Map<String, Double> con = Calc.hdbGioiHanGiao(h, c.db());
    boolean du = con != null && con.values().stream().allMatch(v -> v <= 1e-9);
    if (dang && du && !doDang) h.setTrangThai(TrangThai.DA_GIAO_HANG);
    else if (da && (!du || doDang)) h.setTrangThai(TrangThai.DANG_GIAO_HANG);
  }

  /** Phiếu Xuất bị xoá: yêu cầu đã xuất / đã giao từ phiếu đó quay lại Chờ kho (thủ kho xuất lại). */
  public static void goPhieuKhoiYeuCau(Ctx c, String phieuId) {
    for (YeuCauXuatKho y : c.db().getYeuCauXuatKho()) {
      if (!phieuId.equals(y.getPhieuId())) continue;
      y.setTrangThai(TrangThai.CHO_KHO);
      y.setPhieuId(null);
      y.setKho(null);
      y.setNgayXuat(null);
      y.setNgayGiao(null);
      y.setNguoiGiao(null);
      y.setNguoiXuLy(null);
      y.setNgayXuLy(null);
    }
  }

  /**
   * Thủ kho xuất kho theo yêu cầu: kiểm từng dòng đúng mã trong yêu cầu, SL xuất ≤ SL yêu cầu và ≤ số còn phải giao của HĐ,
   * rồi sinh phiếu Xuất trừ theo lô (giá vốn = đơn giá lô), HĐ bán sang Đang giao hàng. Phần yêu cầu không xuất hết thì đóng lại
   * — sale gửi yêu cầu mới cho phần còn thiếu.
   */
  public PhieuKho xuatKhoYeuCau(Ctx c, String id, String ngay, String khoId, List<DongXuat> dong, String ghiChu) {
    c.require(Perm.khoPhieuTay);
    YeuCauXuatKho y = c.yeuCauXuat(id);
    if (y == null) throw ApiException.notFound("Không tìm thấy yêu cầu xuất kho");
    if (!TrangThai.CHO_KHO.equals(y.getTrangThai())) throw ApiException.conflict("Yêu cầu không còn ở trạng thái Chờ kho");
    HopDongBan h = c.hdb(y.getHdbId());
    if (h == null) throw ApiException.notFound("Không tìm thấy HĐ bán");
    if (TrangThai.BAO_GIA.equals(h.getTrangThai()) || TrangThai.HOAN_THANH.equals(h.getTrangThai())
        || TrangThai.DA_TAT_TOAN.equals(h.getTrangThai()) || TrangThai.HUY.equals(h.getTrangThai()) || c.dangChoXoa("HopDongBan", h.getId()))
      throw ApiException.conflict("HĐ bán không còn xuất kho được (trạng thái " + TrangThai.nhan(h.getTrangThai()) + ")");
    if (Texts.blank(khoId)) throw ApiException.invalid("Chưa chọn Vị trí kho");
    if (c.kho(khoId) == null) throw ApiException.invalid("Vị trí kho không tồn tại");
    if (Texts.blank(ngay)) throw ApiException.invalid("Chưa chọn Ngày xuất");
    java.util.Map<String, Double> yc = new java.util.LinkedHashMap<>();
    for (var d : y.getDong()) yc.merge(d.getLoaiHang(), d.getSoLuong(), Double::sum);
    java.util.Map<String, Double> moi = new java.util.LinkedHashMap<>();
    for (DongXuat d : dong == null ? List.<DongXuat>of() : dong)
      if (!Texts.blank(d.loaiHang()) && d.soLuong() > 0) moi.merge(d.loaiHang(), d.soLuong(), Double::sum);
    if (moi.isEmpty()) throw ApiException.invalid("Cần ít nhất 1 dòng hàng có số lượng > 0");
    java.util.Map<String, Double> con = Calc.hdbGioiHanGiao(h, c.db());
    for (var e : moi.entrySet()) {
      Double r = yc.get(e.getKey());
      if (r == null) throw ApiException.invalid("Mã hàng " + e.getKey() + " không có trong yêu cầu " + y.getSoYC());
      if (e.getValue() > r + 1e-9)
        throw ApiException.invalid("Mã hàng " + e.getKey() + ": xuất " + Money.num(e.getValue()) + " vượt SL yêu cầu " + Money.num(r));
      Double cg = con == null ? null : con.get(e.getKey());
      if (con != null && (cg == null || e.getValue() > cg + 1e-9))
        throw ApiException.invalid("Mã hàng " + e.getKey() + ": xuất " + Money.num(e.getValue()) + " vượt số còn phải giao " + Money.num(Math.max(0, cg == null ? 0 : cg)));
    }
    List<DongPhieuKho> ds = dongXuatTheoLo(c, khoId, h.getId(), dong, ngay);
    if (ds.isEmpty()) throw ApiException.invalid("Cần ít nhất 1 dòng hàng có số lượng > 0");
    String ghi = Texts.trimToNull(ghiChu);
    PhieuKho p = new PhieuKho(c.uid("PK"), c.nextSoThang(c.cauHinh().getTienToXK(), ngay), ngay, "Xuất", "Tự động HĐ Bán", h.getId(), khoId,
        null, c.me(), TrangThai.HIEU_LUC, ghi == null ? "Theo yêu cầu " + y.getSoYC() : ghi + " · theo yêu cầu " + y.getSoYC(), ds, null, null, null);
    Ctx.upsert(c.db().getPhieuKho(), p, PhieuKho::getId);
    y.setTrangThai(TrangThai.DA_XUAT_KHO);
    y.setKho(khoId);
    y.setPhieuId(p.getId());
    y.setNgayXuat(ngay);
    y.setNguoiXuLy(c.me());
    y.setNgayXuLy(c.today());
    if (TrangThai.HIEU_LUC.equals(h.getTrangThai())) h.setTrangThai(TrangThai.DANG_GIAO_HANG);
    capNhatTrangThaiGiao(c, h.getId());
    return p;
  }

  /** Thủ kho từ chối yêu cầu (sai mã / không đủ hàng…) — bắt buộc lý do, sale thấy lại ở HĐ bán. */
  public void tuChoiYeuCau(Ctx c, String id, String lyDo) {
    c.require(Perm.khoPhieuTay);
    YeuCauXuatKho y = c.yeuCauXuat(id);
    if (y == null) throw ApiException.notFound("Không tìm thấy yêu cầu xuất kho");
    if (!TrangThai.CHO_KHO.equals(y.getTrangThai())) throw ApiException.conflict("Yêu cầu không còn ở trạng thái Chờ kho");
    if (Texts.blank(lyDo)) throw ApiException.invalid("Cần nhập lý do từ chối");
    y.setTrangThai(TrangThai.TU_CHOI);
    y.setLyDoTuChoi(lyDo.trim());
    y.setNguoiXuLy(c.me());
    y.setNgayXuLy(c.today());
  }

  /** Thủ kho cập nhật ngày giao hàng: không trước ngày xuất kho, không sau hôm nay → Đã giao hàng; HĐ bán tự sang Đã giao hàng khi giao đủ. */
  public void capNhatNgayGiao(Ctx c, String id, String ngayGiao) {
    c.require(Perm.khoPhieuTay);
    YeuCauXuatKho y = c.yeuCauXuat(id);
    if (y == null) throw ApiException.notFound("Không tìm thấy yêu cầu xuất kho");
    if (!TrangThai.DA_XUAT_KHO.equals(y.getTrangThai())) throw ApiException.conflict("Chỉ cập nhật ngày giao cho yêu cầu Đã xuất kho");
    if (Texts.blank(ngayGiao)) throw ApiException.invalid("Chưa chọn Ngày giao hàng");
    if (y.getNgayXuat() != null && ngayGiao.compareTo(y.getNgayXuat()) < 0)
      throw ApiException.invalid("Ngày giao không được trước ngày xuất kho " + Dates.vi(y.getNgayXuat()));
    if (ngayGiao.compareTo(c.today()) > 0) throw ApiException.invalid("Ngày giao không được sau hôm nay");
    y.setNgayGiao(ngayGiao);
    y.setNguoiGiao(c.me());
    y.setTrangThai(TrangThai.DA_GIAO_HANG);
    capNhatTrangThaiGiao(c, y.getHdbId());
  }

  // ── Bình khí theo serial (tab "Bình & tem") ─────────────────────────

  public BinhKhi themBinhKhi(Ctx c, BinhKhi b) {
    c.require(Perm.khoPhieuTay, Level.edit);
    String seri = Texts.nz(b.getId()).trim().toUpperCase();
    if (seri.isEmpty()) throw ApiException.invalid("Chưa nhập số serial");
    if (seri.length() > 40) throw ApiException.invalid("Số serial tối đa 40 ký tự");
    if (c.db().getBinhKhi().stream().anyMatch(x -> x.getId().equalsIgnoreCase(seri))) throw ApiException.conflict("Số serial " + seri + " đã có");
    if (c.loaiHang(b.getLoaiHang()) == null) throw ApiException.invalid("Chọn mã hàng của bình");
    if (c.kho(b.getKho()) == null) throw ApiException.invalid("Chọn một kho thường");
    if (Texts.blank(b.getXuatXu())) throw ApiException.invalid("Chưa nhập xuất xứ");
    if (Texts.blank(b.getNgaySX()) || Texts.blank(b.getHanSD())) throw ApiException.invalid("Chưa nhập Ngày SX / Hạn sử dụng");
    if (b.getHanSD().compareTo(b.getNgaySX()) < 0) throw ApiException.invalid("Hạn sử dụng phải sau Ngày sản xuất");
    BinhKhi out = new BinhKhi(seri, b.getLoaiHang(), b.getXuatXu().trim(), b.getNgaySX(), b.getHanSD(), b.getKho(), 0, null, null, Texts.trimToNull(b.getGhiChu()));
    Ctx.upsert(c.db().getBinhKhi(), out, BinhKhi::getId);
    return out;
  }

  /** Ghi nhận đã in tem: mỗi bình +1 lần, lưu ngày và người in. Chỉ bình xuất xứ Việt Nam dùng tem nội bộ. */
  public void daInTem(Ctx c, List<String> ids) {
    c.require(Perm.inTem);
    for (String id : ids) {
      BinhKhi b = c.db().getBinhKhi().stream().filter(x -> x.getId().equals(id)).findFirst()
          .orElseThrow(() -> ApiException.notFound("Không tìm thấy bình " + id));
      if (!VIET_NAM.equalsIgnoreCase(Texts.nz(b.getXuatXu()).trim())) throw ApiException.invalid("Bình " + id + " không xuất xứ Việt Nam — dùng tem của nhà sản xuất");
      b.setSoLanIn(b.getSoLanIn() + 1);
      b.setLanInCuoi(c.today());
      b.setNguoiIn(c.me());
    }
  }

  static final String VIET_NAM = "Việt Nam";

  // ── Kiểm kê ──────────────────────────────────────────────────────────

  public KiemKe saveKiemKe(Ctx c, KiemKe k, boolean isNew) {
    c.require(Perm.khoPhieuTay);
    if (Texts.blank(k.getNgay())) throw ApiException.invalid("Chưa chọn Ngày kiểm kê");
    if (Texts.blank(k.getKho())) throw ApiException.invalid("Chọn một kho thường để kiểm kê");
    if (c.kho(k.getKho()) == null) throw ApiException.invalid("Vị trí kho không tồn tại");
    List<DongKiemKe> dong = k.getDong().stream().filter(d -> !Texts.blank(d.getLoaiHang()) && d.getSoLuong() >= 0).toList();
    if (dong.isEmpty()) throw ApiException.invalid("Cần ít nhất 1 dòng mã hàng");
    for (DongKiemKe d : dong) if (c.loaiHang(d.getLoaiHang()) == null) throw ApiException.invalid("Không có mã " + d.getLoaiHang());
    KiemKe cu = isNew ? null : c.kiemKe(k.getId());
    if (!isNew && cu == null) throw ApiException.notFound("Không tìm thấy đợt kiểm kê");
    if (cu != null && cu.getPhieuDieuChinh() != null && !cu.getPhieuDieuChinh().isEmpty())
      throw ApiException.conflict("Đợt kiểm kê đã sinh phiếu điều chỉnh — không sửa được");
    KiemKe out = new KiemKe();
    if (cu != null) {
      out.setId(cu.getId());
      out.setSoPhieu(cu.getSoPhieu());
      out.setNguoiThucHien(cu.getNguoiThucHien());
      out.setPhieuDieuChinh(cu.getPhieuDieuChinh());
    } else {
      out.setId(vn.oxymecie.appoxy.common.Ids.safe(k.getId()) && c.kiemKe(k.getId()) == null ? k.getId() : c.uid("KK"));
      out.setSoPhieu(c.nextSo("KK", k.getNgay()));
      out.setNguoiThucHien(c.me());
    }
    out.setNgay(k.getNgay());
    out.setKho(k.getKho());
    out.setGhiChu(Texts.trimToNull(k.getGhiChu()));
    out.setDong(dong.stream().map(d -> new DongKiemKe(d.getLoaiHang(), d.getSoLuong(), Texts.trimToNull(d.getTenHang()),
        Texts.trimToNull(d.getXuatXu()), Texts.trimToNull(d.getNongDo()), Texts.trimToNull(d.getGhiChu()))).collect(Collectors.toList()));
    Ctx.upsert(c.db().getKiemKe(), out, KiemKe::getId);
    return out;
  }

  public void xoaKiemKe(Ctx c, String id) {
    c.require(Perm.khoPhieuTay);
    KiemKe k = c.kiemKe(id);
    if (k == null) throw ApiException.notFound("Không tìm thấy đợt kiểm kê");
    if (c.db().getPhieuKho().stream().anyMatch(p -> id.equals(p.getKiemKeId()) && TrangThai.HIEU_LUC.equals(p.getTrangThai())))
      throw ApiException.conflict("Đã có phiếu điều chỉnh Hiệu lực — huỷ phiếu trước");
    Ctx.drop(c.db().getKiemKe(), KiemKe::getId, id);
  }

  /**
   * Sinh phiếu điều chỉnh theo chênh lệch kiểm kê: thực tế > sổ → phiếu nhập (đơn giá = lô gần nhất của mã, chưa có thì 0);
   * thực tế < sổ → phiếu xuất trừ lô nhập trước. Ngày phiếu = ngày kiểm kê.
   */
  public void dieuChinhKiemKe(Ctx c, String id) {
    c.require(Perm.khoPhieuTay);
    KiemKe k = c.kiemKe(id);
    if (k == null) throw ApiException.notFound("Không tìm thấy đợt kiểm kê");
    if (c.db().getPhieuKho().stream().anyMatch(p -> id.equals(p.getKiemKeId()) && TrangThai.HIEU_LUC.equals(p.getTrangThai())))
      throw ApiException.conflict("Đợt này đã có phiếu điều chỉnh");
    List<Calc.DongLechKK> lech = Calc.lechKiemKe(c.db(), k).stream().filter(r -> r.lech() != 0).toList();
    if (lech.isEmpty()) throw ApiException.invalid("Không có chênh lệch — không cần điều chỉnh");
    List<DongLo> lots = Calc.tonTheoLo(c.db(), null);
    String lyDo = "Điều chỉnh theo kiểm kê " + k.getSoPhieu() + " ngày " + Dates.vi(k.getNgay());
    List<String> ids = new ArrayList<>();
    List<Calc.DongLechKK> thieu = lech.stream().filter(r -> r.lech() < 0).toList();
    List<Calc.DongLechKK> thua = lech.stream().filter(r -> r.lech() > 0).toList();
    if (!thieu.isEmpty()) {
      PhieuKho r = savePhieuKhoTay(c, new PhieuTay(k.getNgay(), "Xuất", null, k.getKho(), lyDo, null, null, null, id), List.of(),
          thieu.stream().map(x -> new DongXuat(x.loaiHang(), null, -x.lech(), null, null)).toList(), false, null);
      ids.add(r.getId());
    }
    if (!thua.isEmpty()) {
      PhieuKho r = savePhieuKhoTay(c, new PhieuTay(k.getNgay(), "Nhập", null, k.getKho(), lyDo, null, null, null, id),
          thua.stream().map(x -> new DongNhapLo(x.loaiHang(), "Theo kiểm kê", x.lech(), giaGanNhat(lots, x.loaiHang()), null, null)).toList(),
          List.of(), true, null);
      ids.add(r.getId());
    }
    k.setPhieuDieuChinh(ids);
  }

  private static double giaGanNhat(List<DongLo> lots, String loaiHang) {
    for (int i = lots.size() - 1; i >= 0; i--) if (lots.get(i).loaiHang.equals(loaiHang)) return lots.get(i).donGia;
    return 0;
  }

  /** Quyền sửa một phiếu kho theo nguồn gốc; phiếu đã huỷ / đang chờ huỷ thì khoá. */
  public void quyenPhieu(Ctx c, PhieuKho p) {
    c.require("Tự động HĐ Mua".equals(p.getNguonGoc()) ? Perm.hdmNhapKho
        : "Tự động HĐ Bán".equals(p.getNguonGoc()) ? Perm.hdbGiaoHang : Perm.khoPhieuTay);
    if (TrangThai.DA_HUY.equals(p.getTrangThai())) throw ApiException.conflict("Phiếu đã huỷ");
    if (c.dangChoXoa("PhieuKho", p.getId())) throw ApiException.conflict("Phiếu đang chờ huỷ — khoá sửa");
  }

  /**
   * "Sửa phiếu": thêm hàng vào phiếu đã lập. Nhập: mỗi dòng = một lô mới (bắt buộc đơn giá, mã lô nối tiếp phiếu).
   * Xuất: trừ theo lô (chỉ định hoặc FIFO), chặn xuất quá tồn — tồn đã tính cả các dòng hiện có của phiếu.
   */
  public void themDongPhieuKho(Ctx c, String id, List<DongNhapLo> dongNhap, List<DongXuat> dongXuat) {
    PhieuKho p = c.phieuKho(id);
    if (p == null) throw ApiException.notFound("Không tìm thấy phiếu");
    quyenPhieu(c, p);
    if ("Nhập".equals(p.getLoai())) {
      List<DongNhapLo> vao = (dongNhap == null ? List.<DongNhapLo>of() : dongNhap).stream()
          .filter(d -> !Texts.blank(d.loaiHang()) && d.soLuong() > 0).toList();
      if (vao.isEmpty()) throw ApiException.invalid("Cần ít nhất 1 dòng hàng có SL > 0");
      for (int i = 0; i < vao.size(); i++) {
        if (c.loaiHang(vao.get(i).loaiHang()) == null) throw ApiException.invalid("Không có mã " + vao.get(i).loaiHang());
        if (!(vao.get(i).donGia() > 0)) throw ApiException.invalid("Dòng " + (i + 1) + ": chưa có đơn giá — nhập kho phải có đơn giá của lô");
      }
      Set<String> daCo = loDaCo(c);
      int goc = p.getDong().size();
      for (int i = 0; i < vao.size(); i++) {
        DongNhapLo d = vao.get(i);
        p.getDong().add(new DongPhieuKho(d.loaiHang(), Texts.trim(d.thuocTinh()), d.soLuong(), maLoMoi(p.getSoPhieu(), p.getSoHoaDon(), goc + i, daCo),
            Math.max(d.donGia(), 0), d.vat(), null, null, null, Texts.trimToNull(d.ghiChu())));
      }
    } else {
      List<DongPhieuKho> them = dongXuatTheoLo(c, p.getKho(), p.getHdId(), dongXuat, p.getNgay());
      if (them.isEmpty()) throw ApiException.invalid("Cần ít nhất 1 dòng hàng có SL > 0");
      p.getDong().addAll(them);
    }
  }

  /** Phiếu kho chỉ sửa Ngày, Ghi chú (KHO-04/05) — chặn đổi ngày làm lô xuất trước khi nhập. */
  public void suaPhieuKho(Ctx c, String id, String ngay, String ghiChu) {
    PhieuKho p = c.phieuKho(id);
    if (p == null) throw ApiException.notFound("Không tìm thấy phiếu");
    quyenPhieu(c, p);
    if (Texts.blank(ngay)) throw ApiException.invalid("Chưa chọn Ngày");
    if (!ngay.equals(p.getNgay())) {
      List<DongLo> lots = Calc.tonTheoLo(c.db(), null);
      if ("Nhập".equals(p.getLoai())) {
        Set<String> los = new HashSet<>();
        for (int i = 0; i < p.getDong().size(); i++) los.add(Calc.maLo(p, i));
        PhieuKho x = c.db().getPhieuKho().stream().filter(q -> "Xuất".equals(q.getLoai()) && TrangThai.HIEU_LUC.equals(q.getTrangThai())
            && q.getNgay().compareTo(ngay) < 0 && q.getDong().stream().anyMatch(d -> d.getLo() != null && los.contains(d.getLo())))
            .findFirst().orElse(null);
        if (x != null) throw ApiException.invalid("Lô của phiếu đã xuất ngày " + Dates.vi(x.getNgay()) + " (phiếu " + x.getSoPhieu()
            + ") — ngày nhập không được sau ngày xuất");
      } else {
        for (DongPhieuKho d : p.getDong()) {
          DongLo l = lots.stream().filter(x -> x.lo.equals(d.getLo())).findFirst().orElse(null);
          if (l != null && l.ngay.compareTo(ngay) > 0)
            throw ApiException.invalid("Lô " + l.lo + " nhập ngày " + Dates.vi(l.ngay) + " — ngày xuất không được trước ngày nhập");
        }
      }
    }
    p.setNgay(ngay);
    p.setGhiChu(ghiChu);
    // Phiếu nhập tự động từ HĐ mua: ngày checklist "Nhập kho" (đã tích) theo ngày phiếu nhập cuối cùng.
    if ("Nhập".equals(p.getLoai()) && "Tự động HĐ Mua".equals(p.getNguonGoc()) && p.getHdId() != null) {
      HopDongMua m = c.hdm(p.getHdId());
      if (m != null) {
        String ngayNhap = Calc.ngayNhapCuoi(c.db(), m.getId());
        for (ChecklistItem it : m.getChecklist())
          if (Calc.CL_NHAP_KHO.equals(it.getTen()) && it.isXong()) it.setNgay(ngayNhap);
      }
    }
  }

  /**
   * Sửa thông tin một lô đã nhập (quy cách, đơn giá, VAT, ghi chú) — SL không sửa. Giá vốn các dòng xuất đã trừ lô này
   * lấy lại theo đơn giá mới. Trả số dòng xuất được cập nhật.
   */
  public int suaLo(Ctx c, String phieuId, int i, String thuocTinh, double donGia, Double vat, String ghiChu) {
    PhieuKho p = c.phieuKho(phieuId);
    if (p == null || !"Nhập".equals(p.getLoai()) || i < 0 || i >= p.getDong().size()) throw ApiException.notFound("Không tìm thấy dòng nhập");
    quyenPhieu(c, p);
    if (!(donGia >= 0)) throw ApiException.invalid("Đơn giá không hợp lệ");
    String lo = Calc.maLo(p, i);
    String tt = Texts.trim(thuocTinh);
    DongPhieuKho d = p.getDong().get(i);
    d.setLo(lo);
    d.setThuocTinh(tt);
    d.setDonGia(donGia);
    d.setVat(vat);
    d.setGhiChu(Texts.trimToNull(ghiChu));
    int capNhat = 0;
    for (PhieuKho q : c.db().getPhieuKho()) {
      if (!"Xuất".equals(q.getLoai())) continue;
      for (DongPhieuKho x : q.getDong()) {
        if (!Objects.equals(x.getLo(), lo)) continue;
        x.setDonGiaGoc(donGia);
        x.setThuocTinh(tt);
        capNhat++;
      }
    }
    return capNhat;
  }
}
