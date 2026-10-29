import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BinhKhi, KHO_CHUYEN_THANG, XUAT_XU_VN } from '../core/models';
import { Store } from '../core/store';
import { nhoLoc } from '../core/ui';
import { todayIso, viDate } from '../core/util';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { Modal } from '../shared/ui-kit';
import { InTemTab, TemKhoiTao } from './in-tem';
import { khoOpts } from './kho-util';

type TinhTrangTem = 'chua' | 'da' | 'khongAD';

const TEM_OPTS = [
  { value: 'chua', label: 'Chưa in' },
  { value: 'da', label: 'Đã in' },
  { value: 'khongAD', label: 'Không áp dụng' },
];

const laVN = (b: BinhKhi) => b.xuatXu.trim().toLowerCase() === XUAT_XU_VN.toLowerCase();
const tinhTrang = (b: BinhKhi): TinhTrangTem => (!laVN(b) ? 'khongAD' : b.soLanIn > 0 ? 'da' : 'chua');
const cong1Nam = (iso: string) => (iso ? `${+iso.slice(0, 4) + 1}${iso.slice(4)}` : '');

interface Form {
  id: string;
  loaiHang: string;
  xuatXu: string;
  ngaySX: string;
  hanSD: string;
  kho: string;
  ghiChu: string;
}

/**
 * Tab "Bình & tem" của Kho (KHO-10): danh sách bình theo số serial + tình trạng in tem.
 * Chỉ bình xuất xứ Việt Nam in tem nội bộ; bình nhập khẩu dùng tem của nhà sản xuất.
 */
@Component({
  selector: 'app-kho-binh-tem',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterBar, Pager, Modal, InTemTab],
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
    .panel ::ng-deep .filters { gap: 10px; margin-bottom: 12px; }
    .panel ::ng-deep .filters .search { height: 40px; border-radius: 999px; background: var(--panel); border: 0; box-shadow: none; max-width: 320px; }
    .panel ::ng-deep .filters .fsel select, .panel ::ng-deep .filters .pick-btn { height: 40px; border-radius: 999px; background: var(--panel); border: 0; font-weight: 600; font-size: 13.5px; padding-inline: 16px; }
    .panel ::ng-deep .filters .f-clear { background: none; border: 0; color: var(--ink-3); font-size: 13px; }

    .chon { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; padding: 10px 14px; margin-bottom: 12px; border-radius: 10px; background: #e2f3e9; font-size: 13px; }
    .btn.pill { border-radius: 999px; min-height: 30px; padding: 2px 14px; font-size: 12.5px; font-weight: 700; background: #0f5a2a; color: #fff; border: 1.5px solid #0f5a2a; }
    .btn.pill.out { background: var(--surf); color: #16642b; }

    .tbl-wrap { border-radius: 0; border: 0; box-shadow: none; overflow: auto; background: none; }
    .tbl { font-size: 12.5px; font-family: var(--font); }
    .tbl thead th { background: var(--panel); font-size: 11.5px; white-space: nowrap; border-radius: 0; }
    .tbl thead th:first-child { border-top-left-radius: 10px; } .tbl thead th:last-child { border-top-right-radius: 10px; }
    .tbl tbody td { padding-block: 10px; vertical-align: top; }
    .tbl td.mute-row { opacity: 0.7; }
    .seri { color: var(--brand); font-weight: 700; }
    .sub2 { display: block; font-size: 11px; color: var(--ink-3); margin-top: 2px; }
    .st { display: inline-block; padding: 1px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap; background: var(--mute-bg); color: var(--mute-fg); }
    .st.ok { background: #dff3e4; color: #17663f; }
    .st.bad { background: #fbe4e1; color: #a3261d; }
    .legend { margin: 8px 0 0; font-size: 11.5px; color: var(--ink-3); }
    .luoi { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 14px; }
    .luoi .wide { grid-column: 1 / -1; }
    @media (max-width: 560px) { .luoi { grid-template-columns: minmax(0, 1fr); } }
  `,
  template: `
    @if (khoiTao(); as k) {
      <app-kho-in-tem [khoiTao]="k" (quayLai)="khoiTao.set(null)" (daIn)="xongIn()" />
    } @else {
      <div class="kpis">
        <div class="k hero"><span class="l">Bình theo dõi serial</span><b class="v">{{ kpi().tong }}</b><span class="s">{{ kpi().soKho }} kho · cả bình đầy và vỏ</span></div>
        <div class="k"><span class="l">Cần in tem</span><b class="v">{{ kpi().canIn }}</b><span class="s">xuất xứ Việt Nam, chưa in</span></div>
        <div class="k"><span class="l">Đã in tháng {{ thangNay }}</span><b class="v">{{ kpi().daInThang }}</b><span class="s">{{ kpi().inLai }} lần in lại</span></div>
        <div class="k"><span class="l">Không áp dụng</span><b class="v">{{ kpi().khongAD }}</b><span class="s">bình nhập khẩu · dùng tem NSX</span></div>
      </div>

      <section class="panel">
        <div class="head">
          <h3>Bình theo số serial</h3>
          @if (store.canEdit('khoPhieuTay')) { <button type="button" class="btn sm" (click)="moThem()">+ Thêm bình</button> }
        </div>

        <app-filter [(loc)]="loc" memo="kho-binh-tem" [time]="false" [facets]="facets()" placeholder="Tìm số serial, mã hàng…" />

        @if (daChon().length) {
          <div class="chon">
            <span><b>Đã chọn {{ daChon().length }} bình</b> · cùng mã {{ maDangChon() }}</span>
            <button type="button" class="btn pill" (click)="inChon()">In tem ({{ daChon().length }})</button>
          </div>
        }

        <div class="tbl-wrap">
          <table class="tbl freeze">
            <thead><tr><th style="width:32px"></th><th>Số serial · mã hàng</th><th>Xuất xứ</th><th>Ngày SX · HSD</th><th>Kho</th><th>Tem</th><th></th></tr></thead>
            <tbody>
              @for (b of pg.items(); track b.id) {
                @let tt = tinhTrang(b);
                <tr>
                  <td>
                    @if (tt !== 'khongAD') {
                      <input type="checkbox" [attr.aria-label]="'Chọn ' + b.id" [checked]="daChon().includes(b.id)" [disabled]="!chonDuoc(b)" [title]="chonDuoc(b) ? '' : 'Chỉ chọn cùng một mã hàng'" (change)="lat(b.id)" />
                    } @else { <input type="checkbox" disabled aria-label="Không áp dụng" /> }
                  </td>
                  <td>
                    <span class="seri">{{ b.id }}</span>
                    <span class="sub2">{{ b.loaiHang }} · {{ moTa(b.loaiHang) }}</span>
                  </td>
                  <td [class.mute-row]="tt === 'khongAD'"><b>{{ b.xuatXu }}</b></td>
                  <td>{{ viDate(b.ngaySX) }}<span class="sub2">HSD {{ viDate(b.hanSD) }}</span></td>
                  <td>{{ store.khoTen(b.kho) }}</td>
                  <td>
                    @switch (tt) {
                      @case ('chua') { <span class="st bad">Chưa in</span> }
                      @case ('da') {
                        <span class="st ok">Đã in{{ b.soLanIn > 1 ? ' ' + b.soLanIn + ' lần' : '' }}</span>
                        <span class="sub2">{{ b.soLanIn > 1 ? 'lần cuối ' : '' }}{{ ngayNgan(b.lanInCuoi) }}{{ b.soLanIn === 1 && b.nguoiIn ? ' · ' + store.userName(b.nguoiIn) : '' }}</span>
                      }
                      @default { <span class="st">Không áp dụng</span><span class="sub2">tem nhà sản xuất</span> }
                    }
                  </td>
                  <td>
                    @if (tt === 'chua') { <button type="button" class="btn pill" (click)="inMot(b)">In tem</button> }
                    @else if (tt === 'da') { <button type="button" class="btn pill out" (click)="inMot(b)">In lại</button> }
                    @else { <span class="sub2">—</span> }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="empty">{{ all().length ? 'Không có bình nào khớp bộ lọc' : 'Chưa có bình nào — bấm "Thêm bình" để khai báo số serial' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <p class="legend">Nút In tem chỉ hiện với bình xuất xứ Việt Nam, mở màn In tem bình khí với số serial và xuất xứ điền sẵn. Bình nhập khẩu dùng tem của nhà sản xuất.</p>
        <app-pager [pager]="pg" />
      </section>

      <app-modal [open]="them()" title="Thêm bình khí" sub="Khai báo số serial" (closed)="them.set(false)">
        <div class="luoi">
          <div class="field"><label for="bk-id">Số serial <span class="req">*</span></label><input id="bk-id" autocomplete="off" [value]="f().id" (input)="sua({ id: val($event) })" /></div>
          <div class="field">
            <label for="bk-lh">Mã hàng <span class="req">*</span></label>
            <select id="bk-lh" (change)="sua({ loaiHang: val($event) })">
              <option value="" [selected]="!f().loaiHang">— Chọn mã hàng —</option>
              @for (l of loaiHangDung(); track l.id) { <option [value]="l.id" [selected]="l.id === f().loaiHang">{{ l.id }} — {{ l.ten }}</option> }
            </select>
          </div>
          <div class="field"><label for="bk-xx">Xuất xứ <span class="req">*</span></label><input id="bk-xx" list="bk-xx-ds" [value]="f().xuatXu" (input)="sua({ xuatXu: val($event) })" /><datalist id="bk-xx-ds"><option value="Việt Nam"></option><option value="Trung Quốc"></option><option value="Ấn Độ"></option></datalist></div>
          <div class="field">
            <label for="bk-kho">Kho <span class="req">*</span></label>
            <select id="bk-kho" (change)="sua({ kho: val($event) })">
              @for (k of khoDung(); track k.id) { <option [value]="k.id" [selected]="k.id === f().kho">{{ k.ten }}</option> }
            </select>
          </div>
          <div class="field"><label for="bk-nsx">Ngày sản xuất <span class="req">*</span></label><input id="bk-nsx" type="date" [value]="f().ngaySX" (input)="doiNsx(val($event))" /></div>
          <div class="field"><label for="bk-hsd">Hạn sử dụng <span class="req">*</span></label><input id="bk-hsd" type="date" [value]="f().hanSD" (input)="sua({ hanSD: val($event) })" /></div>
          <div class="field wide"><label for="bk-gc">Ghi chú</label><input id="bk-gc" [value]="f().ghiChu" (input)="sua({ ghiChu: val($event) })" /></div>
        </div>
        <div foot class="btn-row">
          <button type="button" class="btn quiet" (click)="them.set(false)">Huỷ</button>
          <button type="button" class="btn" (click)="luu()">Lưu bình</button>
        </div>
      </app-modal>
    }
  `,
})
export class BinhTemTab {
  protected readonly store = inject(Store);
  protected readonly viDate = viDate;
  protected readonly tinhTrang = tinhTrang;
  protected readonly thangNay = new Date().getMonth() + 1;
  protected readonly loc = signal<Loc>(nhoLoc('kho-binh-tem', LOC_RONG));
  protected readonly daChon = signal<string[]>([]);
  protected readonly khoiTao = signal<TemKhoiTao | null>(null);
  protected readonly them = signal(false);
  protected readonly f = signal<Form>(this.trong());
  private hsdTaySua = false;

  private trong(): Form {
    const ngay = todayIso();
    return { id: '', loaiHang: '', xuatXu: XUAT_XU_VN, ngaySX: ngay, hanSD: cong1Nam(ngay), kho: this.store.khoDangDung().find((k) => k.id !== KHO_CHUYEN_THANG)?.id ?? '', ghiChu: '' };
  }

  /** Chưa in lên trước, rồi theo ngày sản xuất mới nhất. */
  protected readonly all = computed(() =>
    [...this.store.binhKhi()].sort((a, b) => Number(tinhTrang(b) === 'chua') - Number(tinhTrang(a) === 'chua') || b.ngaySX.localeCompare(a.ngaySX) || a.id.localeCompare(b.id)),
  );
  protected readonly facets = computed<Facet[]>(() => [
    { key: 'xx', label: 'Xuất xứ', options: [...new Set(this.store.binhKhi().map((b) => b.xuatXu))].sort().map((x) => ({ value: x, label: x })) },
    { key: 'tem', label: 'Tem', options: TEM_OPTS },
    { key: 'kho', label: 'Kho', options: khoOpts(this.store.db(), false) },
  ]);
  protected readonly rows = computed(() => {
    const l = this.loc();
    return this.all().filter(
      (b) =>
        khopQ(l, b.id, b.loaiHang, this.store.loaiHangTen(b.loaiHang), this.moTa(b.loaiHang)) &&
        khopSel(l, 'xx', b.xuatXu) &&
        khopSel(l, 'tem', tinhTrang(b)) &&
        khopSel(l, 'kho', b.kho),
    );
  });
  protected readonly pg = paginate(this.rows);

  protected readonly kpi = computed(() => {
    const bs = this.store.binhKhi();
    const thang = todayIso().slice(0, 7);
    const trongThang = bs.filter((b) => b.lanInCuoi?.startsWith(thang));
    return {
      tong: bs.length,
      soKho: new Set(bs.map((b) => b.kho)).size,
      canIn: bs.filter((b) => tinhTrang(b) === 'chua').length,
      daInThang: trongThang.length,
      inLai: trongThang.filter((b) => b.soLanIn > 1).length,
      khongAD: bs.filter((b) => tinhTrang(b) === 'khongAD').length,
    };
  });

  protected moTa(id: string): string {
    const l = this.store.loaiHangById(id);
    return l ? [l.moTa || l.ten, l.dvt].filter(Boolean).join(' · ') : '';
  }
  protected ngayNgan(iso?: string): string {
    return iso ? viDate(iso).slice(0, 5) : '';
  }

  // ── Chọn nhiều bình (cùng mã hàng) ──
  protected readonly maDangChon = computed(() => this.store.binhKhi().find((b) => b.id === this.daChon()[0])?.loaiHang ?? '');
  protected chonDuoc(b: BinhKhi): boolean {
    return !this.daChon().length || this.maDangChon() === b.loaiHang;
  }
  protected lat(id: string): void {
    this.daChon.update((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  }

  // ── In tem ──
  private moIn(bs: BinhKhi[]): void {
    const b = bs[0];
    this.khoiTao.set({ soSeris: bs.map((x) => x.id), xuatXu: b.xuatXu, ngaySX: b.ngaySX, hanSD: b.hanSD, loai: this.store.loaiHangById(b.loaiHang)?.theTich ?? '' });
  }
  protected inMot(b: BinhKhi): void {
    this.moIn([b]);
  }
  protected inChon(): void {
    const bs = this.store.binhKhi().filter((b) => this.daChon().includes(b.id));
    if (bs.length) this.moIn(bs);
  }
  protected xongIn(): void {
    this.daChon.set([]);
    this.khoiTao.set(null);
  }

  // ── Thêm bình ──
  protected readonly loaiHangDung = computed(() => this.store.loaiHang().filter((l) => l.dangDung));
  protected readonly khoDung = computed(() => this.store.khoDangDung().filter((k) => k.id !== KHO_CHUYEN_THANG));
  protected val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }
  protected moThem(): void {
    this.hsdTaySua = false;
    this.f.set(this.trong());
    this.them.set(true);
  }
  protected sua(p: Partial<Form>): void {
    if (p.hanSD !== undefined) this.hsdTaySua = true;
    this.f.update((v) => ({ ...v, ...p }));
  }
  protected doiNsx(nsx: string): void {
    this.f.update((v) => ({ ...v, ngaySX: nsx, hanSD: this.hsdTaySua ? v.hanSD : cong1Nam(nsx) }));
  }
  protected luu(): void {
    const v = this.f();
    const e = this.store.themBinhKhi({ id: v.id, loaiHang: v.loaiHang, xuatXu: v.xuatXu, ngaySX: v.ngaySX, hanSD: v.hanSD, kho: v.kho, soLanIn: 0, ghiChu: v.ghiChu });
    if (e) return this.store.say(e, 'bad');
    this.store.say(`Đã thêm bình ${v.id.trim().toUpperCase()}`);
    this.them.set(false);
  }
}
