-- ════════════════════════════════════════════════════════════════════════════
-- App Oxy — Schema khởi tạo (MySQL 8.0.16+ — cần CHECK constraint)
--
-- Quy ước:
--  * Tên bảng / cột snake_case; giá trị liệt kê (trạng thái, loại…) lưu đúng nhãn tiếng Việt
--    mà frontend dùng (src/app/core/models.ts) và được chặn bằng CHECK.
--  * Tiền VNĐ: BIGINT (số nguyên). Số lượng, tỷ lệ, tỷ giá, đơn giá ngoại tệ: DOUBLE
--    (cùng kiểu số IEEE-754 với frontend để công thức tính ra cùng kết quả).
--  * Ngày nghiệp vụ: DATE. Mốc thời gian: DATETIME(3) theo UTC.
--  * Bảng con có thứ tự (đợt thanh toán, dòng phiếu…) có cột thu_tu giữ đúng thứ tự hiển thị.
--  * "Tham chiếu mềm" (không FK) chỉ dùng khi dữ liệu thực tế có nhãn không phải khoá
--    (VD người lập "Import") hoặc tham chiếu đa hình (hd_id của phiếu kho) — xem docs/database-design.md.
-- ════════════════════════════════════════════════════════════════════════════

-- ── HỆ THỐNG ───────────────────────────────────────────────────────────────

CREATE TABLE app_state (
  id          TINYINT     NOT NULL PRIMARY KEY,
  phien_ban   BIGINT      NOT NULL DEFAULT 0 COMMENT 'Tăng sau mỗi lệnh ghi — client so để biết dữ liệu đã đổi',
  cap_nhat    DATETIME(3) NULL,
  CONSTRAINT ck_app_state_id CHECK (id = 1)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE chuc_nang (
  ma            VARCHAR(20)  NOT NULL PRIMARY KEY COMMENT 'Mã chức năng spec, VD HDB-01, KT-07-TD',
  module        VARCHAR(50)  NOT NULL,
  ten           VARCHAR(200) NOT NULL,
  mo_ta         VARCHAR(500) NOT NULL DEFAULT '',
  muc_cho_phep  VARCHAR(100) NOT NULL COMMENT 'Các mức hợp lệ, phân tách dấu phẩy'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE nhom_quyen (
  id              VARCHAR(40)  NOT NULL PRIMARY KEY,
  ma              VARCHAR(30)  NOT NULL,
  ten             VARCHAR(100) NOT NULL,
  mo_ta           VARCHAR(500) NOT NULL DEFAULT '',
  toan_quyen      BOOLEAN      NOT NULL DEFAULT FALSE,
  trang_thai      VARCHAR(20)  NOT NULL DEFAULT 'Hoạt động',
  he_thong        BOOLEAN      NOT NULL DEFAULT FALSE,
  tao_luc         DATETIME(3)  NOT NULL,
  cap_nhat        DATETIME(3)  NULL,
  nguoi_cap_nhat  VARCHAR(40)  NULL,
  CONSTRAINT uq_nhom_quyen_ma UNIQUE (ma),
  CONSTRAINT ck_nhom_quyen_tt CHECK (trang_thai IN ('Hoạt động', 'Ngưng'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE nhom_quyen_chuc_nang (
  nhom_id       VARCHAR(40) NOT NULL,
  chuc_nang_ma  VARCHAR(20) NOT NULL,
  muc_quyen     VARCHAR(10) NOT NULL,
  PRIMARY KEY (nhom_id, chuc_nang_ma),
  CONSTRAINT fk_nqcn_nhom FOREIGN KEY (nhom_id) REFERENCES nhom_quyen (id) ON DELETE CASCADE,
  CONSTRAINT fk_nqcn_cn FOREIGN KEY (chuc_nang_ma) REFERENCES chuc_nang (ma),
  CONSTRAINT ck_nqcn_muc CHECK (muc_quyen IN ('view', 'ownView', 'request', 'draft', 'own', 'edit', 'approve'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE tai_khoan (
  id                  VARCHAR(40)  NOT NULL PRIMARY KEY,
  email               VARCHAR(200) NOT NULL,
  ho_ten              VARCHAR(100) NOT NULL,
  mat_khau_bam        VARCHAR(100) NOT NULL COMMENT 'BCrypt',
  trang_thai          VARCHAR(20)  NOT NULL DEFAULT 'Hoạt động',
  bat_doi_mk          BOOLEAN      NOT NULL DEFAULT FALSE,
  so_lan_sai          INT          NOT NULL DEFAULT 0,
  khoa_den            DATETIME(3)  NULL COMMENT 'Khoá đăng nhập tạm (sai 5 lần → 15 phút)',
  lan_dang_nhap_cuoi  DATETIME(3)  NULL,
  created_at          DATETIME(3)  NOT NULL,
  updated_at          DATETIME(3)  NOT NULL,
  created_by          VARCHAR(40)  NULL,
  updated_by          VARCHAR(40)  NULL,
  CONSTRAINT uq_tai_khoan_email UNIQUE (email),
  CONSTRAINT ck_tai_khoan_tt CHECK (trang_thai IN ('Hoạt động', 'Khoá'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE tai_khoan_nhom (
  tai_khoan_id  VARCHAR(40) NOT NULL,
  nhom_id       VARCHAR(40) NOT NULL,
  PRIMARY KEY (tai_khoan_id, nhom_id),
  CONSTRAINT fk_tkn_tk FOREIGN KEY (tai_khoan_id) REFERENCES tai_khoan (id) ON DELETE CASCADE,
  CONSTRAINT fk_tkn_nhom FOREIGN KEY (nhom_id) REFERENCES nhom_quyen (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE phien_dang_nhap (
  token_hash    CHAR(64)     NOT NULL PRIMARY KEY COMMENT 'SHA-256 của token — không lưu token gốc',
  tai_khoan_id  VARCHAR(40)  NOT NULL,
  het_han       DATETIME(3)  NOT NULL COMMENT 'Lần hoạt động cuối + 12 giờ',
  tao_luc       DATETIME(3)  NOT NULL,
  dia_chi_ip    VARCHAR(45)  NULL,
  user_agent    VARCHAR(255) NULL,
  CONSTRAINT fk_phien_tk FOREIGN KEY (tai_khoan_id) REFERENCES tai_khoan (id) ON DELETE CASCADE,
  INDEX ix_phien_tk (tai_khoan_id),
  INDEX ix_phien_het_han (het_han)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE cau_hinh (
  khoa        VARCHAR(40)  NOT NULL PRIMARY KEY,
  gia_tri     VARCHAR(200) NOT NULL,
  updated_at  DATETIME(3)  NULL,
  updated_by  VARCHAR(40)  NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE cau_hinh_log (
  id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  khoa         VARCHAR(40)  NOT NULL,
  gia_tri_cu   VARCHAR(200) NOT NULL,
  gia_tri_moi  VARCHAR(200) NOT NULL,
  nguoi_sua    VARCHAR(40)  NOT NULL,
  ngay_sua     DATETIME(3)  NOT NULL,
  INDEX ix_chl_ngay (ngay_sua)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE bo_dem (
  khoa     VARCHAR(20) NOT NULL PRIMARY KEY COMMENT 'Tiền tố + 2 số năm, VD TC26',
  gia_tri  INT         NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE yeu_cau_xoa (
  id             VARCHAR(40)   NOT NULL PRIMARY KEY,
  loai           VARCHAR(30)   NOT NULL,
  ma_doi_tuong   VARCHAR(100)  NOT NULL,
  mo_ta          VARCHAR(500)  NOT NULL DEFAULT '',
  ly_do          VARCHAR(1000) NOT NULL,
  nguoi_gui      VARCHAR(40)   NOT NULL,
  ngay_gui       DATETIME(3)   NOT NULL,
  trang_thai     VARCHAR(20)   NOT NULL,
  nguoi_duyet    VARCHAR(40)   NULL,
  ngay_duyet     DATETIME(3)   NULL,
  ly_do_tu_choi  VARCHAR(1000) NULL,
  CONSTRAINT ck_ycx_loai CHECK (loai IN ('PhieuThuChi', 'ChiPhiThucHienHD', 'HopDongBan', 'HopDongMua', 'PhieuKho', 'HopDongPhuTai',
                                         'HoaDon', 'HoSo', 'DongTienPhuTai', 'DM_KhachHang', 'DM_NCC', 'DM_NguonTien', 'DM_LoaiChiPhi',
                                         'DM_Kho', 'DM_LoaiHang')),
  CONSTRAINT ck_ycx_tt CHECK (trang_thai IN ('Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Đã rút')),
  INDEX ix_ycx_doi_tuong (loai, ma_doi_tuong, trang_thai),
  INDEX ix_ycx_tt (trang_thai, ngay_gui)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE audit_log (
  id            BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  luc           DATETIME(3)   NOT NULL,
  tai_khoan_id  VARCHAR(40)   NULL,
  hanh_dong     VARCHAR(80)   NOT NULL,
  doi_tuong     VARCHAR(40)   NULL,
  ma_doi_tuong  VARCHAR(100)  NULL,
  mo_ta         VARCHAR(1000) NULL,
  du_lieu       JSON          NULL COMMENT 'Ảnh bản ghi bị xoá / tham số lệnh (không chứa mật khẩu, token)',
  dia_chi_ip    VARCHAR(45)   NULL,
  INDEX ix_audit_luc (luc),
  INDEX ix_audit_doi_tuong (doi_tuong, ma_doi_tuong),
  INDEX ix_audit_tk (tai_khoan_id, luc)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── TỆP & HỒ SƠ (NT-12) ────────────────────────────────────────────────────

CREATE TABLE tep_tin (
  id            VARCHAR(40)  NOT NULL PRIMARY KEY,
  ten           VARCHAR(255) NOT NULL,
  mime          VARCHAR(100) NOT NULL DEFAULT '',
  kich_thuoc    BIGINT       NOT NULL,
  thumb         MEDIUMTEXT   NULL COMMENT 'Ảnh thu nhỏ data URL ≤160px',
  duong_dan     VARCHAR(500) NOT NULL COMMENT 'Khoá lưu trên kho tệp (app.storage.dir)',
  ngay_upload   DATETIME(3)  NOT NULL,
  nguoi_upload  VARCHAR(40)  NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE ho_so (
  id       VARCHAR(40)   NOT NULL PRIMARY KEY,
  chu      VARCHAR(4)    NOT NULL COMMENT 'HDB / HDM / HDPT',
  chu_id   VARCHAR(40)   NOT NULL COMMENT 'Tham chiếu đa hình tới hợp đồng',
  loai     VARCHAR(20)   NOT NULL,
  da_luu   BOOLEAN       NOT NULL DEFAULT FALSE,
  da_scan  BOOLEAN       NOT NULL DEFAULT FALSE,
  ghi_chu  VARCHAR(1000) NULL,
  CONSTRAINT uq_ho_so UNIQUE (chu, chu_id, loai),
  CONSTRAINT ck_ho_so_chu CHECK (chu IN ('HDB', 'HDM', 'HDPT')),
  CONSTRAINT ck_ho_so_loai CHECK (loai IN ('Hợp đồng', 'BBGH/BBNT', 'Hoá đơn', 'Scan khác'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE ho_so_tep (
  ho_so_id  VARCHAR(40) NOT NULL,
  thu_tu    INT         NOT NULL,
  tep_id    VARCHAR(40) NOT NULL,
  PRIMARY KEY (ho_so_id, thu_tu),
  CONSTRAINT fk_hst_hs FOREIGN KEY (ho_so_id) REFERENCES ho_so (id) ON DELETE CASCADE,
  CONSTRAINT fk_hst_tep FOREIGN KEY (tep_id) REFERENCES tep_tin (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE hoa_don (
  id            VARCHAR(40) NOT NULL PRIMARY KEY,
  chu           VARCHAR(4)  NOT NULL,
  chu_id        VARCHAR(40) NOT NULL,
  so_hoa_don    VARCHAR(50) NOT NULL,
  ngay_hoa_don  DATE        NOT NULL,
  gia_tri       BIGINT      NOT NULL DEFAULT 0 COMMENT 'Sau VAT',
  tep_id        VARCHAR(40) NULL,
  CONSTRAINT ck_hoa_don_chu CHECK (chu IN ('HDB', 'HDM', 'HDPT')),
  CONSTRAINT fk_hoa_don_tep FOREIGN KEY (tep_id) REFERENCES tep_tin (id) ON DELETE SET NULL,
  INDEX ix_hoa_don_chu (chu, chu_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── DANH MỤC ───────────────────────────────────────────────────────────────

CREATE TABLE nguon_tien (
  id            VARCHAR(20)  NOT NULL PRIMARY KEY,
  ten           VARCHAR(100) NOT NULL,
  loai          VARCHAR(20)  NOT NULL,
  so_tai_khoan  VARCHAR(50)  NULL,
  ngan_hang     VARCHAR(100) NULL,
  so_du_dau_ky  BIGINT       NOT NULL DEFAULT 0,
  ngay_dau_ky   DATE         NULL,
  trang_thai    VARCHAR(20)  NOT NULL DEFAULT 'Đang dùng',
  CONSTRAINT ck_nguon_tien_loai CHECK (loai IN ('Tiền mặt', 'Ngân hàng')),
  CONSTRAINT ck_nguon_tien_tt CHECK (trang_thai IN ('Đang dùng', 'Ngưng'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE loai_chi_phi (
  id         VARCHAR(20)  NOT NULL PRIMARY KEY,
  ten        VARCHAR(100) NOT NULL,
  nhom       VARCHAR(20)  NOT NULL,
  dang_dung  BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT ck_lcp_nhom CHECK (nhom IN ('Vận hành', 'Thực hiện HĐ'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE khach_hang (
  id               VARCHAR(20)  NOT NULL PRIMARY KEY,
  ten              VARCHAR(255) NOT NULL,
  mst              VARCHAR(20)  NOT NULL DEFAULT '',
  dia_chi          VARCHAR(500) NOT NULL DEFAULT '',
  nguoi_lien_he    VARCHAR(255) NOT NULL DEFAULT '',
  dien_thoai       VARCHAR(300) NOT NULL DEFAULT '',
  email            VARCHAR(200) NOT NULL DEFAULT '',
  ghi_chu          TEXT         NULL,
  trang_thai       VARCHAR(20)  NULL,
  tinh             VARCHAR(50)  NULL,
  chuc_vu          VARCHAR(100) NULL,
  phan_loai        VARCHAR(50)  NULL,
  nguon            VARCHAR(50)  NULL,
  loai_sp          VARCHAR(50)  NULL,
  hinh_thuc_hd     VARCHAR(50)  NULL,
  tiep_can         VARCHAR(30)  NULL,
  co_hoi           VARCHAR(30)  NULL,
  phu_trach        VARCHAR(40)  NULL COMMENT 'Sale phụ trách; trống = chưa phân bổ',
  trang_thai_data  VARCHAR(20)  NULL,
  ngay_tiep_nhan   DATE         NULL,
  ngay_phan_bo     DATE         NULL,
  gia_tri_co_hoi   BIGINT       NULL,
  la_import        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at       DATETIME(3)  NOT NULL,
  updated_at       DATETIME(3)  NOT NULL,
  created_by       VARCHAR(40)  NULL,
  updated_by       VARCHAR(40)  NULL,
  CONSTRAINT ck_kh_tt CHECK (trang_thai IS NULL OR trang_thai IN ('Đang dùng', 'Ngưng')),
  CONSTRAINT ck_kh_tiep_can CHECK (tiep_can IS NULL OR tiep_can IN ('Chưa liên hệ', 'Đang liên hệ', 'Hợp đồng', 'Huỷ')),
  CONSTRAINT ck_kh_co_hoi CHECK (co_hoi IS NULL OR co_hoi IN ('Chưa tiếp cận', 'Đã báo giá', 'Đang đàm phán', 'Ký hợp đồng', 'Đã giao hàng', 'Hoàn thành', 'Huỷ')),
  CONSTRAINT ck_kh_ttd CHECK (trang_thai_data IS NULL OR trang_thai_data IN ('Chưa phân bổ', 'Đã phân bổ')),
  CONSTRAINT fk_kh_phu_trach FOREIGN KEY (phu_trach) REFERENCES tai_khoan (id),
  INDEX ix_kh_mst (mst),
  INDEX ix_kh_ten (ten),
  INDEX ix_kh_phu_trach (phu_trach)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE cham_soc_kh (
  id             VARCHAR(40) NOT NULL PRIMARY KEY,
  khach_hang_id  VARCHAR(20) NOT NULL,
  thu_tu         INT         NOT NULL,
  luc            DATETIME(3) NOT NULL,
  nguoi          VARCHAR(40) NOT NULL COMMENT 'Id tài khoản; "Import" với dòng chuyển từ Excel',
  noi_dung       TEXT        NOT NULL,
  co_hoi         VARCHAR(30) NULL,
  CONSTRAINT fk_cs_kh FOREIGN KEY (khach_hang_id) REFERENCES khach_hang (id) ON DELETE CASCADE,
  INDEX ix_cs_kh (khach_hang_id, thu_tu)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE nha_cung_cap (
  id             VARCHAR(20)  NOT NULL PRIMARY KEY,
  ten            VARCHAR(255) NOT NULL,
  mst            VARCHAR(20)  NOT NULL DEFAULT '',
  dia_chi        VARCHAR(500) NOT NULL DEFAULT '',
  quoc_gia       VARCHAR(100) NOT NULL DEFAULT '',
  nguoi_lien_he  VARCHAR(255) NOT NULL DEFAULT '',
  dien_thoai     VARCHAR(300) NOT NULL DEFAULT '',
  email          VARCHAR(200) NOT NULL DEFAULT '',
  ghi_chu        TEXT         NULL,
  trang_thai     VARCHAR(20)  NULL,
  created_at     DATETIME(3)  NOT NULL,
  updated_at     DATETIME(3)  NOT NULL,
  created_by     VARCHAR(40)  NULL,
  updated_by     VARCHAR(40)  NULL,
  CONSTRAINT ck_ncc_tt CHECK (trang_thai IS NULL OR trang_thai IN ('Đang dùng', 'Ngưng')),
  INDEX ix_ncc_mst (mst),
  INDEX ix_ncc_ten (ten)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE kho (
  id         VARCHAR(20)  NOT NULL PRIMARY KEY,
  ten        VARCHAR(100) NOT NULL,
  loai       VARCHAR(20)  NOT NULL,
  dang_dung  BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT ck_kho_loai CHECK (loai IN ('Kho thường', 'Chuyển thẳng'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE loai_hang (
  id         VARCHAR(40)  NOT NULL PRIMARY KEY COMMENT 'Mã hàng cố định, VD KC-NO-8L',
  ten        VARCHAR(255) NOT NULL,
  mo_ta      VARCHAR(500) NULL,
  nhom       VARCHAR(30)  NOT NULL,
  dvt        VARCHAR(30)  NOT NULL DEFAULT '',
  dang_dung  BOOLEAN      NOT NULL DEFAULT TRUE,
  loai_khi   VARCHAR(50)  NULL,
  the_tich   VARCHAR(30)  NULL,
  CONSTRAINT ck_loai_hang_nhom CHECK (nhom IN ('Khí chuẩn', 'Dung dịch chuẩn', 'Vỏ bình', 'Thiết bị tái sử dụng', 'Phụ kiện'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE loai_hang_thuoc_tinh (
  loai_hang_id  VARCHAR(40)  NOT NULL,
  thu_tu        INT          NOT NULL,
  gia_tri       VARCHAR(100) NOT NULL,
  PRIMARY KEY (loai_hang_id, thu_tu),
  CONSTRAINT fk_lhtt_lh FOREIGN KEY (loai_hang_id) REFERENCES loai_hang (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE loai_hang_biet_danh (
  loai_hang_id  VARCHAR(40)  NOT NULL,
  thu_tu        INT          NOT NULL,
  gia_tri       VARCHAR(255) NOT NULL,
  PRIMARY KEY (loai_hang_id, thu_tu),
  CONSTRAINT fk_lhbd_lh FOREIGN KEY (loai_hang_id) REFERENCES loai_hang (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── KINH DOANH: HỢP ĐỒNG BÁN ───────────────────────────────────────────────

CREATE TABLE hop_dong_ban (
  id                   VARCHAR(40)  NOT NULL PRIMARY KEY,
  so_hd                VARCHAR(150) NULL COMMENT 'NULL khi Báo giá chưa có số',
  ma_kh                VARCHAR(20)  NOT NULL,
  ten_kh               VARCHAR(255) NOT NULL DEFAULT '',
  mst                  VARCHAR(20)  NOT NULL DEFAULT '',
  dia_chi              VARCHAR(500) NOT NULL DEFAULT '',
  ngay_ky              DATE         NULL,
  ngay_hieu_luc        DATE         NULL,
  trang_thai           VARCHAR(20)  NOT NULL,
  sale                 VARCHAR(40)  NULL,
  ghi_chu              TEXT         NULL,
  truoc_vat            BIGINT       NOT NULL DEFAULT 0,
  vat                  TINYINT      NOT NULL DEFAULT 8,
  thuc_te_truoc_vat    BIGINT       NOT NULL DEFAULT 0,
  ts_nguong            DOUBLE       NOT NULL,
  ts_muc1              DOUBLE       NOT NULL,
  ts_muc2              DOUBLE       NOT NULL,
  co_tam_ung           BOOLEAN      NULL,
  phat_hd              BIGINT       NULL,
  ly_do_phat           VARCHAR(1000) NULL,
  ly_do_huy            VARCHAR(1000) NULL,
  ghi_chu_ho_so_thieu  VARCHAR(1000) NULL,
  tao_luc              DATETIME(3)  NOT NULL,
  la_import            BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at           DATETIME(3)  NOT NULL,
  updated_at           DATETIME(3)  NOT NULL,
  created_by           VARCHAR(40)  NULL,
  updated_by           VARCHAR(40)  NULL,
  CONSTRAINT uq_hdb_so_hd UNIQUE (so_hd),
  CONSTRAINT ck_hdb_tt CHECK (trang_thai IN ('Báo giá', 'Hiệu lực', 'Đang giao hàng', 'Hoàn thành', 'Đã tất toán', 'Huỷ')),
  CONSTRAINT ck_hdb_vat CHECK (vat IN (0, 8, 10)),
  CONSTRAINT fk_hdb_kh FOREIGN KEY (ma_kh) REFERENCES khach_hang (id),
  CONSTRAINT fk_hdb_sale FOREIGN KEY (sale) REFERENCES tai_khoan (id),
  INDEX ix_hdb_kh (ma_kh),
  INDEX ix_hdb_sale (sale),
  INDEX ix_hdb_tt (trang_thai),
  INDEX ix_hdb_ngay_ky (ngay_ky)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE hdb_dong_hang (
  id         VARCHAR(40)   NOT NULL PRIMARY KEY,
  hdb_id     VARCHAR(40)   NOT NULL,
  thu_tu     INT           NOT NULL,
  loai_hang  VARCHAR(40)   NULL,
  ten_hang   VARCHAR(500)  NOT NULL DEFAULT '',
  so_luong   DOUBLE        NOT NULL DEFAULT 0,
  don_gia    DOUBLE        NOT NULL DEFAULT 0 COMMENT 'Đơn giá HĐ trước VAT',
  don_gia_th DOUBLE        NOT NULL DEFAULT 0 COMMENT 'Đơn giá thực hiện (giá vốn dự kiến)',
  ghi_chu    VARCHAR(1000) NULL,
  CONSTRAINT fk_hdbdh_hdb FOREIGN KEY (hdb_id) REFERENCES hop_dong_ban (id) ON DELETE CASCADE,
  CONSTRAINT fk_hdbdh_lh FOREIGN KEY (loai_hang) REFERENCES loai_hang (id) ON UPDATE CASCADE,
  INDEX ix_hdbdh_hdb (hdb_id, thu_tu),
  INDEX ix_hdbdh_lh (loai_hang)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── KẾ TOÁN ────────────────────────────────────────────────────────────────

CREATE TABLE phieu_thu_chi (
  id                 VARCHAR(40)   NOT NULL PRIMARY KEY,
  so_phieu           VARCHAR(20)   NOT NULL,
  ngay_lap           DATE          NOT NULL,
  loai               VARCHAR(30)   NOT NULL,
  nguon_tien         VARCHAR(20)   NULL COMMENT 'Nguồn (Nguồn đi với Luân chuyển); trống khi Nháp chưa chọn',
  nguon_tien_den     VARCHAR(20)   NULL,
  loai_chi_phi       VARCHAR(20)   NULL,
  noi_dung           VARCHAR(1000) NOT NULL DEFAULT '',
  so_tien_thu        BIGINT        NOT NULL DEFAULT 0,
  so_tien_chi        BIGINT        NOT NULL DEFAULT 0,
  phieu_tam_ung_goc  VARCHAR(40)   NULL,
  so_tien_thuc_chi   BIGINT        NULL,
  nguoi_nhan         VARCHAR(255)  NULL,
  nguoi_de_nghi      VARCHAR(40)   NOT NULL DEFAULT '' COMMENT 'Id tài khoản (dữ liệu import có thể là nhãn)',
  trang_thai         VARCHAR(20)   NOT NULL,
  nguoi_duyet        VARCHAR(40)   NULL,
  ngay_duyet         DATETIME(3)   NULL,
  ly_do_tu_choi      VARCHAR(1000) NULL,
  ghi_chu            VARCHAR(1000) NULL,
  ps_loai            VARCHAR(20)   NULL COMMENT 'Nguồn phát sinh: HDB-DotTT / HDM-DotTT',
  ps_hd_id           VARCHAR(40)   NULL,
  ps_dot             INT           NULL,
  la_import          BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at         DATETIME(3)   NOT NULL,
  updated_at         DATETIME(3)   NOT NULL,
  created_by         VARCHAR(40)   NULL,
  updated_by         VARCHAR(40)   NULL,
  CONSTRAINT uq_ptc_so_phieu UNIQUE (so_phieu),
  CONSTRAINT ck_ptc_loai CHECK (loai IN ('Thu', 'Chi', 'Tạm ứng', 'Quyết toán tạm ứng', 'Luân chuyển')),
  CONSTRAINT ck_ptc_tt CHECK (trang_thai IN ('Nháp', 'Chờ duyệt', 'Đã duyệt', 'Từ chối')),
  CONSTRAINT ck_ptc_ps CHECK (ps_loai IS NULL OR ps_loai IN ('HDB-DotTT', 'HDM-DotTT')),
  CONSTRAINT ck_ptc_tien CHECK (so_tien_thu >= 0 AND so_tien_chi >= 0),
  CONSTRAINT fk_ptc_nguon FOREIGN KEY (nguon_tien) REFERENCES nguon_tien (id),
  CONSTRAINT fk_ptc_nguon_den FOREIGN KEY (nguon_tien_den) REFERENCES nguon_tien (id),
  CONSTRAINT fk_ptc_lcp FOREIGN KEY (loai_chi_phi) REFERENCES loai_chi_phi (id),
  CONSTRAINT fk_ptc_tam_ung FOREIGN KEY (phieu_tam_ung_goc) REFERENCES phieu_thu_chi (id),
  INDEX ix_ptc_tt (trang_thai),
  INDEX ix_ptc_ngay (ngay_lap),
  INDEX ix_ptc_ps (ps_loai, ps_hd_id),
  INDEX ix_ptc_de_nghi (nguoi_de_nghi)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE phieu_thu_chi_lich_su (
  phieu_id   VARCHAR(40)   NOT NULL,
  thu_tu     INT           NOT NULL,
  luc        DATETIME(3)   NOT NULL,
  nguoi      VARCHAR(40)   NOT NULL,
  hanh_dong  VARCHAR(20)   NOT NULL,
  ghi_chu    VARCHAR(1000) NULL,
  PRIMARY KEY (phieu_id, thu_tu),
  CONSTRAINT ck_ptcls_hd CHECK (hanh_dong IN ('Lưu nháp', 'Gửi duyệt', 'Rút lại', 'Duyệt', 'Từ chối')),
  CONSTRAINT fk_ptcls_p FOREIGN KEY (phieu_id) REFERENCES phieu_thu_chi (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE phieu_thu_chi_tep (
  phieu_id  VARCHAR(40) NOT NULL,
  thu_tu    INT         NOT NULL,
  tep_id    VARCHAR(40) NOT NULL,
  PRIMARY KEY (phieu_id, thu_tu),
  CONSTRAINT fk_ptct_p FOREIGN KEY (phieu_id) REFERENCES phieu_thu_chi (id) ON DELETE CASCADE,
  CONSTRAINT fk_ptct_tep FOREIGN KEY (tep_id) REFERENCES tep_tin (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE hdb_dot_tt (
  hdb_id           VARCHAR(40)   NOT NULL,
  thu_tu           INT           NOT NULL,
  dot              INT           NOT NULL,
  ty_le            DOUBLE        NULL,
  so_tien          BIGINT        NOT NULL DEFAULT 0,
  han              DATE          NULL,
  han_ngay         INT           NULL COMMENT 'Hạn = Ngày hiệu lực + N ngày',
  ngay_thu         DATE          NULL,
  so_tien_thu      BIGINT        NULL,
  nguon_tien_nhan  VARCHAR(20)   NULL,
  ghi_chu          VARCHAR(1000) NULL,
  phieu_thu_id     VARCHAR(40)   NULL,
  PRIMARY KEY (hdb_id, thu_tu),
  CONSTRAINT fk_hdbdot_hdb FOREIGN KEY (hdb_id) REFERENCES hop_dong_ban (id) ON DELETE CASCADE,
  CONSTRAINT fk_hdbdot_nguon FOREIGN KEY (nguon_tien_nhan) REFERENCES nguon_tien (id),
  CONSTRAINT fk_hdbdot_phieu FOREIGN KEY (phieu_thu_id) REFERENCES phieu_thu_chi (id),
  INDEX ix_hdbdot_phieu (phieu_thu_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE chi_phi_hd (
  id                 VARCHAR(40)   NOT NULL PRIMARY KEY,
  ma_cp              VARCHAR(20)   NOT NULL,
  hdb_id             VARCHAR(40)   NULL COMMENT 'Trống khi Nháp chưa chọn HĐ',
  ngay               DATE          NOT NULL,
  loai_chi_phi       VARCHAR(20)   NULL,
  noi_dung           VARCHAR(1000) NOT NULL DEFAULT '',
  so_tien            BIGINT        NOT NULL DEFAULT 0,
  nguon_tien         VARCHAR(20)   NULL,
  nguoi_thuc_hien    VARCHAR(40)   NOT NULL DEFAULT '',
  nguoi_nhan         VARCHAR(255)  NULL,
  don_vi_van_chuyen  VARCHAR(255)  NULL,
  trang_thai         VARCHAR(20)   NOT NULL,
  nguoi_duyet        VARCHAR(40)   NULL,
  ngay_duyet         DATETIME(3)   NULL,
  ly_do_tu_choi      VARCHAR(1000) NULL,
  ghi_chu            VARCHAR(1000) NULL,
  created_at         DATETIME(3)   NOT NULL,
  updated_at         DATETIME(3)   NOT NULL,
  created_by         VARCHAR(40)   NULL,
  updated_by         VARCHAR(40)   NULL,
  CONSTRAINT uq_cp_ma UNIQUE (ma_cp),
  CONSTRAINT ck_cp_tt CHECK (trang_thai IN ('Nháp', 'Chờ duyệt', 'Đã duyệt', 'Từ chối')),
  CONSTRAINT ck_cp_tien CHECK (so_tien >= 0),
  CONSTRAINT fk_cp_hdb FOREIGN KEY (hdb_id) REFERENCES hop_dong_ban (id),
  CONSTRAINT fk_cp_lcp FOREIGN KEY (loai_chi_phi) REFERENCES loai_chi_phi (id),
  CONSTRAINT fk_cp_nguon FOREIGN KEY (nguon_tien) REFERENCES nguon_tien (id),
  INDEX ix_cp_hdb (hdb_id),
  INDEX ix_cp_tt (trang_thai),
  INDEX ix_cp_ngay (ngay)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE chi_phi_hd_lich_su (
  chi_phi_id  VARCHAR(40)   NOT NULL,
  thu_tu      INT           NOT NULL,
  luc         DATETIME(3)   NOT NULL,
  nguoi       VARCHAR(40)   NOT NULL,
  hanh_dong   VARCHAR(20)   NOT NULL,
  ghi_chu     VARCHAR(1000) NULL,
  PRIMARY KEY (chi_phi_id, thu_tu),
  CONSTRAINT ck_cpls_hd CHECK (hanh_dong IN ('Lưu nháp', 'Gửi duyệt', 'Rút lại', 'Duyệt', 'Từ chối')),
  CONSTRAINT fk_cpls_cp FOREIGN KEY (chi_phi_id) REFERENCES chi_phi_hd (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE chi_phi_hd_tep (
  chi_phi_id  VARCHAR(40) NOT NULL,
  thu_tu      INT         NOT NULL,
  tep_id      VARCHAR(40) NOT NULL,
  PRIMARY KEY (chi_phi_id, thu_tu),
  CONSTRAINT fk_cpt_cp FOREIGN KEY (chi_phi_id) REFERENCES chi_phi_hd (id) ON DELETE CASCADE,
  CONSTRAINT fk_cpt_tep FOREIGN KEY (tep_id) REFERENCES tep_tin (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── VIỆC ĐƯỢC GIAO (TD-01) ────────────────────────────────────────────────

CREATE TABLE viec_giao (
  id         VARCHAR(40) NOT NULL PRIMARY KEY,
  noi_dung   TEXT        NOT NULL,
  nguoi_tao  VARCHAR(40) NOT NULL,
  tao_luc    DATETIME(3) NOT NULL,
  hdb_id     VARCHAR(40) NULL,
  han        DATE        NULL,
  gio        VARCHAR(5)  NULL,
  uu_tien    BOOLEAN     NOT NULL DEFAULT FALSE,
  xong_luc   DATETIME(3) NULL,
  nguoi_xong VARCHAR(40) NULL,
  CONSTRAINT fk_vg_tao FOREIGN KEY (nguoi_tao) REFERENCES tai_khoan (id),
  CONSTRAINT fk_vg_hdb FOREIGN KEY (hdb_id) REFERENCES hop_dong_ban (id),
  INDEX ix_vg_han (han),
  INDEX ix_vg_hdb (hdb_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE viec_giao_nguoi_nhan (
  viec_id       VARCHAR(40) NOT NULL,
  thu_tu        INT         NOT NULL,
  tai_khoan_id  VARCHAR(40) NOT NULL,
  PRIMARY KEY (viec_id, thu_tu),
  CONSTRAINT fk_vgnn_v FOREIGN KEY (viec_id) REFERENCES viec_giao (id) ON DELETE CASCADE,
  CONSTRAINT fk_vgnn_tk FOREIGN KEY (tai_khoan_id) REFERENCES tai_khoan (id),
  INDEX ix_vgnn_tk (tai_khoan_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE viec_giao_phan_hoi (
  viec_id   VARCHAR(40) NOT NULL,
  thu_tu    INT         NOT NULL,
  nguoi     VARCHAR(40) NOT NULL,
  luc       DATETIME(3) NOT NULL,
  noi_dung  TEXT        NOT NULL,
  he_thong  BOOLEAN     NULL,
  PRIMARY KEY (viec_id, thu_tu),
  CONSTRAINT fk_vgph_v FOREIGN KEY (viec_id) REFERENCES viec_giao (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── ĐỀ NGHỊ CẤP VẬT TƯ ─────────────────────────────────────────────────────

CREATE TABLE de_nghi_vat_tu (
  id             VARCHAR(40)   NOT NULL PRIMARY KEY,
  so_phieu       VARCHAR(20)   NOT NULL,
  ngay           DATE          NOT NULL,
  hdb_id         VARCHAR(40)   NOT NULL,
  nguoi_de_nghi  VARCHAR(40)   NOT NULL,
  ghi_chu        VARCHAR(1000) NULL,
  ly_do_huy      VARCHAR(1000) NULL,
  CONSTRAINT uq_dnvt_so UNIQUE (so_phieu),
  CONSTRAINT fk_dnvt_hdb FOREIGN KEY (hdb_id) REFERENCES hop_dong_ban (id),
  INDEX ix_dnvt_hdb (hdb_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE de_nghi_vat_tu_dong (
  id           VARCHAR(40)   NOT NULL PRIMARY KEY,
  dnvt_id      VARCHAR(40)   NOT NULL,
  thu_tu       INT           NOT NULL,
  loai_hang    VARCHAR(40)   NOT NULL,
  ten_hang     VARCHAR(500)  NOT NULL DEFAULT '',
  so_luong     DOUBLE        NOT NULL,
  ghi_chu      VARCHAR(1000) NULL,
  dong_ban_id  VARCHAR(40)   NULL COMMENT 'Tham chiếu mềm tới hdb_dong_hang.id',
  CONSTRAINT fk_dnvtd_dn FOREIGN KEY (dnvt_id) REFERENCES de_nghi_vat_tu (id) ON DELETE CASCADE,
  CONSTRAINT fk_dnvtd_lh FOREIGN KEY (loai_hang) REFERENCES loai_hang (id) ON UPDATE CASCADE,
  INDEX ix_dnvtd_dn (dnvt_id, thu_tu)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── KINH DOANH: HỢP ĐỒNG MUA ───────────────────────────────────────────────

CREATE TABLE hop_dong_mua (
  id                   VARCHAR(40)   NOT NULL PRIMARY KEY,
  so_hd                VARCHAR(150)  NOT NULL,
  ma_ncc               VARCHAR(20)   NOT NULL,
  ten_ncc              VARCHAR(255)  NOT NULL DEFAULT '',
  dia_chi              VARCHAR(500)  NOT NULL DEFAULT '',
  mst                  VARCHAR(20)   NOT NULL DEFAULT '',
  ngay_ky              DATE          NULL,
  hdb_id               VARCHAR(40)   NULL,
  thuoc_phu_tai        BOOLEAN       NOT NULL DEFAULT FALSE,
  trang_thai           VARCHAR(20)   NOT NULL,
  ghi_chu              TEXT          NULL,
  nhap_tay             BOOLEAN       NOT NULL DEFAULT FALSE,
  tong_nhap_tay        BIGINT        NULL,
  ly_do_nhap_tay       VARCHAR(1000) NULL,
  xuat_hoa_don         VARCHAR(5)    NOT NULL DEFAULT 'Chưa',
  ghi_chu_ho_so_thieu  VARCHAR(1000) NULL,
  tao_luc              DATETIME(3)   NOT NULL,
  la_import            BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at           DATETIME(3)   NOT NULL,
  updated_at           DATETIME(3)   NOT NULL,
  created_by           VARCHAR(40)   NULL,
  updated_by           VARCHAR(40)   NULL,
  CONSTRAINT uq_hdm_so_hd UNIQUE (so_hd),
  CONSTRAINT ck_hdm_tt CHECK (trang_thai IN ('Nháp', 'Đã ký', 'Đang nhận hàng', 'Đã nhận đủ', 'Đã tất toán', 'Huỷ')),
  CONSTRAINT ck_hdm_xhd CHECK (xuat_hoa_don IN ('Đã', 'Chưa')),
  CONSTRAINT fk_hdm_ncc FOREIGN KEY (ma_ncc) REFERENCES nha_cung_cap (id),
  CONSTRAINT fk_hdm_hdb FOREIGN KEY (hdb_id) REFERENCES hop_dong_ban (id),
  INDEX ix_hdm_ncc (ma_ncc),
  INDEX ix_hdm_hdb (hdb_id),
  INDEX ix_hdm_tt (trang_thai)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE hdm_dong_hang (
  id         VARCHAR(40)   NOT NULL PRIMARY KEY,
  hdm_id     VARCHAR(40)   NOT NULL,
  thu_tu     INT           NOT NULL,
  loai_hang  VARCHAR(40)   NOT NULL,
  ten_hang   VARCHAR(500)  NOT NULL DEFAULT '',
  thong_so   VARCHAR(500)  NOT NULL DEFAULT '',
  so_luong   DOUBLE        NOT NULL,
  dvt        VARCHAR(30)   NOT NULL DEFAULT '',
  don_gia    DOUBLE        NOT NULL DEFAULT 0 COMMENT 'Theo loại tiền của dòng',
  loai_tien  VARCHAR(5)    NOT NULL DEFAULT 'VNĐ',
  ty_gia     DOUBLE        NOT NULL DEFAULT 1,
  ghi_chu    VARCHAR(1000) NULL,
  dnvt_id    VARCHAR(40)   NULL COMMENT 'Tham chiếu mềm đề nghị cấp vật tư',
  dnvt_dong  VARCHAR(40)   NULL,
  hdb_id     VARCHAR(40)   NULL COMMENT 'HĐ bán mà dòng này mua cho',
  CONSTRAINT ck_hdmdh_tien CHECK (loai_tien IN ('VNĐ', 'USD', 'RMB')),
  CONSTRAINT fk_hdmdh_hdm FOREIGN KEY (hdm_id) REFERENCES hop_dong_mua (id) ON DELETE CASCADE,
  CONSTRAINT fk_hdmdh_lh FOREIGN KEY (loai_hang) REFERENCES loai_hang (id) ON UPDATE CASCADE,
  CONSTRAINT fk_hdmdh_hdb FOREIGN KEY (hdb_id) REFERENCES hop_dong_ban (id),
  INDEX ix_hdmdh_hdm (hdm_id, thu_tu),
  INDEX ix_hdmdh_dnvt (dnvt_id),
  INDEX ix_hdmdh_hdb (hdb_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE hdm_dot_tt (
  hdm_id        VARCHAR(40)   NOT NULL,
  thu_tu        INT           NOT NULL,
  dot           INT           NOT NULL,
  ty_le         DOUBLE        NULL,
  so_tien       BIGINT        NOT NULL DEFAULT 0,
  han_moc       VARCHAR(30)   NULL,
  han_ngay      INT           NULL,
  han           DATE          NULL,
  ngay_tra      DATE          NULL,
  so_tien_tra   BIGINT        NULL,
  nguon_tien    VARCHAR(20)   NULL,
  phieu_chi_id  VARCHAR(40)   NULL,
  ghi_chu       VARCHAR(1000) NULL,
  PRIMARY KEY (hdm_id, thu_tu),
  CONSTRAINT fk_hdmdot_hdm FOREIGN KEY (hdm_id) REFERENCES hop_dong_mua (id) ON DELETE CASCADE,
  CONSTRAINT fk_hdmdot_nguon FOREIGN KEY (nguon_tien) REFERENCES nguon_tien (id),
  CONSTRAINT fk_hdmdot_phieu FOREIGN KEY (phieu_chi_id) REFERENCES phieu_thu_chi (id),
  INDEX ix_hdmdot_phieu (phieu_chi_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE hdm_checklist (
  hdm_id  VARCHAR(40) NOT NULL,
  thu_tu  INT         NOT NULL,
  ten     VARCHAR(50) NOT NULL,
  xong    BOOLEAN     NOT NULL DEFAULT FALSE,
  ngay    DATE        NULL,
  PRIMARY KEY (hdm_id, thu_tu),
  CONSTRAINT fk_hdmcl_hdm FOREIGN KEY (hdm_id) REFERENCES hop_dong_mua (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── KHO ────────────────────────────────────────────────────────────────────

CREATE TABLE kiem_ke (
  id               VARCHAR(40)   NOT NULL PRIMARY KEY,
  so_phieu         VARCHAR(20)   NOT NULL,
  ngay             DATE          NOT NULL,
  kho              VARCHAR(20)   NOT NULL,
  nguoi_thuc_hien  VARCHAR(40)   NOT NULL,
  ghi_chu          VARCHAR(1000) NULL,
  CONSTRAINT uq_kk_so UNIQUE (so_phieu),
  CONSTRAINT fk_kk_kho FOREIGN KEY (kho) REFERENCES kho (id),
  INDEX ix_kk_ngay (ngay)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE kiem_ke_dong (
  kiem_ke_id  VARCHAR(40)   NOT NULL,
  thu_tu      INT           NOT NULL,
  loai_hang   VARCHAR(40)   NOT NULL,
  so_luong    DOUBLE        NOT NULL,
  ten_hang    VARCHAR(255)  NULL,
  xuat_xu     VARCHAR(255)  NULL,
  nong_do     VARCHAR(255)  NULL,
  ghi_chu     VARCHAR(1000) NULL,
  PRIMARY KEY (kiem_ke_id, thu_tu),
  CONSTRAINT fk_kkd_kk FOREIGN KEY (kiem_ke_id) REFERENCES kiem_ke (id) ON DELETE CASCADE,
  CONSTRAINT fk_kkd_lh FOREIGN KEY (loai_hang) REFERENCES loai_hang (id) ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE kiem_ke_phieu_dc (
  kiem_ke_id     VARCHAR(40) NOT NULL,
  thu_tu         INT         NOT NULL,
  phieu_kho_id   VARCHAR(40) NOT NULL COMMENT 'Phiếu điều chỉnh đã sinh (tham chiếu mềm)',
  PRIMARY KEY (kiem_ke_id, thu_tu),
  CONSTRAINT fk_kkpdc_kk FOREIGN KEY (kiem_ke_id) REFERENCES kiem_ke (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE phieu_kho (
  id               VARCHAR(40)   NOT NULL PRIMARY KEY,
  so_phieu         VARCHAR(20)   NOT NULL,
  ngay             DATE          NOT NULL,
  loai             VARCHAR(5)    NOT NULL,
  nguon_goc        VARCHAR(30)   NOT NULL,
  hd_id            VARCHAR(40)   NULL COMMENT 'HĐ mua (phiếu nhập) / HĐ bán (phiếu xuất) — đa hình',
  kho              VARCHAR(20)   NOT NULL,
  ly_do            VARCHAR(1000) NULL,
  nguoi_thuc_hien  VARCHAR(40)   NOT NULL,
  trang_thai       VARCHAR(10)   NOT NULL,
  ghi_chu          VARCHAR(1000) NULL,
  so_hoa_don       VARCHAR(50)   NULL,
  ncc              VARCHAR(20)   NULL,
  kiem_ke_id       VARCHAR(40)   NULL COMMENT 'Tham chiếu mềm đợt kiểm kê',
  created_at       DATETIME(3)   NOT NULL,
  updated_at       DATETIME(3)   NOT NULL,
  created_by       VARCHAR(40)   NULL,
  updated_by       VARCHAR(40)   NULL,
  CONSTRAINT uq_pk_so UNIQUE (so_phieu),
  CONSTRAINT ck_pk_loai CHECK (loai IN ('Nhập', 'Xuất')),
  CONSTRAINT ck_pk_ng CHECK (nguon_goc IN ('Tự động HĐ Mua', 'Tự động HĐ Bán', 'Nhập tay – điều chỉnh')),
  CONSTRAINT ck_pk_tt CHECK (trang_thai IN ('Hiệu lực', 'Đã huỷ')),
  CONSTRAINT fk_pk_kho FOREIGN KEY (kho) REFERENCES kho (id),
  CONSTRAINT fk_pk_ncc FOREIGN KEY (ncc) REFERENCES nha_cung_cap (id),
  INDEX ix_pk_hd (hd_id),
  INDEX ix_pk_ngay (ngay),
  INDEX ix_pk_loai_tt (loai, trang_thai),
  INDEX ix_pk_kk (kiem_ke_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE phieu_kho_dong (
  phieu_id     VARCHAR(40)   NOT NULL,
  thu_tu       INT           NOT NULL,
  loai_hang    VARCHAR(40)   NOT NULL,
  thuoc_tinh   VARCHAR(500)  NOT NULL DEFAULT '' COMMENT 'Quy cách / nồng độ của lô',
  so_luong     DOUBLE        NOT NULL,
  lo           VARCHAR(40)   NULL COMMENT 'Nhập: mã lô sinh ra; Xuất: mã lô bị trừ',
  don_gia      DOUBLE        NULL COMMENT 'Nhập: đơn giá lô chưa VAT',
  vat          DOUBLE        NULL,
  dong_hdm_id  VARCHAR(40)   NULL COMMENT 'Tham chiếu mềm hdm_dong_hang.id',
  don_gia_goc  DOUBLE        NULL COMMENT 'Xuất: giá vốn = đơn giá lô',
  ten_tren_hd  VARCHAR(500)  NULL,
  ghi_chu      VARCHAR(1000) NULL,
  PRIMARY KEY (phieu_id, thu_tu),
  CONSTRAINT ck_pkd_sl CHECK (so_luong >= 0),
  CONSTRAINT fk_pkd_pk FOREIGN KEY (phieu_id) REFERENCES phieu_kho (id) ON DELETE CASCADE,
  CONSTRAINT fk_pkd_lh FOREIGN KEY (loai_hang) REFERENCES loai_hang (id) ON UPDATE CASCADE,
  INDEX ix_pkd_lo (lo),
  INDEX ix_pkd_lh (loai_hang),
  INDEX ix_pkd_dong_hdm (dong_hdm_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE anh_xa_ten (
  id         VARCHAR(40)   NOT NULL PRIMARY KEY,
  ten        VARCHAR(500)  NOT NULL,
  the_tich   VARCHAR(50)   NULL,
  nong_do    VARCHAR(500)  NULL,
  tong_sl    DOUBLE        NOT NULL DEFAULT 0,
  so_lan     INT           NOT NULL DEFAULT 0,
  loai_hang  VARCHAR(40)   NULL,
  lo         VARCHAR(40)   NULL,
  ghi_chu    VARCHAR(1000) NULL,
  CONSTRAINT fk_ax_lh FOREIGN KEY (loai_hang) REFERENCES loai_hang (id) ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ── PHÚ TÀI ────────────────────────────────────────────────────────────────

CREATE TABLE hop_dong_phu_tai (
  id                   VARCHAR(40)   NOT NULL PRIMARY KEY,
  so_hd                VARCHAR(150)  NOT NULL,
  ma_kh                VARCHAR(20)   NOT NULL,
  ten_kh               VARCHAR(255)  NOT NULL DEFAULT '',
  mst                  VARCHAR(20)   NOT NULL DEFAULT '',
  ngay_ky              DATE          NULL,
  ngay_hieu_luc        DATE          NULL,
  trang_thai           VARCHAR(20)   NOT NULL,
  ghi_chu              TEXT          NULL,
  truoc_vat            BIGINT        NOT NULL DEFAULT 0,
  vat                  TINYINT       NOT NULL DEFAULT 8,
  ty_le_thue           DOUBLE        NOT NULL,
  ty_le_giu            DOUBLE        NOT NULL,
  cach_chia            VARCHAR(5)    NULL,
  hoa_hong_kieu        VARCHAR(10)   NOT NULL DEFAULT 'Số tiền',
  hoa_hong_gia_tri     DOUBLE        NOT NULL DEFAULT 0,
  nguoi_nhan_hh        VARCHAR(255)  NULL,
  ngay_chi_hh          DATE          NULL,
  ghi_chu_ho_so_thieu  VARCHAR(1000) NULL,
  ly_do_huy            VARCHAR(1000) NULL,
  tao_luc              DATETIME(3)   NOT NULL,
  la_import            BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at           DATETIME(3)   NOT NULL,
  updated_at           DATETIME(3)   NOT NULL,
  created_by           VARCHAR(40)   NULL,
  updated_by           VARCHAR(40)   NULL,
  CONSTRAINT uq_hdpt_so UNIQUE (so_hd),
  CONSTRAINT ck_hdpt_tt CHECK (trang_thai IN ('Báo giá', 'Hiệu lực', 'Đang thực hiện', 'Hoàn thành', 'Đã tất toán', 'Huỷ')),
  CONSTRAINT ck_hdpt_vat CHECK (vat IN (0, 8, 10)),
  CONSTRAINT ck_hdpt_cc CHECK (cach_chia IS NULL OR cach_chia IN ('Nhân', 'Cộng')),
  CONSTRAINT ck_hdpt_hhk CHECK (hoa_hong_kieu IN ('Số tiền', '%')),
  CONSTRAINT fk_hdpt_kh FOREIGN KEY (ma_kh) REFERENCES khach_hang (id),
  INDEX ix_hdpt_kh (ma_kh),
  INDEX ix_hdpt_tt (trang_thai)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE hdpt_hop_dong_mua (
  hdpt_id  VARCHAR(40) NOT NULL,
  thu_tu   INT         NOT NULL,
  hdm_id   VARCHAR(40) NOT NULL,
  PRIMARY KEY (hdpt_id, thu_tu),
  CONSTRAINT uq_hdpt_hdm UNIQUE (hdm_id) COMMENT 'P2-08: một HĐ mua chỉ là giá đầu vào của một HĐ Phú Tài',
  CONSTRAINT fk_hdpthdm_pt FOREIGN KEY (hdpt_id) REFERENCES hop_dong_phu_tai (id) ON DELETE CASCADE,
  CONSTRAINT fk_hdpthdm_hdm FOREIGN KEY (hdm_id) REFERENCES hop_dong_mua (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE hdpt_chi_phi (
  hdpt_id   VARCHAR(40)   NOT NULL,
  thu_tu    INT           NOT NULL,
  id        VARCHAR(40)   NOT NULL,
  loai      VARCHAR(20)   NOT NULL,
  noi_dung  VARCHAR(1000) NOT NULL DEFAULT '',
  ngay      DATE          NULL,
  so_tien   BIGINT        NOT NULL DEFAULT 0,
  PRIMARY KEY (hdpt_id, thu_tu),
  CONSTRAINT ck_hdptcp_loai CHECK (loai IN ('Vận chuyển', 'Hải quan', 'Khác')),
  CONSTRAINT fk_hdptcp_pt FOREIGN KEY (hdpt_id) REFERENCES hop_dong_phu_tai (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE hdpt_dot_kh (
  hdpt_id  VARCHAR(40)   NOT NULL,
  thu_tu   INT           NOT NULL,
  dot      INT           NOT NULL,
  so_tien  BIGINT        NOT NULL DEFAULT 0,
  ngay     DATE          NULL,
  ghi_chu  VARCHAR(1000) NULL,
  PRIMARY KEY (hdpt_id, thu_tu),
  CONSTRAINT fk_hdptdk_pt FOREIGN KEY (hdpt_id) REFERENCES hop_dong_phu_tai (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE hdpt_dot_tra_ncc (
  hdpt_id    VARCHAR(40) NOT NULL,
  thu_tu     INT         NOT NULL,
  id         VARCHAR(40) NOT NULL,
  hdm_id     VARCHAR(40) NOT NULL DEFAULT '',
  ngay       DATE        NULL,
  so_tien    DOUBLE      NOT NULL DEFAULT 0 COMMENT 'Theo loại tiền',
  loai_tien  VARCHAR(5)  NOT NULL DEFAULT 'VNĐ',
  ty_gia     DOUBLE      NOT NULL DEFAULT 1,
  PRIMARY KEY (hdpt_id, thu_tu),
  CONSTRAINT ck_hdptncc_tien CHECK (loai_tien IN ('VNĐ', 'USD', 'RMB')),
  CONSTRAINT fk_hdptncc_pt FOREIGN KEY (hdpt_id) REFERENCES hop_dong_phu_tai (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE hdpt_doi_chieu (
  hdpt_id             VARCHAR(40)   NOT NULL,
  thu_tu              INT           NOT NULL,
  id                  VARCHAR(40)   NOT NULL,
  ngay_oxy_chuyen     DATE          NULL,
  so_tien_vnd         BIGINT        NOT NULL DEFAULT 0,
  ngay_pt_chuyen_ncc  DATE          NULL,
  so_tien_nguyen_te   DOUBLE        NOT NULL DEFAULT 0,
  loai_tien           VARCHAR(5)    NOT NULL DEFAULT 'VNĐ',
  ty_gia              DOUBLE        NOT NULL DEFAULT 1,
  ghi_chu             VARCHAR(1000) NULL,
  PRIMARY KEY (hdpt_id, thu_tu),
  CONSTRAINT ck_hdptdc_tien CHECK (loai_tien IN ('VNĐ', 'USD', 'RMB')),
  CONSTRAINT fk_hdptdc_pt FOREIGN KEY (hdpt_id) REFERENCES hop_dong_phu_tai (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE hdpt_ty_le_log (
  hdpt_id  VARCHAR(40)   NOT NULL,
  thu_tu   INT           NOT NULL,
  truoc    VARCHAR(200)  NOT NULL,
  sau      VARCHAR(200)  NOT NULL,
  nguoi    VARCHAR(40)   NOT NULL,
  luc      DATETIME(3)   NOT NULL,
  ly_do    VARCHAR(1000) NULL,
  PRIMARY KEY (hdpt_id, thu_tu),
  CONSTRAINT fk_hdpttl_pt FOREIGN KEY (hdpt_id) REFERENCES hop_dong_phu_tai (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE dong_tien_pt (
  id       VARCHAR(60)   NOT NULL PRIMARY KEY,
  ngay     DATE          NOT NULL,
  chieu    VARCHAR(20)   NOT NULL,
  hdpt_id  VARCHAR(40)   NULL,
  so_tien  BIGINT        NOT NULL,
  nguon    VARCHAR(10)   NOT NULL,
  ref_id   VARCHAR(40)   NULL COMMENT 'Dòng tự động: id dòng đối chiếu sinh ra nó',
  ghi_chu  VARCHAR(1000) NULL,
  CONSTRAINT ck_dtpt_chieu CHECK (chieu IN ('Thu về PT', 'Chi từ PT')),
  CONSTRAINT ck_dtpt_nguon CHECK (nguon IN ('Tự động', 'Nhập tay')),
  CONSTRAINT ck_dtpt_tien CHECK (so_tien > 0),
  CONSTRAINT fk_dtpt_pt FOREIGN KEY (hdpt_id) REFERENCES hop_dong_phu_tai (id),
  INDEX ix_dtpt_pt (hdpt_id),
  INDEX ix_dtpt_ngay (ngay)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
