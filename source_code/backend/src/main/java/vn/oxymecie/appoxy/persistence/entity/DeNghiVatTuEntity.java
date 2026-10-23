package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/** Phiếu đề nghị cấp vật tư. */
@Entity
@Table(name = "de_nghi_vat_tu")
@Getter
@Setter
public class DeNghiVatTuEntity {
  @Id
  private String id;

  @Column(name = "so_phieu", nullable = false)
  private String soPhieu;

  @Column(nullable = false)
  private LocalDate ngay;

  @Column(name = "hdb_id", nullable = false)
  private String hdbId;

  @Column(name = "nguoi_de_nghi", nullable = false)
  private String nguoiDeNghi;

  @Column(name = "ghi_chu")
  private String ghiChu;

  @Column(name = "ly_do_huy")
  private String lyDoHuy;
  @OneToMany(mappedBy = "deNghi", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("thuTu")
  private List<DeNghiVatTuDongEntity> dong = new ArrayList<>();
}
