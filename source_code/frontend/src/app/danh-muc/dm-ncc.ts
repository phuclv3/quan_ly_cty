import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { NhaCungCap } from '../core/models';
import { hdmTong } from '../core/calc';
import { money, viDate } from '../core/util';
import { nhoLoc } from '../core/ui';
import { Modal, TrangThai } from '../shared/ui-kit';
import { FilterBar, LOC_RONG, Loc, khopQ } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { Confirm } from '../shared/confirm';
import { guiXoa } from '../shared/ho-so';
import { downloadFile, csv, fileName } from '../shared/export';

const BLANK: NhaCungCap = { id: '', ten: '', mst: '', diaChi: '', quocGia: 'Việt Nam', nguoiLienHe: '', dienThoai: '', email: '', ghiChu: '' };
type F = Exclude<keyof NhaCungCap, 'id'>;

/** HDM-10 — Danh mục Nhà cung cấp. */
@Component({
  selector: 'app-dm-ncc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Modal, TrangThai, FilterBar, Pager],
  template: `
    <div class="between">
      <app-filter [(loc)]="loc" memo="dm-ncc" [time]="false" placeholder="Tìm mã, tên, MST, quốc gia, người liên hệ…" />
      <div class="btn-row" style="margin-bottom:12px">
        <button type="button" class="btn quiet" (click)="xuat()">Xuất Excel</button>
        @if (store.canEdit('ncc')) { <button type="button" class="btn" (click)="mo(null)">+ Thêm nhà cung cấp</button> }
      </div>
    </div>
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead>
          <tr><th>Mã NCC</th><th>Tên nhà cung cấp</th><th>MST</th><th>Địa chỉ</th><th>Quốc gia</th><th>Người liên hệ</th><th>Điện thoại</th><th>Email</th><th class="num">Số HĐ mua</th><th></th></tr>
        </thead>
        <tbody>
          @for (n of pg.items(); track n.id) {
            <tr class="click" [class.sel]="mo1() === n.id" (click)="mo1.set(mo1() === n.id ? null : n.id)">
              <td class="mono">{{ n.id }}</td>
              <td><b>{{ n.ten }}</b>@if (store.dangChoXoa('DM_NCC', n.id)) { <app-tt v="Chờ xoá" /> }</td>
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
                    <button type="button" class="btn sm danger" (click)="xoa(n)">Xoá</button>
                  </div>
                }
              </td>
            </tr>
            @if (mo1() === n.id) {
              <tr>
                <td colspan="10" style="background:var(--surf-2)">
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
            <tr><td colspan="10" class="empty">Không có nhà cung cấp phù hợp.</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [pager]="pg" />

    <app-modal [open]="!!f()" [title]="f()?.id ? 'Sửa nhà cung cấp ' + f()!.id : 'Thêm nhà cung cấp'" (closed)="dong()">
      @if (f(); as d) {
        <div class="form-grid">
          <div class="field wide"><label for="ncc-ten">Tên nhà cung cấp <span class="req">bắt buộc</span></label><input id="ncc-ten" [value]="d.ten" (input)="set('ten', $any($event.target).value)" /></div>
          <div class="field"><label for="ncc-mst">MST</label><input id="ncc-mst" [value]="d.mst" (input)="set('mst', $any($event.target).value)" /></div>
          <div class="field"><label for="ncc-qg">Quốc gia</label><input id="ncc-qg" [value]="d.quocGia" (input)="set('quocGia', $any($event.target).value)" /></div>
          <div class="field"><label for="ncc-lh">Người liên hệ</label><input id="ncc-lh" [value]="d.nguoiLienHe" (input)="set('nguoiLienHe', $any($event.target).value)" /></div>
          <div class="field"><label for="ncc-dt">Điện thoại</label><input id="ncc-dt" [value]="d.dienThoai" (input)="set('dienThoai', $any($event.target).value)" /></div>
          <div class="field"><label for="ncc-em">Email</label><input id="ncc-em" type="email" [value]="d.email" (input)="set('email', $any($event.target).value)" /></div>
          <div class="field wide"><label for="ncc-dc">Địa chỉ</label><input id="ncc-dc" [value]="d.diaChi" (input)="set('diaChi', $any($event.target).value)" /></div>
          <div class="field wide"><label for="ncc-gc">Ghi chú</label><textarea id="ncc-gc" rows="2" [value]="d.ghiChu" (input)="set('ghiChu', $any($event.target).value)"></textarea></div>
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
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly loc = signal<Loc>(nhoLoc('dm-ncc', LOC_RONG));
  protected readonly mo1 = signal<string | null>(null);
  protected readonly f = signal<NhaCungCap | null>(null);
  protected readonly trung = signal<NhaCungCap | null>(null);

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
    this.f.set(structuredClone(n ?? BLANK));
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
      this.store.say(err);
      return;
    }
    this.store.say(d.id ? 'Đã lưu nhà cung cấp' : 'Đã thêm nhà cung cấp');
    this.dong();
  }
  protected async xoa(n: NhaCungCap): Promise<void> {
    await guiXoa(this.confirm, this.store, 'DM_NCC', n.id, `Nhà cung cấp ${n.id} — ${n.ten}`);
  }
  protected xuat(): void {
    const rows: (string | number)[][] = [['Mã NCC', 'Tên', 'MST', 'Địa chỉ', 'Quốc gia', 'Người liên hệ', 'Điện thoại', 'Email', 'Ghi chú', 'Số HĐ mua']];
    for (const n of this.list())
      rows.push([n.id, n.ten, n.mst, n.diaChi, n.quocGia, n.nguoiLienHe, n.dienThoai, n.email, n.ghiChu, this.soHD().get(n.id) ?? 0]);
    downloadFile(fileName('nha-cung-cap', 'csv'), 'text/csv', csv(rows));
  }
}
