package vn.oxymecie.appoxy.domain.logic;

import vn.oxymecie.appoxy.domain.model.TrangThai;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Service;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Texts;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.model.ChiPhiHD;
import vn.oxymecie.appoxy.domain.model.DongTienPT;
import vn.oxymecie.appoxy.domain.model.FileRef;
import vn.oxymecie.appoxy.domain.model.HoSo;
import vn.oxymecie.appoxy.domain.model.HoaDon;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.HopDongMua;
import vn.oxymecie.appoxy.domain.model.HopDongPhuTai;
import vn.oxymecie.appoxy.domain.model.KhachHang;
import vn.oxymecie.appoxy.domain.model.Kho;
import vn.oxymecie.appoxy.domain.model.LoaiChiPhi;
import vn.oxymecie.appoxy.domain.model.LoaiHang;
import vn.oxymecie.appoxy.domain.model.NguonTien;
import vn.oxymecie.appoxy.domain.model.NhaCungCap;
import vn.oxymecie.appoxy.domain.model.PhieuKho;
import vn.oxymecie.appoxy.domain.model.PhieuThuChi;
import vn.oxymecie.appoxy.domain.model.YeuCauXoa;
import vn.oxymecie.appoxy.domain.perm.Level;
import vn.oxymecie.appoxy.domain.perm.Perm;
import vn.oxymecie.appoxy.domain.perm.Quyen;

/**
 * Duyệt xoá (NT-11): mọi xoá bản ghi đã phát sinh đi qua yêu cầu → người khác duyệt.
 * Khi duyệt: kiểm tra lại tham chiếu, rồi xoá kèm dữ liệu phụ thuộc (hồ sơ, hoá đơn, dòng tiền tự động…).
 */
@Service
public class DuyetXoaService {
  public static final Set<String> LOAI = Set.of("PhieuThuChi", "ChiPhiThucHienHD", "HopDongBan", "HopDongMua", "PhieuKho", "HopDongPhuTai",
      "HoaDon", "HoSo", "DongTienPhuTai", "DM_KhachHang", "DM_NCC", "DM_NguonTien", "DM_LoaiChiPhi", "DM_Kho", "DM_LoaiHang");

  private final HdmService hdm;

  public DuyetXoaService(HdmService hdm) {
    this.hdm = hdm;
  }

  public YeuCauXoa guiYeuCauXoa(Ctx c, String loai, String maDoiTuong, String moTa, String lyDo) {
    if (c.level(Perm.duyetXoa) == Level.none) throw ApiException.forbidden("Tài khoản của bạn không gửi được yêu cầu xoá");
    if (loai == null || !LOAI.contains(loai)) throw ApiException.invalid("Loại đối tượng không hợp lệ");
    if (Texts.blank(lyDo)) throw ApiException.invalid("Cần nhập lý do xoá");
    if (!tonTai(c, loai, maDoiTuong)) throw ApiException.notFound("Không tìm thấy bản ghi cần xoá");
    if (c.dangChoXoa(loai, maDoiTuong)) throw ApiException.conflict("Bản ghi này đang có yêu cầu xoá chờ duyệt");
    String khoa = khoaXoa(c, loai, maDoiTuong);
    if (khoa != null) throw ApiException.conflict(khoa);
    String vuong = thamChieu(c, loai, maDoiTuong);
    if (vuong != null) throw ApiException.conflict(vuong);
    YeuCauXoa y = new YeuCauXoa(Ctx.nextMa("YC", c.db().getYeuCauXoa().stream().map(YeuCauXoa::getId).toList()), loai, maDoiTuong,
        Texts.nz(moTa), lyDo.trim(), c.me(), c.now(), TrangThai.CHO_DUYET, null, null, null);
    Ctx.upsert(c.db().getYeuCauXoa(), y, YeuCauXoa::getId);
    return y;
  }

  public boolean canDuyetXoa(Ctx c, YeuCauXoa y) {
    return c.canApprove(Perm.duyetXoa) || (c.canApprove(Perm.duyetXoaKT) && Quyen.KE_TOAN_DUYET_XOA.contains(y.getLoai()));
  }

  /** Không tự duyệt / từ chối yêu cầu do chính mình gửi (nguyên tắc 2 người) — trừ quyền KT-07-TD. */
  public boolean duyetXoaDuoc(Ctx c, YeuCauXoa y) {
    return canDuyetXoa(c, y) && (!Objects.equals(y.getNguoiGui(), c.me()) || c.canEdit(Perm.tuDuyet));
  }

  private YeuCauXoa choDuyet(Ctx c, String id) {
    YeuCauXoa y = c.db().getYeuCauXoa().stream().filter(x -> x.getId().equals(id)).findFirst().orElse(null);
    if (y == null || !TrangThai.CHO_DUYET.equals(y.getTrangThai())) throw ApiException.conflict("Yêu cầu không còn chờ duyệt");
    return y;
  }

  public void rutYeuCau(Ctx c, String id) {
    YeuCauXoa y = choDuyet(c, id);
    if (!Objects.equals(y.getNguoiGui(), c.me())) throw ApiException.forbidden("Chỉ người gửi được rút yêu cầu");
    y.setTrangThai(TrangThai.DA_RUT);
    y.setNgayDuyet(c.now());
  }

  public void tuChoiXoa(Ctx c, String id, String lyDo) {
    YeuCauXoa y = choDuyet(c, id);
    if (!canDuyetXoa(c, y)) throw ApiException.forbidden("Bạn không có quyền duyệt yêu cầu này");
    if (!duyetXoaDuoc(c, y)) throw ApiException.forbidden("Không tự duyệt yêu cầu xoá do chính mình gửi — người khác duyệt, hoặc bấm \"Rút yêu cầu\"");
    if (Texts.blank(lyDo)) throw ApiException.invalid("Cần nhập lý do từ chối");
    y.setTrangThai(TrangThai.TU_CHOI);
    y.setLyDoTuChoi(lyDo);
    y.setNguoiDuyet(c.me());
    y.setNgayDuyet(c.now());
  }

  public void duyetXoa(Ctx c, String id) {
    YeuCauXoa y = choDuyet(c, id);
    if (!canDuyetXoa(c, y)) throw ApiException.forbidden("Bạn không có quyền duyệt yêu cầu này");
    if (!duyetXoaDuoc(c, y)) throw ApiException.forbidden("Không tự duyệt yêu cầu xoá do chính mình gửi — người khác duyệt, hoặc bấm \"Rút yêu cầu\"");
    String vuong = thamChieu(c, y.getLoai(), y.getMaDoiTuong());
    if (vuong != null) throw ApiException.conflict(vuong);
    thucHienXoa(c, y.getLoai(), y.getMaDoiTuong());
    y.setTrangThai(TrangThai.DA_DUYET);
    y.setNguoiDuyet(c.me());
    y.setNgayDuyet(c.now());
  }

  private boolean tonTai(Ctx c, String loai, String id) {
    if (Texts.blank(id)) return false;
    return switch (loai) {
      case "PhieuThuChi" -> c.phieu(id) != null;
      case "ChiPhiThucHienHD" -> c.chiPhi(id) != null;
      case "HopDongBan" -> c.hdb(id) != null;
      case "HopDongMua" -> c.hdm(id) != null;
      case "PhieuKho" -> c.phieuKho(id) != null;
      case "HopDongPhuTai" -> c.pt(id) != null;
      case "HoaDon" -> c.db().getHoaDon().stream().anyMatch(x -> x.getId().equals(id));
      case "HoSo" -> {
        String[] p = id.split(":", 2);
        yield p.length == 2 && c.db().getHoSo().stream().anyMatch(h -> h.getId().equals(p[0]) && h.getFiles().stream().anyMatch(f -> f.getId().equals(p[1])));
      }
      case "DongTienPhuTai" -> c.db().getDongTienPT().stream().anyMatch(x -> x.getId().equals(id));
      case "DM_KhachHang" -> c.kh(id) != null;
      case "DM_NCC" -> c.ncc(id) != null;
      case "DM_NguonTien" -> c.nguon(id) != null;
      case "DM_LoaiChiPhi" -> c.lcp(id) != null;
      case "DM_Kho" -> c.kho(id) != null;
      case "DM_LoaiHang" -> c.loaiHang(id) != null;
      default -> false;
    };
  }

  /** Lý do không gửi được yêu cầu xoá (đang khoá / được tham chiếu). */
  public String lyDoKhongXoa(Ctx c, String loai, String id) {
    String k = khoaXoa(c, loai, id);
    return k != null ? k : thamChieu(c, loai, id);
  }

  /** HĐ đã tất toán không xoá được — mở lại trước; phiếu sinh từ đợt TT của HĐ đã tất toán cũng vậy. */
  private String khoaXoa(Ctx c, String loai, String id) {
    if ("HopDongBan".equals(loai) && c.hdb(id) != null && TrangThai.DA_TAT_TOAN.equals(c.hdb(id).getTrangThai())) return "HĐ đã tất toán — mở lại HĐ trước khi xoá";
    if ("HopDongMua".equals(loai) && c.hdm(id) != null && TrangThai.DA_TAT_TOAN.equals(c.hdm(id).getTrangThai())) return "HĐ đã tất toán — mở lại HĐ trước khi xoá";
    if ("HopDongPhuTai".equals(loai) && c.pt(id) != null && TrangThai.DA_TAT_TOAN.equals(c.pt(id).getTrangThai())) return "HĐ đã tất toán — không xoá được";
    if ("PhieuThuChi".equals(loai)) {
      PhieuThuChi p = c.phieu(id);
      var ps = p == null ? null : p.getPhatSinh();
      if (ps != null) {
        boolean ban = "HDB-DotTT".equals(ps.getLoai());
        String tt = ban ? (c.hdb(ps.getHdId()) == null ? null : c.hdb(ps.getHdId()).getTrangThai())
            : (c.hdm(ps.getHdId()) == null ? null : c.hdm(ps.getHdId()).getTrangThai());
        String so = ban ? (c.hdb(ps.getHdId()) == null ? "" : c.hdb(ps.getHdId()).getSoHD()) : (c.hdm(ps.getHdId()) == null ? "" : c.hdm(ps.getHdId()).getSoHD());
        if (TrangThai.DA_TAT_TOAN.equals(tt)) return (ban ? "HĐ bán " : "HĐ mua ") + so + " đã tất toán — mở lại HĐ trước khi xoá phiếu";
      }
    }
    return null;
  }

  /** Không xoá bản ghi đang được tham chiếu — phải xoá bản ghi con trước (NT-11). */
  private String thamChieu(Ctx c, String loai, String id) {
    var d = c.db();
    switch (loai) {
      case "HopDongBan" -> {
        if (coKho(c, id)) return "HĐ đã có phiếu kho — huỷ phiếu kho trước";
        if (d.getPhieuThuChi().stream().anyMatch(p -> p.getPhatSinh() != null && "HDB-DotTT".equals(p.getPhatSinh().getLoai())
            && id.equals(p.getPhatSinh().getHdId()) && !TrangThai.TU_CHOI.equals(p.getTrangThai())))
          return "HĐ đã có phiếu thu từ đợt thanh toán — xoá phiếu thu trước";
        if (d.getChiPhiHD().stream().anyMatch(x -> id.equals(x.getHdbId()))) return "HĐ đã có chi phí thực hiện — xoá chi phí trước";
        if (d.getHopDongMua().stream().anyMatch(m -> Calc.hdmChoHdb(m, id))) return "Có HĐ mua đang trỏ tới HĐ này — bỏ liên kết trước";
        if (d.getDeNghiVatTu().stream().anyMatch(x -> id.equals(x.getHdbId()) && x.getLyDoHuy() == null)) return "HĐ có đề nghị cấp vật tư — huỷ đề nghị trước";
        return null;
      }
      case "HopDongMua" -> {
        if (coKho(c, id)) return "HĐ đã có phiếu nhập — huỷ phiếu nhập trước";
        if (d.getHopDongPhuTai().stream().anyMatch(p -> p.getHdMua().contains(id))) return "HĐ đang làm giá đầu vào của HĐ Phú Tài";
        HopDongMua m = c.hdm(id);
        if (m != null && m.getDotTT().stream().anyMatch(x -> x.getPhieuChiId() != null)) return "HĐ đã có phiếu chi trả NCC — xoá phiếu chi trước";
        return null;
      }
      case "PhieuThuChi" -> {
        if (d.getPhieuThuChi().stream().anyMatch(p -> id.equals(p.getPhieuTamUngGoc()) && !TrangThai.TU_CHOI.equals(p.getTrangThai())))
          return "Phiếu tạm ứng đã có quyết toán";
        return null;
      }
      case "PhieuKho" -> {
        PhieuKho p = c.phieuKho(id);
        if (p == null || !"Nhập".equals(p.getLoai())) return null;
        Set<String> los = new HashSet<>();
        for (int i = 0; i < p.getDong().size(); i++) los.add(Calc.maLo(p, i));
        PhieuKho x = d.getPhieuKho().stream().filter(q -> "Xuất".equals(q.getLoai()) && TrangThai.HIEU_LUC.equals(q.getTrangThai())
            && q.getDong().stream().anyMatch(r -> r.getLo() != null && los.contains(r.getLo()))).findFirst().orElse(null);
        return x != null ? "Lô của phiếu này đã xuất ở phiếu " + x.getSoPhieu() + " — huỷ phiếu xuất trước" : null;
      }
      case "DM_KhachHang" -> {
        return d.getHopDongBan().stream().anyMatch(h -> id.equals(h.getMaKH())) || d.getHopDongPhuTai().stream().anyMatch(h -> id.equals(h.getMaKH()))
            ? "Khách hàng đã có hợp đồng" : null;
      }
      case "DM_NCC" -> {
        if (d.getHopDongMua().stream().anyMatch(m -> id.equals(m.getMaNCC()))) return "Nhà cung cấp đã có HĐ mua";
        return d.getPhieuKho().stream().anyMatch(p -> id.equals(p.getNcc())) ? "Nhà cung cấp đã có phiếu nhập kho" : null;
      }
      case "DM_NguonTien" -> {
        if (d.getPhieuThuChi().stream().anyMatch(p -> id.equals(p.getNguonTien()) || id.equals(p.getNguonTienDen()))
            || d.getChiPhiHD().stream().anyMatch(x -> id.equals(x.getNguonTien())))
          return "Nguồn đã có phiếu — chỉ chuyển Ngưng";
        if (d.getHopDongBan().stream().anyMatch(h -> h.getDotTT().stream().anyMatch(x -> id.equals(x.getNguonTienNhan())))
            || d.getHopDongMua().stream().anyMatch(m -> m.getDotTT().stream().anyMatch(x -> id.equals(x.getNguonTien()))))
          return "Nguồn đã dùng ở đợt thanh toán hợp đồng — chỉ chuyển Ngưng";
        return null;
      }
      case "DM_LoaiChiPhi" -> {
        return d.getPhieuThuChi().stream().anyMatch(p -> id.equals(p.getLoaiChiPhi())) || d.getChiPhiHD().stream().anyMatch(x -> id.equals(x.getLoaiChiPhi()))
            ? "Loại đã dùng — chỉ ngưng" : null;
      }
      case "DM_Kho" -> {
        if (Calc.KHO_CHUYEN_THANG.equals(id)) return "\"Chuyển thẳng\" là vị trí hệ thống";
        return d.getPhieuKho().stream().anyMatch(p -> id.equals(p.getKho())) || d.getKiemKe().stream().anyMatch(k -> id.equals(k.getKho()))
            ? "Kho đã có phiếu — chỉ ngưng" : null;
      }
      case "DM_LoaiHang" -> {
        boolean dung = d.getPhieuKho().stream().anyMatch(p -> p.getDong().stream().anyMatch(x -> id.equals(x.getLoaiHang())))
            || d.getHopDongMua().stream().anyMatch(m -> m.getChiTiet().stream().anyMatch(x -> id.equals(x.getLoaiHang())))
            || d.getHopDongBan().stream().anyMatch(h -> h.getDongHang() != null && h.getDongHang().stream().anyMatch(x -> id.equals(x.getLoaiHang())))
            || d.getDeNghiVatTu().stream().anyMatch(n -> n.getDong().stream().anyMatch(x -> id.equals(x.getLoaiHang())))
            || d.getKiemKe().stream().anyMatch(k -> k.getDong().stream().anyMatch(x -> id.equals(x.getLoaiHang())));
        return dung ? "Loại hàng đã dùng — chỉ ngưng" : null;
      }
      default -> {
        return null;
      }
    }
  }

  private static boolean coKho(Ctx c, String hdId) {
    return c.db().getPhieuKho().stream().anyMatch(p -> hdId.equals(p.getHdId()) && TrangThai.HIEU_LUC.equals(p.getTrangThai()));
  }

  private void xoaHoSo(Ctx c, String chu, String id) {
    for (HoSo h : c.db().getHoSo()) if (chu.equals(h.getChu()) && id.equals(h.getChuId())) for (FileRef f : h.getFiles()) c.xoaTep(f.getId());
    c.db().getHoSo().removeIf(x -> chu.equals(x.getChu()) && id.equals(x.getChuId()));
    for (HoaDon x : c.db().getHoaDon()) if (chu.equals(x.getChu()) && id.equals(x.getChuId()) && x.getFileId() != null) c.xoaTep(x.getFileId());
    c.db().getHoaDon().removeIf(x -> chu.equals(x.getChu()) && id.equals(x.getChuId()));
  }

  private void thucHienXoa(Ctx c, String loai, String id) {
    var d = c.db();
    switch (loai) {
      case "PhieuThuChi" -> {
        PhieuThuChi p = c.phieu(id);
        Ctx.drop(d.getPhieuThuChi(), PhieuThuChi::getId, id);
        // Quyết toán đã bị từ chối còn trỏ tới tạm ứng này → bỏ liên kết.
        for (PhieuThuChi q : d.getPhieuThuChi()) if (id.equals(q.getPhieuTamUngGoc())) q.setPhieuTamUngGoc(null);
        if (p != null) for (FileRef f : p.getFiles()) c.xoaTep(f.getId());
        // Bỏ liên kết ở đợt thanh toán đã sinh ra phiếu.
        if (p != null && p.getPhatSinh() != null && "HDM-DotTT".equals(p.getPhatSinh().getLoai())) {
          HopDongMua m = c.hdm(p.getPhatSinh().getHdId());
          if (m != null) for (var x : m.getDotTT()) if (id.equals(x.getPhieuChiId())) {
            x.setPhieuChiId(null);
            x.setNgayTra(null);
            x.setSoTienTra(null);
          }
        }
        if (p != null && p.getPhatSinh() != null && "HDB-DotTT".equals(p.getPhatSinh().getLoai())) {
          HopDongBan h = c.hdb(p.getPhatSinh().getHdId());
          if (h != null) for (var x : h.getDotTT()) if (id.equals(x.getPhieuThuId())) {
            x.setPhieuThuId(null);
            x.setNgayThu(null);
            x.setSoTienThu(null);
            x.setNguonTienNhan(null);
          }
        }
        // Đợt nào khác vẫn trỏ tới phiếu (dữ liệu cũ) cũng bỏ liên kết để không vướng khoá ngoại.
        for (HopDongBan h : d.getHopDongBan()) for (var x : h.getDotTT()) if (id.equals(x.getPhieuThuId())) x.setPhieuThuId(null);
        for (HopDongMua m : d.getHopDongMua()) for (var x : m.getDotTT()) if (id.equals(x.getPhieuChiId())) x.setPhieuChiId(null);
      }
      case "ChiPhiThucHienHD" -> {
        ChiPhiHD x = c.chiPhi(id);
        if (x != null) for (FileRef f : x.getFiles()) c.xoaTep(f.getId());
        Ctx.drop(d.getChiPhiHD(), ChiPhiHD::getId, id);
      }
      case "HopDongBan" -> {
        xoaHoSo(c, "HDB", id);
        // Việc được giao gắn HĐ: giữ việc, bỏ liên kết; đề nghị vật tư đã huỷ của HĐ: xoá theo.
        for (var v : d.getViecGiao()) if (id.equals(v.getHdbId())) v.setHdbId(null);
        for (var cb : d.getCanhBao()) if (id.equals(cb.getHdbId())) cb.setHdbId(null);
        d.getDeNghiVatTu().removeIf(x -> id.equals(x.getHdbId()));
        Ctx.drop(d.getHopDongBan(), HopDongBan::getId, id);
      }
      case "HopDongMua" -> {
        xoaHoSo(c, "HDM", id);
        for (var cb : d.getCanhBao()) if (id.equals(cb.getHdmId())) cb.setHdmId(null);
        Ctx.drop(d.getHopDongMua(), HopDongMua::getId, id);
      }
      case "HopDongPhuTai" -> {
        xoaHoSo(c, "HDPT", id);
        d.getDongTienPT().removeIf(x -> id.equals(x.getHdptId()));
        Ctx.drop(d.getHopDongPhuTai(), HopDongPhuTai::getId, id);
      }
      case "PhieuKho" -> {
        // KHO-08: phiếu chuyển "Đã huỷ", tồn tính lại; cập nhật trạng thái nhận của HĐ Mua.
        PhieuKho p = c.phieuKho(id);
        if (p == null) return;
        p.setTrangThai(TrangThai.DA_HUY);
        if ("Tự động HĐ Mua".equals(p.getNguonGoc()) && p.getHdId() != null) hdm.capNhatTrangThaiNhan(c, p.getHdId());
        if ("Xuất".equals(p.getLoai()) && p.getHdId() != null && c.hdb(p.getHdId()) != null) {
          HopDongBan h = c.hdb(p.getHdId());
          boolean conGiao = d.getPhieuKho().stream().anyMatch(x -> p.getHdId().equals(x.getHdId())
              && "Xuất".equals(x.getLoai()) && TrangThai.HIEU_LUC.equals(x.getTrangThai()));
          if (h != null && TrangThai.DANG_GIAO_HANG.equals(h.getTrangThai()) && !conGiao) h.setTrangThai(TrangThai.HIEU_LUC);
        }
      }
      case "HoaDon" -> {
        HoaDon x = d.getHoaDon().stream().filter(h -> h.getId().equals(id)).findFirst().orElse(null);
        if (x != null && x.getFileId() != null) c.xoaTep(x.getFileId());
        Ctx.drop(d.getHoaDon(), HoaDon::getId, id);
      }
      case "HoSo" -> {
        String[] parts = id.split(":", 2);
        for (HoSo h : d.getHoSo()) {
          if (!h.getId().equals(parts[0])) continue;
          h.getFiles().removeIf(f -> f.getId().equals(parts[1]));
          h.setDaLuu(!h.getFiles().isEmpty() ? h.isDaLuu() : !Texts.blank(h.getGhiChu()) && h.isDaLuu());
        }
        c.xoaTep(parts[1]);
      }
      case "DongTienPhuTai" -> Ctx.drop(d.getDongTienPT(), DongTienPT::getId, id);
      case "DM_KhachHang" -> Ctx.drop(d.getKhachHang(), KhachHang::getId, id);
      case "DM_NCC" -> Ctx.drop(d.getNcc(), NhaCungCap::getId, id);
      case "DM_NguonTien" -> Ctx.drop(d.getNguonTien(), NguonTien::getId, id);
      case "DM_LoaiChiPhi" -> Ctx.drop(d.getLoaiChiPhi(), LoaiChiPhi::getId, id);
      case "DM_Kho" -> Ctx.drop(d.getKho(), Kho::getId, id);
      case "DM_LoaiHang" -> {
        for (var a : d.getAnhXaTen()) if (id.equals(a.getLoaiHang())) {
          a.setLoaiHang(null);
          a.setLo(null);
        }
        Ctx.drop(d.getLoaiHang(), LoaiHang::getId, id);
      }
      default -> throw ApiException.invalid("Loại đối tượng không hợp lệ");
    }
  }

}
