package vn.oxymecie.appoxy.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Đọc "Authorization: Bearer &lt;token&gt;", kiểm phiên ở DB và gắn người dùng vào SecurityContext.
 * Token sai / hết hạn → để trống (endpoint cần đăng nhập sẽ trả 401). Không ghi token vào log.
 * Tài khoản đang bị bắt đổi mật khẩu chỉ có quyền MUST_CHANGE_PASSWORD (xem SecurityConfig).
 */
public class TokenAuthFilter extends OncePerRequestFilter {
  private final AuthService auth;

  public TokenAuthFilter(AuthService auth) {
    this.auth = auth;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
    String h = req.getHeader("Authorization");
    if (h != null && h.startsWith("Bearer ")) {
      auth.xacThuc(h.substring(7).trim()).ifPresent(u -> {
        String role = u.batDoiMK() ? "ROLE_MUST_CHANGE_PASSWORD" : "ROLE_USER";
        var a = new UsernamePasswordAuthenticationToken(u, null, List.of(new SimpleGrantedAuthority(role)));
        SecurityContextHolder.getContext().setAuthentication(a);
      });
    }
    chain.doFilter(req, res);
  }
}
