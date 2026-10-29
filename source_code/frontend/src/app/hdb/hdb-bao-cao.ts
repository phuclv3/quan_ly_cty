import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { api } from '../core/api';
import { ttNhan } from '../core/trang-thai';
import { vndShort } from '../core/util';
import { chuVietTat, mauAvatar } from '../shared/avatar';
import { TrangThai } from '../shared/ui-kit';

/** Dữ liệu báo cáo do backend tính (GET /bao-cao/hop-dong-ban) — frontend chỉ vẽ. */
interface Kpi {
  hienTai: number;
  kyTruoc?: number | null;
  pct?: number | null;
  chuoi: number[];
}
interface Muc {
  ma: string;
  nhan: string;
  n: number;
}
interface BaoCao {
  capNhat: string;
  loc: { nam: number; quy: number | null; thang: number | null; phapNhan: string; soSanh: string };
  giaTri: Kpi;
  soHd: Kpi;
  binhQuan: Kpi;
  baoGia: number;
  huy: number;
  phatSinh: number;
  suCo: { hdQuaHan: number; suCoMo: number };
  thangs: { t: number; oxy: number; phuTai: number }[];
  trangThai: Muc[];
  duDkTatToan: number;
  daTatToan: number;
  sales: { id: string; giaTri: number; n: number }[];
  giaoHang: Muc[];
  thuTien: Muc[];
  nhomHang: { ten: string; giaTri: number }[];
  top: { id: string; soHD: string; tenKH: string; giaTri: number; trangThai: string; pctThu: number; sale: string }[];
}
interface Mieng {
  nhan: string;
  n: number;
  pct: number;
  mau: string;
  dash: string;
  offset: number;
}

const R = 36;
const CHU_VI = 2 * Math.PI * R;
const MAU_TT: Record<string, string> = { HIEU_LUC: '#14806f', DANG_GIAO_HANG: '#e0a31c', HOAN_THANH: '#4bb04f', DA_TAT_TOAN: '#3d4a52' };
const MAU_GIAO: Record<string, string> = { 'Chưa giao': '#b8bfc2', 'Giao một phần': '#e0a31c', 'Giao đủ': '#1f9d55', 'Không giao hàng': '#3b7bc9' };
const MAU_THU: Record<string, string> = { 'Chưa thu': '#b8bfc2', 'Thu một phần': '#e0a31c', 'Thu đủ': '#1f9d55' };
const MAU_NHOM = ['#0f5a2a', '#14806f', '#7ccf5b', '#e0a31c', '#3b7bc9', '#7b5cc4'];
const MAU_OXY = '#0f5a2a';
const MAU_PT = '#8e63c9';

/** Làm tròn trần trục tung lên số "đẹp" (1, 2, 2.5, 5 × 10ⁿ) để vạch chia chẵn. */
function tranDep(v: number): number {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / e;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e;
}

/** Tab "Báo cáo kinh doanh" của Hợp đồng bán — mọi số liệu lấy từ backend theo bộ lọc. */
@Component({
  selector: 'app-hdb-bao-cao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TrangThai],
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
        <option value="PHU_TAI" [selected]="pn() === 'PHU_TAI'">Phú Tài</option>
      </select>
      <select aria-label="So sánh" (change)="soSanh.set($any($event.target).value)">
        <option value="cungKy" [selected]="soSanh() === 'cungKy'">So sánh: cùng kỳ {{ +nam() - 1 }}</option>
        <option value="khong" [selected]="soSanh() === 'khong'">Không so sánh</option>
      </select>
      <span class="sp"></span>
      @if (dangTai()) { <span class="sub">Đang tải…</span> }
      @else if (d(); as x) { <span class="sub">Cập nhật {{ ngayVi(x.capNhat) }}</span> }
    </div>
    <p class="sub luu-y">Tính theo Ngày ký · không gồm Báo giá và HĐ Huỷ · giá trị chưa VAT · Pháp nhân theo ô "Thuộc Phú Tài" của HĐ.</p>

    @if (loi()) {
      <div class="note bad" role="alert">{{ loi() }} <button type="button" class="linkish" (click)="tai()">Thử lại</button></div>
    }
    @if (d(); as x) {
      <div class="kpis">
        <div class="k hero" title="Tổng giá trị trước VAT của các HĐ có Ngày ký trong kỳ">
          <span class="l">Giá trị HĐ ký (chưa VAT)</span>
          <b class="v">{{ short(x.giaTri.hienTai) }} @if (x.giaTri.pct != null) { <em class="pill" [class.xau]="x.giaTri.pct < 0">{{ mui(x.giaTri.pct) }} {{ abs(x.giaTri.pct) }}%</em> }</b>
          <span class="s">không phải doanh thu ghi nhận</span>
        </div>
        <div class="k" title="Số HĐ có Ngày ký trong kỳ">
          <span class="l">Số HĐ ký</span>
          <div class="kv"><b class="v">{{ x.soHd.hienTai }}</b><svg class="spark" viewBox="0 0 80 28" aria-hidden="true"><polyline [attr.points]="spark(x.soHd.chuoi)" /></svg></div>
          <span class="s">@if (x.soHd.pct != null) { <i class="dl" [class.xau]="x.soHd.pct < 0">{{ mui(x.soHd.pct) }} {{ abs(x.soHd.pct) }}%</i> }{{ x.phatSinh }} HĐ phát sinh · {{ x.baoGia }} báo giá · {{ x.huy }} HĐ huỷ</span>
        </div>
        <div class="k" title="Giá trị HĐ ký chia cho số HĐ ký">
          <span class="l">Giá trị HĐ bình quân</span>
          <div class="kv"><b class="v">{{ short(x.binhQuan.hienTai) }}</b><svg class="spark" viewBox="0 0 80 28" aria-hidden="true"><polyline [attr.points]="spark(x.binhQuan.chuoi)" /></svg></div>
          <span class="s">@if (x.binhQuan.pct != null) { <i class="dl" [class.xau]="x.binhQuan.pct < 0">{{ mui(x.binhQuan.pct) }} {{ abs(x.binhQuan.pct) }}%</i> }trên {{ x.soHd.hienTai }} HĐ ký</span>
        </div>
        <div class="k" [class.canh]="x.suCo.hdQuaHan > 0" title="HĐ đang giao hoặc đang thực hiện có sự cố phát sinh chưa xử lý và đã quá hạn xử lý">
          <span class="l">HĐ có sự cố quá hạn</span>
          <div class="kv"><b class="v">{{ x.suCo.hdQuaHan }}</b></div>
          <span class="s">{{ x.suCo.suCoMo }} sự cố đang mở</span>
        </div>
      </div>

      <div class="row-a">
        <section class="card-b">
          <h3>Giá trị HĐ ký theo tháng <span class="u">triệu đ · chưa VAT</span></h3>
          <svg class="bar" viewBox="0 0 640 230" role="img" aria-label="Giá trị HĐ ký theo tháng, tách OXY và Phú Tài">
            @for (g of luoi(); track g.y) {
              <line x1="44" x2="632" [attr.y1]="g.y" [attr.y2]="g.y" class="gl" />
              <text x="38" [attr.y]="g.y + 3" text-anchor="end" class="ax">{{ g.nhan }}</text>
            }
            @for (b of cot(); track b.t) {
              <rect [attr.x]="b.x" [attr.y]="b.yOxy" [attr.width]="b.w" [attr.height]="b.hOxy" [attr.fill]="mauOxy"><title>T{{ b.t }} — OXY {{ tr(b.oxy) }} triệu</title></rect>
              <rect [attr.x]="b.x" [attr.y]="b.yPt" [attr.width]="b.w" [attr.height]="b.hPt" [attr.fill]="mauPt"><title>T{{ b.t }} — Phú Tài {{ tr(b.phuTai) }} triệu</title></rect>
              @if (b.tong) { <text [attr.x]="b.x + b.w / 2" [attr.y]="b.yPt - 4" text-anchor="middle" class="ax v">{{ tr(b.tong) }}</text> }
              <text [attr.x]="b.x + b.w / 2" y="214" text-anchor="middle" class="ax">T{{ b.t }}</text>
            }
          </svg>
          <div class="chu-giai"><span><i [style.background]="mauOxy"></i>OXY</span><span><i [style.background]="mauPt"></i>Phú Tài</span></div>
        </section>

        <section class="card-b">
          <h3>Trạng thái hợp đồng</h3>
          <div class="donut-wrap">
            <svg class="donut" viewBox="0 0 100 100" role="img" aria-label="Trạng thái hợp đồng">
              @for (m of mieng(); track m.nhan) { <circle cx="50" cy="50" [attr.r]="r" fill="none" [attr.stroke]="m.mau" stroke-width="18" [attr.stroke-dasharray]="m.dash" [attr.stroke-dashoffset]="m.offset" transform="rotate(-90 50 50)" /> }
              <text x="50" y="52" text-anchor="middle" class="dn">{{ x.soHd.hienTai }}</text>
              <text x="50" y="62" text-anchor="middle" class="dl2">hợp đồng</text>
            </svg>
          </div>
          <ul class="ds-m">
            @for (m of mieng(); track m.nhan) { <li><i [style.background]="m.mau"></i><span>{{ m.nhan }}</span><b>{{ m.n }}</b><em>{{ m.pct }}%</em></li> }
          </ul>
          <p class="hop xanh">Đủ điều kiện tất toán: <b>{{ x.duDkTatToan }}</b> · Đã tất toán: <b>{{ x.daTatToan }}</b></p>
          @if (x.phatSinh) { <p class="hop do">⚠ {{ x.phatSinh }} HĐ đang có phát sinh (đợt quá hạn, phạt HĐ hoặc sự cố chưa xử lý)</p> }
        </section>
      </div>

      <div class="row-b">
        <section class="card-b">
          <h3>Giá trị HĐ ký theo người phụ trách <span class="u">triệu đ</span></h3>
          @for (s of salesBar(); track s.id) {
            <div class="hb"><span class="hl" [title]="s.ten">{{ s.ten }}</span><span class="hbar"><i [style.width.%]="s.pct" [style.background]="s.mau"></i></span><b class="num">{{ short(s.giaTri) }}</b></div>
          } @empty { <p class="empty">Chưa có HĐ ký trong kỳ.</p> }
        </section>
        <section class="card-b">
          <h3>Tiến độ giao hàng</h3>
          <div class="donut-wrap">
            <svg class="donut" viewBox="0 0 100 100" role="img" aria-label="Tiến độ giao hàng">
              @for (m of mGiao(); track m.nhan) { <circle cx="50" cy="50" [attr.r]="r" fill="none" [attr.stroke]="m.mau" stroke-width="18" [attr.stroke-dasharray]="m.dash" [attr.stroke-dashoffset]="m.offset" transform="rotate(-90 50 50)" /> }
              <text x="50" y="52" text-anchor="middle" class="dn">{{ x.soHd.hienTai }}</text>
              <text x="50" y="62" text-anchor="middle" class="dl2">hợp đồng</text>
            </svg>
          </div>
          <ul class="ds-m">
            @for (m of mGiao(); track m.nhan) { <li><i [style.background]="m.mau"></i><span>{{ m.nhan }}</span><b>{{ m.n }}</b><em>{{ m.pct }}%</em></li> }
          </ul>
        </section>
        <section class="card-b">
          <h3>Tiến độ thu tiền</h3>
          <div class="donut-wrap">
            <svg class="donut" viewBox="0 0 100 100" role="img" aria-label="Tiến độ thu tiền">
              @for (m of mThu(); track m.nhan) { <circle cx="50" cy="50" [attr.r]="r" fill="none" [attr.stroke]="m.mau" stroke-width="18" [attr.stroke-dasharray]="m.dash" [attr.stroke-dashoffset]="m.offset" transform="rotate(-90 50 50)" /> }
              <text x="50" y="52" text-anchor="middle" class="dn">{{ x.soHd.hienTai }}</text>
              <text x="50" y="62" text-anchor="middle" class="dl2">hợp đồng</text>
            </svg>
          </div>
          <ul class="ds-m">
            @for (m of mThu(); track m.nhan) { <li><i [style.background]="m.mau"></i><span>{{ m.nhan }}</span><b>{{ m.n }}</b><em>{{ m.pct }}%</em></li> }
          </ul>
        </section>
      </div>

      <div class="row-c">
        <section class="card-b">
          <h3>HĐ theo nhóm hàng <span class="u">triệu đ</span></h3>
          @for (n of nhomBar(); track n.ten) {
            <div class="hb"><span class="hl" [title]="n.ten">{{ n.ten }}</span><span class="hbar"><i [style.width.%]="n.pct" [style.background]="n.mau"></i></span><b class="num">{{ short(n.giaTri) }}</b></div>
          } @empty { <p class="empty">Chưa có HĐ ký trong kỳ.</p> }
        </section>
        <section class="card-b">
          <h3>Top 5 hợp đồng giá trị lớn</h3>
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th>Số HĐ</th><th>Khách hàng</th><th class="num">Giá trị</th><th>Trạng thái</th><th class="num">Đã thu</th><th>Phụ trách</th></tr></thead>
            <tbody>
              @for (r of x.top; track r.id) {
                <tr>
                  <td><a class="so" [routerLink]="['/hop-dong-ban', r.id]">{{ r.soHD || '(chưa có số)' }}</a></td>
                  <td class="kh">{{ r.tenKH }}</td>
                  <td class="num">{{ short(r.giaTri) }}</td>
                  <td><app-tt [v]="r.trangThai" /></td>
                  <td class="num">{{ r.pctThu }}%</td>
                  <td><span class="pt"><span class="av" [style.background]="mau(r.sale)">{{ vt(ten(r.sale)) }}</span>{{ ten(r.sale) }}</span></td>
                </tr>
              } @empty { <tr><td colspan="6" class="empty">Chưa có HĐ ký trong kỳ.</td></tr> }
            </tbody>
          </table></div>
        </section>
      </div>
    } @else if (!loi()) {
      <p class="sub">Đang tải báo cáo…</p>
    }
  `,
  styles: `
    :host { display: block; }
    .loc { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 6px; }
    .loc .sp { flex: 1 1 auto; }
    .loc select { width: auto; min-height: 36px; height: 36px; padding: 4px 14px; border-radius: 999px; background: var(--surf); border: 0; font-size: 13px; font-weight: 600; }
    .luu-y { margin: 0 0 12px; font-size: 12.5px; }
    .kpis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); margin-bottom: 12px; }
    .k { display: grid; gap: 4px; align-content: start; background: var(--surf); border-radius: 14px; padding: 12px 14px; min-width: 0; }
    .k.hero { background: linear-gradient(135deg, #0f7a3d, #19a05a); color: #fff; }
    .k.canh { background: #fdecea; }
    .k .l { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
    .k.hero .l, .k.hero .s { color: #fff; }
    .k .v { font-size: 26px; line-height: 1.15; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .k.canh .v { color: #a3261d; }
    .kv { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .k .s { font-size: 11.5px; color: var(--ink-3); }
    .pill { font-style: normal; font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 999px; background: rgba(255, 255, 255, 0.92); color: #0f5a2a; }
    .pill.xau { color: #a3261d; }
    .dl { font-style: normal; font-weight: 700; color: #1f7a45; margin-right: 6px; }
    .dl.xau { color: #a3261d; }
    .spark { width: 80px; height: 28px; flex: 0 0 auto; }
    .spark polyline { fill: none; stroke: #1f9d55; stroke-width: 1.8; stroke-linejoin: round; stroke-linecap: round; }
    .row-a { display: grid; gap: 14px; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); margin-bottom: 14px; }
    .row-b { display: grid; gap: 14px; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1fr); margin-bottom: 14px; }
    .row-c { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr) minmax(0, 2.3fr); }
    @media (max-width: 1000px) { .row-a, .row-b, .row-c { grid-template-columns: minmax(0, 1fr); } }
    .card-b { background: var(--surf); border-radius: 20px; padding: 18px 20px; min-width: 0; }
    .card-b h3 { font-size: 16px; font-weight: 700; margin: 0 0 14px; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .u { font-size: 12px; font-weight: 400; color: var(--ink-3); }
    .bar { width: 100%; height: auto; }
    .gl { stroke: var(--line); stroke-width: 1; }
    .ax { font-size: 10px; fill: var(--ink-3); }
    .ax.v { fill: var(--ink-2); font-weight: 600; }
    .chu-giai { display: flex; gap: 16px; font-size: 12.5px; color: var(--ink-2); margin-top: 6px; }
    .chu-giai i, .ds-m i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; }
    .chu-giai i { margin-right: 6px; }
    .donut-wrap { display: grid; place-items: center; margin: 4px 0 10px; }
    .donut { width: 190px; height: 190px; }
    .dn { font-size: 15px; font-weight: 800; fill: var(--ink); }
    .dl2 { font-size: 6px; fill: var(--ink-3); }
    .ds-m { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; font-size: 13px; }
    .ds-m li { display: grid; grid-template-columns: 10px minmax(0, 1fr) 34px 44px; align-items: center; gap: 10px; }
    .ds-m li b { text-align: right; }
    .ds-m li span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ds-m li em { font-style: normal; color: var(--ink-3); text-align: right; }
    .ds-m i { border-radius: 50%; }
    .hop { margin: 10px 0 0; padding: 8px 12px; border-radius: 8px; font-size: 12.5px; }
    .hop.xanh { background: var(--surf-2); color: var(--ink-2); }
    .hop.do { background: #fdecea; color: #a3261d; font-weight: 600; }
    .hb { display: grid; grid-template-columns: 112px 1fr 66px; align-items: center; gap: 10px; margin-bottom: 14px; font-size: 13px; }
    .hl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hbar { height: 14px; border-radius: 7px; background: var(--surf-3); overflow: hidden; }
    .hbar i { display: block; height: 100%; border-radius: 7px; }
    .hb .num { text-align: right; font-weight: 700; }
    .empty { color: var(--ink-3); font-size: 13px; }
    .tbl-wrap { border: 0; border-radius: 0; box-shadow: none; overflow: auto; background: none; }
    .tbl { font-size: 13px; }
    .tbl th, .tbl td { padding: 12px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
    .tbl tbody tr:last-child td { border-bottom: 0; }
    .tbl thead th { background: var(--surf-2); font-size: 12.5px; font-weight: 700; white-space: nowrap; }
    .tbl thead th:first-child { border-radius: 10px 0 0 10px; }
    .tbl thead th:last-child { border-radius: 0 10px 10px 0; }
    .tbl .so { font-weight: 700; color: var(--brand); text-decoration: none; white-space: nowrap; }
    .tbl .kh { min-width: 130px; max-width: 200px; line-height: 1.4; }
    .pt { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
    .av { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 700; flex: 0 0 auto; }
  `,
})
export class HdbBaoCao {
  private readonly store = inject(Store);
  protected readonly short = vndShort;
  protected readonly r = R;
  protected readonly mauOxy = MAU_OXY;
  protected readonly mauPt = MAU_PT;
  protected readonly mau = mauAvatar;
  protected readonly vt = chuVietTat;
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

  protected readonly d = signal<BaoCao | null>(null);
  protected readonly dangTai = signal(false);
  protected readonly loi = signal('');
  private seq = 0;

  constructor() {
    // Đổi bộ lọc, hoặc dữ liệu chung đổi phiên bản (có người sửa HĐ) → tải lại từ backend.
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
      const x = await api<BaoCao>('GET', `/bao-cao/hop-dong-ban?${q}`);
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

  protected readonly ten = (id: string) => this.store.userName(id);
  protected ngayVi(iso: string): string {
    return iso.split('-').reverse().join('/');
  }
  protected mui(p: number): string {
    return p < 0 ? '▼' : '▲';
  }
  protected tr(v: number): string {
    return (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  }

  /** Đường gấp khúc sparkline 80×28 từ chuỗi 12 tháng. */
  protected spark(c: number[]): string {
    const max = Math.max(1, ...c);
    return c.map((v, i) => `${(i * 80) / Math.max(1, c.length - 1)},${26 - (v / max) * 24}`).join(' ');
  }

  // ── Cột chồng OXY / Phú Tài ──
  private readonly tran = computed(() => tranDep(Math.max(0, ...(this.d()?.thangs ?? []).map((t) => (t.oxy + t.phuTai) / 1e6))));
  protected readonly luoi = computed(() => {
    const tran = this.tran();
    return [0, 1, 2, 3, 4].map((i) => ({ y: 190 - (i * 170) / 4, nhan: (tran * i / 4).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) }));
  });
  protected readonly cot = computed(() => {
    const ts = this.d()?.thangs ?? [];
    const tran = this.tran() * 1e6;
    const slot = 588 / Math.max(1, ts.length);
    const w = Math.min(34, slot * 0.62);
    return ts.map((t, i) => {
      const hOxy = (t.oxy / tran) * 170;
      const hPt = (t.phuTai / tran) * 170;
      return { t: t.t, oxy: t.oxy, phuTai: t.phuTai, tong: t.oxy + t.phuTai, x: 44 + i * slot + (slot - w) / 2, w, hOxy, hPt, yOxy: 190 - hOxy, yPt: 190 - hOxy - hPt };
    });
  });

  // ── Donut ──
  private donut(ms: Muc[], mau: (m: Muc) => string, nhan: (m: Muc) => string): Mieng[] {
    const tong = ms.reduce((s, m) => s + m.n, 0);
    let dau = 0;
    return ms.map((m) => {
      const pct = tong ? (m.n / tong) * 100 : 0;
      const dai = (pct / 100) * CHU_VI;
      const out: Mieng = { nhan: nhan(m), n: m.n, pct: Math.round(pct), mau: mau(m), dash: `${dai} ${CHU_VI - dai}`, offset: -dau };
      dau += dai;
      return out;
    });
  }
  protected readonly mieng = computed(() => this.donut(this.d()?.trangThai ?? [], (m) => MAU_TT[m.ma] ?? '#b8bfc2', (m) => ttNhan(m.ma as never)));
  protected readonly mGiao = computed(() => this.donut(this.d()?.giaoHang ?? [], (m) => MAU_GIAO[m.ma] ?? '#b8bfc2', (m) => m.nhan));
  protected readonly mThu = computed(() => this.donut(this.d()?.thuTien ?? [], (m) => MAU_THU[m.ma] ?? '#b8bfc2', (m) => m.nhan));

  // ── Thanh ngang ──
  protected readonly salesBar = computed(() => {
    const ds = this.d()?.sales ?? [];
    const max = Math.max(1, ...ds.map((s) => s.giaTri));
    return ds.map((s, i) => ({ id: s.id, ten: this.store.userName(s.id), giaTri: s.giaTri, pct: (s.giaTri / max) * 100, mau: MAU_NHOM[i % MAU_NHOM.length] }));
  });
  protected readonly nhomBar = computed(() => {
    const ds = this.d()?.nhomHang ?? [];
    const max = Math.max(1, ...ds.map((n) => n.giaTri));
    return ds.map((n, i) => ({ ten: n.ten, giaTri: n.giaTri, pct: (n.giaTri / max) * 100, mau: MAU_NHOM[i % MAU_NHOM.length] }));
  });
}
