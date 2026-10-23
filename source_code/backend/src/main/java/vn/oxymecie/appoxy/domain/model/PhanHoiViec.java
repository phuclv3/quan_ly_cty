package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Một dòng trao đổi của việc được giao. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PhanHoiViec {
  private String nguoi;
  private String luc;
  private String noiDung;
  private Boolean heThong;
}
