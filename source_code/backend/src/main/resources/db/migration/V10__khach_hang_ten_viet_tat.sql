-- Khách hàng: thêm Tên viết tắt (VD KCN-A) — hiện ở danh sách, form, export / import Excel.
ALTER TABLE kd_khach_hang
  ADD COLUMN ten_viet_tat VARCHAR(50) NULL COMMENT 'Tên viết tắt của khách hàng (tuỳ chọn)' AFTER ten;
