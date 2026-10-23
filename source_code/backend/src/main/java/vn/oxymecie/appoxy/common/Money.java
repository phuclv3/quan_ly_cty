package vn.oxymecie.appoxy.common;

/** Định dạng tiền trong câu thông báo — giống util.ts money / vnd. */
public final class Money {
  private Money() {}

  /** 1.234.567 — làm tròn như Math.round của JavaScript. */
  public static String money(double n) {
    long r = Math.round(n);
    String s = String.format(java.util.Locale.US, "%,d", Math.abs(r)).replace(',', '.');
    return r < 0 ? "−" + s : s;
  }

  public static String vnd(double n) {
    return money(n) + " đ";
  }

  /** 0.07 → "7%" (làm tròn 0,1%). */
  public static String phanTram(double x) {
    double v = Math.round(x * 1000) / 10.0;
    return (v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v)) + "%";
  }

  /** Số kiểu JavaScript: 3 → "3", 2.5 → "2.5". */
  public static String num(double x) {
    return x == Math.rint(x) && !Double.isInfinite(x) ? String.valueOf((long) x) : String.valueOf(x);
  }
}
