import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Store } from '../core/store';
import { KhachHang, NhaCungCap } from '../core/models';
import { Modal } from './ui-kit';
import { Icon } from './icon';
import { KetQuaMST, TraMst } from './tra-mst';

interface Nhap {
  ten: string;
  mst: string;
  diaChi: string;
  quocGia: string;
  nguoiLienHe: string;
  dienThoai: string;
  email: string;
}
const RONG: Nhap = { ten: '', mst: '', diaChi: '', quocGia: '', nguoiLienHe: '', dienThoai: '', email: '' };

/**
 * Nút + popup "Thêm nhanh" khách hàng / NCC ngay trong form hợp đồng — không phải rời form
 * sang Danh mục (mất bản nháp). Tạo xong trả mã mới qua (daTao) để form chọn luôn.
 */
@Component({
  selector: 'app-them-doi-tac',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Icon, TraMst],
  template: `
    @if (coQuyen()) {
      <button type="button" class="linkish hint" (click)="mo()"><app-icon name="plus" [size]="14" /> Thêm {{ nhan() }} mới</button>
    }
    <app-modal #mTDT [open]="open()" [title]="'Thêm ' + nhan() + ' mới'" size="md" [dirty]="!!f().ten || !!f().mst" (closed)="open.set(false)">
      @if (err()) { <div class="note bad">{{ err() }}</div> }
      @if (trung(); as t) {
        <div class="note warn">
          Đã có {{ nhan() }} trùng tên / MST: <b>{{ t.ten }}</b> ({{ t.id }}{{ t.mst ? ' · ' + t.mst : '' }}).
          <button type="button" class="linkish" (click)="chonCo(t.id)">Dùng {{ nhan() }} này</button>
        </div>
      }
      <div class="form-grid">
        <div class="field">
          <label for="tdt-mst">MST @if (loai() === 'kh') { <span class="req">*</span> }</label>
          <input id="tdt-mst" class="mono" placeholder="10 số" [required]="loai() === 'kh'" [value]="f().mst" (input)="set('mst', $any($event.target).value.trim())" />
          <app-tra-mst [mst]="f().mst" (ketQua)="dienMST($event)" />
        </div>
        <div class="field wide"><label for="tdt-ten">Tên <span class="req">*</span></label><input id="tdt-ten" [value]="f().ten" (input)="set('ten', $any($event.target).value)" /></div>
        @if (loai() === 'ncc') {
          <div class="field"><label for="tdt-qg">Quốc gia</label><input id="tdt-qg" [value]="f().quocGia" (input)="set('quocGia', $any($event.target).value)" /></div>
        }
        <div class="field wide"><label for="tdt-dc">Địa chỉ</label><input id="tdt-dc" [value]="f().diaChi" (input)="set('diaChi', $any($event.target).value)" /></div>
        <div class="field"><label for="tdt-lh">Người liên hệ</label><input id="tdt-lh" [value]="f().nguoiLienHe" (input)="set('nguoiLienHe', $any($event.target).value)" /></div>
        <div class="field"><label for="tdt-dt">Điện thoại</label><input id="tdt-dt" type="tel" [value]="f().dienThoai" (input)="set('dienThoai', $any($event.target).value)" /></div>
        <div class="field"><label for="tdt-em">Email</label><input id="tdt-em" type="email" [value]="f().email" (input)="set('email', $any($event.target).value)" /></div>
      </div>
      <div foot>
        <span style="flex:1"></span>
        <button type="button" class="btn quiet" (click)="open.set(false)">Huỷ</button>
        <button type="button" class="btn" (click)="luu()">Thêm &amp; chọn</button>
      </div>
    </app-modal>
  `,
})
export class ThemDoiTac {
  private readonly mTDT = viewChild<Modal>('mTDT');
  private readonly store = inject(Store);
  readonly loai = input<'kh' | 'ncc'>('kh');
  readonly daTao = output<string>();

  protected readonly open = signal(false);
  protected readonly f = signal<Nhap>(RONG);
  protected readonly err = signal('');
  protected readonly nhan = computed(() => (this.loai() === 'kh' ? 'khách hàng' : 'nhà cung cấp'));
  protected readonly coQuyen = computed(() => this.store.canEdit(this.loai() === 'kh' ? 'khachHang' : 'ncc'));
  protected readonly trung = computed(() => {
    const x = { ten: this.f().ten.trim(), mst: this.f().mst.trim() };
    if (!x.ten && !x.mst) return undefined;
    return this.loai() === 'kh' ? this.store.trungKhachHang(x) : this.store.trungNCC(x);
  });

  protected mo(): void {
    this.f.set(RONG);
    this.err.set('');
    this.open.set(true);
  }
  protected set(k: keyof Nhap, v: string): void {
    this.f.update((x) => ({ ...x, [k]: v }));
  }
  protected dienMST(r: KetQuaMST): void {
    this.f.update((x) => ({ ...x, mst: r.mst, ten: r.ten, diaChi: r.diaChi || x.diaChi }));
  }
  protected chonCo(id: string): void {
    this.open.set(false);
    this.daTao.emit(id);
  }
  protected luu(): void {
    if (this.mTDT()?.kt.hopLe() === false) return;
    const x = this.f();
    const chung = { id: '', ten: x.ten.trim(), mst: x.mst.trim(), diaChi: x.diaChi.trim(), nguoiLienHe: x.nguoiLienHe.trim(), dienThoai: x.dienThoai.trim(), email: x.email.trim(), ghiChu: '' };
    const draft: KhachHang | NhaCungCap = this.loai() === 'kh' ? chung : { ...chung, quocGia: x.quocGia.trim() };
    const e = this.loai() === 'kh' ? this.store.saveKhachHang(draft as KhachHang) : this.store.saveNCC(draft as NhaCungCap);
    if (e) {
      this.err.set(e);
      return;
    }
    this.store.say(`Đã thêm ${this.nhan()} ${draft.ten}`);
    this.open.set(false);
    this.daTao.emit(draft.id);
  }
}
