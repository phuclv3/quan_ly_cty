package vn.oxymecie.appoxy.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Khách hàng và theo dõi kinh doanh (HDB-13). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class KhachHang {
  private String id;
  private String ten;
  private String mst;
  private String diaChi;
  private String nguoiLienHe;
  private String dienThoai;
  private String email;
  private String ghiChu;
  private String trangThai;
  private String tinh;
  private String chucVu;
  private String phanLoai;
  private String nguon;
  private String loaiSP;
  private String hinhThucHD;
  private String tiepCan;
  private String coHoi;
  private String phuTrach;
  private String trangThaiData;
  private String ngayTiepNhan;
  private String ngayPhanBo;
  private Long giaTriCoHoi;
  private List<ChamSocKH> chamSoc;
  @JsonProperty("import")
  private Boolean laImport;
}
