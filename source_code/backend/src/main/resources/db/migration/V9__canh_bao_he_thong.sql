-- Cảnh báo hệ thống tự phát hiện: chỉ lưu "vết xử lý" khi có người thao tác (đã xử lý / giao người phụ trách).
-- Bản ghi gắn với cảnh báo bằng khoa_he_thong (khoá ổn định, VD tc-thu-<id HĐ bán>) — không ghi gì khi chỉ xem trang.
ALTER TABLE cv_canh_bao
  ADD COLUMN nguon            VARCHAR(10) NOT NULL DEFAULT 'TAY' COMMENT 'TAY = nhập tay (Báo rủi ro) / HE_THONG = vết xử lý của cảnh báo hệ thống tự phát hiện',
  ADD COLUMN khoa_he_thong    VARCHAR(80) NULL COMMENT 'Khoá cảnh báo hệ thống (duy nhất); NULL với cảnh báo nhập tay',
  ADD COLUMN nguoi_phu_trach  VARCHAR(40) NULL COMMENT 'Id tài khoản được giao xử lý (ht_nhanvien.id)',
  ADD CONSTRAINT uq_cb_khoa UNIQUE (khoa_he_thong),
  ADD CONSTRAINT fk_cb_pt FOREIGN KEY (nguoi_phu_trach) REFERENCES ht_nhanvien (id);

CREATE TABLE cv_canh_bao_lich_su (
  canh_bao_id VARCHAR(40)   NOT NULL COMMENT 'Id cảnh báo (cv_canh_bao.id)',
  thu_tu      INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  luc         DATETIME(3)   NOT NULL COMMENT 'Thời điểm (DATETIME(3), UTC)',
  nguoi       VARCHAR(40)   NOT NULL COMMENT 'Id tài khoản người thao tác',
  hanh_dong   VARCHAR(40)   NOT NULL COMMENT 'Báo rủi ro / Giao người phụ trách / Đã xử lý / Mở lại',
  ghi_chu     VARCHAR(1000) NULL COMMENT 'Ghi chú thao tác',
  PRIMARY KEY (canh_bao_id, thu_tu),
  CONSTRAINT fk_cbls_cb FOREIGN KEY (canh_bao_id) REFERENCES cv_canh_bao (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Lịch sử thao tác trên cảnh báo';
