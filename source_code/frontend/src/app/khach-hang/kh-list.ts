import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { CO_HOI, KhachHang, LOAI_SP_KH, NGUON_KH, PHAN_LOAI_KH, TIEP_CAN, TINH_THANH } from '../core/models';
import { nhoLoc } from '../core/ui';
import { money, sum, vndShort, viDate } from '../core/util';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Kpi, TrangThai } from '../shared/ui-kit';
import { Pager, paginate } from '../shared/pager';
import { SortTh, Sorter } from '../shared/sort';
import { xuatExcel } from '../shared/export';
import { Icon } from '../shared/icon';
import { ImportDm } from '../shared/import-dm';
import { Confirm } from '../shared/confirm';
import { guiXoa, guiXoaNhieu } from '../shared/ho-so';
import { KhForm } from './kh-form';
import { KhCoHoi } from './kh-co-hoi';
import { KhBaoCao } from './kh-bao-cao';
import { TT, ttNhan } from '../core/trang-thai';

interface Row {
  k: KhachHang;
  soHD: number;
  /** Lần chăm sóc gần nhất (ISO). */
  csCuoi?: string;
  xoa: boolean;
}

/** Giá trị bộ lọc "Phụ trách" cho data chưa phân bổ. */
const CHUA_PB = '__chua__';
const opts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));
const optsTT = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: ttNhan(x) }));

/** HDB-13 — Khách hàng & theo dõi kinh doanh (data từ file theo dõi KH của Kinh doanh). Nguồn khách cho HĐ bán. */
@Component({
  selector: 'app-kh-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, FilterBar, Kpi, TrangThai, Pager, SortTh, Icon, KhForm, ImportDm, KhCoHoi, KhBaoCao],
  template: `
    <div class="page-head">
      <div>
        <div class="crumbs">
          <a routerLink="/">Trang chủ</a> ›
          @if (tab() === 'ds') { Khách hàng } @else { <button type="button" class="linkish" (click)="tab.set('ds')">Khách hàng</button> › {{ tab() === 'ch' ? 'Cơ hội' : 'Báo cáo khách hàng' }} }
        </div>
        <h1>Khách hàng</h1>
      </div>
      <div class="actions">
        <button type="button" class="btn quiet pill" (click)="xuat()">Xuất Excel</button>
        @if (tab() === 'ds' && store.canEdit('khachHang')) {
          <app-import-dm loai="kh" />
          <button type="button" class="btn pill main" (click)="sua.set('')"><app-icon name="plus" [size]="16" /> Thêm khách hàng</button>
        }
        @if (tab() === 'ch' && store.canEdit('khachHang')) {
          <button type="button" class="btn pill main" (click)="coHoi()?.tao()"><app-icon name="plus" [size]="16" /> Tạo cơ hội</button>
        }
      </div>
    </div>

    <div class="seg" role="tablist">
      <button type="button" role="tab" [class.on]="tab() === 'ds'" (click)="tab.set('ds')">Danh sách khách hàng</button>
      <button type="button" role="tab" [class.on]="tab() === 'ch'" (click)="tab.set('ch')">Cơ hội</button>
      <button type="button" role="tab" [class.on]="tab() === 'bc'" (click)="tab.set('bc')">Báo cáo khách hàng</button>
    </div>

    @if (tab() === 'ch') {
      <app-kh-co-hoi />
    } @else if (tab() === 'bc') {
      <app-kh-bao-cao />
    } @else {
    <section class="panel">
      <h2 class="panel-t">Tổng quan</h2>
      <div class="kpis">
        <app-kpi label="Khách hàng" [value]="'' + kpi().n" [sub]="kpi().coHD + ' khách đã có HĐ bán'" />
        <app-kpi label="KH chưa phân bổ" [value]="'' + kpi().tho" sub="Chưa giao Sale phụ trách" />
        <app-kpi label="Đang chăm sóc" [value]="'' + kpi().dangCS" sub="Tiếp cận: Đang liên hệ" />
        <app-kpi label="Cơ hội đang mở" [value]="short(kpi().giaTriMo)" [sub]="kpi().mo + ' khách Đã báo giá / Đang đàm phán'" />
      </div>
    </section>

    <section class="panel">
    <div class="panel-h">
      <h2 class="panel-t">Danh sách khách hàng</h2>
      <span class="hint-r">bấm tên khách hoặc biểu tượng <app-icon name="chat" [size]="14" /> để xem phân loại chăm sóc và lịch sử tương tác</span>
    </div>
    <app-filter [(loc)]="loc" memo="kh-list" [time]="false" [facets]="facets()" placeholder="Tìm mã, tên, MST, tỉnh, người liên hệ, điện thoại, ghi chú…" />

    @if (coChon() && chon().size) {
      <div class="note info bulk">
        <b>Đã chọn {{ chon().size }} khách</b>
        @if (phanBo()) {
          <select aria-label="Giao cho Sale" [value]="giaoCho()" (change)="giaoCho.set($any($event.target).value)">
            <option value="">— Trả về chưa phân bổ —</option>
            @for (o of store.saleOpts(); track o.value) { <option [value]="o.value" [selected]="o.value === giaoCho()">{{ o.label }} — {{ o.hint }}</option> }
          </select>
          <button type="button" class="btn sm" (click)="phanBoChon()">Phân bổ</button>
        }
        @if (xoaNhieuDuoc()) { <button type="button" class="btn sm danger" (click)="xoaNhieu()">Xoá {{ chon().size }} đã chọn</button> }
        <button type="button" class="btn sm quiet" (click)="boChon()">Bỏ chọn</button>
      </div>
    }

    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead>
          <tr>
            @if (coChon()) {
              <th style="width:36px"><input type="checkbox" aria-label="Chọn cả trang" [checked]="caTrang()" (change)="chonTrang($any($event.target).checked)" /></th>
            }
            <th app-sort-th [sx]="sx" k="id" class="c-ma">Mã KH</th>
            <th app-sort-th [sx]="sx" k="vietTat" class="c-vt">Viết tắt</th>
            <th app-sort-th [sx]="sx" k="ten" class="c-ten">Khách hàng</th>
            <th>Liên hệ</th>
            <th app-sort-th [sx]="sx" k="tiepCan">Tiếp cận</th>
            <th app-sort-th [sx]="sx" k="coHoi">Cơ hội</th>
            <th app-sort-th [sx]="sx" k="giaTri" class="num">Giá trị cơ hội</th>
            <th app-sort-th [sx]="sx" k="phuTrach">Phụ trách</th>
            <th app-sort-th [sx]="sx" k="cs">Chăm sóc gần nhất</th>
            <th app-sort-th [sx]="sx" k="soHD" class="num">HĐ bán</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (r of pg.items(); track r.k.id) {
            <tr class="click" (click)="mo(r.k.id)">
              @if (coChon()) {
                <td (click)="$event.stopPropagation()"><input type="checkbox" [attr.aria-label]="'Chọn ' + r.k.ten" [checked]="chon().has(r.k.id)" (change)="flip(r.k.id)" /></td>
              }
              <td class="c-ma"><a [routerLink]="['/khach-hang', r.k.id]" (click)="$event.stopPropagation()"><b>{{ r.k.id }}</b></a></td>
              <td class="c-vt">@if (r.k.tenVietTat) { <span class="vt" [attr.title]="r.k.tenVietTat">{{ r.k.tenVietTat }}</span> } @else { — }</td>
              <td class="c-ten">
                <b class="ten">{{ r.k.ten }}</b>
                @if (r.k.trangThai === TT.NGUNG) { <app-tt [v]="TT.NGUNG" /> }
                @if (r.xoa) { <app-tt v="Chờ xoá" /> }
                <div class="sub">{{ r.k.tinh }}{{ r.k.tinh && r.k.phanLoai ? ' · ' : '' }}{{ r.k.phanLoai }}</div>
              </td>
              <td class="lh-cell">{{ r.k.nguoiLienHe }}<div class="sub">{{ r.k.dienThoai }}</div></td>
              <td><app-tt [v]="r.k.tiepCan || TT.CHUA_LIEN_HE" /></td>
              <td><app-tt [v]="r.k.coHoi || TT.CHUA_TIEP_CAN" /></td>
              <td class="num">{{ r.k.giaTriCoHoi ? money(r.k.giaTriCoHoi) : '—' }}</td>
              <td>
                @if (r.k.phuTrach) {
                  <span class="pt"><span class="av" [style.background]="mau(r.k.phuTrach)">{{ vietTat(store.userName(r.k.phuTrach)) }}</span>{{ store.userName(r.k.phuTrach) }}</span>
                } @else { <app-tt [v]="TT.CHUA_PHAN_BO" /> }
              </td>
              <td>{{ viDate(r.csCuoi) }}</td>
              <td class="num">{{ r.soHD }}</td>
              <td (click)="$event.stopPropagation()">
                <div class="row" style="flex-wrap:nowrap; gap:6px">
                  <a class="ico-btn chat" [routerLink]="['/khach-hang', r.k.id]" title="Chăm sóc & lịch sử tương tác" aria-label="Chăm sóc & lịch sử tương tác"><app-icon name="chat" [size]="15" /></a>
                  @if (store.canEditKH(r.k) && !r.xoa) {
                    <button type="button" class="ico-btn" title="Sửa" aria-label="Sửa" (click)="sua.set(r.k.id)"><app-icon name="edit" [size]="15" /></button>
                    @let vuong = store.lyDoKhongXoa('DM_KhachHang', r.k.id);
                    <button type="button" class="ico-btn bad" [attr.title]="vuong ? vuong + ' — không xoá được' : 'Xoá'" aria-label="Xoá" (click)="xoa(r.k)"><app-icon name="trash" [size]="15" /></button>
                  }
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td [attr.colspan]="coChon() ? 12 : 11" class="empty">Không có khách hàng phù hợp bộ lọc.</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [pager]="pg" />
    </section>
    }

    <!-- Thêm / sửa khách hàng: popup như các danh mục khác -->
    <app-kh-form [khId]="sua()" (closed)="sua.set(null)" />
  `,
  styles: `
    .bulk { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 12px; }
    .bulk select { width: auto; min-width: 220px; }
    .lh-cell { max-width: 200px; overflow-wrap: anywhere; }
    .c-ma { width: 1%; white-space: nowrap; }
    /* !important: styles.css ép cột thứ 2/3 của bảng rộng tối thiểu 280px (dành cho cột tên) */
    .tbl td.c-vt, .tbl th.c-vt { width: 1%; min-width: 0 !important; max-width: 96px; white-space: nowrap; padding-inline: 8px; }
    .tbl td.c-ten { min-width: 260px !important; }
    .c-ten { min-width: 240px; width: 26%; }
    .vt { display: block; width: fit-content; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 1px 8px; border-radius: 6px; background: var(--surf-3); color: var(--ink); font: 700 12.5px/1.6 var(--font); }
    .ten { text-transform: uppercase; font-size: 13px; font-weight: 700; }
    .panel-h { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 16px; margin-bottom: 12px; }
    .panel-h .panel-t { margin: 0; font-size: 16px; }
    .hint-r { font-size: 12px; color: var(--ink-3); display: inline-flex; align-items: center; gap: 4px; }

    /* Bộ lọc dạng viên thuốc */
    .panel ::ng-deep .filters { gap: 10px; margin-bottom: 14px; }
    .panel ::ng-deep .filters .search { height: 40px; border-radius: 999px; background: var(--panel); border: 0; box-shadow: none; max-width: 300px; }
    .panel ::ng-deep .filters .fsel select, .panel ::ng-deep .filters .pick-btn { height: 40px; border-radius: 999px; background: var(--panel); border: 0; font-weight: 600; font-size: 13.5px; padding-inline: 16px; }
    .panel ::ng-deep .filters .f-clear { background: none; border: 0; color: var(--ink-3); font-size: 13px; }

    /* Cột thao tác: nút icon vuông bo góc */
    .ico-btn { display: inline-grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 8px; background: var(--surf-2); color: var(--ink-2); cursor: pointer; text-decoration: none; }
    .ico-btn:hover { background: var(--surf-3); }
    .ico-btn.chat { background: #e3f1e3; color: #0f5a2a; }
    .ico-btn.bad { color: var(--bad-fg); }

    /* Đầu trang: tiêu đề + nút bo tròn */
    .page-head { align-items: center; }
    .page-head h1 { font-size: 26px; }
    .actions { align-items: center; }
    .btn.pill { border-radius: 999px; min-height: 36px; padding: 4px 16px; font-size: 13.5px; background: var(--surf); color: #16642b; border: 1.5px solid #16642b; }
    .btn.pill:hover { background: var(--brand-tint); }
    .btn.pill.main { background: #0f5a2a; color: #fff; border-color: #0f5a2a; }
    .btn.pill.main:hover { background: #0b4620; }
    .actions ::ng-deep app-import-dm > .btn { border-radius: 999px; min-height: 36px; padding: 4px 16px; font-size: 13.5px; background: var(--surf); color: #16642b; border: 1.5px solid #16642b; }
    .actions ::ng-deep app-import-dm > .btn app-icon { display: none; }

    /* Tab dạng viên thuốc */
    .seg { display: inline-flex; gap: 4px; padding: 4px; margin-bottom: 14px; border-radius: 999px; background: var(--surf); }
    .seg button { border: 0; background: none; padding: 7px 18px; border-radius: 999px; font-size: 13.5px; font-weight: 600; color: var(--ink-2); cursor: pointer; }
    .seg button.on { background: #0f5a2a; color: #fff; }

    /* Khối trắng bo tròn */
    .panel { background: var(--surf); border-radius: 18px; padding: 16px 18px 18px; margin-bottom: 14px; }
    .panel-t { font-size: 15px; margin-bottom: 12px; }
    .crumbs .linkish { font-size: inherit; font-weight: 600; }

    /* Thẻ tổng quan: nền gradient từng màu, chữ trắng */
    .kpis { margin-bottom: 0; }
    .kpis .kpi { border: 0; border-radius: 14px; color: #fff; box-shadow: none; padding: 14px 16px; }
    .kpis .kpi:nth-child(1) { background: linear-gradient(135deg, #0f7a3d, #19a05a); }
    .kpis .kpi:nth-child(2) { background: linear-gradient(135deg, #4bb04f, #7ccf5b); }
    .kpis .kpi:nth-child(3) { background: linear-gradient(135deg, #14806f, #26a58f); }
    .kpis .kpi:nth-child(4) { background: linear-gradient(135deg, #e0911c, #f2b13d); }
    .kpis .kpi ::ng-deep .kpi-l, .kpis .kpi ::ng-deep .kpi-s, .kpis .kpi ::ng-deep .kpi-v { color: #fff; }
    .kpis .kpi ::ng-deep .kpi-l { text-transform: none; letter-spacing: 0; font-size: 13px; }
    .kpis .kpi ::ng-deep .kpi-v { font-size: 30px; }
    .kpis .kpi ::ng-deep .kpi-s { font-size: 11.5px; opacity: 0.92; line-height: 1.4; }

    /* Bảng */
    .tbl-wrap { border-radius: 0; border: 0; box-shadow: none; overflow: auto; background: none; }
    .tbl { font-size: 13px; font-family: var(--font); }
    .tbl .c-ma b { font-weight: 700; }
    .tbl thead th { background: var(--panel); font-size: 12px; white-space: nowrap; border-radius: 0; }
    .tbl thead th:first-child { border-top-left-radius: 10px; } .tbl thead th:last-child { border-top-right-radius: 10px; }
    .tbl tbody td { padding-block: 9px; vertical-align: middle; }
    .tbl ::ng-deep .sub { font-size: 11.5px; }

    /* Phụ trách: avatar chữ cái đầu + tên */
    .pt { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .av { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--brand); color: #fff; font-size: 10px; font-weight: 700; }

  `,
})
export class KhList {
  protected readonly TT = TT;
  protected readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly short = vndShort;
  protected readonly tab = signal<'ds' | 'ch' | 'bc'>('ds');
  protected readonly coHoi = viewChild(KhCoHoi);
  protected readonly baoCaoKH = viewChild(KhBaoCao);
  /** Hai chữ cái đầu của tên (avatar). */
  private static readonly MAU = ['#0f5a2a', '#14806f', '#e0a31c', '#7b5cc4', '#c95f3b', '#3b7bc9'];
  /** Màu avatar cố định theo mã tài khoản. */
  protected mau(id: string): string {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return KhList.MAU[h % KhList.MAU.length];
  }
  protected vietTat(ten: string): string {
    return ten.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();
  }

  protected readonly loc = signal<Loc>(nhoLoc('kh-list', LOC_RONG));
  protected readonly phanBo = computed(() => this.store.canEdit('phanBoKH'));
  /** Có cột tích chọn: để phân bổ Sale hoặc để xoá nhiều (cần quyền gửi yêu cầu xoá). */
  protected readonly xoaNhieuDuoc = computed(() => this.store.level('duyetXoa') !== 'none');
  protected readonly coChon = computed(() => this.phanBo() || this.xoaNhieuDuoc());
  protected readonly chon = signal<Set<string>>(new Set());
  protected readonly giaoCho = signal('');
  /** Popup thêm / sửa: '' = thêm mới, mã KH = sửa, null = đóng. Mở sẵn khi vào ?them=1 (đường dẫn cũ /khach-hang/moi). */
  protected readonly sua = signal<string | null>(inject(ActivatedRoute).snapshot.queryParamMap.get('them') ? '' : null);

  protected readonly all = computed<Row[]>(() => {
    const dem = new Map<string, number>();
    for (const h of this.store.hopDongBan()) dem.set(h.maKH, (dem.get(h.maKH) ?? 0) + 1);
    return this.store.khachHang().map((k) => ({
      k,
      soHD: dem.get(k.id) ?? 0,
      csCuoi: k.chamSoc?.reduce<string | undefined>((m, c) => (!m || c.luc > m ? c.luc : m), undefined),
      xoa: this.store.dangChoXoa('DM_KhachHang', k.id),
    }));
  });

  protected readonly facets = computed<Facet[]>(() => {
    const ks = this.store.khachHang();
    const tinh = new Set(ks.map((k) => k.tinh).filter(Boolean));
    const phuTrach = [...new Set(ks.map((k) => k.phuTrach).filter((x): x is string => !!x))];
    return [
      { key: 'tiepCan', label: 'Tiếp cận', options: optsTT(TIEP_CAN) },
      { key: 'coHoi', label: 'Cơ hội', options: optsTT(CO_HOI) },
      {
        key: 'phuTrach',
        label: 'Phụ trách',
        options: [
          { value: CHUA_PB, label: '— Chưa phân bổ —' },
          ...phuTrach.map((id) => ({ value: id, label: this.store.userName(id) })),
        ],
      },
      { key: 'tinh', label: 'Tỉnh / TP', options: opts(TINH_THANH.filter((t) => tinh.has(t))) },
      { key: 'nguon', label: 'Nguồn', options: opts(NGUON_KH) },
      { key: 'phanLoai', label: 'Phân loại', options: opts(PHAN_LOAI_KH) },
      { key: 'loaiSP', label: 'Sản phẩm', options: opts(LOAI_SP_KH) },
    ];
  });

  protected readonly sx = new Sorter<Row>({
    id: (r) => r.k.id,
    vietTat: (r) => r.k.tenVietTat,
    ten: (r) => r.k.ten,
    tinh: (r) => r.k.tinh,
    tiepCan: (r) => TIEP_CAN.indexOf(r.k.tiepCan ?? TT.CHUA_LIEN_HE),
    coHoi: (r) => CO_HOI.indexOf(r.k.coHoi ?? TT.CHUA_TIEP_CAN),
    giaTri: (r) => r.k.giaTriCoHoi ?? 0,
    phuTrach: (r) => (r.k.phuTrach ? this.store.userName(r.k.phuTrach) : ''),
    cs: (r) => r.csCuoi,
    soHD: (r) => r.soHD,
  });

  protected readonly rows = computed(() => {
    const l = this.loc();
    return this.sx.apply(
      this.all().filter(
        ({ k }) =>
          khopQ(l, k.id, k.ten, k.tenVietTat, k.mst, k.tinh, k.diaChi, k.nguoiLienHe, k.dienThoai, k.email, k.ghiChu) &&
          khopSel(l, 'tiepCan', k.tiepCan ?? TT.CHUA_LIEN_HE) &&
          khopSel(l, 'coHoi', k.coHoi ?? TT.CHUA_TIEP_CAN) &&
          khopSel(l, 'phuTrach', k.phuTrach || CHUA_PB) &&
          khopSel(l, 'tinh', k.tinh) &&
          khopSel(l, 'nguon', k.nguon) &&
          khopSel(l, 'phanLoai', k.phanLoai) &&
          khopSel(l, 'loaiSP', k.loaiSP),
      ),
    );
  });
  protected readonly pg = paginate(this.rows);

  protected readonly kpi = computed(() => {
    const rs = this.rows();
    const mo = rs.filter((r) => r.k.coHoi === TT.DA_BAO_GIA || r.k.coHoi === TT.DANG_DAM_PHAN);
    return {
      n: rs.length,
      coHD: rs.filter((r) => r.soHD > 0).length,
      tho: rs.filter((r) => !r.k.phuTrach).length,
      dangCS: rs.filter((r) => r.k.tiepCan === TT.DANG_LIEN_HE).length,
      mo: mo.length,
      giaTriMo: sum(mo, (r) => r.k.giaTriCoHoi ?? 0),
    };
  });

  protected readonly caTrang = computed(() => {
    const ids = this.pg.items().map((r) => r.k.id);
    return ids.length > 0 && ids.every((id) => this.chon().has(id));
  });

  protected mo(id: string): void {
    void this.router.navigate(['/khach-hang', id]);
  }
  protected flip(id: string): void {
    this.chon.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  protected chonTrang(on: boolean): void {
    this.chon.update((s) => {
      const n = new Set(s);
      for (const r of this.pg.items()) {
        if (on) n.add(r.k.id);
        else n.delete(r.k.id);
      }
      return n;
    });
  }
  protected phanBoChon(): void {
    const ids = [...this.chon()];
    const err = this.store.phanBoKH(ids, this.giaoCho());
    if (err) return this.store.say(err);
    this.store.say(`Đã phân bổ ${ids.length} khách cho ${this.giaoCho() ? this.store.userName(this.giaoCho()) : 'chưa phân bổ'}`);
    this.chon.set(new Set());
  }

  protected xuat(): void {
    if (this.tab() === 'ch') return this.coHoi()?.xuat();
    if (this.tab() === 'bc') return this.baoCaoKH()?.xuat();
    const head = [
      'Mã KH', 'Tên công ty', 'Tên viết tắt', 'MST', 'Địa chỉ', 'Tỉnh/Thành phố', 'Người liên hệ', 'Chức vụ', 'Điện thoại', 'Email', 'Phân loại KH',
      'Nguồn KH', 'Loại hình sản phẩm', 'Hình thức HĐ', 'Trạng thái tiếp cận', 'Trạng thái cơ hội', 'Giá trị cơ hội', 'Người phụ trách',
      'Trạng thái data', 'Ngày tiếp nhận', 'Ngày phân bổ', 'Chăm sóc gần nhất', 'Số HĐ bán', 'Ghi chú',
    ];
    const body = this.rows().map(({ k, soHD, csCuoi }) => [
      k.id, k.ten, k.tenVietTat ?? '', k.mst, k.diaChi, k.tinh ?? '', k.nguoiLienHe, k.chucVu ?? '', k.dienThoai, k.email, k.phanLoai ?? '',
      k.nguon ?? '', k.loaiSP ?? '', k.hinhThucHD ?? '', ttNhan(k.tiepCan), ttNhan(k.coHoi), k.giaTriCoHoi ?? '',
      k.phuTrach ? this.store.userName(k.phuTrach) : '', ttNhan(k.trangThaiData), viDate(k.ngayTiepNhan), viDate(k.ngayPhanBo),
      viDate(csCuoi), soHD, k.ghiChu,
    ]);
    void xuatExcel('khach-hang', [head, ...body]);
  }
  /** Xoá nhiều: chỉ khách mình sửa được và chưa chờ xoá; khách bị ràng buộc bị bỏ qua kèm lý do. */
  protected async xoaNhieu(): Promise<void> {
    const ds = this.all()
      .filter((r) => this.chon().has(r.k.id) && !r.xoa && this.store.canEditKH(r.k))
      .map((r) => ({ id: r.k.id, ten: r.k.ten || r.k.id, moTa: `Khách hàng ${r.k.id} — ${r.k.ten}` }));
    if (!ds.length) return this.store.say('Không có khách nào xoá được trong số đã chọn (đang chờ xoá hoặc không có quyền sửa)', 'bad');
    if (await guiXoaNhieu(this.confirm, this.store, 'DM_KhachHang', ds, 'khách hàng')) this.boChon();
  }
  protected async xoa(k: KhachHang): Promise<void> {
    await guiXoa(this.confirm, this.store, 'DM_KhachHang', k.id, `Khách hàng ${k.id} — ${k.ten}`);
  }
  protected boChon(): void {
    this.chon.set(new Set());
  }
}
