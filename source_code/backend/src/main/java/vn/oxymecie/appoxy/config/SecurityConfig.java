package vn.oxymecie.appoxy.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import vn.oxymecie.appoxy.security.AuthService;
import vn.oxymecie.appoxy.security.TokenAuthFilter;

/**
 * Bảo mật: API không trạng thái (Bearer token), không CSRF (không dùng cookie), CORS theo cấu hình.
 * Phân quyền chi tiết theo nhóm × mã chức năng kiểm trong tầng nghiệp vụ (Ctx.require), không chỉ ở giao diện.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(10);
  }

  @Bean
  SecurityFilterChain api(HttpSecurity http, AuthService auth, ObjectMapper om,
      @Value("${app.security.swagger-public:true}") boolean swaggerPublic) throws Exception {
    http.csrf(c -> c.disable())
        .cors(c -> {})
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .httpBasic(b -> b.disable())
        .formLogin(f -> f.disable())
        .logout(l -> l.disable())
        .headers(h -> h.frameOptions(f -> f.deny()))
        .addFilterBefore(new TokenAuthFilter(auth), UsernamePasswordAuthenticationFilter.class)
        .exceptionHandling(e -> e
            .authenticationEntryPoint((req, res, ex) -> loi(om, res, 401, "UNAUTHORIZED", "Phiên đăng nhập đã hết hạn — vui lòng đăng nhập lại", req.getRequestURI()))
            .accessDeniedHandler((req, res, ex) -> loi(om, res, 403, "MUST_CHANGE_PASSWORD", "Cần đổi mật khẩu trước khi tiếp tục", req.getRequestURI())))
        .authorizeHttpRequests(a -> {
          a.requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll();
          a.requestMatchers("/actuator/health", "/actuator/health/**", "/error").permitAll();
          if (swaggerPublic) a.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll();
          // Đang bị bắt đổi mật khẩu: chỉ đọc + đổi mật khẩu / đăng xuất.
          a.requestMatchers("/api/auth/**").authenticated();
          a.requestMatchers(HttpMethod.GET, "/api/**").authenticated();
          a.requestMatchers("/api/**").hasRole("USER");
          a.anyRequest().denyAll();
        });
    return http.build();
  }

  private static void loi(ObjectMapper om, HttpServletResponse res, int status, String code, String msg, String path) throws java.io.IOException {
    res.setStatus(status);
    res.setContentType(MediaType.APPLICATION_JSON_VALUE);
    res.setCharacterEncoding("UTF-8");
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("status", status);
    body.put("code", code);
    body.put("message", msg);
    body.put("path", path);
    body.put("timestamp", Instant.now().toString());
    om.writeValue(res.getOutputStream(), body);
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") List<String> origins) {
    CorsConfiguration c = new CorsConfiguration();
    c.setAllowedOrigins(origins);
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    c.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
    c.setExposedHeaders(List.of("Content-Disposition", "X-Tep-Count"));
    c.setMaxAge(3600L);
    UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
    src.registerCorsConfiguration("/api/**", c);
    return src;
  }
}
