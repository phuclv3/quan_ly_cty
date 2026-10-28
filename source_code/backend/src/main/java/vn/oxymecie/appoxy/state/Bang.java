package vn.oxymecie.appoxy.state;

import java.time.Instant;
import java.util.List;
import java.util.function.Function;
import java.util.function.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.oxymecie.appoxy.domain.logic.Ctx;
import vn.oxymecie.appoxy.domain.model.*;
import vn.oxymecie.appoxy.persistence.DbMapper;
import vn.oxymecie.appoxy.persistence.Repos;
import vn.oxymecie.appoxy.persistence.entity.*;

/**
 * Danh mục các bảng tổng hợp (aggregate) của Db: khoá JSON phía frontend, cách lấy id, entity, repository, hàm chép.
 * THỨ TỰ trong {@link #ALL} là thứ tự ghi (bảng cha trước) — xoá thì đi ngược lại để không vướng khoá ngoại.
 */
public record Bang<D, E>(
    String key,
    Function<Db, List<D>> rows,
    Function<D, String> id,
    Function<Repos, JpaRepository<E, String>> repo,
    Supplier<E> moi,
    Applier<D, E> apply) {

  @FunctionalInterface
  public interface Applier<D, E> {
    void apply(DbMapper m, D d, E e, Ctx c, String me, Instant now);
  }

  public static final Bang<NhomQuyen, NhomQuyenEntity> NHOM_QUYEN = new Bang<>("nhomQuyen", Db::getNhomQuyen, NhomQuyen::getId,
      Repos::nhomQuyen, NhomQuyenEntity::new, (m, d, e, c, me, now) -> m.applyNhomQuyen(d, e));
  public static final Bang<TaiKhoan, TaiKhoanEntity> TAI_KHOAN = new Bang<>("taiKhoan", Db::getTaiKhoan, TaiKhoan::getId,
      Repos::taiKhoan, TaiKhoanEntity::new, (m, d, e, c, me, now) -> m.applyTaiKhoan(d, e, c.matKhauMoi().get(d.getId()), me, now));
  public static final Bang<NguonTien, NguonTienEntity> NGUON_TIEN = new Bang<>("nguonTien", Db::getNguonTien, NguonTien::getId,
      Repos::nguonTien, NguonTienEntity::new, (m, d, e, c, me, now) -> m.applyNguonTien(d, e));
  public static final Bang<LoaiChiPhi, LoaiChiPhiEntity> LOAI_CHI_PHI = new Bang<>("loaiChiPhi", Db::getLoaiChiPhi, LoaiChiPhi::getId,
      Repos::loaiChiPhi, LoaiChiPhiEntity::new, (m, d, e, c, me, now) -> m.applyLoaiChiPhi(d, e));
  public static final Bang<Kho, KhoEntity> KHO = new Bang<>("kho", Db::getKho, Kho::getId,
      Repos::kho, KhoEntity::new, (m, d, e, c, me, now) -> m.applyKho(d, e));
  public static final Bang<LoaiHang, LoaiHangEntity> LOAI_HANG = new Bang<>("loaiHang", Db::getLoaiHang, LoaiHang::getId,
      Repos::loaiHang, LoaiHangEntity::new, (m, d, e, c, me, now) -> m.applyLoaiHang(d, e));
  public static final Bang<KhachHang, KhachHangEntity> KHACH_HANG = new Bang<>("khachHang", Db::getKhachHang, KhachHang::getId,
      Repos::khachHang, KhachHangEntity::new, (m, d, e, c, me, now) -> m.applyKhachHang(d, e, me, now));
  public static final Bang<NhaCungCap, NhaCungCapEntity> NCC = new Bang<>("ncc", Db::getNcc, NhaCungCap::getId,
      Repos::nhaCungCap, NhaCungCapEntity::new, (m, d, e, c, me, now) -> m.applyNcc(d, e, me, now));
  public static final Bang<PhieuThuChi, PhieuThuChiEntity> PHIEU_THU_CHI = new Bang<>("phieuThuChi", Db::getPhieuThuChi, PhieuThuChi::getId,
      Repos::phieuThuChi, PhieuThuChiEntity::new, (m, d, e, c, me, now) -> m.applyPhieuThuChi(d, e, me, now));
  public static final Bang<HopDongBan, HopDongBanEntity> HOP_DONG_BAN = new Bang<>("hopDongBan", Db::getHopDongBan, HopDongBan::getId,
      Repos::hopDongBan, HopDongBanEntity::new, (m, d, e, c, me, now) -> m.applyHopDongBan(d, e, me, now));
  public static final Bang<ChiPhiHD, ChiPhiHDEntity> CHI_PHI_HD = new Bang<>("chiPhiHD", Db::getChiPhiHD, ChiPhiHD::getId,
      Repos::chiPhiHD, ChiPhiHDEntity::new, (m, d, e, c, me, now) -> m.applyChiPhiHD(d, e, me, now));
  public static final Bang<DeNghiVatTu, DeNghiVatTuEntity> DE_NGHI_VAT_TU = new Bang<>("deNghiVatTu", Db::getDeNghiVatTu, DeNghiVatTu::getId,
      Repos::deNghiVatTu, DeNghiVatTuEntity::new, (m, d, e, c, me, now) -> m.applyDeNghiVatTu(d, e));
  public static final Bang<HopDongMua, HopDongMuaEntity> HOP_DONG_MUA = new Bang<>("hopDongMua", Db::getHopDongMua, HopDongMua::getId,
      Repos::hopDongMua, HopDongMuaEntity::new, (m, d, e, c, me, now) -> m.applyHopDongMua(d, e, me, now));
  public static final Bang<KiemKe, KiemKeEntity> KIEM_KE = new Bang<>("kiemKe", Db::getKiemKe, KiemKe::getId,
      Repos::kiemKe, KiemKeEntity::new, (m, d, e, c, me, now) -> m.applyKiemKe(d, e));
  public static final Bang<PhieuKho, PhieuKhoEntity> PHIEU_KHO = new Bang<>("phieuKho", Db::getPhieuKho, PhieuKho::getId,
      Repos::phieuKho, PhieuKhoEntity::new, (m, d, e, c, me, now) -> m.applyPhieuKho(d, e, me, now));
  public static final Bang<AnhXaTen, AnhXaTenEntity> ANH_XA_TEN = new Bang<>("anhXaTen", Db::getAnhXaTen, AnhXaTen::getId,
      Repos::anhXaTen, AnhXaTenEntity::new, (m, d, e, c, me, now) -> m.applyAnhXaTen(d, e));
  public static final Bang<HopDongPhuTai, HopDongPhuTaiEntity> HOP_DONG_PHU_TAI = new Bang<>("hopDongPhuTai", Db::getHopDongPhuTai,
      HopDongPhuTai::getId, Repos::hopDongPhuTai, HopDongPhuTaiEntity::new, (m, d, e, c, me, now) -> m.applyHopDongPhuTai(d, e, me, now));
  public static final Bang<DongTienPT, DongTienPTEntity> DONG_TIEN_PT = new Bang<>("dongTienPT", Db::getDongTienPT, DongTienPT::getId,
      Repos::dongTienPT, DongTienPTEntity::new, (m, d, e, c, me, now) -> m.applyDongTienPT(d, e));
  public static final Bang<ViecGiao, ViecGiaoEntity> VIEC_GIAO = new Bang<>("viecGiao", Db::getViecGiao, ViecGiao::getId,
      Repos::viecGiao, ViecGiaoEntity::new, (m, d, e, c, me, now) -> m.applyViecGiao(d, e));
  public static final Bang<CanhBao, CanhBaoEntity> CANH_BAO = new Bang<>("canhBao", Db::getCanhBao, CanhBao::getId,
      Repos::canhBao, CanhBaoEntity::new, (m, d, e, c, me, now) -> m.applyCanhBao(d, e));
  public static final Bang<YeuCauXoa, YeuCauXoaEntity> YEU_CAU_XOA = new Bang<>("yeuCauXoa", Db::getYeuCauXoa, YeuCauXoa::getId,
      Repos::yeuCauXoa, YeuCauXoaEntity::new, (m, d, e, c, me, now) -> m.applyYeuCauXoa(d, e));
  public static final Bang<HoSo, HoSoEntity> HO_SO = new Bang<>("hoSo", Db::getHoSo, HoSo::getId,
      Repos::hoSo, HoSoEntity::new, (m, d, e, c, me, now) -> m.applyHoSo(d, e));
  public static final Bang<HoaDon, HoaDonEntity> HOA_DON = new Bang<>("hoaDon", Db::getHoaDon, HoaDon::getId,
      Repos::hoaDon, HoaDonEntity::new, (m, d, e, c, me, now) -> m.applyHoaDon(d, e));

  /** Thứ tự ghi: bảng được tham chiếu trước bảng tham chiếu (xem khoá ngoại ở V1__create_initial_schema.sql). */
  public static final List<Bang<?, ?>> ALL = List.of(NHOM_QUYEN, TAI_KHOAN, NGUON_TIEN, LOAI_CHI_PHI, KHO, LOAI_HANG, KHACH_HANG, NCC,
      PHIEU_THU_CHI, HOP_DONG_BAN, CHI_PHI_HD, DE_NGHI_VAT_TU, HOP_DONG_MUA, KIEM_KE, PHIEU_KHO, ANH_XA_TEN, HOP_DONG_PHU_TAI,
      DONG_TIEN_PT, VIEC_GIAO, CANH_BAO, YEU_CAU_XOA, HO_SO, HOA_DON);
}
