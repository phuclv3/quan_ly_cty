import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { tonTheoLo } from '../core/calc';
import { Store } from '../core/store';
import { TT } from '../core/trang-thai';
import { money, num, sum, todayIso, viDate, vndShort } from '../core/util';
import { xuatExcel } from '../shared/export';

interface DongBc {
  loaiHang: string;
  ten: string;
  dvt: string;
  dau: number;
  nhap: number;
  chuyenDen: number;
  xuat: number;
  chuyenDi: number;
  cuoi: number;
  soLo: number;
  giaTri: number;
}

/** Báo cáo tồn kho của từng kho: tồn đầu kỳ, nhập, chuyển đến, xuất, chuyển đi, tồn cuối và giá trị (theo đơn giá lô). */
@Component({
  selector: 'app-kho-ton-theo-kho',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; }
    .loc { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: end; margin-bottom: 14px; }
    .loc .field { min-width: 170px; }
    .kpis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)); margin-bottom: 14px; }
    .k { background: var(--surf); border-radius: 14px; padding: 12px 14px; }
    .k .l { font-size: 12.5px; font-weight: 600; color: var(--ink-2); display: block; }
    .k .v { font-size: 24px; font-weight: 700; }
    .panel { background: var(--surf); border-radius: 18px; padding: 14px 16px 16px; }
    .tbl tfoot td { font-weight: 700; }
    .z { color: var(--ink-3); }
  `,
  template: `
    <div class="loc">
      <div class="field">
        <label for="tk-kho">Kho</label>
        <select id="tk-kho" (change)="kho.set($any($event.target).value)">
          @for (k of store.khoDangDung(); track k.id) { <option [value]="k.id" [selected]="k.id === khoId()">{{ k.ten }}</option> }
        </select>
      </div>
      <div class="field">
        <label for="tk-tu">Từ ngày</label>
        <input id="tk-tu" type="date" [value]="tu()" (input)="tu.set($any($event.target).value)" />
      </div>
      <div class="field">
        <label for="tk-den">Đến ngày</label>
        <input id="tk-den" type="date" [value]="den()" (input)="den.set($any($event.target).value)" />
      </div>
      <label class="sub"><input type="checkbox" [checked]="chiCoSoDu()" (change)="chiCoSoDu.set($any($event.target).checked)" /> Chỉ mã còn tồn / có phát sinh</label>
      <span class="sp" style="flex:1"></span>
      <button type="button" class="btn sm quiet" (click)="xuat()">Xuất Excel</button>
    </div>

    <div class="kpis">
      <div class="k"><span class="l">Tồn cuối kỳ</span><b class="v">{{ num(tong().cuoi) }}</b></div>
      <div class="k"><span class="l">Giá trị tồn cuối kỳ</span><b class="v">{{ vndShort(tong().giaTri) }}</b></div>
      <div class="k"><span class="l">Chuyển đến / đi trong kỳ</span><b class="v">{{ num(tong().chuyenDen) }} / {{ num(tong().chuyenDi) }}</b></div>
      <div class="k"><span class="l">Số mã có tồn</span><b class="v">{{ soMaCoTon() }}</b></div>
    </div>

    <section class="panel">
      <p class="sub">Kho: <b>{{ store.khoTen(khoId()) }}</b> · kỳ {{ tu() ? viDate(tu()) : 'từ đầu' }} – {{ viDate(den()) }}. Giá trị theo đơn giá lô (chưa VAT); phiếu Đã huỷ không tính. Nhập / Xuất không gồm phần chuyển kho.</p>
      <div class="tbl-wrap">
        <table class="tbl compact">
          <thead><tr><th>Mã hàng</th><th>Tên</th><th>ĐVT</th><th class="num">Tồn đầu</th><th class="num">Nhập</th><th class="num">Chuyển đến</th><th class="num">Xuất</th><th class="num">Chuyển đi</th><th class="num">Tồn cuối</th><th class="num">Số lô</th><th class="num">Giá trị tồn</th></tr></thead>
          <tbody>
            @for (r of dong(); track r.loaiHang) {
              <tr>
                <td><b>{{ r.loaiHang }}</b></td>
                <td>{{ r.ten }}</td>
                <td>{{ r.dvt }}</td>
                <td class="num">{{ num(r.dau) }}</td>
                <td class="num" [class.z]="!r.nhap">{{ num(r.nhap) }}</td>
                <td class="num" [class.z]="!r.chuyenDen">{{ num(r.chuyenDen) }}</td>
                <td class="num" [class.z]="!r.xuat">{{ num(r.xuat) }}</td>
                <td class="num" [class.z]="!r.chuyenDi">{{ num(r.chuyenDi) }}</td>
                <td class="num"><b>{{ num(r.cuoi) }}</b></td>
                <td class="num">{{ r.soLo }}</td>
                <td class="num">{{ money(r.giaTri) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="11" class="muted">Kho này chưa có tồn hoặc phát sinh trong kỳ</td></tr>
            }
          </tbody>
          @if (dong().length) {
            <tfoot>
              <tr>
                <td colspan="3">Tổng</td>
                <td class="num">{{ num(tong().dau) }}</td><td class="num">{{ num(tong().nhap) }}</td><td class="num">{{ num(tong().chuyenDen) }}</td>
                <td class="num">{{ num(tong().xuat) }}</td><td class="num">{{ num(tong().chuyenDi) }}</td><td class="num">{{ num(tong().cuoi) }}</td>
                <td class="num">{{ tong().soLo }}</td><td class="num">{{ money(tong().giaTri) }}</td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
    </section>
  `,
})
export class TonTheoKhoTab {
  protected readonly store = inject(Store);
  protected readonly num = num;
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly vndShort = vndShort;

  protected readonly kho = signal('');
  protected readonly tu = signal('');
  protected readonly den = signal(todayIso());
  protected readonly chiCoSoDu = signal(true);

  protected readonly khoId = computed(() => this.kho() || this.store.khoDangDung()[0]?.id || '');

  protected readonly dong = computed<DongBc[]>(() => {
    const db = this.store.db();
    const kho = this.khoId();
    const tu = this.tu();
    const den = this.den() || todayIso();
    const map = new Map<string, DongBc>();
    const row = (ma: string): DongBc => {
      let r = map.get(ma);
      if (!r) {
        const lh = this.store.loaiHangById(ma);
        r = { loaiHang: ma, ten: lh?.ten ?? '', dvt: lh?.dvt ?? '', dau: 0, nhap: 0, chuyenDen: 0, xuat: 0, chuyenDi: 0, cuoi: 0, soLo: 0, giaTri: 0 };
        map.set(ma, r);
      }
      return r;
    };
    for (const p of db.phieuKho) {
      if (p.trangThai !== TT.HIEU_LUC || p.kho !== kho || p.ngay > den) continue;
      const truoc = !!tu && p.ngay < tu;
      const ck = p.nguonGoc === 'Chuyển kho';
      for (const d of p.dong) {
        const r = row(d.loaiHang);
        const dau = p.loai === 'Nhập' ? d.soLuong : -d.soLuong;
        if (truoc) r.dau += dau;
        else if (p.loai === 'Nhập') (ck ? (r.chuyenDen += d.soLuong) : (r.nhap += d.soLuong));
        else ck ? (r.chuyenDi += d.soLuong) : (r.xuat += d.soLuong);
      }
    }
    for (const l of tonTheoLo(db, den)) {
      if (l.kho !== kho) continue;
      const r = row(l.loaiHang);
      r.giaTri += l.giaTriTon;
      if (l.ton > 0) r.soLo++;
    }
    for (const r of map.values()) r.cuoi = r.dau + r.nhap + r.chuyenDen - r.xuat - r.chuyenDi;
    return [...map.values()]
      .filter((r) => !this.chiCoSoDu() || r.cuoi !== 0 || r.dau !== 0 || r.nhap || r.chuyenDen || r.xuat || r.chuyenDi)
      .sort((a, b) => a.loaiHang.localeCompare(b.loaiHang));
  });

  protected readonly tong = computed(() => {
    const d = this.dong();
    return {
      dau: sum(d, (r) => r.dau),
      nhap: sum(d, (r) => r.nhap),
      chuyenDen: sum(d, (r) => r.chuyenDen),
      xuat: sum(d, (r) => r.xuat),
      chuyenDi: sum(d, (r) => r.chuyenDi),
      cuoi: sum(d, (r) => r.cuoi),
      soLo: sum(d, (r) => r.soLo),
      giaTri: sum(d, (r) => r.giaTri),
    };
  });
  protected readonly soMaCoTon = computed(() => this.dong().filter((r) => r.cuoi > 0).length);

  protected xuat(): void {
    const rows: (string | number)[][] = [['Mã hàng', 'Tên', 'ĐVT', 'Tồn đầu', 'Nhập', 'Chuyển đến', 'Xuất', 'Chuyển đi', 'Tồn cuối', 'Số lô', 'Giá trị tồn']];
    for (const r of this.dong()) rows.push([r.loaiHang, r.ten, r.dvt, r.dau, r.nhap, r.chuyenDen, r.xuat, r.chuyenDi, r.cuoi, r.soLo, Math.round(r.giaTri)]);
    const t = this.tong();
    rows.push(['Tổng', '', '', t.dau, t.nhap, t.chuyenDen, t.xuat, t.chuyenDi, t.cuoi, t.soLo, Math.round(t.giaTri)]);
    void xuatExcel(`ton-kho-${this.store.khoTen(this.khoId())}-${this.den()}`, rows);
  }
}
