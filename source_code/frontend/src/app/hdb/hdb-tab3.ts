import { ChangeDetectionStrategy, Component, computed, inject, input, model, signal, viewChild } from '@angular/core';
import { Store } from '../core/store';
import { TT } from '../core/trang-thai';
import { DongHangBan, DotTTBan, HopDongBan, LCP_HOA_HONG } from '../core/models';
import { Buoc, apDungTuDongHdb, congNgay, dotBanDaThu, dotQuaHan, hdbCalc, kiemTraDongBan, loConHang, tongDongBan, tongDongBanTH } from '../core/calc';
import { xuatToTrinhHdb } from '../shared/export';
import { money, pct, sum, todayIso, uid, viDate } from '../core/util';
import { BuocTable, Kpi, MoneyInput, Pick, TrangThai } from '../shared/ui-kit';
import { maHangOpts, moTaMa } from '../kho/kho-util';
import { Icon } from '../shared/icon';
import { Confirm } from '../shared/confirm';
import { guiXoa } from '../shared/ho-so';
import { RouterLink } from '@angular/router';
import { KiemTra } from '../shared/kiem-tra';

interface ThuNhap {
  ngayThu: string;
  soTienThu: number;
  nguonTienNhan: string;
}

/** HDB-07…HDB-10 — Tab 3 Giá trị & Thanh toán. */
@Component({
  selector: 'app-hdb-tab3',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyInput, BuocTable, Kpi, TrangThai, Icon, RouterLink, KiemTra, Pick],
  template: `
    <div class="kpis">
      <app-kpi label="Giá trị sau VAT" [value]="money(c().sauVAT)" />
      <app-kpi label="Đã thu (phiếu đã duyệt)" [value]="money(c().daThu)" [sub]="pct(c().pctThu) + (c().daThuCho ? ' · chờ duyệt ' + money(c().daThuCho) : '')" tone="ok" />
      <app-kpi label="Công nợ phải thu" [value]="money(c().conPhaiThu)" [sub]="c().phat ? 'Giá trị quyết toán − Σ thực thu đã duyệt' : 'Sau VAT − Σ thực thu đã duyệt'" [tone]="c().quaHan ? 'bad' : c().conPhaiThu > 0 ? 'warn' : 'ok'" />
    </div>

    <section class="card">
      <div class="section-title">
        <h2>Sản phẩm & giá (chọn từ kho)</h2>
        <div class="btn-row">
          @if (thieuMua().length && saved() && edit()) {
            <button type="button" class="btn sm danger" (click)="deNghi()"><app-icon name="truck" [size]="15" /> Gửi đề nghị cấp vật tư ({{ thieuMua().length }} dòng thiếu)</button>
          }
          <button type="button" class="btn sm quiet" (click)="inToTrinh()"><app-icon name="print" [size]="15" /> Xuất tờ trình (Word)</button>
          @if (edit()) { <button type="button" class="btn sm quiet" (click)="themSP()"><app-icon name="plus" [size]="15" /> Thêm sản phẩm</button> }
        </div>
      </div>
      <div class="tbl-wrap">
        <table class="tbl compact">
          <thead>
            <tr>
              <th style="min-width:280px">Mã hàng</th><th style="min-width:220px">Tên hàng trên HĐ (nồng độ)</th><th class="num w-sm">SL</th>
              <th class="num">Đơn giá HĐ trước VAT</th><th class="num">Thành tiền</th>
              <th class="num" title="Giá vốn dự kiến — dùng cho Bảng tính giá / Tờ trình">Đơn giá thực hiện</th><th class="num">Thành tiền TH</th>
              <th>Kho</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (k of kho(); track k.d.id; let i = $index) {
              <tr>
                <td>
                  <app-pick [options]="maOpts()" [value]="k.d.loaiHang" [disabled]="!edit()" (valueChange)="chonMa(i, $event)" />
                </td>
                <td><textarea class="keo-gian" rows="1" [value]="k.d.tenHang" [disabled]="!edit()" autocomplete="off" placeholder="Nhập tay, VD Bình khí chuẩn NO 500ppm" (keydown.enter)="$event.preventDefault()" (input)="setSP(i, { tenHang: $any($event.target).value })" aria-label="Tên hàng trên HĐ"></textarea></td>
                <td><input class="num" type="number" min="0" [value]="k.d.soLuong" [disabled]="!edit()" (input)="setSP(i, { soLuong: +$any($event.target).value || 0 })" aria-label="Số lượng" /></td>
                <td><app-money [value]="k.d.donGia" [disabled]="!edit()" (valueChange)="setSP(i, { donGia: $event })" /></td>
                <td class="num">{{ money(k.d.soLuong * k.d.donGia) }}</td>
                <td><app-money [value]="k.d.donGiaTH" [disabled]="!edit()" (valueChange)="setSP(i, { donGiaTH: $event })" /></td>
                <td class="num">{{ money(k.d.soLuong * k.d.donGiaTH) }}</td>
                <td>
                  @if (!k.d.loaiHang) { <span class="muted">—</span> }
                  @else if (k.trangThai === 'Đủ hàng') { <span class="tag ok" [title]="'Tồn kho ' + k.tonThuc + ', dành cho HĐ này ' + k.ton">✓ Có trong kho ({{ k.ton }})</span> }
                  @else if (k.trangThai === 'Đã đề nghị mua') { <span class="tag warn">Đã đề nghị mua {{ k.daDeNghi }}</span> }
                  @else { <span class="tag bad" [title]="'Tồn ' + k.ton + ', cần ' + k.con">✗ Cần mua {{ k.thieu - k.daDeNghi }}</span> }
                  @if (k.daGiuKhac) { <span class="sub" title="HĐ hiệu lực trước được giữ hàng trước">HĐ khác giữ {{ k.daGiuKhac }}/{{ k.tonThuc }}</span> }
                  @if (k.daGiao) { <span class="sub">Đã giao {{ k.daGiao }}</span> }
                </td>
                <td>@if (edit() && !k.daGiao) { <button type="button" class="icon-btn sm" aria-label="Xoá dòng" (click)="xoaSP(i)"><app-icon name="trash" [size]="16" /></button> }</td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="muted">Chưa có sản phẩm — bấm "Thêm sản phẩm" để chọn mã hàng từ kho (VD KC-NO-8L), nhập đơn giá và số lượng. Có dòng thì Giá trị HĐ tự cộng.</td></tr>
            }
          </tbody>
          @if (f().dongHang?.length) {
            <tfoot>
              <tr><th colspan="4">Thành tiền trước thuế</th><td class="num"><b>{{ money(tongSP()) }}</b></td><td></td><td class="num">{{ money(tongTH()) }}</td><td colspan="2"></td></tr>
              <tr><th colspan="4">Thuế VAT {{ f().vat }}%</th><td class="num">{{ money(c().sauVAT - tongSP()) }}</td><td colspan="4"></td></tr>
              <tr><th colspan="4">Giá sau thuế</th><td class="num"><b>{{ money(c().sauVAT) }}</b></td><td colspan="4"></td></tr>
            </tfoot>
          }
        </table>
      </div>
      @if (thieuMua().length) {
        <p class="note bad">Thiếu hàng trong kho: {{ thieuMuaText() }} — cần mua NCC.
          @if (!saved()) { Lưu HĐ rồi bấm "Gửi đề nghị cấp vật tư". } @else if (!edit()) { Người phụ trách HĐ gửi đề nghị cấp vật tư. }
        </p>
      } @else if (f().dongHang?.length) {
        <p class="note ok">Mọi sản phẩm đã có trong kho hoặc đã đề nghị mua.</p>
      }
      <p class="sub">Đơn giá thực hiện tự gợi ý theo đơn giá lô nhập trước còn hàng (sửa được). Giữ hàng: HĐ từ Hiệu lực được giữ phần còn phải giao, HĐ hiệu lực trước giữ trước; Báo giá chỉ thấy phần tồn chưa HĐ nào giữ.</p>
    </section>

    <div class="grid c2">
      <section class="card">
        <h2 class="section-title">Giá trị HĐ & Chênh lệch</h2>
        <div class="form-grid">
          <div class="field">
            <label for="t3-truoc">Tổng GTHĐ trước VAT</label>
            <app-money inputId="t3-truoc" [value]="f().truocVAT" [disabled]="!edit() || khoaGiaTri() || coSP()" (valueChange)="set('truocVAT', $event)" />
            @if (khoaGiaTri()) { <span class="hint">Khoá vì HĐ đã có phiếu Thu.</span> } @else if (coSP()) { <span class="hint">= Σ thành tiền sản phẩm</span> }
          </div>
          <div class="field">
            <label for="t3-vat">VAT</label>
            <select id="t3-vat" [disabled]="!edit() || khoaGiaTri()" (change)="setVat($any($event.target).value)">
              @for (v of vats; track v) { <option [value]="v" [selected]="v === f().vat">{{ v }}%</option> }
            </select>
          </div>
          <div class="field">
            <span class="lbl">Tổng GTHĐ sau VAT</span>
            <div class="ro num" title="Sau VAT = Trước VAT × (1 + VAT%)">{{ money(c().sauVAT) }}</div>
          </div>
          <div class="field">
            <label for="t3-tt">GTHĐ thực tế trước VAT</label>
            <app-money inputId="t3-tt" [value]="f().thucTeTruocVAT" [disabled]="!edit() || coSP()" (valueChange)="set('thucTeTruocVAT', $event)" />
            @if (coSP()) { <span class="hint">= Σ thành tiền thực hiện</span> }
          </div>
          <div class="field">
            <span class="lbl">Chênh lệch</span>
            <div class="ro num" [class.neg]="c().chenhLech < 0" title="Chênh lệch = Tổng GTHĐ trước VAT − GTHĐ thực tế trước VAT">{{ money(c().chenhLech) }}</div>
          </div>
          <div class="field">
            <span class="lbl">Tỷ lệ chênh lệch</span>
            <div class="ro num" title="Tỷ lệ = Chênh lệch ÷ GTHĐ thực tế trước VAT">{{ pct(c().tyLeCL) }}</div>
          </div>
          <div class="field">
            <label for="t3-phat">Phạt HĐ khi quyết toán</label>
            <app-money inputId="t3-phat" [value]="f().phatHD ?? 0" [disabled]="!edit()" (valueChange)="set('phatHD', $event || undefined)" />
          </div>
          <div class="field">
            <span class="lbl">Giá trị quyết toán</span>
            <div class="ro num" title="Giá trị quyết toán = Sau VAT − Phạt HĐ">{{ money(c().giaTriQT) }}</div>
          </div>
          @if (f().phatHD) {
            <div class="field full">
              <label for="t3-lyphat">Lý do phạt</label>
              <input id="t3-lyphat" [value]="f().lyDoPhat ?? ''" [disabled]="!edit()" placeholder="VD giao chậm 10 ngày — phạt 2%" (input)="set('lyDoPhat', $any($event.target).value || undefined)" />
            </div>
          }
        </div>
        @if (f().phatHD) { <p class="sub">HĐ ký 100% giá trị nhưng quyết toán phát sinh phạt → công nợ phải thu tính theo Giá trị quyết toán.</p> }
      </section>

      <section class="card">
        <h2 class="section-title">Thuế TNDN trên chênh lệch</h2>
        <app-buoc [rows]="buocThue()" />
        <p class="sub">Tham số lưu theo HĐ lúc tạo: mốc {{ pct(f().thamSoThue.nguong) }} × GTHĐ thực tế, mức {{ pct(f().thamSoThue.muc1) }} / {{ pct(f().thamSoThue.muc2) }}. Chênh lệch ≤ 0 → thuế = 0.</p>
      </section>
    </div>

    <section class="card">
      <div class="section-title">
        <h2>Tiền trả khách (hoa hồng)</h2>
        <span class="sub">Lưu ở Chi phí thực hiện HĐ loại "Hoa hồng kinh doanh"</span>
      </div>
      <div class="tbl-wrap">
        <table class="tbl compact">
          <thead><tr><th>Người nhận</th><th class="num">Số tiền</th><th>Ngày chi</th><th>Nguồn tiền</th><th>Trạng thái</th></tr></thead>
          <tbody>
            @for (x of hoaHong(); track x.id) {
              <tr><td>{{ x.nguoiNhan || '—' }}</td><td class="num">{{ money(x.soTien) }}</td><td>{{ viDate(x.ngay) }}</td><td>{{ store.nguonTen(x.nguonTien) }}</td><td><app-tt [v]="x.trangThai" /></td></tr>
            } @empty {
              <tr><td colspan="5" class="muted">Chưa có khoản trả khách</td></tr>
            }
          </tbody>
          <tfoot>
            <tr><th>Tổng (trừ Từ chối)</th><td class="num">{{ money(c().tienTraKhach) }}</td><td colspan="3" class="sub">Đã duyệt: {{ money(c().tienTraKhachDuyet) }}</td></tr>
            <tr><th>Gợi ý tối đa</th><td class="num" title="Chênh lệch − Thuế TNDN">{{ money(c().traKhachToiDa) }}</td><td colspan="3" class="sub">= Chênh lệch − Thuế TNDN</td></tr>
          </tfoot>
        </table>
      </div>
      @if (c().tienTraKhach > c().traKhachToiDa) {
        <p class="note warn">Tổng tiền trả khách vượt mức gợi ý tối đa {{ money(c().tienTraKhach - c().traKhachToiDa) }} đ.</p>
      }
      @if (themHH()) {
        <div class="form-grid hh-form" appKiemTra #ktHH="kiemTra">
          <div class="field"><label for="hh-nn">Người nhận <span class="req">*</span></label><input id="hh-nn" [value]="hh().nguoiNhan" (input)="setHH('nguoiNhan', $any($event.target).value)" /></div>
          <div class="field"><label for="hh-tien">Số tiền <span class="req">*</span></label><app-money inputId="hh-tien" [value]="hh().soTien" (valueChange)="setHH('soTien', $event)" /></div>
          <div class="field"><label for="hh-ngay">Ngày chi <span class="req">*</span></label><input id="hh-ngay" type="date" [value]="hh().ngay" (input)="setHH('ngay', $any($event.target).value)" /></div>
          <div class="field">
            <label for="hh-nguon">Nguồn tiền <span class="req">*</span></label>
            <select id="hh-nguon" (change)="setHH('nguonTien', $any($event.target).value)">
              @for (n of store.nguonDangDung(); track n.id) { <option [value]="n.id" [selected]="n.id === hh().nguonTien">{{ n.ten }}</option> }
            </select>
          </div>
        </div>
        <div class="btn-row" style="margin-top:8px"><button type="button" class="btn sm" (click)="luuHH()"><app-icon name="plus" [size]="16" /> Thêm (gửi duyệt)</button></div>
      } @else if (saved() && saved()!.trangThai === TT.BAO_GIA) {
        <p class="sub">HĐ ở Báo giá — chỉ thêm tiền trả khách từ Hiệu lực trở đi.</p>
      }
    </section>

    <section class="card">
      <div class="section-title">
        <h2>Đợt thanh toán</h2>
        <span class="sub">Tối đa {{ max() }} đợt · Σ đợt {{ money(tongDot()) }} / {{ money(c().sauVAT) }}</span>
      </div>
      @if (f().dotTT.length && tongDot() !== c().sauVAT) {
        <p class="note warn">Tổng số tiền các đợt ({{ money(tongDot()) }}) lệch Tổng GTHĐ sau VAT ({{ money(c().sauVAT) }}) {{ money(tongDot() - c().sauVAT) }} đ.</p>
      }
      <div class="tbl-wrap">
        <table class="tbl compact">
          <thead>
            <tr>
              <th>Đợt</th><th class="num">Tỷ lệ %</th><th class="num">Số tiền</th><th>Hạn TT</th><th>Ghi chú</th>
              <th>Ngày thực thu</th><th class="num">Số tiền thực thu</th><th>Nguồn tiền nhận</th><th>Phiếu thu</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (d of f().dotTT; track d.dot; let i = $index, last = $last) {
              <tr [class.overdue]="quaHan(d)">
                <td><b>{{ d.dot }}</b> @if (quaHan(d)) { <app-tt v="Quá hạn" /> }</td>
                <td><input class="num" type="number" min="0" max="100" step="0.1" [value]="d.tyLe ?? ''" [disabled]="!edit()" (input)="setTyLe(i, $any($event.target).value)" /></td>
                <td><app-money [value]="d.soTien" [disabled]="!edit()" (valueChange)="setSoTien(i, $event)" /></td>
                <td>
                  <select [disabled]="!edit()" (change)="setHan(i, $any($event.target).value)" aria-label="Hạn thanh toán">
                    @for (n of hanOpts; track n) { <option [value]="n" [selected]="d.hanNgay === n">{{ n }} ngày từ ngày hiệu lực</option> }
                    <option value="" [selected]="d.hanNgay == null">Chọn ngày cụ thể…</option>
                  </select>
                  @if (d.hanNgay != null) {
                    <span class="hint">{{ f().ngayHieuLuc ? '→ ' + viDate(hanTinh(d)) : 'Tính khi có ngày hiệu lực' }}</span>
                  } @else {
                    <input type="date" [value]="d.han ?? ''" [disabled]="!edit()" (input)="setDot(i, { han: $any($event.target).value || undefined })" aria-label="Hạn TT" />
                  }
                </td>
                <td><input [value]="d.ghiChu ?? ''" [disabled]="!edit()" (input)="setDot(i, { ghiChu: $any($event.target).value })" /></td>
                @if (thuSua(d)) {
                  <td><input type="date" [value]="thu(d).ngayThu" (input)="setThu(d.dot, { ngayThu: $any($event.target).value })" /></td>
                  <td><app-money [value]="thu(d).soTienThu" (valueChange)="setThu(d.dot, { soTienThu: $event })" /></td>
                  <td>
                    <select (change)="setThu(d.dot, { nguonTienNhan: $any($event.target).value })">
                      @for (n of store.nguonDangDung(); track n.id) { <option [value]="n.id" [selected]="n.id === thu(d).nguonTienNhan">{{ n.ten }}</option> }
                    </select>
                  </td>
                } @else {
                  <td>{{ viDate(d.ngayThu) }}</td>
                  <td class="num">{{ d.soTienThu ? money(d.soTienThu) : '—' }}</td>
                  <td>{{ d.nguonTienNhan ? store.nguonTen(d.nguonTienNhan) : '—' }}</td>
                }
                <td>
                  @let p = store.phieuById(d.phieuThuId);
                  @if (p) {
                    @if (xemPhieu()) { <a class="sub linkish" routerLink="/ke-toan" [queryParams]="{ tab: 'so-quy', id: p.id }">{{ p.soPhieu }}</a> }
                    @else { <span class="sub">{{ p.soPhieu }}</span> }
                    @if (store.dangChoXoa('PhieuThuChi', p.id)) { <app-tt v="Chờ xoá" /> } @else { <app-tt [v]="p.trangThai" /> }
                    @if (p.trangThai === TT.DA_DUYET && !khoa() && store.canEdit('hdbThucThu') && store.level('duyetXoa') !== 'none' && !store.dangChoXoa('PhieuThuChi', p.id)) {
                      <button type="button" class="linkish sub" title="Phiếu đã duyệt mà ghi sai: gửi yêu cầu xoá, duyệt xong ghi nhận lại" (click)="xoaPhieu(p.id, p.soPhieu, d.dot)">Yêu cầu xoá phiếu</button>
                    }
                  } @else { <span class="muted">—</span> }
                </td>
                <td class="btn-row">
                  @if (thuSua(d)) { <button type="button" class="btn sm" (click)="ghiThu(d.dot)">Ghi thực thu</button> }
                  @if (edit() && last && !d.soTienThu && !d.phieuThuId) {
                    <button type="button" class="icon-btn sm" aria-label="Xoá đợt" (click)="xoaDot(i)"><app-icon name="trash" [size]="16" /></button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="10" class="muted">Chưa có đợt thanh toán</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (edit() && f().dotTT.length < max() && (f().dotTT.length === 0 || f().dotTT[f().dotTT.length - 1].soTien > 0)) {
        <button type="button" class="btn sm quiet" (click)="themDot()"><app-icon name="plus" [size]="16" /> Thêm đợt {{ f().dotTT.length + 1 }}</button>
      }
      @if (store.canEdit('hdbThucThu') && chuaLuuDot()) {
        <p class="sub">Lưu HĐ trước khi ghi thực thu cho đợt mới / đợt vừa sửa.</p>
      }
      @if (store.canEdit('hdbThucThu') && saved()?.trangThai === TT.BAO_GIA) {
        <p class="sub">
          @if (saved()!.coTamUng) { HĐ có tạm ứng: ghi thực thu đợt 1 ngay ở Báo giá — ngày thu đợt 1 thành Ngày hiệu lực. }
          @else { HĐ ở Báo giá — chỉ ghi thực thu từ Hiệu lực trở đi. Có tạm ứng thì tích "HĐ có tạm ứng" ở Tab 1. }
        </p>
      }
      @if (!store.canEdit('hdbThucThu')) { <p class="sub">Ngày / số tiền thực thu do Kế toán (hoặc Giám đốc) ghi nhận.</p> }
      <p class="sub">Ghi thực thu sinh 1 phiếu Thu "Chờ duyệt" ở Sổ quỹ. Đợt chỉ tính "Đã thu" (công nợ, tất toán) và số dư nguồn tiền chỉ tăng khi phiếu được duyệt.</p>
    </section>
  `,
})
export class HdbTab3 {
  private readonly ktHH = viewChild('ktHH', { read: KiemTra });
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  private readonly confirm = inject(Confirm);
  readonly f = model.required<HopDongBan>({ alias: 'draft' });
  readonly saved = input<HopDongBan | null>(null);
  readonly edit = input(false);
  readonly khoa = input(false);

  protected readonly money = money;
  protected readonly pct = pct;
  protected readonly viDate = viDate;
  protected readonly vats = [0, 8, 10] as const;

  protected readonly c = computed(() => hdbCalc(this.f(), this.store.db()));
  protected readonly hanOpts = [5, 10, 15, 20, 30, 45, 60];

  // ── Sản phẩm (chọn từ kho) ──
  protected readonly maOpts = computed(() => maHangOpts(this.store.loaiHang().filter((l) => l.dangDung)));
  protected readonly coSP = computed(() => !!this.f().dongHang?.length);
  protected readonly kho = computed(() => kiemTraDongBan(this.store.db(), this.f()));
  protected readonly tongSP = computed(() => tongDongBan(this.f().dongHang));
  protected readonly tongTH = computed(() => tongDongBanTH(this.f().dongHang));
  /** Dòng thiếu chưa đề nghị đủ — tách riêng từng dòng (không gộp theo mã) để mỗi dòng mua NCC riêng. */
  protected readonly thieuMua = computed(() =>
    this.kho()
      .filter((k) => k.d.loaiHang && k.thieu - k.daDeNghi > 0)
      .map((k) => ({ loaiHang: k.d.loaiHang, tenHang: k.d.tenHang, soLuong: k.thieu - k.daDeNghi, dongBanId: k.d.id })),
  );
  protected readonly thieuMuaText = computed(() =>
    this.thieuMua().map((x) => `${x.loaiHang}${x.tenHang ? ' (' + x.tenHang + ')' : ''} × ${x.soLuong}`).join('; '),
  );
  protected moTa(lh: string): string {
    return moTaMa(this.store.loaiHangById(lh));
  }
  private capNhatSP(fn: (ds: DongHangBan[]) => DongHangBan[]): void {
    this.f.update((h) => apDungTuDongHdb({ ...h, dongHang: fn(h.dongHang ?? []) }));
  }
  protected themSP(): void {
    this.capNhatSP((ds) => [...ds, { id: uid('DB'), loaiHang: '', tenHang: '', soLuong: 1, donGia: 0, donGiaTH: 0 }]);
  }
  protected setSP(i: number, p: Partial<DongHangBan>): void {
    this.capNhatSP((ds) => ds.map((d, j) => (j === i ? { ...d, ...p } : d)));
  }
  protected xoaSP(i: number): void {
    this.capNhatSP((ds) => ds.filter((_, j) => j !== i));
  }
  /** Chọn mã: tên trên HĐ nhập tay — chỉ gợi ý tên mã khi ô còn trống; đơn giá thực hiện theo lô nhập trước còn hàng (hoặc lô gần nhất). */
  protected chonMa(i: number, id: string): void {
    const d = this.f().dongHang![i];
    const lo = loConHang(this.store.db(), id)[0] ?? [...this.store.loKho()].reverse().find((l) => l.loaiHang === id);
    const ten = d.tenHang.trim() ? d.tenHang : (this.store.loaiHangById(id)?.ten ?? '');
    this.setSP(i, { loaiHang: id, tenHang: ten, donGiaTH: d.donGiaTH || lo?.donGia || 0 });
  }
  protected async deNghi(): Promise<void> {
    const s = this.saved();
    const ds = this.thieuMua();
    if (!s || !ds.length) return;
    const ghiChu = await this.confirm.prompt({
      title: `Gửi đề nghị cấp vật tư cho HĐ ${s.soHD || '(báo giá)'}?`,
      message: `Hàng thiếu trong kho: ${this.thieuMuaText()}. Mỗi dòng thành 1 đề nghị riêng (mua NCC riêng) — HĐ mua lấy dòng từ đề nghị.`,
      label: 'Ghi chú cho bộ phận mua (tuỳ chọn)',
      minLength: 0,
      ok: 'Gửi đề nghị',
    });
    if (ghiChu === null) return;
    const r = this.store.taoDeNghiVatTu(s.id, ds, ghiChu);
    if (!r || typeof r === 'string') return this.store.say(r ?? 'Không gửi được đề nghị');
    this.store.say(`Đã gửi ${r.ids.length} đề nghị cấp vật tư — xem ở Kho › Đề nghị vật tư hoặc tạo HĐ mua từ đề nghị`);
  }

  /** Tờ trình chi phí kinh doanh của HĐ: backend điền số liệu đã lưu vào mẫu Word rồi trả file .docx. */
  protected async inToTrinh(): Promise<void> {
    const s = this.saved();
    if (!s) return this.store.say('Lưu HĐ trước khi xuất tờ trình');
    await xuatToTrinhHdb(s.id);
  }
  /** F-08: đã có phiếu Thu (chưa bị từ chối) → khoá Giá trị trước VAT / VAT. */
  protected readonly khoaGiaTri = computed(() => !!this.saved() && this.store.hdbCoPhieuThu(this.saved()!));
  protected readonly max = computed(() => this.store.cauHinh().SO_DOT_TOI_DA);
  protected readonly tongDot = computed(() => sum(this.f().dotTT, (d) => d.soTien));

  protected readonly buocThue = computed<Buoc[]>(() => {
    const h = this.f();
    const t = this.c().thue;
    const ts = h.thamSoThue;
    return [
      { nhan: 'Chênh lệch (CL)', congThuc: 'Tổng GTHĐ trước VAT − GTHĐ thực tế', giaTri: this.c().chenhLech },
      { nhan: 'Mốc', congThuc: `${pct(ts.nguong)} × GTHĐ thực tế trước VAT`, giaTri: Math.round(t.moc) },
      { nhan: 'Phần ≤ mốc', congThuc: 'MIN(CL, Mốc)', giaTri: t.phan1 },
      { nhan: `Thuế phần ≤ mốc`, congThuc: `Phần ≤ mốc × ${pct(ts.muc1)}`, giaTri: t.thue1 },
      { nhan: 'Phần vượt mốc', congThuc: 'MAX(CL − Mốc, 0)', giaTri: t.phan2 },
      { nhan: 'Thuế phần vượt', congThuc: `Phần vượt × ${pct(ts.muc2)}`, giaTri: t.thue2 },
      { nhan: 'Thuế TNDN (Tổng phí quản lý)', congThuc: 'Tổng hai phần', giaTri: t.thue, chinh: true },
      { nhan: 'Hoàn trả', congThuc: 'CL − Thuế TNDN (theo tờ trình)', giaTri: Math.max(this.c().chenhLech - t.thue, 0) },
    ];
  });

  // ── Tiền trả khách (HDB-09) ──
  protected readonly hoaHong = computed(() =>
    this.store.chiPhiHD().filter((x) => x.hdbId === this.f().id && x.loaiChiPhi === LCP_HOA_HONG),
  );
  protected readonly themHH = computed(() => {
    const s = this.saved();
    return !!s && !this.khoa() && s.trangThai !== TT.BAO_GIA && this.store.canEdit('cpHD', s.sale);
  });
  protected readonly hh = signal({ nguoiNhan: '', soTien: 0, ngay: todayIso(), nguonTien: '' });
  protected setHH(k: 'nguoiNhan' | 'ngay' | 'nguonTien', v: string): void;
  protected setHH(k: 'soTien', v: number): void;
  protected setHH(k: string, v: string | number): void {
    this.hh.update((x) => ({ ...x, [k]: v }));
  }
  protected async luuHH(): Promise<void> {
    if (this.ktHH()?.hopLe() === false) return;
    const o = { ...this.hh(), nguoiNhan: this.hh().nguoiNhan.trim() };
    if (!o.nguonTien) o.nguonTien = this.store.nguonDangDung()[0]?.id ?? '';
    const ok = await this.confirm.ask({
      title: `Ghi tiền trả khách ${money(o.soTien)} đ cho ${o.nguoiNhan || '(chưa nhập người nhận)'}?`,
      message: 'Tạo 1 Chi phí thực hiện HĐ loại Hoa hồng kinh doanh ở trạng thái Chờ duyệt. Khi duyệt sẽ trừ vào nguồn tiền đã chọn.',
      ok: 'Gửi duyệt',
    });
    if (!ok) return;
    const err = this.store.themTienTraKhach(this.f().id, o);
    if (err) {
      this.store.say(err);
      return;
    }
    if (this.c().tienTraKhach > this.c().traKhachToiDa) this.store.say('Đã gửi duyệt — lưu ý: tổng tiền trả khách vượt mức gợi ý tối đa');
    else this.store.say('Đã thêm tiền trả khách — chờ duyệt');
    this.hh.set({ nguoiNhan: '', soTien: 0, ngay: todayIso(), nguonTien: o.nguonTien });
  }

  // ── Đợt thanh toán (HDB-10) ──
  protected set<K extends keyof HopDongBan>(k: K, v: HopDongBan[K]): void {
    this.f.update((h) => {
      const next = { ...h, [k]: v };
      // Đổi giá trị/VAT: đợt nhập theo % tự tính lại số tiền.
      if (k === 'truocVAT' || k === 'vat') {
        const sau = hdbCalc(next, this.store.db()).sauVAT;
        next.dotTT = next.dotTT.map((d) => (d.tyLe !== undefined ? { ...d, soTien: Math.round((d.tyLe / 100) * sau) } : d));
      }
      return next;
    });
  }
  protected setVat(raw: string): void {
    const v = Number(raw);
    this.set('vat', v === 0 || v === 8 || v === 10 ? v : 8);
  }
  /** Hạn TT = Ngày hiệu lực + N ngày; chọn "ngày cụ thể" thì nhập tay như cũ. */
  protected setHan(i: number, raw: string): void {
    const n = raw === '' ? undefined : Number(raw);
    this.f.update((h) => apDungTuDongHdb({ ...h, dotTT: h.dotTT.map((d, j) => (j === i ? { ...d, hanNgay: n, han: n == null ? d.han : undefined } : d)) }));
  }
  protected hanTinh(d: DotTTBan): string | undefined {
    const hl = this.f().ngayHieuLuc;
    return d.hanNgay != null && hl ? congNgay(hl, d.hanNgay) : d.han;
  }
  protected setDot(i: number, p: Partial<DotTTBan>): void {
    this.f.update((h) => ({ ...h, dotTT: h.dotTT.map((d, j) => (j === i ? { ...d, ...p } : d)) }));
  }
  protected setTyLe(i: number, raw: string): void {
    if (raw === '') {
      this.setDot(i, { tyLe: undefined });
      return;
    }
    const tyLe = Math.max(0, Number(raw) || 0);
    this.setDot(i, { tyLe, soTien: Math.round((tyLe / 100) * this.c().sauVAT) });
  }
  protected setSoTien(i: number, soTien: number): void {
    const sau = this.c().sauVAT;
    this.setDot(i, { soTien, tyLe: sau > 0 ? Math.round((soTien / sau) * 1000) / 10 : undefined });
  }
  protected themDot(): void {
    this.f.update((h) => {
      const con = Math.max(0, this.c().sauVAT - sum(h.dotTT, (d) => d.soTien));
      const sau = this.c().sauVAT;
      return apDungTuDongHdb({
        ...h,
        dotTT: [...h.dotTT, { dot: h.dotTT.length + 1, soTien: con, tyLe: sau > 0 ? Math.round((con / sau) * 1000) / 10 : undefined, hanNgay: 30 }],
      });
    });
  }
  protected xoaDot(i: number): void {
    this.f.update((h) => ({ ...h, dotTT: h.dotTT.filter((_, j) => j !== i) }));
  }
  protected quaHan(d: DotTTBan): boolean {
    return dotQuaHan(d, dotBanDaThu(d, this.store.db()));
  }

  // ── Thực thu (Kế toán) ──
  private readonly thuNhap = signal<Record<number, ThuNhap>>({});
  private dotLuu(dot: number): DotTTBan | undefined {
    return this.saved()?.dotTT.find((x) => x.dot === dot);
  }
  protected readonly chuaLuuDot = computed(() => this.f().dotTT.some((d) => !this.dotLuu(d.dot)));
  /** Số phiếu Thu bấm được (mở popup ở Sổ quỹ) khi có quyền xem Sổ quỹ. */
  protected readonly xemPhieu = computed(() => this.store.canView('soQuy') && this.store.level('soQuy') !== 'draft');
  protected thuSua(d: DotTTBan): boolean {
    if (this.khoa() || !this.store.canEdit('hdbThucThu')) return false;
    const s = this.saved();
    if (!s || (s.trangThai === TT.BAO_GIA && !(s.coTamUng && d.dot === 1))) return false;
    const luu = this.dotLuu(d.dot);
    if (!luu) return false;
    const p = this.store.phieuById(luu.phieuThuId);
    return !p || p.trangThai !== TT.DA_DUYET;
  }
  protected thu(d: DotTTBan): ThuNhap {
    return (
      this.thuNhap()[d.dot] ?? {
        ngayThu: d.ngayThu ?? todayIso(),
        soTienThu: d.soTienThu ?? d.soTien,
        nguonTienNhan: d.nguonTienNhan ?? this.store.nguonDangDung()[0]?.id ?? '',
      }
    );
  }
  protected setThu(dot: number, p: Partial<ThuNhap>): void {
    const d = this.f().dotTT.find((x) => x.dot === dot);
    if (!d) return;
    this.thuNhap.update((m) => ({ ...m, [dot]: { ...this.thu(d), ...p } }));
  }
  /** F-03: phiếu Thu đã duyệt nhưng sai → yêu cầu xoá; duyệt xong đợt trở về chưa thu để ghi lại. */
  protected async xoaPhieu(id: string, soPhieu: string, dot: number): Promise<void> {
    await guiXoa(this.confirm, this.store, 'PhieuThuChi', id, `Phiếu Thu ${soPhieu} — đợt ${dot} HĐ bán ${this.saved()?.soHD ?? ''}`);
  }

  protected async ghiThu(dot: number): Promise<void> {
    const d = this.f().dotTT.find((x) => x.dot === dot);
    const s = this.saved();
    if (!d || !s) return;
    const t = this.thu(d);
    const toiDa = this.store.hdbConThuDuoc(s, dot);
    if (t.soTienThu > toiDa) {
      this.store.say(`Số thu vượt phần còn phải thu của HĐ (tối đa ${money(toiDa)} đ)`);
      return;
    }
    const ok = await this.confirm.ask({
      title: `Ghi nhận thực thu đợt ${dot}: ${money(t.soTienThu)} đ?`,
      message: `Ngày thu ${viDate(t.ngayThu)} vào ${this.store.nguonTen(t.nguonTienNhan)}. Hệ thống tạo phiếu Thu Chờ duyệt ở Sổ quỹ; số dư quỹ chỉ tăng khi phiếu được duyệt.`,
      warn: t.soTienThu !== d.soTien ? `Số thu khác số tiền của đợt (${money(d.soTien)} đ), lệch ${money(t.soTienThu - d.soTien)} đ.` : undefined,
      ok: 'Ghi nhận',
    });
    if (!ok) return;
    const err = this.store.ghiThucThu(s.id, dot, this.thu(d));
    if (err) {
      this.store.say(err);
      return;
    }
    this.thuNhap.update((m) => {
      const n = { ...m };
      delete n[dot];
      return n;
    });
    this.store.say(`Đã ghi thực thu đợt ${dot} — phiếu Thu chờ duyệt`);
  }
}
