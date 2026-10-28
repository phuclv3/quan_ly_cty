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
  /** Mã việc VIEC-0001. */
  private String ma;
  /** Nhóm việc: Kinh doanh / Marketing / Mua hàng / Kho / Kế toán / Hành chính / Kỹ thuật. */
  private String nhom;
  /** Ngày bắt đầu 'YYYY-MM-DD' (han = ngày kết thúc). */
  private String batDau;
  /** Cao / Trung bình / Thấp. */
  private String mucUuTien;
  /** HDB / HDM / NOI_BO. */
  private String nguonLoai;
  private String hdmId;
  /** Yêu cầu đổi hạn gần nhất do người nhận gửi, người giao duyệt trong 1 giờ. */
  private YeuCauHan yeuCauHan;
  /** Tệp đính kèm khi giao việc. */
  private List<FileRef> files = new ArrayList<>();
}
