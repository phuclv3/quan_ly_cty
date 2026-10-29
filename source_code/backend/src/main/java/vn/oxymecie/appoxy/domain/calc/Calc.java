package vn.oxymecie.appoxy.domain.calc;

import vn.oxymecie.appoxy.domain.model.TrangThai;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.ToDoubleFunction;
import vn.oxymecie.appoxy.common.Dates;
import vn.oxymecie.appoxy.common.Money;
import vn.oxymecie.appoxy.domain.model.ChiPhiHD;
import vn.oxymecie.appoxy.domain.model.ChiPhiPT;
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.domain.model.DongHangBan;
import vn.oxymecie.appoxy.domain.model.DongHangMua;
import vn.oxymecie.appoxy.domain.model.DongKiemKe;
import vn.oxymecie.appoxy.domain.model.DongPhieuKho;
import vn.oxymecie.appoxy.domain.model.DongTienPT;
import vn.oxymecie.appoxy.domain.model.DotTTBan;
import vn.oxymecie.appoxy.domain.model.DotTTMua;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.HopDongMua;
import vn.oxymecie.appoxy.domain.model.HopDongPhuTai;
import vn.oxymecie.appoxy.domain.model.KiemKe;
import vn.oxymecie.appoxy.domain.model.PhieuKho;
import vn.oxymecie.appoxy.domain.model.PhieuThuChi;
import vn.oxymecie.appoxy.domain.model.ThamSoThue;

/**
 * Port của frontend src/app/core/calc.ts — mọi công thức tự tính, hàm thuần.
 * Giữ nguyên kiểu số double + Math.round như JavaScript để client và server ra cùng kết quả.
 */
public final class Calc {
  public static final String KHO_CHUYEN_THANG = "KHO-CT";
  public static final String LCP_HOA_HONG = "CPTH-HH";
  public static final String LCP_VAN_CHUYEN = "CPTH-VC";
  public static final List<String> HO_SO_BAT_BUOC = List.of("Hợp đồng", "BBGH/BBNT", "Hoá đơn");
  public static final List<String> CHECKLIST_HDM = List.of("Đặt hàng", "Thanh toán Đợt 1", "Hàng về", "Kiểm định", "Nhập kho");
  public static final String CL_NHAP_KHO = "Nhập kho";

  private Calc() {}

  public static <T> double sum(List<T> arr, ToDoubleFunction<T> f) {
    double s = 0;
    if (arr == null) return 0;
    for (T x : arr) {
      double v = f.applyAsDouble(x);
      if (!Double.isNaN(v)) s += v;
    }
    return s;
  }

  public static long sauVAT(long truoc, int vat) {
    return Math.round(truoc * (1 + vat / 100.0));
  }

  // ── HĐ Bán ───────────────────────────────────────────────────────────

  public record Thue(double moc, double phan1, double phan2, long thue1, long thue2, long thue) {}

  /** HDB-08: thuế TNDN luỹ tiến trên chênh lệch, mốc = nguong × GTHĐ thực tế trước VAT. */
  public static Thue thueTNDN(double chenhLech, double thucTe, ThamSoThue ts) {
    double moc = ts.getNguong() * thucTe;
    if (chenhLech <= 0) return new Thue(moc, 0, 0, 0, 0, 0);
    double phan1 = Math.min(chenhLech, moc);
    double phan2 = Math.max(chenhLech - moc, 0);
    long thue1 = Math.round(phan1 * ts.getMuc1());
    long thue2 = Math.round(phan2 * ts.getMuc2());
    return new Thue(moc, phan1, phan2, thue1, thue2, thue1 + thue2);
  }

  /** Đã thu của một đợt — chỉ khi phiếu Thu được DUYỆT (F-02); đợt import không có phiếu tính theo số đã ghi. */
  public static long dotBanDaThu(DotTTBan d, Db db) {
    if (d.getPhieuThuId() == null) return d.getSoTienThu() == null ? 0 : d.getSoTienThu();
    PhieuThuChi p = phieu(db, d.getPhieuThuId());
    return p != null && TrangThai.DA_DUYET.equals(p.getTrangThai()) ? p.getSoTienThu() : 0;
  }

  public static long dotBanChoDuyet(DotTTBan d, Db db) {
    if (d.getPhieuThuId() == null) return 0;
    PhieuThuChi p = phieu(db, d.getPhieuThuId());
    return p != null && TrangThai.CHO_DUYET.equals(p.getTrangThai()) ? p.getSoTienThu() : 0;
  }

  private static PhieuThuChi phieu(Db db, String id) {
    for (PhieuThuChi p : db.getPhieuThuChi()) if (p.getId().equals(id)) return p;
    return null;
  }

  public record HdbCalc(long sauVAT, long chenhLech, Thue thue, long daThu, long daThuCho, long phat, long giaTriQT,
                        long conPhaiThu, long cpDuyet, long cpCho, double giaVon, String giaVonNguon, List<String> hoSoThieu) {}

  public static HdbCalc hdbCalc(HopDongBan h, Db db) {
    long sau = sauVAT(h.getTruocVAT(), h.getVat());
    long chenhLech = h.getThucTeTruocVAT() > 0 ? h.getTruocVAT() - h.getThucTeTruocVAT() : 0;
    Thue thue = thueTNDN(chenhLech, h.getThucTeTruocVAT(), h.getThamSoThue());
    long daThu = 0, daThuCho = 0;
    for (DotTTBan d : h.getDotTT()) {
      daThu += dotBanDaThu(d, db);
      daThuCho += dotBanChoDuyet(d, db);
    }
    long cpDuyet = 0, cpCho = 0;
    for (ChiPhiHD c : db.getChiPhiHD()) {
      if (!Objects.equals(c.getHdbId(), h.getId())) continue;
      if (TrangThai.DA_DUYET.equals(c.getTrangThai())) cpDuyet += c.getSoTien();
      if (TrangThai.CHO_DUYET.equals(c.getTrangThai())) cpCho += c.getSoTien();
    }
    long phat = Math.max(h.getPhatHD() == null ? 0 : h.getPhatHD(), 0);
    double giaVonXK = 0;
    for (PhieuKho p : db.getPhieuKho())
      if ("Xuất".equals(p.getLoai()) && Objects.equals(p.getHdId(), h.getId()) && TrangThai.HIEU_LUC.equals(p.getTrangThai()))
        giaVonXK += sum(p.getDong(), d -> (d.getDonGiaGoc() == null ? 0 : d.getDonGiaGoc()) * d.getSoLuong());
    double giaVonHDM = 0;
    for (HopDongMua m : db.getHopDongMua()) {
      if (TrangThai.HUY.equals(m.getTrangThai()) || !hdmChoHdb(m, h.getId())) continue;
      giaVonHDM += Objects.equals(m.getHdbId(), h.getId()) ? hdmTong(m) : sum(dongMuaChoHdb(m, h.getId()), Calc::thanhTienVND);
    }
    double giaVon = giaVonXK > 0 ? giaVonXK : giaVonHDM;
    String nguon = giaVonXK > 0 ? "Xuất kho" : giaVonHDM > 0 ? "HĐ Mua liên quan" : "Chưa có";
    return new HdbCalc(sau, chenhLech, thue, daThu, daThuCho, phat, sau - phat, sau - phat - daThu, cpDuyet, cpCho,
        giaVon, nguon, hoSoThieu(db, "HDB", h.getId()));
  }

  /** HĐ mua có phục vụ HĐ bán này: gắn cả HĐ (hdbId) hoặc có dòng mua cho HĐ bán này. */
  /**
   * Số còn phải giao theo mã hàng của HĐ bán: cơ sở là dòng hàng HĐ bán, chưa có thì dòng của các HĐ mua liên quan;
   * trừ các phiếu Xuất Hiệu lực. Trả null khi không có cơ sở nào để giới hạn (HĐ dịch vụ / dữ liệu cũ).
   */
  public static java.util.Map<String, Double> hdbGioiHanGiao(HopDongBan h, Db db) {
    java.util.Map<String, Double> con = new java.util.LinkedHashMap<>();
    if (h.getDongHang() != null && !h.getDongHang().isEmpty()) {
      for (var d : h.getDongHang()) if (d.getLoaiHang() != null && !d.getLoaiHang().isBlank()) con.merge(d.getLoaiHang(), d.getSoLuong(), Double::sum);
    } else {
      for (HopDongMua m : db.getHopDongMua()) {
        if (TrangThai.HUY.equals(m.getTrangThai()) || !hdmChoHdb(m, h.getId())) continue;
        for (var d : dongMuaChoHdb(m, h.getId())) if (d.getLoaiHang() != null && !d.getLoaiHang().isBlank()) con.merge(d.getLoaiHang(), d.getSoLuong(), Double::sum);
      }
    }
    if (con.isEmpty()) return null;
    for (var p : db.getPhieuKho()) {
      if (!"Xuất".equals(p.getLoai()) || !h.getId().equals(p.getHdId()) || !TrangThai.HIEU_LUC.equals(p.getTrangThai())) continue;
      for (var d : p.getDong()) con.computeIfPresent(d.getLoaiHang(), (k, v) -> v - d.getSoLuong());
    }
    return con;
  }

  /** Một đợt thanh toán để kiểm tra ràng buộc (dùng chung HĐ bán / HĐ mua). */
  public record DotRow(Double tyLe, long soTien, String han) {}

  /**
   * Ràng buộc các đợt thanh toán: tỷ lệ mỗi đợt 0–100%, Σ tỷ lệ ≤ 100%, Σ số tiền ≤ giá trị HĐ (khi đã có giá trị),
   * hạn đợt sau không trước hạn đợt trước. Trả thông báo lỗi đầu tiên, null = hợp lệ.
   */
  public static String loiDotTT(java.util.List<DotRow> ds, double tong) {
    double tyLe = 0;
    long tien = 0;
    String hanTruoc = null;
    for (int i = 0; i < ds.size(); i++) {
      DotRow d = ds.get(i);
      String ten = "Đợt " + (i + 1);
      if (d.tyLe() != null) {
        if (d.tyLe() < 0 || d.tyLe() > 100) return ten + ": tỷ lệ phải từ 0 đến 100%";
        tyLe += d.tyLe();
      }
      tien += d.soTien();
      if (d.han() != null && !d.han().isBlank()) {
        if (hanTruoc != null && d.han().compareTo(hanTruoc) < 0) return ten + ": hạn thanh toán không được trước hạn đợt trước";
        hanTruoc = d.han();
      }
    }
    if (tyLe > 100.05) return "Tổng tỷ lệ các đợt " + String.format("%.1f", tyLe) + "% vượt 100%";
    if (tong > 0 && tien > Math.round(tong) + 1)
      return "Tổng số tiền các đợt (" + Money.vnd(tien) + ") vượt giá trị hợp đồng (" + Money.vnd(Math.round(tong)) + ")";
    return null;
  }

  public static boolean hdmChoHdb(HopDongMua m, String hdbId) {
    if (Objects.equals(m.getHdbId(), hdbId)) return true;
    for (DongHangMua d : m.getChiTiet()) if (Objects.equals(d.getHdbId(), hdbId)) return true;
    return false;
  }

  public static List<DongHangMua> dongMuaChoHdb(HopDongMua m, String hdbId) {
    return m.getChiTiet().stream()
        .filter(d -> Objects.equals(d.getHdbId(), hdbId) || (Objects.equals(m.getHdbId(), hdbId) && d.getHdbId() == null))
        .toList();
  }

  /** Ngày hiệu lực tự điền: có tạm ứng → ngày thực thu đợt 1; không → Ngày ký. */
  public static String ngayHieuLucTuDong(HopDongBan h) {
    if (Boolean.TRUE.equals(h.getCoTamUng())) {
      return h.getDotTT().stream().filter(d -> d.getDot() == 1).findFirst().map(DotTTBan::getNgayThu).orElse(null);
    }
    return h.getNgayKy();
  }

  public static long tongDongBan(List<DongHangBan> ds) {
    long s = 0;
    if (ds != null) for (DongHangBan d : ds) s += Math.round(d.getSoLuong() * d.getDonGia());
    return s;
  }

  public static long tongDongBanTH(List<DongHangBan> ds) {
    long s = 0;
    if (ds != null) for (DongHangBan d : ds) s += Math.round(d.getSoLuong() * d.getDonGiaTH());
    return s;
  }

  /**
   * Trường HĐ bán tự tính (calc.ts apDungTuDongHdb) — sửa trực tiếp trên h (bản làm việc).
   * truocVATGoc: giá trị trước khi tính lại, để biết có phải tính lại số tiền các đợt theo %.
   */
  public static HopDongBan apDungTuDongHdb(HopDongBan h) {
    long truocGoc = h.getTruocVAT();
    if (h.getDongHang() != null && !h.getDongHang().isEmpty()) {
      h.setTruocVAT(tongDongBan(h.getDongHang()));
      h.setThucTeTruocVAT(tongDongBanTH(h.getDongHang()));
    }
    h.setNgayHieuLuc(ngayHieuLucTuDong(h));
    long sau = sauVAT(h.getTruocVAT(), h.getVat());
    for (DotTTBan x : h.getDotTT()) {
      if (h.getTruocVAT() != truocGoc && x.getTyLe() != null) x.setSoTien(Math.round((x.getTyLe() / 100) * sau));
      if (x.getHanNgay() != null) x.setHan(h.getNgayHieuLuc() != null ? Dates.congNgay(h.getNgayHieuLuc(), x.getHanNgay()) : null);
    }
    return h;
  }

  /** HĐ bán không giao hàng (dịch vụ) — F-07: Hiệu lực → Hoàn thành thẳng. */
  public static boolean hdbKhongGiaoHang(HopDongBan h, Db db) {
    if (h.getDongHang() != null && !h.getDongHang().isEmpty()) return false;
    for (HopDongMua m : db.getHopDongMua()) if (!TrangThai.HUY.equals(m.getTrangThai()) && hdmChoHdb(m, h.getId())) return false;
    for (PhieuKho p : db.getPhieuKho())
      if ("Xuất".equals(p.getLoai()) && Objects.equals(p.getHdId(), h.getId()) && TrangThai.HIEU_LUC.equals(p.getTrangThai())) return false;
    return true;
  }

  /** Điều kiện chuyển trạng thái HĐ Bán (HDB-03). */
  public static List<String> hdbThieuDeChuyen(HopDongBan h, String toi, Db db) {
    List<String> out = new ArrayList<>();
    if (TrangThai.HIEU_LUC.equals(toi)) {
      if (h.getSoHD() == null || h.getSoHD().trim().isEmpty()) out.add("Chưa có Số HĐ");
      if (h.getMst() == null || h.getMst().trim().isEmpty()) out.add("Chưa có MST khách hàng");
      if (h.getNgayKy() == null || h.getNgayKy().isEmpty()) out.add("Chưa có Ngày ký");
      if (h.getTruocVAT() <= 0) out.add("Chưa có Giá trị HĐ");
    }
    if (TrangThai.DA_TAT_TOAN.equals(toi)) {
      HdbCalc c = hdbCalc(h, db);
      if (c.conPhaiThu() > 0) out.add("Còn phải thu " + Money.vnd(c.conPhaiThu()));
      if (!c.hoSoThieu().isEmpty()) out.add("Thiếu hồ sơ: " + String.join(", ", c.hoSoThieu()));
      if (c.cpCho() > 0) out.add("Còn chi phí thực hiện Chờ duyệt");
      if (c.daThuCho() > 0) out.add("Còn phiếu Thu chờ duyệt " + Money.vnd(c.daThuCho()) + " (chưa tính vào Đã thu)");
    }
    return out;
  }

  // ── HĐ Mua ───────────────────────────────────────────────────────────

  public static double donGiaVND(DongHangMua d) {
    return d.getDonGia() * ("VNĐ".equals(d.getLoaiTien()) ? 1 : d.getTyGia());
  }

  public static double thanhTienVND(DongHangMua d) {
    return Math.round(d.getSoLuong() * d.getDonGia() * ("VNĐ".equals(d.getLoaiTien()) ? 1 : d.getTyGia()));
  }

  /** HDM-07: tổng giá trị HĐ (VNĐ) — nhập tay hoặc Σ dòng. */
  public static double hdmTong(HopDongMua m) {
    return m.isNhapTay() ? (m.getTongNhapTay() == null ? 0 : m.getTongNhapTay()) : sum(m.getChiTiet(), Calc::thanhTienVND);
  }

  /** SL đã nhập kho (phiếu nhập Hiệu lực) của một dòng HĐ Mua. */
  public static double slDaNhap(String dongId, Db db) {
    double s = 0;
    for (PhieuKho p : db.getPhieuKho()) {
      if (!"Nhập".equals(p.getLoai()) || !TrangThai.HIEU_LUC.equals(p.getTrangThai())) continue;
      for (DongPhieuKho d : p.getDong()) if (Objects.equals(d.getDongHDMua(), dongId)) s += d.getSoLuong();
    }
    return s;
  }

  /** Đã trả của một đợt HĐ Mua — chỉ tính khi phiếu chi được duyệt (HDM-08). */
  public static long dotMuaDaTra(HopDongMua m, DotTTMua dot, Db db) {
    if (m.isThuocPhuTai()) return dot.getSoTienTra() == null ? 0 : dot.getSoTienTra();
    if (dot.getPhieuChiId() == null) return 0;
    PhieuThuChi p = phieu(db, dot.getPhieuChiId());
    return p != null && TrangThai.DA_DUYET.equals(p.getTrangThai()) ? p.getSoTienChi() : 0;
  }

  /** Mốc tính hạn trả NCC: Ngày ký + các mục checklist tiến độ HĐ mua (trừ "Thanh toán Đợt 1"). */
  public static final List<String> MOC_HAN_MUA = List.of("Ngày ký", "Đặt hàng", "Hàng về", "Kiểm định", "Nhập kho");

  /** Ngày của mốc tiến độ HĐ mua (Ngày ký hoặc ngày tích checklist); chưa đạt = null. */
  public static String ngayMocMua(HopDongMua m, String moc) {
    if ("Ngày ký".equals(moc)) return m.getNgayKy();
    for (var x : m.getChecklist()) if (x.getTen().equals(moc)) return x.isXong() ? x.getNgay() : null;
    return null;
  }

  /** Đợt TT NCC: đợt theo % tính lại Số tiền theo tổng HĐ; đợt theo mốc tính Hạn = ngày mốc + N ngày (đợt đã có phiếu chi giữ nguyên). */
  public static HopDongMua apDungTuDongHdm(HopDongMua m) {
    double tong = hdmTong(m);
    for (DotTTMua x : m.getDotTT()) {
      if (x.getPhieuChiId() != null) continue;
      if (x.getTyLe() != null) x.setSoTien(Math.round((x.getTyLe() / 100) * tong));
      if (x.getHanMoc() != null && !x.getHanMoc().isEmpty()) {
        String n = ngayMocMua(m, x.getHanMoc());
        x.setHan(n != null ? Dates.congNgay(n, x.getHanNgay() == null ? 0 : x.getHanNgay()) : null);
      }
    }
    return m;
  }

  public record HdmCalc(double tong, double daTra, double conPhaiTra, double slMua, double slNhap) {}

  public static HdmCalc hdmCalc(HopDongMua m, Db db) {
    double tong = hdmTong(m);
    double daTra = 0;
    for (DotTTMua d : m.getDotTT()) daTra += dotMuaDaTra(m, d, db);
    double slMua = sum(m.getChiTiet(), DongHangMua::getSoLuong);
    double slNhap = sum(m.getChiTiet(), d -> slDaNhap(d.getId(), db));
    return new HdmCalc(tong, daTra, tong - daTra, slMua, slNhap);
  }

  // ── Kế toán ──────────────────────────────────────────────────────────

  /** KT-08: chênh lệch quyết toán = Tạm ứng − Thực chi. */
  public static long chenhLechQuyetToan(PhieuThuChi p, Db db) {
    PhieuThuChi goc = p.getPhieuTamUngGoc() == null ? null : phieu(db, p.getPhieuTamUngGoc());
    return (goc == null ? 0 : goc.getSoTienChi()) - (p.getSoTienThucChi() == null ? 0 : p.getSoTienThucChi());
  }

  /** Tạm ứng chọn được làm gốc khi lập quyết toán: đã duyệt, chưa có quyết toán nào chưa bị từ chối. */
  public static List<PhieuThuChi> tamUngChoQuyetToan(Db db, String truPhieu) {
    java.util.Set<String> dangQT = new java.util.HashSet<>();
    for (PhieuThuChi p : db.getPhieuThuChi())
      if ("Quyết toán tạm ứng".equals(p.getLoai()) && !TrangThai.TU_CHOI.equals(p.getTrangThai()) && !Objects.equals(p.getId(), truPhieu))
        dangQT.add(p.getPhieuTamUngGoc());
    return db.getPhieuThuChi().stream()
        .filter(p -> "Tạm ứng".equals(p.getLoai()) && TrangThai.DA_DUYET.equals(p.getTrangThai()) && !dangQT.contains(p.getId()))
        .toList();
  }

  public record SoDu(long dauKy, long thu, long chi, long lcVao, long lcRa, long qtThu, long qtChi, long cpHD, long soDu) {}

  /** KT-02 / KT-11: số dư nguồn tiền (chỉ phiếu Đã duyệt; phiếu trước Ngày đầu kỳ đã nằm trong số dư đầu kỳ). */
  public static SoDu soDuNguon(String nguonId, Db db, String denNgay) {
    var n = db.getNguonTien().stream().filter(x -> x.getId().equals(nguonId)).findFirst().orElse(null);
    long dauKy = n == null ? 0 : n.getSoDuDauKy();
    String tu = n == null || n.getNgayDauKy() == null ? "" : n.getNgayDauKy();
    long thu = 0, chi = 0, lcVao = 0, lcRa = 0, qtThu = 0, qtChi = 0, cpHD = 0;
    for (PhieuThuChi p : db.getPhieuThuChi()) {
      if (!TrangThai.DA_DUYET.equals(p.getTrangThai()) || !inRange(p.getNgayLap(), tu, denNgay)) continue;
      if ("Luân chuyển".equals(p.getLoai())) {
        if (nguonId.equals(p.getNguonTien())) lcRa += p.getSoTienChi();
        if (nguonId.equals(p.getNguonTienDen())) lcVao += p.getSoTienChi();
        continue;
      }
      if (!nguonId.equals(p.getNguonTien())) continue;
      switch (p.getLoai()) {
        case "Thu" -> thu += p.getSoTienThu();
        case "Chi", "Tạm ứng" -> chi += p.getSoTienChi();
        case "Quyết toán tạm ứng" -> {
          long cl = chenhLechQuyetToan(p, db);
          if (cl > 0) qtThu += cl;
          else qtChi += -cl;
        }
        default -> { }
      }
    }
    for (ChiPhiHD c : db.getChiPhiHD())
      if (TrangThai.DA_DUYET.equals(c.getTrangThai()) && nguonId.equals(c.getNguonTien()) && inRange(c.getNgay(), tu, denNgay)) cpHD += c.getSoTien();
    long soDu = dauKy + thu - chi + qtThu - qtChi + lcVao - lcRa - cpHD;
    return new SoDu(dauKy, thu, chi, lcVao, lcRa, qtThu, qtChi, cpHD, soDu);
  }

  private static boolean inRange(String d, String tu, String denNgay) {
    if (d == null) return false;
    return d.compareTo(tu) >= 0 && (denNgay == null || d.compareTo(denNgay) <= 0);
  }

  // ── Kho ──────────────────────────────────────────────────────────────

  /** Mã lô của dòng i trong phiếu nhập — dòng cũ chưa có mã lô dùng "<số phiếu>-<thứ tự dòng>". */
  public static String maLo(PhieuKho p, int i) {
    DongPhieuKho d = i < p.getDong().size() ? p.getDong().get(i) : null;
    if (d != null && d.getLo() != null && !d.getLo().isEmpty()) return d.getLo();
    return p.getSoPhieu() + "-" + String.format("%02d", i + 1);
  }

  /** Một lô nhập (sheet "3. TonTheoLo"). */
  public static final class DongLo {
    public String lo;
    public String loaiHang;
    public String quyCach;
    public String kho;
    public String ngay;
    public String phieuId;
    public String soHoaDon;
    public String ncc;
    public double donGia;
    public double vat;
    public double nhap;
    public double xuat;
    public double ton;
    public double giaTriTon;
  }

  private static double donGiaNhap(DongPhieuKho d, Map<String, DongHangMua> dongMua) {
    if (d.getDonGia() != null) return d.getDonGia();
    DongHangMua m = d.getDongHDMua() == null ? null : dongMua.get(d.getDongHDMua());
    return m == null ? 0 : Math.round(donGiaVND(m));
  }

  /** KHO-09 tồn theo LÔ: mỗi dòng phiếu nhập Hiệu lực là một lô; trừ các dòng xuất ghi đúng mã lô. */
  public static List<DongLo> tonTheoLo(Db db, String denNgay) {
    Map<String, DongHangMua> dongMua = new HashMap<>();
    for (HopDongMua m : db.getHopDongMua()) for (DongHangMua d : m.getChiTiet()) dongMua.put(d.getId(), d);
    List<PhieuKho> hl = db.getPhieuKho().stream()
        .filter(p -> TrangThai.HIEU_LUC.equals(p.getTrangThai()) && (denNgay == null || p.getNgay().compareTo(denNgay) <= 0))
        .toList();
    Map<String, DongLo> map = new LinkedHashMap<>();
    for (PhieuKho p : hl) {
      if (!"Nhập".equals(p.getLoai())) continue;
      for (int i = 0; i < p.getDong().size(); i++) {
        DongPhieuKho d = p.getDong().get(i);
        String lo = maLo(p, i);
        DongLo g = map.get(lo);
        if (g != null) {
          g.nhap += d.getSoLuong();
          continue;
        }
        g = new DongLo();
        g.lo = lo;
        g.loaiHang = d.getLoaiHang();
        g.quyCach = d.getThuocTinh();
        g.kho = p.getKho();
        g.ngay = p.getNgay();
        g.phieuId = p.getId();
        g.soHoaDon = p.getSoHoaDon();
        g.ncc = p.getNcc();
        g.donGia = donGiaNhap(d, dongMua);
        g.vat = d.getVat() == null ? 0 : d.getVat();
        g.nhap = d.getSoLuong();
        map.put(lo, g);
      }
    }
    for (PhieuKho p : hl) {
      if (!"Xuất".equals(p.getLoai())) continue;
      for (DongPhieuKho d : p.getDong()) {
        DongLo g = d.getLo() == null ? null : map.get(d.getLo());
        if (g != null) g.xuat += d.getSoLuong();
      }
    }
    for (DongLo g : map.values()) {
      g.ton = g.nhap - g.xuat;
      g.giaTriTon = g.ton * g.donGia;
    }
    List<DongLo> out = new ArrayList<>(map.values());
    out.sort(Comparator.<DongLo, String>comparing(x -> x.ngay).thenComparing(x -> x.lo));
    return out;
  }

  /** Tồn gộp theo mã hàng × kho (sheet "3b. TonTheoMaHang"). */
  public record DongTon(String loaiHang, String kho, double nhap, double xuat, double ton) {}

  public static List<DongTon> tonKho(Db db, String denNgay) {
    Map<String, double[]> map = new LinkedHashMap<>();
    for (PhieuKho p : db.getPhieuKho()) {
      if (!TrangThai.HIEU_LUC.equals(p.getTrangThai()) || (denNgay != null && p.getNgay().compareTo(denNgay) > 0)) continue;
      for (DongPhieuKho d : p.getDong()) {
        double[] r = map.computeIfAbsent(d.getLoaiHang() + "\u0001" + p.getKho(), k -> new double[2]);
        if ("Nhập".equals(p.getLoai())) r[0] += d.getSoLuong();
        else r[1] += d.getSoLuong();
      }
    }
    List<DongTon> out = new ArrayList<>();
    for (var e : map.entrySet()) {
      String[] k = e.getKey().split("\u0001", -1);
      out.add(new DongTon(k[0], k[1], e.getValue()[0], e.getValue()[1], e.getValue()[0] - e.getValue()[1]));
    }
    return out;
  }

  /** Tồn hiện tại của một mã hàng — một kho, hoặc mọi kho thường (Chuyển thẳng luôn 0 — KHO-07). */
  public static double tonTai(Db db, String loaiHang, String kho) {
    if (KHO_CHUYEN_THANG.equals(kho)) return 0;
    double s = 0;
    for (DongTon r : tonKho(db, null))
      if (r.loaiHang().equals(loaiHang) && (kho != null ? r.kho().equals(kho) : !r.kho().equals(KHO_CHUYEN_THANG))) s += r.ton();
    return s;
  }

  /** Chuyển thẳng (KHO-07): đơn giá gốc đích danh theo HĐ Mua liên quan của HĐ Bán, đúng mã hàng. */
  public static double donGiaChuyenThang(Db db, String hdbId, String loaiHang) {
    if (hdbId == null) return 0;
    for (HopDongMua m : db.getHopDongMua()) {
      if (TrangThai.HUY.equals(m.getTrangThai()) || !hdmChoHdb(m, hdbId)) continue;
      for (DongHangMua d : dongMuaChoHdb(m, hdbId)) if (loaiHang.equals(d.getLoaiHang())) return Math.round(donGiaVND(d));
    }
    return 0;
  }

  public record DongLechKK(String loaiHang, double soSach, double thucTe, double lech) {}

  /** Đối chiếu kiểm kê: tồn sổ tới ngày kiểm kê tại kho với số đếm, theo mã hàng (không tính phiếu điều chỉnh của chính đợt). */
  public static List<DongLechKK> lechKiemKe(Db db, KiemKe k) {
    Db goc = new Db();
    goc.setPhieuKho(db.getPhieuKho().stream().filter(p -> !Objects.equals(p.getKiemKeId(), k.getId())).toList());
    goc.setHopDongMua(db.getHopDongMua());
    Map<String, double[]> out = new LinkedHashMap<>();
    for (DongTon r : tonKho(goc, k.getNgay()))
      if (r.kho().equals(k.getKho()) && r.ton() != 0) out.put(r.loaiHang(), new double[] {r.ton(), 0});
    for (DongKiemKe d : k.getDong()) out.computeIfAbsent(d.getLoaiHang(), x -> new double[2])[1] += d.getSoLuong();
    List<DongLechKK> list = new ArrayList<>();
    for (var e : out.entrySet())
      list.add(new DongLechKK(e.getKey(), e.getValue()[0], e.getValue()[1], e.getValue()[1] - e.getValue()[0]));
    list.sort(Comparator.comparing(DongLechKK::loaiHang));
    return list;
  }

  // ── Hồ sơ ────────────────────────────────────────────────────────────

  public static List<String> hoSoThieu(Db db, String chu, String chuId) {
    return HO_SO_BAT_BUOC.stream()
        .filter(loai -> db.getHoSo().stream().noneMatch(h -> chu.equals(h.getChu()) && Objects.equals(h.getChuId(), chuId)
            && loai.equals(h.getLoai()) && h.isDaLuu()))
        .toList();
  }

  // ── Phú Tài ──────────────────────────────────────────────────────────

  public record PtCalc(long sauVAT, double giaDauVao, double lnTruoc, long thue, double lnSau, long ptGiu, double oxyGop,
                       long khDaTra) {}

  /** PT-06: chia lợi nhuận. Lỗ: thuế = 0, Phú Tài giữ = 0, Oxy chịu toàn bộ (D-21). */
  public static PtCalc ptCalc(HopDongPhuTai p, Db db) {
    double giaMua = 0;
    for (HopDongMua m : db.getHopDongMua())
      if (p.getHdMua().contains(m.getId()) && !TrangThai.HUY.equals(m.getTrangThai())) giaMua += hdmTong(m);
    double cp = 0;
    for (ChiPhiPT c : p.getChiPhi()) if (c.getLoai() != null && List.of("Vận chuyển", "Hải quan", "Khác").contains(c.getLoai())) cp += c.getSoTien();
    double giaDauVao = giaMua + cp;
    double lnTruoc = p.getTruocVAT() - giaDauVao;
    boolean loi = lnTruoc > 0;
    boolean cong = "Cộng".equals(p.getCachChia() == null ? "Nhân" : p.getCachChia());
    long thue = loi ? Math.round(lnTruoc * p.getTyLeThue()) : 0;
    double lnSau = lnTruoc - thue;
    long ptGiu = loi ? Math.round((cong ? lnTruoc : lnSau) * p.getTyLeGiu()) : 0;
    double oxyGop = lnSau - ptGiu;
    long khDaTra = 0;
    for (var d : p.getDotKH()) khDaTra += d.getSoTien();
    return new PtCalc(sauVAT(p.getTruocVAT(), p.getVat()), giaDauVao, lnTruoc, thue, lnSau, ptGiu, oxyGop, khDaTra);
  }

  /** PT-10: số dư quỹ ảo Phú Tài (tuỳ chọn theo HĐ). */
  public static long[] soDuQuyPT(Db db, String hdptId) {
    long thu = 0, chi = 0;
    for (DongTienPT d : db.getDongTienPT()) {
      if (hdptId != null && !hdptId.equals(d.getHdptId())) continue;
      if ("Thu về PT".equals(d.getChieu())) thu += d.getSoTien();
      else chi += d.getSoTien();
    }
    return new long[] {thu, chi, thu - chi};
  }
}
