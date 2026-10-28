package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** Cơ hội bán hàng của khách hàng. */
@Entity
@Table(name = "kd_co_hoi_kh")
@Getter
@Setter
public class CoHoiKHEntity {
  @Id
  private String id;

  @Column(name = "thu_tu", nullable = false)
  private int thuTu;

  @Column(name = "huong_ban", nullable = false)
  private String huongBan;

  @Column(name = "nhom_hang")
  private String nhomHang;

  @Column(name = "gia_tri", nullable = false)
  private long giaTri;

  @Column(name = "giai_doan", nullable = false)
  private String giaiDoan;

  @Column(name = "ngay_tao")
  private LocalDate ngayTao;

  @Column(name = "ngay_bao_gia")
  private LocalDate ngayBaoGia;

  @Column(name = "ngay_chot")
  private LocalDate ngayChot;

  @Column(name = "ly_do_thua")
  private String lyDoThua;

  @Column(name = "tuong_tac_tiep")
  private String tuongTacTiep;

  @Column(name = "ngay_tuong_tac")
  private LocalDate ngayTuongTac;

  @Column(name = "ngay_tai_tiep_can")
  private LocalDate ngayTaiTiepCan;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "khach_hang_id", nullable = false)
  private KhachHangEntity khachHang;
}
