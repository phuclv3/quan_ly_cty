import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, viewChild } from '@angular/core';
import { Store } from '../core/store';
import { CoHoiKH, GIAI_DOAN_CH, GiaiDoanCH, KhachHang, LY_DO_THUA } from '../core/models';
import { todayIso, vndShort } from '../core/util';
import { Modal } from '../shared/ui-kit';
import { CO_HOI_KH, layCoHoiTong } from './co-hoi-data';
import { TT } from '../core/trang-thai';

/**
 * Dialog trạng thái cơ hội: Mới / Đã báo giá / Đang đàm phán / Thắng / Thua.
 * ma: mã cơ hội đang xem, null = đóng. Thua → chọn lý do; Thắng / Thua → ngày chốt.
 */
@Component({
  selector: 'app-co-hoi-trang-thai',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal],
  styles: `
    .tom { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; margin-bottom: 12px; }
    .tom b { font-size: 15px; }
    .tom .ma { color: #0f7a3d; font-weight: 700; font-size: 13px; }
    .tom .kv { font-size: 12.5px; color: var(--ink-3); }
    .tom .kv b { font-size: 12.5px; color: var(--ink-2); }
    .gd { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
    @media (max-width: 560px) { .gd { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .gd button { display: grid; justify-items: center; gap: 4px; padding: 10px 6px; border: 1.5px solid #e3ebe5; background: #fff; border-radius: 12px; font-size: 13px; font-weight: 700; color: var(--ink-2); cursor: pointer; transition: background 0.12s, border-color 0.12s; }
    .gd button i { width: 10px; height: 10px; border-radius: 50%; background: #c9ced6; }
    .gd button.bg i { background: #5b8fd1; } .gd button.dp i { background: #e0911c; } .gd button.thang i { background: #19a05a; } .gd button.thua i { background: #d9453b; }
    .gd button:hover:not(:disabled) { background: #f6faf7; }
    .gd button:disabled { opacity: 0.45; cursor: not-allowed; }
    .gd button.on { color: #fff; border-color: transparent; background: #6b7280; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15); }
    .gd button.on i { background: #fff; }
    .gd button.on.moi { background: #6b7280; }
    .gd button.on.bg { background: linear-gradient(135deg, #3f78bd, #6fa3e0); }
    .gd button.on.dp { background: linear-gradient(135deg, #d9820f, #f2b13d); }
    .gd button.on.thang { background: linear-gradient(135deg, #4bb04f, #7ccf5b); }
    .gd button.on.thua { background: linear-gradient(135deg, #d9453b, #ee7b6f); }
    .doi { margin-top: 10px; font-size: 12.5px; color: var(--ink-3); }
    .doi b { color: var(--ink); }
    .ld-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .ld-row button { border: 1px solid transparent; background: #eef2ef; border-radius: 999px; padding: 6px 14px; font-size: 13px; font-weight: 600; color: var(--ink-2); cursor: pointer; }
    .ld-row button:hover { background: #e1e9e3; }
    .ld-row button.on { background: linear-gradient(135deg, #d9453b, #ee7b6f); color: #fff; }
    .ct { display: grid; gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px dashed #d5e2d9; }
    /* mỗi dòng chi tiết: nhãn bên trái, giá trị bên phải */
    .ro-ct { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 12px; align-items: center; }
    .ro-ct > label, .ro-ct > .lbl { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
    .ro-ct input { max-width: 220px; }
    @media (max-width: 560px) { .ro-ct { grid-template-columns: minmax(0, 1fr); gap: 6px; } }
  `,
  template: `
    <app-modal #m [open]="ma() !== null" size="md" title="Trạng thái cơ hội" [sub]="r() ? r()!.c.id + ' · ' + r()!.k.ten : ''"
      [dirty]="dirty()" (closed)="closed.emit()">
      @if (r(); as x) {
        @if (err()) { <div class="note bad">{{ err() }}</div> }
        <section class="blk">
          <h3 class="blk-t">Giai đoạn</h3>
          <div class="tom">
            <b>{{ x.k.ten }}</b>
            <span class="kv">{{ x.c.huongBan }}</span>
            <span class="kv">Giá trị <b>{{ x.c.giaTri ? short(x.c.giaTri) : '—' }}</b></span>
            @if (x.k.phuTrach) { <span class="kv">Phụ trách <b>{{ store.userName(x.k.phuTrach) }}</b></span> }
          </div>
          <div class="gd" role="radiogroup" aria-label="Trạng thái cơ hội">
            @for (g of GIAI_DOAN; track g) {
              <button type="button" role="radio" [class]="CLS[g]" [class.on]="gd() === g" [disabled]="daThua() && g !== 'Thua'"
                [attr.aria-checked]="gd() === g" (click)="chon(g)"><i></i>{{ g }}</button>
            }
          </div>
          @if (dirty()) { <div class="doi">Đổi từ <b>{{ x.c.giaiDoan }}</b> → <b>{{ gd() }}</b></div> }
          @else if (daThua()) { <div class="doi">Cơ hội đã Thua — chỉ có thể <b>Tái tiếp cận</b> để đưa về Mới.</div> }
          @if (gd() === 'Thua' || gd() === 'Thắng') {
            <div class="ct">
              @if (gd() === 'Thua') {
                <div class="ro-ct">
                  <span class="lbl">Lý do thua <span class="req">*</span></span>
                  <div class="ld-row" role="radiogroup" aria-label="Lý do thua">
                    @for (o of LY_DO; track o) { <button type="button" role="radio" [class.on]="lyDo() === o" [attr.aria-checked]="lyDo() === o" (click)="lyDo.set(o)">{{ o }}</button> }
                  </div>
                </div>
              }
              <div class="ro-ct">
                <label for="cht-nc">Ngày chốt</label>
                <input id="cht-nc" type="date" [value]="ngayChot()" (input)="ngayChot.set($any($event.target).value)" />
              </div>
            </div>
          }
        </section>
      }
      <ng-container foot>
        @if (r() && !r()!.kh) { <button type="button" class="btn quiet" style="margin-right:auto" (click)="sua.emit(ma()!)">Sửa chi tiết</button> }
        @if (daThua()) { <button type="button" class="btn quiet" (click)="taiTiepCan()">Tái tiếp cận</button> }
        <button type="button" class="btn quiet" (click)="m.tryClose()">Huỷ</button>
        <button type="button" class="btn" [disabled]="!dirty()" (click)="luu()">Lưu trạng thái</button>
      </ng-container>
    </app-modal>
  `,
})
export class CoHoiTrangThai {
  protected readonly store = inject(Store);
  private readonly m = viewChild<Modal>('m');
  protected readonly GIAI_DOAN = GIAI_DOAN_CH;
  protected readonly LY_DO = LY_DO_THUA;
  protected readonly short = vndShort;
  protected readonly CLS: Record<GiaiDoanCH, string> = { 'Mới': 'moi', 'Đã báo giá': 'bg', 'Đang đàm phán': 'dp', 'Thắng': 'thang', 'Thua': 'thua' };

  readonly ma = input<string | null>(null);
  readonly closed = output<void>();
  /** Mở form sửa đầy đủ. */
  readonly sua = output<string>();

  protected readonly r = computed(() => (this.ma() ? layCoHoiTong(this.store.khachHang()).find((x) => x.c.id === this.ma()) : undefined));
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
    if (r.kh) return this.luuKhach(r.k, 'Mới', 'Tái tiếp cận khách hàng — chuyển về trạng thái Mới');
    const c: CoHoiKH = { ...r.c, giaiDoan: 'Mới', ngayChot: undefined, lyDoThua: undefined, ngayTaiTiepCan: undefined };
    const e = this.store.saveKhachHang({ ...structuredClone(r.k), dsCoHoi: (r.k.dsCoHoi ?? []).map((x) => (x.id === c.id ? c : x)) });
    if (e) return this.err.set(e);
    this.store.say(`Đã tái tiếp cận ${c.id} — chuyển về Mới`);
    this.closed.emit();
  }

  /** Cơ hội suy ra từ khách: đổi trạng thái cơ hội ở cấp khách hàng (+ ghi lý do vào lịch sử chăm sóc). */
  private luuKhach(k: KhachHang, g: GiaiDoanCH, ghiChu: string): void {
    const ma = CO_HOI_KH.find((o) => o.l === g)?.v ?? TT.CHUA_TIEP_CAN;
    const e = this.store.saveKhachHang({ ...structuredClone(k), coHoi: ma });
    if (e) return this.err.set(e);
    this.store.ghiChamSoc(k.id, ghiChu || `Cơ hội → ${g}`);
    this.store.say(`Cơ hội ${k.id} → ${g}`);
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
    if (r.kh) return this.luuKhach(r.k, g, g === 'Thua' ? 'Lý do thua: ' + this.lyDo() : '');
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
