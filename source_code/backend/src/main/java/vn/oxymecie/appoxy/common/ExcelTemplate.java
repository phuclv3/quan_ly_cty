package vn.oxymecie.appoxy.common;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;

/**
 * Template Excel dùng chung cho mọi tệp .xlsx xuất ra (bảng đang xem, tệp mẫu nhập liệu).
 * Dòng đầu là tiêu đề: đậm, chữ trắng trên nền xanh, căn giữa, tự xuống dòng. Mọi ô có viền; dòng dữ liệu tô xen kẽ;
 * có Auto Filter + cố định hàng tiêu đề; độ rộng cột tự tính theo nội dung (có chặn trên).
 * Kiểu ô: số nguyên / số thập phân căn phải, ngày dd/mm/yyyy căn giữa, tỷ lệ % căn phải, chữ căn trái.
 * Dựng bằng SXSSF (đẩy dòng xuống đĩa tạm sau 200 dòng) nên dữ liệu lớn không đầy bộ nhớ; kiểu ô tạo một lần rồi dùng lại.
 */
public final class ExcelTemplate {
  private ExcelTemplate() {}

  /** @param rong độ rộng cột (ký tự Excel) — null/thiếu thì tự tính; @param tieuDe dòng đầu là tiêu đề; @param chuyenKieu chữ dd/mm/yyyy và "12,5%" → ô ngày / ô tỷ lệ thật. */
  public record Bang(String ten, List<List<Object>> dong, List<Double> rong, boolean tieuDe, boolean chuyenKieu) {
    public Bang(String ten, List<List<Object>> dong) {
      this(ten, dong, null, true, true);
    }
  }

  public static final int MAX_DONG = 1_048_576;
  private static final int MAX_KY_TU = 32_767;
  private static final double RONG_MIN = 8;
  private static final double RONG_MAX = 50;
  private static final String FONT = "Calibri";

  private static final Pattern NGAY = Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4})");
  private static final Pattern PHAN_TRAM = Pattern.compile("[+-]?\\d[\\d.]*(,\\d+)?%");

  private enum Loai { CHU, CHU_PHAI, CHU_GIUA, NGUYEN, THAP_PHAN, MOT_SO_LE, TY_LE, NGAY }

  /** Ô đã phân loại. */
  private record O(Loai loai, Object v) {}

  private static final O TRONG = new O(null, null);

  public static byte[] ghi(List<Bang> bang) throws IOException {
    SXSSFWorkbook wb = new SXSSFWorkbook(200);
    try {
      Kieu kieu = new Kieu(wb);
      Set<String> daDung = new HashSet<>();
      for (int i = 0; i < bang.size(); i++) ghiSheet(wb, kieu, bang.get(i), tenSheet(bang.get(i).ten(), i, daDung));
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      wb.write(out);
      return out.toByteArray();
    } finally {
      wb.dispose();
    }
  }

  /** Tên sheet ≤ 31 ký tự, bỏ ký tự cấm, không trùng (không phân biệt hoa thường). */
  static String tenSheet(String ten, int i, Set<String> daDung) {
    String t = ten == null || ten.isBlank() ? "Sheet" + (i + 1) : ten.replaceAll("[\\\\/?*\\[\\]:]", "-").strip();
    t = t.length() > 31 ? t.substring(0, 31) : t;
    if (t.startsWith("'") || t.endsWith("'")) t = t.replace("'", "");
    if (t.isEmpty()) t = "Sheet" + (i + 1);
    while (!daDung.add(t.toLowerCase())) {
      String hau = " (" + (i + 1) + ")";
      t = t.substring(0, Math.min(t.length(), 31 - hau.length())) + hau;
      i++;
    }
    return t;
  }

  private static void ghiSheet(SXSSFWorkbook wb, Kieu kieu, Bang b, String ten) {
    List<List<Object>> dong = b.dong() == null ? List.of() : b.dong();
    if (dong.size() > MAX_DONG) throw ApiException.invalid("Quá nhiều dòng để xuất Excel (tối đa " + MAX_DONG + " dòng)");
    Sheet sh = wb.createSheet(ten);

    int nCot = 0;
    for (List<Object> r : dong) nCot = Math.max(nCot, r == null ? 0 : r.size());
    boolean td = b.tieuDe() && !dong.isEmpty();

    // Pass 1: phân loại ô + thu thập thống kê theo cột.
    List<O[]> oo = new ArrayList<>(dong.size());
    boolean[] coSoLe = new boolean[nCot];
    boolean[] coChuThat = new boolean[nCot];
    boolean[] coSo = new boolean[nCot];
    boolean[] coNgay = new boolean[nCot];
    double[] rong = new double[nCot];
    for (int ri = 0; ri < dong.size(); ri++) {
      List<Object> r = dong.get(ri) == null ? List.of() : dong.get(ri);
      O[] row = new O[nCot];
      boolean laTieuDe = td && ri == 0;
      for (int ci = 0; ci < nCot; ci++) {
        O o = ci < r.size() ? phanLoai(r.get(ci), b.chuyenKieu() && !laTieuDe) : TRONG;
        row[ci] = o;
        if (laTieuDe || o.loai() == null) continue;
        rong[ci] = Math.max(rong[ci], doRong(o));
        switch (o.loai()) {
          case NGUYEN -> coSo[ci] = true;
          case THAP_PHAN -> {
            coSo[ci] = true;
            coSoLe[ci] = true;
          }
          case TY_LE -> coSo[ci] = true;
          case NGAY -> coNgay[ci] = true;
          default -> {
            if (!giaTriRong(o.v())) coChuThat[ci] = true;
          }
        }
      }
      oo.add(row);
    }
    // Ô số nguyên → thập phân nếu cột có số lẻ.
    for (int ri = td ? 1 : 0; ri < oo.size(); ri++)
      for (int ci = 0; ci < nCot; ci++) {
        O o = oo.get(ri)[ci];
        if (o.loai() == Loai.NGUYEN && coSoLe[ci]) oo.get(ri)[ci] = new O(Loai.THAP_PHAN, o.v());
      }

    // Độ rộng cột + chiều cao tiêu đề.
    double[] w = new double[nCot];
    for (int ci = 0; ci < nCot; ci++) {
      double hd = td ? doRong(oo.get(0)[ci]) : 0;
      double v = Math.max(rong[ci], Math.min(hd, 18));
      w[ci] = Math.min(RONG_MAX, Math.max(RONG_MIN, v * 1.1 + 2));
      if (b.rong() != null && ci < b.rong().size() && b.rong().get(ci) != null && b.rong().get(ci) > 0) w[ci] = Math.min(255, b.rong().get(ci));
      sh.setColumnWidth(ci, (int) Math.round(w[ci] * 256));
    }
    float hTieuDe = 0;
    if (td) {
      int dong1 = 1;
      for (int ci = 0; ci < nCot; ci++) dong1 = Math.max(dong1, (int) Math.ceil(doRong(oo.get(0)[ci]) * 1.15 / Math.max(1, w[ci] - 1)));
      hTieuDe = Math.min(120, 18 + 15 * (dong1 - 1));
      sh.createFreezePane(0, 1);
    }
    // Pass 2: ghi.
    int dau = td ? 1 : 0;
    for (int ri = 0; ri < oo.size(); ri++) {
      Row row = sh.createRow(ri);
      boolean laTieuDe = td && ri == 0;
      if (laTieuDe) row.setHeightInPoints(hTieuDe);
      boolean xen = !laTieuDe && ((ri - dau) % 2 == 1);
      for (int ci = 0; ci < nCot; ci++) {
        O o = oo.get(ri)[ci];
        Cell c = row.createCell(ci);
        if (laTieuDe) {
          c.setCellStyle(kieu.tieuDe);
          c.setCellValue(cat(o.loai() == null ? "" : String.valueOf(o.v())));
          continue;
        }
        Loai loai = o.loai();
        if (loai == null) {
          c.setCellStyle(kieu.o(chuCanhTheoCot(coSo[ci], coNgay[ci], coChuThat[ci]), xen));
          continue;
        }
        boolean tyLeCot = tieuCotCoPhanTram(dong, td, ci);
        switch (loai) {
          case NGUYEN, THAP_PHAN -> {
            c.setCellStyle(kieu.o(tyLeCot ? Loai.MOT_SO_LE : loai, xen));
            c.setCellValue(((Number) o.v()).doubleValue());
          }
          case TY_LE -> {
            c.setCellStyle(kieu.o(Loai.TY_LE, xen));
            c.setCellValue(((Number) o.v()).doubleValue());
          }
          case NGAY -> {
            c.setCellStyle(kieu.o(Loai.NGAY, xen));
            c.setCellValue((LocalDate) o.v());
          }
          default -> {
            String s = String.valueOf(o.v());
            c.setCellStyle(kieu.o(s.isEmpty() || !chuCoDinh(s) ? Loai.CHU : chuCanhTheoCot(coSo[ci], coNgay[ci], coChuThat[ci]), xen));
            c.setCellValue(cat(s));
          }
        }
      }
    }

    if (nCot > 0 && td) sh.setAutoFilter(new CellRangeAddress(0, Math.max(0, dong.size() - 1), 0, nCot - 1));
    sh.setFitToPage(true);
    sh.getPrintSetup().setFitWidth((short) 1);
    sh.getPrintSetup().setFitHeight((short) 0);
    sh.getPrintSetup().setLandscape(true);
  }

  /** Cột có "%" trong tiêu đề: số hiển thị 1 số lẻ (giá trị đã là phần trăm, vd 45.5). */
  private static boolean tieuCotCoPhanTram(List<List<Object>> dong, boolean td, int ci) {
    if (!td || dong.isEmpty() || dong.get(0) == null || ci >= dong.get(0).size()) return false;
    Object h = dong.get(0).get(ci);
    return h != null && String.valueOf(h).contains("%");
  }

  private static boolean giaTriRong(Object v) {
    if (v == null) return true;
    String s = String.valueOf(v).strip();
    return s.isEmpty() || s.equals("—") || s.equals("-");
  }

  /** Chữ giữ chỗ ("—", "-") trong cột số/ngày thì căn theo cột; chữ thật luôn căn trái. */
  private static boolean chuCoDinh(String s) {
    String t = s.strip();
    return t.isEmpty() || t.equals("—") || t.equals("-");
  }

  private static Loai chuCanhTheoCot(boolean coSo, boolean coNgay, boolean coChuThat) {
    if (coChuThat) return Loai.CHU;
    if (coNgay) return Loai.CHU_GIUA;
    return coSo ? Loai.CHU_PHAI : Loai.CHU;
  }

  private static O phanLoai(Object v, boolean chuyen) {
    if (v == null) return TRONG;
    if (v instanceof Number n) {
      double d = n.doubleValue();
      if (Double.isNaN(d) || Double.isInfinite(d)) return new O(Loai.CHU, "");
      return new O(d == Math.rint(d) && Math.abs(d) < 1e15 ? Loai.NGUYEN : Loai.THAP_PHAN, d);
    }
    String s = String.valueOf(v);
    if (chuyen) {
      var m = NGAY.matcher(s);
      if (m.matches()) {
        try {
          return new O(Loai.NGAY, LocalDate.of(Integer.parseInt(m.group(3)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(1))));
        } catch (java.time.DateTimeException e) {
          // ngày không hợp lệ → giữ nguyên là chữ
        }
      }
      if (PHAN_TRAM.matcher(s).matches()) {
        try {
          return new O(Loai.TY_LE, Double.parseDouble(s.substring(0, s.length() - 1).replace(".", "").replace(',', '.')) / 100);
        } catch (NumberFormatException e) {
          // giữ nguyên là chữ
        }
      }
    }
    return new O(Loai.CHU, s);
  }

  private static String cat(String s) {
    return s.length() > MAX_KY_TU ? s.substring(0, MAX_KY_TU) : s;
  }

  /** Độ rộng ước lượng (ký tự) của nội dung ô: dòng dài nhất với chữ nhiều dòng. */
  private static double doRong(O o) {
    if (o.loai() == null) return 0;
    return switch (o.loai()) {
      case NGUYEN -> Math.max(1, Math.round(Math.abs((double) o.v())) == 0 ? 1 : String.valueOf(Math.round(Math.abs((double) o.v()))).length()) * 4.0 / 3 + 1;
      case THAP_PHAN -> String.valueOf(Math.round(Math.abs((double) o.v()))).length() * 4.0 / 3 + 4;
      case TY_LE -> 8;
      case NGAY -> 11;
      default -> {
        double m = 0;
        for (String l : String.valueOf(o.v()).split("\\R", -1)) m = Math.max(m, l.length());
        yield m;
      }
    };
  }

  /** Bộ kiểu ô dùng chung cho cả workbook — tạo một lần (Excel giới hạn ~64.000 kiểu). */
  private static final class Kieu {
    private final SXSSFWorkbook wb;
    private final Map<String, CellStyle> cache = new HashMap<>();
    final CellStyle tieuDe;
    private final XSSFFont font;

    Kieu(SXSSFWorkbook wb) {
      this.wb = wb;
      font = (XSSFFont) wb.createFont();
      font.setFontName(FONT);
      font.setFontHeightInPoints((short) 11);
      XSSFFont dam = (XSSFFont) wb.createFont();
      dam.setFontName(FONT);
      dam.setFontHeightInPoints((short) 11);
      dam.setBold(true);
      dam.setColor(new XSSFColor(new byte[] {(byte) 255, (byte) 255, (byte) 255}, null));
      XSSFCellStyle t = base(dam, HorizontalAlignment.CENTER, null, true);
      t.setFillForegroundColor(new XSSFColor(new byte[] {0x1F, 0x4E, 0x78}, null));
      t.setFillPattern(FillPatternType.SOLID_FOREGROUND);
      tieuDe = t;
    }

    private XSSFCellStyle base(Font f, HorizontalAlignment ngang, String dinhDang, boolean xuongDong) {
      XSSFCellStyle s = (XSSFCellStyle) wb.createCellStyle();
      s.setFont(f);
      s.setAlignment(ngang);
      s.setVerticalAlignment(VerticalAlignment.CENTER);
      s.setWrapText(xuongDong);
      XSSFColor vien = new XSSFColor(new byte[] {(byte) 0xA6, (byte) 0xA6, (byte) 0xA6}, null);
      s.setBorderTop(BorderStyle.THIN);
      s.setBorderBottom(BorderStyle.THIN);
      s.setBorderLeft(BorderStyle.THIN);
      s.setBorderRight(BorderStyle.THIN);
      s.setTopBorderColor(vien);
      s.setBottomBorderColor(vien);
      s.setLeftBorderColor(vien);
      s.setRightBorderColor(vien);
      if (dinhDang != null) s.setDataFormat(wb.createDataFormat().getFormat(dinhDang));
      return s;
    }

    CellStyle o(Loai loai, boolean xen) {
      return cache.computeIfAbsent(loai + (xen ? "#x" : "#"), k -> {
        XSSFCellStyle s = switch (loai) {
          case NGUYEN -> base(font, HorizontalAlignment.RIGHT, "#,##0", false);
          case THAP_PHAN -> base(font, HorizontalAlignment.RIGHT, "#,##0.00", false);
          case MOT_SO_LE -> base(font, HorizontalAlignment.RIGHT, "#,##0.0", false);
          case TY_LE -> base(font, HorizontalAlignment.RIGHT, "0.0%", false);
          case NGAY -> base(font, HorizontalAlignment.CENTER, "dd/mm/yyyy", false);
          case CHU_PHAI -> base(font, HorizontalAlignment.RIGHT, null, true);
          case CHU_GIUA -> base(font, HorizontalAlignment.CENTER, null, true);
          default -> base(font, HorizontalAlignment.LEFT, null, true);
        };
        if (xen) {
          s.setFillForegroundColor(new XSSFColor(new byte[] {(byte) 0xF2, (byte) 0xF6, (byte) 0xFA}, null));
          s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
        return s;
      });
    }
  }
}
