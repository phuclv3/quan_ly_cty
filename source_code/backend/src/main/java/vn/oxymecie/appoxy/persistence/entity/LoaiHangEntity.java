package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/** Mã hàng cố định (KHO-02); thuộc tính / biệt danh ở bảng con. */
@Entity
@Table(name = "loai_hang")
@Getter
@Setter
public class LoaiHangEntity {
  @Id
  private String id;

  @Column(nullable = false)
  private String ten;

  @Column(name = "mo_ta")
  private String moTa;

  @Column(nullable = false)
  private String nhom;

  @Column(nullable = false)
  private String dvt;

  @Column(name = "dang_dung", nullable = false)
  private boolean dangDung;

  @Column(name = "loai_khi")
  private String loaiKhi;

  @Column(name = "the_tich")
  private String theTich;
  @ElementCollection
  @CollectionTable(name = "loai_hang_thuoc_tinh", joinColumns = @JoinColumn(name = "loai_hang_id"))
  @OrderColumn(name = "thu_tu")
  @Column(name = "gia_tri")
  private List<String> thuocTinh = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "loai_hang_biet_danh", joinColumns = @JoinColumn(name = "loai_hang_id"))
  @OrderColumn(name = "thu_tu")
  @Column(name = "gia_tri")
  private List<String> bietDanh = new ArrayList<>();
}
