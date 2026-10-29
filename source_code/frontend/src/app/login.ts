import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Icon } from './shared/icon';
import { Auth } from './core/auth';
import { CONG_TY } from './core/cong-ty';
import { KiemTra } from './shared/kiem-tra';

/** NT-01: đăng nhập email + mật khẩu (nút hiện/ẩn). Thông báo lỗi chung, không lộ email có tồn tại. */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, KiemTra],
  styles: `
    .btn-login { display: inline-flex; align-items: center; justify-content: center; gap: 10px; }
    .btn-login:disabled { opacity: 1; cursor: progress; filter: saturate(0.85); }
    /* Vòng xoay gradient: conic-gradient + mask khoét giữa, đầu vòng mờ dần. */
    .spin {
      width: 18px; height: 18px; flex: none; border-radius: 50%;
      background: conic-gradient(from 0deg, rgb(255 255 255 / 0) 0%, currentColor 100%);
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
      mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
      animation: lg-xoay 0.75s cubic-bezier(0.5, 0.15, 0.5, 0.85) infinite;
    }
    @keyframes lg-xoay { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .spin { animation-duration: 2s; } }
  `,
  template: `
    <div class="login-wrap">
      <form class="card login-card" appKiemTra #ktLg="kiemTra" (submit)="$event.preventDefault(); go()">
        <div class="brand-big">
          <span class="brand-logo wide"><img src="brand/logo-oxymecie.png" alt="Logo Oxy Mecie" width="399" height="160" /></span>
          <span class="sub">Phần mềm quản lý nội bộ</span>
        </div>
        <div class="login-head">
          <h1>Đăng nhập</h1>
          <p class="muted">Dùng email và mật khẩu được cấp để vào hệ thống.</p>
        </div>
        <div class="field">
          <label for="lg-email">Email <span class="req">*</span></label>
          <input id="lg-email" type="text" autocomplete="username" required [value]="email()" (input)="email.set($any($event.target).value)" />
        </div>
        <div class="field">
          <label for="lg-pw">Mật khẩu <span class="req">*</span></label>
          <div class="pw">
            <input id="lg-pw" [type]="show() ? 'text' : 'password'" autocomplete="current-password" required [value]="pw()" (input)="pw.set($any($event.target).value)" />
            <button type="button" class="icon-btn" [attr.aria-label]="show() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" (click)="show.set(!show())"><app-icon [name]="show() ? 'lock' : 'eye'" /></button>
          </div>
        </div>
        @if (err()) { <div class="note bad" role="alert">{{ err() }}</div> }
        <button class="btn btn-login" type="submit" [disabled]="busy()" [attr.aria-busy]="busy()">
          @if (busy()) { <span class="spin" aria-hidden="true"></span> }
          <span>{{ busy() ? 'Đang đăng nhập…' : 'Đăng nhập' }}</span>
        </button>
      </form>
      <footer class="login-ct">
        <b>{{ congTy.ten }}</b>
        <span>MST: {{ congTy.mst }}</span>
        <span>{{ congTy.diaChi }}</span>
        <span>Hotline: <a [href]="'tel:' + congTy.hotline">{{ congTy.hotline }}</a> · Email: <a [href]="'mailto:' + congTy.email">{{ congTy.email }}</a></span>
      </footer>
    </div>
  `,
})
export class Login {
  private readonly ktLg = viewChild('ktLg', { read: KiemTra });
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly email = signal('');
  protected readonly pw = signal('');
  protected readonly show = signal(false);
  protected readonly err = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly congTy = CONG_TY;

  protected async go(): Promise<void> {
    if (this.ktLg()?.hopLe() === false) return;
    this.busy.set(true);
    const err = await this.auth.login(this.email(), this.pw());
    this.err.set(err);
    if (err) this.busy.set(false);
    else {
      const next = this.route.snapshot.queryParamMap.get('next');
      await this.router.navigateByUrl(next && next.startsWith('/') ? next : '/');
    }
  }
}
