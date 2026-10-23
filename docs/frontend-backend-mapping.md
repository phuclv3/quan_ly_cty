# Mapping frontend ↔ backend

## 1. Cách tích hợp

Frontend (Angular 21, signals) vốn chạy độc lập: toàn bộ dữ liệu ở `localStorage`, mọi luồng ghi ở `core/store.ts`
(hàm đồng bộ trả `string | null`), mọi số liệu tự tính ở `core/calc.ts` trên cả bộ dữ liệu `Db`.
Để **không viết lại màn hình**, tích hợp giữ nguyên chữ ký hàm của `Store` / `Auth`:

| Thành phần | Trước | Sau |
|---|---|---|
| Nguồn dữ liệu | `localStorage` + dữ liệu mẫu dựng trên trình duyệt | `GET /api/db` — `Db` đã lọc theo quyền (cùng hình dạng `models.ts`) |
| Hàm ghi `store.saveX(...)` | Kiểm tra + ghi vào `localStorage` | Kiểm tra cục bộ (phản hồi tức thì) → gửi lệnh REST → máy chủ kiểm lại quyền + quy tắc, ghi MySQL, trả **ChangeSet** |
| Hội tụ dữ liệu | — | Khi hàng đợi lệnh trống: `db = bản trước lệnh + các ChangeSet` (bỏ bản ghi tạm, lấy số chứng từ / thời điểm thật). Máy chủ từ chối → toast lỗi + nạp lại từ máy chủ |
| Người khác sửa dữ liệu | — | 30 giây / khi trang được focus: `GET /api/db/version`, khác → nạp lại |
| Đăng nhập / phiên | Băm SHA-256 trên trình duyệt, phiên trong `localStorage` | `POST /api/auth/login` (BCrypt, khoá 5 lần sai ở máy chủ), token Bearer lưu `localStorage` key `app-oxy:token` như cũ |
| Tệp hồ sơ | IndexedDB của máy | `POST /api/tep` (multipart) → `FileRef`; tải `GET /api/tep/{id}` |
| Nạp lại dữ liệu mẫu | Dựng lại trên máy | `POST /api/admin/nap-lai-du-lieu-mau` (chỉ hồ sơ dev) |

Mã thay đổi ở frontend (có kiểm soát, không đổi giao diện / luồng):

| Tệp | Thay đổi |
|---|---|
| `core/api.ts` (mới) | `fetch` + token Bearer + chuẩn hoá lỗi `ApiError` (message tiếng Việt từ máy chủ) |
| `core/store.ts` | Bỏ `localStorage` / nâng cấp dữ liệu cục bộ; thêm `reload`, `sauDangNhap`, `xoaPhien`, hàng đợi lệnh `exec/enqueue`, `apDungChangeSet`; mỗi hàm ghi công khai bọc hàm cục bộ `xxx_` |
| `core/auth.ts` | Gọi API đăng nhập / đổi mật khẩu / quản lý tài khoản; 401 → về màn đăng nhập |
| `core/files.ts` | Tải tệp lên / về máy chủ (vẫn nén ảnh, tạo thumbnail ở trình duyệt) |
| `core/models.ts` | `TaiKhoan` không còn `matKhauBam` / `salt` (không bao giờ gửi về trình duyệt) |
| `core/seed.ts` | Bỏ băm mật khẩu (seed chỉ còn dùng để sinh SQL dữ liệu mẫu cho backend) |
| `he-thong/cau-hinh.ts` | Tab "Dữ liệu": nạp lại dữ liệu mẫu gọi API, sửa câu mô tả cho đúng lưu trữ máy chủ |

## 2. Bảng mapping màn hình → thao tác → API

| Màn (đường dẫn) | Thao tác giao diện | Hàm frontend | API |
|---|---|---|---|
| `/dang-nhap` | Đăng nhập | `Auth.login` | `POST /api/auth/login` → `GET /api/db` |
| (mọi màn) | Khôi phục phiên khi tải lại | `Store.load` | `GET /api/auth/me`, `GET /api/db` |
| popup Đổi mật khẩu | Đổi mật khẩu | `Auth.doiMatKhau` | `POST /api/auth/doi-mat-khau` |
| shell | Đăng xuất | `Auth.logout` | `POST /api/auth/logout` |
| `/khach-hang` | Thêm / sửa KH | `saveKhachHang` | `POST /api/khach-hang` / `PUT /api/khach-hang/{id}` |
| `/khach-hang` | Phân bổ Sale | `phanBoKH` | `POST /api/khach-hang/phan-bo` |
| `/khach-hang/:id` | Ghi chăm sóc | `ghiChamSoc` | `POST /api/khach-hang/{id}/cham-soc` |
| `/nha-cung-cap` | Thêm / sửa NCC | `saveNCC` | `POST` / `PUT /api/nha-cung-cap[/{id}]` |
| `/ke-toan?tab=nguon` | Nguồn tiền | `saveNguonTien` | `POST` / `PUT /api/nguon-tien[/{id}]` |
| `/ke-toan?tab=lcp` | Loại chi phí | `saveLoaiChiPhi` | `POST` / `PUT /api/loai-chi-phi[/{id}]` |
| `/ke-toan` Sổ quỹ | Lưu nháp / gửi duyệt | `savePhieu(p, gui)` | `POST /api/phieu-thu-chi?gui=` / `PUT /api/phieu-thu-chi/{id}?gui=` |
| | Xoá nháp / rút lại | `xoaNhapPhieu` / `rutLaiPhieu` | `DELETE /api/phieu-thu-chi/{id}` / `POST …/{id}/rut-lai` |
| `/ke-toan?tab=cho-duyet` | Duyệt / từ chối | `duyetPhieu` / `tuChoiPhieu` | `POST /api/phieu-thu-chi/duyet` / `…/tu-choi` |
| `/ke-toan` Chi phí HĐ | Lập / gửi / duyệt / từ chối / xoá nháp / rút | `saveChiPhi`, `duyetChiPhi`, `tuChoiChiPhi`, `xoaNhapChiPhi`, `rutLaiChiPhi` | `/api/chi-phi-hd…` (tương tự sổ quỹ) |
| `/hop-dong-ban` | Tạo HĐ / báo giá, import Excel | `saveHdb` | `POST /api/hop-dong-ban` |
| `/hop-dong-ban/:id` Tab 1, 3 | Lưu | `saveHdb` | `PUT /api/hop-dong-ban/{id}` |
| | Chuyển trạng thái / Huỷ / Mở lại | `chuyenTrangThaiHdb`, `huyHdb`, `moLaiHdb` | `POST …/{id}/chuyen-trang-thai`, `…/huy`, `…/mo-lai` |
| Tab giao hàng | Ghi nhận giao | `ghiNhanGiaoHang` | `POST …/{id}/giao-hang` |
| Tab 3 | Ghi thực thu đợt | `ghiThucThu` | `POST …/{id}/dot/{dot}/thuc-thu` |
| Tab 3 | Tiền trả khách | `themTienTraKhach` | `POST …/{id}/tien-tra-khach` |
| Tab dòng hàng | Đề nghị cấp vật tư / huỷ | `taoDeNghiVatTu`, `huyDeNghiVatTu` | `POST …/{id}/de-nghi-vat-tu`, `POST /api/de-nghi-vat-tu/{id}/huy` |
| Tab hồ sơ (HĐ bán/mua/PT) | Tải tệp | `uploadHoSo` | `POST /api/tep` (từng tệp) → `POST /api/ho-so/{chu}/{chuId}/{loai}/tep` |
| | Tích Đã lưu / Đã scan | `setHoSoCo` | `PATCH /api/ho-so/{chu}/{chuId}/{loai}` |
| | Thêm hoá đơn | `saveHoaDon` | `POST /api/hoa-don` |
| | Mở / tải tệp, tải .zip | `moTep`, `taiZip` | `GET /api/tep/{id}` |
| `/hop-dong-mua(/:id)` | Tạo / lưu | `saveHdm` | `POST` / `PUT /api/hop-dong-mua[/{id}]` |
| | Chuyển trạng thái / Mở lại | `chuyenTrangThaiHdm`, `moLaiHdm` | `POST …/{id}/chuyen-trang-thai`, `…/mo-lai` |
| | Nhập kho | `nhapKho` | `POST …/{id}/nhap-kho` |
| | Ghi trả NCC | `ghiTraNCC` | `POST …/{id}/dot/{dot}/tra-ncc` |
| `/kho` Phiếu tay | Lập phiếu nhập / xuất | `savePhieuKhoTay` | `POST /api/phieu-kho` |
| | Sửa ngày / ghi chú, sửa lô | `suaPhieuKho`, `suaLo` | `PATCH /api/phieu-kho/{id}`, `PATCH …/{id}/dong/{i}` |
| `/kho` Kiểm kê | Lưu / xoá / sinh điều chỉnh | `saveKiemKe`, `xoaKiemKe`, `dieuChinhKiemKe` | `POST`/`PUT`/`DELETE /api/kiem-ke…`, `POST …/{id}/dieu-chinh` |
| `/kho` Danh mục | Kho, mã hàng, đổi mã | `saveKho`, `saveLoaiHang`, `doiMaHang` | `/api/kho…`, `/api/loai-hang…`, `POST /api/loai-hang/{id}/doi-ma` |
| `/kho` Ánh xạ tên | Thêm / gán | `themAnhXa`, `saveAnhXa` | `POST /api/anh-xa-ten`, `PUT /api/anh-xa-ten/{id}` |
| `/phu-tai(/:id)` | Lưu HĐ, đổi tỷ lệ | `savePt` | `POST` / `PUT /api/hop-dong-phu-tai[/{id}]` (`{hd, lyDoTyLe}`) |
| | Chuyển trạng thái / Huỷ | `chuyenTrangThaiPt` | `POST …/{id}/chuyen-trang-thai` |
| | Dòng tiền tay | `themDongTienTay` | `POST /api/dong-tien-pt` |
| `/viec` | Giao việc / phản hồi / xong | `giaoViec`, `phanHoiViec`, `xongViec` | `POST /api/viec`, `…/{id}/phan-hoi`, `…/{id}/xong` |
| `/duyet-xoa` + nút Xoá các màn | Gửi / rút / duyệt / từ chối | `guiYeuCauXoa`, `rutYeuCau`, `duyetXoa`, `tuChoiXoa` | `/api/yeu-cau-xoa…` |
| `/cau-hinh` | Đổi tham số | `setCauHinh` | `PUT /api/cau-hinh/{khoa}` |
| `/cau-hinh?tab=du-lieu` | Nạp lại dữ liệu mẫu | `resetToSeed` | `POST /api/admin/nap-lai-du-lieu-mau` |
| `/tai-khoan` | Tạo / sửa / khoá / đặt lại mật khẩu | `Auth.taoTaiKhoan`, `suaTaiKhoan`, `doiTrangThai`, `datLaiMatKhau` | `/api/tai-khoan…` |
| `/tai-khoan?tab=nhom` | Lưu / xoá nhóm, gán thành viên | `saveNhom`, `xoaNhom`, `ganThanhVien` | `/api/nhom-quyen…` |
| Trang chủ, Báo cáo, Công nợ, Tồn kho, danh sách có lọc / phân trang | Hiển thị | `calc.ts` trên `store.db()` | Dữ liệu từ `GET /api/db`; backend có thêm API lọc / phân trang / báo cáo cho tích hợp khác |

## 3. Đồng bộ kiểu dữ liệu

| Kiểu | Frontend | API (JSON) | MySQL |
|---|---|---|---|
| Ngày nghiệp vụ | `'YYYY-MM-DD'` | chuỗi `'YYYY-MM-DD'` | `DATE` |
| Mốc thời gian | ISO `toISOString()` | `'2026-10-23T03:03:48.835Z'` (UTC, mili giây) | `DATETIME(3)` UTC |
| Tiền VNĐ | `number` nguyên | số nguyên | `BIGINT` |
| SL, tỷ lệ, tỷ giá, đơn giá | `number` | số | `DOUBLE` (cùng IEEE-754 → công thức client / server ra cùng kết quả) |
| Trạng thái, loại | union string tiếng Việt | đúng nhãn đó | `VARCHAR` + `CHECK` |
| Trường tuỳ chọn (`?`) | `undefined` | **bỏ khỏi JSON** (không gửi `null`) | `NULL` |
| `import` | `import?: boolean` | `"import": true` | `la_import` |
| Mức quyền | `'view' \| 'own'…` | giống hệt | `nhom_quyen_chuc_nang.muc_quyen` |

Đã kiểm chứng: gửi lại nguyên trạng 218 bản ghi lấy từ `GET /api/db` (KH, NCC, mã hàng, HĐ bán, HĐ mua, HĐ Phú Tài) bằng `PUT` → máy chủ chấp nhận, không sinh thay đổi ngoài ý muốn (xem `implementation-plan.md`).

## 4. Khác biệt có chủ đích so với frontend cũ

- Máy chủ **không cho** đổi trạng thái / lý do huỷ / tham số thuế / phiếu gắn đợt / lịch sử duyệt qua lệnh "Lưu" — các trường đó chỉ đổi qua lệnh chuyên biệt (frontend cũng chỉ đổi qua các lệnh đó).
- Số chứng từ, id bản ghi phát sinh (phiếu thu sinh từ thực thu…), mốc thời gian do máy chủ cấp; client thấy số tạm trong tích tắc trước khi hội tụ.
- Mã danh mục tuần tự (KHnnnn, NCCnnnn…) client đề xuất; nếu người khác vừa dùng mã đó, máy chủ cấp mã kế tiếp.
- Duyệt xoá có thêm vài điều kiện tham chiếu để giữ toàn vẹn khoá ngoại (G-07, G-08 trong `business-analysis.md`).
