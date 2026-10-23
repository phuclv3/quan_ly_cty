package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Đợt Phú Tài trả NCC. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DotPTTraNCC {
  private String id;
  private String hdmId;
  private String ngay;
  private double soTien;
  private String loaiTien;
  private double tyGia;
}
