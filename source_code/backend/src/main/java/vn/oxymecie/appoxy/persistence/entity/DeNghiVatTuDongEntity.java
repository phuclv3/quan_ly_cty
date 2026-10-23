package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Một dòng đề nghị cấp vật tư. */
@Entity
@Table(name = "kd_de_nghi_vat_tu_dong")
@Getter
@Setter
public class DeNghiVatTuDongEntity {
  @Id
  private String id;

  @Column(name = "thu_tu", nullable = false)
  private int thuTu;

  @Column(name = "loai_hang", nullable = false)
  private String loaiHang;

  @Column(name = "ten_hang", nullable = false)
  private String tenHang;

  @Column(name = "so_luong", nullable = false)
  private double soLuong;

  @Column(name = "ghi_chu")
  private String ghiChu;

  @Column(name = "dong_ban_id")
  private String dongBanId;
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "dnvt_id", nullable = false)
  private DeNghiVatTuEntity deNghi;
}
