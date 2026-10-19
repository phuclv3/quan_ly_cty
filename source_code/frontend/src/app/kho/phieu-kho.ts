import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { tongSL } from '../core/calc';
import { KHO_CHUYEN_THANG, PhieuKho } from '../core/models';
import { Perm } from '../core/perm';
import { Store } from '../core/store';
import { nhoLoc } from '../core/ui';
import { money, sum, viDate } from '../core/util';
import { Confirm } from '../shared/confirm';
import { csv, downloadFile, fileName } from '../shared/export';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel, khopThoiGian } from '../shared/filter-bar';
import { guiXoa } from '../shared/ho-so';
import { Pager, paginate } from '../shared/pager';
import { Modal, TrangThai } from '../shared/ui-kit';
import { NGUON_GOC_OPTS, hdCuaPhieu, khoOpts } from './kho-util';
import { PhieuTayForm } from './phieu-tay';

const quyenSua = (p: PhieuKho): Perm =>
  p.nguonGoc === 'Tự động HĐ Mua' ? 'hdmNhapKho' : p.nguonGoc === 'Tự động HĐ Bán' ? 'hdbGiaoHang' : 'khoPhieuTay';

/** KHO-03 danh sách phiếu kho, chi tiết / in / sửa Ngày-Ghi chú, KHO-08 huỷ phiếu, KHO-06 lập phiếu tay. */
@Component({
  selector: 'app-kho-phieu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterBar, Pager, Modal, TrangThai, RouterLink, PhieuTayForm, NgTemplateOutlet],
  template: `
    <div [class.no-print]="!!sel()">
      <div class="section-title">
        <span class="sub">{{ rows().length }} phiếu · Tổng SL {{ money(tongAll()) }}</span>
        <div class="btn-row">
          <button type="button" class="btn sm quiet" (click)="xuatCsv()">Xuất Excel</button>
          @if (store.canEdit('khoPhieuTay')) {
            <button type="button" class="btn" (click)="moTay.set(true)">Lập phiếu điều chỉnh</button>
          }
        </div>
      </div>
      <app-filter [(loc)]="loc" [memo]="memo()" [facets]="facets()" placeholder="Tìm số phiếu, số HĐ, ghi chú, lý do…" />
      <div class="tbl-wrap">
        <table class="tbl freeze">
          <thead>
            <tr><th>Số phiếu</th><th>Ngày</th><th>Nguồn gốc</th><th>Số HĐ liên quan</th><th>Vị trí kho</th><th class="num">Số dòng hàng</th><th class="num">Tổng SL</th><th>Người thực hiện</th><th>Trạng thái</th></tr>
          </thead>
          <tbody>
            @for (p of pg.items(); track p.id) {
              <tr class="click" (click)="mo(p)">
                <td><b>{{ p.soPhieu }}</b></td>
                <td>{{ viDate(p.ngay) }}</td>
                <td>{{ p.nguonGoc }}</td>
                <td>
                  @if (hd(p); as h) { <a [routerLink]="h.link" (click)="$event.stopPropagation()">{{ h.so }}</a> } @else { — }
                </td>
                <td>{{ store.khoTen(p.kho) }}</td>
                <td class="num">{{ p.dong.length }}</td>
                <td class="num">{{ money(tongSL(p)) }}</td>
                <td>{{ store.userName(p.nguoiThucHien) }}</td>
                <td>
                  <app-tt [v]="p.trangThai" />
                  @if (choXoa(p)) { <app-tt v="Chờ xoá" /> }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="empty">Không có phiếu nào khớp bộ lọc</td></tr>
            }
          </tbody>
        </table>
      </div>
      <app-pager [pager]="pg" />
      <div class="note info">
        Phiếu tự động (từ HĐ Mua / HĐ Bán) không sửa số lượng — chỉ sửa Ngày, Ghi chú; huỷ phiếu qua duyệt xoá, duyệt xong phiếu chuyển "Đã huỷ" và tồn tính lại.
        Phiếu có Vị trí kho "Chuyển thẳng — không qua kho" chỉ lưu để truy vết theo HĐ, không cộng/trừ tồn (KHO-07).
      </div>
    </div>

    <app-modal [open]="!!sel()" [title]="'Phiếu ' + (loai() === 'Nhập' ? 'nhập' : 'xuất') + ' kho ' + (sel()?.soPhieu ?? '')" [sub]="sel()?.nguonGoc ?? ''" size="lg" (closed)="dong()">
      @if (sel(); as p) {
        <div class="no-print">
          <div class="btn-row" style="justify-content:flex-start;margin-bottom:10px">
            <app-tt [v]="p.trangThai" />
            @if (choXoa(p)) { <app-tt v="Chờ xoá" /> }
            @if (p.kho === ctId) { <span class="tag mute">Chuyển thẳng — không tính tồn</span> }
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="pk-ngay">Ngày</label>
              <input id="pk-ngay" type="date" [value]="ngay()" [disabled]="!suaDuoc(p)" (input)="ngay.set($any($event.target).value)" />
            </div>
            <div class="field"><span class="lbl">Vị trí kho</span><div class="ro">{{ store.khoTen(p.kho) }}</div></div>
            <div class="field">
              <span class="lbl">Số HĐ liên quan</span>
              <div class="ro">@if (hd(p); as h) { <a [routerLink]="h.link">{{ h.so }}</a> } @else { — }</div>
            </div>
            <div class="field"><span class="lbl">Người thực hiện</span><div class="ro">{{ store.userName(p.nguoiThucHien) }}</div></div>
            @if (p.lyDo) { <div class="field wide"><span class="lbl">Lý do điều chỉnh</span><div class="ro">{{ p.lyDo }}</div></div> }
            <div class="field wide">
              <label for="pk-gc">Ghi chú</label>
              <textarea id="pk-gc" rows="2" [value]="ghiChu()" [disabled]="!suaDuoc(p)" (input)="ghiChu.set($any($event.target).value)"></textarea>
            </div>
          </div>
          <h3 class="section-title">Dòng hàng</h3>
          <ng-container [ngTemplateOutlet]="bang" />
        </div>

        <div class="print-only">
          <h2 style="text-align:center;margin:0">PHIẾU {{ loai() === 'Nhập' ? 'NHẬP' : 'XUẤT' }} KHO</h2>
          <p style="text-align:center">Số: <b>{{ p.soPhieu }}</b> · Ngày {{ viDate(p.ngay) }}</p>
          <p>Nguồn gốc: {{ p.nguonGoc }}<br />Vị trí kho: {{ store.khoTen(p.kho) }}<br />Số HĐ liên quan: {{ hd(p)?.so ?? '—' }}
            @if (p.lyDo) { <br />Lý do điều chỉnh: {{ p.lyDo }} }
            @if (p.ghiChu) { <br />Ghi chú: {{ p.ghiChu }} }
          </p>
          <ng-container [ngTemplateOutlet]="bang" />
          <table style="width:100%;margin-top:28px;text-align:center"><tr><td><b>Người lập phiếu</b><br />{{ store.userName(p.nguoiThucHien) }}</td><td><b>Thủ kho</b></td><td><b>{{ loai() === 'Nhập' ? 'Người giao hàng' : 'Người nhận hàng' }}</b></td></tr></table>
        </div>

        <ng-template #bang>
          <div class="tbl-wrap">
            <table class="tbl compact">
              <thead><tr><th>#</th><th>Loại hàng</th><th>Thuộc tính</th><th class="num">SL</th>@if (loai() === 'Xuất') { <th class="num">Đơn giá gốc</th><th class="num">Thành tiền gốc</th> }</tr></thead>
              <tbody>
                @for (d of p.dong; track $index) {
                  <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ store.loaiHangTen(d.loaiHang) }} <span class="sub">{{ d.loaiHang }} · {{ store.loaiHangById(d.loaiHang)?.dvt }}</span></td>
                    <td>{{ d.thuocTinh || '—' }}</td>
                    <td class="num">{{ money(d.soLuong) }}</td>
                    @if (loai() === 'Xuất') { <td class="num">{{ money(d.donGiaGoc ?? 0) }}</td><td class="num">{{ money((d.donGiaGoc ?? 0) * d.soLuong) }}</td> }
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr><td colspan="3">Tổng</td><td class="num">{{ money(tongSL(p)) }}</td>@if (loai() === 'Xuất') { <td></td><td class="num">{{ money(thanhTien(p)) }}</td> }</tr>
              </tfoot>
            </table>
          </div>
        </ng-template>
      }
      <div foot class="btn-row">
        @if (sel(); as p) {
          @if (huyDuoc(p)) { <button type="button" class="btn danger quiet" (click)="huy(p)">Huỷ phiếu</button> }
          <button type="button" class="btn quiet" (click)="inPhieu()">In phiếu</button>
          @if (suaDuoc(p)) { <button type="button" class="btn" (click)="luu(p)">Lưu Ngày / Ghi chú</button> }
        }
        <button type="button" class="btn quiet" (click)="dong()">Đóng</button>
      </div>
    </app-modal>

    <app-kho-phieu-tay [open]="moTay()" [loaiMacDinh]="loai()" (closed)="moTay.set(false)" />
  `,
})
export class PhieuKhoTab {
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  readonly loai = input.required<PhieuKho['loai']>();
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly tongSL = tongSL;
  protected readonly ctId = KHO_CHUYEN_THANG;

  protected readonly memo = computed(() => `kho-phieu-${this.loai() === 'Nhập' ? 'nhap' : 'xuat'}`);
  protected readonly loc = linkedSignal<Loc>(() => nhoLoc(this.memo(), LOC_RONG));
  protected readonly facets = computed<Facet[]>(() => [
    { key: 'kho', label: 'Kho', options: khoOpts(this.store.db()) },
    { key: 'nguonGoc', label: 'Nguồn gốc', options: NGUON_GOC_OPTS.filter((o) => o.value !== (this.loai() === 'Nhập' ? 'Tự động HĐ Bán' : 'Tự động HĐ Mua')) },
    { key: 'tt', label: 'Trạng thái', options: [{ value: 'Hiệu lực', label: 'Hiệu lực' }, { value: 'Đã huỷ', label: 'Đã huỷ' }] },
  ]);

  protected readonly rows = computed(() => {
    const l = this.loc();
    return this.store
      .phieuKho()
      .filter(
        (p) =>
          p.loai === this.loai() &&
          khopThoiGian(l, p.ngay) &&
          khopSel(l, 'kho', p.kho) &&
          khopSel(l, 'nguonGoc', p.nguonGoc) &&
          khopSel(l, 'tt', p.trangThai) &&
          khopQ(l, p.soPhieu, hdCuaPhieu(this.store, p)?.so, p.ghiChu, p.lyDo, this.store.khoTen(p.kho), ...p.dong.map((d) => `${d.loaiHang} ${this.store.loaiHangTen(d.loaiHang)} ${d.thuocTinh}`)),
      )
      .sort((a, b) => (a.ngay === b.ngay ? b.soPhieu.localeCompare(a.soPhieu) : a.ngay < b.ngay ? 1 : -1));
  });
  protected readonly pg = paginate(this.rows);
  protected readonly tongAll = computed(() => sum(this.rows().filter((p) => p.trangThai === 'Hiệu lực'), tongSL));

  // ── Chi tiết ──
  private readonly selId = signal<string | null>(null);
  protected readonly sel = computed(() => this.store.phieuKho().find((p) => p.id === this.selId()) ?? null);
  protected readonly ngay = signal('');
  protected readonly ghiChu = signal('');
  protected readonly moTay = signal(false);

  protected hd(p: PhieuKho) {
    return hdCuaPhieu(this.store, p);
  }
  protected choXoa(p: PhieuKho): boolean {
    return this.store.dangChoXoa('PhieuKho', p.id);
  }
  protected suaDuoc(p: PhieuKho): boolean {
    return p.trangThai === 'Hiệu lực' && !this.choXoa(p) && this.store.canEdit(quyenSua(p));
  }
  protected huyDuoc(p: PhieuKho): boolean {
    return p.trangThai === 'Hiệu lực' && !this.choXoa(p) && this.store.level('duyetXoa') !== 'none' && this.store.canEdit(quyenSua(p));
  }
  protected thanhTien(p: PhieuKho): number {
    return sum(p.dong, (d) => (d.donGiaGoc ?? 0) * d.soLuong);
  }

  protected mo(p: PhieuKho): void {
    this.selId.set(p.id);
    this.ngay.set(p.ngay);
    this.ghiChu.set(p.ghiChu ?? '');
  }
  protected dong(): void {
    this.selId.set(null);
  }
  protected luu(p: PhieuKho): void {
    if (!this.ngay()) return this.store.say('Chưa chọn Ngày');
    const e = this.store.suaPhieuKho(p.id, { ngay: this.ngay(), ghiChu: this.ghiChu().trim() || undefined });
    this.store.say(e ?? `Đã lưu phiếu ${p.soPhieu}`);
  }
  protected async huy(p: PhieuKho): Promise<void> {
    await guiXoa(this.confirm, this.store, 'PhieuKho', p.id, `Phiếu ${p.soPhieu}`);
  }
  protected inPhieu(): void {
    window.print();
  }

  protected xuatCsv(): void {
    const rows: (string | number)[][] = [['Số phiếu', 'Ngày', 'Nguồn gốc', 'Số HĐ liên quan', 'Vị trí kho', 'Số dòng hàng', 'Tổng SL', 'Người thực hiện', 'Trạng thái']];
    for (const p of this.rows())
      rows.push([p.soPhieu, viDate(p.ngay), p.nguonGoc, this.hd(p)?.so ?? '', this.store.khoTen(p.kho), p.dong.length, tongSL(p), this.store.userName(p.nguoiThucHien), p.trangThai]);
    downloadFile(fileName(this.loai() === 'Nhập' ? 'phieu-nhap' : 'phieu-xuat', 'csv'), 'text/csv', csv(rows));
  }
}
