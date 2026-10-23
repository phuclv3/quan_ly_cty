package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/** Hồ sơ một loại của một hợp đồng; tệp đính kèm qua bảng ho_so_tep (giữ thứ tự). */
@Entity
@Table(name = "ht_ho_so")
@Getter
@Setter
public class HoSoEntity {
  @Id
  private String id;

  @Column(nullable = false)
  private String chu;

  @Column(name = "chu_id", nullable = false)
  private String chuId;

  @Column(nullable = false)
  private String loai;

  @Column(name = "da_luu", nullable = false)
  private boolean daLuu;

  @Column(name = "da_scan", nullable = false)
  private boolean daScan;

  @Column(name = "ghi_chu")
  private String ghiChu;

  @ManyToMany
  @JoinTable(name = "ht_ho_so_tep", joinColumns = @JoinColumn(name = "ho_so_id"), inverseJoinColumns = @JoinColumn(name = "tep_id"))
  @OrderColumn(name = "thu_tu")
  private List<TepTinEntity> files = new ArrayList<>();
}
