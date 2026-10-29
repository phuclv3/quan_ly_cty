-- Phân loại HĐ bán thuộc Phú Tài (giống HĐ mua).
ALTER TABLE kd_hop_dong_ban
  ADD COLUMN thuoc_phu_tai BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'HĐ bán thuộc Phú Tài';
