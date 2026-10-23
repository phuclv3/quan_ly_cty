package vn.oxymecie.appoxy.common;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

/**
 * Ngày giờ theo đúng quy ước frontend: ngày 'YYYY-MM-DD' theo giờ Việt Nam,
 * mốc thời gian ISO UTC có mili giây (như Date.toISOString()).
 */
public final class Dates {
  public static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final DateTimeFormatter ISO_MS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);

  private Dates() {}

  public static String todayIso(Clock clock) {
    return LocalDate.now(clock.withZone(VN)).toString();
  }

  public static String nowIso(Clock clock) {
    return ISO_MS.format(Instant.now(clock).truncatedTo(ChronoUnit.MILLIS));
  }

  public static String iso(Instant t) {
    return t == null ? null : ISO_MS.format(t.truncatedTo(ChronoUnit.MILLIS));
  }

  /** Đọc mốc ISO; chấp nhận cả ngày trơn 'YYYY-MM-DD' (dữ liệu import) = 00:00 giờ Việt Nam. */
  public static Instant parseInstant(String s) {
    if (s == null || s.isBlank()) return null;
    if (s.length() == 10) return LocalDate.parse(s).atStartOfDay(VN).toInstant();
    try {
      return Instant.parse(s);
    } catch (RuntimeException e) {
      return LocalDateTime.parse(s).atZone(VN).toInstant();
    }
  }

  public static LocalDate parseDate(String s) {
    if (s == null || s.isBlank()) return null;
    return LocalDate.parse(s.length() > 10 ? s.substring(0, 10) : s);
  }

  public static String date(LocalDate d) {
    return d == null ? null : d.toString();
  }

  /** 'YYYY-MM-DD' + n ngày (calc.ts congNgay). */
  public static String congNgay(String iso, int n) {
    return LocalDate.parse(iso).plusDays(n).toString();
  }

  /** Năm 2 chữ số theo ngày ISO (util.ts yy). */
  public static String yy(String iso) {
    return iso.substring(2, 4);
  }

  /** dd/mm/yyyy cho câu thông báo. */
  public static String vi(String iso) {
    if (iso == null || iso.length() < 10) return "—";
    return iso.substring(8, 10) + "/" + iso.substring(5, 7) + "/" + iso.substring(0, 4);
  }

  /** Số ngày từ hôm nay tới ngày ISO; âm = đã qua. */
  public static long daysFromToday(String iso, Clock clock) {
    if (iso == null || iso.isEmpty()) return 0;
    return ChronoUnit.DAYS.between(LocalDate.parse(todayIso(clock)), LocalDate.parse(iso.substring(0, 10)));
  }
}
