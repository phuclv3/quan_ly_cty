import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { Store } from '../core/store';
import { atLeast } from '../core/perm';
import { HopDongBan } from '../core/models';
import { Pick, PickGo, PickOption } from '../shared/ui-kit';
import { ThemDoiTac } from '../shared/them-doi-tac';

/** HDB-02 — Tab 1 Thông tin chung. */
@Component({
  selector: 'app-hdb-tab1',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pick, PickGo, ThemDoiTac],
  template: `
    <section class="card">
      <h2 class="section-title">Thông tin chung</h2>
      <div class="form-grid">
        <div class="field">
          <label for="hdb-so">Số HĐ bán <span class="req">* từ Hiệu lực</span></label>
          <input id="hdb-so" [value]="f().soHD" [disabled]="!edit() || khoaDinhDanh()" placeholder="Báo giá có thể để trống" (input)="set('soHD', $any($event.target).value)" />
          @if (khoaDinhDanh()) { <span class="hint">Khoá từ "Hiệu lực".</span> }
        </div>
        <div class="field">
          <label for="hdb-ky">Ngày ký</label>
          <input id="hdb-ky" type="date" [value]="f().ngayKy ?? ''" [disabled]="!edit()" (input)="set('ngayKy', $any($event.target).value || undefined)" />
        </div>
        <div class="field">
          <label for="hdb-hl">Ngày hiệu lực</label>
          <input id="hdb-hl" type="date" [value]="f().ngayHieuLuc ?? ''" [min]="f().ngayKy ?? ''" [disabled]="!edit()" (input)="set('ngayHieuLuc', $any($event.target).value || undefined)" />
          @if (f().ngayKy && f().ngayHieuLuc && f().ngayHieuLuc! < f().ngayKy!) { <span class="err">Ngày hiệu lực phải ≥ Ngày ký</span> }
        </div>
        <div class="field">
          <label for="hdb-sale">Sale phụ trách</label>
          <app-pick inputId="hdb-sale" [options]="saleOpts()" [value]="f().sale" [disabled]="!edit() || store.level('hdb') === 'own'" (valueChange)="set('sale', $event)" />
        </div>
        <div class="field wide">
          <label for="hdb-kh">Khách hàng <span class="req">*</span></label>
          <app-pick-go inputId="hdb-kh" [options]="khOpts()" [value]="f().maKH" [disabled]="!edit() || khoaDinhDanh()" placeholder="Gõ tên hoặc MST khách hàng…" (valueChange)="chonKH($event)" />
          @if (edit() && !khoaDinhDanh()) { <app-them-doi-tac loai="kh" (daTao)="chonKH($event)" /> }
          @if (lechDM()) { <span class="hint">Danh mục đã đổi so với bản sao lúc ký — HĐ giữ thông tin cũ. <button type="button" class="linkish" [disabled]="!edit()" (click)="chonKH(f().maKH)">Cập nhật theo danh mục</button></span> }
        </div>
        <div class="field wide">
          <span class="lbl">Tên khách hàng (bản sao)</span>
          <div class="ro multi">{{ f().tenKH || '—' }}</div>
        </div>
        <div class="field">
          <span class="lbl">MST</span>
          <div class="ro">{{ f().mst || '—' }}</div>
        </div>
        <div class="field wide">
          <span class="lbl">Địa chỉ</span>
          <div class="ro">{{ f().diaChi || '—' }}</div>
        </div>
        <div class="field full">
          <label for="hdb-gc">Ghi chú</label>
          <textarea id="hdb-gc" rows="2" [value]="f().ghiChu" [disabled]="!edit()" (input)="set('ghiChu', $any($event.target).value)"></textarea>
        </div>
      </div>
    </section>
  `,
})
export class HdbTab1 {
  protected readonly store = inject(Store);
  readonly f = model.required<HopDongBan>({ alias: 'draft' });
  readonly edit = input(false);
  /** F-08: từ Hiệu lực khoá Số HĐ và Khách hàng. */
  readonly khoaDinhDanh = input(false);

  protected readonly khOpts = computed<PickOption[]>(() =>
    this.store
      .khachHang()
      // Chỉ khách Đang dùng; HĐ cũ đã gắn khách nay Ngưng vẫn giữ để hiện đúng tên (F-09).
      .filter((k) => k.trangThai !== 'Ngưng' || k.id === this.f().maKH)
      .map((k) => ({
        value: k.id,
        label: k.ten,
        hint: [k.mst ? 'MST ' + k.mst : k.id, k.tinh, k.phuTrach ? this.store.userName(k.phuTrach) : '', k.trangThai === 'Ngưng' ? 'Ngưng' : '']
          .filter(Boolean)
          .join(' · '),
      })),
  );
  protected readonly saleOpts = computed<PickOption[]>(() =>
    this.store
      .taiKhoan()
      .filter(
        (t) =>
          t.id === this.f().sale ||
          (t.trangThai === 'Hoạt động' && atLeast(this.store.levelOfUser(t, 'hdb'), 'own')),
      )
      .map((t) => ({ value: t.id, label: t.hoTen, hint: t.email })),
  );
  protected readonly lechDM = computed(() => {
    const h = this.f();
    const k = this.store.khById(h.maKH);
    return !!k && (k.ten !== h.tenKH || k.mst !== h.mst || k.diaChi !== h.diaChi);
  });

  protected set<K extends keyof HopDongBan>(k: K, v: HopDongBan[K]): void {
    this.f.update((h) => ({ ...h, [k]: v }));
  }

  /** Chọn khách hàng → chép Tên / MST / Địa chỉ làm bản sao tại thời điểm ký (D-24). */
  protected chonKH(id: string): void {
    const k = this.store.khById(id);
    this.f.update((h) => ({ ...h, maKH: id, tenKH: k?.ten ?? '', mst: k?.mst ?? '', diaChi: k?.diaChi ?? '' }));
  }
}
