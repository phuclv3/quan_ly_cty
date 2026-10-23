package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Một dòng duy nhất giữ phiên bản dữ liệu (tăng sau mỗi lệnh ghi). */
@Entity
@Table(name = "app_state")
@Getter
@Setter
public class AppStateEntity {
  @Id
  private Integer id;

  @Column(name = "phien_ban", nullable = false)
  private long phienBan;

  @Column(name = "cap_nhat")
  private Instant capNhat;
}
