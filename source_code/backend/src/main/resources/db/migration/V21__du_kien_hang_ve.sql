-- Mục checklist HĐ mua "Hàng về" đổi tên thành "Dự kiến hàng về" (ngày là ngày dự kiến, nhập được trước khi hàng về).
-- Đổi cả mốc tính hạn trả NCC đang tham chiếu tên cũ.
UPDATE kd_hdm_checklist SET ten = 'Dự kiến hàng về' WHERE ten = 'Hàng về';
UPDATE kd_hdm_dot_tt SET han_moc = 'Dự kiến hàng về' WHERE han_moc = 'Hàng về';
