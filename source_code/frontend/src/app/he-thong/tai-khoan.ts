import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { dirtyOf } from '../shared/unsaved';
import { Auth } from '../core/auth';
import { TaiKhoan } from '../core/models';
import { MAT_KHAU_TOI_THIEU, matKhauTam } from '../core/crypto';
import { nhoLoc } from '../core/ui';
import { viMoment } from '../core/util';
import { Confirm } from '../shared/confirm';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { Modal, TrangThai } from '../shared/ui-kit';
import { Icon } from '../shared/icon';
import { NhomQuyenTab } from './nhom-quyen';
import { ChucNangTab, MaTranTab } from './chuc-nang';

type Tab = 'tai-khoan' | 'nhom' | 'chuc-nang' | 'ma-tran';
const TABS: { k: Tab; t: string }[] = [
  { k: 'tai-khoan', t: 'Tài khoản' },
  { k: 'nhom', t: 'Nhóm quyền' },
  { k: 'chuc-nang', t: 'Danh mục chức năng' },
  { k: 'ma-tran', t: 'Ma trận phân quyền' },
];

interface FormTK {
  id: string;
  hoTen: string;
  email: string;
  nhom: string[];
  matKhau: string;
}

/**
 * NT-03 / NT-04 — Tài khoản & phân quyền:
 *  - Tài khoản: tạo, sửa, gán vào nhóm (nhiều nhóm), khoá / mở khoá, đặt lại mật khẩu (NT-02).
 *  - Nhóm quyền: tạo nhóm, gán mức quyền theo MÃ CHỨC NĂNG, gán tài khoản vào nhóm.
 *  - Danh mục chức năng / Ma trận: tra cứu mã chức năng và quyền từng nhóm.
 */
@Component({
  selector: 'app-tai-khoan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, FilterBar, Pager, Modal, TrangThai, Icon, NhomQuyenTab, ChucNangTab, MaTranTab],
  template: `
    <div class="page-head">
      <div>
        <div class="crumbs"><a routerLink="/">Trang chủ</a> › Hệ thống › Tài khoản & phân quyền</div>
        <h1>Tài khoản & phân quyền</h1>
        <div class="sub">{{ store.taiKhoan().length }} tài khoản · {{ store.nhomQuyen().length }} nhóm quyền · quyền gán theo mã chức năng</div>
      </div>
      <div class="actions">
        @if (sua() && tab() === 'tai-khoan') { <button type="button" class="btn" (click)="moThem()"><app-icon name="plus" [size]="16" /> Thêm tài khoản</button> }
      </div>
    </div>

    <div class="tabs" role="tablist">
      @for (t of tabs; track t.k) {
        <button type="button" role="tab" [class.on]="tab() === t.k" [attr.aria-selected]="tab() === t.k" (click)="setTab(t.k)">
          {{ t.t }}
          @if (t.k === 'tai-khoan') { <span class="count" style="background:var(--surf-3);color:var(--ink-2)">{{ store.taiKhoan().length }}</span> }
          @if (t.k === 'nhom') { <span class="count" style="background:var(--surf-3);color:var(--ink-2)">{{ store.nhomQuyen().length }}</span> }
        </button>
      }
    </div>

    @switch (tab()) {
      @case ('nhom') { <app-nhom-quyen /> }
      @case ('chuc-nang') { <app-chuc-nang /> }
      @case ('ma-tran') { <app-ma-tran /> }
      @default {
        <div class="note info">
          Email là duy nhất. Một tài khoản thuộc được nhiều nhóm — quyền là hợp của các nhóm. Tài khoản đã phát sinh dữ liệu không xoá
          được, chỉ Khoá (khoá xong mọi phiên đăng nhập của người đó bị huỷ).
        </div>
        <app-filter [(loc)]="loc" memo="tai-khoan" [facets]="facets()" [time]="false" placeholder="Tìm họ tên, email, nhóm…" />
        <div class="tbl-wrap">
          <table class="tbl freeze">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Nhóm quyền</th>
                <th>Trạng thái</th>
                <th>Đăng nhập cuối</th>
                @if (sua()) { <th>Hành động</th> }
              </tr>
            </thead>
            <tbody>
              @for (t of pg.items(); track t.id) {
                <tr>
                  <td>{{ t.hoTen }} @if (t.id === store.meId()) { <span class="sub">(bạn)</span> }
                    @if (t.batDoiMK) { <app-tt v="Bắt đổi MK" t="warn" /> }</td>
                  <td>{{ t.email }}</td>
                  <td>
                    <span class="row" style="gap:4px">
                      @for (g of nhomCua(t); track g.id) { <app-tt [v]="g.ten" [t]="g.toanQuyen ? 'done' : g.trangThai === 'Ngưng' ? 'mute' : 'info'" /> }
                      @empty { <span class="muted">(chưa có nhóm)</span> }
                    </span>
                  </td>
                  <td><app-tt [v]="t.trangThai" /></td>
                  <td>{{ viMoment(t.lanDangNhapCuoi) }}</td>
                  @if (sua()) {
                    <td>
                      <div class="btn-row" style="justify-content:flex-start">
                        <button type="button" class="btn sm quiet" (click)="moSua(t)">Sửa</button>
                        @if (t.id !== store.meId()) {
                          <button type="button" class="btn sm" [class.quiet]="t.trangThai === 'Khoá'" [class.danger]="t.trangThai === 'Hoạt động'" (click)="doiTrangThai(t)">
                            {{ t.trangThai === 'Khoá' ? 'Mở khoá' : 'Khoá' }}
                          </button>
                        }
                        @if (t.id !== store.meId()) { <button type="button" class="btn sm quiet" (click)="moDatLai(t)">Đặt lại mật khẩu</button> }
                        @else { <span class="sub muted" title="Tự đổi qua menu Đổi mật khẩu">(tài khoản của bạn)</span> }
                      </div>
                    </td>
                  }
                </tr>
              } @empty {
                <tr><td [attr.colspan]="sua() ? 6 : 5" class="empty">Không có tài khoản khớp bộ lọc</td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-pager [pager]="pg" />
      }
    }

    <!-- Thêm / sửa tài khoản -->
    <app-modal #mTK [open]="!!form()" [title]="form()?.id ? 'Sửa tài khoản' : 'Thêm tài khoản'" size="md" [dirty]="dirtyForm()" (closed)="form.set(null)">
      @if (form(); as f) {
        <div class="form-grid">
          <div class="field">
            <label for="tk-ten">Họ tên <span class="req">*</span></label>
            <input id="tk-ten" [value]="f.hoTen" (input)="set('hoTen', $any($event.target).value)" />
          </div>
          <div class="field">
            <label for="tk-email">Email <span class="req">*</span></label>
            @if (f.id) { <div class="ro">{{ f.email }}</div> }
            @else { <input id="tk-email" type="email" autocomplete="off" [value]="f.email" (input)="set('email', $any($event.target).value)" /> }
          </div>
          @if (!f.id) {
            <div class="field">
              <label for="tk-mk">Mật khẩu tạm <span class="req">*</span></label>
              <input id="tk-mk" class="mono" [value]="f.matKhau" (input)="set('matKhau', $any($event.target).value)" />
              <span class="hint">≥ {{ minMk }} ký tự. Người dùng bị bắt đổi ở lần đăng nhập đầu.</span>
            </div>
          }
        </div>
        <div class="field">
          <span class="lbl">Nhóm quyền <span class="req">*</span> <span class="muted" style="font-weight:400">— chọn nhiều, quyền là hợp của các nhóm</span></span>
          <div class="nhom-pick">
            @for (g of store.nhomQuyen(); track g.id) {
              <label class="nhom-opt" [class.on]="f.nhom.includes(g.id)">
                <input type="checkbox" [checked]="f.nhom.includes(g.id)" (change)="flipNhom(g.id)" />
                <span>
                  <b>{{ g.ten }}</b> <span class="mono muted">{{ g.ma }}</span>
                  @if (g.toanQuyen) { <app-tt v="Toàn quyền" t="done" /> }
                  @if (g.trangThai === 'Ngưng') { <app-tt v="Ngưng" /> }
                  <small class="muted">{{ g.moTa || soQuyen(g.id) + ' quyền' }}</small>
                </span>
              </label>
            }
          </div>
        </div>
        @if (loi()) { <div class="note bad">{{ loi() }}</div> }
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="form.set(null)">Huỷ</button>
        <button type="button" class="btn" [disabled]="dangLuu()" (click)="luu()">{{ form()?.id ? 'Lưu' : 'Tạo tài khoản' }}</button>
      </div>
    </app-modal>

    <!-- Đặt lại mật khẩu -->
    <app-modal [open]="!!datLai()" title="Đặt lại mật khẩu" [sub]="datLai()?.hoTen ?? ''" size="sm" (closed)="datLai.set(null)">
      <p>Tạo mật khẩu tạm mới cho <b>{{ datLai()?.email }}</b>. Mọi phiên đăng nhập hiện có của tài khoản này bị huỷ.</p>
      <label class="check-row"><input type="checkbox" [checked]="batDoi()" (change)="batDoi.set(!batDoi())" /> Bắt đổi ở lần đăng nhập tới</label>
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="datLai.set(null)">Huỷ</button>
        <button type="button" class="btn danger" [disabled]="dangLuu()" (click)="xacNhanDatLai()">Đặt lại</button>
      </div>
    </app-modal>

    <!-- Mật khẩu tạm hiện một lần -->
    <app-modal [open]="!!mkTam()" title="Mật khẩu tạm" [sub]="mkTam()?.email ?? ''" size="sm" (closed)="mkTam.set(null)">
      <div class="note warn">Mật khẩu chỉ hiện một lần. Trao trực tiếp cho người dùng (không gửi qua nhóm chat chung).</div>
      <div class="row">
        <div class="ro mono grow" style="font-size:18px">{{ mkTam()?.mk }}</div>
        <button type="button" class="btn" (click)="copy()">Sao chép</button>
      </div>
      <div foot class="btn-row"><button type="button" class="btn" (click)="mkTam.set(null)">Đã trao</button></div>
    </app-modal>
  `,
  styles: [
    `
      .nhom-pick { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); }
      .nhom-opt { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; background: var(--surf); }
      .nhom-opt:hover { border-color: var(--line-2); }
      .nhom-opt.on { border-color: var(--brand); background: var(--brand-tint); }
      .nhom-opt input { margin-top: 4px; flex: 0 0 auto; }
      .nhom-opt > span { display: flex; flex-wrap: wrap; gap: 2px 8px; align-items: center; min-width: 0; }
      .nhom-opt small { flex-basis: 100%; }
    `,
  ],
})
export class TaiKhoanPage {
  private readonly mTK = viewChild<Modal>('mTK');
  protected readonly store = inject(Store);
  private readonly auth = inject(Auth);
  private readonly confirm = inject(Confirm);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;
  protected readonly viMoment = viMoment;
  protected readonly minMk = MAT_KHAU_TOI_THIEU;

  private readonly qp = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly tab = computed<Tab>(() => {
    const t = this.qp().get('tab');
    return TABS.some((x) => x.k === t) ? (t as Tab) : 'tai-khoan';
  });
  protected readonly sua = computed(() => this.store.canEdit('taiKhoan'));

  protected readonly loc = signal<Loc>(nhoLoc('tai-khoan', LOC_RONG));
  protected readonly facets = computed<Facet[]>(() => [
    { key: 'nhom', label: 'Nhóm quyền', options: this.store.nhomQuyen().map((g) => ({ value: g.id, label: g.ten })) },
    { key: 'trangThai', label: 'Trạng thái', options: ['Hoạt động', 'Khoá'].map((v) => ({ value: v, label: v })) },
  ]);
  private readonly list = computed(() => {
    const l = this.loc();
    const nh = l.sel['nhom'] ?? [];
    return this.store
      .taiKhoan()
      .filter(
        (t) =>
          khopQ(l, t.hoTen, t.email, this.store.tenNhom(t)) &&
          khopSel(l, 'trangThai', t.trangThai) &&
          (nh.length === 0 || t.nhom.some((g) => nh.includes(g))),
      )
      .sort((a, b) => a.hoTen.localeCompare(b.hoTen, 'vi'));
  });
  protected readonly pg = paginate(this.list);

  protected readonly form = signal<FormTK | null>(null);
  protected readonly dirtyForm = dirtyOf(this.form);
  protected readonly loi = signal<string | null>(null);
  protected readonly dangLuu = signal(false);
  protected readonly datLai = signal<TaiKhoan | null>(null);
  protected readonly batDoi = signal(true);
  protected readonly mkTam = signal<{ email: string; mk: string } | null>(null);

  protected nhomCua(t: TaiKhoan) {
    return this.store.nhomQuyen().filter((g) => t.nhom.includes(g.id));
  }
  protected soQuyen(id: string): number {
    return Object.keys(this.store.nhomQuyen().find((g) => g.id === id)?.quyen ?? {}).length;
  }

  protected setTab(t: Tab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected moThem(): void {
    this.loi.set(null);
    this.form.set({ id: '', hoTen: '', email: '', nhom: [], matKhau: matKhauTam() });
  }
  protected moSua(t: TaiKhoan): void {
    this.loi.set(null);
    this.form.set({ id: t.id, hoTen: t.hoTen, email: t.email, nhom: [...t.nhom], matKhau: '' });
  }
  protected set<K extends 'hoTen' | 'email' | 'matKhau'>(k: K, v: string): void {
    this.form.update((f) => (f ? { ...f, [k]: v } : f));
  }
  protected flipNhom(id: string): void {
    this.form.update((f) => (f ? { ...f, nhom: f.nhom.includes(id) ? f.nhom.filter((x) => x !== id) : [...f.nhom, id] } : f));
  }

  protected async luu(): Promise<void> {
    if (this.mTK()?.kt.hopLe() === false) return;
    const f = this.form();
    if (!f) return;
    this.dangLuu.set(true);
    try {
      if (f.id) {
        const e = this.auth.suaTaiKhoan(f.id, { hoTen: f.hoTen, nhom: f.nhom });
        if (e) return this.loi.set(e);
        this.form.set(null);
        this.store.say('Đã lưu tài khoản');
      } else {
        const e = await this.auth.taoTaiKhoan({ hoTen: f.hoTen, email: f.email, nhom: f.nhom, matKhau: f.matKhau });
        if (e) return this.loi.set(e);
        this.form.set(null);
        this.mkTam.set({ email: f.email.trim().toLowerCase(), mk: f.matKhau });
        this.store.say('Đã tạo tài khoản');
      }
    } finally {
      this.dangLuu.set(false);
    }
  }

  protected async doiTrangThai(t: TaiKhoan): Promise<void> {
    const khoa = t.trangThai === 'Hoạt động';
    const ok = await this.confirm.ask({
      title: khoa ? `Khoá tài khoản ${t.hoTen}?` : `Mở khoá tài khoản ${t.hoTen}?`,
      message: khoa
        ? 'Người này không đăng nhập được nữa và mọi phiên đang mở bị huỷ. Dữ liệu đã nhập vẫn giữ nguyên.'
        : 'Người này đăng nhập lại được bằng mật khẩu hiện tại.',
      ok: khoa ? 'Khoá' : 'Mở khoá',
    });
    if (!ok) return;
    const e = this.auth.doiTrangThai(t.id);
    this.store.say(e ?? (khoa ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản'));
  }

  protected moDatLai(t: TaiKhoan): void {
    this.batDoi.set(true);
    this.datLai.set(t);
  }

  protected async xacNhanDatLai(): Promise<void> {
    const t = this.datLai();
    if (!t) return;
    this.dangLuu.set(true);
    try {
      const r = await this.auth.datLaiMatKhau(t.id, this.batDoi());
      if (r.loi) return this.store.say(r.loi);
      this.datLai.set(null);
      this.mkTam.set({ email: t.email, mk: r.matKhau ?? '' });
    } finally {
      this.dangLuu.set(false);
    }
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.mkTam()?.mk ?? '');
      this.store.say('Đã sao chép mật khẩu tạm');
    } catch {
      this.store.say('Trình duyệt không cho sao chép — chép tay mật khẩu');
    }
  }
}
