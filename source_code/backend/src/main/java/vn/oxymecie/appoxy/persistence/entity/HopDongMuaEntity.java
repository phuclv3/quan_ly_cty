package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Hợp đồng mua (HDM-01…10). */
@Entity
@Table(name = "kd_hop_dong_mua")
@Getter
@Setter
public class HopDongMuaEntity extends Audited {
  @Id
  private String id;

  @Column(name = "so_hd", nullable = false)
  private String soHD;

  @Column(name = "ma_ncc", nullable = false)
  private String maNCC;

  @Column(name = "ten_ncc", nullable = false)
  private String tenNCC;

  @Column(name = "dia_chi", nullable = false)
  private String diaChi;

  @Column(nullable = false)
  private String mst;

  @Column(name = "ngay_ky")
  private LocalDate ngayKy;

  @Column(name = "hdb_id")
  private String hdbId;

  @Column(name = "thuoc_phu_tai", nullable = false)
  private boolean thuocPhuTai;

  @Column(name = "trang_thai", nullable = false)
  private String trangThai;

  @Column(name = "ghi_chu")
  private String ghiChu;

  @Column(name = "nhap_tay", nullable = false)
  private boolean nhapTay;

  @Column(name = "tong_nhap_tay")
  private Long tongNhapTay;

  @Column(name = "ly_do_nhap_tay")
  private String lyDoNhapTay;

  @Column(name = "xuat_hoa_don", nullable = false)
  private String xuatHoaDon;

  @Column(name = "ghi_chu_ho_so_thieu")
  private String ghiChuHoSoThieu;

  @Column(name = "tao_luc", nullable = false)
  private Instant taoLuc;

  @Column(name = "la_import", nullable = false)
  private boolean laImport;
  @OneToMany(mappedBy = "hdm", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("thuTu")
  private List<HdmDongHangEntity> chiTiet = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "kd_hdm_dot_tt", joinColumns = @JoinColumn(name = "hdm_id"))
  @OrderColumn(name = "thu_tu")
  private List<DotTT> dotTT = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "kd_hdm_checklist", joinColumns = @JoinColumn(name = "hdm_id"))
  @OrderColumn(name = "thu_tu")
  private List<Checklist> checklist = new ArrayList<>();
  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DotTT {
    @Column(nullable = false)
    private int dot;

    @Column(name = "ty_le")
    private Double tyLe;

    @Column(name = "so_tien", nullable = false)
    private long soTien;

    @Column(name = "han_moc")
    private String hanMoc;

    @Column(name = "han_ngay")
    private Integer hanNgay;

    private LocalDate han;

    @Column(name = "ngay_tra")
    private LocalDate ngayTra;

    @Column(name = "so_tien_tra")
    private Long soTienTra;

    @Column(name = "nguon_tien")
    private String nguonTien;

    @Column(name = "phieu_chi_id")
    private String phieuChiId;

    @Column(name = "ghi_chu")
    private String ghiChu;
  }
  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  public static class Checklist {
    @Column(nullable = false)
    private String ten;

    @Column(nullable = false)
    private boolean xong;

    private LocalDate ngay;
  }
}
