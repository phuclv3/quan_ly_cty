import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { hdmCalc, HdmCalc } from '../core/calc';
import { HopDongMua, TRANG_THAI_HDM } from '../core/models';
import { nhoLoc } from '../core/ui';
import { money, pct, sum, viDate, vndShort } from '../core/util';
import { FilterBar, khopQ, khopSel, khopThoiGian, Loc, LOC_RONG, Facet } from '../shared/filter-bar';
import { Kpi, TrangThai } from '../shared/ui-kit';
import { Pager, paginate } from '../shared/pager';
import { csv, downloadFile, fileName } from '../shared/export';
import { Icon } from '../shared/icon';

interface Dong {
  m: HopDongMua;
  c: HdmCalc;
  soHDB: string;
  choXoa: boolean;
}

/** HDM-01: danh sách Hợp đồng mua. */
@Component({
  selector: 'app-hdm-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, FilterBar, Kpi, TrangThai, Pager, Icon],
  template: `
    <div class="page-head">
      <div><div class="crumbs">Kinh doanh</div><h1>Hợp đồng mua</h1></div>
      <div class="actions">
        <button type="button" class="btn quiet" (click)="xuat()"><app-icon name="download" [size]="16" /> Xuất Excel</button>
        @if (store.canEdit('hdm')) {
          <a class="btn" routerLink="/hop-dong-mua/moi"><app-icon name="plus" [size]="16" /> Tạo HĐ mua</a>
        }
      </div>
    </div>

    <div class="kpis">
      <app-kpi label="Số HĐ mua" [value]="'' + rows().length" [sub]="'Đang nhận hàng: ' + kpi().dangNhan" />
      <app-kpi label="Tổng giá trị" [value]="vndShort(kpi().tong)" sub="VNĐ, không tính HĐ huỷ" />
      <app-kpi label="Đã trả NCC" [value]="vndShort(kpi().daTra)" sub="Phiếu chi đã duyệt" tone="ok" />
      <app-kpi label="Còn phải trả (Oxy)" [value]="vndShort(kpi().conPhaiTra)" sub="Không tính HĐ Thuộc Phú Tài" [tone]="kpi().conPhaiTra > 0 ? 'warn' : ''" />
      <app-kpi label="Đợt quá hạn" [value]="'' + kpi().quaHan" [tone]="kpi().quaHan > 0 ? 'bad' : ''" />
    </div>

    <app-filter [(loc)]="loc" memo="hdm-list" [facets]="facets()" placeholder="Tìm số HĐ, NCC, MST, HĐ bán…" />

    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead>
          <tr>
            <th>Số HĐ mua</th><th>NCC</th><th>Ngày ký</th><th class="num">Giá trị VNĐ</th><th>Đã trả</th>
            <th class="num">Còn phải trả</th><th>Nhập hàng</th><th>HĐ bán liên quan</th><th>Phú Tài</th><th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          @for (r of pg.items(); track r.m.id) {
            <tr class="click" (click)="mo(r.m.id)" [class.overdue]="r.c.quaHan > 0">
              <td>
                <b>{{ r.m.soHD || '(chưa có số)' }}</b>
                @if (r.m.import) { <app-tt v="Import" /> }
              </td>
              <td>{{ r.m.tenNCC }}<span class="sub muted">{{ r.m.mst }}</span></td>
              <td>{{ viDate(r.m.ngayKy) }}</td>
              <td class="num">{{ money(r.c.tong) }}</td>
              <td>
                <div class="cell-bar"><span class="num">{{ pct(r.c.pctTra) }}</span><div class="bar"><i [style.width.%]="r.c.pctTra * 100"></i></div></div>
              </td>
              <td class="num" [class.neg]="r.c.conPhaiTra < 0">{{ money(r.c.conPhaiTra) }}</td>
              <td>
                @if (r.m.thuocPhuTai) { <span class="muted">—</span> } @else {
                  <div class="cell-bar"><span class="num">{{ pct(r.c.pctNhap) }}</span><div class="bar warn"><i [style.width.%]="r.c.pctNhap * 100"></i></div></div>
                }
              </td>
              <td>
                @if (r.m.hdbId) { <a class="linkish" [routerLink]="['/hop-dong-ban', r.m.hdbId]" (click)="$event.stopPropagation()">{{ r.soHDB }}</a> } @else { <span class="muted">—</span> }
              </td>
              <td>@if (r.m.thuocPhuTai) { <app-tt v="Thuộc Phú Tài" /> }</td>
              <td>
                <app-tt [v]="r.m.trangThai" />
                @if (r.choXoa) { <app-tt v="Chờ xoá" /> }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="10" class="empty">Không có HĐ mua nào khớp bộ lọc</td></tr>
          }
        </tbody>
        @if (rows().length) {
          <tfoot>
            <tr><th>Tổng ({{ rows().length }})</th><td></td><td></td><td class="num">{{ money(kpi().tongAll) }}</td><td></td><td class="num">{{ money(kpi().conAll) }}</td><td colspan="4"></td></tr>
          </tfoot>
        }
      </table>
    </div>
    <app-pager [pager]="pg" />
  `,
})
export class HdmList {
  protected readonly store = inject(Store);
  private readonly router = inject(Router);
  protected readonly money = money;
  protected readonly pct = pct;
  protected readonly viDate = viDate;
  protected readonly vndShort = vndShort;

  protected readonly loc = signal<Loc>(nhoLoc('hdm-list', LOC_RONG));

  protected readonly facets = computed<Facet[]>(() => {
    const nccIds = new Set(this.store.hdmVisible().map((m) => m.maNCC));
    return [
      { key: 'tt', label: 'Trạng thái', options: TRANG_THAI_HDM.map((t) => ({ value: t, label: t })) },
      {
        key: 'ncc',
        label: 'NCC',
        options: this.store
          .ncc()
          .filter((n) => nccIds.has(n.id))
          .map((n) => ({ value: n.id, label: n.ten })),
      },
      {
        key: 'pt',
        label: 'Thuộc Phú Tài',
        options: [
          { value: 'co', label: 'Thuộc Phú Tài' },
          { value: 'khong', label: 'Không thuộc Phú Tài' },
        ],
      },
    ];
  });

  private readonly all = computed<Dong[]>(() => {
    const db = this.store.db();
    return this.store.hdmVisible().map((m) => ({
      m,
      c: hdmCalc(m, db),
      soHDB: m.hdbId ? (this.store.hdbById(m.hdbId)?.soHD ?? m.hdbId) : '',
      choXoa: this.store.dangChoXoa('HopDongMua', m.id),
    }));
  });

  protected readonly rows = computed<Dong[]>(() => {
    const l = this.loc();
    return this.all()
      .filter(
        (r) =>
          khopQ(l, r.m.soHD, r.m.tenNCC, r.m.mst, r.soHDB, r.m.ghiChu) &&
          khopThoiGian(l, r.m.ngayKy ?? r.m.taoLuc.slice(0, 10)) &&
          khopSel(l, 'tt', r.m.trangThai) &&
          khopSel(l, 'ncc', r.m.maNCC) &&
          khopSel(l, 'pt', r.m.thuocPhuTai ? 'co' : 'khong'),
      )
      .sort((a, b) => (b.m.ngayKy ?? b.m.taoLuc).localeCompare(a.m.ngayKy ?? a.m.taoLuc));
  });

  protected readonly pg = paginate(this.rows);

  protected readonly kpi = computed(() => {
    const rs = this.rows();
    const hl = rs.filter((r) => r.m.trangThai !== 'Huỷ');
    const oxy = hl.filter((r) => !r.m.thuocPhuTai);
    return {
      tong: sum(hl, (r) => r.c.tong),
      daTra: sum(oxy, (r) => r.c.daTra),
      conPhaiTra: sum(oxy, (r) => Math.max(0, r.c.conPhaiTra)),
      quaHan: sum(oxy, (r) => r.c.quaHan),
      dangNhan: rs.filter((r) => r.m.trangThai === 'Đang nhận hàng').length,
      tongAll: sum(rs, (r) => r.c.tong),
      conAll: sum(rs, (r) => r.c.conPhaiTra),
    };
  });

  protected mo(id: string): void {
    void this.router.navigate(['/hop-dong-mua', id]);
  }

  protected xuat(): void {
    const head = ['Số HĐ mua', 'NCC', 'MST', 'Ngày ký', 'Giá trị VNĐ', 'Đã trả', 'Đã trả %', 'Còn phải trả', 'Nhập hàng %', 'HĐ bán liên quan', 'Thuộc Phú Tài', 'Trạng thái'];
    const body = this.rows().map((r) => [
      r.m.soHD,
      r.m.tenNCC,
      r.m.mst,
      viDate(r.m.ngayKy),
      r.c.tong,
      r.c.daTra,
      pct(r.c.pctTra),
      r.c.conPhaiTra,
      r.m.thuocPhuTai ? '' : pct(r.c.pctNhap),
      r.soHDB,
      r.m.thuocPhuTai ? 'Có' : '',
      r.choXoa ? `${r.m.trangThai} (Chờ xoá)` : r.m.trangThai,
    ]);
    downloadFile(fileName('hop-dong-mua', 'csv'), 'text/csv', csv([head, ...body]));
  }
}
