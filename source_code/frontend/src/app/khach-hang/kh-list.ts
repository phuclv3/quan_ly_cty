import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { CO_HOI, KhachHang, LOAI_SP_KH, NGUON_KH, PHAN_LOAI_KH, TIEP_CAN, TINH_THANH } from '../core/models';
import { nhoLoc } from '../core/ui';
import { money, sum, vndShort, viDate } from '../core/util';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Kpi, TrangThai } from '../shared/ui-kit';
import { Pager, paginate } from '../shared/pager';
import { SortTh, Sorter } from '../shared/sort';
import { xuatCsv } from '../shared/export';
import { Icon } from '../shared/icon';
import { ImportDm } from '../shared/import-dm';
import { KhForm } from './kh-form';
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
  imports: [RouterLink, FilterBar, Kpi, TrangThai, Pager, SortTh, Icon, KhForm, ImportDm],
  template: `
    <div class="page-head">
      <div>
        <div class="crumbs"><a routerLink="/">Trang chủ</a> › Khách hàng</div>
        <h1>Khách hàng</h1>
        <p class="sub">Theo dõi tiếp cận, cơ hội và chăm sóc khách — cũng là danh mục khách để chọn khi lập HĐ bán.</p>
      </div>
      <div class="actions">
        <button type="button" class="btn quiet" (click)="xuat()"><app-icon name="download" [size]="16" /> Xuất CSV</button>
        @if (store.canEdit('khachHang')) {
          <app-import-dm loai="kh" />
          <button type="button" class="btn" (click)="sua.set('')"><app-icon name="plus" [size]="16" /> Thêm khách hàng</button>
        }
      </div>
    </div>

    <div class="kpis">
      <app-kpi label="Khách hàng" [value]="'' + kpi().n" [sub]="kpi().coHD + ' khách đã có HĐ bán'" />
      <app-kpi label="KH chưa phân bổ" [value]="'' + kpi().tho" sub="Chưa giao Sale phụ trách" [tone]="kpi().tho ? 'warn' : ''" />
      <app-kpi label="Đang chăm sóc" [value]="'' + kpi().dangCS" sub="Tiếp cận: Đang liên hệ" />
      <app-kpi label="Cơ hội đang mở" [value]="short(kpi().giaTriMo)" [sub]="kpi().mo + ' khách Đã báo giá / Đang đàm phán'" tone="ok" />
    </div>

    <app-filter [(loc)]="loc" memo="kh-list" [time]="false" [facets]="facets()" placeholder="Tìm mã, tên, MST, tỉnh, người liên hệ, điện thoại, ghi chú…" />

    @if (phanBo() && chon().size) {
      <div class="note info bulk">
        <b>Đã chọn {{ chon().size }} khách</b>
        <select aria-label="Giao cho Sale" [value]="giaoCho()" (change)="giaoCho.set($any($event.target).value)">
          <option value="">— Trả về chưa phân bổ —</option>
          @for (o of store.saleOpts(); track o.value) { <option [value]="o.value" [selected]="o.value === giaoCho()">{{ o.label }} — {{ o.hint }}</option> }
        </select>
        <button type="button" class="btn sm" (click)="phanBoChon()">Phân bổ</button>
        <button type="button" class="btn sm quiet" (click)="boChon()">Bỏ chọn</button>
      </div>
    }

    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead>
          <tr>
            @if (phanBo()) {
              <th style="width:36px"><input type="checkbox" aria-label="Chọn cả trang" [checked]="caTrang()" (change)="chonTrang($any($event.target).checked)" /></th>
            }
            <th app-sort-th [sx]="sx" k="id" class="c-ma">Mã KH</th>
            <th app-sort-th [sx]="sx" k="ten" class="c-ten">Khách hàng</th>
            <th app-sort-th [sx]="sx" k="tinh">Tỉnh / TP</th>
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
              @if (phanBo()) {
                <td (click)="$event.stopPropagation()"><input type="checkbox" [attr.aria-label]="'Chọn ' + r.k.ten" [checked]="chon().has(r.k.id)" (change)="flip(r.k.id)" /></td>
              }
              <td class="mono c-ma"><a [routerLink]="['/khach-hang', r.k.id]" (click)="$event.stopPropagation()"><b>{{ r.k.id }}</b></a></td>
              <td>
                <b>{{ r.k.ten }}</b>
                @if (r.k.trangThai === TT.NGUNG) { <app-tt [v]="TT.NGUNG" /> }
                @if (r.xoa) { <app-tt v="Chờ xoá" /> }
                <div class="sub">{{ r.k.mst ? 'MST ' + r.k.mst : '' }}{{ r.k.mst && r.k.phanLoai ? ' · ' : '' }}{{ r.k.phanLoai }}</div>
              </td>
              <td>{{ r.k.tinh || '—' }}</td>
              <td class="lh-cell">{{ r.k.nguoiLienHe }}<div class="sub">{{ r.k.dienThoai }}</div></td>
              <td><app-tt [v]="r.k.tiepCan || TT.CHUA_LIEN_HE" /></td>
              <td><app-tt [v]="r.k.coHoi || TT.CHUA_TIEP_CAN" /></td>
              <td class="num">{{ r.k.giaTriCoHoi ? money(r.k.giaTriCoHoi) : '—' }}</td>
              <td>@if (r.k.phuTrach) { {{ store.userName(r.k.phuTrach) }} } @else { <app-tt [v]="TT.CHUA_PHAN_BO" /> }</td>
              <td>{{ viDate(r.csCuoi) }}</td>
              <td class="num">{{ r.soHD }}</td>
              <td (click)="$event.stopPropagation()">
                @if (store.canEditKH(r.k) && !r.xoa) { <button type="button" class="btn sm quiet" (click)="sua.set(r.k.id)">Sửa</button> }
              </td>
            </tr>
          } @empty {
            <tr><td [attr.colspan]="phanBo() ? 12 : 11" class="empty">Không có khách hàng phù hợp bộ lọc.</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [pager]="pg" />

    <!-- Thêm / sửa khách hàng: popup như các danh mục khác -->
    <app-kh-form [khId]="sua()" (closed)="sua.set(null)" />
  `,
  styles: `
    .bulk { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 12px; }
    .bulk select { width: auto; min-width: 220px; }
    .lh-cell { max-width: 240px; overflow-wrap: anywhere; }
    /* Mã KH ngắn (KH0001) — cột gọn; tên công ty dài — cột rộng, xuống dòng đủ chữ */
    .c-ma { width: 1%; white-space: nowrap; }
    .c-ten { min-width: 340px; width: 34%; }
  `,
})
export class KhList {
  protected readonly TT = TT;
  protected readonly store = inject(Store);
  private readonly router = inject(Router);
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly short = vndShort;

  protected readonly loc = signal<Loc>(nhoLoc('kh-list', LOC_RONG));
  protected readonly phanBo = computed(() => this.store.canEdit('phanBoKH'));
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
          khopQ(l, k.id, k.ten, k.mst, k.tinh, k.diaChi, k.nguoiLienHe, k.dienThoai, k.email, k.ghiChu) &&
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
    const head = [
      'Mã KH', 'Tên công ty', 'MST', 'Địa chỉ', 'Tỉnh/Thành phố', 'Người liên hệ', 'Chức vụ', 'Điện thoại', 'Email', 'Phân loại KH',
      'Nguồn KH', 'Loại hình sản phẩm', 'Hình thức HĐ', 'Trạng thái tiếp cận', 'Trạng thái cơ hội', 'Giá trị cơ hội', 'Người phụ trách',
      'Trạng thái data', 'Ngày tiếp nhận', 'Ngày phân bổ', 'Chăm sóc gần nhất', 'Số HĐ bán', 'Ghi chú',
    ];
    const body = this.rows().map(({ k, soHD, csCuoi }) => [
      k.id, k.ten, k.mst, k.diaChi, k.tinh ?? '', k.nguoiLienHe, k.chucVu ?? '', k.dienThoai, k.email, k.phanLoai ?? '',
      k.nguon ?? '', k.loaiSP ?? '', k.hinhThucHD ?? '', ttNhan(k.tiepCan), ttNhan(k.coHoi), k.giaTriCoHoi ?? '',
      k.phuTrach ? this.store.userName(k.phuTrach) : '', ttNhan(k.trangThaiData), viDate(k.ngayTiepNhan), viDate(k.ngayPhanBo),
      viDate(csCuoi), soHD, k.ghiChu,
    ]);
    void xuatCsv('khach-hang', [head, ...body]);
  }
  protected boChon(): void {
    this.chon.set(new Set());
  }
}
