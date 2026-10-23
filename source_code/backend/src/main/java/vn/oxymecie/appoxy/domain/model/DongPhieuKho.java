package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Dòng phiếu kho: nhập = một lô; xuất = trừ đúng một lô. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DongPhieuKho {
  private String loaiHang;
  private String thuocTinh;
  private double soLuong;
  private String lo;
  private Double donGia;
  private Double vat;
  private String dongHDMua;
  private Double donGiaGoc;
  private String tenTrenHD;
  private String ghiChu;
}
