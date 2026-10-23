package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Yêu cầu xoá chờ duyệt (NT-11). */
@Entity
@Table(name = "ht_yeu_cau_xoa")
@Getter
@Setter
public class YeuCauXoaEntity {
  @Id
  private String id;

  @Column(nullable = false)
  private String loai;

  @Column(name = "ma_doi_tuong", nullable = false)
  private String maDoiTuong;

  @Column(name = "mo_ta", nullable = false)
  private String moTa;

  @Column(name = "ly_do", nullable = false)
  private String lyDo;

  @Column(name = "nguoi_gui", nullable = false)
  private String nguoiGui;

  @Column(name = "ngay_gui", nullable = false)
  private Instant ngayGui;

  @Column(name = "trang_thai", nullable = false)
  private String trangThai;

  @Column(name = "nguoi_duyet")
  private String nguoiDuyet;

  @Column(name = "ngay_duyet")
  private Instant ngayDuyet;

  @Column(name = "ly_do_tu_choi")
  private String lyDoTuChoi;
}
