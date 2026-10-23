import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { dirtyOf } from '../shared/unsaved';
import { nhoLoc } from '../core/ui';
import { PtCalc, ptCalc, soDuQuyPT } from '../core/calc';
import { DongTienPT, HopDongPhuTai, TRANG_THAI_PT } from '../core/models';
import { money, pct, todayIso, viDate, vndShort } from '../core/util';
import { FilterBar, Facet, LOC_RONG, Loc, khopQ, khopSel, khopThoiGian } from '../shared/filter-bar';
import { Kpi, Modal, MoneyInput, Pick, PickOption, TrangThai } from '../shared/ui-kit';
import { Pager, paginate } from '../shared/pager';
import { Confirm } from '../shared/confirm';
import { guiXoa, guiXoaNhieu } from '../shared/ho-so';
import { ChonNhieu } from '../shared/chon-nhieu';
import { ChonBar } from '../shared/chon-bar';
import { SortTh, Sorter } from '../shared/sort';

type TabL = 'hd' | 'dong-tien';

interface DongSo extends DongTienPT {
  luyKe: number;
}

interface FormDT {
  ngay: string;
  chieu: DongTienPT['chieu'];
  hdptId: string;
  soTien: number;
  ghiChu: string;
}

const formRong = (): FormDT => ({ ngay: todayIso(), chieu: 'Thu về PT', hdptId: '', soTien: 0, ghiChu: '' });

/** PT-01 · PT-09 · PT-10 — Danh sách HĐ Phú Tài và Sổ dòng tiền quỹ ảo. */
@Component({
  selector: 'app-pt-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [ChonBar, RouterLink, FilterBar, Kpi, Modal, MoneyInput, Pick, TrangThai, Pager, SortTh],
  template: `
    <div class="page-head">
      <div>
        <div class="crumbs"><a routerLink="/">Trang chủ</a> › Phú Tài</div>
        <h1>Phú Tài <span class="tag pt">Module riêng</span></h1>
      </div>
      <div class="actions">
        @if (tab() === 'hd' && store.canEdit('phuTai')) {
          <a class="btn" routerLink="/phu-tai/moi">+ Tạo HĐ Phú Tài</a>
        }
        @if (tab() === 'dong-tien' && store.canEdit('phuTai')) {
          <button type="button" class="btn" (click)="moForm()">+ Thêm dòng điều chỉnh</button>
        }
      </div>
    </div>

    <div class="note info" style="margin-bottom:12px">
      <span class="tag pt">PT</span>
      <span>Module riêng — không đụng quỹ, kho, công nợ của Oxy. Phú Tài là bên xuất hoá đơn cho khách cuối.</span>
    </div>

    <div class="tabs" role="tablist">
      <button type="button" role="tab" [class.on]="tab() === 'hd'" (click)="setTab('hd')">Hợp đồng</button>
      <button type="button" role="tab" [class.on]="tab() === 'dong-tien'" (click)="setTab('dong-tien')">Sổ dòng tiền quỹ ảo</button>
    </div>

    @if (tab() === 'hd') {
      <div class="kpis">
        <app-kpi label="Số HĐ" [value]="'' + kpi().so" sub="theo bộ lọc" />
        <app-kpi label="Tổng giá bán (trước VAT)" [value]="vndShort(kpi().giaBan)" sub="không tính HĐ Huỷ" />
        <app-kpi label="Tổng Oxy được hưởng (gộp)" sub="trước hoa hồng — cột LN thực Oxy là sau hoa hồng" [value]="vndShort(kpi().oxyGop)" [tone]="kpi().oxyGop < 0 ? 'bad' : 'ok'" />
        <app-kpi label="Số dư quỹ ảo Phú Tài" [value]="vndShort(quy().soDu)" [sub]="'Thu ' + money(quy().thu) + ' · Chi ' + money(quy().chi)" />
      </div>
      <app-filter [(loc)]="loc" memo="pt-list" [facets]="facets()" />
      <app-chon-bar [cn]="cn" ten="HĐ Phú Tài" (xoa)="xoaNhieu()" />
        <div class="tbl-wrap">
        <table class="tbl freeze">
          <thead>
            <tr>
              @if (chonDuoc()) { <th style="width:36px"><input type="checkbox" aria-label="Chọn cả trang" [checked]="cn.du(idTrang())" (change)="cn.chonTat(idTrang(), $any($event.target).checked)" /></th> }
              <th app-sort-th [sx]="sx" k="soHD">Số HĐ</th><th app-sort-th [sx]="sx" k="kh">Khách hàng cuối</th><th app-sort-th [sx]="sx" k="ngay">Ngày ký</th>
              <th app-sort-th [sx]="sx" k="giaBan" class="num">Giá bán trước VAT</th><th app-sort-th [sx]="sx" k="dauVao" class="num">Giá đầu vào</th>
              <th app-sort-th [sx]="sx" k="lnTruoc" class="num">LN trước thuế</th><th app-sort-th [sx]="sx" k="lnThuc" class="num" title="Oxy được hưởng (gộp) − Hoa hồng">LN thực Oxy (sau hoa hồng)</th>
              <th app-sort-th [sx]="sx" k="khTra" class="num">KH đã trả PT</th><th app-sort-th [sx]="sx" k="tt">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            @for (r of pg.items(); track r.p.id) {
              <tr class="click" (click)="mo(r.p.id)">
              @if (chonDuoc()) {
                <td (click)="$event.stopPropagation()">@if (xoaDuoc(r.p)) { <input type="checkbox" [attr.aria-label]="'Chọn ' + r.p.soHD" [checked]="cn.co(r.p.id)" (change)="cn.flip(r.p.id)" /> }</td>
              }
                <td>
                  <a [routerLink]="['/phu-tai', r.p.id]" (click)="$event.stopPropagation()"><b>{{ r.p.soHD }}</b></a>
                  @if (r.p.import) { <app-tt v="Import" /> }
                </td>
                <td>{{ r.p.tenKH }}<div class="sub">{{ r.p.mst }}</div></td>
                <td>{{ viDate(r.p.ngayKy) }}</td>
                <td class="num">{{ money(r.p.truocVAT) }}</td>
                <td class="num">{{ money(r.c.giaDauVao) }}</td>
                <td class="num" [class.neg]="r.c.lnTruoc < 0">{{ money(r.c.lnTruoc) }}</td>
                <td class="num" [class.neg]="r.c.lnThuc < 0"><b>{{ money(r.c.lnThuc) }}</b></td>
                <td class="num">{{ money(r.c.khDaTra) }}<div class="sub">{{ pct(r.c.pctKH) }}</div></td>
                <td>
                  @if (store.dangChoXoa('HopDongPhuTai', r.p.id)) { <app-tt v="Chờ xoá" /> } @else { <app-tt [v]="r.p.trangThai" /> }
                </td>
              </tr>
            } @empty {
              <tr><td [attr.colspan]="chonDuoc() ? 10 : 9" class="empty muted">Chưa có HĐ Phú Tài nào khớp bộ lọc</td></tr>
            }
          </tbody>
          @if (rows().length) {
            <tfoot>
              <tr>
                <th colspan="3">Tổng ({{ rows().length }} HĐ)</th>
                <td class="num">{{ money(tong().giaBan) }}</td>
                <td class="num">{{ money(tong().dauVao) }}</td>
                <td class="num">{{ money(tong().lnTruoc) }}</td>
                <td class="num">{{ money(tong().lnThuc) }}</td>
                <td class="num">{{ money(tong().khTra) }}</td>
                <td></td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
      <app-pager [pager]="pg" />
    } @else {
      <div class="note info" style="margin-bottom:12px">
        <b>Thu về PT</b> = tiền Oxy chuyển cho Phú Tài — tự sinh từ dòng "Oxy chuyển PT" ở Tab 5 của HĐ (chỉ sửa ở nguồn).
        <b>Chi từ PT</b> = tiền Phú Tài chuyển trả Oxy (phần Oxy được hưởng) — nhập tay, gắn HĐ; đủ phần Oxy được hưởng (gộp) mới tất toán được HĐ.
        Sổ này độc lập với Nguồn tiền Oxy.
      </div>
      <div class="kpis">
        <app-kpi label="Toàn quỹ — Thu về PT" [value]="vndShort(quy().thu)" [sub]="denNgay() ? 'tới ' + viDate(denNgay()) : 'tới hiện tại'" />
        <app-kpi label="Toàn quỹ — Chi từ PT" [value]="vndShort(quy().chi)" />
        <app-kpi label="Toàn quỹ — Số dư" [value]="vndShort(quy().soDu)" [tone]="quy().soDu < 0 ? 'bad' : 'ok'" />
        @if (quyHD(); as q) {
          <app-kpi label="HĐ đã chọn — Thu / Chi" [value]="vndShort(q.thu) + ' / ' + vndShort(q.chi)" [sub]="q.ten" />
          <app-kpi label="HĐ đã chọn — Số dư" [value]="vndShort(q.soDu)" [tone]="q.soDu < 0 ? 'bad' : 'ok'" [sub]="q.ten" />
        }
      </div>
      <app-filter [(loc)]="locDT" memo="pt-dong-tien" [facets]="facetsDT()" placeholder="Tìm mã GD, ghi chú, số HĐ…">
        <label class="check-row">Số dư tới ngày
          <input type="date" [value]="denNgay()" (input)="denNgay.set($any($event.target).value)" aria-label="Số dư tới ngày" />
        </label>
      </app-filter>
      <div class="tbl-wrap">
        <table class="tbl freeze">
          <thead>
            <tr>
              <th>Mã GD</th><th>Ngày</th><th>Chiều</th><th>HĐ liên quan</th>
              <th class="num">Số tiền</th><th class="num">Số dư luỹ kế</th><th>Nguồn phát sinh</th><th>Ghi chú</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (d of pgDT.items(); track d.id) {
              <tr>
                <td><code>{{ d.id }}</code></td>
                <td>{{ viDate(d.ngay) }}</td>
                <td><span class="tag" [class.ok]="d.chieu === 'Thu về PT'" [class.warn]="d.chieu === 'Chi từ PT'">{{ d.chieu }}</span></td>
                <td>
                  @if (d.hdptId) { <a [routerLink]="['/phu-tai', d.hdptId]" [queryParams]="{ tab: 5 }">{{ soHD(d.hdptId) }}</a> } @else { <span class="muted">—</span> }
                </td>
                <td class="num" [class.neg]="d.chieu === 'Chi từ PT'">{{ d.chieu === 'Chi từ PT' ? '−' : '' }}{{ money(d.soTien) }}</td>
                <td class="num" [class.neg]="d.luyKe < 0"><b>{{ money(d.luyKe) }}</b></td>
                <td>
                  @if (d.nguon === 'Tự động') { <span class="tag pt" title="Sinh từ Tab 5 — chỉ sửa ở nguồn">Tự động</span> } @else { <span class="tag mute">Nhập tay</span> }
                  @if (store.dangChoXoa('DongTienPhuTai', d.id)) { <app-tt v="Chờ xoá" /> }
                </td>
                <td>{{ d.ghiChu }}</td>
                <td>
                  @if (d.nguon === 'Nhập tay' && store.canEdit('phuTai') && !store.dangChoXoa('DongTienPhuTai', d.id)) {
                    <button type="button" class="btn sm quiet danger" (click)="xoaDong(d)">Xoá</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty muted">{{ store.dongTienPT().length ? 'Chưa có dòng tiền nào khớp bộ lọc' : 'Chưa có dòng tiền nào' }}</td></tr>
            }
          </tbody>
          @if (soRows().length) {
            <tfoot>
              <tr>
                <th colspan="4">Theo bộ lọc: Thu {{ money(tongDT().thu) }} · Chi {{ money(tongDT().chi) }}</th>
                <td class="num">{{ money(tongDT().thu - tongDT().chi) }}</td>
                <td colspan="4"></td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
      <app-pager [pager]="pgDT" />
      <p class="sub">Cột "Số dư luỹ kế" tính theo thứ tự ngày trên toàn bộ dòng của (các) HĐ đang lọc — không phụ thuộc bộ lọc thời gian.</p>
    }

    <app-modal #mDong [open]="form() !== null" title="Thêm dòng điều chỉnh quỹ ảo" sub="Dòng nhập tay — bắt buộc lý do" size="sm" [dirty]="dirtyForm()" (closed)="form.set(null)">
      @if (form(); as fm) {
        <div class="form-grid">
          <div class="field">
            <label for="dt-ngay">Ngày <span class="req">*</span></label>
            <input id="dt-ngay" type="date" [value]="fm.ngay" (input)="setF('ngay', $any($event.target).value)" />
          </div>
          <div class="field">
            <label for="dt-chieu">Chiều</label>
            <select id="dt-chieu" (change)="setF('chieu', $any($event.target).value)">
              <option value="Thu về PT" [selected]="fm.chieu === 'Thu về PT'">Thu về PT</option>
              <option value="Chi từ PT" [selected]="fm.chieu === 'Chi từ PT'">Chi từ PT</option>
            </select>
          </div>
          <div class="field wide">
            <span class="lbl">HĐ Phú Tài liên quan (tuỳ chọn)</span>
            <app-pick [options]="hdOptsTay()" [value]="fm.hdptId" [allowEmpty]="true" placeholder="— Không gắn HĐ —" (valueChange)="setF('hdptId', $event)" />
          </div>
          <div class="field wide">
            <label for="dt-tien">Số tiền (VNĐ) <span class="req">*</span></label>
            <app-money inputId="dt-tien" [value]="fm.soTien" (valueChange)="setF('soTien', $event)" />
          </div>
          <div class="field full">
            <label for="dt-lydo">Lý do <span class="req">*</span></label>
            <textarea id="dt-lydo" rows="3" [value]="fm.ghiChu" (input)="setF('ghiChu', $any($event.target).value)"></textarea>
          </div>
        </div>
        @if (loiForm()) { <div class="note bad" style="margin-top:10px">{{ loiForm() }}</div> }
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="form.set(null)">Huỷ</button>
        <button type="button" class="btn" (click)="luuDong()">Thêm dòng</button>
      </div>
    </app-modal>
  `,
})
export class PtList {
  private readonly mDong = viewChild<Modal>('mDong');
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  protected readonly ttNhan = ttNhan;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);

  protected readonly money = money;
  protected readonly pct = pct;
  protected readonly viDate = viDate;
  protected readonly vndShort = vndShort;

  protected readonly tab = toSignal(
    this.route.queryParamMap.pipe(map((q): TabL => (q.get('tab') === 'dong-tien' ? 'dong-tien' : 'hd'))),
    { initialValue: 'hd' as TabL },
  );

  // ── Tab Hợp đồng ──
  protected readonly loc = signal<Loc>(nhoLoc('pt-list', LOC_RONG));
  protected readonly facets = computed<Facet[]>(() => [
    { key: 'tt', label: 'Trạng thái', options: TRANG_THAI_PT.map((t) => ({ value: t, label: ttNhan(t) })) },
  ]);
  protected readonly sx = new Sorter<{ p: HopDongPhuTai; c: PtCalc }>({
    soHD: (r) => r.p.soHD,
    kh: (r) => r.p.tenKH,
    ngay: (r) => r.p.ngayKy,
    giaBan: (r) => r.p.truocVAT,
    dauVao: (r) => r.c.giaDauVao,
    lnTruoc: (r) => r.c.lnTruoc,
    lnThuc: (r) => r.c.lnThuc,
    khTra: (r) => r.c.khDaTra,
    tt: (r) => TRANG_THAI_PT.indexOf(r.p.trangThai),
  });
  protected readonly rows = computed(() => {
    const db = this.store.db();
    const l = this.loc();
    const list = db.hopDongPhuTai
      // Tìm cả theo số HĐ mua / NCC đầu vào (05 §3.1).
      .filter((p) => khopQ(l, p.soHD, p.tenKH, p.mst, p.ghiChu, ...p.hdMua.flatMap((id) => { const m = this.store.hdmById(id); return m ? [m.soHD, m.tenNCC] : []; })) && khopThoiGian(l, p.ngayKy) && khopSel(l, 'tt', p.trangThai))
      .map((p) => ({ p, c: ptCalc(p, db) }))
      .sort((a, b) => ((a.p.ngayKy ?? a.p.taoLuc) < (b.p.ngayKy ?? b.p.taoLuc) ? 1 : -1));
    return this.sx.apply(list);
  });
  protected readonly pg = paginate(this.rows);

  /** Xoá nhiều HĐ Phú Tài: quyền sửa Phú Tài + gửi được yêu cầu xoá; bỏ HĐ đang chờ xoá. */
  protected readonly cn = new ChonNhieu();
  protected readonly chonDuoc = computed(() => this.store.canEdit('phuTai') && this.store.level('duyetXoa') !== 'none');
  protected xoaDuoc(p: { id: string }): boolean {
    return !this.store.dangChoXoa('HopDongPhuTai', p.id);
  }
  protected readonly idTrang = computed(() => this.pg.items().filter((r) => this.xoaDuoc(r.p)).map((r) => r.p.id));
  protected async xoaNhieu(): Promise<void> {
    const ds = this.rows().filter((r) => this.cn.co(r.p.id) && this.xoaDuoc(r.p)).map((r) => ({ id: r.p.id, ten: r.p.soHD, moTa: `HĐ Phú Tài ${r.p.soHD}` }));
    if (await guiXoaNhieu(this.confirm, this.store, 'HopDongPhuTai', ds, 'HĐ Phú Tài')) this.cn.xoa();
  }
  protected readonly kpi = computed(() => {
    const hl = this.rows().filter((r) => r.p.trangThai !== TT.HUY);
    let giaBan = 0;
    let oxyGop = 0;
    for (const r of hl) {
      giaBan += r.p.truocVAT;
      oxyGop += r.c.oxyGop;
    }
    return { so: this.rows().length, giaBan, oxyGop };
  });
  protected readonly tong = computed(() => {
    const t = { giaBan: 0, dauVao: 0, lnTruoc: 0, lnThuc: 0, khTra: 0 };
    for (const r of this.rows()) {
      t.giaBan += r.p.truocVAT;
      t.dauVao += r.c.giaDauVao;
      t.lnTruoc += r.c.lnTruoc;
      t.lnThuc += r.c.lnThuc;
      t.khTra += r.c.khDaTra;
    }
    return t;
  });

  // ── Tab Sổ dòng tiền ──
  protected readonly locDT = signal<Loc>(nhoLoc('pt-dong-tien', LOC_RONG));
  protected readonly denNgay = signal('');
  protected readonly hdOpts = computed<PickOption[]>(() =>
    this.store.hopDongPhuTai().map((p) => ({ value: p.id, label: p.soHD, hint: p.tenKH })),
  );
  /** Dòng nhập tay chỉ gắn được vào HĐ chưa khoá (không đổi số liệu HĐ đã tất toán / huỷ). */
  protected readonly hdOptsTay = computed<PickOption[]>(() =>
    this.store.hopDongPhuTai().filter((p) => !this.store.ptKhoa(p)).map((p) => ({ value: p.id, label: p.soHD, hint: p.tenKH })),
  );
  protected readonly facetsDT = computed<Facet[]>(() => [
    { key: 'hd', label: 'HĐ', options: this.hdOpts() },
    { key: 'chieu', label: 'Chiều', options: ['Thu về PT', 'Chi từ PT'].map((v) => ({ value: v, label: v })) },
    { key: 'nguon', label: 'Nguồn phát sinh', options: ['Tự động', 'Nhập tay'].map((v) => ({ value: v, label: v })) },
  ]);
  /** Sắp theo ngày, tính luỹ kế trên phạm vi HĐ đang lọc, rồi mới lọc thời gian / tìm kiếm. */
  protected readonly soRows = computed<DongSo[]>(() => {
    const l = this.locDT();
    const all = this.store
      .dongTienPT()
      .filter((d) => khopSel(l, 'hd', d.hdptId))
      .sort((a, b) => (a.ngay === b.ngay ? (a.id < b.id ? -1 : 1) : a.ngay < b.ngay ? -1 : 1));
    let s = 0;
    const out: DongSo[] = [];
    for (const d of all) {
      s += d.chieu === 'Thu về PT' ? d.soTien : -d.soTien;
      if (
        khopThoiGian(l, d.ngay) &&
        khopSel(l, 'chieu', d.chieu) &&
        khopSel(l, 'nguon', d.nguon) &&
        khopQ(l, d.id, d.ghiChu, this.soHD(d.hdptId))
      )
        out.push({ ...d, luyKe: s });
    }
    return out;
  });
  protected readonly pgDT = paginate(this.soRows);
  protected readonly tongDT = computed(() => {
    let thu = 0;
    let chi = 0;
    for (const d of this.soRows()) {
      if (d.chieu === 'Thu về PT') thu += d.soTien;
      else chi += d.soTien;
    }
    return { thu, chi };
  });
  protected readonly quy = computed(() => soDuQuyPT(this.store.db(), { denNgay: this.denNgay() || undefined }));
  protected readonly quyHD = computed(() => {
    const ids = this.locDT().sel['hd'] ?? [];
    if (!ids.length) return null;
    const db = this.store.db();
    const out = { thu: 0, chi: 0, soDu: 0, ten: ids.map((id) => this.soHD(id)).join(', ') };
    for (const id of ids) {
      const q = soDuQuyPT(db, { hdptId: id, denNgay: this.denNgay() || undefined });
      out.thu += q.thu;
      out.chi += q.chi;
      out.soDu += q.soDu;
    }
    return out;
  });

  protected readonly form = signal<FormDT | null>(null);
  protected readonly dirtyForm = dirtyOf(this.form);
  protected readonly loiForm = signal('');

  constructor() {
    // Liên kết sâu từ chi tiết HĐ: ?tab=dong-tien&hd=<id> lọc sẵn sổ quỹ ảo theo HĐ đó.
    const hd = this.route.snapshot.queryParamMap.get('hd');
    if (hd && this.store.ptById(hd)) {
      this.locDT.update((l) => ({ ...l, sel: { ...l.sel, hd: [hd] } }));
      void this.router.navigate([], { relativeTo: this.route, queryParams: { hd: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }

  protected soHD(id?: string): string {
    return id ? (this.store.ptById(id)?.soHD ?? id) : '';
  }

  protected setTab(t: TabL): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected mo(id: string): void {
    void this.router.navigate(['/phu-tai', id]);
  }

  protected moForm(): void {
    const hd = this.locDT().sel['hd'] ?? [];
    this.loiForm.set('');
    const p = hd.length === 1 ? this.store.ptById(hd[0]) : undefined;
    this.form.set({ ...formRong(), hdptId: p && !this.store.ptKhoa(p) ? p.id : '' });
  }

  protected setF<K extends keyof FormDT>(k: K, v: FormDT[K]): void {
    this.form.update((f) => (f ? { ...f, [k]: v } : f));
  }

  protected luuDong(): void {
    if (this.mDong()?.kt.hopLe() === false) return;
    const f = this.form();
    if (!f) return;
    const err = this.store.themDongTienTay({
      ngay: f.ngay,
      chieu: f.chieu,
      hdptId: f.hdptId || undefined,
      soTien: f.soTien,
      ghiChu: f.ghiChu.trim(),
    });
    if (err) {
      this.loiForm.set(err);
      return;
    }
    this.form.set(null);
    this.store.say('Đã thêm dòng điều chỉnh');
  }

  protected async xoaDong(d: DongTienPT): Promise<void> {
    await guiXoa(this.confirm, this.store, 'DongTienPhuTai', d.id, `Dòng quỹ ảo ${d.id} (${money(d.soTien)} đ)`);
  }
}
