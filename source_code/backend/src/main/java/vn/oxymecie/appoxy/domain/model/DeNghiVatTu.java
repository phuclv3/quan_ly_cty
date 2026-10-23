package vn.oxymecie.appoxy.domain.model;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Phiếu đề nghị cấp vật tư. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeNghiVatTu {
  private String id;
  private String soPhieu;
  private String ngay;
  private String hdbId;
  private String nguoiDeNghi;
  private List<DongDeNghi> dong = new ArrayList<>();
  private String ghiChu;
  private String lyDoHuy;
}
