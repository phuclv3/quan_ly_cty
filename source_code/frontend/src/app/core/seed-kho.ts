/**
 * Dữ liệu kho — trích từ tai_lieu/note_update/KhoOxyMecie_v3.xlsx (sheet "DM. Mã hàng", "1. NhapKho", "6. KiemKe").
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
  dong: { ma: string; soLuong: number; ghiChu: string }[];
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
   "ghiChu": "NO2 · Air Liquide"
  },
  {
   "ma": "KC-N2-10L",
   "soLuong": 8,
   "ghiChu": "N2 · Air Liquide"
  },
  {
   "ma": "KC-O2-10L",
   "soLuong": 1,
   "ghiChu": "O2 · Air Liquide"
  },
  {
   "ma": "KC-O2-8L",
   "soLuong": 5,
   "ghiChu": "O2 · Air Liquide"
  },
  {
   "ma": "KC-SO2NOCO-8L",
   "soLuong": 3,
   "ghiChu": "SO2/NO/CO · Air Liquide · 650/980/650"
  },
  {
   "ma": "KC-SO2NOCO-10L",
   "soLuong": 1,
   "ghiChu": "SO2/NO/CO · Air Liquide · 28,9/306/506"
  },
  {
   "ma": "KC-HF-8L",
   "soLuong": 1,
   "ghiChu": "HF · Air Liquide · 30 mg/nm3"
  },
  {
   "ma": "KC-NH3-8L",
   "soLuong": 1,
   "ghiChu": "NH3 · Air Liquide · 50,8ppm"
  },
  {
   "ma": "KC-HCL-10L",
   "soLuong": 1,
   "ghiChu": "HCL · Air Liquide · 15,2ppm"
  },
  {
   "ma": "KC-O2-8L",
   "soLuong": 1,
   "ghiChu": "O2 · 0.02"
  },
  {
   "ma": "KC-SO2-10L",
   "soLuong": 1,
   "ghiChu": "SO2 · 49,6ppm"
  },
  {
   "ma": "KC-CO2-8L",
   "soLuong": 1,
   "ghiChu": "CO2 · 0.0999"
  },
  {
   "ma": "KC-TO-10L",
   "soLuong": 2,
   "ghiChu": "Toàn Tiếng TQ"
  },
  {
   "ma": "KC-SO2NOCO-10L",
   "soLuong": 1,
   "ghiChu": "SO2/NO/CO · 500/400/500"
  },
  {
   "ma": "VO-NHOM-10L",
   "soLuong": 1,
   "ghiChu": "Nhôm"
  },
  {
   "ma": "VO-NHOM-8L",
   "soLuong": 1,
   "ghiChu": "Nhôm"
  },
  {
   "ma": "VO-KHAC-10L",
   "soLuong": 3,
   "ghiChu": "Vỏ màu hồng đã kiểm định"
  },
  {
   "ma": "VO-KHAC-30L",
   "soLuong": 1,
   "ghiChu": "Vỏ"
  },
  {
   "ma": "VO-KHAC-20L",
   "soLuong": 1,
   "ghiChu": "Vỏ"
  },
  {
   "ma": "VO-THEP-10L",
   "soLuong": 8,
   "ghiChu": "Vỏ thép"
  },
  {
   "ma": "VO-NHOM-50L",
   "soLuong": 4,
   "ghiChu": "Vỏ nhôm"
  },
  {
   "ma": "VO-NHOM-40L",
   "soLuong": 1,
   "ghiChu": "Vỏ nhôm"
  },
  {
   "ma": "VO-THEP-40L",
   "soLuong": 5,
   "ghiChu": "Vỏ thép"
  },
  {
   "ma": "VO-NHOM-10L",
   "soLuong": 1,
   "ghiChu": "Vỏ nhôm · Xịn"
  },
  {
   "ma": "VO-NHOM-8L",
   "soLuong": 1,
   "ghiChu": "Vỏ nhôm · Xịn"
  },
  {
   "ma": "VO-KHAC-1L",
   "soLuong": 34,
   "ghiChu": "Vỏ"
  },
  {
   "ma": "VO-NHOM",
   "soLuong": 6,
   "ghiChu": "Vỏ nhôm"
  }
 ]
};
