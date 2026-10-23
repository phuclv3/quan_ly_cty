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
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Đợt kiểm kê thực tế tại kho. */
@Entity
@Table(name = "kho_kiem_ke")
@Getter
@Setter
public class KiemKeEntity {
  @Id
  private String id;

  @Column(name = "so_phieu", nullable = false)
  private String soPhieu;

  @Column(nullable = false)
  private LocalDate ngay;

  @Column(nullable = false)
  private String kho;

  @Column(name = "nguoi_thuc_hien", nullable = false)
  private String nguoiThucHien;

  @Column(name = "ghi_chu")
  private String ghiChu;
  @ElementCollection
  @CollectionTable(name = "kho_kiem_ke_dong", joinColumns = @JoinColumn(name = "kiem_ke_id"))
  @OrderColumn(name = "thu_tu")
  private List<Dong> dong = new ArrayList<>();

  @ElementCollection
  @CollectionTable(name = "kho_kiem_ke_phieu_dc", joinColumns = @JoinColumn(name = "kiem_ke_id"))
  @OrderColumn(name = "thu_tu")
  @Column(name = "phieu_kho_id")
  private List<String> phieuDieuChinh = new ArrayList<>();
  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  public static class Dong {
    @Column(name = "loai_hang", nullable = false)
    private String loaiHang;

    @Column(name = "so_luong", nullable = false)
    private double soLuong;

    @Column(name = "ten_hang")
    private String tenHang;

    @Column(name = "xuat_xu")
    private String xuatXu;

    @Column(name = "nong_do")
    private String nongDo;

    @Column(name = "ghi_chu")
    private String ghiChu;
  }
}
