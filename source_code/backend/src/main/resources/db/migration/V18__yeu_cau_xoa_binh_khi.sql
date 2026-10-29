-- Duyệt xoá: thêm loại đối tượng BinhKhi (xoá bình khí theo số serial ở Kho › Bình & tem).
ALTER TABLE ht_yeu_cau_xoa
  DROP CHECK ck_ycx_loai,
  ADD CONSTRAINT ck_ycx_loai CHECK (loai IN ('PhieuThuChi', 'ChiPhiThucHienHD', 'HopDongBan', 'HopDongMua', 'PhieuKho', 'HopDongPhuTai',
                                             'HoaDon', 'HoSo', 'DongTienPhuTai', 'DM_KhachHang', 'DM_NCC', 'DM_NguonTien', 'DM_LoaiChiPhi',
                                             'DM_Kho', 'DM_LoaiHang', 'BinhKhi'));
