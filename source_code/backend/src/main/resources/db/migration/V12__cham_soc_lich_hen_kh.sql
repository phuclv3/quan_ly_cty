-- Lịch sử chăm sóc: kênh + kết quả; lịch hẹn (cv_viec) gắn với khách hàng.
ALTER TABLE kd_cham_soc_kh
  ADD COLUMN kenh    VARCHAR(30)   NULL COMMENT 'Kênh tương tác: Gọi điện, Gặp trực tiếp, Họp online, Email' AFTER co_hoi,
  ADD COLUMN ket_qua VARCHAR(1000) NULL COMMENT 'Kết quả buổi tương tác (người dùng tự nhập)' AFTER kenh;

ALTER TABLE cv_viec
  ADD COLUMN kh_id      VARCHAR(20) NULL COMMENT 'Khách hàng được chăm sóc (kd_khach_hang.id) — lịch hẹn chăm sóc khách',
  ADD COLUMN kenh       VARCHAR(30) NULL COMMENT 'Kênh hẹn: Gọi điện, Gặp trực tiếp, Họp online, Email',
  ADD COLUMN nhac_truoc INT         NULL COMMENT 'Nhắc trước (ngày); 0 hoặc NULL = không nhắc',
  ADD CONSTRAINT fk_vg_kh FOREIGN KEY (kh_id) REFERENCES kd_khach_hang (id) ON DELETE SET NULL,
  ADD INDEX ix_vg_kh (kh_id);
