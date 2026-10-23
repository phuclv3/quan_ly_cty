package vn.oxymecie.appoxy.persistence.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.oxymecie.appoxy.persistence.entity.KhachHangEntity;

public interface KhachHangRepository extends JpaRepository<KhachHangEntity, String> {}
