package vn.oxymecie.appoxy.domain.logic;

import com.lowagie.text.Document;
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
 * Phiếu nhập / xuất kho (PDF, A4 dọc): tiêu đề, thông tin phiếu, bảng dòng hàng theo lô, tổng và chữ ký 3 bên.
 * Số liệu lấy từ dữ liệu đã lưu của phiếu (không nhận từ client). Font: Carlito (resources/mau/fonts).
 */
@Component
public class PhieuKhoPdf {
  private static final float LE = 36f;
  private static final java.awt.Color XAM = new java.awt.Color(0xEE, 0xEE, 0xEE);

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

  private static String ngay(String iso) {
    if (iso == null || iso.length() < 10) return iso == null ? "" : iso;
    return iso.substring(8, 10) + "/" + iso.substring(5, 7) + "/" + iso.substring(0, 4);
  }

  private static String s(String v) {
    return v == null ? "" : v.trim();
  }

  public byte[] render(Ctx c, PhieuKho p) {
    boolean nhap = "Nhập".equals(p.getLoai());
    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      BaseFont thuong = BaseFont.createFont("Carlito-Regular.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, fontThuong, null);
      BaseFont dam = BaseFont.createFont("Carlito-Bold.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, fontDam, null);
      Font fTx = new Font(thuong, 10.5f), fDam = new Font(dam, 10.5f), fNho = new Font(thuong, 9f), fDe = new Font(dam, 18f);

      Document doc = new Document(PageSize.A4, LE, LE, 40f, 40f);
      PdfWriter.getInstance(doc, out);
      doc.addTitle("Phiếu " + (nhap ? "nhập" : "xuất") + " kho " + s(p.getSoPhieu()));
      doc.open();

      Paragraph de = new Paragraph("PHIẾU " + (nhap ? "NHẬP" : "XUẤT") + " KHO", fDe);
      de.setAlignment(Element.ALIGN_CENTER);
      doc.add(de);
      Paragraph soNgay = new Paragraph("Số: " + s(p.getSoPhieu()) + "  ·  Ngày " + ngay(p.getNgay()), fDam);
      soNgay.setAlignment(Element.ALIGN_CENTER);
      soNgay.setSpacingAfter(4f);
      doc.add(soNgay);
      if (TrangThai.DA_HUY.equals(p.getTrangThai())) {
        Paragraph huy = new Paragraph("(PHIẾU ĐÃ HUỶ)", new Font(dam, 12f, Font.NORMAL, java.awt.Color.RED));
        huy.setAlignment(Element.ALIGN_CENTER);
        doc.add(huy);
      }

      PdfPTable tt = new PdfPTable(new float[] {1.4f, 4f});
      tt.setWidthPercentage(100);
      tt.setSpacingBefore(10f);
      tt.setSpacingAfter(10f);
      Kho kho = c.kho(p.getKho());
      dongTin(tt, "Nguồn gốc", s(p.getNguonGoc()), fDam, fTx);
      dongTin(tt, "Vị trí kho", kho != null ? kho.getTen() : s(p.getKho()), fDam, fTx);
      String soHd = soHopDong(c, p, nhap);
      dongTin(tt, nhap ? "Số HĐ mua" : "Số HĐ bán", soHd.isEmpty() ? "—" : soHd, fDam, fTx);
      String doiTac = doiTac(c, p, nhap);
      if (!doiTac.isEmpty()) dongTin(tt, nhap ? "Nhà cung cấp" : "Khách hàng", doiTac, fDam, fTx);
      if (!s(p.getSoHoaDon()).isEmpty()) dongTin(tt, "Số hoá đơn NCC", p.getSoHoaDon(), fDam, fTx);
      if (!s(p.getLyDo()).isEmpty()) dongTin(tt, "Lý do điều chỉnh", p.getLyDo(), fDam, fTx);
      if (!s(p.getGhiChu()).isEmpty()) dongTin(tt, "Ghi chú", p.getGhiChu(), fDam, fTx);
      doc.add(tt);

      doc.add(bang(c, p, nhap, fTx, fDam, fNho));

      PdfPTable ky = new PdfPTable(3);
      ky.setWidthPercentage(100);
      ky.setSpacingBefore(26f);
      ky.setKeepTogether(true);
      String[] chuc = {"Người lập phiếu", "Thủ kho", nhap ? "Người giao hàng" : "Người nhận hàng"};
      String[] ten = {c.userName(p.getNguoiThucHien()), "", ""};
      for (int i = 0; i < 3; i++) {
        PdfPCell o = new PdfPCell();
        o.setBorder(Rectangle.NO_BORDER);
        o.setHorizontalAlignment(Element.ALIGN_CENTER);
        Paragraph a = new Paragraph(chuc[i], fDam);
        a.setAlignment(Element.ALIGN_CENTER);
        o.addElement(a);
        Paragraph b = new Paragraph("(Ký, ghi rõ họ tên)", fNho);
        b.setAlignment(Element.ALIGN_CENTER);
        o.addElement(b);
        Paragraph t = new Paragraph("\n\n\n" + ("—".equals(ten[i]) ? "" : ten[i]), fTx);
        t.setAlignment(Element.ALIGN_CENTER);
        o.addElement(t);
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

  private static void dongTin(PdfPTable t, String nhan, String giaTri, Font fDam, Font fTx) {
    PdfPCell a = new PdfPCell(new Phrase(nhan + ":", fDam));
    a.setBorder(Rectangle.NO_BORDER);
    a.setPaddingBottom(2f);
    PdfPCell b = new PdfPCell(new Phrase(giaTri, fTx));
    b.setBorder(Rectangle.NO_BORDER);
    b.setPaddingBottom(2f);
    t.addCell(a);
    t.addCell(b);
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

  private PdfPTable bang(Ctx c, PhieuKho p, boolean nhap, Font fTx, Font fDam, Font fNho) {
    String[] dau = nhap
        ? new String[] {"#", "Mã lô", "Mã hàng", "Quy cách", "ĐVT", "SL", "Đơn giá", "Thành tiền"}
        : new String[] {"#", "Mã lô", "Mã hàng", "Quy cách lô", "Tên trên HĐ", "ĐVT", "SL", "Đơn giá vốn", "Giá vốn"};
    float[] rong = nhap ? new float[] {0.5f, 1.8f, 2.4f, 2.4f, 0.8f, 1f, 1.4f, 1.6f} : new float[] {0.5f, 1.6f, 2f, 2f, 2f, 0.8f, 1f, 1.4f, 1.5f};
    PdfPTable t = new PdfPTable(rong);
    t.setWidthPercentage(100);
    t.setHeaderRows(1);
    for (String h : dau) {
      PdfPCell o = new PdfPCell(new Phrase(h, fDam));
      o.setBackgroundColor(XAM);
      o.setHorizontalAlignment(Element.ALIGN_CENTER);
      o.setPadding(4f);
      t.addCell(o);
    }
    double tongSl = 0, tongTien = 0;
    int i = 0;
    for (DongPhieuKho d : p.getDong()) {
      LoaiHang lh = c.loaiHang(d.getLoaiHang());
      double gia = (nhap ? d.getDonGia() : d.getDonGiaGoc()) == null ? 0 : (nhap ? d.getDonGia() : d.getDonGiaGoc());
      double tien = gia * d.getSoLuong();
      tongSl += d.getSoLuong();
      tongTien += tien;
      String lo = nhap ? Calc.maLo(p, i) : s(d.getLo());
      String hang = s(d.getLoaiHang()) + (lh != null && !s(lh.getTen()).isEmpty() ? "\n" + lh.getTen() : "");
      String dvt = lh == null ? "" : s(lh.getDvt());
      i++;
      o(t, String.valueOf(i), fTx, Element.ALIGN_CENTER);
      o(t, lo.isEmpty() ? "—" : lo, fDam, Element.ALIGN_LEFT);
      o(t, hang, fTx, Element.ALIGN_LEFT);
      o(t, s(d.getThuocTinh()).isEmpty() ? "—" : d.getThuocTinh(), fTx, Element.ALIGN_LEFT);
      if (!nhap) o(t, s(d.getTenTrenHD()).isEmpty() ? "—" : d.getTenTrenHD(), fTx, Element.ALIGN_LEFT);
      o(t, dvt, fTx, Element.ALIGN_CENTER);
      o(t, so(d.getSoLuong()), fTx, Element.ALIGN_RIGHT);
      o(t, so(gia), fTx, Element.ALIGN_RIGHT);
      o(t, so(tien), fTx, Element.ALIGN_RIGHT);
    }
    int cot = dau.length;
    PdfPCell tong = new PdfPCell(new Phrase("Tổng cộng", fDam));
    tong.setColspan(cot - 3);
    tong.setHorizontalAlignment(Element.ALIGN_RIGHT);
    tong.setPadding(4f);
    t.addCell(tong);
    o(t, so(tongSl), fDam, Element.ALIGN_RIGHT);
    t.addCell(new PdfPCell(new Phrase("", fTx)));
    o(t, so(tongTien), fDam, Element.ALIGN_RIGHT);
    return t;
  }

  private static void o(PdfPTable t, String text, Font f, int canh) {
    PdfPCell o = new PdfPCell(new Phrase(text, f));
    o.setHorizontalAlignment(canh);
    o.setVerticalAlignment(Element.ALIGN_MIDDLE);
    o.setPadding(4f);
    t.addCell(o);
  }
}
