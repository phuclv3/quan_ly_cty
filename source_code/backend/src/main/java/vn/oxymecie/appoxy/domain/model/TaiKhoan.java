package vn.oxymecie.appoxy.domain.model;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Tài khoản — bản gửi client không có mật khẩu băm (models.ts TaiKhoan). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaiKhoan {
  /**
   * Tài khoản quản trị ẩn (V3__tai_khoan_an.sql, thuộc nhóm NQ-GD — toàn quyền như Giám đốc).
   * Ẩn khỏi màn Quản lý tài khoản / mọi danh sách chọn người phụ trách cho tài khoản khác; không ai khác
   * sửa / khoá / đặt lại mật khẩu / gỡ khỏi nhóm được; không tính vào điều kiện "còn người quản trị".
   * VẪN ghi đầy đủ vào Nhật ký thao tác (ht_nhat_ky) như tài khoản bình thường — không được ẩn khỏi đó.
   */
  public static final String QUAN_TRI_AN = "TK-ROOT";

  public static boolean laAn(String id) {
    return QUAN_TRI_AN.equals(id);
  }

  private String id;
  private String email;
  private String hoTen;
  private List<String> nhom = new ArrayList<>();
  private String trangThai;
  private boolean batDoiMK;
  private int soLanSai;
  private String khoaDen;
  private String lanDangNhapCuoi;
}
