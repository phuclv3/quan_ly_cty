# Kế hoạch triển khai & trạng thái

Cập nhật: 2026-10-23. Trạng thái: TODO · IN_PROGRESS · DONE · BLOCKED.

## 1. Kiến trúc đã chọn

```
Angular (frontend)                         Spring Boot 3.5 / Java 21 (backend)                    MySQL 8
store.ts ── hàm ghi cục bộ ─┐              Controller → Cmd ─▶ DataStore.execute ───────────▶ Flyway schema
                            └─ REST lệnh ─▶  (khoá app_state FOR UPDATE, bản sao Db,          57 bảng chuẩn hoá
GET /api/db ◀── Db lọc theo quyền ──────     Service nghiệp vụ = port store.ts + calc.ts,     audit_log
ChangeSet ◀──────────────────────────────    so sánh → ghi entity JPA, ChangeSet, audit)      kho tệp (đĩa)
```
- **Service** (`domain/logic/*Service`) — port 1-1 quy tắc của `store.ts` (giữ câu thông báo tiếng Việt), kiểm quyền bằng `Ctx.require`.
- **Calc** (`domain/calc/Calc`) — port `calc.ts`, cùng số học double như JavaScript.
- **Entity / Repository / Mapper** (`persistence/*`) — bảng chuẩn hoá ↔ mô hình domain (DTO JSON cùng hình dạng TypeScript).
- **DataStore** (`state/DataStore`) — unit of work: khoá ghi toàn cục, chạy nghiệp vụ trên bản sao, diff, ghi DB theo thứ tự khoá ngoại, tăng phiên bản, audit, công bố cache khi commit.
- **Visibility** — lọc dữ liệu theo quyền cho `GET /api/db` và ChangeSet.
- **Bảo mật** — token phiên ngẫu nhiên (DB lưu SHA-256), BCrypt, khoá 5 lần sai, bắt đổi mật khẩu, CORS cấu hình.

Lý do chọn token phiên thay JWT: chức năng hiện có cần **huỷ phiên tức thì** (đăng xuất, khoá tài khoản, đặt lại mật khẩu) và **hết hạn trượt 12 giờ** — phiên lưu DB đáp ứng trực tiếp, JWT phải thêm danh sách thu hồi.

## 2. Giai đoạn

| # | Giai đoạn | Trạng thái | Kết quả |
|---|---|---|---|
| 1 | Khảo sát frontend (routes, store, calc, perm, auth, files, seed, màn hình) | DONE | `business-analysis.md`, `frontend-backend-mapping.md` |
| 2 | Thiết kế DB + Flyway V1 (schema), V2 (dữ liệu mặc định), V2_1 (seed dev sinh từ seed frontend) | DONE | `database-design.md`, ERD Mermaid |
| 3 | Backend: domain model, Calc, 10 service nghiệp vụ, entity/repo/mapper, DataStore, controllers, xử lý lỗi, OpenAPI | DONE | ~60 lệnh ghi + API đọc / lọc / phân trang / báo cáo |
| 4 | Xác thực & phân quyền (đăng nhập, phiên, BCrypt, khoá sai, bắt đổi MK, quyền nhóm × chức năng, lọc dữ liệu theo quyền) | DONE | |
| 5 | Tích hợp frontend (api.ts, store.ts hàng đợi lệnh + ChangeSet, auth.ts, files.ts, cấu hình) | DONE | `npm run build` thành công; chạy thử trên Chrome headless |
| 6 | Kiểm thử tự động | DONE | 38 test (xem §3) |
| 7 | Seed, `.env.example`, hướng dẫn chạy | DONE | `source_code/backend/README.md` |

## 3. Kiểm thử đã chạy (2026-10-23)

| Bộ | Môi trường | Kết quả |
|---|---|---|
| `CalcTest` (6) — thuế TNDN luỹ tiến, làm tròn VAT, số dư nguồn, quyết toán tạm ứng, tồn theo lô, chia lợi nhuận Phú Tài | JUnit 5, không DB | 6/6 đạt |
| `NghiepVuTest` (24) — HĐ bán (quyền Sale, trạng thái, trùng số, thực thu → phiếu thu, không tự duyệt, chặn huỷ), Kho (đơn giá bắt buộc, mã lô, FIFO nhiều lô, giá vốn, chặn quá tồn / lô nhập sau ngày xuất, đổi mã), HĐ mua (tỷ lệ đợt, nhập kho → trạng thái, tất toán), Duyệt xoá, Hệ thống (mất quản trị, cấu hình, số chứng từ, MST), Phú Tài (đổi tỷ lệ) | JUnit 5, dữ liệu trong bộ nhớ | 24/24 đạt |
| `ApiIntegrationTest` (8) — migration V1+V2+dev seed, đăng nhập sai / token sai, snapshot không lộ mật khẩu + lọc Sale, luồng HĐ bán qua HTTP ghi DB thật (FK đợt → phiếu), xuất quá tồn + đổi mã hàng cascade, chỉ xem / bắt đổi mật khẩu, tải tệp + chặn tệp lạ + duyệt xoá + audit, phiên bản dữ liệu + phân trang | Spring Boot Test + MockMvc + **Testcontainers MySQL 8.0.36** | 8/8 đạt |
| Kiểm tra hợp đồng dữ liệu: snapshot → `PUT` nguyên trạng 600 bản ghi | Backend thật + MySQL Docker | 218 chấp nhận, 0 thay đổi ngoài ý muốn; 382 bị từ chối đúng quy tắc giống frontend (KH import thiếu MST…); 2 HĐ mua cập nhật ngày checklist như `store.ts` |
| Giao diện (Chrome headless, Playwright): đăng nhập, danh sách HĐ bán, form KH, Kế toán, Kho, tải lại giữ phiên; thêm KH qua form → `POST /api/khach-hang` 200 → có trong MySQL + audit_log | Frontend `ng serve` + backend + MySQL | Đạt, không lỗi console |
| `npm run build` frontend | Angular 21 | Thành công |

Lệnh: `cd source_code/backend && mvn test` (cần Docker cho `ApiIntegrationTest`; không có Docker thì bộ này tự **bỏ qua**, 30 test còn lại vẫn chạy).

## 4. Còn thiếu / rủi ro / đề xuất

| Mục | Trạng thái | Ghi chú |
|---|---|---|
| Kiểm thử giao diện tự động đầy đủ mọi màn (giao hàng, nhập kho, duyệt phiếu… qua UI) | TODO | Đã kiểm qua API + test nghiệp vụ; trên UI mới chạy các màn chính và luồng thêm KH |
| Xác nhận nghiệp vụ G-01…G-09 (`business-analysis.md` §5) | BLOCKED (chờ người dùng) | Backend đang làm theo frontend |
| Lưu tệp lên Google Drive công ty (Q-02) | TODO | Hiện lưu thư mục máy chủ — cần đưa vào sao lưu |
| Dọn tệp tải lên nhưng không gắn vào bản ghi nào | TODO | Có thể thêm tác vụ định kỳ xoá `tep_tin` không tham chiếu sau 24h |
| Nhiều instance backend | Lưu ý | Đúng dữ liệu (khoá DB + phiên bản), nhưng mỗi instance giữ cache riêng; ghi đếm sai mật khẩu không tăng phiên bản |
| Phạm vi đọc của Sale | Lưu ý | Sale chỉ nhận HĐ mình phụ trách → phần "tồn dành cho HĐ" (giữ hàng giữa các HĐ) trên máy Sale chỉ tính các HĐ Sale đó thấy |
| Số chứng từ / id do máy chủ cấp | Lưu ý | Client hiện số tạm trong tích tắc rồi hội tụ theo máy chủ |
| HTTPS, reverse proxy, giới hạn tần suất đăng nhập theo IP | TODO (triển khai) | Khoá theo tài khoản đã có; nên thêm ở proxy |
