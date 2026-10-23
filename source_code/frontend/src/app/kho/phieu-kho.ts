import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { giaTriPhieu, maLo, tongSL } from '../core/calc';
import { KHO_CHUYEN_THANG, PhieuKho } from '../core/models';
import { Perm } from '../core/perm';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { nhoLoc } from '../core/ui';
import { money, sum, viDate, viMoment } from '../core/util';
import { Confirm } from '../shared/confirm';
import { xemPhieuKhoPdf, xuatCsv } from '../shared/export';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel, khopThoiGian } from '../shared/filter-bar';
import { guiXoa, guiXoaNhieu } from '../shared/ho-so';
import { ChonNhieu } from '../shared/chon-nhieu';
import { ChonBar } from '../shared/chon-bar';
import { Pager, paginate } from '../shared/pager';
import { Modal, TrangThai } from '../shared/ui-kit';
import { NGUON_GOC_OPTS, hdCuaPhieu, khoOpts } from './kho-util';
import { PhieuTayForm } from './phieu-tay';

interface SuaLo {
  i: number;
  thuocTinh: string;
  donGia: number;
  vat?: number;
  ghiChu: string;
}

const quyenSua = (p: PhieuKho): Perm =>
  p.nguonGoc === 'Tự động HĐ Mua' ? 'hdmNhapKho' : p.nguonGoc === 'Tự động HĐ Bán' ? 'hdbGiaoHang' : 'khoPhieuTay';

/** KHO-03 danh sách phiếu kho, chi tiết / in / sửa Ngày-Ghi chú, KHO-08 huỷ phiếu, KHO-06 lập phiếu tay. */
@Component({
  selector: 'app-kho-phieu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChonBar, FilterBar, Pager, Modal, TrangThai, RouterLink, PhieuTayForm, NgTemplateOutlet],
  template: `
    <div [class.no-print]="!!sel()">
      <div class="section-title">
        <span class="sub">{{ rows().length }} phiếu · Tổng SL {{ money(tongAll()) }} · Giá trị {{ money(giaTriAll()) }}</span>
        <div class="btn-row">
          <button type="button" class="btn sm quiet" (click)="xuatCsv()">Xuất CSV</button>
          @if (store.canEdit('khoPhieuTay')) {
            <button type="button" class="btn" (click)="moTay.set(true)">{{ loai() === 'Nhập' ? '+ Lập phiếu nhập' : '+ Lập phiếu xuất' }}</button>
          }
        </div>
      </div>
      <app-filter [(loc)]="loc" [memo]="memo()" [facets]="facets()" placeholder="Tìm số phiếu, số HĐ, số hoá đơn, mã lô, mã hàng…" />
      <app-chon-bar [cn]="cn" ten="phiếu" (xoa)="xoaNhieu()" />
        <div class="tbl-wrap">
        <table class="tbl freeze">
          <thead>
            <tr>@if (chonDuoc()) { <th style="width:36px"><input type="checkbox" aria-label="Chọn cả trang" [checked]="cn.du(idTrang())" (change)="cn.chonTat(idTrang(), $any($event.target).checked)" /></th> }<th>Số phiếu</th><th>Ngày</th><th>Nguồn gốc</th><th>{{ loai() === 'Nhập' ? 'HĐ mua / Số hoá đơn' : 'HĐ bán' }}</th><th>Vị trí kho</th><th class="num">Số dòng</th><th class="num">Tổng SL</th><th class="num">{{ loai() === 'Nhập' ? 'Giá trị nhập' : 'Giá vốn' }}</th><th>Người thực hiện</th><th>Trạng thái</th></tr>
          </thead>
          <tbody>
            @for (p of pg.items(); track p.id) {
              <tr class="click" (click)="mo(p)">
              @if (chonDuoc()) {
                <td (click)="$event.stopPropagation()">@if (xoaDuoc(p)) { <input type="checkbox" [attr.aria-label]="'Chọn ' + p.soPhieu" [checked]="cn.co(p.id)" (change)="cn.flip(p.id)" /> }</td>
              }
                <td><b>{{ p.soPhieu }}</b></td>
                <td>{{ viDate(p.ngay) }}</td>
                <td>{{ p.nguonGoc }}</td>
                <td>
                  @if (hd(p); as h) { <a [routerLink]="h.link" (click)="$event.stopPropagation()">{{ h.so }}</a> } @else if (!p.soHoaDon) { — }
                  @if (p.soHoaDon) { <span class="sub">{{ p.soHoaDon }}</span> }
                </td>
                <td>{{ store.khoTen(p.kho) }}</td>
                <td class="num">{{ p.dong.length }}</td>
                <td class="num">{{ money(tongSL(p)) }}</td>
                <td class="num">{{ money(giaTriPhieu(p)) }}</td>
                <td>{{ store.userName(p.nguoiThucHien) }}</td>
                <td>
                  <app-tt [v]="p.trangThai" />
                  @if (choXoa(p)) { <app-tt v="Chờ xoá" /> }
                </td>
              </tr>
            } @empty {
              <tr><td [attr.colspan]="chonDuoc() ? 11 : 10" class="empty">{{ coPhieu() ? 'Không có phiếu nào khớp bộ lọc' : 'Chưa có phiếu ' + (loai() === 'Nhập' ? 'nhập' : 'xuất') + ' kho nào' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
      <app-pager [pager]="pg" />
      <div class="note info">
        Phiếu nhập: mỗi dòng là một LÔ có mã lô + đơn giá riêng. Phiếu xuất: mỗi dòng trừ đúng một lô, giá vốn = đơn giá lô.
        Phiếu không sửa số lượng — chỉ sửa Ngày, Ghi chú; huỷ phiếu qua duyệt xoá, duyệt xong phiếu chuyển "Đã huỷ" và tồn tính lại.
        Phiếu nhập có lô đã xuất phải huỷ phiếu xuất trước.
        Phiếu có Vị trí kho "Chuyển thẳng — không qua kho" chỉ lưu để truy vết theo HĐ, không cộng/trừ tồn (KHO-07).
      </div>
    </div>

    <app-modal #mPK [open]="!!sel()" [title]="'Phiếu ' + (loai() === 'Nhập' ? 'nhập' : 'xuất') + ' kho ' + (sel()?.soPhieu ?? '')" [sub]="sel()?.nguonGoc ?? ''" size="lg" [dirty]="dirty()" (closed)="dong()">
      @if (sel(); as p) {
        <div class="no-print">
          <div class="btn-row" style="justify-content:flex-start;margin-bottom:10px">
            <app-tt [v]="p.trangThai" />
            @if (choXoa(p)) { <app-tt v="Chờ xoá" /> }
            @if (p.kho === ctId) { <span class="tag mute">Chuyển thẳng — không tính tồn</span> }
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="pk-ngay">Ngày <span class="req">*</span></label>
              <input id="pk-ngay" type="date" [value]="ngay()" [disabled]="!suaDuoc(p)" (input)="ngay.set($any($event.target).value)" />
            </div>
            <div class="field"><span class="lbl">Vị trí kho</span><div class="ro">{{ store.khoTen(p.kho) }}</div></div>
            <div class="field">
              <span class="lbl">Số HĐ liên quan</span>
              <div class="ro">@if (hd(p); as h) { <a [routerLink]="h.link">{{ h.so }}</a> } @else { — }</div>
            </div>
            <div class="field"><span class="lbl">Người thực hiện</span><div class="ro">{{ store.userName(p.nguoiThucHien) }}</div></div>
            @if (p.loai === 'Nhập') {
              <div class="field"><span class="lbl">Số hoá đơn NCC</span><div class="ro">{{ p.soHoaDon || '—' }}</div></div>
              <div class="field"><span class="lbl">Nhà cung cấp</span><div class="ro">{{ p.ncc ? store.nccById(p.ncc)?.ten ?? p.ncc : '—' }}</div></div>
            }
            @if (p.lyDo) { <div class="field full"><span class="lbl">Lý do điều chỉnh</span><div class="ro">{{ p.lyDo }}</div></div> }
            @if (yeuCau(p); as y) {
              <div class="field full">
                <span class="lbl">{{ y.trangThai === TT.DA_DUYET ? ttNhan(TT.DA_HUY) : 'Yêu cầu huỷ' }}</span>
                <div class="ro">
                  {{ store.userName(y.nguoiGui) }} gửi yêu cầu lúc {{ viMoment(y.ngayGui) }} — lý do: {{ y.lyDo }}
                  @if (y.nguoiDuyet && y.trangThai === TT.DA_DUYET) { · {{ store.userName(y.nguoiDuyet) }} duyệt lúc {{ viMoment(y.ngayDuyet) }} }
                </div>
              </div>
            }
            <div class="field full">
              <label for="pk-gc">Ghi chú</label>
              <textarea id="pk-gc" rows="2" [value]="ghiChu()" [disabled]="!suaDuoc(p)" (input)="ghiChu.set($any($event.target).value)"></textarea>
            </div>
          </div>
          <h3 class="section-title">Dòng hàng</h3>
          <ng-container [ngTemplateOutlet]="bang" />
          @if (suaLo(); as s) {
            <div class="card" style="margin-top:10px">
              <h3 class="section-title">Sửa lô {{ lo(p, s.i) }} · {{ p.dong[s.i].loaiHang }} (SL {{ p.dong[s.i].soLuong }} — không sửa)</h3>
              <div class="form-grid">
                <div class="field wide"><label for="sl-qc">Quy cách / nồng độ</label><input id="sl-qc" [value]="s.thuocTinh" (input)="setSuaLo({ thuocTinh: $any($event.target).value })" /></div>
                <div class="field"><label for="sl-dg">Đơn giá chưa VAT <span class="req">*</span></label><input id="sl-dg" type="number" min="0" [value]="s.donGia" (input)="setSuaLo({ donGia: +$any($event.target).value })" /></div>
                <div class="field"><label for="sl-vat">VAT %</label><input id="sl-vat" type="number" min="0" max="10" [value]="s.vat ?? ''" (input)="setSuaLo({ vat: $any($event.target).value === '' ? undefined : +$any($event.target).value })" /></div>
                <div class="field wide"><label for="sl-gc">Ghi chú</label><input id="sl-gc" [value]="s.ghiChu" (input)="setSuaLo({ ghiChu: $any($event.target).value })" /></div>
              </div>
              @if (soDongXuatLo(p, s.i); as n) { <p class="note warn">Lô này đã xuất ở {{ n }} dòng phiếu xuất — đổi đơn giá thì giá vốn các dòng đó tính lại theo giá mới.</p> }
              <div class="btn-row">
                <button type="button" class="btn quiet" (click)="suaLo.set(null)">Thôi</button>
                <button type="button" class="btn" (click)="luuLo(p)">Lưu lô</button>
              </div>
            </div>
          }
        </div>

        <div class="print-only">
          <h2 style="text-align:center;margin:0">PHIẾU {{ loai() === 'Nhập' ? 'NHẬP' : 'XUẤT' }} KHO</h2>
          <p style="text-align:center">Số: <b>{{ p.soPhieu }}</b> · Ngày {{ viDate(p.ngay) }}</p>
          <p>Nguồn gốc: {{ p.nguonGoc }}<br />Vị trí kho: {{ store.khoTen(p.kho) }}<br />Số HĐ liên quan: {{ hd(p)?.so ?? '—' }}
            @if (p.soHoaDon) { <br />Số hoá đơn NCC: {{ p.soHoaDon }} }
            @if (p.ncc) { <br />Nhà cung cấp: {{ store.nccById(p.ncc)?.ten ?? p.ncc }} }
            @if (p.lyDo) { <br />Lý do điều chỉnh: {{ p.lyDo }} }
            @if (p.ghiChu) { <br />Ghi chú: {{ p.ghiChu }} }
          </p>
          <ng-container [ngTemplateOutlet]="bang" />
          <table style="width:100%;margin-top:28px;text-align:center"><tr><td><b>Người lập phiếu</b><br />{{ store.userName(p.nguoiThucHien) }}</td><td><b>Thủ kho</b></td><td><b>{{ loai() === 'Nhập' ? 'Người giao hàng' : 'Người nhận hàng' }}</b></td></tr></table>
        </div>

        <ng-template #bang>
          <div class="tbl-wrap">
            <table class="tbl compact">
              @if (loai() === 'Nhập') {
                <thead><tr><th title="Dòng hoá đơn">Dòng HĐ</th><th>Mã lô</th><th>Mã hàng</th><th>Quy cách / nồng độ</th><th class="num">SL</th><th class="num">Đơn giá</th><th class="num">VAT %</th><th class="num">Thành tiền</th><th>Ghi chú</th>@if (suaDuoc(p)) { <th class="no-print"></th> }</tr></thead>
                <tbody>
                  @for (d of p.dong; track $index) {
                    <tr>
                      <td>{{ $index + 1 }}</td>
                      <td><b>{{ lo(p, $index) }}</b></td>
                      <td>{{ d.loaiHang }} <span class="sub">{{ store.loaiHangTen(d.loaiHang) }} · {{ store.loaiHangById(d.loaiHang)?.dvt }}</span></td>
                      <td class="sub">{{ d.thuocTinh || '—' }}</td>
                      <td class="num">{{ money(d.soLuong) }}</td>
                      <td class="num">{{ money(d.donGia ?? 0) }}</td>
                      <td class="num">{{ d.vat ?? '' }}</td>
                      <td class="num">{{ money((d.donGia ?? 0) * d.soLuong) }}</td>
                      <td class="sub">{{ d.ghiChu || '' }}</td>
                      @if (suaDuoc(p)) { <td class="no-print"><button type="button" class="btn sm quiet" (click)="moSuaLo(p, $index)">Sửa lô</button></td> }
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr><td colspan="4">Tổng chưa VAT</td><td class="num">{{ money(tongSL(p)) }}</td><td colspan="2"></td><td class="num">{{ money(giaTriPhieu(p)) }}</td><td colspan="2"></td></tr>
                  <tr><td colspan="7">Tiền VAT · Tổng sau VAT</td><td class="num">{{ money(vatPhieu(p)) }} · <b>{{ money(giaTriPhieu(p) + vatPhieu(p)) }}</b></td><td colspan="2"></td></tr>
                </tfoot>
              } @else {
                <thead><tr><th>#</th><th>Mã lô</th><th>Mã hàng</th><th>Quy cách lô</th><th>Tên trên HĐ</th><th class="num">SL</th><th class="num">Đơn giá vốn</th><th class="num">Giá vốn</th><th>Ghi chú</th></tr></thead>
                <tbody>
                  @for (d of p.dong; track $index) {
                    <tr>
                      <td>{{ $index + 1 }}</td>
                      <td><b>{{ d.lo || '—' }}</b></td>
                      <td>{{ d.loaiHang }} <span class="sub">{{ store.loaiHangTen(d.loaiHang) }} · {{ store.loaiHangById(d.loaiHang)?.dvt }}</span></td>
                      <td class="sub">{{ d.thuocTinh || '—' }}</td>
                      <td>{{ d.tenTrenHD || '—' }}</td>
                      <td class="num">{{ money(d.soLuong) }}</td>
                      <td class="num">{{ money(d.donGiaGoc ?? 0) }}</td>
                      <td class="num">{{ money((d.donGiaGoc ?? 0) * d.soLuong) }}</td>
                      <td class="sub">{{ d.ghiChu || '' }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot><tr><td colspan="5">Tổng</td><td class="num">{{ money(tongSL(p)) }}</td><td></td><td class="num">{{ money(giaTriPhieu(p)) }}</td><td></td></tr></tfoot>
              }
            </table>
          </div>
        </ng-template>
      }
      <div foot class="btn-row">
        @if (sel(); as p) {
          @if (huyDuoc(p)) { <button type="button" class="btn danger quiet" (click)="huy(p)">Huỷ phiếu</button> }
          <button type="button" class="btn quiet" (click)="inPhieu(p)">In phiếu</button>
          @if (suaDuoc(p)) { <button type="button" class="btn" (click)="luu(p)">Lưu Ngày / Ghi chú</button> }
        }
        <button type="button" class="btn quiet" (click)="dong()">Đóng</button>
      </div>
    </app-modal>

    <app-kho-phieu-tay [open]="moTay()" [loaiMacDinh]="loai()" (closed)="moTay.set(false)" />
  `,
})
export class PhieuKhoTab {
  private readonly mPK = viewChild<Modal>('mPK');
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  protected readonly ttNhan = ttNhan;
  private readonly confirm = inject(Confirm);
  readonly loai = input.required<PhieuKho['loai']>();
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly tongSL = tongSL;
  protected readonly giaTriPhieu = giaTriPhieu;
  protected readonly lo = maLo;
  protected readonly suaLo = signal<SuaLo | null>(null);
  protected readonly ctId = KHO_CHUYEN_THANG;

  protected readonly memo = computed(() => `kho-phieu-${this.loai() === 'Nhập' ? 'nhap' : 'xuat'}`);
  protected readonly loc = linkedSignal<Loc>(() => nhoLoc(this.memo(), LOC_RONG));
  protected readonly facets = computed<Facet[]>(() => [
    { key: 'kho', label: 'Kho', options: khoOpts(this.store.db()) },
    { key: 'nguonGoc', label: 'Nguồn gốc', options: NGUON_GOC_OPTS.filter((o) => o.value !== (this.loai() === 'Nhập' ? 'Tự động HĐ Bán' : 'Tự động HĐ Mua')) },
    { key: 'tt', label: 'Trạng thái', options: [TT.HIEU_LUC, TT.DA_HUY].map((v) => ({ value: v, label: ttNhan(v) })) },
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
          khopQ(
            l,
            p.soPhieu,
            p.soHoaDon,
            hdCuaPhieu(this.store, p)?.so,
            p.ghiChu,
            p.lyDo,
            this.store.khoTen(p.kho),
            ...p.dong.map((d, i) => `${p.loai === 'Nhập' ? maLo(p, i) : (d.lo ?? '')} ${d.loaiHang} ${this.store.loaiHangTen(d.loaiHang)} ${d.thuocTinh} ${d.tenTrenHD ?? ''}`),
          ),
      )
      .sort((a, b) => (a.ngay === b.ngay ? b.soPhieu.localeCompare(a.soPhieu) : a.ngay < b.ngay ? 1 : -1));
  });
  protected readonly pg = paginate(this.rows);

  /** Xoá nhiều: phiếu Hiệu lực, chưa chờ xoá, người dùng có quyền sửa loại phiếu đó và gửi được yêu cầu xoá. */
  protected readonly cn = new ChonNhieu();
  protected readonly chonDuoc = computed(() => this.store.level('duyetXoa') !== 'none');
  protected xoaDuoc(p: PhieuKho): boolean {
    return this.huyDuoc(p);
  }
  protected readonly idTrang = computed(() => this.pg.items().filter((p) => this.xoaDuoc(p)).map((p) => p.id));
  protected async xoaNhieu(): Promise<void> {
    const ds = this.rows().filter((p) => this.cn.co(p.id) && this.xoaDuoc(p)).map((p) => ({ id: p.id, ten: p.soPhieu, moTa: `Phiếu ${p.soPhieu}` }));
    if (await guiXoaNhieu(this.confirm, this.store, 'PhieuKho', ds, 'phiếu')) this.cn.xoa();
  }
  protected readonly tongAll = computed(() => sum(this.rows().filter((p) => p.trangThai === TT.HIEU_LUC), tongSL));
  protected readonly giaTriAll = computed(() => sum(this.rows().filter((p) => p.trangThai === TT.HIEU_LUC), giaTriPhieu));

  // ── Chi tiết ──
  private readonly selId = signal<string | null>(null);
  protected readonly sel = computed(() => this.store.phieuKho().find((p) => p.id === this.selId()) ?? null);
  protected readonly ngay = signal('');
  protected readonly ghiChu = signal('');
  protected readonly moTay = signal(false);
  protected readonly viMoment = viMoment;
  protected readonly coPhieu = computed(() => this.store.phieuKho().some((p) => p.loai === this.loai()));
  protected readonly dirty = computed(() => {
    const p = this.sel();
    return !!p && this.suaDuoc(p) && (this.ngay() !== p.ngay || (this.ghiChu().trim() || undefined) !== p.ghiChu);
  });

  constructor() {
    // Liên kết sâu: ?id=<phiếu> mở popup phiếu (từ HĐ, Duyệt xoá, Trang chủ).
    const route = inject(ActivatedRoute);
    const router = inject(Router);
    const id = route.snapshot.queryParamMap.get('id');
    if (!id) return;
    const p = this.store.phieuKho().find((x) => x.id === id);
    if (p) this.mo(p);
    else this.store.say('Không tìm thấy phiếu kho');
    void router.navigate([], { relativeTo: route, queryParams: { id: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  /** Yêu cầu huỷ gần nhất (đang chờ hoặc đã duyệt) — để biết ai huỷ, khi nào, vì sao. */
  protected yeuCau(p: PhieuKho) {
    return this.store
      .yeuCauXoa()
      .filter((y) => y.loai === 'PhieuKho' && y.maDoiTuong === p.id && (y.trangThai === TT.DA_DUYET || y.trangThai === TT.CHO_DUYET))
      .sort((a, b) => (a.ngayGui < b.ngayGui ? 1 : -1))[0];
  }

  protected hd(p: PhieuKho) {
    return hdCuaPhieu(this.store, p);
  }
  protected choXoa(p: PhieuKho): boolean {
    return this.store.dangChoXoa('PhieuKho', p.id);
  }
  protected suaDuoc(p: PhieuKho): boolean {
    return p.trangThai === TT.HIEU_LUC && !this.choXoa(p) && this.store.canEdit(quyenSua(p));
  }
  protected huyDuoc(p: PhieuKho): boolean {
    return p.trangThai === TT.HIEU_LUC && !this.choXoa(p) && this.store.level('duyetXoa') !== 'none' && this.store.canEdit(quyenSua(p));
  }
  protected vatPhieu(p: PhieuKho): number {
    return sum(p.dong, (d) => Math.round(((d.donGia ?? 0) * d.soLuong * (d.vat ?? 0)) / 100));
  }
  protected soDongXuatLo(p: PhieuKho, i: number): number {
    const lo = maLo(p, i);
    return sum(
      this.store.phieuKho().filter((q) => q.loai === 'Xuất' && q.trangThai === TT.HIEU_LUC),
      (q) => q.dong.filter((d) => d.lo === lo).length,
    );
  }
  protected moSuaLo(p: PhieuKho, i: number): void {
    const d = p.dong[i];
    this.suaLo.set({ i, thuocTinh: d.thuocTinh, donGia: d.donGia ?? 0, vat: d.vat, ghiChu: d.ghiChu ?? '' });
  }
  protected setSuaLo(x: Partial<SuaLo>): void {
    this.suaLo.update((s) => (s ? { ...s, ...x } : s));
  }
  protected luuLo(p: PhieuKho): void {
    const s = this.suaLo();
    if (!s) return;
    const r = this.store.suaLo(p.id, s.i, s);
    if (typeof r === 'string') return this.store.say(r);
    this.store.say(r.capNhat ? `Đã lưu lô — cập nhật giá vốn ${r.capNhat} dòng xuất` : 'Đã lưu lô');
    this.suaLo.set(null);
  }

  protected mo(p: PhieuKho): void {
    this.suaLo.set(null);
    this.selId.set(p.id);
    this.ngay.set(p.ngay);
    this.ghiChu.set(p.ghiChu ?? '');
  }
  protected dong(): void {
    this.selId.set(null);
  }
  protected luu(p: PhieuKho): void {
    if (this.mPK()?.kt.hopLe() === false) return;
    if (!this.ngay()) return this.store.say('Chưa chọn Ngày');
    const e = this.store.suaPhieuKho(p.id, { ngay: this.ngay(), ghiChu: this.ghiChu().trim() || undefined });
    this.store.say(e ?? `Đã lưu phiếu ${p.soPhieu}`);
  }
  protected async huy(p: PhieuKho): Promise<void> {
    await guiXoa(this.confirm, this.store, 'PhieuKho', p.id, `Phiếu ${p.soPhieu}`);
  }
  /** Mở PDF do backend dựng ở tab mới (mở tab trước khi gọi API để trình duyệt không chặn cửa sổ bật lên). */
  protected async inPhieu(p: PhieuKho): Promise<void> {
    const w = window.open('', '_blank');
    const { blob, loi } = await xemPhieuKhoPdf(p.id);
    if (!blob) {
      w?.close();
      return this.store.say(loi, 'bad');
    }
    const url = URL.createObjectURL(blob);
    if (w) w.location.href = url;
    else this.store.say('Trình duyệt đang chặn cửa sổ bật lên — cho phép rồi bấm lại', 'bad');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  protected xuatCsv(): void {
    const rows: (string | number)[][] = [['Số phiếu', 'Ngày', 'Nguồn gốc', 'Số HĐ liên quan', 'Số hoá đơn', 'NCC', 'Vị trí kho', 'Dòng', 'Mã lô', 'Mã hàng', 'Quy cách', 'Tên trên HĐ', 'SL', 'Đơn giá', 'Thành tiền', 'VAT %', 'Ghi chú dòng', 'Người thực hiện', 'Trạng thái']];
    for (const p of this.rows())
      p.dong.forEach((d, i) => {
        const gia = (p.loai === 'Nhập' ? d.donGia : d.donGiaGoc) ?? 0;
        rows.push([
          p.soPhieu,
          viDate(p.ngay),
          p.nguonGoc,
          this.hd(p)?.so ?? '',
          p.soHoaDon ?? '',
          this.store.nccById(p.ncc)?.ten ?? '',
          this.store.khoTen(p.kho),
          i + 1,
          p.loai === 'Nhập' ? maLo(p, i) : (d.lo ?? ''),
          d.loaiHang,
          d.thuocTinh,
          d.tenTrenHD ?? '',
          d.soLuong,
          gia,
          gia * d.soLuong,
          d.vat ?? '',
          d.ghiChu ?? '',
          this.store.userName(p.nguoiThucHien),
          ttNhan(p.trangThai),
        ]);
      });
    void xuatCsv(this.loai() === 'Nhập' ? 'phieu-nhap' : 'phieu-xuat', rows);
  }
}
