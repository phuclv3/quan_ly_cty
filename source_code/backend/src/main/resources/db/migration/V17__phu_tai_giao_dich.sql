-- Phú Tài theo HĐ bán / HĐ mua có tích "Thuộc Phú Tài": tỷ lệ OXY được hưởng trên mỗi HĐ bán + sổ quỹ Phú Tài dùng thêm cho dòng nhập tay.
ALTER TABLE kd_hop_dong_ban
  ADD COLUMN pt_ty_le_oxy DECIMAL(5, 2) NULL COMMENT 'HĐ Phú Tài: tỷ lệ % LN trước thuế OXY được hưởng (trống = 70)';

ALTER TABLE pt_dong_tien
  ADD COLUMN hdb_id VARCHAR(60) NULL COMMENT 'HĐ bán Phú Tài liên quan (dòng nhập tay ở Sổ quỹ Phú Tài)',
  ADD COLUMN loai   VARCHAR(20) NULL COMMENT 'Loại dòng nhập tay: So du dau ky / Chuyen OXY',
  ADD COLUMN tep    VARCHAR(200) NULL COMMENT 'Tên chứng từ đính kèm (UNC, sao kê)';
