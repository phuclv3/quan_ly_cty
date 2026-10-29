package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** Danh mục nguồn tiền (KT-01). */
@Entity
@Table(name = "kt_nguon_tien")
@Getter
@Setter
public class NguonTienEntity {
  @Id
  private String id;

  @Column(nullable = false)
  private String ten;

  @Column(name = "cong_ty", nullable = false)
  private String congTy;

  @Column(nullable = false)
  private String loai;

  @Column(name = "so_tai_khoan")
  private String soTaiKhoan;

  @Column(name = "ngan_hang")
  private String nganHang;

  @Column(name = "so_du_dau_ky", nullable = false)
  private long soDuDauKy;

  @Column(name = "ngay_dau_ky")
  private LocalDate ngayDauKy;

  @Column(name = "trang_thai", nullable = false)
  private String trangThai;
}
