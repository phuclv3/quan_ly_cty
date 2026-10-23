package vn.oxymecie.appoxy.domain.logic;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import org.springframework.core.io.ClassPathResource;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import vn.oxymecie.appoxy.common.Money;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.model.DongHangBan;
import vn.oxymecie.appoxy.domain.model.HopDongBan;

/**
 * Tờ trình chi phí kinh doanh của HĐ bán (.docx): mở mẫu resources/mau/to-trinh.docx, thay nội dung từng đoạn /
 * dòng bảng, giữ nguyên định dạng của mẫu.
 */
public final class ToTrinhDocx {
  private ToTrinhDocx() {}

  private static final String W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  private static final String XML_NS = "http://www.w3.org/XML/1998/namespace";

  public static byte[] tao(HopDongBan h, Calc.HdbCalc c, LocalDate homNay) throws Exception {
    byte[] mau;
    try (InputStream in = new ClassPathResource("mau/to-trinh.docx").getInputStream()) {
      mau = in.readAllBytes();
    }
    Document doc = null;
    List<String> ten = new ArrayList<>();
    List<byte[]> data = new ArrayList<>();
    try (ZipInputStream zin = new ZipInputStream(new ByteArrayInputStream(mau))) {
      for (ZipEntry e; (e = zin.getNextEntry()) != null; ) {
        byte[] b = zin.readAllBytes();
        if (e.getName().equals("word/document.xml")) {
          var f = DocumentBuilderFactory.newInstance();
          f.setNamespaceAware(true);
          doc = f.newDocumentBuilder().parse(new ByteArrayInputStream(b));
          b = null;
        }
        ten.add(e.getName());
        data.add(b);
      }
    }
    dien(doc, h, c, homNay);
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    try (ZipOutputStream zo = new ZipOutputStream(out)) {
      for (int i = 0; i < ten.size(); i++) {
        zo.putNextEntry(new ZipEntry(ten.get(i)));
        zo.write(data.get(i) != null ? data.get(i) : serialize(doc));
        zo.closeEntry();
      }
    }
    return out.toByteArray();
  }

  private static byte[] serialize(Document doc) throws Exception {
    Transformer t = TransformerFactory.newInstance().newTransformer();
    t.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
    t.setOutputProperty(OutputKeys.STANDALONE, "yes");
    StringWriter sw = new StringWriter();
    t.transform(new DOMSource(doc), new StreamResult(sw));
    return sw.toString().getBytes(StandardCharsets.UTF_8);
  }

  // ── thao tác DOM ──
  private static List<Element> kids(Element e, String name) {
    List<Element> r = new ArrayList<>();
    for (Node n = e.getFirstChild(); n != null; n = n.getNextSibling())
      if (n instanceof Element x && name.equals(x.getLocalName())) r.add(x);
    return r;
  }

  /** Đặt chữ cho 1 đoạn: giữ run chữ đầu tiên (và định dạng), bỏ các run chữ còn lại. */
  private static void setText(Element p, String text) {
    List<Element> runs = kids(p, "r").stream().filter(r -> !kids(r, "t").isEmpty()).toList();
    if (runs.isEmpty()) return;
    for (int i = 1; i < runs.size(); i++) p.removeChild(runs.get(i));
    List<Element> ts = kids(runs.get(0), "t");
    for (int i = 1; i < ts.size(); i++) runs.get(0).removeChild(ts.get(i));
    ts.get(0).setTextContent(text);
    ts.get(0).setAttributeNS(XML_NS, "xml:space", "preserve");
  }

  /** Ô nhiều dòng: nhân đoạn đầu của ô cho từng dòng. */
  private static void setLines(Element cell, List<String> lines) {
    List<Element> ps = kids(cell, "p");
    Element p0 = ps.get(0);
    for (int i = 1; i < ps.size(); i++) cell.removeChild(ps.get(i));
    if (lines.isEmpty()) lines = List.of("");
    for (int i = 0; i < lines.size(); i++) {
      Element p = i == 0 ? p0 : (Element) p0.cloneNode(true);
      if (i > 0) cell.appendChild(p);
      if (kids(p, "r").stream().anyMatch(r -> !kids(r, "t").isEmpty())) setText(p, lines.get(i));
    }
  }

  private static String tien(double n) {
    return Math.round(n) == 0 ? "-" : Money.money(n) + " VNĐ";
  }

  private static String ngay(LocalDate d) {
    return String.format("ngày %02d tháng %02d năm %d", d.getDayOfMonth(), d.getMonthValue(), d.getYear());
  }

  private static void dien(Document doc, HopDongBan h, Calc.HdbCalc c, LocalDate hom) {
    Element body = (Element) doc.getElementsByTagNameNS(W, "body").item(0);
    List<Element> tbls = kids(body, "tbl");
    List<Element> paras = kids(body, "p");
    String nam = String.valueOf(hom.getYear());

    // Đầu trang
    var hd = kids(kids(tbls.get(0), "tr").get(1), "tc");
    setText(kids(hd.get(0), "p").get(0), "Số: …/" + nam + "/TT-OMV");
    setText(kids(hd.get(1), "p").get(0), "Hà Nội, " + ngay(hom));

    // Căn cứ hợp đồng; mẫu có dòng "Nguồn khách hàng" nhưng HĐ chưa lưu nguồn → bỏ dòng
    LocalDate ky = h.getNgayKy() == null || h.getNgayKy().length() < 10 ? null : LocalDate.parse(h.getNgayKy().substring(0, 10));
    String soHD = h.getSoHD() == null || h.getSoHD().isBlank() ? "………..": h.getSoHD();
    for (Element p : paras) {
      String t = p.getTextContent();
      if (t.contains("Hợp đồng kinh tế số"))
        setText(p, "- Căn cứ vào nội dung Hợp đồng kinh tế số " + soHD + " kí " + (ky == null ? "ngày …… tháng …… năm ……" : ngay(ky))
            + " giữa Công ty " + h.getTenKH() + " và Công ty Cổ phần Oxymecie Việt Nam;");
      else if (t.contains("Nguồn khách hàng")) body.removeChild(p);
      else if (t.contains("Kèm theo Tờ trình"))
        setText(p, "(Kèm theo Tờ trình số …/" + nam + "/TT-OMV " + ngay(hom) + ")");
    }

    // Bảng tiền (dòng 1..7)
    var ts = h.getThamSoThue();
    var th = c.thue();
    String[] nhan = {null, null, null, null, "Phí QL (≤" + Money.phanTram(ts.getNguong()) + ") - " + Money.phanTram(ts.getMuc1()),
        "Phí QL (>" + Money.phanTram(ts.getNguong()) + ") - " + Money.phanTram(ts.getMuc2()), null};
    double[] so = {h.getTruocVAT(), h.getThucTeTruocVAT(), c.chenhLech(), th.thue(), th.thue1(), th.thue2(), Math.max(c.chenhLech() - th.thue(), 0)};
    var rows = kids(tbls.get(1), "tr");
    for (int i = 0; i < 7; i++) {
      var cells = kids(rows.get(i + 1), "tc");
      if (nhan[i] != null) setText(kids(cells.get(1), "p").get(0), nhan[i]);
      setText(kids(cells.get(2), "p").get(0), tien(so[i]));
    }

    // Phụ lục chi tiết
    List<DongHangBan> ds = h.getDongHang() != null && !h.getDongHang().isEmpty() ? h.getDongHang()
        : List.of(new DongHangBan("", "", "Giá trị hợp đồng", 1, h.getTruocVAT(), h.getThucTeTruocVAT(), ""));
    var pl = kids(tbls.get(3), "tr");
    Element mauRow = pl.get(1);
    Element tong = pl.get(pl.size() - 1);
    for (int i = 1; i < pl.size() - 1; i++) pl.get(i).getParentNode().removeChild(pl.get(i));
    double tongTH = 0, tongHD = 0;
    int stt = 0;
    for (DongHangBan d : ds) {
      Element tr = (Element) mauRow.cloneNode(true);
      var cs = kids(tr, "tc");
      double ttTH = d.getSoLuong() * d.getDonGiaTH(), ttHD = d.getSoLuong() * d.getDonGia();
      tongTH += ttTH;
      tongHD += ttHD;
      boolean coLoai = d.getLoaiHang() != null && !d.getLoaiHang().isBlank();
      List<String> moTa = new ArrayList<>();
      if (coLoai && d.getTenHang() != null && !d.getTenHang().isBlank()) moTa.add(d.getTenHang());
      if (d.getGhiChu() != null && !d.getGhiChu().isBlank()) for (String l : d.getGhiChu().split("\\R")) moTa.add(l);
      setLines(cs.get(0), List.of(String.valueOf(++stt)));
      setLines(cs.get(1), List.of(coLoai ? d.getLoaiHang() : d.getTenHang()));
      setLines(cs.get(2), moTa);
      setLines(cs.get(3), List.of(""));
      setLines(cs.get(4), List.of(String.format("%02d", Math.round(d.getSoLuong()))));
      setLines(cs.get(5), List.of(Money.money(d.getDonGiaTH())));
      setLines(cs.get(6), List.of(Money.money(d.getDonGia())));
      setLines(cs.get(7), List.of(Money.money(ttTH)));
      setLines(cs.get(8), List.of(Money.money(ttHD)));
      tong.getParentNode().insertBefore(tr, tong);
    }
    var ct = kids(tong, "tc");
    setText(kids(ct.get(2), "p").get(0), Money.money(tongTH));
    setText(kids(ct.get(3), "p").get(0), Money.money(tongHD));
  }
}
