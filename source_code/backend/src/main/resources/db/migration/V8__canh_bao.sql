-- Cảnh báo rủi ro nhập tay (nghiep_vu Công việc & Cảnh báo — tab Cảnh báo). Nghiệp vụ riêng với việc được giao (cv_viec).
-- Cảnh báo hệ thống tự phát hiện (công nợ, tồn kho, hồ sơ…) không lưu bảng này: tính lại từ dữ liệu mỗi lần xem.
CREATE TABLE cv_canh_bao (
  id            VARCHAR(40)  NOT NULL PRIMARY KEY COMMENT 'Mã định danh cảnh báo (khoá chính)',
  ma            VARCHAR(20)  NOT NULL COMMENT 'Mã cảnh báo CB-0001 (duy nhất)',
  muc           VARCHAR(2)   NOT NULL COMMENT 'Mức: P0 Khẩn cấp / P1 Cao / P2 Cảnh báo sớm',
  noi_dung      TEXT         NOT NULL COMMENT 'Nội dung rủi ro',
  anh_huong     TEXT         NOT NULL COMMENT 'Ảnh hưởng của rủi ro (cam kết, tài chính, giao hàng…)',
  theo_doi      VARCHAR(30)  NULL COMMENT 'Người theo dõi: nhóm phụ trách (Kinh doanh / Mua hàng / Kho / Kế toán…)',
  hdb_id        VARCHAR(40)  NULL COMMENT 'Hợp đồng bán liên quan (nếu có)',
  hdm_id        VARCHAR(40)  NULL COMMENT 'Hợp đồng mua liên quan (nếu có)',
  nguoi_tao     VARCHAR(40)  NOT NULL COMMENT 'Id tài khoản người báo rủi ro (ht_nhanvien.id)',
  tao_luc       DATETIME(3)  NOT NULL COMMENT 'Thời điểm tạo (DATETIME(3), UTC)',
  xu_ly_luc     DATETIME(3)  NULL COMMENT 'Thời điểm xử lý xong (DATETIME(3), UTC); NULL = đang cảnh báo',
  nguoi_xu_ly   VARCHAR(40)  NULL COMMENT 'Id tài khoản đánh dấu đã xử lý',
  ghi_chu_xu_ly VARCHAR(1000) NULL COMMENT 'Ghi chú khi xử lý',
  CONSTRAINT uq_cb_ma UNIQUE (ma),
  CONSTRAINT fk_cb_tao FOREIGN KEY (nguoi_tao) REFERENCES ht_nhanvien (id),
  CONSTRAINT fk_cb_xl FOREIGN KEY (nguoi_xu_ly) REFERENCES ht_nhanvien (id),
  INDEX ix_cb_muc (muc),
  INDEX ix_cb_xu_ly (xu_ly_luc)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Cảnh báo rủi ro nhập tay (P0/P1/P2)';
