package vn.oxymecie.appoxy.domain.model;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Cảnh báo rủi ro (P0 / P1 / P2) — tách biệt với việc được giao.
 * nguon = TAY: người dùng báo rủi ro. nguon = HE_THONG: vết xử lý của cảnh báo hệ thống tự phát hiện (khoaHeThong ổn định);
 * nội dung là ảnh chụp lúc có người thao tác đầu tiên.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CanhBao {
  public static final String TAY = "TAY";
  public static final String HE_THONG = "HE_THONG";

  private String id;
  /** Mã CB-0001. */
  private String ma;
  /** P0 Khẩn cấp / P1 Cao / P2 Cảnh báo sớm. */
  private String muc;
  private String noiDung;
  private String anhHuong;
  /** Người theo dõi: nhóm phụ trách. */
  private String theoDoi;
  private String hdbId;
  private String hdmId;
  private String nguoiTao;
  private String taoLuc;
  /** Có = đã xử lý. */
  private String xuLyLuc;
  private String nguoiXuLy;
  private String ghiChuXuLy;
  private String nguon;
  /** Khoá cảnh báo hệ thống (VD tc-thu-<id HĐ bán>); null với cảnh báo nhập tay. */
  private String khoaHeThong;
  /** Id tài khoản được giao xử lý. */
  private String nguoiPhuTrach;
  private List<LichSuDuyet> lichSu = new ArrayList<>();
}
