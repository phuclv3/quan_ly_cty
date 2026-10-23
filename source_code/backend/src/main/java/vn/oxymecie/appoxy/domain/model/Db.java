package vn.oxymecie.appoxy.domain.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Toàn bộ dữ liệu nghiệp vụ dạng tổng hợp (aggregate) — cùng hình dạng với interface Db của frontend
 * (models.ts), nên GET /api/db trả thẳng đối tượng này (đã lọc theo quyền).
 *
 * Server giữ một bản trong bộ nhớ (DataStore) làm cache đọc; mọi lệnh ghi chạy trên một bản sao,
 * so sánh với bản cũ để biết bản ghi nào đổi rồi ghi xuống MySQL trong cùng transaction.
 */
@Data
@NoArgsConstructor
public class Db {
  /** Phiên bản dữ liệu (app_state.phien_ban) — tăng sau mỗi lệnh ghi. */
  private long version;
  private List<TaiKhoan> taiKhoan = new ArrayList<>();
  private List<NhomQuyen> nhomQuyen = new ArrayList<>();
  /** Phiên đăng nhập không bao giờ gửi cho client (luôn rỗng). */
  private List<Object> phien = new ArrayList<>();
  private CauHinh cauHinh = new CauHinh();
  private List<CauHinhLog> cauHinhLog = new ArrayList<>();
  private List<YeuCauXoa> yeuCauXoa = new ArrayList<>();
  private List<HoSo> hoSo = new ArrayList<>();
  private List<HoaDon> hoaDon = new ArrayList<>();
  private List<NguonTien> nguonTien = new ArrayList<>();
  private List<LoaiChiPhi> loaiChiPhi = new ArrayList<>();
  private List<KhachHang> khachHang = new ArrayList<>();
  private List<NhaCungCap> ncc = new ArrayList<>();
  private List<Kho> kho = new ArrayList<>();
  private List<LoaiHang> loaiHang = new ArrayList<>();
  private List<PhieuThuChi> phieuThuChi = new ArrayList<>();
  private List<ChiPhiHD> chiPhiHD = new ArrayList<>();
  private List<HopDongBan> hopDongBan = new ArrayList<>();
  private List<HopDongMua> hopDongMua = new ArrayList<>();
  private List<PhieuKho> phieuKho = new ArrayList<>();
  private List<KiemKe> kiemKe = new ArrayList<>();
  private List<AnhXaTen> anhXaTen = new ArrayList<>();
  private List<DeNghiVatTu> deNghiVatTu = new ArrayList<>();
  private List<ViecGiao> viecGiao = new ArrayList<>();
  private List<HopDongPhuTai> hopDongPhuTai = new ArrayList<>();
  private List<DongTienPT> dongTienPT = new ArrayList<>();
  /** Bộ đếm số chứng từ theo tiền tố + năm, VD { "TC26": 12 } — không tái dùng số đã xoá. */
  private Map<String, Integer> boDem = new LinkedHashMap<>();
}
