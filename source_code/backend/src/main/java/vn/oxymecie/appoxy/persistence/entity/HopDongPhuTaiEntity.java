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
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Hợp đồng Phú Tài (PT-01…11). */
@Entity
@Table(name = "pt_hop_dong")
@Getter
@Setter
public class HopDongPhuTaiEntity extends Audited {
  @Id
  private String id;

  @Column(name = "so_hd", nullable = false)
  private String soHD;

  @Column(name = "ma_kh", nullable = false)
  private String maKH;

  @Column(name = "ten_kh", nullable = false)
  private String tenKH;

  @Column(nullable = false)
  private String mst;

  @Column(name = "ngay_ky")
  private LocalDate ngayKy;

  @Column(name = "ngay_hieu_luc")
  private LocalDate ngayHieuLuc;

  @Column(name = "trang_thai", nullable = false)
  private String trangThai;

  @Column(name = "ghi_chu")
  private String ghiChu;

  @Column(name = "truoc_vat", nullable = false)
  private long truocVAT;

  @Column(nullable = false)
  private int vat;

  @Column(name = "ty_le_thue", nullable = false)
  private double tyLeThue;

  @Column(name = "ty_le_giu", nullable = false)
  private double tyLeGiu;

  @Column(name = "cach_chia")
  private String cachChia;

  @Column(name = "hoa_hong_kieu", nullable = false)
  private String hoaHongKieu;

  @Column(name = "hoa_hong_gia_tri", nullable = false)
  private double hoaHongGiaTri;

  @Column(name = "nguoi_nhan_hh")
  private String nguoiNhanHH;

  @Column(name = "ngay_chi_hh")
  private LocalDate ngayChiHH;

  @Column(name = "ghi_chu_ho_so_thieu")
  private String ghiChuHoSoThieu;

  @Column(name = "ly_do_huy")
  private String lyDoHuy;

  @Column(name = "tao_luc", nullable = false)
  private Instant taoLuc;

  @Column(name = "la_import", nullable = false)
  private boolean laImport;
  @ElementCollection
  @CollectionTable(name = "pt_hop_dong_mua", joinColumns = @JoinColumn(name = "hdpt_id"))
  @OrderColumn(name = "thu_tu")
  @Column(name = "hdm_id")
  private List<String> hdMua = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "pt_chi_phi", joinColumns = @JoinColumn(name = "hdpt_id"))
  @OrderColumn(name = "thu_tu")
  private List<ChiPhi> chiPhi = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "pt_dot_kh", joinColumns = @JoinColumn(name = "hdpt_id"))
  @OrderColumn(name = "thu_tu")
  private List<DotKH> dotKH = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "pt_dot_tra_ncc", joinColumns = @JoinColumn(name = "hdpt_id"))
  @OrderColumn(name = "thu_tu")
  private List<TraNCC> dotTraNCC = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "pt_doi_chieu", joinColumns = @JoinColumn(name = "hdpt_id"))
  @OrderColumn(name = "thu_tu")
  private List<DoiChieu> doiChieu = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "pt_ty_le_log", joinColumns = @JoinColumn(name = "hdpt_id"))
  @OrderColumn(name = "thu_tu")
  private List<TyLeLog> tyLeLog = new ArrayList<>();
  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ChiPhi {
    @Column(nullable = false)
    private String id;

    @Column(nullable = false)
    private String loai;

    @Column(name = "noi_dung", nullable = false)
    private String noiDung;

    private LocalDate ngay;

    @Column(name = "so_tien", nullable = false)
    private long soTien;
  }
  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DotKH {
    @Column(nullable = false)
    private int dot;

    @Column(name = "so_tien", nullable = false)
    private long soTien;

    private LocalDate ngay;

    @Column(name = "ghi_chu")
    private String ghiChu;
  }
  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  public static class TraNCC {
    @Column(nullable = false)
    private String id;

    @Column(name = "hdm_id", nullable = false)
    private String hdmId;

    private LocalDate ngay;

    @Column(name = "so_tien", nullable = false)
    private double soTien;

    @Column(name = "loai_tien", nullable = false)
    private String loaiTien;

    @Column(name = "ty_gia", nullable = false)
    private double tyGia;
  }
  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DoiChieu {
    @Column(nullable = false)
    private String id;

    @Column(name = "ngay_oxy_chuyen")
    private LocalDate ngayOxyChuyen;

    @Column(name = "so_tien_vnd", nullable = false)
    private long soTienVND;

    @Column(name = "ngay_pt_chuyen_ncc")
    private LocalDate ngayPTChuyenNCC;

    @Column(name = "so_tien_nguyen_te", nullable = false)
    private double soTienNguyenTe;

    @Column(name = "loai_tien", nullable = false)
    private String loaiTien;

    @Column(name = "ty_gia", nullable = false)
    private double tyGia;

    @Column(name = "ghi_chu")
    private String ghiChu;
  }
  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  public static class TyLeLog {
    @Column(nullable = false)
    private String truoc;

    @Column(nullable = false)
    private String sau;

    @Column(nullable = false)
    private String nguoi;

    @Column(nullable = false)
    private Instant luc;

    @Column(name = "ly_do")
    private String lyDo;
  }
}
