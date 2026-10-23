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

/** Phiếu nhập / xuất kho (KHO-03…08); dòng phiếu ở phieu_kho_dong. */
@Entity
@Table(name = "phieu_kho")
@Getter
@Setter
public class PhieuKhoEntity extends Audited {
  @Id
  private String id;

  @Column(name = "so_phieu", nullable = false)
  private String soPhieu;

  @Column(nullable = false)
  private LocalDate ngay;

  @Column(nullable = false)
  private String loai;

  @Column(name = "nguon_goc", nullable = false)
  private String nguonGoc;

  @Column(name = "hd_id")
  private String hdId;

  @Column(nullable = false)
  private String kho;

  @Column(name = "ly_do")
  private String lyDo;

  @Column(name = "nguoi_thuc_hien", nullable = false)
  private String nguoiThucHien;

  @Column(name = "trang_thai", nullable = false)
  private String trangThai;

  @Column(name = "ghi_chu")
  private String ghiChu;

  @Column(name = "so_hoa_don")
  private String soHoaDon;

  private String ncc;

  @Column(name = "kiem_ke_id")
  private String kiemKeId;
  @ElementCollection
  @CollectionTable(name = "phieu_kho_dong", joinColumns = @JoinColumn(name = "phieu_id"))
  @OrderColumn(name = "thu_tu")
  private List<Dong> dong = new ArrayList<>();
  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  public static class Dong {
    @Column(name = "loai_hang", nullable = false)
    private String loaiHang;

    @Column(name = "thuoc_tinh", nullable = false)
    private String thuocTinh;

    @Column(name = "so_luong", nullable = false)
    private double soLuong;

    private String lo;

    @Column(name = "don_gia")
    private Double donGia;

    private Double vat;

    @Column(name = "dong_hdm_id")
    private String dongHDMua;

    @Column(name = "don_gia_goc")
    private Double donGiaGoc;

    @Column(name = "ten_tren_hd")
    private String tenTrenHD;

    @Column(name = "ghi_chu")
    private String ghiChu;
  }
}
