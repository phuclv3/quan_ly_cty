import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { hdbCalc } from '../core/calc';
import { TRANG_THAI_HDB } from '../core/models';
import { sum, vndShort } from '../core/util';
import { chuVietTat, mauAvatar } from '../shared/avatar';

const tr = (v: number) => (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 });

/** Tab "Báo cáo kinh doanh" của Hợp đồng bán: doanh số ký theo tháng, theo trạng thái, theo Sale, top khách. */
@Component({
  selector: 'app-hdb-bao-cao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loc">
      <select aria-label="Năm" (change)="nam.set($any($event.target).value)">
        @for (y of nams; track y) { <option [value]="y" [selected]="'' + y === nam()">Năm {{ y }}</option> }
      </select>
      <span class="sub">Tính theo ngày ký, không gồm Báo giá và HĐ Huỷ</span>
    </div>
    @let d = bc();
    <div class="kpis">
      <div class="k hero"><span class="l">Doanh số ký</span><b class="v">{{ short(d.tong) }}</b><span class="s">{{ d.n }} HĐ · sau VAT</span></div>
      <div class="k"><span class="l">Đã thu</span><b class="v">{{ short(d.daThu) }}</b><span class="s">{{ d.tong ? round(d.daThu * 100 / d.tong) : 0 }}% giá trị</span></div>
      <div class="k"><span class="l">Còn phải thu</span><b class="v">{{ short(d.conThu) }}</b><span class="s">{{ d.quaHan }} HĐ có đợt quá hạn</span></div>
      <div class="k"><span class="l">Giá trị TB / HĐ</span><b class="v">{{ d.n ? short(d.tong / d.n) : '—' }}</b><span class="s">sau VAT</span></div>
    </div>
    <div class="row2">
      <section class="card-b">
        <h3>Doanh số ký theo tháng <span class="u">triệu đ</span></h3>
        <svg class="bar" viewBox="0 0 560 200" role="img" aria-label="Doanh số ký theo tháng">
          @for (m of d.thangs; track m.t; let i = $index) {
            <rect [attr.x]="14 + i * 45 + 6" [attr.y]="165 - m.v * 140 / d.max" [attr.width]="30" [attr.height]="m.v * 140 / d.max" rx="3" fill="#0f5a2a" />
            @if (m.v) { <text [attr.x]="14 + i * 45 + 21" [attr.y]="161 - m.v * 140 / d.max" text-anchor="middle" class="ax">{{ tr(m.v) }}</text> }
            <text [attr.x]="14 + i * 45 + 21" y="184" text-anchor="middle" class="ax">T{{ m.t }}</text>
          }
        </svg>
      </section>
      <section class="card-b">
        <h3>Theo trạng thái</h3>
        @for (s of d.theoTT; track s.nhan) {
          <div class="hb"><span class="hl">{{ s.nhan }}</span><span class="hbar"><i [style.width.%]="s.pct"></i></span><b class="num">{{ s.n }}</b></div>
        }
      </section>
    </div>
    <section class="card-b wide">
      <h3>Theo người phụ trách</h3>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Sale</th><th class="num">Số HĐ</th><th class="num">Giá trị</th><th class="num">Đã thu</th><th class="num">Còn phải thu</th></tr></thead>
        <tbody>
          @for (r of d.sales; track r.id) {
            <tr><td><span class="pt"><span class="av" [style.background]="mau(r.id)">{{ vt(r.ten) }}</span>{{ r.ten }}</span></td><td class="num">{{ r.n }}</td><td class="num">{{ short(r.tong) }}</td><td class="num">{{ short(r.daThu) }}</td><td class="num">{{ short(r.conThu) }}</td></tr>
          } @empty { <tr><td colspan="5" class="empty">Chưa có HĐ trong năm.</td></tr> }
        </tbody>
      </table></div>
    </section>
    <section class="card-b wide">
      <h3>Top 5 khách hàng theo giá trị</h3>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>#</th><th>Khách hàng</th><th class="num">Số HĐ</th><th class="num">Giá trị</th></tr></thead>
        <tbody>
          @for (r of d.top; track r.ten; let i = $index) {
            <tr><td>{{ i + 1 }}</td><td><b>{{ r.ten }}</b></td><td class="num">{{ r.n }}</td><td class="num">{{ short(r.tong) }}</td></tr>
          } @empty { <tr><td colspan="4" class="empty">Chưa có HĐ trong năm.</td></tr> }
        </tbody>
      </table></div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .loc { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }
    .loc select { width: auto; min-height: 34px; padding: 4px 12px; border-radius: 999px; background: var(--surf); border: 0; font-size: 12.5px; font-weight: 600; }
    .kpis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); margin-bottom: 14px; }
    .k { display: grid; gap: 4px; align-content: start; background: var(--surf); border-radius: 14px; padding: 12px 14px; min-width: 0; }
    .k.hero { background: linear-gradient(135deg, #0f7a3d, #19a05a); color: #fff; }
    .k .l { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
    .k.hero .l, .k.hero .s { color: #fff; }
    .k .v { font-size: 26px; line-height: 1.15; }
    .k .s { font-size: 11.5px; color: var(--ink-3); }
    .row2 { display: grid; gap: 12px; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); margin-bottom: 12px; }
    @media (max-width: 900px) { .row2 { grid-template-columns: minmax(0, 1fr); } }
    .card-b { background: var(--surf); border-radius: 16px; padding: 14px 16px; min-width: 0; }
    .card-b.wide { margin-bottom: 12px; }
    .card-b h3 { font-size: 13.5px; margin-bottom: 10px; display: flex; justify-content: space-between; gap: 8px; }
    .u { font-size: 11px; font-weight: 500; color: var(--ink-3); }
    .bar { width: 100%; height: auto; }
    .ax { font-size: 9px; fill: var(--ink-3); }
    .hb { display: grid; grid-template-columns: minmax(80px, 36%) 1fr 30px; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12.5px; }
    .hl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hbar { height: 10px; border-radius: 5px; background: var(--surf-3); overflow: hidden; }
    .hbar i { display: block; height: 100%; border-radius: 5px; background: linear-gradient(90deg, #0f7a3d, #4bb04f); }
    .tbl-wrap { border-radius: 10px; border: 1px solid var(--line); box-shadow: none; overflow: auto; }
    .tbl { font-size: 12.5px; }
    .tbl thead th { background: var(--panel); font-size: 12px; white-space: nowrap; }
    .pt { display: inline-flex; align-items: center; gap: 6px; }
    .av { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; color: #fff; font-size: 9.5px; font-weight: 700; }
  `,
})
export class HdbBaoCao {
  private readonly store = inject(Store);
  protected readonly short = vndShort;
  protected readonly tr = tr;
  protected readonly round = Math.round;
  protected readonly mau = mauAvatar;
  protected readonly vt = chuVietTat;
  protected readonly nams = (() => {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2, y - 3];
  })();
  protected readonly nam = signal(String(new Date().getFullYear()));

  protected readonly bc = computed(() => {
    const db = this.store.db();
    const y = this.nam();
    const rs = this.store
      .hdbVisible()
      .filter((h) => h.trangThai !== TT.BAO_GIA && h.trangThai !== TT.HUY && h.ngayKy?.startsWith(y))
      .map((h) => ({ h, c: hdbCalc(h, db) }));
    const thangs = Array.from({ length: 12 }, (_, i) => ({
      t: i + 1,
      v: sum(rs.filter((r) => r.h.ngayKy!.slice(5, 7) === String(i + 1).padStart(2, '0')), (r) => r.c.sauVAT),
    }));
    const dem = new Map<string, number>();
    for (const r of rs) dem.set(r.h.trangThai, (dem.get(r.h.trangThai) ?? 0) + 1);
    const maxTT = Math.max(1, ...dem.values());
    const theoTT = TRANG_THAI_HDB.filter((t) => dem.has(t)).map((t) => ({ nhan: ttNhan(t), n: dem.get(t)!, pct: (dem.get(t)! / maxTT) * 100 }));
    const nhom = <K extends string>(key: (r: (typeof rs)[number]) => K) => {
      const m = new Map<K, typeof rs>();
      for (const r of rs) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
      return [...m];
    };
    const sales = nhom((r) => r.h.sale)
      .map(([id, xs]) => ({ id, ten: this.store.userName(id), n: xs.length, tong: sum(xs, (r) => r.c.sauVAT), daThu: sum(xs, (r) => r.c.daThu), conThu: sum(xs, (r) => r.c.conPhaiThu) }))
      .sort((a, b) => b.tong - a.tong);
    const top = nhom((r) => r.h.tenKH)
      .map(([ten, xs]) => ({ ten, n: xs.length, tong: sum(xs, (r) => r.c.sauVAT) }))
      .sort((a, b) => b.tong - a.tong)
      .slice(0, 5);
    return {
      n: rs.length,
      tong: sum(rs, (r) => r.c.sauVAT),
      daThu: sum(rs, (r) => r.c.daThu),
      conThu: sum(rs, (r) => r.c.conPhaiThu),
      quaHan: rs.filter((r) => r.c.quaHan > 0).length,
      thangs,
      max: Math.max(1, ...thangs.map((m) => m.v)),
      theoTT,
      sales,
      top,
    };
  });
}
