import { ChangeDetectionStrategy, Component, computed, inject, input, model, signal } from '@angular/core';
import { Store } from '../core/store';
import { fold } from '../core/util';
import { chuVietTat, mauAvatar } from './avatar';
import { Icon } from './icon';

/**
 * Chọn nhiều người trong công ty: chip (avatar + tên + ×) và ô tìm dạng viên thuốc, danh sách người dùng mở ngay bên dưới.
 * Gõ tên / email (không dấu) để lọc; bấm một dòng để thêm. Dùng cho người tham gia lịch hẹn, người nhận việc.
 * ids: Id tài khoản đã chọn (two-way). Người đang đăng nhập không có trong danh sách chọn — luôn là người tạo.
 */
@Component({
  selector: 'app-nguoi-them',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  styles: `
    :host { display: grid; gap: 6px; }
    .chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .lb { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
    .av { display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; color: #fff; font-size: 9px; font-weight: 700; flex: 0 0 auto; }
    .tag-me, .tag-u { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 4px; border-radius: 999px; background: #fff; border: 1px solid var(--line-2); font-size: 12.5px; }
    .tag-me i { color: var(--ink-3); font-style: normal; }
    .tag-u button { border: 0; background: none; cursor: pointer; font-size: 15px; line-height: 1; color: var(--ink-3); padding: 0 0 0 2px; }
    .tag-u button:hover { color: #c0392b; }
    .box { display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; border-radius: 999px; background: #fff; border: 1px solid var(--line-2); color: var(--ink-3); }
    .box.open { border-color: #4bb04f; box-shadow: 0 0 0 3px rgba(75, 176, 79, 0.18); }
    .box input { flex: 1 1 auto; min-width: 0; height: 100%; border: 0; background: transparent; box-shadow: none; padding: 0; font-size: 13px; color: var(--ink); }
    .box input:focus { outline: none; box-shadow: none; }
    .ds { list-style: none; margin: 0; padding: 4px; max-height: 188px; overflow: auto; background: #fff; border: 1px solid var(--line); border-radius: 14px; display: grid; gap: 2px; }
    .ds button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px 8px; border: 0; background: none; border-radius: 10px; text-align: left; cursor: pointer; }
    .ds button:hover { background: #eef8f0; }
    .nm { display: grid; min-width: 0; flex: 1 1 auto; }
    .nm b { font-size: 13px; }
    .nm small { font-size: 11.5px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .them { font-size: 12px; font-weight: 700; color: #138a4a; }
    .rong { padding: 10px; text-align: center; font-size: 12.5px; color: var(--ink-3); }
  `,
  template: `
    @if (nhan()) { <span class="lb">{{ nhan() }}</span> }
    <div class="chips">
      @if (coBan()) {
        <span class="tag-me"><span class="av" [style.background]="mau(me())">{{ vt(store.userName(me())) }}</span>{{ store.userName(me()) }} <i>(bạn)</i></span>
      }
      @for (id of ids(); track id) {
        <span class="tag-u"><span class="av" [style.background]="mau(id)">{{ vt(store.userName(id)) }}</span>{{ store.userName(id) }}<button type="button" [attr.aria-label]="'Bỏ ' + store.userName(id)" (click)="bo(id)">×</button></span>
      }
    </div>
    <div class="box" [class.open]="mo()">
      <app-icon name="search" [size]="14" />
      <input type="text" autocomplete="off" [placeholder]="placeholder()" [attr.aria-label]="placeholder()"
        [value]="q()" (input)="q.set($any($event.target).value)" (focus)="mo.set(true)" (blur)="mo.set(false)" />
    </div>
    @if (mo()) {
      <ul class="ds" role="listbox" aria-label="Danh sách người dùng">
        @for (o of ds(); track o.value) {
          <li>
            <button type="button" role="option" (mousedown)="$event.preventDefault()" (click)="them(o.value)">
              <span class="av" [style.background]="mau(o.value)">{{ vt(o.label) }}</span>
              <span class="nm"><b>{{ o.label }}</b><small>{{ o.hint }}</small></span>
              <span class="them">+ Thêm</span>
            </button>
          </li>
        } @empty {
          <li class="rong">{{ q() ? 'Không có người phù hợp' : 'Đã chọn hết mọi người' }}</li>
        }
      </ul>
    }
  `,
})
export class NguoiThem {
  protected readonly store = inject(Store);
  protected readonly mau = mauAvatar;
  protected readonly vt = chuVietTat;
  /** Id tài khoản đã chọn (không gồm người đang đăng nhập). */
  readonly ids = model<string[]>([]);
  /** Nhãn phía trên ('' = không hiện). */
  readonly nhan = input('');
  readonly placeholder = input('Thêm người — gõ tên hoặc email');
  /** Hiện chip "(bạn)" của người đang đăng nhập. */
  readonly coBan = input(true);

  protected readonly q = signal('');
  protected readonly mo = signal(false);
  protected readonly me = computed(() => this.store.meId() ?? '');
  /** Mọi tài khoản đang hoạt động chưa được chọn, lọc theo ô tìm (không dấu). */
  protected readonly ds = computed(() => {
    const q = fold(this.q()).trim();
    return this.store
      .nguoiOpts()
      .filter((o) => o.value !== this.me() && !this.ids().includes(o.value))
      .filter((o) => !q || fold(o.label + ' ' + o.hint).includes(q));
  });

  protected them(id: string): void {
    if (id && !this.ids().includes(id)) this.ids.update((x) => [...x, id]);
    this.q.set('');
  }
  protected bo(id: string): void {
    this.ids.update((x) => x.filter((i) => i !== id));
  }
}
