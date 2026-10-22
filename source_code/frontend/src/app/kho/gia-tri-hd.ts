import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HopDongBan, KHO_CHUYEN_THANG } from '../core/models';
import { Store } from '../core/store';
import { nhoLoc } from '../core/ui';
import { money, sum, viDate } from '../core/util';
import { csv, downloadFile, fileName } from '../shared/export';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { Kpi } from '../shared/ui-kit';

interface DongGT {
  ngay: string;
  soPhieu: string;
  lo: string;
  loaiHang: string;
  quyCach: string;
  tenTrenHD: string;
  sl: number;
  donGia: number;
  thanhTien: number;
  cach: string;
}
interface HdGT {
  hd: HopDongBan;
  soPhieu: number;
  soLo: number;
  dong: DongGT[];
  sl: number;
  tong: number;
}

/** KHO-10 (sheet "4. TheoHopDong"): giá vốn hàng xuất theo HĐ Bán — cộng từ các phiếu Xuất Hiệu lực, theo lô. */
@Component({
  selector: 'app-kho-gia-tri',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterBar, Pager, Kpi, RouterLink],
  template: `
    <div class="note info">
      <b>Giá vốn đích danh theo lô:</b> mỗi dòng xuất trừ đúng một lô nhập, đơn giá vốn = đơn giá chưa VAT của lô đó (chốt lúc lập phiếu xuất).
      Không dùng bình quân vì cùng mã hàng giá các lô chênh nhau nhiều lần. Kho "Chuyển thẳng" không theo lô — lấy đơn giá dòng HĐ Mua liên quan.
      Tổng giá vốn dùng làm Giá vốn ở HĐ Bán (HDB-11).
    </div>
    <div class="kpis">
      <app-kpi label="Số HĐ đã xuất kho" [value]="money(soHdXuat())" />
      <app-kpi label="Tổng giá vốn hàng xuất" [value]="money(tongAll())" sub="VNĐ, theo bộ lọc" />
    </div>
    <div class="section-title">
      <label class="check-row"><input type="checkbox" [checked]="caHd()" (change)="caHd.set($any($event.target).checked)" /> Hiện cả HĐ chưa xuất kho</label>
      <button type="button" class="btn sm quiet" (click)="xuatCsv()">Xuất CSV</button>
    </div>
    <app-filter [(loc)]="loc" memo="kho-gia-tri" [time]="false" [facets]="facets()" placeholder="Tìm số HĐ, khách hàng, mã hàng, mã lô…" />
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead><tr><th>Số HĐ</th><th>Khách hàng</th><th class="num">Số phiếu xuất</th><th class="num">Số lô đã dùng</th><th class="num">Tổng SL</th><th class="num">Giá vốn hàng xuất</th></tr></thead>
        <tbody>
          @for (r of pg.items(); track r.hd.id) {
            <tr class="click" (click)="r.dong.length && lat(r.hd.id)" [attr.aria-expanded]="mo().has(r.hd.id)">
              <td>{{ !r.dong.length ? '·' : mo().has(r.hd.id) ? '▾' : '▸' }} <a [routerLink]="['/hop-dong-ban', r.hd.id]" (click)="$event.stopPropagation()"><b>{{ r.hd.soHD || '(chưa có số)' }}</b></a></td>
              <td>{{ r.hd.tenKH }}</td>
              <td class="num">{{ r.soPhieu }}</td>
              <td class="num">{{ r.soLo }}</td>
              <td class="num">{{ money(r.sl) }}</td>
              <td class="num"><b>{{ money(r.tong) }}</b></td>
            </tr>
            @if (mo().has(r.hd.id)) {
              <tr>
                <td colspan="6" style="padding:0 0 10px 24px">
                  <table class="tbl compact">
                    <thead><tr><th>Ngày</th><th>Phiếu</th><th>Mã lô</th><th>Mã hàng</th><th>Quy cách lô</th><th>Tên trên HĐ</th><th class="num">SL</th><th class="num">Đơn giá vốn</th><th class="num">Giá vốn</th><th>Cách tính</th></tr></thead>
                    <tbody>
                      @for (d of r.dong; track $index) {
                        <tr>
                          <td>{{ viDate(d.ngay) }}</td>
                          <td>{{ d.soPhieu }}</td>
                          <td><b>{{ d.lo || '—' }}</b></td>
                          <td>{{ d.loaiHang }} <span class="sub">{{ store.loaiHangTen(d.loaiHang) }}</span></td>
                          <td class="sub">{{ d.quyCach || '—' }}</td>
                          <td>{{ d.tenTrenHD || '—' }}</td>
                          <td class="num">{{ money(d.sl) }}</td>
                          <td class="num">{{ money(d.donGia) }}</td>
                          <td class="num">{{ money(d.thanhTien) }}</td>
                          <td class="muted">{{ d.cach }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </td>
              </tr>
            }
          } @empty {
            <tr><td colspan="6" class="empty">Chưa có HĐ Bán nào có phiếu xuất kho</td></tr>
          }
        </tbody>
        @if (rows().length) {
          <tfoot><tr><td colspan="4">Tổng</td><td class="num">{{ money(slAll()) }}</td><td class="num">{{ money(tongAll()) }}</td></tr></tfoot>
        }
      </table>
    </div>
    <app-pager [pager]="pg" />
    <p class="hint muted">Bấm dòng để xem từng dòng xuất. Không tính phiếu Đã huỷ.</p>
  `,
})
export class GiaTriHdTab {
  protected readonly store = inject(Store);
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly loc = signal<Loc>(nhoLoc('kho-gia-tri', LOC_RONG));
  protected readonly mo = signal<ReadonlySet<string>>(new Set());
  /** Như sheet "4. TheoHopDong": liệt kê mọi HĐ bán, HĐ chưa xuất ghi 0. */
  protected readonly caHd = signal(false);

  private readonly all = computed<HdGT[]>(() => {
    const db = this.store.db();
    const out: HdGT[] = [];
    for (const hd of this.store.hdbVisible()) {
      const ps = db.phieuKho
        .filter((p) => p.loai === 'Xuất' && p.hdId === hd.id && p.trangThai === 'Hiệu lực')
        .sort((a, b) => (a.ngay < b.ngay ? -1 : 1));
      if (!ps.length && !this.caHd()) continue;
      const dong: DongGT[] = [];
      for (const p of ps)
        for (const d of p.dong)
          dong.push({
            ngay: p.ngay,
            soPhieu: p.soPhieu,
            lo: d.lo ?? '',
            loaiHang: d.loaiHang,
            quyCach: d.thuocTinh,
            tenTrenHD: d.tenTrenHD ?? '',
            sl: d.soLuong,
            donGia: d.donGiaGoc ?? 0,
            thanhTien: (d.donGiaGoc ?? 0) * d.soLuong,
            cach: p.kho === KHO_CHUYEN_THANG ? 'Chuyển thẳng — theo HĐ mua' : d.lo ? 'Đích danh theo lô' : 'Chưa gán lô',
          });
      out.push({
        hd,
        soPhieu: ps.length,
        soLo: new Set(dong.filter((d) => d.lo).map((d) => d.lo)).size,
        dong,
        sl: sum(dong, (d) => d.sl),
        tong: sum(dong, (d) => d.thanhTien),
      });
    }
    return out.sort((a, b) => (b.hd.soHD || '').localeCompare(a.hd.soHD || ''));
  });

  protected readonly facets = computed<Facet[]>(() => [
    { key: 'hd', label: 'Hợp đồng', options: this.all().map((r) => ({ value: r.hd.id, label: r.hd.soHD || '(chưa có số)', hint: r.hd.tenKH })) },
  ]);
  protected readonly rows = computed(() => {
    const l = this.loc();
    return this.all().filter(
      (r) =>
        khopSel(l, 'hd', r.hd.id) &&
        khopQ(l, r.hd.soHD, r.hd.tenKH, ...r.dong.map((d) => `${d.lo} ${d.loaiHang} ${this.store.loaiHangTen(d.loaiHang)} ${d.tenTrenHD}`)),
    );
  });
  protected readonly pg = paginate(this.rows);
  protected readonly tongAll = computed(() => sum(this.rows(), (r) => r.tong));
  protected readonly slAll = computed(() => sum(this.rows(), (r) => r.sl));
  protected readonly soHdXuat = computed(() => this.rows().filter((r) => r.soPhieu > 0).length);

  protected lat(id: string): void {
    this.mo.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  protected xuatCsv(): void {
    const rows: (string | number)[][] = [['Số HĐ', 'Khách hàng', 'Ngày xuất', 'Số phiếu', 'Mã lô', 'Mã hàng', 'Quy cách lô', 'Tên trên HĐ', 'SL', 'Đơn giá vốn', 'Giá vốn', 'Cách tính']];
    for (const r of this.rows())
      for (const d of r.dong)
        rows.push([r.hd.soHD, r.hd.tenKH, viDate(d.ngay), d.soPhieu, d.lo, d.loaiHang, d.quyCach, d.tenTrenHD, d.sl, d.donGia, Math.round(d.thanhTien), d.cach]);
    downloadFile(fileName('gia-von-theo-hd', 'csv'), 'text/csv', csv(rows));
  }
}
