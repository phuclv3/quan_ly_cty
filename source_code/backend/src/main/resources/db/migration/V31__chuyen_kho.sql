-- Chuyển kho: cặp phiếu Xuất / Nhập liên kết; dòng nhập ghi mã lô gốc ở kho đi
ALTER TABLE kho_phieu
  ADD COLUMN chuyen_id VARCHAR(40) NULL COMMENT 'Chuyển kho: id phiếu đối ứng (Xuất <-> Nhập)';
ALTER TABLE kho_phieu_dong
  ADD COLUMN lo_goc VARCHAR(100) NULL COMMENT 'Chuyển kho: mã lô gốc ở kho đi (lô mới kế thừa đơn giá / ngày nhập)';
