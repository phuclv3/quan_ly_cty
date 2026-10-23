import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { MOC_HAN_MUA, apDungTuDongHdm, dnvtTinhTrang, donGiaVND, dotMuaDaTra, dotQuaHan, hdmCalc, hoSoThieu, slDaNhap, thanhTienVND, tongSL } from '../core/calc';
import { CL_NHAP_KHO, DongHangMua, DotTTMua, HopDongMua, LOAI_TIEN, LoaiTien, TrangThaiHDM, LOAI_HO_SO } from '../core/models';
import { fold, money, num, pct, todayIso, uid, viDate, vnd } from '../core/util';
import { Kpi, Modal, MoneyInput, Pick, PickOption, TrangThai, PickGo } from '../shared/ui-kit';
import { HoSoPanel, guiXoa } from '../shared/ho-so';
import { Confirm } from '../shared/confirm';
import { Icon } from '../shared/icon';
import { FileHd, ThongTinHd, XemFileHd, taiFileCho } from '../shared/file-hd';
import { COT_DONG_HANG, parseDanExcel, parseDongHang } from './hdm-util';
import { docBang } from '../shared/excel';
import { xuatXlsx } from '../shared/export';
import { ThemDoiTac } from '../shared/them-doi-tac';
import { Unsaved, canhBaoChuaLuu } from '../shared/unsaved';
import { linkPhieuKho, maHangOpts } from '../kho/kho-util';
import { Buoc, BuocBar, HoSoCho, HoSoChoPanel, demHoSoCho, taiHoSoCho } from '../shared/wizard';
import { KiemTra } from '../shared/kiem-tra';

type Tab = '1' | '2' | '3' | '4';
const FLOW: TrangThaiHDM[] = [TT.NHAP, TT.DA_KY, TT.DANG_NHAN_HANG, TT.DA_NHAN_DU, TT.DA_TAT_TOAN];

interface NhapForm {
  ngay: string;
  kho: string;
  ghiChu: string;
  soHoaDon: string;
  vat: number;
  sl: Record<string, number>;
  dongIds: string[];
}
interface TraForm {
  dot: number;
  ngayTra: string;
  soTienTra: number;
  nguonTien: string;
}

/** HDM-02…09: chi tiết Hợp đồng mua (4 tab). */
@Component({
  selector: 'app-hdm-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  hostDirectives: [KiemTra],
  imports: [RouterLink, Kpi, Modal, MoneyInput, Pick, PickGo, TrangThai, HoSoPanel, Icon, FileHd, XemFileHd, ThemDoiTac, BuocBar, HoSoChoPanel],
  template: `
    @if (!isNew() && !saved()) {
      <div class="page-head"><div><div class="crumbs"><a routerLink="/">Trang chủ</a> › <a routerLink="/hop-dong-mua">Hợp đồng mua</a></div><h1>Không tìm thấy HĐ mua</h1></div></div>
      <div class="card empty">HĐ không tồn tại hoặc bạn không có quyền xem.</div>
    } @else {
      @let m = f();
      @let c = calc();
      <div class="page-head">
        <div>
          <div class="crumbs"><a routerLink="/">Trang chủ</a> › <a routerLink="/hop-dong-mua">Hợp đồng mua</a> › {{ isNew() ? 'Tạo mới' : m.soHD }}</div>
          <h1 class="row">
            {{ isNew() ? 'HĐ mua mới' : 'HĐ mua ' + m.soHD }}
            <app-tt [v]="saved()?.trangThai ?? TT.NHAP" />
            @if (choXoa()) { <app-tt v="Chờ xoá" /> }
            @if (m.thuocPhuTai) { <app-tt v="Thuộc Phú Tài" /> }
            @if (m.import) { <app-tt v="Import" /> }
          </h1>
          @if (isNew()) { <p class="sub">Tạo theo từng bước — lưu xong mở HĐ để nhập kho, trả NCC, theo dõi hồ sơ.</p> }
        </div>
        <div class="actions">
          @if (saved()) {
            <button type="button" class="btn quiet" (click)="xemFile.set(true)"><app-icon name="eye" [size]="16" /> Xem file hợp đồng</button>
          }
          @if (canSave() && !isNew()) {
            @if (dirty() && !isNew()) { <button type="button" class="btn quiet" (click)="boThayDoi()">Bỏ thay đổi</button> }
            <button type="button" class="btn" [disabled]="!dirty() && !isNew()" (click)="save()"><app-icon name="check" [size]="16" /> Lưu</button>
          }
          @if (!isNew() && !choXoa() && trangThai() !== TT.DA_TAT_TOAN && store.canEdit('hdm') && store.level('duyetXoa') !== 'none') {
            <button type="button" class="btn danger" (click)="xoa()"><app-icon name="trash" [size]="16" /> Xoá</button>
          }
        </div>
      </div>

      @if (choXoa()) { <div class="note bad">HĐ đang có yêu cầu xoá chờ duyệt — tạm khoá sửa.</div> }
      @else if (locked()) { <div class="note info">HĐ ở trạng thái {{ ttNhan(saved()?.trangThai) }} — đã khoá sửa.</div> }
      @if (dirty() && !isNew()) { <div class="note warn">Có thay đổi chưa lưu.</div> }

      @if (!isNew() && saved()) {
        <section class="card no-print">
          <div class="between">
            <div class="flow" aria-label="Luồng trạng thái">
              @for (s of flow; track s; let last = $last) {
                <span class="st" [class.cur]="s === trangThai()" [class.done]="trangThai() !== TT.HUY && flowIdx(s) < flowIdx(trangThai())">{{ ttNhan(s) }}</span>
                @if (!last) { <span class="sep">›</span> }
              }
              @if (trangThai() === TT.HUY) { <span class="sep">·</span> <app-tt [v]="TT.HUY" /> }
            </div>
            <div class="btn-row">
              @if (trangThai() === TT.DA_TAT_TOAN) {
                @if (!choXoa() && store.canEdit('moLaiHdm')) { <button type="button" class="btn sm quiet" (click)="moLai()">Mở lại</button> }
              } @else if (!locked() && store.canEdit('hdm') && keTiep(); as k) {
                <button type="button" class="btn sm" [disabled]="thieuKeTiep().length > 0" (click)="chuyen(k)">Chuyển → {{ ttNhan(k) }}</button>
              }
              @if (!locked() && store.canEdit('hdm')) { <button type="button" class="btn sm danger quiet" (click)="chuyen(TT.HUY)">Huỷ HĐ</button> }
            </div>
          </div>
          @if (!locked() && store.canEdit('hdm') && keTiep() && thieuKeTiep().length) {
            <p class="note warn">Còn thiếu để chuyển "{{ ttNhan(keTiep()) }}": {{ thieuKeTiep().join(' · ') }}</p>
          }
        </section>
      }

      @if (ptDung(); as pt) {
        <div class="note info">
          Giá đầu vào của HĐ Phú Tài
          @if (store.canView('phuTai')) { <a class="linkish" [routerLink]="['/phu-tai', pt.id]" [queryParams]="{ tab: 3 }">{{ pt.soHD }}</a> } @else { {{ pt.soHD }} }.
        </div>
      } @else if (ptVe(); as pt) {
        <div class="note info">
          Tạo từ HĐ Phú Tài {{ pt.soHD }} — lưu xong, chọn HĐ mua này ở
          <a class="linkish" [routerLink]="['/phu-tai', pt.id]" [queryParams]="{ tab: 3 }">Tab 3 của HĐ Phú Tài</a>.
        </div>
      }

      @if (!isNew()) {
      <div class="kpis">
        <app-kpi label="Tổng giá trị (VNĐ)" [value]="money(c.tong)" [sub]="m.nhapTay ? 'Nhập tay' : 'Σ thành tiền các dòng'" />
        <app-kpi label="Đã trả NCC" [value]="money(c.daTra)" [sub]="pct(c.pctTra)" tone="ok" />
        <app-kpi label="Còn phải trả" [value]="money(c.conPhaiTra)" [sub]="m.thuocPhuTai ? 'Phú Tài trả — không vào công nợ Oxy' : c.quaHan ? c.quaHan + ' đợt quá hạn' : ''" [tone]="c.quaHan ? 'bad' : c.conPhaiTra > 0 ? 'warn' : ''" />
        <app-kpi label="Nhập hàng" [value]="m.thuocPhuTai ? '—' : pct(c.pctNhap)" [sub]="m.thuocPhuTai ? 'Không nhập kho Oxy' : c.slNhap + ' / ' + c.slMua" />
      </div>
      }

      @if (saved(); as s) {
        <app-xem-file-hd [(open)]="xemFile" [files]="store.hoSoCua('HDM', s.id, 'Hợp đồng')?.files ?? []" [info]="infoFile()" />
      }

      @if (isNew()) {
        <app-buoc-bar [buocs]="buocs" [buoc]="buoc()" (chon)="den($event)" />
      } @else {
      <div class="tabs" role="tablist">
        <button type="button" role="tab" [class.on]="tab() === '1'" (click)="setTab('1')">1. Thông tin chung</button>
        <button type="button" role="tab" [class.on]="tab() === '2'" (click)="setTab('2')">2. Lưu trữ hồ sơ</button>
        <button type="button" role="tab" [class.on]="tab() === '3'" (click)="setTab('3')">3. Chi tiết hàng hoá ({{ m.chiTiet.length }})</button>
        <button type="button" role="tab" [class.on]="tab() === '4'" (click)="setTab('4')">4. Thanh toán NCC</button>
      </div>
      }

      @switch (tabXem()) {
        @case ('1') {
          <section class="card form-card">
            <fieldset class="form-sec">
              <legend>Thông tin hợp đồng</legend>
              <div class="form-grid cols-3">
                <div class="field">
                  <label for="soHD">Số HĐ mua <span class="req">*</span></label>
                  <input id="soHD" [value]="m.soHD" [disabled]="!edit()" (input)="set('soHD', $any($event.target).value)" />
                </div>
                <div class="field">
                  <label for="ngayKy">Ngày ký</label>
                  <input id="ngayKy" type="date" [value]="m.ngayKy ?? ''" [disabled]="!edit()" (input)="set('ngayKy', $any($event.target).value || undefined)" />
                </div>
                <div class="field">
                  <label for="hdb">HĐ bán liên quan</label>
                  <app-pick inputId="hdb" [options]="hdbOpts()" [value]="m.hdbId ?? ''" [allowEmpty]="true" placeholder="— Chưa gắn —" [disabled]="!edit()" (valueChange)="set('hdbId', $event || undefined)" />
                  @if (m.hdbId) { <a class="hint linkish" [routerLink]="['/hop-dong-ban', m.hdbId]">Mở HĐ bán</a> } @else { <span class="hint">Tuỳ chọn — có thể mua nhập kho trước khi gắn đơn bán.</span> }
                </div>
              </div>
            </fieldset>

            <fieldset class="form-sec">
              <legend>Nhà cung cấp</legend>
              <div class="form-grid cols-3">
                <div class="field span-2">
                  <label for="ncc">Nhà cung cấp <span class="req">*</span></label>
                  <app-pick-go inputId="ncc" [options]="nccOpts()" [value]="m.maNCC" [disabled]="!edit()" placeholder="Gõ tên hoặc MST nhà cung cấp…" (valueChange)="chonNCC($event)" />
                  @if (edit()) { <app-them-doi-tac loai="ncc" (daTao)="chonNCC($event)" /> }
                </div>
                <div class="field"><span class="lbl">MST</span><div class="ro">{{ m.mst || '—' }}</div></div>
                <div class="field"><span class="lbl">Tên NCC</span><div class="ro multi">{{ m.tenNCC || '—' }}</div></div>
                <div class="field span-2"><span class="lbl">Địa chỉ</span><div class="ro" [title]="m.diaChi">{{ m.diaChi || '—' }}</div></div>
              </div>
            </fieldset>

            <fieldset class="form-sec">
              <legend>Phân loại &amp; ghi chú</legend>
              <div class="form-grid cols-3">
                <div class="field span-3">
                  <label class="check-card" [class.on]="m.thuocPhuTai" [class.off]="!edit() || (!m.thuocPhuTai && !doiPTDuoc()) || (m.thuocPhuTai && !!ptDung())">
                    <input type="checkbox" [checked]="m.thuocPhuTai" [disabled]="!edit() || (!m.thuocPhuTai && !doiPTDuoc()) || (m.thuocPhuTai && !!ptDung())" (change)="set('thuocPhuTai', $any($event.target).checked)" />
                    <span>
                      <b>Thuộc Phú Tài</b>
                      <span class="hint">Bật → HĐ không tính công nợ phải trả, không sinh phiếu nhập kho và phiếu chi của Oxy; chỉ dùng làm giá đầu vào cho HĐ Phú Tài.</span>
                      @if (!m.thuocPhuTai && !doiPTDuoc()) { <span class="err">HĐ đã có phiếu nhập kho hoặc phiếu chi — không bật được.</span> }
                      @if (m.thuocPhuTai && ptDung(); as pt) { <span class="err">Đang là giá đầu vào của HĐ Phú Tài {{ pt.soHD }} — bỏ khỏi HĐ Phú Tài trước khi tắt.</span> }
                    </span>
                  </label>
                </div>
                <div class="field span-3">
                  <label for="ghiChu">Ghi chú</label>
                  <textarea id="ghiChu" rows="3" [value]="m.ghiChu" [disabled]="!edit()" (input)="set('ghiChu', $any($event.target).value)"></textarea>
                </div>
              </div>
            </fieldset>
          </section>

          @if (!isNew()) {
          <app-file-hd chu="HDM" [chuId]="saved()?.id ?? ''" [edit]="edit()" [info]="infoFile()" [(pending)]="fileCho" />

          }
        }

        @case ('hs') {
          <app-ho-so-cho [(cho)]="choHS" />
        }

        @case ('xn') {
          <section class="card">
            <h2 class="section-title">Kiểm tra lại trước khi lưu</h2>
            <dl class="tom-tat">
              <div><dt>Nhà cung cấp</dt><dd><b>{{ m.tenNCC || '—' }}</b>@if (m.mst) { <span class="muted">MST {{ m.mst }}</span> }</dd><button type="button" class="btn sm quiet" (click)="den(0)">Sửa</button></div>
              <div><dt>Số HĐ mua / Ngày ký</dt><dd>{{ m.soHD || '—' }} · {{ viDate(m.ngayKy) }}</dd><button type="button" class="btn sm quiet" (click)="den(0)">Sửa</button></div>
              <div>
                <dt>HĐ bán liên quan</dt>
                <dd>{{ m.hdbId ? (store.hdbById(m.hdbId)?.soHD || '(HĐ chưa có số)') : 'Chưa gắn' }}@if (m.thuocPhuTai) { <app-tt v="Thuộc Phú Tài" /> }</dd>
                <button type="button" class="btn sm quiet" (click)="den(0)">Sửa</button>
              </div>
              <div><dt>Hàng hoá</dt><dd>{{ m.chiTiet.length }} dòng · Tổng giá trị <b>{{ money(c.tong) }} đ</b>@if (m.nhapTay) { <span class="muted">(nhập tay)</span> }</dd><button type="button" class="btn sm quiet" (click)="den(1)">Sửa</button></div>
              <div><dt>Thanh toán NCC</dt><dd>{{ m.dotTT.length ? m.dotTT.length + ' đợt trả' : 'Chưa chia đợt' }}</dd><button type="button" class="btn sm quiet" (click)="den(2)">Sửa</button></div>
              <div>
                <dt>Hồ sơ đính kèm</dt>
                <dd>@if (tongHS()) { @for (loai of loaiHS; track loai) { @if (choHS()[loai]?.length) { <span class="chip">{{ loai }}: {{ choHS()[loai]!.length }}</span> } } } @else { <span class="muted">Chưa chọn tệp — bổ sung sau ở Tab "Lưu trữ hồ sơ"</span> }</dd>
                <button type="button" class="btn sm quiet" (click)="den(3)">Sửa</button>
              </div>
              <div><dt>Trạng thái khi lưu</dt><dd><app-tt v="Nháp" /> <span class="muted">— chuyển "Đã ký" ở màn chi tiết.</span></dd><span></span></div>
            </dl>
          </section>
        }

        @case ('2') {
          @if (saved(); as s) {
            <app-ho-so chu="HDM" [chuId]="s.id" [soHD]="s.soHD" [edit]="edit()" [giaTri]="c.tong" [ghiChuThieu]="m.ghiChuHoSoThieu ?? ''" (ghiChuThieuChange)="set('ghiChuHoSoThieu', $event)" />
          } @else {
            <div class="card empty">
              Hồ sơ được lưu theo mã HĐ — cần lưu HĐ mua lần đầu (Số HĐ mua, Nhà cung cấp ở Tab 1) trước khi tải hồ sơ.
              @if (edit()) { <div class="btn-row" style="justify-content:center;margin-top:10px"><button type="button" class="btn" (click)="save()"><app-icon name="check" [size]="16" /> Lưu HĐ &amp; mở hồ sơ</button></div> }
            </div>
          }
        }

        @case ('3') {
          <div class="section-title">
            <span class="muted">Thành tiền VNĐ = SL × Đơn giá × Tỷ giá (VNĐ: tỷ giá = 1).</span>
            <div class="btn-row">
              @if (nhapDuoc() && chon().length) {
                <button type="button" class="btn" (click)="moNhap(chon())"><app-icon name="box" [size]="16" /> Nhập kho {{ chon().length }} dòng chọn</button>
              }
              @if (edit()) {
                <button type="button" class="btn" (click)="moDN()"><app-icon name="truck" [size]="16" /> Lấy từ đề nghị cấp vật tư @if (dnCho().length) { ({{ dnCho().length }}) }</button>
                <button type="button" class="btn quiet" (click)="danOpen.set(true)"><app-icon name="import" [size]="16" /> Nhập từ Excel</button>
                <button type="button" class="btn quiet" (click)="themDong()"><app-icon name="plus" [size]="16" /> Thêm dòng</button>
              }
            </div>
          </div>
          @if (!m.thuocPhuTai && store.canEdit('hdmNhapKho') && !isNew() && !nhapDuoc() && trangThai() === TT.NHAP) {
            <div class="note info">Chuyển HĐ sang “Đã ký” để nhập kho.</div>
          }
          @if (choHoaDon()) {
            <div class="note warn">Bắt buộc có hoá đơn mới nhập kho — chọn <b>NCC đã xuất hoá đơn: Đã</b> ở <a class="linkish" (click)="setTab('4')">Tab 4</a> rồi Lưu.</div>
          }
          <div class="tbl-wrap">
            <table class="tbl freeze compact">
              <thead>
                <tr>
                  @if (nhapDuoc()) { <th></th> }
                  <th class="w-lg">Mã hàng</th><th class="w-lg">Tên hàng</th><th class="w-md">Thông số</th><th class="w-sm num">SL</th><th class="w-sm">ĐVT</th>
                  <th class="w-md num">Đơn giá</th><th class="w-sm">Loại tiền</th><th class="w-md num">Tỷ giá</th><th class="num">Thành tiền VNĐ</th>
                  @if (!m.thuocPhuTai) { <th class="num">SL đã nhập</th> }
                  <th class="w-md">Ghi chú</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (d of m.chiTiet; track d.id; let i = $index) {
                  @let da = daNhap(d.id);
                  @let con = d.soLuong - da;
                  <tr [class.sel]="chon().includes(d.id)">
                    @if (nhapDuoc()) {
                      <td>@if (luuRoi(d.id) && con > 0) { <input type="checkbox" [attr.aria-label]="'Chọn ' + d.tenHang" [checked]="chon().includes(d.id)" (change)="flipChon(d.id)" /> }</td>
                    }
                    <td><app-pick [options]="lhOpts()" [value]="d.loaiHang" [disabled]="!edit() || da > 0" (valueChange)="chonLoai(i, $event)" /></td>
                    <td>
                      <input [value]="d.tenHang" [disabled]="!edit()" (input)="setDong(i, { tenHang: $any($event.target).value })" aria-label="Tên hàng" />
                      @if (d.dnvtId) { <span class="hint">Đề nghị {{ soDN(d.dnvtId) }}@if (d.hdbId) { · HĐ bán {{ store.hdbById(d.hdbId)?.soHD || '(báo giá)' }} }</span> }
                    </td>
                    <td><input [value]="d.thongSo" [disabled]="!edit() || da > 0" [placeholder]="thuocTinh(d.loaiHang)" (input)="setDong(i, { thongSo: $any($event.target).value })" aria-label="Thông số" /></td>
                    <td>
                      <input type="number" [min]="da" class="num" [value]="d.soLuong" [disabled]="!edit()" (input)="setDong(i, { soLuong: +$any($event.target).value || 0 })" aria-label="Số lượng" />
                      @if (da > 0 && d.soLuong < da) { <span class="err">≥ {{ num(da) }} (đã nhập)</span> }
                    </td>
                    <td><input [value]="d.dvt" [disabled]="!edit()" (input)="setDong(i, { dvt: $any($event.target).value })" aria-label="Đơn vị tính" /></td>
                    <td><app-money [value]="d.donGia" [decimals]="d.loaiTien === 'VNĐ' ? 0 : 2" [disabled]="!edit()" (valueChange)="setDong(i, { donGia: $event })" /></td>
                    <td>
                      <select [disabled]="!edit()" (change)="chonTien(i, $any($event.target).value)" aria-label="Loại tiền">
                        @for (t of loaiTien; track t) { <option [value]="t" [selected]="t === d.loaiTien">{{ t }}</option> }
                      </select>
                    </td>
                    <td>
                      @if (d.loaiTien === 'VNĐ') { <div class="ro num" title="VNĐ: tỷ giá khoá = 1">1</div> }
                      @else { <app-money [value]="d.tyGia" [decimals]="2" [disabled]="!edit()" placeholder="Bắt buộc" (valueChange)="setDong(i, { tyGia: $event })" /> }
                    </td>
                    <td class="num" title="SL × Đơn giá × Tỷ giá">{{ money(thanhTien(d)) }}</td>
                    @if (!m.thuocPhuTai) {
                      <td class="num">
                        {{ num(da) }}
                        @if (d.soLuong > 0 && con <= 0) { <span class="tag ok">✓ Đã nhập kho</span> }
                        @else if (nhapDuoc() && luuRoi(d.id)) { <button type="button" class="btn sm" (click)="moNhap([d.id])">Nhập kho</button> }
                      </td>
                    }
                    <td><input [value]="d.ghiChu ?? ''" [disabled]="!edit()" (input)="setDong(i, { ghiChu: $any($event.target).value })" aria-label="Ghi chú" /></td>
                    <td>
                      @if (edit()) {
                        <button type="button" class="icon-btn sm" [disabled]="da > 0" [title]="da > 0 ? 'Dòng đã có phiếu nhập — không xoá được' : 'Xoá dòng'" aria-label="Xoá dòng" (click)="xoaDong(i)"><app-icon name="trash" [size]="16" /></button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td [attr.colspan]="14" class="empty">Chưa có dòng hàng</td></tr>
                }
              </tbody>
              @if (m.chiTiet.length) {
                <tfoot>
                  <tr>
                    @if (nhapDuoc()) { <td></td> }
                    <th>Tổng</th><td></td><td></td><td class="num">{{ num(c.slMua) }}</td><td colspan="5" class="num">{{ money(c.tongDong) }}</td>
                    @if (!m.thuocPhuTai) { <td class="num">{{ num(c.slNhap) }}</td> }
                    <td colspan="2"></td>
                  </tr>
                </tfoot>
              }
            </table>
          </div>

          @if (!m.thuocPhuTai && !isNew()) {
            <h3 class="section-title">Phiếu nhập kho của HĐ</h3>
            <div class="tbl-wrap">
              <table class="tbl compact">
                <thead><tr><th>Số phiếu</th><th>Ngày</th><th>Vị trí kho</th><th class="num">Tổng SL</th><th>Người thực hiện</th><th>Trạng thái</th><th></th></tr></thead>
                <tbody>
                  @for (p of phieuNhap(); track p.id) {
                    @let tay = p.nguonGoc !== 'Tự động HĐ Mua';
                    <tr>
                      <td>
                        @if (store.canView('khoTon')) { <a [routerLink]="'/kho'" [queryParams]="linkPK(p)"><b>{{ p.soPhieu }}</b></a> } @else { <b>{{ p.soPhieu }}</b> }
                        @if (tay) { <span class="tag mute" title="Phiếu điều chỉnh tay gắn HĐ — không tính vào SL đã nhập của dòng hàng">Điều chỉnh tay</span> }
                      </td>
                      <td>{{ viDate(p.ngay) }}</td><td>{{ store.khoTen(p.kho) }}</td><td class="num">{{ num(tongSL(p)) }}</td>
                      <td>{{ store.userName(p.nguoiThucHien) }}</td>
                      <td><app-tt [v]="p.trangThai" /> @if (store.dangChoXoa('PhieuKho', p.id)) { <app-tt v="Chờ xoá" /> }</td>
                      <td>
                        @if (p.trangThai === TT.HIEU_LUC && !store.dangChoXoa('PhieuKho', p.id) && store.canEdit(tay ? 'khoPhieuTay' : 'hdmNhapKho') && store.level('duyetXoa') !== 'none') {
                          <button type="button" class="btn sm danger" (click)="huyPhieu(p.id, p.soPhieu)">{{ tay ? 'Huỷ phiếu' : 'Bỏ nhập' }}</button>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="7" class="muted">Chưa có phiếu nhập</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }

        @case ('4') {
          <h3 class="section-title">Tổng giá trị HĐ</h3>
          <section class="card stack">
            <div class="form-grid">
              <div class="field"><span class="lbl">Σ Thành tiền VNĐ các dòng</span><div class="ro num" title="Σ SL × Đơn giá × Tỷ giá (Tab 3)">{{ money(c.tongDong) }}</div></div>
              @for (nt of nguyenTe(); track nt.t) {
                <div class="field"><span class="lbl">Tổng nguyên tệ {{ nt.t }}</span><div class="ro num">{{ nt.t === 'VNĐ' ? money(nt.v) : num(nt.v) }} {{ nt.t }}</div></div>
              }
              <div class="field">
                <span class="lbl">Cách tính tổng</span>
                <label class="check-row"><input type="checkbox" [checked]="m.nhapTay" [disabled]="!edit4()" (change)="setNhapTay($any($event.target).checked)" /> Nhập tay tổng giá trị</label>
              </div>
              @if (m.nhapTay) {
                <div class="field">
                  <label for="tongNT">Tổng giá trị nhập tay (VNĐ) <span class="req">*</span></label>
                  <app-money inputId="tongNT" [value]="m.tongNhapTay ?? 0" [disabled]="!edit4()" (valueChange)="set('tongNhapTay', $event)" />
                  <span class="hint" [class.err]="(m.tongNhapTay ?? 0) !== c.tongDong">Chênh lệch so với Σ dòng: {{ money((m.tongNhapTay ?? 0) - c.tongDong) }}</span>
                </div>
                <div class="field wide">
                  <label for="lyDoNT">Lý do nhập tay <span class="req">*</span></label>
                  <input id="lyDoNT" [value]="m.lyDoNhapTay ?? ''" [disabled]="!edit4()" (input)="set('lyDoNhapTay', $any($event.target).value)" />
                  @if (!m.lyDoNhapTay?.trim()) { <span class="err">Bắt buộc ghi lý do</span> }
                </div>
              }
              <div class="field"><span class="lbl">Tổng giá trị HĐ (VNĐ)</span><div class="ro num"><b>{{ money(c.tong) }}</b></div></div>
            </div>
          </section>

          <div class="section-title">
            <h3>Đợt thanh toán NCC</h3>
            @if (edit4() && m.dotTT.length < soDotToiDa()) { <button type="button" class="btn sm quiet" (click)="themDot()"><app-icon name="plus" [size]="16" /> Thêm đợt {{ m.dotTT.length + 1 }}</button> }
          </div>
          @if (m.thuocPhuTai) { <div class="note info">Phú Tài trả NCC — đây là <b>nơi ghi chuẩn</b> các lần Phú Tài trả cho HĐ mua này (HĐ Phú Tài Tab 3 tổng hợp từ đây). Không tạo phiếu chi Oxy; đợt tính đã trả theo Số tiền trả ghi nhận.</div> }
          <div class="tbl-wrap">
            <table class="tbl compact">
              <thead>
                <tr>
                  <th>Đợt</th><th class="num">Tỷ lệ %</th><th class="w-md num">Số tiền</th><th class="th-han">Hạn trả (theo tiến độ)</th><th>Ngày trả</th><th class="num">Số tiền trả</th>
                  @if (!m.thuocPhuTai) { <th>Nguồn tiền</th><th>Phiếu chi</th> }
                  <th class="num">Đã trả (tính)</th><th class="w-md">Ghi chú</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (d of m.dotTT; track d.dot; let i = $index) {
                  @let daTra = daTraDot(d);
                  @let phieu = store.phieuById(d.phieuChiId);
                  @let khoaDot = store.dotMuaKhoa(d);
                  <tr [class.overdue]="quaHan(d)">
                    <td>Đợt {{ d.dot }} @if (quaHan(d)) { <app-tt v="Quá hạn" /> }</td>
                    <td><input class="num" type="number" min="0" max="100" step="0.1" style="width:80px" [value]="d.tyLe ?? ''" [disabled]="!edit4() || khoaDot" (input)="setTyLe(i, $any($event.target).value)" aria-label="Tỷ lệ %" /></td>
                    <td><app-money [value]="d.soTien" [disabled]="!edit4() || khoaDot" (valueChange)="setSoTien(i, $event)" /></td>
                    <td [attr.title]="khoaDot ? 'Đợt đã có phiếu chi — khoá số tiền và hạn' : null">
                      <div class="han-tt">
                        <select [disabled]="!edit4() || khoaDot" (change)="setMoc(i, $any($event.target).value)" aria-label="Mốc tính hạn">
                          @for (mc of mocHan; track mc) { <option [value]="mc" [selected]="d.hanMoc === mc">{{ mc }}</option> }
                          <option value="" [selected]="!d.hanMoc">Ngày cụ thể…</option>
                        </select>
                        @if (d.hanMoc) {
                          <span class="cong">+ <input class="num" type="number" min="0" step="1" [value]="d.hanNgay ?? 0" [disabled]="!edit4() || khoaDot" (input)="setDot(i, { hanNgay: soNgay($any($event.target).value) })" aria-label="Số ngày sau mốc" /> ngày</span>
                          @if (d.han) { <span class="kq co">→ {{ viDate(d.han) }}</span> } @else { <span class="kq" [title]="'Hạn tính khi mốc ' + d.hanMoc + ' có ngày'">chờ mốc</span> }
                        } @else {
                          <input type="date" [value]="d.han ?? ''" [disabled]="!edit4() || khoaDot" (input)="setDot(i, { han: $any($event.target).value || undefined })" aria-label="Hạn trả" />
                        }
                      </div>
                    </td>
                    <td>{{ viDate(d.ngayTra) }}</td>
                    <td class="num">{{ d.soTienTra ? money(d.soTienTra) : '—' }}</td>
                    @if (!m.thuocPhuTai) {
                      <td>{{ d.nguonTien ? store.nguonTen(d.nguonTien) : '—' }}</td>
                      <td>
                        @if (phieu) {
                          @if (xemPhieu()) { <a class="linkish" routerLink="/ke-toan" [queryParams]="{ tab: 'so-quy', id: phieu.id }">{{ phieu.soPhieu }}</a> } @else { {{ phieu.soPhieu }} }
                          @if (store.dangChoXoa('PhieuThuChi', phieu.id)) { <app-tt v="Chờ xoá" /> } @else { <app-tt [v]="phieu.trangThai" /> }
                          @if (phieu.trangThai === TT.DA_DUYET && edit4() && store.level('duyetXoa') !== 'none' && !store.dangChoXoa('PhieuThuChi', phieu.id)) {
                            <button type="button" class="linkish sub" title="Phiếu đã duyệt mà ghi sai: gửi yêu cầu xoá, duyệt xong ghi nhận lại" (click)="xoaPhieuChi(phieu.id, phieu.soPhieu, d.dot)">Yêu cầu xoá phiếu</button>
                          }
                        } @else { <span class="muted">—</span> }
                      </td>
                    }
                    <td class="num">{{ money(daTra) }}</td>
                    <td><input [value]="d.ghiChu ?? ''" [disabled]="!edit4()" (input)="setDot(i, { ghiChu: $any($event.target).value })" aria-label="Ghi chú đợt" /></td>
                    <td>
                      @if (edit4() && !isNew() && phieu?.trangThai !== TT.DA_DUYET) {
                        <button type="button" class="btn sm" (click)="moTra(d)">{{ d.ngayTra ? 'Sửa ghi nhận' : 'Ghi nhận đã trả' }}</button>
                      }
                      @if (edit4() && $last && !d.phieuChiId && !d.soTienTra) {
                        <button type="button" class="icon-btn sm" aria-label="Xoá đợt" (click)="xoaDot()"><app-icon name="trash" [size]="16" /></button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="11" class="muted">Chưa có đợt thanh toán (tối đa {{ soDotToiDa() }} đợt)</td></tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="2">Công nợ phải trả</th><td class="num">{{ money(tongDot()) }}</td><td colspan="2" class="muted">Đã trả (đã duyệt): {{ money(c.daTra) }}</td>
                  <td class="num" [attr.colspan]="m.thuocPhuTai ? 2 : 4"><b [class.neg]="c.conPhaiTra < 0">Còn phải trả: {{ money(c.conPhaiTra) }}</b></td><td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          @if (tongDot() !== c.tong && m.dotTT.length) { <p class="hint muted">Σ số tiền các đợt ({{ money(tongDot()) }}) khác Tổng giá trị HĐ ({{ money(c.tong) }}).</p> }

          <h3 class="section-title">Xuất hoá đơn & Tiến độ hàng hoá</h3>
          <section class="card stack">
            <div class="form-grid">
              <div class="field">
                <label for="xhd">NCC đã xuất hoá đơn</label>
                <select id="xhd" [disabled]="!edit4()" (change)="set('xuatHoaDon', $any($event.target).value)">
                  <option value="Chưa" [selected]="m.xuatHoaDon === 'Chưa'">Chưa</option>
                  <option value="Đã" [selected]="m.xuatHoaDon === 'Đã'">Đã</option>
                </select>
                @if (m.xuatHoaDon === 'Đã') { <span class="hint">Nhập Số + Ngày hoá đơn ở <a class="linkish" (click)="setTab('2')">Tab 2</a>.</span> }
                @else if (!m.thuocPhuTai) { <span class="hint">Bắt buộc chọn "Đã" (và Lưu) mới <b>Nhập kho</b> được.</span> }
              </div>
            </div>
            <table class="tbl compact">
              <thead><tr><th>Checklist tiến độ</th><th>Ngày</th></tr></thead>
              <tbody>
                @for (x of m.checklist; track x.ten; let i = $index) {
                  <tr>
                    @let tuDong = x.ten === clNhapKho && !m.thuocPhuTai;
                    <td>
                      <label class="check-row" [attr.title]="tuDong ? 'Tự tích khi nhập đủ hàng (Tab 3)' : null">
                        <input type="checkbox" [checked]="x.xong" [disabled]="!edit4() || tuDong" (change)="tichCL(i, $any($event.target).checked)" /> {{ x.ten }}
                        @if (tuDong) { <span class="sub muted">(tự động theo phiếu nhập · cần "NCC đã xuất hoá đơn: Đã")</span> }
                      </label>
                    </td>
                    <td><input type="date" [value]="x.ngay ?? ''" [disabled]="!edit4() || !x.xong || tuDong" (input)="setCL(i, $any($event.target).value || undefined)" [attr.aria-label]="'Ngày ' + x.ten" /></td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }
      }

      <app-modal [open]="dnOpen()" title="Lấy hàng từ đề nghị cấp vật tư" sub="Chọn các dòng còn phải mua — có thể gom đề nghị của nhiều HĐ bán vào một HĐ mua" size="lg" (closed)="dnOpen.set(false)">
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead><tr><th></th><th>Đề nghị</th><th>HĐ bán</th><th>Mã hàng</th><th>Tên hàng</th><th class="num">Đề nghị</th><th class="num">Đã lên HĐ mua</th><th class="num">Còn phải mua</th></tr></thead>
            <tbody>
              @for (r of dnCho(); track r.key) {
                <tr>
                  <td><input type="checkbox" [checked]="dnChon().includes(r.key)" (change)="latDN(r.key)" [attr.aria-label]="'Chọn ' + r.loaiHang" /></td>
                  <td>{{ r.soPhieu }}</td>
                  <td>{{ r.soHDB }}</td>
                  <td><b>{{ r.loaiHang }}</b></td>
                  <td>{{ r.tenHang }}</td>
                  <td class="num">{{ r.soLuong }}</td>
                  <td class="num">{{ r.daMua }}</td>
                  <td class="num"><b>{{ r.con }}</b></td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="muted">Không còn đề nghị cấp vật tư nào chờ mua. Đề nghị lập ở HĐ bán (Tab 3 — dòng "Cần mua").</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div foot class="btn-row">
          <button type="button" class="btn quiet" (click)="dnOpen.set(false)">Huỷ</button>
          <button type="button" class="btn" [disabled]="!dnChon().length" (click)="themTuDN()">Thêm {{ dnChon().length }} dòng</button>
        </div>
      </app-modal>

      <app-modal [open]="danOpen()" title="Nhập dòng hàng từ Excel" sub="Tải file lên hoặc dán trực tiếp" [dirty]="!!danText().trim()" (closed)="danOpen.set(false)">
        <p class="sub">Thứ tự cột: <b>{{ cotDong.join(' · ') }}</b>. Loại hàng tự đoán theo tên — kiểm tra lại sau khi thêm. Dòng tiêu đề / thiếu tên / SL không phải số sẽ bỏ qua.</p>
        <section class="dan-buoc">
          <h3><span class="so">1</span> Tải file mẫu, điền hàng hoá</h3>
          <button type="button" class="btn quiet" (click)="taiMau()"><app-icon name="download" [size]="16" /> Tải file mẫu (.xlsx)</button>
        </section>
        <section class="dan-buoc">
          <h3><span class="so">2</span> Chọn file đã điền để thêm dòng</h3>
          <label class="drop">
            <input type="file" accept=".xlsx,.csv,.txt" (change)="taiFile($event)" />
            <app-icon name="upload" [size]="16" />
            <span>{{ dangDoc() ? 'Đang đọc tệp…' : 'Chọn file Excel (.xlsx) hoặc CSV' }}</span>
          </label>
        </section>
        <section class="dan-buoc">
          <h3><span class="so">hoặc</span> Copy các ô trong Excel rồi dán vào đây</h3>
          <textarea rows="7" style="width: 100%" [value]="danText()" (input)="danText.set($any($event.target).value)" aria-label="Dữ liệu dán" placeholder="Bôi đen các ô (không cần dòng tiêu đề) → Ctrl+C → Ctrl+V vào ô này"></textarea>
        </section>
        <div foot class="btn-row">
          <button type="button" class="btn quiet" (click)="danOpen.set(false)">Huỷ</button>
          <button type="button" class="btn" [disabled]="!danText().trim()" (click)="dan()">Thêm dòng đã dán</button>
        </div>
      </app-modal>

      @if (isNew()) {
        <div class="wiz-foot">
          @if (buoc() > 0) { <button type="button" class="btn quiet" (click)="den(buoc() - 1)"><app-icon name="back" [size]="16" /> Quay lại</button> }
          <span class="sp"></span>
          <span class="muted">Bước {{ buoc() + 1 }}/{{ buocs.length }}</span>
          @if (buoc() < buocs.length - 1) {
            <button type="button" class="btn" (click)="tiep()">Tiếp: {{ buocs[buoc() + 1].t }} <app-icon name="chevron" [size]="16" class="tiep-ico" /></button>
          } @else {
            <button type="button" class="btn ok" [disabled]="!edit()" (click)="save()">
              <app-icon name="check" [size]="16" /> {{ tongHS() ? 'Lưu hợp đồng & ' + tongHS() + ' tệp' : 'Lưu hợp đồng' }}
            </button>
          }
        </div>
      }

      <app-modal #mNhap [open]="!!nhap()" title="Nhập kho" sub="Sinh phiếu Nhập kho tự động từ HĐ mua" (closed)="nhap.set(null)">
        @if (nhap(); as n) {
          <div class="form-grid">
            <div class="field">
              <label for="nkNgay">Ngày <span class="req">*</span></label>
              <input id="nkNgay" type="date" [value]="n.ngay" (input)="nhap.set({ ...n, ngay: $any($event.target).value })" />
            </div>
            <div class="field">
              <label for="nkKho">Vị trí kho <span class="req">*</span></label>
              <app-pick inputId="nkKho" [options]="khoOpts()" [value]="n.kho" (valueChange)="nhap.set({ ...n, kho: $event })" />
            </div>
            <div class="field">
              <label for="nkHD">Số hoá đơn NCC <span class="req">*</span></label>
              <input id="nkHD" placeholder="VD HĐ 259" [value]="n.soHoaDon" (input)="nhap.set({ ...n, soHoaDon: $any($event.target).value })" />
              <span class="hint">Mã lô sinh theo số hoá đơn: L259-01…</span>
            </div>
            <div class="field">
              <label for="nkVAT">VAT % hoá đơn</label>
              <input id="nkVAT" type="number" min="0" max="10" [value]="n.vat" (input)="nhap.set({ ...n, vat: +$any($event.target).value || 0 })" />
            </div>
            <div class="field wide">
              <label for="nkGC">Ghi chú</label>
              <input id="nkGC" [value]="n.ghiChu" (input)="nhap.set({ ...n, ghiChu: $any($event.target).value })" />
            </div>
          </div>
          <div class="tbl-wrap" style="margin-top: 12px">
            <table class="tbl compact">
              <thead><tr><th>Mã hàng</th><th>Tên hàng</th><th>Quy cách / nồng độ</th><th class="num">Đơn giá lô</th><th class="num">SL</th><th class="num">Đã nhập</th><th class="num">Còn lại</th><th class="w-md num">SL thực nhập</th></tr></thead>
              <tbody>
                @for (id of n.dongIds; track id) {
                  @let d = dongById(id);
                  @if (d) {
                    @let con = d.soLuong - daNhap(d.id);
                    <tr>
                      <td><b>{{ d.loaiHang }}</b></td><td>{{ d.tenHang }}</td><td class="sub">{{ d.thongSo }}</td><td class="num">{{ num(donGiaLo(d)) }}</td><td class="num">{{ num(d.soLuong) }}</td><td class="num">{{ num(daNhap(d.id)) }}</td><td class="num">{{ num(con) }}</td>
                      <td>
                        <input type="number" min="0" [max]="con" class="num" [value]="n.sl[id]" (input)="setSL(id, +$any($event.target).value || 0)" aria-label="SL thực nhập" />
                        @if (n.sl[id] > con) { <span class="err">≤ {{ num(con) }}</span> }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        }
        <div foot class="btn-row">
          <button type="button" class="btn quiet" (click)="nhap.set(null)">Huỷ</button>
          <button type="button" class="btn" (click)="xacNhanNhap()">Xác nhận nhập kho</button>
        </div>
      </app-modal>

      <app-modal #mTra [open]="!!tra()" [title]="'Ghi nhận đã trả — Đợt ' + (tra()?.dot ?? '')" size="sm" (closed)="tra.set(null)">
        @if (tra(); as t) {
          <div class="stack">
            <div class="field">
              <label for="trNgay">Ngày trả <span class="req">*</span></label>
              <input id="trNgay" type="date" [value]="t.ngayTra" (input)="tra.set({ ...t, ngayTra: $any($event.target).value })" />
            </div>
            <div class="field">
              <label for="trTien">Số tiền trả (VNĐ) <span class="req">*</span></label>
              <app-money inputId="trTien" [value]="t.soTienTra" (valueChange)="tra.set({ ...t, soTienTra: $event })" />
            </div>
            @if (m.thuocPhuTai) {
              <div class="note info">Phú Tài trả, không tạo phiếu chi Oxy.</div>
            } @else {
              <div class="field">
                <label for="trNguon">Nguồn tiền <span class="req">*</span></label>
                <app-pick inputId="trNguon" [options]="nguonOpts()" [value]="t.nguonTien" (valueChange)="tra.set({ ...t, nguonTien: $event })" />
              </div>
              <div class="note warn">Tạo phiếu Chi “Chờ duyệt” ở Sổ quỹ. Đợt chỉ tính “đã trả” khi phiếu được duyệt.</div>
            }
          </div>
        }
        <div foot class="btn-row">
          <button type="button" class="btn quiet" (click)="tra.set(null)">Huỷ</button>
          <button type="button" class="btn" (click)="xacNhanTra()">Ghi nhận</button>
        </div>
      </app-modal>
    }
  `,
})
export class HdmDetail {
  private readonly mTra = viewChild<Modal>('mTra');
  private readonly mNhap = viewChild<Modal>('mNhap');
  private readonly kt = inject(KiemTra);
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  protected readonly ttNhan = ttNhan;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);
  protected readonly money = money;
  protected readonly mocHan = MOC_HAN_MUA;
  protected readonly clNhapKho = CL_NHAP_KHO;
  protected readonly num = num;
  protected readonly pct = pct;
  protected readonly viDate = viDate;
  protected readonly tongSL = tongSL;
  protected readonly flow = FLOW;
  protected readonly loaiTien = LOAI_TIEN;

  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? 'moi')), {
    initialValue: this.route.snapshot.paramMap.get('id') ?? 'moi',
  });
  protected readonly tab = toSignal(
    this.route.queryParamMap.pipe(map((q) => (['1', '2', '3', '4'].includes(q.get('tab') ?? '') ? (q.get('tab') as Tab) : '1'))),
    { initialValue: '1' as Tab },
  );
  protected readonly isNew = computed(() => this.id() === 'moi');

  // ── Tạo mới từng bước (shared/wizard) — HĐ đã lưu dùng 4 tab như cũ ──
  protected readonly buocs: Buoc[] = [
    { k: '1', t: 'Thông tin chung', mo: 'NCC, số HĐ, HĐ bán' },
    { k: '3', t: 'Hàng hoá', mo: 'Dòng hàng, đơn giá' },
    { k: '4', t: 'Thanh toán NCC', mo: 'Tổng giá trị, đợt trả' },
    { k: 'hs', t: 'Hồ sơ', mo: 'File HĐ, BBGH, hoá đơn' },
    { k: 'xn', t: 'Xác nhận', mo: 'Kiểm tra & lưu' },
  ];
  protected readonly buoc = signal(0);
  /** Nội dung đang hiện: bước wizard (HĐ mới) hoặc tab (HĐ đã lưu). */
  protected readonly tabXem = computed(() => (this.isNew() ? this.buocs[this.buoc()].k : this.tab()));
  protected readonly choHS = signal<HoSoCho>({});
  protected readonly tongHS = computed(() => demHoSoCho(this.choHS()));
  protected readonly loaiHS = LOAI_HO_SO;
  /** Bản đã lưu (tham chiếu ổn định tới khi Store ghi bản ghi này). */
  protected readonly saved = computed(() => (this.isNew() ? undefined : this.store.hdmVisible().find((x) => x.id === this.id())));
  /** Bản nháp đang sửa — tự nạp lại khi bản đã lưu thay đổi. */
  protected readonly f = linkedSignal<HopDongMua | undefined, HopDongMua>({
    source: this.saved,
    computation: (s) => (s ? structuredClone(s) : this.blank()),
  });
  private readonly goc = computed(() => JSON.stringify(this.saved() ?? null));
  protected readonly dirty = computed(() => !this.isNew() && JSON.stringify(this.f()) !== this.goc());

  protected readonly calc = computed(() => hdmCalc(this.f(), this.store.db()));
  /** File hợp đồng chọn khi HĐ chưa lưu — tải lên ngay sau lần Lưu đầu. */
  protected readonly fileCho = signal<File[]>([]);
  protected readonly xemFile = signal(false);
  protected readonly infoFile = computed<ThongTinHd>(() => {
    const m = this.f();
    return { loai: 'mua', soHD: m.soHD, tenDoiTac: m.tenNCC, mst: m.mst, diaChi: m.diaChi, ngayKy: m.ngayKy, giaTri: this.calc().tong, ghiChu: m.ghiChu };
  });
  protected readonly trangThai = computed<TrangThaiHDM>(() => this.saved()?.trangThai ?? TT.NHAP);
  protected readonly choXoa = computed(() => !this.isNew() && this.store.dangChoXoa('HopDongMua', this.id()));
  protected readonly locked = computed(() => {
    const s = this.saved();
    return !!s && this.store.hdmKhoa(s);
  });
  /** Tab 1–3 (Admin / Giám đốc). */
  protected readonly edit = computed(() => this.store.canEdit('hdm') && !this.locked());
  /** Tab 4 (thêm Kế toán). */
  protected readonly edit4 = computed(() => !this.locked() && (this.store.canEdit('hdm') || (this.store.canEdit('hdmTab4') && !this.isNew())));
  protected readonly canSave = computed(() => this.edit() || this.edit4());
  protected readonly soDotToiDa = computed(() => this.store.cauHinh().SO_DOT_TOI_DA);

  protected readonly nhapDuoc = computed(() => this.nhapDuocTruHD() && this.saved()?.xuatHoaDon === 'Đã');
  /** Đủ điều kiện nhập kho, chỉ còn thiếu "NCC đã xuất hoá đơn: Đã". */
  protected readonly choHoaDon = computed(() => this.nhapDuocTruHD() && this.saved()?.xuatHoaDon !== 'Đã');
  private readonly nhapDuocTruHD = computed(() => {
    const s = this.saved();
    return (
      !!s &&
      !s.thuocPhuTai &&
      !this.f().thuocPhuTai &&
      !this.choXoa() &&
      this.store.canEdit('hdmNhapKho') &&
      (s.trangThai === TT.DA_KY || s.trangThai === TT.DANG_NHAN_HANG || s.trangThai === TT.DA_NHAN_DU)
    );
  });
  protected readonly chon = signal<string[]>([]);

  protected readonly nccOpts = computed<PickOption[]>(() =>
    this.store
      .ncc()
      // Chỉ NCC Đang dùng; HĐ cũ đã gắn NCC nay Ngưng vẫn giữ để hiện đúng tên (F-09).
      .filter((n) => n.trangThai !== TT.NGUNG || n.id === this.f().maNCC)
      .map((n) => ({
        value: n.id,
        label: n.ten,
        hint: [n.mst ? 'MST ' + n.mst : n.id, n.quocGia, n.trangThai === TT.NGUNG ? ttNhan(TT.NGUNG) : ''].filter(Boolean).join(' · '),
      })),
  );
  protected readonly hdbOpts = computed<PickOption[]>(() => this.store.hopDongBan().map((h) => ({ value: h.id, label: h.soHD, hint: h.tenKH })));
  protected readonly lhOpts = computed<PickOption[]>(() =>
    maHangOpts(this.store.loaiHang().filter((l) => l.dangDung || this.f().chiTiet.some((d) => d.loaiHang === l.id))),
  );
  protected readonly khoOpts = computed<PickOption[]>(() => this.store.khoDangDung().map((k) => ({ value: k.id, label: k.ten, hint: k.loai })));
  protected readonly nguonOpts = computed<PickOption[]>(() => this.store.nguonDangDung().map((n) => ({ value: n.id, label: n.ten, hint: n.loai })));

  protected readonly nguyenTe = computed(() =>
    LOAI_TIEN.filter((t) => this.calc().nguyenTe[t] !== undefined)
      .filter((t, _, arr) => arr.length > 1 || t !== 'VNĐ')
      .map((t) => ({ t, v: this.calc().nguyenTe[t] ?? 0 })),
  );
  protected readonly tongDot = computed(() => this.f().dotTT.reduce((s, d) => s + (d.soTien || 0), 0));
  protected readonly doiPTDuoc = computed(() => this.calc().slNhap === 0 && !this.f().dotTT.some((d) => d.phieuChiId));
  protected readonly phieuNhap = computed(() =>
    this.store
      .phieuKho()
      .filter((p) => p.loai === 'Nhập' && p.hdId === this.id())
      .sort((a, b) => b.ngay.localeCompare(a.ngay)),
  );

  protected readonly danOpen = signal(false);
  // ── Đề nghị cấp vật tư → dòng HĐ mua ──
  protected readonly dnOpen = signal(false);
  protected readonly dnChon = signal<string[]>([]);
  /** Dòng đề nghị còn phải mua (trừ SL đã lên các HĐ mua khác và dòng đang có trên HĐ này). */
  protected readonly dnCho = computed(() => {
    const db = this.store.db();
    const dangCo = new Map<string, number>();
    const luu = this.saved();
    for (const d of this.f().chiTiet) if (d.dnvtDong) dangCo.set(d.dnvtDong, (dangCo.get(d.dnvtDong) ?? 0) + d.soLuong);
    const out: { key: string; dnId: string; soPhieu: string; hdbId: string; soHDB: string; dongId: string; loaiHang: string; tenHang: string; soLuong: number; daMua: number; con: number }[] = [];
    for (const dn of this.store.deNghiVatTu()) {
      if (dn.lyDoHuy) continue;
      const tt = dnvtTinhTrang(db, dn);
      for (const x of dn.dong) {
        // SL đã mua ở HĐ khác = tổng đã mua − phần đã lưu trên chính HĐ này; cộng phần đang có trên bản nháp.
        const daLuuDay = luu ? luu.chiTiet.filter((d) => d.dnvtDong === x.id).reduce((s, d) => s + d.soLuong, 0) : 0;
        const daMua = (tt.daMua.get(x.id) ?? 0) - daLuuDay + (dangCo.get(x.id) ?? 0);
        const con = x.soLuong - daMua;
        if (con <= 0) continue;
        out.push({ key: `${dn.id}|${x.id}`, dnId: dn.id, soPhieu: dn.soPhieu, hdbId: dn.hdbId, soHDB: this.store.hdbById(dn.hdbId)?.soHD || '(báo giá)', dongId: x.id, loaiHang: x.loaiHang, tenHang: x.tenHang, soLuong: x.soLuong, daMua, con });
      }
    }
    return out;
  });
  protected soDN(id: string): string {
    return this.store.deNghiVatTu().find((x) => x.id === id)?.soPhieu ?? id;
  }
  protected moDN(): void {
    this.dnChon.set([]);
    this.dnOpen.set(true);
  }
  protected latDN(k: string): void {
    this.dnChon.update((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));
  }
  protected themTuDN(keys = this.dnChon()): void {
    const rows = this.dnCho().filter((r) => keys.includes(r.key));
    if (!rows.length) return;
    const lots = this.store.loKho();
    const dong: DongHangMua[] = rows.map((r) => {
      const l = this.store.loaiHangById(r.loaiHang);
      const gia = [...lots].reverse().find((x) => x.loaiHang === r.loaiHang)?.donGia ?? 0;
      return { id: uid('DM'), loaiHang: r.loaiHang, tenHang: r.tenHang || l?.ten || r.loaiHang, thongSo: '', soLuong: r.con, dvt: l?.dvt ?? '', donGia: gia, loaiTien: 'VNĐ', tyGia: 1, dnvtId: r.dnId, dnvtDong: r.dongId, hdbId: r.hdbId };
    });
    const hdbs = new Set(rows.map((r) => r.hdbId));
    this.f.update((m) => ({ ...m, chiTiet: [...m.chiTiet, ...dong], hdbId: m.hdbId || (hdbs.size === 1 ? [...hdbs][0] : undefined) }));
    this.dnOpen.set(false);
    this.store.say(`Đã thêm ${dong.length} dòng từ đề nghị — nhập đơn giá NCC (đang gợi ý theo lô nhập gần nhất)`);
  }
  protected readonly danText = signal('');
  protected readonly nhap = signal<NhapForm | null>(null);
  protected readonly tra = signal<TraForm | null>(null);

  private blank(): HopDongMua {
    const m = this.store.newHdm();
    const hdb = this.route.snapshot.queryParamMap.get('hdb');
    if (hdb && this.store.hdbById(hdb)) m.hdbId = hdb;
    // Tạo từ đề nghị cấp vật tư (?dnvt=<id>): lấy sẵn các dòng còn phải mua của đề nghị đó.
    const dnvt = this.route.snapshot.queryParamMap.get('dnvt');
    const dn = dnvt ? this.store.deNghiVatTu().find((x) => x.id === dnvt && !x.lyDoHuy) : undefined;
    if (dn) {
      const tt = dnvtTinhTrang(this.store.db(), dn);
      const lots = this.store.loKho();
      m.hdbId = dn.hdbId;
      m.chiTiet = dn.dong
        .map((x) => ({ x, con: x.soLuong - (tt.daMua.get(x.id) ?? 0) }))
        .filter((r) => r.con > 0)
        .map(({ x, con }) => {
          const l = this.store.loaiHangById(x.loaiHang);
          const gia = [...lots].reverse().find((y) => y.loaiHang === x.loaiHang)?.donGia ?? 0;
          return { id: uid('DM'), loaiHang: x.loaiHang, tenHang: x.tenHang || l?.ten || x.loaiHang, thongSo: '', soLuong: con, dvt: l?.dvt ?? '', donGia: gia, loaiTien: 'VNĐ' as LoaiTien, tyGia: 1, dnvtId: dn.id, dnvtDong: x.id, hdbId: dn.hdbId };
        });
    }
    // Tạo từ HĐ Phú Tài (?pt=<id>): bật sẵn cờ "Thuộc Phú Tài".
    if (this.ptVe()) m.thuocPhuTai = true;
    return m;
  }

  /** HĐ Phú Tài đang dùng HĐ mua này làm giá đầu vào (liên kết ngược). */
  protected readonly ptDung = computed(() => {
    const id = this.saved()?.id;
    return id ? this.store.hopDongPhuTai().find((p) => p.hdMua.includes(id)) : undefined;
  });
  /** HĐ Phú Tài mở màn này để tạo HĐ mua (?pt=). */
  protected readonly ptVe = computed(() => this.store.ptById(this.route.snapshot.queryParamMap.get('pt') ?? undefined));
  protected readonly choTatToan = computed(() => [TT.DA_KY, TT.DANG_NHAN_HANG, TT.DA_NHAN_DU].includes(this.trangThai() as never));
  /** Bước kế tiếp bấm tay: Nháp → Đã ký; đã ký trở đi → Đã tất toán ("Đang nhận hàng" / "Đã nhận đủ" tự chuyển theo phiếu nhập). */
  protected readonly keTiep = computed<TrangThaiHDM | null>(() => (this.trangThai() === TT.NHAP ? TT.DA_KY : this.choTatToan() ? TT.DA_TAT_TOAN : null));
  /** Điều kiện còn thiếu cho bước kế tiếp — cùng điều kiện Store kiểm khi chuyển. */
  protected readonly thieuKeTiep = computed(() => {
    if (this.keTiep() !== TT.DA_KY) return this.thieuTatToan();
    const s = this.saved();
    if (!s) return [];
    const out: string[] = [];
    if (!s.soHD.trim()) out.push('Chưa có Số HĐ');
    if (!s.maNCC) out.push('Chưa chọn NCC');
    if (!s.ngayKy) out.push('Chưa có Ngày ký');
    if (!s.chiTiet.length && hdmCalc(s, this.store.db()).tong <= 0) out.push('Chưa có dòng hàng / tổng giá trị');
    return out;
  });
  /** Điều kiện còn thiếu để tất toán — hiện trước khi bấm (như HĐ bán). */
  protected readonly thieuTatToan = computed(() => {
    const s = this.saved();
    if (!s) return [];
    const c = hdmCalc(s, this.store.db());
    const out: string[] = [];
    if (!s.thuocPhuTai && c.slMua > 0 && s.trangThai !== TT.DA_NHAN_DU && c.slNhap < c.slMua) out.push(`Chưa nhận đủ hàng (${c.slNhap} / ${c.slMua})`);
    if (c.conPhaiTra > 0) out.push(`Còn phải trả NCC ${vnd(c.conPhaiTra)}`);
    if (s.xuatHoaDon !== 'Đã') out.push('NCC chưa xuất hoá đơn');
    const thieu = hoSoThieu(this.store.db(), 'HDM', s.id);
    if (thieu.length) out.push(`Thiếu hồ sơ: ${thieu.join(', ')}`);
    return out;
  });
  protected readonly xemPhieu = computed(() => this.store.canView('soQuy') && this.store.level('soQuy') !== 'draft');
  protected readonly linkPK = linkPhieuKho;
  private readonly unsaved = inject(Unsaved);

  constructor() {
    // Đợt TT NCC: % → số tiền theo tổng HĐ, hạn theo mốc tiến độ (Ngày ký / checklist) — tính lại mỗi khi HĐ đổi.
    effect(() => {
      const m = this.f();
      const n = apDungTuDongHdm(m);
      if (JSON.stringify(n.dotTT) !== JSON.stringify(m.dotTT)) untracked(() => this.f.set(n));
    });
    canhBaoChuaLuu(() => {
      if (this.isNew()) {
        const m = this.f();
        return this.edit() && (!!(m.soHD || m.maNCC || m.ghiChu || m.ngayKy || m.chiTiet.length || m.dotTT.length) || this.fileCho().length > 0 || this.tongHS() > 0);
      }
      return this.canSave() && this.dirty();
    });
  }

  // ── Sửa nháp ─────────────────────────────────────────────────────────
  protected set<K extends keyof HopDongMua>(k: K, v: HopDongMua[K]): void {
    this.f.update((m) => ({ ...m, [k]: v }));
  }
  protected chonNCC(id: string): void {
    const n = this.store.nccById(id);
    this.f.update((m) => ({ ...m, maNCC: id, tenNCC: n?.ten ?? '', diaChi: n?.diaChi ?? '', mst: n?.mst ?? '' }));
  }
  protected setDong(i: number, p: Partial<DongHangMua>): void {
    this.f.update((m) => ({ ...m, chiTiet: m.chiTiet.map((d, j) => (j === i ? { ...d, ...p } : d)) }));
  }
  protected chonLoai(i: number, id: string): void {
    const l = this.store.loaiHangById(id);
    const d = this.f().chiTiet[i];
    const tenCu = this.store.loaiHangById(d.loaiHang)?.ten;
    this.setDong(i, {
      loaiHang: id,
      tenHang: !d.tenHang.trim() || d.tenHang === tenCu ? (l?.ten ?? '') : d.tenHang,
      dvt: l?.dvt ?? d.dvt,
    });
  }
  protected chonTien(i: number, t: LoaiTien): void {
    const d = this.f().chiTiet[i];
    this.setDong(i, { loaiTien: t, tyGia: t === 'VNĐ' ? 1 : d.loaiTien === 'VNĐ' ? 0 : d.tyGia });
  }
  protected themDong(): void {
    const d: DongHangMua = { id: uid('DM'), loaiHang: '', tenHang: '', thongSo: '', soLuong: 1, dvt: '', donGia: 0, loaiTien: 'VNĐ', tyGia: 1 };
    this.f.update((m) => ({ ...m, chiTiet: [...m.chiTiet, d] }));
  }
  protected xoaDong(i: number): void {
    const d = this.f().chiTiet[i];
    if (this.daNhap(d.id) > 0) {
      this.store.say('Dòng đã có phiếu nhập — không xoá được');
      return;
    }
    this.f.update((m) => ({ ...m, chiTiet: m.chiTiet.filter((_, j) => j !== i) }));
    this.chon.update((a) => a.filter((x) => x !== d.id));
  }
  protected dan(): void {
    const kq = parseDanExcel(this.danText(), this.store.loaiHang());
    if (!kq.dong.length) return this.store.say('Không đọc được dòng nào — kiểm tra các cột cách nhau bằng Tab');
    this.themDongNhap(kq.dong, kq.boQua);
    this.danText.set('');
  }
  protected readonly cotDong = COT_DONG_HANG;
  protected readonly dangDoc = signal(false);
  /** File mẫu .xlsx: sheet "Hàng hoá" (tiêu đề + 2 dòng ví dụ) và sheet "Hướng dẫn". */
  protected taiMau(): void {
    void xuatXlsx('mau-dong-hang-hd-mua.xlsx', [
      {
        ten: 'Hàng hoá',
        tieuDe: true,
        rong: [36, 24, 8, 14, 11, 10],
        dong: [COT_DONG_HANG, ['Bình khí chuẩn NO2 1000ppm', '10L · 150bar', 2, 6500000, 'VNĐ', ''], ['Van điều áp CGA', 'Inox 316', 1, 120, 'USD', 25400]],
      },
      {
        ten: 'Hướng dẫn',
        tieuDe: true,
        rong: [16, 90],
        dong: [
          ['Cột', 'Cách điền'],
          ['Tên hàng', 'Bắt buộc. Loại hàng tự đoán theo tên (khớp danh mục Loại hàng) — chọn lại trên màn hình nếu đoán sai.'],
          ['Thông số', 'Tuỳ chọn, VD "40L · 150bar".'],
          ['SL', 'Bắt buộc, số > 0. Dòng SL trống / không phải số sẽ bỏ qua.'],
          ['Đơn giá', 'Theo Loại tiền của dòng. Nhận 1.234.567 hoặc 1,234,567 hoặc 1234567.'],
          ['Loại tiền', 'VNĐ (mặc định), USD hoặc RMB.'],
          ['Tỷ giá', 'Bắt buộc khi Loại tiền khác VNĐ. VNĐ để trống.'],
          ['Lưu ý', 'Xoá 2 dòng ví dụ ở sheet "Hàng hoá" trước khi điền. Giữ nguyên dòng tiêu đề.'],
        ],
      },
    ]);
  }
  protected async taiFile(e: Event): Promise<void> {
    const el = e.target as HTMLInputElement;
    const file = el.files?.[0];
    el.value = '';
    if (!file) return;
    this.dangDoc.set(true);
    try {
      const kq = parseDongHang(await docBang(file), this.store.loaiHang());
      if (!kq.dong.length) return this.store.say(`Không đọc được dòng hàng nào trong "${file.name}" — kiểm tra thứ tự cột theo file mẫu`);
      this.themDongNhap(kq.dong, kq.boQua, file.name);
    } catch (err) {
      this.store.say(err instanceof Error ? err.message : 'Không đọc được tệp');
    } finally {
      this.dangDoc.set(false);
    }
  }
  /** Thêm các dòng đọc được (dán / file) vào cuối danh sách hàng và đóng popup. */
  private themDongNhap(dong: DongHangMua[], boQua: number, nguon = ''): void {
    this.f.update((m) => ({ ...m, chiTiet: [...m.chiTiet, ...dong] }));
    const thieu = dong.filter((d) => !d.loaiHang).length;
    this.store.say(`Đã thêm ${dong.length} dòng${nguon ? ` từ "${nguon}"` : ''}${boQua ? `, bỏ qua ${boQua} dòng` : ''}${thieu ? ` — ${thieu} dòng cần chọn Loại hàng` : ''}`);
    this.danOpen.set(false);
  }
  protected setNhapTay(on: boolean): void {
    this.f.update((m) => ({ ...m, nhapTay: on, tongNhapTay: on ? (m.tongNhapTay ?? this.calc().tongDong) : m.tongNhapTay }));
  }
  protected setDot(i: number, p: Partial<DotTTMua>): void {
    this.f.update((m) => ({ ...m, dotTT: m.dotTT.map((d, j) => (j === i ? { ...d, ...p } : d)) }));
  }
  /** Nhập % → Số tiền = % × Tổng giá trị HĐ (tự tính lại khi tổng đổi). Xoá trống % = nhập số tiền tay. */
  protected setTyLe(i: number, raw: string): void {
    if (raw === '') return this.setDot(i, { tyLe: undefined });
    const tyLe = Math.min(100, Math.max(0, Number(raw) || 0));
    this.setDot(i, { tyLe, soTien: Math.round((tyLe / 100) * this.calc().tong) });
  }
  protected setSoTien(i: number, soTien: number): void {
    const tong = this.calc().tong;
    this.setDot(i, { soTien, tyLe: tong > 0 ? Math.round((soTien / tong) * 1000) / 10 : undefined });
  }
  protected soNgay(raw: string): number {
    return Math.max(0, Math.round(Number(raw) || 0));
  }
  /** Chọn mốc tiến độ → Hạn = ngày mốc + N ngày; "Ngày cụ thể" = nhập tay. */
  protected setMoc(i: number, moc: string): void {
    const d = this.f().dotTT[i];
    this.setDot(i, moc ? { hanMoc: moc, hanNgay: d.hanNgay ?? 0 } : { hanMoc: undefined, hanNgay: undefined });
  }
  protected themDot(): void {
    const m = this.f();
    if (m.dotTT.length >= this.soDotToiDa()) return;
    const tong = this.calc().tong;
    const conLai = Math.max(0, tong - this.tongDot());
    const tyLe = tong > 0 ? Math.round((conLai / tong) * 1000) / 10 : undefined;
    this.f.update((x) => ({ ...x, dotTT: [...x.dotTT, { dot: x.dotTT.length + 1, tyLe, soTien: conLai, hanMoc: 'Ngày ký', hanNgay: 30 }] }));
  }
  protected xoaDot(): void {
    this.f.update((m) => ({ ...m, dotTT: m.dotTT.slice(0, -1) }));
  }
  protected tichCL(i: number, xong: boolean): void {
    this.f.update((m) => ({
      ...m,
      checklist: m.checklist.map((x, j) => (j === i ? { ...x, xong, ngay: xong ? (x.ngay ?? todayIso()) : undefined } : x)),
    }));
  }
  protected setCL(i: number, ngay: string | undefined): void {
    this.f.update((m) => ({ ...m, checklist: m.checklist.map((x, j) => (j === i ? { ...x, ngay } : x)) }));
  }
  protected boThayDoi(): void {
    const s = this.saved();
    if (s) this.f.set(structuredClone(s));
  }

  // ── Tra cứu dòng ─────────────────────────────────────────────────────
  protected thanhTien = (d: DongHangMua) => thanhTienVND(d);
  protected daNhap(id: string): number {
    return slDaNhap(id, this.store.db());
  }
  protected luuRoi(id: string): boolean {
    return !!this.saved()?.chiTiet.some((d) => d.id === id);
  }
  protected dongById(id: string): DongHangMua | undefined {
    return this.saved()?.chiTiet.find((d) => d.id === id);
  }
  protected thuocTinh(lh: string): string {
    return this.store.loaiHangById(lh)?.thuocTinh.join(' · ') ?? '';
  }
  protected flowIdx(s: TrangThaiHDM): number {
    return FLOW.indexOf(s);
  }
  protected flipChon(id: string): void {
    this.chon.update((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }
  protected daTraDot(d: DotTTMua): number {
    return dotMuaDaTra(this.f(), d, this.store.db());
  }
  protected quaHan(d: DotTTMua): boolean {
    return dotQuaHan(d, this.daTraDot(d));
  }

  // ── Lưu & thao tác ───────────────────────────────────────────────────
  protected setTab(t: Tab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected save(silent = false): boolean {
    // Ô bắt buộc nằm ở Tab 1 — bấm Lưu ở tab khác mà thiếu thì quay về Tab 1 và báo ngay dưới ô.
    const m0 = this.f();
    if (this.tab() !== '1' && (!m0.soHD.trim() || !m0.maNCC)) {
      this.setTab('1');
      setTimeout(() => this.kt.hopLe());
      this.store.say('Còn thiếu thông tin bắt buộc ở Tab 1. Thông tin chung');
      return false;
    }
    if (!this.kt.hopLe()) return false;
    const m = structuredClone(this.f());
    const err = this.store.saveHdm(m);
    if (err) {
      this.store.say(err);
      return false;
    }
    if (!silent) this.store.say('Đã lưu HĐ mua');
    if (this.isNew()) {
      void taiFileCho(this.store, 'HDM', m.id, this.fileCho());
      this.fileCho.set([]);
      const cho = this.choHS();
      this.choHS.set({});
      void taiHoSoCho(this.store, 'HDM', m.id, cho).then((n) => n && this.store.say(`Đã tạo HĐ mua và lưu ${n} tệp hồ sơ`));
      this.buoc.set(0);
      void this.unsaved.diSauKhiLuu(() =>
        this.router.navigate(['/hop-dong-mua', m.id], { queryParams: { hdb: null, tab: '1' }, queryParamsHandling: 'merge', replaceUrl: true }),
      );
    }
    return true;
  }

  /** Sang bước sau khi bước hiện tại hợp lệ (ô bắt buộc + quy tắc dòng hàng như Store.saveHdm). */
  protected tiep(): void {
    if (!this.kt.hopLe()) return;
    const m = this.f();
    if (this.tabXem() === '1' && this.store.hopDongMua().some((x) => fold(x.soHD) === fold(m.soHD))) {
      return this.store.say(`Số HĐ mua ${m.soHD} đã tồn tại`);
    }
    if (this.tabXem() === '3') {
      for (const [i, d] of m.chiTiet.entries()) {
        if (!d.loaiHang) return this.store.say(`Dòng ${i + 1}: chưa chọn Loại hàng`);
        if (!(d.soLuong > 0)) return this.store.say(`Dòng ${i + 1}: Số lượng phải > 0`);
        if (d.loaiTien !== 'VNĐ' && !(d.tyGia > 0)) return this.store.say(`Dòng ${i + 1}: ngoại tệ cần Tỷ giá`);
      }
    }
    this.den(this.buoc() + 1);
  }

  /** Quay lại bước đã qua (hoặc sang bước kế từ nút Tiếp). */
  protected den(i: number): void {
    if (i < 0 || i >= this.buocs.length || i > this.buoc() + 1) return;
    this.kt.xoa();
    this.buoc.set(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Thao tác ghi trực tiếp vào Store cần bản đã lưu: lưu nháp trước nếu có thay đổi. */
  private daLuu(): boolean {
    if (this.isNew()) {
      this.store.say('Lưu HĐ trước');
      return false;
    }
    if (this.dirty()) {
      if (!this.canSave()) {
        this.boThayDoi();
        return true;
      }
      return this.save(true);
    }
    return true;
  }

  protected async chuyen(toi: TrangThaiHDM): Promise<void> {
    const s = this.saved();
    if (!s) return;
    if (toi === TT.DA_TAT_TOAN) {
      const thieu = hoSoThieu(this.store.db(), 'HDM', s.id);
      if (thieu.length) {
        this.store.say(`Thiếu hồ sơ bắt buộc: ${thieu.join(', ')}`);
        return;
      }
    }
    const msg: Record<string, string> = {
      [TT.DA_KY]: 'Cần Số HĐ, NCC, Ngày ký và ít nhất 1 dòng hàng hoặc tổng giá trị.',
      [TT.DA_TAT_TOAN]: 'Sau khi tất toán, HĐ bị khoá sửa.',
      [TT.HUY]: 'Chỉ huỷ được khi chưa có phiếu nhập và chưa trả tiền. HĐ huỷ bị khoá sửa.',
    };
    const ok = await this.confirm.ask({
      title: toi === TT.HUY ? `Huỷ HĐ mua ${s.soHD}?` : `Chuyển HĐ ${s.soHD} sang “${ttNhan(toi)}”?`,
      message: (this.dirty() ? 'Các thay đổi chưa lưu sẽ được lưu trước. ' : '') + (msg[toi] ?? ''),
      ok: toi === TT.HUY ? 'Huỷ HĐ' : 'Chuyển',
    });
    if (!ok || !this.daLuu()) return;
    const err = this.store.chuyenTrangThaiHdm(s.id, toi);
    this.store.say(err ?? `Đã chuyển “${ttNhan(toi)}”`);
  }

  protected async moLai(): Promise<void> {
    const s = this.saved();
    if (!s) return;
    if (!(await this.confirm.ask({ title: `Mở lại HĐ mua ${s.soHD}?`, message: 'HĐ quay về trạng thái nhận hàng tương ứng và được sửa lại (đợt trả, phiếu chi…).', ok: 'Mở lại' }))) return;
    const e = this.store.moLaiHdm(s.id);
    this.store.say(e ?? 'Đã mở lại HĐ mua');
  }

  protected async xoa(): Promise<void> {
    const s = this.saved();
    if (s) await guiXoa(this.confirm, this.store, 'HopDongMua', s.id, 'HĐ mua ' + s.soHD);
  }

  protected moNhap(ids: string[]): void {
    if (!this.daLuu()) return;
    const sl: Record<string, number> = {};
    const dongIds = ids.filter((id) => {
      const d = this.dongById(id);
      if (!d) return false;
      sl[id] = Math.max(0, d.soLuong - this.daNhap(id));
      return sl[id] > 0;
    });
    if (!dongIds.length) {
      this.store.say('Các dòng chọn đã nhập đủ');
      return;
    }
    const kho = this.store.khoDangDung();
    this.nhap.set({ ngay: todayIso(), kho: (kho.find((k) => k.loai === 'Kho thường') ?? kho[0])?.id ?? '', ghiChu: '', soHoaDon: '', vat: 8, sl, dongIds });
  }

  /** Đơn giá lô khi nhập = đơn giá dòng HĐ mua quy VNĐ. */
  protected donGiaLo(d: DongHangMua): number {
    return Math.round(donGiaVND(d));
  }

  protected setSL(id: string, v: number): void {
    this.nhap.update((n) => (n ? { ...n, sl: { ...n.sl, [id]: v } } : n));
  }

  protected xacNhanNhap(): void {
    if (this.mNhap()?.kt.hopLe() === false) return;
    const n = this.nhap();
    const s = this.saved();
    if (!n || !s) return;
    if (!n.ngay) {
      this.store.say('Chưa chọn Ngày');
      return;
    }
    const err = this.store.nhapKho(s.id, {
      ngay: n.ngay,
      kho: n.kho,
      ghiChu: n.ghiChu.trim() || undefined,
      soHoaDon: n.soHoaDon.trim() || undefined,
      vat: n.vat,
      dong: n.dongIds.map((dongId) => ({ dongId, soLuong: n.sl[dongId] ?? 0 })),
    });
    if (err) {
      this.store.say(err);
      return;
    }
    this.store.say('Đã tạo phiếu nhập kho');
    this.nhap.set(null);
    this.chon.set([]);
  }

  /** F-03: phiếu Chi trả NCC đã duyệt nhưng sai → yêu cầu xoá; duyệt xong đợt trở về chưa trả để ghi lại. */
  protected async xoaPhieuChi(id: string, soPhieu: string, dot: number): Promise<void> {
    await guiXoa(this.confirm, this.store, 'PhieuThuChi', id, `Phiếu Chi ${soPhieu} — đợt ${dot} HĐ mua ${this.saved()?.soHD ?? ''}`);
  }

  protected async huyPhieu(id: string, soPhieu: string): Promise<void> {
    await guiXoa(this.confirm, this.store, 'PhieuKho', id, `Phiếu nhập ${soPhieu} — HĐ mua ${this.saved()?.soHD ?? ''}`);
  }

  protected moTra(d: DotTTMua): void {
    if (!this.daLuu()) return;
    const sd = this.saved()?.dotTT.find((x) => x.dot === d.dot);
    if (!sd) return;
    this.tra.set({
      dot: sd.dot,
      ngayTra: sd.ngayTra ?? todayIso(),
      soTienTra: sd.soTienTra ?? sd.soTien,
      nguonTien: sd.nguonTien ?? '',
    });
  }

  protected async xacNhanTra(): Promise<void> {
    if (this.mTra()?.kt.hopLe() === false) return;
    const t = this.tra();
    const s = this.saved();
    if (!t || !s) return;
    const ok = await this.confirm.ask({
      title: `Ghi nhận trả NCC đợt ${t.dot}: ${vnd(t.soTienTra)}?`,
      message: s.thuocPhuTai
        ? 'HĐ thuộc Phú Tài: chỉ ghi nhận Phú Tài đã trả, không tạo phiếu chi Oxy.'
        : 'Tạo phiếu Chi Chờ duyệt ở Sổ quỹ. Đợt chỉ tính là đã trả khi phiếu được duyệt.',
      ok: 'Ghi nhận',
    });
    if (!ok) return;
    const err = this.store.ghiTraNCC(s.id, t.dot, {
      ngayTra: t.ngayTra,
      soTienTra: t.soTienTra,
      nguonTien: s.thuocPhuTai ? undefined : t.nguonTien,
    });
    if (err) {
      this.store.say(err);
      return;
    }
    this.store.say(s.thuocPhuTai ? 'Đã ghi nhận Phú Tài trả NCC' : `Đã tạo phiếu Chi chờ duyệt — ${vnd(t.soTienTra)}`);
    this.tra.set(null);
  }
}
