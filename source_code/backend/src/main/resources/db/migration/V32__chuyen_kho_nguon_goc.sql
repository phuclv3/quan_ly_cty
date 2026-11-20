-- Chuyển kho ghi phiếu với nguon_goc = 'Chuyển kho' nhưng CHECK ck_pk_ng (V1) chưa cho phép giá trị này → vi phạm ràng buộc, lỗi máy chủ
ALTER TABLE kho_phieu DROP CHECK ck_pk_ng;
ALTER TABLE kho_phieu
  ADD CONSTRAINT ck_pk_ng CHECK (nguon_goc IN ('Tự động HĐ Mua', 'Tự động HĐ Bán', 'Nhập tay – điều chỉnh', 'Chuyển kho'));
