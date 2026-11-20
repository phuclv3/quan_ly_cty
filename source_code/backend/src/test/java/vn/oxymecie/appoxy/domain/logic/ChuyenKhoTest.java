package vn.oxymecie.appoxy.domain.logic;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.calc.Calc.DongLo;
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.domain.model.DongPhieuKho;
import vn.oxymecie.appoxy.domain.model.Kho;
import vn.oxymecie.appoxy.domain.model.LoaiHang;
import vn.oxymecie.appoxy.domain.model.NhomQuyen;
import vn.oxymecie.appoxy.domain.model.PhieuKho;
import vn.oxymecie.appoxy.domain.model.TaiKhoan;
import vn.oxymecie.appoxy.domain.model.TrangThai;

/** Chuyển kho: cặp phiếu Xuất / Nhập; tổng SL và giá trị không đổi, lô mới kế thừa đơn giá + ngày nhập. */
class ChuyenKhoTest {
  static final String MA = "KC-O2-40L";

  Db db;
  Ctx c;
  KhoService kho;

  @BeforeEach
  void setUp() {
    db = new Db();
    NhomQuyen gd = new NhomQuyen();
    gd.setId("NQ-GD");
    gd.setToanQuyen(true);
    gd.setTrangThai(TrangThai.HOAT_DONG);
    db.getNhomQuyen().add(gd);
    TaiKhoan tk = new TaiKhoan();
    tk.setId("TK-1");
    tk.setHoTen("Thủ kho");
    tk.setTrangThai(TrangThai.HOAT_DONG);
    tk.setNhom(new ArrayList<>(List.of("NQ-GD")));
    db.getTaiKhoan().add(tk);
    LoaiHang lh = new LoaiHang();
    lh.setId(MA);
    lh.setTen("Khí O2 40L");
    lh.setDangDung(true);
    db.getLoaiHang().add(lh);
    db.getKho().add(new Kho("K1", "Kho Oxy", "Kho thường", true));
    db.getKho().add(new Kho("K2", "Kho Hải Phòng", "Kho thường", true));
    db.getPhieuKho().add(new PhieuKho("PK-N", "NK2611-001", "2026-11-01", "Nhập", "Nhập tay – điều chỉnh", null, "K1", "Test", "TK-1",
        TrangThai.HIEU_LUC, null, new ArrayList<>(List.of(new DongPhieuKho(MA, "", 10, "L1-01", 100000.0, 8.0, null, null, null, null))),
        "HD1", "NCC1", null));
    c = new Ctx(db, "TK-1", Clock.fixed(Instant.parse("2026-11-14T03:00:00Z"), ZoneOffset.UTC), null, null);
    kho = new KhoService();
  }

  private List<KhoService.DongXuat> dong(double sl) {
    return List.of(new KhoService.DongXuat(MA, null, sl, null, null));
  }

  private double tongTon() {
    return Calc.tonTheoLo(db, null).stream().mapToDouble(l -> l.ton).sum();
  }

  private double tonKhoId(String k) {
    return Calc.tonTheoLo(db, null).stream().filter(l -> l.kho.equals(k)).mapToDouble(l -> l.ton).sum();
  }

  private double tongGiaTri() {
    return Calc.tonTheoLo(db, null).stream().mapToDouble(l -> l.giaTriTon).sum();
  }

  @Test
  void chuyenKhoGiuNguyenTongSoLuongVaGiaTri() {
    double ton0 = tongTon();
    double gt0 = tongGiaTri();
    PhieuKho x = kho.chuyenKho(c, "2026-11-14", "K1", "K2", dong(4), "Chuyển ra Hải Phòng");
    assertEquals(ton0, tongTon(), 1e-9);
    assertEquals(gt0, tongGiaTri(), 1e-6);
    assertEquals(6, tonKhoId("K1"), 1e-9);
    assertEquals(4, tonKhoId("K2"), 1e-9);
    PhieuKho n = c.phieuKho(x.getChuyenId());
    assertEquals("Nhập", n.getLoai());
    assertEquals(x.getId(), n.getChuyenId());
    assertEquals("Chuyển kho", n.getNguonGoc());
  }

  @Test
  void loMoiKeThuaDonGiaNgayNhapVaHoaDon() {
    kho.chuyenKho(c, "2026-11-14", "K1", "K2", dong(4), null);
    DongLo moi = Calc.tonTheoLo(db, null).stream().filter(l -> l.kho.equals("K2")).findFirst().orElseThrow();
    assertEquals(100000.0, moi.donGia, 1e-9);
    assertEquals("2026-11-01", moi.ngay);
    assertEquals("HD1", moi.soHoaDon);
    assertEquals("NCC1", moi.ncc);
    assertEquals(8.0, moi.vat, 1e-9);
  }

  @Test
  void khongChuyenQuaTonVaKhongChuyenCungKho() {
    assertThrows(ApiException.class, () -> kho.chuyenKho(c, "2026-11-14", "K1", "K2", dong(11), null));
    assertThrows(ApiException.class, () -> kho.chuyenKho(c, "2026-11-14", "K1", "K1", dong(1), null));
    assertEquals(1, db.getPhieuKho().size());
  }

  @Test
  void chuyenQuaLaiVaXuatTuKhoDen() {
    kho.chuyenKho(c, "2026-11-14", "K1", "K2", dong(4), null);
    kho.chuyenKho(c, "2026-11-14", "K2", "K1", dong(2), null);
    assertEquals(10, tongTon(), 1e-9);
    assertTrue(Calc.tonTheoLo(db, null).stream().allMatch(l -> l.donGia == 100000.0));
  }
}
