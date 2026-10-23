package vn.oxymecie.appoxy.config;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import java.time.Clock;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Cấu hình chung: đồng hồ, JSON, OpenAPI. */
@Configuration
@EnableScheduling
public class AppConfig {

  @Bean
  Clock clock() {
    return Clock.systemUTC();
  }

  /** Bỏ trường null khỏi JSON — frontend phân biệt "không có" (undefined) với giá trị. */
  @Bean
  Jackson2ObjectMapperBuilderCustomizer jsonKhongNull() {
    return b -> b.serializationInclusion(JsonInclude.Include.NON_NULL);
  }

  @Bean
  OpenAPI openApi() {
    return new OpenAPI()
        .info(new Info().title("App Oxy API").version("0.1.0")
            .description("API quản lý nội bộ Oxy Mecie — hợp đồng bán / mua, kho, kế toán, Phú Tài. "
                + "Đăng nhập POST /api/auth/login lấy token, bấm Authorize và dán token."))
        .components(new Components().addSecuritySchemes("bearer",
            new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").description("Token phiên từ /api/auth/login")))
        .addSecurityItem(new SecurityRequirement().addList("bearer"));
  }
}
