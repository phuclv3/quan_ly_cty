package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.fasterxml.jackson.databind.ObjectMapper;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Dates;
import vn.oxymecie.appoxy.common.ExcelTemplate;
import vn.oxymecie.appoxy.persistence.Repos;
import vn.oxymecie.appoxy.security.AppUser;
import vn.oxymecie.appoxy.state.FileStorage;

/** Tạo tệp tải về (Excel, ZIP hồ sơ, bản sao lưu JSON) — toàn bộ việc dựng tệp nằm ở backend. */
@Tag(name = "Xuất tệp", description = "Excel từ bảng đang xem, gói ZIP hồ sơ, bản sao lưu dữ liệu")
@RestController
@RequestMapping("/api/xuat")
public class XuatController {
  private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  private final Cmd cmd;
  private final Repos repos;
  private final FileStorage storage;
  private final ObjectMapper json;

  public XuatController(Cmd cmd, Repos repos, FileStorage storage, ObjectMapper json) {
    this.cmd = cmd;
    this.repos = repos;
    this.storage = storage;
    this.json = json;
  }

  public record ExcelReq(String ten, List<List<Object>> dong) {}

  public record Sheet(String ten, List<List<Object>> dong, List<Double> rong, Boolean tieuDe) {}

  public record XlsxReq(String ten, List<Sheet> sheets) {}

  public record Muc(String path, String fileId) {}

  public record ZipReq(String ten, List<Muc> muc) {}

  private static ResponseEntity<byte[]> tep(String ten, String mime, byte[] b) {
    return ResponseEntity.ok().contentType(MediaType.parseMediaType(mime))
        .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(ten, StandardCharsets.UTF_8).build().toString())
        .header("X-Content-Type-Options", "nosniff").body(b);
  }

  /** 'bao-cao-thang' + 'xlsx' → 'bao-cao-thang-2026-08-26.xlsx'. */
  private static String tenTep(String ten, String ext) {
    String s = ten == null || ten.isBlank() ? "xuat" : ten.replaceAll("[\\\\/:*?\"<>|]", "-");
    return s + "-" + Dates.todayIso(java.time.Clock.system(Dates.VN)) + "." + ext;
  }

  /** Chuẩn hoá đường dẫn trong ZIP: đổi '\\' thành '/', bỏ phần tử rỗng, "." và ".." (chặn zip-slip). */
  static String chuanHoaDuongDan(String s) {
    List<String> ph = new ArrayList<>();
    for (String x : s.replace('\\', '/').split("/")) if (!x.isEmpty() && !x.equals(".") && !x.equals("..")) ph.add(x);
    return String.join("/", ph);
  }

  // ── Excel ──
  @Operation(summary = "Xuất .xlsx từ bảng đang xem", description = "Dòng đầu là tiêu đề. Dựng theo template chung (common/ExcelTemplate).")
  @PostMapping("/excel")
  public ResponseEntity<byte[]> excelTep(@RequestBody ExcelReq r) throws IOException {
    Cmd.user();
    List<List<Object>> dong = r.dong() == null ? List.of() : r.dong();
    String ten = r.ten() == null || r.ten().isBlank() ? "Dữ liệu" : r.ten();
    return tep(tenTep(r.ten(), "xlsx"), XLSX, ExcelTemplate.ghi(List.of(new ExcelTemplate.Bang(ten, dong))));
  }

  @Operation(summary = "Tạo tệp .xlsx (nhiều sheet) — dùng cho tệp mẫu nhập liệu")
  @PostMapping("/xlsx")
  public ResponseEntity<byte[]> xlsxTep(@RequestBody XlsxReq r) throws IOException {
    Cmd.user();
    if (r.sheets() == null || r.sheets().isEmpty()) throw ApiException.invalid("Chưa có sheet nào");
    String ten = r.ten() == null || r.ten().isBlank() ? "xuat.xlsx" : r.ten().replaceAll("[\\\\/:*?\"<>|]", "-");
    // Tệp mẫu nhập liệu: giữ nguyên kiểu dữ liệu người dùng điền lại (không đổi chữ ngày / % thành ô ngày / ô tỷ lệ).
    List<ExcelTemplate.Bang> bang = r.sheets().stream()
        .map(sh -> new ExcelTemplate.Bang(sh.ten(), sh.dong() == null ? List.of() : sh.dong(), sh.rong(), !Boolean.FALSE.equals(sh.tieuDe()), false))
        .toList();
    return tep(ten.endsWith(".xlsx") ? ten : ten + ".xlsx", XLSX, ExcelTemplate.ghi(bang));
  }

  private static void put(ZipOutputStream zo, String path, byte[] b) throws IOException {
    zo.putNextEntry(new ZipEntry(path));
    zo.write(b);
    zo.closeEntry();
  }

  // ── ZIP hồ sơ ──
  @Operation(summary = "Gói các tệp hồ sơ thành ZIP", description = "Chỉ gói tệp người dùng được xem (cùng quy tắc GET /api/tep/{id}); tệp không có quyền / không còn thì bỏ qua.")
  @PostMapping("/zip")
  public ResponseEntity<byte[]> zipTep(@RequestBody ZipReq r) throws IOException {
    AppUser u = Cmd.user();
    var db = cmd.snapshot();
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    Set<String> ten = new HashSet<>();
    int n = 0;
    try (ZipOutputStream zo = new ZipOutputStream(out)) {
      for (Muc m : r.muc() == null ? List.<Muc>of() : r.muc()) {
        var e = repos.tepTin().findById(m.fileId()).orElse(null);
        if (e == null || (!u.id().equals(e.getNguoiUpload()) && !HoSoController.duocXem(db, m.fileId()))) continue;
        var p = storage.path(e.getDuongDan());
        if (!Files.isRegularFile(p)) continue;
        String path = chuanHoaDuongDan(m.path() == null || m.path().isBlank() ? e.getTen() : m.path());
        if (path.isEmpty()) path = "tep";
        while (!ten.add(path)) path = "_" + path;
        put(zo, path, Files.readAllBytes(p));
        n++;
      }
    }
    if (n == 0) throw ApiException.notFound("Không có tệp nào còn trên máy chủ");
    String tenZip = r.ten() == null || r.ten().isBlank() ? "ho-so.zip" : r.ten().replaceAll("[\\\\/:*?\"<>|]", "-");
    return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/zip"))
        .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(tenZip, StandardCharsets.UTF_8).build().toString())
        .header("X-Tep-Count", String.valueOf(n)).header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, "X-Tep-Count").body(out.toByteArray());
  }

  // ── Sao lưu ──
  @Operation(summary = "Tải bản sao lưu dữ liệu (JSON) người dùng được thấy")
  @GetMapping("/ban-sao")
  public ResponseEntity<byte[]> banSao() throws IOException {
    return tep(tenTep("app-oxy-ban-sao", "json"), "application/json", json.writeValueAsBytes(cmd.snapshot()));
  }
}
