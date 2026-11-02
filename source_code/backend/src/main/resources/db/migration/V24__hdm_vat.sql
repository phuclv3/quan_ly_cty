-- HĐ mua: thuế VAT (0 / 8 / 10%). HĐ cũ giữ 0% nên Tổng sau VAT = Tổng trước VAT như trước.
ALTER TABLE kd_hop_dong_mua
  ADD COLUMN vat INT NOT NULL DEFAULT 0 COMMENT 'Thuế VAT của HĐ mua (%): 0, 8 hoặc 10' AFTER ly_do_nhap_tay;
