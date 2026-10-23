package vn.oxymecie.appoxy.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Phiếu thu chi — Sổ quỹ (KT-04…KT-10). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PhieuThuChi {
  private String id;
  private String soPhieu;
  private String ngayLap;
  private String loai;
  private String nguonTien;
  private String nguonTienDen;
  private String loaiChiPhi;
  private String noiDung;
  private long soTienThu;
  private long soTienChi;
  private String phieuTamUngGoc;
  private Long soTienThucChi;
  private String nguoiNhan;
  private String nguoiDeNghi;
  private String trangThai;
  private String nguoiDuyet;
  private String ngayDuyet;
  private String lyDoTuChoi;
  private List<FileRef> files = new ArrayList<>();
  private String ghiChu;
  private NguonPhatSinh phatSinh;
  @JsonProperty("import")
  private Boolean laImport;
  private List<LichSuDuyet> lichSu;
}
