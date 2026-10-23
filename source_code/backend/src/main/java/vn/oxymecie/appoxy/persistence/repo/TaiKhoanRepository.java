package vn.oxymecie.appoxy.persistence.repo;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.oxymecie.appoxy.persistence.entity.TaiKhoanEntity;

public interface TaiKhoanRepository extends JpaRepository<TaiKhoanEntity, String> {
  Optional<TaiKhoanEntity> findByEmailIgnoreCase(String email);

  long countByIdNot(String id);
}
