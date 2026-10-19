import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  WritableSignal,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { inputValue } from './dom';

/** Số dòng mỗi trang cho người dùng chọn; phần tử đầu là mặc định. */
export const PAGE_SIZES = [10, 20, 30] as const;

/**
 * Cắt một danh sách thành từng trang. Nguồn là signal/computed: gõ tìm kiếm
 * hay đổi bộ lọc làm số dòng thay đổi thì quay về trang 1. Chỉ theo dõi SỐ
 * dòng chứ không theo mảng — sửa một dòng tại chỗ (đổi tình trạng, phân công)
 * tạo mảng mới nhưng không được đá người dùng về trang đầu.
 */
export class Paginator<T> {
  readonly size: WritableSignal<number> = signal<number>(PAGE_SIZES[0]);
  readonly total = computed(() => this.source().length);
  private readonly wanted = linkedSignal({ source: this.total, computation: () => 1 });
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  readonly page = computed(() => Math.min(Math.max(1, this.wanted()), this.pageCount()));
  readonly from = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.size() + 1));
  readonly to = computed(() => Math.min(this.page() * this.size(), this.total()));
  readonly items = computed(() => this.source().slice(this.from() - 1, this.to()));

  constructor(private readonly source: Signal<readonly T[]> | (() => readonly T[])) {}

  go(page: number): void {
    this.wanted.set(Math.min(Math.max(1, page), this.pageCount()));
  }

  setSize(size: number): void {
    this.size.set(size);
    this.wanted.set(1);
  }
}

export function paginate<T>(source: Signal<readonly T[]> | (() => readonly T[])): Paginator<T> {
  return new Paginator(source);
}

/**
 * Thanh phân trang đặt ngay dưới danh sách. Danh sách rỗng thì ẩn hẳn.
 * Số trang hiển thị gọn: trang đầu, trang cuối và hai trang quanh trang đang xem.
 */
@Component({
  selector: 'app-pager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'route-host' },
  template: `
    @if (p().total() > 0) {
      <nav class="pager" aria-label="Phân trang">
        <span class="sub">
          {{ p().from() }}–{{ p().to() }} / {{ p().total() }}
        </span>
        <label class="pager-size">
          <span class="sub">Mỗi trang</span>
          <select [value]="p().size()" (change)="p().setSize(+val($event))" aria-label="Số dòng mỗi trang">
            @for (s of sizes; track s) {
              <option [value]="s" [selected]="s === p().size()">{{ s }}</option>
            }
          </select>
        </label>
        <div class="pager-pages">
          <button
            type="button"
            class="btn sm quiet"
            [disabled]="p().page() === 1"
            aria-label="Trang trước"
            (click)="p().go(p().page() - 1)"
          >
            ‹
          </button>
          @for (n of pages(); track $index) {
            @if (n === 0) {
              <span class="sub" aria-hidden="true">…</span>
            } @else {
              <button
                type="button"
                class="btn sm"
                [class.quiet]="n !== p().page()"
                [attr.aria-current]="n === p().page() ? 'page' : null"
                (click)="p().go(n)"
              >
                {{ n }}
              </button>
            }
          }
          <button
            type="button"
            class="btn sm quiet"
            [disabled]="p().page() === p().pageCount()"
            aria-label="Trang sau"
            (click)="p().go(p().page() + 1)"
          >
            ›
          </button>
        </div>
      </nav>
    }
  `,
})
export class Pager {
  readonly p = input.required<Paginator<unknown>>({ alias: 'pager' });
  protected readonly sizes = PAGE_SIZES;
  protected readonly val = inputValue;

  /** Dãy số trang cần vẽ; 0 là dấu "…". */
  protected readonly pages = computed(() => {
    const count = this.p().pageCount();
    const cur = this.p().page();
    const keep = new Set([1, count, cur - 1, cur, cur + 1]);
    const out: number[] = [];
    for (let n = 1; n <= count; n++) {
      if (!keep.has(n)) continue;
      if (out.length > 0 && n - out[out.length - 1] > 1) out.push(0);
      out.push(n);
    }
    return out;
  });
}
