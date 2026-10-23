package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Clock;
import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.logic.Ctx;
import vn.oxymecie.appoxy.state.DataStore;

@Tag(name = "Quản trị (dev)", description = "Chỉ dùng ở môi trường phát triển")
@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private static final Logger log = LoggerFactory.getLogger(AdminController.class);

  private final Flyway flyway;
  private final DataStore store;
  private final Cmd cmd;
  private final Clock clock;
  private final boolean resetEnabled;
  private final org.springframework.context.ConfigurableApplicationContext ctx;

  public AdminController(Flyway flyway, DataStore store, Cmd cmd, Clock clock, @Value("${app.dev.reset-enabled:false}") boolean resetEnabled,
      org.springframework.context.ConfigurableApplicationContext ctx) {
    this.ctx = ctx;
    this.flyway = flyway;
    this.store = store;
    this.cmd = cmd;
    this.clock = clock;
    this.resetEnabled = resetEnabled;
  }

  @Operation(summary = "Tắt hệ thống (dừng backend, thoát tiến trình) — nhóm toàn quyền",
      description = "Trả 202 rồi dừng sau ~1 giây. Muốn chạy lại phải khởi động backend thủ công / bằng dịch vụ hệ điều hành.")
  @PostMapping("/tat-he-thong")
  public ResponseEntity<Void> tatHeThong() {
    var u = Cmd.user();
    if (!new Ctx(cmd.raw(), u.id(), clock, null, null).isGD()) throw ApiException.forbidden("Chỉ nhóm toàn quyền được tắt hệ thống");
    log.warn("Tài khoản {} yêu cầu tắt hệ thống", u.id());
    Thread t = new Thread(() -> {
      try {
        Thread.sleep(1000);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
      }
      int code = org.springframework.boot.SpringApplication.exit(ctx, () -> 0);
      System.exit(code);
    }, "tat-he-thong");
    t.setDaemon(false);
    t.start();
    return ResponseEntity.accepted().build();
  }

  @Operation(summary = "Xoá toàn bộ dữ liệu và nạp lại dữ liệu mẫu (chỉ hồ sơ dev, nhóm toàn quyền)",
      description = "Tắt mặc định (app.dev.reset-enabled=false). Mọi phiên đăng nhập bị huỷ.")
  @PostMapping("/nap-lai-du-lieu-mau")
  public ResponseEntity<Void> napLai() {
    if (!resetEnabled) throw ApiException.notFound("Không tìm thấy đường dẫn");
    var u = Cmd.user();
    if (!new Ctx(cmd.raw(), u.id(), clock, null, null).isGD()) throw ApiException.forbidden("Chỉ nhóm toàn quyền được nạp lại dữ liệu mẫu");
    log.warn("Tài khoản {} nạp lại dữ liệu mẫu (flyway clean + migrate)", u.id());
    synchronized (this) {
      flyway.clean();
      flyway.migrate();
      store.invalidate();
    }
    return ResponseEntity.noContent().build();
  }
}
