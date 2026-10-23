package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.logic.Ctx;
import vn.oxymecie.appoxy.domain.logic.TemBinhKhiPdf;
import vn.oxymecie.appoxy.domain.perm.Perm;
import vn.oxymecie.appoxy.web.dto.TemBinhKhiReq;

/** In tem dán bình khí: nhập thông tin → PDF. Không lưu gì vào dữ liệu; cần quyền xem tồn kho (KHO-09). */
@Tag(name = "Tem bình khí", description = "Tạo PDF tem dán bình khí từ thông tin nhập")
@RestController
@RequestMapping("/api/xuat")
public class TemBinhKhiController {
  private final Cmd cmd;
  private final TemBinhKhiPdf pdf;

  public TemBinhKhiController(Cmd cmd, TemBinhKhiPdf pdf) {
    this.cmd = cmd;
    this.pdf = pdf;
  }

  @Operation(summary = "Tạo PDF tem dán bình khí", description = "Mỗi tem 1 trang; soLuong = số bản in (1–100).")
  @PostMapping("/tem-binh-khi")
  public ResponseEntity<byte[]> tem(@RequestBody TemBinhKhiReq r) {
    Ctx c = new Ctx(cmd.raw(), Cmd.user().id(), Clock.systemUTC(), null, null);
    if (!c.canView(Perm.khoTon)) throw ApiException.forbidden("Cần quyền xem tồn kho (KHO-09) để in tem");
    byte[] b = pdf.render(r);
    String ten = "tem-" + java.util.Objects.toString(r.soSeri(), "").trim().replaceAll("[\\\\/:*?\"<>|\\s]+", "-") + ".pdf";
    return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
        .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(ten, StandardCharsets.UTF_8).build().toString())
        .header("X-Content-Type-Options", "nosniff").body(b);
  }
}
