package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Siêu dữ liệu tệp đính kèm — nội dung tải qua /api/tep/{id}. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileRef {
  private String id;
  private String name;
  private String mime;
  private long size;
  private String thumb;
  private String ngayUpload;
  private String nguoiUpload;
}
