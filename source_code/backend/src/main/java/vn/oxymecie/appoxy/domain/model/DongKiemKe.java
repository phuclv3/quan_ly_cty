package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Một dòng đếm kiểm kê. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DongKiemKe {
  private String loaiHang;
  private double soLuong;
  private String tenHang;
  private String xuatXu;
  private String nongDo;
  private String ghiChu;
}
