import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { lechKiemKe, tonKho } from '../core/calc';
import { DongKiemKe, KHO_CHUYEN_THANG, KiemKe } from '../core/models';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { money, sum, todayIso, viDate } from '../core/util';
import { Confirm } from '../shared/confirm';
import { dirtyOf } from '../shared/unsaved';
import { Modal, Pick, PickOption } from '../shared/ui-kit';
import { linkPhieuKho, maHangOpts, moTaMa } from './kho-util';

interface Form {
  id?: string;
  ngay: string;
  kho: string;
  ghiChu: string;
  dong: DongForm[];
}

/** Dòng đếm trên form — mọi cột dạng chuỗi để bind input. */
type DongForm = { [K in keyof Required<DongKiemKe>]: Required<DongKiemKe>[K] };

const dongRong = (loaiHang = ''): DongForm => ({ loaiHang, soLuong: 0, tenHang: '', xuatXu: '', nongDo: '', ghiChu: '' });

/** Kiểm kê tại kho (sheet "6. KiemKe"): đếm thực tế theo mã hàng → đối chiếu tồn sổ → sinh phiếu điều chỉnh. */
@Component({
  selector: 'app-kho-kiem-ke',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Pick, RouterLink],
  template: `
    <div class="section-title">
      <span class="sub">{{ ds().length }} đợt kiểm kê</span>
      @if (edit()) { <button type="button" class="btn" (click)="moi()">+ Thêm đợt kiểm kê</button> }
    </div>
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead><tr><th>Số phiếu</th><th>Ngày kiểm kê</th><th>Kho</th><th class="num">Số mã đếm</th><th class="num">Tổng SL thực tế</th><th class="num">Mã lệch</th><th>Điều chỉnh</th><th>Người thực hiện</th></tr></thead>
        <tbody>
          @for (k of ds(); track k.id) {
            <tr class="click" (click)="xem.set(k.id)">
              <td><b>{{ k.soPhieu }}</b></td>
              <td>{{ viDate(k.ngay) }}</td>
              <td>{{ store.khoTen(k.kho) }}</td>
              <td class="num">{{ k.dong.length }}</td>
              <td class="num">{{ money(tongDem(k)) }}</td>
              <td class="num">@if (soLech(k); as n) { <span class="tag warn">{{ n }}</span> } @else { <span class="tag ok">Khớp</span> }</td>
              <td>{{ daDieuChinh(k) ? 'Đã sinh phiếu' : '—' }}</td>
              <td>{{ store.userName(k.nguoiThucHien) }}</td>
            </tr>
          } @empty {
            <tr><td colspan="8" class="empty">Chưa có đợt kiểm kê nào</td></tr>
          }
        </tbody>
      </table>
    </div>
    <p class="hint muted">Tồn sổ = tồn theo phiếu tới hết ngày kiểm kê tại kho đó. Mã có tồn sổ mà không đếm được tính thực tế 0. Lệch = thực tế − sổ.</p>

    <!-- Chi tiết / đối chiếu -->
    <app-modal [open]="!!chon()" [title]="'Kiểm kê ' + (chon()?.soPhieu ?? '')" [sub]="chon() ? viDate(chon()!.ngay) + ' · ' + store.khoTen(chon()!.kho) : ''" size="lg" (closed)="xem.set(null)">
      @if (chon(); as k) {
        @if (k.ghiChu) { <p class="note info">{{ k.ghiChu }}</p> }
        <div class="form-grid">
          <div class="field"><span class="lbl">Ngày kiểm kê</span><div class="ro">{{ viDate(k.ngay) }}</div></div>
          <div class="field"><span class="lbl">Kho</span><div class="ro">{{ store.khoTen(k.kho) }}</div></div>
          <div class="field"><span class="lbl">Người thực hiện</span><div class="ro">{{ store.userName(k.nguoiThucHien) }}</div></div>
        </div>
        <h3 class="section-title">Dòng đếm thực tế</h3>
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead><tr><th>Nhóm</th><th>Tên hàng</th><th>Xuất xứ</th><th>Thể tích</th><th>Nồng độ</th><th class="num">Số lượng</th><th>Mã hàng</th><th>Ghi chú</th></tr></thead>
            <tbody>
              @for (d of k.dong; track $index) {
                <tr>
                  <td>{{ store.loaiHangById(d.loaiHang)?.nhom ?? '—' }}</td>
                  <td>{{ d.tenHang || '—' }}</td>
                  <td>{{ d.xuatXu || '—' }}</td>
                  <td>{{ store.loaiHangById(d.loaiHang)?.theTich || '—' }}</td>
                  <td>{{ d.nongDo || '—' }}</td>
                  <td class="num">{{ money(d.soLuong) }}</td>
                  <td><b>{{ d.loaiHang }}</b></td>
                  <td class="sub">{{ d.ghiChu || '' }}</td>
                </tr>
              }
            </tbody>
            <tfoot><tr><td colspan="5">Cộng</td><td class="num">{{ money(tongDem(k)) }}</td><td colspan="2"></td></tr></tfoot>
          </table>
        </div>
        <h3 class="section-title">Đối chiếu tồn sổ theo mã hàng</h3>
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead><tr><th>Mã hàng</th><th>Tên</th><th class="num">Tồn sổ ngày {{ viDate(k.ngay) }}</th><th class="num">Thực tế</th><th class="num">Lệch</th><th>Chi tiết đếm</th></tr></thead>
            <tbody>
              @for (r of lech(); track r.loaiHang) {
                <tr>
                  <td><b>{{ r.loaiHang }}</b></td>
                  <td>{{ store.loaiHangTen(r.loaiHang) }}</td>
                  <td class="num">{{ money(r.soSach) }}</td>
                  <td class="num">{{ money(r.thucTe) }}</td>
                  <td class="num" [class.neg]="r.lech < 0"><b>{{ r.lech > 0 ? '+' : '' }}{{ money(r.lech) }}</b></td>
                  <td class="sub">{{ r.ghiChu || '' }}</td>
                </tr>
              }
            </tbody>
            <tfoot><tr><td colspan="2">Tổng</td><td class="num">{{ money(tongLech().so) }}</td><td class="num">{{ money(tongLech().tt) }}</td><td class="num">{{ money(tongLech().tt - tongLech().so) }}</td><td></td></tr></tfoot>
          </table>
        </div>
        @if (phieuDC().length) {
          <p>Phiếu điều chỉnh:
            @for (p of phieuDC(); track p.id) { <a routerLink="/kho" [queryParams]="link(p)" (click)="xem.set(null)">{{ p.soPhieu }}</a> ({{ p.loai }}, {{ ttNhan(p.trangThai) }}) }
          </p>
        }
      }
      <div foot class="btn-row">
        @if (chon(); as k) {
          @if (edit() && !daDieuChinh(k)) {
            <button type="button" class="btn quiet danger" (click)="xoa(k)">Xoá đợt</button>
            <button type="button" class="btn quiet" (click)="sua(k)">Sửa số đếm</button>
            @if (soLech(k)) { <button type="button" class="btn" (click)="dieuChinh(k)">Sinh phiếu điều chỉnh theo lệch</button> }
          }
        }
        <button type="button" class="btn quiet" (click)="xem.set(null)">Đóng</button>
      </div>
    </app-modal>

    <!-- Nhập số đếm -->
    <app-modal #mKK [open]="!!f()" [title]="f()?.id ? 'Sửa đợt kiểm kê' : 'Thêm đợt kiểm kê'" size="lg" [dirty]="dirty()" (closed)="f.set(null)">
      @if (f(); as x) {
        <div class="form-grid blk xanh">
<h3 class="blk-t">Thông tin đợt kiểm kê</h3>
          <div class="field"><label for="kk-ngay">Ngày kiểm kê <span class="req">*</span></label><input id="kk-ngay" type="date" [value]="x.ngay" (input)="set({ ngay: $any($event.target).value })" /></div>
          <div class="field">
            <span class="lbl">Kho <span class="req">*</span></span>
            <app-pick [options]="khoOpts()" [value]="x.kho" (valueChange)="set({ kho: $event })" />
          </div>
          <div class="field wide"><label for="kk-gc">Ghi chú</label><input id="kk-gc" [value]="x.ghiChu" (input)="set({ ghiChu: $any($event.target).value })" /></div>
        </div>
        <section class="blk duong">
        <h3 class="section-title">
          Số đếm thực tế
          <span class="btn-row">
            <button type="button" class="btn sm quiet" (click)="layTon()">Lấy các mã đang tồn sổ</button>
            <button type="button" class="btn sm quiet" (click)="themDong()">+ Thêm dòng</button>
          </span>
        </h3>
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead><tr><th style="min-width:240px">Mã hàng <span class="req">*</span></th><th>Tên hàng (như trên bình)</th><th>Xuất xứ</th><th>Nồng độ</th><th class="num">Tồn sổ</th><th class="num">Thực tế <span class="req">*</span></th><th>Ghi chú</th><th></th></tr></thead>
            <tbody>
              @for (d of x.dong; track $index; let i = $index) {
                <tr>
                  <td>
                    <app-pick [options]="maOpts()" [value]="d.loaiHang" (valueChange)="setDong(i, { loaiHang: $event })" />
                    @if (d.loaiHang) { <span class="hint">{{ moTa(d.loaiHang) }}</span> }
                  </td>
                  <td><input [value]="d.tenHang" placeholder="VD SO2/NO/CO" (input)="setDong(i, { tenHang: $any($event.target).value })" aria-label="Tên hàng" /></td>
                  <td><input [value]="d.xuatXu" placeholder="VD Air Liquide" style="width:120px" (input)="setDong(i, { xuatXu: $any($event.target).value })" aria-label="Xuất xứ" /></td>
                  <td><input [value]="d.nongDo" placeholder="VD 650/980/650" style="width:120px" (input)="setDong(i, { nongDo: $any($event.target).value })" aria-label="Nồng độ" /></td>
                  <td class="num muted">{{ d.loaiHang ? money(tonSo().get(d.loaiHang) ?? 0) : '' }}</td>
                  <td class="num"><input type="number" min="0" style="width:80px" [value]="d.soLuong" (input)="setDong(i, { soLuong: +$any($event.target).value || 0 })" aria-label="Số lượng thực tế" /></td>
                  <td><input [value]="d.ghiChu" (input)="setDong(i, { ghiChu: $any($event.target).value })" aria-label="Ghi chú" /></td>
                  <td><button type="button" class="btn sm quiet danger" (click)="xoaDong(i)">Xoá</button></td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="empty">Chưa có dòng — bấm "Lấy các mã đang tồn sổ" hoặc "+ Thêm dòng"</td></tr>
              }
            </tbody>
          </table>
        </div>
        <p class="hint muted">Cùng một mã có thể nhiều dòng (khác xuất xứ / nồng độ) — khi đối chiếu tự cộng theo mã.</p>
        </section>
        @if (err()) { <div class="note bad">{{ err() }}</div> }
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="f.set(null)">Huỷ</button>
        <button type="button" class="btn" (click)="luu()">Lưu</button>
      </div>
    </app-modal>
  `,
})
export class KiemKeTab {
  private readonly mKK = viewChild<Modal>('mKK');
  protected readonly store = inject(Store);
  protected readonly ttNhan = ttNhan;
  private readonly confirm = inject(Confirm);
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly link = linkPhieuKho;
  protected readonly edit = computed(() => this.store.canEdit('khoPhieuTay'));

  protected readonly ds = computed(() => [...this.store.kiemKe()].sort((a, b) => (a.ngay < b.ngay ? 1 : -1)));
  protected readonly xem = signal<string | null>(null);
  protected readonly chon = computed(() => this.store.kiemKe().find((k) => k.id === this.xem()) ?? null);
  protected readonly lech = computed(() => {
    const k = this.chon();
    return k ? lechKiemKe(this.store.db(), k) : [];
  });
  protected readonly tongLech = computed(() => ({ so: sum(this.lech(), (r) => r.soSach), tt: sum(this.lech(), (r) => r.thucTe) }));
  protected readonly phieuDC = computed(() => {
    const k = this.chon();
    return k ? this.store.phieuKho().filter((p) => p.kiemKeId === k.id) : [];
  });

  protected readonly f = signal<Form | null>(null);
  protected readonly dirty = dirtyOf(this.f);
  protected readonly err = signal('');
  protected readonly khoOpts = computed<PickOption[]>(() =>
    this.store
      .khoDangDung()
      .filter((k) => k.id !== KHO_CHUYEN_THANG)
      .map((k) => ({ value: k.id, label: k.ten, hint: k.id })),
  );
  protected readonly maOpts = computed(() => maHangOpts(this.store.loaiHang().filter((l) => l.dangDung)));
  /** Tồn sổ theo mã tại kho / ngày của form đang nhập. */
  protected readonly tonSo = computed(() => {
    const x = this.f();
    const m = new Map<string, number>();
    if (!x?.kho) return m;
    for (const r of tonKho(this.store.db(), x.ngay || undefined)) if (r.kho === x.kho) m.set(r.loaiHang, r.ton);
    return m;
  });

  protected tongDem(k: KiemKe): number {
    return sum(k.dong, (d) => d.soLuong);
  }
  protected soLech(k: KiemKe): number {
    return lechKiemKe(this.store.db(), k).filter((r) => r.lech !== 0).length;
  }
  protected daDieuChinh(k: KiemKe): boolean {
    return this.store.phieuKho().some((p) => p.kiemKeId === k.id && p.trangThai === TT.HIEU_LUC);
  }
  protected moTa(lh: string): string {
    return moTaMa(this.store.loaiHangById(lh));
  }

  protected moi(): void {
    this.err.set('');
    this.f.set({ ngay: todayIso(), kho: this.khoOpts()[0]?.value ?? '', ghiChu: '', dong: [] });
  }
  protected sua(k: KiemKe): void {
    this.err.set('');
    this.xem.set(null);
    this.f.set({
      id: k.id,
      ngay: k.ngay,
      kho: k.kho,
      ghiChu: k.ghiChu ?? '',
      dong: k.dong.map((d) => ({ ...dongRong(d.loaiHang), soLuong: d.soLuong, tenHang: d.tenHang ?? '', xuatXu: d.xuatXu ?? '', nongDo: d.nongDo ?? '', ghiChu: d.ghiChu ?? '' })),
    });
  }
  protected set(p: Partial<Form>): void {
    this.f.update((x) => (x ? { ...x, ...p } : x));
  }
  protected setDong(i: number, p: Partial<Form['dong'][number]>): void {
    this.f.update((x) => (x ? { ...x, dong: x.dong.map((d, j) => (j === i ? { ...d, ...p } : d)) } : x));
  }
  protected themDong(): void {
    this.f.update((x) => (x ? { ...x, dong: [...x.dong, dongRong()] } : x));
  }
  protected xoaDong(i: number): void {
    this.f.update((x) => (x ? { ...x, dong: x.dong.filter((_, j) => j !== i) } : x));
  }
  /** Thêm các mã đang có tồn sổ (chưa có trong danh sách), SL thực tế để trống = 0 chờ đếm. */
  protected layTon(): void {
    const co = new Set(this.f()?.dong.map((d) => d.loaiHang));
    const them = [...this.tonSo().entries()]
      .filter(([lh, sl]) => sl > 0 && !co.has(lh))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([lh]) => dongRong(lh));
    if (!them.length) return this.store.say('Không còn mã tồn sổ nào chưa có trong danh sách');
    this.f.update((x) => (x ? { ...x, dong: [...x.dong.filter((d) => d.loaiHang), ...them] } : x));
  }
  protected luu(): void {
    if (this.mKK()?.kt.hopLe() === false) return;
    const x = this.f();
    if (!x) return;
    const e = this.store.saveKiemKe({ id: x.id, ngay: x.ngay, kho: x.kho, ghiChu: x.ghiChu, dong: x.dong });
    if (e) return this.err.set(e);
    this.store.say('Đã lưu đợt kiểm kê');
    this.f.set(null);
  }
  protected async xoa(k: KiemKe): Promise<void> {
    if (!(await this.confirm.ask({ title: `Xoá đợt kiểm kê ${k.soPhieu}?`, message: 'Chỉ xoá số đếm — tồn kho không đổi.', ok: 'Xoá' }))) return;
    const e = this.store.xoaKiemKe(k.id);
    this.store.say(e ?? `Đã xoá đợt kiểm kê ${k.soPhieu}`);
    if (!e) this.xem.set(null);
  }
  protected async dieuChinh(k: KiemKe): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Sinh phiếu điều chỉnh theo lệch kiểm kê?',
      message: 'Thực tế nhiều hơn sổ → phiếu nhập (đơn giá theo lô gần nhất của mã, chưa có thì 0). Thực tế ít hơn sổ → phiếu xuất trừ lô nhập trước. Ngày phiếu = ngày kiểm kê.',
      warn: 'Sau khi sinh phiếu, đợt kiểm kê không sửa được nữa.',
      ok: 'Sinh phiếu',
    });
    if (!ok) return;
    const e = this.store.dieuChinhKiemKe(k.id);
    this.store.say(e ?? 'Đã sinh phiếu điều chỉnh — tồn kho đã khớp số đếm');
  }
}
