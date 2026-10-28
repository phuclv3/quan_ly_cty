import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, viewChild } from '@angular/core';
import { Store } from '../core/store';
import { CoHoiKH, GIAI_DOAN_CH, KhachHang, LOAI_SP_KH, LY_DO_THUA } from '../core/models';
import { todayIso } from '../core/util';
import { Modal, MoneyInput, PickGo, PickOption } from '../shared/ui-kit';
import { Confirm } from '../shared/confirm';
import { TT } from '../core/trang-thai';
import { layCoHoi, maCoHoiMoi } from './co-hoi-data';

const BLANK: CoHoiKH = { id: '', huongBan: '', giaTri: 0, giaiDoan: 'Mới' };

/**
 * Popup Tạo / Sửa cơ hội. ma: '' = tạo mới, mã CH = sửa, null = đóng.
 * Cơ hội lưu cùng bản ghi khách hàng (store.saveKhachHang) nên cần quyền sửa khách đó.
 */
@Component({
  selector: 'app-co-hoi-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, PickGo, MoneyInput],
  template: `
    <app-modal #m [open]="ma() !== null" size="md" [title]="f().id ? 'Sửa cơ hội ' + f().id : 'Tạo cơ hội'"
      [sub]="f().id ? '' : 'Cơ hội gắn với một khách hàng'" [dirty]="dirty()" (closed)="closed.emit()">
      @let c = f();
      @if (err()) { <div class="note bad">{{ err() }}</div> }
      <div class="form-grid cols-3">
        <div class="field span-3">
          <label for="chf-kh">Khách hàng <span class="req">*</span></label>
          <app-pick-go inputId="chf-kh" [options]="khOpts()" [value]="khId()" placeholder="Gõ tên khách hàng…" [disabled]="!!c.id" (valueChange)="khId.set($event)" />
        </div>
        <div class="field span-3">
          <label for="chf-hb">Hướng bán <span class="req">*</span></label>
          <input id="chf-hb" placeholder="VD Khí chuẩn NO/SO2 bổ sung Q4" [value]="c.huongBan" (input)="set('huongBan', $any($event.target).value)" />
        </div>
        <div class="field">
          <label for="chf-gt">Giá trị (VNĐ, chưa VAT)</label>
          <app-money inputId="chf-gt" [value]="c.giaTri" (valueChange)="set('giaTri', $event)" />
        </div>
        <div class="field">
          <label for="chf-gd">Giai đoạn</label>
          <select id="chf-gd" (change)="doiGiaiDoan($any($event.target).value)">
            @for (g of GIAI_DOAN; track g) { <option [value]="g" [selected]="g === c.giaiDoan">{{ g }}</option> }
          </select>
        </div>
        <div class="field">
          <label for="chf-nh">Nhóm hàng</label>
          <select id="chf-nh" (change)="set('nhomHang', $any($event.target).value || undefined)">
            <option value="">—</option>
            @for (o of LOAI_SP; track o) { <option [value]="o" [selected]="o === c.nhomHang">{{ o }}</option> }
          </select>
        </div>
        @if (c.giaiDoan === 'Đã báo giá') {
          <div class="field">
            <label for="chf-nbg">Ngày báo giá</label>
            <input id="chf-nbg" type="date" [value]="c.ngayBaoGia ?? ''" (input)="set('ngayBaoGia', $any($event.target).value || undefined)" />
          </div>
        }
        @if (c.giaiDoan === 'Thắng' || c.giaiDoan === 'Thua') {
          <div class="field">
            <label for="chf-nc">Ngày chốt <span class="req">*</span></label>
            <input id="chf-nc" type="date" [value]="c.ngayChot ?? ''" (input)="set('ngayChot', $any($event.target).value || undefined)" />
          </div>
        }
        @if (c.giaiDoan === 'Thua') {
          <div class="field">
            <label for="chf-ld">Lý do thua <span class="req">*</span></label>
            <select id="chf-ld" (change)="set('lyDoThua', $any($event.target).value || undefined)">
              <option value="">—</option>
              @for (o of LY_DO; track o) { <option [value]="o" [selected]="o === c.lyDoThua">{{ o }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="chf-tt">Tái tiếp cận vào ngày</label>
            <input id="chf-tt" type="date" [value]="c.ngayTaiTiepCan ?? ''" (input)="set('ngayTaiTiepCan', $any($event.target).value || undefined)" />
          </div>
        }
        <div class="field span-2">
          <label for="chf-tuong">Tương tác tiếp theo</label>
          <input id="chf-tuong" placeholder="VD Gọi chốt giá" [value]="c.tuongTacTiep ?? ''" (input)="set('tuongTacTiep', $any($event.target).value || undefined)" />
        </div>
        <div class="field">
          <label for="chf-ntt">Ngày tương tác</label>
          <input id="chf-ntt" type="date" [value]="c.ngayTuongTac ?? ''" (input)="set('ngayTuongTac', $any($event.target).value || undefined)" />
        </div>
      </div>
      <ng-container foot>
        @if (c.id) { <button type="button" class="btn danger" style="margin-right:auto" (click)="xoa()">Xoá</button> }
        <button type="button" class="btn quiet" (click)="m.tryClose()">Huỷ</button>
        <button type="button" class="btn" [disabled]="!dirty()" (click)="luu()">Lưu</button>
      </ng-container>
    </app-modal>
  `,
})
export class CoHoiForm {
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  private readonly m = viewChild<Modal>('m');
  protected readonly GIAI_DOAN = GIAI_DOAN_CH;
  protected readonly LOAI_SP = LOAI_SP_KH;
  protected readonly LY_DO = LY_DO_THUA;

  /** null = đóng · '' = tạo mới · mã CH = sửa. */
  readonly ma = input<string | null>(null);
  readonly closed = output<void>();

  private readonly goc = computed<{ c: CoHoiKH; kh: string }>(() => {
    const ma = this.ma();
    const r = ma ? layCoHoi(this.store.khachHang()).find((x) => x.c.id === ma) : undefined;
    if (r) return { c: structuredClone(r.c), kh: r.k.id };
    return { c: { ...BLANK, ngayTao: todayIso() }, kh: '' };
  });
  protected readonly f = linkedSignal(() => this.goc().c);
  protected readonly khId = linkedSignal(() => this.goc().kh);
  protected readonly err = linkedSignal(() => (this.ma(), ''));
  protected readonly dirty = computed(
    () => this.ma() !== null && (JSON.stringify(this.f()) !== JSON.stringify(this.goc().c) || this.khId() !== this.goc().kh),
  );
  protected readonly khOpts = computed<PickOption[]>(() =>
    this.store
      .khachHang()
      .filter((k) => this.store.canEditKH(k) && (k.trangThai !== TT.NGUNG || k.id === this.khId()))
      .map((k) => ({ value: k.id, label: k.ten, hint: k.tenVietTat ?? k.id })),
  );

  protected set<K extends keyof CoHoiKH>(k: K, v: CoHoiKH[K]): void {
    this.f.update((d) => ({ ...d, [k]: v }));
    this.err.set('');
  }
  protected doiGiaiDoan(g: CoHoiKH['giaiDoan']): void {
    this.f.update((d) => ({
      ...d,
      giaiDoan: g,
      ngayBaoGia: g === 'Đã báo giá' ? (d.ngayBaoGia ?? todayIso()) : d.ngayBaoGia,
      ngayChot: g === 'Thắng' || g === 'Thua' ? (d.ngayChot ?? todayIso()) : undefined,
      lyDoThua: g === 'Thua' ? d.lyDoThua : undefined,
      ngayTaiTiepCan: g === 'Thua' ? d.ngayTaiTiepCan : undefined,
    }));
    this.err.set('');
  }

  private ghi(k: KhachHang, ds: CoHoiKH[], thongBao: string): void {
    const e = this.store.saveKhachHang({ ...structuredClone(k), dsCoHoi: ds });
    if (e) return this.err.set(e);
    this.store.say(thongBao);
    this.closed.emit();
  }

  protected luu(): void {
    if (this.m()?.kt.hopLe() === false) return;
    const c = { ...this.f(), huongBan: this.f().huongBan.trim() };
    const k = this.store.khById(this.khId());
    if (!k) return this.err.set('Chưa chọn khách hàng');
    if (!c.huongBan) return this.err.set('Chưa nhập hướng bán');
    if (c.giaiDoan === 'Thua' && !c.lyDoThua) return this.err.set('Chọn lý do thua');
    if ((c.giaiDoan === 'Thắng' || c.giaiDoan === 'Thua') && !c.ngayChot) return this.err.set('Chọn ngày chốt');
    const ds = [...(k.dsCoHoi ?? [])];
    if (c.id) ds.splice(ds.findIndex((x) => x.id === c.id), 1, c);
    else ds.push({ ...c, id: maCoHoiMoi(this.store.khachHang()) });
    this.ghi(k, ds, c.id ? 'Đã lưu cơ hội' : 'Đã tạo cơ hội');
  }

  protected async xoa(): Promise<void> {
    const id = this.f().id;
    const k = this.store.khById(this.khId());
    if (!k) return;
    const ok = await this.confirm.ask({
      title: `Xoá cơ hội ${id}?`,
      message: 'Cơ hội bị xoá hẳn khỏi khách hàng. Nếu muốn giữ lịch sử, chuyển sang "Thua" kèm lý do.',
      ok: 'Xoá',
    });
    if (ok) this.ghi(k, (k.dsCoHoi ?? []).filter((x) => x.id !== id), 'Đã xoá cơ hội');
  }
}
