package vn.oxymecie.appoxy.common;

import org.springframework.http.HttpStatus;

/**
 * Lỗi nghiệp vụ trả về client với câu tiếng Việt (frontend hiện nguyên văn ở toast).
 * Không bao giờ chứa stack trace / chi tiết hạ tầng.
 */
public class ApiException extends RuntimeException {
  private final HttpStatus status;
  private final String code;

  public ApiException(HttpStatus status, String code, String message) {
    super(message);
    this.status = status;
    this.code = code;
  }

  public HttpStatus getStatus() {
    return status;
  }

  public String getCode() {
    return code;
  }

  /** 422 — vi phạm quy tắc nghiệp vụ / dữ liệu không hợp lệ. */
  public static ApiException invalid(String msg) {
    return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "BUSINESS_RULE", msg);
  }

  /** 403 — không đủ quyền. */
  public static ApiException forbidden(String msg) {
    return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", msg);
  }

  /** 404 — không tìm thấy bản ghi. */
  public static ApiException notFound(String msg) {
    return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", msg);
  }

  /** 409 — trùng dữ liệu / xung đột trạng thái. */
  public static ApiException conflict(String msg) {
    return new ApiException(HttpStatus.CONFLICT, "CONFLICT", msg);
  }

  /** 401 — chưa đăng nhập / phiên hết hạn / sai thông tin đăng nhập. */
  public static ApiException unauthorized(String msg) {
    return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", msg);
  }
}
