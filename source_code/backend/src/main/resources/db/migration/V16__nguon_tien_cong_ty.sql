-- Nguồn tiền: gắn với công ty sở hữu (OXY = CTCP OXYMECIE Việt Nam, KOXY = CTCP Khí OXYMECIE).
ALTER TABLE kt_nguon_tien
  ADD COLUMN cong_ty VARCHAR(10) NOT NULL DEFAULT 'OXY' COMMENT 'Công ty sở hữu nguồn: OXY hoặc KOXY' AFTER ten;

UPDATE kt_nguon_tien SET cong_ty = 'KOXY' WHERE id LIKE '%-KOXY';
