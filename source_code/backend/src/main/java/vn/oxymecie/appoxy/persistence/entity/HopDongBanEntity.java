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

/** Hợp đồng bán (HDB-01…13): đợt thanh toán ở hdb_dot_tt, dòng hàng ở hdb_dong_hang. */
@Entity
@Table(name = "kd_hop_dong_ban")
@Getter
@Setter
public class HopDongBanEntity extends Audited {
  @Id
  private String id;

  @Column(name = "so_hd")
  private String soHD;

  @Column(name = "ma_kh", nullable = false)
  private String maKH;

  @Column(name = "ten_kh", nullable = false)
  private String tenKH;

  @Column(nullable = false)
  private String mst;

  @Column(name = "dia_chi", nullable = false)
  private String diaChi;

  @Column(name = "ngay_ky")
  private LocalDate ngayKy;

  @Column(name = "ngay_hieu_luc")
  private LocalDate ngayHieuLuc;

  @Column(name = "trang_thai", nullable = false)
  private String trangThai;

  private String sale;

  @Column(name = "ghi_chu")
  private String ghiChu;

  @Column(name = "truoc_vat", nullable = false)
  private long truocVAT;

  @Column(nullable = false)
  private int vat;

  @Column(name = "thuc_te_truoc_vat", nullable = false)
  private long thucTeTruocVAT;

  @Column(name = "ts_nguong", nullable = false)
  private double tsNguong;

  @Column(name = "ts_muc1", nullable = false)
  private double tsMuc1;

  @Column(name = "ts_muc2", nullable = false)
  private double tsMuc2;

  @Column(name = "co_tam_ung")
  private Boolean coTamUng;

  @Column(name = "phat_hd")
  private Long phatHD;

  @Column(name = "ly_do_phat")
  private String lyDoPhat;

  @Column(name = "ly_do_huy")
  private String lyDoHuy;

  @Column(name = "ghi_chu_ho_so_thieu")
  private String ghiChuHoSoThieu;

  @Column(name = "thuoc_phu_tai", nullable = false)
  private boolean thuocPhuTai;

  @Column(name = "pt_ty_le_oxy")
  private Double ptTyLeOxy;

  @Column(name = "tao_luc", nullable = false)
  private Instant taoLuc;

  @Column(name = "la_import", nullable = false)
  private boolean laImport;
  @ElementCollection
  @CollectionTable(name = "kd_hdb_dot_tt", joinColumns = @JoinColumn(name = "hdb_id"))
  @OrderColumn(name = "thu_tu")
  private List<DotTT> dotTT = new ArrayList<>();

  @OneToMany(mappedBy = "hdb", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("thuTu")
  private List<HdbDongHangEntity> dongHang = new ArrayList<>();
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

    private LocalDate han;

    @Column(name = "han_ngay")
    private Integer hanNgay;

    @Column(name = "ngay_thu")
    private LocalDate ngayThu;

    @Column(name = "so_tien_thu")
    private Long soTienThu;

    @Column(name = "nguon_tien_nhan")
    private String nguonTienNhan;

    @Column(name = "ghi_chu")
    private String ghiChu;

    @Column(name = "phieu_thu_id")
    private String phieuThuId;
  }
}
