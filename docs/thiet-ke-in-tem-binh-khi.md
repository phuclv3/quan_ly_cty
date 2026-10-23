# Thiết kế chức năng: Nhập thông tin → in PDF tem dán bình khí

Nguồn: `tai_lieu/note_update_1/Nhan_tem_dan_binh_khi_N2_24T037016_25T057121_26T046156.pptx`
(3 slide, khổ 12192000×6858000 EMU ≈ 338,7×190,5 mm; mỗi slide là 1 tem gồm 2 mặt: trái = cảnh báo/liên hệ, phải = thông số bình).

## 1. Dữ liệu cố định và dữ liệu nhập

Mặt trái (cảnh báo, công ty, hotline…) và khung/logo mặt phải là **cố định** → dùng ảnh nền `ppt/media/image1.png`.
Chỉ các ô sau thay đổi theo từng bình:

| Trường (nhãn trên tem) | Khoá JSON | Ví dụ từ PPTX | Ghi chú |
|---|---|---|---|
| Loại / dung tích | `loai` | `10L` | [Inference] "10L" là dung tích; chưa xác nhận ô nào khớp nhãn "Loại" |
| Quy cách van cổ bình | `quyCachVan` | `QF-2` | |
| Vật liệu bình | `vatLieu` | `Thép` / `Nhôm` | chọn từ danh sách |
| Áp suất | `apSuat` | `15 MPa` | |
| Số seri bình | `soSeri` | `25T 057132`, `93201086` | |
| Mã nhận dạng hóa chất | `maUn` | `UN 1066` | tự điền theo khí |
| Định lượng | `dinhLuong` | (không thấy trong PPTX) | |
| Xuất xứ hóa chất | `xuatXu` | `Việt Nam` | mặc định |
| Biện pháp phòng ngừa | `bienPhap[]` | 6 dòng ở slide 1 | mặc định, cho sửa |
| Hướng dẫn sử dụng, bảo quản | `huongDan` | (trống) | |
| Ngày sản xuất | `ngaySanXuat` | `23/10/2026` | |
| Hạn sử dụng | `hanSuDung` | `23/10/2027` | mặc định NSX + 12 tháng (cho sửa) |
| KHÍ CHUẨN ( … ) | `tenKhiChuan` | `N2` | |
| Thành phần khí (≤4 dòng) | `thanhPhan[]` | `Nitơ / N2 / 99.99 %`; `Oxygen / O2 / 15.01 %`; `Nitro oxide / NO / 457ppm`; `Nitrogen / N2 / Cân bằng` | tên khí, ký hiệu, nồng độ |
| Số tem in | `soLuong` | 1 | in lặp N bản |

## 2. Kiến trúc (theo quy ước dự án: tệp tải về do backend dựng — `shared/export.ts`, `XuatController`)

```
Angular  /in-tem  ──POST /api/xuat/tem-binh-khi (JSON)──▶  XuatController
                                                           └─ TemBinhKhiPdf.render(req) → byte[] PDF
            ◀── application/pdf (Content-Disposition: attachment) ──┘
```

- Không lưu DB ở bản đầu (stateless) → không cần migration bảng mới.
- Quyền: thêm 1 chức năng mới (xem §5).
- Ảnh nền + font nằm trong `backend/src/main/resources/mau/` (cạnh `to-trinh.docx`).

## 3. Backend

### 3.1 Phụ thuộc (pom.xml)

[Unverified] Chọn OpenPDF; chưa kiểm tra phiên bản mới nhất, cần xác nhận khi thêm.

```xml
<dependency>
  <groupId>com.github.librepdf</groupId>
  <artifactId>openpdf</artifactId>
  <version><!-- xác nhận bản mới nhất --></version>
</dependency>
```

Font hỗ trợ tiếng Việt phải **nhúng**, đặt vào `resources/mau/fonts/` (ví dụ Roboto/Be Vietnam Pro — cần kiểm tra giấy phép):
`Regular.ttf`, `Bold.ttf`.

### 3.2 DTO

```java
public record TemBinhKhiReq(
    String loai, String quyCachVan, String vatLieu, String apSuat, String soSeri,
    String maUn, String dinhLuong, String xuatXu,
    List<String> bienPhap, String huongDan,
    String ngaySanXuat, String hanSuDung,
    String tenKhiChuan, List<ThanhPhan> thanhPhan, Integer soLuong) {

  public record ThanhPhan(String ten, String kyHieu, String nongDo) {}
}
```

Kiểm tra (ném `ApiException.invalid`): `soSeri` bắt buộc; `thanhPhan` ≤ 4 dòng; `soLuong` 1..100; mỗi chuỗi ≤ 200 ký tự.

### 3.3 Dựng PDF — ảnh nền + chữ đặt theo toạ độ

Toạ độ lấy theo pixel của ảnh nền đã hiển thị rộng 2000 px (đo từ `image1.png`); quy đổi theo tỉ lệ trang.
[Inference] Các số dưới là ước lượng từ ảnh, **phải căn chỉnh lại khi in thử**.

```java
@Component
public class TemBinhKhiPdf {
  private static final float IMG_W = 2000f, IMG_H = 1182f;
  private static final float VAL_X = 1485f;               // cột giá trị mặt phải
  private static final float[] ROW_Y = {238, 270, 306, 342, 377, 413, 449, 485, 521};
  private static final float COL_X[] = {1045, 1370, 1668, 1945}; // khung bảng thành phần
  private static final float[] TB_Y = {1010, 1050, 1090, 1130};  // tâm 4 dòng

  private final byte[] nen;       // mau/tem-binh-khi-nen.png
  private final BaseFont thuong, dam;

  public byte[] render(TemBinhKhiReq r) {
    Rectangle page = new Rectangle(960f, 567f);            // pt, tỉ lệ ≈ 16:9 như slide
    float k = page.getWidth() / IMG_W;
    try (var out = new ByteArrayOutputStream()) {
      Document doc = new Document(page, 0, 0, 0, 0);
      PdfWriter w = PdfWriter.getInstance(doc, out);
      doc.open();
      for (int i = 0; i < Math.max(1, r.soLuong()); i++) {
        if (i > 0) doc.newPage();
        Image bg = Image.getInstance(nen);
        bg.scaleAbsolute(page.getWidth(), page.getHeight());
        bg.setAbsolutePosition(0, 0);
        doc.add(bg);

        PdfContentByte cb = w.getDirectContent();
        String[] v = {r.loai(), r.quyCachVan(), r.vatLieu(), r.apSuat(), r.soSeri(),
                      r.maUn(), r.dinhLuong(), r.xuatXu()};
        for (int j = 0; j < v.length; j++) text(cb, thuong, 22, v[j], VAL_X * k, y(ROW_Y[j], page, k));
        // bienPhap: nhiều dòng, tự xuống dòng trong ô; huongDan tương tự
        text(cb, dam, 22, r.ngaySanXuat(), 1560 * k, y(738, page, k));
        text(cb, dam, 22, r.hanSuDung(),   1560 * k, y(768, page, k));
        text(cb, dam, 28, r.tenKhiChuan(), 1600 * k, y(820, page, k));   // trong "KHÍ CHUẨN ( … )"
        for (int j = 0; j < r.thanhPhan().size(); j++) {
          var t = r.thanhPhan().get(j);
          center(cb, thuong, 22, t.ten(),    COL_X[0], COL_X[1], TB_Y[j], page, k);
          center(cb, thuong, 22, t.kyHieu(), COL_X[1], COL_X[2], TB_Y[j], page, k);
          center(cb, thuong, 22, t.nongDo(), COL_X[2], COL_X[3], TB_Y[j], page, k);
        }
      }
      doc.close();
      return out.toByteArray();
    } catch (Exception e) { throw ApiException.invalid("Không dựng được PDF tem: " + e.getMessage()); }
  }
  // text()/center(): cb.beginText(); setFontAndSize; setTextMatrix(x, y); showText; endText
  // y() = page.getHeight() - yPixel * k  (PDF gốc toạ độ ở góc dưới trái)
}
```

Chữ quá dài: thu nhỏ cỡ chữ (`size = min(size, ôRộng / baseFont.getWidthPoint(s,1))`) thay vì tràn khung.

### 3.4 Endpoint (thêm vào `XuatController`, cùng kiểu `csvTep`)

```java
@Operation(summary = "Tạo PDF tem dán bình khí từ thông tin nhập")
@PostMapping("/tem-binh-khi")
public ResponseEntity<byte[]> temBinhKhi(@RequestBody @Valid TemBinhKhiReq r) {
  Cmd.user();   // + kiểm quyền Perm.temBinhKhi như các màn khác
  String ten = "tem-" + r.soSeri().replaceAll("[\\\\/:*?\"<>|\\s]", "-");
  return tep(tenTep(ten, "pdf"), "application/pdf", pdf.render(r));
}
```

## 4. Frontend (Angular 21, standalone, cùng kiểu `kho/dm-kho.ts`)

- Route: `{ path: 'in-tem', title: T('In tem bình khí'), canActivate: [permGuard('temBinhKhi')], loadComponent: () => import('./kho/in-tem').then((m) => m.InTemPage) }`
- Menu (`shell.ts`): `{ path: '/in-tem', label: 'In tem bình khí', short: 'Tem', icon: 'box', perms: ['temBinhKhi'], group: 'Vận hành' }`
- Hàm gọi API trong `shared/export.ts`:

```ts
export const xuatTemBinhKhi = (req: TemBinhKhiReq) =>
  tai('POST', '/xuat/tem-binh-khi', req, 'tem-binh-khi.pdf');
```

- Form (signal-based): các ô §1; bảng thành phần thêm/xoá dòng (tối đa 4);
  `hanSuDung` tự = `ngaySanXuat` + 12 tháng khi người dùng chưa sửa tay;
  nút **Tải PDF** (gọi `xuatTemBinhKhi`) và **Xem trước** (mở blob PDF trong tab mới).
- Tuỳ chọn tiện (giai đoạn 2): danh mục khí mẫu (Nitơ/N2/UN 1066, Oxy/O2…) để chọn nhanh, lưu `localStorage` hoặc bảng DB.

## 5. Phân quyền

- `Perm.java`: thêm `temBinhKhi("KHO-10", "Kho", "In tem dán bình khí", "Nhập thông tin và xuất PDF tem", Level.view, Level.edit)`.
- `perm.ts`: thêm khoá `'temBinhKhi'` vào `Perm` và mục tương ứng trong danh mục chức năng.
- Migration `V4__chuc_nang_tem_binh_khi.sql`: `INSERT INTO ht_chuc_nang (ma, module, ten, mo_ta, muc_cho_phep) …` (theo mẫu V2) và gán cho nhóm cần dùng.
- Backend kiểm quyền lại (NT-04), không chỉ ẩn menu.

## 6. Kiểm thử

- Unit: `render()` trả byte[] bắt đầu `%PDF`; số trang = `soLuong`; chuỗi tiếng Việt có dấu không ném lỗi font.
- Thủ công: in thử 3 mẫu của PPTX (N2 99.99%; O2 15.01% + N2 cân bằng; NO 457ppm + N2 cân bằng), so khớp với slide, chỉnh toạ độ §3.3.

## 7. Câu hỏi cần xác nhận

1. Khổ giấy in thật của tem (A4 ngang? khổ cuộn?). PPTX là 16:9 nên bản đầu giữ tỉ lệ đó.
2. Mapping 7 giá trị trong PPTX với 9 nhãn (nhất là "Loại" và "Định lượng").
3. File gốc vector (AI/PDF) của tem nếu có — chất lượng in tốt hơn ảnh PNG nền.
4. Có cần lưu lịch sử tem đã in / liên kết với bình trong kho không (giai đoạn 2)?
5. Font nào được phép dùng (giấy phép) — tem gốc dùng font riêng.
