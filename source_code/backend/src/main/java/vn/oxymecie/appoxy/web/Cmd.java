package vn.oxymecie.appoxy.web;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.security.AppUser;
import vn.oxymecie.appoxy.state.DataStore;
import vn.oxymecie.appoxy.state.Visibility;

/** Chạy lệnh ghi cho người dùng hiện tại và đóng gói phản hồi (ChangeSet đã lọc theo quyền). */
@Component
public class Cmd {
  private final DataStore store;
  private final Clock clock;
  private final HttpServletRequest req;

  public Cmd(DataStore store, Clock clock, HttpServletRequest req) {
    this.store = store;
    this.clock = clock;
    this.req = req;
  }

  public static AppUser user() {
    Authentication a = SecurityContextHolder.getContext().getAuthentication();
    if (a == null || !(a.getPrincipal() instanceof AppUser u)) throw ApiException.unauthorized("Chưa đăng nhập");
    return u;
  }

  public String ip() {
    String f = req.getHeader("X-Forwarded-For");
    String ip = f != null && !f.isBlank() ? f.split(",")[0].trim() : req.getRemoteAddr();
    return ip == null ? null : ip.substring(0, Math.min(45, ip.length()));
  }

  public <R> CommandResponse<R> run(String hanhDong, DataStore.Command<R> cmd) {
    AppUser u = user();
    DataStore.Result<R> r = store.execute(hanhDong, u.id(), ip(), cmd);
    return wrap(u, r);
  }

  @SuppressWarnings("unchecked")
  public <R> CommandResponse<R> wrap(AppUser u, DataStore.Result<R> r) {
    Db after = r.after() != null ? r.after() : store.current();
    Visibility v = new Visibility(after, u.id(), clock);
    R data = r.value() instanceof String ? null : r.value();
    if (data != null) data = (R) visible(v, data);
    return new CommandResponse<>(r.message(), data, v.filter(r.changes()));
  }

  /** Dữ liệu trả kèm (VD bản ghi vừa tạo) cũng phải qua bộ lọc quyền. */
  private static Object visible(Visibility v, Object data) {
    String key = switch (data.getClass().getSimpleName()) {
      case "HopDongBan" -> "hopDongBan";
      case "HopDongMua" -> "hopDongMua";
      case "HopDongPhuTai" -> "hopDongPhuTai";
      case "PhieuThuChi" -> "phieuThuChi";
      case "ChiPhiHD" -> "chiPhiHD";
      case "PhieuKho" -> "phieuKho";
      case "TaiKhoan" -> "taiKhoan";
      default -> null;
    };
    return key == null ? data : v.view(key, data);
  }

  /** Db đã lọc theo quyền người đang đăng nhập. */
  public Db snapshot() {
    AppUser u = user();
    Db d = store.current();
    return new Visibility(d, u.id(), clock).filter(d);
  }

  public Visibility visibility() {
    return new Visibility(store.current(), user().id(), clock);
  }

  public Db raw() {
    return store.current();
  }
}
