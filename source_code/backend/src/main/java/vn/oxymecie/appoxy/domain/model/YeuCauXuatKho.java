package vn.oxymecie.appoxy.domain.model;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Yêu cầu xuất kho và giao hàng của HĐ bán: sale gửi → thủ kho kiểm đủ / đúng mã rồi Xuất kho (sinh phiếu Xuất) hoặc Từ chối
 * → cập nhật ngày giao. Trạng thái: CHO_KHO → DA_XUAT_KHO → DA_GIAO_HANG; hoặc TU_CHOI / DA_RUT.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class YeuCauXuatKho {
  private String id;
  /** Số yêu cầu YC{yy}-{nnnn}. */
  private String soYC;
  private String ngayGui;
  private String hdbId;
  private String nguoiGui;
  private List<DongYeuCauXuat> dong = new ArrayList<>();
  private String ghiChu;
  private String trangThai;
  private String lyDoTuChoi;
  /** Thủ kho xuất / từ chối và ngày xử lý. */
  private String nguoiXuLy;
  private String ngayXuLy;
  /** Kho xuất, phiếu Xuất sinh ra và ngày xuất (= ngày phiếu). */
  private String kho;
  private String phieuId;
  private String ngayXuat;
  /** Ngày giao thực tế do thủ kho cập nhật, và người cập nhật. */
  private String ngayGiao;
  private String nguoiGiao;
}
