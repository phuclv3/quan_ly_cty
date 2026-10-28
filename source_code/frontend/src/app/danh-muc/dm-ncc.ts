import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { NhaCungCap } from '../core/models';
import { TT, ttNhan } from '../core/trang-thai';
import { hdmTong } from '../core/calc';
import { money, viDate } from '../core/util';
import { nhoLoc } from '../core/ui';
import { Modal, TrangThai } from '../shared/ui-kit';
import { FilterBar, LOC_RONG, Loc, khopQ } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { Confirm } from '../shared/confirm';
import { guiXoa, guiXoaNhieu } from '../shared/ho-so';
import { ChonNhieu } from '../shared/chon-nhieu';
import { xuatExcel } from '../shared/export';

const BLANK: NhaCungCap = { id: '', ten: '', mst: '', diaChi: '', quocGia: 'Việt Nam', nguoiLienHe: '', dienThoai: '', email: '', ghiChu: '' };
type F = Exclude<keyof NhaCungCap, 'id'>;

/** HDM-10 — Danh mục Nhà cung cấp. */
import { ImportDm } from '../shared/import-dm';
@Component({
  selector: 'app-dm-ncc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `.bulk { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 12px; }`,
  imports: [RouterLink, Modal, TrangThai, FilterBar, Pager, ImportDm],
  template: `
    <div class="between">
      <app-filter style="flex:1 1 auto;min-width:0" [(loc)]="loc" memo="dm-ncc" [time]="false" placeholder="Tìm mã, tên, MST, quốc gia, người liên hệ…" />
      <div class="btn-row" style="margin-bottom:12px">
        <button type="button" class="btn quiet" (click)="xuat()">Xuất Excel</button>
        @if (store.canEdit('ncc')) { <app-import-dm loai="ncc" /> <button type="button" class="btn" (click)="mo(null)">+ Thêm nhà cung cấp</button> }
      </div>
    </div>
    @if (chonDuoc() && cn.chon().size) {
      <div class="note info bulk">
        <b>Đã chọn {{ cn.chon().size }} nhà cung cấp</b>
        <button type="button" class="btn sm danger" (click)="xoaNhieu()">Xoá {{ cn.chon().size }} đã chọn</button>
        <button type="button" class="btn sm quiet" (click)="cn.xoa()">Bỏ chọn</button>
      </div>
    }
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead>
          <tr>@if (chonDuoc()) { <th style="width:36px"><input type="checkbox" aria-label="Chọn cả trang" [checked]="cn.du(idTrang())" (change)="cn.chonTat(idTrang(), $any($event.target).checked)" /></th> }<th>Mã NCC</th><th>Tên nhà cung cấp</th><th>MST</th><th>Địa chỉ</th><th>Quốc gia</th><th>Người liên hệ</th><th>Điện thoại</th><th>Email</th><th class="num">Số HĐ mua</th><th></th></tr>
        </thead>
        <tbody>
          @for (n of pg.items(); track n.id) {
            <tr class="click" [class.sel]="mo1() === n.id" (click)="mo1.set(mo1() === n.id ? null : n.id)">
              @if (chonDuoc()) {
                <td (click)="$event.stopPropagation()">
                  @if (xoaDuoc(n)) { <input type="checkbox" [attr.aria-label]="'Chọn ' + n.ten" [checked]="cn.co(n.id)" (change)="cn.flip(n.id)" /> }
                </td>
              }
              <td class="mono"><button type="button" class="linkish" [attr.aria-expanded]="mo1() === n.id">{{ n.id }}</button></td>
              <td><b>{{ n.ten }}</b>@if (n.trangThai === TT.NGUNG) { <app-tt [v]="TT.NGUNG" /> }@if (store.dangChoXoa('DM_NCC', n.id)) { <app-tt v="Chờ xoá" /> }</td>
              <td class="mono">{{ n.mst || '—' }}</td>
              <td>{{ n.diaChi }}</td>
              <td>{{ n.quocGia }}</td>
              <td>{{ n.nguoiLienHe }}</td>
              <td>{{ n.dienThoai }}</td>
              <td>{{ n.email }}</td>
              <td class="num">{{ soHD().get(n.id) ?? 0 }}</td>
              <td (click)="$event.stopPropagation()">
                @if (store.canEdit('ncc') && !store.dangChoXoa('DM_NCC', n.id)) {
                  <div class="row" style="flex-wrap:nowrap">
                    <button type="button" class="btn sm quiet" (click)="mo(n)">Sửa</button>
                    @let vuong = store.lyDoKhongXoa('DM_NCC', n.id);
                    <button type="button" class="btn sm danger" [attr.title]="vuong ? vuong + ' — không xoá được' : null" (click)="xoa(n)">Xoá</button>
                  </div>
                }
              </td>
            </tr>
            @if (mo1() === n.id) {
              <tr>
                <td [attr.colspan]="chonDuoc() ? 11 : 10" style="background:var(--surf-2)">
                  @if (n.ghiChu) { <div class="sub">Ghi chú: {{ n.ghiChu }}</div> }
                  <b>Hợp đồng mua với NCC</b>
                  @for (m of hdCua(n.id); track m.id) {
                    <div class="row" style="padding:3px 0">
                      @if (store.canView('hdm')) { <a [routerLink]="['/hop-dong-mua', m.id]" class="linkish">{{ m.soHD || '(chưa số)' }}</a> } @else { <b>{{ m.soHD }}</b> }
                      <span class="muted">{{ viDate(m.ngayKy) }}</span>
                      <app-tt [v]="m.trangThai" />
                      @if (m.thuocPhuTai) { <app-tt v="Thuộc Phú Tài" /> }
                      <span class="num">{{ money(m.tong) }} đ</span>
                    </div>
                  } @empty { <div class="muted">Chưa có HĐ mua (trong phạm vi bạn được xem).</div> }
                </td>
              </tr>
            }
          } @empty {
            <tr><td [attr.colspan]="chonDuoc() ? 11 : 10" class="empty">Không có nhà cung cấp phù hợp.</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [pager]="pg" />

    <app-modal #mNcc [open]="!!f()" [title]="f()?.id ? 'Sửa nhà cung cấp ' + f()!.id : 'Thêm nhà cung cấp'" [dirty]="dirty()" (closed)="dong()">
      @if (err()) { <div class="note bad">{{ err() }}</div> }
      @if (f(); as d) {
        <div class="form-grid blk xanh">
<h3 class="blk-t">Thông tin nhà cung cấp</h3>
          <div class="field wide"><label for="ncc-ten">Tên nhà cung cấp <span class="req">*</span></label><input id="ncc-ten" [value]="d.ten" (input)="set('ten', $any($event.target).value)" /></div>
          <div class="field">
            <label for="ncc-tt">Trạng thái</label>
            <select id="ncc-tt" (change)="set('trangThai', $any($event.target).value)">
              <option [value]="TT.DANG_DUNG" [selected]="d.trangThai !== TT.NGUNG">{{ ttNhan(TT.DANG_DUNG) }}</option>
              <option [value]="TT.NGUNG" [selected]="d.trangThai === TT.NGUNG">{{ ttNhan(TT.NGUNG) }}</option>
            </select>
            <span class="hint">Ngưng: không chọn được cho HĐ mới; HĐ cũ giữ nguyên.</span>
          </div>
          <div class="field"><label for="ncc-mst">MST</label><input id="ncc-mst" [value]="d.mst" (input)="set('mst', $any($event.target).value)" /></div>
          <div class="field"><label for="ncc-qg">Quốc gia</label><input id="ncc-qg" [value]="d.quocGia" (input)="set('quocGia', $any($event.target).value)" /></div>
          <div class="field"><label for="ncc-lh">Người liên hệ</label><input id="ncc-lh" [value]="d.nguoiLienHe" (input)="set('nguoiLienHe', $any($event.target).value)" /></div>
          <div class="field"><label for="ncc-dt">Điện thoại</label><input id="ncc-dt" [value]="d.dienThoai" (input)="set('dienThoai', $any($event.target).value)" /></div>
          <div class="field"><label for="ncc-em">Email</label><input id="ncc-em" type="email" [value]="d.email" (input)="set('email', $any($event.target).value)" /></div>
          <div class="field wide"><label for="ncc-dc">Địa chỉ</label><input id="ncc-dc" [value]="d.diaChi" (input)="set('diaChi', $any($event.target).value)" /></div>
          <div class="field full"><label for="ncc-gc">Ghi chú</label><textarea id="ncc-gc" rows="2" [value]="d.ghiChu" (input)="set('ghiChu', $any($event.target).value)"></textarea></div>
        </div>
        @if (trung(); as t) {
          <div class="note warn" style="display:grid">
            <span>Đã có nhà cung cấp trùng {{ t.mst && t.mst === d.mst ? 'MST' : 'tên' }}: <b>{{ t.id }} — {{ t.ten }}</b> (MST {{ t.mst || '—' }}, {{ t.quocGia }}).</span>
            <div class="row">
              <button type="button" class="btn sm quiet" (click)="moCoSan(t)">Mở bản có sẵn</button>
              <button type="button" class="btn sm" (click)="luu(true)">Vẫn lưu</button>
            </div>
          </div>
        }
      }
      <ng-container foot>
        <button type="button" class="btn quiet" (click)="dong()">Huỷ</button>
        <button type="button" class="btn" (click)="luu(false)">Lưu</button>
      </ng-container>
    </app-modal>
  `,
})
export class DmNcc {
  private readonly mNcc = viewChild<Modal>('mNcc');
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  protected readonly money = money;
  protected readonly TT = TT;
  protected readonly ttNhan = ttNhan;
  protected readonly viDate = viDate;
  protected readonly loc = signal<Loc>(nhoLoc('dm-ncc', LOC_RONG));
  protected readonly cn = new ChonNhieu();
  protected readonly mo1 = signal<string | null>(null);
  protected readonly f = signal<NhaCungCap | null>(null);
  protected readonly trung = signal<NhaCungCap | null>(null);
  protected readonly err = signal('');
  private readonly goc = signal('');
  protected readonly dirty = computed(() => !!this.f() && JSON.stringify(this.f()) !== this.goc());

  constructor() {
    // Liên kết sâu (?tab=…&id=…, VD từ Duyệt xoá): tìm sẵn và mở rộng dòng bản ghi.
    const route = inject(ActivatedRoute);
    const id = route.snapshot.queryParamMap.get('id');
    if (id) {
      this.loc.set({ ...LOC_RONG, q: id });
      this.mo1.set(id);
      void inject(Router).navigate([], { relativeTo: route, queryParams: { id: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }

  protected readonly soHD = computed(() => {
    const m = new Map<string, number>();
    for (const h of this.store.hopDongMua()) m.set(h.maNCC, (m.get(h.maNCC) ?? 0) + 1);
    return m;
  });
  protected readonly list = computed(() => {
    const l = this.loc();
    return this.store.ncc().filter((n) => khopQ(l, n.id, n.ten, n.mst, n.diaChi, n.quocGia, n.nguoiLienHe, n.dienThoai, n.email));
  });
  protected readonly pg = paginate(this.list);

  protected hdCua(maNCC: string) {
    return this.store
      .hdmVisible()
      .filter((m) => m.maNCC === maNCC)
      .map((m) => ({ id: m.id, soHD: m.soHD, ngayKy: m.ngayKy, trangThai: m.trangThai, thuocPhuTai: m.thuocPhuTai, tong: hdmTong(m) }));
  }

  protected mo(n: NhaCungCap | null): void {
    this.trung.set(null);
    this.err.set('');
    this.f.set(structuredClone(n ?? BLANK));
    this.goc.set(JSON.stringify(this.f()));
  }
  protected dong(): void {
    this.f.set(null);
    this.trung.set(null);
  }
  protected set(k: F, v: string): void {
    this.f.update((d) => (d ? { ...d, [k]: v } : d));
    this.trung.set(null);
  }
  protected moCoSan(t: NhaCungCap): void {
    this.mo(t);
    this.mo1.set(t.id);
  }
  protected luu(boQuaTrung: boolean): void {
    if (this.mNcc()?.kt.hopLe() === false) return;
    const d = this.f();
    if (!d) return;
    const draft = { ...d, ten: d.ten.trim(), mst: d.mst.trim() };
    if (!boQuaTrung) {
      const t = this.store.trungNCC(draft);
      if (t) {
        this.trung.set(t);
        return;
      }
    }
    const err = this.store.saveNCC(draft);
    if (err) {
      this.err.set(err);
      return;
    }
    this.store.say(d.id ? 'Đã lưu nhà cung cấp' : 'Đã thêm nhà cung cấp');
    this.dong();
  }
  /** Xoá hàng loạt: người sửa được NCC và gửi được yêu cầu xoá; bỏ NCC đang chờ xoá. */
  protected readonly chonDuoc = computed(() => this.store.canEdit('ncc') && this.store.level('duyetXoa') !== 'none');
  protected xoaDuoc(n: NhaCungCap): boolean {
    return !this.store.dangChoXoa('DM_NCC', n.id);
  }
  protected readonly idTrang = computed(() => this.pg.items().filter((n) => this.xoaDuoc(n)).map((n) => n.id));
  protected async xoaNhieu(): Promise<void> {
    const ds = this.store.ncc().filter((n) => this.cn.co(n.id) && this.xoaDuoc(n)).map((n) => ({ id: n.id, ten: n.ten, moTa: `Nhà cung cấp ${n.id} — ${n.ten}` }));
    if (await guiXoaNhieu(this.confirm, this.store, 'DM_NCC', ds, 'nhà cung cấp')) this.cn.xoa();
  }
  protected async xoa(n: NhaCungCap): Promise<void> {
    await guiXoa(this.confirm, this.store, 'DM_NCC', n.id, `Nhà cung cấp ${n.id} — ${n.ten}`);
  }
  protected xuat(): void {
    const rows: (string | number)[][] = [['Mã NCC', 'Tên', 'MST', 'Địa chỉ', 'Quốc gia', 'Người liên hệ', 'Điện thoại', 'Email', 'Ghi chú', 'Số HĐ mua']];
    for (const n of this.list())
      rows.push([n.id, n.ten, n.mst, n.diaChi, n.quocGia, n.nguoiLienHe, n.dienThoai, n.email, n.ghiChu, this.soHD().get(n.id) ?? 0]);
    void xuatExcel('nha-cung-cap', rows);
  }
}
