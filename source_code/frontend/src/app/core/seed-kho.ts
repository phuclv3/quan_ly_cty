/**
 * Dữ liệu kho — trích từ tai_lieu/note_update/KhoOxyMecie_v3.xlsx (sheet "DM. Mã hàng", "1. NhapKho", "5. AnhXaTenBan", "6. KiemKe").
 * Tệp sinh tự động bằng scripts/gen-seed-kho.py — không sửa tay.
 */
export interface RawMaHang {
  ma: string;
  nhom: string;
  dvt: string;
  loaiKhi?: string;
  theTich?: string;
  bietDanh?: string[];
}

export interface RawLoNhap {
  ngay: string;
  soHoaDon: string;
  lo: string;
  ncc: string;
  ma: string;
  quyCach: string;
  soLuong: number;
  donGia: number;
  vat: number;
}

export interface RawKiemKe {
  ngay: string;
  dong: { ma: string; soLuong: number; tenHang: string; xuatXu?: string; nongDo?: string }[];
}

export interface RawAnhXa {
  ten: string;
  theTich?: string;
  nongDo?: string;
  tongSL: number;
  soLan: number;
  ma?: string;
  lo?: string;
  ghiChu?: string;
}

export const RAW_MA_HANG: RawMaHang[] = [
 {
  "ma": "DD-PH",
  "nhom": "Dung dịch chuẩn",
  "dvt": "Chai",
  "loaiKhi": "pH",
  "theTich": "500ml",
  "bietDanh": [
   "Dung dịch chuẩn PH7",
   "Dung dịch chuẩn pH",
   "Dung dịch chuẩn pH 10",
   "Dung dịch chuẩn pH 4",
   "Dung dịch chuẩn pH 7"
  ]
 },
 {
  "ma": "DD-AMONI",
  "nhom": "Dung dịch chuẩn",
  "dvt": "Chai",
  "loaiKhi": "Amoni (NH4-N)",
  "theTich": "500ml",
  "bietDanh": [
   "Dung dich chuẩn Amoni",
   "Dung dịch chuẩn NH4",
   "Dung dịch chuẩn NH4-N",
   "Dung dịch chuẩn NH4-N 100ppm",
   "Dung dịch chuẩn NH4-N 10ppm",
   "Dung dịch chuẩn NH4-N 50ppm",
   "Dung dịch chuẩn NH4-N 5ppm"
  ]
 },
 {
  "ma": "DD-COD",
  "nhom": "Dung dịch chuẩn",
  "dvt": "Chai",
  "loaiKhi": "COD",
  "theTich": "500ml",
  "bietDanh": [
   "Dung dịch chuẩn COD",
   "Dung dịch chuẩn COD 100ppm",
   "Dung dịch chuẩn COD 10ppm",
   "Dung dịch chuẩn COD 300ppm",
   "Dung dịch chuẩn COD 50ppm"
  ]
 },
 {
  "ma": "DD-TSS",
  "nhom": "Dung dịch chuẩn",
  "dvt": "Chai",
  "loaiKhi": "TSS",
  "theTich": "500ml",
  "bietDanh": [
   "Dung dịch chuẩn TSS",
   "Dung dịch chuẩn TSS 100ppm",
   "Dung dịch chuẩn TSS 10ppm",
   "Dung dịch chuẩn TSS 50ppm"
  ]
 },
 {
  "ma": "DD-KHAC",
  "nhom": "Dung dịch chuẩn",
  "dvt": "Chai",
  "loaiKhi": "Khác (NO3...)",
  "bietDanh": [
   "Dung dịch chuẩn NO3"
  ]
 },
 {
  "ma": "KC-KHAC",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "bietDanh": [
   "Đầu chuyển đổi"
  ]
 },
 {
  "ma": "KC-ACETONE-40L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "ACETONE",
  "theTich": "40L",
  "bietDanh": [
   "Khí chuẩn Acetone (C3H6O)"
  ]
 },
 {
  "ma": "KC-BENZEN-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "BENZEN",
  "theTich": "8L",
  "bietDanh": [
   "Khí chuẩn Benzen"
  ]
 },
 {
  "ma": "KC-C3H6-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "C3H6",
  "theTich": "8L",
  "bietDanh": [
   "Khí chuẩn C3H6"
  ]
 },
 {
  "ma": "KC-CH4",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CH4",
  "bietDanh": [
   "Hỗn hợp khí chuẩn CH4/N2"
  ]
 },
 {
  "ma": "KC-CH4-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CH4",
  "theTich": "8L",
  "bietDanh": [
   "Bình khí CH4"
  ]
 },
 {
  "ma": "KC-CHU-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CHU",
  "theTich": "10L",
  "bietDanh": [
   "Bình khí chuẩn"
  ]
 },
 {
  "ma": "KC-CO",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CO",
  "bietDanh": [
   "Khí chuẩn CO"
  ]
 },
 {
  "ma": "KC-CO-1L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CO",
  "theTich": "1L",
  "bietDanh": [
   "Khí chuẩn CO"
  ]
 },
 {
  "ma": "KC-CO-1.2L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CO",
  "theTich": "1.2L",
  "bietDanh": [
   "Khí chuẩn CO"
  ]
 },
 {
  "ma": "KC-CO-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CO",
  "theTich": "8L",
  "bietDanh": [
   "Bình Khí CO",
   "Bình khí CO",
   "Bình khí chuẩn CO",
   "Bình khí hiệu chuẩn CO",
   "CO calibration gas",
   "Khí CO",
   "Khí chuẩn CO"
  ]
 },
 {
  "ma": "KC-CO-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CO",
  "theTich": "10L",
  "bietDanh": [
   "Bình khí CO",
   "Khí chuẩn CO"
  ]
 },
 {
  "ma": "KC-CO-20L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CO",
  "theTich": "20L",
  "bietDanh": [
   "Bình khí hiệu chuẩn CO",
   "Khí chuẩn CO"
  ]
 },
 {
  "ma": "KC-CO-40L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CO",
  "theTich": "40L",
  "bietDanh": [
   "CO calibration gas",
   "Khí chuẩn CO"
  ]
 },
 {
  "ma": "KC-CO-50L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CO",
  "theTich": "50L",
  "bietDanh": [
   "Bình khí hiệu chuẩn CO"
  ]
 },
 {
  "ma": "KC-CO2",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CO2",
  "bietDanh": [
   "Khí chuẩn CO2"
  ]
 },
 {
  "ma": "KC-CO2-1L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CO2",
  "theTich": "1L",
  "bietDanh": [
   "Khí chuẩn CO2",
   "Khí chuẩn hỗn hợp CO/CO2/NO"
  ]
 },
 {
  "ma": "KC-CO2-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CO2",
  "theTich": "8L",
  "bietDanh": [
   "Bình khí chuẩn CO2",
   "Khí CO2/O2",
   "Khí chuẩn CO2"
  ]
 },
 {
  "ma": "KC-CO2-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CO2",
  "theTich": "10L",
  "bietDanh": [
   "Bình khí CO2"
  ]
 },
 {
  "ma": "KC-CO2-40L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "CO2",
  "theTich": "40L",
  "bietDanh": [
   "CO2 calibration gas",
   "Khí chuẩn CO2",
   "Khí chuẩn hỗn hợp CO/CO2/NO/SO2"
  ]
 },
 {
  "ma": "KC-ETHANOL-40L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "ETHANOL",
  "theTich": "40L",
  "bietDanh": [
   "Khí chuẩn Ethanol (C2H6O)"
  ]
 },
 {
  "ma": "KC-H2-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "H2",
  "theTich": "10L",
  "bietDanh": [
   "Khí chuẩn H2"
  ]
 },
 {
  "ma": "KC-H2S",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "H2S",
  "bietDanh": [
   "Hỗn hợp khí chuẩn CH4/O2/CO/H2S",
   "Khí chuẩn H2S",
   "Khí chuẩn hỗn hợp \nCH4/O2/CO/H2S"
  ]
 },
 {
  "ma": "KC-H2S-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "H2S",
  "theTich": "10L",
  "bietDanh": [
   "Khí chuẩn H2S"
  ]
 },
 {
  "ma": "KC-HCL-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "HCL",
  "theTich": "8L",
  "bietDanh": [
   "Bình Khí HCL",
   "Bình khí HCL",
   "Bình khí chuẩn HCL",
   "Bình khí hiệu chuẩn HCL",
   "HCL calibration gas",
   "Khí HCL",
   "Khí chuẩn HCL",
   "Khí chuẩn HCl"
  ]
 },
 {
  "ma": "KC-HCL-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "HCL",
  "theTich": "10L",
  "bietDanh": [
   "Bình HCL",
   "Bình khí HCL",
   "Bình khí chuẩn hỗn hợp HCl",
   "Khí chuẩn HCL",
   "Khí chuẩn HCl"
  ]
 },
 {
  "ma": "KC-HCL-40L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "HCL",
  "theTich": "40L",
  "bietDanh": [
   "Bình khí HCl",
   "Khí chuẩn HCL"
  ]
 },
 {
  "ma": "KC-HF-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "HF",
  "theTich": "8L",
  "bietDanh": [
   "Bình HF",
   "Bình Khi HF",
   "Bình khí HF",
   "Bình khí chuẩn HF",
   "Khí chuẩn HF"
  ]
 },
 {
  "ma": "KC-HF-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "HF",
  "theTich": "10L",
  "bietDanh": [
   "Khí chuẩn HF"
  ]
 },
 {
  "ma": "KC-HF-30L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "HF",
  "theTich": "30L",
  "bietDanh": [
   "Khí chuẩn HF"
  ]
 },
 {
  "ma": "KC-HI-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "HI",
  "theTich": "8L",
  "bietDanh": [
   "Khí hiệu chuẩn đa chỉ tiêu"
  ]
 },
 {
  "ma": "KC-N2",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "N2",
  "bietDanh": [
   "Bình khí N2",
   "Khí chuẩn N2"
  ]
 },
 {
  "ma": "KC-N2-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "N2",
  "theTich": "8L",
  "bietDanh": [
   "Bình khí N2",
   "Bình khí chuẩn N2",
   "Khí chuẩn N2"
  ]
 },
 {
  "ma": "KC-N2-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "N2",
  "theTich": "10L",
  "bietDanh": [
   "Bình Khí N2",
   "Bình khí N2",
   "Khí N2",
   "Khí chuẩn N2",
   "N2 calibration gas"
  ]
 },
 {
  "ma": "KC-N2-40L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "N2",
  "theTich": "40L",
  "bietDanh": [
   "Khí chuẩn N2"
  ]
 },
 {
  "ma": "KC-N2-103L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "N2",
  "theTich": "103L",
  "bietDanh": [
   "Bình khí 6D 99.99% N2"
  ]
 },
 {
  "ma": "KC-NH3",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NH3",
  "bietDanh": [
   "Khí hỗn hợp Ar/He/N2/NH3"
  ]
 },
 {
  "ma": "KC-NH3-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NH3",
  "theTich": "8L",
  "bietDanh": [
   "Bình khi NH3",
   "Bình khí chuẩn hỗn hợp NH3",
   "Khí NH3",
   "Khí chuẩn NH3"
  ]
 },
 {
  "ma": "KC-NH3-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NH3",
  "theTich": "10L",
  "bietDanh": [
   "Bình khí NH3",
   "Bình khí chuẩn hỗn hợp NH3",
   "Bình khí hiệu chuẩn NH3",
   "Khí chuẩn NH3"
  ]
 },
 {
  "ma": "KC-NH3-20L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NH3",
  "theTich": "20L",
  "bietDanh": [
   "Khí chuẩn NH3"
  ]
 },
 {
  "ma": "KC-NH3-30L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NH3",
  "theTich": "30L",
  "bietDanh": [
   "Khí chuẩn NH3"
  ]
 },
 {
  "ma": "KC-NO",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO",
  "bietDanh": [
   "Khí chuẩn NO"
  ]
 },
 {
  "ma": "KC-NO-1L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO",
  "theTich": "1L",
  "bietDanh": [
   "Khí chuẩn NO"
  ]
 },
 {
  "ma": "KC-NO-1.2L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO",
  "theTich": "1.2L",
  "bietDanh": [
   "Khí chuẩn NO"
  ]
 },
 {
  "ma": "KC-NO-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO",
  "theTich": "8L",
  "bietDanh": [
   "Bình Khí NO",
   "Bình khí NO",
   "Bình khí chuẩn NO",
   "Bình khí hiệu chuẩn NO",
   "Khí NO",
   "Khí chuẩn CO/NO",
   "Khí chuẩn NO",
   "NO calibration gas"
  ]
 },
 {
  "ma": "KC-NO-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO",
  "theTich": "10L",
  "bietDanh": [
   "Khí chuẩn NO"
  ]
 },
 {
  "ma": "KC-NO-20L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO",
  "theTich": "20L",
  "bietDanh": [
   "Bình khí hiệu chuẩn NO",
   "Khí chuẩn NO"
  ]
 },
 {
  "ma": "KC-NO-40L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO",
  "theTich": "40L",
  "bietDanh": [
   "Khí chuẩn NO",
   "NO calibration gas"
  ]
 },
 {
  "ma": "KC-NO-50L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO",
  "theTich": "50L",
  "bietDanh": [
   "Bình khí hiệu chuẩn NO"
  ]
 },
 {
  "ma": "KC-NO2",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO2",
  "bietDanh": [
   "Bình khí chuẩn NO2",
   "Khí chuẩn NO2"
  ]
 },
 {
  "ma": "KC-NO2-1L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO2",
  "theTich": "1L",
  "bietDanh": [
   "Khí NO2",
   "Khí chuẩn NO2"
  ]
 },
 {
  "ma": "KC-NO2-1.2L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO2",
  "theTich": "1.2L",
  "bietDanh": [
   "Khí chuẩn NO2"
  ]
 },
 {
  "ma": "KC-NO2-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO2",
  "theTich": "8L",
  "bietDanh": [
   "Bình Khí NO2",
   "Bình khí NO2",
   "Bình khí chuẩn NO2",
   "Bình khí hiệu chuẩn NO2",
   "Khí chuẩn NO2"
  ]
 },
 {
  "ma": "KC-NO2-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO2",
  "theTich": "10L",
  "bietDanh": [
   "Khí chuẩn NO2"
  ]
 },
 {
  "ma": "KC-NO2-40L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO2",
  "theTich": "40L",
  "bietDanh": [
   "Bình khí chuẩn NO2",
   "Khí chuẩn NO2"
  ]
 },
 {
  "ma": "KC-NO2-47.5L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "NO2",
  "theTich": "47.5L",
  "bietDanh": [
   "Khí chuẩn NO2"
  ]
 },
 {
  "ma": "KC-O2",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "O2",
  "bietDanh": [
   "Bình Khí chuẩn O2",
   "Khí chuẩn O2"
  ]
 },
 {
  "ma": "KC-O2-1L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "O2",
  "theTich": "1L",
  "bietDanh": [
   "Khí chuẩn O2"
  ]
 },
 {
  "ma": "KC-O2-1.2L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "O2",
  "theTich": "1.2L",
  "bietDanh": [
   "Khí chuẩn O2"
  ]
 },
 {
  "ma": "KC-O2-4L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "O2",
  "theTich": "4L",
  "bietDanh": [
   "Bình Khí chuẩn O2"
  ]
 },
 {
  "ma": "KC-O2-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "O2",
  "theTich": "8L",
  "bietDanh": [
   "Bình Khí Chuẩn O2",
   "Bình Khí O2",
   "Bình O2",
   "Bình khí O2",
   "Bình khí chuẩn O2",
   "Bình khí hiệu chuẩn O2",
   "Khí O2",
   "Khí chuẩn O2",
   "O2 calibration gas"
  ]
 },
 {
  "ma": "KC-O2-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "O2",
  "theTich": "10L",
  "bietDanh": [
   "Bình Khí Chuẩn O2",
   "Bình khí chuẩn O2",
   "Bình khí chuẫn hỗn hợp CO/O2",
   "Bình khí hiệu chuẩn O2",
   "Khí chuẩn O2"
  ]
 },
 {
  "ma": "KC-O2-40L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "O2",
  "theTich": "40L",
  "bietDanh": [
   "Khí O2",
   "Khí chuẩn O2",
   "O2 calibration gas"
  ]
 },
 {
  "ma": "KC-OXY-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "OXY",
  "theTich": "8L",
  "bietDanh": [
   "Bình khí Oxy"
  ]
 },
 {
  "ma": "KC-OXY-40L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "OXY",
  "theTich": "40L",
  "bietDanh": [
   "Khí Oxy tinh khiết"
  ]
 },
 {
  "ma": "KC-SF6-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SF6",
  "theTich": "10L",
  "bietDanh": [
   "Khí SF6"
  ]
 },
 {
  "ma": "KC-SO2",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2",
  "bietDanh": [
   "Khí chuẩn SO2"
  ]
 },
 {
  "ma": "KC-SO2-1L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2",
  "theTich": "1L",
  "bietDanh": [
   "Khí chuẩn SO2"
  ]
 },
 {
  "ma": "KC-SO2-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2",
  "theTich": "8L",
  "bietDanh": [
   "Bình Khí SO2",
   "Bình khí Hỗn Hợp CO/SO2/NO",
   "Bình khí SO2",
   "Bình khí chuẩn SO2",
   "Bình khí hiệu chuẩn SO2",
   "Bình khí hiệu chuẩn hỗn hợp NO/CO/SO2",
   "Khí SO2",
   "Khí chuẩn SO2"
  ]
 },
 {
  "ma": "KC-SO2-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2",
  "theTich": "10L",
  "bietDanh": [
   "Bình Khí Chuẩn SO2",
   "Bình khí SO2",
   "Bình khí chuẫn hỗn hợp NO/SO2",
   "Bình khí hiệu chuẩn hỗn hợp  CO/NO/SO2",
   "Bình khí hỗn hợp NO, SO2, CO",
   "Khí chuẩn SO2"
  ]
 },
 {
  "ma": "KC-SO2-20L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2",
  "theTich": "20L",
  "bietDanh": [
   "Bình khí hiệu chuẩn SO2",
   "Khí chuẩn SO2"
  ]
 },
 {
  "ma": "KC-SO2-40L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2",
  "theTich": "40L",
  "bietDanh": [
   "Khí chuẩn SO2",
   "SO2 calibration gas"
  ]
 },
 {
  "ma": "KC-SO2-47L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2",
  "theTich": "47L",
  "bietDanh": [
   "Bình khí NO/SO2",
   "Bình khí hỗn hợp NO, CO, SO2"
  ]
 },
 {
  "ma": "KC-SO2-50L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2",
  "theTich": "50L",
  "bietDanh": [
   "Bình khí hiệu chuẩn hỗn hợp  CO/NO/SO2"
  ]
 },
 {
  "ma": "KC-SO2NOCO",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2/NO/CO",
  "bietDanh": [
   "Khí chuẩn hỗn hợp SO2/NO/CO"
  ]
 },
 {
  "ma": "KC-SO2NOCO-1L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2/NO/CO",
  "theTich": "1L",
  "bietDanh": [
   "Khí chuẩn hỗn hợp SO2/NO/CO",
   "Khí hỗn hợp SO2/NO/CO"
  ]
 },
 {
  "ma": "KC-SO2NOCO-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2/NO/CO",
  "theTich": "8L",
  "bietDanh": [
   "Bình khí chuẩn SO2/NO/CO",
   "Bình khí chuẩn hỗn hợp SO2/NO/CO",
   "Bình khí hiệu chuẩn hỗn hợp SO2/NO/CO",
   "Bình khí hỗn hợp SO2/NO/CO",
   "Khí chuẩn SO2/NO/CO",
   "Khí chuẩn hỗn hợp SO2/NO/CO",
   "Khí hỗn hợp SO2/NO/CO",
   "Mixed gas SO2/NO/CO"
  ]
 },
 {
  "ma": "KC-SO2NOCO-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2/NO/CO",
  "theTich": "10L",
  "bietDanh": [
   "Bình khí hỗn hợp SO2/NO/CO",
   "Khí chuẩn SO2/NO/CO",
   "Khí chuẩn hỗn hợp SO2/NO/CO"
  ]
 },
 {
  "ma": "KC-SO2NOCO-20L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2/NO/CO",
  "theTich": "20L",
  "bietDanh": [
   "Khí chuẩn hỗn hợp SO2/NO/CO"
  ]
 },
 {
  "ma": "KC-SO2NOCO-40L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2/NO/CO",
  "theTich": "40L",
  "bietDanh": [
   "Bình khí hỗn hợp SO2/NO/CO",
   "Khí chuẩn hỗn hợp SO2/NO/CO"
  ]
 },
 {
  "ma": "KC-SO2NOCO-47L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2/NO/CO",
  "theTich": "47L",
  "bietDanh": [
   "Bình khí hỗn hợp SO2/NO/CO"
  ]
 },
 {
  "ma": "KC-SO2NOCO-47.5L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "SO2/NO/CO",
  "theTich": "47.5L",
  "bietDanh": [
   "Khí chuẩn hỗn hợp SO2/NO/CO"
  ]
 },
 {
  "ma": "KC-TO-10L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "TO",
  "theTich": "10L",
  "bietDanh": [
   "Khí chuẩn Toàn Tiếng TQ"
  ]
 },
 {
  "ma": "KC-TOLUENE-8L",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "TOLUENE",
  "theTich": "8L",
  "bietDanh": [
   "Khí chuẩn Toluene"
  ]
 },
 {
  "ma": "KC-VAN",
  "nhom": "Khí chuẩn",
  "dvt": "Bình",
  "loaiKhi": "VAN",
  "bietDanh": [
   "Van"
  ]
 },
 {
  "ma": "TB-KHAC",
  "nhom": "Thiết bị tái sử dụng",
  "dvt": "Bình",
  "bietDanh": [
   "Bộ van điều áp kèm phụ kiện",
   "Van điều áp",
   "Van điều áp REG",
   "Van điều áp Typhoon",
   "Đồng Hồ Điều Áp",
   "Đồng hồ điều áp",
   "Đồng hồ điều áp + Đầu chuyển",
   "Đồng hồ điều áp+Phụ kiện đi kèm"
  ]
 },
 {
  "ma": "VO-KHAC-1L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "theTich": "1L",
  "bietDanh": [
   "Empty bottle 1L",
   "Vỏ bình Vỏ"
  ]
 },
 {
  "ma": "VO-KHAC-8L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "theTich": "8L",
  "bietDanh": [
   "Empty bottle 8L"
  ]
 },
 {
  "ma": "VO-KHAC-10L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "theTich": "10L",
  "bietDanh": [
   "10L empty bottle",
   "Empty bottle 10L",
   "Vỏ bình Vỏ màu hồng đã kiểm định"
  ]
 },
 {
  "ma": "VO-KHAC-20L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "theTich": "20L",
  "bietDanh": [
   "Vỏ bình Vỏ"
  ]
 },
 {
  "ma": "VO-KHAC-30L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "theTich": "30L",
  "bietDanh": [
   "Vỏ bình Vỏ"
  ]
 },
 {
  "ma": "VO-KHAC-40L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "theTich": "40L",
  "bietDanh": [
   "Empty bottle 40L"
  ]
 },
 {
  "ma": "VO-KHAC-47L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "theTich": "47L",
  "bietDanh": [
   "Empty bottle 47L"
  ]
 },
 {
  "ma": "VO-NHOM",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "loaiKhi": "NHOM",
  "bietDanh": [
   "Vỏ bình Vỏ nhôm"
  ]
 },
 {
  "ma": "VO-NHOM-1L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "loaiKhi": "NHOM",
  "theTich": "1L",
  "bietDanh": [
   "Bình chứa khí nén bằng nhôm (bình rỗng) , dung tích 1 lít, mới 100%."
  ]
 },
 {
  "ma": "VO-NHOM-8L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "loaiKhi": "NHOM",
  "theTich": "8L",
  "bietDanh": [
   "Vỏ bình Nhôm",
   "Vỏ bình Vỏ nhôm"
  ]
 },
 {
  "ma": "VO-NHOM-10L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "loaiKhi": "NHOM",
  "theTich": "10L",
  "bietDanh": [
   "Vỏ bình Nhôm",
   "Vỏ bình Vỏ nhôm"
  ]
 },
 {
  "ma": "VO-NHOM-40L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "loaiKhi": "NHOM",
  "theTich": "40L",
  "bietDanh": [
   "Vỏ bình Vỏ nhôm"
  ]
 },
 {
  "ma": "VO-NHOM-50L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "loaiKhi": "NHOM",
  "theTich": "50L",
  "bietDanh": [
   "Vỏ bình Vỏ nhôm",
   "Vỏ nhôm 50L"
  ]
 },
 {
  "ma": "VO-THEP-10L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "loaiKhi": "THEP",
  "theTich": "10L",
  "bietDanh": [
   "Vỏ bình Vỏ thép"
  ]
 },
 {
  "ma": "VO-THEP-40L",
  "nhom": "Vỏ bình",
  "dvt": "Bình",
  "loaiKhi": "THEP",
  "theTich": "40L",
  "bietDanh": [
   "Vỏ bình Vỏ thép",
   "Vỏ bình thép"
  ]
 }
];

export const RAW_LO_NHAP: RawLoNhap[] = [
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-01",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-O2-10L",
  "quyCach": "Khí chuẩn Oxi (=<23%), cân bằng Nitơ (>77%), thể tích 10 lít - bình nhôm, mới 100%.",
  "soLuong": 4,
  "donGia": 6000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-02",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-HF-30L",
  "quyCach": "Khí chuẩn Hydrogen fluoride (0.0001-0.01 %) , cân bằng Nitơ (99.99-99.9999 %), thể tích 30 lít - bình nhôm, mới 100%.",
  "soLuong": 1,
  "donGia": 22000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-03",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-NH3-30L",
  "quyCach": "Khí chuẩn Amonia (0.00001%-0.9999%), cân bằng Nitơ (99.99-99.9999 %), thể tích 30 lít - bình nhôm, mới 100%.",
  "soLuong": 1,
  "donGia": 22000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-04",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-NH3-30L",
  "quyCach": "Khí chuẩn Amonia (0.00001%-0.9999%), cân bằng Nitơ (99.99-99.9999 %), thể tích 30 lít - bình nhôm, mới 100%.",
  "soLuong": 1,
  "donGia": 22000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-05",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-O2-8L",
  "quyCach": "Khí chuẩn Oxi (=<23%), cân bằng Nitơ (> 77%), thể tích 8 lít - bình nhôm, mới 100%",
  "soLuong": 12,
  "donGia": 5000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-06",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2NOCO-8L",
  "quyCach": "Khí Sulfur dioxide (0.00001-0.6%), Nitric oxide (0.00001-0.21%), Carbon monoxide (0.0001- 0.9999%), Nitrogen(98.1901-99.9998%), thể tích 8lít - bình nhôm, mới 100%.",
  "soLuong": 11,
  "donGia": 7000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-07",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-NO2-10L",
  "quyCach": "Khí chuẩn Nitrogen dioxide (0.01%), cân bằng Nitrogen(99.99%), thể tích 10 lít - bình nhôm,mới 100%.",
  "soLuong": 2,
  "donGia": 9000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-08",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-H2S-10L",
  "quyCach": "Khí chuẩn Hidrogen Sulfide (0.00001%-0.9999%), cân bằng Nitrogen (99.99-99.9999 %), thể tích 10 lít - bình nhôm, mới 100%",
  "soLuong": 2,
  "donGia": 10000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-09",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2-10L",
  "quyCach": "Khí chuẩn hỗn hợp Sulfur dioxide (0.00001-0.6%), cân bằng Nitrogen (99.99999-99.4 %), thể tích 10 lít - bình nhôm, mới 100%",
  "soLuong": 2,
  "donGia": 7000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-10",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-CO-20L",
  "quyCach": "Khí chuẩn hỗn hợp Carbon monoxide (0.0001- 0.9999%), cân bằng Nitrogen (99,9999-99,0001%), thể tích 20 lít - bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 12000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-11",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-NO-20L",
  "quyCach": "Khí chuẩn hỗn hợp Nitric oxide (0.00001-0.21%), cân bằng Nitrogen (98.1901-99.9998%), thể tích 20 lít - bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 12000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-12",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2-20L",
  "quyCach": "Khí chuẩn hỗn hợp Sulfur dioxide (0.00001-0.6%), cân bằng Nitrogen (99.99999-99.4 %), thể tích 20 lít - bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 12000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-13",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2-8L",
  "quyCach": "Khí chuẩn hỗn hợp Sulfur dioxide (0.00001-0.6%), cân bằng Nitrogen (99.99999-99.4 %), thể tích 8 lít - bình nhôm, mới 100%",
  "soLuong": 2,
  "donGia": 6000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-14",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-NO-8L",
  "quyCach": "Khí chuẩn hỗn hợp Nitric oxide (0.00001-0.21%), cân bằng Nitrogen (98.1901-99.9998%), thể tích 8 lít - bình nhôm, mới 100%",
  "soLuong": 2,
  "donGia": 6000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-15",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-HF-8L",
  "quyCach": "Khí chuẩn Hydrogen fluoride (0.0001-0.01 %) , cân bằng Nitơ (99.99-99.9999 %), thể tích 8 lít - bình nhôm, mới 100%",
  "soLuong": 8,
  "donGia": 11000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-16",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-NH3-8L",
  "quyCach": "Khí chuẩn Amonia (0.00001%-0.9999%), cân bằng Nitrogen (99.99-99.9999 %), thể tích 8 lít - bình nhôm, mới 100%",
  "soLuong": 2,
  "donGia": 9500000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-17",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2NOCO-10L",
  "quyCach": "Khí Sulfur dioxide (0.00001-0.6%),Nitric oxide (0.00001-0.21%),Carbon monoxide (0.0001- 0.9999%),Nitrogen (98.1901-99.9998%), thể tích 10 lít - bình nhôm, mới 100%.",
  "soLuong": 1,
  "donGia": 8500000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-18",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2NOCO-8L",
  "quyCach": "Khí Sulfur dioxide (0.00001-0.6%), Nitric oxide (0.00001-0.21%), Carbon monoxide (0.0001- 0.9999%),Nitrogen (98.1901-99.9998%), thể tích 8 lít - bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 7000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-20",
  "soHoaDon": "HĐ 259",
  "lo": "L259-19",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-HCL-8L",
  "quyCach": "Khí chuẩn Hydrogen Chloride (0.0001%-0.02%) , cân bằng Nitrogen (99.98%-99.9999 %), thể tích 8 lít - bình nhôm,mới 100%",
  "soLuong": 6,
  "donGia": 9800000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-01",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-CO-8L",
  "quyCach": "Khí chuẩn hỗn hợp Carbon monoxide (0.0001 -0.9999%), cân bằng Nitrogen (99,9999-99,0001%), thể tích 8 lít - bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 6000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-02",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-NO-8L",
  "quyCach": "Khí chuẩn hỗn hợp Nitric oxide (0.00001-0.21%), cân bằng Nitrogen (98.1901-99.9998%), thể tích 8 lít - bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 6000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-03",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-NO2-8L",
  "quyCach": "Khí chuẩn Nitrogen dioxide (0.01%), cân bằng N2 (99.99%), thể tích 8 lít bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 8500000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-04",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2-8L",
  "quyCach": "Khí chuẩn hỗn hợp Sulfur dioxide (0.00001-0.6%), cân bằng Nitrogen (99.99999-99.4 %), thể tích 8 lít - bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 6000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-05",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-CO-1L",
  "quyCach": "Khí chuẩn hỗn hợp Carbon monoxide (0.0001- 0.9999%), cân bằng Nitrogen (99,9999-99,0001%), thể tích 1 lít - bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 3400000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-06",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-NO-1L",
  "quyCach": "Khí chuẩn hỗn hợp Nitric oxide (0.00001-0.21%), cân bằng Nitrogen (98.1901-99.9998%), thể tích 1 lít - bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 3400000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-07",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-NO2-1L",
  "quyCach": "Khí chuẩn Nitrogen dioxide (0.01%), cân bằng Nitrogen (99.99%), thể tích 1 lít - bình nhôm,mới 100%",
  "soLuong": 4,
  "donGia": 3400000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-08",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2-1L",
  "quyCach": "Khí chuẩn hỗn hợp Sulfur dioxide (0.00001-0.6%), cân bằng Nitrogen (99.99999-99.4 %), thể tích 1 lít - bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 3400000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-09",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-O2-1L",
  "quyCach": "Khí chuẩn Oxi (=<23%), cân bằng Nitơ (> 77%), thể thích 1 lít - bình nhôm, mới 100%",
  "soLuong": 3,
  "donGia": 3200000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-10",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-CO2-1L",
  "quyCach": "Khí chuẩn Carbon Dioxide (10%), cân bằng Nitrogen (> 90%), thể tích 1 lít- bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 3400000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-11",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2NOCO-1L",
  "quyCach": "Khí Sulfur dioxide (0.00001-0.6%), Nitric oxide (0.00001-0.21%),Carbon monoxide (0.0001- 0.9999%),Nitrogen (98.1901-99.9998%), thể tích 1 lít - bình nhôm, mới 100%",
  "soLuong": 3,
  "donGia": 4800000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-12",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2NOCO-10L",
  "quyCach": "Khí Sulfur dioxide (0.00001-0.6%), Nitric oxide (0.00001-0.21%), Carbon monoxide (0.0001- 0.9999%),Nitrogen (98.1901-99.9998%), thể tích 10 lít - bình nhôm, mới 100%",
  "soLuong": 3,
  "donGia": 8500000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-13",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2NOCO-10L",
  "quyCach": "Khí Sulfur dioxide (0.00001-0.6%), Nitric oxide (0.00001-0.21%), Carbon monoxide (0.0001- 0.9999%), Nitrogen (98.1901-99.9998%), thể tích 10 lít - bình nhôm, mới 100%",
  "soLuong": 3,
  "donGia": 8500000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-14",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-HF-10L",
  "quyCach": "Khí chuẩn Hydrogen fluoride (0.0001-0.01 %) , cân bằng Nitơ (99.99-99.9999 %), thể tích 10 lít - bình nhôm, mới 100%",
  "soLuong": 2,
  "donGia": 12100000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-15",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-HF-10L",
  "quyCach": "Khí chuẩn Hydrogen fluoride (0.0001-0.01 %) , cân bằng Nitơ (99.99-99.9999 %), thể tích 10 lít - bình nhôm, mới 100%",
  "soLuong": 2,
  "donGia": 12100000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-16",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-NH3-10L",
  "quyCach": "Khí chuẩn Amonia (0.00001%-0.9999%), cân bằng Nitơ (99.99-99.9999 %), thể tích 10 lít - bình nhôm, mới 100%",
  "soLuong": 2,
  "donGia": 10200000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-17",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-NH3-10L",
  "quyCach": "Khí chuẩn Amonia (0.00001%-0.9999%), cân bằng Nitơ (99.99-99.9999 %), thể tích 10 lít - bình nhôm, mới 100%",
  "soLuong": 2,
  "donGia": 10200000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-18",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-HCL-40L",
  "quyCach": "Khí chuẩn Hydrogen Chloride (0.0001%-0.02%) , cân bằng Nitrogen (99.98%-99.9999 %), thể tích 40l bình nhôm,mới 100%",
  "soLuong": 1,
  "donGia": 22200000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-19",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2NOCO-8L",
  "quyCach": "Khí Sulfur dioxide (0.00001-0.6%),Nitric oxide (0.00001-0.21%), Carbon monoxide (0.0001- 0.9999%),Nitrogen (98.1901-99.9998%),thể tích 8 lít - bình nhôm, mới 100%",
  "soLuong": 3,
  "donGia": 7000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-20",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2NOCO-8L",
  "quyCach": "Khí Sulfur dioxide (0.00001-0.6%),Nitric oxide (0.00001-0.21%), Carbon monoxide (0.0001- 0.9999%), Nitrogen (98.1901-99.9998%), thể tích 8 lít - bình nhôm, mới 100%",
  "soLuong": 11,
  "donGia": 7000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-21",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-NH3-10L",
  "quyCach": "Khí chuẩn Amonia (0.00001%-0.9999%), cân bằng Nitơ (99.99-99.9999 %), thể tích 10 lít - bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 10200000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-22",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-SO2NOCO-8L",
  "quyCach": "Khí Sulfur dioxide (0.00001-0.6%),Nitric oxide (0.00001-0.21%), Carbon monoxide (0.0001- 0.9999%),Nitrogen (98.1901-99.9998%), thể tích 8 lít - bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 7000000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-23",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-HCL-10L",
  "quyCach": "Khí chuẩn Hydrogen Chloride (0.0001%-0.02%) , cân bằng Nitơ (99.98%-99.9999 %), thể tích 10 lít - bình nhôm, mới 100%",
  "soLuong": 1,
  "donGia": 10800000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-24",
  "ncc": "Phú Tài Miền Nam",
  "ma": "KC-HCL-10L",
  "quyCach": "Khí chuẩn Hydrogen Chloride (0.0001%-0.02%) , cân bằng Nitơ (99.98%-99.9999 %), thể tích 10 lít - bình nhôm,mới 100%",
  "soLuong": 2,
  "donGia": 10800000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-25",
  "ncc": "Phú Tài Miền Nam",
  "ma": "VO-NHOM-1L",
  "quyCach": "Bình chứa khí nén bằng nhôm (bình rỗng) , dung tích 1 lít, mới 100%.",
  "soLuong": 1,
  "donGia": 1800000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-26",
  "ncc": "Phú Tài Miền Nam",
  "ma": "VO-NHOM-8L",
  "quyCach": "Bình chứa khí nén bằng nhôm (bình rỗng), dung tích 8 lít, mới 100%.",
  "soLuong": 1,
  "donGia": 2700000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-27",
  "ncc": "Phú Tài Miền Nam",
  "ma": "VO-NHOM-10L",
  "quyCach": "Bình chứa khí nén bằng nhôm (bình rỗng), dung tích 10l ít, mới 100%",
  "soLuong": 1,
  "donGia": 3300000,
  "vat": 8
 },
 {
  "ngay": "2026-06-23",
  "soHoaDon": "HĐ 262",
  "lo": "L262-28",
  "ncc": "Phú Tài Miền Nam",
  "ma": "VO-NHOM-50L",
  "quyCach": "Bình chứa khí nén bằng nhôm (bình rỗng), dung tích 50 lít, mới 100%",
  "soLuong": 4,
  "donGia": 12500000,
  "vat": 8
 }
];

export const RAW_KIEM_KE: RawKiemKe = {
 "ngay": "2026-08-19",
 "dong": [
  {
   "ma": "KC-NO2-8L",
   "soLuong": 1,
   "tenHang": "NO2",
   "xuatXu": "Air Liquide"
  },
  {
   "ma": "KC-N2-10L",
   "soLuong": 8,
   "tenHang": "N2",
   "xuatXu": "Air Liquide"
  },
  {
   "ma": "KC-O2-10L",
   "soLuong": 1,
   "tenHang": "O2",
   "xuatXu": "Air Liquide"
  },
  {
   "ma": "KC-O2-8L",
   "soLuong": 5,
   "tenHang": "O2",
   "xuatXu": "Air Liquide"
  },
  {
   "ma": "KC-SO2NOCO-8L",
   "soLuong": 3,
   "tenHang": "SO2/NO/CO",
   "xuatXu": "Air Liquide",
   "nongDo": "650/980/650"
  },
  {
   "ma": "KC-SO2NOCO-10L",
   "soLuong": 1,
   "tenHang": "SO2/NO/CO",
   "xuatXu": "Air Liquide",
   "nongDo": "28,9/306/506"
  },
  {
   "ma": "KC-HF-8L",
   "soLuong": 1,
   "tenHang": "HF",
   "xuatXu": "Air Liquide",
   "nongDo": "30 mg/nm3"
  },
  {
   "ma": "KC-NH3-8L",
   "soLuong": 1,
   "tenHang": "NH3",
   "xuatXu": "Air Liquide",
   "nongDo": "50,8ppm"
  },
  {
   "ma": "KC-HCL-10L",
   "soLuong": 1,
   "tenHang": "HCL",
   "xuatXu": "Air Liquide",
   "nongDo": "15,2ppm"
  },
  {
   "ma": "KC-O2-8L",
   "soLuong": 1,
   "tenHang": "O2",
   "nongDo": "0.02"
  },
  {
   "ma": "KC-SO2-10L",
   "soLuong": 1,
   "tenHang": "SO2",
   "nongDo": "49,6ppm"
  },
  {
   "ma": "KC-CO2-8L",
   "soLuong": 1,
   "tenHang": "CO2",
   "nongDo": "0.0999"
  },
  {
   "ma": "KC-TO-10L",
   "soLuong": 2,
   "tenHang": "Toàn Tiếng TQ"
  },
  {
   "ma": "KC-SO2NOCO-10L",
   "soLuong": 1,
   "tenHang": "SO2/NO/CO",
   "nongDo": "500/400/500"
  },
  {
   "ma": "VO-NHOM-10L",
   "soLuong": 1,
   "tenHang": "Nhôm"
  },
  {
   "ma": "VO-NHOM-8L",
   "soLuong": 1,
   "tenHang": "Nhôm"
  },
  {
   "ma": "VO-KHAC-10L",
   "soLuong": 3,
   "tenHang": "Vỏ màu hồng đã kiểm định"
  },
  {
   "ma": "VO-KHAC-30L",
   "soLuong": 1,
   "tenHang": "Vỏ"
  },
  {
   "ma": "VO-KHAC-20L",
   "soLuong": 1,
   "tenHang": "Vỏ"
  },
  {
   "ma": "VO-THEP-10L",
   "soLuong": 8,
   "tenHang": "Vỏ thép"
  },
  {
   "ma": "VO-NHOM-50L",
   "soLuong": 4,
   "tenHang": "Vỏ nhôm"
  },
  {
   "ma": "VO-NHOM-40L",
   "soLuong": 1,
   "tenHang": "Vỏ nhôm"
  },
  {
   "ma": "VO-THEP-40L",
   "soLuong": 5,
   "tenHang": "Vỏ thép"
  },
  {
   "ma": "VO-NHOM-10L",
   "soLuong": 1,
   "tenHang": "Vỏ nhôm",
   "xuatXu": "Xịn"
  },
  {
   "ma": "VO-NHOM-8L",
   "soLuong": 1,
   "tenHang": "Vỏ nhôm",
   "xuatXu": "Xịn"
  },
  {
   "ma": "VO-KHAC-1L",
   "soLuong": 34,
   "tenHang": "Vỏ"
  },
  {
   "ma": "VO-NHOM",
   "soLuong": 6,
   "tenHang": "Vỏ nhôm"
  }
 ]
};

export const RAW_ANH_XA: RawAnhXa[] = [
 {
  "ten": "Bình khí hỗn hợp NO, CO, SO2",
  "tongSL": 22.0,
  "soLan": 1,
  "theTich": "47L",
  "nongDo": "NO 500ppm CO 300 ppm SO2 300ppm"
 },
 {
  "ten": "Bình khí chuẩn NO2",
  "tongSL": 22.0,
  "soLan": 1,
  "nongDo": "200ppm"
 },
 {
  "ten": "Đồng hồ điều áp",
  "tongSL": 21.0,
  "soLan": 6
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 16.0,
  "soLan": 8,
  "theTich": "8L",
  "nongDo": "CO 650mg/Nm3 ; SO2 650mg/Nm3 ; NO 980 mg/Nm3"
 },
 {
  "ten": "Bình khí hỗn hợp NO, SO2, CO",
  "tongSL": 16.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "NO 600ppm CO 300 ppm SO2 600ppm"
 },
 {
  "ten": "Bình khí O2",
  "tongSL": 14.0,
  "soLan": 12,
  "theTich": "8L",
  "nongDo": "0.1"
 },
 {
  "ten": "Khí hỗn hợp SO2/NO/CO",
  "tongSL": 12.0,
  "soLan": 10,
  "theTich": "8L",
  "nongDo": "SO2 650mg/m3; ; NO 980mg/m3; ; CO 650mg/m3"
 },
 {
  "ten": "Bình khí N2",
  "tongSL": 12.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "0.9999"
 },
 {
  "ten": "Bình khí hiệu chuẩn hỗn hợp SO2/NO/CO",
  "tongSL": 12.0,
  "soLan": 2,
  "theTich": "8L",
  "nongDo": "CO 1000 ppm ; SO2 500 ppm ; NO 1200 ppm"
 },
 {
  "ten": "Bình khí N2",
  "tongSL": 10.0,
  "soLan": 8,
  "theTich": "10L",
  "nongDo": "99.99%"
 },
 {
  "ten": "Khí chuẩn O2",
  "tongSL": 9.0,
  "soLan": 7,
  "theTich": "8L",
  "nongDo": "0.1"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 8.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "Nồng độ CO2: 8.02% ; Nồng độ O2: 17% ;"
 },
 {
  "ten": "Bình khí chuẩn HCL",
  "tongSL": 7.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "100mg/Nm3"
 },
 {
  "ten": "Khí chuẩn N2",
  "tongSL": 6.0,
  "soLan": 5,
  "theTich": "10L",
  "nongDo": "99.99%"
 },
 {
  "ten": "Đầu chuyển đổi",
  "tongSL": 6.0,
  "soLan": 1
 },
 {
  "ten": "Bình khí chuẩn O2",
  "tongSL": 6.0,
  "soLan": 2,
  "theTich": "10L",
  "nongDo": "0.1"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 6.0,
  "soLan": 2,
  "theTich": "10L",
  "nongDo": "NO: 1000 mg/Nm3 ; SO2: 1000 mg/Nm3 ; CO: 1000 mg/Nm3 ;"
 },
 {
  "ten": "Bình khí hiệu chuẩn hỗn hợp NO/CO/SO2",
  "tongSL": 6.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "NO: 469 mg/m3 ; SO2: 1043 mg/m3 ; CO: 368 mg/m3"
 },
 {
  "ten": "Đồng hồ điều áp+Phụ kiện đi kèm",
  "tongSL": 6.0,
  "soLan": 1
 },
 {
  "ten": "Bình Khí HCL",
  "tongSL": 6.0,
  "soLan": 2,
  "theTich": "8L",
  "nongDo": "100mg/Nm3"
 },
 {
  "ten": "Khí chuẩn hỗn hợp SO2/NO/CO",
  "tongSL": 6.0,
  "soLan": 3,
  "theTich": "8L",
  "nongDo": "NO: 980 mg/Nm3 ; SO2: 650 mg/Nm3 ; CO: 650 mg/Nm3"
 },
 {
  "ten": "Bình Khí Chuẩn O2",
  "tongSL": 5.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "0.1"
 },
 {
  "ten": "Bình khí N2",
  "tongSL": 5.0,
  "soLan": 5,
  "theTich": "10L",
  "nongDo": "0.9999"
 },
 {
  "ten": "Khí chuẩn O2",
  "tongSL": 5.0,
  "soLan": 5,
  "theTich": "8L",
  "nongDo": "10%"
 },
 {
  "ten": "Khí O2",
  "tongSL": 5.0,
  "soLan": 1,
  "theTich": "40L",
  "nongDo": "99.99%"
 },
 {
  "ten": "Khí N2",
  "tongSL": 5.0,
  "soLan": 4,
  "theTich": "10L",
  "nongDo": "99.99%"
 },
 {
  "ten": "Khí N2",
  "tongSL": 5.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "99.999%"
 },
 {
  "ten": "Khí Oxy tinh khiết",
  "tongSL": 5.0,
  "soLan": 1,
  "theTich": "40L",
  "nongDo": "99.99%"
 },
 {
  "ten": "Khí chuẩn HCL",
  "tongSL": 4.0,
  "soLan": 4,
  "theTich": "8L",
  "nongDo": "70mg/m3"
 },
 {
  "ten": "Khí chuẩn O2",
  "tongSL": 4.0,
  "soLan": 2,
  "theTich": "10L",
  "nongDo": "0.1"
 },
 {
  "ten": "Khí chuẩn NO2",
  "tongSL": 4.0,
  "soLan": 3,
  "theTich": "1L",
  "nongDo": "100ppm"
 },
 {
  "ten": "Dung dịch chuẩn TSS",
  "tongSL": 4.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "100ml/l",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-TSS"
 },
 {
  "ten": "Dung dịch chuẩn TSS",
  "tongSL": 4.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "50ml/l",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-TSS"
 },
 {
  "ten": "Bình khí N2",
  "tongSL": 4.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "99 %"
 },
 {
  "ten": "Bình khí HCL",
  "tongSL": 4.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "100 mg/3"
 },
 {
  "ten": "Khí chuẩn SO2",
  "tongSL": 3.0,
  "soLan": 2,
  "theTich": "8L",
  "nongDo": "500ppm"
 },
 {
  "ten": "Khí chuẩn NO2",
  "tongSL": 3.0,
  "soLan": 3,
  "theTich": "8L",
  "nongDo": "100ppm"
 },
 {
  "ten": "Hỗn hợp khí chuẩn CH4/O2/CO/H2S",
  "tongSL": 3.0,
  "soLan": 1,
  "theTich": "8AL",
  "nongDo": "2.5% CH4 ; 12% O2 ; 150PPM CO ; 25 PPM H2S"
 },
 {
  "ten": "Dung dịch chuẩn pH 4",
  "tongSL": 3.0,
  "soLan": 3,
  "theTich": "500mL",
  "nongDo": "pH 4",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-PH"
 },
 {
  "ten": "Van điều áp",
  "tongSL": 3.0,
  "soLan": 3
 },
 {
  "ten": "Bình khí chuẩn HF",
  "tongSL": 3.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "30 mg/Nm3"
 },
 {
  "ten": "Khí chuẩn hỗn hợp SO2/NO/CO",
  "tongSL": 3.0,
  "soLan": 2,
  "theTich": "1L",
  "nongDo": "CO 500 ppm ; NO 400 ppm ; SO2 500 ppm"
 },
 {
  "ten": "Khí chuẩn hỗn hợp SO2/NO/CO",
  "tongSL": 3.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "CO: 1000 ppm ; NO: 1200 ppm ; SO2: 400 ppm"
 },
 {
  "ten": "Khí chuẩn hỗn hợp SO2/NO/CO",
  "tongSL": 3.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "CO: 90 ppm ; NO: 80 ppm ; SO2: 250 ppm"
 },
 {
  "ten": "Bình khí hiệu chuẩn hỗn hợp SO2/NO/CO",
  "tongSL": 3.0,
  "soLan": 3,
  "theTich": "8L",
  "nongDo": "CO 650mg/m3 ; SO2 650mg/m3 ; NO 980mg/m3"
 },
 {
  "ten": "Bình khí hiệu chuẩn hỗn hợp SO2/NO/CO",
  "tongSL": 3.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "CO 6000 ppm ; SO2 500 ppm ; NO 1200 ppm"
 },
 {
  "ten": "Bình Khí O2",
  "tongSL": 3.0,
  "soLan": 3,
  "theTich": "8L",
  "nongDo": "0.1"
 },
 {
  "ten": "Bộ van điều áp kèm phụ kiện",
  "tongSL": 3.0,
  "soLan": 1
 },
 {
  "ten": "Khí chuẩn SO2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "1L",
  "nongDo": "50ppm"
 },
 {
  "ten": "Khí chuẩn NO2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "1L",
  "nongDo": "50ppm"
 },
 {
  "ten": "Khí chuẩn CO",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "700ppm"
 },
 {
  "ten": "Khí chuẩn NO2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "700ppm"
 },
 {
  "ten": "Khí chuẩn O2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "15%"
 },
 {
  "ten": "Khí chuẩn SO2",
  "tongSL": 2.0,
  "soLan": 2,
  "theTich": "10L",
  "nongDo": "45ppm"
 },
 {
  "ten": "Khí hỗn hợp SO2/NO/CO",
  "tongSL": 2.0,
  "soLan": 2,
  "theTich": "8L",
  "nongDo": "SO2 500ppm; ; NO 400ppm; ; CO 500ppm"
 },
 {
  "ten": "Khí chuẩn NO2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "50ppm"
 },
 {
  "ten": "Khí chuẩn H2S",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "100ppm"
 },
 {
  "ten": "Khí chuẩn SO2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "500ppm"
 },
 {
  "ten": "Mixed gas SO2/NO/CO",
  "tongSL": 2.0,
  "soLan": 2,
  "theTich": "8L",
  "nongDo": "SO2 650mg/m3; ; NO 980mg/m3; ; CO 650mg/m3"
 },
 {
  "ten": "O2 calibration gas",
  "tongSL": 2.0,
  "soLan": 2,
  "theTich": "8L",
  "nongDo": "0.1"
 },
 {
  "ten": "N2 calibration gas",
  "tongSL": 2.0,
  "soLan": 2,
  "theTich": "10L",
  "nongDo": "99.99%"
 },
 {
  "ten": "Dung dịch chuẩn pH 7",
  "tongSL": 2.0,
  "soLan": 2,
  "theTich": "500mL",
  "nongDo": "pH 7",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-PH"
 },
 {
  "ten": "Dung dịch chuẩn COD 50ppm",
  "tongSL": 2.0,
  "soLan": 2,
  "theTich": "500mL",
  "nongDo": "COD 50ppm",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-COD"
 },
 {
  "ten": "Dung dịch chuẩn TSS 100ppm",
  "tongSL": 2.0,
  "soLan": 2,
  "theTich": "500mL",
  "nongDo": "TSS 100ppm",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-TSS"
 },
 {
  "ten": "Bình HCL",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "139.0"
 },
 {
  "ten": "Van",
  "tongSL": 2.0,
  "soLan": 1
 },
 {
  "ten": "Bình khí N2",
  "tongSL": 2.0,
  "soLan": 1,
  "nongDo": "99.99%"
 },
 {
  "ten": "Bình khí chuẩn O2",
  "tongSL": 2.0,
  "soLan": 2,
  "theTich": "8L",
  "nongDo": "0.1"
 },
 {
  "ten": "Bình khí chuẩn NO2",
  "tongSL": 2.0,
  "soLan": 2,
  "theTich": "8L",
  "nongDo": "100 ppm"
 },
 {
  "ten": "Dung dịch chuẩn NH4-N 50ppm",
  "tongSL": 2.0,
  "soLan": 2,
  "theTich": "500mL",
  "nongDo": "NH4-N 50ppm",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-AMONI"
 },
 {
  "ten": "Khí hỗn hợp SO2/NO/CO",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "1L",
  "nongDo": "CO 500ppm ; CO2 15% ; NO 750ppm"
 },
 {
  "ten": "Khí NO2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "1L",
  "nongDo": "100ppm"
 },
 {
  "ten": "Khí chuẩn N2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "40L",
  "nongDo": "99.95%"
 },
 {
  "ten": "Khí chuẩn SO2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1400 mg/Nm3"
 },
 {
  "ten": "Khí chuẩn NO",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1400 mg/Nm3"
 },
 {
  "ten": "Khí chuẩn HF",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "30-36 mg/Nm3"
 },
 {
  "ten": "Khí chuẩn NH3",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "75 mg/Nm3"
 },
 {
  "ten": "Khí chuẩn O2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "1L",
  "nongDo": "0.1"
 },
 {
  "ten": "Khí chuẩn hỗn hợp SO2/NO/CO",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "CO 650mg/Nm3 ; SO2 650mg/Nm3 ; NO 980 mg/Nm3"
 },
 {
  "ten": "Dung dịch chuẩn pH",
  "tongSL": 2.0,
  "soLan": 2,
  "theTich": "500ml",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-PH"
 },
 {
  "ten": "Khí chuẩn hỗn hợp SO2/NO/CO",
  "tongSL": 2.0,
  "soLan": 2,
  "nongDo": "CO 650mg/Nm3 ; SO2 650mg/Nm3 ; NO 980 mg/Nm3"
 },
 {
  "ten": "Khí chuẩn HF",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "30 ppm"
 },
 {
  "ten": "Khí chuẩn HF",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "10 ppm"
 },
 {
  "ten": "Khí chuẩn NH3",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "150 ppm"
 },
 {
  "ten": "Khí chuẩn NH3",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "15 ppm"
 },
 {
  "ten": "Dung dịch chuẩn pH",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "4.0",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-PH"
 },
 {
  "ten": "Dung dịch chuẩn pH",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "7.0",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-PH"
 },
 {
  "ten": "Dung dịch chuẩn COD",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "100mg/L",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-COD"
 },
 {
  "ten": "Dung dịch chuẩn TSS",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "100mg/L",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-TSS"
 },
 {
  "ten": "Dung dịch chuẩn NH4",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "12mg/L",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-AMONI"
 },
 {
  "ten": "Bình khí hiệu chuẩn CO",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1300 ppm/m3"
 },
 {
  "ten": "Bình khí HCL",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "100 ppm"
 },
 {
  "ten": "Bình khí SO2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "10L"
 },
 {
  "ten": "Bình khí SO2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "1000 ppm"
 },
 {
  "ten": "Bình khí HCL",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "200 mg/3"
 },
 {
  "ten": "Bình Khí HCL",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "100 mg/m3"
 },
 {
  "ten": "Dung dịch chuẩn pH",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "4.0",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-PH"
 },
 {
  "ten": "Dung dịch chuẩn pH",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "10.0",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-PH"
 },
 {
  "ten": "Dung dịch chuẩn COD",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "50 mg/L",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-COD"
 },
 {
  "ten": "Dung dịch chuẩn TSS",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "50 mg/L",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-TSS"
 },
 {
  "ten": "Dung dịch chuẩn NH4",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "15 mg/L",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-AMONI"
 },
 {
  "ten": "Vỏ bình thép",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "40L"
 },
 {
  "ten": "Bình khí SO2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1400 mg/Nm3"
 },
 {
  "ten": "Bình Khí NO",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1400 mg/Nm3"
 },
 {
  "ten": "Bình Khi HF",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "30 mg/Nm3"
 },
 {
  "ten": "Bình khi NH3",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "75 mg/Nm3"
 },
 {
  "ten": "Khí chuẩn O2",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "0.06"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "980/650/650"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 2.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1000/1500/1000"
 },
 {
  "ten": "Khí chuẩn CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "45ppm"
 },
 {
  "ten": "Khí chuẩn NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "90ppm"
 },
 {
  "ten": "Khí hỗn hợp SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "SO2 1500mg/m3; ; NO 1500mg/m3; ; CO 1500mg/m3"
 },
 {
  "ten": "Khí chuẩn H2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "8%"
 },
 {
  "ten": "SO2 calibration gas",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "40L",
  "nongDo": "900mg/m3"
 },
 {
  "ten": "NO calibration gas",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "40L",
  "nongDo": "1200mg/m3"
 },
 {
  "ten": "CO calibration gas",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "40L",
  "nongDo": "600mg/m3"
 },
 {
  "ten": "CO2 calibration gas",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "40L",
  "nongDo": "12%"
 },
 {
  "ten": "O2 calibration gas",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "40L",
  "nongDo": "0.15"
 },
 {
  "ten": "N2 calibration gas",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "99.999%"
 },
 {
  "ten": "HCL calibration gas",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "70mg/m3"
 },
 {
  "ten": "NO calibration gas",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "980mg/m3"
 },
 {
  "ten": "CO calibration gas",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "650mg/m3"
 },
 {
  "ten": "Bình khí hiệu chuẩn CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "20L",
  "nongDo": "25ppm"
 },
 {
  "ten": "Bình khí hiệu chuẩn NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "20L",
  "nongDo": "100ppm"
 },
 {
  "ten": "Bình khí hiệu chuẩn SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "20L",
  "nongDo": "100ppm"
 },
 {
  "ten": "Bình khí hiệu chuẩn O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "0.1"
 },
 {
  "ten": "Bình khí hiệu chuẩn NO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "610ppm"
 },
 {
  "ten": "Bình khí hiệu chuẩn CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "5000ppm"
 },
 {
  "ten": "Bình khí hiệu chuẩn NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1000ppm"
 },
 {
  "ten": "Bình khí hiệu chuẩn SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "300ppm"
 },
 {
  "ten": "Dung dịch chuẩn COD 300ppm",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "COD 300ppm",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-COD"
 },
 {
  "ten": "Dung dịch chuẩn NH4-N 10ppm",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "NH4-N 10ppm",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-AMONI"
 },
 {
  "ten": "Dung dịch chuẩn NH4-N 100ppm",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "NH4-N 100ppm",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-AMONI"
 },
 {
  "ten": "Bình khí chuẩn HCL",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "70 mg/Nm3"
 },
 {
  "ten": "Bình Khí Chuẩn SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "2400mg/m3"
 },
 {
  "ten": "Bình Khí Chuẩn SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "240mg/m3"
 },
 {
  "ten": "Bình Khí Chuẩn O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "0.21"
 },
 {
  "ten": "Bình Khí Chuẩn O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "0.01"
 },
 {
  "ten": "Bình khí hiệu chuẩn HCL",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "100mg/Nm3"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "CO 500 ppm ; NO 400 ppm ; SO2 500 ppm"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "CO 500 ppm ; NO 300 ppm ; SO2 30ppm"
 },
 {
  "ten": "Bình khí chuẩn hỗn hợp HCl",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "15 ppm"
 },
 {
  "ten": "Bình khí chuẩn O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "10%V hoặc 10% mol/mol"
 },
 {
  "ten": "Đồng Hồ Điều Áp",
  "tongSL": 1.0,
  "soLan": 1
 },
 {
  "ten": "Bình khí chuẩn hỗn hợp NH3",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "500 mg/Nm3"
 },
 {
  "ten": "Bình khí chuẩn hỗn hợp NH3",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "100 mg/Nm3"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "47L",
  "nongDo": "NO: 800 mg/Nm3 ; SO2: 800 mg/Nm3"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "47L",
  "nongDo": "NO: 1400 mg/Nm3 ; SO2: 1400 mg/Nm3"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "NO: 1000 mg/Nm3 ; SO2: 1000 mg/Nm3 ; CO: 1000 mg/Nm3"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "40L",
  "nongDo": "NO: 400ppm ; SO2: 500ppm ; CO: 500ppm"
 },
 {
  "ten": "Bình khí chuẩn NO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "40L",
  "nongDo": "400ppm"
 },
 {
  "ten": "Bình khí O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "0.07"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "NO: 400ppm ; SO2: 500ppm ; CO: 500ppm"
 },
 {
  "ten": "Bình khí chuẩn NO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "100ppm"
 },
 {
  "ten": "Bình khí chuẩn CO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "0.2"
 },
 {
  "ten": "Khí chuẩn Benzen",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "5ppm"
 },
 {
  "ten": "Khí chuẩn Toluene",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "20ppm"
 },
 {
  "ten": "Bình khí chuẩn HF",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "30mg/Nm3"
 },
 {
  "ten": "Bình khí chuẩn HF",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L"
 },
 {
  "ten": "Bình khí Hỗn Hợp CO/SO2/NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "CO 650mg/Nm3 ; SO2 650mg/Nm3 ; NO 980 mg/Nm3"
 },
 {
  "ten": "Dung dịch chuẩn pH 10",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "pH 10",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-PH"
 },
 {
  "ten": "Dung dịch chuẩn COD 10ppm",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "COD 10ppm",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-COD"
 },
 {
  "ten": "Dung dịch chuẩn COD 100ppm",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "COD 100ppm",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-COD"
 },
 {
  "ten": "Dung dịch chuẩn TSS 10ppm",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "TSS 10ppm",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-TSS"
 },
 {
  "ten": "Dung dịch chuẩn NH4-N 5ppm",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "NH4-N 5ppm",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-AMONI"
 },
 {
  "ten": "Khí chuẩn HF",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "30mg/m3"
 },
 {
  "ten": "Đồng hồ điều áp + Đầu chuyển",
  "tongSL": 1.0,
  "soLan": 1
 },
 {
  "ten": "Dung dịch chuẩn TSS 50ppm",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "TSS 50ppm",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-TSS"
 },
 {
  "ten": "Khí chuẩn O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "12.5%"
 },
 {
  "ten": "Khí chuẩn HF",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "38.3mg/m3"
 },
 {
  "ten": "Bình khí hiệu chuẩn NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "50L",
  "nongDo": "400 ppm"
 },
 {
  "ten": "Bình khí hiệu chuẩn CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "50L",
  "nongDo": "400 ppm"
 },
 {
  "ten": "Bình khí hiệu chuẩn hỗn hợp  CO/NO/SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "50L",
  "nongDo": "CO: 800 ppm ; NO: 800 ppm ; SO2: 200 ppm ;"
 },
 {
  "ten": "Bình khí hiệu chuẩn hỗn hợp  CO/NO/SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "50L",
  "nongDo": "NO: 2000 ppm ; CO: 1300 ppm ; SO2: 400 ppm ;"
 },
 {
  "ten": "Bình khí hiệu chuẩn NH3",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "100 ppm"
 },
 {
  "ten": "Bình khí hiệu chuẩn O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "0.1"
 },
 {
  "ten": "Bình khí hiệu chuẩn hỗn hợp  CO/NO/SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "CO: 650ppm ; NO: 1000ppm ; SO2: 980ppm"
 },
 {
  "ten": "Khí O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "0.15"
 },
 {
  "ten": "Khí CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "260mg/m3"
 },
 {
  "ten": "Khí SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "300mg/m3"
 },
 {
  "ten": "Khí NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "230mg/m3"
 },
 {
  "ten": "Khí HCL",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "70mg/m3"
 },
 {
  "ten": "Khí NH3",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "40mg/m3"
 },
 {
  "ten": "Khí N2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L"
 },
 {
  "ten": "Khí chuẩn HF",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "30L",
  "nongDo": "30mg/Nm3"
 },
 {
  "ten": "Khí chuẩn NH3",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "30L",
  "nongDo": "80mg/Nm3"
 },
 {
  "ten": "Khí chuẩn NH3",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "30L",
  "nongDo": "30mg/Nm3"
 },
 {
  "ten": "Bình khí chuẩn O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "10 %"
 },
 {
  "ten": "Bình khí chuẩn hỗn hợp SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "CO: 500 mg/m3 ; NO: 500 mg/m3 ; SO2: 100 mg/m3 ;"
 },
 {
  "ten": "Khí SF6",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "99.99%"
 },
 {
  "ten": "Khí hiệu chuẩn đa chỉ tiêu",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "Nitrogen 2000 mol/mol ; Ethane 50 mol/mol ; Ethylene 50 mol/mol ; Acetylene 60 mol/mol ; Oxygen 2000 mol/mol ; Hydrogen 800 mol/mol ; Methane 90 mol/mol ; Carbon Monoxide 600 mol/mol ; Carbon Dioxide 1100 mol/mol ;"
 },
 {
  "ten": "Khí chuẩn O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "40L",
  "nongDo": "0.25"
 },
 {
  "ten": "Dung dịch chuẩn COD",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "100ml/l",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-COD"
 },
 {
  "ten": "Dung dịch chuẩn COD",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "50ml/l",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-COD"
 },
 {
  "ten": "Dung dịch chuẩn NH4-N",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "10ml/l",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-AMONI"
 },
 {
  "ten": "Dung dịch chuẩn NH4-N",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "5ml/l",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-AMONI"
 },
 {
  "ten": "Khí chuẩn CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "1L",
  "nongDo": "500ppm"
 },
 {
  "ten": "Khí chuẩn NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "1L",
  "nongDo": "400ppm"
 },
 {
  "ten": "Khí chuẩn SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "1L",
  "nongDo": "500ppm"
 },
 {
  "ten": "Khí chuẩn CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "500ppm"
 },
 {
  "ten": "Khí chuẩn NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "400ppm"
 },
 {
  "ten": "Khí chuẩn hỗn hợp SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "CO 500ppm ; SO2 400ppm ; NO 500ppm"
 },
 {
  "ten": "Khí chuẩn O2",
  "tongSL": 1.0,
  "soLan": 1,
  "nongDo": "0.1"
 },
 {
  "ten": "Khí chuẩn HF",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "30mg/Nm3"
 },
 {
  "ten": "Dung dịch chuẩn pH",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500ML",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-PH"
 },
 {
  "ten": "Dung dịch chuẩn COD",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500ML",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-COD"
 },
 {
  "ten": "Dung dịch chuẩn TSS",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500ML",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-TSS"
 },
 {
  "ten": "Dung dịch chuẩn NH4-N",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500ML",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-AMONI"
 },
 {
  "ten": "Bình khí Oxy",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "0.01"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "CO 650mg/m3 ; SO2 650mg/m3 ; NO 980mg/m3"
 },
 {
  "ten": "Bình khí chuẩn",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "0.9999"
 },
 {
  "ten": "Dung dịch chuẩn NO3",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500mL",
  "nongDo": "100mg/L",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-KHAC"
 },
 {
  "ten": "Bình khí hiệu chuẩn HCL",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L/100bar",
  "nongDo": "100mg/Nm3"
 },
 {
  "ten": "Van điều áp Typhoon",
  "tongSL": 1.0,
  "soLan": 1
 },
 {
  "ten": "Bình Khí chuẩn O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8.0",
  "nongDo": "0.12"
 },
 {
  "ten": "Bình Khí chuẩn O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "4L",
  "nongDo": "0.05"
 },
 {
  "ten": "Bình khí SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1130 mg/m3"
 },
 {
  "ten": "Bình khí NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1200 mg/m3"
 },
 {
  "ten": "Bình khí CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "1800ppm"
 },
 {
  "ten": "Bình khí O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "0.08"
 },
 {
  "ten": "Bình Khí SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "600 mg/m3"
 },
 {
  "ten": "Bình khí CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1000mg/m3"
 },
 {
  "ten": "Bình Khí NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1000mg/m3"
 },
 {
  "ten": "Bình khí CO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L"
 },
 {
  "ten": "Bình khí O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "0.15"
 },
 {
  "ten": "Bình Khí NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "700ppm"
 },
 {
  "ten": "Bình Khí NO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "700ppm"
 },
 {
  "ten": "Bình Khí SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "500ppm"
 },
 {
  "ten": "Bình khí CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "700ppm"
 },
 {
  "ten": "Bình Khí SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1000mg/Nm3"
 },
 {
  "ten": "Dung dịch chuẩn PH7",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1000mg/Nm4",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-PH"
 },
 {
  "ten": "Bình Khí NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1000mg/Nm5"
 },
 {
  "ten": "Bình khí HCL",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "100mg/Nm3"
 },
 {
  "ten": "Dung dịch chuẩn PH7",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500ml",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-PH"
 },
 {
  "ten": "Dung dich chuẩn Amoni",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "20mgL",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-AMONI"
 },
 {
  "ten": "Dung dịch chuẩn TSS",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "200mgL",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-TSS"
 },
 {
  "ten": "Dung dịch chuẩn COD",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "500ml",
  "nongDo": "100mgL",
  "ghiChu": "Em gán sẵn theo nhóm dung dịch — anh sửa được",
  "ma": "DD-COD"
 },
 {
  "ten": "Bình khí SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1000mg/Nm3"
 },
 {
  "ten": "Bình khí NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1000mg/Nm3"
 },
 {
  "ten": "Bình khí CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1000mg/Nm3"
 },
 {
  "ten": "Bình khí HF",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "30 mg/Nm3"
 },
 {
  "ten": "Bình Khí HCL",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "100.0"
 },
 {
  "ten": "Bình Khí CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "710 ppm"
 },
 {
  "ten": "Bình khí HCl",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "40L",
  "nongDo": "100 mg/Nm3"
 },
 {
  "ten": "Bình Khí N2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "99.99%"
 },
 {
  "ten": "Bình khí CH4",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "50% LEL"
 },
 {
  "ten": "Bình O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "0.1"
 },
 {
  "ten": "Bình khí 6D 99.99% N2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "103L"
 },
 {
  "ten": "Bình khí chuẩn SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "SO2 : 1200ppm, CO 1200ppm, NO 800 ppm"
 },
 {
  "ten": "Khí chuẩn SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "170ppm"
 },
 {
  "ten": "Khí chuẩn HCL",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "100 mg/Nm3"
 },
 {
  "ten": "Hỗn hợp khí chuẩn CH4/N2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "6D",
  "nongDo": "0.05"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "NO: 3000 ppm ; SO2: 3000 ppm ; CO: 1200 ppm"
 },
 {
  "ten": "Bình khí chuẩn O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "0.21"
 },
 {
  "ten": "Bình khí chuẩn SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1350 mg/m3"
 },
 {
  "ten": "Bình khí chuẩn NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "1470 mg/m3"
 },
 {
  "ten": "Bình khí chuẩn CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "2700 mg/m3"
 },
 {
  "ten": "Bình khí chuẩn N2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "99,99%"
 },
 {
  "ten": "Bình khí N2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "99,99%"
 },
 {
  "ten": "Khí chuẩn CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "1,2L",
  "nongDo": "509 ppm"
 },
 {
  "ten": "Khí chuẩn O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "1,2L",
  "nongDo": "0.07"
 },
 {
  "ten": "Khí chuẩn NO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "1,2L",
  "nongDo": "98 ppm"
 },
 {
  "ten": "Khí chuẩn NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "1,2L",
  "nongDo": "402 ppm"
 },
 {
  "ten": "Khí chuẩn NO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "1,2L",
  "nongDo": "517 ppm"
 },
 {
  "ten": "Khí chuẩn NO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "450 ppm"
 },
 {
  "ten": "Bình HF",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "30 mg/Nm3"
 },
 {
  "ten": "Bình khí hỗn hợp SO2/NO/CO",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "8L",
  "nongDo": "650/980/650"
 },
 {
  "ten": "Bình khí chuẫn hỗn hợp CO/O2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "CO: 4% NO: 20%"
 },
 {
  "ten": "Bình khí chuẫn hỗn hợp NO/SO2",
  "tongSL": 1.0,
  "soLan": 1,
  "theTich": "10L",
  "nongDo": "NO2: 32000ppm , SO2: 8000ppm"
 },
 {
  "ten": "Khí chuẩn N2",
  "tongSL": 0.0,
  "soLan": 1,
  "theTich": "6D",
  "nongDo": "99.999%"
 }
];
