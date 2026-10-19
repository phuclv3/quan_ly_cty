/**
 * In chứng từ Kế toán trong cửa sổ riêng (không lẫn khung app): phiếu Thu/Chi A5 (KT-05),
 * quyết toán vận chuyển A4 (KT-16).
 */

import { CONG_TY } from '../core/cong-ty';

export function esc(s: string | number | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Khối đơn vị ở góc trái chứng từ in (tên, MST, địa chỉ — core/cong-ty.ts). */
export function donVi(): string {
  return `<div><b>${esc(CONG_TY.ten)}</b><br>MST: ${esc(CONG_TY.mst)}<br><span class="m">${esc(CONG_TY.diaChi)}</span></div>`;
}

/** Hàng chữ ký: mỗi ô "Chức danh / (Ký, họ tên)". */
export function kyTen(chucDanh: string[]): string {
  return `<table class="ky"><tr>${chucDanh
    .map((c) => `<td><b>${esc(c)}</b><br><i>(Ký, họ tên)</i></td>`)
    .join('')}</tr></table>`;
}

/** Mở cửa sổ in. Trả false nếu trình duyệt chặn cửa sổ bật lên. */
export function inGiay(title: string, body: string, kho: 'A5' | 'A4'): boolean {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return false;
  const css = `
    @page { size: ${kho === 'A5' ? 'A5 landscape' : 'A4 portrait'}; margin: 12mm; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; color: #000; margin: 0; }
    h1 { text-align: center; font-size: 17pt; margin: 6px 0 2px; }
    .c { text-align: center; } .r { text-align: right; } .m { color: #444; }
    .head { display: flex; justify-content: space-between; font-size: 11.5pt; }
    .dong { margin: 5px 0; } .dong b { display: inline-block; min-width: 150px; font-weight: 400; }
    table.l { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12pt; }
    table.l th, table.l td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
    table.l th { background: #eee; }
    table.ky { width: 100%; margin-top: 18px; text-align: center; font-size: 12pt; }
    table.ky td { vertical-align: top; height: 90px; }
  `;
  w.document.open();
  w.document.write(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`,
  );
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 150);
  return true;
}
