package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Danh mục nguồn tiền (KT-01). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NguonTien {
  private String id;
  private String ten;
  private String loai;
  private String soTaiKhoan;
  private String nganHang;
  private long soDuDauKy;
  private String ngayDauKy;
  private String trangThai;
}
