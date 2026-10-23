package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Nhà cung cấp (HDM-10). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NhaCungCap {
  private String id;
  private String ten;
  private String mst;
  private String diaChi;
  private String quocGia;
  private String nguoiLienHe;
  private String dienThoai;
  private String email;
  private String ghiChu;
  private String trangThai;
}
