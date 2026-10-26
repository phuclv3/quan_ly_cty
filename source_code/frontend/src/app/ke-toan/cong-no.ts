import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { Db, HopDongMua } from '../core/models';
import { dotMuaDaTra, hdbCalc, hdmCalc, soNgayQuaHan } from '../core/calc';
import { matches, money, sum, viDate } from '../core/util';
import { Kpi } from '../shared/ui-kit';
import { Pager, paginate } from '../shared/pager';
import { xuatExcel } from '../shared/export';
import { TT } from '../core/trang-thai';

interface CnRow {
  id: string;
  soHD: string;
  doiTac: string;
  doiTacId: string;
  /** Số hoá đơn đã nhập ở hồ sơ HĐ (nhiều hoá đơn nối bằng ', '). */
  soHoaDon: string;
  giaTri: number;
  da: number;
  con: number;
  han?: string;
  quaHan: number;
}

interface Nhom {
  key: string;
  ten: string;
  rows: CnRow[];
  giaTri: number;
  da: number;
  con: number;
}

/** Hạn đợt gần nhất chưa trả đủ của HĐ Mua (đợt chỉ tính đã trả khi phiếu chi được duyệt). */
function hanGanNhatMua(m: HopDongMua, db: Db): string | undefined {
  return m.dotTT
    .filter((d) => d.han && dotMuaDaTra(m, d, db) < d.soTien)
    .map((d) => d.han!)
    .sort()[0];
}

function soHoaDonCua(db: Db, chu: 'HDB' | 'HDM', id: string): string {
  return db.hoaDon.filter((x) => x.chu === chu && x.chuId === id).map((x) => x.soHoaDon).join(', ');
}

function gom(rows: CnRow[]): Nhom[] {
  const map = new Map<string, Nhom>();
  for (const r of rows) {
    let g = map.get(r.doiTacId);
    if (!g) {
      g = { key: r.doiTacId, ten: r.doiTac, rows: [], giaTri: 0, da: 0, con: 0 };
      map.set(r.doiTacId, g);
    }
    g.rows.push(r);
    g.giaTri += r.giaTri;
    g.da += r.da;
    g.con += r.con;
  }
  return [...map.values()].sort((a, b) => b.con - a.con);
}

/** Tab Công nợ: Phải thu (KT-17) / Phải trả (KT-18). Không tính Phú Tài (PT-11). */
@Component({
  selector: 'app-kt-cong-no',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Kpi, Pager],
  template: `
    <div class="row" style="margin-bottom:12px">
      <div class="btn-row" role="tablist">
        <button type="button" class="btn sm" [class.quiet]="sub() !== 'thu'" (click)="sub.set('thu')">Phải thu</button>
        <button type="button" class="btn sm" [class.quiet]="sub() !== 'tra'" (click)="sub.set('tra')">Phải trả</button>
      </div>
      <label class="search"><input type="search" [placeholder]="sub() === 'thu' ? 'Tìm số HĐ, số hoá đơn, khách hàng…' : 'Tìm số HĐ, số hoá đơn, NCC…'" [value]="q()" (input)="q.set($any($event.target).value)" /></label>
      <label class="check-row"><input type="checkbox" [checked]="nhom()" (change)="nhom.set($any($event.target).checked)" /> Gộp theo {{ sub() === 'thu' ? 'khách hàng' : 'NCC' }}</label>
      <label class="check-row"><input type="checkbox" [checked]="conNo()" (change)="conNo.set($any($event.target).checked)" /> Chỉ HĐ còn nợ</label>
      <span style="flex:1"></span>
      <button type="button" class="btn quiet" (click)="xuat()">Xuất Excel</button>
    </div>

    <div class="kpis">
      <app-kpi [label]="sub() === 'thu' ? 'Tổng còn phải thu' : 'Tổng còn phải trả'" [value]="money(tong().con) + ' đ'" [sub]="rows().length + ' HĐ'" />
      <app-kpi [label]="sub() === 'thu' ? 'Đã thu' : 'Đã trả'" [value]="money(tong().da) + ' đ'" [sub]="'trên ' + money(tong().giaTri) + ' đ'" />
      <app-kpi label="HĐ quá hạn" [value]="'' + soQuaHan()" [tone]="soQuaHan() ? 'bad' : ''" />
    </div>
    @if (store.ownOnly('congNo')) { <p class="sub muted">Bạn chỉ thấy công nợ các HĐ mình phụ trách.</p> }

    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead>
          <tr>
            <th>Số HĐ</th><th>Số hoá đơn</th><th>{{ sub() === 'thu' ? 'Khách hàng' : 'Nhà cung cấp' }}</th>
            <th class="num">{{ sub() === 'thu' ? 'Giá trị sau VAT' : 'Giá trị HĐ' }}</th>
            <th class="num">{{ sub() === 'thu' ? 'Đã thu' : 'Đã trả' }}</th>
            <th class="num">{{ sub() === 'thu' ? 'Còn phải thu' : 'Còn phải trả' }}</th>
            <th>Hạn đợt gần nhất</th><th class="num">Số ngày quá hạn</th>
          </tr>
        </thead>
        @if (nhom()) {
          @for (g of nhoms(); track g.key) {
            <tbody>
              <tr><th colspan="3">{{ g.ten }} <span class="muted">({{ g.rows.length }} HĐ)</span></th><th class="num">{{ money(g.giaTri) }}</th><th class="num">{{ money(g.da) }}</th><th class="num">{{ money(g.con) }}</th><th colspan="2"></th></tr>
              @for (r of g.rows; track r.id) {
                <tr class="click" [class.overdue]="r.quaHan > 0" (click)="mo(r)">
                  <td><a [routerLink]="[duongDan(), r.id]" [queryParams]="{ tab: tabDich() }" (click)="$event.stopPropagation()"><b>{{ r.soHD }}</b></a></td><td>{{ r.soHoaDon || '—' }}</td><td>{{ r.doiTac }}</td><td class="num">{{ money(r.giaTri) }}</td><td class="num">{{ money(r.da) }}</td>
                  <td class="num" [class.neg]="r.con < 0">{{ money(r.con) }}</td><td>{{ viDate(r.han) }}</td><td class="num">{{ r.quaHan || '' }}</td>
                </tr>
              }
            </tbody>
          }
        } @else {
          <tbody>
            @for (r of pg.items(); track r.id) {
              <tr class="click" [class.overdue]="r.quaHan > 0" (click)="mo(r)">
                <td><a [routerLink]="[duongDan(), r.id]" [queryParams]="{ tab: tabDich() }" (click)="$event.stopPropagation()"><b>{{ r.soHD }}</b></a></td><td>{{ r.soHoaDon || '—' }}</td><td>{{ r.doiTac }}</td><td class="num">{{ money(r.giaTri) }}</td><td class="num">{{ money(r.da) }}</td>
                <td class="num" [class.neg]="r.con < 0">{{ money(r.con) }}</td><td>{{ viDate(r.han) }}</td><td class="num">{{ r.quaHan || '' }}</td>
              </tr>
            }
          </tbody>
        }
        @if (!rows().length) { <tbody><tr><td colspan="8" class="empty">{{ q() || conNo() ? 'Không có công nợ khớp bộ lọc' : 'Không có công nợ' }}</td></tr></tbody> }
        <tfoot>
          <tr><th colspan="3">Tổng toàn bộ</th><td class="num">{{ money(tong().giaTri) }}</td><td class="num">{{ money(tong().da) }}</td><td class="num">{{ money(tong().con) }}</td><td colspan="2"></td></tr>
        </tfoot>
      </table>
    </div>
    @if (!nhom()) { <app-pager [pager]="pg" /> }
    <p class="sub muted" style="margin-top:8px">
      @if (sub() === 'thu') { Còn phải thu = Giá trị HĐ bán sau VAT − Σ thực thu có phiếu Thu đã duyệt (phiếu chờ duyệt chưa tính). Không tính HĐ Báo giá. Muốn sửa thì sửa đợt thanh toán trong HĐ gốc. }
      @else { Còn phải trả = Giá trị HĐ mua − Σ đã trả NCC (phiếu chi đã duyệt). Không tính HĐ Thuộc Phú Tài và HĐ Huỷ. }
    </p>
  `,
})
export class CongNoTab {
  protected readonly store = inject(Store);
  private readonly router = inject(Router);
  protected readonly money = money;
  protected readonly viDate = viDate;

  protected readonly sub = signal<'thu' | 'tra'>('thu');
  protected readonly q = signal('');
  protected readonly nhom = signal(false);
  protected readonly conNo = signal(false);

  private readonly thu = computed<CnRow[]>(() => {
    const db = this.store.db();
    const me = this.store.meId();
    const own = this.store.ownOnly('congNo');
    return db.hopDongBan
      .filter((h) => h.trangThai !== TT.BAO_GIA && h.trangThai !== TT.HUY && (!own || h.sale === me))
      .map((h) => {
        const c = hdbCalc(h, db);
        const han = c.dotGanNhat?.han;
        return { id: h.id, soHD: h.soHD, doiTac: h.tenKH, doiTacId: h.maKH, soHoaDon: soHoaDonCua(db, 'HDB', h.id), giaTri: c.sauVAT, da: c.daThu, con: c.conPhaiThu, han, quaHan: soNgayQuaHan(han) };
      });
  });

  private readonly tra = computed<CnRow[]>(() => {
    const db = this.store.db();
    const me = this.store.meId();
    const own = this.store.ownOnly('congNo');
    const mine = new Set(db.hopDongBan.filter((h) => h.sale === me).map((h) => h.id));
    return db.hopDongMua
      .filter((m) => !m.thuocPhuTai && m.trangThai !== TT.HUY && (!own || (!!m.hdbId && mine.has(m.hdbId))))
      .map((m) => {
        const c = hdmCalc(m, db);
        const han = hanGanNhatMua(m, db);
        return { id: m.id, soHD: m.soHD, doiTac: m.tenNCC, doiTacId: m.maNCC, soHoaDon: soHoaDonCua(db, 'HDM', m.id), giaTri: c.tong, da: c.daTra, con: c.conPhaiTra, han, quaHan: soNgayQuaHan(han) };
      });
  });

  protected readonly rows = computed(() => {
    const q = this.q();
    return (this.sub() === 'thu' ? this.thu() : this.tra())
      .filter((r) => (!this.conNo() || r.con > 0) && matches(q, r.soHD, r.soHoaDon, r.doiTac))
      .sort((a, b) => b.quaHan - a.quaHan || b.con - a.con);
  });
  protected readonly pg = paginate(this.rows);
  protected readonly nhoms = computed(() => gom(this.rows()));
  protected readonly tong = computed(() => {
    const r = this.rows();
    return { giaTri: sum(r, (x) => x.giaTri), da: sum(r, (x) => x.da), con: sum(r, (x) => x.con) };
  });
  protected readonly soQuaHan = computed(() => this.rows().filter((r) => r.quaHan > 0).length);

  protected duongDan(): string {
    return this.sub() === 'thu' ? '/hop-dong-ban' : '/hop-dong-mua';
  }
  /** Mở thẳng tab thanh toán của HĐ: HĐ bán tab 3, HĐ mua tab 4. */
  protected tabDich(): string {
    return this.sub() === 'thu' ? '3' : '4';
  }

  protected mo(r: CnRow): void {
    void this.router.navigate([this.duongDan(), r.id], { queryParams: { tab: this.tabDich() } });
  }

  protected xuat(): void {
    const t = this.sub() === 'thu';
    const head = ['Số HĐ', 'Số hoá đơn', t ? 'Khách hàng' : 'Nhà cung cấp', t ? 'Giá trị sau VAT' : 'Giá trị HĐ', t ? 'Đã thu' : 'Đã trả', t ? 'Còn phải thu' : 'Còn phải trả', 'Hạn đợt gần nhất', 'Số ngày quá hạn'];
    const body: (string | number)[][] = this.rows().map((r) => [r.soHD, r.soHoaDon, r.doiTac, r.giaTri, r.da, r.con, viDate(r.han), r.quaHan]);
    const tg = this.tong();
    body.push(['Tổng', '', '', tg.giaTri, tg.da, tg.con, '', '']);
    void xuatExcel(t ? 'cong-no-phai-thu' : 'cong-no-phai-tra', [head, ...body]);
  }
}
