package vn.oxymecie.appoxy.domain.model;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Phiếu nhập / xuất kho (KHO-03…08). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PhieuKho {
  private String id;
  private String soPhieu;
  private String ngay;
  private String loai;
  private String nguonGoc;
  private String hdId;
  private String kho;
  private String lyDo;
  private String nguoiThucHien;
  private String trangThai;
  private String ghiChu;
  private List<DongPhieuKho> dong = new ArrayList<>();
  private String soHoaDon;
  private String ncc;
  private String kiemKeId;
}
