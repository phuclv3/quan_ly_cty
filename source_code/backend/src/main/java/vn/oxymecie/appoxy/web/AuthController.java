package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.model.TaiKhoan;
import vn.oxymecie.appoxy.security.AppUser;
import vn.oxymecie.appoxy.security.AuthService;
import vn.oxymecie.appoxy.web.dto.Req;

@Tag(name = "Xác thực", description = "Đăng nhập, đăng xuất, đổi mật khẩu (NT-01, NT-02)")
@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService auth;
  private final Cmd cmd;

  public AuthController(AuthService auth, Cmd cmd) {
    this.auth = auth;
    this.cmd = cmd;
  }

  @Operation(summary = "Đăng nhập email + mật khẩu", description = "Sai 5 lần liên tiếp → khoá đăng nhập 15 phút. Trả token phiên (hết hạn trượt 12 giờ).")
  @PostMapping("/login")
  public AuthService.DangNhap login(@Valid @RequestBody Req.DangNhap r, HttpServletRequest req) {
    return auth.login(r.email(), r.matKhau(), cmd.ip(), req.getHeader("User-Agent"));
  }

  @Operation(summary = "Đăng xuất — huỷ phiên hiện tại")
  @PostMapping("/logout")
  public ResponseEntity<Void> logout() {
    auth.logout(Cmd.user());
    return ResponseEntity.noContent().build();
  }

  @Operation(summary = "Tài khoản đang đăng nhập")
  @GetMapping("/me")
  public TaiKhoan me() {
    AppUser u = Cmd.user();
    return cmd.raw().getTaiKhoan().stream().filter(t -> t.getId().equals(u.id())).findFirst()
        .orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập"));
  }

  @Operation(summary = "Đổi mật khẩu của chính mình", description = "≥ 8 ký tự, không dấu cách, khác mật khẩu cũ.")
  @PostMapping("/doi-mat-khau")
  public ResponseEntity<Void> doiMatKhau(@Valid @RequestBody Req.DoiMatKhau r) {
    auth.doiMatKhau(Cmd.user(), r.cu(), r.moi(), r.nhapLai(), cmd.ip());
    return ResponseEntity.noContent().build();
  }
}
