package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

/** Nhóm quyền + mức quyền theo mã chức năng (bảng con nhom_quyen_chuc_nang). */
@Entity
@Table(name = "nhom_quyen")
@Getter
@Setter
public class NhomQuyenEntity {
  @Id
  private String id;

  @Column(nullable = false)
  private String ma;

  @Column(nullable = false)
  private String ten;

  @Column(name = "mo_ta", nullable = false)
  private String moTa;

  @Column(name = "toan_quyen", nullable = false)
  private boolean toanQuyen;

  @Column(name = "trang_thai", nullable = false)
  private String trangThai;

  @Column(name = "he_thong", nullable = false)
  private boolean heThong;

  @Column(name = "tao_luc", nullable = false)
  private Instant taoLuc;

  @Column(name = "cap_nhat")
  private Instant capNhat;

  @Column(name = "nguoi_cap_nhat")
  private String nguoiCapNhat;

  @ElementCollection
  @CollectionTable(name = "nhom_quyen_chuc_nang", joinColumns = @JoinColumn(name = "nhom_id"))
  @MapKeyColumn(name = "chuc_nang_ma")
  @Column(name = "muc_quyen")
  private Map<String, String> quyen = new HashMap<>();
}
