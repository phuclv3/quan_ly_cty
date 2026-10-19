# App Oxy — Spec Quản Lý Nội Bộ

Sep 17, 2026 · @Someone

## Kiến trúc tổng thể

**Nền tảng**: Google Sheets làm database (mỗi entity nghiệp vụ = 1 sheet nguồn), Apps Script làm backend + phục vụ Web App dạng SPA — 1 trang Index.html chứa các iframe module (kept-alive, không load lại), navigateTo\_ chuyển màn hình, prefetch song song sau đăng nhập.

**Quan hệ với app QLKD (Sales) đã có**: khác công ty, khác dữ liệu — workbook Sheets mới, project Apps Script mới, KHÔNG dùng chung deployment hay dữ liệu. Chỉ tái dùng các file/quy ước kỹ thuật đã kiểm chứng:

| Thành phần | Vai trò |
| --- | --- |
| Common\_CSS.html + Common\_JS.html | 1 nguồn UI dùng chung cho mọi module |
| FieldConfig.gs | 1 nguồn khai báo field/cột/nhãn/kiểu; cột mới luôn nối thêm, không tái dùng cột cũ |
| Auth.gs | Đăng nhập nội bộ bằng email + mật khẩu băm (sheet Tài Khoản) + token, vì công ty dùng Gmail cá nhân |
| Quy trình duyệt xóa | Request → Approve, không xóa thẳng |
| Quy ước code | Hàm ghi dữ liệu gọi \_requireCanEdit\_/\_requireOwner\_ trước; hàm nội bộ hậu tố \_; client luôn truyền AUTH\_TOKEN tường minh; postMessage giữa các frame dùng postToAncestors\_/postToDescendantsAndSelf\_, không gọi window.parent.postMessage trực tiếp |
| Quy ước UI | Topbar/bộ lọc flex-wrap, thanh tab position:sticky, bảng rộng freeze cột đầu + cuộn ngang, Times New Roman, vai trò chỉ-xem ẩn nút hành động, bộ lọc = free-text + Năm/Quý/Tháng + multi-select |

**Dữ liệu lịch sử**: 4 file Excel hiện có (THEO DÕI 2026, HỢP ĐỒNG MUA, Bảng kê Thanh Toán, Công nợ Phú Tài Miền Nam) là dữ liệu thật, sẽ import toàn bộ vào Sheets nền sau khi cấu trúc field được chốt — không nhập tay lại.

## Sơ đồ 5 module & quan hệ dữ liệu

Thực thể trung tâm là **Hợp đồng** (Bán + Mua), các module khác đều xoay quanh nó:

flowchart LR  
HDM\[Hợp đồng Mua\] -->|giá đầu vào| HDB\[Hợp đồng Bán\]  
HDM -->|nhập kho| Kho  
HDB -->|xuất kho khi giao| Kho  
HDB -->|đợt thanh toán| CongNoThu\[Công nợ phải thu\]  
HDM -->|đợt thanh toán| CongNoTra\[Công nợ phải trả\]  
HDB -->|chi phí thực hiện| ChiPhiHD\[Chi phí thực hiện HĐ\]  
HDM -->|giá đầu vào| PhuTai\[HĐ Phú Tài\]  
PhuTai -->|dòng tiền riêng| QuyPT\[Quỹ ảo Phú Tài\]

| # | Module | Nghiệp vụ chính |
| --- | --- | --- |
| 1 | Kế toán | Sổ quỹ Thu-Chi (có duyệt), Danh mục Nguồn tiền, Chi phí thực hiện HĐ, Công nợ 2 chiều (tự tính từ HĐ) |
| 2 | Kinh doanh | Hợp đồng Bán ra + Hợp đồng Mua vào (2 bảng riêng, liên kết qua Số HĐ bán) |
| 3 | Kho | Nhập/Xuất tự động từ HĐ Mua/Bán, tồn kho tách theo vị trí kho + biến thể hàng hóa |
| 4 | Phú Tài (Mục 5) | HĐ ký về Phú Tài — module riêng hoàn toàn, dòng tiền/công nợ tách biệt khỏi Kế toán chính |

## Module 1 — Kế toán: Thu-Chi & Công nợ

### Sổ Quỹ chung (PhieuThuChi) — không gắn Hợp đồng

Số phiếu (tự sinh theo năm, VD TC26-0001) · Ngày lập · Loại phiếu (Thu / Chi / Tạm ứng / Quyết toán tạm ứng) · Nguồn tiền · Loại chi phí · Nội dung · Số tiền Thu · Số tiền Chi · Người đề nghị · Người duyệt · **Trạng thái** (Nháp → Chờ duyệt → Đã duyệt/Từ chối) · File đính kèm · Ghi chú.

Chỉ phiếu **Đã duyệt** (bởi Trưởng phòng/Kế toán) mới cộng/trừ vào số dư quỹ.

Bổ sung thêm mục Luân chuyển tiền. Ví dụ từ Ngân hàng rút tiền mặt chuyển sang Quỹ Tiền mặt. Rồi từ Tiền mặt chi tiền cho các hoạt động nội bộ. Hoặc tính giá trị kiểu gì để Số dư Ngân hàng và Số dư Tiền mặt phải khớp đc với nhau

### Danh mục Nguồn tiền (DM\_NguonTien)

Mã nguồn · Tên (Tiền mặt, UNC-MSB, UNC-Vietcombank...) · Loại (Tiền mặt/Ngân hàng) · Số dư đầu kỳ · **Số dư hiện tại** (tự tính = đầu kỳ + tổng Thu − tổng Chi từ phiếu đã duyệt). Chỉ VNĐ — không đa tiền tệ ở sổ quỹ nội bộ.

### Chi phí thực hiện Hợp đồng (ChiPhiThucHienHD) — sổ tách riêng, luôn gắn 1 HĐ

Số HĐ (bắt buộc, chọn từ HopDongBan) · Ngày · Loại chi phí thực hiện · Số tiền · Nguồn tiền chi ra · Người thực hiện · Trạng thái duyệt · Ghi chú. Độc lập hoàn toàn với Sổ Quỹ chung — không chung 1 bảng.

Bổ sung chi phí thực hiện Hợp đồng có tiền hoa hồng kinh doanh của khách. Khi đấy nó sẽ liên quan đến nguồn tiền mặt/ Quỹ chung -> Link với mục Quỹ nội bộ

### Công nợ 2 chiều — báo cáo tự tính, không có bảng nhập tay

| Chiều | Công thức |
| --- | --- |
| Phải thu (khách hàng) | Giá trị HĐ Bán sau VAT − tổng các đợt KH đã thanh toán |
| Phải trả (NCC) | Giá trị HĐ Mua − tổng các đợt đã trả NCC |

Không có bút toán điều chỉnh rời — muốn sửa thì sửa trực tiếp đợt thanh toán trong Hợp đồng gốc.

## Module 2 — Kinh doanh: Hợp đồng Bán ra & Mua vào

2 bảng riêng (HopDongBan, HopDongMua), liên kết qua ô "HĐ bán liên quan" (tùy chọn, vì có thể mua nhập kho trước khi gắn đơn bán cụ thể). Tối đa 3 đợt thanh toán mỗi HĐ (tái dùng cơ chế "hiện dần theo đợt" đã có ở app QLKD).

### HopDongBan — 5 tab

| Tab | Nội dung |
| --- | --- |
| 1\. Thông tin chung | Số HĐ bán · Tên khách hàng · MST · Địa chỉ · Ngày ký · Ngày hiệu lực · **Trạng thái**: Báo giá → Hiệu lực → Đang giao hàng → Hoàn thành → Đã tất toán · Sale phụ trách · Ghi chú |
| 2\. Lưu trữ hồ sơ | Hợp đồng · BBGH/BBNT · Hóa đơn · Scan hồ sơ · Ghi chú hồ sơ thiếu (upload file, thumbnail + nén ảnh tự động, tải zip)   Cái này là tải lên drive công để lưu, cần tích xem đã lưu chưa? Hóa đơn phải nhập số hóa đơn vào đây, ngày hóa đơn để theo dõi, và bắt buộc phải có thao tác lưu và scan dữ liệu |
| 3\. Giá trị & Thanh toán | Tổng GTHĐ sau/trước VAT · GTHĐ thực tế trước VAT · Chênh lệch (tự tính) · Thuế TNDN 25% trên chênh lệch (tự tính) · Tiền trả khách + ngày chi · tối đa 3 đợt thanh toán → Công nợ phải thu tự tính ngay tại đây   Tiền thuế TNDN tính theo công thức: <20% thu 25%, >20% thu 50% |
| 4\. Chi phí thực hiện HĐ | Danh sách từ ChiPhiThucHienHD lọc theo HĐ này (chỉ xem, nhập ở màn Kế toán) + tổng chi phí → lợi nhuận gộp tạm tính   Chi phí thực hiện có thể là vận chuyển nên phải cho Quyết toán vận chuyển theo từng Hợp đồng |
| 5\. Hợp đồng mua liên quan | Danh sách các HopDongMua đã trỏ tới HĐ này |

Khi đánh dấu **đã giao hàng** ở Tab 1 → tự động sinh phiếu Xuất kho tương ứng (Module 3).

### HopDongMua — 4 tab

| Tab | Nội dung |
| --- | --- |
| 1\. Thông tin chung | Số HĐ mua · Tên NCC · Địa chỉ · MST · Ngày ký · HĐ bán liên quan (tùy chọn) · Trạng thái |
| 2\. Lưu trữ hồ sơ | Giống Tab 2 bên Bán |
| 3\. Chi tiết hàng hóa | Bảng con nhiều dòng: Tên hàng · Thông số/nồng độ/thể tích · Số lượng · Đơn giá · **Loại tiền (VNĐ/USD/RMB) + Tỷ giá → Thành tiền VNĐ tự tính** · Ghi chú |
| 4\. Thanh toán NCC | Tổng giá trị HĐ (tự tính từ Tab 3 hoặc nhập tay) · tối đa 3 đợt thanh toán → Công nợ phải trả tự tính · Xuất hóa đơn (Đã/Chưa) · Tiến độ hàng hóa/checklist |

Khi đánh dấu **đã nhập kho** ở Tab 3 → tự động sinh phiếu Nhập kho tương ứng (Module 3).

## Module 3 — Kho: Nhập-Xuất-Tồn

Đối tượng quản lý chính: **vỏ bình/thiết bị tái sử dụng** và **phụ kiện** (van điều tiết...) — khí bên trong pha theo đơn riêng nên không chuẩn hóa SKU theo khí, nhưng tồn kho vẫn tách theo tổ hợp biến thể cụ thể (chi tiết loại/thông số sẽ chốt sau khi có danh mục đầy đủ).

### Danh mục Kho (DM\_Kho) — vì kho nằm rải rác nhiều nơi

Mã kho · Tên/địa điểm (có thể tự thêm mới) · kể cả điểm đặc biệt "Để tại Phú Tài". Mỗi phiếu Nhập/Xuất phải chọn **Vị trí kho**, gồm cả giá trị đặc biệt **"Chuyển thẳng — không qua kho"** (hàng đi thẳng từ NCC tới công trình/khách, không tính vào tồn kho nơi nào).

### Phiếu Nhập kho / Xuất kho

Ngày · Loại phiếu (Nhập/Xuất) · Nguồn gốc (tự động từ HĐ Mua/HĐ Bán, hoặc nhập tay — điều chỉnh) · Số HĐ liên quan · Vị trí kho · Loại hàng + thuộc tính biến thể (nồng độ/thể tích/áp suất...) · Số lượng · Ghi chú · Người thực hiện.

-   **Nhập kho**: tự động sinh khi đánh dấu "đã nhập kho" ở Tab 3 HopDongMua.
-   **Xuất kho**: tự động sinh khi đánh dấu "đã giao hàng" ở Tab 1 HopDongBan.
-   Phiếu đánh dấu "Chuyển thẳng" không cộng/trừ tồn kho ở vị trí nào.

### Tồn kho (TonKho) — báo cáo tự tính

Cộng dồn theo **từng tổ hợp biến thể** (Loại hàng × thuộc tính × Vị trí kho) = tổng Nhập − tổng Xuất tại vị trí đó. Danh mục Loại hàng (DM\_LoaiHang) sẽ được chốt chi tiết ở vòng trao đổi riêng khi bạn có đầy đủ danh sách.

Kho phải link được Hợp đồng Thực hiện. Ví dụ như Xuất kho mặt hàng A cho Hợp đồng nào -> Đánh theo mã số Hợp đồng -> Tính ra giá trị thực hiện gốc của Hợp đồng

## Module 4 — Phú Tài (Mục 5): HĐ ký về Phú Tài

Module riêng hoàn toàn, không đụng vào quỹ/kho/công nợ chính của Oxy. Có 2 kịch bản thực tế: (a) hàng về container để lại Phú Tài, Phú Tài xuất hóa đơn bán thẳng cho khách; (b) Oxy tìm đầu vào (nguồn hàng) cho Phú Tài rồi họ xuất hóa đơn bán đi. Trong cả 2 trường hợp, **Phú Tài là bên đứng tên xuất hóa đơn cho khách cuối, không phải Oxy** — hàng không qua kho Oxy.

### HopDongPhuTai — 5 tab

| Tab | Nội dung |
| --- | --- |
| 1\. Thông tin chung | Số HĐ · Tên khách hàng cuối · MST · Ngày ký · Ngày hiệu lực · Trạng thái · Lưu trữ hồ sơ |
| 2\. Giá bán cho khách | Tổng GTHĐ sau/trước VAT · các đợt KH thanh toán cho Phú Tài (theo dõi để đối chiếu, không phải công nợ của Oxy) |
| 3\. Giá đầu vào | Giá mua hàng hóa (link từ HopDongMua) + Vận chuyển + Chi phí hải quan + Chi phí đầu vào khác (bảng con nhiều dòng) · các đợt Phú Tài trả NCC |
| 4\. Chênh lệch & Chia lợi nhuận | Xem công thức bên dưới — hiển thị tuần tự từng bước tính |
| 5\. Đối chiếu thanh toán 3 bên | Bảng con nhiều dòng: Ngày Oxy chuyển Phú Tài (VNĐ) · Ngày Phú Tài chuyển NCC (USD/VNĐ + tỷ giá) · Ghi chú |

### Công thức chia lợi nhuận (Tab 4)

| Bước | Công thức |
| --- | --- |
| Giá đầu vào trước VAT | Giá mua hàng hóa (từ HĐ Mua) + Vận chuyển + Hải quan + Chi phí đầu vào khác |
| Lợi nhuận trước thuế | Giá HĐ (giá bán) trước VAT − Giá đầu vào trước VAT |
| Lợi nhuận sau thuế | Lợi nhuận trước thuế × 80% (Phú Tài đóng TNDN 20%) |
| Phú Tài giữ (phí quản lý) | 10% × Lợi nhuận sau thuế |
| Oxy được hưởng (gộp) | 90% × Lợi nhuận sau thuế |
| Hoa hồng khách hàng | Nhập tay (số tiền hoặc %) |
| **Lợi nhuận thực của Oxy** | Oxy được hưởng (gộp) − Hoa hồng khách hàng |

### DongTienPhuTai — sổ dòng tiền quỹ ảo Phú Tài, độc lập với Nguồn tiền của Module 1

Ngày · Chiều (Thu về PT / Chi từ PT) · Hợp đồng liên quan · Số tiền · Ghi chú → số dư quỹ Phú Tài tự tính riêng, tách biệt hoàn toàn khỏi DM\_NguonTien.

## Các bước tiếp theo & câu hỏi còn mở

### Còn cần chốt trước khi code

-   Danh mục Loại hàng/vỏ bình đầy đủ (DM\_LoaiHang) và danh sách Kho/vị trí (DM\_Kho) — bạn cung cấp danh sách thực tế. -> 3 kho: Kho Toàn Cầu, Kho Phú Tài, Kho Huy Thịnh
-   Danh mục Loại chi phí (Văn phòng, Marketing, Công tác phí, Vận chuyển...) dùng chung cho Sổ Quỹ và Chi phí thực hiện HĐ. -> Tách riêng: Chi phí Văn phòng, Marketing, Lương/ Thương, Công tác phí là chi phí vận hành. Những chi phí vận chuyển, kiểm định, phát sinh liên quan đến thực hiện Hợp đồng mới tính vào chi phí thực hiện Hợp đồng.
-   Phân quyền theo vai trò: ai xem/sửa module nào (Kế toán, Sale, Kho, chỉ-xem...). -> Sales xem được Khách hàng. Admin xem được Hợp đồng. Kế toán và Giám Đốc xem được hết.
-   Cấu trúc import 4 file Excel hiện có vào các bảng nền tương ứng (mapping cột cũ → field mới).
-   Layout UI chi tiết: menu tổng, dashboard trang chủ, quy ước màu sắc/biểu tượng riêng cho App Oxy.

### Đã chốt (tóm tắt)

Kiến trúc SPA Google Sheets + Apps Script, tái dùng quy ước kỹ thuật/UI từ app QLKD nhưng dữ liệu và deployment hoàn toàn tách biệt · 4 module dữ liệu chính (Kế toán, Kinh doanh, Kho, Phú Tài) với các bảng nền, tab và công thức tự tính đã mô tả ở trên.