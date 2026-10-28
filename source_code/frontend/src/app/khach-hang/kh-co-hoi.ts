import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Store } from '../core/store';
import { GIAI_DOAN_CH, GiaiDoanCH, LOAI_SP_KH, LY_DO_THUA } from '../core/models';
import { nhoLoc } from '../core/ui';
import { sum, todayIso, vndShort, viDate } from '../core/util';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { xuatExcel } from '../shared/export';
import { mauAvatar } from '../shared/avatar';
import { CoHoiForm } from './co-hoi-form';
import { CoHoiTrangThai } from './co-hoi-trang-thai';
import { CoHoiRow, chenhLech, dangMo, diemSpark, layCoHoiTong } from './co-hoi-data';

const opts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));
const GD_CLASS: Record<GiaiDoanCH, string> = { 'Mới': 'moi', 'Đã báo giá': 'bg', 'Đang đàm phán': 'dp', 'Thắng': 'thang', 'Thua': 'thua' };

/** Tab "Cơ hội" của Khách hàng: thẻ tổng quan, chip giai đoạn, bộ lọc, danh sách cơ hội. */
@Component({
  selector: 'app-kh-co-hoi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterBar, Pager, CoHoiForm, CoHoiTrangThai],
  template: `
    <div class="kpis">
      <div class="k hero">
        <span class="l">Cơ hội đang mở</span>
        <b class="v">{{ short(kpi().giaTriMo) }}</b>
        <span class="s">{{ kpi().soMo }} cơ hội · {{ kpi().soKhachMo }} khách hàng</span>
      </div>
      <div class="k">
        <span class="l">Thắng trong kỳ</span>
        <b class="v">{{ kpi().thang }}</b>
        <svg class="spark ok" viewBox="0 0 96 30" aria-hidden="true"><polyline [attr.points]="kpi().sThang" /></svg>
        <span class="s"><i class="dl" [class.up]="kpi().dThang > 0" [class.down]="kpi().dThang < 0">{{ mui(kpi().dThang) }} {{ kpi().dThang ? abs(kpi().thang - kpi().thangTruoc) : '' }}</i> {{ short(kpi().giaTriThang) }} · giá trị cơ hội thắng</span>
      </div>
      <div class="k">
        <span class="l">Thua trong kỳ</span>
        <b class="v">{{ kpi().thua }}</b>
        <svg class="spark bad" viewBox="0 0 96 30" aria-hidden="true"><polyline [attr.points]="kpi().sThua" /></svg>
        <span class="s"><i class="dl" [class.up]="kpi().dThua < 0" [class.down]="kpi().dThua > 0">{{ mui(kpi().dThua) }} {{ kpi().dThua ? abs(kpi().thua - kpi().thuaTruoc) : '' }}</i> {{ kpi().lyDoChinh ? 'lý do chính: ' + kpi().lyDoChinh : 'chưa có lý do thua' }}</span>
      </div>
      <div class="k">
        <span class="l">Tỷ lệ thắng</span>
        <b class="v">{{ kpi().tyLe }}%</b>
        <svg class="spark ok" viewBox="0 0 96 30" aria-hidden="true"><polyline [attr.points]="kpi().sTyLe" /></svg>
        <span class="s"><i class="dl" [class.up]="kpi().dTyLe > 0" [class.down]="kpi().dTyLe < 0">{{ mui(kpi().dTyLe) }} {{ kpi().dTyLe ? abs(kpi().tyLe - kpi().tyLeTruoc) + '%' : '' }}</i> {{ kpi().thang }}/{{ kpi().thang + kpi().thua }} cơ hội đã đóng</span>
      </div>
    </div>

    <div class="chips">
      <button type="button" class="chip-f tat" [class.on]="gd() === ''" (click)="chonGd('')">Tất cả ({{ dem('') }})</button>
      @for (g of GIAI_DOAN; track g) {
        <button type="button" class="chip-f" [class.on]="gd() === g" (click)="chonGd(g)"><i class="dot" [class]="GD_CLASS[g]"></i>{{ g }} ({{ dem(g) }})</button>
      }
      <span class="grow"></span>
      <button type="button" class="chip-f tai" [class.on]="taiTiep()" (click)="taiTiep.set(!taiTiep())">↻ Tái tiếp cận ({{ soTai() }})</button>
    </div>

    <section class="panel">
      <app-filter [(loc)]="loc" memo="kh-co-hoi" [time]="false" [facets]="facets()" placeholder="Tìm mã cơ hội, khách hàng, báo giá…" />
      <div class="tbl-wrap">
        <table class="tbl">
          <thead>
            <tr><th>Mã</th><th>Khách hàng · hướng bán</th><th class="num">Giá trị</th><th>Giai đoạn</th><th>Phụ trách</th><th>Tương tác tiếp</th></tr>
          </thead>
          <tbody>
            @for (r of pg.items(); track r.c.id) {
              <tr class="click" (click)="tt.set(r.c.id)">
                <td class="ma"><button type="button" class="kh-ten" title="Xem chi tiết khách hàng" (click)="$event.stopPropagation(); xem.emit(r.k.id)"><b>{{ r.c.id }}</b></button></td>
                <td>
                  <b class="kh-txt" (click)="$event.stopPropagation()">{{ r.k.ten }}</b>
                  <div class="sub">{{ r.c.huongBan }}</div>
                </td>
                <td class="num">{{ r.c.giaTri ? short(r.c.giaTri) : '—' }}</td>
                <td>
                  <span class="gd" [class]="'gd ' + GD_CLASS[r.c.giaiDoan]">{{ r.c.giaiDoan }}</span>
                  @let p = phu(r);
                  @if (p.text) { <div class="sub" [class.neg]="p.bad">{{ p.text }}</div> }
                </td>
                <td>
                  @if (r.k.phuTrach) { <span class="pt"><span class="av" [style.background]="mau(r.k.phuTrach)">{{ vt(store.userName(r.k.phuTrach)) }}</span>{{ store.userName(r.k.phuTrach) }}</span> }
                  @else { <span class="sub">Chưa phân bổ</span> }
                </td>
                @let tc = tuongTac(r);
                <td>{{ tc.text || '—' }}{{ tc.text && tc.ngay ? ' · ' + ngayNgan(tc.ngay) : '' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">Chưa có khách nào ở trạng thái cơ hội. Đổi trạng thái cơ hội của khách hoặc bấm "Tạo cơ hội".</td></tr>
            }
          </tbody>
        </table>
      </div>
      <app-pager [pager]="pg" />
    </section>

    <app-co-hoi-trang-thai [ma]="tt()" (closed)="tt.set(null)" (sua)="tt.set(null); sua.set($event)" />
    <app-co-hoi-form [ma]="sua()" (closed)="sua.set(null)" />
  `,
  styles: `
    :host { display: block; }
    .kpis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); margin-bottom: 14px; }
    .k { display: grid; gap: 4px; align-content: start; background: var(--surf); border-radius: 16px; padding: 14px 16px; min-width: 0; position: relative; }
    .k.hero { background: linear-gradient(135deg, #0f7a3d, #19a05a); color: #fff; }
    .k .l { font-size: 13px; font-weight: 600; color: var(--ink-2); }
    .k.hero .l, .k.hero .s { color: #fff; }
    .k .v { font-size: 30px; line-height: 1.15; }
    .k .s { font-size: 11.5px; color: var(--ink-3); line-height: 1.4; max-width: 62%; }
    .spark { position: absolute; right: 14px; top: 34px; width: 96px; height: 30px; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .spark.ok { stroke: #19a05a; }
    .spark.bad { stroke: #2f7d4e; }
    .dl { font-style: normal; font-weight: 700; }
    .dl.up { color: #19a05a; }
    .dl.down { color: #d9453b; }

    .chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; padding: 6px 8px; border-radius: 999px; background: var(--surf); }
    .chip-f { display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; padding: 7px 14px; background: transparent; font-size: 13px; font-weight: 600; color: var(--ink-2); cursor: pointer; }
    .chip-f.on { background: #0f5a2a; color: #fff; }
    .chip-f.tai { background: #fbe9c8; color: #8a5a00; }
    .chip-f.tai.on { background: #e0911c; color: #fff; }
    .grow { flex: 1 1 auto; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #c9ced6; display: inline-block; }
    .dot.bg { background: #7aa7d9; } .dot.dp { background: #8bd3a0; } .dot.thang { background: #e8d49a; } .dot.thua { background: #e9b3ad; }

    .panel { background: var(--surf); border-radius: 18px; padding: 16px 18px 18px; }
    .tbl-wrap { border-radius: 0; border: 0; box-shadow: none; background: none; overflow: auto; }
    .tbl { font-size: 13px; }
    .tbl thead th { background: var(--panel); font-size: 12px; font-weight: 600; color: var(--ink-2); white-space: nowrap; border-radius: 0; }
    .tbl thead th:first-child { border-top-left-radius: 10px; } .tbl thead th:last-child { border-top-right-radius: 10px; }
    .tbl tbody td { padding-block: 10px; vertical-align: middle; border-bottom: 1px solid var(--line); }
    .tbl td.ma { white-space: nowrap; font-family: var(--font); }
    .tbl td.ma b { font-weight: 700; }
    .tbl td.num { font-weight: 700; white-space: nowrap; }
    .tbl tbody tr.click:hover td { background: #f6faf7; }
    .sub.neg { color: #c0392b; }

    /* Bộ lọc dạng viên thuốc (như danh sách khách hàng) */
    .panel ::ng-deep .filters { gap: 10px; margin-bottom: 14px; }
    .panel ::ng-deep .filters .search { height: 40px; border-radius: 999px; background: var(--panel); border: 0; box-shadow: none; max-width: 360px; }
    .panel ::ng-deep .filters .fsel select, .panel ::ng-deep .filters .pick-btn { height: 40px; border-radius: 999px; background: var(--panel); border: 0; font-weight: 600; font-size: 13.5px; padding-inline: 16px; }
    .panel ::ng-deep .filters .f-clear { background: none; border: 0; color: var(--ink-3); font-size: 13px; }
    .tbl ::ng-deep .sub { font-size: 11.5px; }
    /* !important: styles.css (.tbl a) tô màu --brand (xanh rất đậm, nhìn như chữ đen) — cần xanh sáng hơn để nhận ra là liên kết */
    .kh-txt { color: var(--ink); cursor: default; }
    .kh-ten { border: 0; background: none; padding: 0; font: inherit; text-align: left; }
    .kh-ten, .kh-ten b { color: #138a4a !important; cursor: pointer; }
    .kh-ten b { text-decoration: underline; text-decoration-color: rgba(19, 138, 74, 0.4); text-underline-offset: 3px; }
    .kh-ten:hover b { text-decoration-color: #138a4a; }
    .gd { display: inline-block; padding: 1px 9px; border-radius: 6px; font-size: 11.5px; font-weight: 700; background: var(--mute-bg); color: var(--mute-fg); }
    .gd.bg { background: #dce9f8; color: #2c5d94; }
    .gd.dp { background: #d9f3e0; color: #17663f; }
    .gd.thang { background: #e2f3e9; color: #17663f; }
    .gd.thua { background: #fbe4e1; color: #a3261d; }
    .pt { display: inline-flex; align-items: center; gap: 6px; }
    .av { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: #0f5a2a; color: #fff; font-size: 10px; font-weight: 700; flex: 0 0 auto; }
  `,
})
export class KhCoHoi {
  protected readonly store = inject(Store);
  protected readonly GIAI_DOAN = GIAI_DOAN_CH;
  protected readonly GD_CLASS = GD_CLASS;
  protected readonly short = vndShort;
  protected readonly abs = Math.abs;
  protected readonly mau = mauAvatar;

  protected readonly loc = signal<Loc>(nhoLoc('kh-co-hoi', LOC_RONG));
  protected readonly gd = signal<'' | GiaiDoanCH>('');
  protected readonly taiTiep = signal(false);
  /** Lọc theo một khách (từ ngăn chi tiết khách hàng). */
  readonly khLoc = input<string | null>(null);
  /** Bấm mã / tên khách: màn cha mở ngăn chi tiết khách hàng. */
  readonly xem = output<string>();
  /** Dialog trạng thái: mã CH đang xem, null = đóng. */
  protected readonly tt = signal<string | null>(null);
  /** null = đóng · '' = tạo mới · mã CH = sửa. */
  protected readonly sua = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.khLoc();
      if (id) untracked(() => this.loc.update((l) => ({ ...l, sel: { ...l.sel, kh: [id] } })));
    });
  }

  tao(): void {
    this.sua.set('');
  }

  private readonly all = computed(() =>
    layCoHoiTong(this.store.khachHang()).sort((a, b) => (b.c.ngayTao ?? '').localeCompare(a.c.ngayTao ?? '') || b.c.id.localeCompare(a.c.id)),
  );

  protected readonly facets = computed<Facet[]>(() => {
    const ds = this.all();
    const kh = new Map(ds.map((r) => [r.k.id, r.k.ten]));
    const pt = [...new Set(ds.map((r) => r.k.phuTrach).filter((x): x is string => !!x))];
    return [
      { key: 'kh', label: 'Khách hàng', options: [...kh].map(([value, label]) => ({ value, label })) },
      { key: 'pt', label: 'Phụ trách', options: pt.map((id) => ({ value: id, label: this.store.userName(id) })) },
      { key: 'nhom', label: 'Nhóm hàng', options: opts(LOAI_SP_KH) },
      { key: 'ld', label: 'Lý do thua', options: opts(LY_DO_THUA) },
    ];
  });

  /** Sau bộ lọc tìm / chọn, trước chip giai đoạn — để số trên chip luôn khớp danh sách. */
  private readonly locSan = computed(() => {
    const l = this.loc();
    return this.all().filter(
      ({ c, k }) =>
        khopQ(l, c.id, c.huongBan, k.ten, k.tenVietTat, c.tuongTacTiep) &&
        khopSel(l, 'kh', k.id) &&
        khopSel(l, 'pt', k.phuTrach) &&
        khopSel(l, 'nhom', c.nhomHang) &&
        khopSel(l, 'ld', c.lyDoThua),
    );
  });
  private readonly tai = (r: CoHoiRow) => r.c.giaiDoan === 'Thua' && !!r.c.ngayTaiTiepCan && r.c.ngayTaiTiepCan <= todayIso();
  protected readonly soTai = computed(() => this.locSan().filter(this.tai).length);
  protected dem(g: '' | GiaiDoanCH): number {
    return this.locSan().filter((r) => !g || r.c.giaiDoan === g).length;
  }
  protected chonGd(g: '' | GiaiDoanCH): void {
    this.gd.set(g);
    this.taiTiep.set(false);
  }

  protected readonly rows = computed(() =>
    this.locSan().filter((r) => (this.taiTiep() ? this.tai(r) : !this.gd() || r.c.giaiDoan === this.gd())),
  );
  protected readonly pg = paginate(this.rows);

  /** Thẻ tổng quan: kỳ = năm nay; so với cùng kỳ năm trước (đến cùng ngày). */
  protected readonly kpi = computed(() => {
    const ds = this.all();
    const nay = new Date();
    const y = nay.getFullYear();
    const homNay = todayIso();
    const truocDen = `${y - 1}${homNay.slice(4)}`;
    const trong = (r: CoHoiRow, g: GiaiDoanCH, tu: string, den: string) => r.c.giaiDoan === g && !!r.c.ngayChot && r.c.ngayChot >= tu && r.c.ngayChot <= den;
    const dem = (g: GiaiDoanCH, tu: string, den: string) => ds.filter((r) => trong(r, g, tu, den)).length;
    const mo = ds.filter((r) => dangMo(r.c.giaiDoan));
    const thangR = ds.filter((r) => trong(r, 'Thắng', `${y}-01-01`, homNay));
    const thua = dem('Thua', `${y}-01-01`, homNay);
    const thang = thangR.length;
    const thangT = dem('Thắng', `${y - 1}-01-01`, truocDen);
    const thuaT = dem('Thua', `${y - 1}-01-01`, truocDen);
    const ty = (a: number, b: number) => (a + b ? Math.round((a / (a + b)) * 100) : 0);
    const lyDo = new Map<string, number>();
    for (const r of ds) if (trong(r, 'Thua', `${y}-01-01`, homNay) && r.c.lyDoThua) lyDo.set(r.c.lyDoThua, (lyDo.get(r.c.lyDoThua) ?? 0) + 1);
    const lyDoChinh = [...lyDo].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    const thang_ = Array.from({ length: nay.getMonth() + 1 }, (_, m) => ds.filter((r) => r.c.giaiDoan === 'Thắng' && r.c.ngayChot?.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).length);
    const thua_ = Array.from({ length: nay.getMonth() + 1 }, (_, m) => ds.filter((r) => r.c.giaiDoan === 'Thua' && r.c.ngayChot?.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).length);
    let lt = 0;
    let lu = 0;
    const tyLeThang = thang_.map((t, i) => ((lt += t), (lu += thua_[i]), ty(lt, lu)));
    return {
      giaTriMo: sum(mo, (r) => r.c.giaTri),
      soMo: mo.length,
      soKhachMo: new Set(mo.map((r) => r.k.id)).size,
      thang,
      thua,
      thangTruoc: thangT,
      thuaTruoc: thuaT,
      giaTriThang: sum(thangR, (r) => r.c.giaTri),
      lyDoChinh: lyDoChinh,
      tyLe: ty(thang, thua),
      tyLeTruoc: ty(thangT, thuaT),
      dThang: chenhLech(thang, thangT),
      dThua: chenhLech(thua, thuaT),
      dTyLe: chenhLech(ty(thang, thua), ty(thangT, thuaT)),
      sThang: diemSpark(thang_),
      sThua: diemSpark(thua_),
      sTyLe: diemSpark(tyLeThang),
    };
  });

  /** Lịch hẹn chưa xong sớm nhất của từng khách (đặt ở ngăn chi tiết khách hàng). */
  private readonly lichKhach = computed(() => {
    const homNay = todayIso();
    const m = new Map<string, { noiDung: string; han: string; gio: string }>();
    for (const v of this.store.db().viecGiao ?? []) {
      if (!v.khId || v.xongLuc || !v.han || v.han < homNay) continue;
      const cu = m.get(v.khId);
      const khoa = v.han + (v.gio ?? '');
      if (!cu || khoa < cu.han + cu.gio) m.set(v.khId, { noiDung: v.noiDung.replace(/^\[[^\]]*\]\s*/, ''), han: v.han, gio: v.gio ?? '' });
    }
    return m;
  });
  /** Tương tác tiếp: ưu tiên lịch hẹn sắp tới của khách, không có thì lấy trường nhập trên cơ hội. */
  protected tuongTac(r: CoHoiRow): { text: string; ngay?: string } {
    const l = this.lichKhach().get(r.k.id);
    if (l) return { text: l.noiDung, ngay: l.han };
    return { text: r.c.tuongTacTiep ?? '', ngay: r.c.ngayTuongTac };
  }

  protected mui(d: number): string {
    return d > 0 ? '▲' : d < 0 ? '▼' : '';
  }
  protected vt(ten: string): string {
    return ten.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();
  }
  protected ngayNgan(iso: string): string {
    return viDate(iso).slice(0, 5);
  }

  /** Dòng phụ dưới nhãn giai đoạn. */
  protected phu(r: CoHoiRow): { text: string; bad: boolean } {
    const c = r.c;
    if (c.giaiDoan === 'Thắng') return { text: viDate(c.ngayChot), bad: false };
    if (c.giaiDoan === 'Thua') {
      const [y, m] = (c.ngayChot ?? '').split('-');
      return { text: `${m}/${y}${c.lyDoThua ? ' · ' + c.lyDoThua : ''}`, bad: true };
    }
    if (c.giaiDoan === 'Đã báo giá' && c.ngayBaoGia) {
      const tre = (Date.now() - new Date(c.ngayBaoGia).getTime()) / 864e5 > 7 && !(c.ngayTuongTac && c.ngayTuongTac >= todayIso());
      return { text: tre ? 'Báo giá chưa phản hồi' : 'Báo giá ' + viDate(c.ngayBaoGia), bad: tre };
    }
    return { text: '', bad: false };
  }

  xuat(): void {
    const head = ['Mã', 'Khách hàng', 'Tên viết tắt', 'Hướng bán', 'Nhóm hàng', 'Giá trị', 'Giai đoạn', 'Ngày tạo', 'Ngày báo giá', 'Ngày chốt', 'Lý do thua', 'Phụ trách', 'Tương tác tiếp', 'Ngày tương tác'];
    const body = this.rows().map(({ c, k }) => [
      c.id, k.ten, k.tenVietTat ?? '', c.huongBan, c.nhomHang ?? '', c.giaTri, c.giaiDoan, viDate(c.ngayTao), viDate(c.ngayBaoGia), viDate(c.ngayChot),
      c.lyDoThua ?? '', k.phuTrach ? this.store.userName(k.phuTrach) : '', c.tuongTacTiep ?? '', viDate(c.ngayTuongTac),
    ]);
    void xuatExcel('co-hoi', [head, ...body]);
  }
}
