-- HĐ bán: thuế TNDN nhập tay. NULL = tính theo công thức (HĐ cũ 22% phẳng / HĐ mới luỹ tiến); có giá trị = thuế suất phẳng (0..1) × chênh lệch.
ALTER TABLE kd_hop_dong_ban
  ADD COLUMN ty_le_thue_tay DECIMAL(7,4) NULL COMMENT 'Thuế suất TNDN nhập tay (0..1); NULL = theo công thức' AFTER ts_muc2;
