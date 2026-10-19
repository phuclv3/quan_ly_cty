import { ChangeDetectionStrategy, Component, Signal, computed, input, signal } from '@angular/core';

/**
 * Sắp xếp danh sách theo cột (bấm tiêu đề cột: tăng → giảm → mặc định).
 *
 *   readonly sx = new Sorter<Row>({ soHD: (r) => r.soHD, giaTri: (r) => r.tien });
 *   readonly rows = computed(() => this.sx.apply(this.loc()));
 *   <th app-sort-th [sx]="sx" k="soHD">Số HĐ</th>
 */
export class Sorter<T> {
  readonly key = signal<string | null>(null);
  readonly dir = signal<1 | -1>(1);

  constructor(private readonly cols: Record<string, (r: T) => string | number | null | undefined>) {}

  toggle(k: string): void {
    if (this.key() !== k) {
      this.key.set(k);
      this.dir.set(1);
    } else if (this.dir() === 1) this.dir.set(-1);
    else this.key.set(null);
  }

  /** Không chọn cột nào thì giữ nguyên thứ tự mặc định của màn. */
  apply(rows: readonly T[]): T[] {
    const k = this.key();
    const f = k ? this.cols[k] : undefined;
    if (!f) return [...rows];
    const d = this.dir();
    return [...rows].sort((a, b) => {
      const x = f(a);
      const y = f(b);
      if (x === y) return 0;
      if (x === null || x === undefined || x === '') return 1;
      if (y === null || y === undefined || y === '') return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'vi', { numeric: true })) * d;
    });
  }
}

/** Phần Sorter mà ô tiêu đề cần (không phụ thuộc kiểu dòng). */
export interface SortState {
  key: Signal<string | null>;
  dir: Signal<1 | -1>;
  toggle(k: string): void;
}

/** Ô tiêu đề bấm được để sắp xếp; hiện ▲ / ▼ và aria-sort. */
@Component({
  selector: 'th[app-sort-th]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sortable',
    '[attr.aria-sort]': "on() ? (sx().dir() === 1 ? 'ascending' : 'descending') : 'none'",
    tabindex: '0',
    '(click)': 'sx().toggle(k())',
    '(keydown.enter)': 'sx().toggle(k())',
  },
  // Ký hiệu vẽ bằng CSS ::after để không lẫn vào nhãn cột (shared/stack-table lấy chữ của <th>).
  template: `<ng-content /><span class="sort-mark" aria-hidden="true" [attr.data-mark]="on() ? (sx().dir() === 1 ? '▲' : '▼') : '↕'"></span>`,
})
export class SortTh {
  readonly sx = input.required<SortState>();
  readonly k = input.required<string>();
  protected readonly on: Signal<boolean> = computed(() => this.sx().key() === this.k());
}
