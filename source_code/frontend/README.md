# App Oxy — Frontend quản lý nội bộ Oxy Mecie

Giao diện dựng lại theo **danh sách 76 chức năng** trong `tai_lieu/AppOxy _Spec_Quản_Lý_Nội_Bộ_rev.xlsx`
(sheet "Chức năng theo Spec"), bổ sung chi tiết từ `tai_lieu/nghiep_vu/` và dữ liệu mẫu trích từ
`tai_lieu/du_lieu_thuc_te/`. Mỗi màn / hàm trong mã có ghi mã chức năng (NT-, KT-, HDB-, HDM-, KHO-, PT-)
để tra ngược về spec.

## Chạy

```bash
npm install
npm start          # http://localhost:4200
npm run build      # kết xuất vào dist/frontend
```

Yêu cầu: Node 22, Angular 21 (standalone components, signals, zoneless).

**Cần backend** (`../backend`, Spring Boot + MySQL) chạy ở `http://localhost:1997` — `npm start` gọi thẳng backend theo `src/environments/environment.ts`.
 Xem `../backend/README.md` và `../../docs/frontend-backend-mapping.md`.

### Tài khoản chạy thử

Mật khẩu chung (chỉ khi backend chạy hồ sơ `dev`): `Oxy@2026`

| Email | Vai trò |
| --- | --- |
| giamdoc@oxymecie.vn | Giám đốc — thấy và sửa tất cả |
| ketoan@oxymecie.vn | Kế toán — sổ quỹ, duyệt phiếu, công nợ, Phú Tài |
| sale@oxymecie.vn | Sale — chỉ HĐ bán mình phụ trách, khách hàng |
| admin@oxymecie.vn | Admin kinh doanh — HĐ bán / mua, hồ sơ |
| kho@oxymecie.vn | Kho — tồn kho, nhập / xuất, phiếu điều chỉnh |
| chixem@oxymecie.vn | Chỉ xem — không có nút hành động |

## Phân quyền theo nhóm & mã chức năng

Màn **Tài khoản & phân quyền** (`/tai-khoan`):

| Tab | Làm gì |
| --- | --- |
| Tài khoản | Tạo tài khoản, gán vào một hoặc nhiều nhóm, khoá / mở khoá, đặt lại mật khẩu |
| Nhóm quyền | Tạo / sửa / nhân bản / xoá nhóm; gán mức quyền cho từng **mã chức năng**; gán / bỏ tài khoản vào nhóm |
| Danh mục chức năng | Tra mã chức năng (theo mã spec: `HDB-01`, `KT-07`…), mức được phép, nhóm đang có quyền |
| Ma trận phân quyền | Nhóm × chức năng, xuất Excel |

- Mức quyền: Xem · Xem của mình · Gửi yêu cầu · Lập nháp · Sửa của mình · Sửa · Duyệt.
- Một tài khoản nhiều nhóm → lấy mức **cao nhất**; nhóm "Toàn quyền" → mức cao nhất mọi chức năng.
- Các quy tắc trước đây gắn cứng với Giám đốc nay là chức năng phân quyền được: `HDB-03-ML` mở lại HĐ bán đã tất toán, `HDM-03-ML` mở lại HĐ mua đã tất toán, `KT-07-TD` tự duyệt chứng từ / yêu cầu xoá của mình, `NT-11-KT` duyệt xoá chứng từ kế toán.
- Chặn tự khoá hệ thống: không lưu thay đổi nào làm mất người cuối cùng có quyền sửa `NT-03`.
- Danh mục chức năng + 6 nhóm mặc định (sheet "Ma trận quyền", D-25, chờ Q-06) ở `src/app/core/perm.ts`.

**Database:** schema thật ở `../backend/src/main/resources/db/migration` (Flyway); danh mục chức năng + nhóm mặc định sinh từ `perm.ts` bằng `../backend/scripts/gen-seed-sql.ts`. (`docs/database/phan-quyen.sql` là bản phác thảo cũ, giữ để tham khảo.)

## Bản đồ màn hình

| Menu | Đường dẫn | Chức năng spec |
| --- | --- | --- |
| Đăng nhập / đổi mật khẩu | `/dang-nhap`, popup | NT-01, NT-02 |
| Trang chủ | `/` | NT-07 |
| Hợp đồng bán | `/hop-dong-ban`, `/hop-dong-ban/:id?tab=1..5` | HDB-01…12 |
| Hợp đồng mua | `/hop-dong-mua`, `/hop-dong-mua/:id?tab=1..4` | HDM-01…09 |
| Kho | `/kho?tab=…` | KHO-01…10 |
| Kế toán | `/ke-toan?tab=…` | KT-01…18 (trừ KT-03) |
| Phú Tài | `/phu-tai`, `/phu-tai/:id?tab=1..5` | PT-01…11 |
| Báo cáo | `/bao-cao` | theo `nghiep_vu/06_BaoCao.md` |
| Danh mục | `/danh-muc?tab=kh|ncc|lcp` | HDB-13, HDM-10, KT-03 |
| Duyệt xoá | `/duyet-xoa` | NT-11 |
| Tài khoản & phân quyền | `/tai-khoan?tab=tai-khoan|nhom|chuc-nang|ma-tran` | NT-02, NT-03, NT-04 |
| Cấu hình & Import | `/cau-hinh` | NT-13, NT-14 |

## Cấu trúc mã

```
src/app/
  core/   models.ts   — 28 bảng theo sheet "Trường dữ liệu"
          calc.ts     — mọi công thức tự tính (thuế TNDN luỹ tiến, số dư nguồn tiền, công nợ,
                        tồn kho, giá gốc xuất kho, chia lợi nhuận Phú Tài…), hàm thuần
          store.ts    — dữ liệu (GET /api/db) + mọi luồng ghi: kiểm tra cục bộ rồi gửi lệnh API, hội tụ theo ChangeSet
          api.ts      — gọi backend (token Bearer, lỗi tiếng Việt)
          perm.ts     — ma trận quyền
          auth.ts     — đăng nhập / mật khẩu / tài khoản qua API (BCrypt, phiên 12 giờ, khoá 15 phút ở máy chủ)
          seed.ts, seed-data.ts — dữ liệu mẫu từ file Excel thực tế (nguồn sinh SQL dữ liệu mẫu cho backend)
          files.ts    — tải tệp hồ sơ lên / về backend (nén ảnh ≤2000px, thumbnail, tải .zip)
  shared/ ui-kit.ts (popup, ô tiền, ô chọn có tìm kiếm, nhãn trạng thái, bảng từng bước tính),
          filter-bar.ts (bộ lọc chuẩn NT-09), ho-so.ts (tab Lưu trữ hồ sơ NT-12), confirm, pager, export
  hdb/ hdm/ kho/ ke-toan/ phu-tai/ bao-cao/ danh-muc/ home/ he-thong/  — các màn
src/styles.css — hệ thống thiết kế dùng chung (màu theo logo; font Be Vietnam Pro và cỡ chữ / icon theo giao diện tham khảo chibo-thuannhue — lệch NT-08 (Times New Roman) theo yêu cầu người dùng)
public/brand/logo-oxy.png — logo
```

## Giao diện điện thoại & hộp thoại

- ≤ 900px: menu thành ngăn kéo (☰). ≤ 640px: mọi bảng `table.tbl` tự chuyển thành thẻ (mỗi dòng một thẻ, nhãn cột bên trái — App tự gắn `data-label` từ `<th>`), popup và hộp thoại thành bottom-sheet, nút / ô nhập cao ≥ 44px, chữ ô nhập 16px để iOS không tự phóng to.
- Mọi xác nhận đi qua `shared/confirm.ts` (`Confirm.ask` / `Confirm.prompt`) — không dùng `window.confirm/alert/prompt`. Thao tác xoá / huỷ / từ chối / khoá tự hiện tông đỏ.
- Ô ngày dùng ô chọn ngày của trình duyệt: hiện dd/mm/yyyy khi trình duyệt để ngôn ngữ tiếng Việt, mm/dd/yyyy khi để tiếng Anh.

## Giới hạn của bản này — đọc trước khi dùng thật

| Vấn đề | Bản này làm gì | Cần gì để đi tiếp |
| --- | --- | --- |
| Lưu trữ | Backend REST + MySQL (dùng chung mọi máy); `Store` giữ bản đã lọc theo quyền và gửi lệnh lên API | — (đã làm) |
| Bảo mật | Mật khẩu BCrypt, phiên token, kiểm quyền và quy tắc nghiệp vụ chạy ở backend; giao diện chỉ kiểm tra sớm | Triển khai sau HTTPS |
| Hồ sơ | Tệp tải lên kho tệp của backend | Upload Drive công ty (chờ Q-02) |
| Dữ liệu mẫu | Trích từ 5 file Excel; số dư đầu kỳ nguồn tiền (50tr / 900tr), tài khoản demo, Sale phụ trách HĐ bán là **giả định** | Nhập số dư thật, gán Sale thật (import chính thức NT-13, Q-07) |
| Phiếu thu khi ghi nhận thực thu HĐ bán | Sinh phiếu Thu Chờ duyệt để số dư nguồn tiền tăng khi duyệt `[Inference]` — spec không nói rõ | Xác nhận với Kế toán |
| Chia lợi nhuận Phú Tài | Tham số `PT_CACH_CHIA` ở Cấu hình: "Nhân" (spec, Oxy 72%) hoặc "Cộng" (file thực tế, 70%); lưu theo từng HĐ, sửa được với quyền PT-06 | Chọn mặc định ở Cấu hình |
| Loại hàng | Thêm nhóm Khí chuẩn, Dung dịch chuẩn (có trong dữ liệu kho thật, spec chưa có) | Chốt Q-01 |

Về dữ liệu mẫu (chỉ backend hồ sơ `dev`): màn **Cấu hình & Import → Dữ liệu → Nạp lại dữ liệu mẫu** (Giám đốc).
