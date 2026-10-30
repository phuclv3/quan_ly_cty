import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { api } from '../core/api';
import { vndShort } from '../core/util';

/** Dữ liệu báo cáo do backend tính (GET /bao-cao/ke-toan) — frontend chỉ vẽ. */
interface Kpi {
  hienTai: number;
  kyTruoc?: number | null;
  pct?: number | null;
  chuoi: number[];
}
interface CongNoKpi {
  tong: number;
  trongHan: number;
  quaHan: number;
  pct?: number | null;
  chuoi: number[];
}
interface BaoCaoKt {
  capNhat: string;
  loc: { nam: number; quy: number | null; thang: number | null; phapNhan: string; soSanh: string };
  loiNhuanGop: { hienTai: number; kyTruoc?: number | null; pct?: number | null; bienGopPct: number };
  phaiThu: CongNoKpi;
  phaiTra: CongNoKpi;
  cpCoDinhThang: Kpi;
  duBao: { tuNgay: string; denNgay: string; khaDung: number; thuDuKien: number; chiDuKien: number; sau30Ngay: number; pctGiam?: number | null; soThangChiPhi?: number | null };
  dongTien: { t: number; thu: number; chi: number; soDu: number }[];
  soDuNguon: { id: string; congTy: string; ten: string; soDu: number }[];
  danhMuc: { ten: string; loai: string; soTien: number }[];
  tuoiNo: { nhan: string; phaiThu: number; phaiTra: number }[];
  phaiThuPhapNhan: { ma: string; ten: string; soTien: number }[];
  khQuaHan: { hdbId: string; soHD: string; tenKH: string; quaHan: number; soNgay: number }[];
  nccCanTra: { hdmId: string; soHD: string; tenNCC: string; soTien: number; han: string; soNgay: number }[];
  cpCoCau: { ten: string; soTien: number }[];
  cpLoai: string[];
  cpTheoThang: { t: number; tong: number; theo: number[] }[];
  kqkd: { doanhThu: number; giaVon: number; loiNhuanGop: number; cpCoDinh: number; cpBienDoi: number; loiNhuanTruocThue: number };
}
interface Mieng {
  nhan: string;
  v: number;
  pct: number;
  mau: string;
  dash: string;
  offset: number;
}

const R = 36;
const CHU_VI = 2 * Math.PI * R;
const MAU_THU = '#0f5a2a';
const MAU_CHI = '#e0a31c';
const MAU_DU = '#7b5cc4';
const MAU_CP = ['#0f5a2a', '#14806f', '#7ccf5b', '#3b7bc9', '#e0a31c', '#b8bfc2'];
const MAU_PN: Record<string, string> = { OXY: '#0f5a2a', PHU_TAI: '#8e63c9' };
const NHAN_CT: Record<string, string> = { OXY: 'OXY', KOXY: 'KHÍ OXY' };
const MAU_CT: Record<string, string> = { OXY: '#0f5a2a', KOXY: '#b8741a' };

/** Làm tròn trần trục tung lên số "đẹp" (1, 2, 2.5, 5 × 10ⁿ) để vạch chia chẵn. */
function tranDep(v: number): number {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / e;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e;
}

/** Mục "Tổng quan" của tab Báo cáo kế toán — mọi số liệu lấy từ backend theo bộ lọc. */
@Component({
  selector: 'app-kt-tong-quan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
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
      <select aria-label="Pháp nhân" (change)="pn.set($any($event.target).value)">
        <option value="TAT_CA" [selected]="pn() === 'TAT_CA'">Pháp nhân: Tất cả</option>
        <option value="OXY" [selected]="pn() === 'OXY'">OXY</option>
        <option value="KOXY" [selected]="pn() === 'KOXY'">KHÍ OXY</option>
      </select>
      <select aria-label="So sánh" (change)="soSanh.set($any($event.target).value)">
        <option value="cungKy" [selected]="soSanh() === 'cungKy'">So sánh: cùng kỳ {{ +nam() - 1 }}</option>
        <option value="khong" [selected]="soSanh() === 'khong'">Không so sánh</option>
      </select>
      <span class="sp"></span>
      @if (dangTai()) { <span class="sub">Đang tải…</span> }
      @else if (d(); as x) { <span class="sub">Cập nhật {{ ngayVi(x.capNhat) }}</span> }
    </div>

    @if (loi()) {
      <div class="note bad" role="alert">{{ loi() }} <button type="button" class="linkish" (click)="tai()">Thử lại</button></div>
    }
    @if (d(); as x) {
      <div class="kpis">
        <div class="k hero" title="Doanh thu thuần (trước VAT, HĐ ký trong kỳ) trừ giá vốn hàng bán">
          <span class="l">Lợi nhuận gộp</span>
          <b class="v">{{ gop(x.loiNhuanGop.hienTai) }} @if (x.loiNhuanGop.pct != null) { <em class="pill" [class.xau]="x.loiNhuanGop.pct < 0">{{ mui(x.loiNhuanGop.pct) }} {{ abs(x.loiNhuanGop.pct) }}%</em> }</b>
          <span class="s">biên gộp {{ pctVi(x.loiNhuanGop.bienGopPct) }}% doanh thu thuần</span>
        </div>
        <div class="k" title="Còn phải thu theo các đợt thanh toán HĐ bán">
          <span class="l">Phải thu khách hàng</span>
          <div class="kv"><b class="v">{{ gop(x.phaiThu.tong) }}</b><svg class="spark" viewBox="0 0 80 28" aria-hidden="true"><polyline [attr.points]="spark(x.phaiThu.chuoi)" /></svg></div>
          <span class="s">@if (x.phaiThu.pct != null) { <i class="dl" [class.xau]="x.phaiThu.pct > 0">{{ mui(x.phaiThu.pct) }} {{ abs(x.phaiThu.pct) }}%</i> }trong hạn {{ gop(x.phaiThu.trongHan) }}</span>
        </div>
        <div class="k" title="Còn phải trả theo các đợt thanh toán HĐ mua">
          <span class="l">Phải trả nhà cung cấp</span>
          <div class="kv"><b class="v">{{ gop(x.phaiTra.tong) }}</b><svg class="spark" viewBox="0 0 80 28" aria-hidden="true"><polyline [attr.points]="spark(x.phaiTra.chuoi)" /></svg></div>
          <span class="s">@if (x.phaiTra.pct != null) { <i class="dl" [class.xau]="x.phaiTra.pct > 0">{{ mui(x.phaiTra.pct) }} {{ abs(x.phaiTra.pct) }}%</i> }quá hạn {{ gop(x.phaiTra.quaHan) }}</span>
        </div>
        <div class="k" title="Phiếu Chi có loại chi phí thuộc nhóm Vận hành, bình quân mỗi tháng trong kỳ">
          <span class="l">Chi phí cố định / tháng</span>
          <div class="kv"><b class="v">{{ gop(x.cpCoDinhThang.hienTai) }}</b><svg class="spark do" viewBox="0 0 80 28" aria-hidden="true"><polyline [attr.points]="spark(x.cpCoDinhThang.chuoi)" /></svg></div>
          <span class="s">@if (x.cpCoDinhThang.pct != null) { <i class="dl" [class.xau]="x.cpCoDinhThang.pct > 0">{{ mui(x.cpCoDinhThang.pct) }} {{ abs(x.cpCoDinhThang.pct) }}%</i> }bình quân {{ gop(x.cpCoDinhThang.hienTai) }} / tháng</span>
        </div>
      </div>
      <p class="luu-y">Doanh thu, LNTT, tiền khả dụng và phải thu quá hạn xem ở <a class="linkish" routerLink="/">Trang chủ</a> — trang này không lặp lại.</p>

      <h2 class="muc">Dòng tiền <span class="u">số quỹ · ngân hàng · dự báo</span></h2>
      <div class="row-a">
        <section class="card-b">
          <h3>Thu – chi và số dư theo tháng <span class="u">triệu đ</span></h3>
          <svg class="bar" viewBox="0 0 640 230" role="img" aria-label="Thu chi và số dư theo tháng">
            @for (g of luoiTien(); track g.y) {
              <line x1="44" x2="632" [attr.y1]="g.y" [attr.y2]="g.y" class="gl" />
              <text x="38" [attr.y]="g.y + 3" text-anchor="end" class="ax">{{ g.nhan }}</text>
            }
            @for (b of cotTien(); track b.t) {
              <rect [attr.x]="b.x" [attr.y]="b.yThu" [attr.width]="b.w" [attr.height]="b.hThu" [attr.fill]="mauThu"><title>T{{ b.t }} — Thu {{ tr(b.thu) }} triệu</title></rect>
              <rect [attr.x]="b.x + b.w + 2" [attr.y]="b.yChi" [attr.width]="b.w" [attr.height]="b.hChi" [attr.fill]="mauChi"><title>T{{ b.t }} — Chi {{ tr(b.chi) }} triệu</title></rect>
              <text [attr.x]="b.x + b.w + 1" y="214" text-anchor="middle" class="ax">T{{ b.t }}</text>
            }
            <polyline [attr.points]="duongDu()" fill="none" [attr.stroke]="mauDu" stroke-width="2" />
            @for (b of cotTien(); track b.t) { <circle [attr.cx]="b.x + b.w + 1" [attr.cy]="b.yDu" r="3" fill="#fff" [attr.stroke]="mauDu" stroke-width="1.8"><title>T{{ b.t }} — Số dư cuối tháng {{ tr(b.soDu) }} triệu</title></circle> }
          </svg>
          <div class="chu-giai"><span><i [style.background]="mauThu"></i>Thu</span><span><i [style.background]="mauChi"></i>Chi</span><span><i class="tron" [style.background]="mauDu"></i>Số dư cuối tháng</span></div>
        </section>
        <section class="card-b">
          <h3>Dự báo tiền 30 ngày <span class="u">{{ ngayVi(x.duBao.tuNgay) }} → {{ ngayVi(x.duBao.denNgay) }}</span></h3>
          <div class="db"><span>Tiền khả dụng hôm nay</span><b>{{ gop(x.duBao.khaDung) }}</b></div>
          <div class="db"><span>Thu dự kiến (công nợ đến hạn)</span><b class="duong">+ {{ gop(x.duBao.thuDuKien) }}</b></div>
          <div class="db"><span>Chi dự kiến (NCC, lương, thuế)</span><b class="am">− {{ gop(x.duBao.chiDuKien) }}</b></div>
          <div class="db tong"><span>Dự kiến sau 30 ngày</span><b [class.am]="x.duBao.sau30Ngay < 0">{{ gop(x.duBao.sau30Ngay) }}</b></div>
          @if (x.duBao.pctGiam != null) {
            <p class="hop do">Tiền giảm {{ pctVi(x.duBao.pctGiam) }}% trong 30 ngày@if (x.duBao.soThangChiPhi != null) { · còn đủ chi phí cố định khoảng {{ pctVi(x.duBao.soThangChiPhi) }} tháng }</p>
          }
          <p class="sub nho">Không gồm quỹ ảo Phú Tài và tiền bị phong toả.</p>
        </section>
      </div>

      <div class="row-b">
        <section class="card-b">
          <h3>Số dư theo nguồn tiền <span class="u">{{ ngayVi(x.capNhat) }}</span></h3>
          @for (n of nguonBar(); track n.id) {
            <div class="hb"><span class="hl" [title]="n.nhan">{{ n.nhan }}</span><span class="hbar"><i [style.width.%]="n.pct" [style.background]="n.mau"></i></span><b class="num">{{ gop(n.soDu) }}</b></div>
          } @empty { <p class="empty">Chưa có nguồn tiền.</p> }
        </section>
        <section class="card-b">
          <h3>Thu – chi theo danh mục</h3>
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th>Danh mục</th><th>Loại</th><th class="num">Trong kỳ</th></tr></thead>
            <tbody>
              @for (r of x.danhMuc; track r.loai + r.ten) {
                <tr><td>{{ r.ten }}</td><td><span class="tg" [class.chi]="r.loai === 'Chi'">{{ r.loai }}</span></td><td class="num"><b>{{ gop(r.soTien) }}</b></td></tr>
              } @empty { <tr><td colspan="3" class="empty">Chưa có thu chi Đã duyệt trong kỳ.</td></tr> }
            </tbody>
          </table></div>
        </section>
      </div>

      <h2 class="muc">Công nợ <span class="u">phải thu · phải trả · tuổi nợ</span></h2>
      <div class="row-a">
        <section class="card-b">
          <h3>Tuổi nợ: phải thu và phải trả <span class="u">triệu đ</span></h3>
          <svg class="bar" viewBox="0 0 640 230" role="img" aria-label="Tuổi nợ phải thu và phải trả">
            @for (g of luoiNo(); track g.y) {
              <line x1="44" x2="632" [attr.y1]="g.y" [attr.y2]="g.y" class="gl" />
              <text x="38" [attr.y]="g.y + 3" text-anchor="end" class="ax">{{ g.nhan }}</text>
            }
            @for (b of cotNo(); track b.nhan) {
              <rect [attr.x]="b.x" [attr.y]="b.yThu" [attr.width]="b.w" [attr.height]="b.hThu" [attr.fill]="mauThu"><title>{{ b.nhan }} — Phải thu {{ tr(b.phaiThu) }} triệu</title></rect>
              <rect [attr.x]="b.x + b.w + 2" [attr.y]="b.yTra" [attr.width]="b.w" [attr.height]="b.hTra" [attr.fill]="mauChi"><title>{{ b.nhan }} — Phải trả {{ tr(b.phaiTra) }} triệu</title></rect>
              <text [attr.x]="b.x + b.w + 1" y="214" text-anchor="middle" class="ax">{{ b.nhan }}</text>
            }
          </svg>
          <div class="chu-giai"><span><i [style.background]="mauThu"></i>Phải thu khách hàng</span><span><i [style.background]="mauChi"></i>Phải trả nhà cung cấp</span></div>
        </section>
        <section class="card-b">
          <h3>Phải thu theo pháp nhân</h3>
          <div class="donut-wrap">
            <svg class="donut" viewBox="0 0 100 100" role="img" aria-label="Phải thu theo pháp nhân">
              @for (m of mPn(); track m.nhan) { <circle cx="50" cy="50" [attr.r]="r" fill="none" [attr.stroke]="m.mau" stroke-width="18" [attr.stroke-dasharray]="m.dash" [attr.stroke-dashoffset]="m.offset" transform="rotate(-90 50 50)" /> }
              <text x="50" y="52" text-anchor="middle" class="dn">{{ tr(tongPn()) }}</text>
              <text x="50" y="62" text-anchor="middle" class="dl2">triệu</text>
            </svg>
          </div>
          <ul class="ds-m">
            @for (m of mPn(); track m.nhan) { <li><i [style.background]="m.mau"></i><span>{{ m.nhan }}</span><b>{{ gop(m.v) }}</b><em>{{ m.pct }}%</em></li> }
          </ul>
        </section>
      </div>

      <div class="row-d">
        <section class="card-b">
          <h3>Khách hàng nợ quá hạn <span class="u">cần đòi</span></h3>
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th>Khách hàng</th><th>Số HĐ</th><th class="num">Quá hạn</th><th class="num">Số ngày</th></tr></thead>
            <tbody>
              @for (r of x.khQuaHan; track r.hdbId) {
                <tr>
                  <td class="kh">{{ r.tenKH }}</td>
                  <td><a class="so" [routerLink]="['/hop-dong-ban', r.hdbId]">{{ r.soHD || '(chưa có số)' }}</a></td>
                  <td class="num"><b>{{ gop(r.quaHan) }}</b></td>
                  <td class="num"><span class="ng" [class.nang]="r.soNgay > 60" [class.vua]="r.soNgay > 30 && r.soNgay <= 60">{{ r.soNgay }} ngày</span></td>
                </tr>
              } @empty { <tr><td colspan="4" class="empty">Không có khách hàng nợ quá hạn.</td></tr> }
            </tbody>
          </table></div>
        </section>
        <section class="card-b">
          <h3>Nhà cung cấp cần trả <span class="u">14 ngày tới</span></h3>
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th>Nhà cung cấp</th><th>Số HĐ</th><th class="num">Số tiền</th><th>Hạn</th></tr></thead>
            <tbody>
              @for (r of x.nccCanTra; track r.hdmId + r.han) {
                <tr>
                  <td class="kh">{{ r.tenNCC }}</td>
                  <td><a class="so" [routerLink]="['/hop-dong-mua', r.hdmId]">{{ r.soHD || '(chưa có số)' }}</a></td>
                  <td class="num"><b>{{ gop(r.soTien) }}</b></td>
                  <td><span class="ng" [class.nang]="r.soNgay > 0">{{ hanNgan(r.han) }}</span></td>
                </tr>
              } @empty { <tr><td colspan="4" class="empty">Không có khoản phải trả trong 14 ngày tới.</td></tr> }
            </tbody>
          </table></div>
        </section>
      </div>

      <h2 class="muc">Lợi nhuận &amp; chi phí <span class="u">chi phí cố định · kết quả kinh doanh</span></h2>
      <div class="row-e">
        <section class="card-b">
          <h3>Chi phí cố định · cơ cấu <span class="u">trong kỳ</span></h3>
          <div class="donut-wrap">
            <svg class="donut" viewBox="0 0 100 100" role="img" aria-label="Cơ cấu chi phí cố định">
              @for (m of mCp(); track m.nhan) { <circle cx="50" cy="50" [attr.r]="r" fill="none" [attr.stroke]="m.mau" stroke-width="18" [attr.stroke-dasharray]="m.dash" [attr.stroke-dashoffset]="m.offset" transform="rotate(-90 50 50)" /> }
              <text x="50" y="52" text-anchor="middle" class="dn">{{ tr(tongCp()) }}</text>
              <text x="50" y="62" text-anchor="middle" class="dl2">triệu · {{ x.cpTheoThang.length }} tháng</text>
            </svg>
          </div>
          <ul class="ds-m">
            @for (m of mCp(); track m.nhan) { <li><i [style.background]="m.mau"></i><span>{{ m.nhan }}</span><b>{{ gop(m.v) }}</b><em>{{ m.pct }}%</em></li> }
          </ul>
        </section>
        <section class="card-b">
          <h3>Chi phí cố định theo tháng <span class="u">bình quân {{ gop(x.cpCoDinhThang.hienTai) }} / tháng</span></h3>
          <svg class="bar" viewBox="0 0 640 260" role="img" aria-label="Chi phí cố định theo tháng">
            @for (g of luoiCp(); track g.y) {
              <line x1="44" x2="632" [attr.y1]="g.y" [attr.y2]="g.y" class="gl" />
              <text x="38" [attr.y]="g.y + 3" text-anchor="end" class="ax">{{ g.nhan }}</text>
            }
            @for (b of cotCp(); track b.t) {
              @for (o of b.o; track o.i) { <rect [attr.x]="b.x" [attr.y]="o.y" [attr.width]="b.w" [attr.height]="o.h" [attr.fill]="o.mau"><title>T{{ b.t }} — {{ o.ten }} {{ tr(o.v) }} triệu</title></rect> }
              <text [attr.x]="b.x + b.w / 2" [attr.y]="b.yTren - 4" text-anchor="middle" class="ax v">{{ tr(b.tong) }}</text>
              <text [attr.x]="b.x + b.w / 2" y="246" text-anchor="middle" class="ax">T{{ b.t }}</text>
            }
          </svg>
          <div class="chu-giai wrap">@for (l of x.cpLoai; track l; let i = $index) { <span><i [style.background]="mauCp(i)"></i>{{ l }}</span> }</div>
        </section>
      </div>

      <section class="card-b">
        <h3>Kết quả kinh doanh tóm tắt <span class="u">trong kỳ · triệu đ</span></h3>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Chỉ tiêu</th><th class="num">Trong kỳ</th><th class="num">% doanh thu thuần</th></tr></thead>
          <tbody>
            @for (r of kq(); track r.ten) {
              <tr [class.dam]="r.dam"><td>{{ r.ten }}</td><td class="num">{{ gop(r.v) }}</td><td class="num">{{ r.pct }}</td></tr>
            }
          </tbody>
        </table></div>
      </section>
    } @else if (!loi()) {
      <p class="sub">Đang tải báo cáo…</p>
    }
  `,
  styles: `
    :host { display: block; }
    .loc { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 12px; }
    .loc .sp { flex: 1 1 auto; }
    .loc select { width: auto; min-height: 36px; height: 36px; padding: 4px 14px; border-radius: 999px; background: var(--surf); border: 0; font-size: 13px; font-weight: 600; }
    .luu-y { margin: 0 0 14px; padding: 8px 14px; border-radius: 12px; background: var(--surf); font-size: 12.5px; color: var(--ink-3); }
    .muc { font-size: 19px; font-weight: 700; margin: 20px 0 10px; color: #0f5a2a; }
    .u { font-size: 12px; font-weight: 400; color: var(--ink-3); margin-left: 6px; }
    .kpis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); margin-bottom: 12px; }
    .k { display: grid; gap: 4px; align-content: start; background: var(--surf); border-radius: 14px; padding: 12px 14px; min-width: 0; }
    .k.hero { background: linear-gradient(135deg, #0f7a3d, #19a05a); color: #fff; }
    .k .l { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
    .k.hero .l, .k.hero .s { color: #fff; }
    .k .v { font-size: 26px; line-height: 1.15; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .kv { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .k .s { font-size: 11.5px; color: var(--ink-3); }
    .pill { font-style: normal; font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 999px; background: rgba(255, 255, 255, 0.92); color: #0f5a2a; }
    .pill.xau { color: #a3261d; }
    .dl { font-style: normal; font-weight: 700; color: #1f7a45; margin-right: 6px; }
    .dl.xau { color: #a3261d; }
    .spark { width: 80px; height: 28px; flex: 0 0 auto; }
    .spark polyline { fill: none; stroke: #1f9d55; stroke-width: 1.8; stroke-linejoin: round; stroke-linecap: round; }
    .spark.do polyline { stroke: #d6453b; }
    .row-a { display: grid; gap: 14px; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); margin-bottom: 14px; }
    .row-b { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); margin-bottom: 14px; }
    .row-d { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); margin-bottom: 14px; }
    .row-e { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); margin-bottom: 14px; }
    @media (max-width: 1000px) { .row-a, .row-b, .row-d, .row-e { grid-template-columns: minmax(0, 1fr); } }
    .card-b { background: var(--surf); border-radius: 20px; padding: 18px 20px; min-width: 0; }
    .card-b h3 { font-size: 16px; font-weight: 700; margin: 0 0 14px; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .card-b h3 .u { margin-left: 0; }
    .bar { width: 100%; height: auto; }
    .gl { stroke: var(--line); stroke-width: 1; }
    .ax { font-size: 10px; fill: var(--ink-3); }
    .ax.v { fill: var(--ink-2); font-weight: 600; }
    .chu-giai { display: flex; gap: 16px; font-size: 12.5px; color: var(--ink-2); margin-top: 6px; }
    .chu-giai.wrap { flex-wrap: wrap; gap: 8px 16px; }
    .chu-giai i, .ds-m i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; }
    .chu-giai i { margin-right: 6px; }
    .chu-giai i.tron { border-radius: 50%; }
    .db { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; font-size: 13px; border-bottom: 1px solid var(--line); }
    .db.tong { border-bottom: 0; font-size: 14px; }
    .db b.duong { color: #1f7a45; }
    .db b.am { color: #a3261d; }
    .hop { margin: 10px 0 0; padding: 8px 12px; border-radius: 8px; font-size: 12.5px; }
    .hop.do { background: #fdecea; color: #a3261d; }
    .nho { font-size: 11.5px; margin: 10px 0 0; }
    .donut-wrap { display: grid; place-items: center; margin: 4px 0 10px; }
    .donut { width: 170px; height: 170px; }
    .dn { font-size: 15px; font-weight: 800; fill: var(--ink); }
    .dl2 { font-size: 5px; fill: var(--ink-3); }
    .ds-m { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; font-size: 13px; }
    .ds-m li { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto 44px; align-items: center; gap: 10px; }
    .ds-m li b { text-align: right; }
    .ds-m li span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ds-m li em { font-style: normal; color: var(--ink-3); text-align: right; }
    .ds-m i { border-radius: 50%; }
    .hb { display: grid; grid-template-columns: 150px 1fr 66px; align-items: center; gap: 10px; margin-bottom: 14px; font-size: 13px; }
    .hl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hbar { height: 14px; border-radius: 7px; background: var(--surf-3); overflow: hidden; }
    .hbar i { display: block; height: 100%; border-radius: 7px; }
    .hb .num { text-align: right; font-weight: 700; }
    .empty { color: var(--ink-3); font-size: 13px; }
    .tbl-wrap { border: 0; border-radius: 0; box-shadow: none; overflow: auto; background: none; }
    .tbl { font-size: 13px; }
    .tbl th, .tbl td { padding: 11px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
    .tbl tbody tr:last-child td { border-bottom: 0; }
    .tbl thead th { background: var(--surf-2); font-size: 12.5px; font-weight: 700; white-space: nowrap; }
    .tbl thead th:first-child { border-radius: 10px 0 0 10px; }
    .tbl thead th:last-child { border-radius: 0 10px 10px 0; }
    .tbl tr.dam td { font-weight: 700; }
    .tbl .so { font-weight: 700; color: var(--brand); text-decoration: none; white-space: nowrap; }
    .tbl .kh { min-width: 130px; max-width: 200px; line-height: 1.4; }
    .tg { display: inline-block; padding: 1px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #e2f3e9; color: #17663f; }
    .tg.chi { background: #fbf0d6; color: #8a5a00; }
    .ng { display: inline-block; padding: 1px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: var(--surf-3); color: var(--ink-2); white-space: nowrap; }
    .ng.vua { background: #fbf0d6; color: #8a5a00; }
    .ng.nang { background: #fbe4e1; color: #a3261d; }
  `,
})
export class BaoCaoTongQuan {
  private readonly store = inject(Store);
  protected readonly gop = vndShort;
  protected readonly r = R;
  protected readonly mauThu = MAU_THU;
  protected readonly mauChi = MAU_CHI;
  protected readonly mauDu = MAU_DU;
  protected readonly abs = Math.abs;
  protected readonly nams = (() => {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2, y - 3];
  })();
  protected readonly thangOpts = Array.from({ length: 12 }, (_, i) => i + 1);

  protected readonly nam = signal(String(new Date().getFullYear()));
  protected readonly quy = signal('');
  protected readonly thang = signal('');
  protected readonly pn = signal('TAT_CA');
  protected readonly soSanh = signal('cungKy');

  protected readonly d = signal<BaoCaoKt | null>(null);
  protected readonly dangTai = signal(false);
  protected readonly loi = signal('');
  private seq = 0;

  constructor() {
    // Đổi bộ lọc, hoặc dữ liệu chung đổi phiên bản (có phiếu / HĐ đổi) → tải lại từ backend.
    effect(() => {
      this.nam();
      this.quy();
      this.thang();
      this.pn();
      this.soSanh();
      this.store.db().version;
      untracked(() => void this.tai());
    });
  }

  protected chonQuy(v: string): void {
    this.quy.set(v);
    if (v) this.thang.set('');
  }
  protected chonThang(v: string): void {
    this.thang.set(v);
    if (v) this.quy.set('');
  }

  protected async tai(): Promise<void> {
    const mine = ++this.seq;
    const q = new URLSearchParams({ nam: this.nam(), phapNhan: this.pn(), soSanh: this.soSanh() });
    if (this.quy()) q.set('quy', this.quy());
    if (this.thang()) q.set('thang', this.thang());
    this.dangTai.set(true);
    try {
      const x = await api<BaoCaoKt>('GET', `/bao-cao/ke-toan?${q}`);
      if (mine !== this.seq) return;
      this.d.set(x);
      this.loi.set('');
    } catch (e) {
      if (mine !== this.seq) return;
      this.loi.set(e instanceof Error ? e.message : 'Không tải được báo cáo');
    } finally {
      if (mine === this.seq) this.dangTai.set(false);
    }
  }

  protected ngayVi(iso: string): string {
    return iso.split('-').reverse().join('/');
  }
  /** dd/MM cho hạn trả. */
  protected hanNgan(iso: string): string {
    return iso.split('-').reverse().slice(0, 2).join('/');
  }
  protected mui(p: number): string {
    return p < 0 ? '▼' : '▲';
  }
  protected pctVi(p: number): string {
    return p.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  }
  protected tr(v: number): string {
    return (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  }
  protected mauCp(i: number): string {
    return MAU_CP[i % MAU_CP.length];
  }

  /** Đường gấp khúc sparkline 80×28 từ chuỗi 12 tháng. */
  protected spark(c: number[]): string {
    const max = Math.max(1, ...c);
    return c.map((v, i) => `${(i * 80) / Math.max(1, c.length - 1)},${26 - (v / max) * 24}`).join(' ');
  }

  private luoi(tran: number): { y: number; nhan: string }[] {
    return [0, 1, 2, 3, 4].map((i) => ({ y: 190 - (i * 170) / 4, nhan: ((tran * i) / 4 / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) }));
  }

  // ── Dòng tiền: cột Thu / Chi + đường số dư ──
  private readonly tranTien = computed(() => tranDep(Math.max(0, ...(this.d()?.dongTien ?? []).flatMap((t) => [t.thu, t.chi, t.soDu]))));
  protected readonly luoiTien = computed(() => this.luoi(this.tranTien()));
  protected readonly cotTien = computed(() => {
    const ts = this.d()?.dongTien ?? [];
    const tran = this.tranTien();
    const slot = 588 / Math.max(1, ts.length);
    const w = Math.min(20, slot * 0.36);
    const y = (v: number) => 190 - (Math.max(0, v) / tran) * 170;
    return ts.map((t, i) => {
      const x = 44 + i * slot + (slot - 2 * w - 2) / 2;
      return { t: t.t, thu: t.thu, chi: t.chi, soDu: t.soDu, x, w, yThu: y(t.thu), hThu: 190 - y(t.thu), yChi: y(t.chi), hChi: 190 - y(t.chi), yDu: y(t.soDu) };
    });
  });
  protected readonly duongDu = computed(() => this.cotTien().map((b) => `${b.x + b.w + 1},${b.yDu}`).join(' '));

  protected readonly nguonBar = computed(() => {
    const ds = this.d()?.soDuNguon ?? [];
    const max = Math.max(1, ...ds.map((n) => Math.abs(n.soDu)));
    return ds.map((n) => ({ id: n.id, nhan: `${NHAN_CT[n.congTy] ?? n.congTy} · ${n.ten}`, soDu: n.soDu, pct: (Math.abs(n.soDu) / max) * 100, mau: MAU_CT[n.congTy] ?? MAU_THU }));
  });

  // ── Tuổi nợ ──
  private readonly tranNo = computed(() => tranDep(Math.max(0, ...(this.d()?.tuoiNo ?? []).flatMap((t) => [t.phaiThu, t.phaiTra]))));
  protected readonly luoiNo = computed(() => this.luoi(this.tranNo()));
  protected readonly cotNo = computed(() => {
    const ts = this.d()?.tuoiNo ?? [];
    const tran = this.tranNo();
    const slot = 588 / Math.max(1, ts.length);
    const w = Math.min(24, slot * 0.3);
    const y = (v: number) => 190 - (Math.max(0, v) / tran) * 170;
    return ts.map((t, i) => ({ nhan: t.nhan, phaiThu: t.phaiThu, phaiTra: t.phaiTra, x: 44 + i * slot + (slot - 2 * w - 2) / 2, w, yThu: y(t.phaiThu), hThu: 190 - y(t.phaiThu), yTra: y(t.phaiTra), hTra: 190 - y(t.phaiTra) }));
  });

  // ── Donut ──
  private donut(ms: { nhan: string; v: number; mau: string }[]): Mieng[] {
    const tong = ms.reduce((s, m) => s + m.v, 0);
    let dau = 0;
    return ms.map((m) => {
      const pct = tong ? (m.v / tong) * 100 : 0;
      const dai = (pct / 100) * CHU_VI;
      const out: Mieng = { nhan: m.nhan, v: m.v, pct: Math.round(pct), mau: m.mau, dash: `${dai} ${CHU_VI - dai}`, offset: -dau };
      dau += dai;
      return out;
    });
  }
  protected readonly mPn = computed(() => this.donut((this.d()?.phaiThuPhapNhan ?? []).map((p) => ({ nhan: p.ten, v: p.soTien, mau: MAU_PN[p.ma] ?? '#b8bfc2' }))));
  protected readonly tongPn = computed(() => (this.d()?.phaiThuPhapNhan ?? []).reduce((s, p) => s + p.soTien, 0));
  protected readonly mCp = computed(() => this.donut((this.d()?.cpCoCau ?? []).map((c, i) => ({ nhan: c.ten, v: c.soTien, mau: MAU_CP[i % MAU_CP.length] }))));
  protected readonly tongCp = computed(() => (this.d()?.cpCoCau ?? []).reduce((s, c) => s + c.soTien, 0));

  // ── Chi phí cố định theo tháng (cột chồng) ──
  private readonly tranCp = computed(() => tranDep(Math.max(0, ...(this.d()?.cpTheoThang ?? []).map((t) => t.tong))));
  protected readonly luoiCp = computed(() => {
    const tran = this.tranCp();
    return [0, 1, 2, 3, 4].map((i) => ({ y: 220 - (i * 200) / 4, nhan: ((tran * i) / 4 / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) }));
  });
  protected readonly cotCp = computed(() => {
    const ts = this.d()?.cpTheoThang ?? [];
    const tran = this.tranCp();
    const slot = 588 / Math.max(1, ts.length);
    const w = Math.min(34, slot * 0.62);
    return ts.map((t, i) => {
      let y = 220;
      const o = t.theo.map((v, k) => {
        const h = (v / tran) * 200;
        y -= h;
        return { i: k, v, h, y, mau: MAU_CP[k % MAU_CP.length], ten: this.d()?.cpLoai[k] ?? '' };
      });
      return { t: t.t, tong: t.tong, x: 44 + i * slot + (slot - w) / 2, w, yTren: y, o };
    });
  });

  // ── Kết quả kinh doanh ──
  protected readonly kq = computed(() => {
    const k = this.d()?.kqkd;
    if (!k) return [];
    const p = (v: number) => (k.doanhThu > 0 ? this.pctVi(Math.round((v / k.doanhThu) * 1000) / 10) + '%' : '');
    return [
      { ten: 'Doanh thu thuần', v: k.doanhThu, pct: '', dam: true },
      { ten: 'Giá vốn hàng bán', v: -k.giaVon, pct: '', dam: false },
      { ten: 'Lợi nhuận gộp', v: k.loiNhuanGop, pct: p(k.loiNhuanGop), dam: true },
      { ten: 'Chi phí cố định', v: -k.cpCoDinh, pct: p(k.cpCoDinh), dam: false },
      { ten: 'Chi phí bán hàng biến đổi', v: -k.cpBienDoi, pct: p(k.cpBienDoi), dam: false },
      { ten: 'Lợi nhuận trước thuế', v: k.loiNhuanTruocThue, pct: p(k.loiNhuanTruocThue), dam: true },
    ];
  });
}
