package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Dòng hàng HĐ bán / báo giá. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DongHangBan {
  private String id;
  private String loaiHang;
  private String tenHang;
  private double soLuong;
  private double donGia;
  private double donGiaTH;
  private String ghiChu;
}
