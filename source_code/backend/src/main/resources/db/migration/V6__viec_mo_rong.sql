-- Việc được giao mở rộng: nhóm việc, ngày bắt đầu, mức ưu tiên, nguồn (HĐ bán / HĐ mua / nội bộ) và yêu cầu đổi hạn (người nhận đề nghị, người giao duyệt trong 1 giờ).
ALTER TABLE cv_viec
  ADD COLUMN ma            VARCHAR(20)  NULL COMMENT 'Mã việc VIEC-0001' AFTER id,
  ADD COLUMN nhom          VARCHAR(30)  NULL COMMENT 'Nhóm việc: Kinh doanh / Marketing / Mua hàng / Kho / Kế toán / Hành chính / Kỹ thuật',
  ADD COLUMN bat_dau       DATE         NULL COMMENT 'Ngày bắt đầu',
  ADD COLUMN muc_uu_tien   VARCHAR(15)  NULL COMMENT 'Cao / Trung bình / Thấp',
  ADD COLUMN nguon_loai    VARCHAR(10)  NULL COMMENT 'HDB / HDM / NOI_BO',
  ADD COLUMN hdm_id        VARCHAR(40)  NULL COMMENT 'Hợp đồng mua liên quan (nếu có)',
  ADD COLUMN yc_nguoi      VARCHAR(40)  NULL COMMENT 'Người gửi yêu cầu đổi hạn',
  ADD COLUMN yc_luc        DATETIME(3)  NULL COMMENT 'Thời điểm gửi yêu cầu đổi hạn (UTC)',
  ADD COLUMN yc_han_moi    DATE         NULL COMMENT 'Hạn đề nghị',
  ADD COLUMN yc_gio_moi    VARCHAR(5)   NULL COMMENT 'Giờ đề nghị HH:mm',
  ADD COLUMN yc_ly_do      TEXT         NULL COMMENT 'Lý do đề nghị đổi hạn',
  ADD COLUMN yc_trang_thai VARCHAR(20)  NULL COMMENT 'Chờ duyệt / Đã duyệt / Từ chối / Hết hạn',
  ADD INDEX ix_vg_hdm (hdm_id);

CREATE TABLE cv_viec_yc_tep (
  viec_id  VARCHAR(40) NOT NULL COMMENT 'Id việc (cv_viec.id)',
  thu_tu   INT         NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  tep_id   VARCHAR(40) NOT NULL COMMENT 'Id tệp đính kèm (ht_tep_tin.id)',
  PRIMARY KEY (viec_id, thu_tu),
  CONSTRAINT fk_vgyt_v FOREIGN KEY (viec_id) REFERENCES cv_viec (id) ON DELETE CASCADE,
  CONSTRAINT fk_vgyt_tep FOREIGN KEY (tep_id) REFERENCES ht_tep_tin (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Tệp đính kèm yêu cầu đổi hạn việc';
