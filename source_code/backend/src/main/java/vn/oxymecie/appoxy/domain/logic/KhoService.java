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
import vn.oxymecie.appoxy.domain.model.DongKiemKe;
import vn.oxymecie.appoxy.domain.model.DongPhieuKho;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.HopDongMua;
import vn.oxymecie.appoxy.domain.model.KiemKe;
import vn.oxymecie.appoxy.domain.model.PhieuKho;
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
   * Kho Chuyển thẳng không có lô: giá gốc đích danh theo HĐ Mua liên quan (KHO-07).
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
      if (Calc.KHO_CHUYEN_THANG.equals(kho)) {
        out.add(new DongPhieuKho(d.loaiHang(), "", d.soLuong(), null, null, null, null,
            Calc.donGiaChuyenThang(c.db(), hdbId, d.loaiHang()), tenTrenHD, ghiChu));
        continue;
      }
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
      soPhieu = c.nextSo(c.cauHinh().getTienToNK(), p.ngay());
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
      soPhieu = c.nextSo(c.cauHinh().getTienToXK(), p.ngay());
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

  // ── Kiểm kê ──────────────────────────────────────────────────────────

  public KiemKe saveKiemKe(Ctx c, KiemKe k, boolean isNew) {
    c.require(Perm.khoPhieuTay);
    if (Texts.blank(k.getNgay())) throw ApiException.invalid("Chưa chọn Ngày kiểm kê");
    if (Texts.blank(k.getKho()) || Calc.KHO_CHUYEN_THANG.equals(k.getKho())) throw ApiException.invalid("Chọn một kho thường để kiểm kê");
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
