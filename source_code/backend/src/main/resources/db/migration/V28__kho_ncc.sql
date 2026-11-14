-- Kho NCC: hàng nằm tại kho Nhà cung cấp, nhập / xuất ngay tại đó (tính tồn như kho thường).
-- Gỡ hẳn kho hệ thống "Chuyển thẳng" (KHO-CT): xoá phiếu cũ (dòng phiếu xoá theo ON DELETE CASCADE) rồi xoá kho.
DELETE FROM kho_phieu_dong WHERE phieu_id IN (SELECT id FROM kho_phieu WHERE kho = 'KHO-CT');
DELETE FROM kho_phieu WHERE kho = 'KHO-CT';
DELETE FROM kho_vi_tri WHERE id = 'KHO-CT';
ALTER TABLE kho_vi_tri DROP CHECK ck_kho_loai;
ALTER TABLE kho_vi_tri ADD CONSTRAINT ck_kho_loai CHECK (loai IN ('Kho thường', 'Kho NCC'));
