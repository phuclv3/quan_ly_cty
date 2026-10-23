import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '../core/store';
import { NhomQuyen, TaiKhoan } from '../core/models';
import { fold } from '../core/util';
import { Confirm } from '../shared/confirm';
import { TrangThai } from '../shared/ui-kit';
import { Icon } from '../shared/icon';
import { TT } from '../core/trang-thai';

/**
 * Phân người vào nhóm: chọn một nhóm bên trái, tích những tài khoản thuộc nhóm đó bên phải rồi Lưu.
 * (Quyền của nhóm sửa ở tab "Nhóm quyền".)
 */
@Component({
  selector: 'app-phan-nhom',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrangThai, Icon],
  template: `
    <div class="pn">
      <aside class="pn-list">
        <h3>Chọn nhóm</h3>
        @for (g of store.nhomQuyen(); track g.id) {
          <button type="button" class="pn-item" [class.on]="g.id === chon()?.id" (click)="chonNhom(g.id)">
            <span class="between"><b>{{ g.ten }}</b> <span class="count soft">{{ soTV(g.id) }}</span></span>
            <span class="sub">{{ g.moTa || g.ma }}</span>
            @if (g.trangThai === TT.NGUNG) { <app-tt [v]="TT.NGUNG" /> }
          </button>
        }
      </aside>

      @if (chon(); as g) {
        <section class="pn-detail">
          <div class="card">
            <div class="between">
              <h2>Thành viên nhóm "{{ g.ten }}"</h2>
              @if (dirty()) { <app-tt v="Chưa lưu" t="warn" /> }
            </div>
            <p class="sub">Đã chọn <b>{{ tv().length }}</b> / {{ store.taiKhoan().length }} tài khoản. Tích để thêm vào nhóm, bỏ tích để đưa ra khỏi nhóm.</p>

            <div class="pn-tool">
              <label class="search">
                <app-icon name="search" [size]="16" />
                <input type="search" placeholder="Tìm họ tên, email…" [value]="q()" (input)="q.set($any($event.target).value)" aria-label="Tìm tài khoản" />
              </label>
              <label class="check-row" style="margin:0"><input type="checkbox" [checked]="chiChon()" (change)="chiChon.set($any($event.target).checked)" /> Chỉ hiện người đã trong nhóm</label>
              @if (sua()) {
                <button type="button" class="btn sm quiet" (click)="chonTatCa(true)">Chọn các tài khoản đang lọc</button>
                <button type="button" class="btn sm quiet" (click)="chonTatCa(false)">Bỏ các tài khoản đang lọc</button>
              }
            </div>

            <div class="pn-ds">
              @for (t of ds(); track t.id) {
                <label class="pn-tk" [class.on]="tv().includes(t.id)" [class.off]="t.trangThai === TT.KHOA">
                  <input type="checkbox" [disabled]="!sua()" [checked]="tv().includes(t.id)" (change)="flip(t.id)" />
                  <span class="av" aria-hidden="true">{{ chuDau(t.hoTen) }}</span>
                  <span class="pn-ten">
                    <b>{{ t.hoTen }}</b>@if (t.trangThai === TT.KHOA) { <small class="muted"> · Khoá</small> }
                    <small class="muted">{{ t.email }}</small>
                    <small class="muted">Nhóm khác: {{ nhomKhac(t, g.id) || '—' }}</small>
                  </span>
                </label>
              } @empty {
                <div class="empty">Không có tài khoản khớp</div>
              }
            </div>
          </div>

          @if (loi()) { <div class="note bad" style="margin-top:12px">{{ loi() }}</div> }
          @if (sua()) {
            <div class="btn-row pn-actions">
              <span class="grow sub">@if (dirty()) { Thêm {{ them().length }} · Bỏ {{ bo().length }} }</span>
              <button type="button" class="btn quiet" [disabled]="!dirty()" (click)="hoanTac()">Hoàn tác</button>
              <button type="button" class="btn" [disabled]="!dirty()" (click)="luu()"><app-icon name="check" [size]="16" /> Lưu thành viên</button>
            </div>
          }
        </section>
      } @else {
        <section class="pn-detail"><div class="card empty">Chưa có nhóm quyền nào</div></section>
      }
    </div>
  `,
  styles: [
    `
      .pn { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: start; }
      .pn-list { display: grid; gap: 8px; position: sticky; top: calc(var(--top-h) + 70px); }
      .pn-item { display: grid; gap: 2px; text-align: left; padding: 11px 13px; border-radius: 10px; border: 1px solid var(--line); background: var(--surf); cursor: pointer; }
      .pn-item:hover { border-color: var(--line-2); }
      .pn-item.on { border-color: var(--brand); box-shadow: inset 3px 0 0 var(--brand); background: var(--brand-tint); }
      .count.soft { background: var(--surf-3); color: var(--ink-2); }
      .pn-tool { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; margin: 12px 0; }
      .pn-tool .search { flex: 1 1 240px; max-width: 360px; }
      .pn-ds { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); }
      .pn-tk { display: flex; gap: 10px; align-items: center; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; background: var(--surf); }
      .pn-tk:hover { border-color: var(--line-2); }
      .pn-tk.on { border-color: var(--brand); background: var(--brand-tint); }
      .pn-tk.off { opacity: 0.65; }
      .pn-tk input { flex: 0 0 auto; }
      .pn-ten { display: grid; min-width: 0; }
      .pn-ten small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .av { flex: 0 0 auto; display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: var(--surf-3); color: var(--ink-2); font-weight: 700; }
      .pn-tk.on .av { background: var(--brand); color: #fff; }
      .pn-actions { position: sticky; bottom: 0; margin-top: 14px; padding: 12px 0; background: var(--bg); border-top: 1px solid var(--line); z-index: 5; align-items: center; }
      @media (max-width: 900px) {
        .pn { grid-template-columns: minmax(0, 1fr); }
        .pn-list { position: static; display: flex; overflow-x: auto; padding-bottom: 6px; }
        .pn-list > h3 { display: none; }
        .pn-item { flex: 0 0 210px; }
      }
    `,
  ],
})
export class PhanNhomTab {
  protected readonly TT = TT;
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly qp = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  protected readonly sua = computed(() => this.store.canEdit('taiKhoan'));
  protected readonly q = signal('');
  protected readonly chiChon = signal(false);
  protected readonly tv = signal<string[]>([]);
  protected readonly loi = signal<string | null>(null);

  protected readonly chon = computed<NhomQuyen | null>(() => {
    const id = this.qp().get('nhom');
    const all = this.store.nhomQuyen();
    return all.find((g) => g.id === id) ?? all[0] ?? null;
  });
  private readonly goc = computed(() => {
    const g = this.chon();
    return g ? this.store.taiKhoan().filter((t) => t.nhom.includes(g.id)).map((t) => t.id) : [];
  });
  protected readonly them = computed(() => this.tv().filter((id) => !this.goc().includes(id)));
  protected readonly bo = computed(() => this.goc().filter((id) => !this.tv().includes(id)));
  protected readonly dirty = computed(() => this.them().length > 0 || this.bo().length > 0);

  protected readonly ds = computed<TaiKhoan[]>(() => {
    const q = fold(this.q().trim());
    return this.store
      .taiKhoan()
      .filter((t) => (!q || fold(`${t.hoTen} ${t.email}`).includes(q)) && (!this.chiChon() || this.tv().includes(t.id)))
      .sort((a, b) => a.hoTen.localeCompare(b.hoTen, 'vi'));
  });

  constructor() {
    // Đổi nhóm (hoặc dữ liệu đổi sau khi lưu) → nạp lại danh sách thành viên nháp.
    effect(() => {
      const goc = this.goc();
      untracked(() => {
        this.tv.set([...goc]);
        this.loi.set(null);
      });
    });
  }

  protected soTV(id: string): number {
    return this.store.taiKhoan().filter((t) => t.nhom.includes(id)).length;
  }
  protected chuDau(ten: string): string {
    const t = ten.trim().split(/\s+/);
    return (t[t.length - 1]?.[0] ?? '?').toUpperCase();
  }
  protected nhomKhac(t: TaiKhoan, nhomId: string): string {
    return this.store.nhomQuyen().filter((g) => t.nhom.includes(g.id) && g.id !== nhomId).map((g) => g.ten).join(', ');
  }

  protected flip(id: string): void {
    this.tv.update((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }
  protected chonTatCa(on: boolean): void {
    const ids = this.ds().map((t) => t.id);
    this.tv.update((a) => (on ? [...new Set([...a, ...ids])] : a.filter((x) => !ids.includes(x))));
  }
  protected hoanTac(): void {
    this.tv.set([...this.goc()]);
    this.loi.set(null);
  }

  protected async chonNhom(id: string): Promise<void> {
    if (this.dirty() && !(await this.confirm.ask({ title: 'Bỏ thay đổi chưa lưu?', message: 'Danh sách thành viên đang sửa có thay đổi chưa lưu.', ok: 'Bỏ thay đổi' }))) return;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: 'phan-nhom', nhom: id }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected async luu(): Promise<void> {
    const g = this.chon();
    if (!g) return;
    const ok = await this.confirm.ask({
      title: `Lưu thành viên nhóm "${g.ten}"?`,
      message: `Thêm ${this.them().length} người, bỏ ${this.bo().length} người. Quyền của họ thay đổi ngay.`,
      ok: 'Lưu thành viên',
    });
    if (!ok) return;
    const e = this.store.ganThanhVien(g.id, this.tv());
    if (e) return this.loi.set(e);
    this.store.say('Đã lưu thành viên nhóm');
  }
}
