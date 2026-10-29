import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { ChiPhiHD, LOAI_PHIEU, PhieuThuChi } from '../core/models';
import { chenhLechQuyetToan } from '../core/calc';
import { nhoLoc } from '../core/ui';
import { money, sum, viDate } from '../core/util';
import { TrangThai } from '../shared/ui-kit';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel, khopThoiGian } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { xuatExcel } from '../shared/export';
import { ChonNhieu } from '../shared/chon-nhieu';
import { ChonBar } from '../shared/chon-bar';
import { Confirm } from '../shared/confirm';
import { xoaNhieuCoNhap } from '../shared/ho-so';
import { PhieuForm } from './phieu-form';
import { ChiPhiForm } from './chi-phi-form';
import { inPhieuThuChi } from './kt-print';
import { SortTh, Sorter } from '../shared/sort';
import { TT, ttNhan } from '../core/trang-thai';

const CP_HD = 'CP HĐ';
const TRANG_THAI = [TT.NHAP, TT.CHO_DUYET, TT.DA_DUYET, TT.TU_CHOI];

export interface SqRow {
  key: string;
  so: string;
  ngay: string;
  loai: string;
  nguon: string;
  nguonIds: string[];
  lcp?: string;
  noiDung: string;
  thu: number;
  chi: number;
  /** Luân chuyển: không cộng vào Tổng Thu / Tổng Chi (KT-10). */
  lc: boolean;
  nguoi: string;
  trangThai: string;
  hdbId?: string;
  p?: PhieuThuChi;
  c?: ChiPhiHD;
}

/** Tab Phiếu thu / Phiếu chi (KT-04, tách từ Sổ quỹ): Thu = loại 'Thu'; Chi = Chi, Tạm ứng, Quyết toán, Luân chuyển. Chi có chế độ Xem gộp CP HĐ đã duyệt (D-14). */
@Component({
  selector: 'app-kt-so-quy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChonBar, TrangThai, FilterBar, Pager, PhieuForm, ChiPhiForm, RouterLink, SortTh],
  template: `
    <div class="between" style="margin-bottom:8px">
      <p class="sub muted">
        @if (draftOnly()) { Bạn chỉ thấy các phiếu do mình đề nghị. } @else { Sổ quỹ chung — không gắn hợp đồng. }
      </p>
      <div class="row">
        <button type="button" class="btn quiet" (click)="xuat()">Xuất Excel</button>
        @if (coTheLap()) {
          @if (laTat() || laThu()) { <button type="button" class="btn" (click)="mo(store.newPhieu('Thu'))">+ Lập phiếu thu</button> }
          @if (laTat() || !laThu()) { <button type="button" class="btn" (click)="mo(store.newPhieu('Chi'))">+ Lập phiếu chi</button> }
        }
      </div>
    </div>
    <app-filter [(loc)]="loc" [memo]="laTat() ? 'kt-so-quy' : laThu() ? 'kt-phieu-thu' : 'kt-phieu-chi'" [facets]="facets()" placeholder="Tìm số phiếu, nội dung, người…">
      @if (!draftOnly() && !laThu()) {
        <label class="check-row"><input type="checkbox" [checked]="gop()" (change)="gop.set($any($event.target).checked)" /> Xem gộp CP HĐ</label>
      }
    </app-filter>
    <app-chon-bar [cn]="cn" ten="phiếu" (xoa)="xoaNhieu()" />
    <div class="tbl-wrap">
      <table class="tbl freeze sq">
        <thead>
          <tr>
            @if (chonDuoc()) { <th style="width:36px"><input type="checkbox" aria-label="Chọn cả trang" [checked]="cn.du(idTrang())" (change)="cn.chonTat(idTrang(), $any($event.target).checked)" /></th> }<th app-sort-th [sx]="sx" k="so">Số phiếu</th><th app-sort-th [sx]="sx" k="ngay" class="c-ngay">Ngày lập</th><th app-sort-th [sx]="sx" k="loai">Loại phiếu</th><th app-sort-th [sx]="sx" k="nguon">Nguồn tiền</th>@if (!laThu()) { <th>Loại chi phí</th> }<th class="c-nd">Nội dung</th>
            <th app-sort-th [sx]="sx" k="thu" class="num">Thu</th>@if (!laThu()) { <th app-sort-th [sx]="sx" k="chi" class="num">Chi</th> }<th app-sort-th [sx]="sx" k="nguoi">Người đề nghị</th><th app-sort-th [sx]="sx" k="tt">Trạng thái</th><th style="width:70px"></th>
          </tr>
        </thead>
        <tbody>
          @for (r of pg.items(); track r.key) {
            <tr class="click" (click)="moRow(r)">
              @if (chonDuoc()) {
                <td (click)="$event.stopPropagation()">@if (xoaDuoc(r)) { <input type="checkbox" [attr.aria-label]="'Chọn ' + r.so" [checked]="cn.co(r.key)" (change)="cn.flip(r.key)" /> }</td>
              }
              <td><b>{{ r.so }}</b></td>
              <td class="c-ngay">{{ viDate(r.ngay) }}</td>
              <td>@if (r.c) { <span class="tag info">CP HĐ</span> } @else { {{ r.loai }} }</td>
              <td>{{ r.nguon }}</td>
              @if (!laThu()) { <td>{{ r.lcp || '—' }}</td> }
              <td class="c-nd">
                {{ r.noiDung }}
                @if (r.hdbId) { <a class="sub linkish" [routerLink]="['/hop-dong-ban', r.hdbId]" (click)="$event.stopPropagation()">HĐ {{ store.hdbById(r.hdbId)?.soHD }}</a> }
                @if (r.p?.phatSinh) { <span class="sub muted">Sinh từ đợt thanh toán HĐ</span> }
              </td>
              <td class="num" [class.muted]="r.lc">{{ r.thu ? money(r.thu) : '' }}</td>
              @if (!laThu()) { <td class="num" [class.muted]="r.lc" [attr.title]="r.lc ? 'Luân chuyển — không tính vào tổng' : null">{{ r.chi ? money(r.chi) : '' }}</td> }
              <td>{{ r.nguoi }}</td>
              <td>@if (r.p && store.dangChoXoa('PhieuThuChi', r.p.id)) { <app-tt v="Chờ xoá" /> } @else { <app-tt [v]="r.trangThai" /> }</td>
              <td (click)="$event.stopPropagation()">@if (r.p) { <button type="button" class="btn sm quiet" [attr.aria-label]="'In chứng từ ' + r.so" (click)="inChungTu(r.p)">In</button> }</td>
            </tr>
          } @empty {
            <tr><td [attr.colspan]="soCot()" class="empty">{{ all().length ? 'Không có phiếu khớp bộ lọc' : laTat() ? 'Chưa có phiếu thu chi nào' : laThu() ? 'Chưa có phiếu thu nào' : 'Chưa có phiếu chi nào' }}</td></tr>
          }
        </tbody>
        <tfoot>
          <tr>
            <th [attr.colspan]="(chonDuoc() ? 6 : 5) + (laThu() ? 0 : 1)">Tổng theo bộ lọc ({{ rows().length }} dòng@if (!laThu()) { ; không gồm Luân chuyển })</th>
            <td class="num">{{ money(tongThu()) }}</td>
            @if (laThu()) {
              <td colspan="3"></td>
            } @else {
              <td class="num">{{ money(tongChi()) }}</td>
              <td colspan="3" class="num" [class.neg]="tongThu() - tongChi() < 0">Chênh {{ money(tongThu() - tongChi()) }}</td>
            }
          </tr>
        </tfoot>
      </table>
    </div>
    <app-pager [pager]="pg" />

    <app-phieu-form [phieu]="phieu()" [nhom]="nhomForm()" (closed)="phieu.set(null)" (moPhieu)="phieu.set(store.phieuById($event) ?? null)" />
    <app-chi-phi-form [chiPhi]="cp()" (closed)="cp.set(null)" />
  `,
})
export class SoQuyTab {
  protected readonly store = inject(Store);
  protected readonly money = money;
  protected readonly viDate = viDate;

  readonly mode = input<'thu' | 'chi' | 'tat'>('chi');
  protected readonly laThu = computed(() => this.mode() === 'thu');
  protected readonly laTat = computed(() => this.mode() === 'tat');
  protected readonly nhomForm = computed<'thu' | 'chi' | null>(() => (this.laTat() ? null : this.mode() === 'thu' ? 'thu' : 'chi'));
  protected readonly soCot = computed(() => (this.chonDuoc() ? 1 : 0) + (this.laThu() ? 9 : 11));

  protected readonly loc = signal<Loc>(nhoLoc('kt-so-quy', LOC_RONG));
  protected readonly gop = signal(false);
  protected readonly phieu = signal<PhieuThuChi | null>(null);
  protected readonly cp = signal<ChiPhiHD | null>(null);

  protected readonly draftOnly = computed(() => this.store.level('soQuy') === 'draft');
  protected readonly coTheLap = computed(() => this.store.phieuSuaDuoc(this.store.newPhieu()));

  protected readonly facets = computed<Facet[]>(() => [
    { key: 'loai', label: 'Loại phiếu', options: [...LOAI_PHIEU.filter((l) => this.laTat() || (l === 'Thu') === this.laThu()), ...(this.gop() && !this.laThu() ? [CP_HD] : [])].map((v) => ({ value: v, label: v })) },
    { key: 'nguon', label: 'Nguồn tiền', options: this.store.nguonTien().map((n) => ({ value: n.id, label: n.ten })) },
    { key: 'tt', label: 'Trạng thái', options: TRANG_THAI.map((v) => ({ value: v, label: ttNhan(v) })) },
    { key: 'lcp', label: 'Loại chi phí', options: this.store.loaiChiPhi().map((l) => ({ value: l.id, label: l.ten, hint: l.nhom })) },
  ]);

  constructor() {
    // Liên kết sâu: ?id=<phiếu> mở popup phiếu; ?lapQT=<phiếu tạm ứng> mở phiếu Quyết toán điền sẵn gốc.
    const route = inject(ActivatedRoute);
    const router = inject(Router);
    const q = route.snapshot.queryParamMap;
    const id = q.get('id');
    const lapQT = q.get('lapQT');
    if (id) {
      const p = this.store.phieuById(id);
      if (p && (!this.draftOnly() || p.nguoiDeNghi === this.store.meId())) this.phieu.set(p);
      else this.store.say('Không tìm thấy phiếu hoặc bạn không được xem phiếu này');
    } else if (lapQT) {
      const g = this.store.phieuById(lapQT);
      const p = this.store.newPhieu('Quyết toán tạm ứng');
      if (g && this.coTheLap()) this.phieu.set({ ...p, phieuTamUngGoc: g.id, nguonTien: g.nguonTien, nguoiNhan: g.nguoiNhan, soTienThucChi: g.soTienChi, noiDung: `Quyết toán tạm ứng ${g.soPhieu}` });
    }
    if (id || lapQT) void router.navigate([], { relativeTo: route, queryParams: { id: null, lapQT: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected readonly all = computed<SqRow[]>(() => {
    const s = this.store;
    const db = s.db();
    const me = s.meId();
    const thu = this.laThu();
    const tat = this.laTat();
    const phieus = db.phieuThuChi.filter((p) => (tat || (p.loai === 'Thu') === thu) && (!this.draftOnly() || p.nguoiDeNghi === me));
    const out: SqRow[] = phieus.map((p) => {
      let thu = p.soTienThu;
      let chi = p.soTienChi;
      if (p.loai === 'Quyết toán tạm ứng') {
        const cl = chenhLechQuyetToan(p, db);
        thu = cl > 0 ? cl : 0;
        chi = cl < 0 ? -cl : 0;
      }
      const lc = p.loai === 'Luân chuyển';
      return {
        key: 'P' + p.id,
        so: p.soPhieu,
        ngay: p.ngayLap,
        loai: p.loai,
        nguon: lc ? `${s.nguonTen(p.nguonTien)} → ${s.nguonTen(p.nguonTienDen)}` : s.nguonTen(p.nguonTien),
        nguonIds: lc ? [p.nguonTien, p.nguonTienDen ?? ''] : [p.nguonTien],
        lcp: p.loaiChiPhi ? s.lcpTen(p.loaiChiPhi) : undefined,
        noiDung: p.noiDung,
        thu,
        chi,
        lc,
        nguoi: s.userName(p.nguoiDeNghi),
        trangThai: p.trangThai,
        p,
      };
    });
    if (this.gop() && !this.draftOnly() && !thu) {
      for (const c of db.chiPhiHD) {
        if (c.trangThai !== TT.DA_DUYET) continue;
        out.push({
          key: 'C' + c.id,
          so: c.maCP,
          ngay: c.ngay,
          loai: CP_HD,
          nguon: `${s.nguonTen(c.nguonTien)} (CP HĐ)`,
          nguonIds: [c.nguonTien],
          lcp: s.lcpTen(c.loaiChiPhi),
          noiDung: c.noiDung,
          thu: 0,
          chi: c.soTien,
          lc: false,
          nguoi: s.userName(c.nguoiThucHien),
          trangThai: c.trangThai,
          hdbId: c.hdbId,
          c,
        });
      }
    }
    return out.sort((a, b) => (a.ngay === b.ngay ? b.so.localeCompare(a.so) : a.ngay < b.ngay ? 1 : -1));
  });

  protected readonly sx = new Sorter<SqRow>({ so: (r) => r.so, ngay: (r) => r.ngay, loai: (r) => r.loai, nguon: (r) => r.nguon, thu: (r) => r.thu, chi: (r) => r.chi, nguoi: (r) => r.nguoi, tt: (r) => r.trangThai });
  protected readonly rows = computed(() => {
    const l = this.loc();
    return this.sx.apply(this.all().filter(
      (r) =>
        khopThoiGian(l, r.ngay) &&
        khopSel(l, 'loai', r.loai) &&
        khopSel(l, 'tt', r.trangThai) &&
        khopSel(l, 'lcp', r.p?.loaiChiPhi ?? r.c?.loaiChiPhi) &&
        (!(l.sel['nguon']?.length) || r.nguonIds.some((id) => l.sel['nguon'].includes(id))) &&
        khopQ(l, r.so, r.noiDung, r.nguon, r.nguoi, r.lcp, r.p?.nguoiNhan, r.p?.ghiChu),
    ));
  });
  protected readonly pg = paginate(this.rows);

  /** Xoá nhiều: nháp xoá thẳng, còn lại gửi yêu cầu xoá; dòng Chi phí HĐ xoá ở màn Chi phí. Quyền / ràng buộc do Store kiểm. */
  private readonly confirm = inject(Confirm);
  protected readonly cn = new ChonNhieu();
  protected readonly chonDuoc = computed(() => this.store.level('duyetXoa') !== 'none' || this.coTheLap());
  protected xoaDuoc(r: SqRow): boolean {
    return !!r.p && !this.store.dangChoXoa('PhieuThuChi', r.p.id);
  }
  protected readonly idTrang = computed(() => this.pg.items().filter((r) => this.xoaDuoc(r)).map((r) => r.key));
  protected async xoaNhieu(): Promise<void> {
    const ds = this.rows()
      .filter((r) => this.cn.co(r.key) && this.xoaDuoc(r))
      .map((r) => ({ id: r.p!.id, ten: r.so, moTa: `Phiếu ${r.so}`, nhap: r.p!.trangThai === TT.NHAP }));
    const lamXong = await xoaNhieuCoNhap(this.confirm, this.store, 'PhieuThuChi', ds, 'phiếu', (id) => this.store.xoaNhapPhieu(id));
    if (lamXong) this.cn.xoa();
  }
  protected readonly tongThu = computed(() => sum(this.rows().filter((r) => !r.lc), (r) => r.thu));
  protected readonly tongChi = computed(() => sum(this.rows().filter((r) => !r.lc), (r) => r.chi));

  protected mo(p: PhieuThuChi): void {
    this.phieu.set(p);
  }
  protected moRow(r: SqRow): void {
    if (r.p) this.phieu.set(r.p);
    else if (r.c) this.cp.set(r.c);
  }

  protected inChungTu(p: PhieuThuChi): void {
    inPhieuThuChi(p, this.store);
  }

  protected xuat(): void {
    const head = ['Số phiếu', 'Ngày lập', 'Loại phiếu', 'Nguồn tiền', 'Loại chi phí', 'Nội dung', 'Thu', 'Chi', 'Người đề nghị', 'Trạng thái'];
    const body = this.rows().map((r) => [r.so, viDate(r.ngay), r.loai, r.nguon, r.lcp ?? '', r.noiDung, r.thu, r.chi, r.nguoi, ttNhan(r.trangThai)]);
    body.push(['Tổng (không gồm Luân chuyển)', '', '', '', '', '', this.tongThu(), this.tongChi(), '', '']);
    void xuatExcel(this.laTat() ? 'so-quy' : this.laThu() ? 'phieu-thu' : 'phieu-chi', [head, ...body]);
  }
}
