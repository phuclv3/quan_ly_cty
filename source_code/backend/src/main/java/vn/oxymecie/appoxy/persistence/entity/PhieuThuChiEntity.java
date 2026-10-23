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

/** Phiếu thu chi — Sổ quỹ (KT-04…KT-10). */
@Entity
@Table(name = "kt_phieu_thu_chi")
@Getter
@Setter
public class PhieuThuChiEntity extends Audited {
  @Id
  private String id;

  @Column(name = "so_phieu", nullable = false)
  private String soPhieu;

  @Column(name = "ngay_lap", nullable = false)
  private LocalDate ngayLap;

  @Column(nullable = false)
  private String loai;

  @Column(name = "nguon_tien")
  private String nguonTien;

  @Column(name = "nguon_tien_den")
  private String nguonTienDen;

  @Column(name = "loai_chi_phi")
  private String loaiChiPhi;

  @Column(name = "noi_dung", nullable = false)
  private String noiDung;

  @Column(name = "so_tien_thu", nullable = false)
  private long soTienThu;

  @Column(name = "so_tien_chi", nullable = false)
  private long soTienChi;

  @Column(name = "phieu_tam_ung_goc")
  private String phieuTamUngGoc;

  @Column(name = "so_tien_thuc_chi")
  private Long soTienThucChi;

  @Column(name = "nguoi_nhan")
  private String nguoiNhan;

  @Column(name = "nguoi_de_nghi", nullable = false)
  private String nguoiDeNghi;

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

  @Column(name = "ps_loai")
  private String psLoai;

  @Column(name = "ps_hd_id")
  private String psHdId;

  @Column(name = "ps_dot")
  private Integer psDot;

  @Column(name = "la_import", nullable = false)
  private boolean laImport;
  @ElementCollection
  @CollectionTable(name = "kt_phieu_thu_chi_lich_su", joinColumns = @JoinColumn(name = "phieu_id"))
  @OrderColumn(name = "thu_tu")
  private List<LichSu> lichSu = new ArrayList<>();

  @ManyToMany
  @JoinTable(name = "kt_phieu_thu_chi_tep", joinColumns = @JoinColumn(name = "phieu_id"), inverseJoinColumns = @JoinColumn(name = "tep_id"))
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
