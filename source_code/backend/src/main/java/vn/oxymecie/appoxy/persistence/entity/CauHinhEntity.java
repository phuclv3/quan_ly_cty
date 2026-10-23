package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Tham số cấu hình dạng khoá / giá trị. */
@Entity
@Table(name = "cau_hinh")
@Getter
@Setter
public class CauHinhEntity {
  @Id
  private String khoa;

  @Column(name = "gia_tri", nullable = false)
  private String giaTri;

  @Column(name = "updated_at")
  private Instant updatedAt;

  @Column(name = "updated_by")
  private String updatedBy;
}
