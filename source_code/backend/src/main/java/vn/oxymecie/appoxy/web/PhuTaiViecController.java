package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
import vn.oxymecie.appoxy.domain.logic.PhuTaiService;
import vn.oxymecie.appoxy.domain.logic.ViecService;
import vn.oxymecie.appoxy.domain.model.DongTienPT;
import vn.oxymecie.appoxy.domain.model.HopDongPhuTai;
import vn.oxymecie.appoxy.domain.model.ViecGiao;
import vn.oxymecie.appoxy.web.dto.Req;

@Tag(name = "Phú Tài & Việc", description = "HĐ Phú Tài, quỹ ảo (PT-01…11); việc được giao / đặt lịch (TD-01)")
@RestController
@RequestMapping("/api")
public class PhuTaiViecController {
  private final Cmd cmd;
  private final PhuTaiService pt;
  private final ViecService viec;

  public PhuTaiViecController(Cmd cmd, PhuTaiService pt, ViecService viec) {
    this.cmd = cmd;
    this.pt = pt;
    this.viec = viec;
  }

  @GetMapping("/hop-dong-phu-tai")
  public PageResult<HopDongPhuTai> ds(@RequestParam(required = false) String q, @RequestParam(required = false) String trangThai,
      @RequestParam(required = false) String tuNgay, @RequestParam(required = false) String denNgay,
      @RequestParam(defaultValue = "ngayKy,desc") String sort, @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    return PageResult.of(cmd.snapshot().getHopDongPhuTai(), p -> PageResult.khop(q, p.getSoHD(), p.getTenKH(), p.getGhiChu())
            && (trangThai == null || trangThai.equals(p.getTrangThai())) && PageResult.trongKhoang(p.getNgayKy(), tuNgay, denNgay),
        sort, Map.of("ngayKy", HopDongPhuTai::getNgayKy, "soHD", HopDongPhuTai::getSoHD), page, size);
  }

  public record PtChiTiet(HopDongPhuTai hopDong, Calc.PtCalc chiaLoiNhuan, long quyThu, long quyChi, long quySoDu) {}

  @Operation(summary = "Chi tiết HĐ Phú Tài + chia lợi nhuận từng bước (PT-06) + quỹ ảo theo HĐ (PT-10)")
  @GetMapping("/hop-dong-phu-tai/{id}")
  public PtChiTiet chiTiet(@PathVariable String id) {
    HopDongPhuTai p = cmd.snapshot().getHopDongPhuTai().stream().filter(x -> x.getId().equals(id)).findFirst()
        .orElseThrow(() -> ApiException.notFound("Không tìm thấy HĐ"));
    long[] q = Calc.soDuQuyPT(cmd.raw(), id);
    return new PtChiTiet(p, Calc.ptCalc(p, cmd.raw()), q[0], q[1], q[2]);
  }

  @PostMapping("/hop-dong-phu-tai")
  public CommandResponse<HopDongPhuTai> tao(@Valid @RequestBody Req.LuuPhuTai r) {
    return cmd.run("PT.tao", c -> {
      HopDongPhuTai out = pt.savePt(c, r.hd(), r.lyDoTyLe(), true);
      c.nhatKy("HopDongPhuTai", out.getId(), out.getSoHD());
      return out;
    });
  }

  @Operation(summary = "Lưu HĐ Phú Tài", description = "Đổi tỷ lệ chia cần quyền PT-06 và lý do (ghi lịch sử). Dòng \"Oxy chuyển PT\" tự sinh dòng quỹ ảo.")
  @PutMapping("/hop-dong-phu-tai/{id}")
  public CommandResponse<HopDongPhuTai> sua(@PathVariable String id, @Valid @RequestBody Req.LuuPhuTai r) {
    DanhMucController.idPath(id, r.hd(), HopDongPhuTai::getId, HopDongPhuTai::setId);
    return cmd.run("PT.sua", c -> {
      HopDongPhuTai out = pt.savePt(c, r.hd(), r.lyDoTyLe(), false);
      c.nhatKy("HopDongPhuTai", id, out.getSoHD());
      return out;
    });
  }

  @PostMapping("/hop-dong-phu-tai/{id}/chuyen-trang-thai")
  public CommandResponse<Void> chuyen(@PathVariable String id, @Valid @RequestBody Req.ChuyenTrangThai r) {
    return cmd.run("PT.chuyenTrangThai", c -> {
      pt.chuyenTrangThaiPt(c, id, r.toi(), r.lyDoHuy());
      c.nhatKy("HopDongPhuTai", id, "→ " + r.toi());
      return null;
    });
  }

  @Operation(summary = "Thêm dòng tiền quỹ ảo nhập tay (bắt buộc lý do)")
  @PostMapping("/dong-tien-pt")
  public CommandResponse<DongTienPT> dongTien(@Valid @RequestBody Req.DongTienTay r) {
    return cmd.run("PT.dongTienTay", c -> {
      DongTienPT d = pt.themDongTienTay(c, new DongTienPT(null, r.ngay(), r.chieu(), r.hdptId(), r.soTien(), null, null, r.ghiChu()));
      c.nhatKy("DongTienPhuTai", d.getId(), r.chieu());
      return d;
    });
  }

  // ── Việc được giao ───────────────────────────────────────────────────

  @GetMapping("/viec")
  public PageResult<ViecGiao> dsViec(@RequestParam(required = false) String q, @RequestParam(required = false) Boolean xong,
      @RequestParam(required = false) String hdbId, @RequestParam(defaultValue = "han,asc") String sort,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
    return PageResult.of(cmd.snapshot().getViecGiao(), v -> PageResult.khop(q, v.getNoiDung())
            && (xong == null || xong == (v.getXongLuc() != null)) && (hdbId == null || hdbId.equals(v.getHdbId())),
        sort, Map.of("han", ViecGiao::getHan, "taoLuc", ViecGiao::getTaoLuc), page, size);
  }

  @Operation(summary = "Giao việc / đặt lịch", description = "nguoiNhan rỗng = việc của chính mình. Người toàn quyền giao → ưu tiên.")
  @PostMapping("/viec")
  public CommandResponse<ViecGiao> giao(@Valid @RequestBody Req.GiaoViec r) {
    return cmd.run("VIEC.giao", c -> {
      ViecGiao v = viec.giaoViec(c, new ViecService.Moi(r.noiDung(), r.nguoiNhan(), r.nguonLoai(), r.hdbId(), r.hdmId(), r.nhom(), r.batDau(), r.han(), r.gio(), r.mucUuTien(), r.files(), r.khId(), r.kenh(), r.nhacTruoc()));
      c.nhatKy("ViecGiao", v.getId(), null);
      return v;
    });
  }

  @PostMapping("/viec/{id}/phan-hoi")
  public CommandResponse<Void> phanHoi(@PathVariable String id, @Valid @RequestBody Req.PhanHoi r) {
    return cmd.run("VIEC.phanHoi", c -> {
      viec.phanHoiViec(c, id, r.noiDung());
      c.nhatKy("ViecGiao", id, null);
      return null;
    });
  }

  @Operation(summary = "Người nhận đề nghị đổi hạn việc", description = "Kèm lý do và tệp; người giao duyệt trong 1 giờ.")
  @PostMapping("/viec/{id}/yeu-cau-han")
  public CommandResponse<Void> yeuCauHan(@PathVariable String id, @Valid @RequestBody Req.YeuCauHan r) {
    return cmd.run("VIEC.yeuCauHan", c -> {
      viec.yeuCauDoiHan(c, id, r.hanMoi(), r.gioMoi(), r.lyDo(), r.files());
      c.nhatKy("ViecGiao", id, "Đề nghị đổi hạn");
      return null;
    });
  }

  @Operation(summary = "Người giao duyệt / từ chối đổi hạn")
  @PostMapping("/viec/{id}/duyet-han")
  public CommandResponse<Void> duyetHan(@PathVariable String id, @RequestBody Req.DuyetHan r) {
    return cmd.run("VIEC.duyetHan", c -> {
      viec.duyetDoiHan(c, id, r.duyet());
      c.nhatKy("ViecGiao", id, r.duyet() ? "Duyệt đổi hạn" : "Từ chối đổi hạn");
      return null;
    });
  }

  @PostMapping("/viec/{id}/xong")
  public CommandResponse<Void> xong(@PathVariable String id, @RequestBody Req.Xong r) {
    return cmd.run("VIEC.xong", c -> {
      viec.xongViec(c, id, r.xong());
      c.nhatKy("ViecGiao", id, r.xong() ? "Xong" : "Mở lại");
      return null;
    });
  }
}
