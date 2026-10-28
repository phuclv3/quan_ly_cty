-- Cơ hội bán hàng của khách hàng (mỗi khách có nhiều cơ hội: mã CH-xxxx, hướng bán, giá trị, giai đoạn, lý do thua…).
CREATE TABLE kd_co_hoi_kh (
  id                 VARCHAR(20)  NOT NULL PRIMARY KEY COMMENT 'Mã cơ hội (CH-0001)',
  khach_hang_id      VARCHAR(20)  NOT NULL COMMENT 'Mã khách hàng (kd_khach_hang.id)',
  thu_tu             INT          NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  huong_ban          VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'Hướng bán / mô tả cơ hội',
  nhom_hang          VARCHAR(100) NULL COMMENT 'Nhóm hàng (loại hình sản phẩm)',
  gia_tri            BIGINT       NOT NULL DEFAULT 0 COMMENT 'Giá trị cơ hội (VNĐ, chưa VAT)',
  giai_doan          VARCHAR(20)  NOT NULL COMMENT 'Giai đoạn: Mới, Đã báo giá, Đang đàm phán, Thắng, Thua',
  ngay_tao           DATE         NULL COMMENT 'Ngày tạo cơ hội',
  ngay_bao_gia       DATE         NULL COMMENT 'Ngày báo giá',
  ngay_chot          DATE         NULL COMMENT 'Ngày chốt (Thắng / Thua)',
  ly_do_thua         VARCHAR(200) NULL COMMENT 'Lý do thua (giai đoạn Thua)',
  tuong_tac_tiep     VARCHAR(300) NULL COMMENT 'Hành động tương tác tiếp theo',
  ngay_tuong_tac     DATE         NULL COMMENT 'Ngày tương tác tiếp theo',
  ngay_tai_tiep_can  DATE         NULL COMMENT 'Ngày cần tái tiếp cận (cơ hội Thua)',
  CONSTRAINT fk_ch_kh FOREIGN KEY (khach_hang_id) REFERENCES kd_khach_hang (id) ON DELETE CASCADE,
  INDEX ix_ch_kh (khach_hang_id, thu_tu),
  INDEX ix_ch_gd (giai_doan)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Cơ hội bán hàng của khách hàng';
