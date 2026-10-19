import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { KhachHang } from '../core/models';
import { hdbCalc } from '../core/calc';
import { money, viDate } from '../core/util';
import { nhoLoc } from '../core/ui';
import { Modal, TrangThai } from '../shared/ui-kit';
import { FilterBar, LOC_RONG, Loc, khopQ } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { Confirm } from '../shared/confirm';
import { guiXoa } from '../shared/ho-so';
import { downloadFile, csv, fileName } from '../shared/export';

const BLANK: KhachHang = { id: '', ten: '', mst: '', diaChi: '', nguoiLienHe: '', dienThoai: '', email: '', ghiChu: '' };
type F = Exclude<keyof KhachHang, 'id'>;

/** HDB-13 — Danh mục Khách hàng. */
@Component({
  selector: 'app-dm-kh',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Modal, TrangThai, FilterBar, Pager],
  template: `
    <div class="between">
      <app-filter [(loc)]="loc" memo="dm-kh" [time]="false" placeholder="Tìm mã, tên, MST, người liên hệ, điện thoại…" />
      <div class="btn-row" style="margin-bottom:12px">
        <button type="button" class="btn quiet" (click)="xuat()">Xuất Excel</button>
        @if (store.canEdit('khachHang')) { <button type="button" class="btn" (click)="mo(null)">+ Thêm khách hàng</button> }
      </div>
    </div>
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead>
          <tr><th>Mã KH</th><th>Tên khách hàng</th><th>MST</th><th>Địa chỉ</th><th>Người liên hệ</th><th>Điện thoại</th><th class="num">Số HĐ</th><th></th></tr>
        </thead>
        <tbody>
          @for (k of pg.items(); track k.id) {
            <tr class="click" [class.sel]="mo1() === k.id" (click)="mo1.set(mo1() === k.id ? null : k.id)">
              <td class="mono">{{ k.id }}</td>
              <td><b>{{ k.ten }}</b>@if (store.dangChoXoa('DM_KhachHang', k.id)) { <app-tt v="Chờ xoá" /> }</td>
              <td class="mono">{{ k.mst || '—' }}</td>
              <td>{{ k.diaChi }}</td>
              <td>{{ k.nguoiLienHe }}</td>
              <td>{{ k.dienThoai }}</td>
              <td class="num">{{ soHD().get(k.id) ?? 0 }}</td>
              <td (click)="$event.stopPropagation()">
                @if (store.canEdit('khachHang') && !store.dangChoXoa('DM_KhachHang', k.id)) {
                  <div class="row" style="flex-wrap:nowrap">
                    <button type="button" class="btn sm quiet" (click)="mo(k)">Sửa</button>
                    <button type="button" class="btn sm danger" (click)="xoa(k)">Xoá</button>
                  </div>
                }
              </td>
            </tr>
            @if (mo1() === k.id) {
              <tr>
                <td colspan="8" style="background:var(--surf-2)">
                  @if (k.email || k.ghiChu) { <div class="sub">Email: {{ k.email || '—' }} · Ghi chú: {{ k.ghiChu || '—' }}</div> }
                  <b>Hợp đồng bán của khách</b>
                  @for (h of hdCua(k.id); track h.id) {
                    <div class="row" style="padding:3px 0">
                      <a [routerLink]="['/hop-dong-ban', h.id]" class="linkish">{{ h.soHD || '(chưa số)' }}</a>
                      <span class="muted">{{ viDate(h.ngayKy) }}</span>
                      <app-tt [v]="h.trangThai" />
                      <span class="num">{{ money(h.sau) }} đ</span>
                    </div>
                  } @empty { <div class="muted">Chưa có HĐ bán (trong phạm vi bạn được xem).</div> }
                </td>
              </tr>
            }
          } @empty {
            <tr><td colspan="8" class="empty">Không có khách hàng phù hợp.</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [pager]="pg" />

    <app-modal [open]="!!f()" [title]="f()?.id ? 'Sửa khách hàng ' + f()!.id : 'Thêm khách hàng'" (closed)="dong()">
      @if (f(); as d) {
        <div class="form-grid">
          <div class="field wide"><label for="kh-ten">Tên khách hàng <span class="req">bắt buộc</span></label><input id="kh-ten" [value]="d.ten" (input)="set('ten', $any($event.target).value)" /></div>
          <div class="field"><label for="kh-mst">MST</label><input id="kh-mst" [value]="d.mst" (input)="set('mst', $any($event.target).value)" /></div>
          <div class="field"><label for="kh-lh">Người liên hệ</label><input id="kh-lh" [value]="d.nguoiLienHe" (input)="set('nguoiLienHe', $any($event.target).value)" /></div>
          <div class="field"><label for="kh-dt">Điện thoại</label><input id="kh-dt" [value]="d.dienThoai" (input)="set('dienThoai', $any($event.target).value)" /></div>
          <div class="field"><label for="kh-em">Email</label><input id="kh-em" type="email" [value]="d.email" (input)="set('email', $any($event.target).value)" /></div>
          <div class="field wide"><label for="kh-dc">Địa chỉ</label><input id="kh-dc" [value]="d.diaChi" (input)="set('diaChi', $any($event.target).value)" /></div>
          <div class="field wide"><label for="kh-gc">Ghi chú</label><textarea id="kh-gc" rows="2" [value]="d.ghiChu" (input)="set('ghiChu', $any($event.target).value)"></textarea></div>
        </div>
        @if (trung(); as t) {
          <div class="note warn" style="display:grid">
            <span>Đã có khách hàng trùng {{ t.mst && t.mst === d.mst ? 'MST' : 'tên' }}: <b>{{ t.id }} — {{ t.ten }}</b> (MST {{ t.mst || '—' }}).</span>
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
export class DmKhachHang {
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly loc = signal<Loc>(nhoLoc('dm-kh', LOC_RONG));
  protected readonly mo1 = signal<string | null>(null);
  protected readonly f = signal<KhachHang | null>(null);
  protected readonly trung = signal<KhachHang | null>(null);

  protected readonly soHD = computed(() => {
    const m = new Map<string, number>();
    for (const h of this.store.hopDongBan()) m.set(h.maKH, (m.get(h.maKH) ?? 0) + 1);
    return m;
  });
  protected readonly list = computed(() => {
    const l = this.loc();
    return this.store.khachHang().filter((k) => khopQ(l, k.id, k.ten, k.mst, k.diaChi, k.nguoiLienHe, k.dienThoai, k.email));
  });
  protected readonly pg = paginate(this.list);

  protected hdCua(maKH: string) {
    const db = this.store.db();
    return this.store
      .hdbVisible()
      .filter((h) => h.maKH === maKH)
      .map((h) => ({ id: h.id, soHD: h.soHD, ngayKy: h.ngayKy, trangThai: h.trangThai, sau: hdbCalc(h, db).sauVAT }));
  }

  protected mo(k: KhachHang | null): void {
    this.trung.set(null);
    this.f.set(structuredClone(k ?? BLANK));
  }
  protected dong(): void {
    this.f.set(null);
    this.trung.set(null);
  }
  protected set(k: F, v: string): void {
    this.f.update((d) => (d ? { ...d, [k]: v } : d));
    this.trung.set(null);
  }
  protected moCoSan(t: KhachHang): void {
    this.mo(t);
    this.mo1.set(t.id);
  }
  protected luu(boQuaTrung: boolean): void {
    const d = this.f();
    if (!d) return;
    const draft = { ...d, ten: d.ten.trim(), mst: d.mst.trim() };
    if (!boQuaTrung) {
      const t = this.store.trungKhachHang(draft);
      if (t) {
        this.trung.set(t);
        return;
      }
    }
    const err = this.store.saveKhachHang(draft);
    if (err) {
      this.store.say(err);
      return;
    }
    this.store.say(d.id ? 'Đã lưu khách hàng' : 'Đã thêm khách hàng');
    this.dong();
  }
  protected async xoa(k: KhachHang): Promise<void> {
    await guiXoa(this.confirm, this.store, 'DM_KhachHang', k.id, `Khách hàng ${k.id} — ${k.ten}`);
  }
  protected xuat(): void {
    const rows: (string | number)[][] = [['Mã KH', 'Tên', 'MST', 'Địa chỉ', 'Người liên hệ', 'Điện thoại', 'Email', 'Ghi chú', 'Số HĐ']];
    for (const k of this.list()) rows.push([k.id, k.ten, k.mst, k.diaChi, k.nguoiLienHe, k.dienThoai, k.email, k.ghiChu, this.soHD().get(k.id) ?? 0]);
    downloadFile(fileName('khach-hang', 'csv'), 'text/csv', csv(rows));
  }
}
