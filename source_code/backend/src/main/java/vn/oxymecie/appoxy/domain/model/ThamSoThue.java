package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Tham số thuế TNDN luỹ tiến lưu theo HĐ bán. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ThamSoThue {
  private double nguong;
  private double muc1;
  private double muc2;
}
