-- HĐ mua: có tạm ứng + Ngày hiệu lực.
-- Có tạm ứng → Ngày hiệu lực = ngày thanh toán Đợt 1; không tạm ứng → Ngày ký.
ALTER TABLE kd_hop_dong_mua
  ADD COLUMN co_tam_ung    BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE = HĐ mua có tạm ứng (thanh toán Đợt 1 làm HĐ có hiệu lực)' AFTER vat,
  ADD COLUMN ngay_hieu_luc DATE NULL COMMENT 'Ngày hiệu lực: có tạm ứng = ngày trả Đợt 1; không = Ngày ký' AFTER co_tam_ung;
