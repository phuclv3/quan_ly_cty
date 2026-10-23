import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Store } from '../core/store';
import { TT } from '../core/trang-thai';
import { LoaiChiPhi, NhomChiPhi } from '../core/models';
import { Modal, TrangThai } from '../shared/ui-kit';
import { Confirm } from '../shared/confirm';
import { guiXoa, guiXoaNhieu } from '../shared/ho-so';
import { ChonNhieu } from '../shared/chon-nhieu';
import { ChonBar } from '../shared/chon-bar';

const NHOM: NhomChiPhi[] = ['Vận hành', 'Thực hiện HĐ'];

/** KT-03 — Danh mục Loại chi phí (2 nhóm). */
@Component({
  selector: 'app-dm-lcp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChonBar, Modal, TrangThai],
  template: `
    <div class="note info" style="margin-bottom:12px">
      <span>Sổ quỹ chung chỉ chọn nhóm <b>Vận hành</b>; Chi phí thực hiện HĐ chỉ chọn nhóm <b>Thực hiện HĐ</b>; không xoá loại đã dùng — chỉ ngưng.</span>
    </div>
    @if (store.canEdit('nguonTien')) {
      <app-chon-bar [cn]="cn" ten="loại chi phí" (xoa)="xoaNhieu()" />
      <div class="btn-row" style="margin-bottom:12px"><button type="button" class="btn" (click)="mo(null)">+ Thêm loại chi phí</button></div>
    }
    <div class="grid c2">
      @for (g of nhom; track g) {
        <section>
          <div class="section-title" style="margin-top:0"><h3>Nhóm {{ g }}</h3><span class="sub">{{ g === 'Vận hành' ? 'Dùng ở Sổ quỹ chung' : 'Dùng ở Chi phí thực hiện HĐ' }}</span></div>
          <div class="tbl-wrap">
            <table class="tbl compact">
              <thead><tr>@if (chonDuoc()) { <th style="width:36px"><input type="checkbox" aria-label="Chọn cả trang" [checked]="cn.du(idTrang())" (change)="cn.chonTat(idTrang(), $any($event.target).checked)" /></th> }<th>Mã loại</th><th>Tên loại</th><th>Trạng thái</th><th class="num">Đã dùng</th><th></th></tr></thead>
              <tbody>
                @for (l of theoNhom(g); track l.id) {
                  <tr>
                    @if (chonDuoc()) {
                      <td>@if (xoaDuoc(l)) { <input type="checkbox" [attr.aria-label]="'Chọn ' + l.ten" [checked]="cn.co(l.id)" (change)="cn.flip(l.id)" /> }</td>
                    }
                    <td class="mono">{{ l.id }}</td>
                    <td>{{ l.ten }}</td>
                    <td>
                      <app-tt [v]="l.dangDung ? TT.DANG_DUNG : TT.NGUNG" />
                      @if (store.dangChoXoa('DM_LoaiChiPhi', l.id)) { <app-tt v="Chờ xoá" /> }
                    </td>
                    <td class="num">{{ daDung().get(l.id) ?? 0 }}</td>
                    <td>
                      @if (store.canEdit('nguonTien') && !store.dangChoXoa('DM_LoaiChiPhi', l.id)) {
                        <div class="row" style="flex-wrap:nowrap">
                          <button type="button" class="btn sm quiet" (click)="mo(l)">Sửa</button>
                          @if (!daDung().get(l.id)) { <button type="button" class="btn sm danger" (click)="xoa(l)">Xoá</button> }
                        </div>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td [attr.colspan]="chonDuoc() ? 6 : 5" class="empty">Chưa có loại chi phí.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>

    <app-modal #mLcp [open]="!!f()" size="sm" [title]="f()?.id ? 'Sửa loại chi phí ' + f()!.id : 'Thêm loại chi phí'" [dirty]="dirty()" (closed)="f.set(null)">
      @if (err()) { <div class="note bad">{{ err() }}</div> }
      @if (f(); as d) {
        <div class="field"><label for="lcp-ten">Tên loại <span class="req">*</span></label><input id="lcp-ten" [value]="d.ten" (input)="set({ ten: $any($event.target).value })" /></div>
        <div class="field">
          <label for="lcp-nhom">Nhóm</label>
          <select id="lcp-nhom" [disabled]="!!d.id && !!daDung().get(d.id)" (change)="set({ nhom: $any($event.target).value })">
            @for (g of nhom; track g) { <option [value]="g" [selected]="d.nhom === g">{{ g }}</option> }
          </select>
          @if (d.id && daDung().get(d.id)) { <span class="hint">Loại đã dùng — không đổi nhóm.</span> }
          @if (!d.id) { <span class="hint">Mã tự sinh theo nhóm (VH-… / CPTH-…).</span> }
        </div>
        <label class="check-row"><input type="checkbox" [checked]="d.dangDung" (change)="set({ dangDung: $any($event.target).checked })" /> Đang dùng</label>
      }
      <ng-container foot>
        <button type="button" class="btn quiet" (click)="f.set(null)">Huỷ</button>
        <button type="button" class="btn" (click)="luu()">Lưu</button>
      </ng-container>
    </app-modal>
  `,
})
export class DmLoaiChiPhi {
  private readonly mLcp = viewChild<Modal>('mLcp');
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  private readonly confirm = inject(Confirm);
  protected readonly nhom = NHOM;
  protected readonly cn = new ChonNhieu();
  /** Xoá nhiều: loại chưa chờ xoá; loại đã dùng bị bỏ qua kèm lý do. */
  protected readonly chonDuoc = computed(() => this.store.canEdit('nguonTien') && this.store.level('duyetXoa') !== 'none');
  protected xoaDuoc(l: LoaiChiPhi): boolean {
    return !this.store.dangChoXoa('DM_LoaiChiPhi', l.id);
  }
  protected readonly idTrang = computed(() => this.store.loaiChiPhi().filter((l) => this.xoaDuoc(l)).map((l) => l.id));
  protected async xoaNhieu(): Promise<void> {
    const ds = this.store.loaiChiPhi().filter((l) => this.cn.co(l.id) && this.xoaDuoc(l)).map((l) => ({ id: l.id, ten: l.ten, moTa: `Loại chi phí ${l.id} — ${l.ten}` }));
    if (await guiXoaNhieu(this.confirm, this.store, 'DM_LoaiChiPhi', ds, 'loại chi phí')) this.cn.xoa();
  }
  protected readonly f = signal<LoaiChiPhi | null>(null);
  protected readonly err = signal('');
  private readonly goc = signal('');
  protected readonly dirty = computed(() => !!this.f() && JSON.stringify(this.f()) !== this.goc());

  /** Số phiếu thu chi + chi phí HĐ đang dùng loại này. */
  protected readonly daDung = computed(() => {
    const m = new Map<string, number>();
    const add = (id?: string) => id && m.set(id, (m.get(id) ?? 0) + 1);
    for (const p of this.store.phieuThuChi()) add(p.loaiChiPhi);
    for (const c of this.store.chiPhiHD()) add(c.loaiChiPhi);
    return m;
  });

  protected theoNhom(g: NhomChiPhi): LoaiChiPhi[] {
    return this.store.loaiChiPhi().filter((l) => l.nhom === g);
  }
  protected mo(l: LoaiChiPhi | null): void {
    this.err.set('');
    this.f.set(structuredClone(l ?? { id: '', ten: '', nhom: 'Vận hành', dangDung: true }));
    this.goc.set(JSON.stringify(this.f()));
  }
  protected set(p: Partial<LoaiChiPhi>): void {
    this.f.update((d) => (d ? { ...d, ...p } : d));
  }
  protected luu(): void {
    if (this.mLcp()?.kt.hopLe() === false) return;
    const d = this.f();
    if (!d) return;
    const err = this.store.saveLoaiChiPhi({ ...d, ten: d.ten.trim() });
    if (err) {
      this.err.set(err);
      return;
    }
    this.store.say('Đã lưu loại chi phí');
    this.f.set(null);
  }
  protected async xoa(l: LoaiChiPhi): Promise<void> {
    await guiXoa(this.confirm, this.store, 'DM_LoaiChiPhi', l.id, `Loại chi phí ${l.id} — ${l.ten}`);
  }
}
