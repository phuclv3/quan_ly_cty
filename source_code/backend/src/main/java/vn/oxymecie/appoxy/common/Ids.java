package vn.oxymecie.appoxy.common;

import java.security.SecureRandom;
import java.util.regex.Pattern;

/** Sinh mã như util.ts uid(): tiền tố + thời gian base36 + ngẫu nhiên, tối đa 24 ký tự. */
public final class Ids {
  private static final SecureRandom RND = new SecureRandom();
  /** Mã client gửi lên khi tạo mới: chữ, số, gạch, chấm, gạch dưới — không khoảng trắng. */
  public static final Pattern SAFE_ID = Pattern.compile("^[A-Za-z0-9_.-]{1,40}$");

  private Ids() {}

  public static String uid(String prefix) {
    String s = prefix + Long.toString(System.currentTimeMillis(), 36)
        + Long.toString(Integer.toUnsignedLong(RND.nextInt()), 36)
        + Long.toString(Integer.toUnsignedLong(RND.nextInt()), 36);
    return s.length() > 24 ? s.substring(0, 24) : s;
  }

  public static boolean safe(String id) {
    return id != null && SAFE_ID.matcher(id).matches();
  }
}
