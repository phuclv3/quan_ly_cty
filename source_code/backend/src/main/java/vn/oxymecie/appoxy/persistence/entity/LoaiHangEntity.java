package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/** Mã hàng cố định (KHO-02); thuộc tính / biệt danh ở bảng con. */
@Entity
@Table(name = "kho_loai_hang")
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

  @Column(name = "vat_lieu")
  private String vatLieu;

  @Column(name = "hop_quy")
  private String hopQuy;

  @Column(name = "kiem_dinh")
  private String kiemDinh;

  @Column(name = "tinh_trang")
  private String tinhTrang;

  @ManyToMany
  @JoinTable(name = "kho_loai_hang_tep_kiem_dinh", joinColumns = @JoinColumn(name = "loai_hang_id"), inverseJoinColumns = @JoinColumn(name = "tep_id"))
  @OrderColumn(name = "thu_tu")
  private List<TepTinEntity> fileKiemDinh = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "kho_loai_hang_thuoc_tinh", joinColumns = @JoinColumn(name = "loai_hang_id"))
  @OrderColumn(name = "thu_tu")
  @Column(name = "gia_tri")
  private List<String> thuocTinh = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "kho_loai_hang_biet_danh", joinColumns = @JoinColumn(name = "loai_hang_id"))
  @OrderColumn(name = "thu_tu")
  @Column(name = "gia_tri")
  private List<String> bietDanh = new ArrayList<>();
}
