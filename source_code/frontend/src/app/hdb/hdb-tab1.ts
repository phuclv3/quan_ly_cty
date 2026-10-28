import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { HopDongBan } from '../core/models';
import { PickGo, PickOption } from '../shared/ui-kit';
import { ThemDoiTac } from '../shared/them-doi-tac';
import { KetQuaMST, TraMst } from '../shared/tra-mst';
import { ngayHieuLucTuDong } from '../core/calc';
import { viDate } from '../core/util';

/** HDB-02 — Tab 1 Thông tin chung. */
@Component({
  selector: 'app-hdb-tab1',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PickGo, ThemDoiTac, TraMst],
  template: `
    <section class="card form-card">
      <fieldset class="form-sec">
      <legend>Thông tin hợp đồng</legend>
      <div class="form-grid">
        <div class="field">
          <label for="hdb-so">Số HĐ bán @if (f().trangThai !== TT.BAO_GIA) { <span class="req">*</span> }</label>
          <input id="hdb-so" [value]="f().soHD" [disabled]="!edit() || khoaDinhDanh()" [placeholder]="f().trangThai === TT.BAO_GIA ? 'Chưa ký thì để trống' : 'Nhập số hợp đồng'" (input)="set('soHD', $any($event.target).value)" />
          <!-- F-08: Báo giá chưa cần Số HĐ; bắt buộc khi chuyển Hiệu lực; từ Hiệu lực khoá Số HĐ + Khách hàng. -->
          @if (khoaDinhDanh()) {
            <span class="hint">HĐ đã Hiệu lực — Số HĐ và Khách hàng không sửa được nữa.</span>
          } @else if (f().trangThai === TT.BAO_GIA) {
            <span class="hint">Đang ở Báo giá nên có thể để trống. Phải nhập trước khi chuyển sang <b>Hiệu lực</b> (sau đó không sửa được).</span>
          }
        </div>
        <div class="field">
          <label for="hdb-ky">Ngày ký</label>
          <input id="hdb-ky" type="date" [value]="f().ngayKy ?? ''" [disabled]="!edit()" (input)="set('ngayKy', $any($event.target).value || undefined)" />
        </div>
        <div class="field">
          <span class="lbl">Ngày hiệu lực <small class="muted">(tự điền)</small></span>
          <div class="ro" [title]="f().coTamUng ? 'Có tạm ứng: = ngày thực thu đợt 1' : 'Không tạm ứng: = Ngày ký'">{{ f().ngayHieuLuc ? viDate(f().ngayHieuLuc) : '—' }}</div>
          <label class="check-row"><input type="checkbox" [checked]="!!f().coTamUng" [disabled]="!edit()" (change)="set('coTamUng', $any($event.target).checked)" /> HĐ có tạm ứng</label>
          <span class="hint">
            @if (f().coTamUng) { = Ngày thực thu đợt 1 (tạm ứng){{ f().ngayHieuLuc ? '' : ' — chưa thu' }} } @else { = Ngày ký }
          </span>
          @if (f().ngayKy && f().ngayHieuLuc && f().ngayHieuLuc! < f().ngayKy!) { <span class="err">Ngày thu tạm ứng trước Ngày ký — kiểm tra lại</span> }
        </div>
        <div class="field">
          <label for="hdb-sale">Sale phụ trách</label>
          <app-pick-go inputId="hdb-sale" [options]="saleOpts()" [value]="f().sale" [disabled]="!edit() || store.level('hdb') === 'own'" placeholder="Gõ tên hoặc email Sale…" (valueChange)="set('sale', $event)" />
          @if (edit() && store.level('hdb') === 'own') { <span class="hint">Sale chỉ lập / sửa HĐ của chính mình.</span> }
        </div>
      </div>
      </fieldset>

      <fieldset class="form-sec">
      <legend>Khách hàng</legend>
      <div class="form-grid">
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
          <label for="hdb-mst">MST <span class="req">*</span></label>
          @if (suaMst()) {
            <input id="hdb-mst" class="mono" placeholder="10 số" [value]="f().mst" (input)="set('mst', $any($event.target).value.trim())" />
            <app-tra-mst [mst]="f().mst" (ketQua)="dienMST($event)" />
          } @else {
            <div class="ro">{{ f().mst || '—' }}</div>
          }
          @if (edit() && f().maKH && !khMst()) { <span class="hint">KH chưa có MST — nhập ở đây, lưu HĐ sẽ cập nhật luôn danh mục khách hàng.</span> }
        </div>
        <div class="field wide">
          <label for="hdb-dc">Địa chỉ (thuế)</label>
          @if (suaMst()) {
            <input id="hdb-dc" [value]="f().diaChi" (input)="set('diaChi', $any($event.target).value)" />
          } @else {
            <div class="ro">{{ f().diaChi || '—' }}</div>
          }
        </div>
      </div>
      </fieldset>

      <fieldset class="form-sec">
      <legend>Ghi chú</legend>
      <div class="form-grid">
        <div class="field full">
          <label for="hdb-gc">Ghi chú</label>
          <textarea id="hdb-gc" rows="2" [value]="f().ghiChu" [disabled]="!edit()" (input)="set('ghiChu', $any($event.target).value)"></textarea>
        </div>
      </div>
      </fieldset>
    </section>
  `,
})
export class HdbTab1 {
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  readonly f = model.required<HopDongBan>({ alias: 'draft' });
  readonly edit = input(false);
  /** F-08: từ Hiệu lực khoá Số HĐ và Khách hàng. */
  readonly khoaDinhDanh = input(false);

  protected readonly khOpts = computed<PickOption[]>(() =>
    this.store
      .khachHang()
      // Chỉ khách Đang dùng; HĐ cũ đã gắn khách nay Ngưng vẫn giữ để hiện đúng tên (F-09).
      .filter((k) => k.trangThai !== TT.NGUNG || k.id === this.f().maKH)
      .map((k) => ({
        value: k.id,
        label: k.ten,
        hint: [k.mst ? 'MST ' + k.mst : k.id, k.tinh, k.phuTrach ? this.store.userName(k.phuTrach) : '', k.trangThai === TT.NGUNG ? ttNhan(TT.NGUNG) : '']
          .filter(Boolean)
          .join(' · '),
      })),
  );
  /** Danh mục Sale = Tài khoản có quyền HĐ bán (Store.saleOpts). */
  protected readonly saleOpts = computed<PickOption[]>(() => this.store.saleOpts(this.f().sale));
  protected readonly lechDM = computed(() => {
    const h = this.f();
    const k = this.store.khById(h.maKH);
    return !!k && (k.ten !== h.tenKH || k.mst !== h.mst || k.diaChi !== h.diaChi);
  });

  protected readonly viDate = viDate;
  /** MST / địa chỉ sửa được khi chưa khoá định danh (Báo giá); mặc định lấy theo khách hàng. */
  protected readonly suaMst = computed(() => this.edit() && !this.khoaDinhDanh() && !!this.f().maKH);
  protected readonly khMst = computed(() => !!this.store.khById(this.f().maKH)?.mst?.trim());

  protected set<K extends keyof HopDongBan>(k: K, v: HopDongBan[K]): void {
    this.f.update((h) => {
      const next = { ...h, [k]: v };
      // Ngày hiệu lực không nhập tay: theo tạm ứng (ngày thu đợt 1) hoặc Ngày ký.
      if (k === 'ngayKy' || k === 'coTamUng') next.ngayHieuLuc = ngayHieuLucTuDong(next);
      return next;
    });
  }
  protected dienMST(r: KetQuaMST): void {
    this.f.update((h) => ({ ...h, mst: r.mst, diaChi: r.diaChi || h.diaChi }));
  }

  /** Chọn khách hàng → chép Tên / MST / Địa chỉ làm bản sao tại thời điểm ký (D-24). */
  protected chonKH(id: string): void {
    const k = this.store.khById(id);
    this.f.update((h) => ({ ...h, maKH: id, tenKH: k?.ten ?? '', mst: k?.mst ?? '', diaChi: k?.diaChi ?? '' }));
  }
}
