package vn.oxymecie.appoxy.persistence.repo;

import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import vn.oxymecie.appoxy.persistence.entity.AuditLogEntity;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {

  /**
   * Tra nhật ký thao tác: lọc theo người, đối tượng, khoảng thời gian; sắp mới nhất trước (theo Pageable).
   * an ≠ null → bỏ mọi dòng do tài khoản đó thực hiện hoặc nhắm tới tài khoản đó.
   */
  @Query("""
      select a from AuditLogEntity a
      where (:an is null or ((a.taiKhoanId is null or a.taiKhoanId <> :an) and (a.maDoiTuong is null or a.maDoiTuong <> :an)))
        and (:taiKhoanId is null or a.taiKhoanId = :taiKhoanId)
        and (:doiTuong is null or a.doiTuong = :doiTuong)
        and (:maDoiTuong is null or a.maDoiTuong = :maDoiTuong)
        and (:tu is null or a.luc >= :tu)
        and (:den is null or a.luc <= :den)
      """)
  Page<AuditLogEntity> tim(String taiKhoanId, String doiTuong, String maDoiTuong, Instant tu, Instant den, Pageable pageable);
}
