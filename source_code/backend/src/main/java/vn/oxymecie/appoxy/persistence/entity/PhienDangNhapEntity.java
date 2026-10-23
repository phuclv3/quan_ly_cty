package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Phiên đăng nhập — chỉ lưu SHA-256 của token, hết hạn trượt 12 giờ theo hoạt động. */
@Entity
@Table(name = "ht_phien")
@Getter
@Setter
public class PhienDangNhapEntity {
  @Id
  @Column(name = "token_hash")
  private String tokenHash;

  @Column(name = "tai_khoan_id", nullable = false)
  private String taiKhoanId;

  @Column(name = "het_han", nullable = false)
  private Instant hetHan;

  @Column(name = "tao_luc", nullable = false)
  private Instant taoLuc;

  @Column(name = "dia_chi_ip")
  private String diaChiIp;

  @Column(name = "user_agent")
  private String userAgent;
}
