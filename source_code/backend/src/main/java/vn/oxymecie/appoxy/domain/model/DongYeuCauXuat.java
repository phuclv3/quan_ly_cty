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
  /** Phụ kiện giao kèm, không có tên trong HĐ bán. */
  private boolean phuKien;

  public DongYeuCauXuat(String loaiHang, String tenTrenHD, double soLuong, String ghiChu) {
    this(loaiHang, tenTrenHD, soLuong, ghiChu, false);
  }
}
