-- ════════════════════════════════════════════════════════════════════
-- App Oxy — dữ liệu khởi tạo cần cho hệ thống chạy (mọi môi trường).
-- TỆP SINH TỰ ĐỘNG bởi backend/scripts/gen-seed-sql.ts từ frontend/src/app/core/perm.ts + seed.ts.
-- Kèm 6 tài khoản demo (mật khẩu dùng chung, xem README) — đổi mật khẩu trước khi dùng thật.
-- ════════════════════════════════════════════════════════════════════

INSERT INTO ht_trang_thai (id, phien_ban, cap_nhat) VALUES (1, 0, NULL);

-- Danh mục chức năng phân quyền (mã spec) và mức được phép chọn
INSERT INTO ht_chuc_nang (ma, module, ten, mo_ta, muc_cho_phep) VALUES
  ('NT-03', 'Hệ thống', 'Tài khoản, nhóm quyền & phân quyền', 'Tạo tài khoản, nhóm quyền, gán quyền và gán tài khoản vào nhóm', 'view,edit'),
  ('NT-14', 'Hệ thống', 'Tham số cấu hình', 'Bậc thuế TNDN, tỷ lệ Phú Tài, tiền tố số phiếu, số đợt tối đa', 'view,edit'),
  ('NT-11', 'Hệ thống', 'Duyệt xoá', 'Gửi yêu cầu xoá; Duyệt = duyệt mọi loại đối tượng', 'request,approve'),
  ('NT-11-KT', 'Hệ thống', 'Duyệt xoá chứng từ kế toán', 'Chỉ duyệt xoá phiếu thu chi, chi phí HĐ, nguồn tiền, loại chi phí', 'approve'),
  ('KT-01', 'Kế toán', 'Nguồn tiền & loại chi phí', 'Danh mục nguồn tiền, số dư; danh mục loại chi phí', 'view,edit'),
  ('KT-04', 'Kế toán', 'Sổ quỹ — lập phiếu', 'Lập nháp: chỉ lập đề nghị của mình và gửi duyệt', 'view,draft,edit'),
  ('KT-07', 'Kế toán', 'Duyệt phiếu thu chi', 'Duyệt / từ chối phiếu — phiếu đã duyệt mới cộng trừ quỹ', 'approve'),
  ('KT-07-TD', 'Kế toán', 'Tự duyệt chứng từ của mình', 'Mặc định người lập không tự duyệt (D-10); bật cho người được ngoại lệ', 'edit'),
  ('KT-12', 'Kế toán', 'Chi phí thực hiện HĐ — lập', 'Sửa của mình: chỉ chi phí của HĐ mình phụ trách', 'view,own,edit'),
  ('KT-14', 'Kế toán', 'Duyệt chi phí thực hiện HĐ', 'Duyệt / từ chối chi phí thực hiện HĐ', 'approve'),
  ('KT-17', 'Kế toán', 'Công nợ phải thu / phải trả', 'Báo cáo công nợ 2 chiều', 'ownView,view'),
  ('HDB-13', 'Kinh doanh', 'Khách hàng & theo dõi kinh doanh', 'Sửa của mình: KH mình phụ trách và KH chưa phân bổ', 'view,own,edit'),
  ('HDB-13-PB', 'Kinh doanh', 'Phân bổ data khách hàng', 'Giao / đổi Sale phụ trách khách hàng', 'edit'),
  ('HDM-10', 'Kinh doanh', 'Danh mục nhà cung cấp', '', 'view,edit'),
  ('HDB-01', 'Kinh doanh', 'Hợp đồng bán — thông tin, hồ sơ', 'Của mình: chỉ HĐ mình là Sale phụ trách', 'ownView,view,own,edit'),
  ('HDB-07', 'Kinh doanh', 'HĐ bán — giá trị & đợt thanh toán', 'Tab 3', 'view,own,edit'),
  ('HDB-10', 'Kinh doanh', 'HĐ bán — ghi nhận thực thu', 'Ngày & số tiền khách thực trả (sinh phiếu Thu)', 'edit'),
  ('HDB-04', 'Kinh doanh', 'HĐ bán — ghi nhận giao hàng', 'Sinh phiếu xuất kho', 'own,edit'),
  ('HDB-03-ML', 'Kinh doanh', 'Mở lại HĐ đã tất toán', 'HĐ quay về Hoàn thành để sửa', 'edit'),
  ('HDM-01', 'Kinh doanh', 'Hợp đồng mua — thông tin, hàng hoá, hồ sơ', 'Xem của mình: HĐ mua gắn HĐ bán của mình', 'ownView,view,edit'),
  ('HDM-08', 'Kinh doanh', 'HĐ mua — thanh toán NCC', 'Tab 4: đợt trả NCC, xuất hoá đơn, checklist', 'ownView,view,edit'),
  ('HDM-03-ML', 'Kinh doanh', 'Mở lại HĐ mua đã tất toán', 'HĐ quay về trạng thái nhận hàng để sửa đợt trả / phiếu chi', 'edit'),
  ('HDM-06', 'Kinh doanh', 'HĐ mua — nhập kho', 'Sinh phiếu nhập kho', 'edit'),
  ('KHO-01', 'Kho', 'Danh mục kho & loại hàng', '', 'view,edit'),
  ('KHO-06', 'Kho', 'Phiếu nhập / xuất điều chỉnh', 'Phiếu nhập tay — điều chỉnh', 'view,edit'),
  ('KHO-09', 'Kho', 'Tồn kho & giá trị theo HĐ', '', 'view'),
  ('PT-01', 'Phú Tài', 'HĐ Phú Tài & quỹ ảo', '', 'view,edit'),
  ('PT-06', 'Phú Tài', 'Sửa tỷ lệ chia lợi nhuận', 'Tỷ lệ thuế / Phú Tài giữ theo từng HĐ', 'edit'),
  ('TD-01', 'Việc được giao', 'Giao việc / Đặt lịch', 'Sửa của mình: chỉ việc mình giao hoặc được giao; Sửa: thấy mọi việc', 'own,edit'),
  ('BC-01', 'Báo cáo', 'Báo cáo doanh thu, lợi nhuận, thanh toán', 'Theo nghiep_vu/06_BaoCao', 'ownView,view');

-- Nhóm quyền mặc định (sheet "Ma trận quyền", D-25)
INSERT INTO ht_nhom (id, ma, ten, mo_ta, toan_quyen, trang_thai, he_thong, tao_luc) VALUES
  ('NQ-GD', 'GIAM_DOC', 'Giám đốc', 'Toàn quyền mọi chức năng', TRUE, 'Hoạt động', TRUE, '2026-10-23 05:26:12.889'),
  ('NQ-KT', 'KE_TOAN', 'Kế toán', 'Sổ quỹ, duyệt phiếu, công nợ, Phú Tài', FALSE, 'Hoạt động', TRUE, '2026-10-23 05:26:12.889'),
  ('NQ-SALE', 'SALE', 'Sale', 'Chỉ HĐ bán mình phụ trách; danh mục khách hàng', FALSE, 'Hoạt động', TRUE, '2026-10-23 05:26:12.889'),
  ('NQ-ADMIN', 'ADMIN_KD', 'Admin kinh doanh', 'HĐ bán / mua, hồ sơ, giao nhận', FALSE, 'Hoạt động', TRUE, '2026-10-23 05:26:12.889'),
  ('NQ-KHO', 'KHO', 'Kho', 'Tồn kho, nhập / xuất, phiếu điều chỉnh', FALSE, 'Hoạt động', TRUE, '2026-10-23 05:26:12.889'),
  ('NQ-XEM', 'CHI_XEM', 'Chỉ xem', 'Xem mọi số liệu, không có nút hành động', FALSE, 'Hoạt động', TRUE, '2026-10-23 05:26:12.889');

INSERT INTO ht_nhom_chuc_nang (nhom_id, chuc_nang_ma, muc_quyen) VALUES
  ('NQ-KT', 'NT-14', 'view'),
  ('NQ-KT', 'NT-11', 'request'),
  ('NQ-KT', 'NT-11-KT', 'approve'),
  ('NQ-KT', 'KT-01', 'edit'),
  ('NQ-KT', 'KT-04', 'edit'),
  ('NQ-KT', 'KT-07', 'approve'),
  ('NQ-KT', 'KT-12', 'edit'),
  ('NQ-KT', 'KT-14', 'approve'),
  ('NQ-KT', 'KT-17', 'view'),
  ('NQ-KT', 'HDB-13', 'view'),
  ('NQ-KT', 'HDM-10', 'view'),
  ('NQ-KT', 'HDB-01', 'view'),
  ('NQ-KT', 'HDB-07', 'view'),
  ('NQ-KT', 'HDB-10', 'edit'),
  ('NQ-KT', 'HDM-01', 'view'),
  ('NQ-KT', 'HDM-08', 'edit'),
  ('NQ-KT', 'KHO-01', 'view'),
  ('NQ-KT', 'KHO-06', 'view'),
  ('NQ-KT', 'KHO-09', 'view'),
  ('NQ-KT', 'PT-01', 'edit'),
  ('NQ-KT', 'PT-06', 'edit'),
  ('NQ-KT', 'BC-01', 'view'),
  ('NQ-KT', 'TD-01', 'edit'),
  ('NQ-SALE', 'NT-11', 'request'),
  ('NQ-SALE', 'KT-04', 'draft'),
  ('NQ-SALE', 'KT-12', 'own'),
  ('NQ-SALE', 'KT-17', 'ownView'),
  ('NQ-SALE', 'HDB-13', 'own'),
  ('NQ-SALE', 'HDB-01', 'own'),
  ('NQ-SALE', 'HDB-07', 'own'),
  ('NQ-SALE', 'HDB-04', 'own'),
  ('NQ-SALE', 'HDM-01', 'ownView'),
  ('NQ-SALE', 'HDM-08', 'ownView'),
  ('NQ-SALE', 'KHO-01', 'view'),
  ('NQ-SALE', 'KHO-09', 'view'),
  ('NQ-SALE', 'BC-01', 'ownView'),
  ('NQ-SALE', 'TD-01', 'own'),
  ('NQ-ADMIN', 'NT-11', 'request'),
  ('NQ-ADMIN', 'KT-04', 'draft'),
  ('NQ-ADMIN', 'KT-12', 'edit'),
  ('NQ-ADMIN', 'KT-17', 'view'),
  ('NQ-ADMIN', 'HDB-13', 'edit'),
  ('NQ-ADMIN', 'HDB-13-PB', 'edit'),
  ('NQ-ADMIN', 'HDM-10', 'edit'),
  ('NQ-ADMIN', 'HDB-01', 'edit'),
  ('NQ-ADMIN', 'HDB-07', 'edit'),
  ('NQ-ADMIN', 'HDB-04', 'edit'),
  ('NQ-ADMIN', 'HDM-01', 'edit'),
  ('NQ-ADMIN', 'HDM-08', 'edit'),
  ('NQ-ADMIN', 'HDM-06', 'edit'),
  ('NQ-ADMIN', 'KHO-01', 'view'),
  ('NQ-ADMIN', 'KHO-09', 'view'),
  ('NQ-ADMIN', 'PT-01', 'view'),
  ('NQ-ADMIN', 'BC-01', 'view'),
  ('NQ-ADMIN', 'TD-01', 'edit'),
  ('NQ-KHO', 'NT-11', 'request'),
  ('NQ-KHO', 'HDM-10', 'view'),
  ('NQ-KHO', 'HDB-01', 'view'),
  ('NQ-KHO', 'HDB-04', 'edit'),
  ('NQ-KHO', 'HDM-01', 'view'),
  ('NQ-KHO', 'HDM-08', 'view'),
  ('NQ-KHO', 'HDM-06', 'edit'),
  ('NQ-KHO', 'KHO-01', 'edit'),
  ('NQ-KHO', 'KHO-06', 'edit'),
  ('NQ-KHO', 'KHO-09', 'view'),
  ('NQ-KHO', 'TD-01', 'edit'),
  ('NQ-XEM', 'KT-01', 'view'),
  ('NQ-XEM', 'KT-04', 'view'),
  ('NQ-XEM', 'KT-12', 'view'),
  ('NQ-XEM', 'KT-17', 'view'),
  ('NQ-XEM', 'HDB-13', 'view'),
  ('NQ-XEM', 'HDM-10', 'view'),
  ('NQ-XEM', 'HDB-01', 'view'),
  ('NQ-XEM', 'HDB-07', 'view'),
  ('NQ-XEM', 'HDM-01', 'view'),
  ('NQ-XEM', 'HDM-08', 'view'),
  ('NQ-XEM', 'KHO-01', 'view'),
  ('NQ-XEM', 'KHO-06', 'view'),
  ('NQ-XEM', 'KHO-09', 'view'),
  ('NQ-XEM', 'PT-01', 'view'),
  ('NQ-XEM', 'BC-01', 'view'),
  ('NQ-XEM', 'TD-01', 'own');

-- Tham số cấu hình mặc định (NT-14)
INSERT INTO ht_cau_hinh (khoa, gia_tri) VALUES
  ('TNDN_NGUONG', '0.2'),
  ('TNDN_MUC1', '0.25'),
  ('TNDN_MUC2', '0.5'),
  ('PT_THUE', '0.2'),
  ('PT_GIU', '0.1'),
  ('PT_CACH_CHIA', 'Nhân'),
  ('SO_DOT_TOI_DA', '3'),
  ('TIEN_TO_TC', 'TC'),
  ('TIEN_TO_CP', 'CP'),
  ('TIEN_TO_NK', 'NK'),
  ('TIEN_TO_XK', 'XK');

-- Tài khoản demo — 1 mỗi nhóm quyền mặc định (mật khẩu dùng chung, xem README backend)
INSERT INTO ht_nhanvien (id, email, ho_ten, mat_khau_bam, trang_thai, bat_doi_mk, so_lan_sai, created_at, updated_at) VALUES
  ('TKmvkj1l7i1v68feo1v7pw6d', 'giamdoc@oxymecie.vn', 'Giám đốc (demo)', '$2a$10$KihdWR8o9Z4KRZzpSiH93.N3YgsRgzlNHsqSb9mWMm7rf8jKRkvOm', 'Hoạt động', FALSE, 0, '2026-10-23 05:26:12.889', '2026-10-23 05:26:12.889'),
  ('TKmvkj1l7j5ldagv1vxnlkt', 'ketoan@oxymecie.vn', 'Kế toán (demo)', '$2a$10$KihdWR8o9Z4KRZzpSiH93.N3YgsRgzlNHsqSb9mWMm7rf8jKRkvOm', 'Hoạt động', FALSE, 0, '2026-10-23 05:26:12.889', '2026-10-23 05:26:12.889'),
  ('TKmvkj1l7j1paxxz81f0385h', 'sale@oxymecie.vn', 'Sale (demo)', '$2a$10$KihdWR8o9Z4KRZzpSiH93.N3YgsRgzlNHsqSb9mWMm7rf8jKRkvOm', 'Hoạt động', FALSE, 0, '2026-10-23 05:26:12.889', '2026-10-23 05:26:12.889'),
  ('TKmvkj1l7j1okhp1s1ghrw17', 'admin@oxymecie.vn', 'Admin kinh doanh (demo)', '$2a$10$KihdWR8o9Z4KRZzpSiH93.N3YgsRgzlNHsqSb9mWMm7rf8jKRkvOm', 'Hoạt động', FALSE, 0, '2026-10-23 05:26:12.889', '2026-10-23 05:26:12.889'),
  ('TKmvkj1l7jdyy1h9jpw0hm', 'kho@oxymecie.vn', 'Thủ kho (demo)', '$2a$10$KihdWR8o9Z4KRZzpSiH93.N3YgsRgzlNHsqSb9mWMm7rf8jKRkvOm', 'Hoạt động', FALSE, 0, '2026-10-23 05:26:12.889', '2026-10-23 05:26:12.889'),
  ('TKmvkj1l7j1lvnmcc175weth', 'chixem@oxymecie.vn', 'Chỉ xem (demo)', '$2a$10$KihdWR8o9Z4KRZzpSiH93.N3YgsRgzlNHsqSb9mWMm7rf8jKRkvOm', 'Hoạt động', FALSE, 0, '2026-10-23 05:26:12.889', '2026-10-23 05:26:12.889');

INSERT INTO ht_nhanvien_nhom (tai_khoan_id, nhom_id) VALUES
  ('TKmvkj1l7i1v68feo1v7pw6d', 'NQ-GD'),
  ('TKmvkj1l7j5ldagv1vxnlkt', 'NQ-KT'),
  ('TKmvkj1l7j1paxxz81f0385h', 'NQ-SALE'),
  ('TKmvkj1l7j1okhp1s1ghrw17', 'NQ-ADMIN'),
  ('TKmvkj1l7jdyy1h9jpw0hm', 'NQ-KHO'),
  ('TKmvkj1l7j1lvnmcc175weth', 'NQ-XEM');

-- Vị trí kho hệ thống "Chuyển thẳng — không qua kho" (KHO-01, không sửa / xoá)
INSERT INTO kho_vi_tri (id, ten, loai, dang_dung) VALUES
  ('KHO-CT', 'Chuyển thẳng — không qua kho', 'Chuyển thẳng', TRUE);

-- Loại chi phí (KT-03): CPTH-HH (hoa hồng) và CPTH-VC (vận chuyển) có quy tắc riêng trong mã
INSERT INTO kt_loai_chi_phi (id, ten, nhom, dang_dung) VALUES
  ('VH-VP', 'Văn phòng', 'Vận hành', TRUE),
  ('VH-MKT', 'Marketing', 'Vận hành', TRUE),
  ('VH-LUONG', 'Lương/Thưởng', 'Vận hành', TRUE),
  ('VH-CTP', 'Công tác phí', 'Vận hành', TRUE),
  ('VH-THUE', 'Thuế / phí', 'Vận hành', TRUE),
  ('VH-KHAC', 'Chi vận hành khác', 'Vận hành', TRUE),
  ('CPTH-VC', 'Vận chuyển', 'Thực hiện HĐ', TRUE),
  ('CPTH-KD', 'Kiểm định', 'Thực hiện HĐ', TRUE),
  ('CPTH-HH', 'Hoa hồng kinh doanh', 'Thực hiện HĐ', TRUE),
  ('CPTH-KHAC', 'Phát sinh khác', 'Thực hiện HĐ', TRUE);
