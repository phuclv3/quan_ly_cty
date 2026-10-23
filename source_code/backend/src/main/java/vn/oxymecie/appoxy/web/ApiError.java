package vn.oxymecie.appoxy.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** Thân lỗi trả về client — message là câu tiếng Việt hiển thị được ngay; không có stack trace. */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiError(int status, String code, String message, String path, String timestamp, List<FieldErr> errors) {
  public record FieldErr(String field, String message) {}
}
