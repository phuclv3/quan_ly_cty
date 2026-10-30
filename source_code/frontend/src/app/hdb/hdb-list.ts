import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { api } from '../core/api';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { HdbCalc, hdbCalc } from '../core/calc';
import { HopDongBan, TRANG_THAI_HDB } from '../core/models';
import { nhoLoc } from '../core/ui';
import { money, sum, vndShort, viDate } from '../core/util';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { TrangThai } from '../shared/ui-kit';
import { Pager, paginate } from '../shared/pager';
import { SortTh, Sorter } from '../shared/sort';
import { xuatExcel } from '../shared/export';
import { Icon } from '../shared/icon';
import { ImportHd } from '../shared/import-hd';
import { ChonNhieu } from '../shared/chon-nhieu';
import { Confirm } from '../shared/confirm';
import { guiXoaNhieu } from '../shared/ho-so';
import { chuVietTat, mauAvatar } from '../shared/avatar';
import { HdbBaoCao } from './hdb-bao-cao';

/** Một ô giai đoạn: nhãn màu + dòng phụ. */
interface O {
  t: string;
  c: 'mute' | 'info' | 'ok' | 'warn' | 'bad' | 'done';
  sub?: string;
}

/** Tổng theo pháp nhân do backend tính (POST /hop-dong-ban/tong-thu). */
interface TongThu {
  soHD: number;
  sauVAT: number;
  daThu: number;
  conPhaiThu: number;
}

interface Row {
  h: HopDongBan;
  c: HdbCalc;
  xoa: boolean;
  /** 'OXY' hoặc 'Phú Tài' (khách có Hợp đồng Phú Tài). */
  pn: 'OXY' | 'Phú Tài';
  phatSinh: boolean;
  /** Đủ điều kiện tất toán: đủ hồ sơ bắt buộc, đã giao, thu đủ, chưa tất toán. */
  duDK: boolean;
  /** Giai đoạn đang vướng đầu tiên ('' nếu không). */
  vuong: string;
  hd: O;
  thucHien: O;
  giao: O;
  nghiemThu: O;
  thanhToan: O;
  tatToan: O;
}

const GIAI_DOAN_VUONG = ['Giao hàng', 'Nghiệm thu', 'Thanh toán', 'Tất toán'];

/** HDB-01 — Danh sách Hợp đồng bán. Cột tiền chỉ hiện khi có quyền xem HDB-07 (Tab 3). */
@Component({
  selector: 'app-hdb-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [NgTemplateOutlet, RouterLink, FilterBar, TrangThai, Pager, Icon, SortTh, ImportHd, HdbBaoCao],
  template: `
    <div class="page-head">
      <div>
        <div class="crumbs"><a routerLink="/">Trang chủ</a> › Hợp đồng bán</div>
        <h1>Hợp đồng bán</h1>
        @if (store.ownOnly('hdb')) { <p class="sub">Chỉ hiện HĐ bạn phụ trách.</p> }
      </div>
      <div class="actions">
        <button type="button" class="btn quiet pill" (click)="xuat()">Xuất Excel</button>
        @if (store.canEdit('hdb')) {
          <app-import-hd loai="ban" />
          <a class="btn pill hero" routerLink="/hop-dong-ban/moi"><app-icon name="plus" [size]="16" /> Tạo HĐ bán</a>
        }
      </div>
    </div>

    @if (xemTien()) {
      <div class="seg" role="tablist">
        <button type="button" role="tab" [class.on]="tab() === 'ds'" (click)="tab.set('ds')">Danh sách hợp đồng</button>
        <button type="button" role="tab" [class.on]="tab() === 'bc'" (click)="tab.set('bc')">Báo cáo kinh doanh</button>
      </div>
    }

    @if (tab() === 'bc' && xemTien()) {
      <app-hdb-bao-cao />
    } @else {
    <div class="kpis">
      @if (xemTien()) {
        <div class="k hero"><span class="l">Tổng giá trị</span><b class="v">{{ short(kpi().tong) }}</b><span class="s">{{ kpi().n }} HĐ (không tính Báo giá)</span></div>
        <div class="k"><span class="l">Đã thu KH (OXY)</span><b class="v">{{ short(kpi().daThuOxy) }}</b><span class="s">{{ kpi().pctOxy }}% · {{ kpi().nOxy }} HĐ của OXY</span></div>
        <div class="k"><span class="l">Đã thu KH (Phú Tài)</span><b class="v">{{ short(kpi().daThuPt) }}</b><span class="s">{{ kpi().pctPt }}% · {{ kpi().nPt }} HĐ thuộc Phú Tài</span></div>
        <div class="k"><span class="l">Còn phải thu (OXY)</span><b class="v">{{ short(kpi().conThuOxy) }}</b><span class="s">không tính Phú Tài{{ kpi().quaHan ? ' · ' + kpi().quaHan + ' HĐ quá hạn' : '' }}</span></div>
        <div class="k"><span class="l">Còn phải thu (Phú Tài)</span><b class="v">{{ tongThu() ? short(tongThu()!.phuTai.conPhaiThu) : '…' }}</b><span class="s">{{ tongThu() ? tongThu()!.phuTai.soHD + ' HĐ cờ Phú Tài · số liệu do máy chủ tính' : 'đang tải…' }}</span></div>
      } @else {
        <div class="k hero"><span class="l">Số HĐ</span><b class="v">{{ kpi().n }}</b><span class="s">Không tính Báo giá</span></div>
      }
      <div class="k"><span class="l">Chờ nghiệm thu</span><b class="v">{{ kpi().choNT }}</b><span class="s">HĐ đã giao, chờ nghiệm thu</span></div>
    </div>

    <div class="chips">
      <button type="button" class="chip-f" [class.on]="tt() === '' && !canh()" (click)="chonTT('')">Tất cả ({{ dem('') }})</button>
      @for (t of TRANG_THAI; track t) {
        <button type="button" class="chip-f" [class.on]="tt() === t && !canh()" (click)="chonTT(t)">{{ ttNhan(t) }} ({{ dem(t) }})</button>
      }
      <span class="grow"></span>
      <button type="button" class="chip-f dk" [class.on]="canh() === 'dk'" (click)="bat('dk')">⚠ Đủ ĐK tất toán ({{ soDK() }})</button>
      <button type="button" class="chip-f ps" [class.on]="canh() === 'ps'" (click)="bat('ps')">⚠ Có phát sinh ({{ soPS() }})</button>
    </div>

    <section class="panel">
      <app-filter [(loc)]="loc" memo="hdb-list" [time]="false" [facets]="facets()" placeholder="Tìm số HĐ, khách hàng, MST…" />

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
              <th app-sort-th [sx]="sx" k="kh" class="c-kh">Khách hàng</th>
              @if (xemTien()) { <th app-sort-th [sx]="sx" k="sau" class="num">Giá trị</th> }
              <th>Hợp đồng</th><th>Thực hiện</th><th>Giao hàng</th><th>Nghiệm thu</th>
              @if (xemTien()) { <th>Thanh toán</th> }
              <th>Tất toán</th>
              <th app-sort-th [sx]="sx" k="sale">Phụ trách</th>
            </tr>
          </thead>
          <tbody>
            @for (r of pg.items(); track r.h.id) {
              <tr class="click" [class.overdue]="r.c.quaHan > 0" (click)="mo(r.h.id)">
                @if (chonDuoc()) {
                  <td (click)="$event.stopPropagation()">
                    @if (xoaDuoc(r)) { <input type="checkbox" [attr.aria-label]="'Chọn ' + r.h.soHD" [checked]="cn.co(r.h.id)" (change)="cn.flip(r.h.id)" /> }
                  </td>
                }
                <td class="c-so">
                  <a [routerLink]="['/hop-dong-ban', r.h.id]" (click)="$event.stopPropagation()"><b>{{ r.h.soHD || '(chưa có số)' }}</b></a>
                  <div class="sub">ký {{ viDate(r.h.ngayKy) }}</div>
                  @if (r.phatSinh) { <span class="st bad ps-tag">⚠ Phát sinh</span> }
                  @if (r.h.import) { <span class="tag mute" title="HĐ thật — chuyển từ file Excel cũ">Import</span> } @else if (r.h.soHD.startsWith('DEMO-')) { <span class="tag warn" title="Dữ liệu giả lập để xem đủ trạng thái">Demo</span> }
                  @if (r.xoa) { <app-tt v="Chờ xoá" /> }
                </td>
                <td class="c-kh">
                  <span class="kh">{{ r.h.tenKH }}</span>
                  <span class="pn" [class.pt2]="r.pn === 'Phú Tài'">{{ r.pn }}</span>
                </td>
                @if (xemTien()) { <td class="num"><b>{{ short(r.c.sauVAT) }}</b></td> }
                <td><ng-container *ngTemplateOutlet="o; context: { $implicit: r.hd }" /></td>
                <td><ng-container *ngTemplateOutlet="o; context: { $implicit: r.thucHien }" /></td>
                <td><ng-container *ngTemplateOutlet="o; context: { $implicit: r.giao }" /></td>
                <td><ng-container *ngTemplateOutlet="o; context: { $implicit: r.nghiemThu }" /></td>
                @if (xemTien()) { <td><ng-container *ngTemplateOutlet="o; context: { $implicit: r.thanhToan }" /></td> }
                <td><ng-container *ngTemplateOutlet="o; context: { $implicit: r.tatToan }" /></td>
                <td>
                  <span class="pt"><span class="av" [style.background]="mau(r.h.sale)">{{ vt(store.userName(r.h.sale)) }}</span>{{ store.userName(r.h.sale) }}</span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="(xemTien() ? 10 : 8) + (chonDuoc() ? 1 : 0)" class="empty">
                  @if (all().length) { Không có hợp đồng phù hợp bộ lọc. }
                  @else { Chưa có hợp đồng bán nào. @if (store.canEdit('hdb')) { <a routerLink="/hop-dong-ban/moi">Tạo HĐ bán đầu tiên</a> } }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="legend"><b>6 giai đoạn:</b> Hợp đồng → Thực hiện → Giao hàng → Nghiệm thu → Thanh toán → Tất toán — để theo dõi, <b>không khoá tuần tự</b></p>
      <p class="legend">Thanh toán theo đợt chạy song song · tất toán khi đủ hồ sơ: Hợp đồng, BBGH/BBNT, Hoá đơn &nbsp; <b class="neg">⚠ Phát sinh</b> = đợt quá hạn hoặc có phạt HĐ</p>
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
    /* Cả 5 thẻ cùng chiều cao, nhãn / số / dòng phụ thẳng hàng; dòng phụ luôn chừa chỗ cho 2 dòng */
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
export class HdbList {
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  protected readonly ttNhan = ttNhan;
  protected readonly TRANG_THAI = TRANG_THAI_HDB;
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);
  protected readonly cn = new ChonNhieu();
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly short = vndShort;
  protected readonly mau = mauAvatar;
  protected readonly vt = chuVietTat;

  protected readonly loc = signal<Loc>(nhoLoc('hdb-list', LOC_RONG));
  protected readonly tab = signal<'ds' | 'bc'>('ds');
  protected readonly tt = signal<'' | HopDongBan['trangThai']>('');
  protected readonly canh = signal<'' | 'dk' | 'ps'>('');
  /** Giá trị, đã thu, công nợ: chỉ người có quyền xem HDB-07 (VD nhóm Kho không thấy). */
  protected readonly xemTien = computed(() => this.store.canView('hdbTab3'));

  protected readonly all = computed<Row[]>(() => {
    const db = this.store.db();
    const ptKH = new Set(db.hopDongPhuTai.map((x) => x.maKH));
    return this.store
      .hdbVisible()
      .map((h) => this.dongHd(h, hdbCalc(h, db), ptKH.has(h.maKH) ? 'Phú Tài' : 'OXY'))
      .sort((a, b) => ((a.h.ngayKy ?? a.h.taoLuc) < (b.h.ngayKy ?? b.h.taoLuc) ? 1 : -1));
  });

  /** Suy ra 6 ô giai đoạn từ dữ liệu có sẵn: trạng thái HĐ, xuất kho, hồ sơ và các đợt thanh toán. */
  private dongHd(h: HopDongBan, c: HdbCalc, pn: Row['pn']): Row {
    const baoGia = h.trangThai === TT.BAO_GIA;
    const huy = h.trangThai === TT.HUY;
    const tatToan = h.trangThai === TT.DA_TAT_TOAN;
    const daGiao = c.giaoHang === 'Đã giao';
    const thieuBB = c.hoSoThieu.includes('BBGH/BBNT');
    const choNT = daGiao && thieuBB;
    const dotXong = h.dotTT.filter((d) => !!d.ngayThu).length;
    const duDK = !baoGia && !huy && !tatToan && daGiao && !c.hoSoThieu.length && c.conPhaiThu <= 0;
    let vuong = '';
    if (!baoGia && !huy && !tatToan) {
      if (!daGiao) vuong = 'Giao hàng';
      else if (choNT) vuong = 'Nghiệm thu';
      else if (c.pctThu < 1) vuong = 'Thanh toán';
      else if (!duDK) vuong = 'Tất toán';
    }
    const pctTxt = Math.round(c.pctThu * 100);
    return {
      h,
      c,
      xoa: this.store.dangChoXoa('HopDongBan', h.id),
      pn,
      phatSinh: c.quaHan > 0 || c.phat > 0,
      duDK,
      vuong,
      hd: { t: ttNhan(h.trangThai), c: baoGia ? 'mute' : huy ? 'bad' : tatToan ? 'done' : h.trangThai === TT.HOAN_THANH ? 'ok' : h.trangThai === TT.DANG_GIAO_HANG ? 'warn' : 'info' },
      thucHien: baoGia || huy ? { t: 'Chưa', c: 'mute' } : c.giaoHang === 'Chưa giao' ? { t: 'Chuẩn bị', c: 'info' } : { t: 'Xong', c: 'ok' },
      giao: { t: c.giaoHang, c: daGiao ? 'ok' : c.giaoHang === 'Đang giao' ? 'warn' : 'mute', sub: c.soLanGiao ? `${c.soLanGiao} lần giao` : undefined },
      nghiemThu: choNT ? { t: 'Chờ BBNT', c: 'bad', sub: 'thiếu BBGH/BBNT' } : daGiao ? { t: 'Đạt', c: 'ok' } : { t: 'Chưa', c: 'mute' },
      thanhToan: { t: pctTxt + '%', c: pctTxt >= 100 ? 'ok' : pctTxt > 0 ? 'warn' : 'mute', sub: h.dotTT.length ? `${dotXong}/${h.dotTT.length} đợt` : undefined },
      tatToan: tatToan
        ? { t: 'Đã tất toán', c: 'ok' }
        : duDK
          ? { t: 'Đủ ĐK', c: 'ok', sub: 'đủ hồ sơ' }
          : { t: 'Chưa', c: 'mute', sub: !baoGia && !huy && c.hoSoThieu.length ? 'thiếu hồ sơ' : undefined },
    };
  }

  protected readonly facets = computed<Facet[]>(() => {
    const hs = this.store.hdbVisible();
    const sales = [...new Set(hs.map((h) => h.sale))];
    const nams = [...new Set(hs.map((h) => h.ngayKy?.slice(0, 4)).filter((x): x is string => !!x))].sort().reverse();
    const kh = new Map(hs.map((h) => [h.maKH, h.tenKH]));
    return [
      { key: 'nam', label: 'Năm', options: nams.map((y) => ({ value: y, label: 'Năm ' + y })) },
      { key: 'kh', label: 'Khách hàng', options: [...kh].map(([value, label]) => ({ value, label })) },
      { key: 'vuong', label: 'Giai đoạn vướng', options: GIAI_DOAN_VUONG.map((t) => ({ value: t, label: t })) },
      { key: 'sale', label: 'Phụ trách', options: sales.map((s) => ({ value: s, label: this.store.userName(s) })) },
      { key: 'pn', label: 'Pháp nhân', options: ['OXY', 'Phú Tài'].map((t) => ({ value: t, label: t })) },
    ];
  });

  protected readonly sx = new Sorter<Row>({
    soHD: (r) => r.h.soHD,
    kh: (r) => r.h.tenKH,
    sau: (r) => r.c.sauVAT,
    sale: (r) => this.store.userName(r.h.sale),
  });

  /** Sau ô tìm và bộ lọc chọn, trước chip trạng thái — để số trên chip khớp danh sách. */
  private readonly locSan = computed(() => {
    const l = this.loc();
    return this.sx.apply(
      this.all().filter(
        ({ h, vuong, pn }) =>
          khopQ(l, h.soHD, h.tenKH, h.mst, h.ghiChu, this.store.userName(h.sale)) &&
          khopSel(l, 'nam', h.ngayKy?.slice(0, 4)) &&
          khopSel(l, 'kh', h.maKH) &&
          khopSel(l, 'vuong', vuong) &&
          khopSel(l, 'sale', h.sale) &&
          khopSel(l, 'pn', pn),
      ),
    );
  });
  protected dem(t: '' | HopDongBan['trangThai']): number {
    return this.locSan().filter((r) => !t || r.h.trangThai === t).length;
  }
  protected readonly soDK = computed(() => this.locSan().filter((r) => r.duDK).length);
  protected readonly soPS = computed(() => this.locSan().filter((r) => r.phatSinh).length);
  protected chonTT(t: '' | HopDongBan['trangThai']): void {
    this.tt.set(t);
    this.canh.set('');
  }
  protected bat(c: 'dk' | 'ps'): void {
    this.canh.set(this.canh() === c ? '' : c);
    this.tt.set('');
  }

  protected readonly rows = computed(() =>
    this.locSan().filter((r) =>
      this.canh() === 'dk' ? r.duDK : this.canh() === 'ps' ? r.phatSinh : !this.tt() || r.h.trangThai === this.tt(),
    ),
  );
  protected readonly pg = paginate(this.rows);

  protected readonly kpi = computed(() => {
    const rs = this.locSan().filter((r) => r.h.trangThai !== TT.BAO_GIA && r.h.trangThai !== TT.HUY);
    const oxy = rs.filter((r) => r.pn === 'OXY');
    const pt = rs.filter((r) => r.pn === 'Phú Tài');
    const tong = sum(rs, (r) => r.c.sauVAT);
    const pc = (x: Row[]) => (tong ? Math.round((sum(x, (r) => r.c.daThu) / tong) * 100) : 0);
    return {
      n: rs.length,
      tong,
      daThuOxy: sum(oxy, (r) => r.c.daThu),
      daThuPt: sum(pt, (r) => r.c.daThu),
      pctOxy: pc(oxy),
      pctPt: pc(pt),
      nOxy: oxy.length,
      nPt: pt.length,
      conThuOxy: sum(oxy, (r) => r.c.conPhaiThu),
      quaHan: oxy.filter((r) => r.c.quaHan > 0).length,
      choNT: rs.filter((r) => r.nghiemThu.t === 'Chờ BBNT').length,
    };
  });

  /** Còn phải thu theo pháp nhân do backend tính (POST /hop-dong-ban/tong-thu) trên đúng các HĐ đang lọc, không tính Báo giá / huỷ. */
  protected readonly tongThu = signal<{ oxy: TongThu; phuTai: TongThu } | null>(null);
  private seqThu = 0;
  private readonly napTongThu = effect(() => {
    if (!this.xemTien()) return;
    const ids = this.locSan()
      .filter((r) => r.h.trangThai !== TT.BAO_GIA && r.h.trangThai !== TT.HUY)
      .map((r) => r.h.id);
    const mine = ++this.seqThu;
    void api<{ oxy: TongThu; phuTai: TongThu }>('POST', '/hop-dong-ban/tong-thu', { ids })
      .then((x) => mine === this.seqThu && this.tongThu.set(x))
      .catch(() => mine === this.seqThu && this.tongThu.set(null));
  });

  /** Xoá hàng loạt: chỉ người gửi được yêu cầu xoá, và chỉ HĐ mình sửa được, chưa chờ xoá. */
  protected readonly chonDuoc = computed(() => this.store.level('duyetXoa') !== 'none');
  protected xoaDuoc(r: Row): boolean {
    return !r.xoa && this.store.canEdit('hdb', r.h.sale);
  }
  protected readonly idTrang = computed(() => this.pg.items().filter((r) => this.xoaDuoc(r)).map((r) => r.h.id));
  protected async xoaNhieu(): Promise<void> {
    const ds = this.all()
      .filter((r) => this.cn.co(r.h.id) && this.xoaDuoc(r))
      .map((r) => ({ id: r.h.id, ten: r.h.soHD || r.h.id, moTa: 'HĐ bán ' + (r.h.soHD || r.h.id) }));
    if (await guiXoaNhieu(this.confirm, this.store, 'HopDongBan', ds, 'HĐ bán')) this.cn.xoa();
  }

  protected mo(id: string): void {
    void this.router.navigate(['/hop-dong-ban', id]);
  }

  protected xuat(): void {
    const tien = this.xemTien();
    const head = ['Số HĐ', 'Khách hàng', 'MST', 'Pháp nhân', 'Ngày ký', ...(tien ? ['Giá trị sau VAT', 'Đã thu', 'Đã thu (%)', 'Còn phải thu'] : []), 'Giao hàng', 'Hồ sơ', 'Sale phụ trách', 'Trạng thái'];
    const body = this.rows().map(({ h, c, pn }) => [
      h.soHD,
      h.tenKH,
      h.mst,
      pn,
      viDate(h.ngayKy),
      ...(tien ? [c.sauVAT, c.daThu, Math.round(c.pctThu * 1000) / 10, c.conPhaiThu] : []),
      c.giaoHang,
      c.hoSoThieu.length ? `Thiếu: ${c.hoSoThieu.join(', ')}` : 'Đủ',
      this.store.userName(h.sale),
      ttNhan(h.trangThai),
    ]);
    void xuatExcel('hop-dong-ban', [head, ...body]);
  }
}
