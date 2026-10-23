import { maLo } from '../core/calc';
import { Db, KHO_CHUYEN_THANG, LoaiHang, NHOM_HANG, PhieuKho } from '../core/models';
import { Store } from '../core/store';
import { TT } from '../core/trang-thai';
import { PickOption } from '../shared/ui-kit';

/** Một dòng thẻ kho (KHO-09): một dòng phiếu đụng tới lô / mã hàng đang xem. */
export interface DongTheKho {
  phieu: PhieuKho;
  lo: string;
  quyCach: string;
  nhap: number;
  xuat: number;
  luyKe: number;
  /** Nhập: đơn giá lô; xuất: đơn giá vốn. */
  donGia: number;
  tenTrenHD?: string;
}

/**
 * Thẻ kho: các dòng phiếu Hiệu lực của một lô, hoặc của một mã hàng (× kho nếu có), theo ngày.
 * kho rỗng = mọi kho thường (bỏ Chuyển thẳng). [cần chuyển vào core/calc.ts]
 */
export function theKho(db: Db, o: { loaiHang?: string; lo?: string; kho?: string }): DongTheKho[] {
  const ps = db.phieuKho
    .filter((p) => p.trangThai === TT.HIEU_LUC && (o.kho ? p.kho === o.kho : p.kho !== KHO_CHUYEN_THANG))
    .sort((a, b) => (a.ngay === b.ngay ? a.soPhieu.localeCompare(b.soPhieu) : a.ngay < b.ngay ? -1 : 1));
  const out: DongTheKho[] = [];
  let lk = 0;
  for (const p of ps)
    p.dong.forEach((d, i) => {
      const lo = p.loai === 'Nhập' ? maLo(p, i) : (d.lo ?? '');
      if (o.lo ? lo !== o.lo : d.loaiHang !== o.loaiHang) return;
      const nhap = p.loai === 'Nhập' ? d.soLuong : 0;
      const xuat = p.loai === 'Xuất' ? d.soLuong : 0;
      lk += nhap - xuat;
      out.push({ phieu: p, lo, quyCach: d.thuocTinh, nhap, xuat, luyKe: lk, donGia: (p.loai === 'Nhập' ? d.donGia : d.donGiaGoc) ?? 0, tenTrenHD: d.tenTrenHD });
    });
  return out;
}

/** Tham số liên kết sâu mở popup một phiếu kho: /kho?tab=nhap|xuat&id=… */
export function linkPhieuKho(p: Pick<PhieuKho, 'id' | 'loai'>): { tab: string; id: string } {
  return { tab: p.loai === 'Nhập' ? 'nhap' : 'xuat', id: p.id };
}

/** Số HĐ và đường dẫn của HĐ liên quan một phiếu kho. */
export function hdCuaPhieu(store: Store, p: PhieuKho): { so: string; link: string[] } | null {
  if (!p.hdId) return null;
  if (p.loai === 'Nhập') {
    const m = store.hdmById(p.hdId);
    return m ? { so: m.soHD || '(chưa có số)', link: ['/hop-dong-mua', m.id] } : null;
  }
  const h = store.hdbById(p.hdId);
  return h ? { so: h.soHD || '(chưa có số)', link: ['/hop-dong-ban', h.id] } : null;
}

export const khoOpts = (db: Db, gomCT = true): PickOption[] =>
  db.kho.filter((k) => gomCT || k.id !== KHO_CHUYEN_THANG).map((k) => ({ value: k.id, label: k.ten, hint: k.dangDung ? k.id : `${k.id} · Ngưng` }));

export const nhomOpts = (): PickOption[] => NHOM_HANG.map((n) => ({ value: n, label: n }));

/** Phần cố định của mã hàng để hiện cạnh mã: "Khí chuẩn · 8L · Bình". */
export const moTaMa = (l?: LoaiHang): string => (l ? [l.nhom, l.theTich, l.dvt].filter(Boolean).join(' · ') : '');

/** Lựa chọn mã hàng: nhãn = mã — tên, gợi ý = phần cố định; tìm được cả theo tên tham chiếu (không hiện cho gọn). */
export const maHangOpts = (ds: LoaiHang[]): PickOption[] =>
  ds.map((l) => ({ value: l.id, label: `${l.id} — ${l.ten}`, hint: moTaMa(l), tim: (l.bietDanh ?? []).join(' ') }));

export const NGUON_GOC_OPTS: PickOption[] = [
  { value: 'Tự động HĐ Mua', label: 'Tự động HĐ Mua' },
  { value: 'Tự động HĐ Bán', label: 'Tự động HĐ Bán' },
  { value: 'Nhập tay – điều chỉnh', label: 'Nhập tay – điều chỉnh' },
];
