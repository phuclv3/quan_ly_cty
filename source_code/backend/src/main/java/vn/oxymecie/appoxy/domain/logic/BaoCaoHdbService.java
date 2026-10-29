package vn.oxymecie.appoxy.domain.logic;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.domain.model.DotTTBan;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.LoaiHang;
import vn.oxymecie.appoxy.domain.model.TrangThai;
import vn.oxymecie.appoxy.domain.model.ViecGiao;

/**
 * Báo cáo kinh doanh của Hợp đồng bán: KPI (kèm so sánh cùng kỳ), giá trị ký theo tháng (OXY / Phú Tài), trạng thái,
 * theo người phụ trách, tiến độ giao hàng / thu tiền, theo nhóm hàng, top HĐ lớn. Mọi số liệu tính ở backend từ dữ liệu HĐ
 * mà người dùng được xem; "HĐ ký" = HĐ có Ngày ký trong kỳ, không gồm Báo giá và HĐ Huỷ; giá trị = trước VAT.
 */
@Service
public class BaoCaoHdbService {

  public record Loc(int nam, Integer quy, Integer thang, String phapNhan, String soSanh) {}

  /** hienTai / kyTruoc (null = không so sánh hoặc kỳ trước = 0) / pct thay đổi / chuoi 12 tháng của năm đang xem. */
  public record Kpi(double hienTai, Double kyTruoc, Double pct, List<Double> chuoi) {}

  public record Thang(int t, long oxy, long phuTai) {}

  public record Muc(String ma, String nhan, int n) {}

  public record SaleRow(String id, long giaTri, int n) {}

  public record Nhom(String ten, long giaTri) {}

  public record Top(String id, String soHD, String tenKH, long giaTri, String trangThai, double pctThu, String sale) {}

  public record SuCo(int hdQuaHan, int suCoMo) {}

  public record Dto(String capNhat, Loc loc, Kpi giaTri, Kpi soHd, Kpi binhQuan, int baoGia, int huy, int phatSinh, SuCo suCo,
                    List<Thang> thangs, List<Muc> trangThai, int duDkTatToan, int daTatToan, List<SaleRow> sales,
                    List<Muc> giaoHang, List<Muc> thuTien, List<Nhom> nhomHang, List<Top> top) {}

  /** Một HĐ đã tính sẵn các số cần dùng nhiều lần. */
  private record Row(HopDongBan h, Calc.HdbCalc c, long giaTri) {}

  public Dto tao(Db visible, Db raw, Loc in, LocalDate today) {
    Loc loc = chuan(in, today);
    int t1 = loc.thang() != null ? loc.thang() : loc.quy() != null ? loc.quy() * 3 - 2 : 1;
    int t2 = loc.thang() != null ? loc.thang() : loc.quy() != null ? loc.quy() * 3 : 12;
    boolean soSanh = "cungKy".equals(loc.soSanh());

    List<HopDongBan> hds = visible.getHopDongBan().stream().filter(h -> khopPhapNhan(h, loc.phapNhan())).toList();
    List<Row> trongKy = ky(hds, raw, loc.nam(), t1, t2);
    List<Row> kyTruoc = soSanh ? ky(hds, raw, loc.nam() - 1, t1, t2) : List.of();
    List<Row> ca = ky(hds, raw, loc.nam(), 1, 12);

    long tong = trongKy.stream().mapToLong(Row::giaTri).sum();
    long tongTruoc = kyTruoc.stream().mapToLong(Row::giaTri).sum();
    double bq = trongKy.isEmpty() ? 0 : (double) tong / trongKy.size();
    double bqTruoc = kyTruoc.isEmpty() ? 0 : (double) tongTruoc / kyTruoc.size();

    List<Double> chuoiGt = new ArrayList<>();
    List<Double> chuoiN = new ArrayList<>();
    List<Double> chuoiBq = new ArrayList<>();
    List<Thang> thangs = new ArrayList<>();
    for (int m = 1; m <= 12; m++) {
      final int mm = m;
      List<Row> rs = ca.stream().filter(r -> thangKy(r.h()) == mm).toList();
      long gt = rs.stream().mapToLong(Row::giaTri).sum();
      chuoiGt.add((double) gt);
      chuoiN.add((double) rs.size());
      chuoiBq.add(rs.isEmpty() ? 0 : (double) gt / rs.size());
      if (m >= t1 && m <= t2) {
        long pt = rs.stream().filter(r -> Boolean.TRUE.equals(r.h().getThuocPhuTai())).mapToLong(Row::giaTri).sum();
        thangs.add(new Thang(m, gt - pt, pt));
      }
    }

    // Báo giá / Huỷ trong kỳ: tính theo Ngày ký, chưa có thì ngày tạo.
    int baoGia = 0, huy = 0;
    for (HopDongBan h : hds) {
      boolean bg = TrangThai.BAO_GIA.equals(h.getTrangThai());
      boolean hu = TrangThai.HUY.equals(h.getTrangThai());
      if ((!bg && !hu) || !trongKyThang(ngayChuan(h), loc.nam(), t1, t2)) continue;
      if (bg) baoGia++;
      else huy++;
    }

    Set<String> hdbIds = visible.getHopDongBan().stream().map(HopDongBan::getId).collect(Collectors.toSet());
    List<ViecGiao> suCoMo = raw.getViecGiao().stream()
        .filter(v -> Boolean.TRUE.equals(v.getSuCo()) && v.getXongLuc() == null && v.getHdbId() != null && hdbIds.contains(v.getHdbId()))
        .toList();
    String homNay = today.toString();
    long hdQuaHan = suCoMo.stream().filter(v -> v.getHan() != null && v.getHan().compareTo(homNay) < 0).map(ViecGiao::getHdbId).distinct().count();
    Set<String> coSuCoMo = suCoMo.stream().map(ViecGiao::getHdbId).collect(Collectors.toSet());

    int phatSinh = 0, duDk = 0, daTT = 0;
    Map<String, Integer> dem = new LinkedHashMap<>();
    for (String t : List.of(TrangThai.HIEU_LUC, TrangThai.DANG_GIAO_HANG, TrangThai.HOAN_THANH, TrangThai.DA_TAT_TOAN)) dem.put(t, 0);
    Map<String, Integer> giao = new LinkedHashMap<>();
    for (String k : List.of("Chưa giao", "Giao một phần", "Giao đủ", "Không giao hàng")) giao.put(k, 0);
    Map<String, Integer> thu = new LinkedHashMap<>();
    for (String k : List.of("Chưa thu", "Thu một phần", "Thu đủ")) thu.put(k, 0);
    Map<String, long[]> sales = new LinkedHashMap<>();
    Map<String, Long> nhom = new LinkedHashMap<>();
    for (Row r : trongKy) {
      HopDongBan h = r.h();
      dem.merge(h.getTrangThai(), 1, Integer::sum);
      if (quaHan(h, raw, homNay) || r.c().phat() > 0 || coSuCoMo.contains(h.getId())) phatSinh++;
      if (TrangThai.DA_TAT_TOAN.equals(h.getTrangThai())) daTT++;
      else if (TrangThai.HOAN_THANH.equals(h.getTrangThai()) && Calc.hdbThieuDeChuyen(h, TrangThai.DA_TAT_TOAN, raw).isEmpty()) duDk++;
      giao.merge(giaoHang(h, raw), 1, Integer::sum);
      thu.merge(thuTien(r.c()), 1, Integer::sum);
      long[] s = sales.computeIfAbsent(Objects.toString(h.getSale(), ""), k -> new long[2]);
      s[0] += r.giaTri();
      s[1]++;
      gomNhom(h, raw, nhom);
    }

    List<Muc> mTrangThai = dem.entrySet().stream().map(e -> new Muc(e.getKey(), e.getKey(), e.getValue())).toList();
    List<SaleRow> mSales = sales.entrySet().stream().map(e -> new SaleRow(e.getKey(), e.getValue()[0], (int) e.getValue()[1]))
        .sorted(Comparator.comparingLong(SaleRow::giaTri).reversed()).limit(6).toList();
    List<Nhom> mNhom = nhom.entrySet().stream().map(e -> new Nhom(e.getKey(), e.getValue()))
        .sorted(Comparator.comparingLong(Nhom::giaTri).reversed()).limit(6).toList();
    List<Top> top = trongKy.stream().sorted(Comparator.comparingLong(Row::giaTri).reversed()).limit(5)
        .map(r -> new Top(r.h().getId(), r.h().getSoHD(), r.h().getTenKH(), r.giaTri(), r.h().getTrangThai(),
            r.c().sauVAT() > 0 ? Math.round(r.c().daThu() * 1000.0 / r.c().sauVAT()) / 10.0 : 0, r.h().getSale()))
        .toList();

    return new Dto(homNay, loc, kpi(tong, soSanh ? (double) tongTruoc : null, soSanh && !kyTruoc.isEmpty(), chuoiGt),
        kpi(trongKy.size(), soSanh ? (double) kyTruoc.size() : null, soSanh && !kyTruoc.isEmpty(), chuoiN),
        kpi(bq, soSanh ? bqTruoc : null, soSanh && !kyTruoc.isEmpty(), chuoiBq), baoGia, huy, phatSinh,
        new SuCo((int) hdQuaHan, suCoMo.size()), thangs, mTrangThai, duDk, daTT, mSales,
        giao.entrySet().stream().map(e -> new Muc(e.getKey(), e.getKey(), e.getValue())).toList(),
        thu.entrySet().stream().map(e -> new Muc(e.getKey(), e.getKey(), e.getValue())).toList(), mNhom, top);
  }

  // ── Bộ lọc ──────────────────────────────────────────────────────────

  private static Loc chuan(Loc in, LocalDate today) {
    int nam = in.nam() > 0 ? in.nam() : today.getYear();
    if (nam < 2000 || nam > 2100) throw ApiException.invalid("Năm không hợp lệ");
    Integer quy = in.quy();
    Integer thang = in.thang();
    if (quy != null && (quy < 1 || quy > 4)) throw ApiException.invalid("Quý phải từ 1 đến 4");
    if (thang != null && (thang < 1 || thang > 12)) throw ApiException.invalid("Tháng phải từ 1 đến 12");
    // Chọn tháng thì bỏ quý (tháng hẹp hơn).
    if (thang != null) quy = null;
    String pn = "OXY".equals(in.phapNhan()) || "PHU_TAI".equals(in.phapNhan()) ? in.phapNhan() : "TAT_CA";
    return new Loc(nam, quy, thang, pn, "cungKy".equals(in.soSanh()) ? "cungKy" : "khong");
  }

  private static boolean khopPhapNhan(HopDongBan h, String pn) {
    boolean phuTai = Boolean.TRUE.equals(h.getThuocPhuTai());
    return "TAT_CA".equals(pn) || ("PHU_TAI".equals(pn) == phuTai);
  }

  private static String ngayChuan(HopDongBan h) {
    if (h.getNgayKy() != null && !h.getNgayKy().isBlank()) return h.getNgayKy();
    return h.getTaoLuc() == null || h.getTaoLuc().length() < 10 ? "" : h.getTaoLuc().substring(0, 10);
  }

  private static boolean trongKyThang(String ngay, int nam, int t1, int t2) {
    if (ngay.length() < 7 || !ngay.startsWith(nam + "-")) return false;
    int m = Integer.parseInt(ngay.substring(5, 7));
    return m >= t1 && m <= t2;
  }

  private static int thangKy(HopDongBan h) {
    return Integer.parseInt(h.getNgayKy().substring(5, 7));
  }

  /** HĐ ký trong năm + khoảng tháng: có Ngày ký, không Báo giá, không Huỷ. */
  private static List<Row> ky(List<HopDongBan> hds, Db raw, int nam, int t1, int t2) {
    List<Row> out = new ArrayList<>();
    for (HopDongBan h : hds) {
      if (TrangThai.BAO_GIA.equals(h.getTrangThai()) || TrangThai.HUY.equals(h.getTrangThai())) continue;
      if (h.getNgayKy() == null || !trongKyThang(h.getNgayKy(), nam, t1, t2)) continue;
      out.add(new Row(h, Calc.hdbCalc(h, raw), h.getTruocVAT()));
    }
    return out;
  }

  private static Kpi kpi(double hienTai, Double kyTruoc, boolean coKyTruoc, List<Double> chuoi) {
    Double pct = kyTruoc != null && coKyTruoc && kyTruoc > 0 ? Math.round((hienTai - kyTruoc) / kyTruoc * 1000.0) / 10.0 : null;
    return new Kpi(hienTai, kyTruoc, pct, chuoi);
  }

  // ── Phân loại ───────────────────────────────────────────────────────

  private static boolean quaHan(HopDongBan h, Db raw, String homNay) {
    for (DotTTBan d : h.getDotTT()) if (d.getHan() != null && d.getHan().compareTo(homNay) < 0 && Calc.dotBanDaThu(d, raw) < d.getSoTien()) return true;
    return false;
  }

  private static String giaoHang(HopDongBan h, Db raw) {
    boolean daXuat = raw.getPhieuKho().stream().anyMatch(p -> "Xuất".equals(p.getLoai()) && Objects.equals(p.getHdId(), h.getId())
        && TrangThai.HIEU_LUC.equals(p.getTrangThai()));
    if (!daXuat) return Calc.hdbKhongGiaoHang(h, raw) ? "Không giao hàng" : "Chưa giao";
    Map<String, Double> con = Calc.hdbGioiHanGiao(h, raw);
    if (con != null) return con.values().stream().allMatch(v -> v <= 1e-9) ? "Giao đủ" : "Giao một phần";
    return TrangThai.HOAN_THANH.equals(h.getTrangThai()) || TrangThai.DA_TAT_TOAN.equals(h.getTrangThai()) ? "Giao đủ" : "Giao một phần";
  }

  private static String thuTien(Calc.HdbCalc c) {
    if (c.daThu() <= 0) return "Chưa thu";
    return c.giaTriQT() > 0 && c.daThu() >= c.giaTriQT() ? "Thu đủ" : "Thu một phần";
  }

  /** Giá trị theo nhóm hàng của HĐ: theo dòng sản phẩm (SL × đơn giá trước VAT); HĐ chưa có dòng thì vào "Khác". */
  private static void gomNhom(HopDongBan h, Db raw, Map<String, Long> out) {
    if (h.getDongHang() == null || h.getDongHang().isEmpty()) {
      out.merge("Khác", h.getTruocVAT(), Long::sum);
      return;
    }
    for (var d : h.getDongHang()) {
      LoaiHang l = raw.getLoaiHang().stream().filter(x -> x.getId().equals(d.getLoaiHang())).findFirst().orElse(null);
      String nhom = l == null || l.getNhom() == null || l.getNhom().isBlank() ? "Khác" : l.getNhom();
      out.merge(nhom, Math.round(d.getSoLuong() * d.getDonGia()), Long::sum);
    }
  }
}
