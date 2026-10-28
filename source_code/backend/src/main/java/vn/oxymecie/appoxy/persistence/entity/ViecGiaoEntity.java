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

/** Việc được giao / lịch hẹn (TD-01). */
@Entity
@Table(name = "cv_viec")
@Getter
@Setter
public class ViecGiaoEntity {
  @Id
  private String id;

  @Column(name = "noi_dung", nullable = false)
  private String noiDung;

  @Column(name = "nguoi_tao", nullable = false)
  private String nguoiTao;

  @Column(name = "tao_luc", nullable = false)
  private Instant taoLuc;

  @Column(name = "hdb_id")
  private String hdbId;

  private LocalDate han;

  private String gio;

  @Column(name = "uu_tien", nullable = false)
  private boolean uuTien;

  @Column(name = "xong_luc")
  private Instant xongLuc;

  @Column(name = "nguoi_xong")
  private String nguoiXong;

  private String ma;

  private String nhom;

  @Column(name = "bat_dau")
  private LocalDate batDau;

  @Column(name = "muc_uu_tien")
  private String mucUuTien;

  @Column(name = "nguon_loai")
  private String nguonLoai;

  @Column(name = "hdm_id")
  private String hdmId;

  @Column(name = "yc_nguoi")
  private String ycNguoi;

  @Column(name = "yc_luc")
  private Instant ycLuc;

  @Column(name = "yc_han_moi")
  private LocalDate ycHanMoi;

  @Column(name = "yc_gio_moi")
  private String ycGioMoi;

  @Column(name = "yc_ly_do")
  private String ycLyDo;

  @Column(name = "yc_trang_thai")
  private String ycTrangThai;

  @ManyToMany
  @JoinTable(name = "cv_viec_tep", joinColumns = @JoinColumn(name = "viec_id"), inverseJoinColumns = @JoinColumn(name = "tep_id"))
  @OrderColumn(name = "thu_tu")
  private List<TepTinEntity> files = new ArrayList<>();

  @ManyToMany
  @JoinTable(name = "cv_viec_yc_tep", joinColumns = @JoinColumn(name = "viec_id"), inverseJoinColumns = @JoinColumn(name = "tep_id"))
  @OrderColumn(name = "thu_tu")
  private List<TepTinEntity> ycFiles = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "cv_viec_nguoi_nhan", joinColumns = @JoinColumn(name = "viec_id"))
  @OrderColumn(name = "thu_tu")
  @Column(name = "tai_khoan_id")
  private List<String> nguoiNhan = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "cv_viec_phan_hoi", joinColumns = @JoinColumn(name = "viec_id"))
  @OrderColumn(name = "thu_tu")
  private List<PhanHoi> phanHoi = new ArrayList<>();
  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  public static class PhanHoi {
    @Column(nullable = false)
    private String nguoi;

    @Column(nullable = false)
    private Instant luc;

    @Column(name = "noi_dung", nullable = false)
    private String noiDung;

    @Column(name = "he_thong")
    private Boolean heThong;
  }
}
