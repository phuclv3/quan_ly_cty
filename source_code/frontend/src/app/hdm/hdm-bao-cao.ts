import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { TT } from '../core/trang-thai';
import { dotMuaDaTra, hdmCalc, hoSoThieu, thanhTienVND } from '../core/calc';
import { HopDongMua } from '../core/models';
import { daysFromToday, sum, vndShort } from '../core/util';
import { chuVietTat, mauAvatar } from '../shared/avatar';

const R = 36;
const CHU_VI = 2 * Math.PI * R;
const MAU_NHOM = ['#0f5a2a', '#14806f', '#7ccf5b', '#e0a31c', '#b8bfc2'];
const MAU_OXY = '#0f5a2a';
const MAU_PT = '#8e63c9';
/** Hàng đã đặt quá số ngày này mà chưa về thì coi là giao trễ (HĐ mua chưa có ngày dự kiến giao). */
const NGAY_TRE = 30;
/** Hàng đã về quá số ngày này mà chưa nhập kho thì cảnh báo. */
const NGAY_CHO_NHAP = 7;
const NGAY_TOI = 14;

interface Ky {
  m: HopDongMua;
  tong: number;
  pctNhap: number;
  conPhaiTra: number;
  quaHan: number;
  thieuHS: boolean;
}
interface Mieng {
  nhan: string;
  giaTri: number;
  pct: number;
  mau: string;
  dash: string;
  offset: number;
}
interface RuiRo {
  id: string;
  soHD: string;
  ncc: string;
  buoc: string;
  ruiRo: string;
  c: 'bad' | 'warn';
  pt: string;
}

/** Làm tròn trần trục tung lên số "đẹp" (1, 2, 2.5, 5 × 10ⁿ). */
function tranDep(v: number): number {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / e;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e;
}

const ngayNgan = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Tab "Báo cáo vận hành" của Hợp đồng mua — tính trên frontend từ dữ liệu HĐ, checklist, phiếu nhập kho và đợt trả NCC. */
@Component({
  selector: 'app-hdm-bao-cao',
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
        <option value="PHU_TAI" [selected]="pn() === 'PHU_TAI'">Phú Tài</option>
      </select>
      <select aria-label="So sánh" (change)="soSanh.set($any($event.target).value)">
        <option value="cungKy" [selected]="soSanh() === 'cungKy'">So sánh: cùng kỳ {{ +nam() - 1 }}</option>
        <option value="khong" [selected]="soSanh() === 'khong'">Không so sánh</option>
      </select>
      <span class="sp"></span>
      <span class="sub">Cập nhật {{ homNay }}</span>
    </div>
    <p class="sub luu-y">Giá trị đặt mua tính theo Ngày ký, không gồm Dự thảo và HĐ Huỷ · các thẻ Hàng đang về, Giao trễ, Thanh toán 14 ngày và khối Chuỗi cung ứng / Rủi ro là tình trạng hiện tại, không theo kỳ.</p>

    <div class="kpis">
      <div class="k hero">
        <span class="l">Giá trị đặt mua</span>
        <b class="v">{{ short(kyHienTai().tong) }} @if (delta() !== null) { <em class="pill" [class.xau]="delta()! < 0">{{ delta()! < 0 ? '▼' : '▲' }} {{ abs(delta()!) }}%</em> }</b>
        <span class="s">theo hợp đồng mua · {{ kyHienTai().n }} HĐ</span>
      </div>
      <div class="k">
        <span class="l">Hàng đang về</span>
        <b class="v">{{ short(dangVe().giaTri) }}</b>
        <span class="s">{{ dangVe().n }} HĐ chưa nhập kho</span>
      </div>
      <div class="k" [class.canh]="giaoTre().length > 0">
        <span class="l">NCC giao trễ</span>
        <b class="v">{{ giaoTre().length }}</b>
        <span class="s">HĐ đặt quá {{ ngayTre }} ngày chưa về</span>
      </div>
      <div class="k">
        <span class="l">Thanh toán NCC {{ ngayToi }} ngày</span>
        <b class="v">{{ short(dot14().tong) }}</b>
        <span class="s">{{ dot14().ds.length }} đợt · kế hoạch chi</span>
      </div>
    </div>

    <div class="row-a">
      <section class="card-b">
        <h3>Giá trị mua theo tháng <span class="u">triệu đ</span></h3>
        <svg class="bar" viewBox="0 0 640 230" role="img" aria-label="Giá trị mua theo tháng, tách OXY và Phú Tài">
          @for (g of luoi(); track g.y) {
            <line x1="44" x2="632" [attr.y1]="g.y" [attr.y2]="g.y" class="gl" />
            <text x="38" [attr.y]="g.y + 3" text-anchor="end" class="ax">{{ g.nhan }}</text>
          }
          @for (b of cot(); track b.t) {
            <rect [attr.x]="b.x" [attr.y]="b.yOxy" [attr.width]="b.w" [attr.height]="b.hOxy" [attr.fill]="mauOxy"><title>T{{ b.t }} — OXY {{ tr(b.oxy) }} triệu</title></rect>
            <rect [attr.x]="b.x" [attr.y]="b.yPt" [attr.width]="b.w" [attr.height]="b.hPt" [attr.fill]="mauPt"><title>T{{ b.t }} — Phú Tài {{ tr(b.phuTai) }} triệu</title></rect>
            @if (b.oxy + b.phuTai) { <text [attr.x]="b.x + b.w / 2" [attr.y]="b.yPt - 4" text-anchor="middle" class="ax v">{{ tr(b.oxy + b.phuTai) }}</text> }
            <text [attr.x]="b.x + b.w / 2" y="214" text-anchor="middle" class="ax">T{{ b.t }}</text>
          }
        </svg>
        <div class="chu-giai"><span><i [style.background]="mauOxy"></i>OXY</span><span><i [style.background]="mauPt"></i>Phú Tài</span></div>
      </section>

      <section class="card-b">
        <h3>Cơ cấu mua theo nhóm hàng</h3>
        <div class="donut-wrap">
          <svg class="donut" viewBox="0 0 100 100" role="img" aria-label="Cơ cấu mua theo nhóm hàng">
            @for (m of nhom(); track m.nhan) { <circle cx="50" cy="50" [attr.r]="r" fill="none" [attr.stroke]="m.mau" stroke-width="18" [attr.stroke-dasharray]="m.dash" [attr.stroke-dashoffset]="m.offset" transform="rotate(-90 50 50)" /> }
            <text x="50" y="52" text-anchor="middle" class="dn">{{ short(tongNhom()) }}</text>
          </svg>
        </div>
        <ul class="ds-m">
          @for (m of nhom(); track m.nhan) { <li><i [style.background]="m.mau"></i><span>{{ m.nhan }}</span><b>{{ short(m.giaTri) }}</b><em>{{ m.pct }}%</em></li> }
          @empty { <li class="empty">Chưa có dòng hàng trong kỳ.</li> }
        </ul>
      </section>
    </div>

    <div class="row-a">
      <section class="card-b">
        <h3>Tiến độ chuỗi cung ứng <span class="u">số HĐ ở từng bước</span></h3>
        <div class="steps">
          @for (b of chuoi(); track b.ten) {
            <div class="step" [class.co]="b.n > 0"><b>{{ b.n }}</b><span>{{ b.ten }}</span></div>
          }
        </div>
        @if (canhBao()) { <p class="hop do">Cảnh báo: {{ canhBao() }}</p> }
      </section>

      <section class="card-b">
        <h3>Top nhà cung cấp <span class="u">triệu đ</span></h3>
        @for (n of topNcc(); track n.ten) {
          <div class="hb"><span class="hl" [title]="n.ten">{{ n.ten }}</span><span class="hbar"><i [style.width.%]="n.pct" [style.background]="n.mau"></i></span><b class="num">{{ short(n.giaTri) }}</b></div>
        } @empty { <p class="empty">Chưa có HĐ trong kỳ.</p> }
      </section>
    </div>

    <div class="row-c">
      <section class="card-b">
        <h3>Lô hàng có rủi ro</h3>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Đơn mua</th><th>Nhà cung cấp</th><th>Bước</th><th>Rủi ro</th><th>Phụ trách</th></tr></thead>
          <tbody>
            @for (x of ruiRo(); track x.id) {
              <tr>
                <td><a class="so" [routerLink]="['/hop-dong-mua', x.id]">{{ x.soHD || '(chưa có số)' }}</a></td>
                <td class="kh">{{ x.ncc }}</td>
                <td>{{ x.buoc }}</td>
                <td><span class="st" [class]="'st ' + x.c">{{ x.ruiRo }}</span></td>
                <td>
                  @if (x.pt) { <span class="pt"><span class="av" [style.background]="mau(x.pt)">{{ vt(ten(x.pt)) }}</span>{{ ten(x.pt) }}</span> } @else { — }
                </td>
              </tr>
            } @empty { <tr><td colspan="5" class="empty">Không có lô hàng rủi ro.</td></tr> }
          </tbody>
        </table></div>
      </section>

      <section class="card-b">
        <h3>Đợt thanh toán NCC {{ ngayToi }} ngày tới</h3>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Số HĐ</th><th>Nhà cung cấp</th><th class="num">Số tiền</th><th>Hạn</th></tr></thead>
          <tbody>
            @for (x of dot14().ds; track x.key) {
              <tr>
                <td><a class="so" [routerLink]="['/hop-dong-mua', x.id]">{{ x.soHD || '(chưa có số)' }}</a></td>
                <td class="kh">{{ x.ncc }}</td>
                <td class="num">{{ short(x.soTien) }}</td>
                <td><span class="st" [class]="x.tre ? 'st bad' : 'st warn'">{{ x.han }}</span></td>
              </tr>
            } @empty { <tr><td colspan="4" class="empty">Không có đợt nào đến hạn.</td></tr> }
          </tbody>
          @if (dot14().ds.length) { <tfoot><tr><th colspan="2">Tổng</th><th class="num">{{ short(dot14().tong) }}</th><th></th></tr></tfoot> }
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
    .k.canh { background: #fdecea; }
    .k .l { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
    .k.hero .l, .k.hero .s { color: #fff; }
    .k .v { font-size: 26px; line-height: 1.15; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .k.canh .v { color: #a3261d; }
    .k .s { font-size: 11.5px; color: var(--ink-3); }
    .pill { font-style: normal; font-size: 12px; font-weight: 700; padding: 2px 9px; border-radius: 999px; background: rgba(255, 255, 255, 0.92); color: #0f5a2a; }
    .pill.xau { color: #a3261d; }
    .row-a { display: grid; gap: 14px; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); margin-bottom: 14px; }
    .row-c { display: grid; gap: 14px; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); }
    @media (max-width: 1000px) { .row-a, .row-c { grid-template-columns: minmax(0, 1fr); } }
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
    .donut { width: 170px; height: 170px; }
    .dn { font-size: 13px; font-weight: 800; fill: var(--ink); }
    .ds-m { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; font-size: 13px; }
    .ds-m li { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto 40px; align-items: center; gap: 10px; }
    .ds-m li b { text-align: right; }
    .ds-m li span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ds-m li em { font-style: normal; color: var(--ink-3); text-align: right; }
    .ds-m i { border-radius: 50%; }
    .steps { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(92px, 1fr)); }
    .step { display: grid; gap: 2px; padding: 10px 12px; border-radius: 12px; background: var(--panel); }
    .step.co { background: #e2f3e9; }
    .step b { font-size: 22px; }
    .step span { font-size: 12px; color: var(--ink-2); }
    .hop { margin: 10px 0 0; padding: 8px 12px; border-radius: 8px; font-size: 12.5px; }
    .hop.do { background: #fdecea; color: #a3261d; font-weight: 600; }
    .hb { display: grid; grid-template-columns: 130px 1fr 66px; align-items: center; gap: 10px; margin-bottom: 14px; font-size: 13px; }
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
    .tbl .so { font-weight: 700; color: var(--brand); text-decoration: none; white-space: nowrap; }
    .tbl .kh { min-width: 120px; max-width: 180px; line-height: 1.4; }
    .st { display: inline-block; padding: 1px 8px; border-radius: 6px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
    .st.warn { background: #fbf0d6; color: #8a5a00; }
    .st.bad { background: #fbe4e1; color: #a3261d; }
    .pt { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
    .av { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: #fff; font-size: 9.5px; font-weight: 700; flex: 0 0 auto; }
  `,
})
export class HdmBaoCao {
  private readonly store = inject(Store);
  protected readonly short = vndShort;
  protected readonly r = R;
  protected readonly mauOxy = MAU_OXY;
  protected readonly mauPt = MAU_PT;
  protected readonly ngayTre = NGAY_TRE;
  protected readonly ngayToi = NGAY_TOI;
  protected readonly mau = mauAvatar;
  protected readonly vt = chuVietTat;
  protected readonly abs = Math.abs;
  protected readonly ten = (id: string) => this.store.userName(id);
  protected readonly homNay = ngayNgan(new Date().toISOString().slice(0, 10)) + '/' + new Date().getFullYear();
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

  /** HĐ có hiệu lực (không Dự thảo / Huỷ) theo bộ lọc Pháp nhân, kèm số đã tính. */
  private readonly ds = computed<Ky[]>(() => {
    const db = this.store.db();
    const pn = this.pn();
    return this.store
      .hdmVisible()
      .filter((m) => m.trangThai !== TT.NHAP && m.trangThai !== TT.HUY)
      .filter((m) => pn === 'TAT_CA' || (pn === 'PHU_TAI') === m.thuocPhuTai)
      .map((m) => {
        const c = hdmCalc(m, db);
        return { m, tong: c.tong, pctNhap: c.pctNhap, conPhaiTra: c.conPhaiTra, quaHan: c.quaHan, thieuHS: hoSoThieu(db, 'HDM', m.id).length > 0 };
      });
  });
  /** Chưa tất toán — đối tượng của các thẻ "tình trạng hiện tại". */
  private readonly dangChay = computed(() => this.ds().filter((x) => x.m.trangThai !== TT.DA_TAT_TOAN));

  private khopKy(iso: string | undefined, nam: number): boolean {
    if (!iso || +iso.slice(0, 4) !== nam) return false;
    const t = +iso.slice(5, 7);
    if (this.thang()) return t === +this.thang();
    if (this.quy()) return Math.ceil(t / 3) === +this.quy();
    return true;
  }
  private tongKy(nam: number) {
    const x = this.ds().filter((k) => this.khopKy(k.m.ngayKy, nam));
    return { n: x.length, tong: sum(x, (k) => k.tong), ds: x };
  }
  protected readonly kyHienTai = computed(() => this.tongKy(+this.nam()));
  protected readonly delta = computed<number | null>(() => {
    if (this.soSanh() !== 'cungKy') return null;
    const truoc = this.tongKy(+this.nam() - 1).tong;
    return truoc > 0 ? Math.round(((this.kyHienTai().tong - truoc) / truoc) * 100) : null;
  });

  private tien(m: HopDongMua, ten: string) {
    return m.checklist.find((x) => x.ten === ten);
  }
  /** Hàng đã về nhưng chưa nhập kho (HĐ Phú Tài không nhập kho). */
  protected readonly dangVe = computed(() => {
    const x = this.dangChay().filter((k) => !k.m.thuocPhuTai && this.tien(k.m, 'Hàng về')?.xong && k.pctNhap < 1);
    return { n: x.length, giaTri: sum(x, (k) => k.tong * (1 - k.pctNhap)) };
  });
  protected readonly giaoTre = computed(() =>
    this.dangChay().filter((k) => {
      const dat = this.tien(k.m, 'Đặt hàng');
      return dat?.xong && !!dat.ngay && !this.tien(k.m, 'Hàng về')?.xong && -daysFromToday(dat.ngay) > NGAY_TRE;
    }),
  );

  protected readonly dot14 = computed(() => {
    const db = this.store.db();
    const ds = this.dangChay()
      .flatMap(({ m }) =>
        m.dotTT.map((d) => ({ m, d, con: d.soTien - dotMuaDaTra(m, d, db) })),
      )
      .filter(({ d, con }) => con > 0 && !!d.han && daysFromToday(d.han) <= NGAY_TOI)
      .sort((a, b) => a.d.han!.localeCompare(b.d.han!))
      .map(({ m, d, con }) => ({ key: m.id + '#' + d.dot, id: m.id, soHD: m.soHD, ncc: m.tenNCC, soTien: con, han: ngayNgan(d.han!), tre: daysFromToday(d.han) < 0 }));
    return { ds, tong: sum(ds, (x) => x.soTien) };
  });

  // ── Cột chồng OXY / Phú Tài (cả năm đã chọn, theo Ngày ký) ──
  private readonly thangs = computed(() => {
    const nam = +this.nam();
    const out = Array.from({ length: 12 }, (_, i) => ({ t: i + 1, oxy: 0, phuTai: 0 }));
    for (const k of this.ds()) {
      if (!k.m.ngayKy || +k.m.ngayKy.slice(0, 4) !== nam) continue;
      const o = out[+k.m.ngayKy.slice(5, 7) - 1];
      if (k.m.thuocPhuTai) o.phuTai += k.tong;
      else o.oxy += k.tong;
    }
    return out;
  });
  private readonly tran = computed(() => tranDep(Math.max(0, ...this.thangs().map((t) => (t.oxy + t.phuTai) / 1e6))));
  protected readonly luoi = computed(() => {
    const tran = this.tran();
    return [0, 1, 2, 3, 4].map((i) => ({ y: 190 - (i * 170) / 4, nhan: ((tran * i) / 4).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) }));
  });
  protected readonly cot = computed(() => {
    const ts = this.thangs();
    const tran = this.tran() * 1e6;
    const slot = 588 / ts.length;
    const w = Math.min(34, slot * 0.62);
    return ts.map((t, i) => {
      const hOxy = (t.oxy / tran) * 170;
      const hPt = (t.phuTai / tran) * 170;
      return { ...t, x: 44 + i * slot + (slot - w) / 2, w, hOxy, hPt, yOxy: 190 - hOxy, yPt: 190 - hOxy - hPt };
    });
  });

  // ── Donut nhóm hàng (theo giá trị dòng hàng của HĐ ký trong kỳ) ──
  protected readonly nhom = computed<Mieng[]>(() => {
    const theo = new Map<string, number>();
    for (const k of this.kyHienTai().ds)
      for (const d of k.m.chiTiet) {
        const ten = this.store.loaiHangTen(d.loaiHang);
        theo.set(ten, (theo.get(ten) ?? 0) + thanhTienVND(d));
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
      const out = { nhan: x.nhan, giaTri: x.giaTri, pct: Math.round(pct), mau: MAU_NHOM[i], dash: `${dai} ${CHU_VI - dai}`, offset: -dau };
      dau += dai;
      return out;
    });
  });
  protected readonly tongNhom = computed(() => sum(this.nhom(), (x) => x.giaTri));

  // ── Chuỗi cung ứng: mỗi HĐ đang chạy rơi vào đúng một bước ──
  protected readonly chuoi = computed(() => {
    const dem = { 'Chưa đặt': 0, 'Đã đặt': 0, 'Hàng về': 0, 'Kiểm định': 0, 'Nhập kho': 0 };
    for (const k of this.dangChay()) {
      const ve = !!this.tien(k.m, 'Hàng về')?.xong;
      if (k.pctNhap > 0) dem['Nhập kho']++;
      else if (!this.tien(k.m, 'Đặt hàng')?.xong) dem['Chưa đặt']++;
      else if (!ve) dem['Đã đặt']++;
      else if (this.tien(k.m, 'Kiểm định')?.xong && !k.m.thuocPhuTai) dem['Kiểm định']++;
      else dem['Hàng về']++;
    }
    return Object.entries(dem).map(([ten, n]) => ({ ten, n }));
  });
  protected readonly canhBao = computed(() =>
    [
      this.giaoTre().length ? `${this.giaoTre().length} HĐ giao trễ` : '',
      this.dangChay().filter((k) => k.thieuHS && (k.pctNhap >= 1 || k.m.thuocPhuTai)).length ? `${this.dangChay().filter((k) => k.thieuHS && (k.pctNhap >= 1 || k.m.thuocPhuTai)).length} HĐ thiếu hồ sơ` : '',
      sum(this.dangChay(), (k) => k.quaHan) ? `${sum(this.dangChay(), (k) => k.quaHan)} đợt thanh toán quá hạn` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  );

  // ── Top NCC ──
  protected readonly topNcc = computed(() => {
    const theo = new Map<string, number>();
    for (const k of this.kyHienTai().ds) theo.set(k.m.tenNCC, (theo.get(k.m.tenNCC) ?? 0) + k.tong);
    const xs = [...theo].map(([ten, giaTri]) => ({ ten, giaTri })).sort((a, b) => b.giaTri - a.giaTri).slice(0, 5);
    const max = Math.max(1, ...xs.map((x) => x.giaTri));
    return xs.map((x, i) => ({ ...x, pct: (x.giaTri / max) * 100, mau: MAU_NHOM[i] }));
  });

  // ── Lô hàng có rủi ro: mỗi HĐ chỉ lấy rủi ro nặng nhất ──
  protected readonly ruiRo = computed<RuiRo[]>(() => {
    const out: RuiRo[] = [];
    for (const k of this.dangChay()) {
      const { m } = k;
      const dat = this.tien(m, 'Đặt hàng');
      const ve = this.tien(m, 'Hàng về');
      let buoc = '';
      let ruiRo = '';
      let c: RuiRo['c'] = 'warn';
      if (dat?.xong && dat.ngay && !ve?.xong && -daysFromToday(dat.ngay) > NGAY_TRE) {
        [buoc, ruiRo, c] = ['Cung ứng', `Trễ ${-daysFromToday(dat.ngay) - NGAY_TRE} ngày`, 'bad'];
      } else if (k.quaHan > 0) {
        [buoc, ruiRo, c] = ['Thanh toán', `${k.quaHan} đợt quá hạn`, 'bad'];
      } else if (!m.thuocPhuTai && ve?.xong && ve.ngay && k.pctNhap < 1 && -daysFromToday(ve.ngay) > NGAY_CHO_NHAP) {
        [buoc, ruiRo] = [this.tien(m, 'Kiểm định')?.xong ? 'Nhập kho' : 'Kiểm định', `Chưa nhập kho ${-daysFromToday(ve.ngay)} ngày`];
      } else if (k.thieuHS && (k.pctNhap >= 1 || m.thuocPhuTai)) {
        [buoc, ruiRo] = ['Tất toán', 'Thiếu hồ sơ'];
      }
      if (ruiRo) out.push({ id: m.id, soHD: m.soHD, ncc: m.tenNCC, buoc, ruiRo, c, pt: m.hdbId ? (this.store.hdbById(m.hdbId)?.sale ?? '') : '' });
    }
    return out.sort((a, b) => (a.c === b.c ? 0 : a.c === 'bad' ? -1 : 1)).slice(0, 8);
  });
}
