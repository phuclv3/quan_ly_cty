# Phân tích nghiệp vụ — App Oxy (quản lý nội bộ Oxy Mecie)

> Nguồn phân tích: mã frontend `source_code/frontend` (đặc biệt `core/store.ts` — mọi luồng ghi, `core/calc.ts` — mọi công thức,
> `core/perm.ts` — phân quyền, `core/models.ts` — dữ liệu), README frontend, `tai_lieu/AppOxy _Spec_Quản_Lý_Nội_Bộ_rev.md`.
> Mã chức năng (NT-, KT-, HDB-, HDM-, KHO-, PT-, TD-, BC-) bám sheet "Chức năng theo Spec".
> Mục **Giả định cần xác nhận** liệt kê những điểm frontend tự suy ra mà spec chưa chốt — backend làm theo frontend, chưa coi là yêu cầu chính thức.

## 1. Người dùng & phân quyền

| Nhóm mặc định | Mô tả | Quyền chính |
|---|---|---|
| Giám đốc (`NQ-GD`) | Toàn quyền | Mức cao nhất mọi chức năng |
| Kế toán (`NQ-KT`) | Sổ quỹ, duyệt phiếu, công nợ, Phú Tài | KT-04 Sửa, KT-07/KT-14 Duyệt, HDB-10 ghi thực thu, HDM-08 trả NCC, PT-01/PT-06, NT-11-KT duyệt xoá chứng từ kế toán |
| Sale (`NQ-SALE`) | HĐ bán mình phụ trách | HDB-01/HDB-07/HDB-04 "Sửa của mình", KT-04 "Lập nháp", HDB-13 "Sửa của mình" |
| Admin kinh doanh (`NQ-ADMIN`) | HĐ bán / mua, hồ sơ | HDB/HDM Sửa, phân bổ KH, nhập kho |
| Kho (`NQ-KHO`) | Tồn kho, phiếu điều chỉnh | KHO-01/KHO-06 Sửa, HDB-04, HDM-06 |
| Chỉ xem (`NQ-XEM`) | Xem số liệu | Mức Xem |

- Mức quyền (thấp → cao): `none` · `view` / `ownView` · `request` · `draft` · `own` · `edit` · `approve`.
- Một tài khoản nhiều nhóm → lấy mức **cao nhất** từng chức năng; nhóm "Ngưng" không tính; nhóm toàn quyền → mức cao nhất.
- 30 mã chức năng (bảng `chuc_nang`). Quyền đặc biệt: `HDB-03-ML`/`HDM-03-ML` mở lại HĐ đã tất toán, `KT-07-TD` tự duyệt chứng từ của mình, `NT-11-KT` duyệt xoá chứng từ kế toán, `HDB-13-PB` phân bổ khách hàng, `PT-06` sửa tỷ lệ chia.
- **Kiểm tra ở backend**: mọi lệnh ghi gọi `Ctx.require(...)` trước khi ghi; dữ liệu đọc (`GET /api/db`) được lọc theo quyền (`Visibility`).
- Chặn tự khoá hệ thống: không lưu thay đổi làm mất người cuối cùng có quyền sửa NT-03.

## 2. Danh sách chức năng

Ký hiệu: **Màn** — đường dẫn frontend; **API** — xem `api-specification.md`; **Bảng** — xem `database-design.md`.

### 2.1 Hệ thống (NT)

| Mã | Chức năng | Màn | Ai | Quy tắc nghiệp vụ | API | Bảng |
|---|---|---|---|---|---|---|
| NT-01 | Đăng nhập email + mật khẩu | `/dang-nhap` | Mọi người | Lỗi chung "Email hoặc mật khẩu không đúng" (không lộ email); sai 5 lần → khoá đăng nhập 15 phút; tài khoản "Khoá" không vào được; phiên hết hạn trượt 12 giờ | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | `tai_khoan`, `phien_dang_nhap` |
| NT-02 | Đổi mật khẩu / bắt đổi lần đầu | popup | Mọi người | ≥ 8 ký tự, không dấu cách, khác mật khẩu cũ; tài khoản `batDoiMK` chỉ được đọc + đổi mật khẩu | `POST /auth/doi-mat-khau` | `tai_khoan` |
| NT-03 | Tài khoản, nhóm quyền | `/tai-khoan` | NT-03 Sửa | Email duy nhất; ≥ 1 nhóm; không xoá tài khoản (chỉ khoá); khoá / đặt lại mật khẩu → huỷ mọi phiên; nhóm hệ thống không xoá; nhóm còn thành viên không xoá | `/tai-khoan…`, `/nhom-quyen…`, `GET /chuc-nang` | `tai_khoan`, `tai_khoan_nhom`, `nhom_quyen`, `nhom_quyen_chuc_nang`, `chuc_nang` |
| NT-04 | Ma trận phân quyền | `/tai-khoan?tab=ma-tran` | NT-03 Xem | Hiển thị từ dữ liệu nhóm (client) | `GET /db` | như trên |
| NT-07 | Trang chủ (bảng việc) | `/` | Mọi người | Số liệu tự tính ở client từ dữ liệu được phép xem | `GET /db` | — |
| NT-11 | Duyệt xoá | `/duyet-xoa` | Gửi: NT-11 ≥ request; Duyệt: NT-11 approve (mọi loại) hoặc NT-11-KT (chứng từ kế toán) | Xem §3.6 | `/yeu-cau-xoa…` | `yeu_cau_xoa` + bảng đối tượng |
| NT-12 | Hồ sơ HĐ (tệp, đã lưu, đã scan) | Tab hồ sơ của HĐ | Quyền sửa HĐ tương ứng | Tệp ≤ 20MB, PDF/ảnh; "Đã lưu" bản giấy bắt buộc ghi chú; 3 loại bắt buộc để tất toán: Hợp đồng, BBGH/BBNT, Hoá đơn | `POST /tep`, `GET /tep/{id}`, `/ho-so/…`, `POST /hoa-don` | `tep_tin`, `ho_so`, `ho_so_tep`, `hoa_don` |
| NT-13 | Import HĐ từ Excel | `/cau-hinh` | Quyền sửa HĐ | Client đọc Excel, gọi lần lượt lệnh lưu HĐ (cùng quy tắc) | `POST /hop-dong-ban`, `POST /hop-dong-mua` | — |
| NT-14 | Tham số cấu hình | `/cau-hinh` | NT-14 Sửa | Tỷ lệ 0–100%; số đợt 1–24; tiền tố 1–5 chữ in hoa, không trùng; HĐ đã tạo giữ tham số cũ; mọi lần đổi ghi lịch sử | `PUT /cau-hinh/{khoa}` | `cau_hinh`, `cau_hinh_log` |
| — | Nhật ký thao tác | (API) | NT-03 Sửa / toàn quyền | Mỗi lệnh ghi = 1 dòng (ai, lúc, lệnh, đối tượng, ảnh bản ghi bị xoá) | `GET /nhat-ky` | `audit_log` |

### 2.2 Kế toán (KT)

| Mã | Chức năng | Ai | Quy tắc | Trạng thái |
|---|---|---|---|---|
| KT-01/02 | Nguồn tiền, số dư | KT-01 | Mã nguồn nhập tay, duy nhất; nguồn đã có phiếu **Đã duyệt** → khoá Số dư / Ngày đầu kỳ; số dư = đầu kỳ + thu − chi ± quyết toán ± luân chuyển − chi phí HĐ (chỉ phiếu Đã duyệt, từ ngày đầu kỳ) | — |
| KT-03 | Loại chi phí | KT-01 | Nhóm "Vận hành" (mã VH-nnnn) / "Thực hiện HĐ" (CPTH-nnnn); `CPTH-HH` hoa hồng cần Người nhận | — |
| KT-04…10 | Sổ quỹ: Thu, Chi, Tạm ứng, Quyết toán tạm ứng, Luân chuyển | KT-04 (draft: chỉ phiếu mình) | Số phiếu `{TC}{yy}-{nnnn}` theo năm ngày lập, không tái dùng; kiểm tra theo loại (Chi/Tạm ứng cần loại chi phí; Tạm ứng cần người nhận; Quyết toán cần tạm ứng gốc đã duyệt chưa quyết toán; Luân chuyển nguồn đi ≠ nguồn đến); chỉ giữ trường của loại đang chọn | Nháp → Chờ duyệt → Đã duyệt / Từ chối; Chờ duyệt → (rút) Nháp; Từ chối → sửa → gửi lại |
| KT-07 | Duyệt / từ chối phiếu | KT-07 approve | Không tự duyệt phiếu mình lập (trừ KT-07-TD) — duyệt hàng loạt bỏ qua phiếu của mình kèm cảnh báo; từ chối cần lý do; lịch sử duyệt giữ mọi bước | |
| KT-12…15 | Chi phí thực hiện HĐ | KT-12 (own: HĐ mình phụ trách) | Gắn 1 HĐ bán từ Hiệu lực trở đi; số `CP{yy}-{nnnn}`; giống vòng duyệt sổ quỹ (KT-14) | như sổ quỹ |
| KT-09 | Tạm ứng treo | KT-04 | Tạm ứng đã duyệt chưa có quyết toán đã duyệt | (tự tính) |
| KT-17 | Công nợ phải thu / phải trả | KT-17 (ownView: HĐ mình) | Phải thu = giá trị quyết toán − đã thu (phiếu Thu đã duyệt); phải trả = tổng HĐ mua − đã trả (phiếu Chi đã duyệt) | `GET /cong-no` |

### 2.3 Hợp đồng bán (HDB)

| Mã | Chức năng | Quy tắc |
|---|---|---|
| HDB-01/02 | Tạo / sửa HĐ (Tab 1) | Sale phụ trách = tài khoản có quyền HĐ bán ≥ own; Sale chỉ lập / sửa HĐ của mình; Báo giá chưa cần Số HĐ; Số HĐ duy nhất (không phân biệt hoa thường / dấu); MST đúng dạng 10 số hoặc 10-3; từ Hiệu lực không đổi Số HĐ / KH; KH thiếu MST / địa chỉ được ghi ngược từ HĐ |
| HDB-03 | Luồng trạng thái | Báo giá → Hiệu lực (cần Số HĐ, MST, Ngày ký, Giá trị) → Đang giao hàng (tự chuyển khi có phiếu xuất) → Hoàn thành → Đã tất toán (còn phải thu = 0, đủ 3 hồ sơ, không còn chi phí / phiếu Thu chờ duyệt). HĐ không giao hàng (dịch vụ) đi thẳng Hiệu lực → Hoàn thành. Đã tất toán khoá sửa, chỉ "Mở lại" (HDB-03-ML) về Hoàn thành. Huỷ: chỉ khi chưa thu, chưa xuất kho, không còn chi phí / đề nghị vật tư hiệu lực, cần lý do |
| HDB-04 | Ghi nhận giao hàng | Sinh phiếu Xuất kho tự động; trừ theo **lô** chỉ định hoặc FIFO (lô nhập trước), chỉ lô nhập tới ngày xuất; chặn xuất quá tồn; giá vốn = đơn giá lô; kho "Chuyển thẳng" lấy giá theo HĐ mua liên quan |
| HDB-07/08 | Giá trị & đợt thanh toán (Tab 3) | Sau VAT = round(trước VAT × (1+VAT%)); có dòng hàng → giá trị tự cộng; đợt theo % tự tính; hạn = ngày hiệu lực + N ngày; tối đa `SO_DOT_TOI_DA` đợt; HĐ đã có phiếu Thu không đổi giá trị / VAT. Thuế TNDN luỹ tiến: mốc = ngưỡng × GTHĐ thực tế; phần ≤ mốc × mức 1 + phần vượt × mức 2 |
| HDB-09 | Tiền trả khách | = chi phí HĐ loại Hoa hồng, gửi duyệt luôn |
| HDB-10 | Ghi nhận thực thu | Chỉ HDB-10; sinh / cập nhật phiếu **Thu Chờ duyệt** ở sổ quỹ; chỉ tính vào "đã thu" khi phiếu được duyệt; số thu ≤ phần còn lại; phiếu đã duyệt muốn sửa phải yêu cầu xoá |
| HDB-11 | Lợi nhuận tạm tính | Trước VAT − giá vốn (xuất kho, chưa có thì HĐ mua liên quan) − chi phí đã duyệt − thuế TNDN |
| HDB-13 | Khách hàng & theo dõi KD | Mã KHnnnn; MST bắt buộc; Sale "của mình" sửa KH mình phụ trách / chưa phân bổ; KH mới Sale tạo → Sale đó phụ trách; nhật ký chăm sóc chỉ thêm; phân bổ (HDB-13-PB) |
| — | Đề nghị cấp vật tư | Mỗi dòng thiếu hàng = 1 đề nghị (`DN{yy}-{nnnn}`); huỷ cần lý do, không huỷ khi đã lên HĐ mua |

### 2.4 Hợp đồng mua (HDM)

| Mã | Quy tắc |
|---|---|
| HDM-01/02 | Số HĐ duy nhất; NCC bắt buộc; dòng hàng: mã hàng, SL > 0, ngoại tệ cần tỷ giá; tổng = Σ SL × đơn giá × tỷ giá hoặc nhập tay (cần lý do); không xoá / giảm dưới SL đã nhập kho; Kế toán (chỉ Tab 4) chỉ sửa đợt trả, xuất hoá đơn, checklist, nhập tay tổng |
| HDM-03 | Nháp → Đã ký (Số HĐ, NCC, Ngày ký, có dòng / tổng) → Đang nhận hàng / Đã nhận đủ (tự theo phiếu nhập) → Đã tất toán (nhận đủ, trả đủ, NCC đã xuất hoá đơn, đủ hồ sơ). Huỷ khi chưa nhập, chưa trả. Mở lại (HDM-03-ML) |
| HDM-06 | Nhập kho: chỉ khi NCC đã xuất hoá đơn, có số hoá đơn; mỗi dòng = 1 lô `L<số hoá đơn>-<nn>`, đơn giá VNĐ = đơn giá × tỷ giá; không vượt SL còn lại; checklist "Nhập kho" tự tích khi nhận đủ |
| HDM-07/08 | Đợt trả NCC theo % / mốc tiến độ; ghi nhận trả → phiếu **Chi Chờ duyệt**; chỉ tính "đã trả" khi phiếu duyệt; HĐ thuộc Phú Tài chỉ ghi số đã trả (không qua sổ quỹ Oxy) |

### 2.5 Kho (KHO)

| Mã | Quy tắc |
|---|---|
| KHO-01/02 | Kho (KHOnnnn; "Chuyển thẳng" KHO-CT là hệ thống, không sửa / xoá); mã hàng cố định không khoảng trắng; đổi mã hàng đổi ở mọi nơi dùng |
| KHO-03…06 | Phiếu nhập / xuất tự động (từ HĐ) và tay — điều chỉnh (cần số hoá đơn hoặc lý do / HĐ bán hoặc lý do); số `NK{yy}-nnnn` / `XK{yy}-nnnn`; phiếu chỉ sửa Ngày / Ghi chú, không để lô xuất trước ngày nhập; sửa đơn giá lô → giá vốn các dòng xuất của lô cập nhật |
| KHO-08 | Huỷ phiếu kho qua Duyệt xoá: phiếu chuyển "Đã huỷ", tồn tính lại, trạng thái nhận HĐ mua tính lại, HĐ bán hết lần giao về "Hiệu lực"; phiếu nhập có lô đã xuất → không huỷ |
| KHO-09 | Tồn theo lô và theo mã × kho (tới ngày), giá trị tồn theo đơn giá lô (không bình quân) |
| — | Kiểm kê: đếm theo mã, đối chiếu tồn sổ tới ngày kiểm kê, sinh phiếu điều chỉnh (thừa → nhập theo giá lô gần nhất; thiếu → xuất FIFO); đã sinh điều chỉnh thì khoá sửa |
| — | Ánh xạ tên hàng HĐ bán → mã hàng / lô |

### 2.6 Phú Tài (PT)

- HĐ ký về Phú Tài: Báo giá → Hiệu lực (Số HĐ, Ngày ký, Giá bán) → Đang thực hiện → Hoàn thành → Đã tất toán; Huỷ cần lý do.
- Giá đầu vào = Σ HĐ mua "Thuộc Phú Tài" đã chọn + vận chuyển + hải quan + khác; **một HĐ mua chỉ thuộc một HĐ Phú Tài** (P2-08, ràng buộc UNIQUE).
- Chia lợi nhuận (PT-06): "Nhân" — Oxy = (1 − thuế) × (1 − PT giữ) (72%); "Cộng" — Oxy = 1 − thuế − PT giữ (70%); lỗ: thuế = 0, PT không giữ. Đổi tỷ lệ cần quyền PT-06 + lý do, ghi lịch sử.
- Quỹ ảo (PT-09/10): dòng "Oxy chuyển PT" ở đối chiếu tự sinh dòng "Thu về PT"; dòng tay cần lý do. Tất toán: KH trả đủ và Σ "Chi từ PT" ≥ phần Oxy được hưởng.

### 2.7 Việc được giao (TD-01)

Giao cho 1 hoặc nhiều người (trống = việc của mình), gắn HĐ bán tuỳ chọn, hạn / giờ, Giám đốc giao → ưu tiên; trao đổi dạng hội thoại; đánh dấu xong / mở lại. "Sửa của mình" chỉ thấy việc mình giao hoặc được giao.

### 2.8 Báo cáo (BC-01)

Doanh thu, lợi nhuận, thanh toán tính ở client trên dữ liệu được phép xem ("Xem của mình" = HĐ mình phụ trách). Backend có thêm API báo cáo: số dư nguồn tiền, công nợ, tồn kho.

## 3. Trạng thái & luồng chính

### 3.1 Chứng từ kế toán (phiếu thu chi, chi phí HĐ)
```
Nháp ──gửi duyệt──▶ Chờ duyệt ──duyệt (người khác)──▶ Đã duyệt ──yêu cầu xoá──▶ (duyệt xoá) đã xoá
  ▲   ◀──rút lại───────┘   └──từ chối (lý do)──▶ Từ chối ──sửa + gửi lại──▶ Chờ duyệt
  └ xoá thẳng khi Nháp
```
### 3.2 HĐ bán `Báo giá → Hiệu lực → Đang giao hàng → Hoàn thành → Đã tất toán` (+ Huỷ, + Mở lại)
### 3.3 HĐ mua `Nháp → Đã ký → Đang nhận hàng → Đã nhận đủ → Đã tất toán` (+ Huỷ, + Mở lại)
### 3.4 Phú Tài `Báo giá → Hiệu lực → Đang thực hiện → Hoàn thành → Đã tất toán` (+ Huỷ)
### 3.5 Phiếu kho `Hiệu lực → Đã huỷ` (qua duyệt xoá)
### 3.6 Yêu cầu xoá `Chờ duyệt → Đã duyệt | Từ chối | Đã rút`
- Không xoá bản ghi đang khoá (HĐ đã tất toán, phiếu sinh từ đợt của HĐ đã tất toán) hoặc đang được tham chiếu (KH có HĐ, nguồn có phiếu, lô đã xuất…).
- Nguyên tắc hai người: không tự duyệt yêu cầu của mình (trừ KT-07-TD); người gửi có thể rút.
- Khi duyệt: xoá kèm hồ sơ / hoá đơn / tệp của HĐ, dòng tiền Phú Tài; phiếu thu chi phát sinh → bỏ ghi nhận ở đợt thanh toán.

## 4. Điều kiện thành công / thất bại (chuẩn hoá cho API)

| HTTP | Khi nào |
|---|---|
| 200 / 204 | Thành công; lệnh ghi trả `CommandResponse` (bản ghi chính + ChangeSet) |
| 400 | Thân request sai định dạng / thiếu trường bắt buộc (Bean Validation) |
| 401 | Chưa đăng nhập, token sai / hết hạn, sai mật khẩu |
| 403 | Không đủ quyền; tài khoản đang bị bắt đổi mật khẩu gọi lệnh ghi |
| 404 | Không tìm thấy bản ghi |
| 409 | Trùng (Số HĐ, email, mã), sai trạng thái (đã khoá, đã duyệt…), đang được tham chiếu |
| 422 | Vi phạm quy tắc nghiệp vụ (thiếu điều kiện chuyển trạng thái, xuất quá tồn, vượt phải thu…) |
| 500 | Lỗi không lường trước (không lộ chi tiết) |

## 5. Giả định cần xác nhận

| # | Giả định (lấy theo frontend) | Ảnh hưởng |
|---|---|---|
| G-01 | Ghi nhận thực thu HĐ bán sinh phiếu **Thu Chờ duyệt** để số dư nguồn tăng khi duyệt (frontend ghi `[Inference]`, spec không nói rõ) | Sổ quỹ, công nợ |
| G-02 | Cách chia lợi nhuận Phú Tài mặc định "Nhân" (72%) — file thực tế dùng "Cộng" (70%) — chờ Q-03 | Báo cáo PT |
| G-03 | Có 5 nhóm hàng (thêm Khí chuẩn, Dung dịch chuẩn) — chờ Q-01 | Danh mục mã hàng |
| G-04 | Nhóm quyền mặc định theo sheet "Ma trận quyền" D-25 — chờ Q-06 | Phân quyền |
| G-05 | Lưu tệp hồ sơ ở thư mục máy chủ thay cho Google Drive (Q-02 chưa chốt) | Lưu trữ / sao lưu |
| G-06 | Số dư đầu kỳ nguồn tiền, Sale phụ trách trong dữ liệu mẫu là giả định của bản chạy thử | Chỉ dữ liệu dev |
| G-07 | Duyệt xoá HĐ bán xoá luôn các đề nghị vật tư **đã huỷ** của HĐ và bỏ liên kết HĐ ở việc được giao (frontend để tham chiếu treo; DB có khoá ngoại nên backend dọn kèm) | Duyệt xoá |
| G-08 | Duyệt xoá thêm điều kiện so với frontend: NCC có phiếu nhập kho, nguồn tiền đã dùng ở đợt thanh toán HĐ, kho có kiểm kê, mã hàng dùng ở HĐ bán / đề nghị / kiểm kê → không xoá (giữ toàn vẹn khoá ngoại) | Duyệt xoá |
| G-09 | Trạng thái HĐ mua chỉ chuyển tay Nháp → Đã ký, → Đã tất toán, → Huỷ (đúng các nút trên giao diện); hàm frontend cho phép tham số tự do | HĐ mua |
