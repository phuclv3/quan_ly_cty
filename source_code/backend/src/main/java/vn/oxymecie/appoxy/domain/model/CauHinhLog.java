package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Một lần sửa tham số cấu hình (NT-14). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CauHinhLog {
  private String khoa;
  private String giaTriCu;
  private String giaTriMoi;
  private String nguoiSua;
  private String ngaySua;
}
