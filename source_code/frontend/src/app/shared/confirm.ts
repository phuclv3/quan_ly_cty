import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injectable,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { inputValue } from './dom';
import { Icon } from './icon';

export interface ConfirmOptions {
  /** Câu hỏi, VD Duyệt 3 chứng từ? */
  title: string;
  /** Giải thích hậu quả, hiện dưới câu hỏi. */
  message?: string;
  /** Nhãn nút đồng ý. Mặc định "Đồng ý". */
  ok?: string;
  /** Nhãn nút thôi. Mặc định "Thôi". */
  cancel?: string;
  /** Dòng cảnh báo phụ. */
  warn?: string;
  /** Tông màu; bỏ trống thì tự đoán theo nhãn nút (Xoá / Huỷ / Khoá / Từ chối… → danger). */
  tone?: 'default' | 'danger';
}

export interface PromptOptions extends ConfirmOptions {
  /** Nhãn ô nhập lý do. */
  label: string;
  placeholder?: string;
  /** Số ký tự tối thiểu (đã bỏ khoảng trắng hai đầu); 0 là không bắt buộc. */
  minLength?: number;
  /** Ô nhiều dòng thay cho ô một dòng. */
  multiline?: boolean;
}

interface Pending extends Partial<PromptOptions> {
  title: string;
  input: boolean;
  resolve: (v: string | null) => void;
}

const DANGER = /xo[aá]|hu[yỷ]|kho[aá]|t[uừ] ch[oố]i|n[aạ]p l[aạ]i|r[uú]t|đặt lại/i;

/**
 * Hộp thoại xác nhận dùng chung cho cả app — mọi thao tác khó quay lại đều hỏi qua đây,
 * không dùng window.confirm / alert / prompt.
 *
 *   if (await this.confirm.ask({ title: 'Duyệt phiếu?', ok: 'Duyệt' })) …
 *   const lyDo = await this.confirm.prompt({ title: 'Từ chối?', label: 'Lý do', minLength: 3 });
 */
@Injectable({ providedIn: 'root' })
export class Confirm {
  readonly current = signal<Pending | null>(null);

  ask(o: ConfirmOptions): Promise<boolean> {
    return this.open({ ...o, input: false }).then((v) => v !== null);
  }

  /** Như ask() nhưng kèm ô nhập; trả về chuỗi đã cắt khoảng trắng, hoặc null nếu thôi. */
  prompt(o: PromptOptions): Promise<string | null> {
    return this.open({ ...o, input: true });
  }

  close(v: string | null): void {
    const c = this.current();
    if (!c) return;
    this.current.set(null);
    c.resolve(v);
  }

  private open(p: Omit<Pending, 'resolve'>): Promise<string | null> {
    this.close(null);
    return new Promise((resolve) => this.current.set({ ...p, resolve }));
  }
}

/** Gắn một lần ở app-root. */
@Component({
  selector: 'app-confirm-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (confirm.current(); as c) {
      <div class="dlg-back" (click)="confirm.close(null)">
        <div
          class="dlg"
          [class.danger]="danger()"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="cf-title"
          [attr.aria-describedby]="c.message ? 'cf-msg' : null"
          (click)="$event.stopPropagation()"
        >
          <div class="dlg-head">
            <span class="dlg-ico" aria-hidden="true"><app-icon [name]="danger() ? 'alert' : 'check'" [size]="22" /></span>
            <strong id="cf-title" class="dlg-title">{{ c.title }}</strong>
          </div>
          @if (c.message) {
            <p id="cf-msg" class="dlg-msg">{{ c.message }}</p>
          }
          @if (c.warn) {
            <div class="note warn">{{ c.warn }}</div>
          }
          @if (c.input) {
            <div class="field">
              <label for="cf-input">{{ c.label }}</label>
              @if (c.multiline) {
                <textarea #box id="cf-input" rows="3" [value]="text()" [attr.placeholder]="c.placeholder ?? null" (input)="text.set(val($event))"></textarea>
              } @else {
                <input #box id="cf-input" type="text" [value]="text()" [attr.placeholder]="c.placeholder ?? null" (input)="text.set(val($event))" (keydown.enter)="valid() && done()" />
              }
              @if ((c.minLength ?? 0) > 0) {
                <span class="hint">Bắt buộc, ít nhất {{ c.minLength }} ký tự.</span>
              }
            </div>
          }
          <div class="dlg-actions">
            <button type="button" class="btn quiet" (click)="confirm.close(null)">{{ c.cancel ?? 'Thôi' }}</button>
            <button #okBtn type="button" class="btn" [class.danger-solid]="danger()" [disabled]="!valid()" (click)="done()">{{ c.ok ?? 'Đồng ý' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  host: { '(document:keydown.escape)': 'esc($event)' },
})
export class ConfirmHost {
  protected readonly confirm = inject(Confirm);
  protected readonly text = signal('');
  protected readonly val = inputValue;

  private readonly box = viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('box');
  private readonly okBtn = viewChild<ElementRef<HTMLButtonElement>>('okBtn');

  protected readonly valid = computed(() => {
    const c = this.confirm.current();
    return !c?.input || this.text().trim().length >= (c.minLength ?? 0);
  });

  protected readonly danger = computed(() => {
    const c = this.confirm.current();
    if (!c) return false;
    if (c.tone) return c.tone === 'danger';
    return DANGER.test(c.ok ?? '') || DANGER.test(c.title);
  });

  constructor() {
    // Mỗi lần mở: xoá chữ cũ, đặt con trỏ vào ô nhập (hoặc nút đồng ý), khoá cuộn trang nền.
    effect(() => {
      const open = !!this.confirm.current();
      document.documentElement.classList.toggle('dlg-open', open);
      if (!open) return;
      this.text.set('');
      queueMicrotask(() => (this.box() ?? this.okBtn())?.nativeElement.focus());
    });
  }

  protected done(): void {
    if (!this.valid()) return;
    this.confirm.close(this.confirm.current()?.input ? this.text().trim() : '');
  }

  /** Esc chỉ đóng hộp xác nhận, không lan xuống popup bên dưới. */
  protected esc(e: Event): void {
    if (!this.confirm.current()) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    this.confirm.close(null);
  }
}
