import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon, IconName } from './shared/icon';
import { Store } from './core/store';
import { Ui } from './core/ui';
import { Auth } from './core/auth';
import { Perm } from './core/perm';
import { TT } from './core/trang-thai';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  perms: Perm[] | null;
  /** Nhãn ngắn cho thanh tab đáy. */
  short?: string;
  count?: number;
  exact?: boolean;
  group?: string;
}

/**
 * Menu tổng (NT-06): Trang chủ · Hợp đồng bán · Hợp đồng mua · Kho · Kế toán · Phú Tài ·
 * Danh mục · Duyệt xoá · Quản lý tài khoản. Chỉ hiện mục người dùng có quyền Xem; mỗi mục
 * có số đếm việc chờ. Màn hẹp: menu thành ngăn kéo (☰).
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  template: `
    <div class="shell" [class.collapsed]="ui.sideCollapsed()" [class.drawer-open]="ui.drawerOpen()">
      <button type="button" class="scrim" aria-label="Đóng menu" tabindex="-1" (click)="ui.closeDrawer()"></button>
      <nav class="side" aria-label="Menu chính">
        @for (it of items(); track it.path) {
          @if (it.group) { <div class="grp-label">{{ it.group }}</div> }
          <a [routerLink]="it.path" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: !!it.exact }" [attr.title]="it.label">
            <app-icon [name]="it.icon" [size]="24" />
            <span class="lb">{{ it.label }}</span>
            @if ((it.count ?? 0) > 0) { <span class="count">{{ it.count }}</span> }
          </a>
        }
        <div class="foot">
          <button type="button" class="nav" title="Đổi mật khẩu" (click)="ui.doiMatKhau.set(true)"><app-icon name="key" [size]="24" /><span class="lb">Đổi mật khẩu</span></button>
          <button type="button" class="nav" title="Đăng xuất" (click)="auth.logout()"><app-icon name="logout" [size]="24" /><span class="lb">Đăng xuất</span></button>
        </div>
      </nav>
      <main class="main">
        @if (chuaCapQuyen()) {
          <!-- Spec 00 §3.3: tài khoản không còn nhóm quyền nào đang hoạt động. -->
          <div class="card empty" role="alert">
            <h1>Tài khoản chưa được cấp quyền</h1>
            <p>Tài khoản của bạn chưa thuộc nhóm quyền nào đang hoạt động. Liên hệ người quản trị tài khoản để được cấp quyền.</p>
            <button type="button" class="btn quiet" (click)="auth.logout()">Đăng xuất</button>
          </div>
        } @else {
          <router-outlet />
        }
      </main>

      <!-- Điện thoại: thanh tab đáy — 4 mục hay dùng (theo quyền) + Menu mở toàn bộ danh sách. -->
      <nav class="tabbar" aria-label="Lối tắt">
        @for (t of tabs(); track t.path) {
          <a [routerLink]="t.path" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: !!t.exact }" (click)="ui.closeDrawer()">
            <span class="tb-ico"><app-icon [name]="t.icon" [size]="24" />@if ((t.count ?? 0) > 0) { <i class="tb-dot">{{ t.count! > 99 ? '99+' : t.count }}</i> }</span>
            <span class="tb-lb">{{ t.short ?? t.label }}</span>
          </a>
        }
        <button type="button" [class.on]="ui.drawerOpen()" [attr.aria-expanded]="ui.drawerOpen()" (click)="ui.toggleNav()">
          <span class="tb-ico"><app-icon [name]="ui.drawerOpen() ? 'x' : 'menu'" [size]="24" />@if (conLai() > 0) { <i class="tb-dot">{{ conLai() }}</i> }</span>
          <span class="tb-lb">Menu</span>
        </button>
      </nav>
    </div>
  `,
})
export class Shell {
  protected readonly store = inject(Store);
  protected readonly ui = inject(Ui);
  protected readonly auth = inject(Auth);

  private readonly choDuyetKT = computed(() =>
    this.store.canApprove('soQuyDuyet') ? this.store.phieuChoDuyet().length + this.store.cpChoDuyet().length : 0,
  );
  /** Không thuộc nhóm quyền nào đang Hoạt động → không vào app (tránh trang chủ rỗng khó hiểu). */
  protected readonly chuaCapQuyen = computed(() => !this.store.myGroups().some((g) => g.trangThai === TT.HOAT_DONG));

  private readonly choXoa = computed(() => {
    const ys = this.store.xoaChoDuyet();
    return this.store.coQuyenDuyetXoa()
      ? ys.filter((y) => this.store.duyetXoaDuoc(y)).length
      : ys.filter((y) => y.nguoiGui === this.store.meId()).length;
  });

  /** Thanh tab đáy (điện thoại): 4 mục ưu tiên đầu tiên người dùng được xem. */
  protected readonly tabs = computed<NavItem[]>(() => {
    const uuTien = ['/', '/hop-dong-ban', '/khach-hang', '/ke-toan', '/kho', '/hop-dong-mua', '/phu-tai', '/bao-cao'];
    const coThe = this.items();
    return uuTien.map((p) => coThe.find((x) => x.path === p)).filter((x): x is NavItem => !!x).slice(0, 4);
  });
  /** Số việc chờ ở các mục KHÔNG nằm trên thanh tab — hiện ở ô Menu. */
  protected readonly conLai = computed(() => {
    const tren = new Set(this.tabs().map((t) => t.path));
    return this.items().filter((x) => !tren.has(x.path)).reduce((s, x) => s + (x.count ?? 0), 0);
  });

  protected readonly items = computed<NavItem[]>(() => {
    const all: NavItem[] = [
      { path: '/', label: 'Trang chủ', icon: 'home', perms: null, exact: true, group: '' },
      { path: '/viec', label: 'Việc được giao', short: 'Việc', icon: 'list', perms: ['viec'], count: this.store.viecCuaToi(), group: '' },
      { path: '/khach-hang', label: 'Khách hàng', short: 'Khách', icon: 'contact', perms: ['khachHang'], group: 'Kinh doanh' },
      { path: '/hop-dong-ban', label: 'Hợp đồng bán', short: 'HĐ bán', icon: 'sell', perms: ['hdb'], group: 'Kinh doanh' },
      { path: '/hop-dong-mua', label: 'Hợp đồng mua', short: 'HĐ mua', icon: 'buy', perms: ['hdm'], group: 'Kinh doanh' },
      { path: '/nha-cung-cap', label: 'Nhà cung cấp', short: 'NCC', icon: 'truck', perms: ['ncc'], group: 'Kinh doanh' },
      { path: '/kho', label: 'Kho', icon: 'box', perms: ['khoTon'], group: 'Vận hành' },
      { path: '/ke-toan', label: 'Kế toán', icon: 'wallet', perms: ['soQuy', 'congNo', 'cpHD', 'nguonTien'], count: this.choDuyetKT(), group: 'Vận hành' },
      { path: '/phu-tai', label: 'Phú Tài', icon: 'handshake', perms: ['phuTai'], group: 'Vận hành' },
      { path: '/bao-cao', label: 'Báo cáo', icon: 'chart', perms: ['baoCao'], group: 'Vận hành' },
      { path: '/duyet-xoa', label: 'Duyệt xoá', icon: 'trash', perms: ['duyetXoa', 'duyetXoaKT'], count: this.choXoa(), group: 'Hệ thống' },
      { path: '/tai-khoan', label: 'Tài khoản & phân quyền', icon: 'users', perms: ['taiKhoan'], group: 'Hệ thống' },
      { path: '/cau-hinh', label: 'Cấu hình', icon: 'settings', perms: ['cauHinh'], group: 'Hệ thống' },
    ];
    let shown = '';
    return all
      .filter((it) => !it.perms || it.perms.some((p) => this.store.canView(p)))
      .map((it) => {
        const label = it.group && it.group !== shown ? it.group : undefined;
        shown = it.group ?? shown;
        return { ...it, group: label };
      });
  });
}
