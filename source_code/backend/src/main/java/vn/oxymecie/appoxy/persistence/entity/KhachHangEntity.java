package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/** Khách hàng & theo dõi kinh doanh (HDB-13); nhật ký chăm sóc ở cham_soc_kh. */
@Entity
@Table(name = "kd_khach_hang")
@Getter
@Setter
public class KhachHangEntity extends Audited {
  @Id
  private String id;

  @Column(nullable = false)
  private String ten;

  @Column(name = "ten_viet_tat")
  private String tenVietTat;

  @Column(nullable = false)
  private String mst;

  @Column(name = "dia_chi", nullable = false)
  private String diaChi;

  @Column(name = "nguoi_lien_he", nullable = false)
  private String nguoiLienHe;

  @Column(name = "dien_thoai", nullable = false)
  private String dienThoai;

  @Column(nullable = false)
  private String email;

  @Column(name = "ghi_chu")
  private String ghiChu;

  @Column(name = "trang_thai")
  private String trangThai;

  private String tinh;

  @Column(name = "chuc_vu")
  private String chucVu;

  @Column(name = "phan_loai")
  private String phanLoai;

  private String nguon;

  @Column(name = "loai_sp")
  private String loaiSP;

  @Column(name = "hinh_thuc_hd")
  private String hinhThucHD;

  @Column(name = "tiep_can")
  private String tiepCan;

  @Column(name = "co_hoi")
  private String coHoi;

  @Column(name = "phu_trach")
  private String phuTrach;

  @Column(name = "trang_thai_data")
  private String trangThaiData;

  @Column(name = "ngay_tiep_nhan")
  private LocalDate ngayTiepNhan;

  @Column(name = "ngay_phan_bo")
  private LocalDate ngayPhanBo;

  @Column(name = "gia_tri_co_hoi")
  private Long giaTriCoHoi;

  @Column(name = "la_import", nullable = false)
  private boolean laImport;
  @OneToMany(mappedBy = "khachHang", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("thuTu")
  private List<ChamSocKHEntity> chamSoc = new ArrayList<>();

  @OneToMany(mappedBy = "khachHang", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("thuTu")
  private List<CoHoiKHEntity> dsCoHoi = new ArrayList<>();
}
