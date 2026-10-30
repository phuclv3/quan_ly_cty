package vn.oxymecie.appoxy.domain.logic;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.model.ChiPhiHD;
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.domain.model.DotTTBan;
import vn.oxymecie.appoxy.domain.model.DotTTMua;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.HopDongMua;
import vn.oxymecie.appoxy.domain.model.LoaiChiPhi;
import vn.oxymecie.appoxy.domain.model.NguonTien;
import vn.oxymecie.appoxy.domain.model.PhieuThuChi;
import vn.oxymecie.appoxy.domain.model.TrangThai;

/**
 * Báo cáo tổng quan kế toán: lợi nhuận gộp, công nợ (phải thu / phải trả / tuổi nợ), dòng tiền theo tháng, dự báo tiền 30 ngày,
 * số dư theo nguồn, thu chi theo danh mục, chi phí cố định, kết quả kinh doanh tóm tắt. Mọi số liệu tính ở backend.
 *
 * <p>Quy ước: tiền = phiếu Đã duyệt (cùng quy tắc số dư nguồn tiền); Doanh thu = tổng trước VAT của HĐ bán ký trong kỳ (không Báo giá / Huỷ);
 * Giá vốn = giá vốn tính cho HĐ đó (xuất kho, chưa có thì HĐ mua liên quan); Chi phí cố định = phiếu Chi có loại chi phí thuộc nhóm "Vận hành";
 * Chi phí bán hàng biến đổi = Chi phí thực hiện HĐ Đã duyệt. Pháp nhân: HĐ theo ô "Thuộc Phú Tài", tiền theo Công ty của nguồn tiền.
 */
@Service
public class BaoCaoKtService {

  public record Loc(int nam, Integer quy, Integer thang, String phapNhan, String soSanh) {}

  public record Kpi(double hienTai, Double kyTruoc, Double pct, List<Double> chuoi) {}

  public record LoiNhuan(long hienTai, Long kyTruoc, Double pct, double bienGopPct) {}

  public record CongNoKpi(long tong, long trongHan, long quaHan, Double pct, List<Double> chuoi) {}

  public record ThangTien(int t, long thu, long chi, long soDu) {}

  public record DuBao(String tuNgay, String denNgay, long khaDung, long thuDuKien, long chiDuKien, long sau30Ngay, Double pctGiam,
                      Double soThangChiPhi) {}

  public record NguonDu(String id, String congTy, String ten, long soDu) {}

  public record DanhMuc(String ten, String loai, long soTien) {}

  public record Tuoi(String nhan, long phaiThu, long phaiTra) {}

  public record PhapNhan(String ma, String ten, long soTien) {}

  public record KhNoQuaHan(String hdbId, String soHD, String tenKH, long quaHan, int soNgay) {}

  public record NccCanTra(String hdmId, String soHD, String tenNCC, long soTien, String han, int soNgay) {}

  public record CoCau(String ten, long soTien) {}

  public record ThangCP(int t, long tong, List<Long> theo) {}

  public record Kqkd(long doanhThu, long giaVon, long loiNhuanGop, long cpCoDinh, long cpBienDoi, long loiNhuanTruocThue) {}

  public record Dto(String capNhat, Loc loc, LoiNhuan loiNhuanGop, CongNoKpi phaiThu, CongNoKpi phaiTra, Kpi cpCoDinhThang, DuBao duBao,
                    List<ThangTien> dongTien, List<NguonDu> soDuNguon, List<DanhMuc> danhMuc, List<Tuoi> tuoiNo,
                    List<PhapNhan> phaiThuPhapNhan, List<KhNoQuaHan> khQuaHan, List<NccCanTra> nccCanTra, List<CoCau> cpCoCau,
                    List<String> cpLoai, List<ThangCP> cpTheoThang, Kqkd kqkd) {}

  private static final String PT_NHAN = "Phú Tài";

  public Dto tao(Db raw, Loc in, LocalDate today) {
    Loc loc = chuan(in, today);
    String pn = loc.phapNhan();
    int t1 = loc.thang() != null ? loc.thang() : loc.quy() != null ? loc.quy() * 3 - 2 : 1;
    int t2 = loc.thang() != null ? loc.thang() : loc.quy() != null ? loc.quy() * 3 : 12;
    boolean soSanh = "cungKy".equals(loc.soSanh());
    String homNay = today.toString();

    List<HopDongBan> hdbs = raw.getHopDongBan().stream().filter(h -> khopHd(h.getThuocPhuTai(), pn)).toList();
    List<HopDongMua> hdms = raw.getHopDongMua().stream().filter(m -> khopHd(m.isThuocPhuTai(), pn)).toList();
    List<NguonTien> nguons = raw.getNguonTien().stream().filter(n -> khopNguon(n, pn)).toList();
    Map<String, NguonTien> nguonMap = new HashMap<>();
    for (NguonTien n : nguons) nguonMap.put(n.getId(), n);
    Map<String, LoaiChiPhi> loaiMap = new HashMap<>();
    for (LoaiChiPhi l : raw.getLoaiChiPhi()) loaiMap.put(l.getId(), l);

    // ── Lợi nhuận gộp ──
    long[] ky = doanhThuGiaVon(hdbs, raw, loc.nam(), t1, t2);
    long[] kyTruoc = soSanh ? doanhThuGiaVon(hdbs, raw, loc.nam() - 1, t1, t2) : null;
    long lnGop = ky[0] - ky[1];
    Long lnTruoc = kyTruoc == null ? null : kyTruoc[0] - kyTruoc[1];
    LoiNhuan loiNhuan = new LoiNhuan(lnGop, lnTruoc, pct(lnGop, lnTruoc), ky[0] > 0 ? Math.round(lnGop * 1000.0 / ky[0]) / 10.0 : 0);

    // ── Công nợ ──
    long[] pt = phaiThu(hdbs, raw, homNay);
    long[] ptTruoc = soSanh ? new long[] {phaiThuTai(hdbs, raw, today.minusYears(1).toString())} : null;
    List<Double> chuoiPt = new ArrayList<>();
    List<Double> chuoiTra = new ArrayList<>();
    for (int m = 1; m <= 12; m++) {
      String cuoi = YearMonth.of(loc.nam(), m).atEndOfMonth().toString();
      chuoiPt.add((double) phaiThuTai(hdbs, raw, cuoi));
      chuoiTra.add((double) phaiTraTai(hdms, raw, cuoi));
    }
    long[] tra = phaiTra(hdms, raw, homNay);
    long[] traTruoc = soSanh ? new long[] {phaiTraTai(hdms, raw, today.minusYears(1).toString())} : null;
    CongNoKpi kpiThu = new CongNoKpi(pt[0] + pt[1], pt[0], pt[1], ptTruoc == null ? null : pct(pt[0] + pt[1], ptTruoc[0]), chuoiPt);
    CongNoKpi kpiTra = new CongNoKpi(tra[0] + tra[1], tra[0], tra[1], traTruoc == null ? null : pct(tra[0] + tra[1], traTruoc[0]), chuoiTra);

    // ── Chi phí cố định / tháng ──
    List<Double> chuoiCp = new ArrayList<>();
    for (int m = 1; m <= 12; m++) chuoiCp.add((double) cpCoDinh(raw, nguonMap, loaiMap, loc.nam(), m, m));
    double cpThang = cpCoDinh(raw, nguonMap, loaiMap, loc.nam(), t1, t2) / (double) soThang(loc.nam(), t1, t2, today);
    Double cpThangTruoc = soSanh ? cpCoDinh(raw, nguonMap, loaiMap, loc.nam() - 1, t1, t2) / (double) soThang(loc.nam() - 1, t1, t2, today) : null;
    Kpi kpiCp = new Kpi(cpThang, cpThangTruoc, cpThangTruoc != null && cpThangTruoc > 0 ? Math.round((cpThang - cpThangTruoc) / cpThangTruoc * 1000.0) / 10.0 : null, chuoiCp);

    // ── Dòng tiền theo tháng ──
    int tCuoi = loc.nam() == today.getYear() ? Math.min(t2, today.getMonthValue()) : t2;
    List<ThangTien> dongTien = new ArrayList<>();
    for (int m = t1; m <= tCuoi; m++) {
      String dau = YearMonth.of(loc.nam(), m).minusMonths(1).atEndOfMonth().toString();
      String cuoi = YearMonth.of(loc.nam(), m).atEndOfMonth().toString();
      long thu = 0, chi = 0, soDu = 0;
      for (NguonTien n : nguons) {
        Calc.SoDu a = Calc.soDuNguon(n.getId(), raw, dau);
        Calc.SoDu b = Calc.soDuNguon(n.getId(), raw, cuoi);
        thu += (b.thu() + b.qtThu()) - (a.thu() + a.qtThu());
        chi += (b.chi() + b.qtChi() + b.cpHD()) - (a.chi() + a.qtChi() + a.cpHD());
        soDu += b.soDu();
      }
      dongTien.add(new ThangTien(m, thu, chi, soDu));
    }

    // ── Số dư theo nguồn + dự báo 30 ngày ──
    List<NguonDu> soDuNguon = new ArrayList<>();
    long khaDung = 0;
    for (NguonTien n : nguons.stream().sorted(Comparator.comparing(NguonTien::getCongTy, Comparator.nullsLast(Comparator.naturalOrder()))
        .thenComparing(NguonTien::getId)).toList()) {
      long sd = Calc.soDuNguon(n.getId(), raw, homNay).soDu();
      soDuNguon.add(new NguonDu(n.getId(), n.getCongTy(), n.getTen(), sd));
      if (TrangThai.DANG_DUNG.equals(n.getTrangThai())) khaDung += sd;
    }
    String h30 = today.plusDays(30).toString();
    long thuDk = chuaThu(hdbs, raw, h30), chiNcc = chuaTra(hdms, raw, h30);
    long cpBinhQuan = Math.round(cpThang);
    long chiDk = chiNcc + cpBinhQuan;
    long sau30 = khaDung + thuDk - chiDk;
    Double pctGiam = khaDung > 0 && sau30 < khaDung ? Math.round((khaDung - sau30) * 1000.0 / khaDung) / 10.0 : null;
    Double soThangCp = pctGiam != null && cpBinhQuan > 0 ? Math.round(Math.max(0, sau30) * 10.0 / cpBinhQuan) / 10.0 : null;
    DuBao duBao = new DuBao(homNay, h30, khaDung, thuDk, chiDk, sau30, pctGiam, soThangCp);

    // ── Thu chi theo danh mục (kỳ đang xem) ──
    Map<String, long[]> thuDm = new LinkedHashMap<>();
    Map<String, long[]> chiDm = new LinkedHashMap<>();
    for (PhieuThuChi p : raw.getPhieuThuChi()) {
      if (!TrangThai.DA_DUYET.equals(p.getTrangThai()) || !trongKy(p.getNgayLap(), loc.nam(), t1, t2) || !nguonMap.containsKey(p.getNguonTien())) continue;
      boolean tuHdb = p.getPhatSinh() != null && "HDB-DotTT".equals(p.getPhatSinh().getLoai());
      boolean tuHdm = p.getPhatSinh() != null && "HDM-DotTT".equals(p.getPhatSinh().getLoai());
      switch (p.getLoai()) {
        case "Thu" -> thuDm.computeIfAbsent(tuHdb ? "Thu tiền bán hàng" : "Thu khác", k -> new long[1])[0] += p.getSoTienThu();
        case "Chi", "Tạm ứng" -> chiDm.computeIfAbsent(tuHdm ? "Chi mua hàng" : tenLoai(loaiMap, p.getLoaiChiPhi(), "Chi khác"), k -> new long[1])[0] += p.getSoTienChi();
        default -> { }
      }
    }
    // Chi phí thực hiện của HĐ bán thuộc Phú Tài do kế toán Phú Tài ghi nhận — Oxy chỉ điều phối dòng tiền (số dư nguồn vẫn tính), không ghi nhận chi phí.
    java.util.Set<String> hdbPhuTai = raw.getHopDongBan().stream().filter(h -> Boolean.TRUE.equals(h.getThuocPhuTai())).map(HopDongBan::getId).collect(java.util.stream.Collectors.toSet());
    for (ChiPhiHD c : raw.getChiPhiHD())
      if (TrangThai.DA_DUYET.equals(c.getTrangThai()) && trongKy(c.getNgay(), loc.nam(), t1, t2) && nguonMap.containsKey(c.getNguonTien()) && !hdbPhuTai.contains(c.getHdbId()))
        chiDm.computeIfAbsent(tenLoai(loaiMap, c.getLoaiChiPhi(), "Chi khác"), k -> new long[1])[0] += c.getSoTien();
    List<DanhMuc> danhMuc = new ArrayList<>();
    thuDm.entrySet().stream().sorted((a, b) -> Long.compare(b.getValue()[0], a.getValue()[0])).limit(3)
        .forEach(e -> danhMuc.add(new DanhMuc(e.getKey(), "Thu", e.getValue()[0])));
    chiDm.entrySet().stream().sorted((a, b) -> Long.compare(b.getValue()[0], a.getValue()[0])).limit(5)
        .forEach(e -> danhMuc.add(new DanhMuc(e.getKey(), "Chi", e.getValue()[0])));

    // ── Tuổi nợ, phải thu theo pháp nhân, KH quá hạn, NCC cần trả ──
    String[] nhanTuoi = {"Chưa đến hạn", "1–30 ngày", "31–60 ngày", "61–90 ngày", "> 90 ngày"};
    long[] tuoiThu = new long[5], tuoiTra = new long[5];
    long ptOxy = 0, ptPt = 0;
    List<KhNoQuaHan> khQuaHan = new ArrayList<>();
    for (HopDongBan h : hdbs) {
      if (!hdbHoatDong(h)) continue;
      long quaHan = 0;
      int maxNgay = 0;
      for (DotTTBan d : h.getDotTT()) {
        long con = d.getSoTien() - Calc.dotBanDaThu(d, raw);
        if (con <= 0) continue;
        int ngay = soNgayQuaHan(d.getHan(), today);
        tuoiThu[bucket(ngay)] += con;
        if (Boolean.TRUE.equals(h.getThuocPhuTai())) ptPt += con;
        else ptOxy += con;
        if (ngay > 0) {
          quaHan += con;
          maxNgay = Math.max(maxNgay, ngay);
        }
      }
      if (quaHan > 0) khQuaHan.add(new KhNoQuaHan(h.getId(), h.getSoHD(), h.getTenKH(), quaHan, maxNgay));
    }
    khQuaHan.sort(Comparator.comparingLong(KhNoQuaHan::quaHan).reversed());
    String h14 = today.plusDays(14).toString();
    List<NccCanTra> nccCanTra = new ArrayList<>();
    for (HopDongMua m : hdms) {
      if (!hdmHoatDong(m)) continue;
      for (DotTTMua d : m.getDotTT()) {
        long con = d.getSoTien() - Calc.dotMuaDaTra(m, d, raw);
        if (con <= 0) continue;
        tuoiTra[bucket(soNgayQuaHan(d.getHan(), today))] += con;
        if (d.getHan() != null && d.getHan().compareTo(h14) <= 0) nccCanTra.add(new NccCanTra(m.getId(), m.getSoHD(), m.getTenNCC(), con, d.getHan(), soNgayQuaHan(d.getHan(), today)));
      }
    }
    nccCanTra.sort(Comparator.comparing(NccCanTra::han));
    List<Tuoi> tuoiNo = new ArrayList<>();
    for (int i = 0; i < 5; i++) tuoiNo.add(new Tuoi(nhanTuoi[i], tuoiThu[i], tuoiTra[i]));
    List<PhapNhan> phapNhan = new ArrayList<>();
    phapNhan.add(new PhapNhan("OXY", "OXY", ptOxy));
    phapNhan.add(new PhapNhan("PHU_TAI", PT_NHAN, ptPt));

    // ── Chi phí cố định: cơ cấu + theo tháng ──
    Map<String, Long> cocau = new LinkedHashMap<>();
    for (PhieuThuChi p : raw.getPhieuThuChi()) {
      String ten = tenCoDinh(p, loaiMap, nguonMap, loc.nam(), t1, t2);
      if (ten != null) cocau.merge(ten, p.getSoTienChi(), Long::sum);
    }
    List<CoCau> cpCoCau = cocau.entrySet().stream().map(e -> new CoCau(e.getKey(), e.getValue()))
        .sorted(Comparator.comparingLong(CoCau::soTien).reversed()).toList();
    List<String> cpLoai = cpCoCau.stream().map(CoCau::ten).toList();
    List<ThangCP> cpTheoThang = new ArrayList<>();
    for (int m = t1; m <= tCuoi; m++) {
      List<Long> theo = new ArrayList<>(java.util.Collections.nCopies(cpLoai.size(), 0L));
      for (PhieuThuChi p : raw.getPhieuThuChi()) {
        String ten = tenCoDinh(p, loaiMap, nguonMap, loc.nam(), m, m);
        if (ten != null) theo.set(cpLoai.indexOf(ten), theo.get(cpLoai.indexOf(ten)) + p.getSoTienChi());
      }
      cpTheoThang.add(new ThangCP(m, theo.stream().mapToLong(Long::longValue).sum(), theo));
    }

    // ── Kết quả kinh doanh tóm tắt ──
    long cpCd = cpCoCau.stream().mapToLong(CoCau::soTien).sum();
    long cpBd = raw.getChiPhiHD().stream().filter(c -> TrangThai.DA_DUYET.equals(c.getTrangThai()) && trongKy(c.getNgay(), loc.nam(), t1, t2)
        && nguonMap.containsKey(c.getNguonTien()) && !hdbPhuTai.contains(c.getHdbId())).mapToLong(ChiPhiHD::getSoTien).sum();
    Kqkd kqkd = new Kqkd(ky[0], ky[1], lnGop, cpCd, cpBd, lnGop - cpCd - cpBd);

    return new Dto(homNay, loc, loiNhuan, kpiThu, kpiTra, kpiCp, duBao, dongTien, soDuNguon, danhMuc, tuoiNo, phapNhan,
        khQuaHan.stream().limit(5).toList(), nccCanTra.stream().limit(5).toList(), cpCoCau, cpLoai, cpTheoThang, kqkd);
  }

  // ── Bộ lọc ──────────────────────────────────────────────────────────

  private static Loc chuan(Loc in, LocalDate today) {
    int nam = in.nam() > 0 ? in.nam() : today.getYear();
    if (nam < 2000 || nam > 2100) throw ApiException.invalid("Năm không hợp lệ");
    Integer quy = in.quy();
    Integer thang = in.thang();
    if (quy != null && (quy < 1 || quy > 4)) throw ApiException.invalid("Quý phải từ 1 đến 4");
    if (thang != null && (thang < 1 || thang > 12)) throw ApiException.invalid("Tháng phải từ 1 đến 12");
    if (thang != null) quy = null;
    String pn = List.of("OXY", "KOXY").contains(in.phapNhan()) ? in.phapNhan() : "TAT_CA" /* gồm OXY + KHÍ OXY; Phú Tài có kế toán riêng ở module Phú Tài */;
    return new Loc(nam, quy, thang, pn, "cungKy".equals(in.soSanh()) ? "cungKy" : "khong");
  }

  /** Kế toán Oxy chỉ tính tiền thật của Oxy: mọi lựa chọn đều loại HĐ thuộc Phú Tài; KHÍ OXY chưa có HĐ nên không khớp. */
  private static boolean khopHd(Boolean phuTai, String pn) {
    return !Boolean.TRUE.equals(phuTai) && !"KOXY".equals(pn);
  }

  private static boolean khopNguon(NguonTien n, String pn) {
    return switch (pn) {
      case "OXY", "KOXY" -> pn.equals(n.getCongTy());
      case "PHU_TAI" -> false;
      default -> true;
    };
  }

  private static boolean trongKy(String ngay, int nam, int t1, int t2) {
    if (ngay == null || ngay.length() < 7 || !ngay.startsWith(nam + "-")) return false;
    int m = Integer.parseInt(ngay.substring(5, 7));
    return m >= t1 && m <= t2;
  }

  /** Số tháng chia bình quân: năm hiện tại chỉ tính đến tháng hiện tại; tối thiểu 1. */
  private static int soThang(int nam, int t1, int t2, LocalDate today) {
    int den = nam == today.getYear() ? Math.min(t2, today.getMonthValue()) : t2;
    return Math.max(1, den - t1 + 1);
  }

  private static Double pct(double hienTai, Number kyTruoc) {
    return kyTruoc != null && kyTruoc.doubleValue() > 0 ? Math.round((hienTai - kyTruoc.doubleValue()) / kyTruoc.doubleValue() * 1000.0) / 10.0 : null;
  }

  private static String tenLoai(Map<String, LoaiChiPhi> m, String id, String macDinh) {
    LoaiChiPhi l = id == null ? null : m.get(id);
    return l == null ? macDinh : l.getTen();
  }

  // ── Lợi nhuận ───────────────────────────────────────────────────────

  private static boolean hdbHoatDong(HopDongBan h) {
    return !TrangThai.BAO_GIA.equals(h.getTrangThai()) && !TrangThai.HUY.equals(h.getTrangThai());
  }

  private static boolean hdmHoatDong(HopDongMua m) {
    return !TrangThai.NHAP.equals(m.getTrangThai()) && !TrangThai.HUY.equals(m.getTrangThai());
  }

  /** {doanh thu thuần, giá vốn} của HĐ bán ký trong năm + khoảng tháng. */
  private static long[] doanhThuGiaVon(List<HopDongBan> hdbs, Db raw, int nam, int t1, int t2) {
    long dt = 0;
    double gv = 0;
    for (HopDongBan h : hdbs) {
      if (!hdbHoatDong(h) || !trongKy(h.getNgayKy(), nam, t1, t2)) continue;
      dt += h.getTruocVAT();
      gv += Calc.hdbCalc(h, raw).giaVon();
    }
    return new long[] {dt, Math.round(gv)};
  }

  // ── Công nợ ─────────────────────────────────────────────────────────

  private static int soNgayQuaHan(String han, LocalDate today) {
    if (han == null || han.length() < 10) return 0;
    return (int) Math.max(0, today.toEpochDay() - LocalDate.parse(han.substring(0, 10)).toEpochDay());
  }

  private static int bucket(int ngayQuaHan) {
    return ngayQuaHan <= 0 ? 0 : ngayQuaHan <= 30 ? 1 : ngayQuaHan <= 60 ? 2 : ngayQuaHan <= 90 ? 3 : 4;
  }

  /** {trong hạn, quá hạn} còn phải thu. */
  private static long[] phaiThu(List<HopDongBan> hdbs, Db raw, String homNay) {
    long trong = 0, qua = 0;
    for (HopDongBan h : hdbs) {
      if (!hdbHoatDong(h)) continue;
      for (DotTTBan d : h.getDotTT()) {
        long con = d.getSoTien() - Calc.dotBanDaThu(d, raw);
        if (con <= 0) continue;
        if (d.getHan() != null && d.getHan().compareTo(homNay) < 0) qua += con;
        else trong += con;
      }
    }
    return new long[] {trong, qua};
  }

  private static long[] phaiTra(List<HopDongMua> hdms, Db raw, String homNay) {
    long trong = 0, qua = 0;
    for (HopDongMua m : hdms) {
      if (!hdmHoatDong(m)) continue;
      for (DotTTMua d : m.getDotTT()) {
        long con = d.getSoTien() - Calc.dotMuaDaTra(m, d, raw);
        if (con <= 0) continue;
        if (d.getHan() != null && d.getHan().compareTo(homNay) < 0) qua += con;
        else trong += con;
      }
    }
    return new long[] {trong, qua};
  }

  /** Còn phải thu tại cuối ngày: HĐ đã ký đến ngày đó, trừ phần đã thu có Ngày thu ≤ ngày đó. */
  private static long phaiThuTai(List<HopDongBan> hdbs, Db raw, String ngay) {
    long s = 0;
    for (HopDongBan h : hdbs) {
      if (!hdbHoatDong(h) || h.getNgayKy() == null || h.getNgayKy().compareTo(ngay) > 0) continue;
      for (DotTTBan d : h.getDotTT()) {
        long thu = Calc.dotBanDaThu(d, raw);
        boolean daThuDen = thu > 0 && (d.getNgayThu() == null || d.getNgayThu().compareTo(ngay) <= 0);
        s += Math.max(0, d.getSoTien() - (daThuDen ? thu : 0));
      }
    }
    return s;
  }

  private static long phaiTraTai(List<HopDongMua> hdms, Db raw, String ngay) {
    long s = 0;
    for (HopDongMua m : hdms) {
      if (!hdmHoatDong(m) || m.getNgayKy() == null || m.getNgayKy().compareTo(ngay) > 0) continue;
      for (DotTTMua d : m.getDotTT()) {
        long tra = Calc.dotMuaDaTra(m, d, raw);
        boolean daTraDen = tra > 0 && (d.getNgayTra() == null || d.getNgayTra().compareTo(ngay) <= 0);
        s += Math.max(0, d.getSoTien() - (daTraDen ? tra : 0));
      }
    }
    return s;
  }

  /** Còn phải thu có hạn ≤ ngày (gồm cả quá hạn). */
  private static long chuaThu(List<HopDongBan> hdbs, Db raw, String denNgay) {
    long s = 0;
    for (HopDongBan h : hdbs) {
      if (!hdbHoatDong(h)) continue;
      for (DotTTBan d : h.getDotTT())
        if (d.getHan() != null && d.getHan().compareTo(denNgay) <= 0) s += Math.max(0, d.getSoTien() - Calc.dotBanDaThu(d, raw));
    }
    return s;
  }

  private static long chuaTra(List<HopDongMua> hdms, Db raw, String denNgay) {
    long s = 0;
    for (HopDongMua m : hdms) {
      if (!hdmHoatDong(m)) continue;
      for (DotTTMua d : m.getDotTT())
        if (d.getHan() != null && d.getHan().compareTo(denNgay) <= 0) s += Math.max(0, d.getSoTien() - Calc.dotMuaDaTra(m, d, raw));
    }
    return s;
  }

  // ── Chi phí cố định ─────────────────────────────────────────────────

  /** Tên loại chi phí nếu phiếu là Chi cố định (Đã duyệt, nhóm "Vận hành", nguồn khớp, trong kỳ); ngược lại null. */
  private static String tenCoDinh(PhieuThuChi p, Map<String, LoaiChiPhi> loaiMap, Map<String, NguonTien> nguonMap, int nam, int t1, int t2) {
    if (!"Chi".equals(p.getLoai()) || !TrangThai.DA_DUYET.equals(p.getTrangThai()) || !trongKy(p.getNgayLap(), nam, t1, t2)
        || !nguonMap.containsKey(p.getNguonTien())) return null;
    LoaiChiPhi l = p.getLoaiChiPhi() == null ? null : loaiMap.get(p.getLoaiChiPhi());
    return l != null && "Vận hành".equals(l.getNhom()) ? l.getTen() : null;
  }

  private static long cpCoDinh(Db raw, Map<String, NguonTien> nguonMap, Map<String, LoaiChiPhi> loaiMap, int nam, int t1, int t2) {
    long s = 0;
    for (PhieuThuChi p : raw.getPhieuThuChi()) if (tenCoDinh(p, loaiMap, nguonMap, nam, t1, t2) != null) s += p.getSoTienChi();
    return s;
  }
}
