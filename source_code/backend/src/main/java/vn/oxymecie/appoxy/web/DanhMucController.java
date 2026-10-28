package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.logic.DanhMucService;
import vn.oxymecie.appoxy.domain.model.AnhXaTen;
import vn.oxymecie.appoxy.domain.model.KhachHang;
import vn.oxymecie.appoxy.domain.model.Kho;
import vn.oxymecie.appoxy.domain.model.LoaiChiPhi;
import vn.oxymecie.appoxy.domain.model.LoaiHang;
import vn.oxymecie.appoxy.domain.model.NguonTien;
import vn.oxymecie.appoxy.domain.model.NhaCungCap;
import vn.oxymecie.appoxy.web.dto.Req;

@Tag(name = "Danh mục", description = "Khách hàng (HDB-13), nhà cung cấp (HDM-10), nguồn tiền / loại chi phí (KT-01, KT-03), kho & mã hàng (KHO-01/02)")
@RestController
@RequestMapping("/api")
public class DanhMucController {
  private final Cmd cmd;
  private final DanhMucService svc;

  public DanhMucController(Cmd cmd, DanhMucService svc) {
    this.cmd = cmd;
    this.svc = svc;
  }

  static <T> T idPath(String id, T body, Function<T, String> get, java.util.function.BiConsumer<T, String> set) {
    if (get.apply(body) != null && !get.apply(body).isEmpty() && !Objects.equals(get.apply(body), id))
      throw ApiException.invalid("Mã trong đường dẫn và thân request không khớp");
    set.accept(body, id);
    return body;
  }

  // ── Khách hàng ───────────────────────────────────────────────────────

  @Operation(summary = "Danh sách khách hàng (tìm kiếm, lọc, phân trang)")
  @GetMapping("/khach-hang")
  public PageResult<KhachHang> dsKhachHang(@RequestParam(required = false) String q, @RequestParam(required = false) String phuTrach,
      @RequestParam(required = false) String coHoi, @RequestParam(required = false) String tinh,
      @RequestParam(defaultValue = "ten,asc") String sort, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
    var rows = cmd.snapshot().getKhachHang();
    return PageResult.of(rows, k -> PageResult.khop(q, k.getId(), k.getTen(), k.getMst(), k.getNguoiLienHe(), k.getDienThoai(), k.getEmail())
            && (phuTrach == null || phuTrach.equals(k.getPhuTrach())) && (coHoi == null || coHoi.equals(k.getCoHoi()))
            && (tinh == null || tinh.equals(k.getTinh())),
        sort, Map.of("ten", KhachHang::getTen, "id", KhachHang::getId, "ngayTiepNhan", x -> x.getNgayTiepNhan()), page, size);
  }

  @Operation(summary = "Thêm khách hàng", description = "Mã KH tự sinh (KHnnnn) nếu không gửi hoặc đã có.")
  @PostMapping("/khach-hang")
  public CommandResponse<KhachHang> taoKhachHang(@RequestBody KhachHang k) {
    return cmd.run("KH.tao", c -> {
      svc.saveKhachHang(c, k, true);
      c.nhatKy("DM_KhachHang", k.getId(), k.getTen());
      return k;
    });
  }

  @Operation(summary = "Sửa khách hàng")
  @PutMapping("/khach-hang/{id}")
  public CommandResponse<KhachHang> suaKhachHang(@PathVariable String id, @RequestBody KhachHang k) {
    idPath(id, k, KhachHang::getId, KhachHang::setId);
    return cmd.run("KH.sua", c -> {
      svc.saveKhachHang(c, k, false);
      c.nhatKy("DM_KhachHang", id, k.getTen());
      return k;
    });
  }

  @Operation(summary = "Phân bổ khách hàng cho Sale (HDB-13-PB)", description = "sale rỗng = trả về chưa phân bổ.")
  @PostMapping("/khach-hang/phan-bo")
  public CommandResponse<Void> phanBo(@Valid @RequestBody Req.PhanBo r) {
    return cmd.run("KH.phanBo", c -> {
      svc.phanBoKH(c, r.ids(), r.sale());
      c.nhatKy("DM_KhachHang", String.join(",", r.ids()), "Phân bổ cho " + r.sale());
      return null;
    });
  }

  @Operation(summary = "Ghi một lần chăm sóc khách hàng")
  @PostMapping("/khach-hang/{id}/cham-soc")
  public CommandResponse<Void> chamSoc(@PathVariable String id, @Valid @RequestBody Req.ChamSoc r) {
    return cmd.run("KH.chamSoc", c -> {
      svc.ghiChamSoc(c, id, r.noiDung(), r.tiepCan(), r.coHoi(), r.kenh(), r.ketQua());
      c.nhatKy("DM_KhachHang", id, "Chăm sóc");
      return null;
    });
  }

  // ── Nhà cung cấp ─────────────────────────────────────────────────────

  @Operation(summary = "Danh sách nhà cung cấp")
  @GetMapping("/nha-cung-cap")
  public PageResult<NhaCungCap> dsNcc(@RequestParam(required = false) String q, @RequestParam(defaultValue = "ten,asc") String sort,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
    return PageResult.of(cmd.snapshot().getNcc(), n -> PageResult.khop(q, n.getId(), n.getTen(), n.getMst(), n.getQuocGia()), sort,
        Map.of("ten", NhaCungCap::getTen, "id", NhaCungCap::getId), page, size);
  }

  @PostMapping("/nha-cung-cap")
  public CommandResponse<NhaCungCap> taoNcc(@RequestBody NhaCungCap n) {
    return cmd.run("NCC.tao", c -> {
      svc.saveNCC(c, n, true);
      c.nhatKy("DM_NCC", n.getId(), n.getTen());
      return n;
    });
  }

  @PutMapping("/nha-cung-cap/{id}")
  public CommandResponse<NhaCungCap> suaNcc(@PathVariable String id, @RequestBody NhaCungCap n) {
    idPath(id, n, NhaCungCap::getId, NhaCungCap::setId);
    return cmd.run("NCC.sua", c -> {
      svc.saveNCC(c, n, false);
      c.nhatKy("DM_NCC", id, n.getTen());
      return n;
    });
  }

  // ── Nguồn tiền & loại chi phí ────────────────────────────────────────

  @Operation(summary = "Thêm nguồn tiền (mã nhập tay)")
  @PostMapping("/nguon-tien")
  public CommandResponse<NguonTien> taoNguon(@RequestBody NguonTien n) {
    return cmd.run("NT.tao", c -> {
      svc.saveNguonTien(c, n, true);
      c.nhatKy("DM_NguonTien", n.getId(), n.getTen());
      return n;
    });
  }

  @Operation(summary = "Sửa nguồn tiền", description = "Nguồn đã có phiếu được duyệt thì khoá Số dư / Ngày đầu kỳ.")
  @PutMapping("/nguon-tien/{id}")
  public CommandResponse<NguonTien> suaNguon(@PathVariable String id, @RequestBody NguonTien n) {
    idPath(id, n, NguonTien::getId, NguonTien::setId);
    return cmd.run("NT.sua", c -> {
      svc.saveNguonTien(c, n, false);
      c.nhatKy("DM_NguonTien", id, n.getTen());
      return n;
    });
  }

  @PostMapping("/loai-chi-phi")
  public CommandResponse<LoaiChiPhi> taoLcp(@RequestBody LoaiChiPhi l) {
    return cmd.run("LCP.tao", c -> {
      svc.saveLoaiChiPhi(c, l, true);
      c.nhatKy("DM_LoaiChiPhi", l.getId(), l.getTen());
      return l;
    });
  }

  @PutMapping("/loai-chi-phi/{id}")
  public CommandResponse<LoaiChiPhi> suaLcp(@PathVariable String id, @RequestBody LoaiChiPhi l) {
    idPath(id, l, LoaiChiPhi::getId, LoaiChiPhi::setId);
    return cmd.run("LCP.sua", c -> {
      svc.saveLoaiChiPhi(c, l, false);
      c.nhatKy("DM_LoaiChiPhi", id, l.getTen());
      return l;
    });
  }

  // ── Kho & mã hàng ────────────────────────────────────────────────────

  @PostMapping("/kho")
  public CommandResponse<Kho> taoKho(@RequestBody Kho k) {
    return cmd.run("KHO.tao", c -> {
      svc.saveKho(c, k, true);
      c.nhatKy("DM_Kho", k.getId(), k.getTen());
      return k;
    });
  }

  @PutMapping("/kho/{id}")
  public CommandResponse<Kho> suaKho(@PathVariable String id, @RequestBody Kho k) {
    idPath(id, k, Kho::getId, Kho::setId);
    return cmd.run("KHO.sua", c -> {
      svc.saveKho(c, k, false);
      c.nhatKy("DM_Kho", id, k.getTen());
      return k;
    });
  }

  @PostMapping("/loai-hang")
  public CommandResponse<LoaiHang> taoLoaiHang(@RequestBody LoaiHang l) {
    return cmd.run("LH.tao", c -> {
      svc.saveLoaiHang(c, l, true);
      c.nhatKy("DM_LoaiHang", l.getId(), l.getTen());
      return l;
    });
  }

  @PutMapping("/loai-hang/{id}")
  public CommandResponse<LoaiHang> suaLoaiHang(@PathVariable String id, @RequestBody LoaiHang l) {
    idPath(id, l, LoaiHang::getId, LoaiHang::setId);
    return cmd.run("LH.sua", c -> {
      svc.saveLoaiHang(c, l, false);
      c.nhatKy("DM_LoaiHang", id, l.getTen());
      return l;
    });
  }

  @Operation(summary = "Đổi mã hàng", description = "Đổi ở danh mục và mọi nơi đang dùng mã cũ (phiếu kho, HĐ mua / bán, kiểm kê, ánh xạ).")
  @PostMapping("/loai-hang/{id}/doi-ma")
  public CommandResponse<String> doiMa(@PathVariable String id, @Valid @RequestBody Req.DoiMa r) {
    return cmd.run("LH.doiMa", c -> {
      String moi = svc.doiMaHang(c, id, r.moi());
      c.nhatKy("DM_LoaiHang", id, "Đổi mã → " + moi);
      return null;
    });
  }

  @Operation(summary = "Thêm tên hàng vào bảng ánh xạ")
  @PostMapping("/anh-xa-ten")
  public CommandResponse<Void> themAnhXa(@RequestBody AnhXaTen a) {
    return cmd.run("AX.them", c -> {
      svc.themAnhXa(c, a);
      c.nhatKy("AnhXaTen", a.getId(), a.getTen());
      return null;
    });
  }

  @Operation(summary = "Gán tên hàng → mã hàng / lô hay dùng")
  @PutMapping("/anh-xa-ten/{id}")
  public CommandResponse<Void> suaAnhXa(@PathVariable String id, @Valid @RequestBody Req.AnhXa r) {
    return cmd.run("AX.sua", c -> {
      svc.saveAnhXa(c, id, r.loaiHang(), r.lo(), r.ghiChu());
      c.nhatKy("AnhXaTen", id, null);
      return null;
    });
  }
}
