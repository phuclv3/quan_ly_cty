package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** Hoá đơn của hợp đồng (HDB-06). */
@Entity
@Table(name = "ht_hoa_don")
@Getter
@Setter
public class HoaDonEntity {
  @Id
  private String id;

  @Column(nullable = false)
  private String chu;

  @Column(name = "chu_id", nullable = false)
  private String chuId;

  @Column(name = "so_hoa_don", nullable = false)
  private String soHoaDon;

  @Column(name = "ngay_hoa_don", nullable = false)
  private LocalDate ngayHoaDon;

  @Column(name = "gia_tri", nullable = false)
  private long giaTri;

  @Column(name = "tep_id")
  private String tepId;

  @Column(name = "thuoc_phu_tai", nullable = false)
  private boolean thuocPhuTai;
}
