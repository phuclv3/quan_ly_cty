-- Yêu cầu xuất kho và giao hàng của HĐ bán; HĐ bán thêm trạng thái "Đã giao hàng" (DA_GIAO_HANG).
ALTER TABLE kd_hop_dong_ban DROP CHECK ck_hdb_tt;
ALTER TABLE kd_hop_dong_ban ADD CONSTRAINT ck_hdb_tt
  CHECK (trang_thai IN ('BAO_GIA', 'HIEU_LUC', 'DANG_GIAO_HANG', 'DA_GIAO_HANG', 'HOAN_THANH', 'DA_TAT_TOAN', 'HUY'));

CREATE TABLE kho_yeu_cau_xuat (
  id             VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Mã định danh yêu cầu (khoá chính)',
  so_yc          VARCHAR(20)   NOT NULL COMMENT 'Số yêu cầu (duy nhất): YC + 2 số năm + số thứ tự',
  ngay_gui       DATE          NOT NULL COMMENT 'Ngày gửi yêu cầu',
  hdb_id         VARCHAR(40)   NOT NULL COMMENT 'HĐ bán (kd_hop_dong_ban.id)',
  nguoi_gui      VARCHAR(40)   NOT NULL COMMENT 'Id tài khoản người gửi (ht_nhanvien.id)',
  ghi_chu        VARCHAR(1000) NULL COMMENT 'Ghi chú của người gửi',
  trang_thai     VARCHAR(20)   NOT NULL COMMENT 'CHO_KHO=Chờ kho, DA_XUAT_KHO=Đã xuất kho, DA_GIAO_HANG=Đã giao hàng, TU_CHOI=Từ chối, DA_RUT=Đã rút',
  ly_do_tu_choi  VARCHAR(1000) NULL COMMENT 'Lý do thủ kho từ chối',
  nguoi_xu_ly    VARCHAR(40)   NULL COMMENT 'Thủ kho xuất / từ chối',
  ngay_xu_ly     DATE          NULL COMMENT 'Ngày xuất / từ chối',
  kho            VARCHAR(20)   NULL COMMENT 'Kho xuất (kho_vi_tri.id)',
  phieu_id       VARCHAR(40)   NULL COMMENT 'Phiếu Xuất sinh ra (tham chiếu mềm kho_phieu.id)',
  ngay_xuat      DATE          NULL COMMENT 'Ngày xuất kho (= ngày phiếu Xuất)',
  ngay_giao      DATE          NULL COMMENT 'Ngày giao hàng thực tế',
  nguoi_giao     VARCHAR(40)   NULL COMMENT 'Người cập nhật ngày giao',
  CONSTRAINT uq_ycx_so UNIQUE (so_yc),
  CONSTRAINT fk_ycx_hdb FOREIGN KEY (hdb_id) REFERENCES kd_hop_dong_ban (id),
  CONSTRAINT ck_ycx_trang_thai CHECK (trang_thai IN ('CHO_KHO', 'DA_XUAT_KHO', 'DA_GIAO_HANG', 'TU_CHOI', 'DA_RUT')),
  INDEX ix_ycx_hdb (hdb_id),
  INDEX ix_ycx_tt (trang_thai)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Yêu cầu xuất kho và giao hàng theo HĐ bán';

CREATE TABLE kho_yeu_cau_xuat_dong (
  yc_id        VARCHAR(40)   NOT NULL COMMENT 'Id yêu cầu (kho_yeu_cau_xuat.id)',
  thu_tu       INT           NOT NULL COMMENT 'Số thứ tự dòng (bắt đầu từ 0)',
  loai_hang    VARCHAR(40)   NOT NULL COMMENT 'Mã loại hàng (kho_loai_hang.id)',
  ten_tren_hd  VARCHAR(500)  NULL COMMENT 'Tên hàng ghi trên HĐ',
  so_luong     DOUBLE        NOT NULL COMMENT 'Số lượng yêu cầu xuất',
  ghi_chu      VARCHAR(1000) NULL COMMENT 'Ghi chú dòng',
  PRIMARY KEY (yc_id, thu_tu),
  CONSTRAINT fk_ycxd_yc FOREIGN KEY (yc_id) REFERENCES kho_yeu_cau_xuat (id) ON DELETE CASCADE,
  CONSTRAINT fk_ycxd_lh FOREIGN KEY (loai_hang) REFERENCES kho_loai_hang (id) ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Dòng hàng của yêu cầu xuất kho';
