package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Nhà cung cấp (HDM-10). */
@Entity
@Table(name = "kd_nha_cung_cap")
@Getter
@Setter
public class NhaCungCapEntity extends Audited {
  @Id
  private String id;

  @Column(nullable = false)
  private String ten;

  @Column(nullable = false)
  private String mst;

  @Column(name = "dia_chi", nullable = false)
  private String diaChi;

  @Column(name = "quoc_gia", nullable = false)
  private String quocGia;

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
}
