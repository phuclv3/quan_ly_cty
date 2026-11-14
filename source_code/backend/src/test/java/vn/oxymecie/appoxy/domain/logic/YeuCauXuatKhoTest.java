package vn.oxymecie.appoxy.domain.logic;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.domain.model.DongHangBan;
import vn.oxymecie.appoxy.domain.model.DongPhieuKho;
import vn.oxymecie.appoxy.domain.model.DongYeuCauXuat;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.Kho;
import vn.oxymecie.appoxy.domain.model.LoaiHang;
import vn.oxymecie.appoxy.domain.model.NhomQuyen;
import vn.oxymecie.appoxy.domain.model.PhieuKho;
import vn.oxymecie.appoxy.domain.model.TaiKhoan;
import vn.oxymecie.appoxy.domain.model.TrangThai;
import vn.oxymecie.appoxy.domain.model.YeuCauXuatKho;

/** Yêu cầu xuất kho và giao hàng: gửi → thủ kho xuất / từ chối → cập nhật ngày giao → HĐ bán "Đã giao hàng". */
class YeuCauXuatKhoTest {
  static final String HDB = "HDB-1";
  static final String MA = "KC-O2-40L";

  Db db;
  Ctx c;
  KhoService kho;
  HdbService hdb;

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
    // Lô nhập 10 chai ngày 01/11.
    db.getPhieuKho().add(new PhieuKho("PK-N", "NK2611-001", "2026-11-01", "Nhập", "Nhập tay – điều chỉnh", null, "K1", "Test", "TK-1",
        TrangThai.HIEU_LUC, null, new ArrayList<>(List.of(new DongPhieuKho(MA, "", 10, "L1-01", 100000.0, null, null, null, null, null))),
        "HD1", null, null));
    c = new Ctx(db, "TK-1", Clock.fixed(Instant.parse("2026-11-14T03:00:00Z"), ZoneOffset.UTC), null, null);
    kho = new KhoService();
    hdb = new HdbService(kho, null);
    hdbMoi(5);
  }

  private void hdbMoi(double sl) {
    HopDongBan h = new HopDongBan();
    h.setId(HDB);
    h.setSoHD("HĐ-01");
    h.setTrangThai(TrangThai.HIEU_LUC);
    DongHangBan d = new DongHangBan();
    d.setId("D1");
    d.setLoaiHang(MA);
    d.setTenHang("Khí O2 40L");
    d.setSoLuong(sl);
    h.setDongHang(new ArrayList<>(List.of(d)));
    db.getHopDongBan().clear();
    db.getHopDongBan().add(h);
  }

  private List<DongYeuCauXuat> dong(double sl) {
    return List.of(new DongYeuCauXuat(MA, "Khí O2 40L", sl, null));
  }

  private List<KhoService.DongXuat> xuat(double sl) {
    return List.of(new KhoService.DongXuat(MA, null, sl, null, null));
  }

  private HopDongBan h() {
    return c.hdb(HDB);
  }

  @Test
  void guiYeuCauVuotSoConPhaiGiaoBiChan() {
    assertThrows(ApiException.class, () -> hdb.guiYeuCauXuatKho(c, HDB, dong(6), null));
    YeuCauXuatKho y = hdb.guiYeuCauXuatKho(c, HDB, dong(3), "Giao sớm");
    assertEquals(TrangThai.CHO_KHO, y.getTrangThai());
    assertTrue(y.getSoYC().startsWith("YC26-"));
    // 3 đã nằm trong yêu cầu Chờ kho → chỉ còn 2.
    var ex = assertThrows(ApiException.class, () -> hdb.guiYeuCauXuatKho(c, HDB, dong(3), null));
    assertTrue(ex.getMessage().contains("vượt số còn phải giao"), ex.getMessage());
    assertNotNull(hdb.guiYeuCauXuatKho(c, HDB, dong(2), null));
    assertEquals(2, db.getYeuCauXuatKho().stream().filter(x -> TrangThai.CHO_KHO.equals(x.getTrangThai())).count());
  }

  @Test
  void rutYeuCauGiaiPhongSoLuong() {
    YeuCauXuatKho y = hdb.guiYeuCauXuatKho(c, HDB, dong(5), null);
    hdb.rutYeuCauXuatKho(c, y.getId());
    assertEquals(TrangThai.DA_RUT, y.getTrangThai());
    assertNotNull(hdb.guiYeuCauXuatKho(c, HDB, dong(5), null));
  }

  @Test
  void chiGuiKhiHdDaHieuLuc() {
    h().setTrangThai(TrangThai.BAO_GIA);
    assertThrows(ApiException.class, () -> hdb.guiYeuCauXuatKho(c, HDB, dong(1), null));
  }

  @Test
  void xuatKhoSinhPhieuVaTruLo() {
    YeuCauXuatKho y = hdb.guiYeuCauXuatKho(c, HDB, dong(4), null);
    PhieuKho p = kho.xuatKhoYeuCau(c, y.getId(), "2026-11-10", "K1", xuat(4), null);
    assertEquals("Xuất", p.getLoai());
    assertEquals("Tự động HĐ Bán", p.getNguonGoc());
    assertEquals(HDB, p.getHdId());
    assertEquals(TrangThai.DA_XUAT_KHO, y.getTrangThai());
    assertEquals(p.getId(), y.getPhieuId());
    assertEquals("2026-11-10", y.getNgayXuat());
    assertEquals(TrangThai.DANG_GIAO_HANG, h().getTrangThai());
    var lo = Calc.tonTheoLo(db, null).stream().filter(l -> l.lo.equals("L1-01")).findFirst().orElseThrow();
    assertEquals(6, lo.ton, 1e-9);
    // Đã xuất rồi thì không xuất lần hai.
    assertThrows(ApiException.class, () -> kho.xuatKhoYeuCau(c, y.getId(), "2026-11-10", "K1", xuat(1), null));
  }

  @Test
  void xuatKhongVuotYeuCauVaKhongVuotTon() {
    YeuCauXuatKho y = hdb.guiYeuCauXuatKho(c, HDB, dong(3), null);
    var ex = assertThrows(ApiException.class, () -> kho.xuatKhoYeuCau(c, y.getId(), "2026-11-10", "K1", xuat(4), null));
    assertTrue(ex.getMessage().contains("vượt SL yêu cầu"), ex.getMessage());
    assertThrows(ApiException.class, () -> kho.xuatKhoYeuCau(c, y.getId(), "2026-11-10", "K1",
        List.of(new KhoService.DongXuat("MA-LA", null, 1, null, null)), null));
    // Tồn lô chỉ 10: HĐ 20 chai, yêu cầu 12 → kho thiếu hàng, không xuất được.
    hdbMoi(20);
    YeuCauXuatKho y2 = hdb.guiYeuCauXuatKho(c, HDB, dong(12), null);
    var ex2 = assertThrows(ApiException.class, () -> kho.xuatKhoYeuCau(c, y2.getId(), "2026-11-10", "K1", xuat(12), null));
    assertTrue(ex2.getMessage().contains("không đủ"), ex2.getMessage());
    assertEquals(TrangThai.CHO_KHO, y2.getTrangThai());
    assertTrue(db.getPhieuKho().stream().noneMatch(p -> "Xuất".equals(p.getLoai())));
  }

  @Test
  void tuChoiCanLyDo() {
    YeuCauXuatKho y = hdb.guiYeuCauXuatKho(c, HDB, dong(2), null);
    assertThrows(ApiException.class, () -> kho.tuChoiYeuCau(c, y.getId(), "  "));
    kho.tuChoiYeuCau(c, y.getId(), "Sai mã hàng");
    assertEquals(TrangThai.TU_CHOI, y.getTrangThai());
    assertEquals("Sai mã hàng", y.getLyDoTuChoi());
    // Yêu cầu bị từ chối không giữ chỗ: gửi lại đủ 5.
    assertNotNull(hdb.guiYeuCauXuatKho(c, HDB, dong(5), null));
    assertThrows(ApiException.class, () -> kho.xuatKhoYeuCau(c, y.getId(), "2026-11-10", "K1", xuat(2), null));
  }

  @Test
  void capNhatNgayGiaoDoiTrangThaiVaHdBanKhiGiaoDu() {
    hdbMoi(4);
    YeuCauXuatKho y = hdb.guiYeuCauXuatKho(c, HDB, dong(4), null);
    // Chưa xuất kho thì chưa cập nhật ngày giao được.
    assertThrows(ApiException.class, () -> kho.capNhatNgayGiao(c, y.getId(), "2026-11-12"));
    kho.xuatKhoYeuCau(c, y.getId(), "2026-11-10", "K1", xuat(4), null);
    assertEquals(TrangThai.DANG_GIAO_HANG, h().getTrangThai());
    assertThrows(ApiException.class, () -> kho.capNhatNgayGiao(c, y.getId(), "2026-11-09")); // trước ngày xuất
    assertThrows(ApiException.class, () -> kho.capNhatNgayGiao(c, y.getId(), "2026-11-15")); // sau hôm nay (14/11)
    kho.capNhatNgayGiao(c, y.getId(), "2026-11-12");
    assertEquals(TrangThai.DA_GIAO_HANG, y.getTrangThai());
    assertEquals("2026-11-12", y.getNgayGiao());
    assertEquals(TrangThai.DA_GIAO_HANG, h().getTrangThai());
    // Bước tay kế tiếp của HĐ bán từ "Đã giao hàng" là Hoàn thành; không chuyển tay sang "Đã giao hàng".
    assertEquals(TrangThai.HOAN_THANH, hdb.hdbKeTiep(c, h()));
  }

  @Test
  void giaoMotPhanChuaDoiTrangThaiHdBan() {
    YeuCauXuatKho y = hdb.guiYeuCauXuatKho(c, HDB, dong(3), null);
    kho.xuatKhoYeuCau(c, y.getId(), "2026-11-10", "K1", xuat(3), null);
    kho.capNhatNgayGiao(c, y.getId(), "2026-11-12");
    assertEquals(TrangThai.DA_GIAO_HANG, y.getTrangThai());
    assertEquals(TrangThai.DANG_GIAO_HANG, h().getTrangThai()); // còn 2 chai chưa giao
  }

  @Test
  void yeuCauMoiLuiHdBanVeDangGiaoHang() {
    hdbMoi(4);
    YeuCauXuatKho y = hdb.guiYeuCauXuatKho(c, HDB, dong(4), null);
    kho.xuatKhoYeuCau(c, y.getId(), "2026-11-10", "K1", xuat(4), null);
    kho.capNhatNgayGiao(c, y.getId(), "2026-11-12");
    assertEquals(TrangThai.DA_GIAO_HANG, h().getTrangThai());
    // Xoá phiếu Xuất → yêu cầu về Chờ kho, HĐ bán không còn "Đã giao hàng".
    PhieuKho p = db.getPhieuKho().stream().filter(x -> x.getId().equals(y.getPhieuId())).findFirst().orElseThrow();
    db.getPhieuKho().remove(p);
    KhoService.goPhieuKhoiYeuCau(c, p.getId());
    KhoService.capNhatTrangThaiGiao(c, HDB);
    assertEquals(TrangThai.CHO_KHO, y.getTrangThai());
    assertEquals(TrangThai.DANG_GIAO_HANG, h().getTrangThai());
  }
}
