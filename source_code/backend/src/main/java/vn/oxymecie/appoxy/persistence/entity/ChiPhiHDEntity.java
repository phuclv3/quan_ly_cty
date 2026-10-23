package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Chi phí thực hiện hợp đồng (KT-12…KT-15). */
@Entity
@Table(name = "kt_chi_phi_hd")
@Getter
@Setter
public class ChiPhiHDEntity extends Audited {
  @Id
  private String id;

  @Column(name = "ma_cp", nullable = false)
  private String maCP;

  @Column(name = "hdb_id")
  private String hdbId;

  @Column(nullable = false)
  private LocalDate ngay;

  @Column(name = "loai_chi_phi")
  private String loaiChiPhi;

  @Column(name = "noi_dung", nullable = false)
  private String noiDung;

  @Column(name = "so_tien", nullable = false)
  private long soTien;

  @Column(name = "nguon_tien")
  private String nguonTien;

  @Column(name = "nguoi_thuc_hien", nullable = false)
  private String nguoiThucHien;

  @Column(name = "nguoi_nhan")
  private String nguoiNhan;

  @Column(name = "don_vi_van_chuyen")
  private String donViVanChuyen;

  @Column(name = "trang_thai", nullable = false)
  private String trangThai;

  @Column(name = "nguoi_duyet")
  private String nguoiDuyet;

  @Column(name = "ngay_duyet")
  private Instant ngayDuyet;

  @Column(name = "ly_do_tu_choi")
  private String lyDoTuChoi;

  @Column(name = "ghi_chu")
  private String ghiChu;
  @ElementCollection
  @CollectionTable(name = "kt_chi_phi_hd_lich_su", joinColumns = @JoinColumn(name = "chi_phi_id"))
  @OrderColumn(name = "thu_tu")
  private List<LichSu> lichSu = new ArrayList<>();

  @ManyToMany
  @JoinTable(name = "kt_chi_phi_hd_tep", joinColumns = @JoinColumn(name = "chi_phi_id"), inverseJoinColumns = @JoinColumn(name = "tep_id"))
  @OrderColumn(name = "thu_tu")
  private List<TepTinEntity> files = new ArrayList<>();
  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  public static class LichSu {
    @Column(nullable = false)
    private Instant luc;

    @Column(nullable = false)
    private String nguoi;

    @Column(name = "hanh_dong", nullable = false)
    private String hanhDong;

    @Column(name = "ghi_chu")
    private String ghiChu;
  }
}
