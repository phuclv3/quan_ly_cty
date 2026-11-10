package vn.oxymecie.appoxy.domain.logic;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.model.DongPhieuKho;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.HopDongMua;
import vn.oxymecie.appoxy.domain.model.Kho;
import vn.oxymecie.appoxy.domain.model.LoaiHang;
import vn.oxymecie.appoxy.domain.model.NhaCungCap;
import vn.oxymecie.appoxy.domain.model.PhieuKho;
import vn.oxymecie.appoxy.domain.model.TrangThai;

/**
 * Phiếu nhập / xuất kho (PDF, A4 dọc) theo Mẫu số 01-VT / 02-VT (Thông tư 133/2016/TT-BTC):
 * đầu mẫu, tiêu đề, các dòng thông tin, bảng hàng, tổng bằng chữ, chữ ký 5 bên.
 * Số liệu lấy từ dữ liệu đã lưu của phiếu (không nhận từ client). Font: Carlito (resources/mau/fonts).
 */
@Component
public class PhieuKhoPdf {
  private static final String TEN_CTY = "CÔNG TY CỔ PHẦN OXYMECIE VIỆT NAM";
  private static final String DIA_CHI_CTY = "Số 56 Louis XII, Khu đô thị mới Hoàng Văn Thụ, Phường Hoàng Mai, Thành phố Hà Nội";
  private static final String CHAM = "........................................................................................................";
  /** Số dòng tối thiểu của bảng — phiếu ít hàng vẫn chừa dòng trống như mẫu. */
  private static final int SO_DONG_TOI_THIEU = 11;
  private static final int SO_COT = 7;

  private final byte[] fontThuong;
  private final byte[] fontDam;

  public PhieuKhoPdf() throws IOException {
    this.fontThuong = doc("mau/fonts/Carlito-Regular.ttf");
    this.fontDam = doc("mau/fonts/Carlito-Bold.ttf");
  }

  private static byte[] doc(String path) throws IOException {
    try (InputStream in = new ClassPathResource(path).getInputStream()) {
      return in.readAllBytes();
    }
  }

  /** Số kiểu Việt Nam: 1.234,5 (bỏ phần thập phân khi tròn). */
  private static String so(double v) {
    DecimalFormat f = new DecimalFormat("#,##0.##", DecimalFormatSymbols.getInstance(Locale.forLanguageTag("vi-VN")));
    return f.format(v);
  }

  private static String s(String v) {
    return v == null ? "" : v.trim();
  }

  public byte[] render(Ctx c, PhieuKho p) {
    boolean nhap = "Nhập".equals(p.getLoai());
    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      BaseFont thuong = BaseFont.createFont("Carlito-Regular.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, fontThuong, null);
      BaseFont dam = BaseFont.createFont("Carlito-Bold.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, fontDam, null);
      Font fTx = new Font(thuong, 11f), fDam = new Font(dam, 11f), fCty = new Font(dam, 10.5f);
      Font fNghieng = new Font(thuong, 8.5f, Font.ITALIC), fNghieng11 = new Font(thuong, 11f, Font.ITALIC), fDe = new Font(dam, 18f);

      Document doc = new Document(PageSize.A4, 30f, 30f, 28f, 28f);
      PdfWriter.getInstance(doc, out);
      doc.addTitle("Phiếu " + (nhap ? "nhập" : "xuất") + " kho " + s(p.getSoPhieu()));
      doc.open();

      // Đầu mẫu: đơn vị (trái) — Mẫu số + căn cứ ban hành (phải).
      PdfPTable dau = new PdfPTable(new float[] {1.25f, 1f});
      dau.setWidthPercentage(100);
      PdfPCell trai = new PdfPCell();
      trai.setBorder(Rectangle.NO_BORDER);
      trai.addElement(new Paragraph(TEN_CTY, fCty));
      trai.addElement(new Paragraph("Địa chỉ: " + DIA_CHI_CTY, fNghieng));
      dau.addCell(trai);
      PdfPCell phai = new PdfPCell();
      phai.setBorder(Rectangle.NO_BORDER);
      Paragraph mau = new Paragraph("Mẫu số " + (nhap ? "01" : "02") + " - VT", fCty);
      mau.setAlignment(Element.ALIGN_CENTER);
      phai.addElement(mau);
      Paragraph canCu = new Paragraph("(Ban hành theo Thông tư 133/2016/TT-BTC ngày 26/08/2016 của Bộ Tài chính)", fNghieng);
      canCu.setAlignment(Element.ALIGN_CENTER);
      phai.addElement(canCu);
      dau.addCell(phai);
      doc.add(dau);

      Paragraph de = new Paragraph("PHIẾU " + (nhap ? "NHẬP" : "XUẤT") + " KHO", fDe);
      de.setAlignment(Element.ALIGN_CENTER);
      de.setSpacingBefore(18f);
      doc.add(de);
      Paragraph ngayP = new Paragraph(ngayChu(p.getNgay()), fNghieng11);
      ngayP.setAlignment(Element.ALIGN_CENTER);
      doc.add(ngayP);
      Paragraph soP = new Paragraph("Số: " + (s(p.getSoPhieu()).isEmpty() ? "...................." : p.getSoPhieu()), fNghieng11);
      soP.setAlignment(Element.ALIGN_CENTER);
      soP.setSpacingAfter(8f);
      doc.add(soP);
      if (TrangThai.DA_HUY.equals(p.getTrangThai())) {
        Paragraph huy = new Paragraph("(PHIẾU ĐÃ HUỶ)", new Font(dam, 12f, Font.NORMAL, java.awt.Color.RED));
        huy.setAlignment(Element.ALIGN_CENTER);
        doc.add(huy);
      }

      Kho kho = c.kho(p.getKho());
      String tenKho = kho != null ? s(kho.getTen()) : s(p.getKho());
      String soHd = soHopDong(c, p, nhap);
      String doiTac = doiTac(c, p, nhap);
      if (nhap) {
        String canCuText = soHd.isEmpty() ? "" : "Hợp đồng mua số " + soHd;
        if (!s(p.getSoHoaDon()).isEmpty()) canCuText += (canCuText.isEmpty() ? "" : "; ") + "Hoá đơn số " + p.getSoHoaDon();
        if (canCuText.isEmpty()) canCuText = s(p.getNguonGoc());
        dongForm(doc, "Họ và tên người giao", "", fTx);
        dongForm(doc, "Căn cứ", canCuText + (doiTac.isEmpty() ? "" : " (" + doiTac + ")"), fTx);
        dongForm(doc, "Nhập tại kho", tenKho, fTx);
        dongForm(doc, "Địa điểm giao hàng", "", fTx);
      } else {
        HopDongBan h = p.getHdId() == null ? null : c.hdb(p.getHdId());
        String lyDo = !s(p.getLyDo()).isEmpty() ? s(p.getLyDo()) : (!soHd.isEmpty() ? "Xuất giao hàng theo hợp đồng số " + soHd : s(p.getNguonGoc()));
        dongForm(doc, "Họ và tên người nhận hàng", doiTac, fTx);
        dongForm(doc, "Địa chỉ (bộ phận)", h == null ? "" : s(h.getDiaChi()), fTx);
        dongForm(doc, "Lý do xuất kho", lyDo, fTx);
        dongForm(doc, "Xuất tại kho (ngăn lô)", tenKho, fTx);
      }

      double[] tong = new double[1];
      PdfPTable bang = bang(c, p, nhap, fTx, fDam, tong);
      bang.setSpacingBefore(10f);
      doc.add(bang);

      Paragraph chu = new Paragraph("- Tổng số tiền (viết bằng chữ): " + docTien(Math.round(tong[0])), fDam);
      chu.setSpacingBefore(6f);
      doc.add(chu);
      doc.add(new Paragraph("- Số chứng từ gốc kèm theo: " + (s(p.getSoHoaDon()).isEmpty() ? CHAM.substring(0, 60) : p.getSoHoaDon()), fTx));

      Paragraph ngayKy = new Paragraph(ngayChu(p.getNgay()), fNghieng11);
      ngayKy.setAlignment(Element.ALIGN_RIGHT);
      ngayKy.setSpacingBefore(10f);
      doc.add(ngayKy);

      PdfPTable ky = new PdfPTable(5);
      ky.setWidthPercentage(100);
      ky.setSpacingBefore(6f);
      ky.setKeepTogether(true);
      String[] chuc = {"Người lập phiếu", "Người giao", "Thủ kho", "Kế toán", "Giám đốc"};
      Font fKy = new Font(thuong, 9f, Font.ITALIC);
      for (int i = 0; i < 5; i++) {
        PdfPCell o = new PdfPCell();
        o.setBorder(Rectangle.NO_BORDER);
        Paragraph a = new Paragraph(chuc[i], fDam);
        a.setAlignment(Element.ALIGN_CENTER);
        o.addElement(a);
        Paragraph b = new Paragraph(i == 4 ? "(Ký, họ tên, đóng dấu)" : "(Ký, họ tên)", fKy);
        b.setAlignment(Element.ALIGN_CENTER);
        o.addElement(b);
        if (i == 0) {
          Paragraph t = new Paragraph("\n\n\n" + s(c.userName(p.getNguoiThucHien())).replace("—", ""), fTx);
          t.setAlignment(Element.ALIGN_CENTER);
          o.addElement(t);
        }
        ky.addCell(o);
      }
      doc.add(ky);
      doc.close();
      return out.toByteArray();
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw ApiException.invalid("Không dựng được PDF phiếu kho: " + e.getMessage());
    }
  }

  /** Dòng "- Nhãn: giá trị" — để trống thì kẻ chấm cho viết tay. */
  private static void dongForm(Document doc, String nhan, String giaTri, Font fTx) throws DocumentException {
    Paragraph pa = new Paragraph("- " + nhan + ": " + (s(giaTri).isEmpty() ? CHAM : giaTri), fTx);
    pa.setSpacingAfter(2f);
    doc.add(pa);
  }

  /** "Ngày 05 tháng 10 năm 2026"; chưa có ngày thì để chấm. */
  private static String ngayChu(String iso) {
    if (iso == null || iso.length() < 10) return "Ngày ....... tháng ....... năm 20.......";
    return "Ngày " + iso.substring(8, 10) + " tháng " + iso.substring(5, 7) + " năm " + iso.substring(0, 4);
  }

  private static final String[] CHU_SO = {"không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"};

  /** Đọc một nhóm 3 chữ số; day = có nhóm đứng trước (nhóm < 100 vẫn đọc "không trăm"). */
  private static String docBaSo(int n, boolean day) {
    int tram = n / 100, chuc = n / 10 % 10, dv = n % 10;
    StringBuilder sb = new StringBuilder();
    if (day || tram > 0) sb.append(CHU_SO[tram]).append(" trăm");
    if (chuc > 1) {
      sb.append(sb.length() > 0 ? " " : "").append(CHU_SO[chuc]).append(" mươi");
      if (dv == 1) sb.append(" mốt");
      else if (dv == 4) sb.append(" tư");
      else if (dv == 5) sb.append(" lăm");
      else if (dv > 0) sb.append(" ").append(CHU_SO[dv]);
    } else if (chuc == 1) {
      sb.append(sb.length() > 0 ? " " : "").append("mười");
      if (dv == 5) sb.append(" lăm");
      else if (dv > 0) sb.append(" ").append(CHU_SO[dv]);
    } else if (dv > 0) {
      if (sb.length() > 0) sb.append(" lẻ");
      sb.append(sb.length() > 0 ? " " : "").append(CHU_SO[dv]);
    }
    return sb.toString();
  }

  /** 1.250.000 → "Một triệu hai trăm năm mươi nghìn đồng". */
  static String docTien(long v) {
    if (v == 0) return "Không đồng";
    String[] bac = {"", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"};
    long n = Math.abs(v);
    List<String> parts = new ArrayList<>();
    int i = 0;
    while (n > 0 && i < bac.length) {
      int nhom = (int) (n % 1000);
      n /= 1000;
      if (nhom > 0) parts.add(0, docBaSo(nhom, n > 0) + bac[i]);
      i++;
    }
    String r = String.join(" ", parts).trim() + " đồng";
    r = Character.toUpperCase(r.charAt(0)) + r.substring(1);
    return v < 0 ? "Âm " + r.toLowerCase(Locale.ROOT) : r;
  }

  private static String soHopDong(Ctx c, PhieuKho p, boolean nhap) {
    if (p.getHdId() == null) return "";
    if (nhap) {
      HopDongMua m = c.hdm(p.getHdId());
      return m == null ? "" : s(m.getSoHD());
    }
    HopDongBan h = c.hdb(p.getHdId());
    return h == null ? "" : s(h.getSoHD());
  }

  private static String doiTac(Ctx c, PhieuKho p, boolean nhap) {
    if (nhap) {
      NhaCungCap n = c.ncc(p.getNcc());
      if (n != null) return n.getTen();
      HopDongMua m = p.getHdId() == null ? null : c.hdm(p.getHdId());
      return m == null ? "" : s(m.getTenNCC());
    }
    HopDongBan h = p.getHdId() == null ? null : c.hdb(p.getHdId());
    return h == null ? "" : s(h.getTenKH());
  }

  /** Bảng theo mẫu: STT | Tên, nhãn hiệu, quy cách… | Mã số | ĐVT | Số lượng | Đơn giá | Thành tiền; chừa dòng trống cho đủ mẫu. */
  private PdfPTable bang(Ctx c, PhieuKho p, boolean nhap, Font fTx, Font fDam, double[] tongTien) {
    PdfPTable t = new PdfPTable(new float[] {0.45f, 3.3f, 1.2f, 0.7f, 0.9f, 1.2f, 1.5f});
    t.setWidthPercentage(100);
    t.setHeaderRows(1);
    for (String h : new String[] {"STT", "Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ, sản phẩm, hàng hóa", "Mã số", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền"}) {
      PdfPCell o = new PdfPCell(new Phrase(h, fDam));
      o.setHorizontalAlignment(Element.ALIGN_CENTER);
      o.setVerticalAlignment(Element.ALIGN_MIDDLE);
      o.setPadding(4f);
      t.addCell(o);
    }
    int i = 0;
    double tien = 0;
    for (DongPhieuKho d : p.getDong()) {
      LoaiHang lh = c.loaiHang(d.getLoaiHang());
      Double giaGoc = nhap ? d.getDonGia() : d.getDonGiaGoc();
      double gia = giaGoc == null ? 0 : giaGoc;
      double tt = gia * d.getSoLuong();
      tien += tt;
      String lo = nhap ? Calc.maLo(p, i) : s(d.getLo());
      String ten = (!nhap && !s(d.getTenTrenHD()).isEmpty()) ? d.getTenTrenHD() : (lh != null ? s(lh.getTen()) : s(d.getLoaiHang()));
      if (!s(d.getThuocTinh()).isEmpty()) ten += ", " + d.getThuocTinh().trim();
      if (!lo.isEmpty()) ten += " (Lô " + lo + ")";
      i++;
      o(t, String.valueOf(i), fTx, Element.ALIGN_CENTER);
      o(t, ten, fTx, Element.ALIGN_LEFT);
      o(t, s(d.getLoaiHang()), fTx, Element.ALIGN_CENTER);
      o(t, lh == null ? "" : s(lh.getDvt()), fTx, Element.ALIGN_CENTER);
      o(t, so(d.getSoLuong()), fTx, Element.ALIGN_RIGHT);
      o(t, so(gia), fTx, Element.ALIGN_RIGHT);
      o(t, so(tt), fTx, Element.ALIGN_RIGHT);
    }
    for (int k = i; k < SO_DONG_TOI_THIEU; k++) for (int j = 0; j < SO_COT; j++) o(t, " ", fTx, Element.ALIGN_LEFT);
    PdfPCell cong = new PdfPCell(new Phrase("Cộng:", fDam));
    cong.setColspan(SO_COT - 1);
    cong.setPadding(5f);
    t.addCell(cong);
    o(t, so(tien), fDam, Element.ALIGN_RIGHT);
    tongTien[0] = tien;
    return t;
  }

  private static void o(PdfPTable t, String text, Font f, int canh) {
    PdfPCell o = new PdfPCell(new Phrase(text, f));
    o.setHorizontalAlignment(canh);
    o.setVerticalAlignment(Element.ALIGN_MIDDLE);
    o.setPadding(4f);
    o.setMinimumHeight(19f);
    t.addCell(o);
  }
}
