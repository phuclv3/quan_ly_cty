package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Vị trí kho (KHO-01). */
@Entity
@Table(name = "kho_vi_tri")
@Getter
@Setter
public class KhoEntity {
  @Id
  private String id;

  @Column(nullable = false)
  private String ten;

  @Column(nullable = false)
  private String loai;

  @Column(name = "dang_dung", nullable = false)
  private boolean dangDung;
}
