import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ConfirmHost } from './shared/confirm';
import { Modal } from './shared/ui-kit';
import { dangTaoTep } from './shared/export';
import { Unsaved } from './shared/unsaved';
import { applyLabels } from './shared/stack-table';
import { batNgayVi } from './shared/ngay-vi';
import { Auth } from './core/auth';
import { Store } from './core/store';
import { Ui } from './core/ui';
import { MAT_KHAU_TOI_THIEU } from './core/crypto';

/** Khung ngoài: thanh trên (NT-06), toast, hộp xác nhận, popup đổi mật khẩu (NT-02). */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ConfirmHost, Modal],
  template: `
    @if (store.ready() && auth.mustChange()) {
      <!-- NT-02: bắt buộc đổi mật khẩu — chưa vào app, không hiện dữ liệu phía sau. -->
      <main class="main empty">Đổi mật khẩu để tiếp tục.</main>
    } @else if (store.ready()) {
      <router-outlet />
    } @else if (store.loadError()) {
      <main class="main"><div class="note bad">Không tải được dữ liệu: {{ store.loadError() }}</div></main>
    } @else {
      <main class="main empty" aria-busy="true">Đang tải dữ liệu…</main>
    }

    <app-modal #mPw [open]="pwOpen()" [title]="auth.mustChange() ? 'Bắt buộc đổi mật khẩu' : 'Đổi mật khẩu'" size="sm" [closable]="!auth.mustChange()" [dirty]="pwDirty()" (closed)="closePw()">
      @if (auth.mustChange()) {
        <div class="note warn">Tài khoản vừa được cấp / đặt lại mật khẩu. Đổi mật khẩu để vào ứng dụng.</div>
      }
      <div class="field"><label for="pw-old">Mật khẩu cũ <span class="req">*</span></label><input id="pw-old" type="password" autocomplete="current-password" [value]="pw().cu" (input)="setPw('cu', $any($event.target).value)" /></div>
      <div class="field"><label for="pw-new">Mật khẩu mới <span class="req">*</span></label><input id="pw-new" type="password" autocomplete="new-password" [value]="pw().moi" (input)="setPw('moi', $any($event.target).value)" />
        <span class="hint">Ít nhất {{ min }} ký tự, khác mật khẩu cũ.</span></div>
      <div class="field"><label for="pw-new2">Nhập lại mật khẩu mới <span class="req">*</span></label><input id="pw-new2" type="password" autocomplete="new-password" [value]="pw().lai" (input)="setPw('lai', $any($event.target).value)" (keydown.enter)="savePw()" /></div>
      @if (pwErr()) { <div class="note bad">{{ pwErr() }}</div> }
      <ng-container foot>
        @if (auth.mustChange()) {
          <button type="button" class="btn quiet" (click)="auth.logout()">Đăng xuất</button>
        } @else {
          <button type="button" class="btn quiet" (click)="closePw()">Huỷ</button>
        }
        <button type="button" class="btn" (click)="savePw()">Đổi mật khẩu</button>
      </ng-container>
    </app-modal>

    <app-confirm-host />
    @if (dangTaoTep() > 0) {
      <div class="tao-tep-back" role="status" aria-live="polite"><div class="tao-tep"><span class="tao-tep-spin" aria-hidden="true"></span>Đang tạo file…</div></div>
    }
    @if (store.toast()) {
      <div class="toast" [class.bad]="store.toastTone() === 'bad'" [attr.role]="store.toastTone() === 'bad' ? 'alert' : 'status'">{{ store.toast() }}</div>
    }
  `,
  host: { '(window:beforeunload)': 'truocKhiThoat($event)' },
})
export class App {
  private readonly mPw = viewChild<Modal>('mPw');
  protected readonly store = inject(Store);
  protected readonly dangTaoTep = dangTaoTep;
  protected readonly auth = inject(Auth);
  protected readonly ui = inject(Ui);
  protected readonly min = MAT_KHAU_TOI_THIEU;

  protected readonly vaiTro = computed(() => this.store.tenNhom(this.auth.me()));
  protected readonly initial = computed(() => {
    // Bỏ phần trong ngoặc, VD "Giám đốc (demo)" → chữ đầu của "đốc".
    const parts = (this.auth.me()?.hoTen ?? '?').replace(/\(.*?\)/g, '').trim().split(/\s+/);
    return (parts[parts.length - 1] || '?').charAt(0).toUpperCase();
  });

  protected readonly pwOpen = computed(() => this.auth.mustChange() || this.ui.doiMatKhau());
  protected readonly pw = signal({ cu: '', moi: '', lai: '' });
  protected readonly pwErr = signal<string | null>(null);
  protected readonly pwDirty = computed(() => !this.auth.mustChange() && Object.values(this.pw()).some((v) => !!v));
  private readonly unsaved = inject(Unsaved);

  constructor() {
    // Mỗi lần mở popup đổi mật khẩu (từ menu): xoá chữ và lỗi cũ.
    effect(() => {
      if (!this.pwOpen()) return;
      untracked(() => {
        this.pw.set({ cu: '', moi: '', lai: '' });
        this.pwErr.set(null);
      });
    });
    inject(Router).events.subscribe((e) => {
      if (e instanceof NavigationEnd) this.ui.closeDrawer();
    });
    // Bảng xếp thẻ trên điện thoại: chép chữ <th> vào data-label của từng <td> cho MỌI
    // table.tbl (CSS ở styles.css, khối "Di động"). Theo dõi thêm/bớt dòng bằng
    // MutationObserver; gom lần chạy theo khung hình để không chạy lại liên tục.
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      destroy.onDestroy(batNgayVi());
      let queued = false;
      const run = () => {
        queued = false;
        document.querySelectorAll<HTMLTableElement>('table.tbl').forEach(applyLabels);
      };
      const mo = new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(run);
      });
      mo.observe(document.body, { childList: true, subtree: true, characterData: true });
      run();
      destroy.onDestroy(() => mo.disconnect());
    });
  }

  /** Đóng tab / tải lại khi còn thay đổi chưa lưu → trình duyệt hỏi (NT-05). */
  protected truocKhiThoat(e: BeforeUnloadEvent): void {
    if (!this.unsaved.any()) return;
    e.preventDefault();
    e.returnValue = '';
  }
  protected closePw(): void {
    if (this.auth.mustChange()) return;
    this.ui.doiMatKhau.set(false);
  }
  protected setPw(k: 'cu' | 'moi' | 'lai', v: string): void {
    this.pw.update((p) => ({ ...p, [k]: v }));
  }
  protected async savePw(): Promise<void> {
    if (this.mPw()?.kt.hopLe() === false) return;
    const p = this.pw();
    const err = await this.auth.doiMatKhau(p.cu, p.moi, p.lai);
    this.pwErr.set(err);
    if (!err) {
      this.ui.doiMatKhau.set(false);
      this.pw.set({ cu: '', moi: '', lai: '' });
      this.store.say('Đã đổi mật khẩu');
    }
  }
}
