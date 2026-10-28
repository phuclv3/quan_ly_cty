package vn.oxymecie.appoxy.domain.logic;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Texts;
import vn.oxymecie.appoxy.domain.model.CanhBao;
import vn.oxymecie.appoxy.domain.model.LichSuDuyet;
import vn.oxymecie.appoxy.domain.perm.Level;
import vn.oxymecie.appoxy.domain.perm.Perm;

/**
 * Cảnh báo rủi ro (P0 / P1 / P2) — nghiệp vụ riêng với việc được giao.
 * Cảnh báo nhập tay lưu đầy đủ. Cảnh báo hệ thống tự phát hiện (tính lại từ dữ liệu mỗi lần xem) chỉ lưu "vết xử lý"
 * khi có người giao người phụ trách / đánh dấu đã xử lý, nhận diện bằng khoá ổn định.
 */
@Service
public class CanhBaoService {

  /** P0 Khẩn cấp / P1 Cao / P2 Cảnh báo sớm. */
  public static final List<String> MUC = List.of("P0", "P1", "P2");

  public record Moi(String muc, String noiDung, String anhHuong, String theoDoi, String hdbId, String hdmId) {}

  /** Thao tác trên cảnh báo hệ thống: tạo vết nếu chưa có, rồi áp người phụ trách + trạng thái xử lý. */
  public record HeThong(String khoa, String muc, String noiDung, String anhHuong, String theoDoi, String hdbId, String hdmId,
                        String nguoiPhuTrach, boolean xong, String ghiChu) {}

  public CanhBao bao(Ctx c, Moi o) {
    c.require(Perm.viec, Level.own);
    CanhBao cb = taoMoi(c, CanhBao.TAY, null, o.muc(), o.noiDung(), o.anhHuong(), o.theoDoi(), o.hdbId(), o.hdmId());
    ghi(c, cb, "Báo rủi ro", null);
    Ctx.upsert(c.db().getCanhBao(), cb, CanhBao::getId);
    return cb;
  }

  public CanhBao xuLyHeThong(Ctx c, HeThong o) {
    c.require(Perm.viec, Level.own);
    String khoa = Texts.trim(o.khoa());
    if (!khoa.matches("^[A-Za-z0-9_.:-]{3,80}$")) throw ApiException.invalid("Khoá cảnh báo không hợp lệ");
    CanhBao cb = c.db().getCanhBao().stream().filter(x -> khoa.equals(x.getKhoaHeThong())).findFirst().orElse(null);
    if (cb == null) {
      cb = taoMoi(c, CanhBao.HE_THONG, khoa, o.muc(), o.noiDung(), o.anhHuong(), o.theoDoi(), o.hdbId(), o.hdmId());
      Ctx.upsert(c.db().getCanhBao(), cb, CanhBao::getId);
    } else {
      // Mức đổi (leo thang) → cập nhật ảnh chụp để hiện đúng mức hiện tại.
      if (MUC.contains(o.muc()) && !o.muc().equals(cb.getMuc())) {
        if (cb.getXuLyLuc() != null) capNhatXuLy(c, cb, false, null); // mức đổi so với lúc đã xử lý → mở lại
        cb.setMuc(o.muc());
      }
      if (!Texts.blank(o.noiDung())) cb.setNoiDung(Texts.trim(o.noiDung()));
      if (!Texts.blank(o.anhHuong())) cb.setAnhHuong(Texts.trim(o.anhHuong()));
    }
    String nguoi = Texts.emptyToNull(o.nguoiPhuTrach());
    if (nguoi != null && c.taiKhoan(nguoi) == null) throw ApiException.invalid("Người phụ trách không tồn tại");
    if (!Objects.equals(nguoi, cb.getNguoiPhuTrach())) {
      cb.setNguoiPhuTrach(nguoi);
      ghi(c, cb, "Giao người phụ trách", nguoi == null ? "Bỏ người phụ trách" : null);
    }
    capNhatXuLy(c, cb, o.xong(), o.ghiChu());
    return cb;
  }

  /** Đánh dấu đã xử lý / mở lại. */
  public void xuLy(Ctx c, String id, boolean xong, String ghiChu) {
    CanhBao cb = lay(c, id);
    capNhatXuLy(c, cb, xong, ghiChu);
  }

  public void giao(Ctx c, String id, String nguoiPhuTrach) {
    CanhBao cb = lay(c, id);
    String nguoi = Texts.emptyToNull(nguoiPhuTrach);
    if (nguoi != null && c.taiKhoan(nguoi) == null) throw ApiException.invalid("Người phụ trách không tồn tại");
    cb.setNguoiPhuTrach(nguoi);
    ghi(c, cb, "Giao người phụ trách", nguoi == null ? "Bỏ người phụ trách" : null);
  }

  /** Cảnh báo hệ thống: ai vào được chức năng Việc đều xử lý được; cảnh báo nhập tay: người báo hoặc người có quyền Sửa. */
  public static boolean duocXuLy(Ctx c, CanhBao cb) {
    return CanhBao.HE_THONG.equals(cb.getNguon()) ? c.level(Perm.viec) != Level.none : cb.getNguoiTao().equals(c.me()) || c.canEdit(Perm.viec);
  }

  private CanhBao lay(Ctx c, String id) {
    CanhBao cb = c.canhBao(id);
    if (cb == null) throw ApiException.notFound("Không tìm thấy cảnh báo");
    if (!duocXuLy(c, cb)) throw ApiException.forbidden("Bạn không có quyền xử lý cảnh báo này");
    return cb;
  }

  private void capNhatXuLy(Ctx c, CanhBao cb, boolean xong, String ghiChu) {
    if (xong == (cb.getXuLyLuc() != null)) return;
    String gc = Texts.emptyToNull(Texts.trim(ghiChu));
    cb.setXuLyLuc(xong ? c.now() : null);
    cb.setNguoiXuLy(xong ? c.me() : null);
    cb.setGhiChuXuLy(xong ? gc : null);
    ghi(c, cb, xong ? "Đã xử lý" : "Mở lại", xong ? gc : null);
  }

  private static void ghi(Ctx c, CanhBao cb, String hanhDong, String ghiChu) {
    List<LichSuDuyet> ls = new ArrayList<>(cb.getLichSu() == null ? List.of() : cb.getLichSu());
    ls.add(new LichSuDuyet(c.now(), c.me(), hanhDong, ghiChu));
    cb.setLichSu(ls);
  }

  private CanhBao taoMoi(Ctx c, String nguon, String khoa, String muc, String noiDungIn, String anhHuongIn, String theoDoiIn, String hdbIn, String hdmIn) {
    String noiDung = Texts.trim(noiDungIn);
    if (noiDung.isEmpty()) throw ApiException.invalid("Nhập nội dung rủi ro");
    String anhHuong = Texts.trim(anhHuongIn);
    if (anhHuong.isEmpty()) throw ApiException.invalid("Nhập ảnh hưởng của rủi ro");
    if (muc == null || !MUC.contains(muc)) throw ApiException.invalid("Mức cảnh báo phải là P0, P1 hoặc P2");
    String theoDoi = Texts.emptyToNull(theoDoiIn);
    if (theoDoi != null && !ViecService.NHOM.contains(theoDoi)) throw ApiException.invalid("Người theo dõi không hợp lệ");
    String hdb = Texts.emptyToNull(hdbIn);
    String hdm = Texts.emptyToNull(hdmIn);
    if (hdb != null && hdm != null) throw ApiException.invalid("Chỉ gắn một hồ sơ liên quan");
    if (hdb != null && c.hdb(hdb) == null) throw ApiException.invalid("HĐ bán không tồn tại");
    if (hdm != null && c.hdm(hdm) == null) throw ApiException.invalid("HĐ mua không tồn tại");
    return new CanhBao(c.uid("CB"), maTiep(c), muc, noiDung, anhHuong, theoDoi, hdb, hdm, c.me(), c.now(), null, null, null, nguon, khoa, null,
        new ArrayList<>());
  }

  /** CB-0001, 0002… = số lớn nhất đang có + 1. */
  private static String maTiep(Ctx c) {
    int max = 0;
    for (CanhBao x : c.db().getCanhBao()) {
      String m = x.getMa();
      if (m != null && m.matches("CB-\\d+")) max = Math.max(max, Integer.parseInt(m.substring(3)));
    }
    return String.format("CB-%04d", max + 1);
  }
}
