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
  /** Phiếu xuất: phụ kiện giao kèm, không có trong HĐ bán (không tính vào SL còn phải giao). */
  private boolean phuKien;
  /** Phiếu nhập do chuyển kho: mã lô gốc ở kho đi. */
  private String loGoc;

  public DongPhieuKho(String loaiHang, String thuocTinh, double soLuong, String lo, Double donGia, Double vat, String dongHDMua,
                      Double donGiaGoc, String tenTrenHD, String ghiChu) {
    this(loaiHang, thuocTinh, soLuong, lo, donGia, vat, dongHDMua, donGiaGoc, tenTrenHD, ghiChu, false, null);
  }

  public DongPhieuKho(String loaiHang, String thuocTinh, double soLuong, String lo, Double donGia, Double vat, String dongHDMua,
                      Double donGiaGoc, String tenTrenHD, String ghiChu, boolean phuKien) {
    this(loaiHang, thuocTinh, soLuong, lo, donGia, vat, dongHDMua, donGiaGoc, tenTrenHD, ghiChu, phuKien, null);
  }
}
