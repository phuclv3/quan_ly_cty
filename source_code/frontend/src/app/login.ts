import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Icon } from './shared/icon';
import { Auth } from './core/auth';
import { MAT_KHAU_DEMO, TAI_KHOAN_DEMO } from './core/seed';

/** NT-01: đăng nhập email + mật khẩu (nút hiện/ẩn). Thông báo lỗi chung, không lộ email có tồn tại. */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="login-wrap">
      <form class="card login-card" (submit)="$event.preventDefault(); go()">
        <div class="brand-big">
          <span class="brand-logo"><img src="brand/logo-oxy.png" alt="Logo Oxy Mecie" width="38" height="46" /></span>
          <div>
            <h1 style="color: var(--brand)">Oxy <span style="color: var(--leaf)">Mecie</span></h1>
            <span class="sub">Quản lý nội bộ · Kế toán · Kinh doanh · Kho · Phú Tài</span>
          </div>
        </div>
        <div class="field">
          <label for="lg-email">Email</label>
          <input id="lg-email" type="email" autocomplete="username" required [value]="email()" (input)="email.set($any($event.target).value)" />
        </div>
        <div class="field">
          <label for="lg-pw">Mật khẩu</label>
          <div class="pw">
            <input id="lg-pw" [type]="show() ? 'text' : 'password'" autocomplete="current-password" required [value]="pw()" (input)="pw.set($any($event.target).value)" />
            <button type="button" class="icon-btn" [attr.aria-label]="show() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" (click)="show.set(!show())"><app-icon [name]="show() ? 'lock' : 'eye'" /></button>
          </div>
        </div>
        @if (err()) { <div class="note bad" role="alert">{{ err() }}</div> }
        <button class="btn" type="submit" [disabled]="busy()">{{ busy() ? 'Đang đăng nhập…' : 'Đăng nhập' }}</button>

        <details class="demo-list">
          <summary class="muted">Tài khoản chạy thử (mật khẩu {{ demoPw }})</summary>
          @for (t of demo; track t.email) {
            <button type="button" class="linkish" (click)="email.set(t.email); pw.set(demoPw)">{{ t.email }} — {{ t.nhan }}</button>
          }
        </details>
      </form>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly email = signal('');
  protected readonly pw = signal('');
  protected readonly show = signal(false);
  protected readonly err = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly demo = TAI_KHOAN_DEMO;
  protected readonly demoPw = MAT_KHAU_DEMO;

  protected async go(): Promise<void> {
    this.busy.set(true);
    const err = await this.auth.login(this.email(), this.pw());
    this.busy.set(false);
    this.err.set(err);
    if (!err) {
      const next = this.route.snapshot.queryParamMap.get('next');
      await this.router.navigateByUrl(next && next.startsWith('/') ? next : '/');
    }
  }
}
