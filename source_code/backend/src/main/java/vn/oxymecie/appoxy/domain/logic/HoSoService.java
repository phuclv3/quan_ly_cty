package vn.oxymecie.appoxy.domain.logic;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Ids;
import vn.oxymecie.appoxy.common.Texts;
import vn.oxymecie.appoxy.domain.model.FileRef;
import vn.oxymecie.appoxy.domain.model.HoSo;
import vn.oxymecie.appoxy.domain.model.HoaDon;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.perm.Level;
import vn.oxymecie.appoxy.domain.perm.Perm;

/** Hồ sơ hợp đồng & hoá đơn (NT-12, HDB-05/06). */
@Service
public class HoSoService {
  public static final List<String> CHU = List.of("HDB", "HDM", "HDPT");
  public static final List<String> LOAI = List.of("Hợp đồng", "BBGH/BBNT", "Hoá đơn", "Scan khác");

  private Perm permOfChu(String chu) {
    return "HDB".equals(chu) ? Perm.hdb : "HDM".equals(chu) ? Perm.hdm : Perm.phuTai;
  }

  /** Kiểm tra chủ hồ sơ tồn tại và quyền sửa (Sale "của mình" chỉ HĐ bán mình phụ trách). */
  private void quyen(Ctx c, String chu, String chuId) {
    if (chu == null || !CHU.contains(chu)) throw ApiException.invalid("Loại hợp đồng không hợp lệ");
    String owner = null;
    switch (chu) {
      case "HDB" -> {
        HopDongBan h = c.hdb(chuId);
        if (h == null) throw ApiException.notFound("Không tìm thấy HĐ bán");
        owner = Texts.emptyToNull(h.getSale());
      }
      case "HDM" -> {
        if (c.hdm(chuId) == null) throw ApiException.notFound("Không tìm thấy HĐ mua");
      }
      default -> {
        if (c.pt(chuId) == null) throw ApiException.notFound("Không tìm thấy HĐ Phú Tài");
      }
    }
    c.require(permOfChu(chu), Level.edit, owner);
  }

  private HoSo hoSoCua(Ctx c, String chu, String chuId, String loai) {
    return c.db().getHoSo().stream().filter(h -> h.getChu().equals(chu) && h.getChuId().equals(chuId) && h.getLoai().equals(loai))
        .findFirst().orElse(null);
  }

  /** Gắn các tệp đã tải lên (POST /api/tep) vào hồ sơ theo loại; hồ sơ tự tích "Đã lưu". */
  public HoSo uploadHoSo(Ctx c, String chu, String chuId, String loai, List<String> fileIds) {
    quyen(c, chu, chuId);
    if (loai == null || !LOAI.contains(loai)) throw ApiException.invalid("Loại hồ sơ không hợp lệ");
    if (fileIds == null || fileIds.isEmpty()) throw ApiException.invalid("Chưa chọn tệp");
    List<FileRef> refs = new ArrayList<>();
    for (String id : fileIds) {
      FileRef f = c.tep(id);
      if (f == null) throw ApiException.invalid("Tệp chưa được tải lên máy chủ");
      refs.add(f);
    }
    HoSo cu = hoSoCua(c, chu, chuId, loai);
    if (cu != null) {
      for (FileRef f : refs) if (cu.getFiles().stream().noneMatch(x -> x.getId().equals(f.getId()))) cu.getFiles().add(f);
      cu.setDaLuu(true);
      return cu;
    }
    HoSo h = new HoSo(c.uid("HS"), chu, chuId, loai, refs, true, false, null);
    Ctx.upsert(c.db().getHoSo(), h, HoSo::getId);
    return h;
  }

  /** Tích tay Đã lưu (bản giấy — bắt buộc ghi chú) / Đã scan. */
  public HoSo setHoSoCo(Ctx c, String chu, String chuId, String loai, Boolean daLuu, Boolean daScan, String ghiChu) {
    quyen(c, chu, chuId);
    if (loai == null || !LOAI.contains(loai)) throw ApiException.invalid("Loại hồ sơ không hợp lệ");
    HoSo cu = hoSoCua(c, chu, chuId, loai);
    HoSo h = cu != null ? cu : new HoSo(c.uid("HS"), chu, chuId, loai, new ArrayList<>(), false, false, null);
    if (daLuu != null) h.setDaLuu(daLuu);
    if (daScan != null) h.setDaScan(daScan);
    if (ghiChu != null) h.setGhiChu(ghiChu);
    if (Boolean.TRUE.equals(daLuu) && h.getFiles().isEmpty() && Texts.blank(h.getGhiChu()))
      throw ApiException.invalid("Tích \"Đã lưu\" bản giấy cần ghi chú");
    if (cu == null) Ctx.upsert(c.db().getHoSo(), h, HoSo::getId);
    return h;
  }

  public HoaDon saveHoaDon(Ctx c, HoaDon x) {
    quyen(c, x.getChu(), x.getChuId());
    if (Texts.blank(x.getSoHoaDon()) || Texts.blank(x.getNgayHoaDon())) throw ApiException.invalid("Số hoá đơn và Ngày hoá đơn là bắt buộc");
    if (x.getGiaTri() < 0) throw ApiException.invalid("Giá trị hoá đơn không âm");
    x.setFileId(Texts.emptyToNull(x.getFileId()));
    if (x.getFileId() != null && c.tep(x.getFileId()) == null) throw ApiException.invalid("Tệp hoá đơn chưa được tải lên máy chủ");
    HoaDon cu = x.getId() == null ? null : c.db().getHoaDon().stream().filter(h -> h.getId().equals(x.getId())).findFirst().orElse(null);
    if (cu != null && (!cu.getChu().equals(x.getChu()) || !cu.getChuId().equals(x.getChuId()))) throw ApiException.conflict("Hoá đơn thuộc hợp đồng khác");
    if (cu == null) x.setId(Ids.safe(x.getId()) ? x.getId() : c.uid("HDN"));
    Ctx.upsert(c.db().getHoaDon(), x, HoaDon::getId);
    return x;
  }
}
