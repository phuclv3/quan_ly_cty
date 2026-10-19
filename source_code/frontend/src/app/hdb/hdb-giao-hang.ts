import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Store } from '../core/store';
import { HopDongBan, KHO_CHUYEN_THANG, PhieuKho } from '../core/models';
import { tongSL } from '../core/calc';
import { num, todayIso, viDate } from '../core/util';
import { Confirm } from '../shared/confirm';
import { guiXoa } from '../shared/ho-so';
import { Modal, Pick, PickOption, TrangThai } from '../shared/ui-kit';
import { Icon } from '../shared/icon';

interface DongNhap {
  loaiHang: string;
  thuocTinh: string;
  soLuong: number;
}

/** HDB-04 — khu Giao hàng ở Tab 1: các lần giao (phiếu XK) + popup Ghi nhận giao hàng. */
@Component({
  selector: 'app-hdb-giao-hang',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Pick, TrangThai, Icon],
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
                <td><b>{{ p.soPhieu }}</b></td>
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

    <app-modal [open]="open()" title="Ghi nhận giao hàng" [sub]="'HĐ ' + h().soHD" size="lg" (closed)="open.set(false)">
      <div class="form-grid">
        <div class="field">
          <label for="gh-ngay">Ngày giao *</label>
          <input id="gh-ngay" type="date" [value]="ngay()" (input)="ngay.set($any($event.target).value)" />
        </div>
        <div class="field">
          <label for="gh-kho">Vị trí kho *</label>
          <select id="gh-kho" (change)="kho.set($any($event.target).value)">
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
        <thead><tr><th style="width:46%">Loại hàng</th><th>Thuộc tính</th><th class="num w-sm">Số lượng</th><th style="width:40px"></th></tr></thead>
        <tbody>
          @for (d of dong(); track $index; let i = $index) {
            <tr>
              <td><app-pick [options]="lhOpts()" [value]="d.loaiHang" (valueChange)="setDong(i, { loaiHang: $event })" /></td>
              <td><input [value]="d.thuocTinh" placeholder="VD 40L · 150bar" (input)="setDong(i, { thuocTinh: $any($event.target).value })" /></td>
              <td><input class="num" type="number" min="0" [value]="d.soLuong" (input)="setDong(i, { soLuong: +$any($event.target).value || 0 })" /></td>
              <td><button type="button" class="icon-btn sm" aria-label="Xoá dòng" (click)="xoaDong(i)"><app-icon name="trash" [size]="16" /></button></td>
            </tr>
          }
        </tbody>
      </table>
      <button type="button" class="btn sm quiet" (click)="themDong()"><app-icon name="plus" [size]="16" /> Thêm dòng</button>
      @if (vuot().length) {
        <p class="note warn">Số lượng xuất vượt tồn tại kho đã chọn (vẫn cho ghi nhận): {{ vuot().join('; ') }}</p>
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="open.set(false)">Thôi</button>
        <button type="button" class="btn" (click)="xacNhan()">Xác nhận — sinh phiếu Xuất kho</button>
      </div>
    </app-modal>
  `,
})
export class HdbGiaoHang {
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

  protected readonly coTheGiao = computed(
    () => !this.khoa() && this.h().trangThai !== 'Báo giá' && this.store.canEdit('hdbGiaoHang', this.h().sale),
  );
  protected readonly phieus = computed(() =>
    this.store
      .phieuKho()
      .filter((p) => p.loai === 'Xuất' && p.hdId === this.h().id)
      .sort((a, b) => (a.ngay < b.ngay ? 1 : -1)),
  );
  protected readonly lhOpts = computed<PickOption[]>(() =>
    this.store
      .loaiHang()
      .filter((l) => l.dangDung)
      .map((l) => ({ value: l.id, label: l.ten, hint: `${l.nhom} · ${l.dvt}` })),
  );
  protected readonly vuot = computed(() => (this.open() ? this.store.vuotTon(this.kho(), this.dong().filter((d) => d.loaiHang && d.soLuong > 0)) : []));

  protected moTaDong(p: PhieuKho): string {
    return p.dong.map((d) => `${this.store.loaiHangTen(d.loaiHang)}${d.thuocTinh ? ' ' + d.thuocTinh : ''} × ${num(d.soLuong)}`).join('; ');
  }

  protected mo(): void {
    const id = this.h().id;
    const daGiao = new Map<string, number>();
    for (const p of this.phieus()) {
      if (p.trangThai !== 'Hiệu lực') continue;
      for (const d of p.dong) {
        const k = `${d.loaiHang}|${d.thuocTinh.trim()}`;
        daGiao.set(k, (daGiao.get(k) ?? 0) + d.soLuong);
      }
    }
    const goiY: DongNhap[] = [];
    for (const m of this.store.hopDongMua()) {
      if (m.hdbId !== id || m.trangThai === 'Huỷ') continue;
      for (const d of m.chiTiet) {
        const k = `${d.loaiHang}|${d.thongSo.trim()}`;
        const tru = Math.min(daGiao.get(k) ?? 0, d.soLuong);
        daGiao.set(k, (daGiao.get(k) ?? 0) - tru);
        const con = d.soLuong - tru;
        if (con > 0) goiY.push({ loaiHang: d.loaiHang, thuocTinh: d.thongSo.trim(), soLuong: con });
      }
    }
    this.goiY.set(goiY.length > 0);
    this.dong.set(goiY.length ? goiY : [{ loaiHang: '', thuocTinh: '', soLuong: 0 }]);
    this.ngay.set(todayIso());
    this.kho.set(this.store.khoDangDung()[0]?.id ?? '');
    this.ghiChu.set('');
    this.open.set(true);
  }

  protected setDong(i: number, p: Partial<DongNhap>): void {
    this.dong.update((arr) => arr.map((d, j) => (j === i ? { ...d, ...p } : d)));
  }
  protected themDong(): void {
    this.dong.update((arr) => [...arr, { loaiHang: '', thuocTinh: '', soLuong: 0 }]);
  }
  protected xoaDong(i: number): void {
    this.dong.update((arr) => arr.filter((_, j) => j !== i));
  }

  protected xacNhan(): void {
    if (!this.ngay()) {
      this.store.say('Chưa nhập Ngày giao');
      return;
    }
    const err = this.store.ghiNhanGiaoHang(this.h().id, {
      ngay: this.ngay(),
      kho: this.kho(),
      dong: this.dong().map((d) => ({ ...d, thuocTinh: d.thuocTinh.trim() })),
      ghiChu: this.ghiChu().trim() || undefined,
    });
    if (err) {
      this.store.say(err);
      return;
    }
    this.open.set(false);
    this.store.say('Đã ghi nhận giao hàng — đã sinh phiếu Xuất kho');
  }

  protected async huy(p: PhieuKho): Promise<void> {
    await guiXoa(this.confirm, this.store, 'PhieuKho', p.id, `phiếu XK ${p.soPhieu} (HĐ bán ${this.h().soHD})`);
  }
}
