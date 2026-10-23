import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { HdbCalc, hdbCalc } from '../core/calc';
import { HopDongBan, TRANG_THAI_HDB } from '../core/models';
import { nhoLoc } from '../core/ui';
import { money, pct, sum, vndShort, viDate } from '../core/util';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel, khopThoiGian } from '../shared/filter-bar';
import { Kpi, TrangThai } from '../shared/ui-kit';
import { Pager, paginate } from '../shared/pager';
import { SortTh, Sorter } from '../shared/sort';
import { csv, downloadFile, fileName } from '../shared/export';
import { Icon } from '../shared/icon';
import { ImportHd } from '../shared/import-hd';

interface Row {
  h: HopDongBan;
  c: HdbCalc;
  xoa: boolean;
}

/** HDB-01 — Danh sách Hợp đồng bán. Cột tiền chỉ hiện khi có quyền xem HDB-07 (Tab 3). */
@Component({
  selector: 'app-hdb-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, FilterBar, Kpi, TrangThai, Pager, Icon, SortTh, ImportHd],
  template: `
    <div class="page-head">
      <div>
        <div class="crumbs"><a routerLink="/">Trang chủ</a> › Hợp đồng bán</div>
        <h1>Hợp đồng bán</h1>
        @if (store.ownOnly('hdb')) { <p class="sub">Chỉ hiện HĐ bạn phụ trách.</p> }
      </div>
      <div class="actions">
        <button type="button" class="btn quiet" (click)="xuat()"><app-icon name="download" [size]="16" /> Xuất CSV</button>
        @if (store.canEdit('hdb')) {
          <app-import-hd loai="ban" />
          <a class="btn" routerLink="/hop-dong-ban/moi"><app-icon name="plus" [size]="16" /> Tạo HĐ bán</a>
        }
      </div>
    </div>

    <div class="kpis">
      @if (xemTien()) {
        <app-kpi label="Tổng giá trị sau VAT" [value]="short(kpi().tong)" [sub]="kpi().n + ' HĐ (không tính Báo giá)'" />
        <app-kpi label="Đã thu" [value]="short(kpi().daThu)" [sub]="pct(kpi().tong ? kpi().daThu / kpi().tong : 0)" tone="ok" />
        <app-kpi label="Còn phải thu" [value]="short(kpi().conThu)" [sub]="kpi().quaHan + ' HĐ có đợt quá hạn'" [tone]="kpi().quaHan ? 'bad' : ''" />
      } @else {
        <app-kpi label="Số HĐ" [value]="'' + kpi().n" sub="Không tính Báo giá" />
      }
      <app-kpi label="HĐ thiếu hồ sơ" [value]="'' + kpi().thieu" sub="Thiếu HĐ / BBGH / Hoá đơn (không tính Báo giá)" [tone]="kpi().thieu ? 'warn' : ''" />
    </div>

    <app-filter [(loc)]="loc" memo="hdb-list" [facets]="facets()" placeholder="Tìm số HĐ, khách hàng, MST, ghi chú…" />

    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead>
          <tr>
            <th app-sort-th [sx]="sx" k="soHD">Số HĐ</th><th app-sort-th [sx]="sx" k="kh">Khách hàng</th><th app-sort-th [sx]="sx" k="ngay">Ngày ký</th>
            @if (xemTien()) {
              <th app-sort-th [sx]="sx" k="sau" class="num">Giá trị sau VAT</th><th app-sort-th [sx]="sx" k="pct">Đã thu</th>
              <th app-sort-th [sx]="sx" k="con" class="num">Còn phải thu</th>
            }
            <th>Giao hàng</th><th>Hồ sơ</th><th app-sort-th [sx]="sx" k="sale">Sale</th><th app-sort-th [sx]="sx" k="tt">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          @for (r of pg.items(); track r.h.id) {
            <tr class="click" [class.overdue]="r.c.quaHan > 0" (click)="mo(r.h.id)">
              <td>
                <a [routerLink]="['/hop-dong-ban', r.h.id]" (click)="$event.stopPropagation()"><b>{{ r.h.soHD || '(chưa có số)' }}</b></a>
                @if (r.h.import) { <span class="tag mute" title="HĐ thật — chuyển từ file Excel cũ">Import</span> } @else if (r.h.soHD.startsWith('DEMO-')) { <span class="tag warn" title="Dữ liệu giả lập để xem đủ trạng thái">Demo</span> }
                @if (r.xoa) { <app-tt v="Chờ xoá" /> }
              </td>
              <td>{{ r.h.tenKH }}<div class="sub">{{ r.h.mst }}</div></td>
              <td>{{ viDate(r.h.ngayKy) }}</td>
              @if (xemTien()) {
                <td class="num">{{ money(r.c.sauVAT) }}</td>
                <td>
                  <div class="cell-bar">
                    <span class="num">{{ pct(r.c.pctThu, 0) }}</span>
                    <div class="bar" [class.warn]="r.c.pctThu < 1"><i [style.width.%]="r.c.pctThu * 100"></i></div>
                  </div>
                </td>
                <td class="num" [class.neg]="r.c.quaHan > 0">{{ money(r.c.conPhaiThu) }}</td>
              }
              <td><app-tt [v]="r.c.giaoHang" /></td>
              <td>
                @if (r.c.hoSoThieu.length) { <app-tt v="Thiếu hồ sơ" [attr.title]="r.c.hoSoThieu.join(', ')" /> } @else { <app-tt v="Đủ hồ sơ" /> }
              </td>
              <td>{{ store.userName(r.h.sale) }}</td>
              <td><app-tt [v]="r.h.trangThai" /></td>
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="xemTien() ? 10 : 7" class="empty">
                @if (all().length) { Không có hợp đồng phù hợp bộ lọc. }
                @else { Chưa có hợp đồng bán nào. @if (store.canEdit('hdb')) { <a routerLink="/hop-dong-ban/moi">Tạo HĐ bán đầu tiên</a> } }
              </td>
            </tr>
          }
        </tbody>
        @if (rows().length && xemTien()) {
          <tfoot>
            <tr>
              <th colspan="3">Tổng {{ rows().length }} HĐ</th>
              <td class="num">{{ money(tongSau()) }}</td><td></td>
              <td class="num">{{ money(tongCon()) }}</td><td colspan="4"></td>
            </tr>
          </tfoot>
        }
      </table>
    </div>
    <app-pager [pager]="pg" />
  `,
})
export class HdbList {
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  protected readonly ttNhan = ttNhan;
  private readonly router = inject(Router);
  protected readonly money = money;
  protected readonly pct = pct;
  protected readonly viDate = viDate;
  protected readonly short = vndShort;

  protected readonly loc = signal<Loc>(nhoLoc('hdb-list', LOC_RONG));
  /** Giá trị, đã thu, công nợ: chỉ người có quyền xem HDB-07 (VD nhóm Kho không thấy). */
  protected readonly xemTien = computed(() => this.store.canView('hdbTab3'));

  protected readonly all = computed<Row[]>(() => {
    const db = this.store.db();
    return this.store
      .hdbVisible()
      .map((h) => ({ h, c: hdbCalc(h, db), xoa: this.store.dangChoXoa('HopDongBan', h.id) }))
      .sort((a, b) => ((a.h.ngayKy ?? a.h.taoLuc) < (b.h.ngayKy ?? b.h.taoLuc) ? 1 : -1));
  });

  protected readonly facets = computed<Facet[]>(() => {
    const sales = [...new Set(this.store.hdbVisible().map((h) => h.sale))];
    return [
      { key: 'tt', label: 'Trạng thái', options: TRANG_THAI_HDB.map((t) => ({ value: t, label: ttNhan(t) })) },
      { key: 'sale', label: 'Sale phụ trách', options: sales.map((s) => ({ value: s, label: this.store.userName(s) })) },
      { key: 'hoSo', label: 'Hồ sơ', options: [{ value: 'Thiếu', label: 'Thiếu hồ sơ' }, { value: 'Đủ', label: 'Đủ hồ sơ' }] },
      { key: 'gh', label: 'Giao hàng', options: ['Chưa giao', 'Đang giao', 'Đã giao'].map((t) => ({ value: t, label: t })) },
    ];
  });

  protected readonly sx = new Sorter<Row>({
    soHD: (r) => r.h.soHD,
    kh: (r) => r.h.tenKH,
    ngay: (r) => r.h.ngayKy,
    sau: (r) => r.c.sauVAT,
    pct: (r) => r.c.pctThu,
    con: (r) => r.c.conPhaiThu,
    sale: (r) => this.store.userName(r.h.sale),
    tt: (r) => TRANG_THAI_HDB.indexOf(r.h.trangThai),
  });

  protected readonly rows = computed(() => {
    const l = this.loc();
    return this.sx.apply(
      this.all().filter(
        ({ h, c }) =>
          khopQ(l, h.soHD, h.tenKH, h.mst, h.ghiChu, this.store.userName(h.sale)) &&
          khopThoiGian(l, h.ngayKy) &&
          khopSel(l, 'tt', h.trangThai) &&
          khopSel(l, 'sale', h.sale) &&
          khopSel(l, 'hoSo', c.hoSoThieu.length ? 'Thiếu' : 'Đủ') &&
          khopSel(l, 'gh', c.giaoHang),
      ),
    );
  });
  protected readonly pg = paginate(this.rows);

  protected readonly tongSau = computed(() => sum(this.rows(), (r) => r.c.sauVAT));
  protected readonly tongCon = computed(() => sum(this.rows(), (r) => r.c.conPhaiThu));
  protected readonly kpi = computed(() => {
    const rs = this.rows().filter((r) => r.h.trangThai !== TT.BAO_GIA && r.h.trangThai !== TT.HUY);
    return {
      n: rs.length,
      tong: sum(rs, (r) => r.c.sauVAT),
      daThu: sum(rs, (r) => r.c.daThu),
      conThu: sum(rs, (r) => r.c.conPhaiThu),
      quaHan: rs.filter((r) => r.c.quaHan > 0).length,
      thieu: rs.filter((r) => r.c.hoSoThieu.length > 0).length,
    };
  });

  protected mo(id: string): void {
    void this.router.navigate(['/hop-dong-ban', id]);
  }

  protected xuat(): void {
    const tien = this.xemTien();
    const head = ['Số HĐ', 'Khách hàng', 'MST', 'Ngày ký', ...(tien ? ['Giá trị sau VAT', 'Đã thu', 'Đã thu (%)', 'Còn phải thu'] : []), 'Giao hàng', 'Hồ sơ', 'Sale phụ trách', 'Trạng thái'];
    const body = this.rows().map(({ h, c }) => [
      h.soHD,
      h.tenKH,
      h.mst,
      viDate(h.ngayKy),
      ...(tien ? [c.sauVAT, c.daThu, Math.round(c.pctThu * 1000) / 10, c.conPhaiThu] : []),
      c.giaoHang,
      c.hoSoThieu.length ? `Thiếu: ${c.hoSoThieu.join(', ')}` : 'Đủ',
      this.store.userName(h.sale),
      ttNhan(h.trangThai),
    ]);
    downloadFile(fileName('hop-dong-ban', 'csv'), 'text/csv', csv([head, ...body]));
  }
}
