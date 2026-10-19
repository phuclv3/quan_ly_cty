/**
 * Thành phần giao diện dùng chung (NT-08): popup, nhãn trạng thái, ô tiền, ô chọn có tìm kiếm,
 * chọn nhiều, bảng từng bước tính. Không dùng FormsModule — giá trị bind bằng [value]/(input)
 * hoặc model() signal.
 */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from './icon';
import { Confirm } from './confirm';
import { HOI_BO_THAY_DOI, canhBaoChuaLuu } from './unsaved';
import { Buoc } from '../core/calc';
import { fold, money, parseMoney, pct } from '../core/util';

// ── Popup ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { '(document:keydown.escape)': 'esc()' },
  template: `
    @if (open()) {
      <div class="modal-back" (click)="tryClose()">
        <section class="modal" [class]="'modal ' + size()" role="dialog" aria-modal="true" [attr.aria-label]="title()" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>{{ title() }}</h2>
            @if (sub()) { <span class="sub">{{ sub() }}</span> }
            @if (closable()) {
              <button type="button" class="icon-btn" aria-label="Đóng" (click)="tryClose()"><app-icon name="x" /></button>
            }
          </header>
          <div class="modal-body"><ng-content /></div>
          <footer class="modal-foot"><ng-content select="[foot]" /></footer>
        </section>
      </div>
    }
  `,
})
export class Modal {
  private readonly confirm = inject(Confirm);
  readonly open = input(false);
  readonly title = input('');
  readonly sub = input('');
  /** sm 440px · md 720px · lg 1100px */
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** Còn thay đổi chưa lưu: đóng bằng nền / ✕ / Esc, hoặc rời màn, đều hỏi trước (NT-05). */
  readonly dirty = input(false);
  /** false: không có ✕, bấm nền / Esc không đóng (VD bắt buộc đổi mật khẩu). */
  readonly closable = input(true);
  readonly closed = output<void>();

  constructor() {
    canhBaoChuaLuu(() => this.open() && this.dirty());
  }

  protected async tryClose(): Promise<void> {
    if (!this.closable()) return;
    if (this.dirty() && !(await this.confirm.ask(HOI_BO_THAY_DOI))) return;
    this.closed.emit();
  }
  protected esc(): void {
    if (this.open() && !this.confirm.current()) void this.tryClose();
  }
}

// ── Nhãn trạng thái (màu theo nghĩa) ────────────────────────────────────

const TONE: Record<string, string> = {
  'Báo giá': 'mute',
  Nháp: 'mute',
  'Chưa giao': 'mute',
  'Chưa': 'mute',
  'Hiệu lực': 'info',
  'Đã ký': 'info',
  'Đang giao hàng': 'warn',
  'Đang giao': 'warn',
  'Đang nhận hàng': 'warn',
  'Đang thực hiện': 'warn',
  'Chờ duyệt': 'warn',
  'Chờ xoá': 'bad',
  'Hoàn thành': 'ok',
  'Đã nhận đủ': 'ok',
  'Đã giao': 'ok',
  'Đã duyệt': 'ok',
  'Đã': 'ok',
  'Đang dùng': 'ok',
  'Hoạt động': 'ok',
  'Đủ hồ sơ': 'ok',
  'Đã tất toán': 'done',
  'Từ chối': 'bad',
  Huỷ: 'bad',
  'Đã huỷ': 'bad',
  Khoá: 'bad',
  'Thiếu hồ sơ': 'bad',
  'Quá hạn': 'bad',
  Ngưng: 'mute',
  'Đã rút': 'mute',
  'Hiệu lực ': 'ok',
  'Thuộc Phú Tài': 'pt',
  Import: 'mute',
};

@Component({
  selector: 'app-tt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="tag" [class]="'tag ' + tone()">{{ v() }}</span>`,
})
export class TrangThai {
  readonly v = input.required<string>();
  readonly t = input<string>('');
  protected readonly tone = computed(() => this.t() || TONE[this.v()] || 'mute');
}

// ── Ô tiền: hiện 1.234.567, trả số ─────────────────────────────────────

@Component({
  selector: 'app-money',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      #box
      class="num"
      inputmode="decimal"
      [id]="inputId()"
      [attr.placeholder]="placeholder() || null"
      [disabled]="disabled()"
      [value]="text()"
      (focus)="focused.set(true)"
      (blur)="commit(box.value)"
      (keydown.enter)="commit(box.value)"
      (input)="live(box.value)"
    />
  `,
})
export class MoneyInput {
  readonly value = model(0);
  readonly disabled = input(false);
  readonly placeholder = input('');
  readonly inputId = input('');
  /** Cho phép số thập phân (đơn giá ngoại tệ, tỷ giá). */
  readonly decimals = input(0);
  protected readonly focused = signal(false);
  protected readonly text = computed(() =>
    this.decimals() > 0 ? (this.value() ? this.value().toLocaleString('vi-VN', { maximumFractionDigits: this.decimals() }) : '') : this.value() ? money(this.value()) : '',
  );
  protected live(raw: string): void {
    const n = parseMoney(raw);
    this.value.set(this.decimals() > 0 ? n : Math.round(n));
  }
  protected commit(raw: string): void {
    this.focused.set(false);
    this.live(raw);
  }
}

// ── Ô chọn có tìm kiếm ─────────────────────────────────────────────────

export interface PickOption {
  value: string;
  label: string;
  hint?: string;
}

@Component({
  selector: 'app-pick',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'pick', '(document:click)': 'outside($event)' },
  template: `
    <button type="button" class="pick-btn" [id]="inputId()" [disabled]="disabled()" (click)="toggle()" [attr.aria-expanded]="open()">
      <span class="pick-val" [class.muted]="!current()">{{ current()?.label || placeholder() }}</span>
      @if (current()?.hint) { <small class="muted">{{ current()?.hint }}</small> }
      <app-icon name="chevron" [size]="16" />
    </button>
    @if (open()) {
      <div class="pick-pop">
        <input #q class="pick-q" placeholder="Gõ để tìm…" [value]="query()" (input)="query.set(q.value)" (keydown.escape)="open.set(false)" (keydown.enter)="first()" />
        <ul role="listbox">
          @if (allowEmpty()) { <li><button type="button" (click)="choose('')" class="muted">— Bỏ chọn —</button></li> }
          @for (o of filtered(); track o.value) {
            <li>
              <button type="button" [class.on]="o.value === value()" (click)="choose(o.value)">
                <span>{{ o.label }}</span>
                @if (o.hint) { <small class="muted">{{ o.hint }}</small> }
              </button>
            </li>
          } @empty {
            <li class="muted pick-empty">Không có kết quả</li>
          }
        </ul>
      </div>
    }
  `,
})
export class Pick {
  readonly options = input.required<PickOption[]>();
  readonly value = model('');
  readonly placeholder = input('— Chọn —');
  readonly disabled = input(false);
  readonly allowEmpty = input(false);
  readonly inputId = input('');
  protected readonly open = signal(false);
  protected readonly query = signal('');
  private readonly q = viewChild<ElementRef<HTMLInputElement>>('q');
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly current = computed(() => this.options().find((o) => o.value === this.value()));
  protected readonly filtered = computed(() => {
    const words = fold(this.query()).split(/\s+/).filter(Boolean);
    const out = this.options().filter((o) => {
      const hay = fold(`${o.label} ${o.hint ?? ''} ${o.value}`);
      return words.every((w) => hay.includes(w));
    });
    return out.slice(0, 80);
  });
  constructor() {
    effect(() => {
      if (this.open()) queueMicrotask(() => this.q()?.nativeElement.focus());
    });
  }
  protected toggle(): void {
    this.query.set('');
    this.open.update((v) => !v);
  }
  protected choose(v: string): void {
    this.value.set(v);
    this.open.set(false);
  }
  protected first(): void {
    const f = this.filtered()[0];
    if (f) this.choose(f.value);
  }
  protected outside(e: Event): void {
    if (this.open() && !this.el.nativeElement.contains(e.target as Node)) this.open.set(false);
  }
}

// ── Chọn nhiều (bộ lọc) ─────────────────────────────────────────────────

@Component({
  selector: 'app-multi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'pick multi', '(document:click)': 'outside($event)' },
  template: `
    <button type="button" class="pick-btn" (click)="open.set(!open())" [attr.aria-expanded]="open()" [class.has]="value().length > 0">
      <span class="pick-val">{{ label() }}@if (value().length) {: <b>{{ value().length === 1 ? nameOf(value()[0]) : value().length + ' mục' }}</b>}</span>
      <app-icon name="chevron" [size]="16" />
    </button>
    @if (open()) {
      <div class="pick-pop">
        <ul>
          @for (o of options(); track o.value) {
            <li>
              <label class="check-row">
                <input type="checkbox" [checked]="value().includes(o.value)" (change)="flip(o.value)" />
                <span>{{ o.label }}</span>
              </label>
            </li>
          }
        </ul>
        @if (value().length) { <button type="button" class="btn sm quiet" (click)="value.set([])">Bỏ chọn tất cả</button> }
      </div>
    }
  `,
})
export class Multi {
  readonly label = input.required<string>();
  readonly options = input.required<PickOption[]>();
  readonly value = model<string[]>([]);
  protected readonly open = signal(false);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  protected nameOf(v: string): string {
    return this.options().find((o) => o.value === v)?.label ?? v;
  }
  protected flip(v: string): void {
    this.value.update((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
  }
  protected outside(e: Event): void {
    if (this.open() && !this.el.nativeElement.contains(e.target as Node)) this.open.set(false);
  }
}

// ── Bảng từng bước tính ────────────────────────────────────────────────

@Component({
  selector: 'app-buoc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table class="steps">
      <tbody>
        @for (b of rows(); track b.nhan) {
          <tr [class.main]="b.chinh">
            <th scope="row">{{ b.nhan }}</th>
            <td class="muted formula">{{ b.congThuc }}</td>
            <td class="num" [class.neg]="b.giaTri < 0">{{ b.kieu === 'pct' ? pct(b.giaTri) : money(b.giaTri) }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class BuocTable {
  readonly rows = input.required<Buoc[]>();
  protected readonly money = money;
  protected readonly pct = pct;
}

// ── Thẻ số liệu ─────────────────────────────────────────────────────────

@Component({
  selector: 'app-kpi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'kpi', '[class.bad]': "tone() === 'bad'", '[class.ok]': "tone() === 'ok'", '[class.warn]': "tone() === 'warn'" },
  template: `
    <span class="kpi-l">{{ label() }}</span>
    <b class="kpi-v num">{{ value() }}</b>
    @if (sub()) { <span class="kpi-s">{{ sub() }}</span> }
    <ng-content />
  `,
})
export class Kpi {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly sub = input('');
  readonly tone = input<'' | 'ok' | 'warn' | 'bad'>('');
}
