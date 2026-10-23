package vn.oxymecie.appoxy.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.model.*;

/** Công thức tự tính (port calc.ts) — so với ví dụ tính tay. */
class CalcTest {

  @Test
  void thueTNDN_luyTien_theoMocTrenGTHDThucTe() {
    // Chênh lệch 300 trên GTHĐ thực tế 1.000: mốc 20% = 200 → 200 × 25% + 100 × 50% = 100.
    Calc.Thue t = Calc.thueTNDN(300, 1000, new ThamSoThue(0.2, 0.25, 0.5));
    assertThat(t.moc()).isEqualTo(200);
    assertThat(t.thue1()).isEqualTo(50);
    assertThat(t.thue2()).isEqualTo(50);
    assertThat(t.thue()).isEqualTo(100);
    assertThat(Calc.thueTNDN(-5, 1000, new ThamSoThue(0.2, 0.25, 0.5)).thue()).isZero();
  }

  @Test
  void sauVAT_lamTronNhuJavascript() {
    assertThat(Calc.sauVAT(22_000_000, 8)).isEqualTo(23_760_000);
    assertThat(Calc.sauVAT(1_234_567, 10)).isEqualTo(1_358_024);
    assertThat(Calc.sauVAT(100, 0)).isEqualTo(100);
  }

  @Test
  void soDuNguon_chiTinhPhieuDaDuyet_vaLuanChuyen() {
    Db d = TestData.db();
    d.getPhieuThuChi().add(phieu("P1", "Thu", "NT-TM", null, 10_000_000, 0, "Đã duyệt"));
    d.getPhieuThuChi().add(phieu("P2", "Chi", "NT-TM", null, 0, 3_000_000, "Đã duyệt"));
    d.getPhieuThuChi().add(phieu("P3", "Chi", "NT-TM", null, 0, 9_000_000, "Chờ duyệt"));
    d.getPhieuThuChi().add(phieu("P4", "Luân chuyển", "NT-TM", "NT-NH", 0, 5_000_000, "Đã duyệt"));
    Calc.SoDu tm = Calc.soDuNguon("NT-TM", d, null);
    assertThat(tm.soDu()).isEqualTo(50_000_000 + 10_000_000 - 3_000_000 - 5_000_000);
    assertThat(Calc.soDuNguon("NT-NH", d, null).soDu()).isEqualTo(905_000_000);
    // Tới ngày trước khi lập phiếu → chỉ còn số dư đầu kỳ.
    assertThat(Calc.soDuNguon("NT-TM", d, "2026-01-31").soDu()).isEqualTo(50_000_000);
  }

  @Test
  void quyetToanTamUng_chenhLechTinhVaoSoDu() {
    Db d = TestData.db();
    d.getPhieuThuChi().add(phieu("TU", "Tạm ứng", "NT-TM", null, 0, 2_000_000, "Đã duyệt"));
    PhieuThuChi qt = phieu("QT", "Quyết toán tạm ứng", "NT-TM", null, 0, 0, "Đã duyệt");
    qt.setPhieuTamUngGoc("TU");
    qt.setSoTienThucChi(1_500_000L);
    d.getPhieuThuChi().add(qt);
    // 50tr − 2tr tạm ứng + 0,5tr hoàn ứng.
    assertThat(Calc.soDuNguon("NT-TM", d, null).soDu()).isEqualTo(48_500_000);
  }

  @Test
  void tonTheoLo_truDungLoCuaPhieuXuat() {
    Db d = TestData.db();
    d.getPhieuKho().add(phieuKho("N1", "Nhập", "2026-02-01", List.of(dong("KC-NO-8L", 5, "L1-01", 1_000_000.0))));
    d.getPhieuKho().add(phieuKho("N2", "Nhập", "2026-03-01", List.of(dong("KC-NO-8L", 3, "L2-01", 1_200_000.0))));
    DongPhieuKho x = dong("KC-NO-8L", 2, "L1-01", null);
    x.setDonGiaGoc(1_000_000.0);
    d.getPhieuKho().add(phieuKho("X1", "Xuất", "2026-04-01", List.of(x)));
    List<Calc.DongLo> lots = Calc.tonTheoLo(d, null);
    assertThat(lots).extracting(l -> l.lo).containsExactly("L1-01", "L2-01");
    assertThat(lots.get(0).ton).isEqualTo(3);
    assertThat(lots.get(0).giaTriTon).isEqualTo(3_000_000);
    assertThat(Calc.tonTai(d, "KC-NO-8L", null)).isEqualTo(6);
    // Phiếu đã huỷ không tính.
    d.getPhieuKho().get(1).setTrangThai("Đã huỷ");
    assertThat(Calc.tonTai(d, "KC-NO-8L", "KHO-OM")).isEqualTo(3);
  }

  @Test
  void chiaLoiNhuanPhuTai_nhanVaCong() {
    Db d = TestData.db();
    HopDongPhuTai p = new HopDongPhuTai();
    p.setTruocVAT(1_000_000);
    p.setVat(8);
    p.setTyLeThue(0.2);
    p.setTyLeGiu(0.1);
    p.setHoaHongKieu("Số tiền");
    p.setChiPhi(new ArrayList<>(List.of(new ChiPhiPT("C1", "Khác", "", "2026-01-01", 200_000))));
    // LN trước thuế 800.000; Nhân: thuế 160.000, PT giữ 10% × 640.000 = 64.000 → Oxy 576.000 (72%).
    Calc.PtCalc nhan = Calc.ptCalc(p, d);
    assertThat(nhan.lnTruoc()).isEqualTo(800_000);
    assertThat(nhan.thue()).isEqualTo(160_000);
    assertThat(nhan.ptGiu()).isEqualTo(64_000);
    assertThat(nhan.oxyGop()).isEqualTo(576_000);
    // Cộng: PT giữ 10% × 800.000 = 80.000 → Oxy 560.000 (70%).
    p.setCachChia("Cộng");
    assertThat(Calc.ptCalc(p, d).oxyGop()).isEqualTo(560_000);
    // Lỗ: không thuế, PT không giữ.
    p.setTruocVAT(100_000);
    Calc.PtCalc lo = Calc.ptCalc(p, d);
    assertThat(lo.thue()).isZero();
    assertThat(lo.ptGiu()).isZero();
    assertThat(lo.oxyGop()).isEqualTo(-100_000);
  }

  static PhieuThuChi phieu(String id, String loai, String nguon, String den, long thu, long chi, String tt) {
    PhieuThuChi p = new PhieuThuChi();
    p.setId(id);
    p.setSoPhieu(id);
    p.setNgayLap("2026-02-15");
    p.setLoai(loai);
    p.setNguonTien(nguon);
    p.setNguonTienDen(den);
    p.setNoiDung(id);
    p.setSoTienThu(thu);
    p.setSoTienChi(chi);
    p.setNguoiDeNghi(TestData.KT);
    p.setTrangThai(tt);
    return p;
  }

  static DongPhieuKho dong(String lh, double sl, String lo, Double donGia) {
    DongPhieuKho x = new DongPhieuKho();
    x.setLoaiHang(lh);
    x.setThuocTinh("");
    x.setSoLuong(sl);
    x.setLo(lo);
    x.setDonGia(donGia);
    return x;
  }

  static PhieuKho phieuKho(String id, String loai, String ngay, List<DongPhieuKho> dong) {
    return new PhieuKho(id, id, ngay, loai, "Nhập tay – điều chỉnh", null, "KHO-OM", "test", TestData.KHO, "Hiệu lực", null,
        new ArrayList<>(dong), null, null, null);
  }
}
