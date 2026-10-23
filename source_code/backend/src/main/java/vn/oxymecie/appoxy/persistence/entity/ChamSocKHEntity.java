package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Một lần chăm sóc khách hàng (chỉ thêm). */
@Entity
@Table(name = "kd_cham_soc_kh")
@Getter
@Setter
public class ChamSocKHEntity {
  @Id
  private String id;

  @Column(name = "thu_tu", nullable = false)
  private int thuTu;

  @Column(nullable = false)
  private Instant luc;

  @Column(nullable = false)
  private String nguoi;

  @Column(name = "noi_dung", nullable = false)
  private String noiDung;

  @Column(name = "co_hoi")
  private String coHoi;
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "khach_hang_id", nullable = false)
  private KhachHangEntity khachHang;
}
