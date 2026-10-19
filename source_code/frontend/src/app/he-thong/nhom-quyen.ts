import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '../core/store';
import { NhomQuyen } from '../core/models';
import { CHUC_NANG, ChucNang, LEVEL_LABEL, Level, MODULES, maxLevel } from '../core/perm';
import { fold, viMoment } from '../core/util';
import { Confirm } from '../shared/confirm';
import { TrangThai } from '../shared/ui-kit';
import { Icon } from '../shared/icon';

/** Màu nhãn theo mức quyền (dùng chung với Ma trận). */
export const LEVEL_TONE: Record<Level, string> = {
  none: 'mute',
  view: 'mute',
  ownView: 'mute',
  request: 'warn',
  draft: 'warn',
  own: 'info',
  edit: 'info',
  approve: 'ok',
};

/**
 * Nhóm quyền: tạo / sửa / nhân bản / xoá nhóm; gán mức quyền cho từng MÃ CHỨC NĂNG;
 * gán / bỏ tài khoản vào nhóm. Lưu thành 1 bản ghi NhomQuyen (quyen theo mã) + TaiKhoan.nhom[].
 */
@Component({
  selector: 'app-nhom-quyen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrangThai, Icon],
  template: `
    <div class="nq">
      <!-- Danh sách nhóm -->
      <aside class="nq-list">
        <div class="between">
          <h3>Nhóm quyền</h3>
          @if (sua()) { <button type="button" class="btn sm" (click)="moMoi()"><app-icon name="plus" [size]="16" /> Thêm nhóm</button> }
        </div>
        @for (g of store.nhomQuyen(); track g.id) {
          <button type="button" class="nq-item" [class.on]="g.id === chon()?.id" (click)="chonNhom(g.id)">
            <span class="between"><b>{{ g.ten }}</b> <span class="count soft">{{ soTV(g.id) }}</span></span>
            <span class="mono muted">{{ g.ma }}</span>
            <span class="row" style="gap:4px">
              @if (g.toanQuyen) { <app-tt v="Toàn quyền" t="done" /> } @else { <span class="sub">{{ demQuyen(g) }} chức năng</span> }
              @if (g.trangThai === 'Ngưng') { <app-tt v="Ngưng" /> }
              @if (g.heThong) { <span class="sub">· mặc định</span> }
            </span>
          </button>
        }
        @if (moi()) {
          <button type="button" class="nq-item on"><b>{{ f()?.ten || 'Nhóm mới' }}</b><span class="sub">Chưa lưu</span></button>
        }
      </aside>

      <!-- Chi tiết nhóm -->
      @if (f(); as n) {
        <section class="nq-detail">
          <div class="card">
            <div class="between">
              <h2>{{ moi() ? 'Nhóm quyền mới' : n.ten }}</h2>
              @if (dirty()) { <app-tt v="Chưa lưu" t="warn" /> }
            </div>
            <div class="form-grid" style="margin-top:10px">
              <div class="field">
                <label for="nq-ma">Mã nhóm <span class="req">*</span></label>
                <input id="nq-ma" class="mono" [disabled]="!sua()" [value]="n.ma" placeholder="VD KE_TOAN" (input)="set('ma', $any($event.target).value.toUpperCase())" />
              </div>
              <div class="field">
                <label for="nq-ten">Tên nhóm <span class="req">*</span></label>
                <input id="nq-ten" [disabled]="!sua()" [value]="n.ten" (input)="set('ten', $any($event.target).value)" />
              </div>
              <div class="field">
                <label for="nq-tt">Trạng thái</label>
                <select id="nq-tt" [disabled]="!sua()" [value]="n.trangThai" (change)="set('trangThai', $any($event.target).value)">
                  <option value="Hoạt động" [selected]="n.trangThai === 'Hoạt động'">Hoạt động</option>
                  <option value="Ngưng" [selected]="n.trangThai === 'Ngưng'">Ngưng (thành viên mất quyền của nhóm)</option>
                </select>
              </div>
              <div class="field wide">
                <label for="nq-mt">Mô tả</label>
                <input id="nq-mt" [disabled]="!sua()" [value]="n.moTa" (input)="set('moTa', $any($event.target).value)" />
              </div>
            </div>
            <label class="tq">
              <input type="checkbox" [disabled]="!sua()" [checked]="n.toanQuyen" (change)="set('toanQuyen', $any($event.target).checked)" />
              <span><b>Toàn quyền</b><small class="muted">Mức cao nhất ở mọi chức năng, kể cả chức năng thêm sau (Giám đốc / Owner)</small></span>
            </label>
            @if (!moi()) { <p class="sub" style="margin-top:6px">Cập nhật {{ viMoment(n.capNhat ?? n.taoLuc) }} @if (n.nguoiCapNhat) { · {{ store.userName(n.nguoiCapNhat) }} }</p> }
          </div>

          <!-- Phân quyền theo mã chức năng -->
          <div class="section-title">
            <h2>Phân quyền theo chức năng</h2>
            <label class="search" style="max-width:300px">
              <app-icon name="search" [size]="16" />
              <input type="search" placeholder="Tìm mã / tên chức năng…" [value]="q()" (input)="q.set($any($event.target).value)" aria-label="Tìm chức năng" />
            </label>
          </div>
          @if (n.toanQuyen) {
            <div class="note info">Nhóm toàn quyền: mọi chức năng ở mức cao nhất — bảng dưới chỉ để tham khảo.</div>
          }
          @for (m of modules; track m) {
            @if (cnCua(m).length) {
              <div class="tbl-wrap" style="margin-bottom:12px">
                <table class="tbl compact">
                  <thead>
                    <tr>
                      <th style="width:120px">{{ m }}</th>
                      <th>Chức năng</th>
                      <th style="width:220px">
                        @if (sua() && !n.toanQuyen) {
                          <span class="row" style="gap:4px;font-weight:400">
                            <button type="button" class="btn sm quiet" (click)="datModule(m, 'max')">Cao nhất</button>
                            <button type="button" class="btn sm quiet" (click)="datModule(m, 'view')">Xem</button>
                            <button type="button" class="btn sm quiet" (click)="datModule(m, 'none')">Bỏ</button>
                          </span>
                        } @else { Mức quyền }
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of cnCua(m); track c.ma) {
                      <tr [class.sel]="muc(n, c) !== 'none'">
                        <td class="mono">{{ c.ma }}</td>
                        <td>{{ c.ten }} @if (c.moTa) { <span class="sub">{{ c.moTa }}</span> }</td>
                        <td>
                          @if (sua() && !n.toanQuyen) {
                            <select [value]="muc(n, c)" (change)="datMuc(c.ma, $any($event.target).value)" [attr.aria-label]="'Mức quyền ' + c.ma">
                              @for (l of c.mucDo; track l) { <option [value]="l" [selected]="l === muc(n, c)">{{ l === 'none' ? '— Không có quyền' : levelLabel[l] }}</option> }
                            </select>
                          } @else {
                            @let l = n.toanQuyen ? max(c) : muc(n, c);
                            @if (l === 'none') { <span class="muted">—</span> } @else { <app-tt [v]="levelLabel[l]" [t]="tone[l]" /> }
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }

          <!-- Thành viên -->
          <div class="section-title">
            <h2>Thành viên nhóm <span class="count soft">{{ tv().length }}</span></h2>
            @if (moi()) { <span class="sub">Lưu nhóm trước rồi gán tài khoản</span> }
          </div>
          @if (!moi()) {
            <div class="card">
              <div class="tv-grid">
                @for (t of store.taiKhoan(); track t.id) {
                  <label class="tv" [class.on]="tv().includes(t.id)" [class.off]="t.trangThai === 'Khoá'">
                    <input type="checkbox" [disabled]="!sua()" [checked]="tv().includes(t.id)" (change)="flipTV(t.id)" />
                    <span><b>{{ t.hoTen }}</b><small class="muted">{{ t.email }}@if (t.trangThai === 'Khoá') { · Khoá }</small></span>
                  </label>
                }
              </div>
            </div>
          }

          @if (loi()) { <div class="note bad" style="margin-top:12px">{{ loi() }}</div> }
          @if (sua()) {
            <div class="btn-row nq-actions">
              @if (!moi() && !n.heThong) { <button type="button" class="btn danger" (click)="xoa()"><app-icon name="trash" [size]="16" /> Xoá nhóm</button> }
              @if (!moi()) { <button type="button" class="btn quiet" (click)="nhanBan()">Nhân bản</button> }
              <span class="grow"></span>
              <button type="button" class="btn quiet" [disabled]="!dirty()" (click)="hoanTac()">Hoàn tác</button>
              <button type="button" class="btn" [disabled]="!dirty()" (click)="luu()"><app-icon name="check" [size]="16" /> Lưu nhóm</button>
            </div>
          }
        </section>
      } @else {
        <section class="nq-detail"><div class="card empty">Chọn một nhóm để xem và phân quyền</div></section>
      }
    </div>
  `,
  styles: [
    `
      .nq { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: start; }
      .nq-list { display: grid; gap: 8px; position: sticky; top: calc(var(--top-h) + 70px); }
      .nq-item { display: grid; gap: 2px; text-align: left; padding: 11px 13px; border-radius: 10px; border: 1px solid var(--line); background: var(--surf); cursor: pointer; }
      .nq-item:hover { border-color: var(--line-2); }
      .nq-item.on { border-color: var(--brand); box-shadow: inset 3px 0 0 var(--brand); background: var(--brand-tint); }
      .count.soft { background: var(--surf-3); color: var(--ink-2); }
      .tq { display: flex; gap: 10px; align-items: flex-start; margin-top: 12px; padding: 10px 12px; border: 1px dashed var(--line-2); border-radius: 8px; cursor: pointer; }
      .tq input { margin-top: 4px; flex: 0 0 auto; }
      .tq span { display: grid; gap: 2px; }
      .tq small { font-size: 14px; }
      .tv-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); }
      .tv { display: flex; gap: 10px; align-items: flex-start; padding: 9px 11px; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; }
      .tv.on { border-color: var(--brand); background: var(--brand-tint); }
      .tv.off { opacity: 0.65; }
      .tv input { margin-top: 4px; }
      .tv span { display: grid; min-width: 0; }
      .tv small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .nq-actions { position: sticky; bottom: 0; margin-top: 14px; padding: 12px 0; background: var(--bg); border-top: 1px solid var(--line); z-index: 5; }
      @media (max-width: 900px) {
        .nq { grid-template-columns: minmax(0, 1fr); }
        /* Điện thoại / máy tính bảng: dải thẻ nhóm cuộn ngang, phần phân quyền hiện ngay bên dưới */
        .nq-list { position: static; display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x proximity; }
        .nq-list > .between { flex: 0 0 auto; flex-direction: column; align-items: stretch; justify-content: center; }
        .nq-item { flex: 0 0 210px; scroll-snap-align: start; }
      }
    `,
  ],
})
export class NhomQuyenTab {
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly modules = MODULES;
  protected readonly levelLabel = LEVEL_LABEL;
  protected readonly tone = LEVEL_TONE;
  protected readonly viMoment = viMoment;
  protected readonly max = maxLevel;

  protected readonly sua = computed(() => this.store.canEdit('taiKhoan'));
  private readonly qp = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  protected readonly moi = signal(false);
  protected readonly q = signal('');
  /** Bản nháp đang sửa + danh sách thành viên nháp. */
  protected readonly f = signal<NhomQuyen | null>(null);
  protected readonly tv = signal<string[]>([]);
  protected readonly loi = signal<string | null>(null);

  protected readonly chon = computed<NhomQuyen | null>(() => {
    const id = this.qp().get('nhom');
    const all = this.store.nhomQuyen();
    return all.find((g) => g.id === id) ?? all[0] ?? null;
  });
  private readonly tvGoc = computed(() => {
    const g = this.chon();
    return g ? this.store.taiKhoan().filter((t) => t.nhom.includes(g.id)).map((t) => t.id) : [];
  });

  protected readonly dirty = computed(() => {
    const n = this.f();
    if (!n) return false;
    if (this.moi()) return true;
    const g = this.chon();
    if (!g) return false;
    const a = JSON.stringify({ ...n, quyen: sach(n.quyen) });
    const b = JSON.stringify({ ...g, quyen: sach(g.quyen) });
    return a !== b || [...this.tv()].sort().join() !== [...this.tvGoc()].sort().join();
  });

  constructor() {
    // Đổi nhóm được chọn (hoặc dữ liệu nhóm đổi sau khi lưu) → nạp lại bản nháp.
    effect(() => {
      const g = this.chon();
      const tv = this.tvGoc();
      untracked(() => {
        if (this.moi()) return;
        this.f.set(g ? structuredClone(g) : null);
        this.tv.set([...tv]);
        this.loi.set(null);
      });
    });
  }

  protected soTV(id: string): number {
    return this.store.taiKhoan().filter((t) => t.nhom.includes(id)).length;
  }
  protected demQuyen(g: NhomQuyen): number {
    return Object.values(g.quyen).filter((l) => l && l !== 'none').length;
  }
  protected cnCua(m: string): ChucNang[] {
    const q = fold(this.q().trim());
    return CHUC_NANG.filter((c) => c.module === m && (!q || fold(`${c.ma} ${c.ten} ${c.moTa}`).includes(q)));
  }
  protected muc(n: NhomQuyen, c: ChucNang): Level {
    return n.quyen[c.ma] ?? 'none';
  }

  protected async chonNhom(id: string): Promise<void> {
    if (this.dirty() && !(await this.confirm.ask({ title: 'Bỏ thay đổi chưa lưu?', message: 'Nhóm đang sửa có thay đổi chưa lưu.', ok: 'Bỏ thay đổi' }))) return;
    this.moi.set(false);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { nhom: id }, queryParamsHandling: 'merge', replaceUrl: true });
    const g = this.store.nhomQuyen().find((x) => x.id === id);
    if (g && g.id === this.chon()?.id) {
      this.f.set(structuredClone(g));
      this.tv.set([...this.tvGoc()]);
    }
  }

  protected moMoi(): void {
    this.moi.set(true);
    this.f.set(this.store.newNhom());
    this.tv.set([]);
    this.loi.set(null);
  }

  protected set<K extends keyof NhomQuyen>(k: K, v: NhomQuyen[K]): void {
    this.f.update((n) => (n ? { ...n, [k]: v } : n));
  }
  protected datMuc(ma: string, l: Level): void {
    this.f.update((n) => (n ? { ...n, quyen: { ...n.quyen, [ma]: l } } : n));
  }
  protected datModule(m: string, cach: 'max' | 'view' | 'none'): void {
    this.f.update((n) => {
      if (!n) return n;
      const quyen = { ...n.quyen };
      for (const c of CHUC_NANG.filter((x) => x.module === m)) {
        quyen[c.ma] = cach === 'max' ? maxLevel(c) : cach === 'view' ? (c.mucDo.includes('view') ? 'view' : quyen[c.ma] ?? 'none') : 'none';
      }
      return { ...n, quyen };
    });
  }
  protected flipTV(id: string): void {
    this.tv.update((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }

  protected hoanTac(): void {
    if (this.moi()) {
      this.moi.set(false);
      const g = this.chon();
      this.f.set(g ? structuredClone(g) : null);
      this.tv.set([...this.tvGoc()]);
      return;
    }
    const g = this.chon();
    this.f.set(g ? structuredClone(g) : null);
    this.tv.set([...this.tvGoc()]);
    this.loi.set(null);
  }

  protected async luu(): Promise<void> {
    const n = this.f();
    if (!n) return;
    const dsTV = this.store.taiKhoan().filter((t) => this.tv().includes(t.id)).length;
    const ok = await this.confirm.ask({
      title: `Lưu nhóm quyền "${n.ten || n.ma}"?`,
      message: `${n.toanQuyen ? 'Toàn quyền' : this.demQuyen(n) + ' chức năng được cấp quyền'} · ${dsTV} thành viên. Quyền mới áp dụng ngay cho các thành viên.`,
      ok: 'Lưu nhóm',
    });
    if (!ok) return;
    const draft = { ...n };
    const e = this.store.saveNhom(draft);
    if (e) return this.loi.set(e);
    if (!this.moi() || draft.id) {
      const e2 = this.store.ganThanhVien(draft.id, this.tv());
      if (e2) return this.loi.set(e2);
    }
    const laMoi = this.moi();
    this.moi.set(false);
    this.store.say(laMoi ? 'Đã tạo nhóm quyền' : 'Đã lưu nhóm quyền');
    void this.router.navigate([], { relativeTo: this.route, queryParams: { nhom: draft.id }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected nhanBan(): void {
    const n = this.f();
    if (!n) return;
    this.moi.set(true);
    this.f.set({ ...this.store.newNhom(), ma: `${n.ma}_2`.slice(0, 30), ten: `${n.ten} (bản sao)`, moTa: n.moTa, toanQuyen: n.toanQuyen, quyen: { ...n.quyen } });
    this.tv.set([]);
  }

  protected async xoa(): Promise<void> {
    const n = this.chon();
    if (!n) return;
    const ok = await this.confirm.ask({
      title: `Xoá nhóm quyền "${n.ten}"?`,
      message: 'Chỉ xoá được nhóm tự tạo và không còn thành viên. Thao tác không hoàn tác được.',
      ok: 'Xoá nhóm',
    });
    if (!ok) return;
    const e = this.store.xoaNhom(n.id);
    if (e) return this.store.say(e);
    this.store.say('Đã xoá nhóm quyền');
    void this.router.navigate([], { relativeTo: this.route, queryParams: { nhom: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}

function sach(q: Record<string, Level>): Record<string, Level> {
  return Object.fromEntries(Object.entries(q).filter(([, l]) => l && l !== 'none').sort(([a], [b]) => a.localeCompare(b)));
}
