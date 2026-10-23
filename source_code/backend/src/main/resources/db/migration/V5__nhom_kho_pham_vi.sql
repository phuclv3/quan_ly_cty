-- Thủ kho chỉ làm việc liên quan Mua hàng – Giao hàng – Kho: bỏ Duyệt xoá (NT-11) và Việc được giao (TD-01) khỏi nhóm Kho mặc định.
-- Giá trị HĐ bán (HDB-07) nhóm Kho vốn không có; từ nay máy chủ cũng không gửi số tiền HĐ bán cho tài khoản thiếu quyền này.
DELETE FROM ht_nhom_chuc_nang WHERE nhom_id = 'NQ-KHO' AND chuc_nang_ma IN ('NT-11', 'TD-01');
UPDATE ht_nhom SET mo_ta = 'Mua hàng – Giao hàng – Kho; không xem giá trị HĐ bán' WHERE id = 'NQ-KHO';
