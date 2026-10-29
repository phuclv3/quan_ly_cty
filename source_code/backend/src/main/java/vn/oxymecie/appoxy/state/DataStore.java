package vn.oxymecie.appoxy.state;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.oxymecie.appoxy.domain.logic.Ctx;
import vn.oxymecie.appoxy.domain.model.CauHinhLog;
import vn.oxymecie.appoxy.domain.model.Db;
import vn.oxymecie.appoxy.domain.model.FileRef;
import vn.oxymecie.appoxy.domain.logic.HeThongService;
import vn.oxymecie.appoxy.persistence.DbMapper;
import vn.oxymecie.appoxy.persistence.Repos;
import vn.oxymecie.appoxy.persistence.entity.AppStateEntity;
import vn.oxymecie.appoxy.persistence.entity.AuditLogEntity;
import vn.oxymecie.appoxy.persistence.entity.BoDemEntity;
import vn.oxymecie.appoxy.persistence.entity.CauHinhEntity;
import vn.oxymecie.appoxy.persistence.entity.CauHinhLogEntity;
import vn.oxymecie.appoxy.persistence.entity.TepTinEntity;

/**
 * Kho dữ liệu nghiệp vụ phía server.
 *
 * <ul>
 *   <li>Giữ một bản Db trong bộ nhớ (cache đọc) — không bao giờ sửa trực tiếp sau khi công bố.</li>
 *   <li>Lệnh ghi: khoá ht_trang_thai (SELECT … FOR UPDATE, tuần tự hoá mọi lệnh ghi kể cả nhiều instance) → nếu phiên bản
 *       DB khác cache thì nạp lại → chạy nghiệp vụ trên BẢN SAO → so sánh với bản cũ để biết bản ghi thêm / sửa / xoá →
 *       ghi xuống MySQL theo thứ tự khoá ngoại trong cùng transaction → tăng phiên bản, ghi ht_nhat_ky → commit rồi mới
 *       công bố bản mới. Lệnh lỗi thì bản sao bị bỏ, DB rollback, cache giữ nguyên.</li>
 * </ul>
 */
@Service
public class DataStore {
  private static final Logger log = LoggerFactory.getLogger(DataStore.class);

  private final Repos repos;
  private final DbMapper mapper;
  private final ObjectMapper om;
  private final TransactionTemplate tx;
  private final EntityManager em;
  private final JdbcTemplate jdbc;
  private final FileStorage files;
  private final Clock clock;
  private final ReentrantLock writeLock = new ReentrantLock(true);
  private volatile Db cache;

  public DataStore(Repos repos, DbMapper mapper, ObjectMapper om, PlatformTransactionManager txm, EntityManager em, JdbcTemplate jdbc,
      FileStorage files, Clock clock) {
    this.repos = repos;
    this.mapper = mapper;
    this.om = om;
    this.tx = new TransactionTemplate(txm);
    this.em = em;
    this.jdbc = jdbc;
    this.files = files;
    this.clock = clock;
  }

  /** Lệnh nghiệp vụ chạy trên bản làm việc. */
  @FunctionalInterface
  public interface Command<R> {
    R run(Ctx c);
  }

  /** Kết quả lệnh: giá trị trả về, câu cảnh báo (nếu có) và các bản ghi đã đổi. */
  public record Result<R>(R value, String message, ChangeSet changes, Db after) {}

  // ── Đọc ──────────────────────────────────────────────────────────────

  /** Bản dữ liệu hiện tại (nạp lại nếu instance khác đã ghi). Đối tượng trả về chỉ để đọc. */
  public Db current() {
    Db c = cache;
    Long v = tx.execute(s -> repos.appState().phienBan().orElse(0L));
    if (c != null && Objects.equals(c.getVersion(), v)) return c;
    writeLock.lock();
    try {
      c = cache;
      if (c != null && Objects.equals(c.getVersion(), v)) return c;
      Db fresh = tx.execute(s -> {
        Db d = mapper.loadAll();
        d.setVersion(repos.appState().phienBan().orElse(0L));
        return d;
      });
      cache = fresh;
      return fresh;
    } finally {
      writeLock.unlock();
    }
  }

  /** Bỏ cache (VD sau khi nạp lại dữ liệu mẫu) — lần đọc sau nạp từ DB. */
  public void invalidate() {
    cache = null;
  }

  public long version() {
    Long v = tx.execute(s -> repos.appState().phienBan().orElse(0L));
    return v == null ? 0 : v;
  }

  // ── Ghi ──────────────────────────────────────────────────────────────

  /**
   * Chạy một lệnh ghi.
   *
   * @param hanhDong tên lệnh cho nhật ký (VD "HDB.luu")
   * @param me id tài khoản thực hiện (null với tác vụ hệ thống)
   * @param ip địa chỉ IP client (ghi ht_nhat_ky)
   */
  public <R> Result<R> execute(String hanhDong, String me, String ip, Command<R> cmd) {
    return execute(hanhDong, me, ip, true, cmd);
  }

  /**
   * @param tangPhienBan false với ghi chép kỹ thuật không cần client nạp lại (đếm sai mật khẩu, lần đăng nhập cuối)
   */
  public <R> Result<R> execute(String hanhDong, String me, String ip, boolean tangPhienBan, Command<R> cmd) {
    writeLock.lock();
    try {
      Result<R> res = tx.execute(status -> run(hanhDong, me, ip, tangPhienBan, cmd));
      if (res != null && res.after() != null) {
        cache = res.after();
        for (String key : xoaSauCommit.get()) files.delete(key);
      }
      return res;
    } catch (RuntimeException e) {
      // Lỗi giữa chừng (kể cả lỗi DB) → cache cũ vẫn đúng vì chưa công bố bản mới.
      throw e;
    } finally {
      xoaSauCommit.remove();
      writeLock.unlock();
    }
  }

  private final ThreadLocal<List<String>> xoaSauCommit = ThreadLocal.withInitial(ArrayList::new);

  private <R> Result<R> run(String hanhDong, String me, String ip, boolean tangPhienBan, Command<R> cmd) {
    AppStateEntity st = repos.appState().lockState().orElseThrow(() -> new IllegalStateException("Thiếu dòng ht_trang_thai"));
    Db base = cache;
    if (base == null || base.getVersion() != st.getPhienBan()) {
      base = mapper.loadAll();
      base.setVersion(st.getPhienBan());
      cache = base;
    }
    Db work = deepCopy(base);
    Ctx c = new Ctx(work, me, clock, om, this::tep);
    R value = cmd.run(c);
    String message = value instanceof String s ? s : null;

    ChangeSet cs = diff(base, work);
    boolean coThayDoi = !cs.isEmpty() || !c.matKhauMoi().isEmpty();
    if (!coThayDoi) return new Result<>(value, message, cs, null);

    Instant now = Instant.now(clock);
    if (!c.doiMaHang().isEmpty()) {
      // Đổi khoá chính bằng SQL (khoá ngoại ON UPDATE CASCADE đổi theo ở mọi bảng con), rồi bỏ entity cũ khỏi bộ nhớ Hibernate.
      em.flush();
      em.clear();
      for (String[] dm : c.doiMaHang()) jdbc.update("UPDATE kho_loai_hang SET id = ? WHERE id = ?", dm[1], dm[0]);
      st = repos.appState().lockState().orElseThrow();
    }
    persist(base, work, c, me, now);
    if (cs.getCauHinh() != null) luuCauHinh(base, work, me, now);
    if (cs.getBoDem() != null) luuBoDem(base, work);
    xoaTep(c);
    em.flush();

    long prev = st.getPhienBan();
    long next = tangPhienBan ? prev + 1 : prev;
    st.setPhienBan(next);
    st.setCapNhat(now);
    work.setVersion(next);
    cs.setPrevVersion(prev);
    cs.setVersion(next);
    nhatKy(hanhDong, me, ip, now, c, cs, base);
    em.flush();
    return new Result<>(value, message, cs, work);
  }

  private Db deepCopy(Db d) {
    try {
      return om.readValue(om.writeValueAsBytes(d), Db.class);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  private FileRef tep(String id) {
    return repos.tepTin().findById(id).map(mapper::file).orElse(null);
  }

  // ── So sánh bản cũ / bản làm việc ────────────────────────────────────

  @SuppressWarnings({"unchecked", "rawtypes"})
  private ChangeSet diff(Db base, Db work) {
    ChangeSet cs = new ChangeSet();
    for (Bang b : Bang.ALL) {
      Map<String, Object> cu = index((List) b.rows().apply(base), b.id());
      Map<String, Object> moi = index((List) b.rows().apply(work), b.id());
      for (var e : moi.entrySet()) if (!Objects.equals(cu.get(e.getKey()), e.getValue())) cs.addUpsert(b.key(), e.getValue());
      for (String id : cu.keySet()) if (!moi.containsKey(id)) cs.addRemove(b.key(), id);
    }
    if (!Objects.equals(base.getCauHinh(), work.getCauHinh())) cs.setCauHinh(work.getCauHinh());
    if (!Objects.equals(base.getCauHinhLog(), work.getCauHinhLog())) cs.setCauHinhLog(work.getCauHinhLog());
    if (!Objects.equals(base.getBoDem(), work.getBoDem())) cs.setBoDem(work.getBoDem());
    return cs;
  }

  private static <T> Map<String, Object> index(List<T> rows, Function<T, String> id) {
    Map<String, Object> m = new LinkedHashMap<>();
    for (T r : rows) m.put(id.apply(r), r);
    return m;
  }

  // ── Ghi xuống MySQL ──────────────────────────────────────────────────

  @SuppressWarnings({"unchecked", "rawtypes"})
  private void persist(Db base, Db work, Ctx c, String me, Instant now) {
    // Thêm / sửa theo thứ tự bảng cha → con.
    for (Bang b : Bang.ALL) {
      Map<String, Object> cu = index((List) b.rows().apply(base), b.id());
      boolean co = false;
      for (Object row : (List) b.rows().apply(work)) {
        String id = (String) b.id().apply(row);
        if (Objects.equals(cu.get(id), row) && !c.matKhauMoi().containsKey(id)) continue;
        var repo = (org.springframework.data.jpa.repository.JpaRepository) b.repo().apply(repos);
        Object e = repo.findById(id).orElseGet(b.moi());
        b.apply().apply(mapper, row, e, c, me, now);
        repo.save(e);
        co = true;
      }
      if (co) em.flush();
    }
    // Xoá theo thứ tự ngược lại.
    List<Bang<?, ?>> nguoc = new ArrayList<>(Bang.ALL);
    java.util.Collections.reverse(nguoc);
    for (Bang b : nguoc) {
      Map<String, Object> moi = index((List) b.rows().apply(work), b.id());
      boolean co = false;
      for (Object row : (List) b.rows().apply(base)) {
        String id = (String) b.id().apply(row);
        if (moi.containsKey(id)) continue;
        var repo = (org.springframework.data.jpa.repository.JpaRepository) b.repo().apply(repos);
        repo.findById(id).ifPresent(repo::delete);
        co = true;
      }
      if (co) em.flush();
    }
  }

  private void luuCauHinh(Db base, Db work, String me, Instant now) {
    for (String k : List.of("TNDN_NGUONG", "TNDN_MUC1", "TNDN_MUC2", "PT_THUE", "PT_GIU", "PT_CACH_CHIA", "SO_DOT_TOI_DA", "TIEN_TO_TC",
        "TIEN_TO_CP", "TIEN_TO_NK", "TIEN_TO_XK")) {
      String v = HeThongService.giaTri(work.getCauHinh(), k);
      if (v.equals(HeThongService.giaTri(base.getCauHinh(), k))) continue;
      CauHinhEntity e = repos.cauHinh().findById(k).orElseGet(CauHinhEntity::new);
      e.setKhoa(k);
      e.setGiaTri(v);
      e.setUpdatedAt(now);
      e.setUpdatedBy(me);
      repos.cauHinh().save(e);
    }
    // Lịch sử chỉ thêm: các dòng mới nằm đầu danh sách.
    int moi = work.getCauHinhLog().size() - base.getCauHinhLog().size();
    for (int i = moi - 1; i >= 0; i--) {
      CauHinhLog l = work.getCauHinhLog().get(i);
      CauHinhLogEntity e = new CauHinhLogEntity();
      e.setKhoa(l.getKhoa());
      e.setGiaTriCu(l.getGiaTriCu());
      e.setGiaTriMoi(l.getGiaTriMoi());
      e.setNguoiSua(l.getNguoiSua());
      e.setNgaySua(Instant.parse(l.getNgaySua()));
      repos.cauHinhLog().save(e);
    }
  }

  private void luuBoDem(Db base, Db work) {
    for (var e : work.getBoDem().entrySet())
      if (!Objects.equals(base.getBoDem().get(e.getKey()), e.getValue())) repos.boDem().save(new BoDemEntity(e.getKey(), e.getValue()));
  }

  /** Xoá bản ghi tep_tin không còn được tham chiếu; nội dung trên đĩa xoá sau khi commit. */
  private void xoaTep(Ctx c) {
    for (String id : c.tepCanXoa()) {
      Integer dung = jdbc.queryForObject("""
          SELECT (SELECT COUNT(*) FROM ht_ho_so_tep WHERE tep_id = ?) + (SELECT COUNT(*) FROM kt_phieu_thu_chi_tep WHERE tep_id = ?)
               + (SELECT COUNT(*) FROM kt_chi_phi_hd_tep WHERE tep_id = ?) + (SELECT COUNT(*) FROM ht_hoa_don WHERE tep_id = ?)
               + (SELECT COUNT(*) FROM kho_loai_hang_tep_kiem_dinh WHERE tep_id = ?)
          """, Integer.class, id, id, id, id, id);
      if (dung != null && dung > 0) continue;
      TepTinEntity t = repos.tepTin().findById(id).orElse(null);
      if (t == null) continue;
      repos.tepTin().delete(t);
      xoaSauCommit.get().add(t.getDuongDan());
    }
  }

  // ── Nhật ký thao tác ─────────────────────────────────────────────────

  private void nhatKy(String hanhDong, String me, String ip, Instant now, Ctx c, ChangeSet cs, Db base) {
    Map<String, Object> duLieu = new LinkedHashMap<>();
    Map<String, List<String>> doi = new LinkedHashMap<>();
    cs.getUpsert().forEach((k, v) -> doi.put(k, v.stream().map(this::idOf).toList()));
    if (!doi.isEmpty()) duLieu.put("thayDoi", doi);
    if (!cs.getRemove().isEmpty()) {
      // Lưu ảnh bản ghi bị xoá để tra cứu sau (không có mật khẩu — domain không chứa mật khẩu).
      Map<String, Object> xoa = new LinkedHashMap<>();
      cs.getRemove().forEach((k, ids) -> {
        Bang<?, ?> b = Bang.ALL.stream().filter(x -> x.key().equals(k)).findFirst().orElseThrow();
        xoa.put(k, rowsById(b, base, ids));
      });
      duLieu.put("xoa", xoa);
    }
    if (cs.getCauHinh() != null) duLieu.put("cauHinh", true);
    AuditLogEntity a = new AuditLogEntity();
    a.setLuc(now);
    a.setTaiKhoanId(me);
    a.setHanhDong(hanhDong);
    a.setDoiTuong(c.nkDoiTuong());
    a.setMaDoiTuong(c.nkMaDoiTuong());
    a.setMoTa(c.nkMoTa());
    a.setDiaChiIp(ip);
    try {
      a.setDuLieu(om.writeValueAsString(duLieu));
    } catch (JsonProcessingException e) {
      a.setDuLieu(null);
    }
    repos.auditLog().save(a);
    log.info("Lệnh {} bởi {}: {} bảng sửa, {} bảng xoá", hanhDong, me, cs.getUpsert().size(), cs.getRemove().size());
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  private List<Object> rowsById(Bang b, Db db, List<String> ids) {
    Map<String, Object> m = index((List) b.rows().apply(db), b.id());
    List<Object> out = new ArrayList<>();
    for (String id : ids) if (m.containsKey(id)) out.add(m.get(id));
    return out;
  }

  private String idOf(Object row) {
    Map<?, ?> m = om.convertValue(row, HashMap.class);
    Object id = m.get("id");
    return id == null ? "" : id.toString();
  }
}
