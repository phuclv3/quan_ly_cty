-- ════════════════════════════════════════════════════════════════════
-- Tài khoản quản trị ẩn — dùng riêng để kiểm tra hệ thống.
-- Không nằm trong tệp tự sinh (V2__default_data.sql) để không bị ghi đè khi chạy lại gen-seed-sql.ts.
-- Ẩn khỏi màn Quản lý tài khoản / mọi danh sách chọn người phụ trách cho tài khoản khác
-- (xem TaiKhoan.laAn, Ctx.taiKhoan, Visibility.taiKhoan, Quyen.conQuanTri) — nhưng VẪN ghi đầy đủ
-- vào Nhật ký thao tác (ht_nhat_ky) như tài khoản bình thường, không được ẩn khỏi đó.
-- Gán thẳng vào nhóm Giám đốc (NQ-GD, toàn quyền) — không có cơ chế quyền riêng nào khác.
-- Đổi mật khẩu: UPDATE ht_nhanvien SET mat_khau_bam = '<BCrypt mới>' WHERE id = 'TK-ROOT'.
-- ════════════════════════════════════════════════════════════════════

INSERT INTO ht_nhanvien (id, email, ho_ten, mat_khau_bam, trang_thai, bat_doi_mk, so_lan_sai, khoa_den, lan_dang_nhap_cuoi,
  created_at, updated_at, created_by, updated_by) VALUES
  ('TK-ROOT', 'administrator', 'Quản trị hệ thống',
   '$2a$10$U/rSQ22ryBpoEFmjXR7r1eMwt054EVGxAW/FO0bKfGr6eX6FRWFza',
   'Hoạt động', FALSE, 0, NULL, NULL, NOW(3), NOW(3), NULL, NULL);

INSERT INTO ht_nhanvien_nhom (tai_khoan_id, nhom_id) VALUES ('TK-ROOT', 'NQ-GD');
