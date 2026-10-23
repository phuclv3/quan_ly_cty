package vn.oxymecie.appoxy.domain.model;

import java.util.Map;

/**
 * Mã trạng thái lưu ở DB / trao đổi với frontend (không dấu, IN HOA). Tên tiếng Việt chỉ để hiển thị:
 * dùng {@link #nhan(String)} khi cần đưa vào thông báo cho người dùng. Bản TS tương ứng:
 * frontend/src/app/core/trang-thai.ts — hai tệp phải khớp nhau và khớp CHECK trong db/migration.
 */
public final class TrangThai {
  private TrangThai() {}

  // Dùng chung nhiều bảng
  public static final String HOAT_DONG = "HOAT_DONG"; // nhóm quyền, tài khoản
  public static final String KHOA = "KHOA"; // tài khoản
  public static final String DANG_DUNG = "DANG_DUNG"; // nguồn tiền, khách hàng, NCC
  public static final String NGUNG = "NGUNG"; // nhóm quyền, nguồn tiền, khách hàng, NCC
  public static final String NHAP = "NHAP"; // phiếu thu chi, chi phí HĐ, HĐ mua
  public static final String CHO_DUYET = "CHO_DUYET";
  public static final String DA_DUYET = "DA_DUYET";
  public static final String TU_CHOI = "TU_CHOI";
  public static final String DA_RUT = "DA_RUT"; // yêu cầu xét duyệt
  public static final String BAO_GIA = "BAO_GIA"; // HĐ bán, HĐ phụ tải
  public static final String HIEU_LUC = "HIEU_LUC"; // HĐ bán, HĐ phụ tải, phiếu kho
  public static final String DANG_GIAO_HANG = "DANG_GIAO_HANG"; // HĐ bán
  public static final String DANG_THUC_HIEN = "DANG_THUC_HIEN"; // HĐ phụ tải
  public static final String HOAN_THANH = "HOAN_THANH";
  public static final String DA_TAT_TOAN = "DA_TAT_TOAN";
  public static final String HUY = "HUY"; // HĐ, tiếp cận, cơ hội
  public static final String DA_KY = "DA_KY"; // HĐ mua
  public static final String DANG_NHAN_HANG = "DANG_NHAN_HANG"; // HĐ mua
  public static final String DA_NHAN_DU = "DA_NHAN_DU"; // HĐ mua
  public static final String DA_HUY = "DA_HUY"; // phiếu kho
  // Khách hàng — trang_thai_data
  public static final String CHUA_PHAN_BO = "CHUA_PHAN_BO";
  public static final String DA_PHAN_BO = "DA_PHAN_BO";
  // Khách hàng — tiep_can
  public static final String CHUA_LIEN_HE = "CHUA_LIEN_HE";
  public static final String DANG_LIEN_HE = "DANG_LIEN_HE";
  public static final String HOP_DONG = "HOP_DONG";
  // Khách hàng — co_hoi
  public static final String CHUA_TIEP_CAN = "CHUA_TIEP_CAN";
  public static final String DA_BAO_GIA = "DA_BAO_GIA";
  public static final String DANG_DAM_PHAN = "DANG_DAM_PHAN";
  public static final String KY_HOP_DONG = "KY_HOP_DONG";
  public static final String DA_GIAO_HANG = "DA_GIAO_HANG";

  private static final Map<String, String> NHAN = Map.ofEntries(
      Map.entry(HOAT_DONG, "Hoạt động"), Map.entry(KHOA, "Khoá"), Map.entry(DANG_DUNG, "Đang dùng"),
      Map.entry(NGUNG, "Ngưng"), Map.entry(NHAP, "Nháp"), Map.entry(CHO_DUYET, "Chờ duyệt"),
      Map.entry(DA_DUYET, "Đã duyệt"), Map.entry(TU_CHOI, "Từ chối"), Map.entry(DA_RUT, "Đã rút"),
      Map.entry(BAO_GIA, "Báo giá"), Map.entry(HIEU_LUC, "Hiệu lực"), Map.entry(DANG_GIAO_HANG, "Đang giao hàng"),
      Map.entry(DANG_THUC_HIEN, "Đang thực hiện"), Map.entry(HOAN_THANH, "Hoàn thành"),
      Map.entry(DA_TAT_TOAN, "Đã tất toán"), Map.entry(HUY, "Huỷ"), Map.entry(DA_KY, "Đã ký"),
      Map.entry(DANG_NHAN_HANG, "Đang nhận hàng"), Map.entry(DA_NHAN_DU, "Đã nhận đủ"), Map.entry(DA_HUY, "Đã huỷ"),
      Map.entry(CHUA_PHAN_BO, "Chưa phân bổ"), Map.entry(DA_PHAN_BO, "Đã phân bổ"),
      Map.entry(CHUA_LIEN_HE, "Chưa liên hệ"), Map.entry(DANG_LIEN_HE, "Đang liên hệ"), Map.entry(HOP_DONG, "Hợp đồng"),
      Map.entry(CHUA_TIEP_CAN, "Chưa tiếp cận"), Map.entry(DA_BAO_GIA, "Đã báo giá"),
      Map.entry(DANG_DAM_PHAN, "Đang đàm phán"), Map.entry(KY_HOP_DONG, "Ký hợp đồng"),
      Map.entry(DA_GIAO_HANG, "Đã giao hàng"));

  /** Tên tiếng Việt để hiển thị; mã lạ trả lại nguyên mã. */
  public static String nhan(String ma) {
    return ma == null ? "" : NHAN.getOrDefault(ma, ma);
  }
}
