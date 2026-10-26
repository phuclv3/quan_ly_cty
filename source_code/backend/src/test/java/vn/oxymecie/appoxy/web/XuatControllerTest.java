package vn.oxymecie.appoxy.web;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class XuatControllerTest {
  @Test
  void duongDanZipKhongThoatKhoiGoc() {
    assertEquals("..." + "./x", XuatController.chuanHoaDuongDan("....//x")); // "...." chỉ là tên thư mục thường, không phải ".."
    assertEquals("x", XuatController.chuanHoaDuongDan("../../x"));
    assertEquals("a/b.pdf", XuatController.chuanHoaDuongDan("/a\\.\\b.pdf"));
    assertEquals("HDB-01/Hợp đồng/a..b.pdf", XuatController.chuanHoaDuongDan("HDB-01/Hợp đồng/a..b.pdf"));
  }
}
