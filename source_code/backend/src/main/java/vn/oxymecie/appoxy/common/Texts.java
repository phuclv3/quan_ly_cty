package vn.oxymecie.appoxy.common;

import java.text.Normalizer;
import java.util.regex.Pattern;

/** Xử lý chuỗi giống frontend (core/util.ts). */
public final class Texts {
  private static final Pattern MARKS = Pattern.compile("[\u0300-\u036f]");

  private Texts() {}

  /** Bỏ dấu tiếng Việt, chữ thường — so trùng tên / số HĐ (util.ts fold). */
  public static String fold(String s) {
    if (s == null) return "";
    String n = Normalizer.normalize(s, Normalizer.Form.NFD);
    return MARKS.matcher(n).replaceAll("").replace('đ', 'd').replace('Đ', 'D').toLowerCase();
  }

  public static boolean blank(String s) {
    return s == null || s.trim().isEmpty();
  }

  public static String trim(String s) {
    return s == null ? "" : s.trim();
  }

  /** Chuỗi đã trim, rỗng → null (tương đương `x?.trim() || undefined`). */
  public static String trimToNull(String s) {
    if (s == null) return null;
    String t = s.trim();
    return t.isEmpty() ? null : t;
  }

  /** Rỗng → null (tương đương `x || undefined`). */
  public static String emptyToNull(String s) {
    return s == null || s.isEmpty() ? null : s;
  }

  public static String nz(String s) {
    return s == null ? "" : s;
  }
}
