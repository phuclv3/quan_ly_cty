import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { hdmTong, ptCalc, soDuQuyPT } from '../core/calc';
import { CACH_CHIA_PT, HopDongPhuTai, LOAI_TIEN, TRANG_THAI_PT, TrangThaiPT } from '../core/models';
import { money, num, pct, todayIso, uid, viDate, viMoment } from '../core/util';
import { BuocTable, MoneyInput, Pick, PickOption, TrangThai } from '../shared/ui-kit';
import { Confirm } from '../shared/confirm';
import { HoSoPanel, guiXoa } from '../shared/ho-so';
import { Unsaved, canhBaoChuaLuu } from '../shared/unsaved';
import { KiemTra } from '../shared/kiem-tra';

type ArrKey = 'chiPhi' | 'dotKH' | 'dotTraNCC' | 'doiChieu';
type Row<K extends ArrKey> = HopDongPhuTai[K][number];

const LUONG: TrangThaiPT[] = TRANG_THAI_PT.filter((t) => t !== TT.HUY);
const TABS = [
  { k: '1', t: 'Thông tin chung' },
  { k: '2', t: 'Giá bán' },
  { k: '3', t: 'Giá đầu vào' },
  { k: '4', t: 'Chênh lệch & Chia lợi nhuận' },
  { k: '5', t: 'Đối chiếu thanh toán 3 bên' },
];
const quyDoi = (soTien: number, loaiTien: string, tyGia: number) => Math.round(soTien * (loaiTien === 'VNĐ' ? 1 : tyGia || 0));

/** PT-02…PT-08 — Chi tiết HĐ Phú Tài (5 tab, một nút Lưu). */
@Component({
  selector: 'app-pt-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  hostDirectives: [KiemTra],
  imports: [RouterLink, BuocTable, MoneyInput, Pick, TrangThai, HoSoPanel],
  template: `
    @let p = f();
    @let c = calc();
    <div class="page-head">
      <div>
        <div class="crumbs"><a routerLink="/">Trang chủ</a> › <a routerLink="/phu-tai">Phú Tài</a> › {{ p.id ? p.soHD : 'Tạo mới' }}</div>
        <h1>
          {{ p.id ? 'HĐ Phú Tài ' + p.soHD : 'Tạo HĐ Phú Tài' }}
          <app-tt v="Phú Tài" t="pt" />
          @if (choXoa()) { <app-tt v="Chờ xoá" /> } @else { <app-tt [v]="p.trangThai" /> }
          @if (p.import) { <app-tt v="Import" /> }
        </h1>
      </div>
      <div class="actions">
        @if (dirty()) { <span class="tag warn">● Chưa lưu</span> }
        @if (edit()) {
          @if (dirty() && p.id) { <button type="button" class="btn quiet" (click)="hoanTac()">Hoàn tác</button> }
          <button type="button" class="btn ok" [disabled]="!dirty()" (click)="luu()">Lưu</button>
        }
        @if (p.id && store.canEdit('phuTai') && !choXoa() && daLuu()?.trangThai !== TT.DA_TAT_TOAN) {
          <button type="button" class="btn quiet danger" (click)="xoa()">Xoá</button>
        }
      </div>
    </div>

    <div class="note info" style="margin-bottom:12px">
      <span class="tag pt">PT</span>
      <span>Module riêng — không đụng quỹ, kho, công nợ của Oxy. Phú Tài là bên xuất hoá đơn cho khách cuối.</span>
    </div>
    @if (khoa()) { <div class="note warn" style="margin-bottom:12px">HĐ đang khoá ({{ choXoa() ? 'chờ duyệt xoá' : ttNhan(p.trangThai) }}) — không sửa được.</div> }
    @if (loi()) { <div class="note bad" style="margin-bottom:12px">{{ loi() }}</div> }

    <div class="tabs" role="tablist">
      @for (t of tabs; track t.k) {
        <button type="button" role="tab" [class.on]="tab() === t.k" (click)="setTab(t.k)">{{ t.k }}. {{ t.t }}</button>
      }
    </div>

    @switch (tab()) {
      @case ('1') {
        <section class="card">
          <div class="form-grid">
            <div class="field">
              <label for="pt-so">Số HĐ <span class="req">*</span></label>
              <input id="pt-so" [value]="p.soHD" [disabled]="!edit()" (input)="set('soHD', $any($event.target).value)" />
            </div>
            <div class="field wide">
              <span class="lbl">Khách hàng cuối <span class="req">*</span></span>
              <app-pick [options]="khOpts()" [value]="p.maKH" [disabled]="!edit()" (valueChange)="chonKH($event)" />
            </div>
            <div class="field">
              <span class="lbl">MST</span>
              <div class="ro">{{ p.mst || '—' }}</div>
            </div>
            <div class="field">
              <label for="pt-ky">Ngày ký</label>
              <input id="pt-ky" type="date" [value]="p.ngayKy ?? ''" [disabled]="!edit()" (input)="set('ngayKy', $any($event.target).value || undefined)" />
            </div>
            <div class="field">
              <label for="pt-hl">Ngày hiệu lực</label>
              <input id="pt-hl" type="date" [value]="p.ngayHieuLuc ?? ''" [disabled]="!edit()" (input)="set('ngayHieuLuc', $any($event.target).value || undefined)" />
            </div>
            <div class="field full">
              <label for="pt-gc">Ghi chú</label>
              <textarea id="pt-gc" rows="2" [value]="p.ghiChu" [disabled]="!edit()" (input)="set('ghiChu', $any($event.target).value)"></textarea>
            </div>
          </div>
        </section>

        <div class="section-title"><h2>Trạng thái</h2></div>
        <section class="card">
          <div class="flow">
            @for (s of luong; track s; let last = $last) {
              <span class="st" [class.cur]="s === p.trangThai" [class.done]="daQua(s)">{{ ttNhan(s) }}</span>
              @if (!last) { <span class="sep">→</span> }
            }
            @if (p.trangThai === TT.HUY) { <span class="sep">·</span><span class="st cur">{{ ttNhan(TT.HUY) }}</span>@if (p.lyDoHuy) { <span class="sub">— {{ p.lyDoHuy }}</span> } }
          </div>
          @if (p.id && store.canEdit('phuTai') && !khoa()) {
            <div class="btn-row" style="justify-content:flex-start;margin-top:10px">
              @if (keTiep(); as k) { <button type="button" class="btn sm" [disabled]="dirty()" (click)="chuyen(k)">Chuyển → {{ k }}</button> }
              <button type="button" class="btn sm quiet danger" [disabled]="dirty()" (click)="chuyen(TT.HUY)">Huỷ HĐ</button>
              @if (dirty()) { <span class="sub">Lưu thay đổi trước khi chuyển trạng thái.</span> }
            </div>
            <p class="sub">→ Hiệu lực cần Số HĐ, Ngày ký, Giá bán. → Đã tất toán: KH đã trả PT đủ và Phú Tài đã chuyển đủ phần Oxy được hưởng — ghi các lần Phú Tài chuyển cho Oxy là dòng "Chi từ PT" ở <a routerLink="/phu-tai" [queryParams]="{ tab: 'dong-tien', hd: p.id }">sổ quỹ ảo của HĐ</a>. "Đã tất toán" / "Huỷ" khoá HĐ.</p>
            @if (p.id) { <p class="sub">Tiến độ tất toán: KH đã trả PT <b>{{ money(c.khDaTra) }}</b> / {{ money(c.sauVAT) }} · Phú Tài đã chuyển Oxy <b>{{ money(daChuyenOxy()) }}</b> / {{ money(c.oxyGop) }} (Oxy được hưởng gộp).</p> }
          }
        </section>

        <div class="section-title"><h2>Lưu trữ hồ sơ</h2><span class="sub">Nhóm "Hoá đơn" = hoá đơn do Phú Tài xuất cho khách cuối</span></div>
        @if (p.id) {
          <app-ho-so chu="HDPT" [chuId]="p.id" [soHD]="p.soHD" [edit]="edit()" [giaTri]="c.sauVAT" [ghiChuThieu]="p.ghiChuHoSoThieu ?? ''" (ghiChuThieuChange)="set('ghiChuHoSoThieu', $event)" />
        } @else {
          <div class="card empty muted">
            Hồ sơ được lưu theo mã HĐ — cần lưu HĐ lần đầu (Số HĐ, Khách hàng cuối) trước khi tải hồ sơ.
            @if (edit()) { <div class="btn-row" style="justify-content:center;margin-top:10px"><button type="button" class="btn ok" (click)="luu()">Lưu HĐ &amp; mở hồ sơ</button></div> }
          </div>
        }
      }

      @case ('2') {
        <div class="note info" style="margin-bottom:12px">Các đợt khách trả Phú Tài chỉ theo dõi đối chiếu, không phải công nợ của Oxy.</div>
        <section class="card">
          <div class="form-grid">
            <div class="field">
              <label for="pt-gb">Tổng GTHĐ trước VAT</label>
              <app-money inputId="pt-gb" [value]="p.truocVAT" [disabled]="!edit()" (valueChange)="set('truocVAT', $event)" />
            </div>
            <div class="field">
              <label for="pt-vat">VAT</label>
              <select id="pt-vat" [disabled]="!edit()" (change)="set('vat', +$any($event.target).value === 0 ? 0 : +$any($event.target).value === 8 ? 8 : 10)">
                @for (v of [0, 8, 10]; track v) { <option [value]="v" [selected]="v === p.vat">{{ v }}%</option> }
              </select>
            </div>
            <div class="field">
              <span class="lbl">Tổng GTHĐ sau VAT</span>
              <div class="ro num" title="Trước VAT × (1 + VAT%)">{{ money(c.sauVAT) }}</div>
            </div>
          </div>
        </section>
        <div class="section-title">
          <h2>Đợt khách hàng trả Phú Tài</h2>
          @if (edit()) { <button type="button" class="btn sm" (click)="themDotKH()">+ Thêm đợt</button> }
        </div>
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead><tr><th>Đợt</th><th class="num">Số tiền</th><th>Ngày KH trả PT</th><th>Ghi chú</th><th></th></tr></thead>
            <tbody>
              @for (d of p.dotKH; track $index; let i = $index) {
                <tr>
                  <td>{{ d.dot }}</td>
                  <td><app-money [value]="d.soTien" [disabled]="!edit()" (valueChange)="setRow('dotKH', i, { soTien: $event })" /></td>
                  <td><input type="date" [value]="d.ngay" [disabled]="!edit()" (input)="setRow('dotKH', i, { ngay: $any($event.target).value })" aria-label="Ngày" /></td>
                  <td><input [value]="d.ghiChu ?? ''" [disabled]="!edit()" (input)="setRow('dotKH', i, { ghiChu: $any($event.target).value })" aria-label="Ghi chú" /></td>
                  <td>@if (edit()) { <button type="button" class="btn sm quiet danger" (click)="boRow('dotKH', i)">Bỏ</button> }</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="muted">Chưa có đợt nào</td></tr>
              }
            </tbody>
            <tfoot>
              <tr><th>Tổng đã trả</th><td class="num"><b>{{ money(c.khDaTra) }}</b></td><td colspan="3">{{ pct(c.pctKH) }} GTHĐ sau VAT · còn {{ money(c.sauVAT - c.khDaTra) }}</td></tr>
            </tfoot>
          </table>
        </div>
      }

      @case ('3') {
        <div class="section-title">
          <h2>Giá mua hàng hoá — HĐ Mua thuộc Phú Tài</h2>
          @if (store.canEdit('hdm') && p.id && edit()) { <a class="btn sm quiet" routerLink="/hop-dong-mua/moi" [queryParams]="{ pt: p.id }">+ Tạo HĐ mua thuộc Phú Tài</a> }
        </div>
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead><tr><th>Chọn</th><th>Số HĐ Mua</th><th>NCC</th><th>Trạng thái</th><th>Đang dùng ở HĐ PT khác</th><th class="num">Tổng VNĐ trước VAT</th></tr></thead>
            <tbody>
              @for (m of hdmOpts(); track m.id) {
                <tr>
                  <td><input type="checkbox" [checked]="p.hdMua.includes(m.id)" [disabled]="!edit()" (change)="flipHdm(m.id)" [attr.aria-label]="'Chọn ' + m.soHD" /></td>
                  <td><a [routerLink]="['/hop-dong-mua', m.id]">{{ m.soHD }}</a></td>
                  <td>{{ m.tenNCC }}</td>
                  <td><app-tt [v]="m.trangThai" /></td>
                  <td class="muted">{{ m.khac || '—' }}</td>
                  <td class="num">{{ money(m.tong) }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="muted">Chưa có HĐ Mua nào đánh cờ "Thuộc Phú Tài"</td></tr>
              }
            </tbody>
          </table>
        </div>
        @if (hdmHuy().length) {
          <div class="note warn" style="margin-top:10px">HĐ mua đã Huỷ đang được chọn — không tính vào giá mua: {{ hdmHuy().join(', ') }}. Bỏ chọn cho gọn.</div>
        }
        @if (hdmTrung().length) {
          <div class="note warn" style="margin-top:10px">HĐ mua đang được chọn ở HĐ Phú Tài khác (dữ liệu cũ — giá đầu vào bị tính 2 lần, nên bỏ ở một bên): {{ hdmTrung().join(', ') }}</div>
        }
        <div class="form-grid" style="margin-top:12px">
          <div class="field"><span class="lbl">Giá mua hàng hoá</span><div class="ro num" title="Σ tổng VNĐ trước VAT của HĐ Mua đã chọn">{{ money(c.giaMua) }}</div></div>
          <div class="field"><span class="lbl">Vận chuyển</span><div class="ro num">{{ money(c.vanChuyen) }}</div></div>
          <div class="field"><span class="lbl">Hải quan</span><div class="ro num">{{ money(c.haiQuan) }}</div></div>
          <div class="field"><span class="lbl">Chi phí khác</span><div class="ro num">{{ money(c.cpKhac) }}</div></div>
          <div class="field"><span class="lbl">Giá đầu vào trước VAT</span><div class="ro num" title="Giá mua + Vận chuyển + Hải quan + CP khác"><b>{{ money(c.giaDauVao) }}</b></div></div>
        </div>

        <div class="section-title">
          <h2>Chi phí đầu vào</h2>
          @if (edit()) { <button type="button" class="btn sm" (click)="themCP()">+ Thêm chi phí</button> }
        </div>
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead><tr><th>Loại</th><th>Nội dung</th><th>Ngày</th><th class="num">Số tiền</th><th></th></tr></thead>
            <tbody>
              @for (x of p.chiPhi; track x.id; let i = $index) {
                <tr>
                  <td>
                    <select [disabled]="!edit()" (change)="setRow('chiPhi', i, { loai: $any($event.target).value })" aria-label="Loại">
                      @for (l of loaiCP; track l) { <option [value]="l" [selected]="l === x.loai">{{ l }}</option> }
                    </select>
                  </td>
                  <td><input [value]="x.noiDung" [disabled]="!edit()" (input)="setRow('chiPhi', i, { noiDung: $any($event.target).value })" aria-label="Nội dung" /></td>
                  <td><input type="date" [value]="x.ngay" [disabled]="!edit()" (input)="setRow('chiPhi', i, { ngay: $any($event.target).value })" aria-label="Ngày" /></td>
                  <td><app-money [value]="x.soTien" [disabled]="!edit()" (valueChange)="setRow('chiPhi', i, { soTien: $event })" /></td>
                  <td>@if (edit()) { <button type="button" class="btn sm quiet danger" (click)="boRow('chiPhi', i)">Bỏ</button> }</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="muted">Chưa có chi phí</td></tr>
              }
            </tbody>
          </table>
        </div>

        <div class="section-title">
          <h2>Phú Tài trả NCC</h2>
          <span class="sub">Ghi ở Tab 4 "Thanh toán NCC" của từng HĐ mua — bảng này tổng hợp, chỉ xem</span>
        </div>
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead><tr><th>HĐ Mua</th><th>Đợt</th><th>Ngày trả</th><th class="num">Số tiền (VNĐ)</th><th></th></tr></thead>
            <tbody>
              @for (x of traNCC(); track x.key) {
                <tr>
                  <td>{{ x.soHD }}</td><td>{{ x.dot }}</td><td>{{ viDate(x.ngay) }}</td><td class="num">{{ money(x.soTien) }}</td>
                  <td><a class="linkish" [routerLink]="['/hop-dong-mua', x.hdmId]" [queryParams]="{ tab: 4 }">Mở HĐ mua</a></td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="muted">Chưa ghi nhận lần trả nào{{ p.hdMua.length ? ' — ghi ở Tab 4 của HĐ mua' : ' — chọn HĐ Mua trước' }}</td></tr>
              }
            </tbody>
            <tfoot><tr><th colspan="3">Tổng Phú Tài đã trả NCC (VNĐ)</th><td class="num"><b>{{ money(c.ptTraNCC) }}</b></td><td></td></tr></tfoot>
          </table>
        </div>
        @if (p.dotTraNCC.length) {
          <p class="note warn">HĐ còn {{ p.dotTraNCC.length }} dòng "Phú Tài trả NCC" nhập theo cách cũ (tại HĐ Phú Tài) — không còn được tính; ghi lại ở Tab 4 của HĐ mua tương ứng.</p>
        }
      }

      @case ('4') {
        <section class="card">
          <app-buoc [rows]="c.buoc" />
        </section>
        @if (c.lnTruoc <= 0) { <div class="note bad" style="margin-top:10px">Lỗ: Oxy chịu toàn bộ (D-21) — thuế = 0, Phú Tài giữ = 0.</div> }
        <div class="note info" style="margin-top:10px">
          Cách chia của HĐ này: <b>{{ p.cachChia ?? 'Nhân' }}</b> — Oxy được hưởng <b>{{ pct(c.tyLeOxy) }}</b> LN trước thuế.
          "Nhân": Phú Tài giữ % trên LN sau thuế (spec, 72% với 20% / 10%). "Cộng": thuế và phần Phú Tài giữ cùng tính trên LN trước thuế (70%). Mặc định cho HĐ mới đặt ở Cấu hình (PT_CACH_CHIA).
        </div>

        <div class="grid c2" style="margin-top:14px">
          <section class="card">
            <h3>Tỷ lệ chia (theo HĐ)</h3>
            <div class="form-grid">
              <div class="field">
                <label for="pt-cach">Cách chia</label>
                <select id="pt-cach" [disabled]="!suaTyLe()" (change)="set('cachChia', $any($event.target).value)">
                  @for (o of cachChiaDs; track o) { <option [value]="o" [selected]="o === (p.cachChia ?? 'Nhân')">{{ o }}</option> }
                </select>
              </div>
              <div class="field">
                <label for="pt-thue">Tỷ lệ thuế Phú Tài (%)</label>
                <input id="pt-thue" type="number" min="0" max="100" step="0.1" class="num" [value]="phanTram(p.tyLeThue)" [disabled]="!suaTyLe()" (change)="setTyLe('tyLeThue', $any($event.target).value)" />
              </div>
              <div class="field">
                <label for="pt-giu">Tỷ lệ Phú Tài giữ (%)</label>
                <input id="pt-giu" type="number" min="0" max="100" step="0.1" class="num" [value]="phanTram(p.tyLeGiu)" [disabled]="!suaTyLe()" (change)="setTyLe('tyLeGiu', $any($event.target).value)" />
              </div>
            </div>
            @if (!store.canEdit('phuTaiTyLe')) { <p class="sub">Cần quyền "Sửa tỷ lệ chia lợi nhuận" (PT-06) để sửa tỷ lệ.</p> }
            <h3 style="margin-top:12px">Lịch sử sửa tỷ lệ</h3>
            <ul class="stack">
              @for (l of p.tyLeLog; track $index) {
                <li class="sub">{{ viMoment(l.luc) }} · {{ store.userName(l.nguoi) }}: {{ l.truoc }} → <b>{{ l.sau }}</b>@if (l.lyDo) { — {{ l.lyDo }} }</li>
              } @empty {
                <li class="muted">Chưa sửa — đang dùng tỷ lệ lúc tạo HĐ.</li>
              }
            </ul>
          </section>

          <section class="card">
            <h3>Hoa hồng khách hàng</h3>
            <div class="form-grid">
              <div class="field">
                <label for="hh-kieu">Kiểu</label>
                <select id="hh-kieu" [disabled]="!edit()" (change)="set('hoaHongKieu', $any($event.target).value === '%' ? '%' : 'Số tiền')">
                  <option value="Số tiền" [selected]="p.hoaHongKieu === 'Số tiền'">Số tiền</option>
                  <option value="%" [selected]="p.hoaHongKieu === '%'">% × Oxy được hưởng (gộp)</option>
                </select>
              </div>
              <div class="field">
                <label for="hh-gt">Giá trị {{ p.hoaHongKieu === '%' ? '(%)' : '(VNĐ)' }}</label>
                <app-money inputId="hh-gt" [decimals]="p.hoaHongKieu === '%' ? 2 : 0" [value]="p.hoaHongGiaTri" [disabled]="!edit()" (valueChange)="set('hoaHongGiaTri', $event)" />
              </div>
              <div class="field">
                <label for="hh-nn">Người nhận</label>
                <input id="hh-nn" [value]="p.nguoiNhanHH ?? ''" [disabled]="!edit()" (input)="set('nguoiNhanHH', $any($event.target).value)" />
              </div>
              <div class="field">
                <label for="hh-ngay">Ngày chi</label>
                <input id="hh-ngay" type="date" [value]="p.ngayChiHH ?? ''" [disabled]="!edit()" (input)="set('ngayChiHH', $any($event.target).value || undefined)" />
              </div>
              <div class="field wide"><span class="lbl">Hoa hồng (VNĐ)</span><div class="ro num">{{ money(c.hoaHong) }}</div></div>
            </div>
            @if (p.hoaHongGiaTri < 0) { <div class="note bad" style="margin-top:8px">Hoa hồng phải ≥ 0.</div> }
            @if (c.hoaHong > c.oxyGop) { <div class="note warn" style="margin-top:8px">Hoa hồng ({{ money(c.hoaHong) }}) lớn hơn Oxy được hưởng gộp ({{ money(c.oxyGop) }}).</div> }
          </section>
        </div>
      }

      @case ('5') {
        <div class="note info" style="margin-bottom:12px">
          Mỗi dòng có "Ngày Oxy chuyển PT" và Số tiền VNĐ &gt; 0 sẽ tự tạo một dòng "Thu về PT" trong Sổ dòng tiền quỹ ảo khi Lưu.
          <a routerLink="/phu-tai" [queryParams]="{ tab: 'dong-tien', hd: p.id }">Xem sổ quỹ ảo của HĐ này</a>
        </div>
        @if (p.doiChieu.length && c.ptChuyenNCC !== c.ptTraNCC) {
          <div class="note warn" style="margin-bottom:12px">
            Đối chiếu ghi Phú Tài chuyển NCC {{ money(c.ptChuyenNCC) }} đ, nhưng các HĐ mua (nguồn chuẩn, Tab 4) ghi đã trả {{ money(c.ptTraNCC) }} đ —
            lệch {{ money(c.ptChuyenNCC - c.ptTraNCC) }} đ. Kiểm tra lại sao kê / đợt trả.
          </div>
        }
        <div class="section-title">
          <h2>Đối chiếu thanh toán 3 bên</h2>
          @if (edit()) { <button type="button" class="btn sm" (click)="themDC()">+ Thêm dòng</button> }
        </div>
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead>
              <tr>
                <th>Ngày Oxy chuyển PT</th><th class="num">Số tiền VNĐ</th><th>Ngày PT chuyển NCC</th><th class="num">Số tiền nguyên tệ</th>
                <th>Loại tiền</th><th class="num">Tỷ giá</th><th class="num">Quy đổi VNĐ</th><th>Ghi chú</th><th></th>
              </tr>
            </thead>
            <tbody>
              @for (x of p.doiChieu; track x.id; let i = $index) {
                <tr>
                  <td><input type="date" [value]="x.ngayOxyChuyen ?? ''" [disabled]="!edit()" (input)="setRow('doiChieu', i, { ngayOxyChuyen: $any($event.target).value || undefined })" aria-label="Ngày Oxy chuyển PT" /></td>
                  <td><app-money [value]="x.soTienVND" [disabled]="!edit()" (valueChange)="setRow('doiChieu', i, { soTienVND: $event })" /></td>
                  <td><input type="date" [value]="x.ngayPTChuyenNCC ?? ''" [disabled]="!edit()" (input)="setRow('doiChieu', i, { ngayPTChuyenNCC: $any($event.target).value || undefined })" aria-label="Ngày PT chuyển NCC" /></td>
                  <td><app-money [decimals]="2" [value]="x.soTienNguyenTe" [disabled]="!edit()" (valueChange)="setRow('doiChieu', i, { soTienNguyenTe: $event })" /></td>
                  <td>
                    <select [disabled]="!edit()" (change)="setRow('doiChieu', i, { loaiTien: $any($event.target).value })" aria-label="Loại tiền">
                      @for (l of loaiTien; track l) { <option [value]="l" [selected]="l === x.loaiTien">{{ l }}</option> }
                    </select>
                  </td>
                  <td><app-money [decimals]="2" [value]="x.tyGia" [disabled]="!edit() || x.loaiTien === 'VNĐ'" (valueChange)="setRow('doiChieu', i, { tyGia: $event })" /></td>
                  <td class="num">{{ money(qd(x.soTienNguyenTe, x.loaiTien, x.tyGia)) }}</td>
                  <td><input [value]="x.ghiChu ?? ''" [disabled]="!edit()" (input)="setRow('doiChieu', i, { ghiChu: $any($event.target).value })" aria-label="Ghi chú" /></td>
                  <td>@if (edit()) { <button type="button" class="btn sm quiet danger" (click)="boRow('doiChieu', i)">Bỏ</button> }</td>
                </tr>
              } @empty {
                <tr><td colspan="9" class="muted">Chưa có dòng đối chiếu</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="kpis" style="margin-top:12px">
          <div class="kpi"><span class="kpi-l">Oxy đã chuyển PT</span><b class="kpi-v num">{{ money(c.oxyChuyenPT) }}</b></div>
          <div class="kpi"><span class="kpi-l">PT đã chuyển NCC (VNĐ)</span><b class="kpi-v num">{{ money(c.ptChuyenNCC) }}</b></div>
          <div class="kpi" [class.warn]="c.chenhDoiChieu !== 0"><span class="kpi-l">Chênh lệch</span><b class="kpi-v num" [class.neg]="c.chenhDoiChieu < 0">{{ money(c.chenhDoiChieu) }}</b></div>
        </div>
      }
    }
  `,
})
export class PtDetail {
  private readonly kt = inject(KiemTra);
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  protected readonly ttNhan = ttNhan;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);

  protected readonly money = money;
  protected readonly pct = pct;
  protected readonly num = num;
  protected readonly viDate = viDate;
  protected readonly viMoment = viMoment;
  protected readonly qd = quyDoi;
  protected readonly tabs = TABS;
  protected readonly luong = LUONG;
  protected readonly loaiTien = LOAI_TIEN;
  protected readonly loaiCP: HopDongPhuTai['chiPhi'][number]['loai'][] = ['Vận chuyển', 'Hải quan', 'Khác'];

  private readonly routeId = toSignal(this.route.paramMap.pipe(map((m) => m.get('id') ?? 'moi')), { initialValue: 'moi' });
  protected readonly tab = toSignal(
    this.route.queryParamMap.pipe(map((q) => (TABS.some((t) => t.k === q.get('tab')) ? q.get('tab')! : '1'))),
    { initialValue: '1' },
  );

  protected readonly f = signal<HopDongPhuTai>(this.store.newPt());
  private readonly goc = signal('');
  protected readonly loi = signal('');

  protected readonly calc = computed(() => ptCalc(this.f(), this.store.db()));
  protected readonly daLuu = computed(() => this.store.ptById(this.f().id));
  protected readonly choXoa = computed(() => this.store.dangChoXoa('HopDongPhuTai', this.f().id));
  protected readonly khoa = computed(() => {
    const s = this.daLuu();
    return !!s && this.store.ptKhoa(s);
  });
  protected readonly edit = computed(() => this.store.canEdit('phuTai') && !this.khoa());
  protected readonly suaTyLe = computed(() => this.edit() && this.store.canEdit('phuTaiTyLe'));
  protected readonly dirty = computed(() => JSON.stringify(this.f()) !== this.goc());
  protected readonly keTiep = computed<TrangThaiPT | null>(() => {
    const i = LUONG.indexOf(this.f().trangThai);
    return i >= 0 && i < LUONG.length - 1 ? LUONG[i + 1] : null;
  });

  protected readonly khOpts = computed<PickOption[]>(() =>
    this.store
      .khachHang()
      .filter((k) => k.trangThai !== TT.NGUNG || k.id === this.f().maKH)
      .map((k) => ({ value: k.id, label: k.ten, hint: k.mst + (k.trangThai === TT.NGUNG ? ' · ' + ttNhan(TT.NGUNG) : '') })),
  );
  protected readonly hdmOpts = computed(() => {
    const db = this.store.db();
    const me = this.f();
    return db.hopDongMua
      .filter((m) => m.thuocPhuTai && (m.trangThai !== TT.HUY || me.hdMua.includes(m.id)))
      .map((m) => ({
        id: m.id,
        soHD: m.soHD,
        tenNCC: m.tenNCC,
        trangThai: m.trangThai,
        tong: hdmTong(m),
        khac: db.hopDongPhuTai
          .filter((x) => x.id !== me.id && x.hdMua.includes(m.id))
          .map((x) => x.soHD)
          .join(', '),
      }));
  });

  protected readonly cachChiaDs = CACH_CHIA_PT;
  /** F-05: các lần Phú Tài trả NCC — đọc từ đợt trả (Tab 4) của các HĐ mua đã chọn. */
  protected readonly traNCC = computed(() =>
    this.store
      .hopDongMua()
      .filter((m) => this.f().hdMua.includes(m.id))
      .flatMap((m) => m.dotTT.filter((d) => (d.soTienTra ?? 0) > 0).map((d) => ({ key: m.id + '-' + d.dot, hdmId: m.id, soHD: m.soHD, dot: d.dot, ngay: d.ngayTra, soTien: d.soTienTra ?? 0 })))
      .sort((a, b) => (a.ngay ?? '').localeCompare(b.ngay ?? '')),
  );
  /** Σ "Chi từ PT" của HĐ = tiền Phú Tài đã chuyển trả Oxy (điều kiện tất toán). */
  protected readonly daChuyenOxy = computed(() => soDuQuyPT(this.store.db(), { hdptId: this.f().id }).chi);
  protected readonly hdmHuy = computed(() => this.hdmOpts().filter((m) => m.trangThai === TT.HUY && this.f().hdMua.includes(m.id)).map((m) => m.soHD));
  protected readonly hdmTrung = computed(() => this.hdmOpts().filter((m) => m.khac && this.f().hdMua.includes(m.id)).map((m) => `${m.soHD} (${m.khac})`));
  private readonly unsaved = inject(Unsaved);

  constructor() {
    effect(() => {
      const id = this.routeId();
      untracked(() => this.nap(id));
    });
    canhBaoChuaLuu(() => this.edit() && this.dirty());
  }

  private nap(id: string): void {
    const rec = id === 'moi' ? this.store.newPt() : this.store.ptById(id);
    if (!rec) {
      this.store.say('Không tìm thấy HĐ Phú Tài');
      void this.router.navigate(['/phu-tai']);
      return;
    }
    const nhap = structuredClone(rec);
    this.f.set(nhap);
    this.goc.set(JSON.stringify(nhap));
    this.loi.set('');
  }

  protected setTab(k: string): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: k }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected set<K extends keyof HopDongPhuTai>(k: K, v: HopDongPhuTai[K]): void {
    this.f.update((p) => ({ ...p, [k]: v }));
  }

  protected setRow<K extends ArrKey>(k: K, i: number, patch: Partial<Row<K>>): void {
    this.f.update((p) => {
      const arr = (p[k] as Row<K>[]).map((r, j) => (j === i ? { ...r, ...patch } : r));
      return { ...p, [k]: arr };
    });
  }

  protected boRow(k: ArrKey, i: number): void {
    this.f.update((p) => {
      const arr = (p[k] as Row<ArrKey>[]).filter((_, j) => j !== i);
      if (k === 'dotKH') return { ...p, dotKH: (arr as HopDongPhuTai['dotKH']).map((d, j) => ({ ...d, dot: j + 1 })) };
      return { ...p, [k]: arr };
    });
  }

  private them<K extends ArrKey>(k: K, row: Row<K>): void {
    this.f.update((p) => ({ ...p, [k]: [...(p[k] as Row<K>[]), row] }));
  }

  protected themDotKH(): void {
    this.them('dotKH', { dot: this.f().dotKH.length + 1, soTien: 0, ngay: todayIso() });
  }
  protected themCP(): void {
    this.them('chiPhi', { id: uid('CPPT'), loai: 'Vận chuyển', noiDung: '', ngay: todayIso(), soTien: 0 });
  }
  protected themDC(): void {
    this.them('doiChieu', { id: uid('DC'), ngayOxyChuyen: todayIso(), soTienVND: 0, soTienNguyenTe: 0, loaiTien: 'VNĐ', tyGia: 1 });
  }

  protected chonKH(id: string): void {
    const k = this.store.khById(id);
    this.f.update((p) => ({ ...p, maKH: id, tenKH: k?.ten ?? '', mst: k?.mst ?? '' }));
  }

  protected flipHdm(id: string): void {
    this.f.update((p) => ({ ...p, hdMua: p.hdMua.includes(id) ? p.hdMua.filter((x) => x !== id) : [...p.hdMua, id] }));
  }

  protected soHdm(id: string): string {
    return this.store.hdmById(id)?.soHD ?? (id || '—');
  }

  protected phanTram(r: number): number {
    return Math.round(r * 1000) / 10;
  }

  protected setTyLe(k: 'tyLeThue' | 'tyLeGiu', raw: string): void {
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      this.store.say('Tỷ lệ phải trong khoảng 0–100%');
      return;
    }
    this.set(k, Math.round(v * 10) / 1000);
  }

  protected daQua(s: TrangThaiPT): boolean {
    const cur = LUONG.indexOf(this.f().trangThai);
    return cur >= 0 && LUONG.indexOf(s) < cur;
  }

  protected async luu(): Promise<void> {
    if (!this.kt.hopLe()) return;
    const ban = structuredClone(this.f());
    const moi = !ban.id;
    const cu = this.daLuu();
    let lyDoTyLe: string | undefined;
    if (cu && (cu.tyLeThue !== ban.tyLeThue || cu.tyLeGiu !== ban.tyLeGiu || (cu.cachChia ?? 'Nhân') !== (ban.cachChia ?? 'Nhân'))) {
      const r = await this.confirm.prompt({
        title: 'Lưu thay đổi tỷ lệ chia lợi nhuận?',
        message: 'Tỷ lệ mới áp ngay cho bảng tính của HĐ này và được ghi vào Lịch sử sửa tỷ lệ.',
        label: 'Lý do đổi tỷ lệ',
        minLength: 3,
        ok: 'Lưu',
      });
      if (r === null) return;
      lyDoTyLe = r;
    }
    const err = this.store.savePt(ban, lyDoTyLe);
    if (err) {
      this.loi.set(err);
      this.store.say(err);
      return;
    }
    this.loi.set('');
    this.store.say('Đã lưu HĐ Phú Tài');
    if (moi) {
      void this.unsaved.diSauKhiLuu(() => this.router.navigate(['/phu-tai', ban.id], { queryParamsHandling: 'merge', replaceUrl: true }));
    } else {
      this.nap(ban.id);
    }
  }

  protected hoanTac(): void {
    this.nap(this.f().id || 'moi');
  }

  protected async chuyen(toi: TrangThaiPT): Promise<void> {
    const p = this.f();
    const c = this.calc();
    let canhBao = '';
    if (toi === TT.DA_TAT_TOAN && c.khDaTra < c.sauVAT) canhBao = `KH mới trả PT ${money(c.khDaTra)} / ${money(c.sauVAT)} đ.`;
    let lyDo: string | undefined;
    if (toi === TT.HUY) {
      const r = await this.confirm.prompt({
        title: `Huỷ HĐ ${p.soHD}?`,
        message: 'Sau khi huỷ, HĐ bị khoá sửa.',
        label: 'Lý do huỷ',
        minLength: 3,
        multiline: true,
        ok: 'Huỷ HĐ',
      });
      if (r === null) return;
      lyDo = r;
    } else {
      const ok = await this.confirm.ask({
        title: `Chuyển ${p.soHD} sang "${ttNhan(toi)}"?`,
        message: toi === TT.DA_TAT_TOAN ? 'Sau khi chuyển, HĐ bị khoá sửa.' : undefined,
        warn: canhBao || (toi === TT.DA_TAT_TOAN ? 'Kiểm tra Phú Tài đã chuyển đủ phần Oxy được hưởng.' : undefined),
        ok: 'Chuyển',
      });
      if (!ok) return;
    }
    const err = this.store.chuyenTrangThaiPt(p.id, toi, lyDo);
    this.store.say(err ?? `Đã chuyển sang ${ttNhan(toi)}`);
    if (!err) this.nap(p.id);
  }

  protected async xoa(): Promise<void> {
    const p = this.f();
    await guiXoa(this.confirm, this.store, 'HopDongPhuTai', p.id, `HĐ Phú Tài ${p.soHD}`);
  }
}
