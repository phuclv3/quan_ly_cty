import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DongLo, DongTon, lechKiemKe, tonKho, tonTheoLo } from '../core/calc';
import { KHO_CHUYEN_THANG, KiemKe } from '../core/models';
import { Store } from '../core/store';
import { nhoLoc } from '../core/ui';
import { money, sum, viDate, vndShort } from '../core/util';
import { xuatCsv } from '../shared/export';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { Kpi, Modal } from '../shared/ui-kit';
import { hdCuaPhieu, khoOpts, nhomOpts, theKho } from './kho-util';

type Che = 'ma' | 'lo';

interface Chon {
  loaiHang?: string;
  lo?: string;
  kho?: string;
  ten: string;
}

const CON_HANG_OPTS = [
  { value: 'con', label: 'Còn hàng' },
  { value: 'het', label: 'Hết hàng' },
  { value: 'am', label: 'Xuất quá tồn' },
];
const tinhTrang = (ton: number) => (ton > 0 ? 'con' : ton < 0 ? 'am' : 'het');

/**
 * KHO-09 Tồn kho — theo Mã hàng (sheet "3b. TonTheoMaHang") và theo LÔ (sheet "3. TonTheoLo").
 * Giá trị tồn = Σ tồn lô × đơn giá lô. KHO-07 Chuyển thẳng tách riêng.
 */
@Component({
  selector: 'app-kho-ton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterBar, Pager, Kpi, Modal, RouterLink],
  template: `
    <div class="kpis">
      <app-kpi label="Giá trị tồn" [value]="vndShort(kpi().giaTri)" sub="Σ tồn lô × đơn giá lô (chưa VAT)" />
      <app-kpi label="Mã hàng còn hàng" [value]="money(kpi().soMa)" [sub]="'trên ' + money(store.loaiHang().length) + ' mã trong danh mục'" />
      <app-kpi label="Lô còn hàng" [value]="money(kpi().soLo)" [sub]="'SL tồn ' + money(kpi().sl)" />
      <app-kpi label="Lô xuất quá tồn" [value]="money(kpi().am)" [tone]="kpi().am ? 'bad' : 'ok'" sub="Cần kiểm tra phiếu xuất" />
    </div>
    <div class="section-title">
      <div class="tabs" role="tablist" style="position:static;margin:0">
        <button type="button" role="tab" [class.on]="che() === 'ma'" [attr.aria-selected]="che() === 'ma'" (click)="che.set('ma')">Theo mã hàng</button>
        <button type="button" role="tab" [class.on]="che() === 'lo'" [attr.aria-selected]="che() === 'lo'" (click)="che.set('lo')">Theo lô</button>
      </div>
      <div class="btn-row">
        @if (che() === 'ma') {
          <label class="check-row"><input type="checkbox" [checked]="duMa()" (change)="duMa.set($any($event.target).checked)" /> Hiện cả mã chưa phát sinh</label>
        }
        <button type="button" class="btn sm quiet" (click)="xuatCsv()">Xuất CSV</button>
      </div>
    </div>
    <app-filter [(loc)]="loc" memo="kho-ton" [time]="false" [facets]="facets()" placeholder="Tìm mã hàng, tên, mã lô, nồng độ, số hoá đơn…" />

    @if (che() === 'ma') {
      <div class="tbl-wrap">
        <table class="tbl freeze">
          <thead>
            <tr><th>Mã hàng</th><th>Mô tả</th><th>Tên trên hoá đơn</th><th>Nhóm</th><th>Thể tích</th><th>ĐVT</th><th>Vị trí kho</th><th class="num">Tổng nhập</th><th class="num">Tổng xuất</th><th class="num">Tồn</th><th class="num">Số lô còn</th><th class="num">Giá trị tồn</th><th class="num" title="Số đếm của đợt kiểm kê gần nhất tại kho">Kiểm kê{{ ngayKK() ? ' ' + ngayKK() : '' }}</th><th class="num" title="Thực tế − tồn sổ tại ngày kiểm kê">Lệch</th></tr>
          </thead>
          <tbody>
            @for (r of pgMa.items(); track r.loaiHang + r.kho) {
              <tr class="click" (click)="moMa(r)">
                <td><b>{{ r.loaiHang }}</b> <span class="sub">{{ store.loaiHangTen(r.loaiHang) }}</span></td>
                <td class="sub" style="max-width:240px">{{ store.loaiHangById(r.loaiHang)?.moTa || '—' }}</td>
                @let tm = tenHD(r.loaiHang);
                <td class="sub" style="max-width:260px" [title]="tm.join('
')">@if (tm.length) { {{ tm[0] }}@if (tm.length > 1) { <span class="tag mute">+{{ tm.length - 1 }}</span> } } @else { — }</td>
                <td>{{ store.loaiHangById(r.loaiHang)?.nhom ?? '—' }}</td>
                <td>{{ store.loaiHangById(r.loaiHang)?.theTich || '—' }}</td>
                <td>{{ store.loaiHangById(r.loaiHang)?.dvt ?? '' }}</td>
                <td>{{ store.khoTen(r.kho) }}</td>
                <td class="num">{{ money(r.nhap) }}</td>
                <td class="num">{{ money(r.xuat) }}</td>
                <td class="num" [class.neg]="r.ton < 0"><b>{{ money(r.ton) }}</b></td>
                <td class="num">{{ r.soLo }}</td>
                <td class="num">{{ money(r.giaTri) }}</td>
                @if (kk(r); as k) {
                  <td class="num" [title]="'Kiểm kê ' + viDate(k.ngay)">{{ money(k.thucTe) }}</td>
                  <td class="num" [class.neg]="k.lech < 0">@if (k.lech) { <b>{{ k.lech > 0 ? '+' : '' }}{{ money(k.lech) }}</b> } @else { 0 }</td>
                } @else {
                  <td class="num muted">—</td><td class="num muted">—</td>
                }
              </tr>
            } @empty {
              <tr><td colspan="14" class="empty">Không có mã hàng nào khớp bộ lọc</td></tr>
            }
          </tbody>
          @if (rowsMa().length) {
            <tfoot>
              <tr><td colspan="7">Tổng ({{ rowsMa().length }} dòng)</td><td class="num">{{ money(tongMa().nhap) }}</td><td class="num">{{ money(tongMa().xuat) }}</td><td class="num" [class.neg]="tongMa().ton < 0">{{ money(tongMa().ton) }}</td><td></td><td class="num">{{ money(tongMa().giaTri) }}</td><td colspan="2"></td></tr>
            </tfoot>
          }
        </table>
      </div>
      <app-pager [pager]="pgMa" />
    } @else {
      <div class="tbl-wrap">
        <table class="tbl freeze">
          <thead>
            <tr><th>Mã lô</th><th>Ngày nhập</th><th>Số hoá đơn</th><th>NCC</th><th>Mã hàng</th><th>Mô tả</th><th>Tên trên hoá đơn</th><th>Quy cách / nồng độ</th><th class="num">SL nhập</th><th class="num">Đã xuất</th><th class="num">Tồn</th><th class="num">Đơn giá</th><th class="num">Giá trị tồn</th><th>Cảnh báo</th></tr>
          </thead>
          <tbody>
            @for (l of pgLo.items(); track l.lo) {
              <tr class="click" (click)="moLo(l)">
                <td><b>{{ l.lo }}</b></td>
                <td>{{ viDate(l.ngay) }}</td>
                <td>{{ l.soHoaDon || '—' }}</td>
                <td>{{ l.ncc ? store.nccById(l.ncc)?.ten ?? l.ncc : '—' }}</td>
                <td><b>{{ l.loaiHang }}</b></td>
                <td class="sub" style="max-width:240px">{{ store.loaiHangById(l.loaiHang)?.moTa || '—' }}</td>
                @let tl = tenHD(l.loaiHang, l.lo);
                <td class="sub" style="max-width:260px" [title]="tl.join('
')">@if (tl.length) { {{ tl[0] }}@if (tl.length > 1) { <span class="tag mute">+{{ tl.length - 1 }}</span> } } @else { — }</td>
                <td class="sub" style="max-width:320px">{{ l.quyCach || '—' }}</td>
                <td class="num">{{ money(l.nhap) }}</td>
                <td class="num">{{ money(l.xuat) }}</td>
                <td class="num" [class.neg]="l.ton < 0"><b>{{ money(l.ton) }}</b></td>
                <td class="num">{{ money(l.donGia) }}</td>
                <td class="num">{{ money(l.giaTriTon) }}</td>
                <td>@if (l.ton < 0) { <span class="tag bad">Xuất quá tồn {{ -l.ton }}</span> } @else if (!l.donGia) { <span class="tag warn">Chưa có đơn giá</span> }</td>
              </tr>
            } @empty {
              <tr><td colspan="14" class="empty">Không có lô nào khớp bộ lọc</td></tr>
            }
          </tbody>
          @if (rowsLo().length) {
            <tfoot>
              <tr><td colspan="8">Tổng ({{ rowsLo().length }} lô)</td><td class="num">{{ money(tongLo().nhap) }}</td><td class="num">{{ money(tongLo().xuat) }}</td><td class="num">{{ money(tongLo().ton) }}</td><td></td><td class="num">{{ money(tongLo().giaTri) }}</td><td></td></tr>
            </tfoot>
          }
        </table>
      </div>
      <app-pager [pager]="pgLo" />
    }
    <p class="hint muted">
      Mỗi dòng phiếu nhập là một LÔ có đơn giá riêng; xuất kho trừ đúng lô → giá vốn lấy đúng đơn giá lô (không bình quân).
      Không tính phiếu Đã huỷ và kho Chuyển thẳng. Cột Kiểm kê / Lệch lấy đợt kiểm kê gần nhất của từng kho (Lệch = thực tế − tồn sổ tại ngày kiểm kê).
      Bấm dòng để xem thẻ kho.
    </p>

    @if (ct().length) {
      <h3 class="section-title">Chuyển thẳng (chỉ tham khảo)</h3>
      <div class="note info">KHO-07: hàng đi thẳng từ NCC tới khách — phiếu vẫn lưu để truy vết theo HĐ nhưng không cộng/trừ tồn ở kho nào.</div>
      <div class="tbl-wrap">
        <table class="tbl freeze compact">
          <thead><tr><th>Mã hàng</th><th class="num">SL nhập</th><th class="num">SL xuất</th><th class="num">Chênh</th></tr></thead>
          <tbody>
            @for (r of ct(); track r.loaiHang) {
              <tr>
                <td><b>{{ r.loaiHang }}</b> <span class="sub">{{ store.loaiHangTen(r.loaiHang) }}</span></td>
                <td class="num">{{ money(r.nhap) }}</td>
                <td class="num">{{ money(r.xuat) }}</td>
                <td class="num muted">{{ money(r.ton) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <app-modal [open]="!!chon()" [title]="'Thẻ kho — ' + (chon()?.ten ?? '')" [sub]="chon()?.kho ? store.khoTen(chon()!.kho) : 'Tất cả kho'" size="lg" (closed)="chon.set(null)">
      <div class="tbl-wrap">
        <table class="tbl compact">
          <thead><tr><th>Ngày</th><th>Số phiếu</th><th>HĐ</th>@if (!chon()?.lo) { <th>Mã lô</th> }<th>Quy cách / tên trên HĐ</th><th class="num">Nhập</th><th class="num">Xuất</th><th class="num">Lũy kế</th><th class="num">Đơn giá</th></tr></thead>
          <tbody>
            @for (d of the(); track $index) {
              <tr>
                <td>{{ viDate(d.phieu.ngay) }}</td>
                <td>{{ d.phieu.soPhieu }}</td>
                <td>
                  @if (hd(d.phieu); as h) { <a [routerLink]="h.link" (click)="chon.set(null)">{{ h.so }}</a> } @else { {{ d.phieu.soHoaDon || '—' }} }
                </td>
                @if (!chon()?.lo) { <td>{{ d.lo || '—' }}</td> }
                <td class="sub">{{ d.tenTrenHD || d.quyCach || '—' }}</td>
                <td class="num">{{ d.nhap ? money(d.nhap) : '' }}</td>
                <td class="num">{{ d.xuat ? money(d.xuat) : '' }}</td>
                <td class="num" [class.neg]="d.luyKe < 0"><b>{{ money(d.luyKe) }}</b></td>
                <td class="num">{{ money(d.donGia) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty">Không có phiếu</td></tr>
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
  protected readonly vndShort = vndShort;
  protected readonly che = signal<Che>('ma');
  protected readonly loc = signal<Loc>(nhoLoc('kho-ton', LOC_RONG));
  protected readonly chon = signal<Chon | null>(null);
  protected readonly duMa = signal(false);

  /** Đợt kiểm kê gần nhất mỗi kho → số đếm / lệch theo mã (sheet "3b", cột "Kiểm kê 19/08", "Lệch"). */
  private readonly kkKho = computed(() => {
    const ganNhat = new Map<string, KiemKe>();
    for (const k of this.store.kiemKe()) {
      const c = ganNhat.get(k.kho);
      if (!c || c.ngay < k.ngay) ganNhat.set(k.kho, k);
    }
    const out = new Map<string, { ngay: string; theoMa: Map<string, { thucTe: number; lech: number }> }>();
    for (const [kho, k] of ganNhat)
      out.set(kho, { ngay: k.ngay, theoMa: new Map(lechKiemKe(this.store.db(), k).map((r) => [r.loaiHang, { thucTe: r.thucTe, lech: r.lech }])) });
    return out;
  });
  /** Ngày kiểm kê hiện ở tiêu đề cột khi mọi kho cùng một ngày. */
  protected readonly ngayKK = computed(() => {
    const ds = new Set([...this.kkKho().values()].map((x) => x.ngay));
    return ds.size === 1 ? viDate([...ds][0]).slice(0, 5) : '';
  });
  protected kk(r: DongTon): { ngay: string; thucTe: number; lech: number } | null {
    const k = this.kkKho().get(r.kho);
    if (!k) return null;
    const x = k.theoMa.get(r.loaiHang) ?? { thucTe: 0, lech: 0 };
    return { ngay: k.ngay, ...x };
  }
  /** Tên hàng trên hoá đơn theo tab Ánh xạ tên bán: mã hàng → các tên đã gán (kèm lô hay dùng). */
  private readonly anhXa = computed(() => {
    const m = new Map<string, { ten: string; lo?: string }[]>();
    for (const a of this.store.anhXaTen()) {
      if (!a.loaiHang) continue;
      const ds = m.get(a.loaiHang) ?? [];
      ds.push({ ten: a.nongDo ? `${a.ten} (${a.nongDo})` : a.ten, lo: a.lo });
      m.set(a.loaiHang, ds);
    }
    return m;
  });
  /** Tên trên hoá đơn của mã hàng; xem theo lô thì ưu tiên tên gán đúng lô đó. */
  protected tenHD(loaiHang: string, lo?: string): string[] {
    const ds = this.anhXa().get(loaiHang) ?? [];
    const dungLo = lo ? ds.filter((x) => x.lo === lo) : [];
    return [...new Set((dungLo.length ? dungLo : ds).map((x) => x.ten))];
  }
  /** Thứ tự theo danh mục mã hàng (nhóm → loại khí → thể tích), như file kho. */
  private readonly thuTu = computed(() => new Map(this.store.loaiHang().map((l, i) => [l.id, i])));

  private readonly allMa = computed(() => {
    const rows = tonKho(this.store.db()).filter((r) => r.kho !== KHO_CHUYEN_THANG);
    const co = new Set(rows.map((r) => `${r.loaiHang}\u0001${r.kho}`));
    const them = (loaiHang: string, kho: string) => {
      if (co.has(`${loaiHang}\u0001${kho}`)) return;
      co.add(`${loaiHang}\u0001${kho}`);
      rows.push({ loaiHang, kho, nhap: 0, xuat: 0, ton: 0, giaTri: 0, soLo: 0 });
    };
    // Mã đếm được khi kiểm kê nhưng chưa có trên sổ → vẫn hiện để thấy lệch.
    for (const [kho, k] of this.kkKho()) for (const ma of k.theoMa.keys()) them(ma, kho);
    if (this.duMa()) {
      const kho = this.store.khoDangDung().find((k) => k.id !== KHO_CHUYEN_THANG)?.id ?? '';
      const daCo = new Set(rows.map((r) => r.loaiHang));
      for (const l of this.store.loaiHang()) if (!daCo.has(l.id)) them(l.id, kho);
    }
    return rows;
  });
  private readonly allLo = computed(() => tonTheoLo(this.store.db()).filter((l) => l.kho !== KHO_CHUYEN_THANG));
  protected readonly facets = computed<Facet[]>(() => [
    { key: 'kho', label: 'Kho', options: khoOpts(this.store.db(), false) },
    { key: 'nhom', label: 'Nhóm hàng', options: nhomOpts() },
    { key: 'tt', label: 'Tình trạng', options: CON_HANG_OPTS },
  ]);

  protected readonly rowsMa = computed<DongTon[]>(() => {
    const l = this.loc();
    return this.allMa()
      .filter((r) => {
        const lh = this.store.loaiHangById(r.loaiHang);
        return (
          khopQ(l, r.loaiHang, lh?.ten, lh?.moTa, ...this.tenHD(r.loaiHang), lh?.loaiKhi, ...(lh?.bietDanh ?? [])) &&
          khopSel(l, 'nhom', lh?.nhom) &&
          khopSel(l, 'kho', r.kho) &&
          khopSel(l, 'tt', tinhTrang(r.ton))
        );
      })
      .sort((a, b) => (this.thuTu().get(a.loaiHang) ?? 1e9) - (this.thuTu().get(b.loaiHang) ?? 1e9) || a.loaiHang.localeCompare(b.loaiHang) || a.kho.localeCompare(b.kho));
  });
  protected readonly pgMa = paginate(this.rowsMa);
  protected readonly tongMa = computed(() => ({
    nhap: sum(this.rowsMa(), (r) => r.nhap),
    xuat: sum(this.rowsMa(), (r) => r.xuat),
    ton: sum(this.rowsMa(), (r) => r.ton),
    giaTri: sum(this.rowsMa(), (r) => r.giaTri),
  }));

  protected readonly rowsLo = computed<DongLo[]>(() => {
    const l = this.loc();
    return this.allLo().filter(
      (r) =>
        khopQ(l, r.lo, r.loaiHang, this.store.loaiHangTen(r.loaiHang), this.store.loaiHangById(r.loaiHang)?.moTa, ...this.tenHD(r.loaiHang, r.lo), r.quyCach, r.soHoaDon) &&
        khopSel(l, 'nhom', this.store.loaiHangById(r.loaiHang)?.nhom) &&
        khopSel(l, 'kho', r.kho) &&
        khopSel(l, 'tt', tinhTrang(r.ton)),
    );
  });
  protected readonly pgLo = paginate(this.rowsLo);
  protected readonly tongLo = computed(() => ({
    nhap: sum(this.rowsLo(), (r) => r.nhap),
    xuat: sum(this.rowsLo(), (r) => r.xuat),
    ton: sum(this.rowsLo(), (r) => r.ton),
    giaTri: sum(this.rowsLo(), (r) => r.giaTriTon),
  }));

  protected readonly kpi = computed(() => {
    const lo = this.allLo();
    return {
      giaTri: sum(lo, (l) => l.giaTriTon),
      soMa: new Set(this.allMa().filter((r) => r.ton > 0).map((r) => r.loaiHang)).size,
      soLo: lo.filter((l) => l.ton > 0).length,
      sl: sum(lo.filter((l) => l.ton > 0), (l) => l.ton),
      am: lo.filter((l) => l.ton < 0).length,
    };
  });

  protected readonly ct = computed(() => {
    const m = new Map<string, { loaiHang: string; nhap: number; xuat: number; ton: number }>();
    for (const r of tonKho(this.store.db())) {
      if (r.kho !== KHO_CHUYEN_THANG) continue;
      m.set(r.loaiHang, { loaiHang: r.loaiHang, nhap: r.nhap, xuat: r.xuat, ton: r.ton });
    }
    return [...m.values()];
  });

  protected readonly the = computed(() => {
    const c = this.chon();
    return c ? theKho(this.store.db(), c) : [];
  });

  protected moMa(r: DongTon): void {
    this.chon.set({ loaiHang: r.loaiHang, kho: r.kho, ten: `${r.loaiHang} · ${this.store.loaiHangTen(r.loaiHang)}` });
  }
  protected moLo(l: DongLo): void {
    this.chon.set({ lo: l.lo, kho: l.kho, ten: `Lô ${l.lo} · ${l.loaiHang}` });
  }
  protected hd(p: Parameters<typeof hdCuaPhieu>[1]) {
    return hdCuaPhieu(this.store, p);
  }

  protected xuatCsv(): void {
    if (this.che() === 'ma') {
      const rows: (string | number)[][] = [['Mã hàng', 'Tên', 'Mô tả', 'Tên trên hoá đơn', 'Nhóm', 'Thể tích', 'ĐVT', 'Vị trí kho', 'Tổng nhập', 'Tổng xuất', 'Tồn', 'Số lô còn', 'Giá trị tồn', 'Ngày kiểm kê', 'Kiểm kê', 'Lệch']];
      for (const r of this.rowsMa()) {
        const lh = this.store.loaiHangById(r.loaiHang);
        const k = this.kk(r);
        rows.push([r.loaiHang, lh?.ten ?? '', lh?.moTa ?? '', this.tenHD(r.loaiHang).join('; '), lh?.nhom ?? '', lh?.theTich ?? '', lh?.dvt ?? '', this.store.khoTen(r.kho), r.nhap, r.xuat, r.ton, r.soLo, Math.round(r.giaTri), k ? viDate(k.ngay) : '', k?.thucTe ?? '', k?.lech ?? '']);
      }
      void xuatCsv('ton-kho-theo-ma', rows);
      return;
    }
    const rows: (string | number)[][] = [['Mã lô', 'Ngày nhập', 'Số hoá đơn', 'NCC', 'Mã hàng', 'Mô tả', 'Tên trên hoá đơn', 'Quy cách / nồng độ', 'Vị trí kho', 'SL nhập', 'Đã xuất', 'Tồn', 'Đơn giá', 'VAT %', 'Giá trị tồn']];
    for (const l of this.rowsLo())
      rows.push([l.lo, viDate(l.ngay), l.soHoaDon ?? '', this.store.nccById(l.ncc)?.ten ?? '', l.loaiHang, this.store.loaiHangById(l.loaiHang)?.moTa ?? '', this.tenHD(l.loaiHang, l.lo).join('; '), l.quyCach, this.store.khoTen(l.kho), l.nhap, l.xuat, l.ton, l.donGia, l.vat, Math.round(l.giaTriTon)]);
    void xuatCsv('ton-kho-theo-lo', rows);
  }
}
