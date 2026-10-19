/**
 * Sinh docs/database/phan-quyen.sql từ src/app/core/perm.ts — để cấu trúc + dữ liệu khởi tạo
 * phân quyền trong database luôn khớp mã chức năng app đang dùng.
 *
 *   npm run gen:sql
 */
import { writeFileSync } from 'node:fs';
import { CHUC_NANG, LEVEL_LABEL, nhomMacDinh } from '../src/app/core/perm';

const q = (s: string) => `N'${s.replace(/'/g, "''")}'`;
const out: string[] = [];
out.push(`-- ════════════════════════════════════════════════════════════════════
-- App Oxy — Phân quyền theo nhóm & mã chức năng (NT-03, NT-04)
-- TỆP SINH TỰ ĐỘNG từ src/app/core/perm.ts — không sửa tay; chạy: npm run gen:sql
-- Cú pháp chuẩn SQL (thử trên SQL Server / PostgreSQL cần chỉnh kiểu NVARCHAR ↔ VARCHAR, BIT ↔ BOOLEAN).
-- ════════════════════════════════════════════════════════════════════

-- Mức quyền: ${Object.entries(LEVEL_LABEL).map(([k, v]) => `${k} = ${v}`).join(' · ')}

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
`);

out.push('-- ── Danh mục chức năng ──');
for (const c of CHUC_NANG) {
  out.push(`INSERT INTO ChucNang VALUES ('${c.ma}', ${q(c.module)}, ${q(c.ten)}, ${q(c.moTa)}, '${c.mucDo.filter((l) => l !== 'none').join(',')}');`);
}
out.push('\n-- ── Nhóm quyền mặc định (sheet "Ma trận quyền", D-25 — chờ xác nhận Q-06) ──');
const now = '2026-01-01T00:00:00';
for (const g of nhomMacDinh(now)) {
  out.push(`INSERT INTO NhomQuyen (MaNhom, MaHienThi, TenNhom, MoTa, ToanQuyen, TrangThai, HeThong, TaoLuc) VALUES ('${g.id}', '${g.ma}', ${q(g.ten)}, ${q(g.moTa)}, ${g.toanQuyen ? 1 : 0}, N'Hoạt động', 1, '${now}');`);
  for (const [ma, l] of Object.entries(g.quyen)) out.push(`INSERT INTO NhomQuyen_ChucNang VALUES ('${g.id}', '${ma}', '${l}');`);
}
writeFileSync(new URL('../docs/database/phan-quyen.sql', import.meta.url), out.join('\n') + '\n');
console.log(`Đã sinh docs/database/phan-quyen.sql — ${CHUC_NANG.length} chức năng, ${nhomMacDinh(now).length} nhóm`);
