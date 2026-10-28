package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.oxymecie.appoxy.domain.logic.CanhBaoService;
import vn.oxymecie.appoxy.domain.model.CanhBao;
import vn.oxymecie.appoxy.web.dto.Req;

@Tag(name = "Cảnh báo", description = "Cảnh báo rủi ro nhập tay P0/P1/P2 (tab Cảnh báo) — tách biệt với việc được giao")
@RestController
@RequestMapping("/api")
public class CanhBaoController {
  private final Cmd cmd;
  private final CanhBaoService canhBao;

  public CanhBaoController(Cmd cmd, CanhBaoService canhBao) {
    this.cmd = cmd;
    this.canhBao = canhBao;
  }

  @Operation(summary = "Báo rủi ro", description = "Cảnh báo nhập tay với mức P0 Khẩn cấp / P1 Cao / P2 Cảnh báo sớm và phần ảnh hưởng.")
  @PostMapping("/canh-bao")
  public CommandResponse<CanhBao> bao(@Valid @RequestBody Req.BaoRuiRo r) {
    return cmd.run("CANHBAO.bao", c -> {
      CanhBao cb = canhBao.bao(c, new CanhBaoService.Moi(r.muc(), r.noiDung(), r.anhHuong(), r.theoDoi(), r.hdbId(), r.hdmId()));
      c.nhatKy("CanhBao", cb.getId(), null);
      return cb;
    });
  }

  @Operation(summary = "Thao tác trên cảnh báo hệ thống tự phát hiện",
      description = "Tạo vết xử lý theo khoá cảnh báo nếu chưa có, rồi áp người phụ trách và trạng thái đã xử lý / mở lại.")
  @PostMapping("/canh-bao/he-thong")
  public CommandResponse<CanhBao> heThong(@Valid @RequestBody Req.CanhBaoHeThong r) {
    return cmd.run("CANHBAO.heThong", c -> {
      CanhBao cb = canhBao.xuLyHeThong(c, new CanhBaoService.HeThong(r.khoa(), r.muc(), r.noiDung(), r.anhHuong(), r.theoDoi(), r.hdbId(), r.hdmId(),
          r.nguoiPhuTrach(), r.xong(), r.ghiChu()));
      c.nhatKy("CanhBao", cb.getId(), r.khoa());
      return cb;
    });
  }

  @Operation(summary = "Giao người phụ trách cảnh báo")
  @PostMapping("/canh-bao/{id}/giao")
  public CommandResponse<Void> giao(@PathVariable String id, @RequestBody Req.GiaoCanhBao r) {
    return cmd.run("CANHBAO.giao", c -> {
      canhBao.giao(c, id, r.nguoiPhuTrach());
      c.nhatKy("CanhBao", id, "Giao người phụ trách");
      return null;
    });
  }

  @Operation(summary = "Đánh dấu đã xử lý / mở lại cảnh báo")
  @PostMapping("/canh-bao/{id}/xu-ly")
  public CommandResponse<Void> xuLy(@PathVariable String id, @RequestBody Req.XuLyCanhBao r) {
    return cmd.run("CANHBAO.xuLy", c -> {
      canhBao.xuLy(c, id, r.xong(), r.ghiChu());
      c.nhatKy("CanhBao", id, r.xong() ? "Đã xử lý" : "Mở lại");
      return null;
    });
  }
}
