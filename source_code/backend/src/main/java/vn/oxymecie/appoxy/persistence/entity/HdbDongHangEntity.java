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

/** Dòng hàng HĐ bán / báo giá. */
@Entity
@Table(name = "kd_hdb_dong_hang")
@Getter
@Setter
public class HdbDongHangEntity {
  @Id
  private String id;

  @Column(name = "thu_tu", nullable = false)
  private int thuTu;

  @Column(name = "loai_hang")
  private String loaiHang;

  @Column(name = "ten_hang", nullable = false)
  private String tenHang;

  @Column(name = "so_luong", nullable = false)
  private double soLuong;

  @Column(name = "don_gia", nullable = false)
  private double donGia;

  @Column(name = "don_gia_th", nullable = false)
  private double donGiaTH;

  @Column(name = "ghi_chu")
  private String ghiChu;
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "hdb_id", nullable = false)
  private HopDongBanEntity hdb;
}
