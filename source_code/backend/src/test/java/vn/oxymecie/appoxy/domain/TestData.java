package vn.oxymecie.appoxy.domain;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import vn.oxymecie.appoxy.domain.logic.Ctx;
import vn.oxymecie.appoxy.domain.model.*;

/** Dữ liệu nhỏ trong bộ nhớ cho test nghiệp vụ — nhóm quyền giống V2__default_data.sql. */
public final class TestData {
  public static final Clock CLOCK = Clock.fixed(Instant.parse("2026-05-10T03:00:00Z"), ZoneOffset.UTC);
  public static final ObjectMapper OM = new ObjectMapper().setSerializationInclusion(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL);

  public static final String GD = "TK-GD";
  public static final String KT = "TK-KT";
  public static final String KT2 = "TK-KT2";
  public static final String SALE = "TK-SALE";
  public static final String SALE2 = "TK-SALE2";
  public static final String KHO = "TK-KHO";
  public static final String ADMIN = "TK-ADMIN";

  private TestData() {}

  private static NhomQuyen nhom(String id, String ma, boolean toanQuyen, Map<String, String> q) {
    return new NhomQuyen(id, ma, ma, "", toanQuyen, "Hoạt động", new LinkedHashMap<>(q), true, "2026-01-01T00:00:00.000Z", null, null);
  }

  public static Db db() {
    Db d = new Db();
    d.getNhomQuyen().add(nhom("NQ-GD", "GIAM_DOC", true, Map.of()));
    d.getNhomQuyen().add(nhom("NQ-KT", "KE_TOAN", false, Map.ofEntries(Map.entry("NT-14", "view"), Map.entry("NT-11", "request"),
        Map.entry("NT-11-KT", "approve"), Map.entry("KT-01", "edit"), Map.entry("KT-04", "edit"), Map.entry("KT-07", "approve"),
        Map.entry("KT-12", "edit"), Map.entry("KT-14", "approve"), Map.entry("KT-17", "view"), Map.entry("HDB-13", "view"),
        Map.entry("HDM-10", "view"), Map.entry("HDB-01", "view"), Map.entry("HDB-07", "view"), Map.entry("HDB-10", "edit"),
        Map.entry("HDM-01", "view"), Map.entry("HDM-08", "edit"), Map.entry("KHO-01", "view"), Map.entry("KHO-06", "view"),
        Map.entry("KHO-09", "view"), Map.entry("PT-01", "edit"), Map.entry("PT-06", "edit"), Map.entry("BC-01", "view"), Map.entry("TD-01", "edit"))));
    d.getNhomQuyen().add(nhom("NQ-SALE", "SALE", false, Map.ofEntries(Map.entry("NT-11", "request"), Map.entry("KT-04", "draft"),
        Map.entry("KT-12", "own"), Map.entry("KT-17", "ownView"), Map.entry("HDB-13", "own"), Map.entry("HDB-01", "own"),
        Map.entry("HDB-07", "own"), Map.entry("HDB-04", "own"), Map.entry("HDM-01", "ownView"), Map.entry("HDM-08", "ownView"),
        Map.entry("KHO-01", "view"), Map.entry("KHO-09", "view"), Map.entry("BC-01", "ownView"), Map.entry("TD-01", "own"))));
    d.getNhomQuyen().add(nhom("NQ-ADMIN", "ADMIN_KD", false, Map.ofEntries(Map.entry("NT-11", "request"), Map.entry("KT-04", "draft"),
        Map.entry("KT-12", "edit"), Map.entry("KT-17", "view"), Map.entry("HDB-13", "edit"), Map.entry("HDB-13-PB", "edit"),
        Map.entry("HDM-10", "edit"), Map.entry("HDB-01", "edit"), Map.entry("HDB-07", "edit"), Map.entry("HDB-04", "edit"),
        Map.entry("HDM-01", "edit"), Map.entry("HDM-08", "edit"), Map.entry("HDM-06", "edit"), Map.entry("KHO-01", "view"),
        Map.entry("KHO-09", "view"), Map.entry("PT-01", "view"), Map.entry("BC-01", "view"), Map.entry("TD-01", "edit"))));
    d.getNhomQuyen().add(nhom("NQ-KHO", "KHO", false, Map.ofEntries(Map.entry("NT-11", "request"), Map.entry("HDM-10", "view"),
        Map.entry("HDB-01", "view"), Map.entry("HDB-04", "edit"), Map.entry("HDM-01", "view"), Map.entry("HDM-08", "view"),
        Map.entry("HDM-06", "edit"), Map.entry("KHO-01", "edit"), Map.entry("KHO-06", "edit"), Map.entry("KHO-09", "view"),
        Map.entry("TD-01", "edit"))));
    d.getTaiKhoan().add(tk(GD, "gd@x.vn", "NQ-GD"));
    d.getTaiKhoan().add(tk(KT, "kt@x.vn", "NQ-KT"));
    d.getTaiKhoan().add(tk(KT2, "kt2@x.vn", "NQ-KT"));
    d.getTaiKhoan().add(tk(SALE, "sale@x.vn", "NQ-SALE"));
    d.getTaiKhoan().add(tk(SALE2, "sale2@x.vn", "NQ-SALE"));
    d.getTaiKhoan().add(tk(KHO, "kho@x.vn", "NQ-KHO"));
    d.getTaiKhoan().add(tk(ADMIN, "admin@x.vn", "NQ-ADMIN"));
    d.getNguonTien().add(new NguonTien("NT-TM", "Tiền mặt", "Tiền mặt", null, null, 50_000_000, "2026-01-01", "Đang dùng"));
    d.getNguonTien().add(new NguonTien("NT-NH", "Ngân hàng", "Ngân hàng", "123", "VCB", 900_000_000, "2026-01-01", "Đang dùng"));
    d.getLoaiChiPhi().add(new LoaiChiPhi("VH-VP", "Văn phòng", "Vận hành", true));
    d.getLoaiChiPhi().add(new LoaiChiPhi("CPTH-HH", "Hoa hồng", "Thực hiện HĐ", true));
    d.getLoaiChiPhi().add(new LoaiChiPhi("CPTH-VC", "Vận chuyển", "Thực hiện HĐ", true));
    d.getKho().add(new Kho("KHO-CT", "Chuyển thẳng", "Chuyển thẳng", true));
    d.getKho().add(new Kho("KHO-OM", "Kho Oxy Mecie", "Kho thường", true));
    d.getLoaiHang().add(new LoaiHang("KC-NO-8L", "Khí chuẩn NO 8L", null, "Khí chuẩn", "Bình", new ArrayList<>(List.of("Nồng độ")), true, "NO", "8L", null));
    d.getLoaiHang().add(new LoaiHang("KC-SO2-8L", "Khí chuẩn SO2 8L", null, "Khí chuẩn", "Bình", new ArrayList<>(), true, "SO2", "8L", null));
    KhachHang k = new KhachHang();
    k.setId("KH0001");
    k.setTen("Công ty A");
    k.setMst("0101248141");
    k.setDiaChi("Hà Nội");
    k.setNguoiLienHe("");
    k.setDienThoai("");
    k.setEmail("");
    k.setGhiChu("");
    k.setPhuTrach(SALE);
    d.getKhachHang().add(k);
    d.getNcc().add(new NhaCungCap("NCC0001", "NCC A", "0101248142", "", "Việt Nam", "", "", "", "", null));
    return d;
  }

  public static TaiKhoan tk(String id, String email, String nhom) {
    return new TaiKhoan(id, email, id, new ArrayList<>(List.of(nhom)), "Hoạt động", false, 0, null, null);
  }

  public static Ctx ctx(Db db, String me) {
    return new Ctx(db, me, CLOCK, OM, id -> null);
  }

  /** HĐ bán mới ở Báo giá do SALE phụ trách. */
  public static HopDongBan hdb(String soHD, long truocVAT) {
    HopDongBan h = new HopDongBan();
    h.setSoHD(soHD);
    h.setMaKH("KH0001");
    h.setTenKH("Công ty A");
    h.setMst("0101248141");
    h.setDiaChi("Hà Nội");
    h.setNgayKy("2026-05-01");
    h.setSale(SALE);
    h.setGhiChu("");
    h.setTruocVAT(truocVAT);
    h.setVat(8);
    h.setThamSoThue(new ThamSoThue(0.2, 0.25, 0.5));
    return h;
  }
}
