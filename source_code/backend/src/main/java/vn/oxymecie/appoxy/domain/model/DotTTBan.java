package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Đợt thanh toán HĐ bán. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DotTTBan {
  private int dot;
  private Double tyLe;
  private long soTien;
  private String han;
  private Integer hanNgay;
  private String ngayThu;
  private Long soTienThu;
  private String nguonTienNhan;
  private String ghiChu;
  private String phieuThuId;
}
