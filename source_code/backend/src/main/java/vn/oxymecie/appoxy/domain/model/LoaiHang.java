package vn.oxymecie.appoxy.domain.model;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Mã hàng cố định (KHO-02). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoaiHang {
  private String id;
  private String ten;
  private String moTa;
  private String nhom;
  private String dvt;
  private List<String> thuocTinh = new ArrayList<>();
  private boolean dangDung;
  private String loaiKhi;
  private String theTich;
  private List<String> bietDanh;
}
