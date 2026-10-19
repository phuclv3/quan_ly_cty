import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { donGiaGoc } from '../core/calc';
import { HopDongBan } from '../core/models';
import { Store } from '../core/store';
import { nhoLoc } from '../core/ui';
import { money, sum } from '../core/util';
import { csv, downloadFile, fileName } from '../shared/export';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { Kpi } from '../shared/ui-kit';

interface DongGT {
  loaiHang: string;
  thuocTinh: string;
  sl: number;
  thanhTien: number;
  cach: string;
}
interface HdGT {
  hd: HopDongBan;
  soPhieu: number;
  dong: DongGT[];
  sl: number;
  tong: number;
}

/** KHO-10: giá trị thực hiện gốc theo HĐ Bán (từ phiếu Xuất Hiệu lực). */
@Component({
  selector: 'app-kho-gia-tri',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterBar, Pager, Kpi, RouterLink],
  template: `
    <div class="note info">
      <b>Cách tính Đơn giá gốc (D-19):</b> Đích danh theo HĐ Mua liên quan của HĐ Bán (đúng loại hàng, ưu tiên cùng thông số; ngoại tệ dùng tỷ giá lúc mua);
      còn lại bình quân gia quyền theo Loại hàng + thuộc tính + Kho từ các phiếu nhập trước ngày xuất. Giá gốc được tính và lưu khi lập phiếu xuất;
      tổng giá trị thực hiện gốc dùng làm Giá vốn ở HĐ Bán (HDB-11).
    </div>
    <div class="kpis">
      <app-kpi label="Số HĐ đã xuất kho" [value]="money(rows().length)" />
      <app-kpi label="Tổng giá trị thực hiện gốc" [value]="money(tongAll())" sub="VNĐ, theo bộ lọc" />
    </div>
    <div class="section-title">
      <span></span>
      <button type="button" class="btn sm quiet" (click)="xuatCsv()">Xuất Excel</button>
    </div>
    <app-filter [(loc)]="loc" memo="kho-gia-tri" [time]="false" [facets]="facets()" placeholder="Tìm số HĐ, khách hàng, loại hàng…" />
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead><tr><th>Số HĐ</th><th>Khách hàng</th><th class="num">Số phiếu xuất</th><th class="num">Số mặt hàng</th><th class="num">Tổng SL</th><th class="num">Tổng giá trị thực hiện gốc</th></tr></thead>
        <tbody>
          @for (r of pg.items(); track r.hd.id) {
            <tr class="click" (click)="lat(r.hd.id)" [attr.aria-expanded]="mo().has(r.hd.id)">
              <td>{{ mo().has(r.hd.id) ? '▾' : '▸' }} <a [routerLink]="['/hop-dong-ban', r.hd.id]" (click)="$event.stopPropagation()"><b>{{ r.hd.soHD || '(chưa có số)' }}</b></a></td>
              <td>{{ r.hd.tenKH }}</td>
              <td class="num">{{ r.soPhieu }}</td>
              <td class="num">{{ r.dong.length }}</td>
              <td class="num">{{ money(r.sl) }}</td>
              <td class="num"><b>{{ money(r.tong) }}</b></td>
            </tr>
            @if (mo().has(r.hd.id)) {
              <tr>
                <td colspan="6" style="padding:0 0 10px 24px">
                  <table class="tbl compact">
                    <thead><tr><th>Loại hàng</th><th>Thuộc tính</th><th class="num">SL</th><th class="num">Đơn giá gốc</th><th class="num">Thành tiền gốc</th><th>Cách tính</th></tr></thead>
                    <tbody>
                      @for (d of r.dong; track $index) {
                        <tr>
                          <td>{{ store.loaiHangTen(d.loaiHang) }} <span class="sub">{{ d.loaiHang }}</span></td>
                          <td>{{ d.thuocTinh || '—' }}</td>
                          <td class="num">{{ money(d.sl) }}</td>
                          <td class="num" title="Thành tiền gốc ÷ SL">{{ money(d.sl ? d.thanhTien / d.sl : 0) }}</td>
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
    <p class="hint muted">Bấm dòng để xem các mặt hàng đã xuất. Không tính phiếu Đã huỷ. Cột "Cách tính" là phương pháp áp dụng theo dữ liệu hiện tại (tham khảo).</p>
  `,
})
export class GiaTriHdTab {
  protected readonly store = inject(Store);
  protected readonly money = money;
  protected readonly loc = signal<Loc>(nhoLoc('kho-gia-tri', LOC_RONG));
  protected readonly mo = signal<ReadonlySet<string>>(new Set());

  private readonly all = computed<HdGT[]>(() => {
    const db = this.store.db();
    const out: HdGT[] = [];
    for (const hd of this.store.hdbVisible()) {
      const ps = db.phieuKho.filter((p) => p.loai === 'Xuất' && p.hdId === hd.id && p.trangThai === 'Hiệu lực');
      if (!ps.length) continue;
      const m = new Map<string, DongGT>();
      for (const p of ps)
        for (const d of p.dong) {
          const k = `${d.loaiHang}\u0001${d.thuocTinh}`;
          let g = m.get(k);
          if (!g) {
            const c = donGiaGoc(db, { hdbId: hd.id, loaiHang: d.loaiHang, thuocTinh: d.thuocTinh, kho: p.kho, ngay: p.ngay }).cach;
            g = { loaiHang: d.loaiHang, thuocTinh: d.thuocTinh, sl: 0, thanhTien: 0, cach: c === 'Bình quân' ? 'Bình quân gia quyền' : c };
            m.set(k, g);
          }
          g.sl += d.soLuong;
          g.thanhTien += (d.donGiaGoc ?? 0) * d.soLuong;
        }
      const dong = [...m.values()];
      out.push({ hd, soPhieu: ps.length, dong, sl: sum(dong, (d) => d.sl), tong: sum(dong, (d) => d.thanhTien) });
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
        khopQ(l, r.hd.soHD, r.hd.tenKH, ...r.dong.map((d) => `${d.loaiHang} ${this.store.loaiHangTen(d.loaiHang)} ${d.thuocTinh}`)),
    );
  });
  protected readonly pg = paginate(this.rows);
  protected readonly tongAll = computed(() => sum(this.rows(), (r) => r.tong));
  protected readonly slAll = computed(() => sum(this.rows(), (r) => r.sl));

  protected lat(id: string): void {
    this.mo.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  protected xuatCsv(): void {
    const rows: (string | number)[][] = [['Số HĐ', 'Khách hàng', 'Mã loại hàng', 'Loại hàng', 'Thuộc tính', 'SL', 'Đơn giá gốc', 'Thành tiền gốc', 'Cách tính']];
    for (const r of this.rows())
      for (const d of r.dong)
        rows.push([r.hd.soHD, r.hd.tenKH, d.loaiHang, this.store.loaiHangTen(d.loaiHang), d.thuocTinh, d.sl, Math.round(d.sl ? d.thanhTien / d.sl : 0), Math.round(d.thanhTien), d.cach]);
    downloadFile(fileName('gia-tri-theo-hd', 'csv'), 'text/csv', csv(rows));
  }
}
