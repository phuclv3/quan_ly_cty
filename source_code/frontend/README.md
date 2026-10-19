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

### Tài khoản chạy thử

Mật khẩu chung: `Oxy@2026`

| Email | Vai trò |
| --- | --- |
| giamdoc@oxymecie.vn | Giám đốc — thấy và sửa tất cả |
| ketoan@oxymecie.vn | Kế toán — sổ quỹ, duyệt phiếu, công nợ, Phú Tài |
| sale@oxymecie.vn | Sale — chỉ HĐ bán mình phụ trách, khách hàng |
| admin@oxymecie.vn | Admin kinh doanh — HĐ bán / mua, hồ sơ |
| kho@oxymecie.vn | Kho — tồn kho, nhập / xuất, phiếu điều chỉnh |
| chixem@oxymecie.vn | Chỉ xem — không có nút hành động |

Quyền theo sheet "Ma trận quyền" (D-25, còn chờ xác nhận Q-06) — xem `src/app/core/perm.ts`.

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
| Quản lý tài khoản | `/tai-khoan` | NT-03, NT-04 |
| Cấu hình & Import | `/cau-hinh` | NT-13, NT-14 |

## Cấu trúc mã

```
src/app/
  core/   models.ts   — 28 bảng theo sheet "Trường dữ liệu"
          calc.ts     — mọi công thức tự tính (thuế TNDN luỹ tiến, số dư nguồn tiền, công nợ,
                        tồn kho, giá gốc xuất kho, chia lợi nhuận Phú Tài…), hàm thuần
          store.ts    — dữ liệu + mọi luồng ghi (duyệt phiếu, sinh phiếu kho tự động, duyệt xoá…)
          perm.ts     — ma trận quyền
          auth.ts     — đăng nhập email + mật khẩu băm SHA-256 + salt, token 12 giờ, khoá 15 phút
          seed.ts, seed-data.ts — dữ liệu mẫu từ file Excel thực tế
          files.ts    — lưu hồ sơ (nén ảnh ≤2000px, thumbnail, tải .zip)
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
| Lưu trữ | `localStorage` + IndexedDB của **từng trình duyệt**; không chia sẻ giữa máy | Nối `Store` với Apps Script / Google Sheets theo kiến trúc spec; giữ nguyên chữ ký hàm |
| Bảo mật | Băm mật khẩu và kiểm quyền chạy ở trình duyệt `[Unverified]` — không phải bảo mật thật | Kiểm tra mật khẩu, token, `_requireCanEdit_` ở server (Auth.gs) |
| Hồ sơ | Tệp nằm ở IndexedDB máy này | Upload Drive công ty (chờ Q-02) |
| Dữ liệu mẫu | Trích từ 5 file Excel; số dư đầu kỳ nguồn tiền (50tr / 900tr), tài khoản demo, Sale phụ trách HĐ bán là **giả định** | Nhập số dư thật, gán Sale thật (import chính thức NT-13, Q-07) |
| Phiếu thu khi ghi nhận thực thu HĐ bán | Sinh phiếu Thu Chờ duyệt để số dư nguồn tiền tăng khi duyệt `[Inference]` — spec không nói rõ | Xác nhận với Kế toán |
| Chia lợi nhuận Phú Tài | Theo spec (Oxy 72% LN trước thuế); file công nợ Phú Tài thực tế tính 70% | Chốt Q-03 |
| Loại hàng | Thêm nhóm Khí chuẩn, Dung dịch chuẩn (có trong dữ liệu kho thật, spec chưa có) | Chốt Q-01 |

Xoá dữ liệu trên máy để về dữ liệu mẫu: màn **Cấu hình & Import → Dữ liệu trên máy này → Nạp lại dữ liệu mẫu**
(Giám đốc), hoặc xoá Local Storage của trang.
