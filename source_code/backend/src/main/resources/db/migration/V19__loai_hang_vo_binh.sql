-- Mã hàng (vỏ bình): vật liệu, hợp quy, kiểm định, tình trạng + tệp kiểm định vỏ bình. Chỉ thêm cột/bảng, không đổi dữ liệu cũ.
ALTER TABLE kho_loai_hang
  ADD COLUMN vat_lieu   VARCHAR(10) NULL COMMENT 'Vật liệu vỏ: Nhôm, Thép',
  ADD COLUMN hop_quy    VARCHAR(10) NULL COMMENT 'Hợp quy: Có, Không',
  ADD COLUMN kiem_dinh  VARCHAR(10) NULL COMMENT 'Kiểm định: Có, Không',
  ADD COLUMN tinh_trang VARCHAR(10) NULL COMMENT 'Tình trạng: Mới, Cũ',
  ADD CONSTRAINT ck_lh_vat_lieu   CHECK (vat_lieu   IS NULL OR vat_lieu   IN ('Nhôm', 'Thép')),
  ADD CONSTRAINT ck_lh_hop_quy    CHECK (hop_quy    IS NULL OR hop_quy    IN ('Có', 'Không')),
  ADD CONSTRAINT ck_lh_kiem_dinh  CHECK (kiem_dinh  IS NULL OR kiem_dinh  IN ('Có', 'Không')),
  ADD CONSTRAINT ck_lh_tinh_trang CHECK (tinh_trang IS NULL OR tinh_trang IN ('Mới', 'Cũ'));

CREATE TABLE kho_loai_hang_tep_kiem_dinh (
  loai_hang_id  VARCHAR(40) NOT NULL COMMENT 'Mã loại hàng (kho_loai_hang.id)',
  thu_tu        INT         NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  tep_id        VARCHAR(40) NOT NULL COMMENT 'Id tệp kiểm định (ht_tep_tin.id)',
  PRIMARY KEY (loai_hang_id, thu_tu),
  CONSTRAINT fk_lhkd_lh  FOREIGN KEY (loai_hang_id) REFERENCES kho_loai_hang (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_lhkd_tep FOREIGN KEY (tep_id) REFERENCES ht_tep_tin (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Tệp kiểm định vỏ bình của mã hàng';
