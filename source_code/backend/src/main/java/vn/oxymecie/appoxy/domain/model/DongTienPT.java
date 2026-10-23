package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Dòng tiền quỹ ảo Phú Tài (PT-09). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DongTienPT {
  private String id;
  private String ngay;
  private String chieu;
  private String hdptId;
  private long soTien;
  private String nguon;
  private String refId;
  private String ghiChu;
}
