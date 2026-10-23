package vn.oxymecie.appoxy.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import vn.oxymecie.appoxy.common.ApiException;

/** Xử lý lỗi tập trung — mọi lỗi trả JSON ApiError, không lộ stack trace / chi tiết DB. */
@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  private static ResponseEntity<ApiError> body(HttpStatus s, String code, String msg, HttpServletRequest req, List<ApiError.FieldErr> errs) {
    return ResponseEntity.status(s).body(new ApiError(s.value(), code, msg, req.getRequestURI(), Instant.now().toString(), errs));
  }

  @ExceptionHandler(ApiException.class)
  ResponseEntity<ApiError> api(ApiException e, HttpServletRequest req) {
    return body(e.getStatus(), e.getCode(), e.getMessage(), req, null);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> valid(MethodArgumentNotValidException e, HttpServletRequest req) {
    List<ApiError.FieldErr> errs = e.getBindingResult().getFieldErrors().stream()
        .map(f -> new ApiError.FieldErr(f.getField(), f.getDefaultMessage())).toList();
    String msg = errs.isEmpty() ? "Dữ liệu không hợp lệ" : errs.get(0).message();
    return body(HttpStatus.BAD_REQUEST, "VALIDATION", msg, req, errs);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  ResponseEntity<ApiError> constraint(ConstraintViolationException e, HttpServletRequest req) {
    List<ApiError.FieldErr> errs = e.getConstraintViolations().stream()
        .map(v -> new ApiError.FieldErr(v.getPropertyPath().toString(), v.getMessage())).toList();
    return body(HttpStatus.BAD_REQUEST, "VALIDATION", errs.isEmpty() ? "Dữ liệu không hợp lệ" : errs.get(0).message(), req, errs);
  }

  @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
  ResponseEntity<ApiError> unreadable(Exception e, HttpServletRequest req) {
    return body(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Dữ liệu gửi lên không đúng định dạng", req, null);
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ApiError> integrity(DataIntegrityViolationException e, HttpServletRequest req) {
    log.warn("Vi phạm ràng buộc dữ liệu tại {}: {}", req.getRequestURI(), e.getMostSpecificCause().getMessage());
    return body(HttpStatus.CONFLICT, "DATA_INTEGRITY",
        "Dữ liệu trùng, quá dài hoặc đang được bản ghi khác tham chiếu — kiểm tra lại rồi thử lại", req, null);
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  ResponseEntity<ApiError> tooLarge(MaxUploadSizeExceededException e, HttpServletRequest req) {
    return body(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "Tệp lớn hơn 20MB", req, null);
  }

  @ExceptionHandler(NoResourceFoundException.class)
  ResponseEntity<ApiError> notFound(NoResourceFoundException e, HttpServletRequest req) {
    return body(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy đường dẫn", req, null);
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  ResponseEntity<ApiError> method(HttpRequestMethodNotSupportedException e, HttpServletRequest req) {
    return body(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ", req, null);
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> other(Exception e, HttpServletRequest req) {
    log.error("Lỗi không lường trước tại {} {}", req.getMethod(), req.getRequestURI(), e);
    return body(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL", "Lỗi máy chủ — thử lại sau hoặc báo quản trị", req, null);
  }
}
