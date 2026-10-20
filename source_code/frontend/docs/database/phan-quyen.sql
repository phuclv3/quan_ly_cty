-- ════════════════════════════════════════════════════════════════════
-- App Oxy — Phân quyền theo nhóm & mã chức năng (NT-03, NT-04)
-- TỆP SINH TỰ ĐỘNG từ src/app/core/perm.ts — không sửa tay; chạy: npm run gen:sql
-- Cú pháp chuẩn SQL (thử trên SQL Server / PostgreSQL cần chỉnh kiểu NVARCHAR ↔ VARCHAR, BIT ↔ BOOLEAN).
-- ════════════════════════════════════════════════════════════════════

-- Mức quyền: none = — · view = Xem · ownView = Xem của mình · request = Gửi yêu cầu · draft = Lập nháp · own = Sửa của mình · edit = Sửa · approve = Duyệt

CREATE TABLE ChucNang (
  MaChucNang   VARCHAR(20)   PRIMARY KEY,          -- VD HDB-01, KT-07-TD
  Module       NVARCHAR(50)  NOT NULL,
  TenChucNang  NVARCHAR(200) NOT NULL,
  MoTa         NVARCHAR(500),
  MucChoPhep   VARCHAR(200)  NOT NULL              -- danh sách mức hợp lệ, phân tách bằng dấu phẩy
);

CREATE TABLE NhomQuyen (
  MaNhom       VARCHAR(20)   PRIMARY KEY,          -- id nội bộ, VD NQ-KT
  MaHienThi    VARCHAR(30)   NOT NULL UNIQUE,      -- VD KE_TOAN
  TenNhom      NVARCHAR(100) NOT NULL,
  MoTa         NVARCHAR(500),
  ToanQuyen    BIT           NOT NULL DEFAULT 0,   -- 1 = mức cao nhất mọi chức năng
  TrangThai    NVARCHAR(20)  NOT NULL DEFAULT N'Hoạt động',  -- Hoạt động / Ngưng
  HeThong      BIT           NOT NULL DEFAULT 0,   -- nhóm khởi tạo sẵn, không xoá
  TaoLuc       DATETIME      NOT NULL,
  CapNhat      DATETIME,
  NguoiCapNhat VARCHAR(40)
);

CREATE TABLE NhomQuyen_ChucNang (
  MaNhom       VARCHAR(20)   NOT NULL REFERENCES NhomQuyen(MaNhom) ON DELETE CASCADE,
  MaChucNang   VARCHAR(20)   NOT NULL REFERENCES ChucNang(MaChucNang),
  MucQuyen     VARCHAR(10)   NOT NULL,             -- view / ownView / request / draft / own / edit / approve
  PRIMARY KEY (MaNhom, MaChucNang)
);

CREATE TABLE TaiKhoan (
  MaTaiKhoan   VARCHAR(40)   PRIMARY KEY,
  Email        VARCHAR(200)  NOT NULL UNIQUE,
  HoTen        NVARCHAR(100) NOT NULL,
  MatKhauBam   CHAR(64)      NOT NULL,             -- SHA-256(mật khẩu + salt), hex
  Salt         CHAR(32)      NOT NULL,
  TrangThai    NVARCHAR(20)  NOT NULL DEFAULT N'Hoạt động',  -- Hoạt động / Khoá
  BatDoiMK     BIT           NOT NULL DEFAULT 0,
  SoLanSai     INT           NOT NULL DEFAULT 0,
  KhoaDen      DATETIME,
  LanDangNhapCuoi DATETIME
);

CREATE TABLE TaiKhoan_Nhom (
  MaTaiKhoan   VARCHAR(40)   NOT NULL REFERENCES TaiKhoan(MaTaiKhoan) ON DELETE CASCADE,
  MaNhom       VARCHAR(20)   NOT NULL REFERENCES NhomQuyen(MaNhom),
  PRIMARY KEY (MaTaiKhoan, MaNhom)
);

CREATE TABLE PhienDangNhap (
  Token        CHAR(48)      PRIMARY KEY,
  Email        VARCHAR(200)  NOT NULL,
  HetHan       DATETIME      NOT NULL              -- lần hoạt động cuối + 12 giờ
);

-- Quyền thực tế của 1 tài khoản trên 1 chức năng = mức CAO NHẤT trong các nhóm Hoạt động của tài khoản;
-- nhóm ToanQuyen = 1 → mức cao nhất trong MucChoPhep của chức năng.

-- ── Danh mục chức năng ──
INSERT INTO ChucNang VALUES ('NT-03', N'Hệ thống', N'Tài khoản, nhóm quyền & phân quyền', N'Tạo tài khoản, nhóm quyền, gán quyền và gán tài khoản vào nhóm', 'view,edit');
INSERT INTO ChucNang VALUES ('NT-14', N'Hệ thống', N'Tham số cấu hình', N'Bậc thuế TNDN, tỷ lệ Phú Tài, tiền tố số phiếu, số đợt tối đa', 'view,edit');
INSERT INTO ChucNang VALUES ('NT-13', N'Hệ thống', N'Import dữ liệu', N'Chạy thử / chạy thật import từ CSV, Excel cũ', 'edit');
INSERT INTO ChucNang VALUES ('NT-11', N'Hệ thống', N'Duyệt xoá', N'Gửi yêu cầu xoá; Duyệt = duyệt mọi loại đối tượng', 'request,approve');
INSERT INTO ChucNang VALUES ('NT-11-KT', N'Hệ thống', N'Duyệt xoá chứng từ kế toán', N'Chỉ duyệt xoá phiếu thu chi, chi phí HĐ, nguồn tiền, loại chi phí', 'approve');
INSERT INTO ChucNang VALUES ('KT-01', N'Kế toán', N'Nguồn tiền & loại chi phí', N'Danh mục nguồn tiền, số dư; danh mục loại chi phí', 'view,edit');
INSERT INTO ChucNang VALUES ('KT-04', N'Kế toán', N'Sổ quỹ — lập phiếu', N'Lập nháp: chỉ lập đề nghị của mình và gửi duyệt', 'view,draft,edit');
INSERT INTO ChucNang VALUES ('KT-07', N'Kế toán', N'Duyệt phiếu thu chi', N'Duyệt / từ chối phiếu — phiếu đã duyệt mới cộng trừ quỹ', 'approve');
INSERT INTO ChucNang VALUES ('KT-07-TD', N'Kế toán', N'Tự duyệt chứng từ của mình', N'Mặc định người lập không tự duyệt (D-10); bật cho người được ngoại lệ', 'edit');
INSERT INTO ChucNang VALUES ('KT-12', N'Kế toán', N'Chi phí thực hiện HĐ — lập', N'Sửa của mình: chỉ chi phí của HĐ mình phụ trách', 'view,own,edit');
INSERT INTO ChucNang VALUES ('KT-14', N'Kế toán', N'Duyệt chi phí thực hiện HĐ', N'Duyệt / từ chối chi phí thực hiện HĐ', 'approve');
INSERT INTO ChucNang VALUES ('KT-17', N'Kế toán', N'Công nợ phải thu / phải trả', N'Báo cáo công nợ 2 chiều', 'ownView,view');
INSERT INTO ChucNang VALUES ('HDB-13', N'Kinh doanh', N'Danh mục khách hàng', N'', 'view,edit');
INSERT INTO ChucNang VALUES ('HDM-10', N'Kinh doanh', N'Danh mục nhà cung cấp', N'', 'view,edit');
INSERT INTO ChucNang VALUES ('HDB-01', N'Kinh doanh', N'Hợp đồng bán — thông tin, hồ sơ', N'Của mình: chỉ HĐ mình là Sale phụ trách', 'ownView,view,own,edit');
INSERT INTO ChucNang VALUES ('HDB-07', N'Kinh doanh', N'HĐ bán — giá trị & đợt thanh toán', N'Tab 3', 'view,own,edit');
INSERT INTO ChucNang VALUES ('HDB-10', N'Kinh doanh', N'HĐ bán — ghi nhận thực thu', N'Ngày & số tiền khách thực trả (sinh phiếu Thu)', 'edit');
INSERT INTO ChucNang VALUES ('HDB-04', N'Kinh doanh', N'HĐ bán — ghi nhận giao hàng', N'Sinh phiếu xuất kho', 'own,edit');
INSERT INTO ChucNang VALUES ('HDB-03-ML', N'Kinh doanh', N'Mở lại HĐ đã tất toán', N'HĐ quay về Hoàn thành để sửa', 'edit');
INSERT INTO ChucNang VALUES ('HDM-01', N'Kinh doanh', N'Hợp đồng mua — thông tin, hàng hoá, hồ sơ', N'Xem của mình: HĐ mua gắn HĐ bán của mình', 'ownView,view,edit');
INSERT INTO ChucNang VALUES ('HDM-08', N'Kinh doanh', N'HĐ mua — thanh toán NCC', N'Tab 4: đợt trả NCC, xuất hoá đơn, checklist', 'ownView,view,edit');
INSERT INTO ChucNang VALUES ('HDM-03-ML', N'Kinh doanh', N'Mở lại HĐ mua đã tất toán', N'HĐ quay về trạng thái nhận hàng để sửa đợt trả / phiếu chi', 'edit');
INSERT INTO ChucNang VALUES ('HDM-06', N'Kinh doanh', N'HĐ mua — nhập kho', N'Sinh phiếu nhập kho', 'edit');
INSERT INTO ChucNang VALUES ('KHO-01', N'Kho', N'Danh mục kho & loại hàng', N'', 'view,edit');
INSERT INTO ChucNang VALUES ('KHO-06', N'Kho', N'Phiếu nhập / xuất điều chỉnh', N'Phiếu nhập tay — điều chỉnh', 'view,edit');
INSERT INTO ChucNang VALUES ('KHO-09', N'Kho', N'Tồn kho & giá trị theo HĐ', N'', 'view');
INSERT INTO ChucNang VALUES ('PT-01', N'Phú Tài', N'HĐ Phú Tài & quỹ ảo', N'', 'view,edit');
INSERT INTO ChucNang VALUES ('PT-06', N'Phú Tài', N'Sửa tỷ lệ chia lợi nhuận', N'Tỷ lệ thuế / Phú Tài giữ theo từng HĐ', 'edit');
INSERT INTO ChucNang VALUES ('BC-01', N'Báo cáo', N'Báo cáo doanh thu, lợi nhuận, thanh toán', N'Theo nghiep_vu/06_BaoCao', 'ownView,view');

-- ── Nhóm quyền mặc định (sheet "Ma trận quyền", D-25 — chờ xác nhận Q-06) ──
INSERT INTO NhomQuyen (MaNhom, MaHienThi, TenNhom, MoTa, ToanQuyen, TrangThai, HeThong, TaoLuc) VALUES ('NQ-GD', 'GIAM_DOC', N'Giám đốc', N'Toàn quyền mọi chức năng', 1, N'Hoạt động', 1, '2026-01-01T00:00:00');
INSERT INTO NhomQuyen (MaNhom, MaHienThi, TenNhom, MoTa, ToanQuyen, TrangThai, HeThong, TaoLuc) VALUES ('NQ-KT', 'KE_TOAN', N'Kế toán', N'Sổ quỹ, duyệt phiếu, công nợ, Phú Tài', 0, N'Hoạt động', 1, '2026-01-01T00:00:00');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'NT-14', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'NT-11', 'request');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'NT-11-KT', 'approve');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'KT-01', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'KT-04', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'KT-07', 'approve');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'KT-12', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'KT-14', 'approve');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'KT-17', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'HDB-13', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'HDM-10', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'HDB-01', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'HDB-07', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'HDB-10', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'HDM-01', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'HDM-08', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'KHO-01', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'KHO-06', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'KHO-09', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'PT-01', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'PT-06', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KT', 'BC-01', 'view');
INSERT INTO NhomQuyen (MaNhom, MaHienThi, TenNhom, MoTa, ToanQuyen, TrangThai, HeThong, TaoLuc) VALUES ('NQ-SALE', 'SALE', N'Sale', N'Chỉ HĐ bán mình phụ trách; danh mục khách hàng', 0, N'Hoạt động', 1, '2026-01-01T00:00:00');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-SALE', 'NT-11', 'request');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-SALE', 'KT-04', 'draft');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-SALE', 'KT-12', 'own');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-SALE', 'KT-17', 'ownView');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-SALE', 'HDB-13', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-SALE', 'HDB-01', 'own');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-SALE', 'HDB-07', 'own');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-SALE', 'HDB-04', 'own');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-SALE', 'HDM-01', 'ownView');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-SALE', 'HDM-08', 'ownView');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-SALE', 'KHO-01', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-SALE', 'KHO-09', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-SALE', 'BC-01', 'ownView');
INSERT INTO NhomQuyen (MaNhom, MaHienThi, TenNhom, MoTa, ToanQuyen, TrangThai, HeThong, TaoLuc) VALUES ('NQ-ADMIN', 'ADMIN_KD', N'Admin kinh doanh', N'HĐ bán / mua, hồ sơ, giao nhận', 0, N'Hoạt động', 1, '2026-01-01T00:00:00');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'NT-11', 'request');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'KT-04', 'draft');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'KT-12', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'KT-17', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'HDB-13', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'HDM-10', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'HDB-01', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'HDB-07', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'HDB-04', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'HDM-01', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'HDM-08', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'HDM-06', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'KHO-01', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'KHO-09', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'PT-01', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-ADMIN', 'BC-01', 'view');
INSERT INTO NhomQuyen (MaNhom, MaHienThi, TenNhom, MoTa, ToanQuyen, TrangThai, HeThong, TaoLuc) VALUES ('NQ-KHO', 'KHO', N'Kho', N'Tồn kho, nhập / xuất, phiếu điều chỉnh', 0, N'Hoạt động', 1, '2026-01-01T00:00:00');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KHO', 'NT-11', 'request');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KHO', 'HDM-10', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KHO', 'HDB-01', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KHO', 'HDB-04', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KHO', 'HDM-01', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KHO', 'HDM-08', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KHO', 'HDM-06', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KHO', 'KHO-01', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KHO', 'KHO-06', 'edit');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-KHO', 'KHO-09', 'view');
INSERT INTO NhomQuyen (MaNhom, MaHienThi, TenNhom, MoTa, ToanQuyen, TrangThai, HeThong, TaoLuc) VALUES ('NQ-XEM', 'CHI_XEM', N'Chỉ xem', N'Xem mọi số liệu, không có nút hành động', 0, N'Hoạt động', 1, '2026-01-01T00:00:00');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'KT-01', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'KT-04', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'KT-12', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'KT-17', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'HDB-13', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'HDM-10', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'HDB-01', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'HDB-07', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'HDM-01', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'HDM-08', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'KHO-01', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'KHO-06', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'KHO-09', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'PT-01', 'view');
INSERT INTO NhomQuyen_ChucNang VALUES ('NQ-XEM', 'BC-01', 'view');
