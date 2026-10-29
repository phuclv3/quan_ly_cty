package vn.oxymecie.appoxy.web;

import vn.oxymecie.appoxy.domain.model.TrangThai;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.model.ChiPhiHD;
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.HopDongMua;
import vn.oxymecie.appoxy.domain.model.NguonTien;
import vn.oxymecie.appoxy.domain.model.PhieuThuChi;
import vn.oxymecie.appoxy.domain.logic.KeToanService;
import vn.oxymecie.appoxy.domain.perm.Level;
import vn.oxymecie.appoxy.domain.perm.Perm;
import vn.oxymecie.appoxy.web.dto.Req;

@Tag(name = "Kế toán", description = "Sổ quỹ (KT-04…10), chi phí thực hiện HĐ (KT-12…15), số dư nguồn tiền (KT-02/11), công nợ (KT-17)")
@RestController
@RequestMapping("/api")
public class KeToanController {
  private final Cmd cmd;
  private final KeToanService svc;

  private final vn.oxymecie.appoxy.domain.logic.BaoCaoKtService baoCao;

  public KeToanController(Cmd cmd, KeToanService svc, vn.oxymecie.appoxy.domain.logic.BaoCaoKtService baoCao) {
    this.cmd = cmd;
    this.svc = svc;
    this.baoCao = baoCao;
  }

  // ── Sổ quỹ ───────────────────────────────────────────────────────────

  @Operation(summary = "Danh sách phiếu thu chi (lọc, phân trang)")
  @GetMapping("/phieu-thu-chi")
  public PageResult<PhieuThuChi> dsPhieu(@RequestParam(required = false) String q, @RequestParam(required = false) String loai,
      @RequestParam(required = false) String trangThai, @RequestParam(required = false) String nguonTien,
      @RequestParam(required = false) String tuNgay, @RequestParam(required = false) String denNgay,
      @RequestParam(defaultValue = "ngayLap,desc") String sort, @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    return PageResult.of(cmd.snapshot().getPhieuThuChi(), p -> PageResult.khop(q, p.getSoPhieu(), p.getNoiDung(), p.getNguoiNhan())
            && (loai == null || loai.equals(p.getLoai())) && (trangThai == null || trangThai.equals(p.getTrangThai()))
            && (nguonTien == null || nguonTien.equals(p.getNguonTien()) || nguonTien.equals(p.getNguonTienDen()))
            && PageResult.trongKhoang(p.getNgayLap(), tuNgay, denNgay),
        sort, Map.of("ngayLap", PhieuThuChi::getNgayLap, "soPhieu", PhieuThuChi::getSoPhieu, "trangThai", PhieuThuChi::getTrangThai), page, size);
  }

  @Operation(summary = "Lập phiếu (gui=true: gửi duyệt luôn)", description = "Số phiếu {TIEN_TO_TC}{yy}-{nnnn} do máy chủ cấp.")
  @PostMapping("/phieu-thu-chi")
  public CommandResponse<PhieuThuChi> taoPhieu(@RequestBody PhieuThuChi p, @RequestParam(defaultValue = "false") boolean gui) {
    return cmd.run(gui ? "PTC.guiDuyet" : "PTC.luuNhap", c -> {
      PhieuThuChi out = svc.savePhieu(c, p, gui, true);
      c.nhatKy("PhieuThuChi", out.getId(), out.getSoPhieu());
      return out;
    });
  }

  @Operation(summary = "Sửa phiếu Nháp / Từ chối (gui=true: gửi duyệt)")
  @PutMapping("/phieu-thu-chi/{id}")
  public CommandResponse<PhieuThuChi> suaPhieu(@PathVariable String id, @RequestBody PhieuThuChi p, @RequestParam(defaultValue = "false") boolean gui) {
    DanhMucController.idPath(id, p, PhieuThuChi::getId, PhieuThuChi::setId);
    return cmd.run(gui ? "PTC.guiDuyet" : "PTC.luuNhap", c -> {
      PhieuThuChi out = svc.savePhieu(c, p, gui, false);
      c.nhatKy("PhieuThuChi", id, out.getSoPhieu());
      return out;
    });
  }

  @Operation(summary = "Xoá thẳng phiếu Nháp", description = "Phiếu đã gửi duyệt phải gửi yêu cầu xoá (NT-11).")
  @DeleteMapping("/phieu-thu-chi/{id}")
  public CommandResponse<Void> xoaNhap(@PathVariable String id) {
    return cmd.run("PTC.xoaNhap", c -> {
      svc.xoaNhapPhieu(c, id);
      c.nhatKy("PhieuThuChi", id, "Xoá nháp");
      return null;
    });
  }

  @PostMapping("/phieu-thu-chi/{id}/rut-lai")
  public CommandResponse<Void> rutLai(@PathVariable String id) {
    return cmd.run("PTC.rutLai", c -> {
      svc.rutLaiPhieu(c, id);
      c.nhatKy("PhieuThuChi", id, "Rút lại");
      return null;
    });
  }

  @Operation(summary = "Duyệt phiếu (hàng loạt)", description = "Phiếu do chính mình lập bị bỏ qua (trả cảnh báo) trừ khi có quyền KT-07-TD.")
  @PostMapping("/phieu-thu-chi/duyet")
  public CommandResponse<String> duyet(@Valid @RequestBody Req.Ids r) {
    return cmd.run("PTC.duyet", c -> {
      String w = svc.duyetPhieu(c, r.ids());
      c.nhatKy("PhieuThuChi", String.join(",", r.ids()), "Duyệt");
      return w;
    });
  }

  @PostMapping("/phieu-thu-chi/tu-choi")
  public CommandResponse<Void> tuChoi(@Valid @RequestBody Req.TuChoi r) {
    return cmd.run("PTC.tuChoi", c -> {
      svc.tuChoiPhieu(c, r.ids(), r.lyDo());
      c.nhatKy("PhieuThuChi", String.join(",", r.ids()), "Từ chối: " + r.lyDo());
      return null;
    });
  }

  // ── Chi phí thực hiện HĐ ─────────────────────────────────────────────

  @GetMapping("/chi-phi-hd")
  public PageResult<ChiPhiHD> dsChiPhi(@RequestParam(required = false) String q, @RequestParam(required = false) String hdbId,
      @RequestParam(required = false) String trangThai, @RequestParam(required = false) String tuNgay,
      @RequestParam(required = false) String denNgay, @RequestParam(defaultValue = "ngay,desc") String sort,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
    return PageResult.of(cmd.snapshot().getChiPhiHD(), x -> PageResult.khop(q, x.getMaCP(), x.getNoiDung(), x.getNguoiNhan())
            && (hdbId == null || hdbId.equals(x.getHdbId())) && (trangThai == null || trangThai.equals(x.getTrangThai()))
            && PageResult.trongKhoang(x.getNgay(), tuNgay, denNgay),
        sort, Map.of("ngay", ChiPhiHD::getNgay, "maCP", ChiPhiHD::getMaCP), page, size);
  }

  @PostMapping("/chi-phi-hd")
  public CommandResponse<ChiPhiHD> taoChiPhi(@RequestBody ChiPhiHD x, @RequestParam(defaultValue = "false") boolean gui) {
    return cmd.run(gui ? "CP.guiDuyet" : "CP.luuNhap", c -> {
      ChiPhiHD out = svc.saveChiPhi(c, x, gui, true);
      c.nhatKy("ChiPhiThucHienHD", out.getId(), out.getMaCP());
      return out;
    });
  }

  @PutMapping("/chi-phi-hd/{id}")
  public CommandResponse<ChiPhiHD> suaChiPhi(@PathVariable String id, @RequestBody ChiPhiHD x, @RequestParam(defaultValue = "false") boolean gui) {
    DanhMucController.idPath(id, x, ChiPhiHD::getId, ChiPhiHD::setId);
    return cmd.run(gui ? "CP.guiDuyet" : "CP.luuNhap", c -> {
      ChiPhiHD out = svc.saveChiPhi(c, x, gui, false);
      c.nhatKy("ChiPhiThucHienHD", id, out.getMaCP());
      return out;
    });
  }

  @DeleteMapping("/chi-phi-hd/{id}")
  public CommandResponse<Void> xoaNhapChiPhi(@PathVariable String id) {
    return cmd.run("CP.xoaNhap", c -> {
      svc.xoaNhapChiPhi(c, id);
      c.nhatKy("ChiPhiThucHienHD", id, "Xoá nháp");
      return null;
    });
  }

  @PostMapping("/chi-phi-hd/{id}/rut-lai")
  public CommandResponse<Void> rutLaiChiPhi(@PathVariable String id) {
    return cmd.run("CP.rutLai", c -> {
      svc.rutLaiChiPhi(c, id);
      c.nhatKy("ChiPhiThucHienHD", id, "Rút lại");
      return null;
    });
  }

  @PostMapping("/chi-phi-hd/duyet")
  public CommandResponse<String> duyetChiPhi(@Valid @RequestBody Req.Ids r) {
    return cmd.run("CP.duyet", c -> {
      String w = svc.duyetChiPhi(c, r.ids());
      c.nhatKy("ChiPhiThucHienHD", String.join(",", r.ids()), "Duyệt");
      return w;
    });
  }

  @PostMapping("/chi-phi-hd/tu-choi")
  public CommandResponse<Void> tuChoiChiPhi(@Valid @RequestBody Req.TuChoi r) {
    return cmd.run("CP.tuChoi", c -> {
      svc.tuChoiChiPhi(c, r.ids(), r.lyDo());
      c.nhatKy("ChiPhiThucHienHD", String.join(",", r.ids()), "Từ chối: " + r.lyDo());
      return null;
    });
  }

  // ── Báo cáo kế toán ──────────────────────────────────────────────────

  @Operation(summary = "Số dư các nguồn tiền tại ngày (KT-02 / KT-11)", description = "Chỉ tính phiếu Đã duyệt.")
  @GetMapping("/nguon-tien/so-du")
  public List<Map<String, Object>> soDu(@RequestParam(required = false) String denNgay) {
    var u = Cmd.user();
    Db d = cmd.raw();
    var ctx = new vn.oxymecie.appoxy.domain.logic.Ctx(d, u.id(), java.time.Clock.systemUTC(), null, null);
    if (!ctx.canView(Perm.nguonTien) && !List.of(Level.view, Level.edit).contains(ctx.level(Perm.soQuy)))
      throw ApiException.forbidden("Cần quyền xem nguồn tiền (KT-01) hoặc sổ quỹ (KT-04)");
    List<Map<String, Object>> out = new ArrayList<>();
    for (NguonTien n : d.getNguonTien()) {
      Calc.SoDu s = Calc.soDuNguon(n.getId(), d, denNgay);
      out.add(Map.of("nguonTien", n.getId(), "ten", n.getTen(), "chiTiet", s));
    }
    return out;
  }

  @Operation(summary = "Báo cáo tổng quan kế toán",
      description = "Lợi nhuận gộp, công nợ (kèm tuổi nợ), dòng tiền theo tháng, dự báo tiền 30 ngày, số dư theo nguồn, thu chi theo danh mục, chi phí cố định, "
          + "kết quả kinh doanh tóm tắt. Cần quyền xem nguồn tiền (KT-01) và công nợ (KT-17). phapNhan: TAT_CA / OXY / KOXY / PHU_TAI; soSanh: khong / cungKy.")
  @GetMapping("/bao-cao/ke-toan")
  public vn.oxymecie.appoxy.domain.logic.BaoCaoKtService.Dto baoCaoKeToan(@RequestParam(defaultValue = "0") int nam,
      @RequestParam(required = false) Integer quy, @RequestParam(required = false) Integer thang,
      @RequestParam(defaultValue = "TAT_CA") String phapNhan, @RequestParam(defaultValue = "khong") String soSanh) {
    Db raw = cmd.raw();
    var ctx = new vn.oxymecie.appoxy.domain.logic.Ctx(raw, Cmd.user().id(), java.time.Clock.systemUTC(), null, null);
    if (!ctx.canView(Perm.nguonTien) || !ctx.canView(Perm.congNo)) throw ApiException.forbidden("Cần quyền xem nguồn tiền (KT-01) và công nợ (KT-17)");
    return baoCao.tao(raw, new vn.oxymecie.appoxy.domain.logic.BaoCaoKtService.Loc(nam, quy, thang, phapNhan, soSanh),
        java.time.LocalDate.now(vn.oxymecie.appoxy.common.Dates.VN));
  }

  public record CongNoDong(String id, String soHD, String doiTac, double giaTri, double daThanhToan, double conLai) {}

  public record CongNo(List<CongNoDong> phaiThu, List<CongNoDong> phaiTra) {}

  @Operation(summary = "Công nợ phải thu (HĐ bán) / phải trả (HĐ mua) — KT-17",
      description = "Quyền \"Xem của mình\" chỉ gồm HĐ mình phụ trách. Không tính HĐ Huỷ.")
  @GetMapping("/cong-no")
  public CongNo congNo() {
    var u = Cmd.user();
    Db raw = cmd.raw();
    var ctx = new vn.oxymecie.appoxy.domain.logic.Ctx(raw, u.id(), java.time.Clock.systemUTC(), null, null);
    if (!ctx.canView(Perm.congNo)) throw ApiException.forbidden("Cần quyền Công nợ (KT-17)");
    boolean rieng = ctx.ownOnly(Perm.congNo);
    Db d = cmd.snapshot();
    List<CongNoDong> thu = new ArrayList<>();
    for (HopDongBan h : d.getHopDongBan()) {
      if (TrangThai.HUY.equals(h.getTrangThai()) || TrangThai.BAO_GIA.equals(h.getTrangThai())) continue;
      if (rieng && !u.id().equals(h.getSale())) continue;
      Calc.HdbCalc c = Calc.hdbCalc(h, raw);
      if (c.conPhaiThu() != 0) thu.add(new CongNoDong(h.getId(), h.getSoHD(), h.getTenKH(), c.giaTriQT(), c.daThu(), c.conPhaiThu()));
    }
    List<CongNoDong> tra = new ArrayList<>();
    if (!rieng) for (HopDongMua m : d.getHopDongMua()) {
      if (TrangThai.HUY.equals(m.getTrangThai()) || TrangThai.NHAP.equals(m.getTrangThai())) continue;
      Calc.HdmCalc c = Calc.hdmCalc(m, raw);
      if (c.conPhaiTra() != 0) tra.add(new CongNoDong(m.getId(), m.getSoHD(), m.getTenNCC(), c.tong(), c.daTra(), c.conPhaiTra()));
    }
    return new CongNo(thu, tra);
  }
}
