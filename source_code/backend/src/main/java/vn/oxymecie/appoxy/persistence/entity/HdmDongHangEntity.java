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

/** Dòng hàng HĐ mua. */
@Entity
@Table(name = "kd_hdm_dong_hang")
@Getter
@Setter
public class HdmDongHangEntity {
  @Id
  private String id;

  @Column(name = "thu_tu", nullable = false)
  private int thuTu;

  @Column(name = "loai_hang", nullable = false)
  private String loaiHang;

  @Column(name = "ten_hang", nullable = false)
  private String tenHang;

  @Column(name = "thong_so", nullable = false)
  private String thongSo;

  @Column(name = "so_luong", nullable = false)
  private double soLuong;

  @Column(nullable = false)
  private String dvt;

  @Column(name = "don_gia", nullable = false)
  private double donGia;

  @Column(name = "loai_tien", nullable = false)
  private String loaiTien;

  @Column(name = "ty_gia", nullable = false)
  private double tyGia;

  @Column(name = "ghi_chu")
  private String ghiChu;

  @Column(name = "dnvt_id")
  private String dnvtId;

  @Column(name = "dnvt_dong")
  private String dnvtDong;

  @Column(name = "hdb_id")
  private String hdbId;
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "hdm_id", nullable = false)
  private HopDongMuaEntity hdm;
}
