package vn.oxymecie.appoxy.persistence.repo;

import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import vn.oxymecie.appoxy.persistence.entity.PhienDangNhapEntity;

public interface PhienDangNhapRepository extends JpaRepository<PhienDangNhapEntity, String> {

  @Modifying
  @Query("delete from PhienDangNhapEntity p where p.taiKhoanId = :taiKhoanId")
  int xoaTheoTaiKhoan(String taiKhoanId);

  @Modifying
  @Query("delete from PhienDangNhapEntity p where p.hetHan < :moc")
  int xoaHetHan(Instant moc);
}
