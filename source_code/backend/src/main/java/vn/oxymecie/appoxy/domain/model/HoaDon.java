package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Hoá đơn của hợp đồng (HDB-06). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HoaDon {
  private String id;
  private String chu;
  private String chuId;
  private String soHoaDon;
  private String ngayHoaDon;
  private long giaTri;
  private String fileId;
}
