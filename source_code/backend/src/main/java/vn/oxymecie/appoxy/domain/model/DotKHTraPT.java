package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Đợt khách hàng trả Phú Tài. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DotKHTraPT {
  private int dot;
  private long soTien;
  private String ngay;
  private String ghiChu;
}
