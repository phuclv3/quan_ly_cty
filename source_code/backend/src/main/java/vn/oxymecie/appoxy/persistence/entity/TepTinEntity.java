package vn.oxymecie.appoxy.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Tệp đã tải lên kho tệp (nội dung nằm ở thư mục app.storage.dir, khoá = duongDan). */
@Entity
@Table(name = "ht_tep_tin")
@Getter
@Setter
public class TepTinEntity {
  @Id
  private String id;

  @Column(nullable = false)
  private String ten;

  @Column(nullable = false)
  private String mime;

  @Column(name = "kich_thuoc", nullable = false)
  private long kichThuoc;

  @Column(columnDefinition = "MEDIUMTEXT")
  private String thumb;

  @Column(name = "duong_dan", nullable = false)
  private String duongDan;

  @Column(name = "ngay_upload", nullable = false)
  private Instant ngayUpload;

  @Column(name = "nguoi_upload", nullable = false)
  private String nguoiUpload;
}
