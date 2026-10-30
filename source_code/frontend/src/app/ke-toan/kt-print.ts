/**
 * In chứng từ Kế toán trong cửa sổ riêng (không lẫn khung app): phiếu Thu/Chi A5 (KT-05),
 * quyết toán vận chuyển A4 (KT-16).
 */

import { CONG_TY } from '../core/cong-ty';
import { chenhLechQuyetToan } from '../core/calc';
import { PhieuThuChi } from '../core/models';
import { Store } from '../core/store';
import { money, moneyInWords } from '../core/util';
import { ttNhan } from '../core/trang-thai';

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
  // @page margin 0 → trình duyệt không in đầu/chân trang (about:blank, ngày giờ AM/PM, tiêu đề, số trang); lề thật nằm ở padding của body.
  const css = `
    @page { size: ${kho === 'A5' ? 'A5 landscape' : 'A4 portrait'}; margin: 0; }
    body { font-family: 'Be Vietnam Pro', 'Segoe UI', 'Noto Sans', Roboto, system-ui, sans-serif; font-size: 13pt; color: #000; margin: 0; padding: 12mm; }
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
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`,
  );
  w.document.close();
  w.focus();
  // Chờ font tải xong (tối đa 2 giây) rồi mới in, để chứng từ cùng kiểu chữ với hệ thống.
  void Promise.race([w.document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]).then(() => w.print());
  return true;
}

/** Chuỗi dấu chấm điền chỗ trống (cắt bằng overflow, không dùng đường kẻ). */
const CHAM = '.'.repeat(300);

/** CSS riêng cho mẫu phiếu thu/chi theo TT 133/2016/TT-BTC (Mẫu số 01-TT / 02-TT). */
const CSS_MAU_TT = `
  /* Tinos (Google Fonts) cùng độ rộng chữ với Times New Roman — máy Linux không có Times New Roman vẫn in cùng bố cục. */
  body { font-family: 'Times New Roman', Tinos, 'Liberation Serif', Times, serif; font-size: 12pt; }
  .mau-head { display: flex; justify-content: space-between; align-items: flex-start; font-size: 11pt; }
  .mau-head .tr { width: 44%; text-align: center; }
  .mau-head .tr i { display: block; margin-top: 4px; font-size: 10.5pt; }
  .mau-tt { position: relative; text-align: center; margin-top: 6px; }
  .mau-tt h1 { font-size: 18pt; margin: 0; }
  .mau-tt .qs { position: absolute; right: 0; top: 4px; font-size: 11pt; }
  .mau-tt .so { font-weight: 700; }
  .mau-dong { margin: 7px 0; }
  .mau-dong span.v { margin-left: 4px; }
  .mau-dong.nua { display: inline-block; width: 49%; }
  table.ky b { font-size: 12pt; } table.ky td { height: 80px; }
  .cuoi { font-size: 11pt; margin-top: 4px; }
  .cuoi div { display: flex; margin: 3px 0; }
  .cuoi i.cham { flex: 1; overflow: hidden; white-space: nowrap; font-style: normal; margin-left: 6px; }
`;

/** In chứng từ Phiếu thu / chi A5 theo mẫu TT 133 (dùng ở popup phiếu và nút In ở từng dòng danh sách). */
export function inPhieuThuChi(p: PhieuThuChi, store: Store): void {
  const cl = chenhLechQuyetToan(p, store.db());
  const goc = store.phieuById(p.phieuTamUngGoc);
  const laThu = p.loai === 'Thu' || (p.loai === 'Quyết toán tạm ứng' && cl > 0);
  const tieuDe = p.loai === 'Luân chuyển' ? 'PHIẾU LUÂN CHUYỂN TIỀN' : laThu ? 'PHIẾU THU' : 'PHIẾU CHI';
  const soTien = p.loai === 'Thu' ? p.soTienThu : p.loai === 'Quyết toán tạm ứng' ? Math.abs(cl) : p.soTienChi;
  const nhan = laThu ? 'nộp' : 'nhận';
  const ten = store.me()?.hoTen ?? (p.nguoiNhan || store.userName(p.nguoiDeNghi));
  const nguon =
    p.loai === 'Luân chuyển' ? `${store.nguonTen(p.nguonTien)} → ${store.nguonTen(p.nguonTienDen)}` : store.nguonTen(p.nguonTien);
  const lyDo = [
    p.noiDung,
    p.loai === 'Quyết toán tạm ứng' && goc ? `(Tạm ứng gốc ${goc.soPhieu}: ${money(goc.soTienChi)} đ; thực chi ${money(p.soTienThucChi ?? 0)} đ)` : '',
    p.loai === 'Luân chuyển' ? `[Nguồn tiền: ${nguon}]` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const d = p.ngayLap.split('-');
  const ky = laThu
    ? ['Giám đốc', 'Kế toán trưởng', 'Người nộp tiền', 'Người lập phiếu', 'Thủ quỹ']
    : ['Giám đốc', 'Kế toán trưởng', 'Thủ quỹ', 'Người lập phiếu', 'Người nhận tiền'];
  const kyHtml = `<table class="ky"><tr>${ky
    .map(
      (c, i) =>
        `<td><b>${c}</b><br><i>${i === 0 ? '(Ký, họ tên, đóng dấu)' : '(Ký, họ tên)'}</i>${
          i === (laThu ? 2 : 4) ? `<div style="margin-top:48px"><b>${esc(ten)}</b></div>` : ''
        }</td>`,
    )
    .join('')}</tr></table>`;
  const body = `
    <style>${CSS_MAU_TT}</style>
    <div class="mau-head">
      <div><b>${esc(CONG_TY.ten)}</b><br><i style="font-size:10.5pt">${esc(CONG_TY.diaChi)}</i></div>
      <div class="tr"><b>Mẫu số ${laThu ? '01' : '02'} - TT</b><i>(Ban hành theo thông tư 133/2016/TT-BTC ngày 26/08/2016 của Bộ Tài chính)</i></div>
    </div>
    <div class="mau-tt">
      <span class="qs">Quyển số:..........</span>
      <h1>${tieuDe}</h1>
      <div>Ngày ${d[2]} tháng ${d[1]} năm ${d[0]}</div>
      <div class="so">${esc(p.soPhieu)}</div>
    </div>
    <div class="mau-dong">Họ và tên người ${nhan} tiền: <span class="v">${esc(ten)}</span></div>
    <div class="mau-dong">Địa chỉ:</div>
    <div class="mau-dong">Lý do: <span class="v">${esc(lyDo)}</span></div>
    <div class="mau-dong"><span class="nua">Số tiền: <b>${money(soTien)} đ</b></span><span class="nua">(Viết bằng chữ): <i>${esc(moneyInWords(soTien))}</i></span></div>
    <div class="mau-dong"><span class="nua">Kèm theo: ${p.files?.length ? `${p.files.length} tệp` : ''}</span><span class="nua">Chứng từ gốc:</span></div>
    ${kyHtml}
    <div class="cuoi">
      <div>Đã nhận đủ số tiền (viết bằng chữ):<i class="cham">${CHAM}</i></div>
      <div>+ Tỷ giá ngoại tệ (vàng, bạc, đá quý):<i class="cham">${CHAM}</i></div>
      <div>+ Tỷ giá quy đổi:<i class="cham">${CHAM}</i></div>
    </div>
  `;
  if (!inGiay(`${tieuDe} ${p.soPhieu}`, body, 'A5')) store.say('Trình duyệt chặn cửa sổ in — hãy cho phép cửa sổ bật lên');
}
