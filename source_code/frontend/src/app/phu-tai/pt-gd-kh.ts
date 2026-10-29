import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ttNhan } from '../core/trang-thai';
import { money, viDate } from '../core/util';
import { xuatExcel } from '../shared/export';
import { chuVietTat, mauAvatar } from '../shared/avatar';
import { Pager, paginate } from '../shared/pager';
import { Store } from '../core/store';
import { inject } from '@angular/core';
import { ptTai, qs } from './pt-api';
import { PT_STYLES } from './pt-ui';

interface Ref {
  id: string;
  soHD: string;
  ten: string;
}
interface Opt {
  v: string;
  t: string;
}
interface KhRow {
  id: string;
  soHD: string;
  ngayKy: string;
  maKH: string;
  tenKH: string;
  mst: string;
  sauVAT: number;
  truocVAT: number;
  daNghiemThu: boolean;
  giao: string;
  daThu: number;
  conPhaiThu: number;
  pctThu: number;
  quaHan: number;
  thieuHoSo: string[];
  hdm: Ref[];
  chiPhi: number;
  sale: string;
  trangThai: string;
}
interface KhDto {
  kpi: { soHd: number; sauVAT: number; truocVAT: number; daThu: number; conPhaiThu: number; pctThu: number; soQuaHan: number; soThieuHoSo: number };
  rows: KhRow[];
  nams: string[];
  khachHang: Opt[];
  sales: Opt[];
  trangThais: Opt[];
}

/** Tab 1 · Giao dịch khách hàng: HĐ bán có tích "Thuộc Phú Tài" — số liệu do backend tính (GET /phu-tai/khach-hang). */
@Component({
  selector: 'app-pt-gd-kh',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Pager],
  template: `
    <div class="banner"><span class="tg">PT</span><span>HĐ Phú Tài ký và xuất hoá đơn cho khách hàng — theo dõi như HĐ bán của OXY, không cộng vào doanh thu và công nợ OXY.</span></div>

    @if (loi()) { <div class="note bad" role="alert">{{ loi() }} <button type="button" class="linkish" (click)="tai()">Thử lại</button></div> }
    @if (d(); as x) {
      <div class="kpis">
        <div class="k hero"><span class="l">Tổng giá trị (sau VAT)</span><b class="v">{{ money(x.kpi.sauVAT) }}</b><span class="s">{{ x.kpi.soHd }} HĐ · trước VAT {{ money(x.kpi.truocVAT) }}</span></div>
        <div class="k"><span class="l">Đã thu khách</span><b class="v">{{ money(x.kpi.daThu) }}</b><span class="s">{{ pct(x.kpi.pctThu) }}% · phiếu thu PT đã duyệt</span></div>
        <div class="k"><span class="l">Còn phải thu</span><b class="v">{{ money(x.kpi.conPhaiThu) }}</b><span class="s">{{ x.kpi.soQuaHan }} HĐ quá hạn · xem Báo cáo</span></div>
        <div class="k"><span class="l">Thiếu hồ sơ</span><b class="v">{{ x.kpi.soThieuHoSo }} HĐ</b><span class="s">chưa đủ điều kiện tất toán</span></div>
      </div>

      <section class="card-b">
        <div class="loc">
          <input class="q" type="search" placeholder="Tìm số HĐ, khách hàng, MST…" aria-label="Tìm kiếm" [value]="q()" (input)="q.set($any($event.target).value)" />
          <select aria-label="Năm" (change)="nam.set($any($event.target).value)">
            <option value="" [selected]="!nam()">Năm</option>
            @for (y of x.nams; track y) { <option [value]="y" [selected]="nam() === y">{{ y }}</option> }
          </select>
          <select aria-label="Khách hàng" (change)="kh.set($any($event.target).value)">
            <option value="" [selected]="!kh()">Khách hàng</option>
            @for (k of x.khachHang; track k.v) { <option [value]="k.v" [selected]="kh() === k.v">{{ k.t }}</option> }
          </select>
          <select aria-label="Phụ trách" (change)="sale.set($any($event.target).value)">
            <option value="" [selected]="!sale()">Phụ trách</option>
            @for (s of x.sales; track s.v) { <option [value]="s.v" [selected]="sale() === s.v">{{ ten(s.v) }}</option> }
          </select>
          <select aria-label="Tình trạng" (change)="tt.set($any($event.target).value)">
            <option value="" [selected]="!tt()">Tình trạng</option>
            @for (t of x.trangThais; track t.v) { <option [value]="t.v" [selected]="tt() === t.v">{{ ttNhan(t.v) }}</option> }
          </select>
        </div>

        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr><th>Số HĐ · ngày</th><th>Khách hàng</th><th class="num">Giá trị</th><th>Giao · nghiệm thu</th><th>Thanh toán</th><th>Hồ sơ</th><th>HĐ mua đầu vào · chi phí</th><th>Phụ trách</th></tr>
            </thead>
            <tbody>
              @for (r of pg.items(); track r.id) {
                <tr>
                  <td><a class="so" [routerLink]="['/hop-dong-ban', r.id]">{{ r.soHD || '(chưa có số)' }}</a><span class="sub">ký {{ viDate(r.ngayKy) }}</span></td>
                  <td class="kh"><b>{{ r.tenKH }}</b><span class="sub">MST {{ r.mst }}</span></td>
                  <td class="num"><b>{{ money(r.sauVAT) }}</b><span class="sub">trước VAT {{ money(r.truocVAT) }}</span></td>
                  <td><span class="chip" [class.ok]="r.daNghiemThu" [class.warn]="!r.daNghiemThu">{{ r.daNghiemThu ? 'Đã nghiệm thu' : 'Chờ BBNT' }}</span><span class="sub">{{ r.giao }}</span></td>
                  <td><span class="chip" [class.ok]="r.pctThu >= 1" [class.warn]="r.pctThu > 0 && r.pctThu < 1">{{ pct(r.pctThu) }}%</span><span class="sub">còn {{ money(r.conPhaiThu) }}</span></td>
                  <td>
                    <span class="chip" [class.ok]="!r.thieuHoSo.length" [class.bad]="r.thieuHoSo.length">{{ 3 - r.thieuHoSo.length }}/3</span>
                    @if (r.thieuHoSo.length) { <span class="sub">thiếu {{ r.thieuHoSo.join(', ') }}</span> }
                  </td>
                  <td>
                    @for (m of r.hdm; track m.id) { <a class="chip info" [routerLink]="['/hop-dong-mua', m.id]">{{ m.soHD }} ›</a><br /> }
                    <span class="sub">Chi phí {{ money(r.chiPhi) }}</span>
                  </td>
                  <td><span class="pt"><span class="av" [style.background]="mau(r.sale)">{{ vt(ten(r.sale)) }}</span>{{ ten(r.sale) }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="empty">Chưa có HĐ bán nào được tích "Thuộc Phú Tài" khớp bộ lọc</td></tr>
              }
            </tbody>
            @if (x.rows.length) {
              <tfoot>
                <tr><th colspan="2">Tổng ({{ x.kpi.soHd }} HĐ)</th><td class="num">{{ money(x.kpi.sauVAT) }}</td><td></td><td class="num">{{ money(x.kpi.daThu) }}</td><td colspan="3"></td></tr>
              </tfoot>
            }
          </table>
        </div>
        <p class="note-s">Cùng khung với HĐ bán của OXY: giao hàng · nghiệm thu · thanh toán · hồ sơ (Hợp đồng, BBGH/BBNT, Hoá đơn). Cột HĐ mua đầu vào mở tab 2; chi phí = vận chuyển + kiểm định Phú Tài chi từ quỹ PT (tab 4). Bấm số HĐ để mở chi tiết — cùng mẫu trang chi tiết HĐ bán.</p>
        <app-pager [pager]="pg" />
      </section>
    } @else if (!loi()) {
      <p class="sub">Đang tải…</p>
    }
  `,
  styles: PT_STYLES,
})
export class PtGdKh {
  private readonly store = inject(Store);
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly ttNhan = ttNhan;
  protected readonly vt = chuVietTat;
  protected readonly mau = mauAvatar;
  protected readonly ten = (id: string) => this.store.userName(id);
  protected pct(v: number): number {
    return Math.round(v * 100);
  }

  protected readonly q = signal('');
  protected readonly nam = signal('');
  protected readonly kh = signal('');
  protected readonly sale = signal('');
  protected readonly tt = signal('');

  private readonly src = ptTai<KhDto>(() => `/phu-tai/khach-hang${qs({ q: this.q().trim(), nam: this.nam(), maKH: this.kh(), sale: this.sale(), trangThai: this.tt() })}`);
  protected readonly d = this.src.d;
  protected readonly loi = this.src.loi;
  protected readonly tai = this.src.tai;
  protected readonly pg = paginate(computed(() => this.d()?.rows ?? []));

  /** Xuất Excel danh sách đang lọc (nút ở đầu trang). */
  xuat(): void {
    const head = ['Số HĐ', 'Ngày ký', 'Khách hàng', 'MST', 'Giá trị trước VAT', 'Giá trị sau VAT', 'Đã thu', 'Còn phải thu', 'Hồ sơ', 'HĐ mua đầu vào', 'Chi phí', 'Phụ trách'];
    const dong = (this.d()?.rows ?? []).map((r) => [
      r.soHD, viDate(r.ngayKy), r.tenKH, r.mst, r.truocVAT, r.sauVAT, r.daThu, r.conPhaiThu,
      `${3 - r.thieuHoSo.length}/3`, r.hdm.map((m) => m.soHD).join(', '), r.chiPhi, this.ten(r.sale),
    ]);
    void xuatExcel('Phu-Tai-Giao-dich-khach-hang', [head, ...dong]);
  }
}
