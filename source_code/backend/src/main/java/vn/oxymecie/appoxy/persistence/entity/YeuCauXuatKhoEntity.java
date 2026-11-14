package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Yêu cầu xuất kho và giao hàng của HĐ bán. */
@Entity
@Table(name = "kho_yeu_cau_xuat")
@Getter
@Setter
public class YeuCauXuatKhoEntity {
  @Id
  private String id;

  @Column(name = "so_yc", nullable = false)
  private String soYC;

  @Column(name = "ngay_gui", nullable = false)
  private LocalDate ngayGui;

  @Column(name = "hdb_id", nullable = false)
  private String hdbId;

  @Column(name = "nguoi_gui", nullable = false)
  private String nguoiGui;

  @Column(name = "ghi_chu")
  private String ghiChu;

  @Column(name = "trang_thai", nullable = false)
  private String trangThai;

  @Column(name = "ly_do_tu_choi")
  private String lyDoTuChoi;

  @Column(name = "nguoi_xu_ly")
  private String nguoiXuLy;

  @Column(name = "ngay_xu_ly")
  private LocalDate ngayXuLy;

  private String kho;

  @Column(name = "phieu_id")
  private String phieuId;

  @Column(name = "ngay_xuat")
  private LocalDate ngayXuat;

  @Column(name = "ngay_giao")
  private LocalDate ngayGiao;

  @Column(name = "nguoi_giao")
  private String nguoiGiao;

  @ElementCollection
  @CollectionTable(name = "kho_yeu_cau_xuat_dong", joinColumns = @JoinColumn(name = "yc_id"))
  @OrderColumn(name = "thu_tu")
  private List<Dong> dong = new ArrayList<>();

  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  public static class Dong {
    @Column(name = "loai_hang", nullable = false)
    private String loaiHang;

    @Column(name = "ten_tren_hd")
    private String tenTrenHD;

    @Column(name = "so_luong", nullable = false)
    private double soLuong;

    @Column(name = "ghi_chu")
    private String ghiChu;
  }
}
