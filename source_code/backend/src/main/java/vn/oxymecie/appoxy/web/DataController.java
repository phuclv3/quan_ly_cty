package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.state.DataStore;

@Tag(name = "Dữ liệu", description = "Ảnh chụp dữ liệu cho frontend (đã lọc theo quyền) và phiên bản dữ liệu")
@RestController
@RequestMapping("/api/db")
public class DataController {
  private final Cmd cmd;
  private final DataStore store;

  public DataController(Cmd cmd, DataStore store) {
    this.cmd = cmd;
    this.store = store;
  }

  @Operation(summary = "Toàn bộ dữ liệu người dùng được thấy",
      description = "Cùng hình dạng interface Db của frontend (models.ts). Không bao giờ chứa mật khẩu / phiên đăng nhập.")
  @GetMapping
  public Db snapshot() {
    return cmd.snapshot();
  }

  @Operation(summary = "Phiên bản dữ liệu hiện tại", description = "Client so với bản đang giữ để biết có cần nạp lại.")
  @GetMapping("/version")
  public Map<String, Long> version() {
    Cmd.user();
    return Map.of("version", store.version());
  }
}
