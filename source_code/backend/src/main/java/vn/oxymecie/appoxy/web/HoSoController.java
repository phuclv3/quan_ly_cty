package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Set;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Ids;
import vn.oxymecie.appoxy.domain.logic.HoSoService;
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.domain.model.FileRef;
import vn.oxymecie.appoxy.domain.model.HoSo;
import vn.oxymecie.appoxy.domain.model.HoaDon;
import vn.oxymecie.appoxy.persistence.DbMapper;
import vn.oxymecie.appoxy.persistence.Repos;
import vn.oxymecie.appoxy.persistence.entity.TepTinEntity;
import vn.oxymecie.appoxy.security.AppUser;
import vn.oxymecie.appoxy.state.FileStorage;
import vn.oxymecie.appoxy.web.dto.Req;

@Tag(name = "Hồ sơ & tệp", description = "Tải lên / tải về tệp, hồ sơ hợp đồng, hoá đơn (NT-12, HDB-05/06)")
@RestController
@RequestMapping("/api")
public class HoSoController {
  private static final long MAX = 20L * 1024 * 1024;
  private static final Set<String> MIME = Set.of("application/pdf", "image/png", "image/jpeg", "image/webp", "image/heic", "image/heif");

  private final Cmd cmd;
  private final HoSoService svc;
  private final Repos repos;
  private final FileStorage storage;
  private final DbMapper mapper;
  private final Clock clock;

  public HoSoController(Cmd cmd, HoSoService svc, Repos repos, FileStorage storage, DbMapper mapper, Clock clock) {
    this.cmd = cmd;
    this.svc = svc;
    this.repos = repos;
    this.storage = storage;
    this.mapper = mapper;
    this.clock = clock;
  }

  @Operation(summary = "Tải lên một tệp (≤ 20MB; PDF / ảnh)",
      description = "Trả FileRef để gắn vào hồ sơ / phiếu. thumb: ảnh thu nhỏ data URL do client tạo (tuỳ chọn).")
  @PostMapping(value = "/tep", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @Transactional
  public FileRef upload(@RequestPart("file") MultipartFile file, @RequestParam(required = false) String thumb) throws IOException {
    AppUser u = Cmd.user();
    if (file.isEmpty()) throw ApiException.invalid("Tệp rỗng");
    String name = file.getOriginalFilename() == null ? "tep" : file.getOriginalFilename();
    if (file.getSize() > MAX) throw ApiException.invalid("Tệp \"" + name + "\" lớn hơn 20MB");
    String mime = file.getContentType() == null ? "" : file.getContentType();
    String lower = name.toLowerCase();
    boolean duoiHopLe = lower.matches(".*\\.(pdf|png|jpe?g|webp|heic|heif)$");
    if (!MIME.contains(mime) && !duoiHopLe) throw ApiException.invalid("Chỉ nhận PDF hoặc ảnh (PNG, JPG, WEBP, HEIC)");
    if (thumb != null && (!thumb.startsWith("data:image/") || thumb.length() > 200_000)) thumb = null;
    String id = Ids.uid("F");
    String key;
    try (InputStream in = file.getInputStream()) {
      key = storage.save(id, in);
    }
    TepTinEntity e = new TepTinEntity();
    e.setId(id);
    e.setTen(name.length() > 255 ? name.substring(name.length() - 255) : name);
    e.setMime(mime.length() > 100 ? mime.substring(0, 100) : mime);
    e.setKichThuoc(file.getSize());
    e.setThumb(thumb);
    e.setDuongDan(key);
    e.setNgayUpload(Instant.now(clock));
    e.setNguoiUpload(u.id());
    repos.tepTin().save(e);
    return mapper.file(e);
  }

  @Operation(summary = "Tải nội dung tệp", description = "Chỉ khi tệp gắn với bản ghi người dùng được thấy, hoặc do chính người đó tải lên.")
  @GetMapping("/tep/{id}")
  public ResponseEntity<Resource> download(@PathVariable String id, @RequestParam(defaultValue = "false") boolean taiVe) {
    AppUser u = Cmd.user();
    TepTinEntity e = repos.tepTin().findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy tệp"));
    if (!u.id().equals(e.getNguoiUpload()) && !duocXem(cmd.snapshot(), id)) throw ApiException.forbidden("Bạn không có quyền xem tệp này");
    var res = new FileSystemResource(storage.path(e.getDuongDan()));
    MediaType type;
    try {
      type = MediaType.parseMediaType(e.getMime().isEmpty() ? "application/octet-stream" : e.getMime());
    } catch (RuntimeException ex) {
      type = MediaType.APPLICATION_OCTET_STREAM;
    }
    ContentDisposition cd = (taiVe ? ContentDisposition.attachment() : ContentDisposition.inline()).filename(e.getTen(), StandardCharsets.UTF_8).build();
    return ResponseEntity.ok().contentType(type).header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
        .header("X-Content-Type-Options", "nosniff").body(res);
  }

  private static boolean duocXem(Db d, String id) {
    return d.getHoSo().stream().anyMatch(h -> h.getFiles().stream().anyMatch(f -> f.getId().equals(id)))
        || d.getPhieuThuChi().stream().anyMatch(p -> p.getFiles().stream().anyMatch(f -> f.getId().equals(id)))
        || d.getChiPhiHD().stream().anyMatch(p -> p.getFiles().stream().anyMatch(f -> f.getId().equals(id)))
        || d.getHoaDon().stream().anyMatch(h -> id.equals(h.getFileId()));
  }

  @Operation(summary = "Gắn tệp đã tải lên vào hồ sơ một loại của hợp đồng", description = "chu: HDB / HDM / HDPT; hồ sơ tự tích \"Đã lưu\".")
  @PostMapping("/ho-so/{chu}/{chuId}/{loai}/tep")
  public CommandResponse<HoSo> ganTep(@PathVariable String chu, @PathVariable String chuId, @PathVariable String loai,
      @Valid @RequestBody Req.GanTep r) {
    return cmd.run("HS.ganTep", c -> {
      HoSo h = svc.uploadHoSo(c, chu, chuId, loai, r.fileIds());
      c.nhatKy("HoSo", h.getId(), chu + " " + chuId + " — " + loai);
      return h;
    });
  }

  @Operation(summary = "Tích Đã lưu (bản giấy — bắt buộc ghi chú) / Đã scan")
  @PatchMapping("/ho-so/{chu}/{chuId}/{loai}")
  public CommandResponse<HoSo> danhDau(@PathVariable String chu, @PathVariable String chuId, @PathVariable String loai,
      @Valid @RequestBody Req.HoSoCo r) {
    return cmd.run("HS.danhDau", c -> {
      HoSo h = svc.setHoSoCo(c, chu, chuId, loai, r.daLuu(), r.daScan(), r.ghiChu());
      c.nhatKy("HoSo", h.getId(), chu + " " + chuId + " — " + loai);
      return h;
    });
  }

  @Operation(summary = "Thêm / sửa hoá đơn của hợp đồng")
  @PostMapping("/hoa-don")
  public CommandResponse<HoaDon> hoaDon(@RequestBody HoaDon x) {
    return cmd.run("HD.luu", c -> {
      HoaDon out = svc.saveHoaDon(c, x);
      c.nhatKy("HoaDon", out.getId(), out.getSoHoaDon());
      return out;
    });
  }
}
