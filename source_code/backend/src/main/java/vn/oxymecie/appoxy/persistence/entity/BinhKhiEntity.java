package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** Bình khí theo số serial và tình trạng in tem. */
@Entity
@Table(name = "kho_binh_khi")
@Getter
@Setter
public class BinhKhiEntity {
  @Id
  private String id;

  @Column(name = "loai_hang", nullable = false)
  private String loaiHang;

  @Column(name = "xuat_xu", nullable = false)
  private String xuatXu;

  @Column(name = "ngay_sx", nullable = false)
  private LocalDate ngaySX;

  @Column(name = "han_sd", nullable = false)
  private LocalDate hanSD;

  @Column(nullable = false)
  private String kho;

  @Column(name = "so_lan_in", nullable = false)
  private int soLanIn;

  @Column(name = "lan_in_cuoi")
  private LocalDate lanInCuoi;

  @Column(name = "nguoi_in")
  private String nguoiIn;

  @Column(name = "ghi_chu")
  private String ghiChu;
}
