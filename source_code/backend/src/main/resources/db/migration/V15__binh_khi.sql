-- Bình khí theo số serial (tab "Bình & tem" của Kho): xuất xứ, ngày SX / HSD, kho và tình trạng in tem.
CREATE TABLE kho_binh_khi (
  id           VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Số serial bình (khoá chính, viết hoa)',
  loai_hang    VARCHAR(40)   NOT NULL COMMENT 'Mã loại hàng (kho_loai_hang.id)',
  xuat_xu      VARCHAR(100)  NOT NULL COMMENT 'Xuất xứ: chỉ bình xuất xứ Việt Nam mới dùng tem nội bộ',
  ngay_sx      DATE          NOT NULL COMMENT 'Ngày sản xuất (DATE)',
  han_sd       DATE          NOT NULL COMMENT 'Hạn sử dụng (DATE)',
  kho          VARCHAR(20)   NOT NULL COMMENT 'Kho đang để bình (kho_vi_tri.id)',
  so_lan_in    INT           NOT NULL DEFAULT 0 COMMENT 'Số lần đã in tem',
  lan_in_cuoi  DATE          NULL COMMENT 'Ngày in tem gần nhất (DATE)',
  nguoi_in     VARCHAR(40)   NULL COMMENT 'Id tài khoản người in tem gần nhất',
  ghi_chu      VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  CONSTRAINT fk_bk_lh FOREIGN KEY (loai_hang) REFERENCES kho_loai_hang (id) ON UPDATE CASCADE,
  CONSTRAINT fk_bk_kho FOREIGN KEY (kho) REFERENCES kho_vi_tri (id),
  INDEX ix_bk_lh (loai_hang),
  INDEX ix_bk_kho (kho)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Bình khí theo số serial và tình trạng in tem';
