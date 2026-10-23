package vn.oxymecie.appoxy.domain.logic;

import vn.oxymecie.appoxy.domain.model.TrangThai;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Ids;
import vn.oxymecie.appoxy.common.Money;
import vn.oxymecie.appoxy.common.Texts;
import vn.oxymecie.appoxy.domain.model.CauHinh;
import vn.oxymecie.appoxy.domain.model.CauHinhLog;
import vn.oxymecie.appoxy.domain.model.NhomQuyen;
import vn.oxymecie.appoxy.domain.model.TaiKhoan;
import vn.oxymecie.appoxy.domain.perm.Level;
import vn.oxymecie.appoxy.domain.perm.Perm;
import vn.oxymecie.appoxy.domain.perm.Quyen;

/** Tham số cấu hình (NT-14) và nhóm quyền / phân quyền (NT-03, NT-04). */
@Service
public class HeThongService {
  public static final List<String> KHOA_PCT = List.of("TNDN_NGUONG", "TNDN_MUC1", "TNDN_MUC2", "PT_THUE", "PT_GIU");
  public static final List<String> KHOA_TIEN_TO = List.of("TIEN_TO_TC", "TIEN_TO_CP", "TIEN_TO_NK", "TIEN_TO_XK");

  /** Giá trị hiện tại của một tham số dạng chuỗi (như String(v) của JavaScript). */
  public static String giaTri(CauHinh c, String k) {
    return switch (k) {
      case "TNDN_NGUONG" -> Money.num(c.getTndnNguong());
      case "TNDN_MUC1" -> Money.num(c.getTndnMuc1());
      case "TNDN_MUC2" -> Money.num(c.getTndnMuc2());
      case "PT_THUE" -> Money.num(c.getPtThue());
      case "PT_GIU" -> Money.num(c.getPtGiu());
      case "PT_CACH_CHIA" -> c.getPtCachChia();
      case "SO_DOT_TOI_DA" -> String.valueOf(c.getSoDotToiDa());
      case "TIEN_TO_TC" -> c.getTienToTC();
      case "TIEN_TO_CP" -> c.getTienToCP();
      case "TIEN_TO_NK" -> c.getTienToNK();
      case "TIEN_TO_XK" -> c.getTienToXK();
      default -> throw ApiException.invalid("Tham số không tồn tại: " + k);
    };
  }

  /** Gán giá trị (chuỗi) cho một khoá — dùng cả khi nạp từ DB. */
  public static void dat(CauHinh c, String k, String v) {
    switch (k) {
      case "TNDN_NGUONG" -> c.setTndnNguong(Double.parseDouble(v));
      case "TNDN_MUC1" -> c.setTndnMuc1(Double.parseDouble(v));
      case "TNDN_MUC2" -> c.setTndnMuc2(Double.parseDouble(v));
      case "PT_THUE" -> c.setPtThue(Double.parseDouble(v));
      case "PT_GIU" -> c.setPtGiu(Double.parseDouble(v));
      case "PT_CACH_CHIA" -> c.setPtCachChia(v);
      case "SO_DOT_TOI_DA" -> c.setSoDotToiDa(Integer.parseInt(v));
      case "TIEN_TO_TC" -> c.setTienToTC(v);
      case "TIEN_TO_CP" -> c.setTienToCP(v);
      case "TIEN_TO_NK" -> c.setTienToNK(v);
      case "TIEN_TO_XK" -> c.setTienToXK(v);
      default -> { }
    }
  }

  /** NT-14: đổi một tham số; ghi lịch sử. Giá trị kiểm như màn Cấu hình. */
  public void setCauHinh(Ctx c, String k, Object raw) {
    if (!c.canEdit(Perm.cauHinh)) throw ApiException.forbidden("Cần quyền sửa Tham số cấu hình (NT-14)");
    if (raw == null) throw ApiException.invalid("Thiếu giá trị");
    String cu = giaTri(c.cauHinh(), k);
    String moi;
    if (KHOA_PCT.contains(k)) {
      double n;
      try {
        n = raw instanceof Number x ? x.doubleValue() : Double.parseDouble(raw.toString());
      } catch (NumberFormatException e) {
        throw ApiException.invalid("Tỷ lệ phải là số từ 0 đến 1");
      }
      if (!Double.isFinite(n) || n < 0 || n > 1) throw ApiException.invalid("Tỷ lệ phải là số từ 0 đến 1 (0–100%)");
      moi = Money.num(n);
    } else if ("PT_CACH_CHIA".equals(k)) {
      moi = raw.toString();
      if (!List.of("Nhân", "Cộng").contains(moi)) throw ApiException.invalid("Cách chia: chọn một trong Nhân / Cộng");
    } else if ("SO_DOT_TOI_DA".equals(k)) {
      double n = raw instanceof Number x ? x.doubleValue() : Double.parseDouble(raw.toString());
      if (n != Math.rint(n) || n < 1 || n > 24) throw ApiException.invalid("Số đợt tối đa: nhập số nguyên từ 1 đến 24");
      moi = String.valueOf((int) n);
    } else if (KHOA_TIEN_TO.contains(k)) {
      moi = raw.toString().trim().toUpperCase();
      if (!moi.matches("^[A-Z]{1,5}$")) throw ApiException.invalid("Tiền tố: 1–5 chữ cái in hoa, không dấu");
      for (String t : KHOA_TIEN_TO)
        if (!t.equals(k) && giaTri(c.cauHinh(), t).equals(moi)) throw ApiException.conflict("Tiền tố " + moi + " đang dùng cho tham số khác");
    } else {
      throw ApiException.invalid("Tham số không tồn tại: " + k);
    }
    if (cu.equals(moi)) return;
    dat(c.cauHinh(), k, moi);
    c.db().getCauHinhLog().add(0, new CauHinhLog(k, cu, moi, c.me(), c.now()));
  }

  // ── Nhóm quyền ───────────────────────────────────────────────────────

  public NhomQuyen saveNhom(Ctx c, NhomQuyen n, List<String> tkIds, boolean isNew) {
    c.require(Perm.taiKhoan);
    NhomQuyen cu = isNew ? null : c.nhom(n.getId());
    if (!isNew && cu == null) throw ApiException.notFound("Không tìm thấy nhóm");
    String ma = Texts.trim(n.getMa()).toUpperCase();
    if (!ma.matches("^[A-Z0-9_]{2,30}$")) throw ApiException.invalid("Mã nhóm 2–30 ký tự: chữ in hoa không dấu, số, gạch dưới (VD KE_TOAN)");
    if (Texts.blank(n.getTen())) throw ApiException.invalid("Chưa nhập tên nhóm");
    if (!List.of(TrangThai.HOAT_DONG, TrangThai.NGUNG).contains(n.getTrangThai())) throw ApiException.invalid("Trạng thái nhóm không hợp lệ");
    String id = cu != null ? cu.getId() : null;
    if (c.db().getNhomQuyen().stream().anyMatch(g -> !Objects.equals(g.getId(), id) && g.getMa().equals(ma))) throw ApiException.conflict("Mã nhóm " + ma + " đã có");
    // Chỉ giữ mức hợp lệ của từng chức năng; bỏ mức "none".
    Map<String, String> quyen = new LinkedHashMap<>();
    for (Perm p : Perm.values()) {
      String l = n.getQuyen() == null ? null : n.getQuyen().get(p.ma);
      Level lv = Level.parse(l);
      if (lv != Level.none && p.mucDo.contains(lv)) quyen.put(p.ma, lv.name());
    }
    NhomQuyen out = new NhomQuyen();
    out.setId(cu != null ? cu.getId()
        : Ids.safe(n.getId()) && c.nhom(n.getId()) == null ? n.getId() : Ctx.nextMa("NQ-", c.db().getNhomQuyen().stream().map(NhomQuyen::getId).toList()));
    out.setMa(ma);
    out.setTen(n.getTen().trim());
    out.setMoTa(Texts.trim(n.getMoTa()));
    out.setToanQuyen(n.isToanQuyen());
    out.setTrangThai(n.getTrangThai());
    out.setQuyen(quyen);
    out.setHeThong(cu == null ? null : cu.getHeThong());
    out.setTaoLuc(cu == null ? c.now() : cu.getTaoLuc());
    out.setCapNhat(c.now());
    out.setNguoiCapNhat(c.me());
    List<NhomQuyen> nhom = new ArrayList<>(c.db().getNhomQuyen().stream().filter(g -> !g.getId().equals(out.getId())).toList());
    nhom.add(out);
    List<TaiKhoan> tk = tkIds != null ? ganNhom(c, out.getId(), tkIds) : c.db().getTaiKhoan();
    if (!Quyen.conQuanTri(tk, nhom))
      throw ApiException.conflict("Thay đổi này làm hệ thống không còn ai quản trị tài khoản — giữ quyền NT-03 \"Sửa\" cho ít nhất 1 nhóm có thành viên");
    if (cu != null) c.db().getNhomQuyen().replaceAll(g -> g.getId().equals(out.getId()) ? out : g);
    else c.db().getNhomQuyen().add(out);
    c.db().setTaiKhoan(new ArrayList<>(tk));
    return out;
  }

  /** Danh sách tài khoản sau khi đặt lại thành viên nhóm (bản sao); lỗi khi có tài khoản bị bỏ hết nhóm. */
  private List<TaiKhoan> ganNhom(Ctx c, String nhomId, List<String> tkIds) {
    List<TaiKhoan> out = new ArrayList<>();
    List<String> rong = new ArrayList<>();
    for (String id : tkIds) if (c.taiKhoan(id) == null) throw ApiException.invalid("Tài khoản không tồn tại: " + id);
    for (TaiKhoan t : c.db().getTaiKhoan()) {
      boolean co = t.getNhom().contains(nhomId);
      boolean can = tkIds.contains(t.getId());
      // Tài khoản ẩn: client không bao giờ thấy nó nên danh sách gửi lên luôn thiếu nó — giữ nguyên nhóm, không coi là "bỏ khỏi nhóm".
      if (co == can || TaiKhoan.laAn(t.getId())) {
        out.add(t);
        continue;
      }
      TaiKhoan x = c.copy(t, TaiKhoan.class);
      List<String> ds = new ArrayList<>(t.getNhom());
      if (can) ds.add(nhomId);
      else ds.remove(nhomId);
      x.setNhom(ds);
      if (ds.isEmpty()) rong.add(x.getHoTen());
      out.add(x);
    }
    if (!rong.isEmpty()) throw ApiException.conflict("Tài khoản phải thuộc ít nhất 1 nhóm: " + String.join(", ", rong) + " sẽ không còn nhóm nào");
    return out;
  }

  /** Xoá nhóm: chỉ nhóm tự tạo và không còn thành viên. */
  public void xoaNhom(Ctx c, String id) {
    c.require(Perm.taiKhoan);
    NhomQuyen g = c.nhom(id);
    if (g == null) throw ApiException.notFound("Không tìm thấy nhóm");
    if (Boolean.TRUE.equals(g.getHeThong())) throw ApiException.conflict("Nhóm khởi tạo sẵn không xoá được — có thể chuyển \"Ngưng\"");
    long n = c.db().getTaiKhoan().stream().filter(t -> t.getNhom().contains(id)).count();
    if (n > 0) throw ApiException.conflict("Nhóm còn " + n + " tài khoản — bỏ các tài khoản ra khỏi nhóm trước");
    c.db().getNhomQuyen().removeIf(x -> x.getId().equals(id));
  }

  /** Đặt lại danh sách thành viên của một nhóm. */
  public void ganThanhVien(Ctx c, String nhomId, List<String> tkIds) {
    c.require(Perm.taiKhoan);
    if (c.nhom(nhomId) == null) throw ApiException.notFound("Không tìm thấy nhóm");
    List<TaiKhoan> tk = ganNhom(c, nhomId, tkIds == null ? List.of() : tkIds);
    if (!Quyen.conQuanTri(tk, c.db().getNhomQuyen())) throw ApiException.conflict("Thay đổi này làm hệ thống không còn ai quản trị tài khoản");
    c.db().setTaiKhoan(new ArrayList<>(tk));
  }
}
