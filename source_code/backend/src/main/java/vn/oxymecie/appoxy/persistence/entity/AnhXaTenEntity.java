package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Ánh xạ tên hàng ghi trong HĐ bán → mã hàng / lô. */
@Entity
@Table(name = "anh_xa_ten")
@Getter
@Setter
public class AnhXaTenEntity {
  @Id
  private String id;

  @Column(nullable = false)
  private String ten;

  @Column(name = "the_tich")
  private String theTich;

  @Column(name = "nong_do")
  private String nongDo;

  @Column(name = "tong_sl", nullable = false)
  private double tongSL;

  @Column(name = "so_lan", nullable = false)
  private int soLan;

  @Column(name = "loai_hang")
  private String loaiHang;

  private String lo;

  @Column(name = "ghi_chu")
  private String ghiChu;
}
