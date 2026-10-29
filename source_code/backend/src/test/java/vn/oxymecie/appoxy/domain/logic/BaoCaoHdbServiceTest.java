package vn.oxymecie.appoxy.domain.logic;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import vn.oxymecie.appoxy.domain.logic.BaoCaoHdbService.Loc;
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.domain.model.HopDongBan;
import vn.oxymecie.appoxy.domain.model.ThamSoThue;
import vn.oxymecie.appoxy.domain.model.TrangThai;

class BaoCaoHdbServiceTest {
  private static final LocalDate HOM_NAY = LocalDate.of(2026, 10, 29);

  private static HopDongBan hd(String id, String trangThai, String ngayKy, long truocVAT, boolean phuTai) {
    HopDongBan h = new HopDongBan();
    h.setId(id);
    h.setSoHD(id);
    h.setTenKH("KH " + id);
    h.setSale("TK1");
    h.setTrangThai(trangThai);
    h.setNgayKy(ngayKy);
    h.setTruocVAT(truocVAT);
    h.setVat(8);
    h.setThamSoThue(new ThamSoThue());
    h.setTaoLuc("2026-01-01T00:00:00Z");
    h.setThuocPhuTai(phuTai);
    return h;
  }

  private static Db db() {
    Db d = new Db();
    d.getHopDongBan().add(hd("A", TrangThai.HIEU_LUC, "2026-03-10", 100_000_000L, false));
    d.getHopDongBan().add(hd("B", TrangThai.HOAN_THANH, "2026-03-20", 200_000_000L, true));
    d.getHopDongBan().add(hd("C", TrangThai.HUY, "2026-03-05", 50_000_000L, false));
    d.getHopDongBan().add(hd("D", TrangThai.HIEU_LUC, "2025-03-01", 150_000_000L, false));
    return d;
  }

  @Test
  void tinhGiaTriSoHdVaSoSanhCungKy() {
    Db d = db();
    var r = new BaoCaoHdbService().tao(d, d, new Loc(2026, null, null, "TAT_CA", "cungKy"), HOM_NAY);
    assertEquals(300_000_000d, r.giaTri().hienTai());
    assertEquals(150_000_000d, r.giaTri().kyTruoc());
    assertEquals(100.0, r.giaTri().pct());
    assertEquals(2, r.soHd().hienTai());
    assertEquals(1, r.huy());
    assertEquals(100_000_000L, r.thangs().get(2).oxy());
    assertEquals(200_000_000L, r.thangs().get(2).phuTai());
    assertEquals("B", r.top().get(0).id());
  }

  @Test
  void locPhapNhanVaKhongSoSanh() {
    Db d = db();
    var r = new BaoCaoHdbService().tao(d, d, new Loc(2026, null, null, "PHU_TAI", "khong"), HOM_NAY);
    assertEquals(200_000_000d, r.giaTri().hienTai());
    assertEquals(1, r.soHd().hienTai());
    assertNull(r.giaTri().kyTruoc());
    assertNull(r.giaTri().pct());
  }

  @Test
  void locQuyChiLayThangTrongQuy() {
    Db d = db();
    var r = new BaoCaoHdbService().tao(d, d, new Loc(2026, 2, null, "TAT_CA", "khong"), HOM_NAY);
    assertEquals(3, r.thangs().size());
    assertEquals(4, r.thangs().get(0).t());
    assertEquals(0, r.soHd().hienTai());
  }
}
