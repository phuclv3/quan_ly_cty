/**
 * Phần dùng chung của màn tạo mới dạng từng bước (HĐ bán, HĐ mua):
 *  - <app-buoc-bar>: thanh bước ①──②──③, bấm quay lại bước đã qua.
 *  - <app-ho-so-cho>: chọn sẵn tệp hồ sơ theo loại khi HĐ chưa có mã; taiHoSoCho() tải lên sau khi lưu.
 * Khung nút dưới (.wiz-foot) và bảng tóm tắt (.tom-tat) nằm ở styles.css.
 */
import { ChangeDetectionStrategy, Component, inject, input, model, output } from '@angular/core';
import { Store } from '../core/store';
import { ChuHoSo, HO_SO_BAT_BUOC, LOAI_HO_SO, LoaiHoSo } from '../core/models';
import { HO_SO_ACCEPT, MAX_FILE_BYTES, viSize } from '../core/files';
import { Icon } from './icon';

export interface Buoc {
  k: string;
  t: string;
  /** Mô tả ngắn dưới tên bước. */
  mo: string;
}

/** Tệp hồ sơ chọn khi HĐ chưa lưu, theo loại. */
export type HoSoCho = Partial<Record<LoaiHoSo, File[]>>;

export const demHoSoCho = (cho: HoSoCho) => Object.values(cho).reduce((s, x) => s + (x?.length ?? 0), 0);

/** Tải mọi tệp chờ lên hồ sơ của HĐ vừa tạo; trả số tệp đã lưu (lỗi từng loại báo bằng toast). */
export async function taiHoSoCho(store: Store, chu: ChuHoSo, chuId: string, cho: HoSoCho): Promise<number> {
  let n = 0;
  for (const loai of LOAI_HO_SO) {
    const files = cho[loai] ?? [];
    if (!files.length) continue;
    const e = await store.uploadHoSo(chu, chuId, loai, files);
    if (e) store.say(`${loai}: ${e}`);
    else n += files.length;
  }
  return n;
}

@Component({
  selector: 'app-buoc-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  styles: `
    :host { display: block; }
    ol { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: 4px 0 16px; padding: 0; list-style: none; }
    li { display: flex; align-items: center; gap: 6px; }
    li + li::before { content: ''; width: 28px; height: 2px; background: var(--line-2); border-radius: 1px; }
    li.qua + li::before, li.qua::before { background: var(--brand); }
    .step { display: flex; align-items: center; gap: 10px; border: 0; background: none; padding: 6px 10px 6px 6px; border-radius: 22px; cursor: pointer; text-align: left; color: var(--ink-3); }
    .step:disabled { cursor: default; }
    .step:not(:disabled):hover { background: var(--surf-3); }
    .so { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; border: 2px solid var(--line-2); background: var(--surf); flex: 0 0 auto; }
    b { display: block; font-size: 15px; color: inherit; }
    small { display: block; font-size: 12.5px; color: var(--ink-3); font-weight: 400; }
    li.qua .step, li.cur .step { color: var(--ink); }
    li.qua .so { background: var(--brand); border-color: var(--brand); color: #fff; }
    li.cur .so { border-color: var(--brand); color: var(--brand); box-shadow: 0 0 0 4px var(--brand-tint); }
    @media (max-width: 640px) {
      small { display: none; }
      li + li::before { width: 12px; }
    }
  `,
  template: `
    <ol aria-label="Các bước">
      @for (b of buocs(); track b.k; let i = $index) {
        <li [class.qua]="i < buoc()" [class.cur]="i === buoc()">
          <button type="button" class="step" [disabled]="i > buoc()" [attr.aria-current]="i === buoc() ? 'step' : null" (click)="chon.emit(i)">
            <span class="so">@if (i < buoc()) { <app-icon name="check" [size]="16" /> } @else { {{ i + 1 }} }</span>
            <span><b>{{ b.t }}</b><small>{{ b.mo }}</small></span>
          </button>
        </li>
      }
    </ol>
  `,
})
export class BuocBar {
  readonly buocs = input.required<Buoc[]>();
  readonly buoc = input.required<number>();
  readonly chon = output<number>();
}

@Component({
  selector: 'app-ho-so-cho',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  styles: `
    .hs-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); }
    .hs-card { display: grid; gap: 10px; align-content: start; margin: 0; }
    .hs-card h3 { display: flex; align-items: center; gap: 8px; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
    li { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--line); border-radius: 8px; }
    li span { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `,
  template: `
    <section class="card">
      <h2 class="section-title">Hồ sơ hợp đồng <small class="muted">(có thể bổ sung sau)</small></h2>
      <p class="sub" style="margin-bottom:12px">
        Chọn sẵn file theo từng loại — file được tải lên khi bấm <b>Lưu hợp đồng</b> ở bước cuối.
        Bắt buộc đủ {{ batBuoc.join(', ') }} trước khi chuyển <b>Đã tất toán</b>, không bắt buộc lúc tạo HĐ.
      </p>
      <div class="hs-grid">
        @for (loai of loais; track loai) {
          <section class="card hs-card">
            <h3>{{ loai }} @if (batBuoc.includes(loai)) { <small class="req-chu">cần khi tất toán</small> }</h3>
            @if (cho()[loai]?.length) {
              <ul>
                @for (f of cho()[loai]; track $index) {
                  <li>
                    <app-icon name="file" [size]="18" />
                    <span [title]="f.name">{{ f.name }}</span>
                    <small class="muted">{{ size(f.size) }}</small>
                    <button type="button" class="icon-btn sm" [attr.aria-label]="'Bỏ tệp ' + f.name" (click)="bo(loai, $index)"><app-icon name="x" [size]="16" /></button>
                  </li>
                }
              </ul>
            }
            <label class="drop">
              <input type="file" multiple [accept]="accept" (change)="them(loai, $event)" />
              <app-icon name="upload" [size]="16" />
              <span>Chọn ảnh / PDF (≤ 20MB)</span>
            </label>
          </section>
        }
      </div>
    </section>
  `,
})
export class HoSoChoPanel {
  private readonly store = inject(Store);
  readonly cho = model.required<HoSoCho>();
  protected readonly loais = LOAI_HO_SO;
  protected readonly batBuoc = HO_SO_BAT_BUOC;
  protected readonly accept = HO_SO_ACCEPT;
  protected readonly size = viSize;

  protected them(loai: LoaiHoSo, e: Event): void {
    const el = e.target as HTMLInputElement;
    const files = [...(el.files ?? [])];
    el.value = '';
    // Ảnh lớn được nén khi tải lên; PDF / tệp khác quá 20MB thì bỏ ngay.
    const lon = files.filter((f) => f.size > MAX_FILE_BYTES && !f.type.startsWith('image/'));
    if (lon.length) this.store.say(`Bỏ qua tệp quá 20MB: ${lon.map((f) => f.name).join(', ')}`);
    const ok = files.filter((f) => !lon.includes(f));
    if (ok.length) this.cho.update((c) => ({ ...c, [loai]: [...(c[loai] ?? []), ...ok] }));
  }
  protected bo(loai: LoaiHoSo, i: number): void {
    this.cho.update((c) => ({ ...c, [loai]: (c[loai] ?? []).filter((_, j) => j !== i) }));
  }
}
