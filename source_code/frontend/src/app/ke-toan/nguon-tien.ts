import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Store } from '../core/store';
import { NguonTien } from '../core/models';
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
    <div class="grid c3">
      <section class="card" [class.bad]="tong() < 0">
        <span class="muted">Tổng số dư {{ all().length }} nguồn ({{ cards().length }} đang dùng)</span>
        <div class="num" style="font-size:28px;font-weight:700" [class.neg]="tong() < 0">{{ vnd(tong()) }}</div>
        <span class="sub muted">Luân chuyển nội bộ không làm đổi tổng.</span>
      </section>
      @for (c of all(); track c.n.id) {
        <section class="card" [class.click]="store.canEdit('nguonTien')" (click)="sua(c.n)" [style.border-color]="c.s.soDu < 0 ? 'var(--bad-fg)' : null">
          <header class="between">
            <div><b>{{ c.n.ten }}</b> <span class="muted">· {{ c.n.id }}</span><div class="sub muted">{{ c.n.loai }}@if (c.n.soTaiKhoan) { · {{ c.n.nganHang }} {{ c.n.soTaiKhoan }} }</div></div>
            <app-tt [v]="c.n.trangThai" />
          </header>
          <div class="num" style="font-size:26px;font-weight:700" [class.neg]="c.s.soDu < 0">{{ vnd(c.s.soDu) }}</div>
          @if (c.s.soDu < 0) { <div class="note bad">Số dư âm — kiểm tra phiếu chi / luân chuyển.</div> }
          <p class="sub muted" style="margin-top:6px">
            Đầu kỳ {{ money(c.s.dauKy) }} ({{ viDate(c.n.ngayDauKy) }}) · Thu {{ money(c.s.thu + c.s.qtThu) }} · Chi {{ money(c.s.chi + c.s.qtChi) }} ·
            LC vào {{ money(c.s.lcVao) }} / ra {{ money(c.s.lcRa) }} · CP HĐ {{ money(c.s.cpHD) }}
          </p>
        </section>
      } @empty {
        <div class="card empty">Chưa có nguồn tiền</div>
      }
    </div>

    @if (f(); as n) {
      <app-modal #mNguon [open]="true" [title]="isNew() ? 'Thêm nguồn tiền' : 'Sửa nguồn tiền ' + n.id" size="md" [dirty]="dirty()" (closed)="f.set(null)">
        @if (err()) { <div class="note bad">{{ err() }}</div> }
        @if (khoa()) { <div class="note info">Nguồn đã có phiếu Đã duyệt — khoá Số dư đầu kỳ và Ngày đầu kỳ.</div> }
        <div class="form-grid blk xanh">
<h3 class="blk-t">Thông tin nguồn tiền</h3>
          <div class="field"><label for="nt-id">Mã nguồn <span class="req">*</span></label><input id="nt-id" [disabled]="!isNew()" [value]="n.id" (input)="set('id', $any($event.target).value.trim())" /></div>
          <div class="field"><label for="nt-ten">Tên <span class="req">*</span></label><input id="nt-ten" placeholder="Tiền mặt, UNC-MSB…" [value]="n.ten" (input)="set('ten', $any($event.target).value)" /></div>
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
    this.f.set({ id: '', ten: '', loai: 'Tiền mặt', soDuDauKy: 0, ngayDauKy: todayIso(), trangThai: TT.DANG_DUNG });
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
