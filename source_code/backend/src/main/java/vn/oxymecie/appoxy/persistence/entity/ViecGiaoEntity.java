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
