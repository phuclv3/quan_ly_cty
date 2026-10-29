import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DongLo, daGiuTheoMa, lechKiemKe, tonKho, tonTheoLo } from '../core/calc';
import { KHO_CHUYEN_THANG, KiemKe } from '../core/models';
import { Store } from '../core/store';
import { nhoLoc } from '../core/ui';
import { money, sum, viDate, vndShort } from '../core/util';
import { xuatExcel } from '../shared/export';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { Modal } from '../shared/ui-kit';
import { hdCuaPhieu, khoOpts, nhomOpts, theKho } from './kho-util';

type Che = 'ma' | 'lo';
type Chip = '' | 'con' | 'het';
type Canh = 'Âm kho' | 'Lệch' | 'Thiếu hồ sơ' | 'Sắp hết' | 'Chờ QC' | 'Đủ hàng' | 'Hết hàng';

interface Chon {
  loaiHang?: string;
  lo?: string;
  kho?: string;
  ten: string;
}

/** Một dòng bảng kiểm soát: gộp theo mã hàng (mọi kho thường). */
interface Ma {
  loaiHang: string;
  /** Tên các kho / vị trí còn hàng. */
  khos: string[];
  ton: number;
  daGiu: number;
  /** Tồn của lô nhập từ HĐ mua chưa kiểm định xong. */
  choQC: number;
  /** Tồn của lô chưa có số hoá đơn / chứng từ nhập. */
  thieuHS: number;
  khaDung: number;
  soLo: number;
  loChoQC: number;
  loThieuHS: number;
  giaTri: number;
  /** Chênh lệch kiểm kê gần nhất (thực tế − sổ), cộng các kho. */
  lech: number;
  canh: Canh;
}

const CANH_OPTS: { value: Canh; label: string }[] = (['Âm kho', 'Lệch', 'Thiếu hồ sơ', 'Sắp hết', 'Chờ QC', 'Đủ hàng', 'Hết hàng'] as Canh[]).map((c) => ({ value: c, label: c }));
const CANH_MAU: Record<Canh, string> = { 'Âm kho': 'bad', Lệch: 'warn', 'Thiếu hồ sơ': 'warn', 'Sắp hết': 'bad', 'Chờ QC': 'info', 'Đủ hàng': 'ok', 'Hết hàng': 'mute' };
/** Khả dụng không quá số này (và còn tồn) thì cảnh báo "Sắp hết" — chưa có ngưỡng tồn tối thiểu theo mã. */
const NGUONG_SAP_HET = 2;

/**
 * KHO-09 Tồn kho — bảng kiểm soát hàng hoá theo mã (Khả dụng = Tồn sổ − Đã giữ − Cách ly/chờ QC − Thiếu hồ sơ)
 * và bảng theo LÔ (sheet "3. TonTheoLo"). Giá trị tồn = Σ tồn lô × đơn giá lô. KHO-07 Chuyển thẳng tách riêng.
 */
@Component({
  selector: 'app-kho-ton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterBar, Pager, Modal, RouterLink],
  styles: `
    .kpis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); margin-bottom: 14px; }
    .k { display: flex; flex-direction: column; gap: 4px; background: var(--surf); border-radius: 14px; padding: 12px 14px; min-width: 0; min-height: 104px; }
    .k.hero { background: linear-gradient(135deg, #0f7a3d, #4bb04f); color: #fff; }
    .k .l { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
    .k.hero .l, .k.hero .s { color: #fff; }
    .k .v { font-size: 26px; line-height: 1.2; font-weight: 700; white-space: nowrap; }
    .k .s { font-size: 11px; color: var(--ink-3); line-height: 1.4; margin-top: auto; }

    .panel { background: var(--surf); border-radius: 18px; padding: 14px 16px 16px; }
    .head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
    .head h3 { margin: 0; font-size: 16px; }
    .chips { display: inline-flex; gap: 4px; padding: 3px; border-radius: 999px; background: var(--panel); }
    .chip-f { border: 0; border-radius: 999px; padding: 6px 14px; background: none; font-size: 12.5px; font-weight: 600; color: var(--ink-2); cursor: pointer; }
    .chip-f.on { background: var(--surf); color: var(--ink); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }
    .bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 12px; }
    .bar .sp { flex: 1 1 auto; }
    .panel ::ng-deep .filters { gap: 10px; flex: 1 1 420px; margin: 0; }
    .panel ::ng-deep .filters .search { height: 40px; border-radius: 999px; background: var(--panel); border: 0; box-shadow: none; max-width: 320px; }
    .panel ::ng-deep .filters .fsel select, .panel ::ng-deep .filters .pick-btn { height: 40px; border-radius: 999px; background: var(--panel); border: 0; font-weight: 600; font-size: 13.5px; padding-inline: 16px; }
    .panel ::ng-deep .filters .f-clear { background: none; border: 0; color: var(--ink-3); font-size: 13px; }

    .tbl-wrap { border-radius: 0; border: 0; box-shadow: none; overflow: auto; background: none; }
    .tbl { font-size: 12.5px; font-family: var(--font); }
    .tbl thead th { background: var(--panel); font-size: 11.5px; white-space: nowrap; border-radius: 0; }
    .tbl thead th:first-child { border-top-left-radius: 10px; } .tbl thead th:last-child { border-top-right-radius: 10px; }
    .tbl tbody td { padding-block: 10px; vertical-align: top; }
    .tbl .z { color: var(--ink-3); }
    .tbl .qc { color: #8a5a00; } .tbl .hs { color: #a3261d; font-weight: 600; }
    .ma-ten { display: block; font-size: 11px; color: var(--ink-3); margin-top: 2px; max-width: 180px; }
    .lo-link { border: 0; background: none; padding: 0; color: var(--brand); font-weight: 600; font-size: 12px; cursor: pointer; text-align: left; }
    .st { display: inline-block; padding: 1px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap; background: var(--mute-bg); color: var(--mute-fg); }
    .st.info { background: #dce9f8; color: #2c5d94; }
    .st.ok { background: #dff3e4; color: #17663f; }
    .st.warn { background: #fbf0d6; color: #8a5a00; }
    .st.bad { background: #fbe4e1; color: #a3261d; }
    .legend { margin: 8px 0 0; font-size: 11.5px; color: var(--ink-3); }
  `,
  template: `
    <div class="kpis">
      <div class="k hero"><span class="l">Giá trị tồn kho</span><b class="v">{{ vndShort(kpi().giaTri) }}</b><span class="s">Σ tồn lô × đơn giá lô (chưa VAT) · {{ kpi().soMa }} mã còn hàng</span></div>
      <div class="k"><span class="l">Mã sắp hết hàng</span><b class="v">{{ kpi().sapHet.length }}</b><span class="s">@if (kpi().sapHet[0]; as r) { {{ r.loaiHang }} · khả dụng {{ r.khaDung }} / tồn {{ r.ton }} } @else { Khả dụng ≤ {{ nguong }} }</span></div>
      <div class="k"><span class="l">Lô chờ QC / thiếu hồ sơ</span><b class="v">{{ kpi().loCanXuLy }}</b><span class="s">{{ kpi().slCachLy }} SL đang cách ly hoặc thiếu chứng từ</span></div>
      <div class="k"><span class="l">Chênh lệch kiểm kê</span><b class="v">{{ kpi().lech.length }}</b><span class="s">@if (kpi().lech[0]; as r) { {{ r.loaiHang }} lệch {{ r.lech > 0 ? '+' : '' }}{{ r.lech }} } @else { Đợt kiểm kê gần nhất khớp sổ }</span></div>
    </div>

    <section class="panel">
      <div class="head">
        <h3>Bảng kiểm soát hàng hoá <span class="sub">theo {{ che() === 'ma' ? 'mã hàng' : 'lô' }}</span></h3>
        <div class="chips">
          <button type="button" class="chip-f" [class.on]="che() === 'ma'" (click)="che.set('ma')">Theo mã hàng</button>
          <button type="button" class="chip-f" [class.on]="che() === 'lo'" (click)="che.set('lo')">Theo lô</button>
        </div>
      </div>

      <div class="bar">
        @if (che() === 'ma') {
          <div class="chips">
            <button type="button" class="chip-f" [class.on]="chip() === ''" (click)="chip.set('')">Tất cả mã ({{ dem('') }})</button>
            <button type="button" class="chip-f" [class.on]="chip() === 'con'" (click)="chip.set('con')">Còn hàng ({{ dem('con') }})</button>
            <button type="button" class="chip-f" [class.on]="chip() === 'het'" (click)="chip.set('het')">Hết hàng ({{ dem('het') }})</button>
          </div>
        }
        <app-filter [(loc)]="loc" memo="kho-ton" [time]="false" [facets]="facets()" placeholder="Tìm mã hàng, vị trí, lô, serial, số hoá đơn…" />
        <button type="button" class="btn sm quiet" (click)="xuatExcel()">Xuất Excel</button>
      </div>

      @if (che() === 'ma') {
        <div class="tbl-wrap">
          <table class="tbl freeze">
            <thead>
              <tr><th>Mã hàng</th><th>Kho · vị trí</th><th class="num">Tồn sổ</th><th class="num">Đã giữ</th><th class="num" title="Lô nhập từ HĐ mua chưa kiểm định xong">Cách ly / chờ QC</th><th class="num" title="Lô chưa có số hoá đơn / chứng từ">Thiếu hồ sơ</th><th class="num">Khả dụng</th><th>Lô · chứng từ</th><th class="num">Giá trị tồn</th><th>Cảnh báo</th></tr>
            </thead>
            <tbody>
              @for (r of pgMa.items(); track r.loaiHang) {
                <tr>
                  <td>
                    <b>{{ r.loaiHang }}</b>
                    <span class="ma-ten">{{ moTa(r.loaiHang) }}</span>
                  </td>
                  <td>{{ r.khos.join(' / ') || '—' }}</td>
                  <td class="num" [class.neg]="r.ton < 0"><b>{{ money(r.ton) }}</b></td>
                  <td class="num" [class.z]="!r.daGiu">{{ money(r.daGiu) }}</td>
                  <td class="num" [class.z]="!r.choQC" [class.qc]="r.choQC">{{ money(r.choQC) }}</td>
                  <td class="num" [class.z]="!r.thieuHS" [class.hs]="r.thieuHS">{{ money(r.thieuHS) }}</td>
                  <td class="num"><b>{{ money(r.khaDung) }}</b></td>
                  <td>
                    <button type="button" class="lo-link" (click)="moMa(r)">{{ r.soLo }} lô@if (r.loChoQC) { · {{ r.loChoQC }} chờ QC }@if (r.loThieuHS) { · {{ r.loThieuHS }} thiếu hồ sơ } ›</button>
                  </td>
                  <td class="num">{{ r.giaTri ? vndShort(r.giaTri) : '—' }}</td>
                  <td><span class="st" [class]="'st ' + mau(r.canh)">{{ r.canh }}{{ r.canh === 'Lệch' ? ' ' + (r.lech > 0 ? '+' : '') + r.lech : '' }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="10" class="empty">Không có mã hàng nào khớp bộ lọc</td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-pager [pager]="pgMa" />
        <p class="legend"><b>Khả dụng = Tồn sổ − Đã giữ − Cách ly / chờ QC − Thiếu hồ sơ.</b> Đã giữ: hàng đang giữ cho HĐ bán Hiệu lực / Đang giao. Cách ly / chờ QC: lô nhập từ HĐ mua chưa tích Kiểm định. Thiếu hồ sơ: lô chưa có số hoá đơn. Hàng của HĐ mua thuộc Phú Tài không nhập kho nên không có ở đây. Bấm "lô" để xem thẻ kho.</p>
      } @else {
        <div class="tbl-wrap">
          <table class="tbl freeze">
            <thead>
              <tr><th>Mã lô</th><th>Ngày nhập</th><th>Số hoá đơn</th><th>NCC</th><th>Mã hàng</th><th>Quy cách / nồng độ</th><th class="num">SL nhập</th><th class="num">Đã xuất</th><th class="num">Tồn</th><th class="num">Đơn giá</th><th class="num">Giá trị tồn</th><th>Cảnh báo</th></tr>
            </thead>
            <tbody>
              @for (l of pgLo.items(); track l.lo) {
                <tr class="click" (click)="moLo(l)">
                  <td><b>{{ l.lo }}</b></td>
                  <td>{{ viDate(l.ngay) }}</td>
                  <td>{{ l.soHoaDon || '—' }}</td>
                  <td>{{ l.ncc ? store.nccById(l.ncc)?.ten ?? l.ncc : '—' }}</td>
                  <td><b>{{ l.loaiHang }}</b></td>
                  <td class="sub" style="max-width:320px">{{ l.quyCach || '—' }}</td>
                  <td class="num">{{ money(l.nhap) }}</td>
                  <td class="num">{{ money(l.xuat) }}</td>
                  <td class="num" [class.neg]="l.ton < 0"><b>{{ money(l.ton) }}</b></td>
                  <td class="num">{{ money(l.donGia) }}</td>
                  <td class="num">{{ money(l.giaTriTon) }}</td>
                  <td>@if (l.ton < 0) { <span class="tag bad">Xuất quá tồn {{ -l.ton }}</span> } @else if (!l.donGia) { <span class="tag warn">Chưa có đơn giá</span> }</td>
                </tr>
              } @empty {
                <tr><td colspan="12" class="empty">Không có lô nào khớp bộ lọc</td></tr>
              }
            </tbody>
            @if (rowsLo().length) {
              <tfoot>
                <tr><td colspan="6">Tổng ({{ rowsLo().length }} lô)</td><td class="num">{{ money(tongLo().nhap) }}</td><td class="num">{{ money(tongLo().xuat) }}</td><td class="num">{{ money(tongLo().ton) }}</td><td></td><td class="num">{{ money(tongLo().giaTri) }}</td><td></td></tr>
              </tfoot>
            }
          </table>
        </div>
        <app-pager [pager]="pgLo" />
        <p class="legend">Mỗi dòng phiếu nhập là một LÔ có đơn giá riêng; xuất kho trừ đúng lô → giá vốn lấy đúng đơn giá lô (không bình quân). Không tính phiếu Đã huỷ và kho Chuyển thẳng. Bấm dòng để xem thẻ kho.</p>
      }
    </section>

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
  protected readonly nguong = NGUONG_SAP_HET;
  protected readonly mau = (c: Canh) => CANH_MAU[c];
  protected readonly che = signal<Che>('ma');
  protected readonly chip = signal<Chip>('');
  protected readonly loc = signal<Loc>(nhoLoc('kho-ton', LOC_RONG));
  protected readonly chon = signal<Chon | null>(null);

  /** Đợt kiểm kê gần nhất mỗi kho → lệch theo mã. */
  private readonly lechMa = computed(() => {
    const ganNhat = new Map<string, KiemKe>();
    for (const k of this.store.kiemKe()) {
      const c = ganNhat.get(k.kho);
      if (!c || c.ngay < k.ngay) ganNhat.set(k.kho, k);
    }
    const out = new Map<string, number>();
    for (const k of ganNhat.values()) for (const r of lechKiemKe(this.store.db(), k)) out.set(r.loaiHang, (out.get(r.loaiHang) ?? 0) + r.lech);
    return out;
  });

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
  protected tenHD(loaiHang: string, lo?: string): string[] {
    const ds = this.anhXa().get(loaiHang) ?? [];
    const dungLo = lo ? ds.filter((x) => x.lo === lo) : [];
    return [...new Set((dungLo.length ? dungLo : ds).map((x) => x.ten))];
  }
  /** Thứ tự theo danh mục mã hàng (nhóm → loại khí → thể tích), như file kho. */
  private readonly thuTu = computed(() => new Map(this.store.loaiHang().map((l, i) => [l.id, i])));

  protected moTa(id: string): string {
    const l = this.store.loaiHangById(id);
    return l ? [l.moTa || l.ten, l.dvt].filter(Boolean).join(' · ') : '';
  }

  private readonly allLo = computed(() => tonTheoLo(this.store.db()).filter((l) => l.kho !== KHO_CHUYEN_THANG));

  /** Lô nhập từ HĐ mua mà HĐ mua chưa tích "Kiểm định" → cách ly / chờ QC. */
  private choKiemDinh(l: DongLo): boolean {
    const p = this.store.db().phieuKho.find((x) => x.id === l.phieuId);
    const m = p?.hdId ? this.store.hdmById(p.hdId) : undefined;
    return !!m && m.checklist.some((c) => c.ten === 'Kiểm định') && !m.checklist.find((c) => c.ten === 'Kiểm định')?.xong;
  }

  private readonly allMa = computed<Ma[]>(() => {
    const db = this.store.db();
    const theoMa = new Map<string, Ma>();
    const row = (id: string): Ma => {
      let r = theoMa.get(id);
      if (!r) {
        r = { loaiHang: id, khos: [], ton: 0, daGiu: 0, choQC: 0, thieuHS: 0, khaDung: 0, soLo: 0, loChoQC: 0, loThieuHS: 0, giaTri: 0, lech: this.lechMa().get(id) ?? 0, canh: 'Đủ hàng' };
        theoMa.set(id, r);
      }
      return r;
    };
    for (const t of tonKho(db)) {
      if (t.kho === KHO_CHUYEN_THANG) continue;
      const r = row(t.loaiHang);
      r.ton += t.ton;
      r.giaTri += t.giaTri;
      if (t.ton !== 0) r.khos.push(this.store.khoTen(t.kho));
    }
    // Mã đếm được khi kiểm kê nhưng chưa có trên sổ → vẫn hiện để thấy lệch.
    for (const id of this.lechMa().keys()) row(id);
    for (const l of this.allLo()) {
      if (l.ton <= 0) continue;
      const r = row(l.loaiHang);
      r.soLo++;
      if (this.choKiemDinh(l)) {
        r.choQC += l.ton;
        r.loChoQC++;
      } else if (!l.soHoaDon) {
        r.thieuHS += l.ton;
        r.loThieuHS++;
      }
    }
    for (const r of theoMa.values()) {
      r.daGiu = daGiuTheoMa(db, r.loaiHang);
      r.khaDung = Math.max(0, r.ton - r.daGiu - r.choQC - r.thieuHS);
      r.canh =
        r.ton < 0 ? 'Âm kho'
        : r.lech !== 0 ? 'Lệch'
        : r.thieuHS > 0 ? 'Thiếu hồ sơ'
        : r.ton > 0 && r.khaDung <= NGUONG_SAP_HET ? 'Sắp hết'
        : r.choQC > 0 ? 'Chờ QC'
        : r.ton === 0 ? 'Hết hàng'
        : 'Đủ hàng';
    }
    return [...theoMa.values()].sort((a, b) => (this.thuTu().get(a.loaiHang) ?? 1e9) - (this.thuTu().get(b.loaiHang) ?? 1e9) || a.loaiHang.localeCompare(b.loaiHang));
  });

  protected readonly facets = computed<Facet[]>(() => [
    { key: 'kho', label: 'Kho', options: khoOpts(this.store.db(), false) },
    { key: 'nhom', label: 'Nhóm hàng', options: nhomOpts() },
    ...(this.che() === 'ma' ? [{ key: 'canh', label: 'Cảnh báo', options: CANH_OPTS }] : []),
  ]);

  /** Sau ô tìm và bộ lọc chọn, trước chip Còn / Hết hàng — để số trên chip khớp bảng. */
  private readonly locSan = computed<Ma[]>(() => {
    const l = this.loc();
    const khoDuocChon = l.sel['kho'] ?? [];
    const tenKho = new Set(khoDuocChon.map((k) => this.store.khoTen(k)));
    return this.allMa().filter((r) => {
      const lh = this.store.loaiHangById(r.loaiHang);
      return (
        khopQ(l, r.loaiHang, lh?.ten, lh?.moTa, ...r.khos, ...this.tenHD(r.loaiHang), lh?.loaiKhi, ...(lh?.bietDanh ?? [])) &&
        khopSel(l, 'nhom', lh?.nhom) &&
        khopSel(l, 'canh', r.canh) &&
        (!tenKho.size || r.khos.some((k) => tenKho.has(k)))
      );
    });
  });
  protected dem(c: Chip): number {
    return this.locSan().filter((r) => !c || (c === 'con' ? r.ton > 0 : r.ton <= 0)).length;
  }
  protected readonly rowsMa = computed(() => this.locSan().filter((r) => !this.chip() || (this.chip() === 'con' ? r.ton > 0 : r.ton <= 0)));
  protected readonly pgMa = paginate(this.rowsMa);

  protected readonly rowsLo = computed<DongLo[]>(() => {
    const l = this.loc();
    return this.allLo().filter(
      (r) =>
        khopQ(l, r.lo, r.loaiHang, this.store.loaiHangTen(r.loaiHang), this.store.loaiHangById(r.loaiHang)?.moTa, ...this.tenHD(r.loaiHang, r.lo), r.quyCach, r.soHoaDon) &&
        khopSel(l, 'nhom', this.store.loaiHangById(r.loaiHang)?.nhom) &&
        khopSel(l, 'kho', r.kho),
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
    const ma = this.allMa();
    return {
      giaTri: sum(this.allLo(), (l) => l.giaTriTon),
      soMa: ma.filter((r) => r.ton > 0).length,
      sapHet: ma.filter((r) => r.canh === 'Sắp hết'),
      loCanXuLy: sum(ma, (r) => r.loChoQC + r.loThieuHS),
      slCachLy: sum(ma, (r) => r.choQC + r.thieuHS),
      lech: ma.filter((r) => r.lech !== 0),
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

  protected moMa(r: Ma): void {
    this.chon.set({ loaiHang: r.loaiHang, ten: `${r.loaiHang} · ${this.store.loaiHangTen(r.loaiHang)}` });
  }
  protected moLo(l: DongLo): void {
    this.chon.set({ lo: l.lo, kho: l.kho, ten: `Lô ${l.lo} · ${l.loaiHang}` });
  }
  protected hd(p: Parameters<typeof hdCuaPhieu>[1]) {
    return hdCuaPhieu(this.store, p);
  }

  protected xuatExcel(): void {
    if (this.che() === 'ma') {
      const rows: (string | number)[][] = [['Mã hàng', 'Tên', 'Mô tả', 'Tên trên hoá đơn', 'Nhóm', 'ĐVT', 'Vị trí kho', 'Tồn sổ', 'Đã giữ', 'Cách ly / chờ QC', 'Thiếu hồ sơ', 'Khả dụng', 'Số lô', 'Giá trị tồn', 'Lệch kiểm kê', 'Cảnh báo']];
      for (const r of this.rowsMa()) {
        const lh = this.store.loaiHangById(r.loaiHang);
        rows.push([r.loaiHang, lh?.ten ?? '', lh?.moTa ?? '', this.tenHD(r.loaiHang).join('; '), lh?.nhom ?? '', lh?.dvt ?? '', r.khos.join(' / '), r.ton, r.daGiu, r.choQC, r.thieuHS, r.khaDung, r.soLo, Math.round(r.giaTri), r.lech, r.canh]);
      }
      void xuatExcel('ton-kho-theo-ma', rows);
      return;
    }
    const rows: (string | number)[][] = [['Mã lô', 'Ngày nhập', 'Số hoá đơn', 'NCC', 'Mã hàng', 'Mô tả', 'Tên trên hoá đơn', 'Quy cách / nồng độ', 'Vị trí kho', 'SL nhập', 'Đã xuất', 'Tồn', 'Đơn giá', 'VAT %', 'Giá trị tồn']];
    for (const l of this.rowsLo())
      rows.push([l.lo, viDate(l.ngay), l.soHoaDon ?? '', this.store.nccById(l.ncc)?.ten ?? '', l.loaiHang, this.store.loaiHangById(l.loaiHang)?.moTa ?? '', this.tenHD(l.loaiHang, l.lo).join('; '), l.quyCach, this.store.khoTen(l.kho), l.nhap, l.xuat, l.ton, l.donGia, l.vat, Math.round(l.giaTriTon)]);
    void xuatExcel('ton-kho-theo-lo', rows);
  }
}
