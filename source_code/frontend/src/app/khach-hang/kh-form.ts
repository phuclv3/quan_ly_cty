import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { HINH_THUC_HD, KhachHang, LOAI_SP_KH, LY_DO_THUA, NGUON_KH, PHAN_LOAI_KH, TIEP_CAN, TINH_THANH } from '../core/models';
import { viDate } from '../core/util';
import { Modal, MoneyInput, PickGo, PickOption } from '../shared/ui-kit';
import { KetQuaMST, TraMst } from '../shared/tra-mst';
import { TT, ttNhan } from '../core/trang-thai';
import { CO_HOI_KH, loaiCoHoi } from './co-hoi-data';

const BLANK: KhachHang = { id: '', ten: '', mst: '', diaChi: '', nguoiLienHe: '', dienThoai: '', email: '', ghiChu: '' };
type F = Exclude<keyof KhachHang, 'id' | 'chamSoc'>;

/**
 * Popup Thêm / Sửa khách hàng (HDB-13) — dùng ở danh sách và màn chi tiết khách hàng.
 * khId: '' = thêm mới, mã KH = sửa; null = đóng. Lưu xong phát (daLuu) mã KH.
 */
@Component({
  selector: 'app-kh-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Modal, PickGo, MoneyInput, TraMst],
  styles: `
    .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; align-items: start; }
    @media (max-width: 860px) { .cols { grid-template-columns: minmax(0, 1fr); } }
    .col { display: grid; gap: 14px; }
    .cd { border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px 16px; background: var(--surf); }
    .cd.dn { background: #eef8f0; border-color: #cfe8d5; }
    .cd.lh { background: #eef4fc; border-color: #d3e1f4; }
    .cd.lh > h3 { color: #2c5d94; } .cd.lh > h3::before { background: #5b8fd1; }
    .cd.kd { background: #fff7e8; border-color: #f2dfb6; }
    .cd.kd > h3 { color: #8a5a00; } .cd.kd > h3::before { background: #e0911c; }
    .cd.gc { background: #f5f3fb; border-color: #dfdaf0; }
    .cd.gc > h3 { color: #5a45a3; } .cd.gc > h3::before { background: #7b5cc4; }
    .cd input:not([type=checkbox]), .cd select, .cd textarea { background-color: #fff; }
    .cd > h3 { margin: 0 0 12px; font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #0f5a2a; display: flex; align-items: center; gap: 8px; }
    .cd > h3::before { content: ''; width: 4px; height: 14px; border-radius: 2px; background: #19a05a; }
    .g { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
    .g .s2 { grid-column: span 2; } .g .s3 { grid-column: span 3; } .g .s4 { grid-column: span 4; } .g .s6 { grid-column: span 6; }
    @media (max-width: 560px) { .g .s2, .g .s3, .g .s4 { grid-column: span 6; } }
    .field > label, .field > .lbl { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
    .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip-row button { border: 1.5px solid var(--line-2); background: #fff; border-radius: 999px; padding: 5px 13px; font-size: 13px; font-weight: 600; color: var(--ink-2); cursor: pointer; }
    .chip-row button:hover { background: var(--surf-2); }
    .chip-row button.on { background: #0f5a2a; border-color: #0f5a2a; color: #fff; }
    .chip-row button.on.bad { background: #c0392b; border-color: #c0392b; }
    .chip-row button.on.ngung { background: #6b7280; border-color: #6b7280; }
    .sub-box { grid-column: 1 / -1; border-radius: 12px; padding: 10px 12px; background: #f1faf3; border: 1px solid #bfe0c8; display: grid; gap: 10px; }
    .sub-box.thua { background: #fdf0ee; border-color: #f0c4be; }
    .ro-line { font-size: 13px; color: var(--ink-2); padding-top: 8px; }
  `,
  template: `
    <app-modal #m [open]="khId() !== null" size="lg" [title]="f().id ? 'Sửa khách hàng ' + f().id : 'Thêm khách hàng'"
      [sub]="f().id ? f().ten : 'Khách hàng mới dùng được ngay khi lập HĐ bán'" [dirty]="dirty()" (closed)="closed.emit()">
      @let k = f();
      @if (err()) { <div class="note bad">{{ err() }}</div> }
      @if (trung(); as t) {
        <div class="note warn" style="display:grid">
          <span>Đã có khách hàng trùng {{ t.mst && t.mst === k.mst ? 'MST' : 'tên' }}: <b>{{ t.id }} — {{ t.ten }}</b> (MST {{ t.mst || '—' }}).</span>
          <div class="row">
            <a class="btn sm quiet" [routerLink]="['/khach-hang', t.id]" (click)="closed.emit()">Mở bản có sẵn</a>
            <button type="button" class="btn sm" (click)="luu(true)">Vẫn lưu</button>
          </div>
        </div>
      }

      <div class="cols">
        <div class="col">
          <section class="cd dn">
            <h3>Thông tin doanh nghiệp</h3>
            <div class="g">
              <div class="field s4">
                <label for="khf-ten">Tên công ty / đơn vị <span class="req">*</span></label>
                <input id="khf-ten" [value]="k.ten" (input)="set('ten', $any($event.target).value)" />
              </div>
              <div class="field s2">
                <label for="khf-vt">Tên viết tắt</label>
                <input id="khf-vt" placeholder="VD KCN-A" [value]="k.tenVietTat ?? ''" (input)="set('tenVietTat', $any($event.target).value || undefined)" />
              </div>
              <div class="field s3">
                <label for="khf-mst">Mã số thuế <span class="req">*</span></label>
                <input id="khf-mst" class="mono" required placeholder="10 số, VD 0101248141" [value]="k.mst" (input)="set('mst', $any($event.target).value.trim())" />
                <app-tra-mst [mst]="k.mst" (ketQua)="dienMST($event)" />
              </div>
              <div class="field s3">
                <label for="khf-tinh">Tỉnh / Thành phố</label>
                <app-pick-go inputId="khf-tinh" [options]="tinhOpts" [value]="k.tinh ?? ''" placeholder="Gõ tên tỉnh…" (valueChange)="set('tinh', $event || undefined)" />
              </div>
              <div class="field s6">
                <label for="khf-dc">Địa chỉ</label>
                <input id="khf-dc" [value]="k.diaChi" (input)="set('diaChi', $any($event.target).value)" />
              </div>
              <div class="field s6">
                <span class="lbl">Phân loại KH</span>
                <div class="chip-row" role="group" aria-label="Phân loại KH">
                  @for (o of PHAN_LOAI_KH; track o) { <button type="button" [class.on]="k.phanLoai === o" (click)="set('phanLoai', k.phanLoai === o ? undefined : o)">{{ o }}</button> }
                </div>
              </div>
              <div class="field s6">
                <span class="lbl">Trạng thái sử dụng</span>
                <div class="chip-row" role="group" aria-label="Trạng thái sử dụng">
                  <button type="button" [class.on]="k.trangThai !== TT.NGUNG" (click)="set('trangThai', TT.DANG_DUNG)">Đang dùng</button>
                  <button type="button" class="ngung" [class.on]="k.trangThai === TT.NGUNG" (click)="set('trangThai', TT.NGUNG)">Ngưng</button>
                </div>
                <span class="hint">Ngưng: không chọn được cho HĐ bán mới.</span>
              </div>
            </div>
          </section>

          <section class="cd lh">
            <h3>Người liên hệ</h3>
            <div class="g">
              <div class="field s3">
                <label for="khf-lh">Họ tên</label>
                <input id="khf-lh" [value]="k.nguoiLienHe" (input)="set('nguoiLienHe', $any($event.target).value)" />
              </div>
              <div class="field s3">
                <label for="khf-cv">Chức vụ</label>
                <input id="khf-cv" [value]="k.chucVu ?? ''" (input)="set('chucVu', $any($event.target).value || undefined)" />
              </div>
              <div class="field s3">
                <label for="khf-dt">SĐT / Zalo</label>
                <input id="khf-dt" inputmode="tel" [value]="k.dienThoai" (input)="set('dienThoai', $any($event.target).value)" />
              </div>
              <div class="field s3">
                <label for="khf-em">Email</label>
                <input id="khf-em" type="email" [value]="k.email" (input)="set('email', $any($event.target).value)" />
              </div>
            </div>
          </section>
        </div>

        <div class="col">
          <section class="cd kd">
            <h3>Theo dõi kinh doanh</h3>
            <div class="g">
              <div class="field s6">
                <span class="lbl">Trạng thái tiếp cận</span>
                <div class="chip-row" role="group" aria-label="Trạng thái tiếp cận">
                  @for (o of TIEP_CAN; track o) { <button type="button" [class.on]="o === (k.tiepCan ?? TT.CHUA_LIEN_HE)" (click)="set('tiepCan', o)">{{ ttNhan(o) }}</button> }
                </div>
              </div>
              <div class="field s6">
                <span class="lbl">Trạng thái cơ hội</span>
                <div class="chip-row" role="group" aria-label="Trạng thái cơ hội">
                  @for (o of CO_HOI_KH; track o.v) { <button type="button" [class.on]="o.v === loaiCoHoi(k.coHoi).v" [class.bad]="o.v === TT.HUY" (click)="set('coHoi', o.v)">{{ o.l }}</button> }
                </div>
              </div>
              @if (doiThua()) {
                <div class="sub-box thua">
                  <div class="field">
                    <label for="khf-ldt">Lý do thua <span class="req">*</span></label>
                    <select id="khf-ldt" (change)="lyDo.set($any($event.target).value)">
                      <option value="" [selected]="!lyDo()">— Chọn lý do —</option>
                      @for (o of LY_DO_THUA; track o) { <option [value]="o" [selected]="o === lyDo()">{{ o }}</option> }
                    </select>
                  </div>
                  @if (lyDo() === 'Khác') {
                    <div class="field">
                      <label for="khf-ldk">Ghi rõ lý do khác <span class="req">*</span></label>
                      <input id="khf-ldk" [value]="lyDoKhac()" (input)="lyDoKhac.set($any($event.target).value)" />
                    </div>
                  }
                </div>
              }
              @if (doiThang()) {
                <div class="sub-box">
                  <div class="field">
                    <label for="khf-ldw">Lý do thắng <span class="req">*</span></label>
                    <input id="khf-ldw" placeholder="VD Giá tốt, giao hàng nhanh" [value]="lyDo()" (input)="lyDo.set($any($event.target).value)" />
                  </div>
                </div>
              }
              <div class="field s3">
                <label for="khf-gt">Giá trị cơ hội (VNĐ, chưa VAT)</label>
                <app-money inputId="khf-gt" [value]="k.giaTriCoHoi ?? 0" (valueChange)="set('giaTriCoHoi', $event || undefined)" />
              </div>
              <div class="field s3">
                <label for="khf-pt">Người phụ trách</label>
                <app-pick-go inputId="khf-pt" [options]="saleOpts()" [value]="k.phuTrach ?? ''" placeholder="Chưa phân bổ — gõ tên Sale…"
                  [disabled]="!store.canEdit('phanBoKH')" (valueChange)="set('phuTrach', $event || undefined)" />
                @if (!store.canEdit('phanBoKH')) { <span class="hint">Cần quyền "Phân bổ data khách hàng" để đổi.</span> }
              </div>
              <div class="field s6">
                <span class="lbl">Nguồn KH</span>
                <div class="chip-row" role="group" aria-label="Nguồn KH">
                  @for (o of NGUON_KH; track o) { <button type="button" [class.on]="k.nguon === o" (click)="set('nguon', k.nguon === o ? undefined : o)">{{ o }}</button> }
                </div>
              </div>
              <div class="field s3">
                <label for="khf-sp">Loại hình sản phẩm</label>
                <select id="khf-sp" (change)="set('loaiSP', $any($event.target).value || undefined)">
                  <option value="">—</option>
                  @for (o of LOAI_SP_KH; track o) { <option [value]="o" [selected]="o === k.loaiSP">{{ o }}</option> }
                </select>
              </div>
              <div class="field s3">
                <span class="lbl">Hình thức HĐ</span>
                <div class="chip-row" role="group" aria-label="Hình thức HĐ">
                  @for (o of HINH_THUC_HD; track o) { <button type="button" [class.on]="k.hinhThucHD === o" (click)="set('hinhThucHD', k.hinhThucHD === o ? undefined : o)">{{ o }}</button> }
                </div>
              </div>
              <div class="field s3">
                <label for="khf-ntn">Ngày tiếp nhận</label>
                <input id="khf-ntn" type="date" [value]="k.ngayTiepNhan ?? ''" (input)="set('ngayTiepNhan', $any($event.target).value || undefined)" />
              </div>
              <div class="field s3">
                <span class="lbl">Trạng thái data</span>
                <div class="ro-line">{{ ttNhan(k.phuTrach ? TT.DA_PHAN_BO : TT.CHUA_PHAN_BO) }}{{ k.ngayPhanBo ? ' · ' + viDate(k.ngayPhanBo) : '' }}</div>
              </div>
            </div>
          </section>

          <section class="cd gc">
            <h3>Ghi chú</h3>
            <div class="field">
              <textarea id="khf-gc" rows="3" aria-label="Ghi chú" [value]="k.ghiChu" (input)="set('ghiChu', $any($event.target).value)"></textarea>
            </div>
          </section>
        </div>
      </div>

      <ng-container foot>
        <button type="button" class="btn quiet" (click)="m.tryClose()">Huỷ</button>
        <button type="button" class="btn" [disabled]="!dirty()" (click)="luu(false)">{{ f().id ? 'Lưu thay đổi' : 'Thêm khách hàng' }}</button>
      </ng-container>
    </app-modal>
  `,
})
export class KhForm {
  protected readonly TT = TT;
  protected readonly ttNhan = ttNhan;
  protected readonly store = inject(Store);
  private readonly m = viewChild<Modal>('m');
  protected readonly viDate = viDate;
  protected readonly LY_DO_THUA = LY_DO_THUA;
  protected readonly TIEP_CAN = TIEP_CAN;
  protected readonly CO_HOI_KH = CO_HOI_KH;
  protected readonly loaiCoHoi = loaiCoHoi;
  protected readonly PHAN_LOAI_KH = PHAN_LOAI_KH;
  protected readonly NGUON_KH = NGUON_KH;
  protected readonly LOAI_SP_KH = LOAI_SP_KH;
  protected readonly HINH_THUC_HD = HINH_THUC_HD;
  protected readonly tinhOpts: PickOption[] = TINH_THANH.map((t) => ({ value: t, label: t }));

  /** null = đóng · '' = thêm mới · mã KH = sửa. */
  readonly khId = input<string | null>(null);
  readonly closed = output<void>();
  readonly daLuu = output<string>();

  /** Bản gốc lúc mở (KH mới: Sale tạo thì mình phụ trách — Store.saveKhachHang cũng ép như vậy). */
  private readonly goc = computed<KhachHang>(() => {
    const id = this.khId();
    const k = id ? this.store.khById(id) : undefined;
    if (k) return structuredClone(k);
    return { ...BLANK, phuTrach: this.store.ownOnly('khachHang') ? (this.store.meId() ?? undefined) : undefined };
  });
  protected readonly f = linkedSignal(() => this.goc());
  protected readonly dirty = computed(() => this.khId() !== null && JSON.stringify(this.f()) !== JSON.stringify(this.goc()));
  /** Sửa KH đang có sang Thua (Huỷ) / Thắng (Ký hợp đồng) thì bắt nhập lý do; lý do ghi vào lịch sử chăm sóc. */
  protected readonly doiThua = computed(() => !!this.f().id && loaiCoHoi(this.f().coHoi).v === TT.HUY && loaiCoHoi(this.goc().coHoi).v !== TT.HUY);
  protected readonly doiThang = computed(() => !!this.f().id && loaiCoHoi(this.f().coHoi).v === TT.KY_HOP_DONG && loaiCoHoi(this.goc().coHoi).v !== TT.KY_HOP_DONG);
  protected readonly lyDo = linkedSignal(() => (this.khId(), ''));
  protected readonly lyDoKhac = linkedSignal(() => (this.khId(), ''));
  protected readonly saleOpts = computed<PickOption[]>(() => this.store.saleOpts(this.f().phuTrach));
  protected readonly trung = linkedSignal<KhachHang | null>(() => (this.khId(), null));
  protected readonly err = linkedSignal(() => (this.khId(), ''));

  protected set<K extends F>(k: K, v: KhachHang[K]): void {
    this.f.update((d) => ({ ...d, [k]: v }));
    this.trung.set(null);
    this.err.set('');
  }

  /** Tra MST xong: điền Tên, Địa chỉ theo Cục Thuế (ghi đè — đúng tên pháp lý trên hoá đơn). */
  protected dienMST(r: KetQuaMST): void {
    this.f.update((d) => ({ ...d, mst: r.mst, ten: r.ten, diaChi: r.diaChi || d.diaChi }));
    this.trung.set(null);
    this.err.set('');
  }

  protected luu(boQuaTrung: boolean): void {
    if (this.m()?.kt.hopLe() === false) return;
    const d = this.f();
    const draft: KhachHang = { ...d, ten: d.ten.trim(), mst: d.mst.trim() };
    if (!boQuaTrung) {
      const t = this.store.trungKhachHang(draft);
      if (t) {
        this.trung.set(t);
        return;
      }
    }
    const moi = !draft.id;
    let lyDoGhi = '';
    if (this.doiThua()) {
      if (!this.lyDo()) return this.err.set('Chọn lý do thua');
      if (this.lyDo() === 'Khác' && !this.lyDoKhac().trim()) return this.err.set('Ghi rõ lý do thua');
      lyDoGhi = 'Lý do thua: ' + (this.lyDo() === 'Khác' ? this.lyDoKhac().trim() : this.lyDo());
    } else if (this.doiThang()) {
      if (!this.lyDo().trim()) return this.err.set('Nhập lý do thắng');
      lyDoGhi = 'Lý do thắng: ' + this.lyDo().trim();
    }
    const err = this.store.saveKhachHang(draft);
    if (err) {
      this.err.set(err);
      return;
    }
    this.trung.set(null);
    if (lyDoGhi) this.store.ghiChamSoc(draft.id, lyDoGhi);
    this.store.say(moi ? 'Đã thêm khách hàng ' + draft.id : 'Đã lưu khách hàng');
    this.daLuu.emit(draft.id);
    this.closed.emit();
  }
}
