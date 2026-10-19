import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DongTon, tonKho } from '../core/calc';
import { KHO_CHUYEN_THANG } from '../core/models';
import { Store } from '../core/store';
import { nhoLoc } from '../core/ui';
import { money, sum, viDate } from '../core/util';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { Kpi, Modal } from '../shared/ui-kit';
import { downloadFile, csv, fileName } from '../shared/export';
import { hdCuaPhieu, khoOpts, nhomOpts, theKho } from './kho-util';
import { RouterLink } from '@angular/router';

interface Chon {
  loaiHang: string;
  thuocTinh: string;
  kho: string;
}

/** KHO-09 Tồn kho theo biến thể × vị trí; KHO-07 Chuyển thẳng tách riêng. */
@Component({
  selector: 'app-kho-ton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterBar, Pager, Kpi, Modal, RouterLink],
  template: `
    <div class="kpis">
      @for (k of kpis(); track k.id) {
        <app-kpi [label]="k.ten" [value]="money(k.ton)" sub="Tổng tồn (SL)" [tone]="k.ton < 0 ? 'bad' : ''" />
      }
    </div>
    <div class="section-title">
      <div class="tabs" role="tablist" style="position:static;margin:0">
        <button type="button" [class.on]="che() === 'kho'" (click)="che.set('kho')">Theo kho</button>
        <button type="button" [class.on]="che() === 'gop'" (click)="che.set('gop')">Gộp theo loại hàng (tất cả kho)</button>
      </div>
      <button type="button" class="btn sm quiet" (click)="xuatCsv()">Xuất CSV</button>
    </div>
    <app-filter [(loc)]="loc" memo="kho-ton" [time]="false" [facets]="facets()" placeholder="Tìm mã, tên loại hàng, thuộc tính…" />
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead>
          <tr><th>Loại hàng</th><th>Thuộc tính</th><th>Vị trí kho</th><th class="num">Tổng nhập</th><th class="num">Tổng xuất</th><th class="num">Tồn</th></tr>
        </thead>
        <tbody>
          @for (r of pg.items(); track $index) {
            <tr class="click" (click)="mo(r)">
              <td>{{ store.loaiHangTen(r.loaiHang) }} <span class="sub">{{ r.loaiHang }}</span></td>
              <td>{{ r.thuocTinh || '—' }}</td>
              <td>{{ r.kho ? store.khoTen(r.kho) : 'Tất cả kho' }}</td>
              <td class="num">{{ money(r.nhap) }}</td>
              <td class="num">{{ money(r.xuat) }}</td>
              <td class="num" [class.neg]="r.ton < 0"><b>{{ money(r.ton) }}</b></td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="empty">Không có dòng tồn nào khớp bộ lọc</td></tr>
          }
        </tbody>
        @if (rows().length) {
          <tfoot>
            <tr><td colspan="3">Tổng ({{ rows().length }} dòng)</td><td class="num">{{ money(tong().nhap) }}</td><td class="num">{{ money(tong().xuat) }}</td><td class="num" [class.neg]="tong().ton < 0">{{ money(tong().ton) }}</td></tr>
          </tfoot>
        }
      </table>
    </div>
    <app-pager [pager]="pg" />
    <p class="hint muted">Tồn = Σ SL Nhập − Σ SL Xuất theo Loại hàng × thuộc tính × Vị trí kho. Không tính phiếu Đã huỷ và phiếu Chuyển thẳng. Bấm dòng để xem thẻ kho.</p>

    <h3 class="section-title">Chuyển thẳng (chỉ tham khảo)</h3>
    <div class="note info">KHO-07: hàng đi thẳng từ NCC tới công trình/khách — phiếu vẫn lưu để truy vết theo HĐ nhưng không cộng/trừ tồn ở bất kỳ kho nào.</div>
    <div class="tbl-wrap">
      <table class="tbl freeze compact">
        <thead><tr><th>Loại hàng</th><th>Thuộc tính</th><th class="num">SL nhập</th><th class="num">SL xuất</th><th class="num">Chênh</th></tr></thead>
        <tbody>
          @for (r of ct(); track $index) {
            <tr class="click" (click)="mo(r)">
              <td>{{ store.loaiHangTen(r.loaiHang) }} <span class="sub">{{ r.loaiHang }}</span></td>
              <td>{{ r.thuocTinh || '—' }}</td>
              <td class="num">{{ money(r.nhap) }}</td>
              <td class="num">{{ money(r.xuat) }}</td>
              <td class="num muted">{{ money(r.ton) }}</td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="empty">Chưa có phiếu Chuyển thẳng</td></tr>
          }
        </tbody>
      </table>
    </div>

    <app-modal [open]="!!chon()" [title]="'Thẻ kho — ' + tenChon()" [sub]="chon()?.kho ? store.khoTen(chon()!.kho) : 'Tất cả kho'" size="lg" (closed)="chon.set(null)">
      <div class="tbl-wrap">
        <table class="tbl compact">
          <thead><tr><th>Ngày</th><th>Số phiếu</th><th>Nguồn gốc</th><th>HĐ</th>@if (!chon()?.kho) { <th>Kho</th> }<th class="num">Nhập</th><th class="num">Xuất</th><th class="num">Lũy kế</th></tr></thead>
          <tbody>
            @for (d of the(); track $index) {
              <tr>
                <td>{{ viDate(d.phieu.ngay) }}</td>
                <td>{{ d.phieu.soPhieu }}</td>
                <td>{{ d.phieu.nguonGoc }}</td>
                <td>
                  @if (hd(d.phieu); as h) { <a [routerLink]="h.link" (click)="chon.set(null)">{{ h.so }}</a> } @else { — }
                </td>
                @if (!chon()?.kho) { <td>{{ store.khoTen(d.phieu.kho) }}</td> }
                <td class="num">{{ d.nhap ? money(d.nhap) : '' }}</td>
                <td class="num">{{ d.xuat ? money(d.xuat) : '' }}</td>
                <td class="num" [class.neg]="d.luyKe < 0"><b>{{ money(d.luyKe) }}</b></td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty">Không có phiếu</td></tr>
            }
          </tbody>
        </table>
      </div>
      <div foot class="btn-row"><button type="button" class="btn quiet" (click)="chon.set(null)">Đóng</button></div>
    </app-modal>
  `,
})
export class TonKhoTab {
  protected readonly store = inject(Store);
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly che = signal<'kho' | 'gop'>('kho');
  protected readonly loc = signal<Loc>(nhoLoc('kho-ton', LOC_RONG));
  protected readonly chon = signal<Chon | null>(null);

  private readonly all = computed(() => tonKho(this.store.db()));
  protected readonly facets = computed<Facet[]>(() => [
    { key: 'kho', label: 'Kho', options: khoOpts(this.store.db(), false) },
    { key: 'nhom', label: 'Nhóm hàng', options: nhomOpts() },
  ]);

  private khop(r: DongTon, l: Loc, theoKho: boolean): boolean {
    const lh = this.store.loaiHangById(r.loaiHang);
    return (
      khopQ(l, r.loaiHang, lh?.ten, r.thuocTinh) &&
      khopSel(l, 'nhom', lh?.nhom) &&
      (!theoKho || khopSel(l, 'kho', r.kho))
    );
  }

  protected readonly rows = computed<DongTon[]>(() => {
    const l = this.loc();
    const thuong = this.all().filter((r) => r.kho !== KHO_CHUYEN_THANG && this.khop(r, l, true));
    const sx = (a: DongTon, b: DongTon) =>
      a.loaiHang.localeCompare(b.loaiHang) || a.thuocTinh.localeCompare(b.thuocTinh) || a.kho.localeCompare(b.kho);
    if (this.che() === 'kho') return thuong.sort(sx);
    const m = new Map<string, DongTon>();
    for (const r of thuong) {
      const k = `${r.loaiHang}\u0001${r.thuocTinh}`;
      const g = m.get(k) ?? { loaiHang: r.loaiHang, thuocTinh: r.thuocTinh, kho: '', nhap: 0, xuat: 0, ton: 0 };
      g.nhap += r.nhap;
      g.xuat += r.xuat;
      g.ton = g.nhap - g.xuat;
      m.set(k, g);
    }
    return [...m.values()].sort(sx);
  });
  protected readonly pg = paginate(this.rows);
  protected readonly tong = computed(() => ({
    nhap: sum(this.rows(), (r) => r.nhap),
    xuat: sum(this.rows(), (r) => r.xuat),
    ton: sum(this.rows(), (r) => r.ton),
  }));
  protected readonly ct = computed(() =>
    this.all().filter((r) => r.kho === KHO_CHUYEN_THANG && this.khop(r, this.loc(), false)),
  );
  protected readonly kpis = computed(() => {
    const all = this.all();
    return this.store
      .db()
      .kho.filter((k) => k.id !== KHO_CHUYEN_THANG && (k.dangDung || all.some((r) => r.kho === k.id)))
      .map((k) => ({ id: k.id, ten: k.ten, ton: sum(all.filter((r) => r.kho === k.id), (r) => r.ton) }));
  });

  protected readonly the = computed(() => {
    const c = this.chon();
    return c ? theKho(this.store.db(), c) : [];
  });
  protected readonly tenChon = computed(() => {
    const c = this.chon();
    return c ? `${this.store.loaiHangTen(c.loaiHang)}${c.thuocTinh ? ' · ' + c.thuocTinh : ''}` : '';
  });

  protected mo(r: DongTon): void {
    this.chon.set({ loaiHang: r.loaiHang, thuocTinh: r.thuocTinh, kho: r.kho });
  }
  protected hd(p: Parameters<typeof hdCuaPhieu>[1]) {
    return hdCuaPhieu(this.store, p);
  }

  protected xuatCsv(): void {
    const rows: (string | number)[][] = [['Mã loại hàng', 'Loại hàng', 'Thuộc tính', 'Vị trí kho', 'Tổng nhập', 'Tổng xuất', 'Tồn']];
    for (const r of this.rows())
      rows.push([r.loaiHang, this.store.loaiHangTen(r.loaiHang), r.thuocTinh, r.kho ? this.store.khoTen(r.kho) : 'Tất cả kho', r.nhap, r.xuat, r.ton]);
    downloadFile(fileName('ton-kho', 'csv'), 'text/csv', csv(rows));
  }
}
