package vn.oxymecie.appoxy.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

class ExcelTemplateTest {
  private static XSSFWorkbook doc(byte[] b) throws IOException {
    return new XSSFWorkbook(new ByteArrayInputStream(b));
  }

  private static List<List<Object>> bang() {
    List<List<Object>> d = new ArrayList<>();
    d.add(Arrays.asList("Số HĐ", "Khách hàng", "Ngày ký", "Giá trị", "Đã thu (%)", "Tỷ lệ", "Ghi chú"));
    d.add(Arrays.asList("HDB-01", "Công ty Điện lực Việt Nam — “Đặc biệt” & <ký tự>", "26/08/2026", 1234567, 45.5, "45,5%", "=1+1"));
    d.add(Arrays.asList("HDB-02", null, "—", 2.5, 100, "—", ""));
    d.add(Arrays.asList("HDB-03", "Dòng 1\nDòng 2", "01/01/2026", 10, 0, "0%", "x"));
    return d;
  }

  @Test
  void kieuDinhDangDungYeuCau() throws IOException {
    try (XSSFWorkbook wb = doc(ExcelTemplate.ghi(List.of(new ExcelTemplate.Bang("Hợp đồng", bang()))))) {
      XSSFSheet sh = wb.getSheetAt(0);
      assertEquals("Hợp đồng", sh.getSheetName());
      // Header: đậm, giữa, viền, tự xuống dòng.
      var h = sh.getRow(0).getCell(1);
      assertTrue(h.getCellStyle().getFont().getBold());
      assertEquals(HorizontalAlignment.CENTER, h.getCellStyle().getAlignment());
      assertEquals(BorderStyle.THIN, h.getCellStyle().getBorderLeft());
      assertTrue(h.getCellStyle().getWrapText());
      // Ngày thật, số thật, tỷ lệ thật; tiếng Việt + ký tự đặc biệt giữ nguyên.
      assertEquals(CellType.NUMERIC, sh.getRow(1).getCell(2).getCellType());
      assertEquals("dd/mm/yyyy", sh.getRow(1).getCell(2).getCellStyle().getDataFormatString());
      assertEquals(1234567, sh.getRow(1).getCell(3).getNumericCellValue());
      assertEquals(HorizontalAlignment.RIGHT, sh.getRow(1).getCell(3).getCellStyle().getAlignment());
      assertEquals(0.455, sh.getRow(1).getCell(5).getNumericCellValue(), 1e-9);
      assertEquals("0.0%", sh.getRow(1).getCell(5).getCellStyle().getDataFormatString());
      assertEquals("Công ty Điện lực Việt Nam — “Đặc biệt” & <ký tự>", sh.getRow(1).getCell(1).getStringCellValue());
      assertEquals("Dòng 1\nDòng 2", sh.getRow(3).getCell(1).getStringCellValue());
      // Công thức chỉ là chữ, không bị tính.
      assertEquals(CellType.STRING, sh.getRow(1).getCell(6).getCellType());
      assertEquals("=1+1", sh.getRow(1).getCell(6).getStringCellValue());
      // null / giữ chỗ: ô vẫn có viền; "—" giữ nguyên, căn theo cột.
      assertEquals(BorderStyle.THIN, sh.getRow(2).getCell(1).getCellStyle().getBorderTop());
      assertEquals("—", sh.getRow(2).getCell(2).getStringCellValue());
      assertEquals(HorizontalAlignment.CENTER, sh.getRow(2).getCell(2).getCellStyle().getAlignment());
      // Cột số có số lẻ → mọi số cột đó dùng #,##0.00; cột "%" dùng 1 số lẻ.
      assertEquals("#,##0.00", sh.getRow(1).getCell(3).getCellStyle().getDataFormatString());
      assertEquals("#,##0.0", sh.getRow(1).getCell(4).getCellStyle().getDataFormatString());
      // Auto filter + freeze + độ rộng có chặn.
      assertNotNull(sh.getCTWorksheet().getAutoFilter());
      assertEquals(1, sh.getPaneInformation().getHorizontalSplitPosition());
      for (int c = 0; c < 7; c++) {
        int w = sh.getColumnWidth(c) / 256;
        assertTrue(w >= 8 && w <= 50, "cột " + c + " rộng " + w);
      }
      // Dòng dữ liệu xen kẽ màu: dòng 1 và dòng 2 khác kiểu ô.
      assertTrue(!sh.getRow(1).getCell(0).getCellStyle().equals(sh.getRow(2).getCell(0).getCellStyle()));
    }
  }

  @Test
  void khongCoDuLieuChiCoTieuDe() throws IOException {
    var d = new ArrayList<List<Object>>();
    d.add(Arrays.asList("A", "B"));
    try (XSSFWorkbook wb = doc(ExcelTemplate.ghi(List.of(new ExcelTemplate.Bang("Trống", d))))) {
      assertEquals(1, wb.getSheetAt(0).getPhysicalNumberOfRows());
    }
    try (XSSFWorkbook wb = doc(ExcelTemplate.ghi(List.of(new ExcelTemplate.Bang("Rỗng hẳn", List.of()))))) {
      assertEquals(0, wb.getSheetAt(0).getPhysicalNumberOfRows());
    }
  }

  @Test
  void duLieuLonKhongTaoQuaNhieuKieuO() throws IOException {
    var d = new ArrayList<List<Object>>();
    d.add(Arrays.asList("Mã", "Ngày", "Tiền", "SL"));
    for (int i = 0; i < 60_000; i++) d.add(Arrays.asList("M" + i, "01/01/2026", i * 1000.5, i));
    try (XSSFWorkbook wb = doc(ExcelTemplate.ghi(List.of(new ExcelTemplate.Bang("Lớn", d))))) {
      assertEquals(60_001, wb.getSheetAt(0).getPhysicalNumberOfRows());
      assertTrue(wb.getNumCellStyles() < 40, "số kiểu ô: " + wb.getNumCellStyles());
    }
  }

  @Test
  void tenSheetHopLeVaKhongTrung() {
    var da = new HashSet<String>();
    assertEquals("A-B", ExcelTemplate.tenSheet("A/B", 0, da));
    String t2 = ExcelTemplate.tenSheet("a-b", 1, da);
    assertTrue(!t2.equalsIgnoreCase("A-B") && t2.length() <= 31);
    assertEquals(31, ExcelTemplate.tenSheet("x".repeat(40), 2, da).length());
  }

  @Test
  void mauNhapLieuGiuNguyenChuNgayVaPhanTram() throws IOException {
    var d = new ArrayList<List<Object>>();
    d.add(Arrays.asList("Cột", "Cách điền"));
    d.add(Arrays.asList("26/08/2026", "10%"));
    try (XSSFWorkbook wb = doc(ExcelTemplate.ghi(List.of(new ExcelTemplate.Bang("Mẫu", d, List.of(16.0, 90.0), true, false))))) {
      assertEquals("26/08/2026", wb.getSheetAt(0).getRow(1).getCell(0).getStringCellValue());
      assertEquals(90, wb.getSheetAt(0).getColumnWidth(1) / 256);
    }
  }

  @Test
  void quaNhieuDongBiTuChoi() {
    var d = new ArrayList<List<Object>>(Collections.nCopies(ExcelTemplate.MAX_DONG + 1, List.<Object>of("x")));
    assertThrows(ApiException.class, () -> ExcelTemplate.ghi(List.of(new ExcelTemplate.Bang("x", d))));
  }

  /** Sinh tệp thật để mở bằng Excel kiểm tra bằng mắt: -Dxlsx.out=<đường dẫn>. */
  @Test
  void xuatTepMau() throws IOException {
    String out = System.getProperty("xlsx.out");
    if (out == null) return;
    Files.write(Path.of(out), ExcelTemplate.ghi(List.of(new ExcelTemplate.Bang("Hợp đồng bán", bang()))));
  }
}
