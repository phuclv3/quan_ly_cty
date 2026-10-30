import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { hdmCalc, HdmCalc, hoSoThieu } from '../core/calc';
import { HopDongMua, TRANG_THAI_HDM } from '../core/models';
import { nhoLoc } from '../core/ui';
import { pct, sum, viDate, vndShort } from '../core/util';
import { FilterBar, khopQ, khopSel, Loc, LOC_RONG, Facet } from '../shared/filter-bar';
import { TrangThai } from '../shared/ui-kit';
import { Pager, paginate } from '../shared/pager';
import { xuatExcel } from '../shared/export';
import { Icon } from '../shared/icon';
import { ImportHd } from '../shared/import-hd';
import { SortTh, Sorter } from '../shared/sort';
import { ChonNhieu } from '../shared/chon-nhieu';
import { Confirm } from '../shared/confirm';
import { guiXoaNhieu } from '../shared/ho-so';
import { chuVietTat, mauAvatar } from '../shared/avatar';
import { HdmBaoCao } from './hdm-bao-cao';

/** Một ô giai đoạn: nhãn màu + dòng phụ. */
interface O {
  t: string;
  c: 'mute' | 'info' | 'ok' | 'warn' | 'bad' | 'done';
  sub?: string;
}

interface Dong {
  m: HopDongMua;
  c: HdmCalc;
  soHDB: string;
  choXoa: boolean;
  /** 'OXY' hoặc 'Phú Tài'. */
  pn: 'OXY' | 'Phú Tài';
  /** Người phụ trách = sale của HĐ bán liên quan ('' nếu HĐ mua chưa gắn HĐ bán). */
  pt: string;
  phatSinh: boolean;
  /** Đủ điều kiện tất toán: đã nhận đủ, trả đủ NCC, có hoá đơn NCC, đủ hồ sơ bắt buộc. */
  duDK: boolean;
  /** Giai đoạn đang vướng đầu tiên ('' nếu không). */
  vuong: string;
  hd: O;
  cungUng: O;
  nhapKho: O;
  thanhToan: O;
  tatToan: O;
}

const GIAI_DOAN_VUONG = ['Cung ứng', 'Nhập kho', 'Thanh toán', 'Tất toán'];

/** HDM-01: danh sách Hợp đồng mua. */
@Component({
  selector: 'app-hdm-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [NgTemplateOutlet, RouterLink, FilterBar, TrangThai, Pager, Icon, SortTh, ImportHd, HdmBaoCao],
  template: `
    <div class="page-head">
      <div>
        <div class="crumbs"><a routerLink="/">Trang chủ</a> › Hợp đồng mua</div>
        <h1>Hợp đồng mua</h1>
      </div>
      <div class="actions">
        <button type="button" class="btn quiet pill" (click)="xuat()">Xuất Excel</button>
        @if (store.canEdit('hdm')) {
          <app-import-hd loai="mua" />
          <a class="btn pill hero" routerLink="/hop-dong-mua/moi"><app-icon name="plus" [size]="16" /> Tạo HĐ mua</a>
        }
      </div>
    </div>

    <div class="seg" role="tablist">
      <button type="button" role="tab" [class.on]="tab() === 'ds'" (click)="tab.set('ds')">Danh sách hợp đồng</button>
      <button type="button" role="tab" [class.on]="tab() === 'bc'" (click)="tab.set('bc')">Báo cáo vận hành</button>
    </div>

    @if (tab() === 'bc') {
      <app-hdm-bao-cao />
    } @else {
    <div class="kpis">
      <div class="k hero"><span class="l">Tổng giá trị</span><b class="v">{{ short(kpi().tong) }}</b><span class="s">{{ kpi().n }} HĐ (không tính Dự thảo)</span></div>
      <div class="k"><span class="l">Đã trả NCC (OXY)</span><b class="v">{{ short(kpi().daTraOxy) }}</b><span class="s">{{ kpi().pctOxy }}% · {{ kpi().nOxy }} HĐ của OXY</span></div>
      <div class="k"><span class="l">Đã trả NCC (Phú Tài)</span><b class="v">{{ short(kpi().daTraPt) }}</b><span class="s">{{ kpi().pctPt }}% · {{ kpi().nPt }} HĐ thuộc Phú Tài</span></div>
      <div class="k"><span class="l">Còn phải trả (OXY)</span><b class="v">{{ short(kpi().conTraOxy) }}</b><span class="s">không tính Phú Tài{{ kpi().quaHan ? ' · ' + kpi().quaHan + ' HĐ quá hạn' : '' }}</span></div>
      <div class="k"><span class="l">Đang cung ứng</span><b class="v">{{ kpi().dangCungUng }}</b><span class="s">HĐ chưa nhận hàng</span></div>
    </div>

    <div class="chips">
      <button type="button" class="chip-f" [class.on]="tt() === '' && !canh()" (click)="chonTT('')">Tất cả ({{ dem('') }})</button>
      @for (t of TRANG_THAI; track t) {
        <button type="button" class="chip-f" [class.on]="tt() === t && !canh()" (click)="chonTT(t)">{{ nhanHd(t) }} ({{ dem(t) }})</button>
      }
      <span class="grow"></span>
      <button type="button" class="chip-f dk" [class.on]="canh() === 'dk'" (click)="bat('dk')">⚠ Đủ ĐK tất toán ({{ soDK() }})</button>
      <button type="button" class="chip-f ps" [class.on]="canh() === 'ps'" (click)="bat('ps')">⚠ Có phát sinh ({{ soPS() }})</button>
    </div>

    <section class="panel">
      <app-filter [(loc)]="loc" memo="hdm-list" [time]="false" [facets]="facets()" placeholder="Tìm số HĐ, nhà cung cấp, MST…" />

      @if (chonDuoc() && cn.chon().size) {
        <div class="note info bulk">
          <b>Đã chọn {{ cn.chon().size }} hợp đồng</b>
          <button type="button" class="btn sm danger" (click)="xoaNhieu()"><app-icon name="trash" [size]="15" /> Xoá {{ cn.chon().size }} đã chọn</button>
          <button type="button" class="btn sm quiet" (click)="cn.xoa()">Bỏ chọn</button>
        </div>
      }

      <div class="tbl-wrap">
        <table class="tbl freeze">
          <thead>
            <tr>
              @if (chonDuoc()) { <th style="width:36px"><input type="checkbox" aria-label="Chọn cả trang" [checked]="cn.du(idTrang())" (change)="cn.chonTat(idTrang(), $any($event.target).checked)" /></th> }
              <th app-sort-th [sx]="sx" k="soHD" class="c-so">Số HĐ</th>
              <th app-sort-th [sx]="sx" k="ncc" class="c-kh">Nhà cung cấp</th>
              <th app-sort-th [sx]="sx" k="tong" class="num">Giá trị</th>
              <th>Hợp đồng</th><th>Tiến độ cung ứng</th><th>Kiểm tra &amp; nhập kho</th><th>Thanh toán NCC</th><th>Tất toán</th>
              <th app-sort-th [sx]="sx" k="pt">Phụ trách</th>
            </tr>
          </thead>
          <tbody>
            @for (r of pg.items(); track r.m.id) {
              <tr class="click" [class.overdue]="r.c.quaHan > 0" (click)="mo(r.m.id)">
                @if (chonDuoc()) {
                  <td (click)="$event.stopPropagation()">
                    @if (xoaDuoc(r)) { <input type="checkbox" [attr.aria-label]="'Chọn ' + r.m.soHD" [checked]="cn.co(r.m.id)" (change)="cn.flip(r.m.id)" /> }
                  </td>
                }
                <td class="c-so">
                  <a [routerLink]="['/hop-dong-mua', r.m.id]" (click)="$event.stopPropagation()"><b>{{ r.m.soHD || '(chưa có số)' }}</b></a>
                  <div class="sub">ký {{ viDate(r.m.ngayKy) }}</div>
                  @if (r.phatSinh) { <span class="st bad ps-tag">⚠ Phát sinh</span> }
                  @if (r.m.import) { <span class="tag mute" title="HĐ thật — chuyển từ file Excel cũ">Import</span> } @else if (r.m.soHD.startsWith('DEMO-')) { <span class="tag warn" title="Dữ liệu giả lập để xem đủ trạng thái">Demo</span> }
                  @if (r.choXoa) { <app-tt v="Chờ xoá" /> }
                </td>
                <td class="c-kh">
                  <span class="kh">{{ r.m.tenNCC }}</span>
                  <span class="pn" [class.pt2]="r.pn === 'Phú Tài'">{{ r.pn }}</span>
                </td>
                <td class="num"><b>{{ short(r.c.tong) }}</b></td>
                <td><ng-container *ngTemplateOutlet="o; context: { $implicit: r.hd }" /></td>
                <td><ng-container *ngTemplateOutlet="o; context: { $implicit: r.cungUng }" /></td>
                <td><ng-container *ngTemplateOutlet="o; context: { $implicit: r.nhapKho }" /></td>
                <td><ng-container *ngTemplateOutlet="o; context: { $implicit: r.thanhToan }" /></td>
                <td><ng-container *ngTemplateOutlet="o; context: { $implicit: r.tatToan }" /></td>
                <td>
                  @if (r.pt) {
                    <span class="pt"><span class="av" [style.background]="mau(r.pt)">{{ vt(store.userName(r.pt)) }}</span>{{ store.userName(r.pt) }}</span>
                  } @else { <span class="muted">—</span> }
                </td>
              </tr>
            } @empty {
              <tr><td [attr.colspan]="chonDuoc() ? 10 : 9" class="empty">{{ all().length ? 'Không có HĐ mua nào khớp bộ lọc' : 'Chưa có HĐ mua nào' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
      <p class="legend"><b>4 giai đoạn:</b> Hợp đồng → Tiến độ cung ứng → Kiểm tra &amp; nhập kho → Tất toán · <b>Thanh toán NCC</b> là luồng riêng chạy song song</p>
      <p class="legend">Tất toán khi đã nhận đủ hàng, trả đủ NCC và đủ hồ sơ: Hợp đồng, BBGH/BBNT, Hoá đơn NCC · HĐ thuộc Phú Tài không nhập kho, không vào công nợ OXY</p>
      <p class="legend"><b class="neg">⚠ Phát sinh</b> = số đợt thanh toán NCC quá hạn</p>
      <app-pager [pager]="pg" />
      <p class="legend">bấm số HĐ để mở chi tiết</p>
    </section>
    }

    <ng-template #o let-x>
      <span class="st" [class]="'st ' + x.c">{{ x.t }}</span>
      @if (x.sub) { <div class="sub">{{ x.sub }}</div> }
    </ng-template>
  `,
  styles: `
    .bulk { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 12px; }
    .page-head { align-items: center; }
    .btn.pill { border-radius: 999px; min-height: 36px; padding: 4px 16px; font-size: 13.5px; background: var(--surf); color: #16642b; border: 1.5px solid #16642b; }
    .btn.pill:hover { background: var(--brand-tint); }
    .btn.pill.hero { background: #0f5a2a; color: #fff; border-color: #0f5a2a; }
    .actions ::ng-deep app-import-hd > .btn { border-radius: 999px; min-height: 36px; padding: 4px 16px; font-size: 13.5px; background: var(--surf); color: #16642b; border: 1.5px solid #16642b; }
    .actions ::ng-deep app-import-hd > .btn app-icon { display: none; }

    .seg { display: inline-flex; gap: 4px; padding: 4px; margin-bottom: 14px; border-radius: 999px; background: var(--surf); }
    .seg button { border: 0; background: none; padding: 7px 18px; border-radius: 999px; font-size: 13.5px; font-weight: 600; color: var(--ink-2); cursor: pointer; }
    .seg button.on { background: #0f5a2a; color: #fff; }

    .kpis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr)); margin-bottom: 14px; }
    .k { display: flex; flex-direction: column; gap: 4px; background: var(--surf); border-radius: 14px; padding: 12px 14px; min-width: 0; min-height: 112px; }
    .k.hero { background: linear-gradient(135deg, #0f7a3d, #4bb04f); color: #fff; }
    .k .l { font-size: 12.5px; font-weight: 600; color: var(--ink-2); line-height: 1.3; }
    .k.hero .l, .k.hero .s { color: #fff; }
    .k .v { font-size: 26px; line-height: 1.2; font-weight: 700; white-space: nowrap; }
    .k .s { font-size: 11px; color: var(--ink-3); line-height: 1.4; min-height: 2.8em; margin-top: auto; }

    .chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; }
    .chip-f { border: 0; border-radius: 999px; padding: 6px 14px; background: var(--surf); font-size: 12.5px; font-weight: 600; color: var(--ink-2); cursor: pointer; }
    .chip-f.on { background: #0f5a2a; color: #fff; }
    .chip-f.dk { background: #e2f3e9; color: #17663f; }
    .chip-f.ps { background: #fbe4e1; color: #a3261d; }
    .chip-f.dk.on { background: #17663f; color: #fff; }
    .chip-f.ps.on { background: #a3261d; color: #fff; }
    .grow { flex: 1 1 auto; }

    .panel { background: var(--surf); border-radius: 18px; padding: 14px 16px 16px; }
    .panel ::ng-deep .filters { gap: 10px; margin-bottom: 14px; }
    .panel ::ng-deep .filters .search { height: 40px; border-radius: 999px; background: var(--panel); border: 0; box-shadow: none; max-width: 300px; }
    .panel ::ng-deep .filters .fsel select, .panel ::ng-deep .filters .pick-btn { height: 40px; border-radius: 999px; background: var(--panel); border: 0; font-weight: 600; font-size: 13.5px; padding-inline: 16px; }
    .panel ::ng-deep .filters .f-clear { background: none; border: 0; color: var(--ink-3); font-size: 13px; }

    .tbl-wrap { border-radius: 0; border: 0; box-shadow: none; overflow: auto; background: none; }
    .tbl { font-size: 12px; font-family: var(--font); }
    .tbl thead th { background: var(--panel); font-size: 11.5px; white-space: nowrap; border-radius: 0; }
    .tbl thead th:first-child { border-top-left-radius: 10px; } .tbl thead th:last-child { border-top-right-radius: 10px; }
    .tbl tbody td { padding-block: 9px; vertical-align: top; }
    .tbl td.c-so, .tbl th.c-so { width: 1%; min-width: 0 !important; white-space: nowrap; }
    .tbl td.c-kh { min-width: 150px !important; max-width: 190px; }
    .tbl ::ng-deep .sub { font-size: 11px; margin-top: 2px; }
    .kh { display: block; font-weight: 700; text-transform: uppercase; font-size: 11.5px; line-height: 1.35; margin-bottom: 3px; }
    .pn { display: inline-block; padding: 0 8px; border-radius: 6px; font-size: 10.5px; font-weight: 700; background: #dff3e4; color: #17663f; }
    .pn.pt2 { background: #ece0f7; color: #6b3f93; }
    .st { display: inline-block; padding: 1px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap; background: var(--mute-bg); color: var(--mute-fg); }
    .st.info { background: #dce9f8; color: #2c5d94; }
    .st.ok { background: #dff3e4; color: #17663f; }
    .st.warn { background: #fbf0d6; color: #8a5a00; }
    .st.bad { background: #fbe4e1; color: #a3261d; }
    .st.done { background: #2f3a36; color: #fff; }
    .ps-tag { display: table; margin-top: 4px; }
    .pt { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .av { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; color: #fff; font-size: 9.5px; font-weight: 700; flex: 0 0 auto; }
    .legend { margin: 8px 0 0; font-size: 11.5px; color: var(--ink-3); }
  `,
})
export class HdmList {
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  protected readonly TRANG_THAI = TRANG_THAI_HDM;
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);
  protected readonly cn = new ChonNhieu();
  protected readonly viDate = viDate;
  protected readonly short = vndShort;
  protected readonly mau = mauAvatar;
  protected readonly vt = chuVietTat;

  protected readonly loc = signal<Loc>(nhoLoc('hdm-list', LOC_RONG));
  protected readonly tab = signal<'ds' | 'bc'>('ds');
  protected readonly tt = signal<'' | HopDongMua['trangThai']>('');
  protected readonly canh = signal<'' | 'dk' | 'ps'>('');

  /** Nhãn chip lọc: Nháp hiện là "Dự thảo" cho khớp cột Hợp đồng. */
  protected nhanHd(t: HopDongMua['trangThai']): string {
    return t === TT.NHAP ? 'Dự thảo' : ttNhan(t);
  }

  protected readonly all = computed<Dong[]>(() => {
    const db = this.store.db();
    return this.store.hdmVisible().map((m) => this.dongHd(m, hdmCalc(m, db)));
  });

  /** Suy ra các ô giai đoạn từ dữ liệu có sẵn: trạng thái HĐ, checklist, phiếu nhập kho, đợt trả NCC, hồ sơ. */
  private dongHd(m: HopDongMua, c: HdmCalc): Dong {
    const db = this.store.db();
    const nhap = m.trangThai === TT.NHAP;
    const huy = m.trangThai === TT.HUY;
    const tatToan = m.trangThai === TT.DA_TAT_TOAN;
    const song = !nhap && !huy && !tatToan;
    const pt = m.thuocPhuTai;
    const xong = (ten: string) => m.checklist.find((x) => x.ten === ten);
    const daDat = !!xong('Đặt hàng')?.xong;
    const hangVe = xong('Dự kiến hàng về');
    const kiemDinh = !!xong('Kiểm định')?.xong;
    const daNhapDu = pt || c.pctNhap >= 1;
    const thieuHS = hoSoThieu(db, 'HDM', m.id);
    const duDK = song && daNhapDu && c.conPhaiTra <= 0 && m.xuatHoaDon === 'Đã' && !thieuHS.length;
    let vuong = '';
    if (song) {
      if (!hangVe?.xong) vuong = 'Cung ứng';
      else if (!daNhapDu) vuong = 'Nhập kho';
      else if (c.conPhaiTra > 0) vuong = 'Thanh toán';
      else if (!duDK) vuong = 'Tất toán';
    }
    const pctTra = Math.round(c.pctTra * 100);
    const dotXong = m.dotTT.filter((d) => !!d.ngayTra).length;
    return {
      m,
      c,
      soHDB: m.hdbId ? (this.store.hdbById(m.hdbId)?.soHD ?? m.hdbId) : '',
      choXoa: this.store.dangChoXoa('HopDongMua', m.id),
      pn: pt ? 'Phú Tài' : 'OXY',
      pt: m.hdbId ? (this.store.hdbById(m.hdbId)?.sale ?? '') : '',
      phatSinh: c.quaHan > 0,
      duDK,
      vuong,
      hd: nhap
        ? { t: 'Dự thảo', c: 'mute', sub: 'chờ phê duyệt' }
        : huy
          ? { t: ttNhan(TT.HUY), c: 'bad' }
          : tatToan
            ? { t: 'Đã thanh lý', c: 'done' }
            : { t: 'Có hiệu lực', c: 'info' },
      cungUng: hangVe?.xong
        ? { t: 'Đã về', c: 'ok', sub: hangVe.ngay ? viDate(hangVe.ngay) : undefined }
        : daDat
          ? { t: 'Đã đặt', c: 'warn' }
          : { t: 'Chưa đặt', c: 'mute' },
      nhapKho: pt
        ? { t: 'Không nhập kho', c: 'mute', sub: 'Phú Tài' }
        : c.pctNhap >= 1
          ? { t: 'Đã nhập', c: 'ok' }
          : c.pctNhap > 0
            ? { t: 'Nhập một phần', c: 'warn', sub: pct(c.pctNhap, 0) }
            : kiemDinh
              ? { t: 'Đã kiểm định', c: 'info', sub: 'chờ nhập kho' }
              : { t: 'Chưa nhận', c: 'mute' },
      thanhToan: { t: pctTra + '%', c: pctTra >= 100 ? 'ok' : pctTra > 0 ? 'warn' : 'mute', sub: m.dotTT.length ? `${dotXong}/${m.dotTT.length} đợt` : undefined },
      tatToan: tatToan
        ? { t: 'Đã tất toán', c: 'ok' }
        : duDK
          ? { t: 'Đủ ĐK', c: 'ok', sub: 'đủ hồ sơ' }
          : { t: 'Chưa', c: 'mute', sub: song && thieuHS.length ? 'thiếu hồ sơ' : undefined },
    };
  }

  protected readonly facets = computed<Facet[]>(() => {
    const hs = this.store.hdmVisible();
    const nams = [...new Set(hs.map((m) => m.ngayKy?.slice(0, 4)).filter((x): x is string => !!x))].sort().reverse();
    const ncc = new Map(hs.map((m) => [m.maNCC, m.tenNCC]));
    const pts = [...new Set(this.all().map((r) => r.pt).filter(Boolean))];
    return [
      { key: 'nam', label: 'Năm', options: nams.map((y) => ({ value: y, label: 'Năm ' + y })) },
      { key: 'ncc', label: 'NCC', options: [...ncc].map(([value, label]) => ({ value, label })) },
      { key: 'vuong', label: 'Giai đoạn vướng', options: GIAI_DOAN_VUONG.map((t) => ({ value: t, label: t })) },
      { key: 'pt', label: 'Phụ trách', options: pts.map((s) => ({ value: s, label: this.store.userName(s) })) },
      { key: 'pn', label: 'Pháp nhân', options: ['OXY', 'Phú Tài'].map((t) => ({ value: t, label: t })) },
    ];
  });

  protected readonly sx = new Sorter<Dong>({
    soHD: (r) => r.m.soHD,
    ncc: (r) => r.m.tenNCC,
    tong: (r) => r.c.tong,
    pt: (r) => (r.pt ? this.store.userName(r.pt) : ''),
  });

  /** Sau ô tìm và bộ lọc chọn, trước chip trạng thái — để số trên chip khớp danh sách. */
  private readonly locSan = computed(() => {
    const l = this.loc();
    return this.sx.apply(
      this.all()
        .filter(
          (r) =>
            khopQ(l, r.m.soHD, r.m.tenNCC, r.m.mst, r.soHDB, r.m.ghiChu) &&
            khopSel(l, 'nam', r.m.ngayKy?.slice(0, 4)) &&
            khopSel(l, 'ncc', r.m.maNCC) &&
            khopSel(l, 'vuong', r.vuong) &&
            khopSel(l, 'pt', r.pt) &&
            khopSel(l, 'pn', r.pn),
        )
        .sort((a, b) => (b.m.ngayKy ?? b.m.taoLuc).localeCompare(a.m.ngayKy ?? a.m.taoLuc)),
    );
  });
  protected dem(t: '' | HopDongMua['trangThai']): number {
    return this.locSan().filter((r) => !t || r.m.trangThai === t).length;
  }
  protected readonly soDK = computed(() => this.locSan().filter((r) => r.duDK).length);
  protected readonly soPS = computed(() => this.locSan().filter((r) => r.phatSinh).length);
  protected chonTT(t: '' | HopDongMua['trangThai']): void {
    this.tt.set(t);
    this.canh.set('');
  }
  protected bat(c: 'dk' | 'ps'): void {
    this.canh.set(this.canh() === c ? '' : c);
    this.tt.set('');
  }

  protected readonly rows = computed(() =>
    this.locSan().filter((r) =>
      this.canh() === 'dk' ? r.duDK : this.canh() === 'ps' ? r.phatSinh : !this.tt() || r.m.trangThai === this.tt(),
    ),
  );
  protected readonly pg = paginate(this.rows);

  protected readonly kpi = computed(() => {
    const hl = this.locSan().filter((r) => r.m.trangThai !== TT.NHAP && r.m.trangThai !== TT.HUY);
    const oxy = hl.filter((r) => r.pn === 'OXY');
    const pt = hl.filter((r) => r.pn === 'Phú Tài');
    const tongOxy = sum(oxy, (r) => r.c.tong);
    const tongPt = sum(pt, (r) => r.c.tong);
    const pc = (x: number, tong: number) => (tong ? Math.round((x / tong) * 100) : 0);
    const daTraOxy = sum(oxy, (r) => r.c.daTra);
    const daTraPt = sum(pt, (r) => r.c.daTra);
    return {
      n: hl.length,
      tong: tongOxy + tongPt,
      daTraOxy,
      daTraPt,
      pctOxy: pc(daTraOxy, tongOxy),
      pctPt: pc(daTraPt, tongPt),
      nOxy: oxy.length,
      nPt: pt.length,
      conTraOxy: sum(oxy, (r) => Math.max(0, r.c.conPhaiTra)),
      quaHan: oxy.filter((r) => r.c.quaHan > 0).length,
      dangCungUng: oxy.filter((r) => (r.m.trangThai === TT.DA_KY || r.m.trangThai === TT.DANG_NHAN_HANG) && r.c.pctNhap === 0).length,
    };
  });

  /** Xoá hàng loạt: chỉ người gửi được yêu cầu xoá, và chỉ HĐ mình sửa được, chưa chờ xoá. */
  protected readonly chonDuoc = computed(() => this.store.level('duyetXoa') !== 'none');
  protected xoaDuoc(r: Dong): boolean {
    return !r.choXoa && this.store.canEdit('hdm');
  }
  protected readonly idTrang = computed(() => this.pg.items().filter((r) => this.xoaDuoc(r)).map((r) => r.m.id));
  protected async xoaNhieu(): Promise<void> {
    const ds = this.all()
      .filter((r) => this.cn.co(r.m.id) && this.xoaDuoc(r))
      .map((r) => ({ id: r.m.id, ten: r.m.soHD || r.m.id, moTa: 'HĐ mua ' + (r.m.soHD || r.m.id) }));
    if (await guiXoaNhieu(this.confirm, this.store, 'HopDongMua', ds, 'HĐ mua')) this.cn.xoa();
  }

  protected mo(id: string): void {
    void this.router.navigate(['/hop-dong-mua', id]);
  }

  protected xuat(): void {
    const head = ['Số HĐ mua', 'NCC', 'MST', 'Pháp nhân', 'Ngày ký', 'Giá trị VNĐ', 'Đã trả', 'Đã trả %', 'Còn phải trả', 'Nhập hàng %', 'HĐ bán liên quan', 'Phụ trách', 'Trạng thái'];
    const body = this.rows().map((r) => [
      r.m.soHD,
      r.m.tenNCC,
      r.m.mst,
      r.pn,
      viDate(r.m.ngayKy),
      r.c.tong,
      r.c.daTra,
      pct(r.c.pctTra),
      r.c.conPhaiTra,
      r.m.thuocPhuTai ? '' : pct(r.c.pctNhap),
      r.soHDB,
      r.pt ? this.store.userName(r.pt) : '',
      r.choXoa ? `${r.hd.t} (Chờ xoá)` : r.hd.t,
    ]);
    void xuatExcel('hop-dong-mua', [head, ...body]);
  }
}
