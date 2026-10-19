import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '../core/store';
import { dotMuaDaTra, dotQuaHan, hdmCalc, hoSoThieu, slDaNhap, thanhTienVND, tongSL } from '../core/calc';
import { DongHangMua, DotTTMua, HopDongMua, LOAI_TIEN, LoaiTien, TrangThaiHDM } from '../core/models';
import { money, num, pct, todayIso, uid, viDate, vnd } from '../core/util';
import { Kpi, Modal, MoneyInput, Pick, PickOption, TrangThai } from '../shared/ui-kit';
import { HoSoPanel, guiXoa } from '../shared/ho-so';
import { Confirm } from '../shared/confirm';
import { Icon } from '../shared/icon';
import { FileHd, ThongTinHd, XemFileHd, taiFileCho } from '../shared/file-hd';
import { parseDanExcel } from './hdm-util';

type Tab = '1' | '2' | '3' | '4';
const FLOW: TrangThaiHDM[] = ['Nháp', 'Đã ký', 'Đang nhận hàng', 'Đã nhận đủ', 'Đã tất toán'];

interface NhapForm {
  ngay: string;
  kho: string;
  ghiChu: string;
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
  imports: [RouterLink, Kpi, Modal, MoneyInput, Pick, TrangThai, HoSoPanel, Icon, FileHd, XemFileHd],
  template: `
    @if (!isNew() && !saved()) {
      <div class="page-head"><div><div class="crumbs"><a routerLink="/hop-dong-mua">Hợp đồng mua</a></div><h1>Không tìm thấy HĐ mua</h1></div></div>
      <div class="card empty">HĐ không tồn tại hoặc bạn không có quyền xem.</div>
    } @else {
      @let m = f();
      @let c = calc();
      <div class="page-head">
        <div>
          <div class="crumbs"><a routerLink="/hop-dong-mua">Hợp đồng mua</a> › {{ isNew() ? 'Tạo mới' : m.soHD }}</div>
          <h1 class="row">
            {{ isNew() ? 'HĐ mua mới' : 'HĐ mua ' + m.soHD }}
            <app-tt [v]="saved()?.trangThai ?? 'Nháp'" />
            @if (choXoa()) { <app-tt v="Chờ xoá" /> }
            @if (m.thuocPhuTai) { <app-tt v="Thuộc Phú Tài" /> }
            @if (m.import) { <app-tt v="Import" /> }
          </h1>
        </div>
        <div class="actions">
          @if (saved()) {
            <button type="button" class="btn quiet" (click)="xemFile.set(true)"><app-icon name="eye" [size]="16" /> Xem file hợp đồng</button>
          }
          @if (canSave()) {
            @if (dirty() && !isNew()) { <button type="button" class="btn quiet" (click)="boThayDoi()">Bỏ thay đổi</button> }
            <button type="button" class="btn" [disabled]="!dirty() && !isNew()" (click)="save()"><app-icon name="check" [size]="16" /> Lưu</button>
          }
          @if (!isNew() && !choXoa() && store.canEdit('hdm') && store.level('duyetXoa') !== 'none') {
            <button type="button" class="btn danger" (click)="xoa()"><app-icon name="trash" [size]="16" /> Xoá</button>
          }
        </div>
      </div>

      @if (choXoa()) { <div class="note bad">HĐ đang có yêu cầu xoá chờ duyệt — tạm khoá sửa.</div> }
      @else if (locked()) { <div class="note info">HĐ ở trạng thái {{ saved()?.trangThai }} — đã khoá sửa.</div> }
      @if (dirty() && !isNew()) { <div class="note warn">Có thay đổi chưa lưu.</div> }

      <div class="kpis">
        <app-kpi label="Tổng giá trị (VNĐ)" [value]="money(c.tong)" [sub]="m.nhapTay ? 'Nhập tay' : 'Σ thành tiền các dòng'" />
        <app-kpi label="Đã trả NCC" [value]="money(c.daTra)" [sub]="pct(c.pctTra)" tone="ok" />
        <app-kpi label="Còn phải trả" [value]="money(c.conPhaiTra)" [sub]="m.thuocPhuTai ? 'Phú Tài trả — không vào công nợ Oxy' : c.quaHan ? c.quaHan + ' đợt quá hạn' : ''" [tone]="c.quaHan ? 'bad' : c.conPhaiTra > 0 ? 'warn' : ''" />
        <app-kpi label="Nhập hàng" [value]="m.thuocPhuTai ? '—' : pct(c.pctNhap)" [sub]="m.thuocPhuTai ? 'Không nhập kho Oxy' : c.slNhap + ' / ' + c.slMua" />
      </div>

      @if (saved(); as s) {
        <app-xem-file-hd [(open)]="xemFile" [files]="store.hoSoCua('HDM', s.id, 'Hợp đồng')?.files ?? []" [info]="infoFile()" />
      }

      <div class="tabs" role="tablist">
        <button type="button" role="tab" [class.on]="tab() === '1'" (click)="setTab('1')">1. Thông tin chung</button>
        <button type="button" role="tab" [class.on]="tab() === '2'" (click)="setTab('2')">2. Lưu trữ hồ sơ</button>
        <button type="button" role="tab" [class.on]="tab() === '3'" (click)="setTab('3')">3. Chi tiết hàng hoá ({{ m.chiTiet.length }})</button>
        <button type="button" role="tab" [class.on]="tab() === '4'" (click)="setTab('4')">4. Thanh toán NCC</button>
      </div>

      @switch (tab()) {
        @case ('1') {
          <section class="card stack">
            <div class="form-grid">
              <div class="field">
                <label for="soHD">Số HĐ mua <span class="req">*</span></label>
                <input id="soHD" [value]="m.soHD" [disabled]="!edit()" (input)="set('soHD', $any($event.target).value)" />
              </div>
              <div class="field">
                <label for="ncc">Nhà cung cấp <span class="req">*</span></label>
                <app-pick inputId="ncc" [options]="nccOpts()" [value]="m.maNCC" [disabled]="!edit()" (valueChange)="chonNCC($event)" />
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
              <div class="field"><span class="lbl">Tên NCC</span><div class="ro">{{ m.tenNCC || '—' }}</div></div>
              <div class="field"><span class="lbl">MST</span><div class="ro">{{ m.mst || '—' }}</div></div>
              <div class="field wide"><span class="lbl">Địa chỉ</span><div class="ro">{{ m.diaChi || '—' }}</div></div>
              <div class="field wide">
                <label class="check-row">
                  <input type="checkbox" [checked]="m.thuocPhuTai" [disabled]="!edit() || (!m.thuocPhuTai && !doiPTDuoc())" (change)="set('thuocPhuTai', $any($event.target).checked)" />
                  <b>Thuộc Phú Tài</b>
                </label>
                <span class="hint">Bật → HĐ không tính công nợ phải trả, không sinh phiếu nhập kho và phiếu chi của Oxy; chỉ dùng làm giá đầu vào cho HĐ Phú Tài.</span>
                @if (!m.thuocPhuTai && !doiPTDuoc()) { <span class="err">HĐ đã có phiếu nhập kho hoặc phiếu chi — không bật được.</span> }
              </div>
              <div class="field wide">
                <label for="ghiChu">Ghi chú</label>
                <textarea id="ghiChu" rows="2" [value]="m.ghiChu" [disabled]="!edit()" (input)="set('ghiChu', $any($event.target).value)"></textarea>
              </div>
            </div>
          </section>

          <app-file-hd chu="HDM" [chuId]="saved()?.id ?? ''" [edit]="edit()" [info]="infoFile()" [(pending)]="fileCho" />

          <h3 class="section-title">Trạng thái</h3>
          <section class="card stack">
            <div class="flow">
              @for (s of flow; track s; let last = $last) {
                <span class="st" [class.cur]="s === trangThai()" [class.done]="flowIdx(s) < flowIdx(trangThai())">{{ s }}</span>
                @if (!last) { <span class="sep">›</span> }
              }
              @if (trangThai() === 'Huỷ') { <span class="sep">·</span> <app-tt v="Huỷ" /> }
            </div>
            <div class="note info">“Đang nhận hàng” và “Đã nhận đủ” tự chuyển theo phiếu nhập kho (Tab 3). “Đã tất toán” cần Còn phải trả = 0, Xuất hoá đơn = Đã và đủ hồ sơ bắt buộc.</div>
            @if (!isNew() && !locked() && store.canEdit('hdm')) {
              <div class="btn-row">
                @if (trangThai() === 'Nháp') { <button type="button" class="btn" (click)="chuyen('Đã ký')">Chuyển “Đã ký”</button> }
                @if (trangThai() === 'Đã ký' || trangThai() === 'Đang nhận hàng' || trangThai() === 'Đã nhận đủ') {
                  <button type="button" class="btn ok" (click)="chuyen('Đã tất toán')">Chuyển “Đã tất toán”</button>
                }
                <button type="button" class="btn danger" (click)="chuyen('Huỷ')">Huỷ HĐ</button>
              </div>
            }
          </section>
        }

        @case ('2') {
          @if (saved(); as s) {
            <app-ho-so chu="HDM" [chuId]="s.id" [soHD]="s.soHD" [edit]="edit()" [giaTri]="c.tong" [ghiChuThieu]="m.ghiChuHoSoThieu ?? ''" (ghiChuThieuChange)="set('ghiChuHoSoThieu', $event)" />
          } @else {
            <div class="card empty">Lưu HĐ trước khi tải hồ sơ.</div>
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
                <button type="button" class="btn quiet" (click)="danOpen.set(true)"><app-icon name="import" [size]="16" /> Dán từ Excel</button>
                <button type="button" class="btn quiet" (click)="themDong()"><app-icon name="plus" [size]="16" /> Thêm dòng</button>
              }
            </div>
          </div>
          @if (!m.thuocPhuTai && store.canEdit('hdmNhapKho') && !isNew() && !nhapDuoc() && trangThai() === 'Nháp') {
            <div class="note info">Chuyển HĐ sang “Đã ký” để nhập kho.</div>
          }
          <div class="tbl-wrap">
            <table class="tbl freeze compact">
              <thead>
                <tr>
                  @if (nhapDuoc()) { <th></th> }
                  <th class="w-lg">Loại hàng</th><th class="w-lg">Tên hàng</th><th class="w-md">Thông số</th><th class="w-sm num">SL</th><th class="w-sm">ĐVT</th>
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
                    <td><input [value]="d.tenHang" [disabled]="!edit()" (input)="setDong(i, { tenHang: $any($event.target).value })" aria-label="Tên hàng" /></td>
                    <td><input [value]="d.thongSo" [disabled]="!edit() || da > 0" [placeholder]="thuocTinh(d.loaiHang)" (input)="setDong(i, { thongSo: $any($event.target).value })" aria-label="Thông số" /></td>
                    <td><input type="number" min="0" class="num" [value]="d.soLuong" [disabled]="!edit()" (input)="setDong(i, { soLuong: +$any($event.target).value || 0 })" aria-label="Số lượng" /></td>
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
                    <tr>
                      <td><b>{{ p.soPhieu }}</b></td><td>{{ viDate(p.ngay) }}</td><td>{{ store.khoTen(p.kho) }}</td><td class="num">{{ num(tongSL(p)) }}</td>
                      <td>{{ store.userName(p.nguoiThucHien) }}</td>
                      <td><app-tt [v]="p.trangThai" /> @if (store.dangChoXoa('PhieuKho', p.id)) { <app-tt v="Chờ xoá" /> }</td>
                      <td>
                        @if (p.trangThai === 'Hiệu lực' && !store.dangChoXoa('PhieuKho', p.id) && store.canEdit('hdmNhapKho') && store.level('duyetXoa') !== 'none') {
                          <button type="button" class="btn sm danger" (click)="huyPhieu(p.id, p.soPhieu)">Bỏ nhập</button>
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
          @if (m.thuocPhuTai) { <div class="note info">Phú Tài trả, không tạo phiếu chi Oxy. Đợt tính đã trả theo Số tiền trả ghi nhận.</div> }
          <div class="tbl-wrap">
            <table class="tbl compact">
              <thead>
                <tr>
                  <th>Đợt</th><th class="w-md num">Số tiền</th><th class="w-md">Hạn trả</th><th>Ngày trả</th><th class="num">Số tiền trả</th>
                  @if (!m.thuocPhuTai) { <th>Nguồn tiền</th><th>Phiếu chi</th> }
                  <th class="num">Đã trả (tính)</th><th class="w-md">Ghi chú</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (d of m.dotTT; track d.dot; let i = $index) {
                  @let daTra = daTraDot(d);
                  @let phieu = store.phieuById(d.phieuChiId);
                  <tr [class.overdue]="quaHan(d)">
                    <td>Đợt {{ d.dot }} @if (quaHan(d)) { <app-tt v="Quá hạn" /> }</td>
                    <td><app-money [value]="d.soTien" [disabled]="!edit4()" (valueChange)="setDot(i, { soTien: $event })" /></td>
                    <td><input type="date" [value]="d.han ?? ''" [disabled]="!edit4()" (input)="setDot(i, { han: $any($event.target).value || undefined })" aria-label="Hạn trả" /></td>
                    <td>{{ viDate(d.ngayTra) }}</td>
                    <td class="num">{{ d.soTienTra ? money(d.soTienTra) : '—' }}</td>
                    @if (!m.thuocPhuTai) {
                      <td>{{ d.nguonTien ? store.nguonTen(d.nguonTien) : '—' }}</td>
                      <td>@if (phieu) { {{ phieu.soPhieu }} <app-tt [v]="phieu.trangThai" /> } @else { <span class="muted">—</span> }</td>
                    }
                    <td class="num">{{ money(daTra) }}</td>
                    <td><input [value]="d.ghiChu ?? ''" [disabled]="!edit4()" (input)="setDot(i, { ghiChu: $any($event.target).value })" aria-label="Ghi chú đợt" /></td>
                    <td>
                      @if (edit4() && !isNew() && phieu?.trangThai !== 'Đã duyệt') {
                        <button type="button" class="btn sm" (click)="moTra(d)">{{ d.ngayTra ? 'Sửa ghi nhận' : 'Ghi nhận đã trả' }}</button>
                      }
                      @if (edit4() && $last && !d.phieuChiId && !d.soTienTra) {
                        <button type="button" class="icon-btn sm" aria-label="Xoá đợt" (click)="xoaDot()"><app-icon name="trash" [size]="16" /></button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="10" class="muted">Chưa có đợt thanh toán (tối đa {{ soDotToiDa() }} đợt)</td></tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <th>Công nợ phải trả</th><td class="num">{{ money(tongDot()) }}</td><td colspan="2" class="muted">Đã trả (đã duyệt): {{ money(c.daTra) }}</td>
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
              </div>
            </div>
            <table class="tbl compact">
              <thead><tr><th>Checklist tiến độ</th><th>Ngày</th></tr></thead>
              <tbody>
                @for (x of m.checklist; track x.ten; let i = $index) {
                  <tr>
                    <td><label class="check-row"><input type="checkbox" [checked]="x.xong" [disabled]="!edit4()" (change)="tichCL(i, $any($event.target).checked)" /> {{ x.ten }}</label></td>
                    <td><input type="date" [value]="x.ngay ?? ''" [disabled]="!edit4() || !x.xong" (input)="setCL(i, $any($event.target).value || undefined)" [attr.aria-label]="'Ngày ' + x.ten" /></td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }
      }

      <app-modal [open]="danOpen()" title="Dán từ Excel" (closed)="danOpen.set(false)">
        <p class="sub">Mỗi dòng một mặt hàng, các cột cách nhau bằng Tab theo thứ tự: <b>Tên hàng · Thông số · SL · Đơn giá · Loại tiền · Tỷ giá</b>. Loại hàng tự đoán theo tên — kiểm tra lại sau khi dán.</p>
        <textarea rows="10" style="width: 100%" [value]="danText()" (input)="danText.set($any($event.target).value)" aria-label="Dữ liệu dán"></textarea>
        <div foot class="btn-row">
          <button type="button" class="btn quiet" (click)="danOpen.set(false)">Thôi</button>
          <button type="button" class="btn" [disabled]="!danText().trim()" (click)="dan()">Thêm dòng</button>
        </div>
      </app-modal>

      <app-modal [open]="!!nhap()" title="Nhập kho" sub="Sinh phiếu Nhập kho tự động từ HĐ mua" (closed)="nhap.set(null)">
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
            <div class="field wide">
              <label for="nkGC">Ghi chú</label>
              <input id="nkGC" [value]="n.ghiChu" (input)="nhap.set({ ...n, ghiChu: $any($event.target).value })" />
            </div>
          </div>
          <div class="tbl-wrap" style="margin-top: 12px">
            <table class="tbl compact">
              <thead><tr><th>Tên hàng</th><th>Thông số</th><th class="num">SL</th><th class="num">Đã nhập</th><th class="num">Còn lại</th><th class="w-md num">SL thực nhập</th></tr></thead>
              <tbody>
                @for (id of n.dongIds; track id) {
                  @let d = dongById(id);
                  @if (d) {
                    @let con = d.soLuong - daNhap(d.id);
                    <tr>
                      <td>{{ d.tenHang }}</td><td>{{ d.thongSo }}</td><td class="num">{{ num(d.soLuong) }}</td><td class="num">{{ num(daNhap(d.id)) }}</td><td class="num">{{ num(con) }}</td>
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
          <button type="button" class="btn quiet" (click)="nhap.set(null)">Thôi</button>
          <button type="button" class="btn" (click)="xacNhanNhap()">Xác nhận nhập kho</button>
        </div>
      </app-modal>

      <app-modal [open]="!!tra()" [title]="'Ghi nhận đã trả — Đợt ' + (tra()?.dot ?? '')" size="sm" (closed)="tra.set(null)">
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
          <button type="button" class="btn quiet" (click)="tra.set(null)">Thôi</button>
          <button type="button" class="btn" (click)="xacNhanTra()">Ghi nhận</button>
        </div>
      </app-modal>
    }
  `,
})
export class HdmDetail {
  protected readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);
  protected readonly money = money;
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
  protected readonly trangThai = computed<TrangThaiHDM>(() => this.saved()?.trangThai ?? 'Nháp');
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

  protected readonly nhapDuoc = computed(() => {
    const s = this.saved();
    return (
      !!s &&
      !s.thuocPhuTai &&
      !this.f().thuocPhuTai &&
      !this.choXoa() &&
      this.store.canEdit('hdmNhapKho') &&
      (s.trangThai === 'Đã ký' || s.trangThai === 'Đang nhận hàng' || s.trangThai === 'Đã nhận đủ')
    );
  });
  protected readonly chon = signal<string[]>([]);

  protected readonly nccOpts = computed<PickOption[]>(() => this.store.ncc().map((n) => ({ value: n.id, label: n.ten, hint: [n.mst, n.quocGia].filter(Boolean).join(' · ') })));
  protected readonly hdbOpts = computed<PickOption[]>(() => this.store.hopDongBan().map((h) => ({ value: h.id, label: h.soHD, hint: h.tenKH })));
  protected readonly lhOpts = computed<PickOption[]>(() =>
    this.store
      .loaiHang()
      .filter((l) => l.dangDung || this.f().chiTiet.some((d) => d.loaiHang === l.id))
      .map((l) => ({ value: l.id, label: l.ten, hint: `${l.nhom} · ${l.dvt}` })),
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
  protected readonly danText = signal('');
  protected readonly nhap = signal<NhapForm | null>(null);
  protected readonly tra = signal<TraForm | null>(null);

  private blank(): HopDongMua {
    const m = this.store.newHdm();
    const hdb = this.route.snapshot.queryParamMap.get('hdb');
    if (hdb && this.store.hdbById(hdb)) m.hdbId = hdb;
    return m;
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
    const { dong, boQua } = parseDanExcel(this.danText(), this.store.loaiHang());
    if (!dong.length) {
      this.store.say('Không đọc được dòng nào — kiểm tra các cột cách nhau bằng Tab');
      return;
    }
    this.f.update((m) => ({ ...m, chiTiet: [...m.chiTiet, ...dong] }));
    const thieu = dong.filter((d) => !d.loaiHang).length;
    this.store.say(`Đã thêm ${dong.length} dòng${boQua ? `, bỏ qua ${boQua} dòng` : ''}${thieu ? ` — ${thieu} dòng cần chọn Loại hàng` : ''}`);
    this.danText.set('');
    this.danOpen.set(false);
  }
  protected setNhapTay(on: boolean): void {
    this.f.update((m) => ({ ...m, nhapTay: on, tongNhapTay: on ? (m.tongNhapTay ?? this.calc().tongDong) : m.tongNhapTay }));
  }
  protected setDot(i: number, p: Partial<DotTTMua>): void {
    this.f.update((m) => ({ ...m, dotTT: m.dotTT.map((d, j) => (j === i ? { ...d, ...p } : d)) }));
  }
  protected themDot(): void {
    const m = this.f();
    if (m.dotTT.length >= this.soDotToiDa()) return;
    const conLai = Math.max(0, this.calc().tong - this.tongDot());
    this.f.update((x) => ({ ...x, dotTT: [...x.dotTT, { dot: x.dotTT.length + 1, soTien: conLai }] }));
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
      void this.router.navigate(['/hop-dong-mua', m.id], { queryParams: { hdb: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
    return true;
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
    if (toi === 'Đã tất toán') {
      const thieu = hoSoThieu(this.store.db(), 'HDM', s.id);
      if (thieu.length) {
        this.store.say(`Thiếu hồ sơ bắt buộc: ${thieu.join(', ')}`);
        return;
      }
    }
    const msg: Record<string, string> = {
      'Đã ký': 'Cần Số HĐ, NCC, Ngày ký và ít nhất 1 dòng hàng hoặc tổng giá trị.',
      'Đã tất toán': 'Sau khi tất toán, HĐ bị khoá sửa.',
      Huỷ: 'Chỉ huỷ được khi chưa có phiếu nhập và chưa trả tiền. HĐ huỷ bị khoá sửa.',
    };
    const ok = await this.confirm.ask({
      title: toi === 'Huỷ' ? `Huỷ HĐ mua ${s.soHD}?` : `Chuyển HĐ ${s.soHD} sang “${toi}”?`,
      message: (this.dirty() ? 'Các thay đổi chưa lưu sẽ được lưu trước. ' : '') + (msg[toi] ?? ''),
      ok: toi === 'Huỷ' ? 'Huỷ HĐ' : 'Chuyển',
    });
    if (!ok || !this.daLuu()) return;
    const err = this.store.chuyenTrangThaiHdm(s.id, toi);
    this.store.say(err ?? `Đã chuyển “${toi}”`);
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
    this.nhap.set({ ngay: todayIso(), kho: (kho.find((k) => k.loai === 'Kho thường') ?? kho[0])?.id ?? '', ghiChu: '', sl, dongIds });
  }

  protected setSL(id: string, v: number): void {
    this.nhap.update((n) => (n ? { ...n, sl: { ...n.sl, [id]: v } } : n));
  }

  protected xacNhanNhap(): void {
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
