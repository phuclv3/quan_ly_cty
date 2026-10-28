package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Một lần chăm sóc khách hàng (nhật ký, chỉ thêm). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChamSocKH {
  private String id;
  private String luc;
  private String nguoi;
  private String noiDung;
  private String coHoi;
  /** Kênh tương tác: Gọi điện / Gặp trực tiếp / Họp online / Email. */
  private String kenh;
  /** Kết quả buổi tương tác (người dùng tự nhập). */
  private String ketQua;
}
