package vn.oxymecie.appoxy.domain.perm;

/**
 * Mức quyền (perm.ts Level), xếp từ thấp tới cao. Tên enum = giá trị lưu DB / gửi client.
 * none — không thấy · view — xem · ownView — xem của mình · request — gửi yêu cầu · draft — lập nháp ·
 * own — sửa của mình · edit — sửa tất cả · approve — duyệt.
 */
public enum Level {
  none(0, "—"),
  view(1, "Xem"),
  ownView(1, "Xem của mình"),
  request(2, "Gửi yêu cầu"),
  draft(3, "Lập nháp"),
  own(4, "Sửa của mình"),
  edit(5, "Sửa"),
  approve(6, "Duyệt");

  public final int rank;
  public final String label;

  Level(int rank, String label) {
    this.rank = rank;
    this.label = label;
  }

  public boolean atLeast(Level min) {
    return rank >= min.rank;
  }

  public static Level parse(String s) {
    if (s == null) return none;
    for (Level l : values()) if (l.name().equals(s)) return l;
    return none;
  }
}
