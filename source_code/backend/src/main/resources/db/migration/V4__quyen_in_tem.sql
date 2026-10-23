-- Tách quyền "In tem bình khí" (KHO-10) khỏi "Tồn kho" (KHO-09) để phân quyền riêng ở màn Nhóm quyền.
-- Giữ nguyên hành vi hiện tại: nhóm nào đang có KHO-09 thì được cấp KHO-10 (Xem).
-- Viết idempotent để không lỗi nếu V2 được sinh lại từ gen-seed-sql.ts đã có sẵn KHO-10.

INSERT INTO ht_chuc_nang (ma, module, ten, mo_ta, muc_cho_phep)
SELECT 'KHO-10', 'Kho', 'In tem bình khí', 'Nhập thông tin và xuất PDF tem dán bình khí (không lưu dữ liệu)', 'view' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM ht_chuc_nang WHERE ma = 'KHO-10');

INSERT INTO ht_nhom_chuc_nang (nhom_id, chuc_nang_ma, muc_quyen)
SELECT nhom_id, 'KHO-10', 'view' FROM ht_nhom_chuc_nang k9
WHERE k9.chuc_nang_ma = 'KHO-09'
  AND NOT EXISTS (SELECT 1 FROM ht_nhom_chuc_nang x WHERE x.nhom_id = k9.nhom_id AND x.chuc_nang_ma = 'KHO-10');
