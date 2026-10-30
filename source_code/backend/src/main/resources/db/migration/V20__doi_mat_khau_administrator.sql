-- Đặt lại mật khẩu tài khoản quản trị ẩn (TK-ROOT / administrator) — BCrypt, không bắt đổi mật khẩu ở lần đăng nhập tới.
-- Không sửa V3 vì đã áp trên database đang chạy (Flyway kiểm tra checksum).
UPDATE ht_nhanvien
   SET mat_khau_bam = '$2a$10$W9ZPtyt6ulk6W2l.4yDOQ.Hv5uaZVkY5Fb84c1szl6ScdRYG8YsIy',
       bat_doi_mk = FALSE, so_lan_sai = 0, khoa_den = NULL, updated_at = NOW(3)
 WHERE id = 'TK-ROOT';
