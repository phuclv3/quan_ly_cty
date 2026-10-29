package vn.oxymecie.appoxy.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import vn.oxymecie.appoxy.domain.logic.HdmService;
import vn.oxymecie.appoxy.domain.logic.KhoService;
import vn.oxymecie.appoxy.domain.model.DongDeNghi;
import vn.oxymecie.appoxy.domain.model.HopDongPhuTai;
import vn.oxymecie.appoxy.domain.model.NhomQuyen;

/** Thân request của các lệnh (ngoài các bản ghi lưu nguyên khối như KhachHang, HopDongBan…). */
public final class Req {
  private Req() {}

  private static final String NGAY = "^\\d{4}-\\d{2}-\\d{2}$";
  private static final String NGAY_MSG = "Ngày phải dạng YYYY-MM-DD";

  public record DangNhap(@NotBlank(message = "Chưa nhập Email") @Size(max = 200) String email,
                         @NotBlank(message = "Chưa nhập Mật khẩu") @Size(max = 128) String matKhau) {}

  public record DoiMatKhau(@NotBlank(message = "Chưa nhập mật khẩu cũ") String cu,
                           @NotBlank(message = "Chưa nhập mật khẩu mới") String moi,
                           @NotBlank(message = "Chưa nhập lại mật khẩu mới") String nhapLai) {}

  public record LyDo(@NotBlank(message = "Cần nhập lý do") @Size(max = 1000) String lyDo) {}

  public record Ids(@NotEmpty(message = "Chưa chọn bản ghi") List<@NotBlank String> ids) {}

  public record TuChoi(@NotEmpty(message = "Chưa chọn bản ghi") List<@NotBlank String> ids,
                       @NotBlank(message = "Cần nhập lý do từ chối") @Size(max = 1000) String lyDo) {}

  public record ChuyenTrangThai(@NotBlank(message = "Chưa chọn trạng thái") String toi, @Size(max = 1000) String lyDoHuy) {}

  public record PhanBo(@NotEmpty(message = "Chưa chọn khách hàng") List<@NotBlank String> ids, @Size(max = 40) String sale) {}

  public record ChamSoc(@Size(max = 4000) String noiDung, String tiepCan, String coHoi, @Size(max = 30) String kenh, @Size(max = 1000) String ketQua) {}

  public record DoiMa(@NotBlank(message = "Chưa nhập mã mới") @Size(max = 40) String moi) {}

  public record AnhXa(@Size(max = 40) String loaiHang, @Size(max = 40) String lo, @Size(max = 1000) String ghiChu) {}

  public record GiaoHang(@NotBlank(message = "Chưa chọn Ngày") @Pattern(regexp = NGAY, message = NGAY_MSG) String ngay,
                         @NotBlank(message = "Chưa chọn Vị trí kho") String kho,
                         @NotEmpty(message = "Cần ít nhất 1 dòng hàng") List<KhoService.DongXuat> dong,
                         @Size(max = 1000) String ghiChu) {}

  public record ThucThu(@NotBlank(message = "Cần Ngày thực thu") @Pattern(regexp = NGAY, message = NGAY_MSG) String ngayThu,
                        @Positive(message = "Số tiền phải > 0") long soTienThu,
                        @NotBlank(message = "Cần Nguồn tiền nhận") String nguonTienNhan) {}

  public record TienTraKhach(@NotBlank(message = "Cần Người nhận") @Size(max = 255) String nguoiNhan,
                             @Positive(message = "Số tiền phải > 0") long soTien,
                             @Pattern(regexp = NGAY, message = NGAY_MSG) String ngay,
                             @NotBlank(message = "Chưa chọn Nguồn tiền") String nguonTien) {}

  public record DeNghi(@NotEmpty(message = "Không có dòng nào cần đề nghị") List<DongDeNghi> dong, @Size(max = 1000) String ghiChu) {}

  public record NhapKho(@NotBlank(message = "Chưa chọn Ngày") @Pattern(regexp = NGAY, message = NGAY_MSG) String ngay,
                        @NotBlank(message = "Chưa chọn Vị trí kho") String kho,
                        @NotEmpty(message = "Chưa có dòng nhập") List<HdmService.DongNhap> dong,
                        @Size(max = 1000) String ghiChu,
                        @NotBlank(message = "Cần Số hoá đơn NCC") @Size(max = 50) String soHoaDon,
                        @Min(0) @Max(100) Double vat) {}

  public record TraNCC(@NotBlank(message = "Cần Ngày trả") @Pattern(regexp = NGAY, message = NGAY_MSG) String ngayTra,
                       @Positive(message = "Số tiền phải > 0") long soTienTra, String nguonTien) {}

  public record PhieuKhoTay(@NotNull @Valid KhoService.PhieuTay phieu, List<KhoService.DongNhapLo> dongNhap,
                            List<KhoService.DongXuat> dongXuat, @Size(max = 40) String id) {}

  public record SuaPhieuKho(@NotBlank(message = "Chưa chọn Ngày") @Pattern(regexp = NGAY, message = NGAY_MSG) String ngay,
                            @Size(max = 1000) String ghiChu) {}

  public record SuaLo(@Size(max = 500) String thuocTinh, @PositiveOrZero(message = "Đơn giá không âm") double donGia,
                      @Min(0) @Max(100) Double vat, @Size(max = 1000) String ghiChu) {}

  public record LuuPhuTai(@NotNull @Valid HopDongPhuTai hd, @Size(max = 1000) String lyDoTyLe) {}

  public record DongTienTay(@NotBlank(message = "Cần Ngày") @Pattern(regexp = NGAY, message = NGAY_MSG) String ngay,
                            @NotBlank String chieu, String hdptId, @Positive(message = "Số tiền phải > 0") long soTien,
                            @NotBlank(message = "Dòng điều chỉnh tay cần lý do") @Size(max = 1000) String ghiChu) {}

  public record GiaoViec(@NotBlank(message = "Nhập nội dung việc") @Size(max = 4000) String noiDung, List<String> nguoiNhan,
                         String hdbId, String hdmId, String nguonLoai, String nhom,
                         @Pattern(regexp = "^(\\d{4}-\\d{2}-\\d{2})?$", message = NGAY_MSG) String batDau,
                         @Pattern(regexp = NGAY, message = NGAY_MSG) String han, String gio, String mucUuTien,
                         List<vn.oxymecie.appoxy.domain.model.FileRef> files,
                         @Size(max = 20) String khId, @Size(max = 30) String kenh, Integer nhacTruoc, Boolean suCo) {}

  public record BaoRuiRo(@NotBlank(message = "Chọn mức cảnh báo") @Pattern(regexp = "^P[012]$", message = "Mức cảnh báo phải là P0, P1 hoặc P2") String muc,
                         @NotBlank(message = "Nhập nội dung rủi ro") @Size(max = 4000) String noiDung,
                         @NotBlank(message = "Nhập ảnh hưởng của rủi ro") @Size(max = 4000) String anhHuong,
                         String theoDoi, String hdbId, String hdmId) {}

  public record XuLyCanhBao(boolean xong, @Size(max = 1000) String ghiChu) {}

  public record GiaoCanhBao(String nguoiPhuTrach) {}

  public record CanhBaoHeThong(@NotBlank(message = "Thiếu khoá cảnh báo") @Size(max = 80) String khoa,
                               @NotBlank(message = "Chọn mức cảnh báo") @Pattern(regexp = "^P[012]$", message = "Mức cảnh báo phải là P0, P1 hoặc P2") String muc,
                               @NotBlank @Size(max = 4000) String noiDung, @NotBlank @Size(max = 4000) String anhHuong,
                               String theoDoi, String hdbId, String hdmId, String nguoiPhuTrach, boolean xong, @Size(max = 1000) String ghiChu) {}

  public record YeuCauHan(@NotBlank(message = "Chọn hạn mới") @Pattern(regexp = NGAY, message = NGAY_MSG) String hanMoi, String gioMoi,
                          @NotBlank(message = "Nhập lý do đổi hạn") @Size(max = 2000) String lyDo,
                          List<vn.oxymecie.appoxy.domain.model.FileRef> files) {}

  public record DuyetHan(boolean duyet) {}

  public record PhanHoi(@NotBlank(message = "Nhập nội dung phản hồi") @Size(max = 4000) String noiDung) {}

  public record Xong(boolean xong) {}

  public record GanTep(@NotEmpty(message = "Chưa chọn tệp") List<@NotBlank String> fileIds) {}

  public record HoSoCo(Boolean daLuu, Boolean daScan, @Size(max = 1000) String ghiChu) {}

  public record YeuCauXoa(@NotBlank String loai, @NotBlank @Size(max = 100) String maDoiTuong, @Size(max = 500) String moTa,
                          @NotBlank(message = "Cần nhập lý do xoá") @Size(max = 1000) String lyDo) {}

  public record CauHinh(@NotNull(message = "Thiếu giá trị") Object giaTri) {}

  public record LuuNhom(@NotNull @Valid NhomQuyen nhom, List<String> thanhVien) {}

  public record ThanhVien(@NotNull List<String> taiKhoan) {}

  public record TaoTaiKhoan(@NotBlank(message = "Chưa nhập Họ tên") @Size(max = 100) String hoTen,
                            @NotBlank(message = "Chưa nhập Email") @Email(message = "Email không hợp lệ") @Size(max = 200) String email,
                            @NotEmpty(message = "Chọn ít nhất 1 nhóm quyền") List<String> nhom,
                            @NotBlank(message = "Chưa nhập mật khẩu") String matKhau, @Size(max = 40) String id) {}

  public record SuaTaiKhoan(@Size(max = 100) String hoTen, @NotEmpty(message = "Chọn ít nhất 1 nhóm quyền") List<String> nhom) {}

  public record DatLaiMatKhau(boolean batDoi) {}
}
