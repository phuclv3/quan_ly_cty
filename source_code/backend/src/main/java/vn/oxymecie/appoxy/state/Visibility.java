package vn.oxymecie.appoxy.state;

import java.time.Clock;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.logic.Ctx;
import vn.oxymecie.appoxy.domain.model.*;
import vn.oxymecie.appoxy.domain.perm.Level;
import vn.oxymecie.appoxy.domain.perm.Perm;

/**
 * Phạm vi dữ liệu một tài khoản được nhận (kiểm ở backend, không chỉ ẩn trên giao diện):
 * <ul>
 *   <li>Bảng của chức năng không có quyền xem → không gửi.</li>
 *   <li>Quyền "của mình" (Sale): chỉ HĐ bán mình phụ trách và dữ liệu gắn với HĐ đó (HĐ mua, chi phí, phiếu thu chi
 *       phát sinh, phiếu kho, hồ sơ, đề nghị vật tư); sổ quỹ mức "Lập nháp" chỉ phiếu mình đề nghị.</li>
 *   <li>Tài khoản: không bao giờ có mật khẩu; người không quản trị tài khoản không thấy số lần sai / khoá / lần đăng nhập.</li>
 * </ul>
 * Dùng chung cho GET /api/db và ChangeSet trả về sau lệnh ghi.
 */
public final class Visibility {
  private final Ctx c;
  private final Set<String> hdb = new HashSet<>();
  private final Set<String> hdm = new HashSet<>();
  private final Set<String> pt = new HashSet<>();
  private final boolean allHdb;
  private final boolean allHdm;
  private final boolean allPhieu;
  private final boolean allChiPhi;
  private final boolean allKho;

  public Visibility(Db db, String me, Clock clock) {
    this.c = new Ctx(db, me, clock, null, null);
    allHdb = c.canView(Perm.hdb) && !c.ownOnly(Perm.hdb);
    for (HopDongBan h : db.getHopDongBan()) if (allHdb || (c.ownOnly(Perm.hdb) && me.equals(h.getSale()))) hdb.add(h.getId());
    allHdm = c.canView(Perm.hdm) && !c.ownOnly(Perm.hdm);
    for (HopDongMua m : db.getHopDongMua()) {
      if (!c.canView(Perm.hdm)) continue;
      if (allHdm || hdb.stream().anyMatch(id -> Calc.hdmChoHdb(m, id))) hdm.add(m.getId());
    }
    if (c.canView(Perm.phuTai)) for (HopDongPhuTai p : db.getHopDongPhuTai()) pt.add(p.getId());
    Level soQuy = c.level(Perm.soQuy);
    allPhieu = soQuy == Level.view || soQuy == Level.edit || c.canApprove(Perm.soQuyDuyet) || c.canView(Perm.nguonTien)
        || c.level(Perm.congNo) == Level.view || c.level(Perm.baoCao) == Level.view;
    allChiPhi = c.canView(Perm.cpHD) && !c.ownOnly(Perm.cpHD) && allHdb;
    allKho = c.canView(Perm.khoTon) || c.canView(Perm.khoPhieuTay) || allHdb || c.level(Perm.baoCao) == Level.view;
  }

  /** Bản Db đã lọc theo quyền (danh sách mới; phần tử dùng chung với cache — chỉ đọc). */
  public Db filter(Db src) {
    Db d = new Db();
    d.setVersion(src.getVersion());
    for (Bang<?, ?> b : Bang.ALL) copy(b, src, d);
    d.setCauHinh(src.getCauHinh());
    d.setCauHinhLog(c.canView(Perm.cauHinh) ? src.getCauHinhLog() : new ArrayList<>());
    d.setBoDem(src.getBoDem());
    return d;
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  private void copy(Bang b, Db src, Db dst) {
    List out = new ArrayList();
    for (Object row : (List) b.rows().apply(src)) {
      Object v = view(b.key(), row);
      if (v != null) out.add(v);
    }
    List target = (List) b.rows().apply(dst);
    target.clear();
    target.addAll(out);
  }

  /** ChangeSet chỉ còn bản ghi người nhận được thấy; bản ghi đã đổi mà không còn được thấy → báo xoá ở client. */
  public ChangeSet filter(ChangeSet cs) {
    ChangeSet out = new ChangeSet();
    out.setPrevVersion(cs.getPrevVersion());
    out.setVersion(cs.getVersion());
    for (Map.Entry<String, List<Object>> e : cs.getUpsert().entrySet()) {
      for (Object row : e.getValue()) {
        Object v = view(e.getKey(), row);
        if (v != null) out.addUpsert(e.getKey(), v);
        else out.addRemove(e.getKey(), idOf(e.getKey(), row));
      }
    }
    cs.getRemove().forEach((k, ids) -> ids.forEach(id -> out.addRemove(k, id)));
    out.setCauHinh(cs.getCauHinh());
    if (cs.getCauHinhLog() != null && c.canView(Perm.cauHinh)) out.setCauHinhLog(cs.getCauHinhLog());
    out.setBoDem(cs.getBoDem());
    return out;
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  private static String idOf(String key, Object row) {
    Bang b = Bang.ALL.stream().filter(x -> x.key().equals(key)).findFirst().orElseThrow();
    return (String) b.id().apply(row);
  }

  /** Bản ghi gửi client (có thể là bản đã che bớt trường), hoặc null nếu không được thấy. */
  public Object view(String key, Object row) {
    return switch (key) {
      case "taiKhoan" -> taiKhoan((TaiKhoan) row);
      case "hopDongBan" -> hdb.contains(((HopDongBan) row).getId()) ? row : null;
      case "hopDongMua" -> hdm.contains(((HopDongMua) row).getId()) ? row : null;
      case "hopDongPhuTai" -> pt.contains(((HopDongPhuTai) row).getId()) ? row : null;
      case "dongTienPT" -> c.canView(Perm.phuTai) ? row : null;
      case "chiPhiHD" -> keep(row, x -> allChiPhi || hdb.contains(((ChiPhiHD) x).getHdbId())
          || c.me().equals(((ChiPhiHD) x).getNguoiThucHien()));
      case "phieuThuChi" -> keep(row, x -> allPhieu || phieuCuaMinh((PhieuThuChi) x));
      case "phieuKho" -> keep(row, x -> allKho || hdb.contains(((PhieuKho) x).getHdId()) || hdm.contains(((PhieuKho) x).getHdId()));
      case "kiemKe" -> c.canView(Perm.khoTon) || c.canView(Perm.khoPhieuTay) ? row : null;
      case "deNghiVatTu" -> keep(row, x -> allHdm || hdb.contains(((DeNghiVatTu) x).getHdbId()));
      case "viecGiao" -> viec((ViecGiao) row);
      case "hoSo" -> chuThay(((HoSo) row).getChu(), ((HoSo) row).getChuId()) ? row : null;
      case "hoaDon" -> chuThay(((HoaDon) row).getChu(), ((HoaDon) row).getChuId()) ? row : null;
      case "khachHang" -> c.canView(Perm.khachHang) || c.canView(Perm.hdb) || c.canView(Perm.phuTai) ? row : null;
      case "ncc" -> c.canView(Perm.ncc) || c.canView(Perm.hdm) || c.canView(Perm.khoTon) ? row : null;
      default -> row;
    };
  }

  private static Object keep(Object row, Predicate<Object> p) {
    return p.test(row) ? row : null;
  }

  private boolean phieuCuaMinh(PhieuThuChi p) {
    if (c.me().equals(p.getNguoiDeNghi())) return true;
    NguonPhatSinh ps = p.getPhatSinh();
    if (ps == null) return false;
    return "HDB-DotTT".equals(ps.getLoai()) ? hdb.contains(ps.getHdId()) : hdm.contains(ps.getHdId());
  }

  private Object viec(ViecGiao v) {
    Level l = c.level(Perm.viec);
    if (l == Level.none) return null;
    if (l == Level.own && !c.me().equals(v.getNguoiTao()) && !v.getNguoiNhan().contains(c.me())) return null;
    return v;
  }

  private boolean chuThay(String chu, String id) {
    return switch (chu) {
      case "HDB" -> hdb.contains(id);
      case "HDM" -> hdm.contains(id);
      default -> pt.contains(id);
    };
  }

  private TaiKhoan taiKhoan(TaiKhoan t) {
    if (TaiKhoan.laAn(t.getId()) && !t.getId().equals(c.me())) return null;
    if (c.canView(Perm.taiKhoan) || t.getId().equals(c.me())) return t;
    return new TaiKhoan(t.getId(), t.getEmail(), t.getHoTen(), t.getNhom(), t.getTrangThai(), t.isBatDoiMK(), 0, null, null);
  }
}
