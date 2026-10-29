import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { money, vndShort } from '../core/util';
import { donVi, esc, inGiay, kyTen } from '../ke-toan/kt-print';
import { ptTai } from './pt-api';
import { PT_STYLES } from './pt-ui';

interface DsRow {
  id: string;
  soHD: string;
  tenKH: string;
  giaBan: number;
  lnTruoc: number;
  tyLe: number;
  oxyGop: number;
  pctKH: number;
  duDK: number;
  daNhan: number;
  conNhan: number;
  trangThai: 'DA_KHOP' | 'CHO_KH' | 'CHO_PT_CHUYEN' | 'KHONG_CO' | '';
}
interface DsDto {
  kpi: { oxyGop: number; duDK: number; daNhan: number; conNhan: number; pctDaNhanTrenDuDK: number };
  rows: DsRow[];
  tong: DsRow;
  choKH: number;
  bienBan: { so: string; phamVi: string; soDeNghi: number; trangThai: string; denNgay: string; ky: string };
}

const TT: Record<string, { t: string; c: string }> = {
  DA_KHOP: { t: 'Đã khớp', c: 'ok' },
  CHO_KH: { t: 'Chờ KH trả', c: '' },
  CHO_PT_CHUYEN: { t: 'Chờ PT chuyển', c: 'warn' },
  KHONG_CO: { t: 'Không có quyền lợi', c: '' },
};

/** Tab 3 · Đối soát quyền lợi OXY — số liệu do backend tính (GET /phu-tai/doi-soat). */
@Component({
  selector: 'app-pt-doi-soat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="banner"><span class="tg">PT</span><span>Phần OXY được hưởng trên từng giao dịch — đã đủ điều kiện nhận chưa, Phú Tài đã chuyển chưa.</span></div>

    @if (loi()) { <div class="note bad" role="alert">{{ loi() }} <button type="button" class="linkish" (click)="tai()">Thử lại</button></div> }
    @if (d(); as x) {
      <div class="kpis">
        <div class="k hero"><span class="l">OXY được hưởng (gộp)</span><b class="v">{{ money(x.kpi.oxyGop) }}</b><span class="s">theo thoả thuận từng HĐ</span></div>
        <div class="k"><span class="l">Đủ điều kiện nhận</span><b class="v">{{ money(x.kpi.duDK) }}</b><span class="s">tương ứng tiền KH đã trả</span></div>
        <div class="k"><span class="l">Đã nhận</span><b class="v">{{ money(x.kpi.daNhan) }}</b><span class="s">{{ pct(x.kpi.pctDaNhanTrenDuDK) }}% phần đủ điều kiện</span></div>
        <div class="k"><span class="l">Còn phải nhận</span><b class="v">{{ money(x.kpi.conNhan) }}</b><span class="s">Phú Tài chưa chuyển</span></div>
      </div>

      <section class="card-b">
        <h3>Đối soát theo hợp đồng <span class="u">kỳ đến {{ ngayVi(x.bienBan.denNgay) }}</span></h3>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr><th>Số HĐ · khách</th><th class="num">Giá bán</th><th class="num">LN trước thuế</th><th class="num">Tỷ lệ OXY</th><th class="num">OXY được hưởng</th><th class="num">KH đã trả</th><th class="num">Đủ ĐK nhận</th><th class="num">Đã nhận</th><th class="num">Còn phải nhận</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>
              @for (r of x.rows; track r.id) {
                <tr>
                  <td><a class="so" [routerLink]="['/hop-dong-ban', r.id]">{{ r.soHD || '(chưa có số)' }}</a><span class="sub">{{ r.tenKH }}</span></td>
                  <td class="num">{{ money(r.giaBan) }}</td>
                  <td class="num">{{ money(r.lnTruoc) }}</td>
                  <td class="num">{{ r.tyLe }}%</td>
                  <td class="num"><b>{{ money(r.oxyGop) }}</b></td>
                  <td class="num">{{ pct(r.pctKH) }}%</td>
                  <td class="num">{{ money(r.duDK) }}</td>
                  <td class="num">{{ money(r.daNhan) }}</td>
                  <td class="num" [class.bad-t]="r.conNhan > 0"><b>{{ money(r.conNhan) }}</b></td>
                  <td><span class="chip" [class]="'chip ' + tt(r).c">{{ tt(r).t }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="10" class="empty">Chưa có HĐ bán nào được tích "Thuộc Phú Tài"</td></tr>
              }
            </tbody>
            @if (x.rows.length) {
              <tfoot>
                <tr><th>Tổng</th><td class="num">{{ money(x.tong.giaBan) }}</td><td class="num">{{ money(x.tong.lnTruoc) }}</td><td class="num">{{ tyLeTb() }}%</td><td class="num">{{ money(x.tong.oxyGop) }}</td><td class="num">{{ pct(pctKhTb()) }}%</td><td class="num">{{ money(x.tong.duDK) }}</td><td class="num">{{ money(x.tong.daNhan) }}</td><td class="num">{{ money(x.tong.conNhan) }}</td><td></td></tr>
              </tfoot>
            }
          </table>
        </div>
        <p class="note-s">LN trước thuế = giá bán − giá đầu vào · Đủ ĐK nhận = OXY được hưởng × (KH đã trả / giá trị sau VAT) · Còn phải nhận = Đủ ĐK nhận − Đã nhận (lấy từ dòng "Chuyển OXY" ở tab 4). Tỷ lệ OXY sửa trên HĐ bán (mặc định 70%).</p>
      </section>

      <div class="row-2">
        <section class="card-b">
          <h3>Phân bổ phần OXY được hưởng <span class="u">triệu đ</span></h3>
          @for (b of bars(); track b.nhan) {
            <div class="hb"><span class="hl">{{ b.nhan }}</span><span class="hbar"><i [style.width.%]="b.pct" [style.background]="b.mau"></i></span><b class="num">{{ tr(b.v) }} tr</b></div>
          }
          <div class="db"><span><b>Tổng OXY được hưởng</b></span><b>{{ money(x.kpi.oxyGop) }}</b></div>
        </section>
        <section class="card-b">
          <h3>Biên bản đối soát kỳ {{ x.bienBan.ky }}</h3>
          <div class="db"><span>Số biên bản</span><b>{{ x.bienBan.so }}</b></div>
          <div class="db"><span>Phạm vi</span><b>{{ x.bienBan.phamVi }}</b></div>
          <div class="db"><span>Số OXY đề nghị nhận</span><b>{{ money(x.bienBan.soDeNghi) }}</b></div>
          <div class="db"><span>Trạng thái</span><span class="chip" [class.ok]="x.bienBan.soDeNghi === 0" [class.warn]="x.bienBan.soDeNghi > 0">{{ x.bienBan.trangThai }}</span></div>
          <div class="btns">
            <button type="button" class="btn quiet pill" (click)="inBienBan()">Xuất PDF</button>
            <button type="button" class="btn pill hero" (click)="inBienBan()">Lập biên bản kỳ mới</button>
          </div>
        </section>
      </div>
    } @else if (!loi()) {
      <p class="sub">Đang tải…</p>
    }
  `,
  styles: [PT_STYLES, `
    .row-2 { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    @media (max-width: 1000px) { .row-2 { grid-template-columns: minmax(0, 1fr); } }
    .hb { display: grid; grid-template-columns: 130px 1fr 80px; align-items: center; gap: 10px; margin-bottom: 14px; font-size: 13px; }
    .hbar { height: 14px; border-radius: 7px; background: var(--surf-3); overflow: hidden; }
    .hbar i { display: block; height: 100%; border-radius: 7px; }
    .hb .num { text-align: right; font-weight: 700; }
    .db { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 0; font-size: 13px; border-bottom: 1px solid var(--line); }
    .btns { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }
    .bad-t { color: #a3261d; }
  `],
})
export class PtDoiSoat {
  private readonly store = inject(Store);
  protected readonly money = money;
  private readonly src = ptTai<DsDto>(() => '/phu-tai/doi-soat');
  protected readonly d = this.src.d;
  protected readonly loi = this.src.loi;
  protected readonly tai = this.src.tai;

  protected pct(v: number): number {
    return Math.round(v * 100);
  }
  protected tr(v: number): string {
    return (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  }
  protected ngayVi(iso: string): string {
    return iso.split('-').reverse().join('/');
  }
  protected tt(r: DsRow): { t: string; c: string } {
    return TT[r.trangThai] ?? { t: '', c: '' };
  }
  /** Tỷ lệ OXY bình quân gia quyền theo LN trước thuế. */
  protected tyLeTb(): number {
    const rs = (this.d()?.rows ?? []).filter((r) => r.lnTruoc > 0);
    const tong = rs.reduce((s, r) => s + r.lnTruoc, 0);
    return tong > 0 ? Math.round(rs.reduce((s, r) => s + r.tyLe * r.lnTruoc, 0) / tong) : 0;
  }
  protected pctKhTb(): number {
    const rs = this.d()?.rows ?? [];
    const tong = rs.reduce((s, r) => s + r.giaBan, 0);
    return tong > 0 ? rs.reduce((s, r) => s + r.pctKH * r.giaBan, 0) / tong : 0;
  }
  protected readonly bars = computed(() => {
    const x = this.d();
    if (!x) return [];
    const ds = [
      { nhan: 'Đã nhận', v: x.kpi.daNhan, mau: '#1f9d55' },
      { nhan: 'Đủ ĐK, chưa nhận', v: x.kpi.conNhan, mau: '#e0a31c' },
      { nhan: 'Chờ KH thanh toán', v: x.choKH, mau: '#b8bfc2' },
    ];
    const max = Math.max(1, ...ds.map((b) => b.v));
    return ds.map((b) => ({ ...b, pct: (b.v / max) * 100 }));
  });

  /** In biên bản đối soát kỳ hiện tại (A4) — số liệu lấy từ backend. */
  protected inBienBan(): void {
    const x = this.d();
    if (!x) return;
    const rows = x.rows
      .map((r, i) => `<tr><td class="c">${i + 1}</td><td>${esc(r.soHD)}<br/>${esc(r.tenKH)}</td><td class="r">${money(r.giaBan)}</td><td class="r">${money(r.oxyGop)}</td><td class="r">${money(r.duDK)}</td><td class="r">${money(r.daNhan)}</td><td class="r">${money(r.conNhan)}</td></tr>`)
      .join('');
    const d = x.bienBan.denNgay.split('-');
    const body = `
      <div class="head">${donVi()}<div class="r">Ngày ${d[2]} tháng ${d[1]} năm ${d[0]}</div></div>
      <h1>BIÊN BẢN ĐỐI SOÁT QUYỀN LỢI OXY</h1>
      <p class="c">Số ${esc(x.bienBan.so)} · Kỳ ${esc(x.bienBan.ky)} · ${esc(x.bienBan.phamVi)}</p>
      <table class="l">
        <thead><tr><th>STT</th><th>Số HĐ · khách</th><th>Giá bán (đ)</th><th>OXY được hưởng (đ)</th><th>Đủ ĐK nhận (đ)</th><th>Đã nhận (đ)</th><th>Còn phải nhận (đ)</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><th colspan="3" class="r">Tổng</th><th class="r">${money(x.tong.oxyGop)}</th><th class="r">${money(x.tong.duDK)}</th><th class="r">${money(x.tong.daNhan)}</th><th class="r">${money(x.tong.conNhan)}</th></tr></tfoot>
      </table>
      <p>Số OXY đề nghị Phú Tài chuyển: <b>${vndShort(x.bienBan.soDeNghi)}</b> (${money(x.bienBan.soDeNghi)} đ).</p>
      ${kyTen(['Đại diện OXY', 'Đại diện Phú Tài'])}
    `;
    if (!inGiay(`Biên bản đối soát ${x.bienBan.so}`, body, 'A4')) this.store.say('Trình duyệt chặn cửa sổ in — hãy cho phép cửa sổ bật lên');
  }
}
