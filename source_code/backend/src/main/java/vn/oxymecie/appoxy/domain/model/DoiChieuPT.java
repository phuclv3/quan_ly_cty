package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Dòng đối chiếu Oxy chuyển Phú Tài ↔ Phú Tài chuyển NCC. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DoiChieuPT {
  private String id;
  private String ngayOxyChuyen;
  private long soTienVND;
  private String ngayPTChuyenNCC;
  private double soTienNguyenTe;
  private String loaiTien;
  private double tyGia;
  private String ghiChu;
}
