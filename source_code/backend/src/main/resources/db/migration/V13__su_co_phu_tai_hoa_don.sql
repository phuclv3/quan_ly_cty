-- Sự cố phát sinh khi đang giao hàng (việc giao gắn HĐ bán, cờ su_co) và hoá đơn do Phú Tài xuất cho khách.
ALTER TABLE cv_viec
  ADD COLUMN su_co BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Việc là sự cố phát sinh khi giao hàng (hiện ở Sổ sự cố của HĐ bán)';

ALTER TABLE ht_hoa_don
  ADD COLUMN thuoc_phu_tai BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Hoá đơn do Phú Tài xuất cho khách (không phải hoá đơn Oxy)';
