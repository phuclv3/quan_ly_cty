package vn.oxymecie.appoxy.config;

import vn.oxymecie.appoxy.domain.model.TrangThai;
import java.time.Clock;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.oxymecie.appoxy.common.Ids;
import vn.oxymecie.appoxy.domain.model.TaiKhoan;
import vn.oxymecie.appoxy.persistence.Repos;
import vn.oxymecie.appoxy.security.MatKhau;
import vn.oxymecie.appoxy.state.DataStore;

/**
 * Tác vụ khởi động / định kỳ:
 * <ul>
 *   <li>Chưa có tài khoản nào và có APP_BOOTSTRAP_ADMIN_EMAIL + APP_BOOTSTRAP_ADMIN_PASSWORD → tạo tài khoản nhóm Giám đốc
 *       (bắt đổi mật khẩu lần đầu). Không bao giờ ghi mật khẩu vào log.</li>
 *   <li>Dọn phiên đăng nhập hết hạn mỗi giờ.</li>
 * </ul>
 */
@Component
public class KhoiTao {
  private static final Logger log = LoggerFactory.getLogger(KhoiTao.class);

  private final DataStore store;
  private final Repos repos;
  private final MatKhau matKhau;
  private final Clock clock;
  private final TransactionTemplate tx;
  private final String adminEmail;
  private final String adminPassword;

  public KhoiTao(DataStore store, Repos repos, MatKhau matKhau, Clock clock, PlatformTransactionManager txm,
      @Value("${app.bootstrap.admin-email:}") String adminEmail, @Value("${app.bootstrap.admin-password:}") String adminPassword) {
    this.store = store;
    this.repos = repos;
    this.matKhau = matKhau;
    this.clock = clock;
    this.tx = new TransactionTemplate(txm);
    this.adminEmail = adminEmail;
    this.adminPassword = adminPassword;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void khoiDong() {
    if (repos.taiKhoan().countByIdNot(TaiKhoan.QUAN_TRI_AN) > 0) return;
    if (adminEmail.isBlank() || adminPassword.isBlank()) {
      log.warn("Chưa có tài khoản nào — đặt APP_BOOTSTRAP_ADMIN_EMAIL / APP_BOOTSTRAP_ADMIN_PASSWORD để tạo tài khoản quản trị đầu tiên");
      return;
    }
    String loi = MatKhau.loiMatKhauMoi(adminPassword, null);
    if (loi != null) {
      log.error("APP_BOOTSTRAP_ADMIN_PASSWORD không đạt chính sách: {}", loi);
      return;
    }
    String bam = matKhau.bam(adminPassword);
    store.execute("HE_THONG.taoQuanTri", null, null, c -> {
      String id = Ids.uid("TK");
      c.db().getTaiKhoan().add(new TaiKhoan(id, adminEmail.trim().toLowerCase(), "Quản trị", new java.util.ArrayList<>(java.util.List.of("NQ-GD")),
          TrangThai.HOAT_DONG, true, 0, null, null));
      c.datMatKhau(id, bam);
      c.nhatKy("TaiKhoan", id, "Tạo tài khoản quản trị đầu tiên");
      return null;
    });
    log.info("Đã tạo tài khoản quản trị đầu tiên {}", adminEmail);
  }

  @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT5M")
  public void donPhien() {
    Integer n = tx.execute(s -> repos.phien().xoaHetHan(Instant.now(clock)));
    if (n != null && n > 0) log.info("Đã dọn {} phiên đăng nhập hết hạn", n);
  }
}
