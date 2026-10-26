/**
 * Xuất / tải tệp: mọi tệp (Excel, ZIP hồ sơ, tờ trình Word, bản sao lưu) do backend dựng
 * (web/XuatController, HopDongController); frontend chỉ gửi dữ liệu đang xem và lưu tệp trả về.
 */
import { signal } from '@angular/core';
import { API_BASE, ApiError, authHeaders } from '../core/api';

let baoLoi: (msg: string) => void = () => undefined;
/** Store đăng ký hàm hiện toast lỗi để các nút xuất không phải tự bắt lỗi. */
export function dangKyBaoLoi(fn: (msg: string) => void): void {
  baoLoi = fn;
}

/** 'Tờ trình.docx' từ Content-Disposition (ưu tiên filename*=UTF-8''…). */
function tenTuHeader(cd: string | null, macDinh: string): string {
  const m = /filename\*=UTF-8''([^;]+)/i.exec(cd ?? '') ?? /filename="?([^";]+)"?/i.exec(cd ?? '');
  try {
    return m ? decodeURIComponent(m[1]) : macDinh;
  } catch {
    return macDinh;
  }
}

interface Tep {
  blob: Blob;
  ten: string;
  soTep: number;
}

/** Gọi backend lấy tệp. Ném ApiError (câu tiếng Việt của máy chủ) nếu lỗi. */
async function layTep(method: 'GET' | 'POST', path: string, body: unknown, macDinh: string): Promise<Tep> {
  const res = await fetch(API_BASE + path, {
    method,
    headers: { ...authHeaders(), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = 'Không xuất được tệp';
    try {
      msg = ((await res.json()) as { message?: string }).message ?? msg;
    } catch {
      /* thân lỗi không phải JSON */
    }
    throw new ApiError(msg, res.status);
  }
  return { blob: await res.blob(), ten: tenTuHeader(res.headers.get('Content-Disposition'), macDinh), soTep: Number(res.headers.get('X-Tep-Count') ?? 0) };
}

const loiKetNoi = (e: unknown) => (e instanceof ApiError ? e.message : 'Không kết nối được máy chủ để xuất tệp');

/** Số tệp đang được tạo — app.ts hiện lớp phủ "Đang tạo file…" khi > 0 (chặn bấm lặp nút xuất). */
export const dangTaoTep = signal(0);

/** Gọi backend lấy tệp rồi tải xuống. Trả số tệp gói (ZIP) hoặc 0; null nếu lỗi (đã hiện toast). */
async function tai(method: 'GET' | 'POST', path: string, body: unknown, macDinh: string): Promise<number | null> {
  dangTaoTep.update((n) => n + 1);
  try {
    const { blob, ten, soTep } = await layTep(method, path, body, macDinh);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ten;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return soTep;
  } catch (e) {
    baoLoi(loiKetNoi(e));
    return null;
  } finally {
    dangTaoTep.update((n) => n - 1);
  }
}

export type Cell = string | number | null;

/** Excel (.xlsx, template chung của backend) từ bảng đang xem, dòng đầu là tiêu đề — 'bao-cao-thang' → bao-cao-thang-2026-08-26.xlsx. */
export const xuatExcel = (ten: string, dong: Cell[][]) => tai('POST', '/xuat/excel', { ten, dong }, `${ten}.xlsx`);

export interface SheetXlsx {
  ten: string;
  dong: (string | number)[][];
  /** Độ rộng cột (đơn vị ký tự Excel). */
  rong?: number[];
  /** Dòng đầu là tiêu đề (mặc định có): in đậm, nền xanh, cố định + bộ lọc. */
  tieuDe?: boolean;
}

/** Tệp .xlsx nhiều sheet (tệp mẫu nhập liệu). */
export const xuatXlsx = (ten: string, sheets: SheetXlsx[]) => tai('POST', '/xuat/xlsx', { ten, sheets }, ten);

export interface TemBinhKhiReq {
  loai: string;
  quyCachVan: string;
  vatLieu: string;
  apSuat: string;
  soSeri: string;
  maUn: string;
  dinhLuong: string;
  xuatXu: string;
  bienPhap: string[];
  huongDan: string[];
  ngaySanXuat: string;
  hanSuDung: string;
  tenKhiChuan: string;
  thanhPhan: { ten: string; kyHieu: string; nongDo: string }[];
  soLuong: number;
  /** true = xem trực tiếp khi đang nhập dở: backend bỏ qua kiểm tra bắt buộc. */
  xemTruoc?: boolean;
}

/** PDF tem dán bình khí (mỗi tem 1 trang) — backend dựng theo mẫu tem. */
export const xuatTemBinhKhi = (req: TemBinhKhiReq) => tai('POST', '/xuat/tem-binh-khi', req, 'tem-binh-khi.pdf');

/**
 * PDF tem để xem trên màn hình (không tải xuống). Lỗi trả về trong `loi` thay vì hiện toast,
 * vì xem trực tiếp gọi lại sau mỗi lần sửa — lỗi nhập dở (thiếu số seri…) không đáng làm phiền.
 */
export async function xemTemBinhKhi(req: TemBinhKhiReq): Promise<{ blob: Blob | null; loi: string }> {
  try {
    return { blob: (await layTep('POST', '/xuat/tem-binh-khi', req, 'tem-binh-khi.pdf')).blob, loi: '' };
  } catch (e) {
    return { blob: null, loi: loiKetNoi(e) };
  }
}

/** Gói ZIP các tệp hồ sơ (backend kiểm quyền từng tệp). Trả số tệp đã gói. */
export const xuatZip = (ten: string, muc: { path: string; fileId: string }[]) => tai('POST', '/xuat/zip', { ten, muc }, ten);

/** Bản sao lưu dữ liệu (JSON). */
export const xuatBanSao = () => tai('GET', '/xuat/ban-sao', undefined, 'app-oxy-ban-sao.json');

/** Xem thử tờ trình từ HĐ bán đang nhập (chưa cần lưu) — backend điền vào mẫu Word. */
export const xemThuToTrinhHdb = (hd: unknown) => tai('POST', '/hop-dong-ban/to-trinh', hd, 'to-trinh.docx');

/** Tờ trình chi phí kinh doanh của HĐ bán đã lưu (Word, theo mẫu). */
export const xuatToTrinhHdb = (id: string) => tai('GET', `/hop-dong-ban/${encodeURIComponent(id)}/to-trinh`, undefined, 'to-trinh.docx');

/** PDF phiếu nhập / xuất kho — backend dựng từ phiếu đã lưu. Lỗi trả về trong `loi`. */
export async function xemPhieuKhoPdf(id: string): Promise<{ blob: Blob | null; loi: string }> {
  try {
    return { blob: (await layTep('GET', `/phieu-kho/${encodeURIComponent(id)}/pdf`, undefined, 'phieu-kho.pdf')).blob, loi: '' };
  } catch (e) {
    return { blob: null, loi: loiKetNoi(e) };
  }
}
