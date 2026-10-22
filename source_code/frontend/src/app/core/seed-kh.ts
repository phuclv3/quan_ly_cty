/**
 * Data khách hàng Kinh doanh — trích từ tai_lieu/du_lieu_thuc_te/File_theo_doi_khach_hang_Kinh_doanh.xlsx
 * (sheet "TỔNG QUÁT"). Tệp sinh tự động bằng scripts/gen-seed-kh.py — không sửa tay.
 * core/seed.ts ghép dữ liệu này vào danh mục khách hàng (ghepDataKH).
 */
export interface RawKhCrm {
  ten: string;
  mst?: string;
  diaChi?: string;
  tinh?: string;
  nguoiLienHe?: string;
  dienThoai?: string;
  email?: string;
  chucVu?: string;
  phanLoai?: string;
  nguon?: string;
  loaiSP?: string;
  hinhThucHD?: string;
  tiepCan?: string;
  coHoi?: string;
  phuTrach?: string;
  trangThaiData?: string;
  ngayTiepNhan?: string;
  ngayPhanBo?: string;
  ghiChuCS?: string;
  giaTri?: number;
}

export const RAW_KH_CRM: RawKhCrm[] = [
 {
  "ngayTiepNhan": "2024-07-05",
  "ten": "Công ty TNHH Công nghệ TN Việt Nam",
  "diaChi": "P 903-34, tầng 9 Sky City Tower A, 88 Láng Hạ, Phường Láng Hạ, Quận Đống Đa, Thành phố Hà Nội, Việt Nam",
  "tinh": "Hà Nội",
  "nguoiLienHe": "Anh Hải",
  "nguon": "Hotline",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Ký hợp đồng",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Yêu cầu KT: - Bình NO2 1000ppm; - Bình hỗn hợp CO, SO2, NO ; - Bình O2 10% ; - Bình N2 ; - Đồng hồ điều áp\nGiá trị đã chào giá (chưa VAT): 128,500,000 đ",
  "dienThoai": "0971765397",
  "giaTri": 128500000
 },
 {
  "ngayTiepNhan": "2024-06-24",
  "ten": "Bệnh viện Đại học Y Hà Nội",
  "tinh": "Hà Nội",
  "nguoiLienHe": "Anh Ngọc",
  "nguon": "Hotline",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Đang liên hệ",
  "coHoi": "Đã báo giá",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Yêu cầu KT: - Bình HCHO: 1000 ppm; - Bình C3H6O 1000 ppm; - Bình C2H6O 1000 ppm\nGiá trị đã chào giá (chưa VAT): 99,000,000 đ",
  "dienThoai": "0904276983",
  "giaTri": 99000000
 },
 {
  "ngayTiepNhan": "2024-07-05",
  "ten": "Trung tâm Công nghệ và Quản lý Môi trường - ETM",
  "diaChi": "Lô T2-6 đường D1, Khu Công nghệ cao, TP. Thủ Đức, TP.HCM",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "Phương",
  "nguon": "Hotline",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Đang liên hệ",
  "coHoi": "Đã báo giá",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Yêu cầu KT: - 01 bình NO2 - 103 ppm (loại bình 1.2L); - 01 bình NO - 400 ppm (loại bình 1.2L); - 01 bình SO2 - 511 ppm (loại bình 1.2L); - 01 bình CO - 503 ppm (loại bình 1.2L); - 01 bình hỗn hợp gồm NO - 400 ppm, SO2 - 511 ppm, CO - 503 ppm (loại bình 10L)\nGiá trị đã chào giá (chưa VAT): 42,500,000 đ",
  "dienThoai": "0905375994",
  "giaTri": 42500000
 },
 {
  "ten": "Công ty CP Thương mại và Công nghệ HTH",
  "diaChi": "Số 8, ngách 31, ngõ 87, đường Lý Sơn, phường Ngọc Thụy, Long Biên",
  "tinh": "Hà Nội",
  "nguon": "Hotline",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "hthtechnology.jsc@gmail.com",
  "dienThoai": "0986217572"
 },
 {
  "ngayTiepNhan": "2024-06-27",
  "ten": "Công ty CP Thương mại dịch vụ tổng hợp TND",
  "diaChi": "Tổ 2 khu 2 Phường Mông Dương- Thành Phố Cẩm Phả - Tỉnh Quảng Ninh",
  "tinh": "Quảng Ninh",
  "nguon": "Hotline",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Huỷ",
  "coHoi": "Huỷ",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Yêu cầu KT: NO 500ppm - Vỏ bình 10L nhôm, áp suất 144 bars ; O2 12.5% - Vỏ bình 10L nhôm, áp suất 144 bars ; SO2 200 ppm - Vỏ bình 10L nhôm, áp suất 144 bars\nGiá trị đã chào giá (chưa VAT): 246,500,000 đ",
  "email": "trannguyet.tnd@gmail.com",
  "dienThoai": "0982907986-Nguyệt",
  "giaTri": 246500000
 },
 {
  "ngayTiepNhan": "2024-06-25",
  "ten": "Công ty JFE Engineering Corporation - Nhật Bản",
  "diaChi": "Thôn Cửu Yên, xã Ngũ Thái, thị xã Thuận Thành, tỉnh Bắc Ninh",
  "tinh": "Bắc Ninh",
  "nguoiLienHe": "Anh Dương",
  "nguon": "Hotline",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Đang liên hệ",
  "coHoi": "Đã báo giá",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Yêu cầu KT: Bình HCL\nGiá trị đã chào giá (chưa VAT): 18,200,000 đ",
  "giaTri": 18200000
 },
 {
  "ngayTiepNhan": "2024-07-05",
  "ten": "Công ty cổ phần thiết bị và kỹ thuật công nghiệp Intec",
  "diaChi": "Số 5B, ngách 5/86, đường Hoàng Quốc Việt, Phường Nghĩa Đô, Quận Cầu Giấy, Thành phố Hà Nội",
  "tinh": "Hà Nội",
  "nguoiLienHe": "Anh Bình: 0966 209 590",
  "nguon": "Hotline",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Đang liên hệ",
  "coHoi": "Đã báo giá",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Yêu cầu KT: - CO/N2: Nồng độ trong khoảng 1.95%,đến 2.0%,  dung tích ≥ 10 lit, áp suất ≥ 100bar; - Bình O2, số lượng: 01; - O2/N2: Nồng độ trong khoảng 20% đến 25% , dung tích ≥ 10 lit, áp suất ≥ 144bar; - NO/N2: Nồng độ trong khoảng 1995ppm đến 2000 ppm, dung tích ≥ 10 lit, áp suất ≥ 144bar; - N2 99.9995%, dung tích ≥ 10 lit, áp suất ≥ 150bar\nGiá trị đã chào giá (chưa VAT): 55,000,000 đ",
  "giaTri": 55000000
 },
 {
  "ngayTiepNhan": "2024-01-31",
  "ten": "Công ty TNHH Đạt Hiển",
  "diaChi": "4/10 Phạm Cự Lượng, Phường 2, Quận Tân Bình, Thành phố Hồ Chí Minh, Việt Nam",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "Chị Nhi",
  "nguon": "Hotline",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Đang liên hệ",
  "coHoi": "Đã báo giá",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Giá trị đã chào giá (chưa VAT): 439,856,000 đ",
  "dienThoai": "0909930882",
  "giaTri": 439856000
 },
 {
  "ngayTiepNhan": "2024-07-30",
  "ten": "Công ty TNHH Thương mại dịch vụ VTS",
  "diaChi": "512 Nguyễn An Ninh, Phường Nguyễn An Ninh, Thành phố Vũng Tàu, Bà Rịa - Vũng Tàu",
  "tinh": "Bà Rịa - Vũng Tàu",
  "nguoiLienHe": "Chị Như",
  "nguon": "Hotline",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Đang liên hệ",
  "coHoi": "Đã báo giá",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Yêu cầu KT: - Bình khí SO2; - Bình khí CO; - Bình khí NO; - Bình khí O2\nGiá trị đã chào giá (chưa VAT): 328,500,000 đ",
  "dienThoai": "0933850907",
  "giaTri": 328500000
 },
 {
  "ngayTiepNhan": "2024-07-31",
  "ten": "Công ty CP Xi măng Bỉm Sơn",
  "diaChi": "Khu phố 7, Phường Ba Đình, Thị xã Bỉm Sơn, Tỉnh Thanh Hoá, Việt Nam",
  "tinh": "Thanh Hóa",
  "nguoiLienHe": "Anh Thuận",
  "nguon": "Hotline",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Đang liên hệ",
  "coHoi": "Đã báo giá",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "0886884328"
 },
 {
  "ten": "Công ty Công nghiệp Hưng Nghĩa",
  "tinh": "Hà Nội",
  "nguoiLienHe": "Chị Tâm",
  "nguon": "Hotline",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "0961865065"
 },
 {
  "ten": "Công ty TNHH Giấy Kraft Vina",
  "diaChi": "lô D-6A-CN, khu công nghiệp Mỹ Phước 3, Phường Thới Hòa, Thị xã Bến Cát, Tỉnh Bình Dương, Việt Nam",
  "tinh": "Bình Dương",
  "nguoiLienHe": "Anh Bắc",
  "nguon": "Tự tìm kiếm",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Đang liên hệ",
  "coHoi": "Đã báo giá",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Yêu cầu KT: Bình O2; Bình Hỗn hợp - Quy cách 50L\n- 31/07: Đã báo giá"
 },
 {
  "ngayTiepNhan": "2023-11-24",
  "ten": "Công ty Cổ phần Công nghệ 4M Việt Nam",
  "tinh": "Hà Nội",
  "phanLoai": "Thương mại",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: 231124/MECIE-4M | Giá trị HĐ ký kết: 20,000,000 đ | Ngày ký HĐ: 24/11/2023 | Sản phẩm: Bình khí SO2",
  "giaTri": 20000000
 },
 {
  "ngayTiepNhan": "2023-11-15",
  "ten": "Công ty Cổ phần Phát triển môi trường Bình Nguyên",
  "tinh": "Bắc Ninh",
  "phanLoai": "End-user Tư nhân",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: 23-11-14-OXYMECIE-MTBN | Giá trị HĐ ký kết: 55,500,000 đ | Ngày ký HĐ: 15/11/2023 | Sản phẩm: Bình khí SO2, Bình khí CO, Bình khí NO, Bình khí NO2, Bình khí O2",
  "giaTri": 55500000
 },
 {
  "ngayTiepNhan": "2023-10-02",
  "ten": "Công ty Cổ phần Môi trường Công nghệ cao Hòa Bình",
  "tinh": "Hòa Bình",
  "phanLoai": "End-user Tư nhân",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: 23-10-02-OXYMECIE-CNC | Giá trị HĐ ký kết: 38,300,000 đ | Ngày ký HĐ: 02/10/2023 | Sản phẩm: Bình khí hỗn hợp SO2/NO/CO, Bình khí O2, Bình khí N2, Van điện từ VT307",
  "giaTri": 38300000
 },
 {
  "ngayTiepNhan": "2023-08-14",
  "ten": "Công ty TNHH Vật tư Thiết bị Công nghiệp Việt",
  "tinh": "Bà Rịa - Vũng Tàu",
  "phanLoai": "Thương mại",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: 47808 | Giá trị HĐ ký kết: 17,600,000 đ | Ngày ký HĐ: 14/08/2023 | Sản phẩm: Bình khí NO2, Bình khí O2",
  "giaTri": 17600000
 },
 {
  "ngayTiepNhan": "2023-12-27",
  "ten": "Công ty CP Thiết bị Công nghiệp và Công nghệ Môi trường Deahan",
  "tinh": "Hà Nội",
  "phanLoai": "Thương mại",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: DEAHAN_03 | Giá trị HĐ ký kết: 17,500,000 đ | Ngày ký HĐ: 27/12/2023 | Sản phẩm: Bình khí O2, Bình khí hỗn hợp SO2/NO/CO",
  "giaTri": 17500000
 },
 {
  "ngayTiepNhan": "2023-07-25",
  "ten": "Công ty Cổ phần Khoa học và Công nghệ Việt Nam",
  "tinh": "Hà Nội",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: 23-07-25-MECIE-VNST | Giá trị HĐ ký kết: 27,000,000 đ | Ngày ký HĐ: 25/07/2023 | Sản phẩm: Bình hỗn hợp VOCs, Bình khí C2H4",
  "giaTri": 27000000
 },
 {
  "ngayTiepNhan": "2023-12-21",
  "ten": "Công ty Cổ phần Công nghệ Môi trường Trái Đất Xanh",
  "tinh": "Long An",
  "nguoiLienHe": "Chị Trinh",
  "phanLoai": "End-user Tư nhân",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: 23-12-18-OXYMECIE | Giá trị HĐ ký kết: 30,000,000 đ | Ngày ký HĐ: 21/12/2023 | Sản phẩm: Bình khí hỗn hợp SO2/NO/CO, Bình khí O2",
  "dienThoai": "0384342242",
  "giaTri": 30000000
 },
 {
  "ngayTiepNhan": "2023-12-22",
  "ten": "Phân viện Bảo hộ lao động và Bảo vệ môi trường miền nam",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "Anh Thắng: 0909.582.245",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: Báo giá ngày 22/12/2023 | Giá trị HĐ ký kết: 10,500,000 đ | Ngày ký HĐ: 22/12/2023 | Sản phẩm: Bình khí hỗn hợp SO2/NO/CO, Bình khí NO2",
  "giaTri": 10500000
 },
 {
  "ngayTiepNhan": "2023-07-20",
  "ten": "Công ty Cổ phần Phốt pho Việt Nam",
  "tinh": "Lào Cai",
  "phanLoai": "End-user Tư nhân",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: 200713/01/PPVN-MECIE | Giá trị HĐ ký kết: 67,000,000 đ | Ngày ký HĐ: 20/07/2023 | Sản phẩm: Bình khí hỗn hợp SO2/NO/CO, Bình khí O2, Bình khí N2",
  "giaTri": 67000000
 },
 {
  "ngayTiepNhan": "2023-07-20",
  "ten": "Công ty Cổ phần Phốt pho Việt Nam",
  "tinh": "Lào Cai",
  "phanLoai": "End-user Tư nhân",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: 200713/02/PPVN-MECIE | Giá trị HĐ ký kết: 40,000,000 đ | Ngày ký HĐ: 20/07/2023 | Sản phẩm: Bình khí HF",
  "giaTri": 40000000
 },
 {
  "ngayTiepNhan": "2023-07-20",
  "ten": "Trung tâm Kỹ thuật Quan trắc Môi trường",
  "tinh": "Quảng Ngãi",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: 23-07-20-MECIE-QTMT | Giá trị HĐ ký kết: 15,700,000 đ | Ngày ký HĐ: 20/07/2023 | Sản phẩm: Bình khí O2, Bình khí CO, Bình khí NO, Bình khí SO2, Bình khí NO2",
  "giaTri": 15700000
 },
 {
  "ngayTiepNhan": "2023-11-09",
  "ten": "Viện Y học Lao Động và Công nghệ Môi trường",
  "tinh": "Hà Nội",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: 231109/MECIE-ETOHI | Giá trị HĐ ký kết: 20,200,000 đ | Ngày ký HĐ: 09/11/2023 | Sản phẩm: Bình khí NO, Bình khí SO2",
  "giaTri": 20200000
 },
 {
  "ngayTiepNhan": "2024-01-09",
  "ten": "Công ty TNHH Công nghệ Tự động HTD",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "Anh Hiếu",
  "phanLoai": "Thương mại",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: 23-12-18-OXYMECIE | Giá trị HĐ ký kết: 19,000,000 đ | Ngày ký HĐ: 09/01/2024 | Sản phẩm: Bình khí O2, Bình khí N2",
  "dienThoai": "0911942568",
  "giaTri": 19000000
 },
 {
  "ngayTiepNhan": "2024-01-25",
  "ten": "Trung tâm Kiểm định Công nghiệp II",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "Anh Bình",
  "nguon": "Khách cũ",
  "loaiSP": "Khí chuẩn",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: 240125/HĐKT/OXYMC-KDCN | Giá trị HĐ ký kết: 16,700,000 đ | Ngày ký HĐ: 25/01/2024 | Sản phẩm: Bình khí hỗn hợp SO2/NO/CO - 1L, Bình O2 - 1L, Bình NO2 - 1L",
  "dienThoai": "0886912688",
  "giaTri": 16700000
 },
 {
  "ten": "Công ty CP Phốt pho vàng Lào Cai",
  "tinh": "Lào Cai",
  "nguoiLienHe": "Chị Dung: 0973.821.847",
  "phanLoai": "End-user Tư nhân",
  "nguon": "Khách cũ",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Hoàn thành",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Mã HĐ: Báo giá ngày 30/01/2024 | Giá trị HĐ ký kết: 16,000,000 đ | Sản phẩm: Bình HF - 8L",
  "giaTri": 16000000
 },
 {
  "ten": "Công ty TNHH KHKT Môi trường THC",
  "tinh": "Chưa xác định",
  "nguon": "Khách cũ",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Ký hợp đồng",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty CP Xây dựng & KT Môi trường Hà Nội",
  "tinh": "Chưa xác định",
  "nguon": "Khách cũ",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Ký hợp đồng",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty TNHH Môi trường KH & KT Giang Sơn",
  "tinh": "Chưa xác định",
  "nguon": "Khách cũ",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Ký hợp đồng",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty TNHH Năng lượng Xanh IDEMITSU VN",
  "tinh": "Chưa xác định",
  "nguon": "Khách cũ",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Ký hợp đồng",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "TT Môi trường & Năng lượng",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "Chị Thảo",
  "nguon": "Khách cũ",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Ký hợp đồng",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "0976455029"
 },
 {
  "ten": "Nhà máy X61",
  "tinh": "Chưa xác định",
  "nguon": "Khách cũ",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Ký hợp đồng",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty CP Công nghệ Môi trường An Sinh",
  "tinh": "Hải Dương",
  "nguon": "Khách cũ",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Ký hợp đồng",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty CP Phốt pho Việt Nam",
  "tinh": "Lào Cai",
  "nguon": "Khách cũ",
  "hinhThucHD": "Trực tiếp",
  "tiepCan": "Hợp đồng",
  "coHoi": "Ký hợp đồng",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty Cổ phần Đông Nam Á Lào Cai",
  "tinh": "Lào Cai",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp\nThông số quan trắc: Lưu lượng, bụi tổng, nhiệt độ, áp suất, O2 dư, SO2, NOx, CO, HF\nLoại trạm: Khí thải\nTình trạng trạm: Chưa lắp\nThông số quan trắc: + Ống khói khu vực lò sấy: t0, áp suất, O2, SO2, CO, NOx."
 },
 {
  "ten": "Công ty TNHH Phốt pho vàng Việt Nam",
  "tinh": "Lào Cai",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, bụi tổng, nhiệt độ, áp suất, O2 dư, SO2, NOx, CO, HF\nTrạm sửa chữa do sét đánh"
 },
 {
  "ten": "Công ty CP Phốt pho 6",
  "tinh": "Lào Cai",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp\nThông số quan trắc: Lưu lượng, bụi tổng, nhiệt độ, áp suất, O2 dư, SO2, NOx, CO, HF"
 },
 {
  "ten": "Công ty Cổ phàn phân lân nung chảy Lào Cai",
  "tinh": "Lào Cai",
  "nguoiLienHe": "Anh Tuyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Mecie\nLoại trạm: Khí thải\nTình trạng trạm: Đã lắp",
  "dienThoai": "035 7956232"
 },
 {
  "ten": "Công ty TNHH MTV Hóa chất Đức Giang Lào Cai",
  "tinh": "Lào Cai",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp\nThông số quan trắc: + Ống khói tại khu vực lò sấy khu A: t0, áp suất, O2, SO2, CO, NOx.; + Ống khói từ công đoạn sấy quặng Apatit khu C: t0, áp suất, O2. ; + Ống khói từ công đoạn phản ứng Apatit và H2SO4 khu C: t0, áp suất, SO2, CO, NOx.; + Ống khói từ công đoạn sấy DCP khu B: t0, áp suất, O2, NOx.; + Ống khói của xưởng MAP khu B: áp suất, O2, NOx.; + Ống khói xưởng axit H3PO4 khu C: t0, áp suất, SO2, CO, NOx. ; + Ống thải khí xưởng axit H2SO4 khu D: áp suất, CO, NOx.\nAnh Khanh gọi"
 },
 {
  "ten": "Tổng Công ty Khoáng sản - TKV/ Chi nhánh Luyện đồng Lào Cai - Vimico",
  "tinh": "Lào Cai",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp\nThông số quan trắc: + Ống thải khí xưởng axit H2SO4: áp suất, CO, NOx."
 },
 {
  "ten": "Công ty TNHH MTV Supe lân Apromaco Lào Cai",
  "tinh": "Lào Cai",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp\nThông số quan trắc: + Khu vực sấy quặng Apatit: t0, áp suất, O2.\nLên báo giá mới, Anh Thái"
 },
 {
  "ten": "Công ty CP DAP số 2 - Vinachem",
  "tinh": "Lào Cai",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp\nThông số quan trắc: + Ống khói xưởng sản xuất SA: t0, áp suất.; + Ống khói xưởng sản xuất PA: bụi tổng, t0, áp suất.; + Ống khói xưởng sản xuất DAP: bụi tổng, t0, áp suất, NH3."
 },
 {
  "ten": "Công ty Cổ phần phốt pho Apatit Việt Nam",
  "tinh": "Lào Cai",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp\nThông số quan trắc: + Ống khói khu vực lò sấy: t0, áp suất, O2, SO2, CO, NOx.; + Ống khói khu vực đốt bùn nghèo: t0, áp suất, O2, SO2, NOx."
 },
 {
  "ten": "Công ty CP Kim loại màu Vimico",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng, nhiệt độ, SO2, O2, NOx, CO, Áp suất"
 },
 {
  "ten": "Công ty CP Xi măng Quán Triều",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng, nhiệt độ, SO2, O2, NOx, CO, Áp suất"
 },
 {
  "ten": "Công ty CP Nhiệt điện Cao Ngạn",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng, nhiệt độ, SO2, O2, NOx"
 },
 {
  "ten": "Công ty CP Nhiệt điện An Khánh",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng, nhiệt độ, SO2, O2, NOx"
 },
 {
  "ten": "Nhà máy xi măng Lưu xá",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi tổng, Lưu lượng, Nhiệt độ, Áp suất"
 },
 {
  "ten": "Công ty CP Xi măng La Hiên",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng, nhiệt độ, CO, SO2, O2, NOx"
 },
 {
  "ten": "Công ty TNHH Kim loại màu Việt Bắc",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng, nhiệt độ, SO2, O2, NOx, CO, Áp suất"
 },
 {
  "ten": "Công ty TNHH Môi trường Sông Công",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Long: 0912029068\nLoại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng, nhiệt độ, SO2, O2, NOx, CO, Áp suất"
 },
 {
  "ten": "Công ty CP Xi măng Quang Sơn",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng, nhiệt độ, SO2, O2, NOx, CO, Áp suất"
 },
 {
  "ten": "Công ty CP Xi măng Cao Ngạn",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi tổng, Lưu lượng, Nhiệt độ, Áp suất"
 },
 {
  "ten": "Công ty CP Gang thép Thái Nguyên",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng, nhiệt độ, SO2, O2, NOx, CO, Áp suất"
 },
 {
  "ten": "Công ty CP Môi trường và Công trình Đô thị Thái Nguyên",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng, nhiệt độ, SO2, O2, NOx, CO, Áp suất"
 },
 {
  "ten": "Chi nhánh Công ty CP Hyundai Aluminum Vina tại Thái Nguyên",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng, nhiệt độ, SO2, O2, NOx, CO, Áp suất"
 },
 {
  "ten": "Công ty CP Dongwha Việt Nam",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng, nhiệt độ, SO2, O2, NOx, CO, Áp suất"
 },
 {
  "ten": "Công ty TNHH Phát triển năng lượng Trina Solar",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, áp suất, nhiệt độ CL2; Lưu lượng, áp suất, nhiệt độ, HF, HCL; Lưu lượng, áp suất, nhiệt độ, NH3, SiH4"
 },
 {
  "ten": "Công ty CP Môi trường Việt Xuân Mới",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty CP Môi trường Anh Đăng",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty TNHH Môi trường CNX )",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty TNHH Thép đặc biệt Shengli Việt Nam",
  "tinh": "Thái Bình",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Nhà máy nhiệt điện Thái Bình 2 – Kênh xả",
  "tinh": "Thái Bình",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty TNHH Công Nghiệp Yangsin Việt Nam",
  "tinh": "Thái Bình",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Nhà máy sản xuất Amon Nitrat",
  "tinh": "Thái Bình",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải"
 },
 {
  "ten": "Nhà máy Nhiệt điện Thái Bình",
  "tinh": "Thái Bình",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải"
 },
 {
  "ten": "Công ty cổ phần TCE Vina Denim – KCN Hòa Xá",
  "tinh": "Nam Định",
  "nguoiLienHe": "Anh Tiệp TCE",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp\nĐã lắp rồi, chưa truyền dữ liệu về Sở TNMT",
  "dienThoai": "090 3403964"
 },
 {
  "ten": "Công ty TNHH TOP Textiles – KCN Rạng Đông",
  "tinh": "Nam Định",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Vị trí 1: TSS, COD, pH, Độ màu, Nhiệt độ, NH4+, TDS, lưu lượng đầu vào, lưu lượng đầu ra; Vị trí 2: TSS, COD, pH, Độ màu, Nhiệt độ, NH4+, TDS, lưu lượng đầu ra; Trạm khí: Nhiệt độ, Nox, O2, SO2, CO, Áp suất, Bụi, Lưu lượng"
 },
 {
  "ten": "Công ty TNHH giày Amara Việt Nam – Tt Cổ Lễ,\nTrực Ninh, Nam Định",
  "tinh": "Nam Định",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ, NOx, O2, SO2, CO, Áp suất, Bụi, Lưu lượng\nMECIE LẮP ĐẶT"
 },
 {
  "ten": "Công ty TNHH Youngone Nam Định – KCN Hòa Xá",
  "tinh": "Nam Định",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ, NOx, O2, SO2, CO, Áp suất, Bụi, Lưu lượng"
 },
 {
  "ten": "Công ty cổ phần dệt nhuộm SVT (nay đổi tên thành\nCông ty CP dệt nhuộm Hải Minh) – KCN Bảo Minh",
  "tinh": "Nam Định",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ, NOx, O2, SO2, CO, Áp suất, Bụi, Lưu lượng; Nhiệt độ, Độ màu, COD, Amoni, TSS, Lưu lượng đầu vào, Lưu lượng đầu ra"
 },
 {
  "ten": "Công ty cổ phần Trịnh Nghiên – TT Quỹ Nhất, huyện Nghĩa Hưng, tỉnh Nam Định",
  "tinh": "Nam Định",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nTrạm đã lắp đặt, hiện dừng hẳn hoạt động do cơ sở không thuộc đối tượng phải QTTD theo quy định hiện hành"
 },
 {
  "ten": "Công ty CP đầu tư và kỹ thuật tài nguyên môi trường ETC – KCN Hòa Xá",
  "tinh": "Nam Định",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nTrạm đã lắp đặt, hiện dừng hẳn hoạt động do cơ sở không thuộc đối tượng phải QTTD theo quy định hiện hành"
 },
 {
  "ten": "Công ty CP TM DV Giấy Thuận An",
  "tinh": "Bình Phước",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty CP Gỗ MDF VRG Dongwha",
  "tinh": "Bình Phước",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Chi nhánh Công ty CP xi măng Hà Tiên",
  "tinh": "Bình Phước",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty CP môi trường Miền Đông",
  "tinh": "Bình Phước",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Vượng: 0962514569"
 },
 {
  "ten": "Công ty TNHH luyện kim Thăng Long",
  "tinh": "Bình Phước",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Khải: 0395953099"
 },
 {
  "ten": "Công ty TNHH MTV Giấy Khôi Nguyên",
  "tinh": "Bình Phước",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty CP giấy Minh Hưng",
  "tinh": "Bình Phước",
  "nguoiLienHe": "Anh Bình",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Mecie",
  "dienThoai": "0907781559"
 },
 {
  "ten": "Công ty TNHH CPV Food",
  "tinh": "Bình Phước",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty TNHH Worldon Việt Nam",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "Anh Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Mecie\nLoại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ,Bụi,Lưu lượng,NOx,SO2,O2,CO, áp suất",
  "dienThoai": "0347434818"
 },
 {
  "ten": "Công ty TNHH SHEICO Việt Nam",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "Anh Hải",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Mecie",
  "dienThoai": "0332017155"
 },
 {
  "ten": "Công ty TNHH MTV Môi trường Đô thị Thành phố Hồ Chí Minh -Công trường Đông Thạnh",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ,Bụi,Lưu lượng,NOx,SO2,O2,CO, áp suất"
 },
 {
  "ten": "Công ty TNHH Siam City Cement -Xi măng SiamCity",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng"
 },
 {
  "ten": "Xi măng Thăng Long",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp bổ sung\nLoại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ,Bụi,Lưu lượng,áp suất"
 },
 {
  "ten": "Chi nhánh công ty TNHH Dầu thực vật Cái Lân",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ,Bụi,Lưu lượng,NOx,SO2,O2"
 },
 {
  "ten": "Công ty Giấy Xuân Mai",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ,Bụi,Lưu lượng,NOx,SO2,O2,CO, áp suất"
 },
 {
  "ten": "Nhà máy xi măng Fico",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng"
 },
 {
  "ten": "Công ty CP Xi Măng Hạ Long",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "Đã triển khai rồi từ đầu năm",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp bổ sung\nLoại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Bụi, lưu lượng"
 },
 {
  "ten": "Công ty xi măng Chinfon - Nhà máy nghiền Clinker Hiệp",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ,Bụi,Lưu lượng,áp suất"
 },
 {
  "ten": "Công ty Cổ Phần Acecook Việt Nam",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ,Bụi,Lưu lượng,NOx,SO2,O2,CO"
 },
 {
  "ten": "Lọc Dầu Cát Lái",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ,Bụi,Lưu lượng,NOx,SO2,O2,CO"
 },
 {
  "ten": "Công ty SiamcityCement Việt Nam (Xi măng Cát Lái);",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ,Bụi,Lưu lượng,áp suất"
 },
 {
  "ten": "Công ty CP xi măng HàTiên 1-Trạm nghiền Phú Hữu",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ,Bụi,Lưu lượng"
 },
 {
  "ten": "Nhà máy Xi măng – Công ty Cổ phần Minh Hưng Quảng Trị",
  "tinh": "Quảng Trị",
  "nguoiLienHe": "A Sung",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp\nThông số quan trắc: Độ bụi, Lưu lượng",
  "dienThoai": "0913485145"
 },
 {
  "ten": "Công ty cổ phần xi măng Bỉm Sơn- Chi nhánh Quảng Trị (KT)",
  "tinh": "Quảng Trị",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Cổ phần Môi trường và Công trình Đô thị Huế- Khu xử lý rác Thùy Dương",
  "tinh": "Thừa Thiên Huế",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ,Bụi,Lưu lượng,NOx,SO2,O2,CO, áp suất"
 },
 {
  "ten": "Công ty Hữu hạn Xi măng Luks (Việt Nam)",
  "tinh": "Thừa Thiên Huế",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nung Clinker C: Nhiệt độ,Bụi,Lưu lượng,NOx,SO2,O2,CO, áp suất; Nung Clinker D: Nhiệt độ,Bụi,Lưu lượng,NOx,SO2,O2,CO, áp suất; Các giai đoạn khác: Bụi tổng, lưu lượng ( 8 trạm)"
 },
 {
  "ten": "Công ty Cổ phần Xi măng Đồng Lâm",
  "tinh": "Thừa Thiên Huế",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Ống khói lò nung + nghiền liệu :Nhiệt độ,Bụi,Lưu lượng,NOx,SO2,O2,CO, áp suất; Các ống khói khác : Nhiệt độ, lưu lượng, áp suất, bụi tổng (5 trạm)"
 },
 {
  "ten": "Công ty Cổ phần Long Thọ",
  "tinh": "Thừa Thiên Huế",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ,Bụi,Lưu lượng,NOx,SO2,O2,CO, áp suất"
 },
 {
  "ten": "Công ty CP xi măng Sông Lam - Ống khói nghiền xi Nghi Thiết",
  "tinh": "Nghệ An",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty CP xi măng Vicem Hoàng Mai (4 ống)",
  "tinh": "Nghệ An",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Nhà máy xi măng Anh Sơn (3 ống)",
  "tinh": "Nghệ An",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Nhà máy xi măng Đô Lương (5 ống)",
  "tinh": "Nghệ An",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Nhà máy xi măng Tân Thắng (4 ống)",
  "tinh": "Nghệ An",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty CP thép Việt Ý - Chi nhánh Hải Phòng",
  "tinh": "Hải Phòng",
  "nguoiLienHe": "Anh Luân",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Mecie",
  "dienThoai": "0982659366"
 },
 {
  "ten": "Xi măng Chinfon",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Xi măng Chinfon 11: Lưu lượng, nhiệt độ, bụi, SO2, CO, O2, Nox  Lưu lượng, nhiệt độ, bụi, áp suất, SO2, CO, O2, Nox"
 },
 {
  "ten": "Công ty CP Nhiệt điện HP",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: 4 ống: Lưu lượng, Nhiệt độ, Bụi , SO2, Nox, O2"
 },
 {
  "ten": "Công ty TNHH Thương mại và Dịch vụ xuất nhập khẩu Liên Minh",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, nhiệt độ, áp suất, bụi, SO2, CO, O2, Nox"
 },
 {
  "ten": "Công ty CP DAP",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhà máy sản xuất axit sunfuric: SO2, Nhiệt điện: So2, lưu lượng, bụi"
 },
 {
  "ten": "Công ty Cổ phần Thép Việt Nhật",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, Nhiệt độ, Bụi, O2"
 },
 {
  "ten": "Nhà máy xi măng Hải Phòng",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, nhiệt độ, áp suất, bụi, SO2, CO, O2, Nox"
 },
 {
  "ten": "Công ty Cổ phần đầu tư thương mại và dịch vụ xuất nhập khẩu Thúy Anh",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng đầu ra, lưu lượng đầu vào, Nhiệt độ, Ph, COD, TSS, Amoni"
 },
 {
  "ten": "Công ty cao su nhựa Hải Phòng",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, nhiệt độ, áp suất, bụi, SO2, CO, O2, Nox"
 },
 {
  "ten": "Công ty TNHH Tân Thuận Phong",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, nhiệt độ, áp suất, bụi, SO2, CO, O2, Nox, C6H6, C8H8"
 },
 {
  "ten": "Công ty TNHH PTTM & SX Đại Thắng",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, nhiệt độ, áp suất, bụi, SO2, CO, O2, Nox"
 },
 {
  "ten": "Công ty CP Vinatic",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng đầu ra, lưu lượng đầu vào 1 VÀ 2, Nhiệt độ, Ph, COD, TSS, Amoni"
 },
 {
  "ten": "Nhựa Phú Lâm HP",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng đầu ra, lưu lượng đầu vào, Nhiệt độ, Ph, COD, TSS, Amoni"
 },
 {
  "ten": "Công ty CP Hóa chất Vico",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, nhiệt độ, áp suất, bụi, SO2, CO, O2, Nox"
 },
 {
  "ten": "Công ty TNHH Thương mại dịch vụ Toàn Thắng",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, nhiệt độ, áp suất, bụi, SO2, CO, O2, Nox"
 },
 {
  "ten": "Công ty TNHH HM Plastics",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, nhiệt độ, áp suất, bụi, SO2, CO, O2, Nox, C2H4O, C3H6O, C6H6, C6H14(CH3)2,"
 },
 {
  "ten": "Công ty TNHH Hóa chất công nghiệp",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, nhiệt độ, áp suất, bụi, SO2, CO, O2, Nox"
 },
 {
  "ten": "Công ty TNHH sanhua VN",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, nhiệt độ, áp suất, bụi, SO2, CO, O2, Nox"
 },
 {
  "ten": "Công ty TNHH Flat Việt Nam",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty TNHH Huge Gain Holdings",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty TNHH giấy HP Hapaco",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, nhiệt độ, áp suất, bụi, SO2, CO, O2, Nox"
 },
 {
  "ten": "Công ty Lục Xương",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Tuấn Tài, Kraft",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Dệt Crystall Pacific",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty DRET - Lò đốt chất thải",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Hòa Phát",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty JAK",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty An Sinh",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Thành Dũng",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty NPK Hải Dương",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Phả Lại 1",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Pramac",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Thành Công",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Xi măng Cường Thịnh",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty xi măng Duyên Linh",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty xi măng Minh Tuấn",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty xi măng Phú Tân",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Xi măng Thành Công 3",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Xi măng Hoàng Thạch",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Xi măng Phú Yên",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Xi măngPhúc Sơn",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Xi măng Trung Hải",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty cổ phần Austdoor Ninh Bình",
  "tinh": "Ninh Bình",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty CP giấy Minh Hưng - Bình Phước",
  "tinh": "Bình Phước",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Bình: 0907781559"
 },
 {
  "ten": "Công ty TNHH xử lý môi trường sạch Việt Nam",
  "tinh": "Bà Rịa - Vũng Tàu",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty CP Giấy Việt Trì",
  "tinh": "Phú Thọ",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Hải: 0983859524"
 },
 {
  "ten": "Công ty CP Phốt pho vàng Lào Cai",
  "tinh": "Lào Cai",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Chị Dung: 0973821847"
 },
 {
  "ten": "Công ty TNHH Kiến trúc Thương mại Á Châu",
  "tinh": "Đà Nẵng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Chị Hoàng: 0935352543"
 },
 {
  "ten": "Công ty Kim loại màu",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Kiên: 0963221449"
 },
 {
  "ten": "Công ty CP nhựa quốc tế CPI",
  "tinh": "Hà Nam",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Cậy: 091 6321630"
 },
 {
  "ten": "Công ty TNHH Khu công nghiệp Texhong Việt Nam",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Toàn 0343748830"
 },
 {
  "ten": "Công ty TNHH môi trường Việt Tiến - Bắc Ninh",
  "tinh": "Bắc Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Nếp: 0967366979"
 },
 {
  "ten": "Công ty Mộc An Châu",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Chị Hương: 0903151449"
 },
 {
  "ten": "Công ty TNHH MTV sản xuất bao bì giấy Bình Minh",
  "tinh": "Bình Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Lân: 0379746567"
 },
 {
  "ten": "Công ty CP môi trường Tân Thiên Nhiên - Đồng Nai",
  "tinh": "Đồng Nai",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty TNHH thép Kyoei Việt Nam",
  "tinh": "Ninh Bình",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Bắc: 0982213488"
 },
 {
  "ten": "Công ty CP môi trường xanh VN",
  "tinh": "Tây Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Lộc:"
 },
 {
  "ten": "Công ty Môi trường Thái Tuấn",
  "tinh": "Tây Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Hà: 0901801168"
 },
 {
  "ten": "Công ty TNHH Nhôm  hợp kim Tân Quang",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Chiến: 0939396878"
 },
 {
  "ten": "Công ty V-Green - Hà Nội (nhà máy Nitory furniture Vietnam - KCN Quang Minh, Mê Linh, Hà Nội)",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Chị Tâm: 0974744186"
 },
 {
  "ten": "Công ty CP Đông A",
  "tinh": "Tây Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty TNHH PT TM SX Đại Thắng - Hải Phòng",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Chị Am: 0375005725"
 },
 {
  "ten": "Công ty Môi trường Thuận Thành",
  "tinh": "Bắc Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Hải: 0973657917"
 },
 {
  "ten": "Công ty CP Phân Lân Ninh Bình",
  "tinh": "Ninh Bình",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Linh: 0912692737"
 },
 {
  "ten": "Công ty Sài Gòn Xanh",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Thức: 0934943947"
 },
 {
  "ten": "Công ty CP nhôm Việt Pháp",
  "tinh": "Phú Thọ",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Long: 0906277993"
 },
 {
  "ten": "Công ty TNHH môi trường công nghiệp xanh - Vĩnh Phúc",
  "tinh": "Vĩnh Phúc",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Chị Thanh: 0983911482"
 },
 {
  "ten": "Công ty TNHH giày Amara Việt Nam",
  "tinh": "Nam Định",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Chị Thắm: 0985670934"
 },
 {
  "ten": "Công ty CP phốt pho Việt Nam - Lào Cai",
  "tinh": "Lào Cai",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Tuyển: 0979009426"
 },
 {
  "ten": "Công ty Nhiệt điện Dầu khí Cà Mau NM1",
  "tinh": "Cà Mau",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Điền: 0943799988"
 },
 {
  "ten": "Công ty TNHH Sanhua (Việt Nam)",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty CP Giấy Koryo",
  "tinh": "Thanh Hóa",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty TNHH Bedra Việt Nam",
  "tinh": "Bắc Giang",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty Kim Trường Phúc (lò hơi MIZA)",
  "tinh": "Thanh Hóa",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty TNHH Tuấn Đạt - Bình Dương",
  "tinh": "Bình Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty giấy Lam Sơn - Thanh Hóa",
  "tinh": "Thanh Hóa",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty Cổ phần Thép Gia Trung",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Chị Trang: 0978266856"
 },
 {
  "ten": "Công ty TNHH Công nghiệp Chiến Thắng",
  "tinh": "Bắc Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Nguyên: 0978948422"
 },
 {
  "ten": "Công ty Cổ phần Dịch vụ Đô thị Đà Lạt",
  "tinh": "Lâm Đồng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Nha: 0984149818"
 },
 {
  "ten": "Công ty TNHH Hyundai Aluminum Vina",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Tám:"
 },
 {
  "ten": "Công ty CP Môi trường Đô thị Thái Nguyên",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Việt: 0916911983"
 },
 {
  "ten": "Công ty TNHH San Fang Việt Nam",
  "tinh": "Bà Rịa - Vũng Tàu",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Chị Hợi: 097 4071526"
 },
 {
  "ten": "Công ty TNHH Quý Tiến",
  "tinh": "Bà Rịa - Vũng Tàu",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty Dung Ngọc",
  "tinh": "Bà Rịa - Vũng Tàu",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Chị Thủy: 0765100258"
 },
 {
  "ten": "Công ty Đạm Phú Mỹ",
  "tinh": "Bà Rịa - Vũng Tàu",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty MIAN LAN",
  "tinh": "Long An",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty Công nghệ cao Hòa Bình",
  "tinh": "Hòa Bình",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty Thép Đà Nẵng - Đà Nẵng",
  "tinh": "Đà Nẵng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty CP Môi trường và Xây dựng Quảng Nam",
  "tinh": "Quảng Nam",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty TNHH MTV Cao su Chu Pah",
  "tinh": "Gia Lai",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Vinh: 0969087068"
 },
 {
  "ten": "Công ty giấy AFC",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Công ty Cổ phần Nam Vang Hà Nam",
  "tinh": "Hà Nam",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Đơn vị lắp quan trắc: Anh Ngọc: 0976941288"
 },
 {
  "ten": "Công ty Cổ phần Elovi",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty Cổ phần khoáng sản và luyện kim Trung Thành - Dự án \"Nhà máy luyện xỉ già mangan tại Khu công nghiệp Sông Công 1, phường Bách Quang, thành phố Sông Công, tỉnh Thái Nguyên",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp"
 },
 {
  "ten": "Công ty Cổ phần Thép Toàn Thắng",
  "tinh": "Thái Nguyên",
  "nguoiLienHe": "Anh Nghiệp",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp\nĐã Lắp",
  "dienThoai": "09484212336"
 },
 {
  "ten": "Công ty Cổ phần Hợp kim sắt gang thép",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp\nĐã Lắp"
 },
 {
  "ten": "Công ty TNHH Hương Đông",
  "tinh": "Thái Nguyên",
  "nguoiLienHe": "Cúc",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp",
  "dienThoai": "0342324845"
 },
 {
  "ten": "Công ty Cổ phần Nhật Anh",
  "tinh": "Thái Nguyên",
  "nguoiLienHe": "Chú Thấm Nhật Anh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp",
  "dienThoai": "0988101507"
 },
 {
  "ten": "Nhà máy luyện xỉ Phú Lương - Dây chuyền luyện xỉ titan của Công ty TNHH Xây dựng và Phát triển Nông thôn miền núi",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp"
 },
 {
  "ten": "Công ty Cổ phần Giấy Hoàng Văn Thụ",
  "tinh": "Thái Nguyên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công Cổ phần Cơ điện Luyện Kim",
  "tinh": "Thái Nguyên",
  "nguoiLienHe": "Anh Toàn",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Tình trạng trạm: Chưa lắp\nThông số quan trắc: Lưu lượng, pH, nhiệt độ,  Amoni, COD, TSS\nKhanh",
  "dienThoai": "0975235888"
 },
 {
  "ten": "CT Nguyệt Minh 2",
  "tinh": "Vĩnh Phúc",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nTrạm đã lắp đặt năm 2019, hiện dừng hoạt động do cơ sở không thuộc đối tưởng phải QTTĐ theo quy định"
 },
 {
  "ten": "Công ty Nhiệt điện Mông Dương",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nThông số quan trắc: Lắp bổ sung"
 },
 {
  "ten": "Công ty TNNH điện lực AES Mông Dương",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nThông số quan trắc: Lắp bổ sung"
 },
 {
  "ten": "Công ty Cổ phần nhiệt điện Quảng Ninh",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nThông số quan trắc: Lắp bổ sung"
 },
 {
  "ten": "Công ty nhiệt điện Cẩm Phả - TKV",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp bổ sung"
 },
 {
  "ten": "Công ty nhiệt điện Đông Triều – TKV",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp bổ sung"
 },
 {
  "ten": "Công ty Cổ phần xi măng Cẩm Phả",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp bổ sung"
 },
 {
  "ten": "Công ty Cổ phần xi măng và xây dựng Quảng Ninh",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp bổ sung"
 },
 {
  "ten": "Công ty Cổ phần đầu tư và xây dựng Việt Long",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp mới"
 },
 {
  "ten": "Công ty Cổ phần xử lý chất thải miền Đông",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp mới"
 },
 {
  "ten": "Công ty TNHH Công nghiệp Jinko Solar (Việt Nam)",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp mới"
 },
 {
  "ten": "Công ty Cổ phần Công nghiệp Cẩm Thịnh",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp mới"
 },
 {
  "ten": "Công ty Cổ phần Hoàng Thái",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp mới"
 },
 {
  "ten": "Công ty Cổ phần Tập đoàn Hạ Long",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp mới"
 },
 {
  "ten": "Công ty TNHH Mặt trời Hạ Long",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp mới"
 },
 {
  "ten": "Tổng Công ty CP Xuất nhập khẩu và Xây dựng Việt\nNam (Vinaconex)",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Thông số quan trắc: Lắp mới"
 },
 {
  "ten": "Công ty SHEICO1&2",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Nhiệt độ,Bụi,Lưu lượng,NOx,SO2,O2,CO, áp suất"
 },
 {
  "ten": "Công ty TNHH Chế biến rác thải sinh hoạt Hoành Sơn - Nhà máy xử lý rác thải",
  "tinh": "Hà Tĩnh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp"
 },
 {
  "ten": "Công ty TNHH gang thép Hưng nghiệp Formosa Hà Tĩnh - Khu liên hợp gang thép cảng Sơn Dương Formosa Hà Tĩnh",
  "tinh": "Hà Tĩnh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty điện lực Dầu khí Hà Tĩnh - Nhà máy Nhiệt điện Vũng Áng 1",
  "tinh": "Hà Tĩnh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải\nTình trạng trạm: Đã lắp"
 },
 {
  "ten": "Công ty TNHH Nhiệt điện Vũng Áng II - Nhà máy Nhiệt điện Vũng Áng II.",
  "tinh": "Hà Tĩnh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Nước thải, Khí thải\nTình trạng trạm: Chưa lắp\nThông số quan trắc: Đang đầu tư xây dựng nhà máy"
 },
 {
  "ten": "Công ty CP Môi trường và Công trình đô thị Hà Tĩnh - Nhà máy chế biến phân hữu cơ rác thải sinh hoạt tại Cảm Quan huyện Cẩm Xuyên",
  "tinh": "Hà Tĩnh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Chưa lắp"
 },
 {
  "ten": "Chi nhánh Công ty Cổ phần thép Việt Ý tại Hải Phòng",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng 1, lưu lượng 2, nhiệt độ, áp suất, bụi, SO2, CO, O2, Nox"
 },
 {
  "ten": "San golf Sông Gía",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "ghiChuCS": "Loại trạm: Khí thải\nTình trạng trạm: Đã lắp\nThông số quan trắc: Lưu lượng, Ph, COD, TSS"
 },
 {
  "ten": "Vimcerts 261 Công ty E.U.C",
  "tinh": "Bình Dương",
  "nguoiLienHe": "0933 42 52 39 hotline",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "eucvina@gmail.com"
 },
 {
  "ten": "Vimcert 178 Trung tâm Kiểm định Công nghiệp II",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "Mr. Bình 0886912688"
 },
 {
  "ten": "VIMCERTS 137 Trung tâm Môi trường và Năng lượng",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "nguyenthaomtnl@gmail.com",
  "dienThoai": "Thanh Thảo  0976455029"
 },
 {
  "ten": "VIMCERTS 113 Phân viện Bảo hộ lao động và Bảo vệ môi trường miền Nam, Viện Nghiên cứu KHoa học kỹ thuật bảo hộ lao động",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "thangduc743054@gmail.com",
  "dienThoai": "Quản lý kĩ thuật Huỳnh Đức Thắng 0909582245"
 },
 {
  "ten": "VIMCERTS 140 Công ty Cổ phần Tư vấn Môi trường Sài Gòn",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "0918 9734 90 Ms Dung",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "vyttt@moitruongsaigon.com.vn",
  "dienThoai": "Quản lý PTN Trần Thị Tường Vy"
 },
 {
  "ten": "Vimcerts 304 CÔNG TY CỔ PHẦN KIỂM NGHIỆM THỰC PHẨM VÀ MÔI TRƯỜNG NAVITEK",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "Nam Đặng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 019 Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng",
  "tinh": "Cần Thơ",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "phamtu10198@gmail.com; congttkt@gmail.com",
  "dienThoai": "Phó trưởng phòng TN Phạm Văn Tú 0982900981 | Phụ trách BP Quan Trắc 0972834126"
 },
 {
  "ten": "VIMCERTS 031 Công ty Cổ phần Dịch vụ SONADEZI",
  "tinh": "Đồng Nai",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "Trưởng Phòng Lê Bá Quân 0989116612"
 },
 {
  "ten": "VIMCERTS 002 Trung tâm Quan trắc - Kỹ thuật tài nguyên và Môi trường, Sở Tài nguyên và Môi trường tỉnh Bình Dương",
  "tinh": "Bình Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "quantrac.tnmt@binhduong.gov.vn",
  "dienThoai": "097 9821141 Ms Tuyết"
 },
 {
  "ten": "VIMCERTS 020 Công ty TNHH EUROFils Sắc ký Hải Đăng",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "0984345349 Mr Bình"
 },
 {
  "ten": "VIMCERTS 039 Công ty TNHH Khoa học công nghệ và Phân tích môi trường Phương Nam",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "0906.737.00 Mr TIến",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "moitruongphuongnam@gmail.com",
  "dienThoai": "0919797284  Mr Khải Tú"
 },
 {
  "ten": "VIMCERTS 086 Công ty TNHH Chugai Technos Việt Nam",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "MR Dũng 0909-714-566",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 117 Công ty CP dịch vụ tư vấn môi trường Hải Âu",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "0372856979"
 },
 {
  "ten": "VIMCERTS 065 Đài Khí tượng Thủy văn khu vực Nam Bộ",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "Ms Yến 0838242474"
 },
 {
  "ten": "VIMCERTS 172 Công ty CP Phát triển Môi trường Thế kỷ mới",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "0908 867 287 hotline",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 203 Công ty TNHH MTV Khoa học công nghệ Hoàn Vũ",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "077 961 6953 hotline",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 223 Công ty TNHH Dịch vụ Kỹ thuật môi trường Thành Nam Á",
  "tinh": "Bà Rịa - Vũng Tàu",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "phamyen072014@gmail.com",
  "dienThoai": "Mr Vũ. 0762181250"
 },
 {
  "ten": "VIMCERTS 075 Trung tâm phân tích và Đo đạc môi trường Phương Nam",
  "tinh": "Bà Rịa - Vũng Tàu",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "nguyenthanhphong.bv@gmail.com; huuphuocbtc@gmail.com",
  "dienThoai": "Trưởng phòng thí nghiệm Nguyễn Thanh Phong 844227879 | Trưởng phòng quan trắc Lê Hữu Phước 0979778620"
 },
 {
  "ten": "VIMCERTS 066 Công ty Cổ phần Đầu tư Phát triển môi trường Đại Việt",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "0837 010199",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "daiviet@dve.vn",
  "dienThoai": "Ms Dương 0916633438"
 },
 {
  "ten": "VIMCERTS 101 Trung tâm Nghiên cứu và Tư vấn Môi trường",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "Mainhan2507@gmail.com",
  "dienThoai": "Trưởng PTN Mai Thị Nhang 0978778110"
 },
 {
  "ten": "VIMCERTS 032 Trung tâm Công nghệ Môi trường tại Thành phố Hồ Chí Minh",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "nguyenvugreen@gmail.com",
  "dienThoai": "0987896554 Nguyễn Thanh Vũ"
 },
 {
  "ten": "VIMCERTS 211 Công ty TNHH Phân tích kiểm nghiệm Việt Tín",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "Trưởng phòng Quan trắc MT Nguyễn Anh Quốc",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "anhquoc1985@gmail.com",
  "dienThoai": "0983840448"
 },
 {
  "ten": "VIMCERTS 177 Công ty TNHH MTV Tài nguyên và Môi trường Miền Nam",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "dung.snre@gmail.com",
  "dienThoai": "\"Phó trưởng phòng  Thạc sĩ Kỹ thuật\" Nguyễn Ngọc Dung 0918246537"
 },
 {
  "ten": "VIMCERTS 073 Phân viện Khoa học Khí tượng Thủy văn và Biến đổi khí hậu",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "xuanhoa.sihymecc@gmail.com",
  "dienThoai": "Lê Xuân Hòa 0972067785"
 },
 {
  "ten": "VIMCERTS 076 Công ty TNHH thương mại dịch vụ tư vấn môi trường Tân Huy Hoàng",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "haiyenpham2010@gmail.com",
  "dienThoai": "Ms Yến 0902 695 765"
 },
 {
  "ten": "VIMCERTS 089 Trung tâm Nghiên cứu, Dịch vụ công nghệ và môi trường (ETC)",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "0903.983.932",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "ttlang@hcmunre.edu.vn"
 },
 {
  "ten": "VIMCERTS 217 Công ty TNHH Thương mại dịch vụ công nghệ môi trường Khải Thịnh",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "moitruongkhaithinh@gmail.com",
  "dienThoai": "0962740584"
 },
 {
  "ten": "VIMCERTS 045 Công ty TNHH Bách Việt Đồng Nai",
  "tinh": "Đồng Nai",
  "nguoiLienHe": "Mr Tuấn 0618.822.789",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "tuananh62375@gmail.com"
 },
 {
  "ten": "VIMCERTS 064 Trung tâm Môi trường và Sinh thái ứng dụng",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "tuvanceeco@gmail.com"
 },
 {
  "ten": "VIMCERTS 106 Viện Y tế công cộng Thành phố Hồ Chí Minh",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "hienquatestkh1@gmail.com",
  "dienThoai": "Trưởng phòng Đinh Văn Hiện 0905314918"
 },
 {
  "ten": "VIMCERTS 068 Trung tâm Phân tích và Môi trường tỉnh Bình Dương",
  "tinh": "Bình Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "duonghaiau2000@gmail.com; hongdiem1101@gmail.com",
  "dienThoai": "Giám đốc Dương Hải Âu 0903302242 | Cán bộ QA/QC Nguyễn Thị Hồng Diễm 09893090848"
 },
 {
  "ten": "VIMCERTS 003 Trung tâm Quan trắc và Kỹ thuật Môi trường",
  "tinh": "Đồng Nai",
  "nguoiLienHe": "0913 909 645 Mr Kiên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 109 Trung tâm Quan trắc tài nguyên và môi trường Đồng Tháp",
  "tinh": "Đồng Tháp",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "Ltngiau.stnmt@dongthap.gov.vn; Ncbinh.stnmt@dongthap.gov.vn",
  "dienThoai": "Trưởng phòng Phân tích thử nghiệm  Lê Thị Ngọc Giàu 0379 810 939 | Trưởng phòng PQuan trắc kỹ thuật Nguyễn Chí Bình 0907 219 451"
 },
 {
  "ten": "VIMCERTS 052 Trung tâm Công nghệ và Quản lý môi trường (ETM)",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "𝐞𝐭𝐦.𝐜𝐤𝐦𝐭@𝐠𝐦𝐚𝐢𝐥.𝐜𝐨𝐦"
 },
 {
  "ten": "VIMCERTS 078 Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng 3",
  "tinh": "Hồ Chí Minh",
  "nguoiLienHe": "VĂN PHÒNG GIAO DỊCH VỀ THỬ NGHIỆM, HIỆU CHUẨN - KIỂM ĐỊNH / KHU VĂN PHÒNG VÀ PHÒNG THÍ NGHIỆM QUATEST 3 - CÁT LÁI",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "dh.q5@quatest3.com.vn; dh.q2@quatest3.com.vn"
 },
 {
  "ten": "VIMCERTS 239 Chi Nhánh Cty TNHH Công nghệ Nhonho",
  "tinh": "Cần Thơ",
  "nguoiLienHe": "090 133 96 69",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 158 Công ty TNHH MTV Khu công nghiệp Vĩnh Lộc",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "0902997690 - Ms Lan Anh"
 },
 {
  "ten": "VIMCERTS 041 Trung tâm Quan trắc và kỹ thuật Tài nguyên - Môi trường",
  "tinh": "An Giang",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "hvqui@gangiang.gov.vn",
  "dienThoai": "PGD 0918.464.339 Hồ Văn Quí"
 },
 {
  "ten": "VIMCERTS 011 Trung tâm Quan trắc tài nguyên và môi trường, Sở Tài nguyên và Môi trường tỉnh Bà Rịa – Vũng Tàu",
  "tinh": "Bà Rịa - Vũng Tàu",
  "nguoiLienHe": "GD Lê Tuấn Kiệt / Trưởng phòng TV&DVMT / Nguyễn Thị Hằng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "kietqtmtbrvt@gmail.com; nguyenhang_ttqt@yahoo.com",
  "dienThoai": "0903809553 | 0903884829 | ."
 },
 {
  "ten": "VIMCERTS 190 Công ty Cổ phần Tư vấn xây dựng và môi trường miền Nam",
  "tinh": "Bà Rịa - Vũng Tàu",
  "nguoiLienHe": "Ms Ngân",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "congtymoitruongmiennam@gmail.com",
  "dienThoai": "0919405945"
 },
 {
  "ten": "VIMCERTS 213 Trung tâm Quan trắc tài nguyên và Môi trường Bạc Liêu",
  "tinh": "Bạc Liêu",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 157 Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng, Chi cục Tiêu chuẩn Đo lường Chất lượng tỉnh Bến Tre",
  "tinh": "Bến Tre",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 262 Trung tâm Quan trắc Tài nguyên và Môi trường Bến Tre",
  "tinh": "Bến Tre",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 160 Công ty TNHH Liên Á Âu",
  "tinh": "Bình Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 221 Công ty TNHH Thương mại Dịch vụ môi trường VietStar",
  "tinh": "Bình Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "phongduan1.vietstar@gmail.com"
 },
 {
  "ten": "Vimcerts 286 Công ty TNHH Môi trường và An toàn lao động Sao Việt",
  "tinh": "Bình Dương",
  "nguoiLienHe": "'0974 720 797 hotline",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "moitruongantoanlaodongsaoviet@gmail.com"
 },
 {
  "ten": "VIMCERTS 014 Trung tâm Quan trắc tài nguyên và môi trường tỉnh Bình Định",
  "tinh": "Bình Định",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 015 Trung tâm Phân tích và Kiểm nghiệm",
  "tinh": "Bình Định",
  "nguoiLienHe": "Trưởng Labo phòng QTMT",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "minhmt30@gmail.com; amqtesting@gmail.com"
 },
 {
  "ten": "VIMCERTS 246 Trung tâm QT&TNMT Bình Phước",
  "tinh": "Bình Phước",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 129 Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng, Chi cục Tiêu chuẩn Đo lường Chất lượng tỉnh Bình Thuận",
  "tinh": "Bình Thuận",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 145 Trung tâm Quan trắc môi trường - Sở Tài nguyên và Môi trường tỉnh Bình Thuận",
  "tinh": "Bình Thuận",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 188 Trung tâm Kỹ thuật - Công nghệ - Quan trắc tài nguyên và môi trường tỉnh Cà Mau",
  "tinh": "Cà Mau",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 232 Trung tâm phân tích, kiểm nghiệm tỉnh Cà Mau",
  "tinh": "Cà Mau",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "ttptkncamau@gmail.com",
  "dienThoai": "(0290) 3580815"
 },
 {
  "ten": "VIMCERTS 131 Trung tâm Quan trắc tài nguyên và môi trường",
  "tinh": "Cần Thơ",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 156 Chi nhánh Cần Thơ - Trung tâm Dịch vụ phân tích thí nghiệm Thành phố Hồ Chí Minh",
  "tinh": "Cần Thơ",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 046 Trung tâm Quan trắc và Phân tích Môi trường tỉnh Đăk Lăk",
  "tinh": "Đắk Lắk",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 142 Trung tâm Nghiên cứu và Quan trắc môi trường nông nghiệp miền Trung và Tây Nguyên",
  "tinh": "Đắk Lắk",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 173 Trung tâm Phân tích và Đo đạc môi trường Phương Nam",
  "tinh": "Đắk Lắk",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 118 Trung tâm Quan trắc tài nguyên và môi trường, Sở TN&MT tỉnh Đăk Nông",
  "tinh": "Đắk Nông",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 109 Trung tâm Quan trắc tài nguyên và môi trường Đồng Tháp",
  "tinh": "Đồng Tháp",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 194 Trung tâm Kỹ thuật thí nghiệm và Ứng dụng khoa học công nghệ, Sở KHCN tỉnh Đồng Tháp",
  "tinh": "Đồng Tháp",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 155 Trung tâm Quan trắc tài nguyên và môi trường tỉnh Hậu Giang",
  "tinh": "Hậu Giang",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 138 Viện Môi trường và Tài nguyên - Đại Học Quốc Gia TP.Hồ Chí Minh",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 001 Chi nhánh Viện dầu khí Việt Nam – Trung tâm Nghiên cứu và Phát triển An toàn và Môi trường Dầu khí",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 009 Viện Nhiệt đới Môi trường",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "vittep@vnn.vn"
 },
 {
  "ten": "VIMCERTS 010 Công ty TNHH MTV Kiểm định Kỹ thuật An toàn Dầu khí Việt Nam",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 026 Trung tâm Tư vấn CNMT & an toàn VSLĐ (COSHET)",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 044 Chi nhánh Công ty CP KHCN Phân tích Môi trường Biển Đức - Trung tâm Nghiên cứu Môi trường",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 053 Trung tâm Công nghệ và Quản lý môi trường và tài nguyên, Đại học Nông lâm Tp HCM",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 077 Trung tâm Công nghệ môi trường, Viện Môi trường và Tài nguyên",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 147 Trung tâm Dịch vụ phân tích thí nghiệm Thành phố Hồ Chí Minh, Sở Khoa học và Công nghệ Thành phố Hồ Chí Minh",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 182 Trung tâm Công nghệ môi trường, Hội Bảo vệ thiên nhiên và môi trường Việt Nam (ENTEC)",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 187 Trung tâm Nghiên cứu Công nghệ và Thiết bị Công nghiệp (Công ty CP KHCN Bách Khoa Tp HCM)",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 191 Công ty Cổ phần Dịch vụ công nghệ Sài Gòn",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 197 Công ty Cổ phần Kỹ thuật Tiêu chuẩn QCVN Việt Nam",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "Nguyễn Thị Quỳnh Vân TP. Thí nghiệm 0974915304 | Giám đốc Lâm Đức Tráng '0961858589"
 },
 {
  "ten": "VIMCERTS 200 Viện Khoa học thuỷ lợi miền Nam, Viện Khoa học thuỷ lợi Việt Nam",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 207 Viện Nghiên cứu phát triển bền vững",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 220 Công ty TNHH Dịch vụ Kỹ thuật TĐT",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 243 Công ty SGS TNHH",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 252 Trung tâm Quan trắc môi trường miền Nam",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 259 Trung tâm nghiên cứu và Ứng dụng KHCN",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "Ms Thúy 0911673785"
 },
 {
  "ten": "Vimcerts 266 Công ty Cổ phần Khoa học môi trường và An toàn lao động miền Nam",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 282 Trung tâm Kiểm soát bệnh tật (CDC) Tp. Hồ Chí Minh",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 283 Trung tâm phân tích và phát triển khoa học công nghệ",
  "tinh": "Hồ Chí Minh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 107 Trung tâm Kỹ thuật tiêu chuẩn đo lường chất lượng",
  "tinh": "Khánh Hòa",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "hienquatestkh1@gmail.com",
  "dienThoai": "Trưởng Phòng thử nghiệm Hóa học và Vi sinh vật  Đinh Văn Hiện 0905314918"
 },
 {
  "ten": "VIMCERTS 216 Viện Hải dương học",
  "tinh": "Khánh Hòa",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 035 Trung tâm Quan trắc tài nguyên và môi trường Khánh Hòa",
  "tinh": "Khánh Hòa",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "ttqt@khanhhoa.gov.vn"
 },
 {
  "ten": "VIMCERTS 062 Trung tâm Ứng dụng và Chuyển giao công nghệ",
  "tinh": "Kiên Giang",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 181 Trung tâm Quan trắc tài nguyên và môi trường Kiên Giang",
  "tinh": "Kiên Giang",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 103 Trung tâm Quan trắc và Phân tích môi trường",
  "tinh": "Kon Tum",
  "nguoiLienHe": "Giám đốc Lê Quang Trưởng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "lqtruong.stnmt@kontum.gov.vn; ldvuong.stnmt@kontum.gov.vn",
  "dienThoai": "0898379789 | PGD Lê Duy Vượng   0905138150"
 },
 {
  "ten": "VIMCERTS 057 Trung tâm Quan trắc tài nguyên và môi trường",
  "tinh": "Lâm Đồng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 204 Viện Nghiên cứu hạt nhân, Viện Năng lượng nguyên tử Việt Nam",
  "tinh": "Lâm Đồng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 130 Trung tâm Quan trắc tài nguyên và Môi trường",
  "tinh": "Long An",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 067 Trung tâm Quan trắc môi trường",
  "tinh": "Ninh Thuận",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 144 Trung tâm Quan trắc môi trường",
  "tinh": "Phú Yên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 193 Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng tỉnh Phú Yên",
  "tinh": "Phú Yên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 051 Trung tâm Trắc địa và Quan trắc môi trường",
  "tinh": "Quảng Ngãi",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 246 Trung tâm QT&TNMT Bình Phước",
  "tinh": "Bình Phước",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 029 Trung tâm Kỹ thuật Quan trắc môi trường",
  "tinh": "Quảng Ngãi",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "anhtraemc@gmail.com; hominhtuan273@gmail.com",
  "dienThoai": "Phó giám đốc Lê Anh Trà 0982376672 | Trưởng Phòng Hồ Minh Tuấn 0914910797"
 },
 {
  "ten": "VIMCERTS 179 Trung tâm Quan trắc tài nguyên và môi trường",
  "tinh": "Sóc Trăng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "hvvinhst@gmail.com",
  "dienThoai": "Huỳnh Vạn Vinh 0976071782"
 },
 {
  "ten": "VIMCERTS 040 Trung tâm Quan trắc Môi trường tỉnh Tây Ninh",
  "tinh": "Tây Ninh",
  "nguoiLienHe": "Giám đốc Huỳnh Võ Tuyết Hân / PGD Phan Kim Đồng 0907.979.606",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "hanhvt@tayninh.gov.vn; dongpk@tayninh.gov.vn; xinhlv@tayninh.gov.vn",
  "dienThoai": "0945.677.879 | PGD Lâm Văn Xinh 0918902666"
 },
 {
  "ten": "VIMCERTS 180 Trung tâm Kỹ thuật và Công nghệ sinh học Tiền Giang thuộc Sở KH&CN tỉnh Tiền Giang",
  "tinh": "Tiền Giang",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 165 Trung tâm Kỹ thuật tài nguyên và môi trường tỉnh Trà Vinh",
  "tinh": "Trà Vinh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "VIMCERTS 110 Trung tâm Ứng dụng tiến bộ khoa học và công nghệ",
  "tinh": "Vĩnh Long",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 006 Công ty Cổ phần Kỹ thuật và Phân tích môi trường",
  "tinh": "Hà Nội",
  "nguoiLienHe": "Bách Vũ - phụ trách tư vấn 0904 98 96 99",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 12 Trung tâm Phân tích và Môi trường Hà Nội",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "ankhangdlm@gmail.com; cae.vpqn@gmail.com",
  "dienThoai": "Phó giám đốc Đặng Ngọc Long 0903446896 | Trưởng Văn Phòng ở Quảng Ninh Bùi Trọng Quí 0989899749"
 },
 {
  "ten": "Vimcerts 16 Trung tâm Quan trắc Phân tích Tài nguyên và Môi trường",
  "tinh": "Thái Bình",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 17 Trung tâm Quan trắc và Phân tích Môi trường",
  "tinh": "Hải Dương",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "nguyetdt82@gmail.com",
  "dienThoai": "Giám đốc Nguyễn Văn Tuyến 0914423950 | Phó Giám đốc Nguyễn Thị Lệ Thanh 0912768959 | Trưởng Phòng QT&PTMT 0982080628"
 },
 {
  "ten": "Vimcerts 21 Trung tâm Quan trắc và Kỹ thuật môi trường Quảng Trị",
  "tinh": "Quảng Trị",
  "nguoiLienHe": "Đường Điện Biên Phủ, phường Đông Lương, TP Đông Hà, tỉnh Quảng Trị",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 23 Trung tâm Quan trắc tài nguyên và môi trường",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 25 Trạm Quan trắc và Phân tích môi trường lao động, Viện nghiên cứu khoa học bảo hộ lao động",
  "tinh": "Hà Nội",
  "nguoiLienHe": "99 Trần Quốc Toản, Phường Trần Hưng Đạo, Quận Hoàn Kiếm - thành phố Hà Nội.",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "(+8424) 22172473; 22172480 | hotline 0941042838"
 },
 {
  "ten": "Vimcerts 27 Trung tâm Quan trắc môi trường - Tống cục Môi trường",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 33 Trung tâm Quan trắc tài nguyên và môi trường",
  "tinh": "Thừa Thiên Huế",
  "nguoiLienHe": "115 Nguyễn Huệ, phường Phú Nhuận, thành phố Huế",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 34 Trung tâm Môi trường và Khoáng sản - Chi nhánh Công ty Cổ phần đầu tư CM",
  "tinh": "Hà Nội",
  "nguoiLienHe": "Liền kề 423 - Khu đất dịch vụ Yên Lộ - Phường Yên Nghĩa, quận Hà Đông",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "thuyhn041984.mtks@gmail.com; truongle.mtks@gmail.com",
  "dienThoai": "Nguyễn Hà Thủy 02253722716 | Lê Thế Trường"
 },
 {
  "ten": "Vimcerts 36 Đài Khí tượng Thủy văn khu vực Trung Trung Bộ",
  "tinh": "Đà Nẵng",
  "nguoiLienHe": "không tìm thấy thông tin",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Trung tâm Khoa học công nghệ và Bảo vệ môi trường Giao thông vận tải (Viện chuyên ngành môi trường - ĐH Giao thông vận tải)",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "chiennv@yahoo.com; hanh.hl86@gmail.com",
  "dienThoai": "Giám đốc Nguyễn Văn Chiến 0912894747 | Phụ trách phòng thí nghiệm Lê Thị Hạnh 0981036986"
 },
 {
  "ten": "Vimcerts 42 Trung tâm ứng dụng tiến bộ Khoa học và Công nghệ",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcert 47 Trung tâm Quan trắc-Phân tích Môi trường biển",
  "tinh": "Hải Phòng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 50 Trung tâm Y tế dự phòng đổi tên Trung tâm Kiểm soát bệnh tật tỉnh Quảng Ninh",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "tuphuong.ytdp@gmail.com; leytdpqn@gmail.com",
  "dienThoai": "Phó Giám đốc Từ Thị Anh Phương 0912658008 | TK. SKMT&YTTH Hoàng Thị Lê  0903263399"
 },
 {
  "ten": "Vimcerts 55 Viện Khoa học và Công nghệ môi trường (ĐH Bách Khoa)",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "giang.tonthu@hust.edu.vn; nam.daoduy@hust.edu.vn",
  "dienThoai": "Giảng viên Thạc sĩ Tôn Thu Giang 0332543001 | Cán bộ Thạc sĩ Đào Duy Nam 0982875552"
 },
 {
  "ten": "Vimcerts 59 Tổng Công ty Tư vấn thiết kế Giao thông vận tải - CTCP",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 60 Trung tâm Kỹ thuật Đo lường Thử nghiệm",
  "tinh": "Quảng Bình",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 69 Viện Khoa học Công nghệ mỏ VINACOMIN",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 71 Phân Viện Bảo hộ lao động và Bảo vệ môi trường miền Trung",
  "tinh": "Đà Nẵng",
  "nguoiLienHe": "178 Triệu Nữ Vương, P. Nam Dương Q. Hải Châu, TP Đà Nẵng",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "0905858715 zalo"
 },
 {
  "ten": "Vimcerts 79 Viện Công nghệ môi trường, Viện Hàn lâm Khoa học và Công nghệ Việt Nam",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "dovanmanh@yahoo.com; thang236@gmail.com",
  "dienThoai": "Phó Viện Trưởng Phó Giáo sư Tiến sĩ Đỗ Văn Mạnh 0963151281 | Phó trường phòng, Tiến sĩ  Phan Quang Thăng 0912532513 | Phụ trách Phòng phân tích môi trường Vũ Văn Tú 0912589540"
 },
 {
  "ten": "Vimcerts 80 Trung tâm Quan trắc môi trường, Chi cục Bảo vệ môi trường tỉnh Lạng Sơn",
  "tinh": "Lạng Sơn",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 82 Trung tâm Phân tích và Chuyển giao công nghệ môi trường, Viện Môi trường nông nghiệp",
  "tinh": "Hà Nội",
  "nguoiLienHe": "Phố Sa Đôi, Phường Phú Đô, Quận Nam Từ Liêm, Hà Nội, Vietnam",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "0439961661"
 },
 {
  "ten": "Vimcerts 88 Trung tâm Công nghệ xử lý môi trường - Bộ Tư lệnh Hóa học",
  "tinh": "Hà Nội",
  "nguoiLienHe": "đang kinh doanh, hiện chưa tìm thấy thông tin",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 92 Trung tâm Quan trắc Tài nguyên và Môi trường - Sở Tài nguyên và Môi trường tỉnh Sơn La",
  "tinh": "Sơn La",
  "nguoiLienHe": "chưa tìm thấy thông tin",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 93 Trung tâm Kỹ thuật tiêu chuẩn Đo lường Chất lượng 1",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "khoatmtsonla@gmail.com; hoa2008mtsla@gmail.com",
  "dienThoai": "Quyền Giám đốc Thạc sĩ Môi trường Nguyễn Ngọc Khoát 097926899 | Tổ trưởng QTPT Đoàn Thị Hòa 0986292640"
 },
 {
  "ten": "Vimcerts 94 Trung tâm Đào tạo và Tư vấn KHCN Bảo vệ môi trường Thủy",
  "tinh": "Hải Phòng",
  "nguoiLienHe": "không tìm thấy tông tin",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 97 Công ty Cổ phần Nước và Môi trường Trường Sơn",
  "tinh": "Nghệ An",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 99 Viện Khoa Học Môi Trường và Sức Khỏe Cộng Đồng",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 105 Công ty Cổ phần Tài nguyên môi trường Đ&T",
  "tinh": "Hà Tĩnh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 111 Trung tâm Quan trắc môi trường, Sở TN&MT tỉnh Nam Định",
  "tinh": "Nam Định",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 112 Viện Kỹ thuật và Công nghệ môi trường, Liên hiệp các hội KH&KT Việt Nam",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 121 Công ty cổ phần Khoa học và Công nghệ Việt Nam",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "vnst@vnst-jsc.vn",
  "dienThoai": "Giám đốc Bùi Ngọc Khoa  0968022247"
 },
 {
  "ten": "Vimcerts 161 Trung tâm Quan trắc Tài nguyên và Môi trường tỉnh Hưng Yên",
  "tinh": "Hưng Yên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 163 Công ty CP Quan trắc và xử lý Môi trường Thái Dương",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "Anhchuc566@gmail.com; Tuannguyen1393@gmail.com",
  "dienThoai": "Giám đốc Cứ nhân kinh tế Dương Văn Chức 0982563838 | Nhân viên, Thạc sĩ Môi trường Nguyên Trung Tuấn 0978334595"
 },
 {
  "ten": "Vimcerts 166 Viện Kiến trúc nhiệt đới - Trường Đại học Kiến trúc Hà Nội",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 170 Trung tâm Dịch vụ Kỹ thuật Tiêu chuẩn Đo lường Chất lượng Thanh Hóa, Chi cục Tiêu chuẩn Đo lường Chất lượng Thanh Hóa",
  "tinh": "Thanh Hóa",
  "nguoiLienHe": "098 862 50 75 / http://tcvn.gov.vn/?fbclid=IwAR0ttLljHWDdnmrIFd_o3-nC6PFVvekymqPUc3bTLlD85ALt922AZe48GBg",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 185 Công ty Cổ phần Liên minh Môi trường và Xây dựng",
  "tinh": "Hà Nội",
  "nguoiLienHe": "https://lienminhmoitruong.com.vn/",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "tanlmmt07@gmail.com; lienminhmoitruong@gmail.com; dotrungduc.lmmt@gmail.com",
  "dienThoai": "Thạc sĩ Chủ tịch HDQT Nguyễn Văn Tản 0981440000  – | Thạc sĩ Tổng Giám đốc Đỗ Trung Đức 0967383444"
 },
 {
  "ten": "Vimcerts 195 Trung tâm Kỹ thuật môi trường và An toàn hoá chất - Chi nhánh Viện Hoá học công nghiệp Việt Nam",
  "tinh": "Hà Nội",
  "nguoiLienHe": "https://ceecs.vn/",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 202 Viện Khoa học Môi trường, Tổng cục Môi trường",
  "tinh": "Hà Nội",
  "nguoiLienHe": "esi.gov.vn",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 225 Công ty TNHH một thành viên môi trường QC",
  "tinh": "Quảng Ninh",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "moitruongqc@gmail.com",
  "dienThoai": "Giám đốc Đoàn Quốc Hùng 0972281888"
 },
 {
  "ten": "Vimcerts 227 Trung tâm Quan trắc Tài nguyên và Môi trường, sở Tài nguyên và Môi trường Điện Biên",
  "tinh": "Điện Biên",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 229 Trung tâm Nghiên cứu và Chuyển giao công nghệ thuộc Viện Hàn lâm Khoa học và Công nghệ Việt Nam",
  "tinh": "Hà Nội",
  "nguoiLienHe": "http://cretech.vast.vn/category_3_46.html",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 235 Công ty Cổ phần kỹ thuật môi trường Việt Nam",
  "tinh": "Hà Nội",
  "nguoiLienHe": "https://moitruongvietnam.org/",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 237 Công ty Cổ phần kỹ thuật môi trường Đại Việt",
  "tinh": "Hà Nội",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "Hảo 0988260070"
 },
 {
  "ten": "Vimcerts 242 Công ty TNHH giải pháp kỹ thuật và truyền thông môi trường",
  "tinh": "Hà Nội",
  "nguoiLienHe": "https",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "dienThoai": "//www.facebook.com/p/C%C3%B4ng-ty-TNHH-Gi%E1%BA%A3i-Ph%C3%A1p-K%E1%BB%B9-thu%E1%BA%ADt-v%C3%A0-Truy%E1%BB%81n-Th%C3%B4ng-M%C3%B4i-tr%C6%B0%E1%BB%9Dng-100054245450726/?paipv=0&eav=AfZkd1G7HsG93p3Q0uKw-2hOae5nBu0Kz_GxA-QCgObyLK1udQ1d6np5DX_4Cg50Plw&_rdr"
 },
 {
  "ten": "Vimcerts 251 Công ty TNHH Tư vấn kỹ thuật, Thiết bị và Công nghệ môi trường Nguyễn Gia",
  "tinh": "Hà Nội",
  "nguoiLienHe": "https://nguyengiaentech.com/quan-trac-moi-truong/",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ",
  "email": "hoapn89x@gmail.com; dotienduc.cr@gmail.com",
  "dienThoai": "Phó Giám đốc Thạc sĩ Phạm Ngọc Hóa 0904535589 | Nhân viên Kĩ sư 0336676064"
 },
 {
  "ten": "Vimcert 279 Cty CP tập đoàn FEC",
  "tinh": "Bắc Giang",
  "nguoiLienHe": "https://fec.com.vn/",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 },
 {
  "ten": "Vimcerts 306 Viện Y học lao động và Công nghệ môi trường",
  "tinh": "Hà Nội",
  "nguoiLienHe": "Hotline 0969.35.35.36",
  "nguon": "Tự tìm kiếm",
  "tiepCan": "Chưa liên hệ",
  "coHoi": "Chưa tiếp cận",
  "trangThaiData": "Chưa phân bổ"
 }
];
