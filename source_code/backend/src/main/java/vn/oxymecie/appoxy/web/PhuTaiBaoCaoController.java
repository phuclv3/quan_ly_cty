package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Dates;
import vn.oxymecie.appoxy.domain.logic.Ctx;
import vn.oxymecie.appoxy.domain.logic.PhuTaiBaoCaoService;
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.domain.model.DongTienPT;
import vn.oxymecie.appoxy.domain.perm.Perm;

@Tag(name = "Phú Tài (HĐ bán / HĐ mua tích Thuộc Phú Tài)", description = "Giao dịch khách hàng, giao dịch NCC, đối soát quyền lợi OXY, sổ quỹ Phú Tài, báo cáo")
@RestController
@RequestMapping("/api/phu-tai")
public class PhuTaiBaoCaoController {
  private final Cmd cmd;
  private final PhuTaiBaoCaoService svc;

  public PhuTaiBaoCaoController(Cmd cmd, PhuTaiBaoCaoService svc) {
    this.cmd = cmd;
    this.svc = svc;
  }

  private Db raw() {
    Db raw = cmd.raw();
    if (!new Ctx(raw, Cmd.user().id(), java.time.Clock.systemUTC(), null, null).canView(Perm.phuTai)) throw ApiException.forbidden("Cần quyền xem module Phú Tài");
    return raw;
  }

  private static LocalDate homNay() {
    return LocalDate.now(Dates.VN);
  }

  @Operation(summary = "Tab 1 — Giao dịch khách hàng: HĐ bán có tích Thuộc Phú Tài (lọc, KPI)")
  @GetMapping("/khach-hang")
  public PhuTaiBaoCaoService.KhDto khachHang(@RequestParam(required = false) String q, @RequestParam(required = false) String nam,
      @RequestParam(required = false) String maKH, @RequestParam(required = false) String sale, @RequestParam(required = false) String trangThai) {
    Db raw = raw();
    return svc.khachHang(cmd.snapshot(), raw, q, nam, maKH, sale, trangThai, homNay());
  }

  @Operation(summary = "Tab 2 — Giao dịch NCC: HĐ mua có tích Thuộc Phú Tài, hàng hoá đi qua Phú Tài (lọc, KPI)")
  @GetMapping("/ncc")
  public PhuTaiBaoCaoService.NccDto ncc(@RequestParam(required = false) String q, @RequestParam(required = false) String nam,
      @RequestParam(required = false) String maNCC, @RequestParam(required = false) String trangThai, @RequestParam(required = false) String thanhToan) {
    Db raw = raw();
    return svc.ncc(cmd.snapshot(), raw, q, nam, maNCC, trangThai, thanhToan, homNay());
  }

  @Operation(summary = "Tab 3 — Đối soát quyền lợi OXY theo từng HĐ + biên bản kỳ hiện tại")
  @GetMapping("/doi-soat")
  public PhuTaiBaoCaoService.DsDto doiSoat() {
    Db raw = raw();
    return svc.doiSoat(cmd.snapshot(), raw, homNay());
  }

  @Operation(summary = "Tab 4 — Sổ quỹ Phú Tài: cân đối, theo hợp đồng, sổ chi tiết")
  @GetMapping("/so-quy")
  public PhuTaiBaoCaoService.QuyDto soQuy() {
    Db raw = raw();
    return svc.soQuy(cmd.snapshot(), raw, homNay());
  }

  public record DongQuyReq(String ngay, String loai, String hdbId, long soTien, String ghiChu, String tep) {}

  @Operation(summary = "Tab 4 — Thêm dòng nhập tay vào sổ quỹ Phú Tài", description = "loai = \"Số dư đầu kỳ\" hoặc \"Chuyển OXY\" (gắn HĐ bán Phú Tài).")
  @PostMapping("/so-quy")
  public CommandResponse<DongTienPT> themDongQuy(@RequestBody DongQuyReq r) {
    return cmd.run("PT.soQuyThem", c -> {
      DongTienPT d = svc.themDongQuy(c, new DongTienPT(null, r.ngay(), null, null, r.soTien(), null, null, r.ghiChu(), r.hdbId(), r.loai(), r.tep()));
      c.nhatKy("DongTienPhuTai", d.getId(), d.getLoai() + " " + d.getSoTien());
      return d;
    });
  }

  @Operation(summary = "Tab 5 — Báo cáo Phú Tài: hiệu quả, lợi nhuận, công nợ phải thu / phải trả, vận hành & cảnh báo")
  @GetMapping("/bao-cao")
  public PhuTaiBaoCaoService.BcDto baoCao(@RequestParam(defaultValue = "0") int nam, @RequestParam(required = false) Integer quy,
      @RequestParam(required = false) Integer thang, @RequestParam(required = false) String maKH) {
    Db raw = raw();
    return svc.baoCao(cmd.snapshot(), raw, new PhuTaiBaoCaoService.Loc(nam, quy, thang, maKH), homNay());
  }
}
