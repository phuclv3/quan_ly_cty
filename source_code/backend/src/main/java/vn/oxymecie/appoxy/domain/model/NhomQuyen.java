package vn.oxymecie.appoxy.domain.model;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Nhóm quyền (models.ts NhomQuyen). quyen: mã chức năng → mức quyền. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NhomQuyen {
  private String id;
  private String ma;
  private String ten;
  private String moTa;
  private boolean toanQuyen;
  private String trangThai;
  private Map<String, String> quyen = new LinkedHashMap<>();
  private Boolean heThong;
  private String taoLuc;
  private String capNhat;
  private String nguoiCapNhat;
}
