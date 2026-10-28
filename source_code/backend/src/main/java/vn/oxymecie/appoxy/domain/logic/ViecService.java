package vn.oxymecie.appoxy.domain.logic;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.stereotype.Service;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Texts;
import vn.oxymecie.appoxy.domain.model.FileRef;
import vn.oxymecie.appoxy.domain.model.PhanHoiViec;
import vn.oxymecie.appoxy.domain.model.ViecGiao;
import vn.oxymecie.appoxy.domain.model.YeuCauHan;
import vn.oxymecie.appoxy.domain.perm.Level;
import vn.oxymecie.appoxy.domain.perm.Perm;

/** Việc được giao / đặt lịch (TD-01, nghiep_vu 09 — ToDoList). */
@Service
public class ViecService {

  public static final List<String> NHOM = List.of("Kinh doanh", "Marketing", "Mua hàng", "Kho", "Kế toán", "Hành chính", "Kỹ thuật");
  public static final List<String> MUC = List.of("Cao", "Trung bình", "Thấp");

  /** Dữ liệu giao việc. nguonLoai: HDB / HDM / NOI_BO (rỗng = suy từ hdbId / hdmId). */
  public record Moi(String noiDung, List<String> nguoiNhan, String nguonLoai, String hdbId, String hdmId, String nhom, String batDau,
                    String han, String gio, String mucUuTien, List<FileRef> files, String khId, String kenh, Integer nhacTruoc) {}

  public ViecGiao giaoViec(Ctx c, Moi o) {
    c.require(Perm.viec, Level.own);
    String noiDung = Texts.trim(o.noiDung());
    if (noiDung.isEmpty()) throw ApiException.invalid("Nhập nội dung việc");
    String gio = o.gio();
    if (gio != null && !gio.isEmpty() && !gio.matches("^\\d{2}:\\d{2}$")) throw ApiException.invalid("Giờ không hợp lệ (HH:mm)");
    String hd = Texts.emptyToNull(o.hdbId());
    String hm = Texts.emptyToNull(o.hdmId());
    String loai = Texts.blank(o.nguonLoai()) ? (hd != null ? "HDB" : hm != null ? "HDM" : "NOI_BO") : o.nguonLoai();
    if (!List.of("HDB", "HDM", "NOI_BO").contains(loai)) throw ApiException.invalid("Nguồn việc không hợp lệ");
    if (!"HDB".equals(loai)) hd = null;
    if (!"HDM".equals(loai)) hm = null;
    if (hd != null && c.hdb(hd) == null) throw ApiException.invalid("HĐ bán không tồn tại");
    if (hm != null && c.hdm(hm) == null) throw ApiException.invalid("HĐ mua không tồn tại");
    String nhom = Texts.emptyToNull(o.nhom());
    if (nhom != null && !NHOM.contains(nhom)) throw ApiException.invalid("Nhóm việc không hợp lệ");
    String muc = Texts.blank(o.mucUuTien()) ? "Trung bình" : o.mucUuTien();
    if (!MUC.contains(muc)) throw ApiException.invalid("Mức ưu tiên không hợp lệ");
    String han = Texts.blank(o.han()) ? c.today() : o.han();
    String batDau = Texts.blank(o.batDau()) ? c.today() : o.batDau();
    if (batDau.compareTo(han) > 0) throw ApiException.invalid("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
    LinkedHashSet<String> nhan = new LinkedHashSet<>();
    for (String x : o.nguoiNhan() == null ? List.<String>of() : o.nguoiNhan()) {
      if (x == null || x.isEmpty() || x.equals(c.me())) continue;
      if (c.taiKhoan(x) == null) throw ApiException.invalid("Người nhận không tồn tại");
      nhan.add(x);
    }
    String khId = Texts.emptyToNull(o.khId());
    if (khId != null && c.kh(khId) == null) throw ApiException.invalid("Khách hàng không tồn tại");
    ViecGiao v = new ViecGiao(c.uid("VG"), noiDung, c.me(), c.now(), new ArrayList<>(nhan), hd, han, Texts.emptyToNull(gio), c.isGD(), null, null,
        new ArrayList<>(), maTiep(c), nhom, batDau, muc, loai, hm, null, KeToanService.tepHopLe(c, o.files()),
        khId, Texts.emptyToNull(o.kenh()), o.nhacTruoc());
    Ctx.upsert(c.db().getViecGiao(), v, ViecGiao::getId);
    return v;
  }

  /** VIEC-0001, 0002… = số lớn nhất đang có + 1. */
  private static String maTiep(Ctx c) {
    int max = 0;
    for (ViecGiao x : c.db().getViecGiao()) {
      String m = x.getMa();
      if (m != null && m.matches("VIEC-\\d+")) max = Math.max(max, Integer.parseInt(m.substring(5)));
    }
    return String.format("VIEC-%04d", max + 1);
  }

  /** Yêu cầu còn trong thời hạn duyệt (≤ 1 giờ kể từ lúc gửi). */
  public static boolean ycConHan(Ctx c, ViecGiao v) {
    YeuCauHan y = v.getYeuCauHan();
    if (y == null || !YeuCauHan.CHO.equals(y.getTrangThai())) return false;
    return Instant.parse(c.now()).isBefore(Instant.parse(y.getLuc()).plus(YeuCauHan.PHUT_DUYET, ChronoUnit.MINUTES));
  }

  /** Người nhận đề nghị đổi hạn (kèm tệp); người giao duyệt trong 1 giờ, không thì hạn giữ nguyên. */
  public void yeuCauDoiHan(Ctx c, String id, String hanMoi, String gioMoi, String lyDo, List<FileRef> files) {
    ViecGiao v = c.viec(id);
    if (v == null) throw ApiException.notFound("Không tìm thấy việc");
    if (!v.getNguoiNhan().contains(c.me())) throw ApiException.forbidden("Chỉ người được giao mới đề nghị đổi hạn");
    if (v.getXongLuc() != null) throw ApiException.invalid("Việc đã hoàn thành");
    if (ycConHan(c, v)) throw ApiException.invalid("Đang có yêu cầu đổi hạn chờ duyệt");
    if (Texts.blank(hanMoi)) throw ApiException.invalid("Chọn hạn mới");
    if (Texts.blank(lyDo)) throw ApiException.invalid("Nhập lý do đổi hạn");
    if (gioMoi != null && !gioMoi.isEmpty() && !gioMoi.matches("^\\d{2}:\\d{2}$")) throw ApiException.invalid("Giờ không hợp lệ (HH:mm)");
    if (v.getBatDau() != null && hanMoi.compareTo(v.getBatDau()) < 0) throw ApiException.invalid("Hạn mới phải sau ngày bắt đầu");
    v.setYeuCauHan(new YeuCauHan(c.me(), c.now(), hanMoi, Texts.emptyToNull(gioMoi), lyDo.trim(), KeToanService.tepHopLe(c, files), YeuCauHan.CHO));
    v.getPhanHoi().add(new PhanHoiViec(c.me(), c.now(), "Đề nghị đổi hạn sang " + hanMoi + ": " + lyDo.trim(), true));
  }

  /** Người giao duyệt / từ chối. Duyệt → cập nhật hạn; từ chối hoặc quá 1 giờ → hạn cũ. */
  public void duyetDoiHan(Ctx c, String id, boolean duyet) {
    ViecGiao v = c.viec(id);
    if (v == null) throw ApiException.notFound("Không tìm thấy việc");
    if (!v.getNguoiTao().equals(c.me())) throw ApiException.forbidden("Chỉ người giao việc mới duyệt");
    YeuCauHan y = v.getYeuCauHan();
    if (y == null || !YeuCauHan.CHO.equals(y.getTrangThai())) throw ApiException.invalid("Không có yêu cầu chờ duyệt");
    if (!ycConHan(c, v)) throw ApiException.invalid("Yêu cầu đã quá 1 giờ, hạn giữ nguyên");
    if (duyet) {
      v.setHan(y.getHanMoi());
      v.setGio(y.getGioMoi());
    }
    y.setTrangThai(duyet ? YeuCauHan.DA_DUYET : YeuCauHan.TU_CHOI);
    v.getPhanHoi().add(new PhanHoiViec(c.me(), c.now(), duyet ? "Đã duyệt đổi hạn sang " + y.getHanMoi() : "Từ chối đổi hạn", true));
  }

  /** Người liên quan (giao / nhận) hoặc người thấy mọi việc mới được phản hồi / đổi trạng thái. */
  public boolean lienQuanViec(Ctx c, ViecGiao v) {
    return v.getNguoiTao().equals(c.me()) || v.getNguoiNhan().contains(c.me()) || c.canEdit(Perm.viec);
  }

  public void phanHoiViec(Ctx c, String id, String noiDung) {
    ViecGiao v = c.viec(id);
    if (v == null) throw ApiException.notFound("Không tìm thấy việc");
    if (!lienQuanViec(c, v)) throw ApiException.forbidden("Bạn không liên quan việc này");
    if (v.getXongLuc() != null) throw ApiException.invalid("Việc đã hoàn thành — mở lại việc để trao đổi");
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
