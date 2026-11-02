-- Phiếu Chi loại Hoa hồng kinh doanh gắn HĐ bán: hoa hồng chỉ tính vào Tiền trả khách khi có phiếu được duyệt.
ALTER TABLE kt_phieu_thu_chi
  ADD COLUMN hdb_id VARCHAR(40) NULL COMMENT 'HĐ bán (kd_hop_dong_ban.id) của phiếu Chi hoa hồng kinh doanh' AFTER ps_dot,
  ADD INDEX ix_ptc_hdb (hdb_id);
