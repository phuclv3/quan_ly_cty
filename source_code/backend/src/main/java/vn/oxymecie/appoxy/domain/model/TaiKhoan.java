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
   * Tài khoản quản trị ẩn (V2__default_data.sql): toàn quyền, không gửi cho tài khoản khác, không hiện trong nhật ký,
   * không ai khác sửa / khoá / đặt lại mật khẩu được, không tính vào điều kiện "còn người quản trị".
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
