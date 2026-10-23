package vn.oxymecie.appoxy.domain.model;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Đợt kiểm kê thực tế tại kho. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class KiemKe {
  private String id;
  private String soPhieu;
  private String ngay;
  private String kho;
  private String nguoiThucHien;
  private String ghiChu;
  private List<DongKiemKe> dong = new ArrayList<>();
  private List<String> phieuDieuChinh;
}
