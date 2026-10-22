import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { CO_HOI, HINH_THUC_HD, KhachHang, LOAI_SP_KH, NGUON_KH, PHAN_LOAI_KH, TIEP_CAN, TINH_THANH } from '../core/models';
import { viDate } from '../core/util';
import { Modal, MoneyInput, PickGo, PickOption } from '../shared/ui-kit';
import { KetQuaMST, TraMst } from '../shared/tra-mst';

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
    h3.nhom { margin: 4px 0 10px; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--brand); }
    h3.nhom:not(:first-of-type) { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--line); }
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

      <div>
        <h3 class="nhom">Thông tin doanh nghiệp</h3>
        <div class="form-grid cols-3">
          <div class="field span-2">
            <label for="khf-ten">Tên công ty / đơn vị <span class="req">*</span></label>
            <input id="khf-ten" [value]="k.ten" (input)="set('ten', $any($event.target).value)" />
          </div>
          <div class="field">
            <label for="khf-mst">Mã số thuế <span class="req">*</span></label>
            <input id="khf-mst" class="mono" required placeholder="10 số, VD 0101248141" [value]="k.mst" (input)="set('mst', $any($event.target).value.trim())" />
            <app-tra-mst [mst]="k.mst" (ketQua)="dienMST($event)" />
          </div>
          <div class="field span-2">
            <label for="khf-dc">Địa chỉ</label>
            <input id="khf-dc" [value]="k.diaChi" (input)="set('diaChi', $any($event.target).value)" />
          </div>
          <div class="field">
            <label for="khf-tinh">Tỉnh / Thành phố</label>
            <app-pick-go inputId="khf-tinh" [options]="tinhOpts" [value]="k.tinh ?? ''" placeholder="Gõ tên tỉnh…" (valueChange)="set('tinh', $event || undefined)" />
          </div>
          <div class="field">
            <label for="khf-pl">Phân loại KH</label>
            <select id="khf-pl" (change)="set('phanLoai', $any($event.target).value || undefined)">
              <option value="">—</option>
              @for (o of PHAN_LOAI_KH; track o) { <option [value]="o" [selected]="o === k.phanLoai">{{ o }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="khf-tt">Trạng thái</label>
            <select id="khf-tt" (change)="set('trangThai', $any($event.target).value)">
              <option value="Đang dùng" [selected]="k.trangThai !== 'Ngưng'">Đang dùng</option>
              <option value="Ngưng" [selected]="k.trangThai === 'Ngưng'">Ngưng</option>
            </select>
            <span class="hint">Ngưng: không chọn được cho HĐ bán mới.</span>
          </div>
        </div>

        <h3 class="nhom">Người liên hệ</h3>
        <div class="form-grid cols-3">
          <div class="field">
            <label for="khf-lh">Người liên hệ</label>
            <input id="khf-lh" [value]="k.nguoiLienHe" (input)="set('nguoiLienHe', $any($event.target).value)" />
          </div>
          <div class="field">
            <label for="khf-cv">Chức vụ</label>
            <input id="khf-cv" [value]="k.chucVu ?? ''" (input)="set('chucVu', $any($event.target).value || undefined)" />
          </div>
          <div class="field">
            <label for="khf-em">Email</label>
            <input id="khf-em" type="email" [value]="k.email" (input)="set('email', $any($event.target).value)" />
          </div>
          <div class="field span-3">
            <label for="khf-dt">SĐT / Zalo</label>
            <input id="khf-dt" [value]="k.dienThoai" (input)="set('dienThoai', $any($event.target).value)" />
          </div>
        </div>

        <h3 class="nhom">Theo dõi kinh doanh</h3>
        <div class="form-grid cols-3">
          <div class="field">
            <label for="khf-tc">Trạng thái tiếp cận</label>
            <select id="khf-tc" (change)="set('tiepCan', $any($event.target).value)">
              @for (o of TIEP_CAN; track o) { <option [value]="o" [selected]="o === (k.tiepCan ?? 'Chưa liên hệ')">{{ o }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="khf-ch">Trạng thái cơ hội</label>
            <select id="khf-ch" (change)="set('coHoi', $any($event.target).value)">
              @for (o of CO_HOI; track o) { <option [value]="o" [selected]="o === (k.coHoi ?? 'Chưa tiếp cận')">{{ o }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="khf-gt">Giá trị cơ hội (VNĐ, chưa VAT)</label>
            <app-money inputId="khf-gt" [value]="k.giaTriCoHoi ?? 0" (valueChange)="set('giaTriCoHoi', $event || undefined)" />
          </div>
          <div class="field">
            <label for="khf-ng">Nguồn KH</label>
            <select id="khf-ng" (change)="set('nguon', $any($event.target).value || undefined)">
              <option value="">—</option>
              @for (o of NGUON_KH; track o) { <option [value]="o" [selected]="o === k.nguon">{{ o }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="khf-sp">Loại hình sản phẩm</label>
            <select id="khf-sp" (change)="set('loaiSP', $any($event.target).value || undefined)">
              <option value="">—</option>
              @for (o of LOAI_SP_KH; track o) { <option [value]="o" [selected]="o === k.loaiSP">{{ o }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="khf-ht">Hình thức HĐ</label>
            <select id="khf-ht" (change)="set('hinhThucHD', $any($event.target).value || undefined)">
              <option value="">—</option>
              @for (o of HINH_THUC_HD; track o) { <option [value]="o" [selected]="o === k.hinhThucHD">{{ o }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="khf-pt">Người phụ trách</label>
            <app-pick-go inputId="khf-pt" [options]="saleOpts()" [value]="k.phuTrach ?? ''" placeholder="Chưa phân bổ — gõ tên Sale…"
              [disabled]="!store.canEdit('phanBoKH')" (valueChange)="set('phuTrach', $event || undefined)" />
            @if (!store.canEdit('phanBoKH')) { <span class="hint">Cần quyền "Phân bổ data khách hàng" để đổi.</span> }
          </div>
          <div class="field">
            <label for="khf-ntn">Ngày tiếp nhận</label>
            <input id="khf-ntn" type="date" [value]="k.ngayTiepNhan ?? ''" (input)="set('ngayTiepNhan', $any($event.target).value || undefined)" />
          </div>
          <div class="field">
            <span class="lbl">Trạng thái data</span>
            <div class="ro">{{ k.phuTrach ? 'Đã phân bổ' : 'Chưa phân bổ' }}{{ k.ngayPhanBo ? ' · ' + viDate(k.ngayPhanBo) : '' }}</div>
          </div>
          <div class="field span-3">
            <label for="khf-gc">Ghi chú</label>
            <textarea id="khf-gc" rows="2" [value]="k.ghiChu" (input)="set('ghiChu', $any($event.target).value)"></textarea>
          </div>
        </div>
      </div>

      <ng-container foot>
        <button type="button" class="btn quiet" (click)="m.tryClose()">Huỷ</button>
        <button type="button" class="btn" [disabled]="!dirty()" (click)="luu(false)">Lưu</button>
      </ng-container>
    </app-modal>
  `,
})
export class KhForm {
  protected readonly store = inject(Store);
  private readonly m = viewChild<Modal>('m');
  protected readonly viDate = viDate;
  protected readonly TIEP_CAN = TIEP_CAN;
  protected readonly CO_HOI = CO_HOI;
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
    const err = this.store.saveKhachHang(draft);
    if (err) {
      this.err.set(err);
      return;
    }
    this.trung.set(null);
    this.store.say(moi ? 'Đã thêm khách hàng ' + draft.id : 'Đã lưu khách hàng');
    this.daLuu.emit(draft.id);
    this.closed.emit();
  }
}
