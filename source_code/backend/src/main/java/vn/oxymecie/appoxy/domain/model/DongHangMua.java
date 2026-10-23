package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Dòng hàng HĐ mua. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DongHangMua {
  private String id;
  private String loaiHang;
  private String tenHang;
  private String thongSo;
  private double soLuong;
  private String dvt;
  private double donGia;
  private String loaiTien;
  private double tyGia;
  private String ghiChu;
  private String dnvtId;
  private String dnvtDong;
  private String hdbId;
}
