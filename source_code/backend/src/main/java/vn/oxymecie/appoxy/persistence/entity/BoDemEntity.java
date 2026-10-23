package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Bộ đếm số chứng từ theo tiền tố + năm (KT-06 / D-31). */
@Entity
@Table(name = "ht_bo_dem")
@Getter
@Setter
@NoArgsConstructor
public class BoDemEntity {
  @Id
  private String khoa;

  @Column(name = "gia_tri", nullable = false)
  private int giaTri;

  public BoDemEntity(String khoa, int giaTri) {
    this.khoa = khoa;
    this.giaTri = giaTri;
  }
}
