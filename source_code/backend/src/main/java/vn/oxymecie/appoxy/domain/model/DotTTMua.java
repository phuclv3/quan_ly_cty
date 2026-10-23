package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Đợt thanh toán NCC. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DotTTMua {
  private int dot;
  private Double tyLe;
  private long soTien;
  private String hanMoc;
  private Integer hanNgay;
  private String han;
  private String ngayTra;
  private Long soTienTra;
  private String nguonTien;
  private String phieuChiId;
  private String ghiChu;
}
