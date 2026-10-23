package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Một bước trong vòng đời chứng từ (gửi duyệt / duyệt / từ chối). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LichSuDuyet {
  private String luc;
  private String nguoi;
  private String hanhDong;
  private String ghiChu;
}
