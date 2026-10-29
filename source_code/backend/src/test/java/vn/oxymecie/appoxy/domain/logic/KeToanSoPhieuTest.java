package vn.oxymecie.appoxy.domain.logic;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class KeToanSoPhieuTest {
  @Test
  void tienToTheoLoaiPhieu() {
    assertEquals("PT", KeToanService.tienToPhieu("Thu", "TC"));
    assertEquals("PC", KeToanService.tienToPhieu("Chi", "TC"));
    assertEquals("PC", KeToanService.tienToPhieu("Tạm ứng", "TC"));
    assertEquals("PL", KeToanService.tienToPhieu("Luân chuyển", "TC"));
    assertEquals("PQ", KeToanService.tienToPhieu("Quyết toán tạm ứng", "TC"));
    assertEquals("TC", KeToanService.tienToPhieu("Loại lạ", "TC")); // loại ngoài danh sách: tiền tố cấu hình
  }
}
