# Đặc tả API — App Oxy backend

- Base URL: `http://<máy chủ>:8080/api` (dev: frontend gọi `/api`, Angular proxy chuyển sang `localhost:8080`).
- Định dạng: JSON UTF-8; trường không có giá trị **bị bỏ khỏi JSON** (không gửi `null`).
- Xác thực: `Authorization: Bearer <token>` (token từ `POST /api/auth/login`, hết hạn trượt 12 giờ).
- Tài liệu tương tác: **Swagger UI** `http://localhost:8080/swagger-ui.html`, OpenAPI JSON `/v3/api-docs`.
- Kiểu dữ liệu bản ghi (KhachHang, HopDongBan, …) **giống hệt** interface trong `frontend/src/app/core/models.ts`.

## 1. Quy ước phản hồi

### Lệnh ghi — `CommandResponse`
```json
{
  "message": "Không tự duyệt phiếu của mình: TC26-0003",   // cảnh báo không chặn (tuỳ chọn)
  "data": { "...": "bản ghi chính vừa tạo / sửa (tuỳ chọn)" },
  "changes": {
    "prevVersion": 41, "version": 42,
    "upsert": { "hopDongBan": [ {...} ], "phieuThuChi": [ {...} ] },
    "remove": { "hoSo": ["HS..."] },
    "cauHinh": {...}, "cauHinhLog": [...], "boDem": {"TC26": 62}
  }
}
```
`changes` chỉ chứa bản ghi người gọi được xem; bản ghi đổi mà người gọi không được xem → nằm trong `remove`.

### Lỗi — `ApiError`
```json
{ "status": 422, "code": "BUSINESS_RULE", "message": "Còn phải thu 5.400.000 đ · Thiếu hồ sơ: Hoá đơn",
  "path": "/api/hop-dong-ban/HDB.../chuyen-trang-thai", "timestamp": "2026-10-23T04:00:00Z",
  "errors": [ { "field": "lyDo", "message": "Cần nhập lý do" } ] }
```
| status | code | Ý nghĩa |
|---|---|---|
| 400 | `VALIDATION`, `BAD_REQUEST` | Thiếu / sai trường (Bean Validation), JSON sai |
| 401 | `UNAUTHORIZED` | Chưa đăng nhập, token sai / hết hạn, sai mật khẩu |
| 403 | `FORBIDDEN`, `MUST_CHANGE_PASSWORD` | Không đủ quyền; tài khoản phải đổi mật khẩu trước |
| 404 | `NOT_FOUND` | Không có bản ghi / đường dẫn |
| 409 | `CONFLICT`, `DATA_INTEGRITY` | Trùng, sai trạng thái, đang được tham chiếu |
| 413 | `FILE_TOO_LARGE` | Tệp > 20MB |
| 422 | `BUSINESS_RULE` | Vi phạm quy tắc nghiệp vụ |
| 500 | `INTERNAL` | Lỗi không lường trước (không lộ chi tiết) |

### Danh sách — `PageResult<T>`
`{ "items": [...], "page": 0, "size": 50, "total": 404, "totalPages": 9 }` — tham số chung `q` (tìm không dấu, mọi từ), `page` (từ 0), `size` (1–500), `sort=truong,asc|desc`.

## 2. Xác thực
| Method | Path | Body | Trả về | Quyền |
|---|---|---|---|---|
| POST | `/auth/login` | `{email, matKhau}` | `{token, taiKhoan, hetHan}` | công khai |
| POST | `/auth/logout` | — | 204 | đăng nhập |
| GET | `/auth/me` | — | `TaiKhoan` | đăng nhập |
| POST | `/auth/doi-mat-khau` | `{cu, moi, nhapLai}` | 204 | đăng nhập (kể cả đang bắt đổi) |

## 3. Dữ liệu
| GET | `/db` | `Db` đã lọc theo quyền (models.ts) | đăng nhập |
|---|---|---|---|
| GET | `/db/version` | `{version}` | đăng nhập |

## 4. Danh mục
| Method | Path | Body | Quyền (mã chức năng) |
|---|---|---|---|
| GET | `/khach-hang?q&phuTrach&coHoi&tinh&sort&page&size` | — | lọc theo quyền xem |
| POST / PUT | `/khach-hang` / `/khach-hang/{id}` | `KhachHang` | HDB-13 (own: KH mình phụ trách / chưa phân bổ) |
| POST | `/khach-hang/phan-bo` | `{ids[], sale}` | HDB-13-PB |
| POST | `/khach-hang/{id}/cham-soc` | `{noiDung, tiepCan?, coHoi?}` | HDB-13 |
| GET | `/nha-cung-cap?q&sort&page&size` | — | |
| POST / PUT | `/nha-cung-cap[/{id}]` | `NhaCungCap` | HDM-10 |
| POST / PUT | `/nguon-tien[/{id}]` | `NguonTien` | KT-01 |
| GET | `/nguon-tien/so-du?denNgay` | — → `[{nguonTien, ten, chiTiet:{dauKy,thu,chi,lcVao,lcRa,qtThu,qtChi,cpHD,soDu}}]` | KT-01 xem hoặc KT-04 view/edit |
| POST / PUT | `/loai-chi-phi[/{id}]` | `LoaiChiPhi` | KT-01 |
| POST / PUT | `/kho[/{id}]` | `Kho` | KHO-01 |
| POST / PUT | `/loai-hang[/{id}]` | `LoaiHang` | KHO-01 |
| POST | `/loai-hang/{id}/doi-ma` | `{moi}` | KHO-01 |
| POST | `/anh-xa-ten` | `AnhXaTen` | KHO-01 |
| PUT | `/anh-xa-ten/{id}` | `{loaiHang?, lo?, ghiChu?}` | KHO-01 |

## 5. Kế toán
| Method | Path | Body | Quyền |
|---|---|---|---|
| GET | `/phieu-thu-chi?q&loai&trangThai&nguonTien&tuNgay&denNgay&sort&page&size` | — | |
| POST | `/phieu-thu-chi?gui=false\|true` | `PhieuThuChi` | KT-04 ≥ draft |
| PUT | `/phieu-thu-chi/{id}?gui=` | `PhieuThuChi` | KT-04 (draft: phiếu của mình); chỉ Nháp / Từ chối |
| DELETE | `/phieu-thu-chi/{id}` | — | người lập / KT-04 Sửa; chỉ Nháp |
| POST | `/phieu-thu-chi/{id}/rut-lai` | — | người lập; chỉ Chờ duyệt |
| POST | `/phieu-thu-chi/duyet` | `{ids[]}` | KT-07 approve (không tự duyệt trừ KT-07-TD) |
| POST | `/phieu-thu-chi/tu-choi` | `{ids[], lyDo}` | KT-07 approve |
| GET/POST/PUT/DELETE | `/chi-phi-hd…`, `/chi-phi-hd/{id}/rut-lai`, `/chi-phi-hd/duyet`, `/chi-phi-hd/tu-choi` | như sổ quỹ (`ChiPhiHD`) | KT-12 (own: HĐ mình), KT-14 duyệt |
| GET | `/cong-no` | — → `{phaiThu[], phaiTra[]}` | KT-17 (ownView: HĐ mình) |

## 6. Hợp đồng bán
| Method | Path | Body | Quyền |
|---|---|---|---|
| GET | `/hop-dong-ban?q&trangThai&sale&maKH&tuNgay&denNgay&sort&page&size` | — | HDB-01 (own: HĐ mình) |
| GET | `/hop-dong-ban/{id}` | — → `{hopDong, tinhToan:{sauVAT, thue, daThu, daThuCho, conPhaiThu, giaVon, hoSoThieu…}, trangThaiKeTiep}` | |
| POST | `/hop-dong-ban` | `HopDongBan` (có thể kèm `id` đề xuất) | HDB-01 |
| PUT | `/hop-dong-ban/{id}` | `HopDongBan` | HDB-01 (own); không đổi trạng thái |
| POST | `/hop-dong-ban/{id}/chuyen-trang-thai` | `{toi}` | HDB-01 |
| POST | `/hop-dong-ban/{id}/huy` | `{lyDo}` | HDB-01 |
| POST | `/hop-dong-ban/{id}/mo-lai` | — | HDB-03-ML |
| POST | `/hop-dong-ban/{id}/giao-hang` | `{ngay, kho, dong:[{loaiHang, lo?, soLuong, tenTrenHD?, ghiChu?}], ghiChu?}` → `PhieuKho` | HDB-04 |
| POST | `/hop-dong-ban/{id}/dot/{dot}/thuc-thu` | `{ngayThu, soTienThu, nguonTienNhan}` → `PhieuThuChi` | HDB-10 |
| POST | `/hop-dong-ban/{id}/tien-tra-khach` | `{nguoiNhan, soTien, ngay, nguonTien}` → `ChiPhiHD` | KT-12 |
| POST | `/hop-dong-ban/{id}/de-nghi-vat-tu` | `{dong:[{loaiHang, tenHang, soLuong, ghiChu?, dongBanId?}], ghiChu?}` → `string[]` | HDB-01 |
| POST | `/de-nghi-vat-tu/{id}/huy` | `{lyDo}` | HDB-01 |

## 7. Hợp đồng mua
| Method | Path | Body | Quyền |
|---|---|---|---|
| GET | `/hop-dong-mua?q&trangThai&maNCC&thuocPhuTai&tuNgay&denNgay&sort&page&size`, `/hop-dong-mua/{id}` | — | HDM-01 |
| POST / PUT | `/hop-dong-mua[/{id}]` | `HopDongMua` | HDM-01; chỉ HDM-08 → chỉ Tab 4 |
| POST | `/hop-dong-mua/{id}/chuyen-trang-thai` | `{toi: "Đã ký" \| "Đã tất toán" \| "Huỷ"}` | HDM-01 |
| POST | `/hop-dong-mua/{id}/mo-lai` | — | HDM-03-ML |
| POST | `/hop-dong-mua/{id}/nhap-kho` | `{ngay, kho, dong:[{dongId, soLuong}], soHoaDon, vat?, ghiChu?}` → `PhieuKho` | HDM-06 |
| POST | `/hop-dong-mua/{id}/dot/{dot}/tra-ncc` | `{ngayTra, soTienTra, nguonTien?}` → `PhieuThuChi` | HDM-08 |

## 8. Kho
| Method | Path | Body | Quyền |
|---|---|---|---|
| GET | `/phieu-kho?q&loai&kho&trangThai&nguonGoc&tuNgay&denNgay&sort&page&size` | — | |
| POST | `/phieu-kho` | `{phieu:{ngay, loai, kho, hdId?, lyDo?, ghiChu?, soHoaDon?, ncc?}, dongNhap:[{loaiHang, thuocTinh, soLuong, donGia, vat?, ghiChu?}], dongXuat:[…]}` | KHO-06 |
| PATCH | `/phieu-kho/{id}` | `{ngay, ghiChu?}` | theo nguồn gốc phiếu |
| PATCH | `/phieu-kho/{id}/dong/{i}` | `{thuocTinh, donGia, vat?, ghiChu?}` → số dòng xuất cập nhật | theo nguồn gốc phiếu |
| POST / PUT / DELETE | `/kiem-ke[/{id}]` | `KiemKe` | KHO-06 |
| POST | `/kiem-ke/{id}/dieu-chinh` | — | KHO-06 |
| GET | `/kiem-ke/{id}/chenh-lech` | — → `[{loaiHang, soSach, thucTe, lech}]` | |
| GET | `/ton-kho?denNgay&kho&loaiHang` | — → `[{loaiHang, kho, nhap, xuat, ton}]` | KHO-09 / KHO-06 |
| GET | `/ton-kho/lo?denNgay&kho&loaiHang&conHang` | — → lô (đơn giá, tồn, giá trị tồn) | KHO-09 / KHO-06 |

## 9. Phú Tài & Việc
| Method | Path | Body | Quyền |
|---|---|---|---|
| GET | `/hop-dong-phu-tai?…`, `/hop-dong-phu-tai/{id}` (→ `chiaLoiNhuan`, quỹ ảo) | — | PT-01 |
| POST / PUT | `/hop-dong-phu-tai[/{id}]` | `{hd: HopDongPhuTai, lyDoTyLe?}` | PT-01; đổi tỷ lệ cần PT-06 |
| POST | `/hop-dong-phu-tai/{id}/chuyen-trang-thai` | `{toi, lyDoHuy?}` | PT-01 |
| POST | `/dong-tien-pt` | `{ngay, chieu, hdptId?, soTien, ghiChu}` | PT-01 |
| GET | `/viec?q&xong&hdbId&sort&page&size` | — | TD-01 |
| POST | `/viec` | `{noiDung, nguoiNhan[], hdbId?, han?, gio?}` | TD-01 ≥ own |
| POST | `/viec/{id}/phan-hoi`, `/viec/{id}/xong` | `{noiDung}`, `{xong}` | người liên quan / TD-01 Sửa |

## 10. Hồ sơ & tệp
| Method | Path | Body | Quyền |
|---|---|---|---|
| POST | `/tep` (multipart: `file`, `thumb?` data URL) | → `FileRef` | đăng nhập; ≤ 20MB; PDF / PNG / JPG / WEBP / HEIC |
| GET | `/tep/{id}?taiVe=false` | → nội dung tệp | người tải lên, hoặc thấy bản ghi chứa tệp |
| POST | `/ho-so/{chu}/{chuId}/{loai}/tep` | `{fileIds[]}` | quyền sửa HĐ (`chu` = HDB/HDM/HDPT) |
| PATCH | `/ho-so/{chu}/{chuId}/{loai}` | `{daLuu?, daScan?, ghiChu?}` | quyền sửa HĐ |
| POST | `/hoa-don` | `HoaDon` | quyền sửa HĐ |

## 11. Hệ thống
| Method | Path | Body | Quyền |
|---|---|---|---|
| GET | `/yeu-cau-xoa?trangThai&loai&…` | — | |
| GET | `/yeu-cau-xoa/kiem-tra?loai&id` | — → `{lyDo?}` | |
| POST | `/yeu-cau-xoa` | `{loai, maDoiTuong, moTa?, lyDo}` | NT-11 ≥ request |
| POST | `/yeu-cau-xoa/{id}/rut` | — | người gửi |
| POST | `/yeu-cau-xoa/{id}/duyet`, `/yeu-cau-xoa/{id}/tu-choi` (`{lyDo}`) | | NT-11 approve hoặc NT-11-KT (chứng từ kế toán); không tự duyệt |
| PUT | `/cau-hinh/{khoa}` | `{giaTri}` | NT-14 Sửa |
| GET | `/chuc-nang` | — → danh mục chức năng + mức | đăng nhập |
| POST / PUT | `/nhom-quyen[/{id}]` | `{nhom: NhomQuyen, thanhVien?: string[]}` | NT-03 Sửa |
| DELETE | `/nhom-quyen/{id}` | — | NT-03 Sửa |
| PUT | `/nhom-quyen/{id}/thanh-vien` | `{taiKhoan: string[]}` | NT-03 Sửa |
| POST | `/tai-khoan` | `{hoTen, email, nhom[], matKhau}` | NT-03 Sửa |
| PUT | `/tai-khoan/{id}` | `{hoTen, nhom[]}` | NT-03 Sửa |
| POST | `/tai-khoan/{id}/doi-trang-thai` | — | NT-03 Sửa |
| POST | `/tai-khoan/{id}/dat-lai-mat-khau` | `{batDoi}` → `{matKhau, changes}` | NT-03 Sửa |
| GET | `/nhat-ky?taiKhoanId&doiTuong&maDoiTuong&tu&den&page&size` | — | NT-03 Sửa / toàn quyền |
| POST | `/admin/nap-lai-du-lieu-mau` | — | chỉ hồ sơ dev + nhóm toàn quyền |

Ngoài `/api`: `GET /actuator/health` (công khai), `/swagger-ui.html`, `/v3/api-docs` (tắt bằng `APP_SWAGGER_PUBLIC=false`).

## 12. Ví dụ
```bash
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ketoan@oxymecie.vn","matKhau":"Oxy@2026"}' | jq -r .token)
curl -s localhost:8080/api/hop-dong-ban?trangThai=Hi%E1%BB%87u%20l%E1%BB%B1c\&size=5 -H "Authorization: Bearer $TOKEN" | jq '.items[].soHD'
curl -s -X POST localhost:8080/api/hop-dong-ban/<id>/dot/1/thuc-thu -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"ngayThu":"2026-10-23","soTienThu":5000000,"nguonTienNhan":"NT-NH"}' | jq .data.soPhieu
```
