import { ChangeDetectionStrategy, Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { Store } from '../core/store';
import { HopDongBan, KHO_CHUYEN_THANG, PhieuKho } from '../core/models';
import { DongLo, loConHang, tonTai, tongSL } from '../core/calc';
import { num, todayIso, viDate } from '../core/util';
import { Confirm } from '../shared/confirm';
import { guiXoa } from '../shared/ho-so';
import { Modal, Pick, PickOption, TrangThai } from '../shared/ui-kit';
import { Icon } from '../shared/icon';
import { RouterLink } from '@angular/router';
import { linkPhieuKho, maHangOpts } from '../kho/kho-util';

/** Dòng giao: mã hàng → lô (bỏ trống = trừ lô nhập trước), SL, tên ghi trên HĐ. */
interface DongNhap {
  loaiHang: string;
  lo: string;
  soLuong: number;
  tenTrenHD: string;
}

const dongRong = (): DongNhap => ({ loaiHang: '', lo: '', soLuong: 0, tenTrenHD: '' });

/** HDB-04 — khu Giao hàng ở Tab 1: các lần giao (phiếu XK) + popup Ghi nhận giao hàng. */
@Component({
  selector: 'app-hdb-giao-hang',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Pick, TrangThai, Icon, RouterLink],
  template: `
    <section class="card">
      <div class="section-title">
        <h2>Giao hàng</h2>
        @if (coTheGiao()) {
          <button type="button" class="btn sm" (click)="mo()"><app-icon name="truck" [size]="16" /> Ghi nhận giao hàng</button>
        }
      </div>
      @if (h().trangThai === 'Báo giá') { <p class="sub">HĐ chưa Hiệu lực — chưa ghi nhận giao hàng được.</p> }
      <div class="tbl-wrap">
        <table class="tbl compact">
          <thead><tr><th>Ngày</th><th>Số phiếu XK</th><th>Kho</th><th>Hàng</th><th class="num">SL</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            @for (p of phieus(); track p.id) {
              <tr>
                <td>{{ viDate(p.ngay) }}</td>
                <td>@if (store.canView('khoTon')) { <a routerLink="/kho" [queryParams]="link(p)"><b>{{ p.soPhieu }}</b></a> } @else { <b>{{ p.soPhieu }}</b> }</td>
                <td>{{ store.khoTen(p.kho) }}</td>
                <td class="sub">{{ moTaDong(p) }}</td>
                <td class="num">{{ num(tongSL(p)) }}</td>
                <td>
                  <app-tt [v]="p.trangThai" />
                  @if (store.dangChoXoa('PhieuKho', p.id)) { <app-tt v="Chờ xoá" /> }
                </td>
                <td>
                  @if (coTheGiao() && p.trangThai === 'Hiệu lực' && !store.dangChoXoa('PhieuKho', p.id)) {
                    <button type="button" class="btn sm quiet" (click)="huy(p)">Huỷ lần giao</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="muted">Chưa có lần giao nào</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <app-modal #mGH [open]="open()" title="Ghi nhận giao hàng" [sub]="'HĐ ' + h().soHD" size="lg" [dirty]="dirty()" (closed)="open.set(false)">
      <div class="form-grid">
        <div class="field">
          <label for="gh-ngay">Ngày giao <span class="req">*</span></label>
          <input id="gh-ngay" type="date" [value]="ngay()" (input)="ngay.set($any($event.target).value)" />
        </div>
        <div class="field">
          <label for="gh-kho">Vị trí kho <span class="req">*</span></label>
          <select id="gh-kho" (change)="doiKho($any($event.target).value)">
            @for (k of store.khoDangDung(); track k.id) {
              <option [value]="k.id" [selected]="k.id === kho()">{{ k.id === KHO_CT ? k.ten + ' — không qua kho' : k.ten }}</option>
            }
          </select>
        </div>
        <div class="field wide">
          <label for="gh-gc">Ghi chú</label>
          <input id="gh-gc" [value]="ghiChu()" (input)="ghiChu.set($any($event.target).value)" />
        </div>
      </div>
      @if (goiY()) { <p class="note info">Đã gợi ý sẵn các dòng từ HĐ Mua liên quan (trừ phần đã giao). Sửa / xoá dòng nếu cần.</p> }
      <table class="tbl compact">
        <thead><tr><th style="width:34%">Mã hàng</th><th>Lô</th><th class="num w-sm">Số lượng</th><th>Tên hàng trên HĐ</th><th style="width:40px"></th></tr></thead>
        <tbody>
          @for (d of dong(); track $index; let i = $index) {
            <tr>
              <td>
                <app-pick [options]="lhOpts()" [value]="d.loaiHang" (valueChange)="setDong(i, { loaiHang: $event, lo: '' })" />
                @if (d.loaiHang && kho() !== KHO_CT) { <span class="hint" [class.neg]="ton(d.loaiHang) < d.soLuong">Tồn tại kho: {{ num(ton(d.loaiHang)) }}</span> }
              </td>
              <td>
                @if (kho() === KHO_CT) { <span class="muted">Không theo lô</span> } @else {
                  <select (change)="setDong(i, { lo: $any($event.target).value })" aria-label="Lô" [disabled]="!d.loaiHang">
                    <option value="" [selected]="!d.lo">Tự chọn lô nhập trước</option>
                    @for (l of lots(d.loaiHang); track l.lo) {
                      <option [value]="l.lo" [selected]="l.lo === d.lo">{{ l.lo }} · tồn {{ l.ton }}{{ l.quyCach ? ' · ' + l.quyCach.slice(0, 40) : '' }}</option>
                    }
                  </select>
                }
              </td>
              <td><input class="num" type="number" min="0" [value]="d.soLuong" (input)="setDong(i, { soLuong: +$any($event.target).value || 0 })" /></td>
              <td><input [value]="d.tenTrenHD" placeholder="VD Bình khí chuẩn NO2 200ppm" (input)="setDong(i, { tenTrenHD: $any($event.target).value })" /></td>
              <td><button type="button" class="icon-btn sm" aria-label="Xoá dòng" (click)="xoaDong(i)"><app-icon name="trash" [size]="16" /></button></td>
            </tr>
          }
        </tbody>
      </table>
      <button type="button" class="btn sm quiet" (click)="themDong()"><app-icon name="plus" [size]="16" /> Thêm dòng</button>
      @if (loi()) {
        <p class="note bad">{{ loi() }}</p>
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="open.set(false)">Huỷ</button>
        <button type="button" class="btn" (click)="xacNhan()">Xác nhận — sinh phiếu Xuất kho</button>
      </div>
    </app-modal>
  `,
})
export class HdbGiaoHang {
  private readonly mGH = viewChild<Modal>('mGH');
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  readonly h = input.required<HopDongBan>();
  /** Đã khoá (tất toán / chờ xoá). */
  readonly khoa = input(false);

  protected readonly viDate = viDate;
  protected readonly num = num;
  protected readonly tongSL = tongSL;
  protected readonly KHO_CT = KHO_CHUYEN_THANG;

  protected readonly open = signal(false);
  protected readonly ngay = signal(todayIso());
  protected readonly kho = signal('');
  protected readonly ghiChu = signal('');
  protected readonly dong = signal<DongNhap[]>([]);
  protected readonly goiY = signal(false);
  private readonly goc = signal('');
  private readonly anh = computed(() => JSON.stringify([this.ngay(), this.kho(), this.ghiChu(), this.dong()]));
  protected readonly dirty = computed(() => this.open() && this.anh() !== this.goc());

  protected readonly coTheGiao = computed(
    () => !this.khoa() && this.h().trangThai !== 'Báo giá' && this.h().trangThai !== 'Hoàn thành' && this.store.canEdit('hdbGiaoHang', this.h().sale),
  );
  protected readonly phieus = computed(() =>
    this.store
      .phieuKho()
      .filter((p) => p.loai === 'Xuất' && p.hdId === this.h().id)
      .sort((a, b) => (a.ngay < b.ngay ? 1 : -1)),
  );
  protected readonly lhOpts = computed<PickOption[]>(() => maHangOpts(this.store.loaiHang().filter((l) => l.dangDung)));
  /** Xuất quá tồn lô / thiếu tồn → báo ngay, xác nhận sẽ bị chặn. */
  protected readonly loi = computed(() =>
    this.open() ? (this.store.loiXuat(this.kho(), this.h().id, this.dong().map((d) => ({ ...d, lo: d.lo || undefined }))) ?? '') : '',
  );

  protected readonly link = linkPhieuKho;

  protected moTaDong(p: PhieuKho): string {
    return p.dong.map((d) => `${d.loaiHang}${d.lo ? ' (lô ' + d.lo + ')' : ''} × ${num(d.soLuong)}`).join('; ');
  }

  protected ton(lh: string): number {
    return tonTai(this.store.db(), lh, this.kho());
  }
  protected lots(lh: string): DongLo[] {
    return lh ? loConHang(this.store.db(), lh, this.kho()) : [];
  }
  protected doiKho(v: string): void {
    this.kho.set(v);
    this.dong.update((arr) => arr.map((d) => ({ ...d, lo: '' })));
  }

  protected mo(): void {
    const id = this.h().id;
    const daGiao = new Map<string, number>();
    for (const p of this.phieus()) {
      if (p.trangThai !== 'Hiệu lực') continue;
      for (const d of p.dong) daGiao.set(d.loaiHang, (daGiao.get(d.loaiHang) ?? 0) + d.soLuong);
    }
    const goiY: DongNhap[] = [];
    for (const m of this.store.hopDongMua()) {
      if (m.hdbId !== id || m.trangThai === 'Huỷ') continue;
      for (const d of m.chiTiet) {
        const tru = Math.min(daGiao.get(d.loaiHang) ?? 0, d.soLuong);
        daGiao.set(d.loaiHang, (daGiao.get(d.loaiHang) ?? 0) - tru);
        const con = d.soLuong - tru;
        if (con > 0) goiY.push({ ...dongRong(), loaiHang: d.loaiHang, soLuong: con, tenTrenHD: d.tenHang });
      }
    }
    this.goiY.set(goiY.length > 0);
    this.dong.set(goiY.length ? goiY : [dongRong()]);
    this.ngay.set(todayIso());
    this.kho.set((this.store.khoDangDung().find((k) => k.id !== KHO_CHUYEN_THANG) ?? this.store.khoDangDung()[0])?.id ?? '');
    this.ghiChu.set('');
    this.goc.set(this.anh());
    this.open.set(true);
  }

  protected setDong(i: number, p: Partial<DongNhap>): void {
    this.dong.update((arr) => arr.map((d, j) => (j === i ? { ...d, ...p } : d)));
  }
  protected themDong(): void {
    this.dong.update((arr) => [...arr, dongRong()]);
  }
  protected xoaDong(i: number): void {
    this.dong.update((arr) => arr.filter((_, j) => j !== i));
  }

  protected xacNhan(): void {
    if (this.mGH()?.kt.hopLe() === false) return;
    if (!this.ngay()) {
      this.store.say('Chưa nhập Ngày giao');
      return;
    }
    const err = this.store.ghiNhanGiaoHang(this.h().id, {
      ngay: this.ngay(),
      kho: this.kho(),
      dong: this.dong().map((d) => ({ loaiHang: d.loaiHang, lo: d.lo || undefined, soLuong: d.soLuong, tenTrenHD: d.tenTrenHD })),
      ghiChu: this.ghiChu().trim() || undefined,
    });
    if (err) {
      this.store.say(err);
      return;
    }
    this.open.set(false);
    this.store.say('Đã ghi nhận giao hàng — đã sinh phiếu Xuất kho (trừ theo lô)');
  }

  protected async huy(p: PhieuKho): Promise<void> {
    await guiXoa(this.confirm, this.store, 'PhieuKho', p.id, `phiếu XK ${p.soPhieu} (HĐ bán ${this.h().soHD})`);
  }
}
