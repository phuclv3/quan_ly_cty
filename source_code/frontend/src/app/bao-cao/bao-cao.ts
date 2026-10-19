import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '../core/store';
import { HopDongBan } from '../core/models';
import { HdbCalc, dotQuaHan, hdbCalc } from '../core/calc';
import { matches, money, pct, sum, viDate, vndShort } from '../core/util';
import { Kpi, Multi, PickOption, TrangThai } from '../shared/ui-kit';
import { Icon } from '../shared/icon';
import { csv, downloadFile, fileName } from '../shared/export';

type Tab = 'doanh-thu' | 'loi-nhuan' | 'thanh-toan';
const TABS: { k: Tab; t: string }[] = [
  { k: 'doanh-thu', t: 'Doanh thu' },
  { k: 'loi-nhuan', t: 'Lợi nhuận HĐ' },
  { k: 'thanh-toan', t: 'Tiến độ thanh toán' },
];
const DANG_TH: HopDongBan['trangThai'][] = ['Hiệu lực', 'Đang giao hàng', 'Hoàn thành'];

interface Dong {
  h: HopDongBan;
  c: HdbCalc;
  /** Σ phần chưa thu của các đợt đã quá hạn. */
  tienQuaHan: number;
}

/** Báo cáo (nghiep_vu/06_BaoCao) — chỉ đọc: Doanh thu, Lợi nhuận HĐ, Tiến độ thanh toán. */
@Component({
  selector: 'app-bao-cao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, Kpi, Multi, TrangThai, Icon],
  template: `
    <div class="page-head">
      <div><div class="crumbs"><a routerLink="/">Trang chủ</a> › Báo cáo › {{ tabTen() }}</div><h1>Báo cáo</h1></div>
      <div class="actions"><button type="button" class="btn quiet" (click)="xuat()"><app-icon name="download" [size]="16" /> Xuất Excel</button></div>
    </div>
    <div class="tabs" role="tablist">
      @for (t of tabs; track t.k) {
        <button type="button" role="tab" [class.on]="tab() === t.k" [attr.aria-selected]="tab() === t.k" (click)="setTab(t.k)">{{ t.t }}</button>
      }
    </div>
    <div class="filters" role="search">
      <label class="search">
        <app-icon name="search" [size]="16" />
        <input type="search" placeholder="Tìm số HĐ, khách hàng, MST, sale…" [value]="q()" (input)="q.set($any($event.target).value)" aria-label="Tìm nhanh" />
      </label>
      @if (tab() !== 'thanh-toan') {
        <select aria-label="Năm ký" (change)="nam.set($any($event.target).value)">
          @for (y of namDs(); track y) { <option [value]="y" [selected]="y === nam()">Năm ký {{ y }}</option> }
        </select>
      } @else {
        <span class="chip">HĐ đang thực hiện (Hiệu lực / Đang giao hàng / Hoàn thành)</span>
      }
      @if (!rieng()) { <app-multi label="Sale" [options]="saleOpts()" [value]="sale()" (valueChange)="sale.set($event)" /> }
      @else { <span class="tag warn">Phạm vi: HĐ của mình</span> }
    </div>

    @switch (tab()) {
      @case ('doanh-thu') {
        <div class="kpis">
          <app-kpi [label]="'Doanh thu ký ' + nam() + ' (chưa VAT)'" [value]="money(dtKpi().truoc)" [sub]="namRows().length + ' HĐ (trừ Báo giá)'" />
          <app-kpi label="Sau VAT" [value]="money(dtKpi().sau)" />
          <app-kpi label="Khách đã thanh toán" [value]="money(dtKpi().thu)" [sub]="pct(dtKpi().sau ? dtKpi().thu / dtKpi().sau : 0) + ' giá trị sau VAT'" tone="ok" />
        </div>
        <div class="card" style="margin-bottom:14px">
          <h3>Doanh thu ký theo tháng {{ nam() }} (chưa VAT)</h3>
          <div class="bars">
            @for (m of thang(); track m.t) {
              <div class="col" [title]="'T' + m.t + ': ' + money(m.v) + ' đ'">
                <b>{{ m.v ? short(m.v) : '' }}</b>
                <i [style.height.px]="m.h"></i>
                <small>T{{ m.t }}</small>
              </div>
            }
          </div>
        </div>
        <div class="tbl-wrap">
          <table class="tbl freeze">
            <thead><tr><th>Số HĐ · Khách hàng</th><th>Sale</th><th>Ngày ký</th><th>Trạng thái</th><th class="num">Giá trị (chưa VAT)</th><th class="num">Sau VAT</th><th class="num">Đã thu</th></tr></thead>
            <tbody>
              @for (r of namRows(); track r.h.id) {
                <tr class="click" (click)="moHD(r.h.id)">
                  <td><a [routerLink]="['/hop-dong-ban', r.h.id]" (click)="$event.stopPropagation()"><b>{{ r.h.soHD }}</b></a><span class="sub">{{ r.h.tenKH }}</span></td>
                  <td>{{ store.userName(r.h.sale) }}</td>
                  <td>{{ viDate(r.h.ngayKy) }}</td>
                  <td><app-tt [v]="r.h.trangThai" /></td>
                  <td class="num">{{ money(r.h.truocVAT) }}</td>
                  <td class="num">{{ money(r.c.sauVAT) }}</td>
                  <td class="num">{{ money(r.c.daThu) }}</td>
                </tr>
              } @empty { <tr><td colspan="7" class="empty">Không có HĐ ký trong năm {{ nam() }}.</td></tr> }
            </tbody>
            @if (namRows().length) {
              <tfoot><tr><td>{{ namRows().length }} HĐ</td><td colspan="3"></td><td class="num">{{ money(dtKpi().truoc) }}</td><td class="num">{{ money(dtKpi().sau) }}</td><td class="num">{{ money(dtKpi().thu) }}</td></tr></tfoot>
            }
          </table>
        </div>
      }
      @case ('loi-nhuan') {
        <div class="kpis">
          <app-kpi label="Giá bán (HĐ đã xác định giá vốn)" [value]="money(lnKpi().giaBan)" [sub]="lnKpi().xd + ' / ' + namRows().length + ' HĐ ký năm ' + nam()" />
          <app-kpi label="Lợi nhuận gộp" [value]="money(lnKpi().lnGop)" [sub]="'Biên ' + pct(lnKpi().giaBan ? lnKpi().lnGop / lnKpi().giaBan : 0)" [tone]="lnKpi().lnGop < 0 ? 'bad' : 'ok'" />
          <app-kpi label="Lợi nhuận sau thuế" [value]="money(lnKpi().lnSau)" [sub]="'Biên ' + pct(lnKpi().giaBan ? lnKpi().lnSau / lnKpi().giaBan : 0)" [tone]="lnKpi().lnSau < 0 ? 'bad' : 'ok'" />
          <app-kpi label="Chưa xác định giá vốn" [value]="'' + (namRows().length - lnKpi().xd)" sub="Chưa xuất kho và chưa có HĐ mua liên quan" [tone]="namRows().length - lnKpi().xd > 0 ? 'warn' : ''" />
        </div>
        <div class="tbl-wrap">
          <table class="tbl freeze">
            <thead><tr><th>Số HĐ · Khách hàng</th><th>Ngày ký</th><th class="num">Giá bán</th><th class="num">Giá vốn</th><th class="num">Chi phí thực hiện</th><th class="num">Thuế TNDN</th><th class="num">LN gộp</th><th class="num">LN sau thuế</th><th class="num">Biên</th></tr></thead>
            <tbody>
              @for (r of namRows(); track r.h.id) {
                <tr class="click" (click)="moHD(r.h.id)">
                  <td><a [routerLink]="['/hop-dong-ban', r.h.id]" (click)="$event.stopPropagation()"><b>{{ r.h.soHD }}</b></a><span class="sub">{{ r.h.tenKH }}</span></td>
                  <td>{{ viDate(r.h.ngayKy) }}</td>
                  <td class="num">{{ money(r.h.truocVAT) }}</td>
                  <td class="num">
                    @if (r.c.giaVonNguon === 'Chưa có') { <span class="tag warn">Chưa xác định</span> }
                    @else { {{ money(r.c.giaVon) }}<span class="sub">{{ r.c.giaVonNguon }}</span> }
                  </td>
                  <td class="num">{{ money(r.c.cpDuyet) }}</td>
                  <td class="num">{{ money(r.c.thue.thue) }}</td>
                  <td class="num" [class.neg]="r.c.lnGop < 0">{{ r.c.giaVonNguon === 'Chưa có' ? '—' : money(r.c.lnGop) }}</td>
                  <td class="num" [class.neg]="r.c.lnSauThue < 0">{{ r.c.giaVonNguon === 'Chưa có' ? '—' : money(r.c.lnSauThue) }}</td>
                  <td class="num" [class.neg]="r.c.lnSauThue < 0">{{ r.c.giaVonNguon === 'Chưa có' || !r.h.truocVAT ? '—' : pct(r.c.lnSauThue / r.h.truocVAT) }}</td>
                </tr>
              } @empty { <tr><td colspan="9" class="empty">Không có HĐ ký trong năm {{ nam() }}.</td></tr> }
            </tbody>
          </table>
        </div>
        <p class="sub" style="margin-top:8px">
          LN gộp = Giá bán (trước VAT) − Giá vốn − Chi phí thực hiện HĐ đã duyệt. Giá vốn = Σ giá gốc phiếu xuất kho; chưa xuất thì Σ HĐ mua liên quan.
          LN sau thuế = LN gộp − Thuế TNDN trên chênh lệch (HDB-08). Biên = LN sau thuế / Giá bán. KPI chỉ cộng HĐ đã xác định giá vốn.
        </p>
      }
      @case ('thanh-toan') {
        <div class="kpis">
          <app-kpi label="Giá trị HĐ đang thực hiện (sau VAT)" [value]="money(ttKpi().sau)" [sub]="ttRows().length + ' HĐ'" />
          <app-kpi label="Đã thu" [value]="money(ttKpi().thu)" tone="ok" />
          <app-kpi label="Còn phải thu" [value]="money(ttKpi().con)" />
          <app-kpi label="Số đợt quá hạn" [value]="'' + ttKpi().dot" [sub]="money(ttKpi().tienQH) + ' đ quá hạn'" [tone]="ttKpi().dot ? 'bad' : ''" />
        </div>
        <div class="tbl-wrap">
          <table class="tbl freeze">
            <thead><tr><th>Số HĐ · Khách hàng</th><th>Sale</th><th class="num">Sau VAT</th><th>Thanh toán</th><th>Hoá đơn</th><th class="num">Còn phải thu</th><th>Hạn</th></tr></thead>
            <tbody>
              @for (r of ttRows(); track r.h.id) {
                <tr class="click" [class.overdue]="r.tienQuaHan > 0" (click)="moHD(r.h.id)">
                  <td><a [routerLink]="['/hop-dong-ban', r.h.id]" (click)="$event.stopPropagation()"><b>{{ r.h.soHD }}</b></a><span class="sub">{{ r.h.tenKH }}</span></td>
                  <td>{{ store.userName(r.h.sale) }}</td>
                  <td class="num">{{ money(r.c.sauVAT) }}</td>
                  <td><div class="cell-bar"><div class="bar"><i [style.width.%]="w(r.c.pctThu)"></i></div><b class="sub">{{ pct(r.c.pctThu) }}</b></div></td>
                  <td><div class="cell-bar"><div class="bar warn"><i [style.width.%]="w(hdPct(r))"></i></div><b class="sub">{{ pct(hdPct(r)) }}</b></div></td>
                  <td class="num">{{ money(r.c.conPhaiThu) }}</td>
                  <td>
                    @if (r.tienQuaHan > 0) { <span class="tag bad">Quá hạn {{ money(r.tienQuaHan) }}</span> }
                    @else if (r.c.dotGanNhat?.han) { {{ viDate(r.c.dotGanNhat?.han) }} }
                    @else { — }
                  </td>
                </tr>
              } @empty { <tr><td colspan="7" class="empty">Không có HĐ đang thực hiện.</td></tr> }
            </tbody>
            @if (ttRows().length) {
              <tfoot><tr><td>{{ ttRows().length }} HĐ</td><td></td><td class="num">{{ money(ttKpi().sau) }}</td><td>{{ pct(ttKpi().sau ? ttKpi().thu / ttKpi().sau : 0) }}</td><td></td><td class="num">{{ money(ttKpi().con) }}</td><td></td></tr></tfoot>
            }
          </table>
        </div>
      }
    }
  `,
})
export class BaoCaoPage {
  protected readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly tabs = TABS;
  protected readonly money = money;
  protected readonly pct = pct;
  protected readonly short = vndShort;
  protected readonly viDate = viDate;

  private readonly qTab = toSignal(this.route.queryParamMap.pipe(map((m) => m.get('tab'))), { initialValue: null });
  protected readonly tab = computed<Tab>(() => {
    const t = this.qTab();
    return TABS.some((x) => x.k === t) ? (t as Tab) : 'doanh-thu';
  });
  protected readonly tabTen = computed(() => TABS.find((x) => x.k === this.tab())?.t ?? '');

  protected readonly nam = signal(String(new Date().getFullYear()));
  protected readonly q = signal('');
  protected readonly sale = signal<string[]>([]);
  protected readonly rieng = computed(() => this.store.ownOnly('baoCao'));

  /** HĐ trong phạm vi xem, đã áp tìm kiếm + Sale, kèm số tự tính. */
  private readonly rows = computed<Dong[]>(() => {
    const db = this.store.db();
    const me = this.store.meId();
    const q = this.q();
    const sale = this.rieng() ? [] : this.sale();
    return this.store
      .hdbVisible()
      .filter((h) => h.trangThai !== 'Báo giá')
      .filter((h) => !this.rieng() || h.sale === me)
      .filter((h) => !sale.length || sale.includes(h.sale))
      .filter((h) => matches(q, h.soHD, h.tenKH, h.mst, this.store.userName(h.sale)))
      .map((h) => ({
        h,
        c: hdbCalc(h, db),
        tienQuaHan: sum(
          h.dotTT.filter((d) => dotQuaHan(d, d.soTienThu ?? 0)),
          (d) => d.soTien - (d.soTienThu ?? 0),
        ),
      }));
  });

  protected readonly namDs = computed(() => {
    const s = new Set<string>([String(new Date().getFullYear())]);
    for (const h of this.store.hdbVisible()) if (h.ngayKy) s.add(h.ngayKy.slice(0, 4));
    return [...s].sort().reverse();
  });
  protected readonly saleOpts = computed<PickOption[]>(() => {
    const ids = new Set(this.store.hdbVisible().map((h) => h.sale).filter(Boolean));
    return [...ids].map((id) => ({ value: id, label: this.store.userName(id) })).sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  });

  /** HĐ ký trong năm đã chọn, ngày ký giảm dần. */
  protected readonly namRows = computed(() =>
    this.rows()
      .filter((r) => r.h.ngayKy?.startsWith(this.nam()))
      .sort((a, b) => (b.h.ngayKy ?? '').localeCompare(a.h.ngayKy ?? '')),
  );
  protected readonly dtKpi = computed(() => ({
    truoc: sum(this.namRows(), (r) => r.h.truocVAT),
    sau: sum(this.namRows(), (r) => r.c.sauVAT),
    thu: sum(this.namRows(), (r) => r.c.daThu),
  }));
  protected readonly thang = computed(() => {
    const v = Array.from({ length: 12 }, () => 0);
    for (const r of this.namRows()) v[Number(r.h.ngayKy!.slice(5, 7)) - 1] += r.h.truocVAT;
    const max = Math.max(...v, 1);
    return v.map((x, i) => ({ t: i + 1, v: x, h: Math.max(0, Math.round((x / max) * 130)) }));
  });

  protected readonly lnKpi = computed(() => {
    const xd = this.namRows().filter((r) => r.c.giaVonNguon !== 'Chưa có');
    return {
      xd: xd.length,
      giaBan: sum(xd, (r) => r.h.truocVAT),
      lnGop: sum(xd, (r) => r.c.lnGop),
      lnSau: sum(xd, (r) => r.c.lnSauThue),
    };
  });

  protected readonly ttRows = computed(() =>
    this.rows()
      .filter((r) => DANG_TH.includes(r.h.trangThai))
      .sort((a, b) => b.tienQuaHan - a.tienQuaHan || a.c.pctThu - b.c.pctThu),
  );
  protected readonly ttKpi = computed(() => ({
    sau: sum(this.ttRows(), (r) => r.c.sauVAT),
    thu: sum(this.ttRows(), (r) => r.c.daThu),
    con: sum(this.ttRows(), (r) => r.c.conPhaiThu),
    dot: sum(this.ttRows(), (r) => r.c.quaHan),
    tienQH: sum(this.ttRows(), (r) => r.tienQuaHan),
  }));

  protected hdPct(r: Dong): number {
    return r.c.sauVAT > 0 ? r.c.daXuatHD / r.c.sauVAT : 0;
  }
  protected w(ratio: number): number {
    return Math.max(0, Math.min(100, ratio * 100));
  }
  protected setTab(t: Tab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, queryParamsHandling: 'merge', replaceUrl: true });
  }
  protected moHD(id: string): void {
    void this.router.navigate(['/hop-dong-ban', id]);
  }

  protected xuat(): void {
    const u = (id: string) => this.store.userName(id);
    let out: (string | number | null)[][];
    let ten: string;
    switch (this.tab()) {
      case 'doanh-thu':
        ten = `bao-cao-doanh-thu-${this.nam()}`;
        out = [['Số HĐ', 'Khách hàng', 'Sale', 'Ngày ký', 'Trạng thái', 'Giá trị (chưa VAT)', 'Sau VAT', 'Đã thu']];
        for (const r of this.namRows()) out.push([r.h.soHD, r.h.tenKH, u(r.h.sale), viDate(r.h.ngayKy), r.h.trangThai, r.h.truocVAT, r.c.sauVAT, r.c.daThu]);
        out.push(['Tổng', `${this.namRows().length} HĐ`, null, null, null, this.dtKpi().truoc, this.dtKpi().sau, this.dtKpi().thu]);
        break;
      case 'loi-nhuan':
        ten = `bao-cao-loi-nhuan-${this.nam()}`;
        out = [['Số HĐ', 'Khách hàng', 'Ngày ký', 'Giá bán', 'Giá vốn', 'Nguồn giá vốn', 'Chi phí thực hiện', 'Thuế TNDN', 'LN gộp', 'LN sau thuế', 'Biên']];
        for (const r of this.namRows()) {
          const xd = r.c.giaVonNguon !== 'Chưa có';
          out.push([
            r.h.soHD, r.h.tenKH, viDate(r.h.ngayKy), r.h.truocVAT, xd ? r.c.giaVon : null, r.c.giaVonNguon, r.c.cpDuyet, r.c.thue.thue,
            xd ? r.c.lnGop : null, xd ? r.c.lnSauThue : null, xd && r.h.truocVAT ? pct(r.c.lnSauThue / r.h.truocVAT) : null,
          ]);
        }
        break;
      default:
        ten = 'bao-cao-tien-do-thanh-toan';
        out = [['Số HĐ', 'Khách hàng', 'Sale', 'Trạng thái', 'Sau VAT', 'Đã thu', '% đã thu', 'Đã xuất hoá đơn', '% hoá đơn', 'Còn phải thu', 'Đợt quá hạn', 'Tiền quá hạn', 'Hạn đợt gần nhất']];
        for (const r of this.ttRows())
          out.push([
            r.h.soHD, r.h.tenKH, u(r.h.sale), r.h.trangThai, r.c.sauVAT, r.c.daThu, pct(r.c.pctThu), r.c.daXuatHD, pct(this.hdPct(r)),
            r.c.conPhaiThu, r.c.quaHan, r.tienQuaHan, r.c.dotGanNhat?.han ? viDate(r.c.dotGanNhat.han) : null,
          ]);
    }
    downloadFile(fileName(ten, 'csv'), 'text/csv', csv(out));
  }
}
