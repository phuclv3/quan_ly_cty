import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { LoaiHang, NHOM_HANG, NhomHang } from '../core/models';
import { Store } from '../core/store';
import { dirtyOf } from '../shared/unsaved';
import { nhoLoc } from '../core/ui';
import { Confirm } from '../shared/confirm';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { guiXoa } from '../shared/ho-so';
import { Pager, paginate } from '../shared/pager';
import { Modal, TrangThai } from '../shared/ui-kit';
import { nhomOpts } from './kho-util';

interface Form {
  isNew: boolean;
  l: LoaiHang;
  thuocTinh: string;
}

/** KHO-02: danh mục Loại hàng & thuộc tính biến thể. */
@Component({
  selector: 'app-kho-loai-hang',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, TrangThai, FilterBar, Pager],
  template: `
    <div class="note warn">Danh mục loại hàng chưa chốt (Q-01): chờ công ty gửi danh sách thực tế, thuộc tính biến thể và đơn vị tính từng nhóm.</div>
    <div class="section-title">
      <span class="sub">{{ rows().length }} loại hàng</span>
      @if (edit()) { <button type="button" class="btn" (click)="moi()">+ Thêm loại hàng</button> }
    </div>
    <app-filter [(loc)]="loc" memo="kho-loai-hang" [time]="false" [facets]="facets()" placeholder="Tìm mã, tên, thuộc tính…" />
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead><tr><th>Mã</th><th>Tên</th><th>Nhóm</th><th>ĐVT</th><th>Thuộc tính áp dụng</th><th>Đang dùng</th>@if (edit()) { <th></th> }</tr></thead>
        <tbody>
          @for (l of pg.items(); track l.id) {
            <tr>
              <td><b>{{ l.id }}</b></td>
              <td>{{ l.ten }}</td>
              <td>{{ l.nhom }}</td>
              <td>{{ l.dvt }}</td>
              <td>
                @for (t of l.thuocTinh; track t) { <span class="tag mute">{{ t }}</span> } @empty { <span class="muted">—</span> }
              </td>
              <td>
                <app-tt [v]="l.dangDung ? 'Đang dùng' : 'Ngưng'" />
                @if (choXoa(l)) { <app-tt v="Chờ xoá" /> }
              </td>
              @if (edit()) {
                <td>
                  @if (!choXoa(l)) {
                    <div class="btn-row" style="justify-content:flex-start">
                      <button type="button" class="btn sm quiet" (click)="sua(l)">Sửa</button>
                      <button type="button" class="btn sm quiet" (click)="batTat(l)">{{ l.dangDung ? 'Ngưng' : 'Dùng lại' }}</button>
                      @if (!daDung().has(l.id) && store.level('duyetXoa') !== 'none') {
                        <button type="button" class="btn sm quiet danger" (click)="xoa(l)">Xoá</button>
                      }
                    </div>
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr><td colspan="7" class="empty">Không có loại hàng nào khớp bộ lọc</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [pager]="pg" />
    <p class="hint muted">Khí bên trong pha theo đơn → không tạo mã theo khí; biến thể = Loại hàng × giá trị thuộc tính (nhập khi lập phiếu / dòng hàng, VD "10L", "150bar"). Loại hàng đã dùng không xoá được — chỉ Ngưng.</p>

    <app-modal #mLh [open]="!!f()" [title]="f()?.isNew ? 'Thêm loại hàng' : 'Sửa loại hàng ' + (f()?.l?.id ?? '')" [dirty]="dirty()" (closed)="f.set(null)">
      @if (f(); as x) {
        <div class="form-grid">
          <div class="field">
            <label for="lh-ma">Mã loại hàng <span class="req">*</span></label>
            @if (x.isNew) { <input id="lh-ma" [value]="x.l.id" (input)="set({ id: $any($event.target).value.toUpperCase() })" /> } @else { <div class="ro">{{ x.l.id }}</div> }
            <span class="hint">Mã duy nhất</span>
          </div>
          <div class="field"><label for="lh-ten">Tên <span class="req">*</span></label><input id="lh-ten" [value]="x.l.ten" (input)="set({ ten: $any($event.target).value })" /></div>
          <div class="field">
            <label for="lh-nhom">Nhóm</label>
            <select id="lh-nhom" (change)="set({ nhom: $any($event.target).value })">
              @for (n of nhoms; track n) { <option [value]="n" [selected]="n === x.l.nhom">{{ n }}</option> }
            </select>
          </div>
          <div class="field"><label for="lh-dvt">Đơn vị tính</label><input id="lh-dvt" placeholder="bình, cái, bộ…" [value]="x.l.dvt" (input)="set({ dvt: $any($event.target).value })" /></div>
          <div class="field wide">
            <label for="lh-tt">Thuộc tính áp dụng</label>
            <input id="lh-tt" placeholder="Nồng độ, Thể tích, Áp suất" [value]="x.thuocTinh" (input)="setTT($any($event.target).value)" />
            <span class="hint">Cách nhau bằng dấu phẩy</span>
          </div>
          <label class="check-row wide"><input type="checkbox" [checked]="x.l.dangDung" (change)="set({ dangDung: $any($event.target).checked })" /> Đang dùng</label>
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
export class DmLoaiHangTab {
  private readonly mLh = viewChild<Modal>('mLh');
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  protected readonly nhoms = NHOM_HANG;
  protected readonly edit = computed(() => this.store.canEdit('khoDanhMuc'));
  protected readonly loc = signal<Loc>(nhoLoc('kho-loai-hang', LOC_RONG));
  protected readonly facets = computed<Facet[]>(() => [{ key: 'nhom', label: 'Nhóm', options: nhomOpts() }]);
  protected readonly f = signal<Form | null>(null);
  protected readonly dirty = dirtyOf(this.f);
  protected readonly err = signal('');

  protected readonly rows = computed(() => {
    const l = this.loc();
    return this.store
      .loaiHang()
      .filter((x) => khopSel(l, 'nhom', x.nhom) && khopQ(l, x.id, x.ten, x.dvt, x.nhom, ...x.thuocTinh))
      .sort((a, b) => a.id.localeCompare(b.id));
  });
  protected readonly pg = paginate(this.rows);
  /** Loại hàng đã có trên phiếu kho hoặc dòng HĐ Mua → chỉ ngưng. */
  protected readonly daDung = computed(() => {
    const db = this.store.db();
    const s = new Set<string>();
    for (const p of db.phieuKho) for (const d of p.dong) s.add(d.loaiHang);
    for (const m of db.hopDongMua) for (const d of m.chiTiet) s.add(d.loaiHang);
    return s;
  });

  protected choXoa(l: LoaiHang): boolean {
    return this.store.dangChoXoa('DM_LoaiHang', l.id);
  }
  protected moi(): void {
    this.err.set('');
    this.f.set({ isNew: true, l: { id: '', ten: '', nhom: NHOM_HANG[0] as NhomHang, dvt: '', thuocTinh: [], dangDung: true }, thuocTinh: '' });
  }
  protected sua(l: LoaiHang): void {
    this.err.set('');
    this.f.set({ isNew: false, l: structuredClone(l), thuocTinh: l.thuocTinh.join(', ') });
  }
  protected set(p: Partial<LoaiHang>): void {
    this.f.update((x) => (x ? { ...x, l: { ...x.l, ...p } } : x));
  }
  protected setTT(v: string): void {
    this.f.update((x) => (x ? { ...x, thuocTinh: v } : x));
  }
  protected luu(): void {
    if (this.mLh()?.kt.hopLe() === false) return;
    const x = this.f();
    if (!x) return;
    const l: LoaiHang = {
      ...x.l,
      id: x.l.id.trim(),
      ten: x.l.ten.trim(),
      dvt: x.l.dvt.trim(),
      thuocTinh: [...new Set(x.thuocTinh.split(',').map((t) => t.trim()).filter(Boolean))],
    };
    const e = this.store.saveLoaiHang(l, x.isNew);
    if (e) return this.err.set(e);
    this.store.say(`Đã lưu loại hàng ${l.id}`);
    this.f.set(null);
  }
  protected batTat(l: LoaiHang): void {
    const e = this.store.saveLoaiHang({ ...l, dangDung: !l.dangDung }, false);
    this.store.say(e ?? (l.dangDung ? `Đã ngưng ${l.ten}` : `Đã dùng lại ${l.ten}`));
  }
  protected async xoa(l: LoaiHang): Promise<void> {
    await guiXoa(this.confirm, this.store, 'DM_LoaiHang', l.id, `Loại hàng ${l.id} – ${l.ten}`);
  }
}
