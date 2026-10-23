package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Yêu cầu xoá (NT-11). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class YeuCauXoa {
  private String id;
  private String loai;
  private String maDoiTuong;
  private String moTa;
  private String lyDo;
  private String nguoiGui;
  private String ngayGui;
  private String trangThai;
  private String nguoiDuyet;
  private String ngayDuyet;
  private String lyDoTuChoi;
}
