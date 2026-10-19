import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '../core/store';
import { NhomQuyen } from '../core/models';
import { CHUC_NANG, ChucNang, LEVEL_LABEL, Level, MODULES, maxLevel } from '../core/perm';
import { fold } from '../core/util';
import { csv, downloadFile, fileName } from '../shared/export';
import { TrangThai } from '../shared/ui-kit';
import { Icon } from '../shared/icon';
import { LEVEL_TONE } from './nhom-quyen';

const mucCua = (g: NhomQuyen, c: ChucNang): Level => (g.trangThai !== 'Hoạt động' ? 'none' : g.toanQuyen ? maxLevel(c) : (g.quyen[c.ma] ?? 'none'));

/** Danh mục chức năng phân quyền — mỗi chức năng một mã (bảng ChucNang). */
@Component({
  selector: 'app-chuc-nang',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrangThai, Icon],
  template: `
    <div class="note info">
      Mỗi chức năng có <b>mã cố định</b> (theo mã trong spec, mã có hậu tố là quyền tách riêng). Nhóm quyền lưu quyền theo mã này
      (bảng NhomQuyen_ChucNang) — khi lên database, kiểm tra quyền ở máy chủ cũng tra theo mã chức năng.
    </div>
    <div class="filters">
      <label class="search"><app-icon name="search" [size]="16" /><input type="search" placeholder="Tìm mã, tên chức năng…" [value]="q()" (input)="q.set($any($event.target).value)" aria-label="Tìm chức năng" /></label>
      <select aria-label="Module" [value]="mod()" (change)="mod.set($any($event.target).value)">
        <option value="">Mọi module</option>
        @for (m of modules; track m) { <option [value]="m" [selected]="m === mod()">{{ m }}</option> }
      </select>
      <button type="button" class="btn quiet" (click)="xuat()"><app-icon name="download" [size]="16" /> Xuất Excel</button>
    </div>
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead><tr><th>Mã chức năng</th><th>Module</th><th>Tên chức năng</th><th>Mức quyền cho phép</th><th>Nhóm đang có quyền</th></tr></thead>
        <tbody>
          @for (c of ds(); track c.ma) {
            <tr>
              <td class="mono">{{ c.ma }}</td>
              <td>{{ c.module }}</td>
              <td>{{ c.ten }} @if (c.moTa) { <span class="sub">{{ c.moTa }}</span> }</td>
              <td><span class="row" style="gap:4px">@for (l of c.mucDo; track l) { @if (l !== 'none') { <app-tt [v]="label[l]" [t]="tone[l]" /> } }</span></td>
              <td>
                <span class="row" style="gap:4px">
                  @for (g of coQuyen(c); track g.id) { <span class="chip">{{ g.ten }}: {{ label[muc(g, c)] }}</span> }
                  @empty { <span class="muted">—</span> }
                </span>
              </td>
            </tr>
          } @empty { <tr><td colspan="5" class="empty">Không có chức năng khớp</td></tr> }
        </tbody>
      </table>
    </div>
  `,
})
export class ChucNangTab {
  protected readonly store = inject(Store);
  protected readonly modules = MODULES;
  protected readonly label = LEVEL_LABEL;
  protected readonly tone = LEVEL_TONE;
  protected readonly muc = mucCua;
  protected readonly q = signal('');
  protected readonly mod = signal('');
  protected readonly ds = computed(() => {
    const q = fold(this.q().trim());
    return CHUC_NANG.filter((c) => (!this.mod() || c.module === this.mod()) && (!q || fold(`${c.ma} ${c.ten} ${c.moTa}`).includes(q)));
  });
  protected coQuyen(c: ChucNang): NhomQuyen[] {
    return this.store.nhomQuyen().filter((g) => mucCua(g, c) !== 'none');
  }
  protected xuat(): void {
    const rows: (string | number)[][] = [['Mã chức năng', 'Module', 'Tên chức năng', 'Mô tả', 'Mức cho phép']];
    for (const c of CHUC_NANG) rows.push([c.ma, c.module, c.ten, c.moTa, c.mucDo.filter((l) => l !== 'none').map((l) => LEVEL_LABEL[l]).join(', ')]);
    downloadFile(fileName('danh-muc-chuc-nang', 'csv'), 'text/csv', csv(rows));
  }
}

/** Ma trận nhóm quyền × chức năng (chỉ xem). */
@Component({
  selector: 'app-ma-tran',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrangThai, Icon],
  template: `
    <div class="between" style="margin-bottom:12px">
      <p class="sub">Quyền thực tế từng nhóm (nhóm Ngưng coi như không có quyền). Một tài khoản nhiều nhóm lấy mức cao nhất. Sửa quyền ở tab Nhóm quyền.</p>
      <button type="button" class="btn quiet" (click)="xuat()"><app-icon name="download" [size]="16" /> Xuất Excel</button>
    </div>
    <div class="tbl-wrap">
      <table class="tbl freeze compact">
        <thead>
          <tr>
            <th>Chức năng</th>
            @for (g of store.nhomQuyen(); track g.id) { <th>{{ g.ten }}@if (g.trangThai === 'Ngưng') { <span class="sub">Ngưng</span> }</th> }
          </tr>
        </thead>
        <tbody>
          @for (m of modules; track m) {
            <tr><td [attr.colspan]="store.nhomQuyen().length + 1" style="background:var(--surf-2);font-weight:700">{{ m }}</td></tr>
            @for (c of cn(m); track c.ma) {
              <tr>
                <td><span class="mono">{{ c.ma }}</span> · {{ c.ten }}</td>
                @for (g of store.nhomQuyen(); track g.id) {
                  <td>@let l = muc(g, c); @if (l === 'none') { <span class="muted">—</span> } @else { <app-tt [v]="label[l]" [t]="tone[l]" /> }</td>
                }
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
export class MaTranTab {
  protected readonly store = inject(Store);
  protected readonly modules = MODULES;
  protected readonly label = LEVEL_LABEL;
  protected readonly tone = LEVEL_TONE;
  protected readonly muc = mucCua;
  protected cn(m: string): ChucNang[] {
    return CHUC_NANG.filter((c) => c.module === m);
  }
  protected xuat(): void {
    const gs = this.store.nhomQuyen();
    const rows: (string | number)[][] = [['Mã chức năng', 'Chức năng', ...gs.map((g) => `${g.ten} (${g.ma})`)]];
    for (const c of CHUC_NANG) rows.push([c.ma, c.ten, ...gs.map((g) => { const l = mucCua(g, c); return l === 'none' ? '' : LEVEL_LABEL[l]; })]);
    downloadFile(fileName('ma-tran-phan-quyen', 'csv'), 'text/csv', csv(rows));
  }
}
