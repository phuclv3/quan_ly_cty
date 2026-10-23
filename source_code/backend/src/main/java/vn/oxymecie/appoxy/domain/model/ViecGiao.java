package vn.oxymecie.appoxy.domain.model;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Việc được giao / lịch hẹn (TD-01). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ViecGiao {
  private String id;
  private String noiDung;
  private String nguoiTao;
  private String taoLuc;
  private List<String> nguoiNhan = new ArrayList<>();
  private String hdbId;
  private String han;
  private String gio;
  private Boolean uuTien;
  private String xongLuc;
  private String nguoiXong;
  private List<PhanHoiViec> phanHoi = new ArrayList<>();
}
