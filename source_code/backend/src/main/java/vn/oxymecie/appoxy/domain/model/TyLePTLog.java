package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Lịch sử đổi tỷ lệ chia lợi nhuận Phú Tài. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TyLePTLog {
  private String truoc;
  private String sau;
  private String nguoi;
  private String luc;
  private String lyDo;
}
