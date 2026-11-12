/**
 * In phiếu nhập / xuất kho A4 theo Mẫu số 01-VT / 02-VT (TT 133/2016/TT-BTC) — cùng cách xử lý và kiểu chữ
 * (Times New Roman / Tinos, cửa sổ in riêng) với phiếu Thu / Chi ở Kế toán (ke-toan/kt-print.ts).
 */

import { CONG_TY } from '../core/cong-ty';
import { maLo } from '../core/calc';
import { PhieuKho } from '../core/models';
import { Store } from '../core/store';
import { TT } from '../core/trang-thai';
import { money, moneyInWords, sum } from '../core/util';
import { CSS_MAU_TT, esc, inGiay } from '../ke-toan/kt-print';

/** Chuỗi dấu chấm điền chỗ trống (cắt bằng overflow, không dùng đường kẻ). */
const CHAM = '.'.repeat(300);
/** Số dòng tối thiểu của bảng hàng — phiếu ít hàng vẫn chừa dòng trống như mẫu. */
const SO_DONG_TOI_THIEU = 11;

const CSS_KHO = `
  html, body, body * { font-family: 'Times New Roman', Tinos, 'Liberation Serif', Times, serif !important; }
  table.kho { width: 100%; border-collapse: collapse; margin: 10px 0 6px; font-size: 11pt; }
  table.kho th, table.kho td { border: 1px solid #000; padding: 3px 6px; vertical-align: middle; }
  table.kho th { text-align: center; background: none; font-weight: 700; }
  table.kho td { height: 20px; }
  table.kho .c { text-align: center; } table.kho .r { text-align: right; }
  .mau-dong.cham-dong { display: flex; }
  .mau-dong.cham-dong .gt { flex: 1; overflow: hidden; white-space: nowrap; margin-left: 6px; }
  .huy { text-align: center; color: #c00; font-weight: 700; margin: 4px 0; }
  table.ky td { height: 90px; }
`;

/** Dòng "- Nhãn: giá trị"; chưa có giá trị thì kẻ chấm để viết tay. */
function dong(nhan: string, giaTri: string): string {
  return giaTri
    ? `<div class="mau-dong">- ${esc(nhan)}: <span class="v">${esc(giaTri)}</span></div>`
    : `<div class="mau-dong cham-dong">- ${esc(nhan)}:<span class="gt">${CHAM}</span></div>`;
}

/** In phiếu nhập / xuất kho (nút "In phiếu" ở Kho → Nhập kho / Xuất kho). */
export function inPhieuKho(p: PhieuKho, store: Store): void {
  const nhap = p.loai === 'Nhập';
  const tieuDe = nhap ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO';
  const hdm = nhap && p.hdId ? store.hdmById(p.hdId) : undefined;
  const hdb = !nhap && p.hdId ? store.hdbById(p.hdId) : undefined;
  const soHd = hdm?.soHD ?? hdb?.soHD ?? '';
  const doiTac = nhap ? (p.ncc ? store.nccById(p.ncc)?.ten : undefined) ?? hdm?.tenNCC ?? '' : hdb?.tenKH ?? '';
  const tenKho = store.khoTen(p.kho);

  let thongTin: string;
  if (nhap) {
    let canCu = soHd ? `Hợp đồng mua số ${soHd}` : '';
    if (p.soHoaDon) canCu += `${canCu ? '; ' : ''}Hoá đơn số ${p.soHoaDon}`;
    if (!canCu) canCu = p.nguonGoc;
    thongTin =
      dong('Họ và tên người giao', '') +
      dong('Căn cứ', canCu + (doiTac ? ` (${doiTac})` : '')) +
      dong('Nhập tại kho', tenKho) +
      dong('Địa điểm giao hàng', '');
  } else {
    const lyDo = p.lyDo || (soHd ? `Xuất giao hàng theo hợp đồng số ${soHd}` : p.nguonGoc);
    thongTin =
      dong('Họ và tên người nhận hàng', doiTac) +
      dong('Địa chỉ (bộ phận)', hdb?.diaChi ?? '') +
      dong('Lý do xuất kho', lyDo) +
      dong('Xuất tại kho (ngăn lô)', tenKho);
  }

  const gia = (d: PhieuKho['dong'][number]) => (nhap ? d.donGia : d.donGiaGoc) ?? 0;
  const tong = sum(p.dong, (d) => Math.round(gia(d) * d.soLuong));
  const rows = p.dong
    .map((d, i) => {
      const lh = store.loaiHangById(d.loaiHang);
      const lo = nhap ? maLo(p, i) : d.lo ?? '';
      const ten =
        (!nhap && d.tenTrenHD ? d.tenTrenHD : lh?.ten ?? d.loaiHang) + (d.thuocTinh ? `, ${d.thuocTinh}` : '') + (lo ? ` (Lô ${lo})` : '');
      return `<tr><td class="c">${i + 1}</td><td>${esc(ten)}</td><td class="c">${esc(d.loaiHang)}</td><td class="c">${esc(lh?.dvt ?? '')}</td><td class="r">${money(d.soLuong)}</td><td class="r">${money(gia(d))}</td><td class="r">${money(gia(d) * d.soLuong)}</td></tr>`;
    })
    .join('');
  const trong = Array.from({ length: Math.max(0, SO_DONG_TOI_THIEU - p.dong.length) }, () => `<tr>${'<td>&nbsp;</td>'.repeat(7)}</tr>`).join('');

  const d = p.ngay.split('-');
  const ten = store.userName(p.nguoiThucHien);
  const ky = ['Người lập phiếu', 'Người giao', 'Thủ kho', 'Kế toán', 'Giám đốc'];
  const kyHtml = `<table class="ky"><tr>${ky
    .map(
      (c, i) =>
        `<td><b>${c}</b><br><i>${i === 4 ? '(Ký, họ tên, đóng dấu)' : '(Ký, họ tên)'}</i>${
          i === 0 && ten ? `<div style="margin-top:48px"><b>${esc(ten)}</b></div>` : ''
        }</td>`,
    )
    .join('')}</tr></table>`;

  const body = `
    <style>${CSS_MAU_TT}${CSS_KHO}</style>
    <div class="mau-head">
      <div><b>${esc(CONG_TY.ten)}</b><br><i style="font-size:10.5pt">Địa chỉ: ${esc(CONG_TY.diaChi)}</i></div>
      <div class="tr"><b>Mẫu số ${nhap ? '01' : '02'} - VT</b><i>(Ban hành theo Thông tư 133/2016/TT-BTC ngày 26/08/2016 của Bộ Tài chính)</i></div>
    </div>
    <div class="mau-tt">
      <h1>${tieuDe}</h1>
      <div><i>Ngày ${d[2]} tháng ${d[1]} năm ${d[0]}</i></div>
      <div><i>Số: ${esc(p.soPhieu) || '....................'}</i></div>
    </div>
    ${p.trangThai === TT.DA_HUY ? '<div class="huy">(PHIẾU ĐÃ HUỶ)</div>' : ''}
    ${thongTin}
    <table class="kho">
      <thead><tr><th style="width:6%">STT</th><th>Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ, sản phẩm, hàng hóa</th><th style="width:13%">Mã số</th><th style="width:8%">ĐVT</th><th style="width:10%">Số lượng</th><th style="width:12%">Đơn giá</th><th style="width:15%">Thành tiền</th></tr></thead>
      <tbody>${rows}${trong}</tbody>
      <tfoot><tr><td colspan="6"><b>Cộng:</b></td><td class="r"><b>${money(tong)}</b></td></tr></tfoot>
    </table>
    <div class="mau-dong">- Tổng số tiền (viết bằng chữ): <b>${esc(moneyInWords(tong))}</b></div>
    <div class="mau-dong">- Số chứng từ gốc kèm theo: ${p.soHoaDon ? esc(p.soHoaDon) : '.'.repeat(60)}</div>
    <div style="text-align:right;margin-top:8px"><i>Ngày ${d[2]} tháng ${d[1]} năm ${d[0]}</i></div>
    ${kyHtml}
  `;
  if (!inGiay(`${tieuDe} ${p.soPhieu}`, body, 'A4')) store.say('Trình duyệt chặn cửa sổ in — hãy cho phép cửa sổ bật lên');
}
