package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Ánh xạ tên hàng ghi trong HĐ bán → mã hàng / lô. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnhXaTen {
  private String id;
  private String ten;
  private String theTich;
  private String nongDo;
  private double tongSL;
  private int soLan;
  private String loaiHang;
  private String lo;
  private String ghiChu;
}
