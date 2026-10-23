package vn.oxymecie.appoxy.domain.perm;

import vn.oxymecie.appoxy.domain.model.TrangThai;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import vn.oxymecie.appoxy.domain.model.NhomQuyen;
import vn.oxymecie.appoxy.domain.model.TaiKhoan;

/**
 * Tính quyền thực tế (perm.ts levelOf): một tài khoản nhiều nhóm → lấy mức CAO NHẤT từng chức năng;
 * nhóm toàn quyền → mức cao nhất của mọi chức năng; nhóm "Ngưng" không tính.
 */
public final class Quyen {
  /** Loại đối tượng mà quyền "Duyệt xoá chứng từ kế toán" (NT-11-KT) được duyệt. */
  public static final Set<String> KE_TOAN_DUYET_XOA = Set.of("PhieuThuChi", "ChiPhiThucHienHD", "DM_NguonTien", "DM_LoaiChiPhi");

  private Quyen() {}

  public static Level levelOf(Collection<NhomQuyen> groups, Perm p) {
    Level best = Level.none;
    for (NhomQuyen g : groups) {
      if (!TrangThai.HOAT_DONG.equals(g.getTrangThai())) continue;
      if (g.isToanQuyen()) return p.maxLevel();
      Level l = Level.parse(g.getQuyen() == null ? null : g.getQuyen().get(p.ma));
      if (!p.mucDo.contains(l)) continue;
      if (l.rank > best.rank) best = l;
      // Cùng hạng: "Xem" (tất cả) rộng hơn "Xem của mình".
      else if (l.rank == best.rank && l == Level.view) best = l;
    }
    return best;
  }

  /** Nhóm đang hoạt động của một tài khoản. */
  public static List<NhomQuyen> nhomCua(TaiKhoan t, List<NhomQuyen> all) {
    if (t == null) return List.of();
    return all.stream().filter(g -> t.getNhom().contains(g.getId()) && TrangThai.HOAT_DONG.equals(g.getTrangThai())).toList();
  }

  /** Còn ít nhất 1 tài khoản Hoạt động có quyền sửa NT-03 (không cho tự khoá cả hệ thống). Tài khoản ẩn không tính. */
  public static boolean conQuanTri(List<TaiKhoan> taiKhoan, List<NhomQuyen> nhom) {
    for (TaiKhoan t : taiKhoan) {
      if (!TrangThai.HOAT_DONG.equals(t.getTrangThai()) || TaiKhoan.laAn(t.getId())) continue;
      List<NhomQuyen> gs = nhom.stream().filter(g -> t.getNhom().contains(g.getId())).toList();
      if (levelOf(gs, Perm.taiKhoan).atLeast(Level.edit)) return true;
    }
    return false;
  }
}
