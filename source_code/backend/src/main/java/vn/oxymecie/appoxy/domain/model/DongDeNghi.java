package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Một dòng đề nghị cấp vật tư. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DongDeNghi {
  private String id;
  private String loaiHang;
  private String tenHang;
  private double soLuong;
  private String ghiChu;
  private String dongBanId;
}
