import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { dnvtTinhTrang, tonTai } from '../core/calc';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { nhoLoc } from '../core/ui';
import { viDate } from '../core/util';
import { Confirm } from '../shared/confirm';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { TrangThai } from '../shared/ui-kit';

const TT_OPTS = ['Chờ mua', 'Đang mua một phần', 'Đã lên HĐ mua', TT.HUY].map((v) => ({ value: v, label: ttNhan(v) }));

/**
 * Đề nghị cấp vật tư (mọi HĐ bán): hàng thiếu trong kho → bộ phận mua lập HĐ mua từ đề nghị.
 * Luồng: HĐ bán (Cần mua) → Đề nghị → HĐ mua → Nhập kho → Giao hàng.
 */
@Component({
  selector: 'app-kho-de-nghi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterBar, Pager, TrangThai, RouterLink],
  template: `
    <div class="note info">
      <span>Hàng không có trong kho → <b>Đề nghị cấp vật tư</b> (gửi từ HĐ bán, Tab 3) → <b>HĐ mua</b> (bấm "Tạo HĐ mua", hoặc ở HĐ mua chọn "Lấy từ đề nghị" để gom nhiều đề nghị)
      → Nhập kho → Giao hàng.</span>
    </div>
    <div class="section-title">
      <span class="sub">{{ rows().length }} đề nghị · {{ choMua() }} đang chờ mua</span>
      @if (store.canEdit('hdm') && choMua()) { <a class="btn" routerLink="/hop-dong-mua/moi"><span>+ HĐ mua (gom đề nghị)</span></a> }
    </div>
    <app-filter [(loc)]="loc" memo="kho-de-nghi" [facets]="facets" placeholder="Tìm số đề nghị, HĐ bán, mã hàng…" />
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead><tr><th>Số đề nghị</th><th>Ngày</th><th>HĐ bán</th><th>Người đề nghị</th><th>Hàng đề nghị (tồn hiện tại)</th><th>HĐ mua</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>
          @for (r of pg.items(); track r.dn.id) {
            <tr>
              <td><b>{{ r.dn.soPhieu }}</b></td>
              <td>{{ viDate(r.dn.ngay) }}</td>
              <td><a [routerLink]="['/hop-dong-ban', r.dn.hdbId]" [queryParams]="{ tab: '5' }">{{ store.hdbById(r.dn.hdbId)?.soHD || '(báo giá)' }}</a> <span class="sub">{{ store.hdbById(r.dn.hdbId)?.tenKH }}</span></td>
              <td>{{ store.userName(r.dn.nguoiDeNghi) }}</td>
              <td class="sub">
                @for (x of r.dn.dong; track x.id) {
                  <div><b>{{ x.loaiHang }}</b>@if (x.tenHang) { ({{ x.tenHang }}) } × {{ x.soLuong }}@if (r.t.daMua.get(x.id)) { · đã mua {{ r.t.daMua.get(x.id) }} } · tồn {{ ton(x.loaiHang) }}</div>
                }
                @if (r.dn.ghiChu) { <div class="muted">{{ r.dn.ghiChu }}</div> }
              </td>
              <td>@for (m of r.t.hdm; track m.id) { <a [routerLink]="['/hop-dong-mua', m.id]">{{ m.soHD || '(nháp)' }}</a> } @empty { — }</td>
              <td><app-tt [v]="r.t.trangThai" />@if (r.dn.lyDoHuy) { <div class="sub">{{ r.dn.lyDoHuy }}</div> }</td>
              <td class="btn-row">
                @if ((r.t.trangThai === 'Chờ mua' || r.t.trangThai === 'Đang mua một phần') && store.canEdit('hdm')) {
                  <a class="btn sm" routerLink="/hop-dong-mua/moi" [queryParams]="{ dnvt: r.dn.id }">Tạo HĐ mua</a>
                }
                @if (r.t.trangThai === 'Chờ mua' && store.canEdit('hdb', store.hdbById(r.dn.hdbId)?.sale)) {
                  <button type="button" class="btn sm quiet" (click)="huy(r.dn.id, r.dn.soPhieu)">Huỷ</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8" class="empty">Chưa có đề nghị cấp vật tư</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [pager]="pg" />
  `,
})
export class DeNghiTab {
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  protected readonly viDate = viDate;
  protected readonly loc = signal<Loc>(nhoLoc('kho-de-nghi', LOC_RONG));
  protected readonly facets: Facet[] = [{ key: 'tt', label: 'Trạng thái', options: TT_OPTS }];

  private readonly all = computed(() => {
    const db = this.store.db();
    return [...this.store.deNghiVatTu()].sort((a, b) => (a.soPhieu < b.soPhieu ? 1 : -1)).map((dn) => ({ dn, t: dnvtTinhTrang(db, dn) }));
  });
  protected readonly rows = computed(() => {
    const l = this.loc();
    return this.all().filter(
      (r) =>
        khopSel(l, 'tt', r.t.trangThai) &&
        khopQ(l, r.dn.soPhieu, this.store.hdbById(r.dn.hdbId)?.soHD, this.store.hdbById(r.dn.hdbId)?.tenKH, ...r.dn.dong.map((x) => `${x.loaiHang} ${x.tenHang}`)),
    );
  });
  protected readonly pg = paginate(this.rows);
  protected readonly choMua = computed(() => this.all().filter((r) => r.t.trangThai === 'Chờ mua' || r.t.trangThai === 'Đang mua một phần').length);

  protected ton(lh: string): number {
    return tonTai(this.store.db(), lh);
  }
  protected async huy(id: string, so: string): Promise<void> {
    const ly = await this.confirm.prompt({ title: `Huỷ đề nghị ${so}?`, label: 'Lý do huỷ', minLength: 3, ok: 'Huỷ đề nghị' });
    if (ly === null) return;
    const e = this.store.huyDeNghiVatTu(id, ly);
    this.store.say(e ?? `Đã huỷ đề nghị ${so}`);
  }
}
