package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.logic.Ctx;
import vn.oxymecie.appoxy.domain.logic.KhoService;
import vn.oxymecie.appoxy.domain.logic.PhieuKhoPdf;
import vn.oxymecie.appoxy.domain.model.KiemKe;
import vn.oxymecie.appoxy.domain.model.PhieuKho;
import vn.oxymecie.appoxy.domain.perm.Perm;
import vn.oxymecie.appoxy.web.dto.Req;

@Tag(name = "Kho", description = "Phiếu nhập / xuất (KHO-03…08), kiểm kê, tồn kho theo lô & theo mã hàng (KHO-09)")
@RestController
@RequestMapping("/api")
public class KhoController {
  private final Cmd cmd;
  private final KhoService svc;
  private final PhieuKhoPdf pdf;

  public KhoController(Cmd cmd, KhoService svc, PhieuKhoPdf pdf) {
    this.cmd = cmd;
    this.svc = svc;
    this.pdf = pdf;
  }

  @Operation(summary = "In phiếu nhập / xuất kho (PDF)", description = "Chỉ phiếu người dùng được thấy (theo phạm vi dữ liệu); số liệu lấy từ phiếu đã lưu.")
  @GetMapping("/phieu-kho/{id}/pdf")
  public ResponseEntity<byte[]> inPhieu(@PathVariable String id) {
    PhieuKho p = cmd.snapshot().getPhieuKho().stream().filter(x -> x.getId().equals(id)).findFirst()
        .orElseThrow(() -> ApiException.notFound("Không tìm thấy phiếu kho"));
    Ctx c = new Ctx(cmd.raw(), Cmd.user().id(), java.time.Clock.systemUTC(), null, null);
    byte[] b = pdf.render(c, p);
    String ten = p.getSoPhieu().replaceAll("[\\\\/:*?\"<>|\\s]+", "-") + ".pdf";
    return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
        .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(ten, StandardCharsets.UTF_8).build().toString())
        .header("X-Content-Type-Options", "nosniff").body(b);
  }

  @GetMapping("/phieu-kho")
  public PageResult<PhieuKho> dsPhieu(@RequestParam(required = false) String q, @RequestParam(required = false) String loai,
      @RequestParam(required = false) String kho, @RequestParam(required = false) String trangThai,
      @RequestParam(required = false) String nguonGoc, @RequestParam(required = false) String tuNgay,
      @RequestParam(required = false) String denNgay, @RequestParam(defaultValue = "ngay,desc") String sort,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
    return PageResult.of(cmd.snapshot().getPhieuKho(), p -> PageResult.khop(q, p.getSoPhieu(), p.getLyDo(), p.getGhiChu(), p.getSoHoaDon())
            && (loai == null || loai.equals(p.getLoai())) && (kho == null || kho.equals(p.getKho()))
            && (trangThai == null || trangThai.equals(p.getTrangThai())) && (nguonGoc == null || nguonGoc.equals(p.getNguonGoc()))
            && PageResult.trongKhoang(p.getNgay(), tuNgay, denNgay),
        sort, Map.of("ngay", PhieuKho::getNgay, "soPhieu", PhieuKho::getSoPhieu), page, size);
  }

  @Operation(summary = "Lập phiếu nhập / xuất tay — điều chỉnh (KHO-06)",
      description = "Nhập: mỗi dòng một lô, bắt buộc đơn giá. Xuất: trừ theo lô (chỉ định hoặc FIFO), chặn quá tồn.")
  @PostMapping("/phieu-kho")
  public CommandResponse<PhieuKho> taoPhieuTay(@Valid @RequestBody Req.PhieuKhoTay r) {
    return cmd.run("PK.tay", c -> {
      PhieuKho p = svc.savePhieuKhoTay(c, r.phieu(), r.dongNhap(), r.dongXuat(), false, r.id());
      c.nhatKy("PhieuKho", p.getId(), p.getSoPhieu());
      return p;
    });
  }

  @Operation(summary = "Sửa Ngày / Ghi chú phiếu kho", description = "Chặn đổi ngày làm lô xuất trước ngày nhập.")
  @PatchMapping("/phieu-kho/{id}")
  public CommandResponse<Void> suaPhieu(@PathVariable String id, @Valid @RequestBody Req.SuaPhieuKho r) {
    return cmd.run("PK.sua", c -> {
      svc.suaPhieuKho(c, id, r.ngay(), r.ghiChu());
      c.nhatKy("PhieuKho", id, "Sửa ngày / ghi chú");
      return null;
    });
  }

  @Operation(summary = "Sửa thông tin một lô nhập (quy cách, đơn giá, VAT)", description = "Giá vốn các dòng xuất của lô cập nhật theo. Trả số dòng xuất được cập nhật.")
  @PatchMapping("/phieu-kho/{id}/dong/{i}")
  public CommandResponse<Integer> suaLo(@PathVariable String id, @PathVariable int i, @Valid @RequestBody Req.SuaLo r) {
    return cmd.run("PK.suaLo", c -> {
      int n = svc.suaLo(c, id, i, r.thuocTinh(), r.donGia(), r.vat(), r.ghiChu());
      c.nhatKy("PhieuKho", id, "Sửa lô dòng " + (i + 1));
      return n;
    });
  }

  // ── Kiểm kê ──────────────────────────────────────────────────────────

  @PostMapping("/kiem-ke")
  public CommandResponse<KiemKe> taoKiemKe(@RequestBody KiemKe k) {
    return cmd.run("KK.tao", c -> {
      KiemKe out = svc.saveKiemKe(c, k, true);
      c.nhatKy("KiemKe", out.getId(), out.getSoPhieu());
      return out;
    });
  }

  @PutMapping("/kiem-ke/{id}")
  public CommandResponse<KiemKe> suaKiemKe(@PathVariable String id, @RequestBody KiemKe k) {
    DanhMucController.idPath(id, k, KiemKe::getId, KiemKe::setId);
    return cmd.run("KK.sua", c -> {
      KiemKe out = svc.saveKiemKe(c, k, false);
      c.nhatKy("KiemKe", id, out.getSoPhieu());
      return out;
    });
  }

  @DeleteMapping("/kiem-ke/{id}")
  public CommandResponse<Void> xoaKiemKe(@PathVariable String id) {
    return cmd.run("KK.xoa", c -> {
      svc.xoaKiemKe(c, id);
      c.nhatKy("KiemKe", id, "Xoá");
      return null;
    });
  }

  @Operation(summary = "Sinh phiếu điều chỉnh theo chênh lệch kiểm kê")
  @PostMapping("/kiem-ke/{id}/dieu-chinh")
  public CommandResponse<Void> dieuChinh(@PathVariable String id) {
    return cmd.run("KK.dieuChinh", c -> {
      svc.dieuChinhKiemKe(c, id);
      c.nhatKy("KiemKe", id, "Điều chỉnh");
      return null;
    });
  }

  @Operation(summary = "Chênh lệch kiểm kê (sổ sách ↔ thực tế) theo mã hàng")
  @GetMapping("/kiem-ke/{id}/chenh-lech")
  public List<Calc.DongLechKK> chenhLech(@PathVariable String id) {
    KiemKe k = cmd.snapshot().getKiemKe().stream().filter(x -> x.getId().equals(id)).findFirst()
        .orElseThrow(() -> ApiException.notFound("Không tìm thấy đợt kiểm kê"));
    return Calc.lechKiemKe(cmd.raw(), k);
  }

  // ── Tồn kho ──────────────────────────────────────────────────────────

  private void canTon() {
    Ctx c = new Ctx(cmd.raw(), Cmd.user().id(), java.time.Clock.systemUTC(), null, null);
    if (!c.canView(Perm.khoTon) && !c.canView(Perm.khoPhieuTay)) throw ApiException.forbidden("Cần quyền xem tồn kho (KHO-09)");
  }

  @Operation(summary = "Tồn kho theo Mã hàng × Vị trí kho (KHO-09)", description = "denNgay bỏ trống = hiện tại; bỏ phiếu Đã huỷ.")
  @GetMapping("/ton-kho")
  public List<Calc.DongTon> tonKho(@RequestParam(required = false) String denNgay, @RequestParam(required = false) String kho,
      @RequestParam(required = false) String loaiHang) {
    canTon();
    return Calc.tonKho(cmd.raw(), denNgay).stream()
        .filter(r -> (kho == null || kho.equals(r.kho())) && (loaiHang == null || loaiHang.equals(r.loaiHang()))).toList();
  }

  @Operation(summary = "Tồn kho theo lô (giá trị tồn = tồn × đơn giá lô)")
  @GetMapping("/ton-kho/lo")
  public List<Calc.DongLo> tonLo(@RequestParam(required = false) String denNgay, @RequestParam(required = false) String kho,
      @RequestParam(required = false) String loaiHang, @RequestParam(defaultValue = "false") boolean conHang) {
    canTon();
    return Calc.tonTheoLo(cmd.raw(), denNgay).stream()
        .filter(l -> (kho == null || kho.equals(l.kho)) && (loaiHang == null || loaiHang.equals(l.loaiHang)) && (!conHang || l.ton > 0)).toList();
  }
}
