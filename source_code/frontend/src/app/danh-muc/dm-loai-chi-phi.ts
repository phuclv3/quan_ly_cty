import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '../core/store';
import { LoaiChiPhi, NhomChiPhi } from '../core/models';
import { Modal, TrangThai } from '../shared/ui-kit';
import { Confirm } from '../shared/confirm';
import { guiXoa } from '../shared/ho-so';

const NHOM: NhomChiPhi[] = ['Vận hành', 'Thực hiện HĐ'];

/** KT-03 — Danh mục Loại chi phí (2 nhóm). */
@Component({
  selector: 'app-dm-lcp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, TrangThai],
  template: `
    <div class="note info" style="margin-bottom:12px">
      <span>Sổ quỹ chung chỉ chọn nhóm <b>Vận hành</b>; Chi phí thực hiện HĐ chỉ chọn nhóm <b>Thực hiện HĐ</b>; không xoá loại đã dùng — chỉ ngưng.</span>
    </div>
    @if (store.canEdit('nguonTien')) {
      <div class="btn-row" style="margin-bottom:12px"><button type="button" class="btn" (click)="mo(null)">+ Thêm loại chi phí</button></div>
    }
    <div class="grid c2">
      @for (g of nhom; track g) {
        <section>
          <div class="section-title" style="margin-top:0"><h3>Nhóm {{ g }}</h3><span class="sub">{{ g === 'Vận hành' ? 'Dùng ở Sổ quỹ chung' : 'Dùng ở Chi phí thực hiện HĐ' }}</span></div>
          <div class="tbl-wrap">
            <table class="tbl compact">
              <thead><tr><th>Mã loại</th><th>Tên loại</th><th>Trạng thái</th><th class="num">Đã dùng</th><th></th></tr></thead>
              <tbody>
                @for (l of theoNhom(g); track l.id) {
                  <tr>
                    <td class="mono">{{ l.id }}</td>
                    <td>{{ l.ten }}</td>
                    <td>
                      <app-tt [v]="l.dangDung ? 'Đang dùng' : 'Ngưng'" />
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
                  <tr><td colspan="5" class="empty">Chưa có loại chi phí.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>

    <app-modal [open]="!!f()" size="sm" [title]="f()?.id ? 'Sửa loại chi phí ' + f()!.id : 'Thêm loại chi phí'" [dirty]="dirty()" (closed)="f.set(null)">
      @if (err()) { <div class="note bad">{{ err() }}</div> }
      @if (f(); as d) {
        <div class="field"><label for="lcp-ten">Tên loại <span class="req">bắt buộc</span></label><input id="lcp-ten" [value]="d.ten" (input)="set({ ten: $any($event.target).value })" /></div>
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
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  protected readonly nhom = NHOM;
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
