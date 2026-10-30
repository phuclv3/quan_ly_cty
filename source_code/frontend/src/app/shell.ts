import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon, IconName } from './shared/icon';
import { Store } from './core/store';
import { Ui } from './core/ui';
import { Auth } from './core/auth';
import { Perm } from './core/perm';
import { TT } from './core/trang-thai';
import { UuTien } from './home/uu-tien';

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
        <a class="side-brand" routerLink="/" aria-label="Về trang chủ">
          <img src="brand/logo-oxymecie.png" alt="Oxy Mecie" width="399" height="160" />
          <span>Quản trị nội bộ</span>
        </a>
        @for (it of items(); track it.path) {
          @if (it.group) { <div class="grp-label">{{ it.group }}</div> }
          <a [routerLink]="it.path" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: !!it.exact }" [attr.title]="it.label">
            <app-icon [name]="it.icon" [size]="20" />
            <span class="lb">{{ it.label }}</span>
            @if ((it.count ?? 0) > 0) { <span class="count">{{ it.count }}</span> }
          </a>
        }
        <div class="foot">
          <button type="button" class="nav" title="Đổi mật khẩu" (click)="ui.doiMatKhau.set(true)"><app-icon name="key" [size]="20" /><span class="lb">Đổi mật khẩu</span></button>
          <button type="button" class="nav" title="Đăng xuất" (click)="auth.logout()"><app-icon name="logout" [size]="20" /><span class="lb">Đăng xuất</span></button>
        </div>
      </nav>
      <div class="col">
      <header class="topbar">
        <button type="button" class="burger" aria-label="Mở / thu gọn menu" (click)="ui.toggleNav()"><app-icon name="menu" [size]="24" /></button>
        <a class="brand m-brand" routerLink="/" aria-label="Về trang chủ"><img src="brand/logo-oxymecie.png" alt="Oxy Mecie" height="40" /></a>
        <div class="search">
          <app-icon name="search" [size]="18" />
          <input #o type="search" placeholder="Tìm khách hàng, MST, số điện thoại…" aria-label="Tìm nhanh" autocomplete="off"
                 [value]="q()" (input)="q.set($any($event.target).value)" (keydown.escape)="q.set('')" />
          <button type="button" class="kbd" [attr.aria-label]="'Tìm nhanh (' + phimTat + ')'" [title]="'Tìm nhanh (' + phimTat + ')'" (click)="o.focus()">{{ phimTat }}</button>
          @if (ketQua().length) {
            <ul class="search-res">
              @for (r of ketQua(); track r.link) {
                <li><a [routerLink]="r.link" (click)="q.set('')"><b>{{ r.nhan }}</b><span class="sub">{{ r.loai }} · {{ r.phu }}</span></a></li>
              }
            </ul>
          }
        </div>
        <span class="spacer"></span>
        @if (store.canView('viec')) {
          <a class="bell" routerLink="/viec" title="Công việc và cảnh báo" [attr.aria-label]="'Công việc và cảnh báo: ' + soViec() + ' việc chưa xong'">
            <app-icon name="mail" [size]="20" />
            @if (soViec() > 0) { <i class="bell-n">{{ soViec() > 99 ? '99+' : soViec() }}</i> }
          </a>
        }
        @if (store.canView('viec')) {
          <div class="notif">
            <button type="button" class="bell" [class.on]="moTB()" aria-haspopup="true" [attr.aria-expanded]="moTB()"
                    title="Ưu tiên điều hành hôm nay" [attr.aria-label]="'Ưu tiên điều hành hôm nay: ' + soThongBao() + ' mục'" (click)="moTB.set(!moTB())">
              <app-icon name="bell" [size]="20" />
              @if (soThongBao() > 0) { <i class="bell-n" [class.khan]="cbKhanCap() > 0">{{ soThongBao() > 99 ? '99+' : soThongBao() }}</i> }
            </button>
            @if (moTB()) {
              <section class="notif-panel" role="dialog" aria-label="Ưu tiên điều hành hôm nay">
                <header class="np-head">
                  <b>Ưu tiên điều hành hôm nay</b>
                </header>
                <div class="np-body">
                  @if (!hang().length) {
                    <p class="np-empty">🎉 Không còn việc ưu tiên trong ngày.</p>
                  }
                  @for (r of hang().slice(0, 8); track r.key) {
                    @if (r.viecId) {
                      <a class="np-item" routerLink="/viec" [queryParams]="{ id: r.viecId }" (click)="moTB.set(false)">
                        <i [class]="'np-muc ' + (r.p0 ? 'P0' : 'P1')">{{ r.p0 ? 'P0' : 'P1' }}</i>
                        <span class="np-txt"><b>{{ r.text }}</b><small [class.qh]="r.tre > 0">{{ r.sub }}</small></span>
                      </a>
                    } @else {
                      <a class="np-item" [routerLink]="r.link" [queryParams]="r.qp" (click)="moTB.set(false)">
                        <i [class]="'np-muc ' + (r.p0 ? 'P0' : 'P1')">{{ r.p0 ? 'P0' : 'P1' }}</i>
                        <span class="np-txt"><b>{{ r.text }}</b><small>{{ r.ma ? r.ma + ' · ' : '' }}{{ r.sub }}</small></span>
                      </a>
                    }
                  }
                  @if (hang().length > 8) {
                    <a class="np-more" routerLink="/" (click)="moTB.set(false)">Còn {{ hang().length - 8 }} mục khác trên Trang chủ ›</a>
                  }
                </div>
              </section>
            }
          </div>
        }
        <div class="user-chip">
          <span class="avatar" aria-hidden="true">{{ initial() }}</span>
          <span class="who"><b>{{ store.tenNhom(auth.me()) }}</b><small>{{ auth.me()?.email }}</small></span>
        </div>
      </header>
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
      </div>

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
    const uuTien = ['/', '/hop-dong-ban', '/khach-hang', '/ke-toan', '/kho', '/hop-dong-mua', '/phu-tai'];
    const coThe = this.items();
    return uuTien.map((p) => coThe.find((x) => x.path === p)).filter((x): x is NavItem => !!x).slice(0, 4);
  });
  /** Số việc chờ ở các mục KHÔNG nằm trên thanh tab — hiện ở ô Menu. */
  protected readonly conLai = computed(() => {
    const tren = new Set(this.tabs().map((t) => t.path));
    return this.items().filter((x) => !tren.has(x.path)).reduce((s, x) => s + (x.count ?? 0), 0);
  });

  // ── Chuông: "Ưu tiên điều hành hôm nay" — cùng nguồn với bảng ở Trang chủ ──
  private readonly uu = inject(UuTien);
  protected readonly moTB = signal(false);
  protected readonly hang = computed(() => (this.store.canView('viec') ? this.uu.hang() : []));
  protected readonly soThongBao = computed(() => this.hang().length);
  /** Icon thư: tất cả việc được giao chưa xong + yêu cầu gia hạn chờ tôi (mở trang Công việc & Cảnh báo). */
  protected readonly soViec = computed(() => this.store.viecCuaToi() + this.store.ycChoToi().length);
  /** Số mục khẩn (P0) — chấm đỏ đậm. */
  protected readonly cbKhanCap = computed(() => this.hang().filter((r) => r.p0).length);
  @HostListener('document:click', ['$event'])
  protected clickNgoai(e: MouseEvent): void {
    if (this.moTB() && !(e.target as HTMLElement | null)?.closest('.notif')) this.moTB.set(false);
  }
  @HostListener('document:keydown.escape')
  protected escTB(): void { this.moTB.set(false); }

  protected readonly q = signal('');
  /** Phím tắt hiển thị theo hệ điều hành (Mac: ⌘F, còn lại: Ctrl F). */
  protected readonly phimTat = /Mac|iPhone|iPad/i.test(navigator.platform) ? '⌘ F' : 'Ctrl F';
  private readonly o = viewChild<ElementRef<HTMLInputElement>>('o');
  /** Ctrl/⌘ + F: đưa con trỏ vào ô tìm nhanh (thay tìm của trình duyệt). */
  @HostListener('document:keydown', ['$event'])
  protected phim(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      this.o()?.nativeElement.focus();
    }
  }
  protected readonly initial = computed(() => {
    const p = (this.auth.me()?.hoTen ?? '?').replace(/\(.*?\)/g, '').trim().split(/\s+/);
    return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase();
  });
  /** Tìm nhanh HĐ bán / HĐ mua / khách hàng theo số HĐ, tên, MST (tối đa 8 kết quả). */
  protected readonly ketQua = computed(() => {
    const bo = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
    const tu = bo(this.q().trim()).split(/\s+/).filter(Boolean);
    if (!tu.length || tu.join('').length < 2) return [];
    // Không phân biệt dấu/hoa thường; mọi từ gõ vào đều phải có mặt (thứ tự bất kỳ).
    const khop = (s: string) => { const t = bo(s); return tu.every((x) => t.includes(x)); };
    const out: { nhan: string; loai: string; phu: string; link: string }[] = [];
    if (this.store.canView('hdb'))
      for (const h of this.store.hdbVisible())
        if (khop(`${h.soHD} ${h.tenKH} ${h.mst}`)) out.push({ nhan: h.soHD || '(báo giá)', loai: 'HĐ bán', phu: h.tenKH, link: `/hop-dong-ban/${h.id}` });
    if (this.store.canView('hdm'))
      for (const m of this.store.hdmVisible())
        if (khop(`${m.soHD} ${m.tenNCC}`)) out.push({ nhan: m.soHD || '(chưa số)', loai: 'HĐ mua', phu: m.tenNCC, link: `/hop-dong-mua/${m.id}` });
    if (this.store.canView('khachHang'))
      for (const c of this.store.khachHang())
        if (khop(`${c.id} ${c.ten} ${c.tenVietTat ?? ''} ${c.mst} ${c.dienThoai}`))
          out.unshift({ nhan: c.tenVietTat || c.id, loai: 'Khách hàng', phu: c.ten, link: `/khach-hang/${c.id}` });
    return out.slice(0, 8);
  });

  protected readonly items = computed<NavItem[]>(() => {
    const all: NavItem[] = [
      { path: '/', label: 'Trang chủ', icon: 'home', perms: null, exact: true, group: 'Điều hành' },
      { path: '/viec', label: 'Công việc & Cảnh báo', short: 'Việc', icon: 'list', perms: ['viec'], count: this.soViec(), group: 'Điều hành' },
      { path: '/khach-hang', label: 'Khách hàng', short: 'Khách', icon: 'contact', perms: ['khachHang'], group: 'Nghiệp vụ' },
      { path: '/hop-dong-ban', label: 'Hợp đồng bán', short: 'HĐ bán', icon: 'sell', perms: ['hdb'], group: 'Nghiệp vụ' },
      { path: '/nha-cung-cap', label: 'Nhà cung cấp', short: 'NCC', icon: 'truck', perms: ['ncc'], group: 'Nghiệp vụ' },
      { path: '/hop-dong-mua', label: 'Hợp đồng mua', short: 'HĐ mua', icon: 'buy', perms: ['hdm'], group: 'Nghiệp vụ' },
      { path: '/kho', label: 'Kho & Giao hàng', short: 'Kho', icon: 'box', perms: ['khoTon'], group: 'Nghiệp vụ' },
      { path: '/ke-toan', label: 'Tài chính – Kế toán', short: 'Kế toán', icon: 'wallet', perms: ['soQuy', 'congNo', 'cpHD', 'nguonTien'], count: this.choDuyetKT(), group: 'Nghiệp vụ' },
      { path: '/phu-tai', label: 'Phú Tài', icon: 'chart', perms: ['phuTai'], group: 'Nghiệp vụ' },
      { path: '/duyet-xoa', label: 'Phê duyệt', icon: 'check', perms: ['duyetXoa', 'duyetXoaKT'], count: this.choXoa(), group: 'Quản trị hệ thống' },
      { path: '/tai-khoan', label: 'Người dùng & Phân quyền', icon: 'users', perms: ['taiKhoan'], group: 'Quản trị hệ thống' },
      { path: '/cau-hinh', label: 'Cài đặt', icon: 'settings', perms: ['cauHinh'], group: 'Quản trị hệ thống' },
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
