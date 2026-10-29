package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Một bình khí theo số serial (id = số serial) và tình trạng in tem. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BinhKhi {
  private String id;
  private String loaiHang;
  private String xuatXu;
  private String ngaySX;
  private String hanSD;
  private String kho;
  private int soLanIn;
  private String lanInCuoi;
  private String nguoiIn;
  private String ghiChu;
}
