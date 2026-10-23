package vn.oxymecie.appoxy.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Hợp đồng mua (HDM-01…10). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HopDongMua {
  private String id;
  private String soHD;
  private String maNCC;
  private String tenNCC;
  private String diaChi;
  private String mst;
  private String ngayKy;
  private String hdbId;
  private boolean thuocPhuTai;
  private String trangThai;
  private String ghiChu;
  private List<DongHangMua> chiTiet = new ArrayList<>();
  private boolean nhapTay;
  private Long tongNhapTay;
  private String lyDoNhapTay;
  private List<DotTTMua> dotTT = new ArrayList<>();
  private String xuatHoaDon;
  private List<ChecklistItem> checklist = new ArrayList<>();
  private String ghiChuHoSoThieu;
  private String taoLuc;
  @JsonProperty("import")
  private Boolean laImport;
}
