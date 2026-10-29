package vn.oxymecie.appoxy.domain.logic;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.web.dto.TemBinhKhiReq;
import vn.oxymecie.appoxy.web.dto.TemBinhKhiReq.ThanhPhan;

class TemBinhKhiPdfTest {
  private static final List<String> BIEN_PHAP = List.of("Nếu nuốt phải: yêu cầu hồ trợ y tế nếu thấy khó chịu",
      "Nếu hít phải: di chuyển nạn nhân tới chỗ thoáng khí", "Nếu dính vào da: rửa sạch với nhiều nước",
      "Nếu dính vào mắt: rửa liên tục bằng nước, y/c hỗ trợ y tế");
  private static final List<String> HUONG_DAN = List.of("Đảm bảo môi trường thông thoáng tại nơi làm việc",
      "Mặc quần áo, thiết bị bảo hộ khi làm việc", "Không ăn, uống và hút thuốc tại khu vực làm việc. Rửa tay sau khi sử dụng");

  private static TemBinhKhiReq mau(String seri, String khi, List<ThanhPhan> tp, int soLuong) {
    return new TemBinhKhiReq("10L", "QF-2", "Thép", "15 MPa", seri, "UN 1066", "1.5 m3", "Việt Nam", BIEN_PHAP, HUONG_DAN,
        "23/10/2026", "23/10/2027", khi, tp, soLuong, false, null);
  }

  @Test
  void dungPdfTheoSoLuongTem() throws Exception {
    var pdf = new TemBinhKhiPdf();
    byte[] b = pdf.render(mau("25T 057132", "N2", List.of(new ThanhPhan("Nitơ", "N2", "99.99 %")), 3));
    assertEquals("%PDF", new String(b, 0, 4, StandardCharsets.US_ASCII));
    assertEquals(3, new com.lowagie.text.pdf.PdfReader(b).getNumberOfPages());
    String out = System.getProperty("tem.out");
    if (out != null) {
      Files.write(Path.of(out, "tem-1.pdf"), b);
      Files.write(Path.of(out, "tem-2.pdf"), pdf.render(mau("200253906194", "O2", List.of(new ThanhPhan("Oxygen", "O2", "15.01 %"), new ThanhPhan("Nitrogen", "N2", "Cân bằng")), 1)));
      Files.write(Path.of(out, "tem-3.pdf"), pdf.render(mau("93201086", "NO", List.of(new ThanhPhan("Nitro oxide", "NO", "457ppm"), new ThanhPhan("Nitrogen", "N2", "Cân bằng")), 1)));
    }
  }

  @Test
  void tuChoiDuLieuSai() throws Exception {
    var pdf = new TemBinhKhiPdf();
    assertThrows(ApiException.class, () -> pdf.render(mau(" ", "N2", List.of(new ThanhPhan("a", "b", "c")), 1)));
    assertThrows(ApiException.class, () -> pdf.render(mau("A1", "", List.of(new ThanhPhan("a", "b", "c")), 1)), "thiếu khí chuẩn");
    assertThrows(ApiException.class, () -> pdf.render(mau("A1", "N2", List.of(new ThanhPhan("a", "", "c")), 1)), "dòng thành phần thiếu ô");
    assertThrows(ApiException.class, () -> pdf.render(mau("A1", "N2", List.of(), 1)), "chưa có thành phần khí");
    assertThrows(ApiException.class, () -> pdf.render(mau("A1", "N2", List.of(new ThanhPhan("a", "b", "c")), 0)));
    var nam = new ThanhPhan("a", "b", "c");
    assertThrows(ApiException.class, () -> pdf.render(mau("A1", "N2", List.of(nam, nam, nam, nam, nam), 1)));
  }

  @Test
  void xemTruocChoPhepNhapDo() throws Exception {
    var r = new TemBinhKhiReq("", "", "", "", "", "", "", "", List.of(), List.of(), "", "", "", List.of(), 1, true, null);
    assertEquals("%PDF", new String(new TemBinhKhiPdf().render(r), 0, 4, StandardCharsets.US_ASCII));
  }
}
