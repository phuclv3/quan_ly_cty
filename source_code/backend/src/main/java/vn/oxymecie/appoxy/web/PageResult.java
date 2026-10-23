package vn.oxymecie.appoxy.web;

import java.util.Comparator;
import java.util.List;
import java.util.function.Function;
import java.util.function.Predicate;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Texts;

/** Một trang kết quả danh sách (page bắt đầu từ 0). */
public record PageResult<T>(List<T> items, int page, int size, long total, int totalPages) {

  /**
   * Lọc + sắp xếp + cắt trang trên danh sách đã lọc quyền.
   *
   * @param sort "truong,asc|desc" — trường phải nằm trong bảng sắp xếp cho phép
   */
  public static <T> PageResult<T> of(List<T> rows, Predicate<T> filter, String sort, java.util.Map<String, Function<T, Comparable>> keys,
      int page, int size) {
    if (page < 0) throw ApiException.invalid("page phải ≥ 0");
    if (size < 1 || size > 500) throw ApiException.invalid("size phải từ 1 đến 500");
    List<T> ds = rows.stream().filter(filter).toList();
    if (sort != null && !sort.isBlank()) {
      String[] p = sort.split(",");
      Function<T, Comparable> k = keys.get(p[0].trim());
      if (k == null) throw ApiException.invalid("Không sắp xếp được theo " + p[0] + " — chọn một trong " + String.join(", ", keys.keySet()));
      @SuppressWarnings("unchecked")
      Comparator<T> cmp = Comparator.comparing(k, Comparator.nullsLast(Comparator.naturalOrder()));
      if (p.length > 1 && "desc".equalsIgnoreCase(p[1].trim())) cmp = cmp.reversed();
      ds = ds.stream().sorted(cmp).toList();
    }
    long total = ds.size();
    int from = (int) Math.min((long) page * size, total);
    int to = (int) Math.min(from + (long) size, total);
    return new PageResult<>(ds.subList(from, to), page, size, total, (int) ((total + size - 1) / size));
  }

  /** Mọi từ trong q đều có trong một trong các trường (không dấu, không phân biệt hoa thường) — như util.ts matches. */
  public static boolean khop(String q, Object... fields) {
    if (q == null || q.isBlank()) return true;
    StringBuilder hay = new StringBuilder();
    for (Object f : fields) if (f != null) hay.append(' ').append(f);
    String h = Texts.fold(hay.toString());
    for (String w : Texts.fold(q).trim().split("\\s+")) if (!w.isEmpty() && !h.contains(w)) return false;
    return true;
  }

  public static boolean trongKhoang(String ngay, String tu, String den) {
    if (tu != null && !tu.isBlank() && (ngay == null || ngay.compareTo(tu) < 0)) return false;
    return den == null || den.isBlank() || (ngay != null && ngay.compareTo(den) <= 0);
  }
}
