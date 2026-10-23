package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Clock;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
import vn.oxymecie.appoxy.common.Dates;
import vn.oxymecie.appoxy.domain.logic.Ctx;
import vn.oxymecie.appoxy.domain.logic.DuyetXoaService;
import vn.oxymecie.appoxy.domain.logic.HeThongService;
import vn.oxymecie.appoxy.domain.model.NhomQuyen;
import vn.oxymecie.appoxy.domain.model.TaiKhoan;
import vn.oxymecie.appoxy.domain.model.YeuCauXoa;
import vn.oxymecie.appoxy.domain.perm.Level;
import vn.oxymecie.appoxy.domain.perm.Perm;
import vn.oxymecie.appoxy.persistence.Repos;
import vn.oxymecie.appoxy.security.AuthService;
import vn.oxymecie.appoxy.web.dto.Req;

@Tag(name = "Hệ thống", description = "Duyệt xoá (NT-11), tham số cấu hình (NT-14), nhóm quyền & tài khoản (NT-03/04), nhật ký thao tác")
@RestController
@RequestMapping("/api")
public class HeThongController {
  private final Cmd cmd;
  private final DuyetXoaService duyetXoa;
  private final HeThongService heThong;
  private final AuthService auth;
  private final Repos repos;
  private final Clock clock;

  public HeThongController(Cmd cmd, DuyetXoaService duyetXoa, HeThongService heThong, AuthService auth, Repos repos, Clock clock) {
    this.cmd = cmd;
    this.duyetXoa = duyetXoa;
    this.heThong = heThong;
    this.auth = auth;
    this.repos = repos;
    this.clock = clock;
  }

  private Ctx ctx() {
    return new Ctx(cmd.raw(), Cmd.user().id(), clock, null, null);
  }

  // ── Duyệt xoá ────────────────────────────────────────────────────────

  @GetMapping("/yeu-cau-xoa")
  public PageResult<YeuCauXoa> dsYeuCau(@RequestParam(required = false) String trangThai, @RequestParam(required = false) String loai,
      @RequestParam(defaultValue = "ngayGui,desc") String sort, @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    return PageResult.of(cmd.snapshot().getYeuCauXoa(), y -> (trangThai == null || trangThai.equals(y.getTrangThai()))
        && (loai == null || loai.equals(y.getLoai())), sort, Map.of("ngayGui", YeuCauXoa::getNgayGui), page, size);
  }

  @Operation(summary = "Lý do không xoá được bản ghi (đang khoá / được tham chiếu); null = xoá được")
  @GetMapping("/yeu-cau-xoa/kiem-tra")
  public Map<String, String> kiemTra(@RequestParam String loai, @RequestParam String id) {
    String lyDo = duyetXoa.lyDoKhongXoa(ctx(), loai, id);
    return lyDo == null ? Map.of() : Map.of("lyDo", lyDo);
  }

  @Operation(summary = "Gửi yêu cầu xoá", description = "loai: PhieuThuChi, ChiPhiThucHienHD, HopDongBan, HopDongMua, PhieuKho, HopDongPhuTai, HoaDon, "
      + "HoSo (maDoiTuong = hoSoId:fileId), DongTienPhuTai, DM_KhachHang, DM_NCC, DM_NguonTien, DM_LoaiChiPhi, DM_Kho, DM_LoaiHang.")
  @PostMapping("/yeu-cau-xoa")
  public CommandResponse<YeuCauXoa> gui(@Valid @RequestBody Req.YeuCauXoa r) {
    return cmd.run("YCX.gui", c -> {
      YeuCauXoa y = duyetXoa.guiYeuCauXoa(c, r.loai(), r.maDoiTuong(), r.moTa(), r.lyDo());
      c.nhatKy(r.loai(), r.maDoiTuong(), "Gửi yêu cầu xoá " + y.getId());
      return y;
    });
  }

  @PostMapping("/yeu-cau-xoa/{id}/rut")
  public CommandResponse<Void> rut(@PathVariable String id) {
    return cmd.run("YCX.rut", c -> {
      duyetXoa.rutYeuCau(c, id);
      c.nhatKy("YeuCauXoa", id, "Rút");
      return null;
    });
  }

  @Operation(summary = "Duyệt xoá", description = "Không tự duyệt yêu cầu của chính mình (trừ quyền KT-07-TD). Xoá kèm dữ liệu phụ thuộc.")
  @PostMapping("/yeu-cau-xoa/{id}/duyet")
  public CommandResponse<Void> duyet(@PathVariable String id) {
    return cmd.run("YCX.duyet", c -> {
      duyetXoa.duyetXoa(c, id);
      c.nhatKy("YeuCauXoa", id, "Duyệt xoá");
      return null;
    });
  }

  @PostMapping("/yeu-cau-xoa/{id}/tu-choi")
  public CommandResponse<Void> tuChoi(@PathVariable String id, @Valid @RequestBody Req.LyDo r) {
    return cmd.run("YCX.tuChoi", c -> {
      duyetXoa.tuChoiXoa(c, id, r.lyDo());
      c.nhatKy("YeuCauXoa", id, "Từ chối: " + r.lyDo());
      return null;
    });
  }

  // ── Cấu hình ─────────────────────────────────────────────────────────

  @Operation(summary = "Đổi một tham số cấu hình", description = "Tỷ lệ gửi dạng 0–1 (VD 0.2 = 20%). Mọi thay đổi ghi lịch sử.")
  @PutMapping("/cau-hinh/{khoa}")
  public CommandResponse<Void> cauHinh(@PathVariable String khoa, @Valid @RequestBody Req.CauHinh r) {
    return cmd.run("CH.sua", c -> {
      heThong.setCauHinh(c, khoa, r.giaTri());
      c.nhatKy("CauHinh", khoa, String.valueOf(r.giaTri()));
      return null;
    });
  }

  // ── Phân quyền ───────────────────────────────────────────────────────

  public record ChucNangDto(String ma, String module, String ten, String moTa, List<String> mucDo) {}

  @Operation(summary = "Danh mục chức năng phân quyền và các mức được phép")
  @GetMapping("/chuc-nang")
  public List<ChucNangDto> chucNang() {
    Cmd.user();
    return Arrays.stream(Perm.values()).map(p -> new ChucNangDto(p.ma, p.module, p.ten, p.moTa, p.mucDo.stream().map(Level::name).toList())).toList();
  }

  @PostMapping("/nhom-quyen")
  public CommandResponse<NhomQuyen> taoNhom(@Valid @RequestBody Req.LuuNhom r) {
    return cmd.run("NQ.tao", c -> {
      NhomQuyen n = heThong.saveNhom(c, r.nhom(), r.thanhVien(), true);
      c.nhatKy("NhomQuyen", n.getId(), n.getMa());
      return n;
    });
  }

  @PutMapping("/nhom-quyen/{id}")
  public CommandResponse<NhomQuyen> suaNhom(@PathVariable String id, @Valid @RequestBody Req.LuuNhom r) {
    DanhMucController.idPath(id, r.nhom(), NhomQuyen::getId, NhomQuyen::setId);
    return cmd.run("NQ.sua", c -> {
      NhomQuyen n = heThong.saveNhom(c, r.nhom(), r.thanhVien(), false);
      c.nhatKy("NhomQuyen", id, n.getMa());
      return n;
    });
  }

  @DeleteMapping("/nhom-quyen/{id}")
  public CommandResponse<Void> xoaNhom(@PathVariable String id) {
    return cmd.run("NQ.xoa", c -> {
      heThong.xoaNhom(c, id);
      c.nhatKy("NhomQuyen", id, "Xoá");
      return null;
    });
  }

  @PutMapping("/nhom-quyen/{id}/thanh-vien")
  public CommandResponse<Void> thanhVien(@PathVariable String id, @Valid @RequestBody Req.ThanhVien r) {
    return cmd.run("NQ.thanhVien", c -> {
      heThong.ganThanhVien(c, id, r.taiKhoan());
      c.nhatKy("NhomQuyen", id, "Gán thành viên");
      return null;
    });
  }

  // ── Tài khoản ────────────────────────────────────────────────────────

  @Operation(summary = "Tạo tài khoản", description = "Đăng nhập lần đầu bắt đổi mật khẩu.")
  @PostMapping("/tai-khoan")
  public CommandResponse<TaiKhoan> taoTaiKhoan(@Valid @RequestBody Req.TaoTaiKhoan r) {
    var u = Cmd.user();
    return cmd.wrap(u, auth.taoTaiKhoan(u, r.hoTen(), r.email(), r.nhom(), r.matKhau(), r.id(), cmd.ip()));
  }

  @PutMapping("/tai-khoan/{id}")
  public CommandResponse<Object> suaTaiKhoan(@PathVariable String id, @Valid @RequestBody Req.SuaTaiKhoan r) {
    return cmd.wrap(Cmd.user(), auth.suaTaiKhoan(Cmd.user(), id, r.hoTen(), r.nhom(), cmd.ip()));
  }

  @Operation(summary = "Khoá / mở khoá tài khoản", description = "Khoá thì huỷ mọi phiên đăng nhập của tài khoản.")
  @PostMapping("/tai-khoan/{id}/doi-trang-thai")
  public CommandResponse<Object> doiTrangThai(@PathVariable String id) {
    return cmd.wrap(Cmd.user(), auth.doiTrangThai(Cmd.user(), id, cmd.ip()));
  }

  public record MatKhauTam(String matKhau, vn.oxymecie.appoxy.state.ChangeSet changes) {}

  @Operation(summary = "Đặt lại mật khẩu", description = "Trả mật khẩu tạm MỘT lần để đọc cho người dùng; huỷ mọi phiên của tài khoản.")
  @PostMapping("/tai-khoan/{id}/dat-lai-mat-khau")
  public MatKhauTam datLai(@PathVariable String id, @RequestBody Req.DatLaiMatKhau r) {
    var u = Cmd.user();
    var kq = auth.datLaiMatKhau(u, id, r.batDoi(), cmd.ip());
    return new MatKhauTam(kq.matKhau(), cmd.wrap(u, kq.ketQua()).changes());
  }

  // ── Nhật ký thao tác ─────────────────────────────────────────────────

  public record NhatKyDong(long id, String luc, String taiKhoanId, String hanhDong, String doiTuong, String maDoiTuong, String moTa,
                           String duLieu, String diaChiIp) {}

  @Operation(summary = "Nhật ký thao tác (audit log)", description = "Người có quyền sửa Tài khoản (NT-03) hoặc nhóm toàn quyền.")
  @GetMapping("/nhat-ky")
  public PageResult<NhatKyDong> nhatKy(@RequestParam(required = false) String taiKhoanId, @RequestParam(required = false) String doiTuong,
      @RequestParam(required = false) String maDoiTuong, @RequestParam(required = false) String tu, @RequestParam(required = false) String den,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
    Ctx c = ctx();
    if (!c.canEdit(Perm.taiKhoan) && !c.isGD()) throw ApiException.forbidden("Cần quyền quản trị tài khoản (NT-03)");
    if (size < 1 || size > 200) throw ApiException.invalid("size phải từ 1 đến 200");
    Instant t = tu == null ? null : Dates.parseInstant(tu);
    Instant d = den == null ? null : Dates.parseInstant(den);
    var p = repos.auditLog().tim(taiKhoanId, doiTuong, maDoiTuong, t, d, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));
    var items = p.getContent().stream().map(a -> new NhatKyDong(a.getId(), Dates.iso(a.getLuc()), a.getTaiKhoanId(), a.getHanhDong(),
        a.getDoiTuong(), a.getMaDoiTuong(), a.getMoTa(), a.getDuLieu(), a.getDiaChiIp())).toList();
    return new PageResult<>(items, page, size, p.getTotalElements(), p.getTotalPages());
  }
}
