package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Một dòng hàng của yêu cầu xuất kho: mã hàng, SL yêu cầu, tên ghi trên HĐ. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DongYeuCauXuat {
  private String loaiHang;
  private String tenTrenHD;
  private double soLuong;
  private String ghiChu;
}
