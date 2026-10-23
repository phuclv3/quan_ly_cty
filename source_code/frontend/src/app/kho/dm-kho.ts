import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { KHO_CHUYEN_THANG, Kho } from '../core/models';
import { Store } from '../core/store';
import { TT } from '../core/trang-thai';
import { dirtyOf } from '../shared/unsaved';
import { Confirm } from '../shared/confirm';
import { guiXoa, guiXoaNhieu } from '../shared/ho-so';
import { ChonNhieu } from '../shared/chon-nhieu';
import { Modal, TrangThai } from '../shared/ui-kit';

/** KHO-01: danh mục Kho / Vị trí. */
import { ImportDm } from '../shared/import-dm';
@Component({
  selector: 'app-kho-dm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `.bulk { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 12px; }`,
  imports: [Modal, TrangThai, ImportDm],
  template: `
    <div class="section-title">
      <span class="sub">{{ rows().length }} vị trí kho</span>
      @if (edit()) { <span class="btn-row"><app-import-dm loai="kho" /><button type="button" class="btn" (click)="moi()">+ Thêm kho</button></span> }
    </div>
    @if (chonDuoc() && cn.chon().size) {
      <div class="note info bulk">
        <b>Đã chọn {{ cn.chon().size }} vị trí kho</b>
        <button type="button" class="btn sm danger" (click)="xoaNhieu()">Xoá {{ cn.chon().size }} đã chọn</button>
        <button type="button" class="btn sm quiet" (click)="cn.xoa()">Bỏ chọn</button>
      </div>
    }
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead><tr>@if (chonDuoc()) { <th style="width:36px"><input type="checkbox" aria-label="Chọn cả trang" [checked]="cn.du(idTrang())" (change)="cn.chonTat(idTrang(), $any($event.target).checked)" /></th> }<th>Mã kho</th><th>Tên / địa điểm</th><th>Loại</th><th>Đang dùng</th><th class="num">Số phiếu</th>@if (edit()) { <th></th> }</tr></thead>
        <tbody>
          @for (r of rows(); track r.k.id) {
            <tr>
              @if (chonDuoc()) {
                <td>@if (xoaDuoc(r.k)) { <input type="checkbox" [attr.aria-label]="'Chọn ' + r.k.ten" [checked]="cn.co(r.k.id)" (change)="cn.flip(r.k.id)" /> }</td>
              }
              <td><b>{{ r.k.id }}</b></td>
              <td>{{ r.k.ten }}</td>
              <td>{{ r.k.loai }}</td>
              <td>
                <app-tt [v]="r.k.dangDung ? TT.DANG_DUNG : TT.NGUNG" />
                @if (choXoa(r.k)) { <app-tt v="Chờ xoá" /> }
              </td>
              <td class="num">{{ r.soPhieu }}</td>
              @if (edit()) {
                <td>
                  @if (r.k.id === ctId) {
                    <span class="tag mute">Vị trí hệ thống — không sửa</span>
                  } @else if (!choXoa(r.k)) {
                    <div class="btn-row" style="justify-content:flex-start">
                      <button type="button" class="btn sm quiet" (click)="sua(r.k)">Sửa</button>
                      <button type="button" class="btn sm quiet" (click)="batTat(r.k)">{{ r.k.dangDung ? 'Ngưng' : 'Dùng lại' }}</button>
                      @if (r.soPhieu === 0 && store.level('duyetXoa') !== 'none') {
                        <button type="button" class="btn sm quiet danger" (click)="xoa(r.k)">Xoá</button>
                      }
                    </div>
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
    <div class="note info">
      "Để tại Phú Tài" = Kho Phú Tài; hàng Oxy gửi tại Kho Phú Tài vẫn tính tồn Oxy (D-18). "Chuyển thẳng — không qua kho" là vị trí hệ thống: không sửa, không xoá, không tính tồn (KHO-07).
      Kho đã có phiếu không xoá được — chỉ Ngưng.
    </div>

    <app-modal #mKho [open]="!!f()" [title]="f()?.id ? 'Sửa kho ' + f()!.id : 'Thêm kho'" size="sm" [dirty]="dirty()" (closed)="f.set(null)">
      @if (f(); as k) {
        <div class="form-grid">
          <div class="field"><span class="lbl">Mã kho</span><div class="ro">{{ k.id || 'Tự sinh khi lưu' }}</div></div>
          <div class="field"><span class="lbl">Loại</span><div class="ro">Kho thường</div></div>
          <div class="field wide"><label for="k-ten">Tên / địa điểm <span class="req">*</span></label><input id="k-ten" [value]="k.ten" (input)="set({ ten: $any($event.target).value })" /></div>
          <label class="check-row wide"><input type="checkbox" [checked]="k.dangDung" (change)="set({ dangDung: $any($event.target).checked })" /> Đang dùng</label>
        </div>
        @if (err()) { <div class="note bad">{{ err() }}</div> }
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="f.set(null)">Huỷ</button>
        <button type="button" class="btn" (click)="luu()">Lưu</button>
      </div>
    </app-modal>
  `,
})
export class DmKhoTab {
  private readonly mKho = viewChild<Modal>('mKho');
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  private readonly confirm = inject(Confirm);
  protected readonly ctId = KHO_CHUYEN_THANG;
  protected readonly edit = computed(() => this.store.canEdit('khoDanhMuc'));
  protected readonly cn = new ChonNhieu();
  protected readonly f = signal<Kho | null>(null);
  protected readonly dirty = dirtyOf(this.f);
  protected readonly err = signal('');

  protected readonly rows = computed(() => {
    const ps = this.store.phieuKho();
    return this.store.kho().map((k) => ({ k, soPhieu: ps.filter((p) => p.kho === k.id).length }));
  });

  protected choXoa(k: Kho): boolean {
    return this.store.dangChoXoa('DM_Kho', k.id);
  }
  protected moi(): void {
    this.err.set('');
    this.f.set({ id: '', ten: '', loai: 'Kho thường', dangDung: true });
  }
  protected sua(k: Kho): void {
    this.err.set('');
    this.f.set(structuredClone(k));
  }
  protected set(p: Partial<Kho>): void {
    this.f.update((k) => (k ? { ...k, ...p } : k));
  }
  protected luu(): void {
    if (this.mKho()?.kt.hopLe() === false) return;
    const k = this.f();
    if (!k) return;
    const e = this.store.saveKho({ ...k, ten: k.ten.trim() });
    if (e) return this.err.set(e);
    this.store.say(k.id ? `Đã lưu kho ${k.id}` : 'Đã thêm kho');
    this.f.set(null);
  }
  protected batTat(k: Kho): void {
    const e = this.store.saveKho({ ...k, dangDung: !k.dangDung });
    this.store.say(e ?? (k.dangDung ? `Đã ngưng ${k.ten}` : `Đã dùng lại ${k.ten}`));
  }
  /** Xoá hàng loạt: bỏ vị trí hệ thống và kho đang chờ xoá; kho đã có phiếu bị bỏ qua kèm lý do. */
  protected readonly chonDuoc = computed(() => this.edit() && this.store.level('duyetXoa') !== 'none');
  protected xoaDuoc(k: Kho): boolean {
    return k.id !== this.ctId && !this.choXoa(k);
  }
  protected readonly idTrang = computed(() => this.rows().filter((r) => this.xoaDuoc(r.k)).map((r) => r.k.id));
  protected async xoaNhieu(): Promise<void> {
    const ds = this.rows().filter((r) => this.cn.co(r.k.id) && this.xoaDuoc(r.k)).map((r) => ({ id: r.k.id, ten: r.k.ten, moTa: `Kho ${r.k.ten}` }));
    if (await guiXoaNhieu(this.confirm, this.store, 'DM_Kho', ds, 'kho')) this.cn.xoa();
  }
  protected async xoa(k: Kho): Promise<void> {
    await guiXoa(this.confirm, this.store, 'DM_Kho', k.id, `Kho ${k.ten}`);
  }
}
