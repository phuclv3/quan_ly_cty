import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DongLo, loConHang, tonTai, tonTheoLo } from '../core/calc';
import { PhieuKho } from '../core/models';
import { Store } from '../core/store';
import { TT } from '../core/trang-thai';
import { num, sum, todayIso, viDate, vndShort } from '../core/util';
import { Pick, PickOption } from '../shared/ui-kit';
import { maHangOpts } from './kho-util';

interface DongChuyen {
  loaiHang: string;
  lo: string;
  soLuong: number;
}

const dongRong = (): DongChuyen => ({ loaiHang: '', lo: '', soLuong: 0 });

/**
 * Tab "Chuyển kho": hàng đi từ kho này sang kho khác. Sinh cặp phiếu liên kết (Xuất kho đi + Nhập kho đến);
 * lô mới kế thừa đơn giá / ngày nhập / HĐ / NCC của lô gốc → tổng số lượng và tổng giá trị không đổi.
 */
@Component({
  selector: 'app-kho-chuyen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pick],
  styles: `
    :host { display: block; }
    .panel { background: var(--surf); border-radius: 18px; padding: 14px 16px 16px; margin-bottom: 14px; }
    .panel h3 { margin: 0 0 10px; font-size: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px 16px; margin-bottom: 12px; }
    .tbl td { vertical-align: top; }
    .tbl td > select, .tbl td > input { width: 100%; height: 40px; }
    .hint { display: block; font-size: 11.5px; color: var(--ink-3); margin-top: 2px; }
    .them { margin-top: 8px; }
  `,
  template: `
    @if (store.canEdit('khoPhieuTay')) {
      <section class="panel">
        <h3>Lập phiếu chuyển kho</h3>
        <p class="sub">Hàng chuyển giữ nguyên lô, đơn giá và ngày nhập; tổng số lượng và giá trị tồn không đổi. Chuyển nhầm thì lập chuyển kho ngược lại.</p>
        <div class="grid">
          <div class="field">
            <label for="ck-ngay">Ngày chuyển <span class="req">*</span></label>
            <input id="ck-ngay" type="date" [value]="ngay()" (input)="ngay.set($any($event.target).value)" />
          </div>
          <div class="field">
            <label for="ck-di">Kho đi <span class="req">*</span></label>
            <select id="ck-di" (change)="doiKhoDi($any($event.target).value)">
              <option value="" [selected]="!khoDi()">— Chọn kho đi —</option>
              @for (k of store.khoDangDung(); track k.id) { <option [value]="k.id" [selected]="k.id === khoDi()">{{ k.ten }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="ck-den">Kho đến <span class="req">*</span></label>
            <select id="ck-den" (change)="khoDen.set($any($event.target).value)">
              <option value="" [selected]="!khoDen()">— Chọn kho đến —</option>
              @for (k of khoDenOpts(); track k.id) { <option [value]="k.id" [selected]="k.id === khoDen()">{{ k.ten }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="ck-gc">Ghi chú</label>
            <input id="ck-gc" type="text" [value]="ghiChu()" (input)="ghiChu.set($any($event.target).value)" />
          </div>
        </div>
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead><tr><th style="width:30%">Mã hàng</th><th style="width:28%">Lô</th><th class="num w-sm">Số lượng</th><th></th><th style="width:40px"></th></tr></thead>
            <tbody>
              @for (d of dong(); track $index; let i = $index) {
                <tr>
                  <td>
                    <app-pick [options]="maOpts()" [value]="d.loaiHang" (valueChange)="setDong(i, { loaiHang: $event, lo: '' })" />
                    @if (d.loaiHang) { <span class="hint">Tồn tại kho đi: {{ num(tonDi(d.loaiHang)) }}</span> }
                  </td>
                  <td>
                    <select aria-label="Lô" [disabled]="!d.loaiHang" (change)="setDong(i, { lo: $any($event.target).value })">
                      <option value="" [selected]="!d.lo">Tự chọn (nhập trước)</option>
                      @for (l of lots(d.loaiHang); track l.lo) { <option [value]="l.lo" [selected]="l.lo === d.lo">{{ l.lo }} · tồn {{ num(l.ton) }}</option> }
                    </select>
                  </td>
                  <td><input class="num" type="number" min="0" [value]="d.soLuong" (input)="setDong(i, { soLuong: +$any($event.target).value || 0 })" aria-label="Số lượng" /></td>
                  <td class="sub">{{ giaTriDong(d) > 0 ? 'Giá trị ≈ ' + vndShort(giaTriDong(d)) : '' }}</td>
                  <td><button type="button" class="icon-btn sm" aria-label="Xoá dòng" (click)="xoaDong(i)">✕</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <button type="button" class="btn sm quiet them" (click)="themDong()">+ Thêm dòng</button>
        @if (loi()) { <p class="note bad">{{ loi() }}</p> }
        <div class="btn-row" style="margin-top:12px">
          <button type="button" class="btn" [disabled]="!!loi()" (click)="xacNhan()">Xác nhận chuyển kho</button>
        </div>
      </section>
    }

    <section class="panel">
      <h3>Lịch sử chuyển kho</h3>
      <div class="tbl-wrap">
        <table class="tbl compact">
          <thead><tr><th>Ngày</th><th>Phiếu Xuất</th><th>Phiếu Nhập</th><th>Kho đi → Kho đến</th><th>Hàng</th><th class="num">SL</th><th class="num">Giá trị</th></tr></thead>
          <tbody>
            @for (r of lichSu(); track r.x.id) {
              <tr>
                <td>{{ viDate(r.x.ngay) }}</td>
                <td><b>{{ r.x.soPhieu }}</b></td>
                <td><b>{{ r.n?.soPhieu ?? '—' }}</b></td>
                <td>{{ store.khoTen(r.x.kho) }} → {{ r.n ? store.khoTen(r.n.kho) : '—' }}@if (r.x.ghiChu) { <span class="sub"> · {{ r.x.ghiChu }}</span> }</td>
                <td class="sub">{{ r.mo }}</td>
                <td class="num">{{ num(r.sl) }}</td>
                <td class="num">{{ vndShort(r.giaTri) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="muted">Chưa có lần chuyển kho nào</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class ChuyenKhoTab {
  protected readonly store = inject(Store);
  protected readonly num = num;
  protected readonly viDate = viDate;
  protected readonly vndShort = vndShort;

  protected readonly ngay = signal(todayIso());
  protected readonly khoDi = signal('');
  protected readonly khoDen = signal('');
  protected readonly ghiChu = signal('');
  protected readonly dong = signal<DongChuyen[]>([dongRong()]);

  protected readonly khoDenOpts = computed(() => this.store.khoDangDung().filter((k) => k.id !== this.khoDi()));

  /** Mã hàng còn tồn ở kho đi. */
  protected readonly maOpts = computed<PickOption[]>(() => {
    const kho = this.khoDi();
    if (!kho) return [];
    const db = this.store.db();
    return maHangOpts(this.store.loaiHang().filter((l) => l.dangDung && tonTai(db, l.id, kho) > 0));
  });

  protected tonDi(lh: string): number {
    return tonTai(this.store.db(), lh, this.khoDi());
  }
  protected lots(lh: string): DongLo[] {
    return lh && this.khoDi() ? loConHang(this.store.db(), lh, this.khoDi()).filter((l) => l.ngay <= this.ngay()) : [];
  }
  /** Giá trị ước tính theo lô được chọn (hoặc FIFO). */
  protected giaTriDong(d: DongChuyen): number {
    if (!d.loaiHang || d.soLuong <= 0) return 0;
    let con = d.soLuong;
    let gt = 0;
    for (const l of this.lots(d.loaiHang).filter((x) => !d.lo || x.lo === d.lo)) {
      const sl = Math.min(con, l.ton);
      gt += sl * l.donGia;
      con -= sl;
      if (con <= 0) break;
    }
    return gt;
  }

  protected readonly loi = computed(() => {
    if (!this.khoDi() || !this.khoDen()) return '';
    if (this.khoDi() === this.khoDen()) return 'Kho đi và Kho đến phải khác nhau';
    const ds = this.dong().filter((d) => d.loaiHang && d.soLuong > 0);
    if (!ds.length) return '';
    return this.store.loiXuat(this.khoDi(), undefined, ds.map((d) => ({ loaiHang: d.loaiHang, lo: d.lo || undefined, soLuong: d.soLuong })), this.ngay()) ?? '';
  });

  protected doiKhoDi(v: string): void {
    this.khoDi.set(v);
    if (this.khoDen() === v) this.khoDen.set('');
    this.dong.set([dongRong()]);
  }
  protected setDong(i: number, p: Partial<DongChuyen>): void {
    this.dong.update((a) => a.map((d, j) => (j === i ? { ...d, ...p } : d)));
  }
  protected themDong(): void {
    this.dong.update((a) => [...a, dongRong()]);
  }
  protected xoaDong(i: number): void {
    this.dong.update((a) => (a.length > 1 ? a.filter((_, j) => j !== i) : [dongRong()]));
  }

  protected xacNhan(): void {
    const err = this.store.chuyenKho({
      ngay: this.ngay(),
      khoDi: this.khoDi(),
      khoDen: this.khoDen(),
      dong: this.dong().filter((d) => d.loaiHang && d.soLuong > 0).map((d) => ({ loaiHang: d.loaiHang, lo: d.lo || undefined, soLuong: d.soLuong })),
      ghiChu: this.ghiChu().trim() || undefined,
    });
    if (err) return this.store.say(err);
    this.store.say('Đã chuyển kho — sinh cặp phiếu Xuất / Nhập');
    this.dong.set([dongRong()]);
    this.ghiChu.set('');
  }

  protected readonly lichSu = computed(() => {
    const ps = this.store.db().phieuKho;
    const lo = new Map(tonTheoLo(this.store.db()).map((l) => [l.lo, l]));
    return ps
      .filter((p) => p.nguonGoc === 'Chuyển kho' && p.loai === 'Xuất' && p.trangThai === TT.HIEU_LUC)
      .sort((a, b) => (a.ngay === b.ngay ? (a.soPhieu < b.soPhieu ? 1 : -1) : a.ngay < b.ngay ? 1 : -1))
      .map((x) => {
        const n: PhieuKho | undefined = ps.find((p) => p.id === x.chuyenId);
        return {
          x,
          n,
          mo: x.dong.map((d) => `${d.loaiHang} (lô ${d.lo}) × ${num(d.soLuong)}`).join('; '),
          sl: sum(x.dong, (d) => d.soLuong),
          giaTri: sum(x.dong, (d) => d.soLuong * (d.donGiaGoc ?? lo.get(d.lo ?? '')?.donGia ?? 0)),
        };
      });
  });
}
