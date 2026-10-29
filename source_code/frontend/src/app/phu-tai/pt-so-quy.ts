import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { api } from '../core/api';
import { MoneyInput } from '../shared/ui-kit';
import { money, todayIso, viDate } from '../core/util';
import { ptTai } from './pt-api';
import { PT_STYLES } from './pt-ui';

interface Ref {
  id: string;
  soHD: string;
  ten: string;
}
interface QuyRow {
  id: string;
  ngay: string;
  loai: string;
  hdbId: string | null;
  soHD: string | null;
  tenKH: string | null;
  noiDung: string;
  thu: number;
  chi: number;
  tonQuy: number;
  tep: string | null;
  nhapTay: boolean;
}
interface TheoHd {
  hdbId: string;
  soHD: string;
  tenKH: string;
  khTra: number;
  traNcc: number;
  chiPhi: number;
  chuyenOxy: number;
  conTrongQuy: number;
}
interface QuyDto {
  canDoi: { tuNgay: string | null; denNgay: string; dauKy: number; khTra: number; traNcc: number; chiPhi: number; chuyenOxy: number; cuoiKy: number };
  rows: QuyRow[];
  theoHd: TheoHd[];
  dem: Record<string, number>;
  hdOpts: Ref[];
}

type Loc = 'all' | 'Thu KH' | 'Trả NCC' | 'Chi phí' | 'Chuyển OXY';
const LOAI_CHIP: Record<string, string> = { 'Thu KH': 'ok', 'Trả NCC': 'info', 'Chi phí': 'warn', 'Chuyển OXY': 'pt', 'Số dư đầu kỳ': '' };

/** Tab 4 · Sổ quỹ Phú Tài — số liệu do backend tính (GET /phu-tai/so-quy); dòng nhập tay ghi qua POST /phu-tai/so-quy. */
@Component({
  selector: 'app-pt-so-quy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MoneyInput],
  template: `
    <div class="banner"><span class="tg">PT</span><span>Quỹ riêng của Phú Tài: tiền khách trả về đây, Phú Tài tự chi. Không liên quan quỹ OXY — OXY chỉ nhận khi Phú Tài chuyển phần quyền lợi.</span></div>
    <div class="flow" aria-label="Luồng tiền">
      <span class="f f1">Khách hàng trả</span>›<span class="f f2">Quỹ Phú Tài</span>›<span class="f f3">Trả NCC · chi phí</span>›<span class="f f2">Chuyển quyền lợi</span>›<span class="f f1">Quỹ OXY (phiếu thu)</span>
      <span class="u">OXY chỉ ghi sổ ở bước cuối</span>
    </div>

    @if (loi()) { <div class="note bad" role="alert">{{ loi() }} <button type="button" class="linkish" (click)="tai()">Thử lại</button></div> }
    @if (d(); as x) {
      <div class="kpis">
        <div class="k hero"><span class="l">Số dư quỹ Phú Tài</span><b class="v">{{ money(x.canDoi.cuoiKy) }}</b><span class="s">đến {{ viDate(x.canDoi.denNgay) }}</span></div>
        <div class="k"><span class="l">Thu trong kỳ</span><b class="v">{{ money(x.canDoi.khTra) }}</b><span class="s">khách hàng trả</span></div>
        <div class="k"><span class="l">Chi trong kỳ</span><b class="v">{{ money(x.canDoi.traNcc + x.canDoi.chiPhi) }}</b><span class="s">trả NCC {{ money(x.canDoi.traNcc) }} · chi phí {{ money(x.canDoi.chiPhi) }}</span></div>
        <div class="k"><span class="l">Đã chuyển về OXY</span><b class="v">{{ money(x.canDoi.chuyenOxy) }}</b><span class="s">phần quyền lợi · tab 3</span></div>
      </div>

      <div class="row-2">
        <section class="card-b">
          <h3>A. Cân đối quỹ Phú Tài <span class="u">@if (x.canDoi.tuNgay) { kỳ {{ viDate(x.canDoi.tuNgay) }} – {{ viDate(x.canDoi.denNgay) }} }</span></h3>
          <div class="db"><span>Số dư đầu kỳ@if (x.canDoi.tuNgay) { ({{ viDate(x.canDoi.tuNgay) }}) }</span><b>{{ money(x.canDoi.dauKy) }}</b></div>
          <div class="db"><span>+ Khách hàng trả</span><b class="duong">+ {{ money(x.canDoi.khTra) }}</b></div>
          <div class="db"><span>− Trả nhà cung cấp</span><b class="am">− {{ money(x.canDoi.traNcc) }}</b></div>
          <div class="db"><span>− Chi phí (vận chuyển, kiểm định…)</span><b class="am">− {{ money(x.canDoi.chiPhi) }}</b></div>
          <div class="db"><span>− Chuyển quyền lợi về OXY</span><b class="tim">− {{ money(x.canDoi.chuyenOxy) }}</b></div>
          <div class="db tong"><span>= Số dư cuối kỳ</span><b>{{ money(x.canDoi.cuoiKy) }}</b></div>
          @if (store.canEdit('phuTai')) {
            <div class="btns"><button type="button" class="btn quiet sm" (click)="moForm('Số dư đầu kỳ')">+ Số dư đầu kỳ</button></div>
          }
        </section>
        <section class="card-b">
          <h3>B. Theo hợp đồng <span class="u">tiền của từng HĐ trong quỹ</span></h3>
          <div class="tbl-wrap">
            <table class="tbl">
              <thead><tr><th>HĐ</th><th class="num">KH trả</th><th class="num">Trả NCC</th><th class="num">Chi phí</th><th class="num">Chuyển OXY</th><th class="num">Còn trong quỹ</th></tr></thead>
              <tbody>
                @for (r of x.theoHd; track r.hdbId) {
                  <tr>
                    <td><a class="so" [routerLink]="['/hop-dong-ban', r.hdbId]">{{ r.tenKH }}</a><span class="sub">{{ r.soHD }}</span></td>
                    <td class="num">{{ money(r.khTra) }}</td><td class="num">{{ money(r.traNcc) }}</td><td class="num">{{ money(r.chiPhi) }}</td><td class="num">{{ money(r.chuyenOxy) }}</td>
                    <td class="num" [class.am]="r.conTrongQuy < 0"><b>{{ money(r.conTrongQuy) }}</b>@if (r.conTrongQuy < 0) { <span class="chip warn">PT ứng trước</span> }</td>
                  </tr>
                } @empty { <tr><td colspan="6" class="empty">Chưa có HĐ Phú Tài</td></tr> }
              </tbody>
              @if (x.theoHd.length) {
                <tfoot><tr><th>Tổng</th><td class="num">{{ money(x.canDoi.khTra) }}</td><td class="num">{{ money(x.canDoi.traNcc) }}</td><td class="num">{{ money(x.canDoi.chiPhi) }}</td><td class="num">{{ money(x.canDoi.chuyenOxy) }}</td><td class="num">{{ money(tongConQuy()) }}</td></tr></tfoot>
              }
            </table>
          </div>
          <p class="note-s">Âm = Phú Tài đã chi trước khi khách trả (dùng số dư đầu kỳ).</p>
        </section>
      </div>

      <section class="card-b">
        <h3>C. Sổ quỹ Phú Tài chi tiết <span class="u">một quỹ · tồn quỹ chạy liên tục</span></h3>
        <div class="loc">
          <div class="pills" role="tablist">
            <button type="button" class="pill-b" [class.on]="loc() === 'all'" (click)="loc.set('all')">Tất cả ({{ x.rows.length }})</button>
            <button type="button" class="pill-b" [class.on]="loc() === 'Thu KH'" (click)="loc.set('Thu KH')">Thu KH ({{ x.dem['Thu KH'] }})</button>
            <button type="button" class="pill-b" [class.on]="loc() === 'Trả NCC'" (click)="loc.set('Trả NCC')">Trả NCC ({{ x.dem['Trả NCC'] }})</button>
            <button type="button" class="pill-b" [class.on]="loc() === 'Chi phí'" (click)="loc.set('Chi phí')">Chi phí ({{ x.dem['Chi phí'] }})</button>
            <button type="button" class="pill-b" [class.on]="loc() === 'Chuyển OXY'" (click)="loc.set('Chuyển OXY')">Chuyển OXY ({{ x.dem['Chuyển OXY'] }})</button>
          </div>
          <span style="flex:1"></span>
          <select aria-label="Lọc theo HĐ" (change)="hd.set($any($event.target).value)">
            <option value="" [selected]="!hd()">HĐ: Tất cả</option>
            @for (h of x.hdOpts; track h.id) { <option [value]="h.id" [selected]="hd() === h.id">{{ h.ten }} · {{ h.soHD }}</option> }
          </select>
          @if (store.canEdit('phuTai')) {
            <button type="button" class="btn pill hero sm" (click)="moForm('Chuyển OXY')">+ Chuyển quyền lợi về OXY</button>
          }
        </div>

        @if (form(); as f) {
          <div class="frm">
            <b>{{ f.loai === 'Chuyển OXY' ? 'Chuyển quyền lợi về OXY' : 'Số dư đầu kỳ quỹ Phú Tài' }}</b>
            @if (err()) { <div class="note bad">{{ err() }}</div> }
            <div class="frm-g">
              <label>Ngày <input type="date" [value]="f.ngay" (input)="setF('ngay', $any($event.target).value)" /></label>
              @if (f.loai === 'Chuyển OXY') {
                <label>HĐ bán
                  <select (change)="setF('hdbId', $any($event.target).value)">
                    <option value="" [selected]="!f.hdbId">— Chọn HĐ —</option>
                    @for (h of x.hdOpts; track h.id) { <option [value]="h.id" [selected]="f.hdbId === h.id">{{ h.soHD }} · {{ h.ten }}</option> }
                  </select>
                </label>
              }
              <label>Số tiền (VNĐ) <app-money [value]="f.soTien" (valueChange)="setF('soTien', $event)" /></label>
              <label>Chứng từ (UNC / sao kê) <input [value]="f.tep" placeholder="VD UNC_OXY_0510.pdf" (input)="setF('tep', $any($event.target).value)" /></label>
              <label class="full">Nội dung <input [value]="f.ghiChu" (input)="setF('ghiChu', $any($event.target).value)" /></label>
            </div>
            <div class="btns"><button type="button" class="btn quiet sm" (click)="form.set(null)">Huỷ</button><button type="button" class="btn sm" [disabled]="dangLuu()" (click)="luu()">Lưu</button></div>
          </div>
        }

        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>Ngày</th><th>HĐ</th><th>Nội dung</th><th>Loại</th><th class="num">Thu</th><th class="num">Chi</th><th class="num">Tồn quỹ</th><th>UNC / bằng chứng</th></tr></thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
                  <td class="nw">{{ viDate(r.ngay) }}</td>
                  <td>@if (r.hdbId) { <a class="so" [routerLink]="['/hop-dong-ban', r.hdbId]">{{ r.tenKH }}</a> }</td>
                  <td>{{ r.noiDung }}</td>
                  <td><span class="chip" [class]="'chip ' + chip(r.loai)">{{ r.loai }}</span></td>
                  <td class="num"><span class="duong">{{ r.thu ? money(r.thu) : '' }}</span></td>
                  <td class="num"><span class="am">{{ r.chi ? money(r.chi) : '' }}</span></td>
                  <td class="num"><b>{{ money(r.tonQuy) }}</b></td>
                  <td>@if (r.tep) { <span class="chip info">{{ r.tep }}</span> } @else if (r.loai !== 'Thu KH' && r.loai !== 'Số dư đầu kỳ') { <span class="chip dash">+ Đính kèm</span> }</td>
                </tr>
              } @empty { <tr><td colspan="8" class="empty">Chưa có dòng tiền nào</td></tr> }
            </tbody>
          </table>
        </div>
      </section>
    } @else if (!loi()) {
      <p class="sub">Đang tải…</p>
    }
  `,
  styles: [PT_STYLES, `
    .row-2 { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); }
    @media (max-width: 1000px) { .row-2 { grid-template-columns: minmax(0, 1fr); } }
    .flow { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 14px; padding: 8px 12px; border-radius: 12px; background: var(--surf); font-size: 12.5px; }
    .flow .f { padding: 3px 12px; border-radius: 999px; font-weight: 600; }
    .flow .f1 { background: #e2f3e9; color: #17663f; }
    .flow .f2 { background: #ece6f9; color: #4a2f8c; }
    .flow .f3 { background: #fbf0d6; color: #8a5a00; }
    .flow .u { margin-left: auto; }
    .db { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 9px 0; font-size: 13px; border-bottom: 1px solid var(--line); }
    .db.tong { font-size: 14px; border-bottom: 0; }
    .duong { color: #1f7a45; font-weight: 600; }
    .am { color: #a3261d; font-weight: 600; }
    .tim { color: #6b4ab5; font-weight: 600; }
    .btns { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
    .nw { white-space: nowrap; }
    .pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill-b { border: 0; padding: 6px 14px; border-radius: 999px; background: var(--surf-2); font-weight: 600; font-size: 13px; cursor: pointer; color: var(--ink-2); }
    .pill-b.on { background: #0f5a2a; color: #fff; }
    .chip.pt { background: #ece6f9; color: #4a2f8c; }
    .chip.dash { background: transparent; border: 1px dashed var(--line-2); color: var(--ink-3); }
    .frm { margin-bottom: 14px; padding: 14px; border-radius: 12px; background: var(--surf-2); display: grid; gap: 10px; }
    .frm-g { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
    .frm-g label { display: grid; gap: 4px; font-size: 12.5px; font-weight: 600; }
    .frm-g label.full { grid-column: 1 / -1; }
  `],
})
export class PtSoQuy {
  protected readonly store = inject(Store);
  protected readonly money = money;
  protected readonly viDate = viDate;
  private readonly src = ptTai<QuyDto>(() => '/phu-tai/so-quy');
  protected readonly d = this.src.d;
  protected readonly loi = this.src.loi;
  protected readonly tai = this.src.tai;

  protected readonly loc = signal<Loc>('all');
  protected readonly hd = signal('');
  protected readonly rows = computed(() =>
    (this.d()?.rows ?? []).filter((r) => (this.loc() === 'all' || r.loai === this.loc()) && (!this.hd() || r.hdbId === this.hd())),
  );
  protected readonly tongConQuy = computed(() => (this.d()?.theoHd ?? []).reduce((s, r) => s + r.conTrongQuy, 0));
  protected chip(loai: string): string {
    return LOAI_CHIP[loai] ?? '';
  }

  protected readonly form = signal<{ loai: 'Số dư đầu kỳ' | 'Chuyển OXY'; ngay: string; hdbId: string; soTien: number; ghiChu: string; tep: string } | null>(null);
  protected readonly err = signal('');
  protected readonly dangLuu = signal(false);

  protected moForm(loai: 'Số dư đầu kỳ' | 'Chuyển OXY'): void {
    this.err.set('');
    this.form.set({ loai, ngay: todayIso(), hdbId: '', soTien: 0, ghiChu: '', tep: '' });
  }
  protected setF<K extends 'ngay' | 'hdbId' | 'soTien' | 'ghiChu' | 'tep'>(k: K, v: string | number): void {
    this.form.update((f) => (f ? { ...f, [k]: v } : f));
  }

  protected async luu(): Promise<void> {
    const f = this.form();
    if (!f) return;
    if (!f.ngay || !(f.soTien > 0)) return void this.err.set('Cần Ngày và Số tiền > 0');
    if (f.loai === 'Chuyển OXY' && !f.hdbId) return void this.err.set('Chọn HĐ bán Phú Tài');
    this.dangLuu.set(true);
    try {
      await api('POST', '/phu-tai/so-quy', f);
      this.form.set(null);
      this.store.say('Đã ghi vào sổ quỹ Phú Tài');
      await this.store.reload();
      await this.tai();
    } catch (e) {
      this.err.set(e instanceof Error ? e.message : 'Không lưu được');
    } finally {
      this.dangLuu.set(false);
    }
  }
}
