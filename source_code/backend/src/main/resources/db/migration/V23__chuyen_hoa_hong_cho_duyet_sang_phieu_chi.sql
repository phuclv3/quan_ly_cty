-- Hoa hồng kinh doanh phải có Phiếu chi: chuyển các khoản Chờ duyệt đang ghi ở Chi phí thực hiện HĐ (CPTH-HH)
-- sang Phiếu chi (Chờ duyệt) gắn HĐ bán, rồi xoá dòng chi phí cũ để không bị tính hai lần.
-- Khoản Đã duyệt / Nháp / Từ chối giữ nguyên ở Chi phí HĐ.

-- Bảng tạm khai báo collation tường minh: cột sinh từ biểu thức (CONCAT…) sẽ lấy collation mặc định của máy chủ
-- (utf8mb4_0900_ai_ci) và lệch với các bảng của ứng dụng (utf8mb4_unicode_ci) → lỗi "Illegal mix of collations" khi JOIN.
CREATE TEMPORARY TABLE tmp_hh_chuyen (
  cp_id     VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  phieu_id  VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  khoa      VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  stt       INT NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT INTO tmp_hh_chuyen (cp_id, phieu_id, khoa, stt)
SELECT
  c.id,
  LEFT(CONCAT('PTC-', c.id), 40),
  CONCAT('PC', DATE_FORMAT(c.ngay, '%y%m')),
  ROW_NUMBER() OVER (PARTITION BY DATE_FORMAT(c.ngay, '%y%m') ORDER BY c.ngay, c.created_at, c.id)
FROM kt_chi_phi_hd c
WHERE c.loai_chi_phi = 'CPTH-HH' AND c.trang_thai = 'CHO_DUYET' AND c.hdb_id IS NOT NULL;

INSERT INTO kt_phieu_thu_chi (id, so_phieu, ngay_lap, loai, nguon_tien, loai_chi_phi, noi_dung, so_tien_thu, so_tien_chi,
                              nguoi_nhan, nguoi_de_nghi, trang_thai, ghi_chu, hdb_id, la_import,
                              created_at, updated_at, created_by, updated_by)
SELECT t.phieu_id,
       CONCAT(t.khoa, '-', LPAD(COALESCE(b.gia_tri, 0) + t.stt, 3, '0')),
       c.ngay, 'Chi', c.nguon_tien, c.loai_chi_phi, c.noi_dung, 0, c.so_tien,
       c.nguoi_nhan, c.nguoi_thuc_hien, 'CHO_DUYET', c.ghi_chu, c.hdb_id, FALSE,
       c.created_at, c.updated_at, c.created_by, c.updated_by
FROM tmp_hh_chuyen t
JOIN kt_chi_phi_hd c ON c.id = t.cp_id
LEFT JOIN ht_bo_dem b ON b.khoa = t.khoa;

INSERT INTO kt_phieu_thu_chi_lich_su (phieu_id, thu_tu, luc, nguoi, hanh_dong, ghi_chu)
SELECT t.phieu_id, l.thu_tu, l.luc, l.nguoi, l.hanh_dong, l.ghi_chu
FROM tmp_hh_chuyen t
JOIN kt_chi_phi_hd_lich_su l ON l.chi_phi_id = t.cp_id;

INSERT INTO kt_phieu_thu_chi_tep (phieu_id, thu_tu, tep_id)
SELECT t.phieu_id, f.thu_tu, f.tep_id
FROM tmp_hh_chuyen t
JOIN kt_chi_phi_hd_tep f ON f.chi_phi_id = t.cp_id;

-- Bộ đếm số phiếu: cộng thêm số phiếu vừa cấp theo từng tháng.
INSERT INTO ht_bo_dem (khoa, gia_tri)
SELECT khoa, COUNT(*) FROM tmp_hh_chuyen GROUP BY khoa
ON DUPLICATE KEY UPDATE gia_tri = ht_bo_dem.gia_tri + VALUES(gia_tri);

DELETE FROM kt_chi_phi_hd WHERE id IN (SELECT cp_id FROM tmp_hh_chuyen);

DROP TEMPORARY TABLE tmp_hh_chuyen;
