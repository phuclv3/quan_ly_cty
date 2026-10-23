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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Nhật ký thao tác (ai, lúc nào, lệnh gì, bản ghi nào). Không chứa mật khẩu / token. */
@Entity
@Table(name = "ht_nhat_ky")
@Getter
@Setter
public class AuditLogEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Instant luc;

  @Column(name = "tai_khoan_id")
  private String taiKhoanId;

  @Column(name = "hanh_dong", nullable = false)
  private String hanhDong;

  @Column(name = "doi_tuong")
  private String doiTuong;

  @Column(name = "ma_doi_tuong")
  private String maDoiTuong;

  @Column(name = "mo_ta")
  private String moTa;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "du_lieu")
  private String duLieu;

  @Column(name = "dia_chi_ip")
  private String diaChiIp;
}
