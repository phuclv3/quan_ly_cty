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
  untracked,
  viewChild,
} from '@angular/core';
import { Icon } from './icon';
import { KiemTra } from './kiem-tra';
import { Confirm } from './confirm';
import { HOI_BO_THAY_DOI, canhBaoChuaLuu } from './unsaved';
import { Buoc } from '../core/calc';
import { fold, money, parseMoney, pct } from '../core/util';

// ── Popup ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  // Mỗi popup là một vùng kiểm tra ô bắt buộc (shared/kiem-tra.ts) — form gọi modal.kt.hopLe() khi lưu.
  hostDirectives: [KiemTra],
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
  readonly kt = inject(KiemTra, { self: true });

  constructor() {
    canhBaoChuaLuu(() => this.open() && this.dirty());
    // Nội dung popup do màn cha dựng sẵn và giữ lại giữa các lần mở — đóng thì bỏ báo thiếu cũ.
    effect(() => {
      if (!this.open()) untracked(() => this.kt.xoa());
    });
  }

  /** Đóng như bấm ✕ (còn thay đổi thì hỏi trước) — nút Huỷ ở chân popup gọi được. */
  async tryClose(): Promise<void> {
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
  'Chờ mua': 'bad',
  'Đang mua một phần': 'warn',
  'Đã lên HĐ mua': 'ok',
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
  'Chưa liên hệ': 'mute',
  'Đang liên hệ': 'info',
  'Hợp đồng': 'ok',
  'Chưa tiếp cận': 'mute',
  'Đã báo giá': 'info',
  'Đang đàm phán': 'warn',
  'Ký hợp đồng': 'ok',
  'Đã giao hàng': 'ok',
  'Data thô': 'mute',
  'Đã phân bổ': 'info',
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

// ── Vị trí popup thả xuống ──────────────────────────────────────────────

/**
 * Popup thả xuống (ô chọn) neo theo ô bằng position: fixed — không bị khung cuộn của bảng (.tbl-wrap),
 * popup, cột ghim cắt mất. Phía dưới không đủ chỗ thì mở lên trên. Điện thoại (≤ 640px) dùng kiểu
 * sheet đáy màn hình trong styles.css nên không đặt vị trí.
 */
function viTriPop(host: HTMLElement, rongBang = false): Record<string, string> {
  if (window.innerWidth <= 640) return {};
  const r = host.getBoundingClientRect();
  const duoi = window.innerHeight - r.bottom;
  const lenTren = duoi < 280 && r.top > duoi;
  const cao = Math.max(160, Math.min(400, (lenTren ? r.top : duoi) - 12));
  return {
    position: 'fixed',
    left: `${Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 220) - 8))}px`,
    top: lenTren ? 'auto' : `${r.bottom + 4}px`,
    bottom: lenTren ? `${window.innerHeight - r.top + 4}px` : 'auto',
    'min-width': `${r.width}px`,
    ...(rongBang ? { width: `${r.width}px` } : {}),
    // Chiều cao còn lại cho danh sách (styles.css: .pick-pop ul dùng --pop-h).
    '--pop-h': `${cao}px`,
    'z-index': '160',
  };
}

/** Khi popup mở: cuộn (bất kỳ khung nào, trừ trong chính popup) hoặc đổi cỡ màn hình thì đóng. */
function dongKhiCuon(open: () => boolean, el: () => HTMLElement, dong: () => void): void {
  effect((onCleanup) => {
    if (!open()) return;
    const h = (e: Event) => {
      const t = e.target as Node | null;
      if (t instanceof Node && el().querySelector('.pick-pop')?.contains(t)) return;
      dong();
    };
    window.addEventListener('scroll', h, true);
    window.addEventListener('resize', h);
    onCleanup(() => {
      window.removeEventListener('scroll', h, true);
      window.removeEventListener('resize', h);
    });
  });
}

// ── Ô chọn có tìm kiếm ─────────────────────────────────────────────────

export interface PickOption {
  value: string;
  label: string;
  hint?: string;
  /** Chữ thêm để tìm (không hiển thị), VD tên tham chiếu của mã hàng. */
  tim?: string;
}

@Component({
  selector: 'app-pick',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'pick', '[attr.data-trong]': "value() ? null : ''", '(document:click)': 'outside($event)' },
  template: `
    <button type="button" class="pick-btn" [id]="inputId()" [disabled]="disabled()" (click)="toggle()" [attr.aria-expanded]="open()">
      <span class="pick-val" [class.muted]="!current()">{{ current()?.label || placeholder() }}</span>
      @if (current()?.hint) { <small class="muted">{{ current()?.hint }}</small> }
      <app-icon name="chevron" [size]="16" />
    </button>
    @if (open()) {
      <div class="pick-pop" [style]="pos()">
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
  protected readonly pos = signal<Record<string, string>>({});
  private readonly q = viewChild<ElementRef<HTMLInputElement>>('q');
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly current = computed(() => this.options().find((o) => o.value === this.value()));
  protected readonly filtered = computed(() => {
    const words = fold(this.query()).split(/\s+/).filter(Boolean);
    const out = this.options().filter((o) => {
      const hay = fold(`${o.label} ${o.hint ?? ''} ${o.value} ${o.tim ?? ''}`);
      return words.every((w) => hay.includes(w));
    });
    return out.slice(0, 80);
  });
  constructor() {
    effect(() => {
      if (this.open()) queueMicrotask(() => this.q()?.nativeElement.focus({ preventScroll: true }));
    });
    dongKhiCuon(this.open, () => this.el.nativeElement, () => this.open.set(false));
  }
  protected toggle(): void {
    this.query.set('');
    if (!this.open()) this.pos.set(viTriPop(this.el.nativeElement));
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

// ── Ô chọn gõ trực tiếp (combobox) ────────────────────────────────────

/** Bỏ dấu + bỏ khoảng trắng / chấm / gạch — gõ "0107 576" vẫn khớp MST "0107576519". */
const gon = (s: string) => fold(s).replace(/[\s.\-/]/g, '');
const GO_TOI_DA = 50;

/**
 * Chọn một mục bằng cách gõ ngay vào ô (tên, mã, MST… — mọi chữ trong label / hint / value), không dấu.
 * ↑ ↓ di chuyển, Enter chọn, Esc huỷ. Dùng cho danh mục dài (VD khách hàng trên HĐ bán).
 */
@Component({
  selector: 'app-pick-go',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'pick go', '[class.open]': 'open()', '[attr.data-trong]': "value() ? null : ''", '(document:click)': 'outside($event)' },
  template: `
    <input #inp type="text" role="combobox" autocomplete="off" class="go-in" [id]="inputId()" [disabled]="disabled()"
      [placeholder]="current() ? '' : placeholder()" [value]="open() ? query() : (current()?.label ?? '')"
      aria-autocomplete="list" [attr.aria-expanded]="open()" [attr.aria-controls]="inputId() + '-ds'"
      [attr.aria-activedescendant]="open() && ketQua().ds[hl()] ? inputId() + '-o' + hl() : null"
      (focus)="moRa()" (click)="moRa()" (input)="go($any($event.target).value)" (keydown)="phim($event)" />
    @if (!open() && current()?.hint) { <small class="go-hint muted">{{ current()?.hint }}</small> }
    @if (value() && !disabled()) {
      <button type="button" class="f-x" aria-label="Bỏ chọn" title="Bỏ chọn" (click)="choose('')"><app-icon name="x" [size]="14" /></button>
    } @else {
      <app-icon class="go-chev" name="chevron" [size]="16" />
    }
    @if (open()) {
      <div class="pick-pop go-pop" [style]="pos()">
        <ul role="listbox" [id]="inputId() + '-ds'">
          @for (o of ketQua().ds; track o.value; let i = $index) {
            <li>
              <button type="button" role="option" tabindex="-1" [id]="inputId() + '-o' + i" [class.on]="o.value === value()" [class.hl]="i === hl()"
                [attr.aria-selected]="o.value === value()" (mousedown)="$event.preventDefault()" (mouseenter)="hl.set(i)" (click)="choose(o.value)">
                <span>{{ o.label }}</span>
                @if (o.hint) { <small class="muted">{{ o.hint }}</small> }
              </button>
            </li>
          } @empty {
            <li class="muted pick-empty">Không có kết quả cho "{{ query() }}"</li>
          }
        </ul>
        @if (ketQua().con > 0) { <div class="go-more muted">Còn {{ ketQua().con }} mục — gõ thêm tên hoặc MST để thu hẹp</div> }
      </div>
    }
  `,
})
export class PickGo {
  readonly options = input.required<PickOption[]>();
  readonly value = model('');
  readonly placeholder = input('Gõ để tìm…');
  readonly disabled = input(false);
  readonly inputId = input('pick-go');
  protected readonly open = signal(false);
  protected readonly query = signal('');
  /** Vị trí đang tô sáng trong danh sách kết quả. */
  protected readonly hl = signal(0);
  protected readonly pos = signal<Record<string, string>>({});
  private readonly inp = viewChild<ElementRef<HTMLInputElement>>('inp');
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly current = computed(() => this.options().find((o) => o.value === this.value()));
  /** Khớp mọi từ; mục có tên / MST bắt đầu bằng chuỗi gõ xếp lên đầu. */
  protected readonly ketQua = computed(() => {
    const q = this.query().trim();
    const words = fold(q).split(/\s+/).filter(Boolean);
    const dau = gon(q);
    const khop = this.options()
      .map((o) => {
        const all = `${o.label} ${o.hint ?? ''} ${o.value} ${o.tim ?? ''}`;
        const hay = fold(all);
        const hayGon = gon(all);
        if (!words.every((w) => hay.includes(w) || hayGon.includes(gon(w)))) return null;
        const truoc = dau && (gon(o.label).startsWith(dau) || gon(o.hint ?? '').replace(/^mst/, '').startsWith(dau)) ? 0 : 1;
        return { o, truoc };
      })
      .filter((x): x is { o: PickOption; truoc: number } => !!x)
      .sort((a, b) => a.truoc - b.truoc);
    return { ds: khop.slice(0, GO_TOI_DA).map((x) => x.o), con: Math.max(0, khop.length - GO_TOI_DA) };
  });

  constructor() {
    dongKhiCuon(this.open, () => this.el.nativeElement, () => this.dong());
  }

  protected moRa(): void {
    if (this.disabled() || this.open()) return;
    this.pos.set(viTriPop(this.el.nativeElement, true));
    this.query.set('');
    const i = this.options().findIndex((o) => o.value === this.value());
    this.hl.set(i >= 0 && i < GO_TOI_DA ? i : 0);
    this.open.set(true);
  }
  protected go(v: string): void {
    if (!this.open()) this.pos.set(viTriPop(this.el.nativeElement, true));
    this.query.set(v);
    this.hl.set(0);
    this.open.set(true);
  }
  protected phim(e: KeyboardEvent): void {
    const n = this.ketQua().ds.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!this.open()) return this.moRa();
      if (n) this.hl.set((this.hl() + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
      queueMicrotask(() => this.el.nativeElement.querySelector('.go-pop .hl')?.scrollIntoView({ block: 'nearest' }));
    } else if (e.key === 'Enter') {
      if (!this.open()) return;
      e.preventDefault();
      const o = this.ketQua().ds[this.hl()];
      if (o) this.choose(o.value);
    } else if (e.key === 'Escape') {
      if (this.open()) e.stopPropagation();
      this.dong();
    } else if (e.key === 'Tab') {
      this.dong();
    }
  }
  protected choose(v: string): void {
    this.value.set(v);
    this.dong();
    if (!v) queueMicrotask(() => this.inp()?.nativeElement.focus());
  }
  private dong(): void {
    this.open.set(false);
    this.query.set('');
  }
  protected outside(e: Event): void {
    if (this.open() && !this.el.nativeElement.contains(e.target as Node)) this.dong();
  }
}

// ── Chọn nhiều (bộ lọc) ─────────────────────────────────────────────────

@Component({
  selector: 'app-multi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'pick multi', '[class.has]': 'value().length > 0', '[attr.data-trong]': "value().length ? null : ''", '(document:click)': 'outside($event)' },
  template: `
    <button type="button" class="pick-btn" (click)="bat()" [attr.aria-expanded]="open()" [class.has]="value().length > 0">
      <span class="pick-val">{{ label() }}@if (value().length) {: <b>{{ value().length === 1 ? nameOf(value()[0]) : value().length + ' mục' }}</b>}</span>
      <app-icon name="chevron" [size]="16" />
    </button>
    @if (value().length) {
      <button type="button" class="f-x" [attr.aria-label]="'Bỏ lọc ' + label()" [attr.title]="'Bỏ lọc ' + label()" (click)="value.set([]); open.set(false)"><app-icon name="x" [size]="14" /></button>
    }
    @if (open()) {
      <div class="pick-pop" [style]="pos()">
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
  protected readonly pos = signal<Record<string, string>>({});
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  constructor() {
    dongKhiCuon(this.open, () => this.el.nativeElement, () => this.open.set(false));
  }
  protected bat(): void {
    if (!this.open()) this.pos.set(viTriPop(this.el.nativeElement));
    this.open.update((v) => !v);
  }
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
