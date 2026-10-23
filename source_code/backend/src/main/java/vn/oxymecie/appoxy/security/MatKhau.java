package vn.oxymecie.appoxy.security;

import java.security.SecureRandom;
import java.text.Normalizer;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Chính sách & băm mật khẩu (NT-01, NT-02): BCrypt trên chuỗi đã chuẩn hoá NFKC. */
@Component
public class MatKhau {
  public static final int TOI_THIEU = 8;
  private static final String TAP_TAM = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  private static final SecureRandom RND = new SecureRandom();

  private final PasswordEncoder encoder;
  /** Chuỗi băm giả để so khi email không tồn tại — thời gian phản hồi không lộ email có hay không. */
  private final String gia;

  public MatKhau(PasswordEncoder encoder) {
    this.encoder = encoder;
    this.gia = encoder.encode("khong-co-tai-khoan-" + RND.nextLong());
  }

  public void soGia(String raw) {
    encoder.matches(chuan(raw), gia);
  }

  private static String chuan(String raw) {
    return Normalizer.normalize(raw == null ? "" : raw, Normalizer.Form.NFKC);
  }

  public String bam(String raw) {
    return encoder.encode(chuan(raw));
  }

  public boolean khop(String raw, String bam) {
    return bam != null && encoder.matches(chuan(raw), bam);
  }

  /** NT-02: ≥ 8 ký tự, không dấu cách, khác mật khẩu cũ. Trả câu lỗi hoặc null. */
  public static String loiMatKhauMoi(String moi, String cu) {
    if (moi == null || moi.length() < TOI_THIEU) return "Mật khẩu mới phải có ít nhất " + TOI_THIEU + " ký tự";
    if (moi.length() > 64) return "Mật khẩu tối đa 64 ký tự";
    if (moi.matches(".*\\s.*")) return "Mật khẩu không được chứa dấu cách";
    if (cu != null && moi.equals(cu)) return "Mật khẩu mới phải khác mật khẩu cũ";
    return null;
  }

  /** Mật khẩu tạm 10 ký tự, bỏ ký tự dễ nhầm. */
  public static String tam() {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < 10; i++) sb.append(TAP_TAM.charAt(RND.nextInt(TAP_TAM.length())));
    return sb.toString();
  }
}
