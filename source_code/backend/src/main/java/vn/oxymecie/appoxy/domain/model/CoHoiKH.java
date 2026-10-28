package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Một cơ hội bán hàng của khách hàng. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CoHoiKH {
  private String id;
  private String huongBan;
  private String nhomHang;
  private Long giaTri;
  private String giaiDoan;
  private String ngayTao;
  private String ngayBaoGia;
  private String ngayChot;
  private String lyDoThua;
  private String tuongTacTiep;
  private String ngayTuongTac;
  private String ngayTaiTiepCan;
}
