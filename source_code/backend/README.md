# App Oxy — Backend

REST API cho frontend `../frontend` (Angular 21): Java 21 · Spring Boot 3.5 · Spring Data JPA / Hibernate · MySQL 8 · Flyway ·
Spring Security (token phiên + BCrypt) · Bean Validation · springdoc OpenAPI · JUnit 5 / Mockito.

Tài liệu: `../../docs/` — phân tích nghiệp vụ, mapping frontend ↔ API, thiết kế DB (ERD), đặc tả API, kế hoạch & kết quả kiểm thử.

## 1. Yêu cầu

- JDK 21, Maven ≥ 3.6.3
- MySQL 8.0.16+ (cần CHECK constraint)
- Node 22 (frontend)

## 2. Tạo database

```sql
CREATE DATABASE app_oxy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'app_oxy'@'%' IDENTIFIED BY '<mật khẩu mạnh>';
GRANT ALL PRIVILEGES ON app_oxy.* TO 'app_oxy'@'%';
```

Migration chạy **tự động khi khởi động** (Flyway): `V1` schema, `V2` dữ liệu mặc định (chức năng, nhóm quyền, tham số, loại chi phí,
kho "Chuyển thẳng", 6 tài khoản demo — mục 5), `V3` tài khoản quản trị ẩn. Hồ sơ `dev` nạp thêm `db/dev/V2_1__dev_seed.sql`
(dữ liệu mẫu). Hibernate không tạo / xoá bảng.

## 3. Cấu hình

Biến môi trường (đặt trực tiếp trong shell hoặc hệ thống — Spring không tự đọc tệp `.env`):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | (trống) | `dev` = dữ liệu mẫu + cho phép nạp lại dữ liệu mẫu |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | `jdbc:mysql://localhost:3306/app_oxy…` / `app_oxy` / (trống) | Kết nối MySQL |
| `APP_CORS_ORIGINS` | `http://localhost:4200,http://pms-oxymecie.vn,https://pms-oxymecie.vn` | Origin frontend |
| `APP_STORAGE_DIR` | `./data/files` | Kho nội dung tệp hồ sơ |
| `APP_SWAGGER_PUBLIC` | `true` | Mở Swagger không cần đăng nhập |
| `APP_BOOTSTRAP_ADMIN_EMAIL` / `_PASSWORD` | (trống) | Tạo tài khoản quản trị đầu tiên khi chưa có tài khoản nào |

## 4. Chạy

```bash
# Bash (Git Bash / Linux / macOS)
export SPRING_PROFILES_ACTIVE=dev DB_PASSWORD=dev_local_pw
mvn spring-boot:run
# hoặc: mvn -DskipTests package && java -jar target/app-oxy-backend-0.1.0.jar
```
```powershell
# PowerShell
$env:SPRING_PROFILES_ACTIVE='dev'; $env:DB_PASSWORD='dev_local_pw'; mvn spring-boot:run
```
- API: `http://localhost:8080/api` · Health: `/actuator/health`
- **Swagger UI: `http://localhost:8080/swagger-ui.html`** — gọi `POST /api/auth/login`, chép `token`, bấm **Authorize**.

### Môi trường thật (không dữ liệu mẫu)
Bỏ `SPRING_PROFILES_ACTIVE`, đặt `DB_*` riêng, `APP_BOOTSTRAP_ADMIN_EMAIL` + `APP_BOOTSTRAP_ADMIN_PASSWORD` cho lần chạy đầu
(tài khoản nhóm Giám đốc, đăng nhập lần đầu bắt đổi mật khẩu), sau đó xoá hai biến này. Đặt sau reverse proxy HTTPS;
sao lưu cả database và thư mục `APP_STORAGE_DIR`.

## 5. Tài khoản thử nghiệm

Mật khẩu dùng chung: **`Oxy@2026`** (lưu dạng BCrypt). 6 tài khoản đầu nạp ở `V2__default_data.sql` —
**MỌI môi trường, kể cả máy chủ thật** — đổi mật khẩu các tài khoản này trước khi dùng thật.

| Email | Nhóm |
|---|---|
| giamdoc@oxymecie.vn | Giám đốc (toàn quyền) |
| ketoan@oxymecie.vn | Kế toán |
| sale@oxymecie.vn | Sale |
| admin@oxymecie.vn | Admin kinh doanh |
| kho@oxymecie.vn | Kho |
| chixem@oxymecie.vn | Chỉ xem |

Riêng `hongha@ / linhchi@ / sales3@oxymecie.vn` (Sale — bắt đổi mật khẩu lần đầu) chỉ nạp ở **hồ sơ dev**
(`V2_1__dev_seed.sql`, cùng dữ liệu mẫu trích từ Excel thực tế).

## 6. Kết nối frontend

```bash
cd source_code/frontend
npm install
npm start            # http://localhost:4200 — proxy.conf.json chuyển /api → http://localhost:8080
```
Triển khai: build `npm run build`, phục vụ `dist/frontend/browser` cùng domain với API (reverse proxy `/api` → backend),
hoặc khác domain thì thêm domain đó vào `APP_CORS_ORIGINS`.

## 7. Kiểm thử

```bash
mvn test
```
- `CalcTest`, `NghiepVuTest` — công thức và quy tắc nghiệp vụ (không cần DB, không cần Docker).

## 8. Sinh lại SQL dữ liệu mặc định / mẫu

Khi đổi danh mục chức năng (`frontend/src/app/core/perm.ts` + `domain/perm/Perm.java`) hoặc dữ liệu mẫu (`seed.ts`):
```bash
cd source_code/frontend
npx esbuild ../backend/scripts/gen-seed-sql.ts --bundle --platform=node --format=esm --outfile=../backend/scripts/.gen-seed-sql.mjs
node ../backend/scripts/.gen-seed-sql.mjs '<BCrypt của mật khẩu demo>'
```
Với database đã chạy migration, thay đổi phải đi bằng migration **mới** (V3…), không sửa V1/V2 đã áp.

## 9. Cấu trúc mã

```
vn.oxymecie.appoxy
  common/          ApiException, ngày giờ, chuỗi, mã, tiền
  domain/model/    DTO / mô hình nghiệp vụ — cùng hình dạng interface TypeScript (models.ts)
  domain/perm/     Level, Perm (mã chức năng), Quyen (tính quyền nhóm)
  domain/calc/     Calc — công thức tự tính (port calc.ts)
  domain/logic/    Ctx + service nghiệp vụ: DanhMuc, KeToan, Hdb, Hdm, Kho, PhuTai, DuyetXoa, HeThong, Viec, HoSo
  persistence/     entity JPA, repository, DbMapper (domain ↔ entity), Repos
  state/           DataStore (unit of work + cache + khoá ghi), Bang (thứ tự ghi), ChangeSet, Visibility, FileStorage
  security/        AuthService, TokenAuthFilter, MatKhau (BCrypt), Tokens
  web/             controller REST, Cmd, DTO request (Req), xử lý lỗi tập trung
  config/          Security / CORS, OpenAPI, Jackson, khởi tạo quản trị, dọn phiên
```

## 10. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `Communications link failure` khi khởi động | MySQL chưa chạy / sai `DB_URL` |
| `Access denied for user` | Sai `DB_USERNAME` / `DB_PASSWORD` |
| Flyway `Validate failed: Migration checksum mismatch` | Đã sửa tệp migration đã áp — hoàn tác, tạo migration mới; DB dev có thể xoá schema rồi chạy lại |
| Frontend báo "Không kết nối được máy chủ" | Backend chưa chạy ở 8080, hoặc chạy frontend không qua `npm start` (proxy) |
| Lỗi CORS trên trình duyệt | Thêm origin frontend vào `APP_CORS_ORIGINS` |
| Chữ tiếng Việt lỗi trong MySQL CLI | Dùng `mysql --default-character-set=utf8mb4`; dữ liệu lưu utf8mb4 |
