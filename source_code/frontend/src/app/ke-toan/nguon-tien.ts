import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Store } from '../core/store';
import { CongTyNguon, NguonTien } from '../core/models';
import { SoDuNguon } from '../core/calc';
import { money, sum, todayIso, vnd, viDate } from '../core/util';
import { Modal, MoneyInput, TrangThai } from '../shared/ui-kit';
import { Confirm } from '../shared/confirm';
import { guiXoa } from '../shared/ho-so';
import { TT } from '../core/trang-thai';

interface Card {
  n: NguonTien;
  s: SoDuNguon;
}

const CONG_TY_NGUON: readonly { ma: CongTyNguon; ten: string; tenDayDu: string; mau: string }[] = [
  { ma: 'OXY', ten: 'OXYMECIE', tenDayDu: 'CTCP OXYMECIE Việt Nam', mau: '#01b600' },
  { ma: 'KOXY', ten: 'KHÍ OXYMECIE', tenDayDu: 'CTCP Khí OXYMECIE', mau: '#d99a1e' },
];

interface NhomCT {
  ct: (typeof CONG_TY_NGUON)[number];
  ds: Card[];
  nganHang: number;
  tienMat: number;
  tong: number;
}

/** Tab Nguồn tiền: thẻ số dư từng nguồn (KT-01, KT-02). */
@Component({
  selector: 'app-kt-nguon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, MoneyInput, TrangThai],
  template: `
    <div class="between" style="margin-bottom:12px">
      <p class="sub muted">Số dư = Đầu kỳ + Thu − Chi ± Quyết toán tạm ứng + Luân chuyển vào − Luân chuyển ra − CP HĐ (chỉ phiếu Đã duyệt).</p>
      @if (store.canEdit('nguonTien')) { <button type="button" class="btn" (click)="moi()">+ Thêm nguồn tiền</button> }
    </div>
    <section class="card hero-nguon" [class.bad]="tong() < 0">
      <div class="between" style="gap:16px;flex-wrap:wrap">
        <div>
          <div>Tổng số dư {{ all().length }} nguồn ({{ cards().length }} đang dùng) · {{ nhom().length }} công ty</div>
          <div class="row" style="gap:10px;margin-top:10px;flex-wrap:wrap">
            @for (g of nhom(); track g.ct.ma) {
              <div class="hero-sub"><span>{{ g.ct.ten }}</span><b class="num">{{ vnd(g.tong) }}</b></div>
            }
          </div>
        </div>
        <div class="num" style="font-size:40px;font-weight:700" [class.neg]="tong() < 0">{{ vnd(tong()) }}</div>
      </div>
      <span class="sub">Luân chuyển nội bộ giữa các nguồn (kể cả giữa 2 công ty) không làm đổi tổng.</span>
    </section>

    @for (g of nhom(); track g.ct.ma) {
      <div class="between" style="margin:18px 0 10px;flex-wrap:wrap;gap:6px">
        <h3 style="margin:0"><span class="dot-ct" [style.background]="g.ct.mau"></span><b>{{ g.ct.ten }}</b> <span class="muted" style="font-weight:400;margin-left:8px">{{ g.ct.tenDayDu }} · {{ g.ds.length }} nguồn</span></h3>
        <span class="muted">Ngân hàng <b class="num">{{ vnd(g.nganHang) }}</b> · Tiền mặt <b class="num">{{ vnd(g.tienMat) }}</b> · Tổng <b class="num">{{ vnd(g.tong) }}</b></span>
      </div>
      <div class="grid c3">
        @for (c of g.ds; track c.n.id) {
          <section class="card" [class.click]="store.canEdit('nguonTien')" (click)="sua(c.n)" [style.border-color]="c.s.soDu < 0 ? 'var(--bad-fg)' : null">
            <header class="between" style="align-items:flex-start;gap:8px">
              <div class="row" style="gap:10px;align-items:flex-start">
                <span class="ico-nguon" [class.cash]="c.n.loai === 'Tiền mặt'" aria-hidden="true">
                  @if (c.n.loai === 'Ngân hàng') {
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>
                  } @else {
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>
                  }
                </span>
                <div><b>{{ c.n.ten }}</b><div class="sub muted">{{ c.n.id }} · {{ c.n.loai }}@if (c.n.soTaiKhoan) { · {{ c.n.nganHang }} {{ c.n.soTaiKhoan }} } · {{ g.ct.ten }}</div></div>
              </div>
              <app-tt [v]="c.n.trangThai" />
            </header>
            <div class="num" style="font-size:24px;font-weight:700;text-align:right;margin-top:8px" [class.neg]="c.s.soDu < 0">{{ vnd(c.s.soDu) }}</div>
            @if (c.s.soDu < 0) { <div class="note bad">Số dư âm — kiểm tra phiếu chi / luân chuyển.</div> }
            <p class="sub muted" style="margin-top:6px;border-top:1px solid var(--line);padding-top:6px">
              Đầu kỳ {{ money(c.s.dauKy) }} ({{ viDate(c.n.ngayDauKy) }}) · Thu {{ money(c.s.thu + c.s.qtThu) }} · Chi {{ money(c.s.chi + c.s.qtChi) }} ·
              LC vào {{ money(c.s.lcVao) }} / ra {{ money(c.s.lcRa) }} · CP HĐ {{ money(c.s.cpHD) }}
            </p>
          </section>
        }
      </div>
    } @empty {
      <div class="card empty">Chưa có nguồn tiền</div>
    }

    @if (f(); as n) {
      <app-modal #mNguon [open]="true" [title]="isNew() ? 'Thêm nguồn tiền' : 'Sửa nguồn tiền ' + n.id" size="md" [dirty]="dirty()" (closed)="f.set(null)">
        @if (err()) { <div class="note bad">{{ err() }}</div> }
        @if (khoa()) { <div class="note info">Nguồn đã có phiếu Đã duyệt — khoá Số dư đầu kỳ và Ngày đầu kỳ.</div> }
        <div class="form-grid blk xanh">
<h3 class="blk-t">Thông tin nguồn tiền</h3>
          <div class="field"><label for="nt-id">Mã nguồn <span class="req">*</span></label><input id="nt-id" [disabled]="!isNew()" [value]="n.id" (input)="set('id', $any($event.target).value.trim())" /></div>
          <div class="field"><label for="nt-ten">Tên <span class="req">*</span></label><input id="nt-ten" placeholder="Tiền mặt, UNC-MSB…" [value]="n.ten" (input)="set('ten', $any($event.target).value)" /></div>
          <div class="field">
            <label for="nt-ct">Công ty <span class="req">*</span></label>
            <select id="nt-ct" (change)="set('congTy', $any($event.target).value)">
              @for (ct of CONG_TY_NGUON; track ct.ma) {
                <option [value]="ct.ma" [selected]="n.congTy === ct.ma">{{ ct.ten }} — {{ ct.tenDayDu }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label for="nt-loai">Loại</label>
            <select id="nt-loai" (change)="set('loai', $any($event.target).value)">
              <option value="Tiền mặt" [selected]="n.loai === 'Tiền mặt'">Tiền mặt</option>
              <option value="Ngân hàng" [selected]="n.loai === 'Ngân hàng'">Ngân hàng</option>
            </select>
          </div>
          @if (n.loai === 'Ngân hàng') {
            <div class="field"><label for="nt-stk">Số tài khoản</label><input id="nt-stk" [value]="n.soTaiKhoan || ''" (input)="set('soTaiKhoan', $any($event.target).value)" /></div>
            <div class="field"><label for="nt-nh">Ngân hàng</label><input id="nt-nh" [value]="n.nganHang || ''" (input)="set('nganHang', $any($event.target).value)" /></div>
          }
          <div class="field"><label>Số dư đầu kỳ (VNĐ)</label><app-money [disabled]="khoa()" [value]="n.soDuDauKy" (valueChange)="set('soDuDauKy', $event)" /></div>
          <div class="field"><label for="nt-ngay">Ngày đầu kỳ</label><input id="nt-ngay" type="date" [disabled]="khoa()" [value]="n.ngayDauKy" (input)="set('ngayDauKy', $any($event.target).value)" /></div>
          <div class="field">
            <label for="nt-tt">Trạng thái</label>
            <select id="nt-tt" (change)="set('trangThai', $any($event.target).value)">
              <option [value]="TT.DANG_DUNG" [selected]="n.trangThai === TT.DANG_DUNG">Đang dùng</option>
              <option [value]="TT.NGUNG" [selected]="n.trangThai === TT.NGUNG">Ngưng</option>
            </select>
            <span class="hint">Nguồn Ngưng không hiện khi lập phiếu mới.</span>
          </div>
        </div>
        <div foot>
          @if (!isNew() && !khoa() && !store.nguonDaPhatSinh(n.id) && store.level('duyetXoa') !== 'none' && !store.dangChoXoa('DM_NguonTien', n.id)) {
            <button type="button" class="btn danger quiet" (click)="xoa(n)">Xoá</button>
          }
          <span style="flex:1"></span>
          <button type="button" class="btn quiet" (click)="f.set(null)">Huỷ</button>
          <button type="button" class="btn" (click)="luu()">Lưu</button>
        </div>
      </app-modal>
    }
  `,
})
export class NguonTienTab {
  protected readonly TT = TT;
  protected readonly CONG_TY_NGUON = CONG_TY_NGUON;
  private readonly mNguon = viewChild<Modal>('mNguon');
  protected readonly store = inject(Store);
  protected readonly money = money;
  protected readonly vnd = vnd;
  protected readonly viDate = viDate;

  protected readonly all = computed<Card[]>(() => {
    this.store.db();
    return this.store.nguonTien().map((n) => ({ n, s: this.store.soDu(n.id) }));
  });
  protected readonly cards = computed(() => this.all().filter((c) => c.n.trangThai === TT.DANG_DUNG));
  protected readonly nhom = computed<NhomCT[]>(() =>
    CONG_TY_NGUON.map((ct) => {
      const ds = this.all().filter((c) => c.n.congTy === ct.ma);
      const theoLoai = (l: NguonTien['loai']) => sum(ds.filter((c) => c.n.loai === l), (c) => c.s.soDu);
      return { ct, ds, nganHang: theoLoai('Ngân hàng'), tienMat: theoLoai('Tiền mặt'), tong: sum(ds, (c) => c.s.soDu) };
    }).filter((g) => g.ds.length > 0),
  );
  protected readonly tong = computed(() => sum(this.all(), (c) => c.s.soDu));

  protected readonly f = signal<NguonTien | null>(null);
  protected readonly isNew = signal(false);
  protected readonly err = signal('');
  protected readonly khoa = computed(() => {
    const n = this.f();
    return !!n && !this.isNew() && this.store.nguonDaPhatSinh(n.id);
  });

  private readonly confirm = inject(Confirm);
  private readonly goc = signal('');
  protected readonly dirty = computed(() => !!this.f() && JSON.stringify(this.f()) !== this.goc());

  protected moi(): void {
    this.err.set('');
    this.isNew.set(true);
    this.f.set({ id: '', ten: '', congTy: 'OXY', loai: 'Tiền mặt', soDuDauKy: 0, ngayDauKy: todayIso(), trangThai: TT.DANG_DUNG });
    this.goc.set(JSON.stringify(this.f()));
  }
  protected sua(n: NguonTien): void {
    if (!this.store.canEdit('nguonTien')) return;
    this.err.set('');
    this.isNew.set(false);
    this.f.set(structuredClone(n));
    this.goc.set(JSON.stringify(this.f()));
  }
  protected async xoa(n: NguonTien): Promise<void> {
    if (await guiXoa(this.confirm, this.store, 'DM_NguonTien', n.id, `Nguồn tiền ${n.ten}`)) this.f.set(null);
  }
  protected set<K extends keyof NguonTien>(k: K, v: NguonTien[K]): void {
    this.f.update((n) => (n ? { ...n, [k]: v } : n));
  }
  protected luu(): void {
    if (this.mNguon()?.kt.hopLe() === false) return;
    const n = this.f();
    if (!n) return;
    const out: NguonTien = n.loai === 'Ngân hàng' ? n : { ...n, soTaiKhoan: undefined, nganHang: undefined };
    const e = this.store.saveNguonTien(out, this.isNew());
    if (e) {
      this.err.set(e);
      return;
    }
    this.store.say('Đã lưu nguồn tiền');
    this.f.set(null);
  }
}
