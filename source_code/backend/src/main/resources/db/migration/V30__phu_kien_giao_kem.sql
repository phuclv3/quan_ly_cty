-- Phụ kiện giao kèm HĐ bán (không có tên trong HĐ): cờ trên dòng phiếu xuất và dòng yêu cầu xuất kho
ALTER TABLE kho_phieu_dong
  ADD COLUMN phu_kien TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Phụ kiện giao kèm, không có trong HĐ bán';
ALTER TABLE kho_yeu_cau_xuat_dong
  ADD COLUMN phu_kien TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Phụ kiện giao kèm, không có trong HĐ bán';
