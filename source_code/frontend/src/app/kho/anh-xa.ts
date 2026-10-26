import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { AnhXaTen, LoaiHang } from '../core/models';
import { Store } from '../core/store';
import { nhoLoc } from '../core/ui';
import { fold, money, num } from '../core/util';
import { xuatExcel } from '../shared/export';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { dirtyOf } from '../shared/unsaved';
import { Kpi, Modal, Pick } from '../shared/ui-kit';
import { maHangOpts, moTaMa } from './kho-util';

interface Form {
  /** Rỗng = thêm tên mới. */
  id: string;
  ten: string;
  theTich: string;
  nongDo: string;
  loaiHang: string;
  lo: string;
  ghiChu: string;
}

/** Thể tích "8 L" / "8l" / "8 lít" → "8L" để so với mã hàng. */
const chuanTT = (s?: string) => (s ?? '').toUpperCase().replace(/\s+|ÍT/g, '').replace(/LIT$/, 'L').replace(',', '.');

/**
 * Gợi ý mã cho một tên bán: cùng thể tích + tên chứa loại khí của mã (VD "SO2/NO/CO" → đủ SO2, NO, CO).
 * Chỉ để chọn nhanh — người biết hàng vẫn quyết định (nồng độ ghi tự do, máy không tự khớp được).
 */
function goiYMa(a: Pick2, ds: LoaiHang[]): LoaiHang[] {
  const ten = ` ${fold(a.ten).toUpperCase().replace(/[^A-Z0-9]+/g, ' ')} `;
  const tt = chuanTT(a.theTich);
  const diem = (l: LoaiHang) => {
    if (!l.loaiKhi) return 0;
    const khi = l.loaiKhi.toUpperCase().split(/[/ ,()]+/).filter(Boolean);
    const trung = khi.filter((k) => ten.includes(` ${fold(k).toUpperCase()} `)).length;
    if (trung < khi.length) return 0;
    return trung * 2 + (tt && chuanTT(l.theTich) === tt ? 3 : 0);
  };
  return ds
    .map((l) => ({ l, d: diem(l) }))
    .filter((x) => x.d > 0)
    .sort((x, y) => y.d - x.d)
    .slice(0, 4)
    .map((x) => x.l);
}
type Pick2 = { ten: string; theTich?: string };

/** Sheet "5. AnhXaTenBan": tên hàng trong HĐ bán → mã hàng / mã lô hay dùng (gán tay). */
@Component({
  selector: 'app-kho-anh-xa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterBar, Pager, Kpi, Modal, Pick],
  template: `
    <div class="note info">
      Hoá đơn ghi "Khí chuẩn Nitrogen dioxide (0.01%)", hợp đồng ghi "Bình khí chuẩn NO2 200ppm" — khác nồng độ là khác hàng, máy không tự khớp được.
      Gán mỗi tên về một <b>mã hàng</b> (và lô hay dùng nếu có) <b>một lần</b>; lần sau ở phiếu xuất gõ đúng tên là tự ra mã + lô.
    </div>
    <div class="kpis">
      <app-kpi label="Tên hàng trong HĐ bán" [value]="money(all().length)" />
      <app-kpi label="Đã gán mã" [value]="money(daGan())" [sub]="pct()" [tone]="daGan() === all().length ? 'ok' : 'warn'" />
      <app-kpi label="Chưa gán" [value]="money(all().length - daGan())" />
    </div>
    <div class="section-title">
      <span class="sub">{{ rows().length }} tên</span>
      <div class="btn-row">
        <button type="button" class="btn sm quiet" (click)="xuatExcel()">Xuất Excel</button>
        @if (edit()) { <button type="button" class="btn" (click)="moi()">+ Thêm tên</button> }
      </div>
    </div>
    <app-filter [(loc)]="loc" memo="kho-anh-xa" [time]="false" [facets]="facets" placeholder="Tìm tên hàng, nồng độ, mã hàng, mã lô…" />
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead><tr><th>Tên hàng trong hợp đồng</th><th>Thể tích</th><th>Nồng độ ghi trong HĐ</th><th class="num">Tổng SL đã bán</th><th class="num">Số lần</th><th>Mã hàng</th><th>Mã lô hay dùng</th><th>Ghi chú</th>@if (edit()) { <th></th> }</tr></thead>
        <tbody>
          @for (a of pg.items(); track a.id) {
            <tr>
              <td>{{ a.ten }}</td>
              <td>{{ a.theTich || '—' }}</td>
              <td class="sub">{{ a.nongDo || '—' }}</td>
              <td class="num">{{ num(a.tongSL) }}</td>
              <td class="num">{{ a.soLan }}</td>
              <td>@if (a.loaiHang) { <b>{{ a.loaiHang }}</b> } @else { <span class="tag warn">Chưa gán</span> }</td>
              <td>{{ a.lo || '—' }}</td>
              <td class="sub">{{ a.ghiChu || '' }}</td>
              @if (edit()) { <td><button type="button" class="btn sm quiet" (click)="sua(a)">{{ a.loaiHang ? 'Sửa' : 'Gán mã' }}</button></td> }
            </tr>
          } @empty {
            <tr><td colspan="9" class="empty">Không có tên nào khớp bộ lọc</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [pager]="pg" />
    <p class="hint muted">Tổng SL đã bán / Số lần xuất hiện: số liệu khi lập bảng từ các HĐ bán (file KhoOxyMecie_v3).</p>

    <app-modal #mAX [open]="!!f()" [title]="f()?.id ? 'Gán mã — ' + f()!.ten : 'Thêm tên hàng'" [dirty]="dirty()" (closed)="f.set(null)">
      @if (f(); as x) {
        <div class="form-grid">
          @if (!x.id) {
            <div class="field full"><label for="ax-ten">Tên hàng trong hợp đồng <span class="req">*</span></label><input id="ax-ten" [value]="x.ten" (input)="set({ ten: $any($event.target).value })" /></div>
            <div class="field"><label for="ax-tt">Thể tích</label><input id="ax-tt" placeholder="8L" [value]="x.theTich" (input)="set({ theTich: $any($event.target).value })" /></div>
            <div class="field wide"><label for="ax-nd">Nồng độ ghi trong HĐ</label><input id="ax-nd" [value]="x.nongDo" (input)="set({ nongDo: $any($event.target).value })" /></div>
          } @else {
            <div class="field"><span class="lbl">Thể tích</span><div class="ro">{{ x.theTich || '—' }}</div></div>
            <div class="field wide"><span class="lbl">Nồng độ ghi trong HĐ</span><div class="ro">{{ x.nongDo || '—' }}</div></div>
          }
          <div class="field full">
            <span class="lbl">Mã hàng</span>
            <app-pick [options]="maOpts()" [value]="x.loaiHang" [allowEmpty]="true" placeholder="— Chưa gán —" (valueChange)="set({ loaiHang: $event, lo: '' })" />
            @if (x.loaiHang) { <span class="hint">{{ moTa(x.loaiHang) }}</span> }
            @if (goiY().length) {
              <div class="btn-row" style="justify-content:flex-start;margin-top:6px">
                <span class="muted">Gợi ý:</span>
                @for (l of goiY(); track l.id) { <button type="button" class="btn sm quiet" (click)="set({ loaiHang: l.id, lo: '' })">{{ l.id }}</button> }
              </div>
            }
          </div>
          <div class="field wide">
            <label for="ax-lo">Mã lô hay dùng</label>
            <select id="ax-lo" [disabled]="!x.loaiHang" (change)="set({ lo: $any($event.target).value })">
              <option value="" [selected]="!x.lo">— Không cố định lô —</option>
              @for (l of lots(); track l.lo) { <option [value]="l.lo" [selected]="l.lo === x.lo">{{ l.lo }} · tồn {{ l.ton }}{{ l.quyCach ? ' · ' + l.quyCach.slice(0, 50) : '' }}</option> }
            </select>
          </div>
          <div class="field wide"><label for="ax-gc">Ghi chú</label><input id="ax-gc" [value]="x.ghiChu" (input)="set({ ghiChu: $any($event.target).value })" /></div>
        </div>
        @if (err()) { <div class="note bad">{{ err() }}</div> }
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="f.set(null)">Huỷ</button>
        <button type="button" class="btn" (click)="luu()">Lưu</button>
      </div>
    </app-modal>
  `,
})
export class AnhXaTab {
  private readonly mAX = viewChild<Modal>('mAX');
  protected readonly store = inject(Store);
  protected readonly money = money;
  protected readonly num = num;
  protected readonly edit = computed(() => this.store.canEdit('khoDanhMuc'));
  protected readonly loc = signal<Loc>(nhoLoc('kho-anh-xa', LOC_RONG));
  protected readonly facets: Facet[] = [
    { key: 'gan', label: 'Tình trạng', options: [{ value: 'chua', label: 'Chưa gán' }, { value: 'da', label: 'Đã gán' }] },
  ];
  protected readonly all = computed(() => [...this.store.anhXaTen()].sort((a, b) => b.tongSL - a.tongSL || a.ten.localeCompare(b.ten, 'vi')));
  protected readonly daGan = computed(() => this.all().filter((a) => a.loaiHang).length);
  protected readonly pct = computed(() => (this.all().length ? `${Math.round((this.daGan() / this.all().length) * 100)}%` : ''));
  protected readonly rows = computed(() => {
    const l = this.loc();
    return this.all().filter((a) => khopSel(l, 'gan', a.loaiHang ? 'da' : 'chua') && khopQ(l, a.ten, a.theTich, a.nongDo, a.loaiHang, a.lo, a.ghiChu));
  });
  protected readonly pg = paginate(this.rows);

  protected readonly f = signal<Form | null>(null);
  protected readonly dirty = dirtyOf(this.f);
  protected readonly err = signal('');
  protected readonly maOpts = computed(() => maHangOpts(this.store.loaiHang().filter((l) => l.dangDung)));
  protected readonly goiY = computed(() => {
    const x = this.f();
    return x && x.ten ? goiYMa(x, this.store.loaiHang().filter((l) => l.dangDung)) : [];
  });
  /** Mọi lô của mã (kể cả đã hết) — "lô hay dùng" là thói quen, không phải tồn hiện tại. */
  protected readonly lots = computed(() => {
    const lh = this.f()?.loaiHang;
    return lh ? this.store.loKho().filter((l) => l.loaiHang === lh) : [];
  });

  protected moTa(lh: string): string {
    return moTaMa(this.store.loaiHangById(lh));
  }
  protected moi(): void {
    this.err.set('');
    this.f.set({ id: '', ten: '', theTich: '', nongDo: '', loaiHang: '', lo: '', ghiChu: '' });
  }
  protected sua(a: AnhXaTen): void {
    this.err.set('');
    this.f.set({ id: a.id, ten: a.ten, theTich: a.theTich ?? '', nongDo: a.nongDo ?? '', loaiHang: a.loaiHang ?? '', lo: a.lo ?? '', ghiChu: a.ghiChu ?? '' });
  }
  protected set(p: Partial<Form>): void {
    this.f.update((x) => (x ? { ...x, ...p } : x));
  }
  protected luu(): void {
    if (this.mAX()?.kt.hopLe() === false) return;
    const x = this.f();
    if (!x) return;
    const e = x.id
      ? this.store.saveAnhXa(x.id, { loaiHang: x.loaiHang || undefined, lo: x.lo || undefined, ghiChu: x.ghiChu })
      : this.store.themAnhXa({
          ten: x.ten,
          theTich: x.theTich.trim() || undefined,
          nongDo: x.nongDo.trim() || undefined,
          loaiHang: x.loaiHang || undefined,
          lo: x.lo || undefined,
          ghiChu: x.ghiChu.trim() || undefined,
        });
    if (e) return this.err.set(e);
    this.store.say(x.loaiHang ? `Đã gán "${x.ten}" → ${x.loaiHang}` : 'Đã lưu');
    this.f.set(null);
  }

  protected xuatExcel(): void {
    const rows: (string | number)[][] = [['Tên hàng trong hợp đồng', 'Thể tích', 'Nồng độ ghi trong hợp đồng', 'Tổng SL đã bán', 'Số lần xuất hiện', 'MÃ HÀNG', 'MÃ LÔ hay dùng', 'Ghi chú']];
    for (const a of this.rows()) rows.push([a.ten, a.theTich ?? '', a.nongDo ?? '', a.tongSL, a.soLan, a.loaiHang ?? '', a.lo ?? '', a.ghiChu ?? '']);
    void xuatExcel('anh-xa-ten-ban', rows);
  }
}
