import { ChangeDetectionStrategy, Component, computed, effect, input, model } from '@angular/core';
import { Icon } from './icon';
import { Multi, PickOption } from './ui-kit';
import { luuLoc } from '../core/ui';
import { matches, quarterOf } from '../core/util';

/** Trạng thái bộ lọc chuẩn (NT-09). sel: giá trị chọn của từng bộ lọc multi-select. */
export interface Loc {
  q: string;
  nam: string;
  quy: string;
  thang: string;
  sel: Record<string, string[]>;
}

export const LOC_RONG: Loc = { q: '', nam: '', quy: '', thang: '', sel: {} };

export interface Facet {
  key: string;
  label: string;
  options: PickOption[];
}

/** Ngày ISO có khớp bộ lọc Năm / Quý / Tháng không. Không có ngày thì chỉ khớp khi không lọc thời gian. */
export function khopThoiGian(l: Loc, iso?: string): boolean {
  if (!l.nam && !l.quy && !l.thang) return true;
  if (!iso) return false;
  if (l.nam && iso.slice(0, 4) !== l.nam) return false;
  if (l.quy && String(quarterOf(iso)) !== l.quy) return false;
  if (l.thang && String(Number(iso.slice(5, 7))) !== l.thang) return false;
  return true;
}

/** Khớp một bộ lọc chọn nhiều (không chọn gì = khớp tất cả). */
export function khopSel(l: Loc, key: string, v: string | undefined): boolean {
  const s = l.sel[key];
  return !s || s.length === 0 || (v !== undefined && s.includes(v));
}

export const khopQ = (l: Loc, ...fields: (string | number | null | undefined)[]) => matches(l.q, ...fields);

@Component({
  selector: 'app-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Multi],
  template: `
    <div class="filters" role="search">
      <label class="search">
        <app-icon name="search" [size]="16" />
        <input type="search" [placeholder]="placeholder()" [value]="loc().q" (input)="set('q', $any($event.target).value)" aria-label="Tìm nhanh" />
      </label>
      @if (time()) {
        <select aria-label="Năm" [value]="loc().nam" (change)="set('nam', $any($event.target).value)">
          <option value="">Mọi năm</option>
          @for (y of years(); track y) { <option [value]="y" [selected]="y === loc().nam">{{ y }}</option> }
        </select>
        <select aria-label="Quý" [value]="loc().quy" (change)="set('quy', $any($event.target).value)">
          <option value="">Mọi quý</option>
          @for (q of ['1', '2', '3', '4']; track q) { <option [value]="q" [selected]="q === loc().quy">Quý {{ q }}</option> }
        </select>
        <select aria-label="Tháng" [value]="loc().thang" (change)="set('thang', $any($event.target).value)">
          <option value="">Mọi tháng</option>
          @for (m of months; track m) { <option [value]="m" [selected]="m === loc().thang">Tháng {{ m }}</option> }
        </select>
      }
      @for (f of facets(); track f.key) {
        <app-multi [label]="f.label" [options]="f.options" [value]="loc().sel[f.key] || []" (valueChange)="setSel(f.key, $event)" />
      }
      <ng-content />
      @if (dirty()) {
        <button type="button" class="btn sm quiet" (click)="clear()"><app-icon name="x" [size]="16" /> Xoá lọc</button>
      }
    </div>
  `,
})
export class FilterBar {
  readonly loc = model.required<Loc>();
  /** Khoá ghi nhớ bộ lọc gần nhất của màn. */
  readonly memo = input.required<string>();
  readonly placeholder = input('Tìm số HĐ, tên, MST, nội dung…');
  readonly time = input(true);
  readonly facets = input<Facet[]>([]);
  protected readonly months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  protected readonly years = computed(() => {
    const y = new Date().getFullYear();
    return [y + 1, y, y - 1, y - 2, y - 3].map(String);
  });
  protected readonly dirty = computed(() => {
    const l = this.loc();
    return !!(l.q || l.nam || l.quy || l.thang || Object.values(l.sel).some((v) => v.length));
  });
  constructor() {
    effect(() => luuLoc(this.memo(), this.loc()));
  }
  protected set(k: 'q' | 'nam' | 'quy' | 'thang', v: string): void {
    this.loc.update((l) => ({ ...l, [k]: v }));
  }
  protected setSel(k: string, v: string[]): void {
    this.loc.update((l) => ({ ...l, sel: { ...l.sel, [k]: v } }));
  }
  protected clear(): void {
    this.loc.set({ ...LOC_RONG, sel: {} });
  }
}
