package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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
import vn.oxymecie.appoxy.domain.logic.HdbService;
import vn.oxymecie.appoxy.domain.logic.HdmService;
import vn.oxymecie.appoxy.domain.model.ChiPhiHD;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.HopDongMua;
import vn.oxymecie.appoxy.domain.model.PhieuKho;
import vn.oxymecie.appoxy.domain.model.PhieuThuChi;
import vn.oxymecie.appoxy.web.dto.Req;

@Tag(name = "Hợp đồng", description = "Hợp đồng bán (HDB-01…13), đề nghị cấp vật tư, hợp đồng mua (HDM-01…10)")
@RestController
@RequestMapping("/api")
public class HopDongController {
  private final Cmd cmd;
  private final HdbService hdb;
  private final HdmService hdm;

  public HopDongController(Cmd cmd, HdbService hdb, HdmService hdm) {
    this.cmd = cmd;
    this.hdb = hdb;
    this.hdm = hdm;
  }

  // ═══════════════════════════ HĐ BÁN ════════════════════════════════

  @Operation(summary = "Danh sách HĐ bán", description = "Sale (quyền \"của mình\") chỉ thấy HĐ mình phụ trách.")
  @GetMapping("/hop-dong-ban")
  public PageResult<HopDongBan> dsHdb(@RequestParam(required = false) String q, @RequestParam(required = false) String trangThai,
      @RequestParam(required = false) String sale, @RequestParam(required = false) String maKH,
      @RequestParam(required = false) String tuNgay, @RequestParam(required = false) String denNgay,
      @RequestParam(defaultValue = "ngayKy,desc") String sort, @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    return PageResult.of(cmd.snapshot().getHopDongBan(), h -> PageResult.khop(q, h.getSoHD(), h.getTenKH(), h.getMst(), h.getGhiChu())
            && (trangThai == null || trangThai.equals(h.getTrangThai())) && (sale == null || sale.equals(h.getSale()))
            && (maKH == null || maKH.equals(h.getMaKH())) && PageResult.trongKhoang(h.getNgayKy(), tuNgay, denNgay),
        sort, Map.of("ngayKy", HopDongBan::getNgayKy, "soHD", HopDongBan::getSoHD, "tenKH", HopDongBan::getTenKH,
            "truocVAT", HopDongBan::getTruocVAT, "taoLuc", HopDongBan::getTaoLuc), page, size);
  }

  public record HdbChiTiet(HopDongBan hopDong, Calc.HdbCalc tinhToan, String trangThaiKeTiep) {}

  @Operation(summary = "Chi tiết HĐ bán + số liệu tự tính (giá trị sau VAT, thuế TNDN, đã thu, còn phải thu, giá vốn, hồ sơ thiếu)")
  @GetMapping("/hop-dong-ban/{id}")
  public HdbChiTiet chiTietHdb(@PathVariable String id) {
    HopDongBan h = cmd.snapshot().getHopDongBan().stream().filter(x -> x.getId().equals(id)).findFirst()
        .orElseThrow(() -> ApiException.notFound("Không tìm thấy HĐ"));
    var raw = cmd.raw();
    var ctx = new vn.oxymecie.appoxy.domain.logic.Ctx(raw, Cmd.user().id(), java.time.Clock.systemUTC(), null, null);
    return new HdbChiTiet(h, Calc.hdbCalc(h, raw), hdb.hdbKeTiep(ctx, h));
  }

  @Operation(summary = "Tạo HĐ bán / báo giá", description = "Trạng thái khởi đầu Báo giá; tham số thuế lấy theo cấu hình hiện hành.")
  @PostMapping("/hop-dong-ban")
  public CommandResponse<HopDongBan> taoHdb(@RequestBody HopDongBan h) {
    return cmd.run("HDB.tao", c -> {
      HopDongBan out = hdb.saveHdb(c, h, true);
      c.nhatKy("HopDongBan", out.getId(), out.getSoHD());
      return out;
    });
  }

  @Operation(summary = "Lưu HĐ bán (Tab 1 + Tab 3)", description = "Không đổi trạng thái; thực thu chỉ đổi qua ghi nhận thực thu.")
  @PutMapping("/hop-dong-ban/{id}")
  public CommandResponse<HopDongBan> suaHdb(@PathVariable String id, @RequestBody HopDongBan h) {
    DanhMucController.idPath(id, h, HopDongBan::getId, HopDongBan::setId);
    return cmd.run("HDB.sua", c -> {
      HopDongBan out = hdb.saveHdb(c, h, false);
      c.nhatKy("HopDongBan", id, out.getSoHD());
      return out;
    });
  }

  @Operation(summary = "Chuyển trạng thái kế tiếp (HDB-03)", description = "Báo giá → Hiệu lực → (Đang giao hàng tự chuyển) → Hoàn thành → Đã tất toán.")
  @PostMapping("/hop-dong-ban/{id}/chuyen-trang-thai")
  public CommandResponse<Void> chuyenHdb(@PathVariable String id, @Valid @RequestBody Req.ChuyenTrangThai r) {
    return cmd.run("HDB.chuyenTrangThai", c -> {
      hdb.chuyenTrangThaiHdb(c, id, r.toi());
      c.nhatKy("HopDongBan", id, "→ " + r.toi());
      return null;
    });
  }

  @Operation(summary = "Huỷ HĐ bán", description = "Chỉ khi chưa thu tiền, chưa xuất kho, không còn chi phí / đề nghị vật tư hiệu lực.")
  @PostMapping("/hop-dong-ban/{id}/huy")
  public CommandResponse<Void> huyHdb(@PathVariable String id, @Valid @RequestBody Req.LyDo r) {
    return cmd.run("HDB.huy", c -> {
      hdb.huyHdb(c, id, r.lyDo());
      c.nhatKy("HopDongBan", id, "Huỷ: " + r.lyDo());
      return null;
    });
  }

  @Operation(summary = "Mở lại HĐ đã tất toán (HDB-03-ML)")
  @PostMapping("/hop-dong-ban/{id}/mo-lai")
  public CommandResponse<Void> moLaiHdb(@PathVariable String id) {
    return cmd.run("HDB.moLai", c -> {
      hdb.moLaiHdb(c, id);
      c.nhatKy("HopDongBan", id, "Mở lại");
      return null;
    });
  }

  @Operation(summary = "Ghi nhận giao hàng → phiếu Xuất kho (HDB-04)", description = "Trừ theo lô chỉ định hoặc FIFO; chặn xuất quá tồn.")
  @PostMapping("/hop-dong-ban/{id}/giao-hang")
  public CommandResponse<PhieuKho> giaoHang(@PathVariable String id, @Valid @RequestBody Req.GiaoHang r) {
    return cmd.run("HDB.giaoHang", c -> {
      PhieuKho p = hdb.ghiNhanGiaoHang(c, id, r.ngay(), r.kho(), r.dong(), r.ghiChu());
      c.nhatKy("HopDongBan", id, "Giao hàng " + p.getSoPhieu());
      return p;
    });
  }

  @Operation(summary = "Ghi nhận thực thu một đợt (HDB-10) → phiếu Thu Chờ duyệt")
  @PostMapping("/hop-dong-ban/{id}/dot/{dot}/thuc-thu")
  public CommandResponse<PhieuThuChi> thucThu(@PathVariable String id, @PathVariable int dot, @Valid @RequestBody Req.ThucThu r) {
    return cmd.run("HDB.thucThu", c -> {
      PhieuThuChi p = hdb.ghiThucThu(c, id, dot, r.ngayThu(), r.soTienThu(), r.nguonTienNhan());
      c.nhatKy("HopDongBan", id, "Thực thu đợt " + dot + " — " + p.getSoPhieu());
      return p;
    });
  }

  @Operation(summary = "Thêm tiền trả khách (HDB-09) = chi phí HĐ loại Hoa hồng, gửi duyệt")
  @PostMapping("/hop-dong-ban/{id}/tien-tra-khach")
  public CommandResponse<ChiPhiHD> tienTraKhach(@PathVariable String id, @Valid @RequestBody Req.TienTraKhach r) {
    return cmd.run("HDB.tienTraKhach", c -> {
      ChiPhiHD x = hdb.themTienTraKhach(c, id, r.nguoiNhan(), r.soTien(), r.ngay(), r.nguonTien());
      c.nhatKy("HopDongBan", id, "Tiền trả khách " + x.getMaCP());
      return x;
    });
  }

  @Operation(summary = "Lập đề nghị cấp vật tư (mỗi dòng thiếu = 1 đề nghị)")
  @PostMapping("/hop-dong-ban/{id}/de-nghi-vat-tu")
  public CommandResponse<List<String>> deNghi(@PathVariable String id, @Valid @RequestBody Req.DeNghi r) {
    return cmd.run("DNVT.tao", c -> {
      List<String> ids = hdb.taoDeNghiVatTu(c, id, r.dong(), r.ghiChu());
      c.nhatKy("HopDongBan", id, "Đề nghị vật tư " + ids.size() + " phiếu");
      return ids;
    });
  }

  @PostMapping("/de-nghi-vat-tu/{id}/huy")
  public CommandResponse<Void> huyDeNghi(@PathVariable String id, @Valid @RequestBody Req.LyDo r) {
    return cmd.run("DNVT.huy", c -> {
      hdb.huyDeNghiVatTu(c, id, r.lyDo());
      c.nhatKy("DeNghiVatTu", id, "Huỷ: " + r.lyDo());
      return null;
    });
  }

  // ═══════════════════════════ HĐ MUA ════════════════════════════════

  @GetMapping("/hop-dong-mua")
  public PageResult<HopDongMua> dsHdm(@RequestParam(required = false) String q, @RequestParam(required = false) String trangThai,
      @RequestParam(required = false) String maNCC, @RequestParam(required = false) Boolean thuocPhuTai,
      @RequestParam(required = false) String tuNgay, @RequestParam(required = false) String denNgay,
      @RequestParam(defaultValue = "ngayKy,desc") String sort, @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    return PageResult.of(cmd.snapshot().getHopDongMua(), m -> PageResult.khop(q, m.getSoHD(), m.getTenNCC(), m.getGhiChu())
            && (trangThai == null || trangThai.equals(m.getTrangThai())) && (maNCC == null || maNCC.equals(m.getMaNCC()))
            && (thuocPhuTai == null || thuocPhuTai == m.isThuocPhuTai()) && PageResult.trongKhoang(m.getNgayKy(), tuNgay, denNgay),
        sort, Map.of("ngayKy", HopDongMua::getNgayKy, "soHD", HopDongMua::getSoHD, "tenNCC", HopDongMua::getTenNCC), page, size);
  }

  public record HdmChiTiet(HopDongMua hopDong, Calc.HdmCalc tinhToan) {}

  @GetMapping("/hop-dong-mua/{id}")
  public HdmChiTiet chiTietHdm(@PathVariable String id) {
    HopDongMua m = cmd.snapshot().getHopDongMua().stream().filter(x -> x.getId().equals(id)).findFirst()
        .orElseThrow(() -> ApiException.notFound("Không tìm thấy HĐ"));
    return new HdmChiTiet(m, Calc.hdmCalc(m, cmd.raw()));
  }

  @PostMapping("/hop-dong-mua")
  public CommandResponse<HopDongMua> taoHdm(@RequestBody HopDongMua m) {
    return cmd.run("HDM.tao", c -> {
      HopDongMua out = hdm.saveHdm(c, m, true);
      c.nhatKy("HopDongMua", out.getId(), out.getSoHD());
      return out;
    });
  }

  @Operation(summary = "Lưu HĐ mua", description = "Người chỉ có quyền Tab 4 (HDM-08) chỉ sửa đợt trả NCC, hoá đơn, checklist, nhập tay tổng.")
  @PutMapping("/hop-dong-mua/{id}")
  public CommandResponse<HopDongMua> suaHdm(@PathVariable String id, @RequestBody HopDongMua m) {
    DanhMucController.idPath(id, m, HopDongMua::getId, HopDongMua::setId);
    return cmd.run("HDM.sua", c -> {
      HopDongMua out = hdm.saveHdm(c, m, false);
      c.nhatKy("HopDongMua", id, out.getSoHD());
      return out;
    });
  }

  @Operation(summary = "Chuyển trạng thái HĐ mua", description = "Nháp → Đã ký; Đã ký / đang nhận / đã nhận đủ → Đã tất toán; Huỷ.")
  @PostMapping("/hop-dong-mua/{id}/chuyen-trang-thai")
  public CommandResponse<Void> chuyenHdm(@PathVariable String id, @Valid @RequestBody Req.ChuyenTrangThai r) {
    return cmd.run("HDM.chuyenTrangThai", c -> {
      hdm.chuyenTrangThaiHdm(c, id, r.toi());
      c.nhatKy("HopDongMua", id, "→ " + r.toi());
      return null;
    });
  }

  @PostMapping("/hop-dong-mua/{id}/mo-lai")
  public CommandResponse<Void> moLaiHdm(@PathVariable String id) {
    return cmd.run("HDM.moLai", c -> {
      hdm.moLaiHdm(c, id);
      c.nhatKy("HopDongMua", id, "Mở lại");
      return null;
    });
  }

  @Operation(summary = "Nhập kho từ HĐ mua (HDM-06) → phiếu Nhập, mỗi dòng một lô")
  @PostMapping("/hop-dong-mua/{id}/nhap-kho")
  public CommandResponse<PhieuKho> nhapKho(@PathVariable String id, @Valid @RequestBody Req.NhapKho r) {
    return cmd.run("HDM.nhapKho", c -> {
      PhieuKho p = hdm.nhapKho(c, id, r.ngay(), r.kho(), r.dong(), r.ghiChu(), r.soHoaDon(), r.vat());
      c.nhatKy("HopDongMua", id, "Nhập kho " + p.getSoPhieu());
      return p;
    });
  }

  @Operation(summary = "Ghi nhận trả NCC một đợt (HDM-08) → phiếu Chi Chờ duyệt", description = "HĐ thuộc Phú Tài chỉ ghi số đã trả.")
  @PostMapping("/hop-dong-mua/{id}/dot/{dot}/tra-ncc")
  public CommandResponse<PhieuThuChi> traNcc(@PathVariable String id, @PathVariable int dot, @Valid @RequestBody Req.TraNCC r) {
    return cmd.run("HDM.traNCC", c -> {
      PhieuThuChi p = hdm.ghiTraNCC(c, id, dot, r.ngayTra(), r.soTienTra(), r.nguonTien());
      c.nhatKy("HopDongMua", id, "Trả NCC đợt " + dot);
      return p;
    });
  }
}
