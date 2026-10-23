package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Loại chi phí (KT-03). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoaiChiPhi {
  private String id;
  private String ten;
  private String nhom;
  private boolean dangDung;
}
