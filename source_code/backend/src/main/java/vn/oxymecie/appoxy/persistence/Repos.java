package vn.oxymecie.appoxy.persistence;

import org.springframework.stereotype.Component;
import vn.oxymecie.appoxy.persistence.repo.*;

/** Gom các repository để DataStore / DbMapper nạp và ghi theo bảng. */
@Component
public record Repos(
    AppStateRepository appState,
    NhomQuyenRepository nhomQuyen,
    TaiKhoanRepository taiKhoan,
    PhienDangNhapRepository phien,
    CauHinhRepository cauHinh,
    CauHinhLogRepository cauHinhLog,
    BoDemRepository boDem,
    YeuCauXoaRepository yeuCauXoa,
    AuditLogRepository auditLog,
    TepTinRepository tepTin,
    HoSoRepository hoSo,
    HoaDonRepository hoaDon,
    NguonTienRepository nguonTien,
    LoaiChiPhiRepository loaiChiPhi,
    KhoRepository kho,
    NhaCungCapRepository nhaCungCap,
    KhachHangRepository khachHang,
    LoaiHangRepository loaiHang,
    PhieuThuChiRepository phieuThuChi,
    ChiPhiHDRepository chiPhiHD,
    HopDongBanRepository hopDongBan,
    ViecGiaoRepository viecGiao,
    CanhBaoRepository canhBao,
    DeNghiVatTuRepository deNghiVatTu,
    HopDongMuaRepository hopDongMua,
    PhieuKhoRepository phieuKho,
    KiemKeRepository kiemKe,
    AnhXaTenRepository anhXaTen,
    BinhKhiRepository binhKhi,
    HopDongPhuTaiRepository hopDongPhuTai,
    DongTienPTRepository dongTienPT) {}
