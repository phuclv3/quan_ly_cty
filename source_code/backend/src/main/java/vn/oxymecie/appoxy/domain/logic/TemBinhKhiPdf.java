package vn.oxymecie.appoxy.domain.logic;

import com.lowagie.text.Document;
import com.lowagie.text.Image;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.web.dto.TemBinhKhiReq;
import vn.oxymecie.appoxy.web.dto.TemBinhKhiReq.ThanhPhan;

/**
 * Tem dán bình khí (PDF, khổ 16:9 như slide mẫu): ảnh nền resources/mau/tem-binh-khi-nen.png (phần cố định của tem)
 * và chữ đặt đúng toạ độ các ô trong PPTX mẫu. Mọi số đo dưới đây là mm, gốc ở góc trên trái, lấy từ khung chữ của slide.
 * Font: Carlito (số đo trùng Calibri, giấy phép OFL) — thay Calibri bằng cách ghi đè 2 tệp trong resources/mau/fonts.
 */
@Component
public class TemBinhKhiPdf {
  private static final float PT = 72f / 25.4f;
  private static final float TRANG_RONG = 338.667f, TRANG_CAO = 190.5f;

  // Khung chữ của PowerPoint: lề trái/phải 2,54 mm, lề trên 1,27 mm; Calibri cao dòng 1,22 em, dòng cơ sở cách mép trên 0,952 em.
  private static final float LE_NGANG = 2.54f, LE_TREN = 1.27f, ASC = 0.952f, DONG = 1.22f;
  private static final float PT_MM = 25.4f / 72f;

  private static final float GT_X = 250.5f, GT_RONG = 81.8f;
  private static final float[] GT_Y = {35.6f, 41.1f, 46.7f, 52.2f, 58.2f, 63.9f, 69.9f, 75.5f};
  private static final float BIEN_PHAP_Y = 81.5f, HUONG_DAN_Y = 97.4f, CO_GT = 9f;
  private static final float NSX_X = 261.6f, NSX_Y = 116.1f, HSD_Y = 121.0f;
  private static final float KC_LON_X = 271.85f, KC_LON_Y = 127.4f, KC_NHO_X = 264.05f, KC_NHO_Y = 134.2f;
  private static final float TB_Y = 158.5f, TB_BUOC = 6.3f;
  private static final float[] TB_TAM = {205.6f, 256.5f, 303.5f};
  private static final float[] TB_CO = {11f, 12f, 12f};
  private static final float[] TB_RONG = {52f, 47f, 43f};

  private static final int TOI_DA_DONG = 8, TOI_DA_THANH_PHAN = 4, TOI_DA_TEM = 100, TOI_DA_KY_TU = 300;

  private final byte[] nen;
  private final byte[] fontThuong;
  private final byte[] fontDam;

  public TemBinhKhiPdf() throws IOException {
    this.nen = doc("mau/tem-binh-khi-nen.png");
    this.fontThuong = doc("mau/fonts/Carlito-Regular.ttf");
    this.fontDam = doc("mau/fonts/Carlito-Bold.ttf");
  }

  private static byte[] doc(String path) throws IOException {
    try (InputStream in = new ClassPathResource(path).getInputStream()) {
      return in.readAllBytes();
    }
  }

  public byte[] render(TemBinhKhiReq r) {
    kiemTra(r);
    // soSeris: mỗi số serial một tem (in nhiều bình cùng mã một lần); không có thì in soLuong bản của soSeri.
    List<String> seris = r.soSeris() == null ? List.of() : r.soSeris().stream().map(TemBinhKhiPdf::s).filter(x -> !x.isEmpty()).toList();
    int soTem = seris.isEmpty() ? (r.soLuong() == null ? 1 : r.soLuong()) : seris.size();
    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      BaseFont thuong = BaseFont.createFont("Carlito-Regular.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, fontThuong, null);
      BaseFont dam = BaseFont.createFont("Carlito-Bold.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, fontDam, null);
      Document doc = new Document(new Rectangle(TRANG_RONG * PT, TRANG_CAO * PT), 0, 0, 0, 0);
      PdfWriter w = PdfWriter.getInstance(doc, out);
      doc.setPageSize(new Rectangle(TRANG_RONG * PT, TRANG_CAO * PT));
      doc.addTitle("Tem bình khí " + s(r.soSeri()));
      doc.open();
      for (int i = 0; i < soTem; i++) {
        if (i > 0) doc.newPage();
        Image bg = Image.getInstance(nen);
        bg.scaleAbsolute(338.5f * PT, 190.0f * PT);
        bg.setAbsolutePosition(0, (TRANG_CAO - 0.4f - 190.0f) * PT);
        doc.add(bg);
        ve(w.getDirectContent(), thuong, dam, seris.isEmpty() ? r : voiSeri(r, seris.get(i)));
      }
      doc.close();
      return out.toByteArray();
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw ApiException.invalid("Không dựng được PDF tem: " + e.getMessage());
    }
  }

  private static TemBinhKhiReq voiSeri(TemBinhKhiReq r, String seri) {
    return new TemBinhKhiReq(r.loai(), r.quyCachVan(), r.vatLieu(), r.apSuat(), seri, r.maUn(), r.dinhLuong(), r.xuatXu(), r.bienPhap(), r.huongDan(),
        r.ngaySanXuat(), r.hanSuDung(), r.tenKhiChuan(), r.thanhPhan(), r.soLuong(), r.xemTruoc(), r.soSeris());
  }

  private void ve(PdfContentByte cb, BaseFont thuong, BaseFont dam, TemBinhKhiReq r) {
    String[] gt = {r.loai(), r.quyCachVan(), r.vatLieu(), r.apSuat(), r.soSeri(), r.maUn(), r.dinhLuong(), r.xuatXu()};
    for (int i = 0; i < gt.length; i++) dong(cb, thuong, CO_GT, GT_X + LE_NGANG, GT_Y[i], s(gt[i]), Color.BLACK, false, 0);
    khoi(cb, thuong, r.bienPhap(), BIEN_PHAP_Y);
    khoi(cb, thuong, r.huongDan(), HUONG_DAN_Y);
    dong(cb, thuong, CO_GT, NSX_X + LE_NGANG, NSX_Y, s(r.ngaySanXuat()), Color.BLACK, false, 0);
    dong(cb, thuong, CO_GT, NSX_X + LE_NGANG, HSD_Y, s(r.hanSuDung()), Color.BLACK, false, 0);
    // Tên khí chuẩn ở tiêu đề xanh: "KHÍ CHUẨN ( … )" cỡ 14 đậm và "STANDARD GAS ( … )" cỡ 8 đậm, chữ trắng.
    dong(cb, dam, 14f, KC_LON_X, KC_LON_Y, s(r.tenKhiChuan()), Color.WHITE, true, 0);
    dong(cb, dam, 8f, KC_NHO_X, KC_NHO_Y, s(r.tenKhiChuan()), Color.WHITE, true, 0);
    List<ThanhPhan> tp = r.thanhPhan() == null ? List.of() : r.thanhPhan();
    for (int i = 0; i < tp.size(); i++) {
      float y = TB_Y + i * TB_BUOC;
      String[] o = {s(tp.get(i).ten()), s(tp.get(i).kyHieu()), s(tp.get(i).nongDo())};
      for (int c = 0; c < 3; c++) {
        // Chỉ số dưới chỉ áp cho cột Kí hiệu (công thức hoá học).
        dong(cb, thuong, TB_CO[c], TB_TAM[c], y, o[c], Color.BLACK, true, c == 1 ? 1 : 0, TB_RONG[c]);
      }
    }
  }

  /** Khối nhiều dòng trong ô rộng 81,8 mm: mỗi phần tử là 1 đoạn, tự xuống dòng khi dài hơn ô. */
  private void khoi(PdfContentByte cb, BaseFont f, List<String> dong, float yTren) {
    if (dong == null) return;
    float y = yTren, rong = GT_RONG - 2 * LE_NGANG;
    for (String d : dong) {
      for (String ln : boc(f, CO_GT, s(d), rong)) {
        dong(cb, f, CO_GT, GT_X + LE_NGANG, y, ln, Color.BLACK, false, 0);
        y += DONG * CO_GT * PT_MM;
      }
    }
  }

  private static List<String> boc(BaseFont f, float co, String t, float rongMm) {
    List<String> kq = new ArrayList<>();
    StringBuilder cur = new StringBuilder();
    for (String tu : t.trim().split("\\s+")) {
      String thu = cur.length() == 0 ? tu : cur + " " + tu;
      if (cur.length() > 0 && f.getWidthPoint(thu, co) * PT_MM > rongMm) {
        kq.add(cur.toString());
        cur = new StringBuilder(tu);
      } else {
        cur = new StringBuilder(thu);
      }
    }
    kq.add(cur.toString());
    return kq;
  }

  private void dong(PdfContentByte cb, BaseFont f, float co, float x, float yTren, String t, Color mau, boolean giua, int chiSo) {
    dong(cb, f, co, x, yTren, t, mau, giua, chiSo, 0);
  }

  /**
   * Vẽ 1 dòng. yTren = mép trên khung chữ; giua = true thì x là tâm. chiSo = 1: chữ số sau chữ cái thành chỉ số dưới.
   * rongToiDa > 0: co nhỏ cỡ chữ nếu dòng dài hơn ô.
   */
  private void dong(PdfContentByte cb, BaseFont f, float co, float x, float yTren, String t, Color mau, boolean giua, int chiSo, float rongToiDa) {
    if (t.isBlank()) return;
    List<String[]> doan = chiSo == 1 || (giua && mau == Color.WHITE) ? tachChiSo(t) : List.<String[]>of(new String[] {t, "0"});
    float rong = 0;
    for (String[] d : doan) rong += f.getWidthPoint(d[0], "1".equals(d[1]) ? co * 0.65f : co) * PT_MM;
    if (rongToiDa > 0 && rong > rongToiDa) {
      float k = rongToiDa / rong;
      co *= k;
      rong = rongToiDa;
    }
    float bx = (giua ? x - rong / 2 : x) * PT;
    float by = (TRANG_CAO - (yTren + LE_TREN + ASC * co * PT_MM)) * PT;
    cb.beginText();
    cb.setColorFill(mau);
    for (String[] d : doan) {
      boolean sub = "1".equals(d[1]);
      float c = sub ? co * 0.65f : co;
      cb.setFontAndSize(f, c);
      cb.setTextRise(sub ? -0.25f * co : 0);
      cb.setTextMatrix(bx, by);
      cb.showText(d[0]);
      bx += f.getWidthPoint(d[0], c);
    }
    cb.setTextRise(0);
    cb.endText();
  }

  /** "CO2" → [["CO","0"],["2","1"]]: chữ số đứng ngay sau chữ cái là chỉ số dưới; "99.99 %" giữ nguyên. */
  private static List<String[]> tachChiSo(String t) {
    List<String[]> kq = new ArrayList<>();
    StringBuilder cur = new StringBuilder();
    boolean sub = false;
    for (int i = 0; i < t.length(); i++) {
      char c = t.charAt(i);
      boolean laSub = Character.isDigit(c) && i > 0 && Character.isLetter(t.charAt(i - 1)) || (sub && Character.isDigit(c));
      if (laSub != sub && cur.length() > 0) {
        kq.add(new String[] {cur.toString(), sub ? "1" : "0"});
        cur.setLength(0);
      }
      sub = laSub;
      cur.append(c);
    }
    if (cur.length() > 0) kq.add(new String[] {cur.toString(), sub ? "1" : "0"});
    return kq;
  }

  private static String s(String v) {
    return v == null ? "" : v.trim();
  }

  private static void kiemTra(TemBinhKhiReq r) {
    if (r == null) throw ApiException.invalid("Thiếu thông tin tem");
    boolean xem = Boolean.TRUE.equals(r.xemTruoc());
    if (!xem) batBuoc(r);
    if (r.soSeris() != null && r.soSeris().size() > TOI_DA_TEM) throw ApiException.invalid("Số tem in từ 1 đến " + TOI_DA_TEM);
    if (r.soLuong() != null && (r.soLuong() < 1 || r.soLuong() > TOI_DA_TEM)) throw ApiException.invalid("Số tem in từ 1 đến " + TOI_DA_TEM);
    if (r.thanhPhan() != null && r.thanhPhan().size() > TOI_DA_THANH_PHAN) throw ApiException.invalid("Bảng thành phần khí tối đa " + TOI_DA_THANH_PHAN + " dòng");
    if (r.bienPhap() != null && r.bienPhap().size() > TOI_DA_DONG) throw ApiException.invalid("Biện pháp phòng ngừa tối đa " + TOI_DA_DONG + " dòng");
    if (r.huongDan() != null && r.huongDan().size() > TOI_DA_DONG) throw ApiException.invalid("Hướng dẫn sử dụng, bảo quản tối đa " + TOI_DA_DONG + " dòng");
    List<String> tat = new ArrayList<>(List.of(s(r.loai()), s(r.quyCachVan()), s(r.vatLieu()), s(r.apSuat()), s(r.soSeri()), s(r.maUn()), s(r.dinhLuong()),
        s(r.xuatXu()), s(r.ngaySanXuat()), s(r.hanSuDung()), s(r.tenKhiChuan())));
    if (r.bienPhap() != null) r.bienPhap().forEach(x -> tat.add(s(x)));
    if (r.huongDan() != null) r.huongDan().forEach(x -> tat.add(s(x)));
    if (r.thanhPhan() != null) r.thanhPhan().forEach(x -> { tat.add(s(x.ten())); tat.add(s(x.kyHieu())); tat.add(s(x.nongDo())); });
    if (tat.stream().anyMatch(x -> x.length() > TOI_DA_KY_TU)) throw ApiException.invalid("Mỗi ô nhập tối đa " + TOI_DA_KY_TU + " ký tự");
  }

  /** Mọi ô nhập đều bắt buộc (gom hết ô thiếu vào 1 thông báo). */
  private static void batBuoc(TemBinhKhiReq r) {
    List<String> thieu = new ArrayList<>();
    String[][] o = {{"Loại", r.loai()}, {"Quy cách van cổ bình", r.quyCachVan()}, {"Vật liệu bình", r.vatLieu()}, {"Áp suất", r.apSuat()},
        {"Số seri bình", r.soSeri()}, {"Mã nhận dạng hóa chất", r.maUn()}, {"Định lượng", r.dinhLuong()}, {"Xuất xứ hóa chất", r.xuatXu()},
        {"Ngày sản xuất", r.ngaySanXuat()}, {"Hạn sử dụng", r.hanSuDung()}, {"Khí chuẩn", r.tenKhiChuan()}};
    for (String[] x : o) if (s(x[1]).isEmpty()) thieu.add(x[0]);
    if (r.bienPhap() == null || r.bienPhap().stream().allMatch(x -> s(x).isEmpty())) thieu.add("Biện pháp phòng ngừa");
    if (r.huongDan() == null || r.huongDan().stream().allMatch(x -> s(x).isEmpty())) thieu.add("Hướng dẫn sử dụng, bảo quản");
    if (r.thanhPhan() == null || r.thanhPhan().isEmpty()) thieu.add("Thành phần khí (ít nhất 1 dòng)");
    else if (r.thanhPhan().stream().anyMatch(t -> s(t.ten()).isEmpty() || s(t.kyHieu()).isEmpty() || s(t.nongDo()).isEmpty())) thieu.add("Thành phần khí (mỗi dòng đủ tên khí, kí hiệu, nồng độ)");
    if (r.soLuong() == null) thieu.add("Số tem in");
    if (!thieu.isEmpty()) throw ApiException.invalid("Cần nhập: " + String.join(", ", thieu));
  }
}
