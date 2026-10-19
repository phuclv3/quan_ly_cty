import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { ChiPhiHD } from '../core/models';
import { nhoLoc } from '../core/ui';
import { money, sum, viDate } from '../core/util';
import { TrangThai } from '../shared/ui-kit';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel, khopThoiGian } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { csv, downloadFile, fileName } from '../shared/export';
import { ChiPhiForm } from './chi-phi-form';

const TRANG_THAI = ['Nháp', 'Chờ duyệt', 'Đã duyệt', 'Từ chối'];

/** Tab Chi phí thực hiện HĐ (KT-12) — sổ tách riêng khỏi Sổ quỹ. Hỗ trợ ?hdb=<id> để mở popup nhập sẵn HĐ. */
@Component({
  selector: 'app-kt-chi-phi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrangThai, FilterBar, Pager, ChiPhiForm, RouterLink],
  template: `
    <div class="between" style="margin-bottom:8px">
      <p class="sub muted">Chi phí gắn từng HĐ bán; duyệt xong trừ vào Nguồn tiền chi ra và cộng vào chi phí của HĐ.</p>
      <div class="row">
        <button type="button" class="btn quiet" (click)="xuat()">Xuất Excel</button>
        @if (store.canEdit('cpHD')) { <button type="button" class="btn" (click)="cp.set(store.newChiPhi())">+ Nhập chi phí</button> }
      </div>
    </div>
    <app-filter [(loc)]="loc" memo="kt-chi-phi" [facets]="facets()" placeholder="Tìm mã CP, số HĐ, khách hàng, nội dung…" />
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead>
          <tr>
            <th>Mã CP</th><th>Số HĐ</th><th>Khách hàng</th><th>Ngày</th><th>Loại chi phí</th><th>Nội dung</th>
            <th class="num">Số tiền</th><th>Nguồn tiền</th><th>Người thực hiện</th><th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          @for (c of pg.items(); track c.id) {
            @let h = store.hdbById(c.hdbId);
            <tr class="click" (click)="cp.set(c)">
              <td><b>{{ c.maCP }}</b></td>
              <td>@if (h) { <a class="linkish" [routerLink]="['/hop-dong-ban', h.id]" (click)="$event.stopPropagation()">{{ h.soHD }}</a> } @else { — }</td>
              <td>{{ h?.tenKH || '—' }}</td>
              <td>{{ viDate(c.ngay) }}</td>
              <td>{{ store.lcpTen(c.loaiChiPhi) }}</td>
              <td>{{ c.noiDung }}@if (c.nguoiNhan) { <span class="sub muted">Người nhận: {{ c.nguoiNhan }}</span> }@if (c.donViVanChuyen) { <span class="sub muted">ĐVVC: {{ c.donViVanChuyen }}</span> }</td>
              <td class="num">{{ money(c.soTien) }}</td>
              <td>{{ store.nguonTen(c.nguonTien) }}</td>
              <td>{{ store.userName(c.nguoiThucHien) }}</td>
              <td>@if (store.dangChoXoa('ChiPhiThucHienHD', c.id)) { <app-tt v="Chờ xoá" /> } @else { <app-tt [v]="c.trangThai" /> }</td>
            </tr>
          } @empty {
            <tr><td colspan="10" class="empty">Không có chi phí khớp bộ lọc</td></tr>
          }
        </tbody>
        <tfoot>
          <tr><th colspan="6">Tổng theo bộ lọc ({{ rows().length }} dòng)</th><td class="num">{{ money(tong()) }}</td><td colspan="3"></td></tr>
        </tfoot>
      </table>
    </div>
    <app-pager [pager]="pg" />
    <app-chi-phi-form [chiPhi]="cp()" (closed)="cp.set(null)" />
  `,
})
export class ChiPhiTab {
  protected readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly money = money;
  protected readonly viDate = viDate;

  protected readonly loc = signal<Loc>(nhoLoc('kt-chi-phi', LOC_RONG));
  protected readonly cp = signal<ChiPhiHD | null>(null);

  private readonly source = computed(() => {
    const all = this.store.chiPhiHD();
    if (!this.store.ownOnly('cpHD')) return all;
    const mine = new Set(this.store.hdbVisible().map((h) => h.id));
    return all.filter((c) => mine.has(c.hdbId));
  });

  protected readonly facets = computed<Facet[]>(() => {
    const ids = new Set(this.source().map((c) => c.hdbId));
    return [
      {
        key: 'hd',
        label: 'Số HĐ',
        options: this.store
          .hopDongBan()
          .filter((h) => ids.has(h.id))
          .map((h) => ({ value: h.id, label: h.soHD, hint: h.tenKH })),
      },
      { key: 'lcp', label: 'Loại chi phí', options: this.store.loaiChiPhi().filter((l) => l.nhom === 'Thực hiện HĐ').map((l) => ({ value: l.id, label: l.ten })) },
      { key: 'tt', label: 'Trạng thái', options: TRANG_THAI.map((v) => ({ value: v, label: v })) },
    ];
  });

  protected readonly rows = computed(() => {
    const l = this.loc();
    return this.source()
      .filter((c) => {
        const h = this.store.hdbById(c.hdbId);
        return (
          khopThoiGian(l, c.ngay) &&
          khopSel(l, 'hd', c.hdbId) &&
          khopSel(l, 'lcp', c.loaiChiPhi) &&
          khopSel(l, 'tt', c.trangThai) &&
          khopQ(l, c.maCP, h?.soHD, h?.tenKH, c.noiDung, c.nguoiNhan, c.donViVanChuyen, c.ghiChu)
        );
      })
      .sort((a, b) => (a.ngay === b.ngay ? b.maCP.localeCompare(a.maCP) : a.ngay < b.ngay ? 1 : -1));
  });
  protected readonly pg = paginate(this.rows);
  protected readonly tong = computed(() => sum(this.rows(), (c) => c.soTien));

  constructor() {
    const hdb = this.route.snapshot.queryParamMap.get('hdb');
    if (hdb && this.store.canEdit('cpHD', this.store.hdbById(hdb)?.sale)) {
      this.cp.set(this.store.newChiPhi(hdb));
      void this.router.navigate([], { queryParams: { hdb: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }

  protected xuat(): void {
    const head = ['Mã CP', 'Số HĐ', 'Khách hàng', 'Ngày', 'Loại chi phí', 'Nội dung', 'Số tiền', 'Nguồn tiền', 'Người thực hiện', 'Người nhận', 'Đơn vị vận chuyển', 'Trạng thái'];
    const body = this.rows().map((c) => {
      const h = this.store.hdbById(c.hdbId);
      return [
        c.maCP,
        h?.soHD ?? '',
        h?.tenKH ?? '',
        viDate(c.ngay),
        this.store.lcpTen(c.loaiChiPhi),
        c.noiDung,
        c.soTien,
        this.store.nguonTen(c.nguonTien),
        this.store.userName(c.nguoiThucHien),
        c.nguoiNhan ?? '',
        c.donViVanChuyen ?? '',
        c.trangThai,
      ];
    });
    downloadFile(fileName('chi-phi-hd', 'csv'), 'text/csv', csv([head, ...body]));
  }
}
