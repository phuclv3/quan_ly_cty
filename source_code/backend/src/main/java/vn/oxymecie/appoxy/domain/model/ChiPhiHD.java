package vn.oxymecie.appoxy.domain.model;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Chi phí thực hiện hợp đồng (KT-12…KT-15). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChiPhiHD {
  private String id;
  private String maCP;
  private String hdbId;
  private String ngay;
  private String loaiChiPhi;
  private String noiDung;
  private long soTien;
  private String nguonTien;
  private String nguoiThucHien;
  private String nguoiNhan;
  private String donViVanChuyen;
  private String trangThai;
  private String nguoiDuyet;
  private String ngayDuyet;
  private String lyDoTuChoi;
  private List<FileRef> files = new ArrayList<>();
  private String ghiChu;
  private List<LichSuDuyet> lichSu;
}
