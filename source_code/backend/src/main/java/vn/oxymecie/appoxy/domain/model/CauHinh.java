package vn.oxymecie.appoxy.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tham số cấu hình (NT-14) — tên khoá giữ nguyên như frontend (models.ts CauHinh).
 * Lưu DB dạng khoá / giá trị ở bảng cau_hinh.
 */
@Data
@NoArgsConstructor
public class CauHinh {
  @JsonProperty("TNDN_NGUONG")
  private double tndnNguong = 0.2;
  @JsonProperty("TNDN_MUC1")
  private double tndnMuc1 = 0.25;
  @JsonProperty("TNDN_MUC2")
  private double tndnMuc2 = 0.5;
  @JsonProperty("PT_THUE")
  private double ptThue = 0.2;
  @JsonProperty("PT_GIU")
  private double ptGiu = 0.1;
  @JsonProperty("PT_CACH_CHIA")
  private String ptCachChia = "Nhân";
  @JsonProperty("SO_DOT_TOI_DA")
  private int soDotToiDa = 3;
  @JsonProperty("TIEN_TO_TC")
  private String tienToTC = "TC";
  @JsonProperty("TIEN_TO_CP")
  private String tienToCP = "CP";
  @JsonProperty("TIEN_TO_NK")
  private String tienToNK = "NK";
  @JsonProperty("TIEN_TO_XK")
  private String tienToXK = "XK";
}
