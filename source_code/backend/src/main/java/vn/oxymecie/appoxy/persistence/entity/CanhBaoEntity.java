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
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Cảnh báo rủi ro nhập tay (P0 / P1 / P2). */
@Entity
@Table(name = "cv_canh_bao")
@Getter
@Setter
public class CanhBaoEntity {
  @Id
  private String id;

  @Column(nullable = false)
  private String ma;

  @Column(nullable = false)
  private String muc;

  @Column(name = "noi_dung", nullable = false)
  private String noiDung;

  @Column(name = "anh_huong", nullable = false)
  private String anhHuong;

  @Column(name = "theo_doi")
  private String theoDoi;

  @Column(name = "hdb_id")
  private String hdbId;

  @Column(name = "hdm_id")
  private String hdmId;

  @Column(name = "nguoi_tao", nullable = false)
  private String nguoiTao;

  @Column(name = "tao_luc", nullable = false)
  private Instant taoLuc;

  @Column(name = "xu_ly_luc")
  private Instant xuLyLuc;

  @Column(name = "nguoi_xu_ly")
  private String nguoiXuLy;

  @Column(name = "ghi_chu_xu_ly")
  private String ghiChuXuLy;

  /** TAY / HE_THONG. */
  @Column(nullable = false)
  private String nguon = "TAY";

  @Column(name = "khoa_he_thong")
  private String khoaHeThong;

  @Column(name = "nguoi_phu_trach")
  private String nguoiPhuTrach;

  @ElementCollection
  @CollectionTable(name = "cv_canh_bao_lich_su", joinColumns = @JoinColumn(name = "canh_bao_id"))
  @OrderColumn(name = "thu_tu")
  private List<LichSu> lichSu = new ArrayList<>();

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
