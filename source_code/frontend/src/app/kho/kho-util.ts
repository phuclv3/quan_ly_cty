import { Db, KHO_CHUYEN_THANG, NHOM_HANG, PhieuKho } from '../core/models';
import { Store } from '../core/store';
import { PickOption } from '../shared/ui-kit';

/** Một dòng thẻ kho (KHO-09: lịch sử phiếu của một biến thể). */
export interface DongTheKho {
  phieu: PhieuKho;
  nhap: number;
  xuat: number;
  luyKe: number;
}

/**
 * Thẻ kho: các phiếu Hiệu lực có dòng đúng Loại hàng × thuộc tính (× kho nếu có), theo ngày.
 * kho rỗng = mọi kho thường (bỏ Chuyển thẳng). [cần chuyển vào core/calc.ts]
 */
export function theKho(db: Db, o: { loaiHang: string; thuocTinh: string; kho?: string }): DongTheKho[] {
  const ps = db.phieuKho
    .filter((p) => p.trangThai === 'Hiệu lực' && (o.kho ? p.kho === o.kho : p.kho !== KHO_CHUYEN_THANG))
    .sort((a, b) => (a.ngay === b.ngay ? a.soPhieu.localeCompare(b.soPhieu) : a.ngay < b.ngay ? -1 : 1));
  const out: DongTheKho[] = [];
  let lk = 0;
  for (const p of ps) {
    let sl = 0;
    for (const d of p.dong) if (d.loaiHang === o.loaiHang && d.thuocTinh === o.thuocTinh) sl += d.soLuong;
    if (!sl) continue;
    const nhap = p.loai === 'Nhập' ? sl : 0;
    const xuat = p.loai === 'Xuất' ? sl : 0;
    lk += nhap - xuat;
    out.push({ phieu: p, nhap, xuat, luyKe: lk });
  }
  return out;
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

export const NGUON_GOC_OPTS: PickOption[] = [
  { value: 'Tự động HĐ Mua', label: 'Tự động HĐ Mua' },
  { value: 'Tự động HĐ Bán', label: 'Tự động HĐ Bán' },
  { value: 'Nhập tay – điều chỉnh', label: 'Nhập tay – điều chỉnh' },
];
