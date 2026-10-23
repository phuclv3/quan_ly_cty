/**
 * Mã trạng thái lưu ở DB / trao đổi với backend (không dấu, IN HOA). Tên tiếng Việt chỉ để hiển thị:
 * luôn qua `ttNhan(ma)`, KHÔNG so sánh / lưu chuỗi tiếng Việt. Khớp backend domain/model/TrangThai.java
 * và CHECK trong db/migration.
 */
export const TT = {
  HOAT_DONG: 'HOAT_DONG',
  KHOA: 'KHOA',
  DANG_DUNG: 'DANG_DUNG',
  NGUNG: 'NGUNG',
  NHAP: 'NHAP',
  CHO_DUYET: 'CHO_DUYET',
  DA_DUYET: 'DA_DUYET',
  TU_CHOI: 'TU_CHOI',
  DA_RUT: 'DA_RUT',
  BAO_GIA: 'BAO_GIA',
  HIEU_LUC: 'HIEU_LUC',
  DANG_GIAO_HANG: 'DANG_GIAO_HANG',
  DANG_THUC_HIEN: 'DANG_THUC_HIEN',
  HOAN_THANH: 'HOAN_THANH',
  DA_TAT_TOAN: 'DA_TAT_TOAN',
  HUY: 'HUY',
  DA_KY: 'DA_KY',
  DANG_NHAN_HANG: 'DANG_NHAN_HANG',
  DA_NHAN_DU: 'DA_NHAN_DU',
  DA_HUY: 'DA_HUY',
  CHUA_PHAN_BO: 'CHUA_PHAN_BO',
  DA_PHAN_BO: 'DA_PHAN_BO',
  CHUA_LIEN_HE: 'CHUA_LIEN_HE',
  DANG_LIEN_HE: 'DANG_LIEN_HE',
  HOP_DONG: 'HOP_DONG',
  CHUA_TIEP_CAN: 'CHUA_TIEP_CAN',
  DA_BAO_GIA: 'DA_BAO_GIA',
  DANG_DAM_PHAN: 'DANG_DAM_PHAN',
  KY_HOP_DONG: 'KY_HOP_DONG',
  DA_GIAO_HANG: 'DA_GIAO_HANG',
} as const;

export type MaTrangThai = (typeof TT)[keyof typeof TT];

const NHAN: Record<MaTrangThai, string> = {
  HOAT_DONG: 'Hoạt động',
  KHOA: 'Khoá',
  DANG_DUNG: 'Đang dùng',
  NGUNG: 'Ngưng',
  NHAP: 'Nháp',
  CHO_DUYET: 'Chờ duyệt',
  DA_DUYET: 'Đã duyệt',
  TU_CHOI: 'Từ chối',
  DA_RUT: 'Đã rút',
  BAO_GIA: 'Báo giá',
  HIEU_LUC: 'Hiệu lực',
  DANG_GIAO_HANG: 'Đang giao hàng',
  DANG_THUC_HIEN: 'Đang thực hiện',
  HOAN_THANH: 'Hoàn thành',
  DA_TAT_TOAN: 'Đã tất toán',
  HUY: 'Huỷ',
  DA_KY: 'Đã ký',
  DANG_NHAN_HANG: 'Đang nhận hàng',
  DA_NHAN_DU: 'Đã nhận đủ',
  DA_HUY: 'Đã huỷ',
  CHUA_PHAN_BO: 'Chưa phân bổ',
  DA_PHAN_BO: 'Đã phân bổ',
  CHUA_LIEN_HE: 'Chưa liên hệ',
  DANG_LIEN_HE: 'Đang liên hệ',
  HOP_DONG: 'Hợp đồng',
  CHUA_TIEP_CAN: 'Chưa tiếp cận',
  DA_BAO_GIA: 'Đã báo giá',
  DANG_DAM_PHAN: 'Đang đàm phán',
  KY_HOP_DONG: 'Ký hợp đồng',
  DA_GIAO_HANG: 'Đã giao hàng',
};

/** Tên tiếng Việt để hiển thị; mã lạ / rỗng trả lại nguyên giá trị (rỗng → ''). */
export function ttNhan(ma: string | null | undefined): string {
  return ma == null ? '' : (NHAN as Record<string, string>)[ma] ?? ma;
}
