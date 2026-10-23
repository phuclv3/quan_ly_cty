package vn.oxymecie.appoxy.state;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.oxymecie.appoxy.common.ApiException;

/**
 * Kho nội dung tệp trên đĩa (app.storage.dir). Siêu dữ liệu nằm ở bảng tep_tin.
 * Khoá lưu = "yyyy/MM/<id>" — không lấy từ tên tệp người dùng để tránh path traversal.
 */
@Component
public class FileStorage {
  private final Path root;

  public FileStorage(@Value("${app.storage.dir}") String dir) {
    this.root = Path.of(dir).toAbsolutePath().normalize();
  }

  public String save(String id, InputStream in) {
    LocalDate d = LocalDate.now();
    String key = String.format("%d/%02d/%s", d.getYear(), d.getMonthValue(), id);
    Path p = resolve(key);
    try {
      Files.createDirectories(p.getParent());
      Files.copy(in, p, StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException e) {
      throw new UncheckedIOException("Không ghi được tệp vào kho tệp", e);
    }
    return key;
  }

  public Path path(String key) {
    Path p = resolve(key);
    if (!Files.exists(p)) throw ApiException.notFound("Nội dung tệp không còn trên máy chủ");
    return p;
  }

  public void delete(String key) {
    try {
      Files.deleteIfExists(resolve(key));
    } catch (IOException ignored) {
      // Xoá nội dung là dọn dẹp — lỗi không ảnh hưởng dữ liệu nghiệp vụ.
    }
  }

  private Path resolve(String key) {
    Path p = root.resolve(key).normalize();
    if (!p.startsWith(root)) throw ApiException.invalid("Đường dẫn tệp không hợp lệ");
    return p;
  }
}
