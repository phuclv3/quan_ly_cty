package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Vị trí kho (KHO-01). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Kho {
  private String id;
  private String ten;
  private String loai;
  private boolean dangDung;
}
