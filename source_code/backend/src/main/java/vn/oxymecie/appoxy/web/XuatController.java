package vn.oxymecie.appoxy.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
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
import vn.oxymecie.appoxy.common.Money;
import vn.oxymecie.appoxy.persistence.Repos;
import vn.oxymecie.appoxy.security.AppUser;
import vn.oxymecie.appoxy.state.FileStorage;

/** Tạo tệp tải về (CSV, Excel, ZIP hồ sơ, bản sao lưu JSON) — toàn bộ việc dựng tệp nằm ở backend. */
@Tag(name = "Xuất tệp", description = "CSV / Excel từ bảng đang xem, gói ZIP hồ sơ, bản sao lưu dữ liệu")
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

  public record CsvReq(String ten, List<List<Object>> dong) {}

  public record Sheet(String ten, List<List<Object>> dong, List<Double> rong, Boolean tieuDe) {}

  public record XlsxReq(String ten, List<Sheet> sheets) {}

  public record Muc(String path, String fileId) {}

  public record ZipReq(String ten, List<Muc> muc) {}

  private static ResponseEntity<byte[]> tep(String ten, String mime, byte[] b) {
    return ResponseEntity.ok().contentType(MediaType.parseMediaType(mime))
        .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(ten, StandardCharsets.UTF_8).build().toString())
        .header("X-Content-Type-Options", "nosniff").body(b);
  }

  /** 'bao-cao-thang' + 'csv' → 'bao-cao-thang-2026-08-26.csv'. */
  private static String tenTep(String ten, String ext) {
    String s = ten == null || ten.isBlank() ? "xuat" : ten.replaceAll("[\\\\/:*?\"<>|]", "-");
    return s + "-" + Dates.todayIso(java.time.Clock.system(Dates.VN)) + "." + ext;
  }

  // ── CSV ──
  /** Dấu chấm phẩy: Excel tiếng Việt đọc dấu phẩy là thập phân. BOM UTF-8 để Excel không lỗi ký tự. */
  static String csv(List<List<Object>> dong) {
    StringBuilder sb = new StringBuilder("﻿");
    for (int i = 0; i < dong.size(); i++) {
      if (i > 0) sb.append("\r\n");
      List<Object> r = dong.get(i);
      for (int j = 0; j < r.size(); j++) {
        if (j > 0) sb.append(';');
        String t = text(r.get(j));
        sb.append(t.matches("(?s).*[\";\\n\\r].*") ? '"' + t.replace("\"", "\"\"") + '"' : t);
      }
    }
    return sb.toString();
  }

  private static String text(Object v) {
    return v == null ? "" : v instanceof Number n ? Money.num(n.doubleValue()) : String.valueOf(v);
  }

  @Operation(summary = "Xuất CSV từ bảng đang xem")
  @PostMapping("/csv")
  public ResponseEntity<byte[]> csvTep(@RequestBody CsvReq r) {
    Cmd.user();
    return tep(tenTep(r.ten(), "csv"), "text/csv;charset=utf-8", csv(r.dong() == null ? List.of() : r.dong()).getBytes(StandardCharsets.UTF_8));
  }

  // ── Excel ──
  @Operation(summary = "Tạo tệp .xlsx (nhiều sheet) — dùng cho tệp mẫu nhập liệu")
  @PostMapping("/xlsx")
  public ResponseEntity<byte[]> xlsxTep(@RequestBody XlsxReq r) throws IOException {
    Cmd.user();
    if (r.sheets() == null || r.sheets().isEmpty()) throw ApiException.invalid("Chưa có sheet nào");
    String ten = r.ten() == null || r.ten().isBlank() ? "xuat.xlsx" : r.ten().replaceAll("[\\\\/:*?\"<>|]", "-");
    return tep(ten.endsWith(".xlsx") ? ten : ten + ".xlsx", XLSX, xlsx(r.sheets()));
  }

  private static String xml(String s) {
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
  }

  private static String cot(int i) {
    return (i < 26 ? "" : cot(i / 26 - 1)) + (char) ('A' + i % 26);
  }

  private static String sheetXml(Sheet sh) {
    boolean td = Boolean.TRUE.equals(sh.tieuDe());
    StringBuilder sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">");
    if (td) sb.append("<sheetViews><sheetView workbookViewId=\"0\"><pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView></sheetViews>");
    if (sh.rong() != null && !sh.rong().isEmpty()) {
      sb.append("<cols>");
      for (int i = 0; i < sh.rong().size(); i++)
        sb.append("<col min=\"").append(i + 1).append("\" max=\"").append(i + 1).append("\" width=\"").append(sh.rong().get(i)).append("\" customWidth=\"1\"/>");
      sb.append("</cols>");
    }
    sb.append("<sheetData>");
    List<List<Object>> dong = sh.dong() == null ? List.of() : sh.dong();
    for (int ri = 0; ri < dong.size(); ri++) {
      String st = td && ri == 0 ? " s=\"1\"" : "";
      sb.append("<row r=\"").append(ri + 1).append("\">");
      List<Object> r = dong.get(ri);
      for (int ci = 0; ci < r.size(); ci++) {
        Object v = r.get(ci);
        String ref = cot(ci) + (ri + 1);
        if (v instanceof Number n) sb.append("<c r=\"").append(ref).append('"').append(st).append("><v>").append(Money.num(n.doubleValue())).append("</v></c>");
        else if (v != null && !String.valueOf(v).isEmpty())
          sb.append("<c r=\"").append(ref).append("\" t=\"inlineStr\"").append(st).append("><is><t xml:space=\"preserve\">").append(xml(String.valueOf(v))).append("</t></is></c>");
      }
      sb.append("</row>");
    }
    return sb.append("</sheetData></worksheet>").toString();
  }

  static byte[] xlsx(List<Sheet> sheets) throws IOException {
    String ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    String rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    String head = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>";
    StringBuilder ct = new StringBuilder(head + "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>");
    StringBuilder wb = new StringBuilder(head + "<workbook xmlns=\"" + ns + "\" xmlns:r=\"" + rel + "\"><sheets>");
    StringBuilder wr = new StringBuilder(head + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">");
    Set<String> daDung = new HashSet<>();
    for (int i = 0; i < sheets.size(); i++) {
      String t = sheets.get(i).ten() == null || sheets.get(i).ten().isBlank() ? "Sheet" + (i + 1) : sheets.get(i).ten().replaceAll("[\\\\/?*\\[\\]:]", "-");
      t = t.length() > 31 ? t.substring(0, 31) : t;
      if (!daDung.add(t.toLowerCase())) t = ("S" + (i + 1) + " " + t).substring(0, Math.min(31, t.length() + 3));
      ct.append("<Override PartName=\"/xl/worksheets/sheet").append(i + 1).append(".xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>");
      wb.append("<sheet name=\"").append(xml(t)).append("\" sheetId=\"").append(i + 1).append("\" r:id=\"rId").append(i + 1).append("\"/>");
      wr.append("<Relationship Id=\"rId").append(i + 1).append("\" Type=\"").append(rel).append("/worksheet\" Target=\"worksheets/sheet").append(i + 1).append(".xml\"/>");
    }
    ct.append("</Types>");
    wb.append("</sheets></workbook>");
    wr.append("<Relationship Id=\"rId").append(sheets.size() + 1).append("\" Type=\"").append(rel).append("/styles\" Target=\"styles.xml\"/></Relationships>");
    String styles = head + "<styleSheet xmlns=\"" + ns + "\"><fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font><font><b/><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts><fills count=\"3\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FFE6F8E6\"/></patternFill></fill></fills><borders count=\"1\"><border/></borders><cellStyleXfs count=\"1\"><xf/></cellStyleXfs><cellXfs count=\"2\"><xf/><xf fontId=\"1\" fillId=\"2\" applyFont=\"1\" applyFill=\"1\"/></cellXfs></styleSheet>";
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    try (ZipOutputStream zo = new ZipOutputStream(out)) {
      put(zo, "[Content_Types].xml", ct.toString().getBytes(StandardCharsets.UTF_8));
      put(zo, "_rels/.rels", (head + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"" + rel + "/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>").getBytes(StandardCharsets.UTF_8));
      put(zo, "xl/workbook.xml", wb.toString().getBytes(StandardCharsets.UTF_8));
      put(zo, "xl/_rels/workbook.xml.rels", wr.toString().getBytes(StandardCharsets.UTF_8));
      put(zo, "xl/styles.xml", styles.getBytes(StandardCharsets.UTF_8));
      for (int i = 0; i < sheets.size(); i++) put(zo, "xl/worksheets/sheet" + (i + 1) + ".xml", sheetXml(sheets.get(i)).getBytes(StandardCharsets.UTF_8));
    }
    return out.toByteArray();
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
        String path = m.path() == null || m.path().isBlank() ? e.getTen() : m.path().replace('\\', '/').replaceAll("^/+|\\.\\./", "");
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
