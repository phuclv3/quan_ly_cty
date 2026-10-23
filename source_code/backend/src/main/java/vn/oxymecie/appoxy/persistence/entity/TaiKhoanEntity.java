package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;

/** Tài khoản đăng nhập (mật khẩu BCrypt) + nhóm quyền (bảng tai_khoan_nhom). */
@Entity
@Table(name = "ht_nhanvien")
@Getter
@Setter
public class TaiKhoanEntity extends Audited {
  @Id
  private String id;

  @Column(nullable = false)
  private String email;

  @Column(name = "ho_ten", nullable = false)
  private String hoTen;

  @Column(name = "mat_khau_bam", nullable = false)
  private String matKhauBam;

  @Column(name = "trang_thai", nullable = false)
  private String trangThai;

  @Column(name = "bat_doi_mk", nullable = false)
  private boolean batDoiMK;

  @Column(name = "so_lan_sai", nullable = false)
  private int soLanSai;

  @Column(name = "khoa_den")
  private Instant khoaDen;

  @Column(name = "lan_dang_nhap_cuoi")
  private Instant lanDangNhapCuoi;

  @ElementCollection
  @CollectionTable(name = "ht_nhanvien_nhom", joinColumns = @JoinColumn(name = "tai_khoan_id"))
  @Column(name = "nhom_id")
  private Set<String> nhom = new LinkedHashSet<>();
}
