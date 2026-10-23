package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Chi phí của HĐ Phú Tài. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChiPhiPT {
  private String id;
  private String loai;
  private String noiDung;
  private String ngay;
  private long soTien;
}
