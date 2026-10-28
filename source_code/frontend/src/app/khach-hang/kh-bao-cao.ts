import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '../core/store';
import { KhachHang } from '../core/models';
import { TT } from '../core/trang-thai';
import { sum, todayIso, viDate } from '../core/util';
import { xuatExcel } from '../shared/export';
import { mauAvatar } from '../shared/avatar';
import { chenhLech, dangMo, diemSpark, layCoHoiTong } from './co-hoi-data';

const MAU_NGUON = ['#0f5a2a', '#14806f', '#6cbf4b', '#e8a33d', '#9aa5b4'];
const MAU_PHEU = ['#0f5a2a', '#19a05a', '#6cbf4b', '#9bd36a', '#d9453b'];
const GD_PHEU = ['Mới', 'Đã báo giá', 'Đang đàm phán', 'Thắng', 'Thua'] as const;
const pad = (n: number) => String(n).padStart(2, '0');
const tr = (v: number) => (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
/** Cận trên "đẹp" cho trục: ≤4 → 4, ≤10 → 10, lớn hơn → bội của 5 (12 → 15). */
const canTren = (v: number) => (v <= 4 ? 4 : v <= 10 ? 10 : Math.ceil(v / 5) * 5);
const soTruc = (v: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
const ngayCuoiThang = (y: number, m: number) => new Date(y, m, 0).getDate();

interface Khoang {
  tu: string;
  den: string;
  /** Các tháng (1–12) của kỳ, cắt tới tháng hiện tại nếu kỳ chưa kết thúc. */
  thangs: number[];
}

function khoang(nam: number, quy: string, thang: string): Khoang {
  let a = 1;
  let b = 12;
  if (thang) a = b = Number(thang);
  else if (quy) {
    a = (Number(quy) - 1) * 3 + 1;
    b = a + 2;
  }
  const nay = new Date();
  const tran = nam === nay.getFullYear() ? Math.min(b, nay.getMonth() + 1) : b;
  const thangs = Array.from({ length: Math.max(0, tran - a + 1) }, (_, i) => a + i);
  return { tu: `${nam}-${pad(a)}-01`, den: `${nam}-${pad(b)}-${pad(ngayCuoiThang(nam, b))}`, thangs };
}

/** Tab "Báo cáo khách hàng": thẻ chỉ số, biểu đồ và bảng, tính từ HĐ bán, cơ hội và nhật ký chăm sóc. */
@Component({
  selector: 'app-kh-bao-cao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loc">
      <select aria-label="Năm" (change)="nam.set($any($event.target).value)">
        @for (y of nams; track y) { <option [value]="y" [selected]="'' + y === nam()">Năm {{ y }}</option> }
      </select>
      <select aria-label="Quý" (change)="quy.set($any($event.target).value); thang.set('')">
        <option value="" [selected]="!quy()">Quý: Tất cả</option>
        @for (q of [1, 2, 3, 4]; track q) { <option [value]="q" [selected]="'' + q === quy()">Quý {{ q }}</option> }
      </select>
      <select aria-label="Tháng" (change)="thang.set($any($event.target).value); quy.set('')">
        <option value="" [selected]="!thang()">Tháng: Tất cả</option>
        @for (m of thangCoSan; track m) { <option [value]="m" [selected]="'' + m === thang()">Tháng {{ m }}</option> }
      </select>
      <select aria-label="Pháp nhân" (change)="phapNhan.set($any($event.target).value)">
        <option value="" [selected]="!phapNhan()">Pháp nhân: Tất cả</option>
        <option value="OXY" [selected]="phapNhan() === 'OXY'">Pháp nhân: OXY</option>
        <option value="Phú Tài" [selected]="phapNhan() === 'Phú Tài'">Pháp nhân: Phú Tài</option>
      </select>
      <select aria-label="So sánh" (change)="soSanh.set($any($event.target).value === '1')">
        <option value="1" [selected]="soSanh()">So sánh: cùng kỳ {{ +nam() - 1 }}</option>
        <option value="0" [selected]="!soSanh()">So sánh: không</option>
      </select>
      <span class="grow"></span>
      <span class="sub">Cập nhật {{ homNay }}</span>
    </div>

    @let d = bc();
    <div class="kpis">
      <div class="k hero">
        <span class="l">Khách mua trong kỳ</span>
        <b class="v">{{ d.mua }} @if (d.dMua !== null) { <i class="pc">{{ d.dMua >= 0 ? '▲' : '▼' }} {{ abs(d.dMua) }}%</i> }</b>
        <span class="s">{{ d.cu }} khách cũ · {{ d.moi }} khách mới</span>
      </div>
      <div class="k">
        <span class="l">Tỷ lệ thắng cơ hội</span>
        <b class="v">{{ d.tyThang }}%</b>
        <svg class="spark ok" viewBox="0 0 96 30" aria-hidden="true"><polyline [attr.points]="d.sTyThang" /></svg>
        <span class="s"><i class="dl" [class.up]="d.cTyThang > 0" [class.down]="d.cTyThang < 0">{{ mui(d.cTyThang) }} {{ d.cTyThang ? abs(d.tyThang - d.tyThangT) + '%' : '' }}</i> {{ d.thang }} thắng / {{ d.thang + d.thua }} cơ hội đã đóng</span>
      </div>
      <div class="k">
        <span class="l">Tỷ lệ khách mua lại</span>
        <b class="v">{{ d.tyLai }}%</b>
        <svg class="spark ok" viewBox="0 0 96 30" aria-hidden="true"><polyline [attr.points]="d.sTyLai" /></svg>
        <span class="s"><i class="dl" [class.up]="d.cTyLai > 0" [class.down]="d.cTyLai < 0">{{ mui(d.cTyLai) }} {{ d.cTyLai ? abs(d.tyLai - d.tyLaiT) + '%' : '' }}</i> {{ d.cu }}/{{ d.mua }} khách đã từng mua</span>
      </div>
      <div class="k">
        <span class="l">Khách có dấu hiệu ngừng mua</span>
        <b class="v">{{ d.ngung }}</b>
        <svg class="spark bad" viewBox="0 0 96 30" aria-hidden="true"><polyline [attr.points]="d.sNgung" /></svg>
        <span class="s"><i class="dl" [class.up]="d.cNgung < 0" [class.down]="d.cNgung > 0">{{ mui(d.cNgung) }} {{ d.cNgung ? abs(d.ngung - d.ngungT) : '' }}</i> &gt; 1,5 × chu kỳ mua bình quân</span>
      </div>
    </div>

    <div class="row2">
      <section class="card-b">
        <h3>Khách mới và khách mua theo tháng <span class="u">số khách</span></h3>
        <svg class="bar" viewBox="0 0 560 210" role="img" aria-label="Khách mới và khách mua theo tháng">
          @for (t of d.truc; track t) {
            <line x1="34" x2="552" [attr.y1]="180 - t * 150 / d.maxThang" [attr.y2]="180 - t * 150 / d.maxThang" stroke="var(--line)" />
            <text x="28" [attr.y]="184 - t * 150 / d.maxThang" text-anchor="end" class="ax">{{ soTruc(t) }}</text>
          }
          @for (m of d.thangData; track m.t; let i = $index) {
            <rect [attr.x]="40 + i * d.buoc + 4" [attr.y]="180 - m.moi * 150 / d.maxThang" [attr.width]="d.buoc / 2 - 6" [attr.height]="m.moi * 150 / d.maxThang" rx="2" fill="#e8a33d" />
            <rect [attr.x]="40 + i * d.buoc + d.buoc / 2 - 1" [attr.y]="180 - m.mua * 150 / d.maxThang" [attr.width]="d.buoc / 2 - 6" [attr.height]="m.mua * 150 / d.maxThang" rx="2" fill="#0f5a2a" />
            <text [attr.x]="40 + i * d.buoc + d.buoc / 2" y="198" text-anchor="middle" class="ax">T{{ m.t }}</text>
          }
        </svg>
        <div class="lg"><span><i style="background:#e8a33d"></i>Khách mới</span><span><i style="background:#0f5a2a"></i>Khách mua</span></div>
      </section>
      <section class="card-b">
        <h3>Phễu cơ hội theo trạng thái <span class="u">triệu đ</span></h3>
        @for (p of d.pheu; track p.nhan; let i = $index) {
          <div class="hb"><span class="hl">{{ p.nhan }}</span><span class="hbar"><i [style.width.%]="p.pct" [style.background]="MAU_PHEU[i]"></i></span><b class="num">{{ p.gt }} tr</b></div>
        }
        <p class="note-s">Cơ hội Thua lưu lý do, không xoá — không cộng vào phễu đang mở</p>
      </section>
    </div>

    <div class="row3">
      <section class="card-b">
        <h3>KH mua hàng theo nguồn</h3>
        <div class="donut-w">
          <svg viewBox="0 0 120 120" class="donut" role="img" aria-label="Khách mua theo nguồn">
            <circle cx="60" cy="60" r="42" fill="none" stroke="var(--surf-3)" stroke-width="18" />
            @for (s of d.nguon; track s.nhan; let i = $index) {
              <circle cx="60" cy="60" r="42" fill="none" stroke-width="18" [attr.stroke]="MAU_NGUON[i % 5]" [attr.stroke-dasharray]="s.dash" [attr.stroke-dashoffset]="s.off" transform="rotate(-90 60 60)" />
            }
            <text x="60" y="58" text-anchor="middle" class="dn">{{ d.mua }}</text>
            <text x="60" y="73" text-anchor="middle" class="ax">khách hàng</text>
          </svg>
          <ul class="lg-col">
            @for (s of d.nguon; track s.nhan; let i = $index) {
              <li><i [style.background]="MAU_NGUON[i % 5]"></i><span>{{ s.nhan }}</span><b>{{ s.n }}</b><em>{{ s.pct }}%</em></li>
            } @empty { <li class="sub">Chưa có khách mua trong kỳ.</li> }
          </ul>
        </div>
      </section>
      <section class="card-b">
        <h3>KH mua hàng theo loại</h3>
        <svg class="bar" viewBox="0 0 320 200" role="img" aria-label="Khách mua theo loại">
          @for (t of d.truc2; track t) {
            <line x1="34" x2="316" [attr.y1]="170 - t * 140 / d.max2" [attr.y2]="170 - t * 140 / d.max2" stroke="var(--line)" />
            <text x="26" [attr.y]="174 - t * 140 / d.max2" text-anchor="end" class="ax2">{{ soTruc(t) }}</text>
          }
          @for (l of d.loai; track l.nhan; let i = $index) {
            <rect [attr.x]="34 + i * d.buoc2 + (d.buoc2 - 2 * d.bw2 - 4) / 2" [attr.y]="170 - l.cu * 140 / d.max2" [attr.width]="d.bw2" [attr.height]="l.cu * 140 / d.max2" rx="3" fill="#0f5a2a" />
            <rect [attr.x]="34 + i * d.buoc2 + (d.buoc2 - 2 * d.bw2 - 4) / 2 + d.bw2 + 4" [attr.y]="170 - l.moi * 140 / d.max2" [attr.width]="d.bw2" [attr.height]="l.moi * 140 / d.max2" rx="3" fill="#e8a33d" />
            <text [attr.x]="34 + i * d.buoc2 + d.buoc2 / 2" y="191" text-anchor="middle" class="ax2">{{ l.nhan }}</text>
          }
        </svg>
        <div class="lg"><span><i style="background:#0f5a2a"></i>Khách cũ</span><span><i style="background:#e8a33d"></i>Khách mới</span></div>
        @if (coEndUser(d.loai)) { <p class="chu-thich">Tư nhân, FDI = End-user</p> }
      </section>
      <section class="card-b">
        <h3>Giá trị HĐ theo khu vực <span class="u">triệu đ</span></h3>
        @for (v of d.khuVuc; track v.nhan; let i = $index) {
          <div class="hb"><span class="hl">{{ v.nhan }}</span><span class="hbar"><i [style.width.%]="v.pct" [style.background]="MAU_NGUON[i % 5]"></i></span><b class="num">{{ v.gt }} tr</b></div>
        } @empty { <p class="sub">Chưa có HĐ bán trong kỳ.</p> }
      </section>
    </div>

    <section class="card-b wide">
      <h3>Hiệu quả theo người phụ trách</h3>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Phụ trách</th><th class="num">Số KH</th><th class="num">Tương tác trong kỳ</th><th class="num">Cơ hội mở</th><th class="num">Khách mua</th><th class="num">Tỷ lệ thắng</th></tr></thead>
          <tbody>
            @for (r of d.sales; track r.ten) {
              <tr>
                <td>@if (r.id) { <span class="pt"><span class="av" [style.background]="mau(r.id)">{{ vt(r.ten) }}</span>{{ r.ten }}</span> } @else { <span class="neg">Chưa phân bổ</span> }</td>
                <td class="num">{{ r.soKH }}</td><td class="num">{{ r.tuongTac }}</td><td class="num">{{ r.mo ? tr(r.mo) + ' tr' : '—' }}</td>
                <td class="num">{{ r.mua || '—' }}</td><td class="num">{{ r.tyLe === null ? '—' : r.tyLe + '%' }}</td>
              </tr>
            }
            <tr class="tong"><td><b>Tổng</b></td><td class="num"><b>{{ d.tong.soKH }}</b></td><td class="num"><b>{{ d.tong.tuongTac }}</b></td><td class="num"><b>{{ short(d.tong.mo) }}</b></td><td class="num"><b>{{ d.tong.mua }}</b></td><td class="num"><b>{{ d.tong.tyLe === null ? '—' : d.tong.tyLe + '%' }}</b></td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card-b wide">
      <h3>Top 5 khách hàng &amp; hành động tiếp</h3>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>#</th><th>Khách hàng</th><th>Nguồn</th><th class="num">Số HĐ</th><th class="num">Giá trị HĐ</th><th>Hành động tiếp</th><th>Pháp nhân</th></tr></thead>
          <tbody>
            @for (r of d.top; track r.id; let i = $index) {
              <tr>
                <td>{{ i + 1 }}</td><td><b>{{ r.ten }}</b></td><td>{{ r.nguon || '—' }}</td><td class="num">{{ r.soHD }}</td><td class="num">{{ tr(r.gt) }} tr</td>
                <td>{{ r.tiep || '—' }}</td><td><span class="pn" [class.pt2]="r.phapNhan !== 'OXY'">{{ r.phapNhan }}</span></td>
              </tr>
            } @empty { <tr><td colspan="7" class="empty">Chưa có HĐ bán trong kỳ.</td></tr> }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .loc { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; }
    .loc select { width: auto; min-height: 34px; padding: 4px 12px; border-radius: 999px; background: var(--surf); border: 0; font-size: 12.5px; font-weight: 600; }
    .grow { flex: 1 1 auto; }
    .kpis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); margin-bottom: 14px; }
    .k { display: grid; gap: 4px; align-content: start; background: var(--surf); border-radius: 14px; padding: 12px 14px; position: relative; min-width: 0; }
    .k.hero { background: linear-gradient(135deg, #0f7a3d, #6cbf4b); color: #fff; }
    .k .l { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
    .k.hero .l, .k.hero .s { color: #fff; }
    .k .v { font-size: 28px; line-height: 1.15; }
    .k .s { font-size: 11px; color: var(--ink-3); line-height: 1.4; max-width: 66%; }
    .pc { font-size: 11px; font-style: normal; background: rgb(255 255 255 / 0.25); padding: 1px 6px; border-radius: 6px; vertical-align: middle; }
    .spark { position: absolute; right: 12px; top: 34px; width: 80px; height: 26px; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .spark.ok { stroke: #19a05a; } .spark.bad { stroke: #d9453b; }
    .dl { font-style: normal; font-weight: 700; } .dl.up { color: #19a05a; } .dl.down { color: #d9453b; }
    .row2 { display: grid; gap: 12px; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); margin-bottom: 12px; }
    .row3 { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); margin-bottom: 12px; }
    @media (max-width: 900px) { .row2 { grid-template-columns: minmax(0, 1fr); } }
    .card-b { background: var(--surf); border-radius: 18px; padding: 18px 20px; min-width: 0; }
    .card-b.wide { margin-bottom: 12px; }
    .card-b h3 { font-size: 15.5px; margin-bottom: 14px; display: flex; justify-content: space-between; gap: 8px; }
    .u { font-size: 11px; font-weight: 500; color: var(--ink-3); }
    .bar { width: 100%; height: auto; }
    .ax { font-size: 9px; fill: var(--ink-3); }
    .ax2 { font-size: 10.5px; fill: var(--ink-3); }
    .dn { font-size: 20px; font-weight: 700; fill: var(--ink); }
    .lg { display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 13.5px; font-weight: 500; color: var(--ink-2); margin-top: 10px; }
    .lg i, .lg-col i { display: inline-block; width: 14px; height: 14px; border-radius: 4px; margin-right: 8px; vertical-align: -2px; }
    .hb { display: grid; grid-template-columns: minmax(70px, 30%) 1fr 64px; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12.5px; }
    .hb .num { text-align: right; font-weight: 700; white-space: nowrap; }
    .chu-thich { margin: 10px 0 0; font-size: 12.5px; color: var(--ink-3); }
    .hl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hbar { height: 10px; border-radius: 5px; background: var(--surf-3); overflow: hidden; }
    .hbar i { display: block; height: 100%; border-radius: 5px; }
    .note-s { margin-top: 10px; padding: 8px 10px; border-radius: 8px; background: var(--panel); font-size: 11px; color: var(--ink-3); }
    /* Biểu đồ tròn ở trên, chú giải xếp dọc bên dưới (như thiết kế) */
    .donut-w { display: grid; grid-template-columns: minmax(0, 1fr); justify-items: center; gap: 18px; }
    .donut { width: 168px; height: 168px; }
    .lg-col { list-style: none; margin: 0; padding: 0 4px; display: grid; gap: 10px; font-size: 13.5px; width: 100%; }
    .lg-col li { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto 44px; align-items: center; gap: 12px; }
    .lg-col li i { width: 12px; height: 12px; margin: 0; border-radius: 3px; }
    .lg-col li b { text-align: right; font-weight: 700; }
    .lg-col em { font-style: normal; color: var(--ink-3); text-align: right; }
    .tbl-wrap { border-radius: 0; border: 0; box-shadow: none; background: none; overflow: auto; }
    .tbl { font-size: 12.5px; }
    .tbl thead th { background: var(--panel); font-size: 12px; font-weight: 600; color: var(--ink-2); white-space: nowrap; border-radius: 0; }
    .tbl thead th:first-child { border-top-left-radius: 10px; } .tbl thead th:last-child { border-top-right-radius: 10px; }
    .tbl tbody td { padding-block: 10px; vertical-align: middle; border-bottom: 1px solid var(--line); }
    .tbl td.num:last-child { font-weight: 700; }
    .neg { color: #c0392b; font-weight: 600; }
    .tbl tr.tong td { background: var(--panel); }
    .pt { display: inline-flex; align-items: center; gap: 6px; }
    .av { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #0f5a2a; color: #fff; font-size: 9.5px; font-weight: 700; }
    .pn { display: inline-block; padding: 1px 9px; border-radius: 6px; font-size: 11.5px; font-weight: 700; background: #dff3e4; color: #17663f; }
    .pn.pt2 { background: #ece0f7; color: #6b3f93; }
  `,
})
export class KhBaoCao {
  private readonly store = inject(Store);
  protected readonly MAU_NGUON = MAU_NGUON;
  protected readonly MAU_PHEU = MAU_PHEU;
  protected readonly tr = tr;
  protected readonly soTruc = soTruc;
  protected readonly mau = mauAvatar;
  protected coEndUser(ds: { goc: string }[]): boolean {
    return ds.some((l) => l.goc.startsWith('End-user'));
  }
  protected readonly abs = Math.abs;
  protected readonly homNay = viDate(todayIso());
  protected readonly nams = (() => {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2, y - 3];
  })();
  protected readonly thangCoSan = Array.from({ length: 12 }, (_, i) => i + 1);

  protected readonly nam = signal(String(new Date().getFullYear()));
  protected readonly quy = signal('');
  protected readonly thang = signal('');
  protected readonly phapNhan = signal<'' | 'OXY' | 'Phú Tài'>('');
  protected readonly soSanh = signal(true);

  protected mui(d: number): string {
    return d > 0 ? '▲' : d < 0 ? '▼' : '';
  }
  protected vt(ten: string): string {
    return ten.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();
  }
  protected short(v: number): string {
    return v >= 1e9 ? (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ' : tr(v) + ' tr';
  }

  /** Mọi số liệu báo cáo, tính lại khi đổi bộ lọc hoặc dữ liệu. */
  protected readonly bc = computed(() => {
    const s = this.store;
    const homNay = todayIso();
    const pn = this.phapNhan();
    type Hd = { ma: string; ngay: string; gt: number; pn: 'OXY' | 'Phú Tài' };
    const hopLe = (t: string) => t !== TT.HUY && t !== TT.BAO_GIA;
    // HĐ đã ký, không huỷ / báo giá. OXY lấy từ HĐ bán; Phú Tài là bảng HĐ riêng (hopDongPhuTai).
    const hd: Hd[] = [
      ...(pn === 'Phú Tài' ? [] : s.hopDongBan().filter((h) => h.ngayKy && hopLe(h.trangThai)).map((h): Hd => ({ ma: h.maKH, ngay: h.ngayKy!, gt: h.truocVAT, pn: 'OXY' }))),
      ...(pn === 'OXY' ? [] : s.hopDongPhuTai().filter((h) => h.ngayKy && hopLe(h.trangThai)).map((h): Hd => ({ ma: h.maKH, ngay: h.ngayKy!, gt: h.truocVAT, pn: 'Phú Tài' }))),
    ];
    const hdTheoKH = new Map<string, Hd[]>();
    for (const h of hd) hdTheoKH.set(h.ma, [...(hdTheoKH.get(h.ma) ?? []), h].sort((a, b) => a.ngay.localeCompare(b.ngay)));
    // Chọn một pháp nhân: chỉ tính khách có HĐ của pháp nhân đó.
    const ks = s.khachHang().filter((k) => !pn || hdTheoKH.has(k.id));
    const idKH = new Set(ks.map((k) => k.id));
    for (const ma of [...hdTheoKH.keys()]) if (!idKH.has(ma)) hdTheoKH.delete(ma);
    // Cơ hội: cả bản ghi cơ hội riêng lẫn cơ hội suy ra từ trạng thái cơ hội của khách (tab Cơ hội dùng cùng nguồn).
    const co = layCoHoiTong(ks);
    const lichSap = new Map<string, { nd: string; han: string }>();
    for (const v of s.db().viecGiao ?? []) {
      if (!v.khId || v.xongLuc || !v.han || v.han < homNay) continue;
      const cu = lichSap.get(v.khId);
      if (!cu || v.han < cu.han) lichSap.set(v.khId, { nd: v.noiDung.replace(/^\[[^\]]*\]\s*/, ''), han: v.han });
    }

    const y = Number(this.nam());
    const kyNay = khoang(y, this.quy(), this.thang());
    const kyTruoc = khoang(y - 1, this.quy(), this.thang());
    const trong = (iso: string | undefined, k: Khoang) => !!iso && iso >= k.tu && iso <= k.den;

    const tinh = (k: Khoang) => {
      const mua = new Set<string>();
      const moi = new Set<string>();
      for (const [ma, ds] of hdTheoKH) {
        if (ds.some((h) => trong(h.ngay, k))) mua.add(ma);
        if (trong(ds[0].ngay, k)) moi.add(ma);
      }
      const cu = mua.size - moi.size;
      const thang = co.filter((r) => r.c.giaiDoan === 'Thắng' && trong(r.c.ngayChot, k)).length;
      const thua = co.filter((r) => r.c.giaiDoan === 'Thua' && trong(r.c.ngayChot, k)).length;
      const asOf = k.den < homNay ? k.den : homNay;
      let ngung = 0;
      for (const ds of hdTheoKH.values()) {
        const dsDen = ds.filter((h) => h.ngay <= asOf);
        if (dsDen.length < 2) continue;
        const ngay = (iso: string) => new Date(iso).getTime() / 864e5;
        const chuKy = (ngay(dsDen[dsDen.length - 1].ngay) - ngay(dsDen[0].ngay)) / (dsDen.length - 1);
        if (chuKy > 0 && ngay(asOf) - ngay(dsDen[dsDen.length - 1].ngay) > 1.5 * chuKy) ngung++;
      }
      const ty = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
      return { mua, moi, cu, thang, thua, ngung, tyThang: ty(thang, thang + thua), tyLai: ty(cu, mua.size) };
    };
    const a = tinh(kyNay);
    const b = this.soSanh() ? tinh(kyTruoc) : null;

    // Theo tháng
    const thangData = kyNay.thangs.map((m) => {
      const tien = `${y}-${pad(m)}`;
      const mua = new Set<string>();
      const moi = new Set<string>();
      for (const [ma, ds] of hdTheoKH) {
        if (ds.some((h) => h.ngay.startsWith(tien))) mua.add(ma);
        if (ds[0].ngay.startsWith(tien)) moi.add(ma);
      }
      return { t: m, mua: mua.size, moi: moi.size };
    });
    const maxThang = canTren(Math.max(0, ...thangData.map((m) => m.mua)));
    const buoc = thangData.length ? 510 / thangData.length : 50;
    const truc = [0, 1, 2, 3, 4].map((i) => (maxThang * i) / 4);

    // Phễu
    const gtPheu = GD_PHEU.map((g) =>
      sum(
        co.filter((r) => r.c.giaiDoan === g && (dangMo(g) || trong(r.c.ngayChot, kyNay))),
        (r) => r.c.giaTri,
      ),
    );
    const maxPheu = Math.max(1, ...gtPheu);
    const pheu = GD_PHEU.map((nhan, i) => ({ nhan, gt: tr(gtPheu[i]), pct: (gtPheu[i] / maxPheu) * 100 }));

    // Khách mua trong kỳ
    const muaKH = ks.filter((k) => a.mua.has(k.id));
    const nhom = (f: (k: KhachHang) => string) => {
      const m = new Map<string, number>();
      for (const k of muaKH) m.set(f(k), (m.get(f(k)) ?? 0) + 1);
      return [...m].sort((x, z) => z[1] - x[1]);
    };
    const tong = Math.max(1, muaKH.length);
    const C = 2 * Math.PI * 42;
    let cong = 0;
    const nguon = nhom((k) => k.nguon || 'Chưa rõ').map(([nhan, n]) => {
      const len = (n / tong) * C;
      const o = { nhan, n, pct: Math.round((n / tong) * 100), dash: `${len} ${C - len}`, off: -cong };
      cong += len;
      return o;
    });
    const loaiMap = new Map<string, { cu: number; moi: number }>();
    for (const k of muaKH) {
      const l = loaiMap.get(k.phanLoai || 'Khác') ?? { cu: 0, moi: 0 };
      if (a.moi.has(k.id)) l.moi++;
      else l.cu++;
      loaiMap.set(k.phanLoai || 'Khác', l);
    }
    const loai = [...loaiMap].map(([nhan, v]) => ({ nhan: nhan.replace(/^End-user\s+/, ''), goc: nhan, ...v })).slice(0, 5);
    const max2 = canTren(Math.max(0, ...loai.map((l) => Math.max(l.cu, l.moi))));
    const buoc2 = loai.length ? 282 / loai.length : 80;
    const bw2 = Math.min(30, (buoc2 - 24) / 2);
    const truc2 = [0, 1, 2, 3, 4].map((i) => (max2 * i) / 4);

    // Khu vực: giá trị HĐ trong kỳ theo tỉnh
    const tinhGt = new Map<string, number>();
    for (const k of ks) {
      const g = sum((hdTheoKH.get(k.id) ?? []).filter((h) => trong(h.ngay, kyNay)), (h) => h.gt);
      if (g) tinhGt.set(k.tinh || 'Chưa rõ', (tinhGt.get(k.tinh || 'Chưa rõ') ?? 0) + g);
    }
    const tsort = [...tinhGt].sort((x, z) => z[1] - x[1]);
    const top4 = tsort.slice(0, 4);
    const khac = sum(tsort.slice(4), (x) => x[1]);
    const dsKV = khac ? [...top4, ['Tỉnh khác', khac] as [string, number]] : top4;
    const maxKV = Math.max(1, ...dsKV.map((x) => x[1]));
    const khuVuc = dsKV.map(([nhan, v]) => ({ nhan, gt: tr(v), pct: (v / maxKV) * 100 }));

    // Theo người phụ trách
    const tyRate = (xs: typeof co) => {
      const t = xs.filter((r) => r.c.giaiDoan === 'Thắng' && trong(r.c.ngayChot, kyNay)).length;
      const l = xs.filter((r) => r.c.giaiDoan === 'Thua' && trong(r.c.ngayChot, kyNay)).length;
      return t + l ? Math.round((t / (t + l)) * 100) : null;
    };
    const dongNguoi = (kh: KhachHang[]) => {
      const ids = new Set(kh.map((k) => k.id));
      const cs = co.filter((r) => ids.has(r.k.id));
      return {
        soKH: kh.length,
        tuongTac: sum(kh, (k) => (k.chamSoc ?? []).filter((c) => c.nguoi !== 'Import' && trong(c.luc.slice(0, 10), kyNay)).length),
        mo: sum(cs.filter((r) => dangMo(r.c.giaiDoan)), (r) => r.c.giaTri),
        mua: kh.filter((k) => a.mua.has(k.id)).length,
        tyLe: tyRate(cs),
      };
    };
    const idsSale = [...new Set(ks.map((k) => k.phuTrach ?? ''))];
    const sales = idsSale
      .map((id) => ({ id, ten: id ? s.userName(id) : '', ...dongNguoi(ks.filter((k) => (k.phuTrach ?? '') === id)) }))
      .sort((x, z) => (x.id === '' ? 1 : z.id === '' ? -1 : z.soKH - x.soKH));

    // Top 5 khách theo giá trị HĐ trong kỳ
    const top = ks
      .map((k) => {
        const ds = (hdTheoKH.get(k.id) ?? []).filter((h) => trong(h.ngay, kyNay));
        const lich = lichSap.get(k.id);
        const tiep = layCoHoiTong([k]).filter((r) => dangMo(r.c.giaiDoan) && r.c.tuongTacTiep).sort((x, z) => (x.c.ngayTuongTac ?? '9').localeCompare(z.c.ngayTuongTac ?? '9'))[0];
        const pnSet = [...new Set(ds.map((h) => h.pn))];
        return {
          id: k.id, ten: k.ten, nguon: k.nguon, soHD: ds.length, gt: sum(ds, (h) => h.gt),
          tiep: lich ? `${lich.nd} · ${lich.han.slice(8, 10)}/${lich.han.slice(5, 7)}` : tiep?.c.tuongTacTiep,
          phapNhan: pnSet.length > 1 ? 'OXY + Phú Tài' : (pnSet[0] ?? 'OXY'),
        };
      })
      .filter((r) => r.soHD)
      .sort((x, z) => z.gt - x.gt)
      .slice(0, 5);

    // Sparkline (theo tháng của kỳ): tỷ lệ thắng, mua lại, ngừng mua tích luỹ gần đúng bằng số khách mua mỗi tháng
    const sTyThang = diemSpark(
      kyNay.thangs.map((m) => {
        const k = khoang(y, '', String(m));
        const t = co.filter((r) => r.c.giaiDoan === 'Thắng' && trong(r.c.ngayChot, k)).length;
        const l = co.filter((r) => r.c.giaiDoan === 'Thua' && trong(r.c.ngayChot, k)).length;
        return t + l ? (t / (t + l)) * 100 : 0;
      }),
    );
    const sTyLai = diemSpark(thangData.map((m) => (m.mua ? ((m.mua - m.moi) / m.mua) * 100 : 0)));
    const sNgung = diemSpark(
      kyNay.thangs.map((m) => {
        const k = khoang(y, '', String(m));
        return tinh(k).ngung;
      }),
    );

    return {
      mua: a.mua.size, moi: a.moi.size, cu: a.cu,
      dMua: b && b.mua.size ? Math.round(((a.mua.size - b.mua.size) / b.mua.size) * 100) : null,
      tyThang: a.tyThang, tyThangT: b?.tyThang ?? 0, cTyThang: b ? chenhLech(a.tyThang, b.tyThang) : 0, thang: a.thang, thua: a.thua,
      tyLai: a.tyLai, tyLaiT: b?.tyLai ?? 0, cTyLai: b ? chenhLech(a.tyLai, b.tyLai) : 0,
      ngung: a.ngung, ngungT: b?.ngung ?? 0, cNgung: b ? chenhLech(a.ngung, b.ngung) : 0,
      sTyThang, sTyLai, sNgung,
      thangData, maxThang, buoc, truc,
      pheu, nguon, loai, max2, buoc2, bw2, truc2, khuVuc, sales, top,
      tong: {
        soKH: ks.length,
        tuongTac: sum(sales, (r) => r.tuongTac),
        mo: sum(sales, (r) => r.mo),
        mua: a.mua.size,
        tyLe: tyRate(co),
      },
    };
  });

  xuat(): void {
    const d = this.bc();
    const rows: (string | number | null)[][] = [
      ['Báo cáo khách hàng', `Năm ${this.nam()}`, this.quy() ? 'Quý ' + this.quy() : '', this.thang() ? 'Tháng ' + this.thang() : ''],
      [],
      ['Chỉ số', 'Giá trị'],
      ['Khách mua trong kỳ', d.mua], ['Khách cũ', d.cu], ['Khách mới', d.moi],
      ['Tỷ lệ thắng cơ hội (%)', d.tyThang], ['Tỷ lệ khách mua lại (%)', d.tyLai], ['Khách có dấu hiệu ngừng mua', d.ngung],
      [],
      ['Phụ trách', 'Số KH', 'Tương tác trong kỳ', 'Cơ hội mở (VNĐ)', 'Khách mua', 'Tỷ lệ thắng (%)'],
      ...d.sales.map((r) => [r.id ? r.ten : 'Chưa phân bổ', r.soKH, r.tuongTac, r.mo, r.mua, r.tyLe]),
      ['Tổng', d.tong.soKH, d.tong.tuongTac, d.tong.mo, d.tong.mua, d.tong.tyLe],
      [],
      ['#', 'Khách hàng', 'Nguồn', 'Số HĐ', 'Giá trị HĐ (VNĐ)', 'Hành động tiếp', 'Pháp nhân'],
      ...d.top.map((r, i) => [i + 1, r.ten, r.nguon ?? '', r.soHD, r.gt, r.tiep ?? '', r.phapNhan]),
    ];
    void xuatExcel('bao-cao-khach-hang', rows);
  }
}
