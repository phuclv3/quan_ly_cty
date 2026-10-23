package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Loại chi phí (KT-03). */
@Entity
@Table(name = "loai_chi_phi")
@Getter
@Setter
public class LoaiChiPhiEntity {
  @Id
  private String id;

  @Column(nullable = false)
  private String ten;

  @Column(nullable = false)
  private String nhom;

  @Column(name = "dang_dung", nullable = false)
  private boolean dangDung;
}
