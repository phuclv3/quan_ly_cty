package vn.oxymecie.appoxy.domain.model;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Hồ sơ của hợp đồng theo loại (NT-12). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HoSo {
  private String id;
  private String chu;
  private String chuId;
  private String loai;
  private List<FileRef> files = new ArrayList<>();
  private boolean daLuu;
  private boolean daScan;
  private String ghiChu;
}
