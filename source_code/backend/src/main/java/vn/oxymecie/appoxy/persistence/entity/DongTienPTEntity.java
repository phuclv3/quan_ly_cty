package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** Dòng tiền quỹ ảo Phú Tài (PT-09). */
@Entity
@Table(name = "dong_tien_pt")
@Getter
@Setter
public class DongTienPTEntity {
  @Id
  private String id;

  @Column(nullable = false)
  private LocalDate ngay;

  @Column(nullable = false)
  private String chieu;

  @Column(name = "hdpt_id")
  private String hdptId;

  @Column(name = "so_tien", nullable = false)
  private long soTien;

  @Column(nullable = false)
  private String nguon;

  @Column(name = "ref_id")
  private String refId;

  @Column(name = "ghi_chu")
  private String ghiChu;
}
