import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ttNhan } from '../core/trang-thai';
import { money, num, viDate } from '../core/util';
import { xuatExcel } from '../shared/export';
import { Pager, paginate } from '../shared/pager';
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
interface NccRow {
  id: string;
  soHD: string;
  ngayKy: string;
  maNCC: string;
  tenNCC: string;
  mst: string;
  hangHoa: string;
  tong: number;
  daTra: number;
  conPhaiTra: number;
  pctTra: number;
  trangThai: string;
  hanGanNhat: string | null;
  quaHanNgay: number;
  thieuHoSo: string[];
  hdb: Ref[];
}
interface DongHang {
  ma: string;
  ten: string;
  sl: number;
  dvt: string;
  giaMua: number;
  giaBan: number | null;
  khachHang: string;
  hdbId: string | null;
}
interface NccDto {
  kpi: { soHd: number; soNcc: number; tong: number; daTra: number; conPhaiTra: number; pctTra: number; soQuaHan: number; chiPhiVanHanh: number };
  rows: NccRow[];
  dongHang: DongHang[];
  nams: string[];
  ncc: Opt[];
  trangThais: string[];
}

/** Tab 2 · Giao dịch NCC: HĐ mua có tích "Thuộc Phú Tài" — số liệu do backend tính (GET /phu-tai/ncc). */
@Component({
  selector: 'app-pt-gd-ncc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Pager],
  template: `
    <div class="banner"><span class="tg">PT</span><span>HĐ mua đầu vào của Phú Tài — theo dõi như HĐ mua của OXY, liên kết với HĐ khách hàng mà nó phục vụ.</span></div>

    @if (loi()) { <div class="note bad" role="alert">{{ loi() }} <button type="button" class="linkish" (click)="tai()">Thử lại</button></div> }
    @if (d(); as x) {
      <div class="kpis">
        <div class="k hero"><span class="l">Tổng giá trị mua (sau VAT)</span><b class="v">{{ money(x.kpi.tong) }}</b><span class="s">{{ x.kpi.soHd }} HĐ mua · {{ x.kpi.soNcc }} NCC</span></div>
        <div class="k"><span class="l">Phú Tài đã trả NCC</span><b class="v">{{ money(x.kpi.daTra) }}</b><span class="s">{{ pct(x.kpi.pctTra) }}% · phiếu chi PT</span></div>
        <div class="k"><span class="l">Còn phải trả NCC</span><b class="v">{{ money(x.kpi.conPhaiTra) }}</b><span class="s">{{ x.kpi.soQuaHan }} HĐ quá hạn</span></div>
        <div class="k"><span class="l">Chi phí vận hành</span><b class="v">{{ money(x.kpi.chiPhiVanHanh) }}</b><span class="s">vận chuyển, kiểm định · quỹ PT</span></div>
      </div>

      <section class="card-b">
        <div class="loc">
          <input class="q" type="search" placeholder="Tìm số HĐ mua, NCC, MST…" aria-label="Tìm kiếm" [value]="q()" (input)="q.set($any($event.target).value)" />
          <select aria-label="Năm" (change)="nam.set($any($event.target).value)">
            <option value="" [selected]="!nam()">Năm</option>
            @for (y of x.nams; track y) { <option [value]="y" [selected]="nam() === y">{{ y }}</option> }
          </select>
          <select aria-label="NCC" (change)="ncc.set($any($event.target).value)">
            <option value="" [selected]="!ncc()">NCC</option>
            @for (n of x.ncc; track n.v) { <option [value]="n.v" [selected]="ncc() === n.v">{{ n.t }}</option> }
          </select>
          <select aria-label="Nhận hàng" (change)="nhan.set($any($event.target).value)">
            <option value="" [selected]="!nhan()">Nhận hàng</option>
            @for (t of x.trangThais; track t) { <option [value]="t" [selected]="nhan() === t">{{ ttNhan(t) }}</option> }
          </select>
          <select aria-label="Thanh toán" (change)="tra.set($any($event.target).value)">
            <option value="" [selected]="!tra()">Thanh toán</option>
            <option value="chua" [selected]="tra() === 'chua'">Chưa trả</option>
            <option value="mot-phan" [selected]="tra() === 'mot-phan'">Trả một phần</option>
            <option value="du" [selected]="tra() === 'du'">Đã trả đủ</option>
            <option value="qua-han" [selected]="tra() === 'qua-han'">Quá hạn</option>
          </select>
        </div>

        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr><th>Số HĐ mua · ngày</th><th>Nhà cung cấp</th><th>Hàng hoá</th><th class="num">Giá trị</th><th>Nhận hàng</th><th>Thanh toán NCC</th><th>Hồ sơ</th><th>Phục vụ HĐ KH</th></tr>
            </thead>
            <tbody>
              @for (r of pg.items(); track r.id) {
                <tr>
                  <td><a class="so" [routerLink]="['/hop-dong-mua', r.id]">{{ r.soHD || '(chưa có số)' }}</a><span class="sub">ký {{ viDate(r.ngayKy) }}</span></td>
                  <td class="kh"><b>{{ r.tenNCC }}</b><span class="sub">MST {{ r.mst }}</span></td>
                  <td class="kh">{{ r.hangHoa || '—' }}</td>
                  <td class="num"><b>{{ money(r.tong) }}</b></td>
                  <td><span class="chip" [class.ok]="r.trangThai === 'DA_NHAN_DU'" [class.warn]="r.trangThai !== 'DA_NHAN_DU'">{{ ttNhan(r.trangThai) }}</span></td>
                  <td>
                    <span class="chip" [class.ok]="r.pctTra >= 1" [class.warn]="r.pctTra > 0 && r.pctTra < 1">{{ pct(r.pctTra) }}%@if (r.hanGanNhat && r.pctTra < 1) { · hạn {{ hanNgan(r.hanGanNhat) }} }</span>
                    @if (r.quaHanNgay > 0) { <span class="chip bad">Quá hạn {{ r.quaHanNgay }} ngày</span> }
                    @else if (r.pctTra >= 1) { <span class="chip ok">Đã trả đủ</span> }
                  </td>
                  <td>
                    <span class="chip" [class.ok]="!r.thieuHoSo.length" [class.bad]="r.thieuHoSo.length">{{ 3 - r.thieuHoSo.length }}/3</span>
                    @if (r.thieuHoSo.length) { <span class="sub">thiếu {{ r.thieuHoSo.join(', ') }}</span> }
                  </td>
                  <td>
                    @for (h of r.hdb; track h.id) { <a class="chip info" [routerLink]="['/hop-dong-ban', h.id]">{{ h.soHD }} ›</a><span class="sub">{{ h.ten }}</span> }
                    @empty { <span class="sub">—</span> }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="empty">Chưa có HĐ mua nào được tích "Thuộc Phú Tài" khớp bộ lọc</td></tr>
              }
            </tbody>
            @if (x.rows.length) {
              <tfoot>
                <tr><th colspan="3">Tổng ({{ x.kpi.soHd }} HĐ)</th><td class="num">{{ money(x.kpi.tong) }}</td><td></td><td>{{ money(x.kpi.daTra) }}</td><td colspan="2"></td></tr>
              </tfoot>
            }
          </table>
        </div>
        <p class="note-s">Chỉnh ở module Hợp đồng mua (ô "Thuộc Phú Tài") — hiện ở cả hai nơi. Không vào công nợ phải trả OXY; Phú Tài trả NCC từ quỹ Phú Tài (tab 4). HĐ thuộc Phú Tài không nhập kho OXY.</p>
        <app-pager [pager]="pg" />
      </section>

      <section class="card-b">
        <h3>Hàng hoá đi qua Phú Tài <span class="u">trước VAT</span></h3>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>Mã hàng</th><th>Tên hàng</th><th class="num">SL</th><th class="num">Đơn giá mua</th><th class="num">Đơn giá bán</th><th>Khách hàng</th></tr></thead>
            <tbody>
              @for (r of x.dongHang; track $index) {
                <tr>
                  <td><b class="ma">{{ r.ma }}</b></td>
                  <td>{{ r.ten }}</td>
                  <td class="num">{{ num(r.sl) }} {{ r.dvt }}</td>
                  <td class="num">{{ money(r.giaMua) }}</td>
                  <td class="num">{{ r.giaBan === null ? '—' : money(r.giaBan) }}</td>
                  <td>{{ r.khachHang || '—' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty">Chưa có hàng hoá</td></tr>
              }
            </tbody>
          </table>
        </div>
        <p class="note-s">Dùng chung danh mục mã hàng của OXY để OXY biết hàng gì, bao nhiêu, đi đâu — kể cả khi không nhập kho.</p>
      </section>
    } @else if (!loi()) {
      <p class="sub">Đang tải…</p>
    }
  `,
  styles: [PT_STYLES, `.ma { color: var(--brand); }`],
})
export class PtGdNcc {
  protected readonly money = money;
  protected readonly num = num;
  protected readonly viDate = viDate;
  protected readonly ttNhan = ttNhan;
  protected pct(v: number): number {
    return Math.round(v * 100);
  }
  protected hanNgan(iso: string): string {
    return iso.split('-').reverse().slice(0, 2).join('/');
  }

  protected readonly q = signal('');
  protected readonly nam = signal('');
  protected readonly ncc = signal('');
  protected readonly nhan = signal('');
  protected readonly tra = signal('');

  private readonly src = ptTai<NccDto>(() => `/phu-tai/ncc${qs({ q: this.q().trim(), nam: this.nam(), maNCC: this.ncc(), trangThai: this.nhan(), thanhToan: this.tra() })}`);
  protected readonly d = this.src.d;
  protected readonly loi = this.src.loi;
  protected readonly tai = this.src.tai;
  protected readonly pg = paginate(computed(() => this.d()?.rows ?? []));

  /** Xuất Excel danh sách đang lọc (nút ở đầu trang). */
  xuat(): void {
    const head = ['Số HĐ mua', 'Ngày ký', 'NCC', 'MST', 'Hàng hoá', 'Giá trị', 'Đã trả', 'Còn phải trả', 'Nhận hàng', 'Hồ sơ', 'Phục vụ HĐ KH'];
    const dong = (this.d()?.rows ?? []).map((r) => [
      r.soHD, viDate(r.ngayKy), r.tenNCC, r.mst, r.hangHoa, r.tong, r.daTra, r.conPhaiTra, ttNhan(r.trangThai),
      `${3 - r.thieuHoSo.length}/3`, r.hdb.map((h) => h.soHD).join(', '),
    ]);
    void xuatExcel('Phu-Tai-Giao-dich-NCC', [head, ...dong]);
  }
}
