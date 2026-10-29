import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { giaTriPhieu, lechKiemKe, tonTheoLo } from '../core/calc';
import { BinhKhi, KHO_CHUYEN_THANG, PhieuKho } from '../core/models';
import { Store } from '../core/store';
import { TT } from '../core/trang-thai';
import { daysFromToday, sum, todayIso, viDate, vndShort } from '../core/util';
import { xuatExcel } from '../shared/export';

const R = 36;
const CHU_VI = 2 * Math.PI * R;
const MAU_NHAP = '#14806f';
const MAU_XUAT = '#0f5a2a';
const MAU_NHOM = ['#0f5a2a', '#14806f', '#7ccf5b', '#e0a31c', '#b8bfc2'];
const TUOI = [
  { ten: '0–30 ngày', tu: 0, den: 30 },
  { ten: '31–90 ngày', tu: 31, den: 90 },
  { ten: '91–180 ngày', tu: 91, den: 180 },
  { ten: '> 180 ngày', tu: 181, den: Infinity },
];
const MAU_TUOI = ['#0f7a3d', '#7ccf5b', '#e0a31c', '#d9483b'];
/** Bình còn ≤ số ngày này tới hạn sử dụng thì tính là sắp hết hạn. */
const NGAY_SAP_HET_HAN = 90;

function tranDep(v: number): number {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / e;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e;
}

const pad = (n: number) => String(n).padStart(2, '0');
const cuoiThang = (nam: number, thang: number) => `${nam}-${pad(thang)}-${pad(new Date(nam, thang, 0).getDate())}`;

/** Tab "Báo cáo kho": nhập – xuất, tồn, luân chuyển, kiểm kê. Tính trên frontend từ phiếu kho, lô tồn, bình khí và kiểm kê. */
@Component({
  selector: 'app-kho-bao-cao',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      <select aria-label="So sánh" (change)="soSanh.set($any($event.target).value)">
        <option value="cungKy" [selected]="soSanh() === 'cungKy'">So sánh: cùng kỳ {{ +nam() - 1 }}</option>
        <option value="khong" [selected]="soSanh() === 'khong'">Không so sánh</option>
      </select>
      <span class="sp"></span>
      <span class="sub">Cập nhật {{ homNay }}</span>
      <button type="button" class="btn sm quiet" (click)="xuat()">Xuất Excel</button>
    </div>
    <p class="sub luu-y">Giá trị theo đơn giá lô (giá vốn), chưa VAT; phiếu Đã huỷ và kho Chuyển thẳng không tính. Tuổi tồn tính từ ngày nhập lô. Chưa có hạn giao hàng và tình trạng vỏ bình nên không có chỉ tiêu giao đúng hạn.</p>

    <div class="kpis">
      <div class="k hero">
        <span class="l">Giá trị nhập trong kỳ</span>
        <b class="v">{{ short(ky().nhap) }} @if (dNhap() !== null) { <em class="pill" [class.xau]="dNhap()! < 0">{{ dNhap()! < 0 ? '▼' : '▲' }} {{ abs(dNhap()!) }}%</em> }</b>
        <span class="s">theo đơn giá từng lô</span>
      </div>
      <div class="k">
        <span class="l">Giá vốn xuất trong kỳ</span>
        <div class="kv"><b class="v">{{ short(ky().xuat) }}</b><svg class="spark" viewBox="0 0 80 28" aria-hidden="true"><polyline [attr.points]="spark()" /></svg></div>
        <span class="s">@if (dXuat() !== null) { <i class="dl" [class.xau]="dXuat()! < 0">{{ dXuat()! < 0 ? '▼' : '▲' }} {{ abs(dXuat()!) }}%</i> }xuất bán theo HĐ</span>
      </div>
      <div class="k">
        <span class="l">Số ngày tồn bình quân</span>
        <div class="kv"><b class="v">{{ ngayTon() === null ? '—' : ngayTon() }}</b></div>
        <span class="s">@if (dNgayTon() !== null) { <i class="dl" [class.xau]="dNgayTon()! > 0">{{ dNgayTon()! > 0 ? '▲' : '▼' }} {{ abs(dNgayTon()!) }}</i> }ngày · theo giá vốn xuất</span>
      </div>
      <div class="k">
        <span class="l">Phiếu xuất trong kỳ</span>
        <b class="v">{{ ky().soXuat }}</b>
        <span class="s">{{ ky().soNhap }} phiếu nhập</span>
      </div>
    </div>

    <div class="row-a">
      <section class="card-b">
        <h3>Nhập – xuất theo tháng <span class="u">triệu đ · giá vốn</span></h3>
        <svg class="bar" viewBox="0 0 640 230" role="img" aria-label="Nhập xuất theo tháng">
          @for (g of luoi(); track g.y) {
            <line x1="44" x2="632" [attr.y1]="g.y" [attr.y2]="g.y" class="gl" />
            <text x="38" [attr.y]="g.y + 3" text-anchor="end" class="ax">{{ g.nhan }}</text>
          }
          @for (b of cot(); track b.t) {
            <rect [attr.x]="b.x" [attr.y]="b.yN" [attr.width]="b.w" [attr.height]="b.hN" [attr.fill]="mauNhap"><title>T{{ b.t }} — Nhập {{ tr(b.nhap) }} triệu</title></rect>
            <rect [attr.x]="b.x + b.w + 2" [attr.y]="b.yX" [attr.width]="b.w" [attr.height]="b.hX" [attr.fill]="mauXuat"><title>T{{ b.t }} — Xuất {{ tr(b.xuat) }} triệu</title></rect>
            <text [attr.x]="b.x + b.w + 1" y="214" text-anchor="middle" class="ax">T{{ b.t }}</text>
          }
        </svg>
        <div class="chu-giai"><span><i [style.background]="mauNhap"></i>Nhập</span><span><i [style.background]="mauXuat"></i>Xuất</span></div>
        <p class="hop">Tồn cuối kỳ {{ short(tonCuoi()) }} · Đầu kỳ + Nhập − Xuất = Cuối kỳ</p>
      </section>

      <section class="card-b">
        <h3>Cơ cấu giá trị tồn theo nhóm hàng</h3>
        <div class="donut-wrap">
          <svg class="donut" viewBox="0 0 100 100" role="img" aria-label="Cơ cấu giá trị tồn theo nhóm hàng">
            @for (m of nhom(); track m.nhan) { <circle cx="50" cy="50" [attr.r]="r" fill="none" [attr.stroke]="m.mau" stroke-width="18" [attr.stroke-dasharray]="m.dash" [attr.stroke-dashoffset]="m.offset" transform="rotate(-90 50 50)" /> }
            <text x="50" y="52" text-anchor="middle" class="dn">{{ short(tonHienTai()) }}</text>
          </svg>
        </div>
        <ul class="ds-m">
          @for (m of nhom(); track m.nhan) { <li><i [style.background]="m.mau"></i><span>{{ m.nhan }}</span><b>{{ short(m.giaTri) }}</b><em>{{ m.pct }}%</em></li> }
          @empty { <li class="empty">Chưa có tồn.</li> }
        </ul>
      </section>
    </div>

    <div class="row-b">
      <section class="card-b">
        <h3>Tuổi tồn kho <span class="u">giá trị</span></h3>
        @for (t of tuoi(); track t.ten) {
          <div class="hb"><span class="hl">{{ t.ten }}</span><span class="hbar"><i [style.width.%]="t.pct" [style.background]="t.mau"></i></span><b class="num">{{ short(t.giaTri) }}</b></div>
        }
      </section>
      <section class="card-b">
        <h3>Bình theo hạn sử dụng <span class="u">số bình</span></h3>
        @for (t of hanBinh(); track t.ten) {
          <div class="hb"><span class="hl">{{ t.ten }}</span><span class="hbar"><i [style.width.%]="t.pct" [style.background]="t.mau"></i></span><b class="num">{{ t.n }}</b></div>
        }
        <p class="hop">Theo danh sách bình khí có số serial (tab Bình &amp; tem).</p>
      </section>
      <section class="card-b">
        <h3>Phiếu xuất theo tháng <span class="u">số phiếu</span></h3>
        <svg class="bar" viewBox="0 0 640 230" role="img" aria-label="Số phiếu xuất theo tháng">
          @for (g of luoiPhieu(); track g.y) {
            <line x1="44" x2="632" [attr.y1]="g.y" [attr.y2]="g.y" class="gl" />
            <text x="38" [attr.y]="g.y + 3" text-anchor="end" class="ax">{{ g.nhan }}</text>
          }
          @for (b of cotPhieu(); track b.t) {
            <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" [attr.fill]="mauXuat"><title>T{{ b.t }} — {{ b.n }} phiếu</title></rect>
            <text [attr.x]="b.x + b.w / 2" y="214" text-anchor="middle" class="ax">T{{ b.t }}</text>
          }
        </svg>
      </section>
    </div>

    <div class="row-c">
      <section class="card-b">
        <h3>Mã hàng chậm luân chuyển</h3>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Mã hàng</th><th>Mô tả</th><th class="num">Tồn</th><th class="num">Giá trị</th><th>Không xuất</th></tr></thead>
          <tbody>
            @for (x of cham(); track x.id) {
              <tr>
                <td class="so">{{ x.id }}</td>
                <td class="kh">{{ x.moTa }}</td>
                <td class="num">{{ x.ton }}</td>
                <td class="num">{{ short(x.giaTri) }}</td>
                <td><span class="st" [class]="'st ' + (x.ngay > 180 ? 'bad' : 'warn')">{{ x.ngay }} ngày</span></td>
              </tr>
            } @empty { <tr><td colspan="5" class="empty">Không có mã tồn.</td></tr> }
          </tbody>
        </table></div>
      </section>

      <section class="card-b">
        <h3>Kết quả kiểm kê</h3>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Kỳ</th><th>Kho</th><th>Mã lệch</th><th class="num">Giá trị</th><th>Trạng thái</th></tr></thead>
          <tbody>
            @for (x of kiemKe(); track x.id) {
              <tr>
                <td>{{ x.ky }}</td>
                <td>{{ x.kho }}</td>
                <td class="kh">@if (x.ma) { <b>{{ x.ma }}</b> <span class="sub">{{ x.them }}</span> } @else { Không lệch }</td>
                <td class="num" [class.neg]="x.giaTri < 0">{{ x.giaTri ? (x.giaTri > 0 ? '+' : '−') + short(abs(x.giaTri)) : '0' }}</td>
                <td><span class="st" [class]="'st ' + x.mau">{{ x.tt }}</span></td>
              </tr>
            } @empty { <tr><td colspan="5" class="empty">Chưa có đợt kiểm kê.</td></tr> }
          </tbody>
        </table></div>
      </section>
    </div>
  `,
  styles: `
    :host { display: block; }
    .loc { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 6px; }
    .loc .sp { flex: 1 1 auto; }
    .loc select { width: auto; min-height: 36px; height: 36px; padding: 4px 14px; border-radius: 999px; background: var(--surf); border: 0; font-size: 13px; font-weight: 600; }
    .luu-y { margin: 0 0 12px; font-size: 12.5px; }
    .kpis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); margin-bottom: 12px; }
    .k { display: grid; gap: 4px; align-content: start; background: var(--surf); border-radius: 14px; padding: 12px 14px; min-width: 0; }
    .k.hero { background: linear-gradient(135deg, #0f7a3d, #4bb04f); color: #fff; }
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
    .row-a { display: grid; gap: 14px; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); margin-bottom: 14px; }
    .row-b { display: grid; gap: 14px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 14px; }
    .row-c { display: grid; gap: 14px; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); }
    @media (max-width: 1000px) { .row-a, .row-b, .row-c { grid-template-columns: minmax(0, 1fr); } }
    .card-b { background: var(--surf); border-radius: 20px; padding: 18px 20px; min-width: 0; }
    .card-b h3 { font-size: 16px; font-weight: 700; margin: 0 0 14px; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .u { font-size: 12px; font-weight: 400; color: var(--ink-3); }
    .bar { width: 100%; height: auto; }
    .gl { stroke: var(--line); stroke-width: 1; }
    .ax { font-size: 10px; fill: var(--ink-3); }
    .chu-giai { display: flex; gap: 16px; font-size: 12.5px; color: var(--ink-2); margin-top: 6px; }
    .chu-giai i, .ds-m i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; }
    .chu-giai i { margin-right: 6px; }
    .donut-wrap { display: grid; place-items: center; margin: 4px 0 10px; }
    .donut { width: 170px; height: 170px; }
    .dn { font-size: 13px; font-weight: 800; fill: var(--ink); }
    .ds-m { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; font-size: 13px; }
    .ds-m li { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto 40px; align-items: center; gap: 10px; }
    .ds-m li b { text-align: right; }
    .ds-m li em { font-style: normal; color: var(--ink-3); text-align: right; }
    .ds-m i { border-radius: 50%; }
    .hop { margin: 10px 0 0; padding: 8px 12px; border-radius: 8px; font-size: 12.5px; background: var(--panel); color: var(--ink-2); }
    .hb { display: grid; grid-template-columns: 110px 1fr 56px; align-items: center; gap: 10px; margin-bottom: 14px; font-size: 13px; }
    .hl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hbar { height: 14px; border-radius: 7px; background: var(--panel); overflow: hidden; }
    .hbar i { display: block; height: 100%; border-radius: 7px; }
    .hb .num { text-align: right; font-weight: 700; }
    .empty { color: var(--ink-3); font-size: 13px; }
    .tbl-wrap { border: 0; border-radius: 0; box-shadow: none; overflow: auto; background: none; }
    .tbl { font-size: 13px; }
    .tbl th, .tbl td { padding: 10px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
    .tbl tbody tr:last-child td { border-bottom: 0; }
    .tbl thead th { background: var(--panel); font-size: 12.5px; font-weight: 700; white-space: nowrap; }
    .tbl .so { font-weight: 700; color: var(--brand); white-space: nowrap; }
    .tbl .kh { min-width: 120px; max-width: 200px; line-height: 1.4; }
    .st { display: inline-block; padding: 1px 8px; border-radius: 6px; font-size: 11.5px; font-weight: 600; white-space: nowrap; background: var(--mute-bg); color: var(--mute-fg); }
    .st.ok { background: #dff3e4; color: #17663f; }
    .st.warn { background: #fbf0d6; color: #8a5a00; }
    .st.bad { background: #fbe4e1; color: #a3261d; }
  `,
})
export class KhoBaoCao {
  private readonly store = inject(Store);
  protected readonly short = vndShort;
  protected readonly r = R;
  protected readonly mauNhap = MAU_NHAP;
  protected readonly mauXuat = MAU_XUAT;
  protected readonly abs = Math.abs;
  protected readonly homNay = viDate(todayIso());
  protected readonly nams = (() => {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2, y - 3];
  })();
  protected readonly thangOpts = Array.from({ length: 12 }, (_, i) => i + 1);

  protected readonly nam = signal(String(new Date().getFullYear()));
  protected readonly quy = signal('');
  protected readonly thang = signal('');
  protected readonly soSanh = signal('cungKy');

  protected chonQuy(v: string): void {
    this.quy.set(v);
    if (v) this.thang.set('');
  }
  protected chonThang(v: string): void {
    this.thang.set(v);
    if (v) this.quy.set('');
  }
  protected tr(v: number): string {
    return (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  }

  /** Phiếu Hiệu lực của kho thường. */
  private readonly phieu = computed(() => this.store.db().phieuKho.filter((p) => p.trangThai === TT.HIEU_LUC && p.kho !== KHO_CHUYEN_THANG));

  /** Khoảng ngày của kỳ đang chọn trong năm `nam`. */
  private khoang(nam: number): { tu: string; den: string } {
    const t = +this.thang();
    const q = +this.quy();
    if (t) return { tu: `${nam}-${pad(t)}-01`, den: cuoiThang(nam, t) };
    if (q) return { tu: `${nam}-${pad(q * 3 - 2)}-01`, den: cuoiThang(nam, q * 3) };
    return { tu: `${nam}-01-01`, den: `${nam}-12-31` };
  }
  private tongKy(nam: number) {
    const { tu, den } = this.khoang(nam);
    const trong = this.phieu().filter((p) => p.ngay >= tu && p.ngay <= den);
    const nhap = trong.filter((p) => p.loai === 'Nhập');
    const xuat = trong.filter((p) => p.loai === 'Xuất');
    const denTinh = den > todayIso() ? todayIso() : den;
    const soNgay = Math.max(1, Math.round((new Date(denTinh).getTime() - new Date(tu).getTime()) / 864e5) + 1);
    const giaTriNhap = sum(nhap, giaTriPhieu);
    const giaTriXuat = sum(xuat, giaTriPhieu);
    const tonCuoi = sum(tonTheoLo(this.store.db(), denTinh).filter((l) => l.kho !== KHO_CHUYEN_THANG), (l) => l.giaTriTon);
    return { nhap: giaTriNhap, xuat: giaTriXuat, soNhap: nhap.length, soXuat: xuat.length, tonCuoi, soNgay };
  }
  protected readonly ky = computed(() => this.tongKy(+this.nam()));
  private readonly kyTruoc = computed(() => (this.soSanh() === 'cungKy' ? this.tongKy(+this.nam() - 1) : null));
  private pct(a: number, b?: number): number | null {
    return b && b > 0 ? Math.round(((a - b) / b) * 100) : null;
  }
  protected readonly dNhap = computed(() => this.pct(this.ky().nhap, this.kyTruoc()?.nhap));
  protected readonly dXuat = computed(() => this.pct(this.ky().xuat, this.kyTruoc()?.xuat));
  private dio(k: { xuat: number; tonCuoi: number; soNgay: number }): number | null {
    return k.xuat > 0 ? Math.round((k.tonCuoi / k.xuat) * k.soNgay) : null;
  }
  protected readonly ngayTon = computed(() => this.dio(this.ky()));
  protected readonly dNgayTon = computed(() => {
    const a = this.ngayTon();
    const t = this.kyTruoc();
    const b = t ? this.dio(t) : null;
    return a !== null && b !== null ? a - b : null;
  });
  protected readonly tonCuoi = computed(() => this.ky().tonCuoi);

  // ── Biểu đồ nhập – xuất theo tháng (cả năm đã chọn) ──
  private readonly thangs = computed(() => {
    const nam = +this.nam();
    const out = Array.from({ length: 12 }, (_, i) => ({ t: i + 1, nhap: 0, xuat: 0, soXuat: 0 }));
    for (const p of this.phieu()) {
      if (+p.ngay.slice(0, 4) !== nam) continue;
      const o = out[+p.ngay.slice(5, 7) - 1];
      if (p.loai === 'Nhập') o.nhap += giaTriPhieu(p);
      else {
        o.xuat += giaTriPhieu(p);
        o.soXuat++;
      }
    }
    return out;
  });
  protected readonly spark = computed(() => {
    const c = this.thangs().map((t) => t.xuat);
    const max = Math.max(1, ...c);
    return c.map((v, i) => `${(i * 80) / (c.length - 1)},${26 - (v / max) * 24}`).join(' ');
  });
  private readonly tran = computed(() => tranDep(Math.max(0, ...this.thangs().flatMap((t) => [t.nhap / 1e6, t.xuat / 1e6]))));
  protected readonly luoi = computed(() => {
    const tran = this.tran();
    return [0, 1, 2, 3, 4].map((i) => ({ y: 190 - (i * 170) / 4, nhan: ((tran * i) / 4).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) }));
  });
  protected readonly cot = computed(() => {
    const tran = this.tran() * 1e6;
    const slot = 588 / 12;
    const w = Math.min(15, slot * 0.34);
    return this.thangs().map((t, i) => {
      const hN = (t.nhap / tran) * 170;
      const hX = (t.xuat / tran) * 170;
      return { ...t, x: 44 + i * slot + (slot - 2 * w - 2) / 2, w, hN, hX, yN: 190 - hN, yX: 190 - hX };
    });
  });
  private readonly tranPhieu = computed(() => Math.max(1, Math.ceil(Math.max(0, ...this.thangs().map((t) => t.soXuat)) / 4) * 4));
  protected readonly luoiPhieu = computed(() => [0, 1, 2, 3, 4].map((i) => ({ y: 190 - (i * 170) / 4, nhan: String((this.tranPhieu() * i) / 4) })));
  protected readonly cotPhieu = computed(() => {
    const slot = 588 / 12;
    const w = Math.min(30, slot * 0.62);
    return this.thangs().map((t, i) => {
      const h = (t.soXuat / this.tranPhieu()) * 170;
      return { t: t.t, n: t.soXuat, x: 44 + i * slot + (slot - w) / 2, w, h, y: 190 - h };
    });
  });

  // ── Tồn hiện tại ──
  private readonly loTon = computed(() => tonTheoLo(this.store.db()).filter((l) => l.kho !== KHO_CHUYEN_THANG && l.ton > 0));
  protected readonly tonHienTai = computed(() => sum(this.loTon(), (l) => l.giaTriTon));
  protected readonly nhom = computed(() => {
    const theo = new Map<string, number>();
    for (const l of this.loTon()) {
      const n = this.store.loaiHangById(l.loaiHang)?.nhom ?? 'Khác';
      theo.set(n, (theo.get(n) ?? 0) + l.giaTriTon);
    }
    const xs = [...theo].map(([nhan, giaTri]) => ({ nhan, giaTri })).sort((a, b) => b.giaTri - a.giaTri);
    const top = xs.slice(0, 4);
    const khac = sum(xs.slice(4), (x) => x.giaTri);
    if (khac > 0) top.push({ nhan: 'Khác', giaTri: khac });
    const tong = sum(top, (x) => x.giaTri);
    let dau = 0;
    return top.map((x, i) => {
      const pct = tong ? (x.giaTri / tong) * 100 : 0;
      const dai = (pct / 100) * CHU_VI;
      const out = { ...x, pct: Math.round(pct), mau: MAU_NHOM[i], dash: `${dai} ${CHU_VI - dai}`, offset: -dau };
      dau += dai;
      return out;
    });
  });
  protected readonly tuoi = computed(() => {
    const xs = TUOI.map((t) => ({ ten: t.ten, giaTri: sum(this.loTon().filter((l) => -daysFromToday(l.ngay) >= t.tu && -daysFromToday(l.ngay) <= t.den), (l) => l.giaTriTon) }));
    const max = Math.max(1, ...xs.map((x) => x.giaTri));
    return xs.map((x, i) => ({ ...x, pct: (x.giaTri / max) * 100, mau: MAU_TUOI[i] }));
  });

  // ── Bình theo hạn sử dụng ──
  protected readonly hanBinh = computed(() => {
    const bs: BinhKhi[] = this.store.binhKhi();
    const xs = [
      { ten: 'Còn hạn', n: bs.filter((b) => daysFromToday(b.hanSD) > NGAY_SAP_HET_HAN).length, mau: MAU_TUOI[0] },
      { ten: `Sắp hết hạn (≤ ${NGAY_SAP_HET_HAN} ngày)`, n: bs.filter((b) => daysFromToday(b.hanSD) >= 0 && daysFromToday(b.hanSD) <= NGAY_SAP_HET_HAN).length, mau: MAU_TUOI[2] },
      { ten: 'Đã hết hạn', n: bs.filter((b) => daysFromToday(b.hanSD) < 0).length, mau: MAU_TUOI[3] },
    ];
    const max = Math.max(1, ...xs.map((x) => x.n));
    return xs.map((x) => ({ ...x, pct: (x.n / max) * 100 }));
  });

  // ── Mã chậm luân chuyển: số ngày kể từ lần xuất gần nhất (chưa xuất thì từ lần nhập đầu) ──
  protected readonly cham = computed(() => {
    const cuoiXuat = new Map<string, string>();
    const dauNhap = new Map<string, string>();
    for (const p of this.phieu() as PhieuKho[])
      for (const d of p.dong) {
        const m = p.loai === 'Xuất' ? cuoiXuat : dauNhap;
        const cu = m.get(d.loaiHang);
        if (!cu || (p.loai === 'Xuất' ? p.ngay > cu : p.ngay < cu)) m.set(d.loaiHang, p.ngay);
      }
    const theo = new Map<string, { ton: number; giaTri: number }>();
    for (const l of this.loTon()) {
      const x = theo.get(l.loaiHang) ?? { ton: 0, giaTri: 0 };
      x.ton += l.ton;
      x.giaTri += l.giaTriTon;
      theo.set(l.loaiHang, x);
    }
    return [...theo]
      .map(([id, x]) => {
        const moc = cuoiXuat.get(id) ?? dauNhap.get(id);
        const lh = this.store.loaiHangById(id);
        return { id, moTa: lh?.moTa || lh?.ten || '', ton: x.ton, giaTri: x.giaTri, ngay: moc ? -daysFromToday(moc) : 0 };
      })
      .sort((a, b) => b.ngay - a.ngay)
      .slice(0, 5);
  });

  // ── Kết quả kiểm kê gần đây ──
  protected readonly kiemKe = computed(() => {
    const db = this.store.db();
    const donGia = new Map<string, number>();
    for (const l of tonTheoLo(db)) donGia.set(l.loaiHang, l.donGia);
    return [...this.store.kiemKe()]
      .sort((a, b) => b.ngay.localeCompare(a.ngay))
      .slice(0, 5)
      .map((k) => {
        const lech = lechKiemKe(db, k).filter((r) => r.lech !== 0);
        const giaTri = sum(lech, (r) => r.lech * (donGia.get(r.loaiHang) ?? 0));
        const daChinh = !!k.phieuDieuChinh?.length;
        return {
          id: k.id,
          ky: `${k.ngay.slice(5, 7)}/${k.ngay.slice(0, 4)}`,
          kho: this.store.khoTen(k.kho),
          ma: lech[0]?.loaiHang ?? '',
          them: lech.length > 1 ? `+${lech.length - 1} mã` : lech[0] ? `${lech[0].lech > 0 ? '+' : ''}${lech[0].lech}` : '',
          giaTri,
          tt: !lech.length ? 'Khớp' : daChinh ? 'Đã chỉnh' : 'Đang xử lý',
          mau: !lech.length ? 'ok' : daChinh ? 'ok' : 'warn',
        };
      });
  });

  protected xuat(): void {
    const k = this.ky();
    const rows: (string | number)[][] = [
      [`Báo cáo kho — năm ${this.nam()}${this.quy() ? ' quý ' + this.quy() : ''}${this.thang() ? ' tháng ' + this.thang() : ''}`],
      ['Giá trị nhập', Math.round(k.nhap)],
      ['Giá vốn xuất', Math.round(k.xuat)],
      ['Tồn cuối kỳ', Math.round(k.tonCuoi)],
      ['Số ngày tồn bình quân', this.ngayTon() ?? ''],
      [],
      ['Tháng', 'Nhập', 'Xuất', 'Số phiếu xuất'],
      ...this.thangs().map((t) => ['T' + t.t, Math.round(t.nhap), Math.round(t.xuat), t.soXuat]),
      [],
      ['Tuổi tồn', 'Giá trị'],
      ...this.tuoi().map((t) => [t.ten, Math.round(t.giaTri)]),
      [],
      ['Mã chậm luân chuyển', 'Tồn', 'Giá trị', 'Số ngày không xuất'],
      ...this.cham().map((x) => [x.id, x.ton, Math.round(x.giaTri), x.ngay]),
    ];
    void xuatExcel('bao-cao-kho', rows);
  }
}
