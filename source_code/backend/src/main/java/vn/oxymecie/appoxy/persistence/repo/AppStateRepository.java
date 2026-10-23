package vn.oxymecie.appoxy.persistence.repo;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import vn.oxymecie.appoxy.persistence.entity.AppStateEntity;

public interface AppStateRepository extends JpaRepository<AppStateEntity, Integer> {

  /** Khoá ghi toàn cục (SELECT … FOR UPDATE) — tuần tự hoá mọi lệnh ghi, kể cả khi chạy nhiều instance. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from AppStateEntity a where a.id = 1")
  Optional<AppStateEntity> lockState();

  @Query("select a.phienBan from AppStateEntity a where a.id = 1")
  Optional<Long> phienBan();
}
