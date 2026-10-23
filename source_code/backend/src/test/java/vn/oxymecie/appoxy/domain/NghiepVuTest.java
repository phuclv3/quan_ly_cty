package vn.oxymecie.appoxy.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.calc.Calc;
import vn.oxymecie.appoxy.domain.logic.*;
import vn.oxymecie.appoxy.domain.model.*;

/** Luồng nghiệp vụ chính chạy trên dữ liệu trong bộ nhớ (không cần DB). */
class NghiepVuTest {
  KhoService kho = new KhoService();
  KeToanService keToan = new KeToanService();
  HdbService hdb = new HdbService(kho, keToan);
  HdmService hdm = new HdmService(kho);
  DuyetXoaService duyetXoa = new DuyetXoaService(hdm);
  DanhMucService danhMuc = new DanhMucService();
  HeThongService heThong = new HeThongService();
  PhuTaiService phuTai = new PhuTaiService();
  Db db;

  @BeforeEach
  void setUp() {
    db = TestData.db();
  }

  static HttpStatus status(Runnable r) {
    try {
      r.run();
      return HttpStatus.OK;
    } catch (ApiException e) {
      return e.getStatus();
    }
  }

  /** HĐ bán đã Hiệu lực, 2 đợt 50% / 50%. */
  HopDongBan hdbHieuLuc() {
    HopDongBan h = TestData.hdb("HD-01", 10_000_000);
    h.setDotTT(new ArrayList<>(List.of(new DotTTBan(1, 50.0, 5_400_000, null, null, null, null, null, null, null),
        new DotTTBan(2, 50.0, 5_400_000, null, null, null, null, null, null, null))));
    HopDongBan out = hdb.saveHdb(TestData.ctx(db, TestData.SALE), h, true);
    hdb.chuyenTrangThaiHdb(TestData.ctx(db, TestData.SALE), out.getId(), "Hiệu lực");
    return db.getHopDongBan().get(0);
  }

  @Nested
  class HopDongBanTest {
    @Test
    void saleTaoHd_luonLaSalePhuTrach_vaKhongSuaDuocHdCuaNguoiKhac() {
      HopDongBan h = TestData.hdb("HD-01", 1_000_000);
      // Sale không lập HĐ cho Sale khác (store.ts: require('hdb','edit', h.sale)).
      h.setSale(TestData.SALE2);
      assertThat(status(() -> hdb.saveHdb(TestData.ctx(db, TestData.SALE), h, true))).isEqualTo(HttpStatus.FORBIDDEN);
      h.setSale("");
      HopDongBan out = hdb.saveHdb(TestData.ctx(db, TestData.SALE), h, true);
      assertThat(out.getSale()).isEqualTo(TestData.SALE);
      assertThat(out.getTrangThai()).isEqualTo("Báo giá");
      HopDongBan sua = TestData.OM.convertValue(out, HopDongBan.class);
      sua.setGhiChu("sửa trộm");
      assertThat(status(() -> hdb.saveHdb(TestData.ctx(db, TestData.SALE2), sua, false))).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void khongDoiTrangThaiQuaLuuThongTin() {
      HopDongBan out = hdb.saveHdb(TestData.ctx(db, TestData.SALE), TestData.hdb("HD-01", 1_000_000), true);
      HopDongBan gia = TestData.OM.convertValue(out, HopDongBan.class);
      gia.setTrangThai("Đã tất toán");
      hdb.saveHdb(TestData.ctx(db, TestData.SALE), gia, false);
      assertThat(db.getHopDongBan().get(0).getTrangThai()).isEqualTo("Báo giá");
    }

    @Test
    void soHdTrung_khongPhanBietHoaThuongVaDau() {
      hdb.saveHdb(TestData.ctx(db, TestData.SALE), TestData.hdb("HĐ-01", 1_000_000), true);
      assertThat(status(() -> hdb.saveHdb(TestData.ctx(db, TestData.SALE), TestData.hdb("hd-01", 1_000_000), true)))
          .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void chuyenTrangThai_dungBuocKeTiep_vaDuDieuKien() {
      HopDongBan h = TestData.hdb("HD-01", 0);
      HopDongBan out = hdb.saveHdb(TestData.ctx(db, TestData.SALE), h, true);
      // Thiếu giá trị HĐ → chưa được Hiệu lực.
      assertThatThrownBy(() -> hdb.chuyenTrangThaiHdb(TestData.ctx(db, TestData.SALE), out.getId(), "Hiệu lực"))
          .hasMessageContaining("Chưa có Giá trị HĐ");
      // Không nhảy cóc.
      assertThat(status(() -> hdb.chuyenTrangThaiHdb(TestData.ctx(db, TestData.SALE), out.getId(), "Hoàn thành"))).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void hdDichVu_hieuLucChuyenThangHoanThanh() {
      HopDongBan h = hdbHieuLuc();
      assertThat(hdb.hdbKeTiep(TestData.ctx(db, TestData.SALE), h)).isEqualTo("Hoàn thành");
    }

    @Test
    void thucThu_sinhPhieuThuChoDuyet_chiKeToanDuocGhi() {
      HopDongBan h = hdbHieuLuc();
      assertThat(status(() -> hdb.ghiThucThu(TestData.ctx(db, TestData.SALE), h.getId(), 1, "2026-05-05", 5_400_000, "NT-NH")))
          .isEqualTo(HttpStatus.FORBIDDEN);
      PhieuThuChi p = hdb.ghiThucThu(TestData.ctx(db, TestData.KT), h.getId(), 1, "2026-05-05", 5_400_000, "NT-NH");
      assertThat(p.getTrangThai()).isEqualTo("Chờ duyệt");
      assertThat(p.getSoPhieu()).isEqualTo("TC26-0001");
      assertThat(p.getPhatSinh().getHdId()).isEqualTo(h.getId());
      HopDongBan sau = db.getHopDongBan().get(0);
      assertThat(sau.getDotTT().get(0).getPhieuThuId()).isEqualTo(p.getId());
      // Chưa duyệt → chưa tính vào đã thu.
      assertThat(Calc.hdbCalc(sau, db).daThu()).isZero();
      assertThat(Calc.hdbCalc(sau, db).daThuCho()).isEqualTo(5_400_000);
      // Vượt phần còn phải thu.
      assertThatThrownBy(() -> hdb.ghiThucThu(TestData.ctx(db, TestData.KT), h.getId(), 2, "2026-05-06", 6_000_000, "NT-NH"))
          .hasMessageContaining("vượt phần còn phải thu");
    }

    @Test
    void duyetPhieu_khongTuDuyetPhieuCuaMinh() {
      HopDongBan h = hdbHieuLuc();
      PhieuThuChi p = hdb.ghiThucThu(TestData.ctx(db, TestData.KT), h.getId(), 1, "2026-05-05", 5_400_000, "NT-NH");
      String canhBao = keToan.duyetPhieu(TestData.ctx(db, TestData.KT), List.of(p.getId()));
      assertThat(canhBao).contains("Không tự duyệt");
      assertThat(db.getPhieuThuChi().get(0).getTrangThai()).isEqualTo("Chờ duyệt");
      assertThat(keToan.duyetPhieu(TestData.ctx(db, TestData.KT2), List.of(p.getId()))).isNull();
      assertThat(db.getPhieuThuChi().get(0).getTrangThai()).isEqualTo("Đã duyệt");
      assertThat(Calc.hdbCalc(db.getHopDongBan().get(0), db).daThu()).isEqualTo(5_400_000);
      // Số dư ngân hàng tăng.
      assertThat(Calc.soDuNguon("NT-NH", db, null).soDu()).isEqualTo(905_400_000);
    }

    @Test
    void huyHd_chanKhiDaCoPhieuThu() {
      HopDongBan h = hdbHieuLuc();
      hdb.ghiThucThu(TestData.ctx(db, TestData.KT), h.getId(), 1, "2026-05-05", 1_000_000, "NT-NH");
      assertThat(status(() -> hdb.huyHdb(TestData.ctx(db, TestData.SALE), h.getId(), "khách huỷ"))).isEqualTo(HttpStatus.CONFLICT);
    }
  }

  @Nested
  class KhoTest {
    void nhapLo(double sl, double gia, String ngay) {
      kho.savePhieuKhoTay(TestData.ctx(db, TestData.KHO), new KhoService.PhieuTay(ngay, "Nhập", null, "KHO-OM", null, null, "HĐ 259", null, null),
          List.of(new KhoService.DongNhapLo("KC-NO-8L", "NO 500ppm", sl, gia, 8.0, null)), List.of(), false, null);
    }

    @Test
    void nhapTay_batBuocDonGia_vaSinhMaLoTheoHoaDon() {
      assertThatThrownBy(() -> kho.savePhieuKhoTay(TestData.ctx(db, TestData.KHO),
          new KhoService.PhieuTay("2026-02-01", "Nhập", null, "KHO-OM", "kiểm", null, null, null, null),
          List.of(new KhoService.DongNhapLo("KC-NO-8L", "", 1, 0, null, null)), List.of(), false, null)).hasMessageContaining("chưa có đơn giá");
      nhapLo(5, 1_000_000, "2026-02-01");
      nhapLo(3, 1_200_000, "2026-03-01");
      assertThat(db.getPhieuKho()).extracting(p -> p.getDong().get(0).getLo()).containsExactlyInAnyOrder("L259-01", "L259-01.2");
      assertThat(db.getPhieuKho()).extracting(PhieuKho::getSoPhieu).containsExactlyInAnyOrder("NK26-0001", "NK26-0002");
    }

    @Test
    void xuatFIFO_tachNhieuLo_giaVonTheoLo_vaChanQuaTon() {
      nhapLo(5, 1_000_000, "2026-02-01");
      nhapLo(3, 1_200_000, "2026-03-01");
      HopDongBan h = hdbHieuLuc();
      PhieuKho x = hdb.ghiNhanGiaoHang(TestData.ctx(db, TestData.SALE), h.getId(), "2026-05-05", "KHO-OM",
          List.of(new KhoService.DongXuat("KC-NO-8L", null, 7, "NO 500ppm", null)), null);
      assertThat(x.getDong()).hasSize(2);
      assertThat(x.getDong().get(0).getSoLuong()).isEqualTo(5);
      assertThat(x.getDong().get(0).getDonGiaGoc()).isEqualTo(1_000_000);
      assertThat(x.getDong().get(1).getSoLuong()).isEqualTo(2);
      assertThat(x.getDong().get(1).getDonGiaGoc()).isEqualTo(1_200_000);
      assertThat(db.getHopDongBan().get(0).getTrangThai()).isEqualTo("Đang giao hàng");
      assertThat(Calc.hdbCalc(db.getHopDongBan().get(0), db).giaVon()).isEqualTo(7_400_000);
      assertThatThrownBy(() -> hdb.ghiNhanGiaoHang(TestData.ctx(db, TestData.SALE), h.getId(), "2026-05-06", "KHO-OM",
          List.of(new KhoService.DongXuat("KC-NO-8L", null, 2, null, null)), null)).hasMessageContaining("không đủ (thiếu 1)");
    }

    @Test
    void khongXuatLoNhapSauNgayXuat() {
      nhapLo(5, 1_000_000, "2026-06-01");
      HopDongBan h = hdbHieuLuc();
      assertThatThrownBy(() -> hdb.ghiNhanGiaoHang(TestData.ctx(db, TestData.SALE), h.getId(), "2026-05-05", "KHO-OM",
          List.of(new KhoService.DongXuat("KC-NO-8L", null, 1, null, null)), null)).hasMessageContaining("không đủ");
    }

    @Test
    void saleKhongLapPhieuKhoTay() {
      assertThat(status(() -> kho.savePhieuKhoTay(TestData.ctx(db, TestData.SALE),
          new KhoService.PhieuTay("2026-02-01", "Nhập", null, "KHO-OM", "x", null, null, null, null),
          List.of(new KhoService.DongNhapLo("KC-NO-8L", "", 1, 1, null, null)), List.of(), false, null))).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void doiMaHang_doiMoiNoiDangDung() {
      nhapLo(5, 1_000_000, "2026-02-01");
      danhMuc.doiMaHang(TestData.ctx(db, TestData.KHO), "KC-NO-8L", "kc-no-8l-moi");
      assertThat(db.getLoaiHang()).extracting(LoaiHang::getId).contains("KC-NO-8L-MOI");
      assertThat(db.getPhieuKho().get(0).getDong().get(0).getLoaiHang()).isEqualTo("KC-NO-8L-MOI");
    }
  }

  @Nested
  class HopDongMuaTest {
    HopDongMua hdmDaKy() {
      HopDongMua m = new HopDongMua();
      m.setSoHD("M-01");
      m.setMaNCC("NCC0001");
      m.setTenNCC("NCC A");
      m.setNgayKy("2026-04-01");
      m.setXuatHoaDon("Đã");
      m.setChiTiet(new ArrayList<>(List.of(new DongHangMua("D1", "KC-NO-8L", "NO", "500ppm", 4, "Bình", 100, "USD", 25_000, null, null, null, null))));
      m.setDotTT(new ArrayList<>(List.of(new DotTTMua(1, 100.0, 0, null, null, null, null, null, null, null, null))));
      HopDongMua out = hdm.saveHdm(TestData.ctx(db, TestData.ADMIN), m, true);
      hdm.chuyenTrangThaiHdm(TestData.ctx(db, TestData.ADMIN), out.getId(), "Đã ký");
      return db.getHopDongMua().get(0);
    }

    @Test
    void tyLeDot_tinhTheoTongVND() {
      HopDongMua m = hdmDaKy();
      assertThat(Calc.hdmTong(m)).isEqualTo(10_000_000);
      assertThat(m.getDotTT().get(0).getSoTien()).isEqualTo(10_000_000);
    }

    @Test
    void nhapKho_tuChuyenTrangThaiNhanHang_vaTichChecklist() {
      HopDongMua m = hdmDaKy();
      hdm.nhapKho(TestData.ctx(db, TestData.KHO), m.getId(), "2026-04-10", "KHO-OM", List.of(new HdmService.DongNhap("D1", 1)), null, "HĐ 77", 8.0);
      assertThat(db.getHopDongMua().get(0).getTrangThai()).isEqualTo("Đang nhận hàng");
      PhieuKho p = db.getPhieuKho().get(0);
      assertThat(p.getDong().get(0).getDonGia()).isEqualTo(2_500_000);
      assertThat(p.getDong().get(0).getLo()).isEqualTo("L77-01");
      hdm.nhapKho(TestData.ctx(db, TestData.KHO), m.getId(), "2026-04-11", "KHO-OM", List.of(new HdmService.DongNhap("D1", 3)), null, "HĐ 78", 8.0);
      HopDongMua sau = db.getHopDongMua().get(0);
      assertThat(sau.getTrangThai()).isEqualTo("Đã nhận đủ");
      assertThat(sau.getChecklist().stream().filter(c -> c.getTen().equals("Nhập kho")).findFirst().orElseThrow().isXong()).isTrue();
      // Nhập vượt SL còn lại.
      assertThatThrownBy(() -> hdm.nhapKho(TestData.ctx(db, TestData.KHO), m.getId(), "2026-04-12", "KHO-OM",
          List.of(new HdmService.DongNhap("D1", 1)), null, "HĐ 79", 8.0)).hasMessageContaining("vượt SL còn lại");
    }

    @Test
    void tatToan_canTraDuNcc() {
      HopDongMua m = hdmDaKy();
      hdm.nhapKho(TestData.ctx(db, TestData.KHO), m.getId(), "2026-04-10", "KHO-OM", List.of(new HdmService.DongNhap("D1", 4)), null, "HĐ 77", 8.0);
      assertThatThrownBy(() -> hdm.chuyenTrangThaiHdm(TestData.ctx(db, TestData.ADMIN), m.getId(), "Đã tất toán"))
          .hasMessageContaining("Còn phải trả NCC");
      PhieuThuChi chi = hdm.ghiTraNCC(TestData.ctx(db, TestData.KT), m.getId(), 1, "2026-04-15", 10_000_000, "NT-NH");
      assertThat(chi.getLoai()).isEqualTo("Chi");
      keToan.duyetPhieu(TestData.ctx(db, TestData.KT2), List.of(chi.getId()));
      assertThatThrownBy(() -> hdm.chuyenTrangThaiHdm(TestData.ctx(db, TestData.ADMIN), m.getId(), "Đã tất toán"))
          .hasMessageContaining("Thiếu hồ sơ");
    }
  }

  @Nested
  class DuyetXoaTest {
    @Test
    void khongTuDuyetYeuCauCuaMinh_nguoiKhacDuyetThiXoa() {
      PhieuThuChi p = new PhieuThuChi();
      p.setLoai("Chi");
      p.setNgayLap("2026-05-02");
      p.setNguonTien("NT-TM");
      p.setLoaiChiPhi("VH-VP");
      p.setNoiDung("Mua văn phòng phẩm");
      p.setSoTienChi(500_000);
      p.setNguoiDeNghi(TestData.KT);
      p.setTrangThai("Nháp");
      PhieuThuChi lap = keToan.savePhieu(TestData.ctx(db, TestData.KT), p, true, true);
      keToan.duyetPhieu(TestData.ctx(db, TestData.KT2), List.of(lap.getId()));
      YeuCauXoa y = duyetXoa.guiYeuCauXoa(TestData.ctx(db, TestData.KT), "PhieuThuChi", lap.getId(), lap.getSoPhieu(), "Lập nhầm");
      assertThat(status(() -> duyetXoa.duyetXoa(TestData.ctx(db, TestData.KT), y.getId()))).isEqualTo(HttpStatus.FORBIDDEN);
      // Sale không có quyền duyệt.
      assertThat(status(() -> duyetXoa.duyetXoa(TestData.ctx(db, TestData.SALE), y.getId()))).isEqualTo(HttpStatus.FORBIDDEN);
      duyetXoa.duyetXoa(TestData.ctx(db, TestData.KT2), y.getId());
      assertThat(db.getPhieuThuChi()).isEmpty();
      assertThat(db.getYeuCauXoa().get(0).getTrangThai()).isEqualTo("Đã duyệt");
    }

    @Test
    void khongXoaKhachHangDaCoHopDong() {
      hdb.saveHdb(TestData.ctx(db, TestData.SALE), TestData.hdb("HD-01", 1_000_000), true);
      assertThatThrownBy(() -> duyetXoa.guiYeuCauXoa(TestData.ctx(db, TestData.SALE), "DM_KhachHang", "KH0001", "Công ty A", "trùng"))
          .hasMessageContaining("đã có hợp đồng");
    }

    @Test
    void huyPhieuXuat_hdVeLaiHieuLuc() {
      kho.savePhieuKhoTay(TestData.ctx(db, TestData.KHO), new KhoService.PhieuTay("2026-02-01", "Nhập", null, "KHO-OM", null, null, "HĐ 1", null, null),
          List.of(new KhoService.DongNhapLo("KC-NO-8L", "", 2, 1_000_000, null, null)), List.of(), false, null);
      HopDongBan h = hdbHieuLuc();
      PhieuKho x = hdb.ghiNhanGiaoHang(TestData.ctx(db, TestData.SALE), h.getId(), "2026-05-05", "KHO-OM",
          List.of(new KhoService.DongXuat("KC-NO-8L", null, 1, null, null)), null);
      YeuCauXoa y = duyetXoa.guiYeuCauXoa(TestData.ctx(db, TestData.SALE), "PhieuKho", x.getId(), x.getSoPhieu(), "giao nhầm");
      duyetXoa.duyetXoa(TestData.ctx(db, TestData.GD), y.getId());
      assertThat(db.getPhieuKho().stream().filter(p -> p.getId().equals(x.getId())).findFirst().orElseThrow().getTrangThai()).isEqualTo("Đã huỷ");
      assertThat(db.getHopDongBan().get(0).getTrangThai()).isEqualTo("Hiệu lực");
    }
  }

  @Nested
  class HeThongTest {
    @Test
    void khongDeHeThongMatQuanTri() {
      NhomQuyen gd = TestData.OM.convertValue(db.getNhomQuyen().get(0), NhomQuyen.class);
      gd.setTrangThai("Ngưng");
      assertThat(status(() -> heThong.saveNhom(TestData.ctx(db, TestData.GD), gd, null, false))).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void cauHinh_kiemGiaTri_vaGhiLichSu() {
      assertThat(status(() -> heThong.setCauHinh(TestData.ctx(db, TestData.GD), "PT_THUE", 1.5))).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
      assertThat(status(() -> heThong.setCauHinh(TestData.ctx(db, TestData.KT), "PT_THUE", 0.25))).isEqualTo(HttpStatus.FORBIDDEN);
      heThong.setCauHinh(TestData.ctx(db, TestData.GD), "PT_THUE", 0.25);
      assertThat(db.getCauHinh().getPtThue()).isEqualTo(0.25);
      assertThat(db.getCauHinhLog()).singleElement().satisfies(l -> {
        assertThat(l.getGiaTriCu()).isEqualTo("0.2");
        assertThat(l.getGiaTriMoi()).isEqualTo("0.25");
      });
      assertThat(status(() -> heThong.setCauHinh(TestData.ctx(db, TestData.GD), "TIEN_TO_CP", "TC"))).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void soChungTu_tangTheoNam_khongTaiDung() {
      Ctx c = TestData.ctx(db, TestData.KT);
      assertThat(c.nextSo("TC", "2026-01-02")).isEqualTo("TC26-0001");
      assertThat(c.nextSo("TC", "2026-03-02")).isEqualTo("TC26-0002");
      assertThat(c.nextSo("TC", "2027-01-02")).isEqualTo("TC27-0001");
    }

    @Test
    void khachHang_mstBatBuoc_vaSaleTaoThiTuPhuTrach() {
      KhachHang k = new KhachHang();
      k.setTen("KH mới");
      k.setMst("123");
      assertThatThrownBy(() -> danhMuc.saveKhachHang(TestData.ctx(db, TestData.SALE), k, true)).hasMessageContaining("MST không hợp lệ");
      k.setMst("0312345678");
      danhMuc.saveKhachHang(TestData.ctx(db, TestData.SALE), k, true);
      assertThat(k.getId()).isEqualTo("KH0002");
      assertThat(k.getPhuTrach()).isEqualTo(TestData.SALE);
      assertThat(k.getTrangThaiData()).isEqualTo("Đã phân bổ");
    }
  }

  @Nested
  class PhuTaiTest {
    @Test
    void doiTyLe_canQuyenVaLyDo_ghiLichSu() {
      HopDongPhuTai p = new HopDongPhuTai();
      p.setSoHD("PT-01");
      p.setMaKH("KH0001");
      p.setTenKH("Công ty A");
      p.setVat(8);
      p.setTyLeThue(0.2);
      p.setTyLeGiu(0.1);
      p.setHoaHongKieu("Số tiền");
      HopDongPhuTai out = phuTai.savePt(TestData.ctx(db, TestData.KT), p, null, true);
      HopDongPhuTai doi = TestData.OM.convertValue(out, HopDongPhuTai.class);
      doi.setTyLeGiu(0.15);
      assertThatThrownBy(() -> phuTai.savePt(TestData.ctx(db, TestData.KT), doi, " ", false)).hasMessageContaining("cần ghi lý do");
      phuTai.savePt(TestData.ctx(db, TestData.KT), doi, "Thoả thuận mới", false);
      assertThat(db.getHopDongPhuTai().get(0).getTyLeLog()).singleElement()
          .satisfies(l -> assertThat(l.getSau()).contains("PT giữ 15%"));
    }
  }
}
