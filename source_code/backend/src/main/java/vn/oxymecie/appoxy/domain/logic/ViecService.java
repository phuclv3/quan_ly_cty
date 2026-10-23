package vn.oxymecie.appoxy.domain.logic;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.stereotype.Service;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Texts;
import vn.oxymecie.appoxy.domain.model.PhanHoiViec;
import vn.oxymecie.appoxy.domain.model.ViecGiao;
import vn.oxymecie.appoxy.domain.perm.Level;
import vn.oxymecie.appoxy.domain.perm.Perm;

/** Việc được giao / đặt lịch (TD-01, nghiep_vu 09 — ToDoList). */
@Service
public class ViecService {

  public ViecGiao giaoViec(Ctx c, String noiDungRaw, List<String> nguoiNhan, String hdbId, String han, String gio) {
    c.require(Perm.viec, Level.own);
    String noiDung = Texts.trim(noiDungRaw);
    if (noiDung.isEmpty()) throw ApiException.invalid("Nhập nội dung việc");
    if (gio != null && !gio.isEmpty() && !gio.matches("^\\d{2}:\\d{2}$")) throw ApiException.invalid("Giờ không hợp lệ (HH:mm)");
    String hd = Texts.emptyToNull(hdbId);
    if (hd != null && c.hdb(hd) == null) throw ApiException.invalid("HĐ bán không tồn tại");
    LinkedHashSet<String> nhan = new LinkedHashSet<>();
    for (String x : nguoiNhan == null ? List.<String>of() : nguoiNhan) {
      if (x == null || x.isEmpty() || x.equals(c.me())) continue;
      if (c.taiKhoan(x) == null) throw ApiException.invalid("Người nhận không tồn tại");
      nhan.add(x);
    }
    ViecGiao v = new ViecGiao(c.uid("VG"), noiDung, c.me(), c.now(), new ArrayList<>(nhan), hd,
        Texts.blank(han) ? c.today() : han, Texts.emptyToNull(gio), c.isGD(), null, null, new ArrayList<>());
    Ctx.upsert(c.db().getViecGiao(), v, ViecGiao::getId);
    return v;
  }

  /** Người liên quan (giao / nhận) hoặc người thấy mọi việc mới được phản hồi / đổi trạng thái. */
  public boolean lienQuanViec(Ctx c, ViecGiao v) {
    return v.getNguoiTao().equals(c.me()) || v.getNguoiNhan().contains(c.me()) || c.canEdit(Perm.viec);
  }

  public void phanHoiViec(Ctx c, String id, String noiDung) {
    ViecGiao v = c.viec(id);
    if (v == null) throw ApiException.notFound("Không tìm thấy việc");
    if (!lienQuanViec(c, v)) throw ApiException.forbidden("Bạn không liên quan việc này");
    if (Texts.blank(noiDung)) throw ApiException.invalid("Nhập nội dung phản hồi");
    v.getPhanHoi().add(new PhanHoiViec(c.me(), c.now(), noiDung.trim(), null));
  }

  public void xongViec(Ctx c, String id, boolean xong) {
    ViecGiao v = c.viec(id);
    if (v == null) throw ApiException.notFound("Không tìm thấy việc");
    if (!lienQuanViec(c, v)) throw ApiException.forbidden("Bạn không liên quan việc này");
    v.setXongLuc(xong ? c.now() : null);
    v.setNguoiXong(xong ? c.me() : null);
    v.getPhanHoi().add(new PhanHoiViec(c.me(), c.now(), xong ? "Đã hoàn thành" : "Mở lại việc", true));
  }
}
