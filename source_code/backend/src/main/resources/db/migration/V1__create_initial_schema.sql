-- ════════════════════════════════════════════════════════════════════════════
-- App Oxy — Schema khởi tạo (MySQL 8.0.16+ — cần CHECK constraint)
--
-- Quy ước:
--  * Tên bảng / cột snake_case; mọi giá trị trạng thái (trang_thai, trang_thai_data, tiep_can, co_hoi)
--    lưu bằng MÃ không dấu IN HOA (VD HOAT_DONG) khớp TrangThai.java / core/trang-thai.ts và được chặn bằng CHECK;
--    nhãn tiếng Việt chỉ để hiển thị. Các cột liệt kê khác (loai, nhom, hanh_dong…) vẫn lưu nhãn tiếng Việt.
--  * Mỗi bảng và mỗi cột đều có COMMENT mô tả ý nghĩa, đơn vị/định dạng, danh sách mã với cột liệt kê.
--  * Tiền VNĐ: BIGINT (số nguyên). Số lượng, tỷ lệ, tỷ giá, đơn giá ngoại tệ: DOUBLE
--    (cùng kiểu số IEEE-754 với frontend để công thức tính ra cùng kết quả).
--  * Ngày nghiệp vụ: DATE. Mốc thời gian: DATETIME(3) theo UTC.
--  * Bảng con có thứ tự (đợt thanh toán, dòng phiếu…) có cột thu_tu giữ đúng thứ tự hiển thị.
--  * "Tham chiếu mềm" (không FK) chỉ dùng khi dữ liệu thực tế có nhãn không phải khoá
--    (VD người lập "Import") hoặc tham chiếu đa hình (hd_id của phiếu kho) — xem docs/database-design.md.
-- ════════════════════════════════════════════════════════════════════════════

-- ── HỆ THỐNG ───────────────────────────────────────────────────────────────

CREATE TABLE ht_trang_thai (
  id          TINYINT     NOT NULL PRIMARY KEY COMMENT 'Luôn bằng 1 (bảng chỉ có một dòng)',
  phien_ban   BIGINT      NOT NULL DEFAULT 0 COMMENT 'Tăng sau mỗi lệnh ghi — client so để biết dữ liệu đã đổi',
  cap_nhat    DATETIME(3) NULL COMMENT 'Thời điểm ghi gần nhất (DATETIME(3), UTC)',
  CONSTRAINT ck_app_state_id CHECK (id = 1)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Bộ đếm phiên bản dữ liệu toàn hệ thống (1 dòng duy nhất)';

CREATE TABLE ht_chuc_nang (
  ma            VARCHAR(20)  NOT NULL PRIMARY KEY COMMENT 'Mã chức năng spec, VD HDB-01, KT-07-TD',
  module        VARCHAR(50)  NOT NULL COMMENT 'Tên module nhóm chức năng (Hệ thống, Kế toán, Kinh doanh, Kho…)',
  ten           VARCHAR(200) NOT NULL COMMENT 'Tên chức năng',
  mo_ta         VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'Mô tả phạm vi quyền',
  muc_cho_phep  VARCHAR(100) NOT NULL COMMENT 'Các mức quyền hợp lệ của chức năng, phân tách dấu phẩy (view, ownView, request, draft, own, edit, approve)'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Danh mục chức năng phân quyền theo mã spec';

CREATE TABLE ht_nhom (
  id              VARCHAR(40)  NOT NULL PRIMARY KEY COMMENT 'Mã định danh nhóm (khoá chính), VD NQ-GD',
  ma              VARCHAR(30)  NOT NULL COMMENT 'Mã nhóm quyền (duy nhất), VD GIAM_DOC',
  ten             VARCHAR(100) NOT NULL COMMENT 'Tên nhóm quyền',
  mo_ta           VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'Mô tả nhóm',
  toan_quyen      BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'TRUE = toàn quyền mọi chức năng (không cần gán chi tiết)',
  trang_thai      VARCHAR(20)  NOT NULL DEFAULT 'HOAT_DONG' COMMENT 'Trạng thái: HOAT_DONG=Hoạt động, NGUNG=Ngưng',
  he_thong        BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'TRUE = nhóm hệ thống mặc định, không được xoá',
  tao_luc         DATETIME(3)  NOT NULL COMMENT 'Thời điểm tạo (DATETIME(3), UTC)',
  cap_nhat        DATETIME(3)  NULL COMMENT 'Thời điểm cập nhật gần nhất (DATETIME(3), UTC)',
  nguoi_cap_nhat  VARCHAR(40)  NULL COMMENT 'Id tài khoản cập nhật gần nhất',
  CONSTRAINT uq_nhom_quyen_ma UNIQUE (ma),
  CONSTRAINT ck_nhom_quyen_tt CHECK (trang_thai IN ('HOAT_DONG', 'NGUNG'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Nhóm quyền người dùng';

CREATE TABLE ht_nhom_chuc_nang (
  nhom_id       VARCHAR(40) NOT NULL COMMENT 'Id nhóm quyền (ht_nhom.id)',
  chuc_nang_ma  VARCHAR(20) NOT NULL COMMENT 'Mã chức năng (ht_chuc_nang.ma)',
  muc_quyen     VARCHAR(10) NOT NULL COMMENT 'Mức quyền: view=xem, ownView=xem của mình, request=gửi yêu cầu, draft=lập nháp, own=sửa của mình, edit=sửa, approve=duyệt',
  PRIMARY KEY (nhom_id, chuc_nang_ma),
  CONSTRAINT fk_nqcn_nhom FOREIGN KEY (nhom_id) REFERENCES ht_nhom (id) ON DELETE CASCADE,
  CONSTRAINT fk_nqcn_cn FOREIGN KEY (chuc_nang_ma) REFERENCES ht_chuc_nang (ma),
  CONSTRAINT ck_nqcn_muc CHECK (muc_quyen IN ('view', 'ownView', 'request', 'draft', 'own', 'edit', 'approve'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Quyền chi tiết của nhóm theo từng chức năng';

CREATE TABLE ht_nhanvien (
  id                  VARCHAR(40)  NOT NULL PRIMARY KEY COMMENT 'Mã định danh tài khoản (khoá chính)',
  email               VARCHAR(200) NOT NULL COMMENT 'Email / tên đăng nhập (duy nhất)',
  ho_ten              VARCHAR(100) NOT NULL COMMENT 'Họ tên hiển thị',
  mat_khau_bam        VARCHAR(100) NOT NULL COMMENT 'Mật khẩu đã băm BCrypt',
  trang_thai          VARCHAR(20)  NOT NULL DEFAULT 'HOAT_DONG' COMMENT 'Trạng thái: HOAT_DONG=Hoạt động, KHOA=Khoá',
  bat_doi_mk          BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'TRUE = bắt buộc đổi mật khẩu ở lần đăng nhập tới',
  so_lan_sai          INT          NOT NULL DEFAULT 0 COMMENT 'Số lần đăng nhập sai liên tiếp',
  khoa_den            DATETIME(3)  NULL COMMENT 'Khoá đăng nhập tạm (sai 5 lần → 15 phút) đến thời điểm này (DATETIME(3), UTC)',
  lan_dang_nhap_cuoi  DATETIME(3)  NULL COMMENT 'Thời điểm đăng nhập thành công gần nhất (DATETIME(3), UTC)',
  created_at          DATETIME(3)  NOT NULL COMMENT 'Thời điểm tạo bản ghi (DATETIME(3), UTC)',
  updated_at          DATETIME(3)  NOT NULL COMMENT 'Thời điểm cập nhật gần nhất (DATETIME(3), UTC)',
  created_by          VARCHAR(40)  NULL COMMENT 'Id tài khoản tạo bản ghi (ht_nhanvien.id)',
  updated_by          VARCHAR(40)  NULL COMMENT 'Id tài khoản cập nhật gần nhất (ht_nhanvien.id)',
  CONSTRAINT uq_tai_khoan_email UNIQUE (email),
  CONSTRAINT ck_tai_khoan_tt CHECK (trang_thai IN ('HOAT_DONG', 'KHOA'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Tài khoản đăng nhập (nhân viên)';

CREATE TABLE ht_nhanvien_nhom (
  tai_khoan_id  VARCHAR(40) NOT NULL COMMENT 'Id tài khoản (ht_nhanvien.id)',
  nhom_id       VARCHAR(40) NOT NULL COMMENT 'Id nhóm quyền (ht_nhom.id)',
  PRIMARY KEY (tai_khoan_id, nhom_id),
  CONSTRAINT fk_tkn_tk FOREIGN KEY (tai_khoan_id) REFERENCES ht_nhanvien (id) ON DELETE CASCADE,
  CONSTRAINT fk_tkn_nhom FOREIGN KEY (nhom_id) REFERENCES ht_nhom (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Gán tài khoản vào nhóm quyền (nhiều-nhiều)';

CREATE TABLE ht_phien (
  token_hash    CHAR(64)     NOT NULL PRIMARY KEY COMMENT 'SHA-256 của token — không lưu token gốc',
  tai_khoan_id  VARCHAR(40)  NOT NULL COMMENT 'Id tài khoản sở hữu phiên',
  het_han       DATETIME(3)  NOT NULL COMMENT 'Lần hoạt động cuối + 12 giờ (DATETIME(3), UTC)',
  tao_luc       DATETIME(3)  NOT NULL COMMENT 'Thời điểm tạo phiên (DATETIME(3), UTC)',
  dia_chi_ip    VARCHAR(45)  NULL COMMENT 'Địa chỉ IP lúc đăng nhập (IPv4/IPv6)',
  user_agent    VARCHAR(255) NULL COMMENT 'Chuỗi User-Agent của trình duyệt',
  CONSTRAINT fk_phien_tk FOREIGN KEY (tai_khoan_id) REFERENCES ht_nhanvien (id) ON DELETE CASCADE,
  INDEX ix_phien_tk (tai_khoan_id),
  INDEX ix_phien_het_han (het_han)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Phiên đăng nhập đang hoạt động';

CREATE TABLE ht_cau_hinh (
  khoa        VARCHAR(40)  NOT NULL PRIMARY KEY COMMENT 'Khoá tham số, VD TNDN_NGUONG',
  gia_tri     VARCHAR(200) NOT NULL COMMENT 'Giá trị tham số (dạng chuỗi)',
  updated_at  DATETIME(3)  NULL COMMENT 'Thời điểm sửa gần nhất (DATETIME(3), UTC)',
  updated_by  VARCHAR(40)  NULL COMMENT 'Id tài khoản sửa gần nhất'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Tham số cấu hình hệ thống (NT-14)';

CREATE TABLE ht_cau_hinh_log (
  id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'Id tự tăng',
  khoa         VARCHAR(40)  NOT NULL COMMENT 'Khoá tham số đã đổi',
  gia_tri_cu   VARCHAR(200) NOT NULL COMMENT 'Giá trị trước khi đổi',
  gia_tri_moi  VARCHAR(200) NOT NULL COMMENT 'Giá trị sau khi đổi',
  nguoi_sua    VARCHAR(40)  NOT NULL COMMENT 'Id tài khoản sửa',
  ngay_sua     DATETIME(3)  NOT NULL COMMENT 'Thời điểm sửa (DATETIME(3), UTC)',
  INDEX ix_chl_ngay (ngay_sua)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Nhật ký thay đổi tham số cấu hình';

CREATE TABLE ht_bo_dem (
  khoa     VARCHAR(20) NOT NULL PRIMARY KEY COMMENT 'Tiền tố + 2 số năm, VD TC26',
  gia_tri  INT         NOT NULL COMMENT 'Số thứ tự đã cấp gần nhất'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Bộ đếm sinh số phiếu / số chứng từ theo tiền tố và năm';

CREATE TABLE ht_yeu_cau_xoa (
  id             VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh yêu cầu (khoá chính)',
  loai           VARCHAR(30)   NOT NULL COMMENT 'Loại đối tượng cần xoá (PhieuThuChi, HopDongBan, DM_KhachHang…)',
  ma_doi_tuong   VARCHAR(100)  NOT NULL COMMENT 'Mã / id đối tượng cần xoá',
  mo_ta          VARCHAR(500)  NOT NULL DEFAULT '' COMMENT 'Mô tả ngắn đối tượng (chụp lúc gửi)',
  ly_do          VARCHAR(1000) NOT NULL COMMENT 'Lý do xin xoá',
  nguoi_gui      VARCHAR(40)   NOT NULL COMMENT 'Id tài khoản gửi yêu cầu',
  ngay_gui       DATETIME(3)   NOT NULL COMMENT 'Thời điểm gửi (DATETIME(3), UTC)',
  trang_thai     VARCHAR(20)   NOT NULL COMMENT 'Trạng thái: CHO_DUYET=Chờ duyệt, DA_DUYET=Đã duyệt, TU_CHOI=Từ chối, DA_RUT=Đã rút',
  nguoi_duyet    VARCHAR(40)   NULL COMMENT 'Id tài khoản người duyệt (ht_nhanvien.id)',
  ngay_duyet     DATETIME(3)   NULL COMMENT 'Thời điểm duyệt (DATETIME(3), UTC)',
  ly_do_tu_choi  VARCHAR(1000) NULL COMMENT 'Lý do từ chối của người duyệt',
  CONSTRAINT ck_ycx_loai CHECK (loai IN ('PhieuThuChi', 'ChiPhiThucHienHD', 'HopDongBan', 'HopDongMua', 'PhieuKho', 'HopDongPhuTai',
                                         'HoaDon', 'HoSo', 'DongTienPhuTai', 'DM_KhachHang', 'DM_NCC', 'DM_NguonTien', 'DM_LoaiChiPhi',
                                         'DM_Kho', 'DM_LoaiHang')),
  CONSTRAINT ck_ycx_tt CHECK (trang_thai IN ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'DA_RUT')),
  INDEX ix_ycx_doi_tuong (loai, ma_doi_tuong, trang_thai),
  INDEX ix_ycx_tt (trang_thai, ngay_gui)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Yêu cầu xoá đối tượng chờ xét duyệt (NT-11)';

CREATE TABLE ht_nhat_ky (
  id            BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'Id tự tăng',
  luc           DATETIME(3)   NOT NULL COMMENT 'Thời điểm thao tác (DATETIME(3), UTC)',
  tai_khoan_id  VARCHAR(40)   NULL COMMENT 'Id tài khoản thao tác (trống nếu hệ thống)',
  hanh_dong     VARCHAR(80)   NOT NULL COMMENT 'Mã hành động (VD DANG_NHAP, XOA)',
  doi_tuong     VARCHAR(40)   NULL COMMENT 'Loại đối tượng bị tác động',
  ma_doi_tuong  VARCHAR(100)  NULL COMMENT 'Mã / id đối tượng bị tác động',
  mo_ta         VARCHAR(1000) NULL COMMENT 'Mô tả thao tác',
  du_lieu       JSON          NULL COMMENT 'Ảnh bản ghi bị xoá / tham số lệnh (không chứa mật khẩu, token)',
  dia_chi_ip    VARCHAR(45)   NULL COMMENT 'Địa chỉ IP thao tác',
  INDEX ix_audit_luc (luc),
  INDEX ix_audit_doi_tuong (doi_tuong, ma_doi_tuong),
  INDEX ix_audit_tk (tai_khoan_id, luc)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Nhật ký thao tác (audit log)';

-- ── TỆP & HỒ SƠ (NT-12) ────────────────────────────────────────────────────

CREATE TABLE ht_tep_tin (
  id            VARCHAR(40)  NOT NULL PRIMARY KEY COMMENT 'Mã định danh bản ghi (khoá chính)',
  ten           VARCHAR(255) NOT NULL COMMENT 'Tên tệp gốc',
  mime          VARCHAR(100) NOT NULL DEFAULT '' COMMENT 'Kiểu MIME, VD image/png',
  kich_thuoc    BIGINT       NOT NULL COMMENT 'Kích thước tệp (byte)',
  thumb         MEDIUMTEXT   NULL COMMENT 'Ảnh thu nhỏ data URL ≤160px',
  duong_dan     VARCHAR(500) NOT NULL COMMENT 'Khoá lưu trên kho tệp (app.storage.dir)',
  ngay_upload   DATETIME(3)  NOT NULL COMMENT 'Thời điểm tải lên (DATETIME(3), UTC)',
  nguoi_upload  VARCHAR(40)  NOT NULL COMMENT 'Id tài khoản tải lên'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Tệp tải lên (siêu dữ liệu; nội dung nằm ở kho tệp)';

CREATE TABLE ht_ho_so (
  id       VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh bản ghi (khoá chính)',
  chu      VARCHAR(4)    NOT NULL COMMENT 'HDB / HDM / HDPT',
  chu_id   VARCHAR(40)   NOT NULL COMMENT 'Tham chiếu đa hình tới hợp đồng',
  loai     VARCHAR(20)   NOT NULL COMMENT 'Loại hồ sơ: Hợp đồng, BBGH/BBNT, Hoá đơn, Scan khác',
  da_luu   BOOLEAN       NOT NULL DEFAULT FALSE COMMENT 'TRUE = đã lưu bản giấy',
  da_scan  BOOLEAN       NOT NULL DEFAULT FALSE COMMENT 'TRUE = đã scan',
  ghi_chu  VARCHAR(1000) NULL COMMENT 'Ghi chú hồ sơ',
  CONSTRAINT uq_ho_so UNIQUE (chu, chu_id, loai),
  CONSTRAINT ck_ho_so_chu CHECK (chu IN ('HDB', 'HDM', 'HDPT')),
  CONSTRAINT ck_ho_so_loai CHECK (loai IN ('Hợp đồng', 'BBGH/BBNT', 'Hoá đơn', 'Scan khác'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Hồ sơ giấy tờ của hợp đồng (đã lưu / đã scan)';

CREATE TABLE ht_ho_so_tep (
  ho_so_id  VARCHAR(40) NOT NULL COMMENT 'Id hồ sơ (ht_ho_so.id)',
  thu_tu    INT         NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  tep_id    VARCHAR(40) NOT NULL COMMENT 'Id tệp đính kèm (ht_tep_tin.id)',
  PRIMARY KEY (ho_so_id, thu_tu),
  CONSTRAINT fk_hst_hs FOREIGN KEY (ho_so_id) REFERENCES ht_ho_so (id) ON DELETE CASCADE,
  CONSTRAINT fk_hst_tep FOREIGN KEY (tep_id) REFERENCES ht_tep_tin (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Tệp scan đính kèm hồ sơ';

CREATE TABLE ht_hoa_don (
  id            VARCHAR(40) NOT NULL PRIMARY KEY COMMENT 'Mã định danh bản ghi (khoá chính)',
  chu           VARCHAR(4)  NOT NULL COMMENT 'Loại hợp đồng chủ: HDB, HDM hoặc HDPT',
  chu_id        VARCHAR(40) NOT NULL COMMENT 'Id hợp đồng chủ (tham chiếu đa hình theo cột chu)',
  so_hoa_don    VARCHAR(50) NOT NULL COMMENT 'Số hoá đơn',
  ngay_hoa_don  DATE        NOT NULL COMMENT 'Ngày hoá đơn (DATE)',
  gia_tri       BIGINT      NOT NULL DEFAULT 0 COMMENT 'Giá trị hoá đơn sau VAT (VNĐ, BIGINT)',
  tep_id        VARCHAR(40) NULL COMMENT 'Id tệp đính kèm (ht_tep_tin.id)',
  CONSTRAINT ck_hoa_don_chu CHECK (chu IN ('HDB', 'HDM', 'HDPT')),
  CONSTRAINT fk_hoa_don_tep FOREIGN KEY (tep_id) REFERENCES ht_tep_tin (id) ON DELETE SET NULL,
  INDEX ix_hoa_don_chu (chu, chu_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Hoá đơn VAT gắn với hợp đồng';

-- ── DANH MỤC ───────────────────────────────────────────────────────────────

CREATE TABLE kt_nguon_tien (
  id            VARCHAR(20)  NOT NULL PRIMARY KEY COMMENT 'Mã nguồn tiền (khoá chính)',
  ten           VARCHAR(100) NOT NULL COMMENT 'Tên nguồn tiền',
  loai          VARCHAR(20)  NOT NULL COMMENT 'Loại: Tiền mặt hoặc Ngân hàng',
  so_tai_khoan  VARCHAR(50)  NULL COMMENT 'Số tài khoản ngân hàng',
  ngan_hang     VARCHAR(100) NULL COMMENT 'Tên ngân hàng',
  so_du_dau_ky  BIGINT       NOT NULL DEFAULT 0 COMMENT 'Số dư đầu kỳ (VNĐ, BIGINT)',
  ngay_dau_ky   DATE         NULL COMMENT 'Ngày chốt số dư đầu kỳ (DATE)',
  trang_thai    VARCHAR(20)  NOT NULL DEFAULT 'DANG_DUNG' COMMENT 'Trạng thái: DANG_DUNG=Đang dùng, NGUNG=Ngưng',
  CONSTRAINT ck_nguon_tien_loai CHECK (loai IN ('Tiền mặt', 'Ngân hàng')),
  CONSTRAINT ck_nguon_tien_tt CHECK (trang_thai IN ('DANG_DUNG', 'NGUNG'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Danh mục nguồn tiền (quỹ tiền mặt, tài khoản ngân hàng)';

CREATE TABLE kt_loai_chi_phi (
  id         VARCHAR(20)  NOT NULL PRIMARY KEY COMMENT 'Mã loại chi phí (khoá chính), VD VH-VP, CPTH-VC',
  ten        VARCHAR(100) NOT NULL COMMENT 'Tên',
  nhom       VARCHAR(20)  NOT NULL COMMENT 'Nhóm: Vận hành hoặc Thực hiện HĐ',
  dang_dung  BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'TRUE = đang dùng; FALSE = ngưng dùng',
  CONSTRAINT ck_lcp_nhom CHECK (nhom IN ('Vận hành', 'Thực hiện HĐ'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Danh mục loại chi phí';

CREATE TABLE kd_khach_hang (
  id               VARCHAR(20)  NOT NULL PRIMARY KEY COMMENT 'Mã khách hàng (khoá chính)',
  ten              VARCHAR(255) NOT NULL COMMENT 'Tên khách hàng / công ty',
  mst              VARCHAR(20)  NOT NULL DEFAULT '' COMMENT 'Mã số thuế',
  dia_chi          VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'Địa chỉ',
  nguoi_lien_he    VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'Tên người liên hệ chính',
  dien_thoai       VARCHAR(300) NOT NULL DEFAULT '' COMMENT 'Số điện thoại (có thể nhiều số, phân tách dấu phẩy)',
  email            VARCHAR(200) NOT NULL DEFAULT '' COMMENT 'Email liên hệ',
  ghi_chu          TEXT         NULL COMMENT 'Ghi chú tự do',
  trang_thai       VARCHAR(20)  NULL COMMENT 'Trạng thái: DANG_DUNG=Đang dùng, NGUNG=Ngưng (trạng thái danh mục)',
  tinh             VARCHAR(50)  NULL COMMENT 'Tỉnh / thành phố',
  chuc_vu          VARCHAR(100) NULL COMMENT 'Chức vụ người liên hệ',
  phan_loai        VARCHAR(50)  NULL COMMENT 'Phân loại khách hàng',
  nguon            VARCHAR(50)  NULL COMMENT 'Nguồn khách hàng',
  loai_sp          VARCHAR(50)  NULL COMMENT 'Loại sản phẩm quan tâm',
  hinh_thuc_hd     VARCHAR(50)  NULL COMMENT 'Hình thức hợp đồng dự kiến',
  tiep_can         VARCHAR(30)  NULL COMMENT 'Tình trạng tiếp cận: CHUA_LIEN_HE=Chưa liên hệ, DANG_LIEN_HE=Đang liên hệ, HOP_DONG=Hợp đồng, HUY=Huỷ',
  co_hoi           VARCHAR(30)  NULL COMMENT 'Giai đoạn cơ hội: CHUA_TIEP_CAN=Chưa tiếp cận, DA_BAO_GIA=Đã báo giá, DANG_DAM_PHAN=Đang đàm phán, KY_HOP_DONG=Ký hợp đồng, DA_GIAO_HANG=Đã giao hàng, HOAN_THANH=Hoàn thành, HUY=Huỷ',
  phu_trach        VARCHAR(40)  NULL COMMENT 'Sale phụ trách (ht_nhanvien.id); trống = chưa phân bổ',
  trang_thai_data  VARCHAR(20)  NULL COMMENT 'Trạng thái phân bổ data: CHUA_PHAN_BO=Chưa phân bổ, DA_PHAN_BO=Đã phân bổ',
  ngay_tiep_nhan   DATE         NULL COMMENT 'Ngày tiếp nhận data (DATE)',
  ngay_phan_bo     DATE         NULL COMMENT 'Ngày phân bổ cho Sale (DATE)',
  gia_tri_co_hoi   BIGINT       NULL COMMENT 'Giá trị cơ hội dự kiến (VNĐ, BIGINT)',
  la_import        BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'TRUE = bản ghi nhập từ Excel/import; FALSE = tạo trên hệ thống',
  created_at       DATETIME(3)  NOT NULL COMMENT 'Thời điểm tạo bản ghi (DATETIME(3), UTC)',
  updated_at       DATETIME(3)  NOT NULL COMMENT 'Thời điểm cập nhật gần nhất (DATETIME(3), UTC)',
  created_by       VARCHAR(40)  NULL COMMENT 'Id tài khoản tạo bản ghi (ht_nhanvien.id)',
  updated_by       VARCHAR(40)  NULL COMMENT 'Id tài khoản cập nhật gần nhất (ht_nhanvien.id)',
  CONSTRAINT ck_kh_tt CHECK (trang_thai IS NULL OR trang_thai IN ('DANG_DUNG', 'NGUNG')),
  CONSTRAINT ck_kh_tiep_can CHECK (tiep_can IS NULL OR tiep_can IN ('CHUA_LIEN_HE', 'DANG_LIEN_HE', 'HOP_DONG', 'HUY')),
  CONSTRAINT ck_kh_co_hoi CHECK (co_hoi IS NULL OR co_hoi IN ('CHUA_TIEP_CAN', 'DA_BAO_GIA', 'DANG_DAM_PHAN', 'KY_HOP_DONG', 'DA_GIAO_HANG', 'HOAN_THANH', 'HUY')),
  CONSTRAINT ck_kh_ttd CHECK (trang_thai_data IS NULL OR trang_thai_data IN ('CHUA_PHAN_BO', 'DA_PHAN_BO')),
  CONSTRAINT fk_kh_phu_trach FOREIGN KEY (phu_trach) REFERENCES ht_nhanvien (id),
  INDEX ix_kh_mst (mst),
  INDEX ix_kh_ten (ten),
  INDEX ix_kh_phu_trach (phu_trach)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Danh mục khách hàng và theo dõi kinh doanh';

CREATE TABLE kd_cham_soc_kh (
  id             VARCHAR(40) NOT NULL PRIMARY KEY COMMENT 'Mã định danh dòng chăm sóc (khoá chính)',
  khach_hang_id  VARCHAR(20) NOT NULL COMMENT 'Mã khách hàng (kd_khach_hang.id)',
  thu_tu         INT         NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  luc            DATETIME(3) NOT NULL COMMENT 'Thời điểm chăm sóc (DATETIME(3), UTC)',
  nguoi          VARCHAR(40) NOT NULL COMMENT 'Id tài khoản; "Import" với dòng chuyển từ Excel',
  noi_dung       TEXT        NOT NULL COMMENT 'Nội dung chăm sóc',
  co_hoi         VARCHAR(30) NULL COMMENT 'Giai đoạn cơ hội tại thời điểm chăm sóc: CHUA_TIEP_CAN=Chưa tiếp cận, DA_BAO_GIA=Đã báo giá, DANG_DAM_PHAN=Đang đàm phán, KY_HOP_DONG=Ký hợp đồng, DA_GIAO_HANG=Đã giao hàng, HOAN_THANH=Hoàn thành, HUY=Huỷ',
  CONSTRAINT fk_cs_kh FOREIGN KEY (khach_hang_id) REFERENCES kd_khach_hang (id) ON DELETE CASCADE,
  INDEX ix_cs_kh (khach_hang_id, thu_tu)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Nhật ký chăm sóc khách hàng';

CREATE TABLE kd_nha_cung_cap (
  id             VARCHAR(20)  NOT NULL PRIMARY KEY COMMENT 'Mã nhà cung cấp (khoá chính)',
  ten            VARCHAR(255) NOT NULL COMMENT 'Tên nhà cung cấp',
  mst            VARCHAR(20)  NOT NULL DEFAULT '' COMMENT 'Mã số thuế',
  dia_chi        VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'Địa chỉ',
  quoc_gia       VARCHAR(100) NOT NULL DEFAULT '' COMMENT 'Quốc gia',
  nguoi_lien_he  VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'Tên người liên hệ',
  dien_thoai     VARCHAR(300) NOT NULL DEFAULT '' COMMENT 'Số điện thoại (có thể nhiều số, phân tách dấu phẩy)',
  email          VARCHAR(200) NOT NULL DEFAULT '' COMMENT 'Email liên hệ',
  ghi_chu        TEXT         NULL COMMENT 'Ghi chú tự do',
  trang_thai     VARCHAR(20)  NULL COMMENT 'Trạng thái: DANG_DUNG=Đang dùng, NGUNG=Ngưng',
  created_at     DATETIME(3)  NOT NULL COMMENT 'Thời điểm tạo bản ghi (DATETIME(3), UTC)',
  updated_at     DATETIME(3)  NOT NULL COMMENT 'Thời điểm cập nhật gần nhất (DATETIME(3), UTC)',
  created_by     VARCHAR(40)  NULL COMMENT 'Id tài khoản tạo bản ghi (ht_nhanvien.id)',
  updated_by     VARCHAR(40)  NULL COMMENT 'Id tài khoản cập nhật gần nhất (ht_nhanvien.id)',
  CONSTRAINT ck_ncc_tt CHECK (trang_thai IS NULL OR trang_thai IN ('DANG_DUNG', 'NGUNG')),
  INDEX ix_ncc_mst (mst),
  INDEX ix_ncc_ten (ten)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Danh mục nhà cung cấp';

CREATE TABLE kho_vi_tri (
  id         VARCHAR(20)  NOT NULL PRIMARY KEY COMMENT 'Mã kho (khoá chính)',
  ten        VARCHAR(100) NOT NULL COMMENT 'Tên kho',
  loai       VARCHAR(20)  NOT NULL COMMENT 'Loại: Kho thường hoặc Chuyển thẳng (không qua kho)',
  dang_dung  BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'TRUE = đang dùng; FALSE = ngưng dùng',
  CONSTRAINT ck_kho_loai CHECK (loai IN ('Kho thường', 'Chuyển thẳng'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Danh mục kho / vị trí lưu hàng';

CREATE TABLE kho_loai_hang (
  id         VARCHAR(40)  NOT NULL PRIMARY KEY COMMENT 'Mã hàng cố định, VD KC-NO-8L',
  ten        VARCHAR(255) NOT NULL COMMENT 'Tên',
  mo_ta      VARCHAR(500) NULL COMMENT 'Mô tả loại hàng',
  nhom       VARCHAR(30)  NOT NULL COMMENT 'Nhóm: Khí chuẩn, Dung dịch chuẩn, Vỏ bình, Thiết bị tái sử dụng, Phụ kiện',
  dvt        VARCHAR(30)  NOT NULL DEFAULT '' COMMENT 'Đơn vị tính mặc định',
  dang_dung  BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'TRUE = đang dùng; FALSE = ngưng dùng',
  loai_khi   VARCHAR(50)  NULL COMMENT 'Loại khí (với hàng nhóm khí)',
  the_tich   VARCHAR(30)  NULL COMMENT 'Thể tích bình, VD 8L, 40L',
  CONSTRAINT ck_loai_hang_nhom CHECK (nhom IN ('Khí chuẩn', 'Dung dịch chuẩn', 'Vỏ bình', 'Thiết bị tái sử dụng', 'Phụ kiện'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Danh mục loại hàng';

CREATE TABLE kho_loai_hang_thuoc_tinh (
  loai_hang_id  VARCHAR(40)  NOT NULL COMMENT 'Mã loại hàng (kho_loai_hang.id)',
  thu_tu        INT          NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  gia_tri       VARCHAR(100) NOT NULL COMMENT 'Giá trị thuộc tính',
  PRIMARY KEY (loai_hang_id, thu_tu),
  CONSTRAINT fk_lhtt_lh FOREIGN KEY (loai_hang_id) REFERENCES kho_loai_hang (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Giá trị thuộc tính (nồng độ…) của loại hàng';

CREATE TABLE kho_loai_hang_biet_danh (
  loai_hang_id  VARCHAR(40)  NOT NULL COMMENT 'Mã loại hàng (kho_loai_hang.id)',
  thu_tu        INT          NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  gia_tri       VARCHAR(255) NOT NULL COMMENT 'Tên gọi khác dùng để khớp',
  PRIMARY KEY (loai_hang_id, thu_tu),
  CONSTRAINT fk_lhbd_lh FOREIGN KEY (loai_hang_id) REFERENCES kho_loai_hang (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Biệt danh / tên gọi khác của loại hàng';

-- ── KINH DOANH: HỢP ĐỒNG BÁN ───────────────────────────────────────────────

CREATE TABLE kd_hop_dong_ban (
  id                   VARCHAR(40)  NOT NULL PRIMARY KEY COMMENT 'Mã định danh hợp đồng (khoá chính)',
  so_hd                VARCHAR(150) NULL COMMENT 'Số hợp đồng (duy nhất); NULL khi Báo giá chưa có số',
  ma_kh                VARCHAR(20)  NOT NULL COMMENT 'Mã khách hàng (kd_khach_hang.id)',
  ten_kh               VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'Tên khách hàng (chụp tại thời điểm lập)',
  mst                  VARCHAR(20)  NOT NULL DEFAULT '' COMMENT 'Mã số thuế khách hàng',
  dia_chi              VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'Địa chỉ khách hàng',
  ngay_ky              DATE         NULL COMMENT 'Ngày ký hợp đồng (DATE)',
  ngay_hieu_luc        DATE         NULL COMMENT 'Ngày hợp đồng có hiệu lực (DATE)',
  trang_thai           VARCHAR(20)  NOT NULL COMMENT 'Trạng thái: BAO_GIA=Báo giá, HIEU_LUC=Hiệu lực, DANG_GIAO_HANG=Đang giao hàng, HOAN_THANH=Hoàn thành, DA_TAT_TOAN=Đã tất toán, HUY=Huỷ',
  sale                 VARCHAR(40)  NULL COMMENT 'Sale phụ trách (ht_nhanvien.id)',
  ghi_chu              TEXT         NULL COMMENT 'Ghi chú tự do',
  truoc_vat            BIGINT       NOT NULL DEFAULT 0 COMMENT 'Giá trị hợp đồng trước VAT (VNĐ, BIGINT)',
  vat                  TINYINT      NOT NULL DEFAULT 8 COMMENT 'Thuế suất VAT (%): 0, 8 hoặc 10',
  thuc_te_truoc_vat    BIGINT       NOT NULL DEFAULT 0 COMMENT 'Giá trị thực tế trước VAT (VNĐ, BIGINT)',
  ts_nguong            DOUBLE       NOT NULL COMMENT 'Ngưỡng lợi nhuận tính thuế TNDN (DOUBLE, tỷ lệ 0–1)',
  ts_muc1              DOUBLE       NOT NULL COMMENT 'Thuế suất TNDN mức 1 (DOUBLE, tỷ lệ 0–1)',
  ts_muc2              DOUBLE       NOT NULL COMMENT 'Thuế suất TNDN mức 2 (DOUBLE, tỷ lệ 0–1)',
  co_tam_ung           BOOLEAN      NULL COMMENT 'TRUE = hợp đồng có tạm ứng; NULL = chưa xác định',
  phat_hd              BIGINT       NULL COMMENT 'Tiền phạt hợp đồng (VNĐ, BIGINT)',
  ly_do_phat           VARCHAR(1000) NULL COMMENT 'Lý do bị phạt',
  ly_do_huy            VARCHAR(1000) NULL COMMENT 'Lý do huỷ (bắt buộc khi huỷ)',
  ghi_chu_ho_so_thieu  VARCHAR(1000) NULL COMMENT 'Ghi chú hồ sơ còn thiếu',
  tao_luc              DATETIME(3)  NOT NULL COMMENT 'Thời điểm tạo (DATETIME(3), UTC)',
  la_import            BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'TRUE = bản ghi nhập từ Excel/import; FALSE = tạo trên hệ thống',
  created_at           DATETIME(3)  NOT NULL COMMENT 'Thời điểm tạo bản ghi (DATETIME(3), UTC)',
  updated_at           DATETIME(3)  NOT NULL COMMENT 'Thời điểm cập nhật gần nhất (DATETIME(3), UTC)',
  created_by           VARCHAR(40)  NULL COMMENT 'Id tài khoản tạo bản ghi (ht_nhanvien.id)',
  updated_by           VARCHAR(40)  NULL COMMENT 'Id tài khoản cập nhật gần nhất (ht_nhanvien.id)',
  CONSTRAINT uq_hdb_so_hd UNIQUE (so_hd),
  CONSTRAINT ck_hdb_tt CHECK (trang_thai IN ('BAO_GIA', 'HIEU_LUC', 'DANG_GIAO_HANG', 'HOAN_THANH', 'DA_TAT_TOAN', 'HUY')),
  CONSTRAINT ck_hdb_vat CHECK (vat IN (0, 8, 10)),
  CONSTRAINT fk_hdb_kh FOREIGN KEY (ma_kh) REFERENCES kd_khach_hang (id),
  CONSTRAINT fk_hdb_sale FOREIGN KEY (sale) REFERENCES ht_nhanvien (id),
  INDEX ix_hdb_kh (ma_kh),
  INDEX ix_hdb_sale (sale),
  INDEX ix_hdb_tt (trang_thai),
  INDEX ix_hdb_ngay_ky (ngay_ky)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Hợp đồng bán (HĐB) và báo giá';

CREATE TABLE kd_hdb_dong_hang (
  id         VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh dòng (khoá chính)',
  hdb_id     VARCHAR(40)   NOT NULL COMMENT 'Id hợp đồng bán (kd_hop_dong_ban.id)',
  thu_tu     INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  loai_hang  VARCHAR(40)   NULL COMMENT 'Mã loại hàng (kho_loai_hang.id); NULL nếu hàng ngoài danh mục',
  ten_hang   VARCHAR(500)  NOT NULL DEFAULT '' COMMENT 'Tên hàng hiển thị trên chứng từ',
  so_luong   DOUBLE        NOT NULL DEFAULT 0 COMMENT 'Số lượng (DOUBLE)',
  don_gia    DOUBLE        NOT NULL DEFAULT 0 COMMENT 'Đơn giá HĐ trước VAT (VNĐ, DOUBLE)',
  don_gia_th DOUBLE        NOT NULL DEFAULT 0 COMMENT 'Đơn giá thực hiện (giá vốn dự kiến, VNĐ, DOUBLE)',
  ghi_chu    VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  CONSTRAINT fk_hdbdh_hdb FOREIGN KEY (hdb_id) REFERENCES kd_hop_dong_ban (id) ON DELETE CASCADE,
  CONSTRAINT fk_hdbdh_lh FOREIGN KEY (loai_hang) REFERENCES kho_loai_hang (id) ON UPDATE CASCADE,
  INDEX ix_hdbdh_hdb (hdb_id, thu_tu),
  INDEX ix_hdbdh_lh (loai_hang)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Dòng hàng của hợp đồng bán';

-- ── KẾ TOÁN ────────────────────────────────────────────────────────────────

CREATE TABLE kt_phieu_thu_chi (
  id                 VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh phiếu (khoá chính)',
  so_phieu           VARCHAR(20)   NOT NULL COMMENT 'Số phiếu (duy nhất), sinh theo tiền tố + 2 số năm + số thứ tự',
  ngay_lap           DATE          NOT NULL COMMENT 'Ngày lập phiếu (DATE)',
  loai               VARCHAR(30)   NOT NULL COMMENT 'Loại phiếu: Thu, Chi, Tạm ứng, Quyết toán tạm ứng, Luân chuyển',
  nguon_tien         VARCHAR(20)   NULL COMMENT 'Nguồn (Nguồn đi với Luân chuyển); trống khi Nháp chưa chọn',
  nguon_tien_den     VARCHAR(20)   NULL COMMENT 'Nguồn tiền nhận (chỉ với phiếu Luân chuyển)',
  loai_chi_phi       VARCHAR(20)   NULL COMMENT 'Loại chi phí (kt_loai_chi_phi.id)',
  noi_dung           VARCHAR(1000) NOT NULL DEFAULT '' COMMENT 'Nội dung',
  so_tien_thu        BIGINT        NOT NULL DEFAULT 0 COMMENT 'Số tiền thu (VNĐ, BIGINT)',
  so_tien_chi        BIGINT        NOT NULL DEFAULT 0 COMMENT 'Số tiền chi (VNĐ, BIGINT)',
  phieu_tam_ung_goc  VARCHAR(40)   NULL COMMENT 'Phiếu tạm ứng gốc (kt_phieu_thu_chi.id) khi quyết toán tạm ứng',
  so_tien_thuc_chi   BIGINT        NULL COMMENT 'Số tiền thực chi khi quyết toán tạm ứng (VNĐ, BIGINT)',
  nguoi_nhan         VARCHAR(255)  NULL COMMENT 'Tên người nhận tiền',
  nguoi_de_nghi      VARCHAR(40)   NOT NULL DEFAULT '' COMMENT 'Id tài khoản (dữ liệu import có thể là nhãn)',
  trang_thai         VARCHAR(20)   NOT NULL COMMENT 'Trạng thái: NHAP=Nháp, CHO_DUYET=Chờ duyệt, DA_DUYET=Đã duyệt, TU_CHOI=Từ chối',
  nguoi_duyet        VARCHAR(40)   NULL COMMENT 'Id tài khoản người duyệt (ht_nhanvien.id)',
  ngay_duyet         DATETIME(3)   NULL COMMENT 'Thời điểm duyệt (DATETIME(3), UTC)',
  ly_do_tu_choi      VARCHAR(1000) NULL COMMENT 'Lý do từ chối của người duyệt',
  ghi_chu            VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  ps_loai            VARCHAR(20)   NULL COMMENT 'Nguồn phát sinh: HDB-DotTT / HDM-DotTT',
  ps_hd_id           VARCHAR(40)   NULL COMMENT 'Id hợp đồng phát sinh phiếu (HĐ bán hoặc HĐ mua theo ps_loai)',
  ps_dot             INT           NULL COMMENT 'Số đợt thanh toán phát sinh phiếu',
  la_import          BOOLEAN       NOT NULL DEFAULT FALSE COMMENT 'TRUE = bản ghi nhập từ Excel/import; FALSE = tạo trên hệ thống',
  created_at         DATETIME(3)   NOT NULL COMMENT 'Thời điểm tạo bản ghi (DATETIME(3), UTC)',
  updated_at         DATETIME(3)   NOT NULL COMMENT 'Thời điểm cập nhật gần nhất (DATETIME(3), UTC)',
  created_by         VARCHAR(40)   NULL COMMENT 'Id tài khoản tạo bản ghi (ht_nhanvien.id)',
  updated_by         VARCHAR(40)   NULL COMMENT 'Id tài khoản cập nhật gần nhất (ht_nhanvien.id)',
  CONSTRAINT uq_ptc_so_phieu UNIQUE (so_phieu),
  CONSTRAINT ck_ptc_loai CHECK (loai IN ('Thu', 'Chi', 'Tạm ứng', 'Quyết toán tạm ứng', 'Luân chuyển')),
  CONSTRAINT ck_ptc_tt CHECK (trang_thai IN ('NHAP', 'CHO_DUYET', 'DA_DUYET', 'TU_CHOI')),
  CONSTRAINT ck_ptc_ps CHECK (ps_loai IS NULL OR ps_loai IN ('HDB-DotTT', 'HDM-DotTT')),
  CONSTRAINT ck_ptc_tien CHECK (so_tien_thu >= 0 AND so_tien_chi >= 0),
  CONSTRAINT fk_ptc_nguon FOREIGN KEY (nguon_tien) REFERENCES kt_nguon_tien (id),
  CONSTRAINT fk_ptc_nguon_den FOREIGN KEY (nguon_tien_den) REFERENCES kt_nguon_tien (id),
  CONSTRAINT fk_ptc_lcp FOREIGN KEY (loai_chi_phi) REFERENCES kt_loai_chi_phi (id),
  CONSTRAINT fk_ptc_tam_ung FOREIGN KEY (phieu_tam_ung_goc) REFERENCES kt_phieu_thu_chi (id),
  INDEX ix_ptc_tt (trang_thai),
  INDEX ix_ptc_ngay (ngay_lap),
  INDEX ix_ptc_ps (ps_loai, ps_hd_id),
  INDEX ix_ptc_de_nghi (nguoi_de_nghi)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Phiếu thu chi (sổ quỹ)';

CREATE TABLE kt_phieu_thu_chi_lich_su (
  phieu_id   VARCHAR(40)   NOT NULL COMMENT 'Id phiếu (kt_phieu_thu_chi.id)',
  thu_tu     INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  luc        DATETIME(3)   NOT NULL COMMENT 'Thời điểm (DATETIME(3), UTC)',
  nguoi      VARCHAR(40)   NOT NULL COMMENT 'Id tài khoản người thao tác',
  hanh_dong  VARCHAR(20)   NOT NULL COMMENT 'Hành động: Lưu nháp, Gửi duyệt, Rút lại, Duyệt, Từ chối',
  ghi_chu    VARCHAR(1000) NULL COMMENT 'Ghi chú của lần xử lý (VD lý do từ chối)',
  PRIMARY KEY (phieu_id, thu_tu),
  CONSTRAINT ck_ptcls_hd CHECK (hanh_dong IN ('Lưu nháp', 'Gửi duyệt', 'Rút lại', 'Duyệt', 'Từ chối')),
  CONSTRAINT fk_ptcls_p FOREIGN KEY (phieu_id) REFERENCES kt_phieu_thu_chi (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Lịch sử xử lý phiếu thu chi';

CREATE TABLE kt_phieu_thu_chi_tep (
  phieu_id  VARCHAR(40) NOT NULL COMMENT 'Id phiếu (kt_phieu_thu_chi.id)',
  thu_tu    INT         NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  tep_id    VARCHAR(40) NOT NULL COMMENT 'Id tệp đính kèm (ht_tep_tin.id)',
  PRIMARY KEY (phieu_id, thu_tu),
  CONSTRAINT fk_ptct_p FOREIGN KEY (phieu_id) REFERENCES kt_phieu_thu_chi (id) ON DELETE CASCADE,
  CONSTRAINT fk_ptct_tep FOREIGN KEY (tep_id) REFERENCES ht_tep_tin (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Tệp đính kèm phiếu thu chi';

CREATE TABLE kd_hdb_dot_tt (
  hdb_id           VARCHAR(40)   NOT NULL COMMENT 'Id hợp đồng bán (kd_hop_dong_ban.id)',
  thu_tu           INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  dot              INT           NOT NULL COMMENT 'Số đợt thanh toán (1, 2, 3…)',
  ty_le            DOUBLE        NULL COMMENT 'Tỷ lệ phần trăm giá trị hợp đồng của đợt (DOUBLE, %)',
  so_tien          BIGINT        NOT NULL DEFAULT 0 COMMENT 'Số tiền phải thu của đợt (VNĐ, BIGINT)',
  han              DATE          NULL COMMENT 'Hạn thu (DATE)',
  han_ngay         INT           NULL COMMENT 'Hạn = Ngày hiệu lực + N ngày',
  ngay_thu         DATE          NULL COMMENT 'Ngày thực thu (DATE)',
  so_tien_thu      BIGINT        NULL COMMENT 'Số tiền thực thu (VNĐ, BIGINT)',
  nguon_tien_nhan  VARCHAR(20)   NULL COMMENT 'Nguồn tiền nhận (kt_nguon_tien.id)',
  ghi_chu          VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  phieu_thu_id     VARCHAR(40)   NULL COMMENT 'Phiếu thu sinh ra (kt_phieu_thu_chi.id)',
  PRIMARY KEY (hdb_id, thu_tu),
  CONSTRAINT fk_hdbdot_hdb FOREIGN KEY (hdb_id) REFERENCES kd_hop_dong_ban (id) ON DELETE CASCADE,
  CONSTRAINT fk_hdbdot_nguon FOREIGN KEY (nguon_tien_nhan) REFERENCES kt_nguon_tien (id),
  CONSTRAINT fk_hdbdot_phieu FOREIGN KEY (phieu_thu_id) REFERENCES kt_phieu_thu_chi (id),
  INDEX ix_hdbdot_phieu (phieu_thu_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Đợt thanh toán của hợp đồng bán';

CREATE TABLE kt_chi_phi_hd (
  id                 VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh chi phí (khoá chính)',
  ma_cp              VARCHAR(20)   NOT NULL COMMENT 'Mã chi phí (duy nhất), sinh theo tiền tố + 2 số năm + số thứ tự',
  hdb_id             VARCHAR(40)   NULL COMMENT 'Trống khi Nháp chưa chọn HĐ',
  ngay               DATE          NOT NULL COMMENT 'Ngày phát sinh chi phí (DATE)',
  loai_chi_phi       VARCHAR(20)   NULL COMMENT 'Loại chi phí (kt_loai_chi_phi.id)',
  noi_dung           VARCHAR(1000) NOT NULL DEFAULT '' COMMENT 'Nội dung',
  so_tien            BIGINT        NOT NULL DEFAULT 0 COMMENT 'Số tiền (VNĐ, BIGINT)',
  nguon_tien         VARCHAR(20)   NULL COMMENT 'Nguồn tiền (kt_nguon_tien.id)',
  nguoi_thuc_hien    VARCHAR(40)   NOT NULL DEFAULT '' COMMENT 'Id tài khoản người thực hiện chi',
  nguoi_nhan         VARCHAR(255)  NULL COMMENT 'Tên người nhận tiền',
  don_vi_van_chuyen  VARCHAR(255)  NULL COMMENT 'Đơn vị vận chuyển (với chi phí vận chuyển)',
  trang_thai         VARCHAR(20)   NOT NULL COMMENT 'Trạng thái: NHAP=Nháp, CHO_DUYET=Chờ duyệt, DA_DUYET=Đã duyệt, TU_CHOI=Từ chối',
  nguoi_duyet        VARCHAR(40)   NULL COMMENT 'Id tài khoản người duyệt (ht_nhanvien.id)',
  ngay_duyet         DATETIME(3)   NULL COMMENT 'Thời điểm duyệt (DATETIME(3), UTC)',
  ly_do_tu_choi      VARCHAR(1000) NULL COMMENT 'Lý do từ chối của người duyệt',
  ghi_chu            VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  created_at         DATETIME(3)   NOT NULL COMMENT 'Thời điểm tạo bản ghi (DATETIME(3), UTC)',
  updated_at         DATETIME(3)   NOT NULL COMMENT 'Thời điểm cập nhật gần nhất (DATETIME(3), UTC)',
  created_by         VARCHAR(40)   NULL COMMENT 'Id tài khoản tạo bản ghi (ht_nhanvien.id)',
  updated_by         VARCHAR(40)   NULL COMMENT 'Id tài khoản cập nhật gần nhất (ht_nhanvien.id)',
  CONSTRAINT uq_cp_ma UNIQUE (ma_cp),
  CONSTRAINT ck_cp_tt CHECK (trang_thai IN ('NHAP', 'CHO_DUYET', 'DA_DUYET', 'TU_CHOI')),
  CONSTRAINT ck_cp_tien CHECK (so_tien >= 0),
  CONSTRAINT fk_cp_hdb FOREIGN KEY (hdb_id) REFERENCES kd_hop_dong_ban (id),
  CONSTRAINT fk_cp_lcp FOREIGN KEY (loai_chi_phi) REFERENCES kt_loai_chi_phi (id),
  CONSTRAINT fk_cp_nguon FOREIGN KEY (nguon_tien) REFERENCES kt_nguon_tien (id),
  INDEX ix_cp_hdb (hdb_id),
  INDEX ix_cp_tt (trang_thai),
  INDEX ix_cp_ngay (ngay)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Chi phí thực hiện hợp đồng bán';

CREATE TABLE kt_chi_phi_hd_lich_su (
  chi_phi_id  VARCHAR(40)   NOT NULL COMMENT 'Id chi phí (kt_chi_phi_hd.id)',
  thu_tu      INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  luc         DATETIME(3)   NOT NULL COMMENT 'Thời điểm (DATETIME(3), UTC)',
  nguoi       VARCHAR(40)   NOT NULL COMMENT 'Id tài khoản người thao tác',
  hanh_dong   VARCHAR(20)   NOT NULL COMMENT 'Hành động: Lưu nháp, Gửi duyệt, Rút lại, Duyệt, Từ chối',
  ghi_chu     VARCHAR(1000) NULL COMMENT 'Ghi chú của lần xử lý (VD lý do từ chối)',
  PRIMARY KEY (chi_phi_id, thu_tu),
  CONSTRAINT ck_cpls_hd CHECK (hanh_dong IN ('Lưu nháp', 'Gửi duyệt', 'Rút lại', 'Duyệt', 'Từ chối')),
  CONSTRAINT fk_cpls_cp FOREIGN KEY (chi_phi_id) REFERENCES kt_chi_phi_hd (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Lịch sử xử lý chi phí thực hiện HĐ';

CREATE TABLE kt_chi_phi_hd_tep (
  chi_phi_id  VARCHAR(40) NOT NULL COMMENT 'Id chi phí (kt_chi_phi_hd.id)',
  thu_tu      INT         NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  tep_id      VARCHAR(40) NOT NULL COMMENT 'Id tệp đính kèm (ht_tep_tin.id)',
  PRIMARY KEY (chi_phi_id, thu_tu),
  CONSTRAINT fk_cpt_cp FOREIGN KEY (chi_phi_id) REFERENCES kt_chi_phi_hd (id) ON DELETE CASCADE,
  CONSTRAINT fk_cpt_tep FOREIGN KEY (tep_id) REFERENCES ht_tep_tin (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Tệp đính kèm chi phí thực hiện HĐ';

-- ── VIỆC ĐƯỢC GIAO (TD-01) ────────────────────────────────────────────────

CREATE TABLE cv_viec (
  id         VARCHAR(40) NOT NULL PRIMARY KEY COMMENT 'Mã định danh bản ghi (khoá chính)',
  noi_dung   TEXT        NOT NULL COMMENT 'Nội dung công việc',
  nguoi_tao  VARCHAR(40) NOT NULL COMMENT 'Id tài khoản người giao việc',
  tao_luc    DATETIME(3) NOT NULL COMMENT 'Thời điểm tạo (DATETIME(3), UTC)',
  hdb_id     VARCHAR(40) NULL COMMENT 'Hợp đồng bán liên quan (nếu có)',
  han        DATE        NULL COMMENT 'Ngày đến hạn (DATE)',
  gio        VARCHAR(5)  NULL COMMENT 'Giờ hẹn, định dạng HH:mm',
  uu_tien    BOOLEAN     NOT NULL DEFAULT FALSE COMMENT 'TRUE = việc ưu tiên',
  xong_luc   DATETIME(3) NULL COMMENT 'Thời điểm hoàn thành (DATETIME(3), UTC); NULL = chưa xong',
  nguoi_xong VARCHAR(40) NULL COMMENT 'Id tài khoản đánh dấu hoàn thành',
  CONSTRAINT fk_vg_tao FOREIGN KEY (nguoi_tao) REFERENCES ht_nhanvien (id),
  CONSTRAINT fk_vg_hdb FOREIGN KEY (hdb_id) REFERENCES kd_hop_dong_ban (id),
  INDEX ix_vg_han (han),
  INDEX ix_vg_hdb (hdb_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Việc được giao / lịch hẹn (TD-01)';

CREATE TABLE cv_viec_nguoi_nhan (
  viec_id       VARCHAR(40) NOT NULL COMMENT 'Id việc (cv_viec.id)',
  thu_tu        INT         NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  tai_khoan_id  VARCHAR(40) NOT NULL COMMENT 'Id tài khoản được giao (ht_nhanvien.id)',
  PRIMARY KEY (viec_id, thu_tu),
  CONSTRAINT fk_vgnn_v FOREIGN KEY (viec_id) REFERENCES cv_viec (id) ON DELETE CASCADE,
  CONSTRAINT fk_vgnn_tk FOREIGN KEY (tai_khoan_id) REFERENCES ht_nhanvien (id),
  INDEX ix_vgnn_tk (tai_khoan_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Người nhận việc';

CREATE TABLE cv_viec_phan_hoi (
  viec_id   VARCHAR(40) NOT NULL COMMENT 'Id việc (cv_viec.id)',
  thu_tu    INT         NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  nguoi     VARCHAR(40) NOT NULL COMMENT 'Id tài khoản người thao tác',
  luc       DATETIME(3) NOT NULL COMMENT 'Thời điểm (DATETIME(3), UTC)',
  noi_dung  TEXT        NOT NULL COMMENT 'Nội dung phản hồi',
  he_thong  BOOLEAN     NULL COMMENT 'TRUE = dòng do hệ thống tự ghi',
  PRIMARY KEY (viec_id, thu_tu),
  CONSTRAINT fk_vgph_v FOREIGN KEY (viec_id) REFERENCES cv_viec (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Phản hồi / trao đổi trong việc';

-- ── ĐỀ NGHỊ CẤP VẬT TƯ ─────────────────────────────────────────────────────

CREATE TABLE kd_de_nghi_vat_tu (
  id             VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh đề nghị (khoá chính)',
  so_phieu       VARCHAR(20)   NOT NULL COMMENT 'Số phiếu (duy nhất), sinh theo tiền tố + 2 số năm + số thứ tự',
  ngay           DATE          NOT NULL COMMENT 'Ngày đề nghị (DATE)',
  hdb_id         VARCHAR(40)   NOT NULL COMMENT 'Id hợp đồng bán (kd_hop_dong_ban.id)',
  nguoi_de_nghi  VARCHAR(40)   NOT NULL COMMENT 'Id tài khoản người đề nghị / lập phiếu (ht_nhanvien.id)',
  ghi_chu        VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  ly_do_huy      VARCHAR(1000) NULL COMMENT 'Lý do huỷ đề nghị',
  CONSTRAINT uq_dnvt_so UNIQUE (so_phieu),
  CONSTRAINT fk_dnvt_hdb FOREIGN KEY (hdb_id) REFERENCES kd_hop_dong_ban (id),
  INDEX ix_dnvt_hdb (hdb_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Đề nghị cấp vật tư theo hợp đồng bán';

CREATE TABLE kd_de_nghi_vat_tu_dong (
  id           VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh dòng (khoá chính)',
  dnvt_id      VARCHAR(40)   NOT NULL COMMENT 'Id đề nghị (kd_de_nghi_vat_tu.id)',
  thu_tu       INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  loai_hang    VARCHAR(40)   NOT NULL COMMENT 'Mã loại hàng (kho_loai_hang.id)',
  ten_hang     VARCHAR(500)  NOT NULL DEFAULT '' COMMENT 'Tên hàng hiển thị trên chứng từ',
  so_luong     DOUBLE        NOT NULL COMMENT 'Số lượng (DOUBLE)',
  ghi_chu      VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  dong_ban_id  VARCHAR(40)   NULL COMMENT 'Tham chiếu mềm tới hdb_dong_hang.id',
  CONSTRAINT fk_dnvtd_dn FOREIGN KEY (dnvt_id) REFERENCES kd_de_nghi_vat_tu (id) ON DELETE CASCADE,
  CONSTRAINT fk_dnvtd_lh FOREIGN KEY (loai_hang) REFERENCES kho_loai_hang (id) ON UPDATE CASCADE,
  INDEX ix_dnvtd_dn (dnvt_id, thu_tu)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Dòng hàng của đề nghị cấp vật tư';

-- ── KINH DOANH: HỢP ĐỒNG MUA ───────────────────────────────────────────────

CREATE TABLE kd_hop_dong_mua (
  id                   VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh hợp đồng (khoá chính)',
  so_hd                VARCHAR(150)  NOT NULL COMMENT 'Số hợp đồng (duy nhất)',
  ma_ncc               VARCHAR(20)   NOT NULL COMMENT 'Mã nhà cung cấp (kd_nha_cung_cap.id)',
  ten_ncc              VARCHAR(255)  NOT NULL DEFAULT '' COMMENT 'Tên nhà cung cấp (chụp tại thời điểm lập)',
  dia_chi              VARCHAR(500)  NOT NULL DEFAULT '' COMMENT 'Địa chỉ nhà cung cấp',
  mst                  VARCHAR(20)   NOT NULL DEFAULT '' COMMENT 'Mã số thuế nhà cung cấp',
  ngay_ky              DATE          NULL COMMENT 'Ngày ký hợp đồng (DATE)',
  hdb_id               VARCHAR(40)   NULL COMMENT 'HĐ bán liên quan (kd_hop_dong_ban.id)',
  thuoc_phu_tai        BOOLEAN       NOT NULL DEFAULT FALSE COMMENT 'TRUE = HĐ mua là giá đầu vào của HĐ Phú Tài',
  trang_thai           VARCHAR(20)   NOT NULL COMMENT 'Trạng thái: NHAP=Nháp, DA_KY=Đã ký, DANG_NHAN_HANG=Đang nhận hàng, DA_NHAN_DU=Đã nhận đủ, DA_TAT_TOAN=Đã tất toán, HUY=Huỷ',
  ghi_chu              TEXT          NULL COMMENT 'Ghi chú tự do',
  nhap_tay             BOOLEAN       NOT NULL DEFAULT FALSE COMMENT 'TRUE = tổng giá trị nhập tay thay vì cộng từ dòng hàng',
  tong_nhap_tay        BIGINT        NULL COMMENT 'Tổng giá trị nhập tay (VNĐ, BIGINT)',
  ly_do_nhap_tay       VARCHAR(1000) NULL COMMENT 'Lý do nhập tổng giá trị bằng tay',
  xuat_hoa_don         VARCHAR(5)    NOT NULL DEFAULT 'Chưa' COMMENT 'Đã xuất hoá đơn: Đã hoặc Chưa',
  ghi_chu_ho_so_thieu  VARCHAR(1000) NULL COMMENT 'Ghi chú hồ sơ còn thiếu',
  tao_luc              DATETIME(3)   NOT NULL COMMENT 'Thời điểm tạo (DATETIME(3), UTC)',
  la_import            BOOLEAN       NOT NULL DEFAULT FALSE COMMENT 'TRUE = bản ghi nhập từ Excel/import; FALSE = tạo trên hệ thống',
  created_at           DATETIME(3)   NOT NULL COMMENT 'Thời điểm tạo bản ghi (DATETIME(3), UTC)',
  updated_at           DATETIME(3)   NOT NULL COMMENT 'Thời điểm cập nhật gần nhất (DATETIME(3), UTC)',
  created_by           VARCHAR(40)   NULL COMMENT 'Id tài khoản tạo bản ghi (ht_nhanvien.id)',
  updated_by           VARCHAR(40)   NULL COMMENT 'Id tài khoản cập nhật gần nhất (ht_nhanvien.id)',
  CONSTRAINT uq_hdm_so_hd UNIQUE (so_hd),
  CONSTRAINT ck_hdm_tt CHECK (trang_thai IN ('NHAP', 'DA_KY', 'DANG_NHAN_HANG', 'DA_NHAN_DU', 'DA_TAT_TOAN', 'HUY')),
  CONSTRAINT ck_hdm_xhd CHECK (xuat_hoa_don IN ('Đã', 'Chưa')),
  CONSTRAINT fk_hdm_ncc FOREIGN KEY (ma_ncc) REFERENCES kd_nha_cung_cap (id),
  CONSTRAINT fk_hdm_hdb FOREIGN KEY (hdb_id) REFERENCES kd_hop_dong_ban (id),
  INDEX ix_hdm_ncc (ma_ncc),
  INDEX ix_hdm_hdb (hdb_id),
  INDEX ix_hdm_tt (trang_thai)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Hợp đồng mua (HĐM) từ nhà cung cấp';

CREATE TABLE kd_hdm_dong_hang (
  id         VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh dòng (khoá chính)',
  hdm_id     VARCHAR(40)   NOT NULL COMMENT 'Id hợp đồng mua (kd_hop_dong_mua.id)',
  thu_tu     INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  loai_hang  VARCHAR(40)   NOT NULL COMMENT 'Mã loại hàng (kho_loai_hang.id)',
  ten_hang   VARCHAR(500)  NOT NULL DEFAULT '' COMMENT 'Tên hàng hiển thị trên chứng từ',
  thong_so   VARCHAR(500)  NOT NULL DEFAULT '' COMMENT 'Thông số kỹ thuật / quy cách',
  so_luong   DOUBLE        NOT NULL COMMENT 'Số lượng (DOUBLE)',
  dvt        VARCHAR(30)   NOT NULL DEFAULT '' COMMENT 'Đơn vị tính',
  don_gia    DOUBLE        NOT NULL DEFAULT 0 COMMENT 'Theo loại tiền của dòng (DOUBLE)',
  loai_tien  VARCHAR(5)    NOT NULL DEFAULT 'VNĐ' COMMENT 'Loại tiền: VNĐ, USD hoặc RMB',
  ty_gia     DOUBLE        NOT NULL DEFAULT 1 COMMENT 'Tỷ giá quy đổi sang VNĐ (DOUBLE; VNĐ = 1)',
  ghi_chu    VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  dnvt_id    VARCHAR(40)   NULL COMMENT 'Tham chiếu mềm đề nghị cấp vật tư',
  dnvt_dong  VARCHAR(40)   NULL COMMENT 'Id dòng đề nghị cấp vật tư (tham chiếu mềm)',
  hdb_id     VARCHAR(40)   NULL COMMENT 'HĐ bán mà dòng này mua cho',
  CONSTRAINT ck_hdmdh_tien CHECK (loai_tien IN ('VNĐ', 'USD', 'RMB')),
  CONSTRAINT fk_hdmdh_hdm FOREIGN KEY (hdm_id) REFERENCES kd_hop_dong_mua (id) ON DELETE CASCADE,
  CONSTRAINT fk_hdmdh_lh FOREIGN KEY (loai_hang) REFERENCES kho_loai_hang (id) ON UPDATE CASCADE,
  CONSTRAINT fk_hdmdh_hdb FOREIGN KEY (hdb_id) REFERENCES kd_hop_dong_ban (id),
  INDEX ix_hdmdh_hdm (hdm_id, thu_tu),
  INDEX ix_hdmdh_dnvt (dnvt_id),
  INDEX ix_hdmdh_hdb (hdb_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Dòng hàng của hợp đồng mua';

CREATE TABLE kd_hdm_dot_tt (
  hdm_id        VARCHAR(40)   NOT NULL COMMENT 'Id hợp đồng mua (kd_hop_dong_mua.id)',
  thu_tu        INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  dot           INT           NOT NULL COMMENT 'Số đợt thanh toán (1, 2, 3…)',
  ty_le         DOUBLE        NULL COMMENT 'Tỷ lệ phần trăm giá trị hợp đồng của đợt (DOUBLE, %)',
  so_tien       BIGINT        NOT NULL DEFAULT 0 COMMENT 'Số tiền phải trả của đợt (VNĐ, BIGINT)',
  han_moc       VARCHAR(30)   NULL COMMENT 'Mốc tính hạn trả (VD ngày ký, ngày nhận hàng)',
  han_ngay      INT           NULL COMMENT 'Hạn = mốc + N ngày',
  han           DATE          NULL COMMENT 'Hạn trả (DATE)',
  ngay_tra      DATE          NULL COMMENT 'Ngày thực trả (DATE)',
  so_tien_tra   BIGINT        NULL COMMENT 'Số tiền thực trả (VNĐ, BIGINT)',
  nguon_tien    VARCHAR(20)   NULL COMMENT 'Nguồn tiền chi (kt_nguon_tien.id)',
  phieu_chi_id  VARCHAR(40)   NULL COMMENT 'Phiếu chi sinh ra (kt_phieu_thu_chi.id)',
  ghi_chu       VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  PRIMARY KEY (hdm_id, thu_tu),
  CONSTRAINT fk_hdmdot_hdm FOREIGN KEY (hdm_id) REFERENCES kd_hop_dong_mua (id) ON DELETE CASCADE,
  CONSTRAINT fk_hdmdot_nguon FOREIGN KEY (nguon_tien) REFERENCES kt_nguon_tien (id),
  CONSTRAINT fk_hdmdot_phieu FOREIGN KEY (phieu_chi_id) REFERENCES kt_phieu_thu_chi (id),
  INDEX ix_hdmdot_phieu (phieu_chi_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Đợt thanh toán của hợp đồng mua (trả NCC)';

CREATE TABLE kd_hdm_checklist (
  hdm_id  VARCHAR(40) NOT NULL COMMENT 'Id hợp đồng mua (kd_hop_dong_mua.id)',
  thu_tu  INT         NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  ten     VARCHAR(50) NOT NULL COMMENT 'Tên mục checklist',
  xong    BOOLEAN     NOT NULL DEFAULT FALSE COMMENT 'TRUE = đã hoàn thành',
  ngay    DATE        NULL COMMENT 'Ngày hoàn thành (DATE)',
  PRIMARY KEY (hdm_id, thu_tu),
  CONSTRAINT fk_hdmcl_hdm FOREIGN KEY (hdm_id) REFERENCES kd_hop_dong_mua (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Checklist hồ sơ / bước xử lý của hợp đồng mua';

-- ── KHO ────────────────────────────────────────────────────────────────────

CREATE TABLE kho_kiem_ke (
  id               VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh đợt kiểm kê (khoá chính)',
  so_phieu         VARCHAR(20)   NOT NULL COMMENT 'Số phiếu (duy nhất), sinh theo tiền tố + 2 số năm + số thứ tự',
  ngay             DATE          NOT NULL COMMENT 'Ngày kiểm kê (DATE)',
  kho              VARCHAR(20)   NOT NULL COMMENT 'Kho kiểm kê (kho_vi_tri.id)',
  nguoi_thuc_hien  VARCHAR(40)   NOT NULL COMMENT 'Id tài khoản người thực hiện (ht_nhanvien.id)',
  ghi_chu          VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  CONSTRAINT uq_kk_so UNIQUE (so_phieu),
  CONSTRAINT fk_kk_kho FOREIGN KEY (kho) REFERENCES kho_vi_tri (id),
  INDEX ix_kk_ngay (ngay)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Đợt kiểm kê kho';

CREATE TABLE kho_kiem_ke_dong (
  kiem_ke_id  VARCHAR(40)   NOT NULL COMMENT 'Id đợt kiểm kê (kho_kiem_ke.id)',
  thu_tu      INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  loai_hang   VARCHAR(40)   NOT NULL COMMENT 'Mã loại hàng (kho_loai_hang.id)',
  so_luong    DOUBLE        NOT NULL COMMENT 'Số lượng thực tế kiểm đếm (DOUBLE)',
  ten_hang    VARCHAR(255)  NULL COMMENT 'Tên hàng ghi nhận khi kiểm',
  xuat_xu     VARCHAR(255)  NULL COMMENT 'Xuất xứ',
  nong_do     VARCHAR(255)  NULL COMMENT 'Nồng độ / quy cách khí',
  ghi_chu     VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  PRIMARY KEY (kiem_ke_id, thu_tu),
  CONSTRAINT fk_kkd_kk FOREIGN KEY (kiem_ke_id) REFERENCES kho_kiem_ke (id) ON DELETE CASCADE,
  CONSTRAINT fk_kkd_lh FOREIGN KEY (loai_hang) REFERENCES kho_loai_hang (id) ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Dòng kết quả kiểm kê';

CREATE TABLE kho_kiem_ke_phieu_dc (
  kiem_ke_id     VARCHAR(40) NOT NULL COMMENT 'Id đợt kiểm kê (kho_kiem_ke.id)',
  thu_tu         INT         NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  phieu_kho_id   VARCHAR(40) NOT NULL COMMENT 'Phiếu điều chỉnh đã sinh (tham chiếu mềm)',
  PRIMARY KEY (kiem_ke_id, thu_tu),
  CONSTRAINT fk_kkpdc_kk FOREIGN KEY (kiem_ke_id) REFERENCES kho_kiem_ke (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Phiếu điều chỉnh sinh ra từ đợt kiểm kê';

CREATE TABLE kho_phieu (
  id               VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh phiếu (khoá chính)',
  so_phieu         VARCHAR(20)   NOT NULL COMMENT 'Số phiếu (duy nhất), sinh theo tiền tố + 2 số năm + số thứ tự',
  ngay             DATE          NOT NULL COMMENT 'Ngày phiếu (DATE)',
  loai             VARCHAR(5)    NOT NULL COMMENT 'Loại phiếu: Nhập hoặc Xuất',
  nguon_goc        VARCHAR(30)   NOT NULL COMMENT 'Nguồn gốc: Tự động HĐ Mua, Tự động HĐ Bán, Nhập tay – điều chỉnh',
  hd_id            VARCHAR(40)   NULL COMMENT 'HĐ mua (phiếu nhập) / HĐ bán (phiếu xuất) — đa hình',
  kho              VARCHAR(20)   NOT NULL COMMENT 'Mã kho (kho_vi_tri.id)',
  ly_do            VARCHAR(1000) NULL COMMENT 'Lý do (với phiếu điều chỉnh)',
  nguoi_thuc_hien  VARCHAR(40)   NOT NULL COMMENT 'Id tài khoản người thực hiện (ht_nhanvien.id)',
  trang_thai       VARCHAR(10)   NOT NULL COMMENT 'Trạng thái: HIEU_LUC=Hiệu lực, DA_HUY=Đã huỷ',
  ghi_chu          VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  so_hoa_don       VARCHAR(50)   NULL COMMENT 'Số hoá đơn của nhà cung cấp (phiếu nhập)',
  ncc              VARCHAR(20)   NULL COMMENT 'Nhà cung cấp (kd_nha_cung_cap.id)',
  kiem_ke_id       VARCHAR(40)   NULL COMMENT 'Tham chiếu mềm đợt kiểm kê',
  created_at       DATETIME(3)   NOT NULL COMMENT 'Thời điểm tạo bản ghi (DATETIME(3), UTC)',
  updated_at       DATETIME(3)   NOT NULL COMMENT 'Thời điểm cập nhật gần nhất (DATETIME(3), UTC)',
  created_by       VARCHAR(40)   NULL COMMENT 'Id tài khoản tạo bản ghi (ht_nhanvien.id)',
  updated_by       VARCHAR(40)   NULL COMMENT 'Id tài khoản cập nhật gần nhất (ht_nhanvien.id)',
  CONSTRAINT uq_pk_so UNIQUE (so_phieu),
  CONSTRAINT ck_pk_loai CHECK (loai IN ('Nhập', 'Xuất')),
  CONSTRAINT ck_pk_ng CHECK (nguon_goc IN ('Tự động HĐ Mua', 'Tự động HĐ Bán', 'Nhập tay – điều chỉnh')),
  CONSTRAINT ck_pk_tt CHECK (trang_thai IN ('HIEU_LUC', 'DA_HUY')),
  CONSTRAINT fk_pk_kho FOREIGN KEY (kho) REFERENCES kho_vi_tri (id),
  CONSTRAINT fk_pk_ncc FOREIGN KEY (ncc) REFERENCES kd_nha_cung_cap (id),
  INDEX ix_pk_hd (hd_id),
  INDEX ix_pk_ngay (ngay),
  INDEX ix_pk_loai_tt (loai, trang_thai),
  INDEX ix_pk_kk (kiem_ke_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Phiếu nhập / xuất kho';

CREATE TABLE kho_phieu_dong (
  phieu_id     VARCHAR(40)   NOT NULL COMMENT 'Id phiếu (kho_phieu.id)',
  thu_tu       INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  loai_hang    VARCHAR(40)   NOT NULL COMMENT 'Mã loại hàng (kho_loai_hang.id)',
  thuoc_tinh   VARCHAR(500)  NOT NULL DEFAULT '' COMMENT 'Quy cách / nồng độ của lô',
  so_luong     DOUBLE        NOT NULL COMMENT 'Số lượng (DOUBLE, ≥ 0)',
  lo           VARCHAR(40)   NULL COMMENT 'Nhập: mã lô sinh ra; Xuất: mã lô bị trừ',
  don_gia      DOUBLE        NULL COMMENT 'Nhập: đơn giá lô chưa VAT (VNĐ, DOUBLE)',
  vat          DOUBLE        NULL COMMENT 'Thuế suất VAT của dòng nhập (%)',
  dong_hdm_id  VARCHAR(40)   NULL COMMENT 'Tham chiếu mềm hdm_dong_hang.id',
  don_gia_goc  DOUBLE        NULL COMMENT 'Xuất: giá vốn = đơn giá lô (VNĐ, DOUBLE)',
  ten_tren_hd  VARCHAR(500)  NULL COMMENT 'Tên hàng ghi trên hoá đơn',
  ghi_chu      VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  PRIMARY KEY (phieu_id, thu_tu),
  CONSTRAINT ck_pkd_sl CHECK (so_luong >= 0),
  CONSTRAINT fk_pkd_pk FOREIGN KEY (phieu_id) REFERENCES kho_phieu (id) ON DELETE CASCADE,
  CONSTRAINT fk_pkd_lh FOREIGN KEY (loai_hang) REFERENCES kho_loai_hang (id) ON UPDATE CASCADE,
  INDEX ix_pkd_lo (lo),
  INDEX ix_pkd_lh (loai_hang),
  INDEX ix_pkd_dong_hdm (dong_hdm_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Dòng hàng của phiếu kho';

CREATE TABLE kho_anh_xa_ten (
  id         VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh (khoá chính)',
  ten        VARCHAR(500)  NOT NULL COMMENT 'Tên hàng gốc cần ánh xạ',
  the_tich   VARCHAR(50)   NULL COMMENT 'Thể tích bình',
  nong_do    VARCHAR(500)  NULL COMMENT 'Nồng độ / quy cách khí',
  tong_sl    DOUBLE        NOT NULL DEFAULT 0 COMMENT 'Tổng số lượng đã gặp (DOUBLE)',
  so_lan     INT           NOT NULL DEFAULT 0 COMMENT 'Số lần xuất hiện',
  loai_hang  VARCHAR(40)   NULL COMMENT 'Loại hàng chuẩn được ánh xạ (kho_loai_hang.id)',
  lo         VARCHAR(40)   NULL COMMENT 'Mã lô hàng',
  ghi_chu    VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  CONSTRAINT fk_ax_lh FOREIGN KEY (loai_hang) REFERENCES kho_loai_hang (id) ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Ánh xạ tên hàng nhập tay sang loại hàng chuẩn';

-- ── PHÚ TÀI ────────────────────────────────────────────────────────────────

CREATE TABLE pt_hop_dong (
  id                   VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh hợp đồng (khoá chính)',
  so_hd                VARCHAR(150)  NOT NULL COMMENT 'Số hợp đồng (duy nhất)',
  ma_kh                VARCHAR(20)   NOT NULL COMMENT 'Mã khách hàng (kd_khach_hang.id)',
  ten_kh               VARCHAR(255)  NOT NULL DEFAULT '' COMMENT 'Tên khách hàng (chụp tại thời điểm lập)',
  mst                  VARCHAR(20)   NOT NULL DEFAULT '' COMMENT 'Mã số thuế',
  ngay_ky              DATE          NULL COMMENT 'Ngày ký hợp đồng (DATE)',
  ngay_hieu_luc        DATE          NULL COMMENT 'Ngày hợp đồng có hiệu lực (DATE)',
  trang_thai           VARCHAR(20)   NOT NULL COMMENT 'Trạng thái: BAO_GIA=Báo giá, HIEU_LUC=Hiệu lực, DANG_THUC_HIEN=Đang thực hiện, HOAN_THANH=Hoàn thành, DA_TAT_TOAN=Đã tất toán, HUY=Huỷ',
  ghi_chu              TEXT          NULL COMMENT 'Ghi chú tự do',
  truoc_vat            BIGINT        NOT NULL DEFAULT 0 COMMENT 'Giá trị hợp đồng trước VAT (VNĐ, BIGINT)',
  vat                  TINYINT       NOT NULL DEFAULT 8 COMMENT 'Thuế suất VAT (%): 0, 8 hoặc 10',
  ty_le_thue           DOUBLE        NOT NULL COMMENT 'Tỷ lệ thuế (DOUBLE, 0–1)',
  ty_le_giu            DOUBLE        NOT NULL COMMENT 'Tỷ lệ Phú Tài giữ lại (DOUBLE, 0–1)',
  cach_chia            VARCHAR(5)    NULL COMMENT 'Cách chia lợi nhuận: Nhân hoặc Cộng',
  hoa_hong_kieu        VARCHAR(10)   NOT NULL DEFAULT 'Số tiền' COMMENT 'Kiểu hoa hồng: Số tiền hoặc %',
  hoa_hong_gia_tri     DOUBLE        NOT NULL DEFAULT 0 COMMENT 'Giá trị hoa hồng (VNĐ nếu kiểu Số tiền; % nếu kiểu %, DOUBLE)',
  nguoi_nhan_hh        VARCHAR(255)  NULL COMMENT 'Tên người nhận hoa hồng',
  ngay_chi_hh          DATE          NULL COMMENT 'Ngày chi hoa hồng (DATE)',
  ghi_chu_ho_so_thieu  VARCHAR(1000) NULL COMMENT 'Ghi chú hồ sơ còn thiếu',
  ly_do_huy            VARCHAR(1000) NULL COMMENT 'Lý do huỷ (bắt buộc khi huỷ)',
  tao_luc              DATETIME(3)   NOT NULL COMMENT 'Thời điểm tạo (DATETIME(3), UTC)',
  la_import            BOOLEAN       NOT NULL DEFAULT FALSE COMMENT 'TRUE = bản ghi nhập từ Excel/import; FALSE = tạo trên hệ thống',
  created_at           DATETIME(3)   NOT NULL COMMENT 'Thời điểm tạo bản ghi (DATETIME(3), UTC)',
  updated_at           DATETIME(3)   NOT NULL COMMENT 'Thời điểm cập nhật gần nhất (DATETIME(3), UTC)',
  created_by           VARCHAR(40)   NULL COMMENT 'Id tài khoản tạo bản ghi (ht_nhanvien.id)',
  updated_by           VARCHAR(40)   NULL COMMENT 'Id tài khoản cập nhật gần nhất (ht_nhanvien.id)',
  CONSTRAINT uq_hdpt_so UNIQUE (so_hd),
  CONSTRAINT ck_hdpt_tt CHECK (trang_thai IN ('BAO_GIA', 'HIEU_LUC', 'DANG_THUC_HIEN', 'HOAN_THANH', 'DA_TAT_TOAN', 'HUY')),
  CONSTRAINT ck_hdpt_vat CHECK (vat IN (0, 8, 10)),
  CONSTRAINT ck_hdpt_cc CHECK (cach_chia IS NULL OR cach_chia IN ('Nhân', 'Cộng')),
  CONSTRAINT ck_hdpt_hhk CHECK (hoa_hong_kieu IN ('Số tiền', '%')),
  CONSTRAINT fk_hdpt_kh FOREIGN KEY (ma_kh) REFERENCES kd_khach_hang (id),
  INDEX ix_hdpt_kh (ma_kh),
  INDEX ix_hdpt_tt (trang_thai)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Hợp đồng Phú Tài (HĐPT) và quỹ ảo';

CREATE TABLE pt_hop_dong_mua (
  hdpt_id  VARCHAR(40) NOT NULL COMMENT 'Id hợp đồng Phú Tài (pt_hop_dong.id)',
  thu_tu   INT         NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  hdm_id   VARCHAR(40) NOT NULL COMMENT 'Id hợp đồng mua (kd_hop_dong_mua.id)',
  PRIMARY KEY (hdpt_id, thu_tu),
  CONSTRAINT uq_hdpt_hdm UNIQUE (hdm_id) COMMENT 'P2-08: một HĐ mua chỉ là giá đầu vào của một HĐ Phú Tài',
  CONSTRAINT fk_hdpthdm_pt FOREIGN KEY (hdpt_id) REFERENCES pt_hop_dong (id) ON DELETE CASCADE,
  CONSTRAINT fk_hdpthdm_hdm FOREIGN KEY (hdm_id) REFERENCES kd_hop_dong_mua (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Liên kết HĐ Phú Tài với HĐ mua đầu vào';

CREATE TABLE pt_chi_phi (
  hdpt_id   VARCHAR(40)   NOT NULL COMMENT 'Id hợp đồng Phú Tài (pt_hop_dong.id)',
  thu_tu    INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  id        VARCHAR(40)   NOT NULL COMMENT 'Mã định danh chi phí',
  loai      VARCHAR(20)   NOT NULL COMMENT 'Loại: Vận chuyển, Hải quan, Khác',
  noi_dung  VARCHAR(1000) NOT NULL DEFAULT '' COMMENT 'Nội dung',
  ngay      DATE          NULL COMMENT 'Ngày phát sinh (DATE)',
  so_tien   BIGINT        NOT NULL DEFAULT 0 COMMENT 'Số tiền (VNĐ, BIGINT)',
  PRIMARY KEY (hdpt_id, thu_tu),
  CONSTRAINT ck_hdptcp_loai CHECK (loai IN ('Vận chuyển', 'Hải quan', 'Khác')),
  CONSTRAINT fk_hdptcp_pt FOREIGN KEY (hdpt_id) REFERENCES pt_hop_dong (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Chi phí của hợp đồng Phú Tài';

CREATE TABLE pt_dot_kh (
  hdpt_id  VARCHAR(40)   NOT NULL COMMENT 'Id hợp đồng Phú Tài (pt_hop_dong.id)',
  thu_tu   INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  dot      INT           NOT NULL COMMENT 'Số đợt thanh toán (1, 2, 3…)',
  so_tien  BIGINT        NOT NULL DEFAULT 0 COMMENT 'Số tiền (VNĐ, BIGINT)',
  ngay     DATE          NULL COMMENT 'Ngày khách trả (DATE)',
  ghi_chu  VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  PRIMARY KEY (hdpt_id, thu_tu),
  CONSTRAINT fk_hdptdk_pt FOREIGN KEY (hdpt_id) REFERENCES pt_hop_dong (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Đợt khách trả của hợp đồng Phú Tài';

CREATE TABLE pt_dot_tra_ncc (
  hdpt_id    VARCHAR(40) NOT NULL COMMENT 'Id hợp đồng Phú Tài (pt_hop_dong.id)',
  thu_tu     INT         NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  id         VARCHAR(40) NOT NULL COMMENT 'Mã định danh đợt trả',
  hdm_id     VARCHAR(40) NOT NULL DEFAULT '' COMMENT 'Id HĐ mua được trả (trống nếu chưa gắn)',
  ngay       DATE        NULL COMMENT 'Ngày trả (DATE)',
  so_tien    DOUBLE      NOT NULL DEFAULT 0 COMMENT 'Theo loại tiền (DOUBLE)',
  loai_tien  VARCHAR(5)  NOT NULL DEFAULT 'VNĐ' COMMENT 'Loại tiền: VNĐ, USD hoặc RMB',
  ty_gia     DOUBLE      NOT NULL DEFAULT 1 COMMENT 'Tỷ giá quy đổi sang VNĐ (DOUBLE; VNĐ = 1)',
  PRIMARY KEY (hdpt_id, thu_tu),
  CONSTRAINT ck_hdptncc_tien CHECK (loai_tien IN ('VNĐ', 'USD', 'RMB')),
  CONSTRAINT fk_hdptncc_pt FOREIGN KEY (hdpt_id) REFERENCES pt_hop_dong (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Đợt trả NCC của hợp đồng Phú Tài';

CREATE TABLE pt_doi_chieu (
  hdpt_id             VARCHAR(40)   NOT NULL COMMENT 'Id hợp đồng Phú Tài (pt_hop_dong.id)',
  thu_tu              INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  id                  VARCHAR(40)   NOT NULL COMMENT 'Mã định danh dòng đối chiếu',
  ngay_oxy_chuyen     DATE          NULL COMMENT 'Ngày Oxy chuyển tiền cho Phú Tài (DATE)',
  so_tien_vnd         BIGINT        NOT NULL DEFAULT 0 COMMENT 'Số tiền Oxy chuyển (VNĐ, BIGINT)',
  ngay_pt_chuyen_ncc  DATE          NULL COMMENT 'Ngày Phú Tài chuyển tiền cho NCC (DATE)',
  so_tien_nguyen_te   DOUBLE        NOT NULL DEFAULT 0 COMMENT 'Số tiền chuyển NCC theo nguyên tệ (DOUBLE)',
  loai_tien           VARCHAR(5)    NOT NULL DEFAULT 'VNĐ' COMMENT 'Loại tiền: VNĐ, USD hoặc RMB',
  ty_gia              DOUBLE        NOT NULL DEFAULT 1 COMMENT 'Tỷ giá quy đổi sang VNĐ (DOUBLE; VNĐ = 1)',
  ghi_chu             VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  PRIMARY KEY (hdpt_id, thu_tu),
  CONSTRAINT ck_hdptdc_tien CHECK (loai_tien IN ('VNĐ', 'USD', 'RMB')),
  CONSTRAINT fk_hdptdc_pt FOREIGN KEY (hdpt_id) REFERENCES pt_hop_dong (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Đối chiếu tiền Oxy chuyển Phú Tài và Phú Tài chuyển NCC';

CREATE TABLE pt_ty_le_log (
  hdpt_id  VARCHAR(40)   NOT NULL COMMENT 'Id hợp đồng Phú Tài (pt_hop_dong.id)',
  thu_tu   INT           NOT NULL COMMENT 'Số thứ tự dòng trong bản ghi cha (bắt đầu từ 0) — giữ đúng thứ tự hiển thị',
  truoc    VARCHAR(200)  NOT NULL COMMENT 'Giá trị tỷ lệ trước khi đổi',
  sau      VARCHAR(200)  NOT NULL COMMENT 'Giá trị tỷ lệ sau khi đổi',
  nguoi    VARCHAR(40)   NOT NULL COMMENT 'Id tài khoản người thao tác',
  luc      DATETIME(3)   NOT NULL COMMENT 'Thời điểm (DATETIME(3), UTC)',
  ly_do    VARCHAR(1000) NULL COMMENT 'Lý do thay đổi',
  PRIMARY KEY (hdpt_id, thu_tu),
  CONSTRAINT fk_hdpttl_pt FOREIGN KEY (hdpt_id) REFERENCES pt_hop_dong (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Nhật ký thay đổi tỷ lệ chia lợi nhuận';

CREATE TABLE pt_dong_tien (
  id       VARCHAR(60)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh dòng tiền (khoá chính)',
  ngay     DATE          NOT NULL COMMENT 'Ngày phát sinh (DATE)',
  chieu    VARCHAR(20)   NOT NULL COMMENT 'Chiều tiền: Thu về PT hoặc Chi từ PT',
  hdpt_id  VARCHAR(40)   NULL COMMENT 'Hợp đồng Phú Tài liên quan (nếu có)',
  so_tien  BIGINT        NOT NULL COMMENT 'Số tiền (VNĐ, BIGINT, > 0)',
  nguon    VARCHAR(10)   NOT NULL COMMENT 'Nguồn dòng: Tự động hoặc Nhập tay',
  ref_id   VARCHAR(40)   NULL COMMENT 'Dòng tự động: id dòng đối chiếu sinh ra nó',
  ghi_chu  VARCHAR(1000) NULL COMMENT 'Ghi chú tự do',
  CONSTRAINT ck_dtpt_chieu CHECK (chieu IN ('Thu về PT', 'Chi từ PT')),
  CONSTRAINT ck_dtpt_nguon CHECK (nguon IN ('Tự động', 'Nhập tay')),
  CONSTRAINT ck_dtpt_tien CHECK (so_tien > 0),
  CONSTRAINT fk_dtpt_pt FOREIGN KEY (hdpt_id) REFERENCES pt_hop_dong (id),
  INDEX ix_dtpt_pt (hdpt_id),
  INDEX ix_dtpt_ngay (ngay)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Dòng tiền quỹ ảo Phú Tài';
