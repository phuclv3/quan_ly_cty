package vn.oxymecie.appoxy.domain.model;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Yêu cầu đổi hạn việc: người nhận gửi (kèm tệp), người giao duyệt trong 1 giờ; quá giờ coi như hết hạn, hạn giữ nguyên. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class YeuCauHan {
  public static final String CHO = "Chờ duyệt";
  public static final String DA_DUYET = "Đã duyệt";
  public static final String TU_CHOI = "Từ chối";
  public static final String HET_HAN = "Hết hạn";
  /** Thời hạn người giao duyệt (phút). */
  public static final long PHUT_DUYET = 60;

  private String nguoi;
  private String luc;
  private String hanMoi;
  private String gioMoi;
  private String lyDo;
  private List<FileRef> files = new ArrayList<>();
  private String trangThai;
}
