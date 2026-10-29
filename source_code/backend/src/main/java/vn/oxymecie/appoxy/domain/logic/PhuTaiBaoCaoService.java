package vn.oxymecie.appoxy.domain.logic;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.model.ChiPhiHD;
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.domain.model.DongHangMua;
import vn.oxymecie.appoxy.domain.model.DongTienPT;
import vn.oxymecie.appoxy.domain.model.DotTTBan;
import vn.oxymecie.appoxy.domain.model.DotTTMua;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.HopDongMua;
import vn.oxymecie.appoxy.domain.model.TrangThai;
import vn.oxymecie.appoxy.domain.perm.Perm;
import vn.oxymecie.appoxy.common.Texts;

/**
 * Module Phú Tài theo HĐ bán / HĐ mua có tích "Thuộc Phú Tài": giao dịch khách hàng, giao dịch NCC, đối soát quyền lợi OXY,
 * sổ quỹ Phú Tài và báo cáo. Mọi số liệu tính ở backend.
 *
 * <p>Quy ước: Giá đầu vào = giá trị các HĐ mua Phú Tài phục vụ HĐ bán; LN trước thuế = giá bán trước VAT − giá đầu vào;
 * OXY được hưởng (gộp) = LN trước thuế × tỷ lệ OXY của HĐ (mặc định 70%); Đủ ĐK nhận = OXY được hưởng × (KH đã trả / giá trị sau VAT);
 * Đã nhận = tổng dòng "Chuyển OXY" ở sổ quỹ Phú Tài; LN thực OXY = OXY được hưởng − chi phí thực hiện HĐ đã duyệt.
 * Sổ quỹ Phú Tài = KH trả (đợt thu của HĐ bán) − trả NCC (đợt trả của HĐ mua) − chi phí HĐ − chuyển OXY, cộng số dư đầu kỳ nhập tay.
 */
@Service
public class PhuTaiBaoCaoService {

  public static final double TY_LE_OXY_MAC_DINH = 70;
  private static final String KD = "CPTH-KD";
  public static final String LOAI_DAU_KY = "Số dư đầu kỳ";
  public static final String LOAI_CHUYEN_OXY = "Chuyển OXY";

  public record Ref(String id, String soHD, String ten) {}

  public record Opt(String v, String t) {}

  // ── Tính toán gốc theo từng HĐ bán Phú Tài ──
  private record HdPt(HopDongBan h, Calc.HdbCalc c, long giaDauVao, List<HopDongMua> hdm, long cpVC, long cpKD, long cpKhac, long khTra, long traNcc,
                      long chuyenOxy, double tyLe, long lnTruoc, long oxyGop, long duDK, long conNhan, long lnThuc) {
    long cp() {
      return cpVC + cpKD + cpKhac;
    }

    long conTrongQuy() {
      return khTra - traNcc - cp() - chuyenOxy;
    }
  }

  private List<HdPt> tinh(Db visible, Db raw) {
    List<HdPt> out = new ArrayList<>();
    for (HopDongBan h : visible.getHopDongBan()) {
      if (!Boolean.TRUE.equals(h.getThuocPhuTai()) || !hdbHoatDong(h)) continue;
      Calc.HdbCalc c = Calc.hdbCalc(h, raw);
      List<HopDongMua> hdm = raw.getHopDongMua().stream().filter(m -> m.isThuocPhuTai() && !TrangThai.HUY.equals(m.getTrangThai()) && Calc.hdmChoHdb(m, h.getId())).toList();
      double dauVao = 0;
      long tra = 0;
      for (HopDongMua m : hdm) {
        dauVao += Objects.equals(m.getHdbId(), h.getId()) ? Calc.hdmTong(m) : Calc.sum(Calc.dongMuaChoHdb(m, h.getId()), Calc::thanhTienVND);
        for (DotTTMua d : m.getDotTT()) tra += Calc.dotMuaDaTra(m, d, raw);
      }
      long vc = 0, kd = 0, khac = 0;
      for (ChiPhiHD cp : raw.getChiPhiHD()) {
        if (!Objects.equals(cp.getHdbId(), h.getId()) || !TrangThai.DA_DUYET.equals(cp.getTrangThai())) continue;
        if (Calc.LCP_VAN_CHUYEN.equals(cp.getLoaiChiPhi())) vc += cp.getSoTien();
        else if (KD.equals(cp.getLoaiChiPhi())) kd += cp.getSoTien();
        else khac += cp.getSoTien();
      }
      long chuyen = raw.getDongTienPT().stream().filter(d -> LOAI_CHUYEN_OXY.equals(d.getLoai()) && h.getId().equals(d.getHdbId())).mapToLong(DongTienPT::getSoTien).sum();
      double tyLe = h.getPtTyLeOxy() == null ? TY_LE_OXY_MAC_DINH : h.getPtTyLeOxy();
      long giaDauVao = Math.round(dauVao);
      long lnTruoc = h.getTruocVAT() - giaDauVao;
      long gop = lnTruoc > 0 ? Math.round(lnTruoc * tyLe / 100.0) : 0;
      long duDK = c.sauVAT() > 0 ? Math.round(gop * Math.min(1.0, (double) c.daThu() / c.sauVAT())) : 0;
      out.add(new HdPt(h, c, giaDauVao, hdm, vc, kd, khac, c.daThu(), tra, chuyen, tyLe, lnTruoc, gop, duDK, Math.max(0, duDK - chuyen), gop - (vc + kd + khac)));
    }
    out.sort(Comparator.comparing((HdPt r) -> Texts.nz(r.h().getNgayKy())).reversed());
    return out;
  }

  private static boolean hdbHoatDong(HopDongBan h) {
    return !TrangThai.BAO_GIA.equals(h.getTrangThai()) && !TrangThai.HUY.equals(h.getTrangThai());
  }

  private static String nam(String ngay) {
    return ngay == null || ngay.length() < 4 ? "" : ngay.substring(0, 4);
  }

  private static int soNgayQuaHan(String han, LocalDate today) {
    if (han == null || han.length() < 10) return 0;
    return (int) Math.max(0, today.toEpochDay() - LocalDate.parse(han.substring(0, 10)).toEpochDay());
  }

  private static boolean trongKy(String ngay, int nam, int t1, int t2) {
    if (ngay == null || ngay.length() < 7 || !ngay.startsWith(nam + "-")) return false;
    int m = Integer.parseInt(ngay.substring(5, 7));
    return m >= t1 && m <= t2;
  }

  private static double pct1(double v) {
    return Math.round(v * 1000.0) / 10.0;
  }

  // ═══ Tab 1 · Giao dịch khách hàng ═══════════════════════════════════

  public record KhRow(String id, String soHD, String ngayKy, String maKH, String tenKH, String mst, long sauVAT, long truocVAT, boolean daNghiemThu,
                      String giao, long daThu, long conPhaiThu, double pctThu, int quaHan, List<String> thieuHoSo, List<Ref> hdm, long chiPhi,
                      String sale, String trangThai) {}

  public record KhKpi(int soHd, long sauVAT, long truocVAT, long daThu, long conPhaiThu, double pctThu, int soQuaHan, int soThieuHoSo) {}

  public record KhDto(KhKpi kpi, List<KhRow> rows, List<String> nams, List<Opt> khachHang, List<Opt> sales, List<Opt> trangThais) {}

  public KhDto khachHang(Db visible, Db raw, String q, String nam, String maKH, String sale, String trangThai, LocalDate today) {
    List<HdPt> all = tinh(visible, raw);
    String hs = Texts.nz(q).trim().toLowerCase();
    List<KhRow> rows = new ArrayList<>();
    for (HdPt r : all) {
      HopDongBan h = r.h();
      if (!hs.isEmpty() && !List.of(Texts.nz(h.getSoHD()), Texts.nz(h.getTenKH()), Texts.nz(h.getMst())).stream().anyMatch(s -> s.toLowerCase().contains(hs))) continue;
      if (!Texts.blank(nam) && !nam.equals(nam(h.getNgayKy()))) continue;
      if (!Texts.blank(maKH) && !maKH.equals(h.getMaKH())) continue;
      if (!Texts.blank(sale) && !sale.equals(h.getSale())) continue;
      if (!Texts.blank(trangThai) && !trangThai.equals(h.getTrangThai())) continue;
      int quaHan = 0;
      for (DotTTBan d : h.getDotTT()) if (d.getHan() != null && soNgayQuaHan(d.getHan(), today) > 0 && Calc.dotBanDaThu(d, raw) < d.getSoTien()) quaHan++;
      String giao = switch (h.getTrangThai()) {
        case TrangThai.HOAN_THANH, TrangThai.DA_TAT_TOAN -> "đã giao";
        case TrangThai.DANG_GIAO_HANG -> "đang giao";
        default -> "chưa giao";
      };
      List<Ref> hdm = r.hdm().stream().map(m -> new Ref(m.getId(), m.getSoHD(), m.getTenNCC())).toList();
      rows.add(new KhRow(h.getId(), h.getSoHD(), h.getNgayKy(), h.getMaKH(), h.getTenKH(), h.getMst(), r.c().sauVAT(), h.getTruocVAT(),
          !r.c().hoSoThieu().contains("BBGH/BBNT"), giao, r.c().daThu(), r.c().conPhaiThu(), r.c().sauVAT() > 0 ? (double) r.c().daThu() / r.c().sauVAT() : 0,
          quaHan, r.c().hoSoThieu(), hdm, r.cp(), h.getSale(), h.getTrangThai()));
    }
    long sau = rows.stream().mapToLong(KhRow::sauVAT).sum();
    long thu = rows.stream().mapToLong(KhRow::daThu).sum();
    KhKpi kpi = new KhKpi(rows.size(), sau, rows.stream().mapToLong(KhRow::truocVAT).sum(), thu, rows.stream().mapToLong(KhRow::conPhaiThu).sum(),
        sau > 0 ? (double) thu / sau : 0, (int) rows.stream().filter(r -> r.quaHan() > 0).count(), (int) rows.stream().filter(r -> !r.thieuHoSo().isEmpty()).count());
    List<String> nams = all.stream().map(r -> nam(r.h().getNgayKy())).filter(s -> !s.isEmpty()).distinct().sorted(Comparator.reverseOrder()).toList();
    Map<String, String> kh = new LinkedHashMap<>();
    all.forEach(r -> kh.putIfAbsent(r.h().getMaKH(), r.h().getTenKH()));
    List<Opt> khOpts = kh.entrySet().stream().map(e -> new Opt(e.getKey(), e.getValue())).toList();
    List<Opt> sales = all.stream().map(r -> r.h().getSale()).filter(s -> !Texts.blank(s)).distinct().map(s -> new Opt(s, s)).toList();
    List<Opt> tts = all.stream().map(r -> r.h().getTrangThai()).distinct().map(s -> new Opt(s, s)).toList();
    return new KhDto(kpi, rows, nams, khOpts, sales, tts);
  }

  // ═══ Tab 2 · Giao dịch NCC ══════════════════════════════════════════

  public record NccRow(String id, String soHD, String ngayKy, String maNCC, String tenNCC, String mst, String hangHoa, long tong, long daTra, long conPhaiTra,
                       double pctTra, String trangThai, String hanGanNhat, int quaHanNgay, List<String> thieuHoSo, List<Ref> hdb) {}

  public record NccKpi(int soHd, int soNcc, long tong, long daTra, long conPhaiTra, double pctTra, int soQuaHan, long chiPhiVanHanh) {}

  public record DongHang(String ma, String ten, double sl, String dvt, long giaMua, Long giaBan, String khachHang, String hdbId) {}

  public record NccDto(NccKpi kpi, List<NccRow> rows, List<DongHang> dongHang, List<String> nams, List<Opt> ncc, List<String> trangThais) {}

  public NccDto ncc(Db visible, Db raw, String q, String nam, String maNCC, String trangThai, String thanhToan, LocalDate today) {
    List<NccRow> all = new ArrayList<>();
    List<DongHang> dong = new ArrayList<>();
    String hs = Texts.nz(q).trim().toLowerCase();
    for (HopDongMua m : visible.getHopDongMua()) {
      if (!m.isThuocPhuTai() || TrangThai.HUY.equals(m.getTrangThai())) continue;
      Calc.HdmCalc c = Calc.hdmCalc(m, raw);
      List<String> ids = new ArrayList<>();
      if (m.getHdbId() != null) ids.add(m.getHdbId());
      m.getChiTiet().stream().map(DongHangMua::getHdbId).filter(Objects::nonNull).forEach(i -> { if (!ids.contains(i)) ids.add(i); });
      List<Ref> hdb = ids.stream().map(i -> raw.getHopDongBan().stream().filter(h -> h.getId().equals(i)).findFirst().orElse(null)).filter(Objects::nonNull)
          .map(h -> new Ref(h.getId(), h.getSoHD(), h.getTenKH())).toList();
      String han = null;
      int quaHan = 0;
      for (DotTTMua d : m.getDotTT()) {
        if (d.getSoTien() - Calc.dotMuaDaTra(m, d, raw) <= 0 || d.getHan() == null) continue;
        if (han == null || d.getHan().compareTo(han) < 0) han = d.getHan();
        quaHan = Math.max(quaHan, soNgayQuaHan(d.getHan(), today));
      }
      String hang = m.getChiTiet().stream().limit(2).map(DongHangMua::getTenHang).collect(Collectors.joining(", "))
          + (m.getChiTiet().size() > 2 ? " +" + (m.getChiTiet().size() - 2) : "");
      all.add(new NccRow(m.getId(), m.getSoHD(), m.getNgayKy(), m.getMaNCC(), m.getTenNCC(), m.getMst(), hang, Math.round(c.tong()), Math.round(c.daTra()),
          Math.round(c.conPhaiTra()), c.tong() > 0 ? c.daTra() / c.tong() : 0, m.getTrangThai(), han, quaHan, Calc.hoSoThieu(raw, "HDM", m.getId()), hdb));
      for (DongHangMua d : m.getChiTiet()) {
        String hid = d.getHdbId() != null ? d.getHdbId() : m.getHdbId();
        HopDongBan hb = hid == null ? null : raw.getHopDongBan().stream().filter(h -> h.getId().equals(hid)).findFirst().orElse(null);
        Long giaBan = hb == null || hb.getDongHang() == null ? null
            : hb.getDongHang().stream().filter(x -> Objects.equals(x.getLoaiHang(), d.getLoaiHang())).map(x -> (long) x.getDonGia()).findFirst().orElse(null);
        dong.add(new DongHang(d.getLoaiHang(), Texts.blank(d.getThongSo()) ? d.getTenHang() : d.getTenHang() + " " + d.getThongSo(), d.getSoLuong(), d.getDvt(),
            Math.round(Calc.donGiaVND(d)), giaBan, hb == null ? "" : hb.getTenKH(), hid));
      }
    }
    all.sort(Comparator.comparing((NccRow r) -> Texts.nz(r.ngayKy())).reversed());
    List<NccRow> rows = new ArrayList<>();
    for (NccRow r : all) {
      if (!hs.isEmpty() && !List.of(Texts.nz(r.soHD()), Texts.nz(r.tenNCC()), Texts.nz(r.mst())).stream().anyMatch(s -> s.toLowerCase().contains(hs))) continue;
      if (!Texts.blank(nam) && !nam.equals(nam(r.ngayKy()))) continue;
      if (!Texts.blank(maNCC) && !maNCC.equals(r.maNCC())) continue;
      if (!Texts.blank(trangThai) && !trangThai.equals(r.trangThai())) continue;
      if (!Texts.blank(thanhToan) && !switch (thanhToan) {
        case "chua" -> r.daTra() <= 0;
        case "mot-phan" -> r.daTra() > 0 && r.pctTra() < 1;
        case "du" -> r.pctTra() >= 1;
        case "qua-han" -> r.quaHanNgay() > 0;
        default -> true;
      }) continue;
      rows.add(r);
    }
    long tong = rows.stream().mapToLong(NccRow::tong).sum();
    long tra = rows.stream().mapToLong(NccRow::daTra).sum();
    long cp = tinh(visible, raw).stream().mapToLong(HdPt::cp).sum();
    NccKpi kpi = new NccKpi(rows.size(), (int) rows.stream().map(NccRow::maNCC).distinct().count(), tong, tra, rows.stream().mapToLong(NccRow::conPhaiTra).sum(),
        tong > 0 ? (double) tra / tong : 0, (int) rows.stream().filter(r -> r.quaHanNgay() > 0).count(), cp);
    Map<String, String> nccMap = new LinkedHashMap<>();
    all.forEach(r -> nccMap.putIfAbsent(r.maNCC(), r.tenNCC()));
    return new NccDto(kpi, rows, dong, all.stream().map(r -> nam(r.ngayKy())).filter(s -> !s.isEmpty()).distinct().sorted(Comparator.reverseOrder()).toList(),
        nccMap.entrySet().stream().map(e -> new Opt(e.getKey(), e.getValue())).toList(), all.stream().map(NccRow::trangThai).distinct().toList());
  }

  // ═══ Tab 3 · Đối soát quyền lợi OXY ═════════════════════════════════

  public record DsRow(String id, String soHD, String tenKH, long giaBan, long lnTruoc, double tyLe, long oxyGop, double pctKH, long duDK, long daNhan,
                      long conNhan, String trangThai) {}

  public record DsKpi(long oxyGop, long duDK, long daNhan, long conNhan, double pctDaNhanTrenDuDK) {}

  public record BienBan(String so, String phamVi, long soDeNghi, String trangThai, String denNgay, String ky) {}

  public record DsDto(DsKpi kpi, List<DsRow> rows, DsRow tong, long choKH, BienBan bienBan) {}

  public DsDto doiSoat(Db visible, Db raw, LocalDate today) {
    List<HdPt> all = tinh(visible, raw);
    List<DsRow> rows = new ArrayList<>();
    for (HdPt r : all) {
      HopDongBan h = r.h();
      String tt = r.oxyGop() <= 0 ? "KHONG_CO" : r.khTra() <= 0 ? "CHO_KH" : r.conNhan() == 0 ? "DA_KHOP" : "CHO_PT_CHUYEN";
      rows.add(new DsRow(h.getId(), h.getSoHD(), h.getTenKH(), h.getTruocVAT(), r.lnTruoc(), r.tyLe(), r.oxyGop(),
          r.c().sauVAT() > 0 ? (double) r.khTra() / r.c().sauVAT() : 0, r.duDK(), r.chuyenOxy(), r.conNhan(), tt));
    }
    long gop = rows.stream().mapToLong(DsRow::oxyGop).sum(), du = rows.stream().mapToLong(DsRow::duDK).sum();
    long nhan = rows.stream().mapToLong(DsRow::daNhan).sum(), con = rows.stream().mapToLong(DsRow::conNhan).sum();
    long gia = rows.stream().mapToLong(DsRow::giaBan).sum(), ln = rows.stream().mapToLong(DsRow::lnTruoc).sum();
    DsRow tong = new DsRow("", "Tổng", "", gia, ln, gia > 0 && ln > 0 ? 0 : 0, gop, 0, du, nhan, con, "");
    String ky = String.format("%02d/%d", today.getMonthValue(), today.getYear());
    BienBan bb = new BienBan(String.format("BBDS-PT-%02d%02d", today.getYear() % 100, today.getMonthValue()), rows.size() + " HĐ · đến " + fmt(today), con,
        con > 0 ? "Chờ Phú Tài chuyển phần quyền lợi" : "Đã khớp — không còn phải nhận", today.toString(), ky);
    return new DsDto(new DsKpi(gop, du, nhan, con, du > 0 ? (double) nhan / du : 0), rows, tong, Math.max(0, gop - du), bb);
  }

  private static String fmt(LocalDate d) {
    return String.format("%02d/%02d/%d", d.getDayOfMonth(), d.getMonthValue(), d.getYear());
  }

  // ═══ Tab 4 · Sổ quỹ Phú Tài ═════════════════════════════════════════

  public record QuyRow(String id, String ngay, String loai, String hdbId, String soHD, String tenKH, String noiDung, long thu, long chi, long tonQuy, String tep, boolean nhapTay) {}

  public record CanDoi(String tuNgay, String denNgay, long dauKy, long khTra, long traNcc, long chiPhi, long chuyenOxy, long cuoiKy) {}

  public record TheoHd(String hdbId, String soHD, String tenKH, long khTra, long traNcc, long chiPhi, long chuyenOxy, long conTrongQuy) {}

  public record QuyDto(CanDoi canDoi, List<QuyRow> rows, List<TheoHd> theoHd, Map<String, Integer> dem, List<Ref> hdOpts) {}

  public QuyDto soQuy(Db visible, Db raw, LocalDate today) {
    List<HdPt> hds = tinh(visible, raw);
    Map<String, HdPt> theoId = new LinkedHashMap<>();
    hds.forEach(r -> theoId.put(r.h().getId(), r));
    record Tho(String ngay, int thuTu, String id, String loai, String hdbId, String noiDung, long thu, long chi, String tep, boolean tay) {}
    List<Tho> tho = new ArrayList<>();
    for (DongTienPT d : raw.getDongTienPT()) {
      if (d.getLoai() == null) continue;
      boolean dau = LOAI_DAU_KY.equals(d.getLoai());
      tho.add(new Tho(d.getNgay(), dau ? 0 : 3, d.getId(), d.getLoai(), d.getHdbId(), Texts.nz(d.getGhiChu()), dau ? d.getSoTien() : 0, dau ? 0 : d.getSoTien(), d.getTep(), true));
    }
    for (HdPt r : hds) {
      HopDongBan h = r.h();
      for (DotTTBan d : h.getDotTT()) {
        long thu = Calc.dotBanDaThu(d, raw);
        if (thu > 0) tho.add(new Tho(Texts.blank(d.getNgayThu()) ? h.getNgayKy() : d.getNgayThu(), 1, h.getId() + "-T" + d.getDot(), "Thu KH", h.getId(),
            h.getTenKH() + " — thu đợt " + d.getDot(), thu, 0, null, false));
      }
      for (HopDongMua m : r.hdm()) {
        for (DotTTMua d : m.getDotTT()) {
          long tra = Calc.dotMuaDaTra(m, d, raw);
          if (tra > 0) tho.add(new Tho(Texts.blank(d.getNgayTra()) ? m.getNgayKy() : d.getNgayTra(), 2, m.getId() + "-D" + d.getDot(), "Trả NCC", h.getId(),
              "Trả NCC " + m.getTenNCC() + " · " + m.getSoHD() + " đợt " + d.getDot(), 0, tra, null, false));
        }
      }
      for (ChiPhiHD cp : raw.getChiPhiHD()) {
        if (Objects.equals(cp.getHdbId(), h.getId()) && TrangThai.DA_DUYET.equals(cp.getTrangThai()))
          tho.add(new Tho(cp.getNgay(), 2, cp.getId(), "Chi phí", h.getId(), Texts.nz(cp.getNoiDung()), 0, cp.getSoTien(), null, false));
      }
    }
    tho.sort(Comparator.comparing((Tho t) -> Texts.nz(t.ngay())).thenComparingInt(Tho::thuTu).thenComparing(Tho::id));
    List<QuyRow> rows = new ArrayList<>();
    long ton = 0;
    Map<String, Integer> dem = new LinkedHashMap<>();
    for (String k : List.of("Thu KH", "Trả NCC", "Chi phí", LOAI_CHUYEN_OXY)) dem.put(k, 0);
    for (Tho t : tho) {
      ton += t.thu() - t.chi();
      HdPt r = t.hdbId() == null ? null : theoId.get(t.hdbId());
      rows.add(new QuyRow(t.id(), t.ngay(), t.loai(), t.hdbId(), r == null ? null : r.h().getSoHD(), r == null ? null : r.h().getTenKH(), t.noiDung(), t.thu(), t.chi(), ton, t.tep(), t.tay()));
      dem.computeIfPresent(t.loai(), (k, v) -> v + 1);
    }
    long dauKy = 0;
    String tu = null;
    for (Tho t : tho) if (LOAI_DAU_KY.equals(t.loai())) {
      dauKy += t.thu();
      if (tu == null || t.ngay().compareTo(tu) < 0) tu = t.ngay();
    }
    long kh = hds.stream().mapToLong(HdPt::khTra).sum(), ncc = hds.stream().mapToLong(HdPt::traNcc).sum();
    long cp = hds.stream().mapToLong(HdPt::cp).sum(), cx = hds.stream().mapToLong(HdPt::chuyenOxy).sum();
    List<TheoHd> theo = hds.stream().map(r -> new TheoHd(r.h().getId(), r.h().getSoHD(), r.h().getTenKH(), r.khTra(), r.traNcc(), r.cp(), r.chuyenOxy(), r.conTrongQuy())).toList();
    List<Ref> opts = hds.stream().map(r -> new Ref(r.h().getId(), r.h().getSoHD(), r.h().getTenKH())).toList();
    return new QuyDto(new CanDoi(tu, today.toString(), dauKy, kh, ncc, cp, cx, dauKy + kh - ncc - cp - cx), rows, theo, dem, opts);
  }

  /** Ghi dòng nhập tay vào sổ quỹ Phú Tài: số dư đầu kỳ hoặc chuyển quyền lợi về OXY. */
  public DongTienPT themDongQuy(Ctx c, DongTienPT in) {
    c.require(Perm.phuTai);
    if (Texts.blank(in.getNgay()) || !(in.getSoTien() > 0)) throw ApiException.invalid("Cần Ngày và Số tiền > 0");
    if (!LOAI_DAU_KY.equals(in.getLoai()) && !LOAI_CHUYEN_OXY.equals(in.getLoai())) throw ApiException.invalid("Loại dòng không hợp lệ");
    boolean chuyen = LOAI_CHUYEN_OXY.equals(in.getLoai());
    final String hdbId = chuyen ? Texts.emptyToNull(in.getHdbId()) : null;
    if (chuyen) {
      HopDongBan h = hdbId == null ? null : c.db().getHopDongBan().stream().filter(x -> x.getId().equals(hdbId)).findFirst().orElse(null);
      if (h == null || !Boolean.TRUE.equals(h.getThuocPhuTai())) throw ApiException.invalid("Chuyển OXY phải gắn một HĐ bán Phú Tài");
    }
    DongTienPT out = new DongTienPT(c.uid("DT"), in.getNgay(), chuyen ? "Chi từ PT" : "Thu về PT", null, in.getSoTien(), "Nhập tay", null, Texts.nz(in.getGhiChu()),
        hdbId, in.getLoai(), Texts.emptyToNull(in.getTep()));
    Ctx.upsert(c.db().getDongTienPT(), out, DongTienPT::getId);
    return out;
  }

  // ═══ Tab 5 · Báo cáo ════════════════════════════════════════════════

  public record Loc(int nam, Integer quy, Integer thang, String maKH) {}

  public record Phan(String ten, long v) {}

  public record ThangBc(int t, long giaBan, long lnThuc) {}

  public record Bien(String ten, double pct) {}

  public record HdLn(String id, String soHD, String tenKH, long giaBan, long giaDauVao, long lnTruoc, long oxyGop, long cp, long lnThuc, double bien) {}

  public record Hieu(int soHd, long giaBan, long oxyGop, long lnThuc, double bienLnThuc, List<Phan> coCau, List<ThangBc> thangs, List<Bien> bien) {}

  public record NoThu(String hdbId, String soHD, String ngayKy, String maKH, String tenKH, String mst, long sauVAT, long daThu, long con, String hanTT, int quaHanNgay, int conNgay, String sale) {}

  public record NoTra(String hdmId, String soHD, String ngayKy, String tenNCC, String mst, long tong, long daTra, long con, String hanTT, int quaHanNgay, int conNgay, String ghiChu) {}

  public record Tuoi(String nhan, long v) {}

  public record CongNoThu(long tong, int soKhach, long quaHan, double pctQuaHan, int soKhachQuaHan, List<Tuoi> tuoi, List<NoThu> rows) {}

  public record CongNoTra(long tong, int soNcc, long quaHan, int soNccQuaHan, int soNgayQuaHanMax, List<Tuoi> tuoi, List<NoTra> rows) {}

  public record CanhBao(String muc, String nhom, String tieuDe, String moTa, String doiTuong, long soTien, String deXuat, String theoDoi) {}

  public record VanHanh(long vanChuyen, int soVanChuyen, long kiemDinh, int soKiemDinh, long quanLy, long tong, double pctGiaBan, int p1, int p2, List<CanhBao> canhBao) {}

  public record BcDto(String capNhat, Loc loc, Hieu hieuQua, List<HdLn> loiNhuan, HdLn tongLn, CongNoThu phaiThu, CongNoTra phaiTra, VanHanh vanHanh, List<Opt> khachHang) {}

  public BcDto baoCao(Db visible, Db raw, Loc in, LocalDate today) {
    int nam = in.nam() > 0 ? in.nam() : today.getYear();
    if (nam < 2000 || nam > 2100) throw ApiException.invalid("Năm không hợp lệ");
    Integer quy = in.quy(), thang = in.thang();
    if (quy != null && (quy < 1 || quy > 4)) throw ApiException.invalid("Quý phải từ 1 đến 4");
    if (thang != null && (thang < 1 || thang > 12)) throw ApiException.invalid("Tháng phải từ 1 đến 12");
    if (thang != null) quy = null;
    int t1 = thang != null ? thang : quy != null ? quy * 3 - 2 : 1;
    int t2 = thang != null ? thang : quy != null ? quy * 3 : 12;
    Loc loc = new Loc(nam, quy, thang, in.maKH());
    String homNay = today.toString();

    List<HdPt> tatCa = tinh(visible, raw);
    List<HdPt> hds = tatCa.stream().filter(r -> trongKy(r.h().getNgayKy(), nam, t1, t2) && (Texts.blank(in.maKH()) || in.maKH().equals(r.h().getMaKH()))).toList();

    // 1 · Hiệu quả
    long giaBan = hds.stream().mapToLong(r -> r.h().getTruocVAT()).sum(), gop = hds.stream().mapToLong(HdPt::oxyGop).sum(), thuc = hds.stream().mapToLong(HdPt::lnThuc).sum();
    long dauVao = hds.stream().mapToLong(HdPt::giaDauVao).sum(), cp = hds.stream().mapToLong(HdPt::cp).sum(), lnTruoc = hds.stream().mapToLong(HdPt::lnTruoc).sum();
    List<Phan> coCau = List.of(new Phan("Giá đầu vào", dauVao), new Phan("Hoa hồng & còn lại", Math.max(0, lnTruoc - gop)), new Phan("Chi phí vận hành", cp), new Phan("LN thực OXY", Math.max(0, thuc)));
    List<ThangBc> thangs = new ArrayList<>();
    for (int m = t1; m <= t2; m++) {
      final int mm = m;
      List<HdPt> rs = hds.stream().filter(r -> trongKy(r.h().getNgayKy(), nam, mm, mm)).toList();
      thangs.add(new ThangBc(m, rs.stream().mapToLong(r -> r.h().getTruocVAT()).sum(), rs.stream().mapToLong(HdPt::lnThuc).sum()));
    }
    double bGia = giaBan > 0 ? 1.0 / giaBan : 0;
    Hieu hieu = new Hieu(hds.size(), giaBan, gop, thuc, giaBan > 0 ? pct1((double) thuc / giaBan) : 0, coCau, thangs,
        List.of(new Bien("Biên LN trước thuế", pct1(lnTruoc * bGia)), new Bien("Biên LN thực OXY", pct1(thuc * bGia)), new Bien("Giá đầu vào / giá bán", pct1(dauVao * bGia))));

    // 2 · Lợi nhuận theo HĐ
    List<HdLn> ln = hds.stream().map(r -> new HdLn(r.h().getId(), r.h().getSoHD(), r.h().getTenKH(), r.h().getTruocVAT(), r.giaDauVao(), r.lnTruoc(), r.oxyGop(), r.cp(), r.lnThuc(),
        r.h().getTruocVAT() > 0 ? pct1((double) r.lnThuc() / r.h().getTruocVAT()) : 0)).toList();
    HdLn tongLn = new HdLn("", "Tổng", "", giaBan, dauVao, lnTruoc, gop, cp, thuc, giaBan > 0 ? pct1((double) thuc / giaBan) : 0);

    // 3 · Công nợ phải thu
    long[] tuoiThu = new long[4];
    List<NoThu> rowsThu = new ArrayList<>();
    long quaHanThu = 0;
    java.util.Set<String> khCon = new java.util.HashSet<>(), khQua = new java.util.HashSet<>();
    for (HdPt r : hds) {
      HopDongBan h = r.h();
      String han = null;
      int maxQua = 0;
      for (DotTTBan d : h.getDotTT()) {
        long con = d.getSoTien() - Calc.dotBanDaThu(d, raw);
        if (con <= 0) continue;
        int q = soNgayQuaHan(d.getHan(), today);
        tuoiThu[q <= 0 ? 0 : q <= 30 ? 1 : q <= 60 ? 2 : 3] += con;
        if (q > 0) { quaHanThu += con; khQua.add(h.getMaKH()); }
        if (d.getHan() != null && (han == null || d.getHan().compareTo(han) < 0)) han = d.getHan();
        maxQua = Math.max(maxQua, q);
      }
      long con = r.c().conPhaiThu();
      if (con > 0) khCon.add(h.getMaKH());
      rowsThu.add(new NoThu(h.getId(), h.getSoHD(), h.getNgayKy(), h.getMaKH(), h.getTenKH(), h.getMst(), r.c().sauVAT(), r.c().daThu(), con, han, maxQua,
          han == null ? 0 : (int) Math.max(0, LocalDate.parse(han.substring(0, 10)).toEpochDay() - today.toEpochDay()), h.getSale()));
    }
    long tongThu = rowsThu.stream().mapToLong(NoThu::con).sum();
    CongNoThu thu = new CongNoThu(tongThu, khCon.size(), quaHanThu, tongThu > 0 ? pct1((double) quaHanThu / tongThu) : 0, khQua.size(),
        List.of(new Tuoi("Trong hạn", tuoiThu[0]), new Tuoi("1–30 ngày", tuoiThu[1]), new Tuoi("31–60 ngày", tuoiThu[2]), new Tuoi("Trên 60 ngày", tuoiThu[3])), rowsThu);

    // 4 · Công nợ NCC (HĐ mua Phú Tài phục vụ các HĐ bán đang xem)
    java.util.Set<String> hdbIds = hds.stream().map(r -> r.h().getId()).collect(Collectors.toSet());
    long[] tuoiTra = new long[4];
    List<NoTra> rowsTra = new ArrayList<>();
    long quaHanTra = 0;
    int maxNgay = 0;
    java.util.Set<String> nccCon = new java.util.HashSet<>(), nccQua = new java.util.HashSet<>();
    for (HopDongMua m : visible.getHopDongMua()) {
      if (!m.isThuocPhuTai() || TrangThai.HUY.equals(m.getTrangThai())) continue;
      List<String> ids = new ArrayList<>();
      if (m.getHdbId() != null) ids.add(m.getHdbId());
      m.getChiTiet().stream().map(DongHangMua::getHdbId).filter(Objects::nonNull).forEach(ids::add);
      boolean loc1 = Texts.blank(in.maKH()) && trongKy(m.getNgayKy(), nam, t1, t2);
      boolean loc2 = !Texts.blank(in.maKH()) && ids.stream().anyMatch(hdbIds::contains);
      if (!loc1 && !loc2) continue;
      Calc.HdmCalc c = Calc.hdmCalc(m, raw);
      String han = null;
      int maxQ = 0;
      for (DotTTMua d : m.getDotTT()) {
        long con = d.getSoTien() - Calc.dotMuaDaTra(m, d, raw);
        if (con <= 0) continue;
        int q = soNgayQuaHan(d.getHan(), today);
        tuoiTra[q <= 0 ? 0 : q <= 30 ? 1 : q <= 60 ? 2 : 3] += con;
        if (q > 0) { quaHanTra += con; nccQua.add(m.getMaNCC()); }
        if (d.getHan() != null && (han == null || d.getHan().compareTo(han) < 0)) han = d.getHan();
        maxQ = Math.max(maxQ, q);
      }
      maxNgay = Math.max(maxNgay, maxQ);
      long con = Math.round(c.conPhaiTra());
      if (con > 0) nccCon.add(m.getMaNCC());
      String ghi = ids.stream().map(i -> raw.getHopDongBan().stream().filter(h -> h.getId().equals(i)).map(h -> Texts.nz(h.getSoHD())).findFirst().orElse("")).filter(s -> !s.isEmpty()).collect(Collectors.joining(", "));
      rowsTra.add(new NoTra(m.getId(), m.getSoHD(), m.getNgayKy(), m.getTenNCC(), m.getMst(), Math.round(c.tong()), Math.round(c.daTra()), con, han, maxQ,
          han == null ? 0 : (int) Math.max(0, LocalDate.parse(han.substring(0, 10)).toEpochDay() - today.toEpochDay()), ghi.isEmpty() ? "" : "đầu vào HĐ " + ghi));
    }
    long tongTra = rowsTra.stream().mapToLong(NoTra::con).sum();
    CongNoTra tra = new CongNoTra(tongTra, nccCon.size(), quaHanTra, nccQua.size(), maxNgay,
        List.of(new Tuoi("Trong hạn", tuoiTra[0]), new Tuoi("1–30 ngày", tuoiTra[1]), new Tuoi("31–60 ngày", tuoiTra[2]), new Tuoi("Trên 60 ngày", tuoiTra[3])), rowsTra);

    // 5 · Vận hành & cảnh báo
    long vc = hds.stream().mapToLong(HdPt::cpVC).sum(), kd = hds.stream().mapToLong(HdPt::cpKD).sum(), kh = hds.stream().mapToLong(HdPt::cpKhac).sum();
    int soVc = 0, soKd = 0;
    for (ChiPhiHD c : raw.getChiPhiHD()) {
      if (!TrangThai.DA_DUYET.equals(c.getTrangThai()) || !hdbIds.contains(c.getHdbId())) continue;
      if (Calc.LCP_VAN_CHUYEN.equals(c.getLoaiChiPhi())) soVc++;
      else if (KD.equals(c.getLoaiChiPhi())) soKd++;
    }
    List<CanhBao> cb = new ArrayList<>();
    for (HdPt r : hds) {
      HopDongBan h = r.h();
      if (r.conTrongQuy() < 0)
        cb.add(new CanhBao("P1", "VỐN", "Quỹ PT đang ứng trước", "Đã trả NCC / chi phí " + (r.traNcc() + r.cp()) + "đ nhưng KH mới trả " + r.khTra() + "đ", h.getTenKH(), -r.conTrongQuy(),
            "Thu công nợ KH, tạm dừng trả NCC đơn mới", h.getSale()));
      if (r.conNhan() > 0)
        cb.add(new CanhBao("P1", "TIỀN VỀ OXY", "Quyền lợi đủ ĐK chưa chuyển", "KH đã trả " + Math.round(100.0 * r.khTra() / Math.max(1, r.c().sauVAT())) + "% · Phú Tài chưa chuyển phần quyền lợi", h.getTenKH(), r.conNhan(),
            "Gửi biên bản đối soát, nhắc PT chuyển", h.getSale()));
      if (!r.c().hoSoThieu().isEmpty())
        cb.add(new CanhBao("P1", "HỒ SƠ", "Thiếu hồ sơ, chặn tất toán", "Thiếu " + String.join(", ", r.c().hoSoThieu()), h.getTenKH(), 0, "Bổ sung trước khi chốt kỳ", h.getSale()));
      if (r.h().getTruocVAT() > 0 && r.cp() * 100.0 / r.h().getTruocVAT() > 5)
        cb.add(new CanhBao("P2", "CHI PHÍ", "Chi phí vận hành vượt định mức", pct1(r.cp() / (double) r.h().getTruocVAT()) + "% giá bán · định mức 5%", h.getTenKH(), r.cp(), "Xem lại cách giao", h.getSale()));
    }
    for (NoTra n : rowsTra)
      if (n.quaHanNgay() > 0 && n.con() > 0)
        cb.add(new CanhBao("P2", "CÔNG NỢ NCC", "NCC quá hạn thanh toán", "Quá hạn " + n.quaHanNgay() + " ngày", n.tenNCC() + " · " + n.soHD(), n.con(), "Lên lịch trả từ quỹ PT", ""));
    cb.sort(Comparator.comparing(CanhBao::muc).thenComparing(Comparator.comparingLong(CanhBao::soTien).reversed()));
    VanHanh vh = new VanHanh(vc, soVc, kd, soKd, kh, cp, giaBan > 0 ? pct1((double) cp / giaBan) : 0, (int) cb.stream().filter(x -> "P1".equals(x.muc())).count(),
        (int) cb.stream().filter(x -> "P2".equals(x.muc())).count(), cb);

    Map<String, String> khMap = new LinkedHashMap<>();
    tatCa.forEach(r -> khMap.putIfAbsent(r.h().getMaKH(), r.h().getTenKH()));
    return new BcDto(homNay, loc, hieu, ln, tongLn, thu, tra, vh, khMap.entrySet().stream().map(e -> new Opt(e.getKey(), e.getValue())).toList());
  }
}
