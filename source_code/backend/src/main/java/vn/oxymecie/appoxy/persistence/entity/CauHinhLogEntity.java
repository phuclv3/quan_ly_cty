package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Lịch sử sửa tham số cấu hình (chỉ thêm). */
@Entity
@Table(name = "ht_cau_hinh_log")
@Getter
@Setter
public class CauHinhLogEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String khoa;

  @Column(name = "gia_tri_cu", nullable = false)
  private String giaTriCu;

  @Column(name = "gia_tri_moi", nullable = false)
  private String giaTriMoi;

  @Column(name = "nguoi_sua", nullable = false)
  private String nguoiSua;

  @Column(name = "ngay_sua", nullable = false)
  private Instant ngaySua;
}
