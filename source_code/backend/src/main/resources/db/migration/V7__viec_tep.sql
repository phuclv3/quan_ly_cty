-- Tệp đính kèm khi giao việc / đặt lịch.
CREATE TABLE cv_viec_tep (
  viec_id  VARCHAR(40) NOT NULL COMMENT 'Id việc (cv_viec.id)',
  thu_tu   INT         NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  tep_id   VARCHAR(40) NOT NULL COMMENT 'Id tệp đính kèm (ht_tep_tin.id)',
  PRIMARY KEY (viec_id, thu_tu),
  CONSTRAINT fk_vgt_v FOREIGN KEY (viec_id) REFERENCES cv_viec (id) ON DELETE CASCADE,
  CONSTRAINT fk_vgt_tep FOREIGN KEY (tep_id) REFERENCES ht_tep_tin (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Tệp đính kèm việc được giao';
