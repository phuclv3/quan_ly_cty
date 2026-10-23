package vn.oxymecie.appoxy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import vn.oxymecie.appoxy.state.DataStore;

/**
 * Kiểm thử tích hợp trên MySQL 8 thật (Testcontainers): migration Flyway V1 + V2 + dữ liệu mẫu dev, ánh xạ JPA,
 * khoá ngoại / transaction, xác thực, phân quyền và các luồng nghiệp vụ chính qua HTTP.
 * Không có Docker → tự bỏ qua (disabledWithoutDocker).
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ApiIntegrationTest {
  static final String MK = "Oxy@2026";

  @Container
  @ServiceConnection
  static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0.36").withCommand("--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci");

  @DynamicPropertySource
  static void props(DynamicPropertyRegistry r) {
    r.add("app.storage.dir", () -> System.getProperty("java.io.tmpdir") + "/app-oxy-test-files");
  }

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper om;
  @Autowired JdbcTemplate jdbc;
  @Autowired DataStore store;

  String login(String email) throws Exception {
    String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(om.writeValueAsString(Map.of("email", email, "matKhau", MK))))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    return om.readTree(body).get("token").asText();
  }

  ResultActions call(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder b, String token, Object body) throws Exception {
    b.header("Authorization", "Bearer " + token);
    if (body != null) b.contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(body));
    return mvc.perform(b);
  }

  JsonNode json(ResultActions r) throws Exception {
    return om.readTree(r.andReturn().getResponse().getContentAsString());
  }

  @Test
  @Order(1)
  void migration_taoDuBangVaDuLieuMau() {
    Integer bang = jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()", Integer.class);
    assertThat(bang).isGreaterThanOrEqualTo(45);
    assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM chuc_nang", Integer.class)).isEqualTo(30);
    assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM khach_hang", Integer.class)).isGreaterThan(400);
    assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM hop_dong_ban", Integer.class)).isGreaterThan(20);
    // Không lưu mật khẩu dạng thô.
    assertThat(jdbc.queryForList("SELECT mat_khau_bam FROM tai_khoan", String.class)).allMatch(s -> s.startsWith("$2"));
  }

  @Test
  @Order(2)
  void dangNhap_saiMatKhau_va_khongCoToken() throws Exception {
    mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(om.writeValueAsString(Map.of("email", "ketoan@oxymecie.vn", "matKhau", "sai-mat-khau"))))
        .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Email hoặc mật khẩu không đúng"));
    mvc.perform(get("/api/db")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/db").header("Authorization", "Bearer " + "0".repeat(48))).andExpect(status().isUnauthorized());
  }

  @Test
  @Order(3)
  void snapshot_khongCoMatKhau_vaLocTheoQuyen() throws Exception {
    String gd = login("giamdoc@oxymecie.vn");
    JsonNode all = json(call(get("/api/db"), gd, null).andExpect(status().isOk()));
    assertThat(all.toString()).doesNotContain("matKhau").doesNotContain("$2a$");
    int tongHdb = all.get("hopDongBan").size();
    String sale = login("sale@oxymecie.vn");
    JsonNode sdb = json(call(get("/api/db"), sale, null).andExpect(status().isOk()));
    // Dữ liệu mẫu gán phần lớn HĐ cho sale demo — kiểm từng dòng thay vì so số lượng.
    assertThat(sdb.get("hopDongBan").size()).isLessThanOrEqualTo(tongHdb);
    for (JsonNode h : sdb.get("hopDongBan")) assertThat(h.get("sale").asText()).isEqualTo(idCua(sdb, "sale@oxymecie.vn"));
    assertThat(sdb.get("hopDongPhuTai").size()).isZero();
  }

  static String idCua(JsonNode db, String email) {
    for (JsonNode t : db.get("taiKhoan")) if (t.get("email").asText().equals(email)) return t.get("id").asText();
    return null;
  }

  @Test
  @Order(4)
  void luongHopDongBan_quaHttp_ghiThatXuongDb() throws Exception {
    String admin = login("admin@oxymecie.vn");
    String kt = login("ketoan@oxymecie.vn");
    String gd = login("giamdoc@oxymecie.vn");
    JsonNode db = json(call(get("/api/db"), gd, null));
    String saleId = idCua(db, "sale@oxymecie.vn");
    String maKH = db.get("khachHang").get(0).get("id").asText();

    Map<String, Object> hd = new java.util.HashMap<>(Map.of("id", "HDBtestit0001", "soHD", "IT-001", "maKH", maKH, "tenKH", "KH test",
        "mst", "0101248141", "diaChi", "HN", "ngayKy", "2026-05-01", "sale", saleId, "ghiChu", "", "truocVAT", 10_000_000));
    hd.put("vat", 8);
    hd.put("thucTeTruocVAT", 8_000_000);
    hd.put("dotTT", List.of(Map.of("dot", 1, "tyLe", 100, "soTien", 10_800_000)));
    JsonNode tao = json(call(post("/api/hop-dong-ban"), admin, hd).andExpect(status().isOk()));
    assertThat(tao.at("/data/trangThai").asText()).isEqualTo("Báo giá");
    assertThat(tao.at("/changes/upsert/hopDongBan/0/id").asText()).isEqualTo("HDBtestit0001");
    assertThat(jdbc.queryForObject("SELECT trang_thai FROM hop_dong_ban WHERE id = 'HDBtestit0001'", String.class)).isEqualTo("Báo giá");

    // Trùng số HĐ → 409.
    hd.put("id", "HDBtestit0002");
    call(post("/api/hop-dong-ban"), admin, hd).andExpect(status().isConflict());

    call(post("/api/hop-dong-ban/HDBtestit0001/chuyen-trang-thai"), admin, Map.of("toi", "Hiệu lực")).andExpect(status().isOk());
    // Admin không có quyền ghi thực thu (HDB-10).
    Map<String, Object> thu = Map.of("ngayThu", "2026-05-05", "soTienThu", 10_800_000, "nguonTienNhan", "NT-NH");
    call(post("/api/hop-dong-ban/HDBtestit0001/dot/1/thuc-thu"), admin, thu).andExpect(status().isForbidden());
    JsonNode tt = json(call(post("/api/hop-dong-ban/HDBtestit0001/dot/1/thuc-thu"), kt, thu).andExpect(status().isOk()));
    String phieuId = tt.at("/data/id").asText();
    assertThat(tt.at("/data/trangThai").asText()).isEqualTo("Chờ duyệt");
    assertThat(jdbc.queryForObject("SELECT phieu_thu_id FROM hdb_dot_tt WHERE hdb_id = 'HDBtestit0001' AND dot = 1", String.class)).isEqualTo(phieuId);
    // Kế toán tự lập → không tự duyệt; Giám đốc duyệt.
    JsonNode tuDuyet = json(call(post("/api/phieu-thu-chi/duyet"), kt, Map.of("ids", List.of(phieuId))).andExpect(status().isOk()));
    assertThat(tuDuyet.get("message").asText()).contains("Không tự duyệt");
    call(post("/api/phieu-thu-chi/duyet"), gd, Map.of("ids", List.of(phieuId))).andExpect(status().isOk());
    assertThat(jdbc.queryForObject("SELECT trang_thai FROM phieu_thu_chi WHERE id = ?", String.class, phieuId)).isEqualTo("Đã duyệt");

    JsonNode ct = json(call(get("/api/hop-dong-ban/HDBtestit0001"), gd, null).andExpect(status().isOk()));
    assertThat(ct.at("/tinhToan/daThu").asLong()).isEqualTo(10_800_000);
    assertThat(ct.at("/tinhToan/conPhaiThu").asLong()).isZero();

    // Validation: thiếu lý do huỷ → 400.
    call(post("/api/hop-dong-ban/HDBtestit0001/huy"), admin, Map.of("lyDo", "")).andExpect(status().isBadRequest());
    // Đã có phiếu thu → không huỷ được.
    call(post("/api/hop-dong-ban/HDBtestit0001/huy"), admin, Map.of("lyDo", "test")).andExpect(status().isConflict());
  }

  @Test
  @Order(5)
  void kho_xuatQuaTon_bitChan_vaDoiMaHangCascade() throws Exception {
    String kho = login("kho@oxymecie.vn");
    Map<String, Object> phieu = Map.of("phieu", Map.of("ngay", "2026-05-02", "loai", "Nhập", "kho", "KHO-OM", "lyDo", "Test nhập"),
        "dongNhap", List.of(Map.of("loaiHang", "KC-NO-8L", "thuocTinh", "NO 500ppm", "soLuong", 2, "donGia", 1_500_000)));
    String lh = jdbc.queryForObject("SELECT id FROM loai_hang ORDER BY id LIMIT 1", String.class);
    @SuppressWarnings("unchecked")
    Map<String, Object> p2 = om.readValue(om.writeValueAsString(phieu).replace("KC-NO-8L", lh), Map.class);
    JsonNode r = json(call(post("/api/phieu-kho"), kho, p2).andExpect(status().isOk()));
    String lo = r.at("/data/dong/0/lo").asText();
    Map<String, Object> xuat = Map.of("phieu", Map.of("ngay", "2026-05-03", "loai", "Xuất", "kho", "KHO-OM", "lyDo", "Test xuất"),
        "dongXuat", List.of(Map.of("loaiHang", lh, "lo", lo, "soLuong", 5)));
    call(post("/api/phieu-kho"), kho, xuat).andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("không đủ tồn")));

    String moi = (lh + "-X").toUpperCase();
    call(post("/api/loai-hang/" + lh + "/doi-ma"), kho, Map.of("moi", moi)).andExpect(status().isOk());
    assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM phieu_kho_dong WHERE loai_hang = ?", Integer.class, moi)).isGreaterThan(0);
    assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM loai_hang WHERE id = ?", Integer.class, lh)).isZero();
    // Cache nạp lại từ DB vẫn khớp.
    store.invalidate();
    assertThat(store.current().getLoaiHang()).anyMatch(l -> l.getId().equals(moi));
  }

  @Test
  @Order(6)
  void phanQuyen_chiXemKhongGhiDuoc_vaBatDoiMatKhau() throws Exception {
    String xem = login("chixem@oxymecie.vn");
    call(post("/api/khach-hang"), xem, Map.of("ten", "X", "mst", "0101248141")).andExpect(status().isForbidden());
    // Tài khoản Sale KD seed bắt đổi mật khẩu: chỉ đọc được, ghi bị chặn.
    String hongHa = login("hongha@oxymecie.vn");
    call(get("/api/db"), hongHa, null).andExpect(status().isOk());
    call(post("/api/khach-hang"), hongHa, Map.of("ten", "X", "mst", "0101248141")).andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("MUST_CHANGE_PASSWORD"));
    call(post("/api/auth/doi-mat-khau"), hongHa, Map.of("cu", MK, "moi", "MatKhauMoi@1", "nhapLai", "MatKhauMoi@1")).andExpect(status().isNoContent());
  }

  @Test
  @Order(7)
  void tepHoSo_vaDuyetXoaQuaHttp() throws Exception {
    String admin = login("admin@oxymecie.vn");
    String gd = login("giamdoc@oxymecie.vn");
    MockMultipartFile f = new MockMultipartFile("file", "hop-dong.pdf", "application/pdf", "%PDF-1.4 test".getBytes());
    JsonNode up = json(mvc.perform(multipart("/api/tep").file(f).header("Authorization", "Bearer " + admin)).andExpect(status().isOk()));
    String fileId = up.get("id").asText();
    call(post("/api/ho-so/HDB/HDBtestit0001/Hợp đồng/tep"), admin, Map.of("fileIds", List.of(fileId))).andExpect(status().isOk());
    assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ho_so_tep WHERE tep_id = ?", Integer.class, fileId)).isEqualTo(1);
    String noiDung = call(get("/api/tep/" + fileId), gd, null).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    assertThat(noiDung).startsWith("%PDF");
    // Tệp lạ (exe) bị chặn.
    MockMultipartFile exe = new MockMultipartFile("file", "virus.exe", "application/octet-stream", new byte[] {1, 2});
    mvc.perform(multipart("/api/tep").file(exe).header("Authorization", "Bearer " + admin)).andExpect(status().isUnprocessableEntity());

    // Yêu cầu xoá tệp hồ sơ → người khác duyệt.
    String hsId = jdbc.queryForObject("SELECT ho_so_id FROM ho_so_tep WHERE tep_id = ?", String.class, fileId);
    JsonNode yc = json(call(post("/api/yeu-cau-xoa"), admin, Map.of("loai", "HoSo", "maDoiTuong", hsId + ":" + fileId, "lyDo", "tải nhầm"))
        .andExpect(status().isOk()));
    String ycId = yc.at("/data/id").asText();
    call(post("/api/yeu-cau-xoa/" + ycId + "/duyet"), admin, null).andExpect(status().isForbidden());
    call(post("/api/yeu-cau-xoa/" + ycId + "/duyet"), gd, null).andExpect(status().isOk());
    assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tep_tin WHERE id = ?", Integer.class, fileId)).isZero();
    assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE hanh_dong = 'YCX.duyet'", Integer.class)).isEqualTo(1);
  }

  @Test
  @Order(8)
  void phienBanDuLieu_tangSauLenhGhi_vaDanhSachPhanTrang() throws Exception {
    String gd = login("giamdoc@oxymecie.vn");
    long v1 = json(call(get("/api/db/version"), gd, null)).get("version").asLong();
    call(put("/api/cau-hinh/SO_DOT_TOI_DA"), gd, Map.of("giaTri", 4)).andExpect(status().isOk());
    long v2 = json(call(get("/api/db/version"), gd, null)).get("version").asLong();
    assertThat(v2).isEqualTo(v1 + 1);
    assertThat(jdbc.queryForObject("SELECT gia_tri FROM cau_hinh WHERE khoa = 'SO_DOT_TOI_DA'", String.class)).isEqualTo("4");
    JsonNode page = json(call(get("/api/khach-hang?size=10&page=1&sort=ten,asc"), gd, null).andExpect(status().isOk()));
    assertThat(page.get("items").size()).isEqualTo(10);
    assertThat(page.get("total").asLong()).isGreaterThan(400);
    call(get("/api/khach-hang?sort=khongCo,asc"), gd, null).andExpect(status().isUnprocessableEntity());
  }
}
