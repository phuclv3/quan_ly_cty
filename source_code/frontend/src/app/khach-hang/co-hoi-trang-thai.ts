import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, viewChild } from '@angular/core';
import { Store } from '../core/store';
import { CoHoiKH, GIAI_DOAN_CH, GiaiDoanCH, LY_DO_THUA } from '../core/models';
import { todayIso } from '../core/util';
import { Modal } from '../shared/ui-kit';
import { layCoHoi } from './co-hoi-data';

/**
 * Dialog trạng thái cơ hội: Mới / Đã báo giá / Đang đàm phán / Thắng / Thua.
 * ma: mã cơ hội đang xem, null = đóng. Thua → chọn lý do; Thắng / Thua → ngày chốt.
 */
@Component({
  selector: 'app-co-hoi-trang-thai',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal],
  styles: `
    .gd { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .gd button { border: 1.5px solid var(--line-2); background: var(--surf); border-radius: 999px; padding: 7px 16px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
    .gd button.on { background: #0f5a2a; border-color: #0f5a2a; color: #fff; }
    .gd button.on.thua { background: #c0392b; border-color: #c0392b; }
  `,
  template: `
    <app-modal #m [open]="ma() !== null" size="sm" [title]="r() ? r()!.c.id + ' — ' + r()!.k.ten : 'Cơ hội'" [sub]="r() ? r()!.c.huongBan : ''"
      [dirty]="dirty()" (closed)="closed.emit()">
      @if (err()) { <div class="note bad">{{ err() }}</div> }
      <div class="gd" role="radiogroup" aria-label="Trạng thái cơ hội">
        @for (g of GIAI_DOAN; track g) {
          <button type="button" role="radio" [class.on]="gd() === g" [class.thua]="g === 'Thua'" [disabled]="daThua() && g !== 'Thua'" [attr.aria-checked]="gd() === g" (click)="chon(g)">{{ g }}</button>
        }
      </div>
      @if (gd() === 'Thua') {
        <div class="form-grid">
          <div class="field full">
            <label for="cht-ld">Lý do thua <span class="req">*</span></label>
            <select id="cht-ld" (change)="lyDo.set($any($event.target).value)">
              <option value="" [selected]="!lyDo()">— Chọn lý do —</option>
              @for (o of LY_DO; track o) { <option [value]="o" [selected]="o === lyDo()">{{ o }}</option> }
            </select>
          </div>
        </div>
      }
      @if (gd() === 'Thắng' || gd() === 'Thua') {
        <div class="form-grid">
          <div class="field full">
            <label for="cht-nc">Ngày chốt</label>
            <input id="cht-nc" type="date" [value]="ngayChot()" (input)="ngayChot.set($any($event.target).value)" />
          </div>
        </div>
      }
      @if (daThua()) {
        <div class="note info">Cơ hội đã Thua — chỉ có thể <b>Tái tiếp cận</b> để đưa về trạng thái Mới.</div>
      }
      <ng-container foot>
        <button type="button" class="btn quiet" style="margin-right:auto" (click)="sua.emit(ma()!)">Sửa chi tiết</button>
        @if (daThua()) { <button type="button" class="btn quiet" (click)="taiTiepCan()">Tái tiếp cận</button> }
        <button type="button" class="btn quiet" (click)="m.tryClose()">Huỷ</button>
        <button type="button" class="btn" [disabled]="!dirty()" (click)="luu()">Lưu</button>
      </ng-container>
    </app-modal>
  `,
})
export class CoHoiTrangThai {
  protected readonly store = inject(Store);
  private readonly m = viewChild<Modal>('m');
  protected readonly GIAI_DOAN = GIAI_DOAN_CH;
  protected readonly LY_DO = LY_DO_THUA;

  readonly ma = input<string | null>(null);
  readonly closed = output<void>();
  /** Mở form sửa đầy đủ. */
  readonly sua = output<string>();

  protected readonly r = computed(() => (this.ma() ? layCoHoi(this.store.khachHang()).find((x) => x.c.id === this.ma()) : undefined));
  protected readonly gd = linkedSignal<GiaiDoanCH>(() => this.r()?.c.giaiDoan ?? 'Mới');
  protected readonly lyDo = linkedSignal(() => this.r()?.c.lyDoThua ?? '');
  protected readonly ngayChot = linkedSignal(() => this.r()?.c.ngayChot ?? todayIso());
  protected readonly err = linkedSignal(() => (this.ma(), ''));
  protected readonly dirty = computed(() => {
    const c = this.r()?.c;
    return !!c && (this.gd() !== c.giaiDoan || (this.gd() === 'Thua' && this.lyDo() !== (c.lyDoThua ?? '')));
  });

  protected readonly daThua = computed(() => this.r()?.c.giaiDoan === 'Thua');

  /** Chỉ cơ hội đang Thua mới tái tiếp cận được → về Mới. */
  protected taiTiepCan(): void {
    const r = this.r();
    if (!r || r.c.giaiDoan !== 'Thua') return;
    const c: CoHoiKH = { ...r.c, giaiDoan: 'Mới', ngayChot: undefined, lyDoThua: undefined, ngayTaiTiepCan: undefined };
    const e = this.store.saveKhachHang({ ...structuredClone(r.k), dsCoHoi: (r.k.dsCoHoi ?? []).map((x) => (x.id === c.id ? c : x)) });
    if (e) return this.err.set(e);
    this.store.say(`Đã tái tiếp cận ${c.id} — chuyển về Mới`);
    this.closed.emit();
  }

  protected chon(g: GiaiDoanCH): void {
    this.gd.set(g);
    this.err.set('');
  }

  protected luu(): void {
    const r = this.r();
    if (!r) return;
    const g = this.gd();
    if (g === 'Thua' && !this.lyDo()) return this.err.set('Chọn lý do thua');
    const chot = g === 'Thắng' || g === 'Thua';
    const c: CoHoiKH = {
      ...r.c,
      giaiDoan: g,
      ngayBaoGia: g === 'Đã báo giá' ? (r.c.ngayBaoGia ?? todayIso()) : r.c.ngayBaoGia,
      ngayChot: chot ? this.ngayChot() || todayIso() : undefined,
      lyDoThua: g === 'Thua' ? this.lyDo() : undefined,
      ngayTaiTiepCan: g === 'Thua' ? r.c.ngayTaiTiepCan : undefined,
    };
    const e = this.store.saveKhachHang({ ...structuredClone(r.k), dsCoHoi: (r.k.dsCoHoi ?? []).map((x) => (x.id === c.id ? c : x)) });
    if (e) return this.err.set(e);
    this.store.say(`Cơ hội ${c.id} → ${g}`);
    this.closed.emit();
  }
}
