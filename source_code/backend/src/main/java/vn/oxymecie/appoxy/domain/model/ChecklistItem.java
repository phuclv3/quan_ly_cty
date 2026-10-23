package vn.oxymecie.appoxy.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Mục checklist tiến độ HĐ mua. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistItem {
  private String ten;
  private boolean xong;
  private String ngay;
}
