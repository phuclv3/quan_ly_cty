-- Chi phí thực hiện HĐ: chi từ Quỹ Phú Tài (không phải một dòng kt_nguon_tien nên không đặt nguon_tien).
-- nguon_tien = NULL và quy_phu_tai = TRUE ↔ domain Nguồn tiền = 'QUY_PHU_TAI'.
ALTER TABLE kt_chi_phi_hd
  ADD COLUMN quy_phu_tai BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE = chi từ Quỹ Phú Tài (HĐ bán thuộc Phú Tài), không trừ nguồn tiền Oxy' AFTER nguon_tien;
