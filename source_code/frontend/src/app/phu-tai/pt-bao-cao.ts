import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { money, vndShort, viDate } from '../core/util';
import { chuVietTat, mauAvatar } from '../shared/avatar';
import { ptTai, qs } from './pt-api';
import { PT_STYLES } from './pt-ui';

interface Opt {
  v: string;
  t: string;
}
interface HdLn {
  id: string;
  soHD: string;
  tenKH: string;
  giaBan: number;
  giaDauVao: number;
  lnTruoc: number;
  oxyGop: number;
  cp: number;
  lnThuc: number;
  bien: number;
}
interface Tuoi {
  nhan: string;
  v: number;
}
interface Bc {
  capNhat: string;
  hieuQua: { soHd: number; giaBan: number; oxyGop: number; lnThuc: number; bienLnThuc: number; coCau: { ten: string; v: number }[]; thangs: { t: number; giaBan: number; lnThuc: number }[]; bien: { ten: string; pct: number }[] };
  loiNhuan: HdLn[];
  tongLn: HdLn;
  phaiThu: {
    tong: number; soKhach: number; quaHan: number; pctQuaHan: number; soKhachQuaHan: number; tuoi: Tuoi[];
    rows: { hdbId: string; soHD: string; ngayKy: string; tenKH: string; mst: string; sauVAT: number; daThu: number; con: number; hanTT: string | null; quaHanNgay: number; conNgay: number; sale: string }[];
  };
  phaiTra: {
    tong: number; soNcc: number; quaHan: number; soNccQuaHan: number; soNgayQuaHanMax: number; tuoi: Tuoi[];
    rows: { hdmId: string; soHD: string; ngayKy: string; tenNCC: string; mst: string; tong: number; daTra: number; con: number; hanTT: string | null; quaHanNgay: number; conNgay: number; ghiChu: string }[];
  };
  vanHanh: {
    vanChuyen: number; soVanChuyen: number; kiemDinh: number; soKiemDinh: number; quanLy: number; tong: number; pctGiaBan: number; p1: number; p2: number;
    canhBao: { muc: string; nhom: string; tieuDe: string; moTa: string; doiTuong: string; soTien: number; deXuat: string; theoDoi: string }[];
  };
  khachHang: Opt[];
}

const R = 36;
const CHU_VI = 2 * Math.PI * R;
const MAU_CC = ['#b9c9bd', '#e0a31c', '#b8552e', '#0f5a2a'];
const NAV = [
  { id: 'hieu-qua', t: '1. Hiệu quả' },
  { id: 'loi-nhuan', t: '2. Lợi nhuận' },
  { id: 'phai-thu', t: '3. Công nợ phải thu' },
  { id: 'phai-tra', t: '4. Công nợ NCC' },
  { id: 'van-hanh', t: '5. Vận hành & cảnh báo' },
];

function tranDep(v: number): number {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / e;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e;
}

/** Tab 5 · Báo cáo Phú Tài (hiệu quả, lợi nhuận, công nợ phải thu / NCC, vận hành & cảnh báo) — số liệu do backend tính (GET /phu-tai/bao-cao). */
@Component({
  selector: 'app-pt-bao-cao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="banner"><span class="tg">PT</span><span>Tổng hợp từ 4 tab trước — số riêng của Phú Tài, không cộng vào doanh thu, công nợ hay tiền khả dụng của OXY.</span></div>

    <div class="loc">
      <select aria-label="Năm" (change)="nam.set($any($event.target).value)">
        @for (y of nams; track y) { <option [value]="y" [selected]="'' + y === nam()">Năm {{ y }}</option> }
      </select>
      <select aria-label="Quý" (change)="chonQuy($any($event.target).value)">
        <option value="" [selected]="!quy()">Quý: Tất cả</option>
        @for (q of [1, 2, 3, 4]; track q) { <option [value]="q" [selected]="quy() === '' + q">Quý {{ q }}</option> }
      </select>
      <select aria-label="Tháng" (change)="chonThang($any($event.target).value)">
        <option value="" [selected]="!thang()">Tháng: Tất cả</option>
        @for (m of thangOpts; track m) { <option [value]="m" [selected]="thang() === '' + m">Tháng {{ m }}</option> }
      </select>
      <select aria-label="Khách hàng" (change)="kh.set($any($event.target).value)">
        <option value="" [selected]="!kh()">Khách hàng: Tất cả</option>
        @for (k of d()?.khachHang ?? []; track k.v) { <option [value]="k.v" [selected]="kh() === k.v">{{ k.t }}</option> }
      </select>
    </div>
    <nav class="nav">@for (n of nav; track n.id) { <button type="button" (click)="cuon(n.id)">{{ n.t }}</button> }</nav>

    @if (loi()) { <div class="note bad" role="alert">{{ loi() }} <button type="button" class="linkish" (click)="tai()">Thử lại</button></div> }
    @if (d(); as x) {
      <h2 id="hieu-qua" class="muc"><span class="so-m">1</span> Báo cáo hiệu quả <span class="u">tổng quan các HĐ Phú Tài</span></h2>
      <div class="kpis">
        <div class="k"><span class="l">Giá bán cho KH cuối</span><b class="v">{{ vndShort(x.hieuQua.giaBan) }}</b><span class="s">{{ x.hieuQua.soHd }} HĐ · trước VAT</span></div>
        <div class="k hero"><span class="l">OXY được hưởng (gộp)</span><b class="v">{{ vndShort(x.hieuQua.oxyGop) }}</b><span class="s">theo thoả thuận</span></div>
        <div class="k"><span class="l">LN thực OXY</span><b class="v">{{ vndShort(x.hieuQua.lnThuc) }}</b><span class="s">sau chi phí vận hành</span></div>
        <div class="k"><span class="l">Biên LN thực OXY</span><b class="v">{{ pctVi(x.hieuQua.bienLnThuc) }}%</b><span class="s">LN thực / giá bán</span></div>
      </div>
      <div class="row-3">
        <section class="card-b">
          <h3>Cơ cấu giá bán (trước VAT)</h3>
          <div class="donut-wrap">
            <svg class="donut" viewBox="0 0 100 100" role="img" aria-label="Cơ cấu giá bán">
              @for (m of mieng(); track m.nhan) { <circle cx="50" cy="50" [attr.r]="r" fill="none" [attr.stroke]="m.mau" stroke-width="18" [attr.stroke-dasharray]="m.dash" [attr.stroke-dashoffset]="m.offset" transform="rotate(-90 50 50)" /> }
              <text x="50" y="52" text-anchor="middle" class="dn">{{ tr(tongCc()) }}</text>
              <text x="50" y="62" text-anchor="middle" class="dl2">triệu</text>
            </svg>
          </div>
          <ul class="ds-m">
            @for (m of mieng(); track m.nhan) { <li><i [style.background]="m.mau"></i><span>{{ m.nhan }}</span><b>{{ vndShort(m.v) }}</b><em>{{ m.pct }}%</em></li> }
          </ul>
        </section>
        <section class="card-b">
          <h3>Giá bán &amp; LN thực OXY theo tháng <span class="u">triệu đ</span></h3>
          <svg class="bar" viewBox="0 0 640 230" role="img" aria-label="Giá bán và LN thực OXY theo tháng">
            @for (g of luoi(); track g.y) {
              <line x1="44" x2="632" [attr.y1]="g.y" [attr.y2]="g.y" class="gl" />
              <text x="38" [attr.y]="g.y + 3" text-anchor="end" class="ax">{{ g.nhan }}</text>
            }
            @for (b of cot(); track b.t) {
              <rect [attr.x]="b.x" [attr.y]="b.yGia" [attr.width]="b.w" [attr.height]="b.hGia" fill="#7ccf5b"><title>T{{ b.t }} — Giá bán {{ tr(b.giaBan) }} triệu</title></rect>
              <rect [attr.x]="b.x + b.w + 2" [attr.y]="b.yLn" [attr.width]="b.w" [attr.height]="b.hLn" fill="#0f5a2a"><title>T{{ b.t }} — LN thực OXY {{ tr(b.lnThuc) }} triệu</title></rect>
              <text [attr.x]="b.x + b.w + 1" y="214" text-anchor="middle" class="ax">T{{ b.t }}</text>
            }
          </svg>
          <div class="chu-giai"><span><i style="background:#7ccf5b"></i>Giá bán trước VAT</span><span><i style="background:#0f5a2a"></i>LN thực OXY</span></div>
        </section>
        <section class="card-b">
          <h3>Biên lợi nhuận</h3>
          @for (b of x.hieuQua.bien; track b.ten; let i = $index) {
            <div class="bl"><div class="db"><span>{{ b.ten }}</span><b [style.color]="i === 2 ? 'var(--ink-3)' : '#1f7a45'">{{ pctVi(b.pct) }}%</b></div><span class="hbar"><i [style.width.%]="min100(b.pct)" [style.background]="i === 2 ? '#8b9590' : i === 1 ? '#0f5a2a' : '#1f9d55'"></i></span></div>
          }
        </section>
      </div>

      <h2 id="loi-nhuan" class="muc"><span class="so-m">2</span> Báo cáo lợi nhuận <span class="u">theo từng hợp đồng</span></h2>
      <section class="card-b">
        <h3>Lợi nhuận theo hợp đồng</h3>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>Số HĐ · khách</th><th class="num">Giá bán</th><th class="num">Giá đầu vào</th><th class="num">LN trước thuế</th><th class="num">OXY được hưởng</th><th class="num">Chi phí vận hành</th><th class="num">LN thực OXY</th><th class="num">Biên</th></tr></thead>
            <tbody>
              @for (r of x.loiNhuan; track r.id) {
                <tr>
                  <td><a class="so" [routerLink]="['/hop-dong-ban', r.id]">{{ r.soHD }}</a><span class="sub">{{ r.tenKH }}</span></td>
                  <td class="num">{{ vndShort(r.giaBan) }}</td><td class="num">{{ vndShort(r.giaDauVao) }}</td><td class="num"><b>{{ vndShort(r.lnTruoc) }}</b></td>
                  <td class="num">{{ vndShort(r.oxyGop) }}</td><td class="num">{{ vndShort(r.cp) }}</td><td class="num"><b>{{ vndShort(r.lnThuc) }}</b></td><td class="num">{{ pctVi(r.bien) }}%</td>
                </tr>
              } @empty { <tr><td colspan="8" class="empty">Chưa có HĐ Phú Tài trong kỳ</td></tr> }
            </tbody>
            @if (x.loiNhuan.length) {
              <tfoot><tr><th>Tổng</th><td class="num">{{ vndShort(x.tongLn.giaBan) }}</td><td class="num">{{ vndShort(x.tongLn.giaDauVao) }}</td><td class="num">{{ vndShort(x.tongLn.lnTruoc) }}</td><td class="num">{{ vndShort(x.tongLn.oxyGop) }}</td><td class="num">{{ vndShort(x.tongLn.cp) }}</td><td class="num">{{ vndShort(x.tongLn.lnThuc) }}</td><td class="num">{{ pctVi(x.tongLn.bien) }}%</td></tr></tfoot>
            }
          </table>
        </div>
        <p class="note-s">LN trước thuế = giá bán − giá đầu vào · LN thực OXY = OXY được hưởng − chi phí vận hành (vận chuyển, kiểm định, chi phí khác). Số liệu trước VAT.</p>
      </section>

      <h2 id="phai-thu" class="muc"><span class="so-m">3</span> Báo cáo công nợ phải thu <span class="u">khách hàng cuối</span></h2>
      <div class="row-kpi">
        <div class="k hero"><span class="l">Phải thu khách hàng</span><b class="v">{{ money(x.phaiThu.tong) }}</b><span class="s">{{ x.phaiThu.soKhach }} khách · sau VAT</span></div>
        <div class="k"><span class="l">Phải thu quá hạn</span><b class="v">{{ money(x.phaiThu.quaHan) }}</b><span class="s">{{ pctVi(x.phaiThu.pctQuaHan) }}% · {{ x.phaiThu.soKhachQuaHan }} khách</span></div>
        <section class="card-b tuoi"><h3>Tuổi nợ phải thu <span class="u">triệu đ</span></h3>@for (t of barTuoi(x.phaiThu.tuoi, true); track t.nhan) { <div class="hb"><span class="hl">{{ t.nhan }}</span><span class="hbar"><i [style.width.%]="t.pct" [style.background]="t.mau"></i></span><b class="num">{{ tr(t.v) }}</b></div> }</section>
      </div>
      <section class="card-b">
        <h3>Công nợ khách hàng (phải thu) <span class="u">Đã thu = phiếu thu Phú Tài đã duyệt</span></h3>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>Khách hàng</th><th>Số HĐ · ngày</th><th class="num">Giá trị (sau VAT)</th><th class="num">Đã thu</th><th class="num">Còn phải thu</th><th>Hạn TT</th><th>Tình trạng</th><th>Phụ trách</th></tr></thead>
            <tbody>
              @for (r of x.phaiThu.rows; track r.hdbId) {
                <tr>
                  <td class="kh"><b>{{ r.tenKH }}</b><span class="sub">MST {{ r.mst }}</span></td>
                  <td><a class="so" [routerLink]="['/hop-dong-ban', r.hdbId]">{{ r.soHD }}</a><span class="sub">{{ viDate(r.ngayKy) }}</span></td>
                  <td class="num">{{ money(r.sauVAT) }}</td><td class="num">{{ money(r.daThu) }}</td><td class="num"><b>{{ money(r.con) }}</b></td>
                  <td class="nw">{{ r.hanTT ? viDate(r.hanTT) : '—' }}</td>
                  <td>@if (r.con <= 0) { <span class="chip ok">Đã thu đủ</span> } @else if (r.quaHanNgay > 0) { <span class="chip bad">Quá hạn {{ r.quaHanNgay }} ngày</span> } @else if (r.hanTT) { <span class="chip">Còn {{ r.conNgay }} ngày</span> }</td>
                  <td><span class="pt"><span class="av" [style.background]="mau(r.sale)">{{ vt(ten(r.sale)) }}</span>{{ ten(r.sale) }}</span></td>
                </tr>
              } @empty { <tr><td colspan="8" class="empty">Không có công nợ</td></tr> }
            </tbody>
            @if (x.phaiThu.rows.length) {
              <tfoot><tr><th colspan="2">Tổng</th><td class="num">{{ money(sumThu('sauVAT')) }}</td><td class="num">{{ money(sumThu('daThu')) }}</td><td class="num">{{ money(x.phaiThu.tong) }}</td><td colspan="3"></td></tr></tfoot>
            }
          </table>
        </div>
      </section>

      <h2 id="phai-tra" class="muc"><span class="so-m">4</span> Báo cáo công nợ NCC <span class="u">nhà cung cấp đầu vào</span></h2>
      <div class="row-kpi">
        <div class="k hero"><span class="l">Phải trả NCC</span><b class="v">{{ money(x.phaiTra.tong) }}</b><span class="s">{{ x.phaiTra.soNcc }} NCC còn nợ</span></div>
        <div class="k"><span class="l">Phải trả quá hạn</span><b class="v">{{ money(x.phaiTra.quaHan) }}</b><span class="s">{{ x.phaiTra.soNccQuaHan }} NCC · quá {{ x.phaiTra.soNgayQuaHanMax }} ngày</span></div>
        <section class="card-b tuoi"><h3>Tuổi nợ phải trả <span class="u">triệu đ</span></h3>@for (t of barTuoi(x.phaiTra.tuoi, false); track t.nhan) { <div class="hb"><span class="hl">{{ t.nhan }}</span><span class="hbar"><i [style.width.%]="t.pct" [style.background]="t.mau"></i></span><b class="num">{{ tr(t.v) }}</b></div> }</section>
      </div>
      <section class="card-b">
        <h3>Công nợ nhà cung cấp (phải trả) <span class="u">Đã trả = phiếu chi Phú Tài đã duyệt</span></h3>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>Nhà cung cấp</th><th>Số HĐ mua · ngày</th><th class="num">Giá trị (sau VAT)</th><th class="num">Đã trả</th><th class="num">Còn phải trả</th><th>Hạn TT</th><th>Tình trạng</th><th>Ghi chú</th></tr></thead>
            <tbody>
              @for (r of x.phaiTra.rows; track r.hdmId) {
                <tr>
                  <td class="kh"><b>{{ r.tenNCC }}</b><span class="sub">MST {{ r.mst }}</span></td>
                  <td><a class="so" [routerLink]="['/hop-dong-mua', r.hdmId]">{{ r.soHD }}</a><span class="sub">{{ viDate(r.ngayKy) }}</span></td>
                  <td class="num">{{ money(r.tong) }}</td><td class="num">{{ money(r.daTra) }}</td><td class="num"><b>{{ money(r.con) }}</b></td>
                  <td class="nw">{{ r.hanTT ? viDate(r.hanTT) : '—' }}</td>
                  <td>@if (r.con <= 0) { <span class="chip ok">Đã tất toán</span> } @else if (r.quaHanNgay > 0) { <span class="chip bad">Quá hạn {{ r.quaHanNgay }} ngày</span> } @else if (r.hanTT) { <span class="chip warn">Còn {{ r.conNgay }} ngày</span> }</td>
                  <td class="sub-t">{{ r.ghiChu }}</td>
                </tr>
              } @empty { <tr><td colspan="8" class="empty">Không có công nợ</td></tr> }
            </tbody>
            @if (x.phaiTra.rows.length) {
              <tfoot><tr><th colspan="2">Tổng</th><td class="num">{{ money(sumTra('tong')) }}</td><td class="num">{{ money(sumTra('daTra')) }}</td><td class="num">{{ money(x.phaiTra.tong) }}</td><td colspan="3"></td></tr></tfoot>
            }
          </table>
        </div>
      </section>

      <h2 id="van-hanh" class="muc"><span class="so-m">5</span> Báo cáo vận hành &amp; cảnh báo <span class="u">chi phí theo loại · rủi ro cần xử lý</span></h2>
      <div class="kpis">
        <div class="k"><span class="l">Vận chuyển</span><b class="v">{{ vndShort(x.vanHanh.vanChuyen) }}</b><span class="s">{{ x.vanHanh.soVanChuyen }} chuyến</span></div>
        <div class="k"><span class="l">Kiểm định</span><b class="v">{{ vndShort(x.vanHanh.kiemDinh) }}</b><span class="s">{{ x.vanHanh.soKiemDinh }} lượt</span></div>
        <div class="k"><span class="l">Chi phí quản lý</span><b class="v">{{ vndShort(x.vanHanh.quanLy) }}</b><span class="s">phân bổ theo HĐ</span></div>
        <div class="k hero"><span class="l">Tổng chi phí vận hành</span><b class="v">{{ vndShort(x.vanHanh.tong) }}</b><span class="s">{{ pctVi(x.vanHanh.pctGiaBan) }}% giá bán · Phú Tài chi từ quỹ PT</span></div>
      </div>
      <section class="card-b">
        <h3>Cảnh báo vận hành Phú Tài <span class="u">{{ x.vanHanh.p1 }} P1 · {{ x.vanHanh.p2 }} P2</span></h3>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>Mức</th><th>Cảnh báo</th><th>Đối tượng</th><th class="num">Số tiền ảnh hưởng</th><th>Đề xuất xử lý</th><th>Theo dõi</th></tr></thead>
            <tbody>
              @for (c of x.vanHanh.canhBao; track $index) {
                <tr>
                  <td><span class="chip" [class.bad]="c.muc === 'P1'" [class.warn]="c.muc === 'P2'">{{ c.muc }}</span></td>
                  <td><span class="nhom">{{ c.nhom }}</span><b class="td">{{ c.tieuDe }}</b><span class="sub">{{ c.moTa }}</span></td>
                  <td class="doi">{{ c.doiTuong }}</td>
                  <td class="num"><b>{{ c.soTien ? money(c.soTien) : '—' }}</b></td>
                  <td>{{ c.deXuat }}</td>
                  <td>@if (c.theoDoi) { <span class="pt"><span class="av" [style.background]="mau(c.theoDoi)">{{ vt(ten(c.theoDoi)) }}</span>{{ ten(c.theoDoi) }}</span> }</td>
                </tr>
              } @empty { <tr><td colspan="6" class="empty">Không có cảnh báo</td></tr> }
            </tbody>
          </table>
        </div>
        <p class="note-s">Hệ thống tự phát hiện từ tab 1–4 (thu KH, trả NCC, quỹ PT, đối soát, hồ sơ). Hết điều kiện thì tự kết thúc.</p>
      </section>
    } @else if (!loi()) {
      <p class="sub">Đang tải báo cáo…</p>
    }
  `,
  styles: [PT_STYLES, `
    .nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .nav button { border: 0; padding: 6px 14px; border-radius: 999px; background: var(--surf); font-weight: 600; font-size: 13px; color: #0f5a2a; cursor: pointer; }
    .muc { display: flex; align-items: center; gap: 10px; font-size: 19px; font-weight: 700; margin: 26px 0 12px; color: #0f5a2a; scroll-margin-top: 90px; }
    .so-m { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: #0f5a2a; color: #fff; font-size: 13px; }
    .row-3 { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr) minmax(0, 1fr); }
    .row-kpi { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr); margin-bottom: 14px; align-items: stretch; }
    .row-kpi .card-b { margin: 0; }
    @media (max-width: 1000px) { .row-3, .row-kpi { grid-template-columns: minmax(0, 1fr); } }
    .bar { width: 100%; height: auto; }
    .gl { stroke: var(--line); stroke-width: 1; }
    .ax { font-size: 10px; fill: var(--ink-3); }
    .chu-giai { display: flex; gap: 16px; font-size: 12.5px; color: var(--ink-2); margin-top: 6px; }
    .chu-giai i, .ds-m i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; }
    .donut-wrap { display: grid; place-items: center; margin: 4px 0 10px; }
    .donut { width: 170px; height: 170px; }
    .dn { font-size: 15px; font-weight: 800; fill: var(--ink); }
    .dl2 { font-size: 6px; fill: var(--ink-3); }
    .ds-m { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; font-size: 13px; }
    .ds-m li { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto 44px; align-items: center; gap: 8px; }
    .ds-m li i { margin-right: 0; border-radius: 50%; }
    .ds-m li b { text-align: right; }
    .ds-m li em { font-style: normal; color: var(--ink-3); text-align: right; }
    .hb { display: grid; grid-template-columns: 110px 1fr 56px; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 13px; }
    .hbar { display: block; height: 12px; border-radius: 6px; background: var(--surf-3); overflow: hidden; }
    .hbar i { display: block; height: 100%; border-radius: 6px; }
    .hb .num { text-align: right; font-weight: 700; }
    .bl { margin-bottom: 14px; }
    .db { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; margin-bottom: 6px; }
    .nw { white-space: nowrap; }
    .sub-t { font-size: 12px; color: var(--ink-3); }
    .nhom { display: block; font-size: 11px; font-weight: 700; color: #0f5a2a; letter-spacing: 0.03em; }
    .td { display: block; }
    .doi { color: #0f5a2a; font-weight: 600; max-width: 180px; }
  `],
})
export class PtBaoCao {
  private readonly store = inject(Store);
  protected readonly money = money;
  protected readonly vndShort = vndShort;
  protected readonly viDate = viDate;
  protected readonly vt = chuVietTat;
  protected readonly mau = mauAvatar;
  protected readonly ten = (id: string) => this.store.userName(id);
  protected readonly r = R;
  protected readonly nav = NAV;
  protected readonly nams = (() => {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2, y - 3];
  })();
  protected readonly thangOpts = Array.from({ length: 12 }, (_, i) => i + 1);

  protected readonly nam = signal(String(new Date().getFullYear()));
  protected readonly quy = signal('');
  protected readonly thang = signal('');
  protected readonly kh = signal('');

  private readonly src = ptTai<Bc>(() => `/phu-tai/bao-cao${qs({ nam: this.nam(), quy: this.quy(), thang: this.thang(), maKH: this.kh() })}`);
  protected readonly d = this.src.d;
  protected readonly loi = this.src.loi;
  protected readonly tai = this.src.tai;

  protected chonQuy(v: string): void {
    this.quy.set(v);
    if (v) this.thang.set('');
  }
  protected chonThang(v: string): void {
    this.thang.set(v);
    if (v) this.quy.set('');
  }
  protected cuon(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  protected pctVi(p: number): string {
    return p.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  }
  protected min100(p: number): number {
    return Math.max(0, Math.min(100, p));
  }
  protected tr(v: number): string {
    return (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  }
  protected sumThu(k: 'sauVAT' | 'daThu'): number {
    return (this.d()?.phaiThu.rows ?? []).reduce((s, r) => s + r[k], 0);
  }
  protected sumTra(k: 'tong' | 'daTra'): number {
    return (this.d()?.phaiTra.rows ?? []).reduce((s, r) => s + r[k], 0);
  }

  protected barTuoi(ts: Tuoi[], thu: boolean): { nhan: string; v: number; pct: number; mau: string }[] {
    const max = Math.max(1, ...ts.map((t) => t.v));
    return ts.map((t, i) => ({ ...t, pct: (t.v / max) * 100, mau: i === 0 ? '#1f9d55' : thu ? '#e0a31c' : '#e0a31c' }));
  }

  // ── Donut cơ cấu giá bán ──
  protected readonly tongCc = computed(() => (this.d()?.hieuQua.coCau ?? []).reduce((s, c) => s + c.v, 0));
  protected readonly mieng = computed(() => {
    const cs = this.d()?.hieuQua.coCau ?? [];
    const tong = this.tongCc();
    let dau = 0;
    return cs.map((c, i) => {
      const pct = tong ? (c.v / tong) * 100 : 0;
      const dai = (pct / 100) * CHU_VI;
      const o = { nhan: c.ten, v: c.v, pct: Math.round(pct), mau: MAU_CC[i % MAU_CC.length], dash: `${dai} ${CHU_VI - dai}`, offset: -dau };
      dau += dai;
      return o;
    });
  });

  // ── Cột theo tháng ──
  private readonly tran = computed(() => tranDep(Math.max(0, ...(this.d()?.hieuQua.thangs ?? []).flatMap((t) => [t.giaBan, t.lnThuc])) / 1e6));
  protected readonly luoi = computed(() => {
    const tran = this.tran();
    return [0, 1, 2, 3, 4].map((i) => ({ y: 190 - (i * 170) / 4, nhan: ((tran * i) / 4).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) }));
  });
  protected readonly cot = computed(() => {
    const ts = this.d()?.hieuQua.thangs ?? [];
    const tran = this.tran() * 1e6;
    const slot = 588 / Math.max(1, ts.length);
    const w = Math.min(20, slot * 0.36);
    const y = (v: number) => 190 - (Math.max(0, v) / tran) * 170;
    return ts.map((t, i) => ({ t: t.t, giaBan: t.giaBan, lnThuc: t.lnThuc, x: 44 + i * slot + (slot - 2 * w - 2) / 2, w, yGia: y(t.giaBan), hGia: 190 - y(t.giaBan), yLn: y(t.lnThuc), hLn: 190 - y(t.lnThuc) }));
  });
}
