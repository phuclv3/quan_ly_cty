package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Phiếu do nghiệp vụ khác sinh ra (đợt thanh toán HĐ). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NguonPhatSinh {
  private String loai;
  private String hdId;
  private int dot;
}
