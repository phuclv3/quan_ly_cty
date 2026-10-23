package vn.oxymecie.appoxy.state;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.Data;
import vn.oxymecie.appoxy.domain.model.CauHinh;
import vn.oxymecie.appoxy.domain.model.CauHinhLog;

/**
 * Các bản ghi một lệnh ghi đã thay đổi — frontend áp vào dữ liệu đang giữ (store.ts applyChangeSet).
 * upsert: bản ghi mới / đã sửa theo bảng; remove: id bị xoá; cauHinh / cauHinhLog / boDem: cả khối khi có đổi.
 */
@Data
public class ChangeSet {
  /** Phiên bản dữ liệu trước và sau lệnh; client thấy prevVersion khác bản mình giữ thì nạp lại toàn bộ. */
  private long prevVersion;
  private long version;
  private Map<String, List<Object>> upsert = new LinkedHashMap<>();
  private Map<String, List<String>> remove = new LinkedHashMap<>();
  private CauHinh cauHinh;
  private List<CauHinhLog> cauHinhLog;
  private Map<String, Integer> boDem;

  public void addUpsert(String bang, Object row) {
    upsert.computeIfAbsent(bang, k -> new ArrayList<>()).add(row);
  }

  public void addRemove(String bang, String id) {
    remove.computeIfAbsent(bang, k -> new ArrayList<>()).add(id);
  }

  public boolean isEmpty() {
    return upsert.isEmpty() && remove.isEmpty() && cauHinh == null && cauHinhLog == null && boDem == null;
  }
}
