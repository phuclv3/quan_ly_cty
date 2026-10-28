import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { KHO_CHUYEN_THANG, ViecGiao } from '../core/models';
import { dotBanDaThu, hdbCalc, hdmCalc, hoSoThieu, ptCalc, soDuQuyPT, tamUngTreo, tonKho } from '../core/calc';
import { daysFromToday, money, sum, todayIso, viDate, viMoment, vndShort, nowIso } from '../core/util';
import { Modal, PickGo, PickOption } from '../shared/ui-kit';
import { Icon } from '../shared/icon';
import { TT } from '../core/trang-thai';

interface Viec {
  text: string;
  sub: string;
  link: string;
  qp?: Record<string, string>;
  tone: 'bad' | 'warn' | 'info';
  /** Nhãn + mã hồ sơ gốc hiện ở bảng ưu tiên. */
  loai: string;
  ma: string;
}

/** NT-07 — Dashboard trang chủ: thẻ theo quyền xem module, mỗi thẻ mở màn chi tiết. */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, Icon, Modal, PickGo],
  styles: [
    `.dh h1{font-size:34px;letter-spacing:-.01em}.dh .crumbs{color:var(--brand);font-weight:600}
    .dfil{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0 16px}
    .dfil select{height:42px;padding:0 14px;border-radius:14px;border:0;background:var(--surf);font-weight:600;box-shadow:0 1px 2px rgba(20,40,20,.06)}
    .dfil .upd{margin-left:auto;color:var(--ink-3);font-size:14px}
    .dk{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));margin-bottom:16px}
    .dk .k{display:grid;gap:4px;align-content:start;padding:16px 18px;border-radius:18px;background:var(--surf);box-shadow:0 1px 2px rgba(20,40,20,.06);min-width:0}
    .dk .k .l{font-size:15px;font-weight:600;color:var(--ink-2)}.dk .k .v{font-size:34px;font-weight:700;line-height:1.2}
    .dk .k .s{font-size:13.5px;color:var(--ink-3);line-height:1.45}
    .dk .k.hero{background:linear-gradient(135deg,#0f8a3c,#4cb847);color:#fff}.dk .k.hero .l,.dk .k.hero .s{color:rgba(255,255,255,.9)}
    .pill{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:7px;background:#fff;color:#c2352b;font-size:13px;font-weight:700;vertical-align:middle}.pill.up{color:#16642b}
    .vs{display:flex;align-items:center;justify-content:space-between;gap:10px}.spark{width:46%;height:34px;flex:0 0 auto}.tr{color:#16a34a;font-size:11px;font-weight:700}
    .pri{background:var(--surf);border-radius:18px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,40,20,.06)}
    .pri-h{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline;margin-bottom:12px}.pri-h h2{font-size:19px}
    .pri table{width:100%;border-collapse:collapse}.pri thead th{background:var(--surf-2);font-size:13.5px;font-weight:600;color:var(--ink-2);text-align:left;padding:9px 10px}
    .pri thead th:first-child{border-radius:10px 0 0 10px}.pri thead th:last-child{border-radius:0 10px 10px 0}
    .pri tbody td{padding:10px;border-bottom:1px solid var(--line);vertical-align:middle;font-size:15px}.pri tbody tr:last-child td{border-bottom:0}
    .pri td b.t{display:block;font-size:16px;line-height:1.35}.pri td .sub{font-size:13.5px}
    .lv{display:inline-block;min-width:34px;text-align:center;padding:1px 8px;border-radius:7px;font-size:13px;font-weight:700}
    .lv.p0{background:#d9453b;color:#fff}.lv.p1{background:#fbf0d6;color:#8a5a00}
    .hs small{display:block;font-size:11.5px;font-weight:700;letter-spacing:.03em;color:var(--brand)}
    .hs a.mua{background:#dcebfa;color:#1d5a99}.hs a.no{background:#fbe4e1;color:#a3261d}.hs a.pd{background:#e3f4e3;color:#16642b}.hs small.mua{color:#1d5a99}.hs small.no{color:#c0572b}
    .hs a{display:inline-block;padding:1px 9px;border-radius:7px;background:var(--brand-tint);color:#16642b;font-weight:700;font-size:14px;text-decoration:none}
    .who{display:flex;align-items:center;gap:8px}.av{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:700;flex:0 0 auto}
    .han.neg{font-weight:700}
    .btn-xl{display:inline-flex;align-items:center;gap:4px;height:34px;padding:0 14px;border-radius:999px;border:1.5px solid #16642b;background:var(--surf);color:#16642b;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap}
    a.btn-xl{text-decoration:none}.btn-xl:hover{background:#16642b;color:#fff}
    .dh2{margin:22px 0 10px;font-size:19px}
    .tl{display:grid;gap:0;margin:6px 0 12px;padding-left:4px;max-height:300px;overflow:auto}
    .tl .it{position:relative;padding:0 0 14px 20px;border-left:2px solid var(--line)}.tl .it:last-child{border-left-color:transparent;padding-bottom:0}
    .tl .it::before{content:'';position:absolute;left:-6px;top:4px;width:10px;height:10px;border-radius:50%;background:var(--brand)}
    .tl .it.he::before{background:var(--line-2)}.tl .it .m{font-size:13px;color:var(--ink-3)}.tl .it .c{white-space:pre-wrap}
    .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    a.dcard{display:grid;gap:8px;align-content:start;text-decoration:none;color:inherit;border-top:3px solid var(--brand)}
    a.dcard:hover{border-color:var(--brand)}a.dcard h3{display:flex;gap:8px;align-items:center;font-size:18px;margin:0}
    a.dcard .big{font-size:28px;font-weight:700}.dl{display:grid;gap:4px;font-size:15.5px}.dl div{display:flex;justify-content:space-between;gap:8px}
    .todo{list-style:none;margin:0;padding:0;display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr))}
    .todo a{display:flex;gap:12px;align-items:center;height:100%;box-sizing:border-box;text-decoration:none;color:inherit;padding:10px 12px;border-radius:8px;border:1px solid var(--line);border-left:4px solid var(--line);background:var(--surf)}
    .todo a.bad{border-left-color:var(--bad-fg)}.todo a.warn{border-left-color:var(--warn-fg)}.todo a.info{border-left-color:var(--info-fg)}
    .todo a:hover{background:var(--surf-2)}.todo .grow{min-width:0}.todo .grow b{display:block;line-height:1.35}
    .todo .tag{flex:none;min-width:78px;text-align:center}
    .vchips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
    .vchips button{display:inline-flex;gap:6px;align-items:center;height:34px;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:var(--surf);color:var(--ink-2);font:inherit;font-size:14.5px;cursor:pointer}
    .vchips button.on{border-color:var(--brand);color:var(--brand);font-weight:700}
    .vchips .n{min-width:22px;padding:0 6px;border-radius:999px;background:var(--surf-3);font-size:13px;font-weight:700;text-align:center}
    .vchips .n.bad{background:var(--bad-bg);color:var(--bad-fg)}.vchips .n.warn{background:var(--warn-bg);color:var(--warn-fg)}.vchips .n.info{background:var(--info-bg);color:var(--info-fg)}`,
  ],
  template: `
    <div class="dh">
      <div class="crumbs">Trang chủ</div>
      <h1>{{ tieuDe() }}</h1>
    </div>
    <div class="dfil">
      <select aria-label="Năm" (change)="nam.set(+$any($event.target).value)">
        @for (n of dsNam(); track n) { <option [value]="n" [selected]="n === nam()">Năm {{ n }}</option> }
      </select>
      <span class="upd">{{ vaiTro() }} · Cập nhật {{ moment(capNhat()) }} · <button type="button" class="linkish" (click)="lamMoi()">Làm mới</button></span>
    </div>

    <div class="dk">
      <div class="k hero">
        <span class="l">Doanh thu ghi nhận</span>
        <b class="v num" style="text-align:left">{{ short(tongQuan().doanhThu) }}@if (tongQuan().dtDoi !== null) { <span class="pill" [class.up]="tongQuan().dtDoi! >= 0">{{ tongQuan().dtDoi! >= 0 ? '▲' : '▼' }} {{ abs(tongQuan().dtDoi!) }}%</span> }</b>
        <span class="s">{{ tongQuan().soHD }} HĐ ký trong năm {{ nam() }}@if (tongQuan().dtDoi !== null) { · so với năm {{ nam() - 1 }} }</span>
      </div>
      <div class="k">
        <span class="l">Lợi nhuận gộp tạm tính</span>
        <div class="vs"><b class="v num" style="text-align:left">{{ short(tongQuan().loiNhuan) }}</b>
          <svg class="spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"><polyline [attr.points]="tongQuan().spark" fill="none" stroke="#16a34a" stroke-width="1.8" vector-effect="non-scaling-stroke" /></svg></div>
        <span class="s"><span class="tr">▲</span> biên {{ tongQuan().bien }}% doanh thu thuần</span>
      </div>
      @if (store.canView('nguonTien')) {
        <div class="k">
          <span class="l">Tiền khả dụng</span>
          <b class="v num" style="text-align:left" [class.neg]="tongSoDu() < 0">{{ short(tongSoDu()) }}</b>
          <span class="s">tổng số dư {{ nguon().length }} nguồn tiền đang dùng</span>
        </div>
      }
      @if (store.canView('congNo')) {
        <div class="k">
          <span class="l">Phải thu quá hạn</span>
          <b class="v num neg" style="text-align:left">{{ short(tongQuan().quaHan) }}</b>
          <span class="s"><span class="tr">▼</span> {{ tongQuan().pctQuaHan }}% tổng phải thu · {{ tongQuan().khQuaHan }} khách hàng</span>
        </div>
      }
    </div>

    <section class="pri" aria-label="Ưu tiên điều hành hôm nay">
      <div class="pri-h">
        <h2>Ưu tiên điều hành hôm nay</h2>
        <span class="sub">{{ demMuc().p0 }} P0 · {{ demMuc().p1 }} P1 · chỉ việc của bạn trong ngày / cần can thiệp</span>
      </div>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Mức</th><th>Việc cần xử lý</th><th>Hồ sơ gốc</th><th>Người chịu trách nhiệm</th><th>Hạn</th><th></th></tr></thead>
          <tbody>
            @for (r of hang(); track r.key) {
              <tr>
                <td><span class="lv" [class]="'lv ' + (r.p0 ? 'p0' : 'p1')">{{ r.p0 ? 'P0' : 'P1' }}</span></td>
                <td><b class="t">{{ r.text }}</b><span class="sub">{{ r.sub }}</span></td>
                <td class="hs">
                  @if (r.ma) { <small [class]="'lk ' + r.mau">{{ r.loai }}</small><a [routerLink]="r.link" [queryParams]="r.qp" [class]="r.mau">{{ r.ma }}</a> } @else { <span class="muted">—</span> }
                </td>
                <td><span class="who"><span class="av" [style.background]="mau(r.ai)">{{ viet(r.ai) }}</span>{{ store.userName(r.ai) }}</span></td>
                <td class="han" [class.neg]="r.tre > 0">{{ r.han ? ngayNgan(r.han) : '—' }}@if (r.gio) { <span class="sub"> {{ r.gio }}</span> }</td>
                <td>
                  @if (r.viecId) { <button type="button" class="btn-xl" (click)="moXuLy(r.viecId)">Xử lý <app-icon name="chevron" [size]="14" /></button> }
                  @else { <a class="btn-xl" [routerLink]="r.link" [queryParams]="r.qp">Xử lý <app-icon name="chevron" [size]="14" /></a> }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">🎉 Không còn việc ưu tiên trong ngày.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <app-modal [open]="!!chon()" title="Xử lý việc ưu tiên" sub="Lịch sử diễn biến của việc" size="md" (closed)="dong()">
      @if (chon(); as v) {
        <p style="white-space:pre-wrap"><b>{{ v.noiDung }}</b></p>
        <dl class="tom-tat">
          <div><dt>Giao bởi</dt><dd>{{ store.userName(v.nguoiTao) }} · {{ moment(v.taoLuc) }}</dd><span></span></div>
          <div><dt>Người nhận</dt><dd>{{ v.nguoiNhan.length ? tenNhan(v) : 'Việc của chính người tạo' }}</dd><span></span></div>
          <div><dt>Hạn</dt><dd>{{ v.han ? viDate(v.han) : '—' }} {{ v.gio ?? '' }}</dd><span></span></div>
          <div><dt>Hồ sơ gốc</dt><dd>@if (store.hdbById(v.hdbId); as h) { <a [routerLink]="['/hop-dong-ban', h.id]" (click)="dong()">{{ h.soHD || '(báo giá)' }}</a> · {{ h.tenKH }} } @else { — }</dd><span></span></div>
        </dl>
        <h3 class="dh2" style="font-size:16px;margin-top:14px">Lịch sử xử lý</h3>
        <div class="tl">
          <div class="it he"><div class="m">{{ moment(v.taoLuc) }} · {{ store.userName(v.nguoiTao) }}</div><div class="c">Tạo / giao việc</div></div>
          @for (m of v.phanHoi; track $index) {
            <div class="it" [class.he]="m.heThong"><div class="m">{{ moment(m.luc) }} · {{ store.userName(m.nguoi) }}</div><div class="c">{{ m.noiDung }}</div></div>
          }
        </div>

        <div class="field">
          <label for="xl-ghi">Ghi chú / quyết định xử lý</label>
          <textarea id="xl-ghi" rows="2" placeholder="VD đã phê duyệt, yêu cầu kế toán xuất hoá đơn…" [value]="ghiChu()" (input)="ghiChu.set($any($event.target).value)"></textarea>
        </div>

        @if (chuyen()) {
          <div class="field">
            <span class="lbl">Chuyển bộ phận / người liên quan tiếp tục xử lý</span>
            <app-pick-go inputId="xl-nn" [options]="nguoiOpts()" value="" placeholder="Gõ tên người nhận…" (valueChange)="themNhan($event)" />
            <div class="chips">
              @for (id of nguoiChuyen(); track id) { <span class="tag info">👤 {{ store.userName(id) }} <button type="button" class="linkish" aria-label="Bỏ" (click)="boNhan(id)">✕</button></span> }
            </div>
          </div>
        }
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="dong()">Đóng</button>
        <button type="button" class="btn quiet" [disabled]="!ghiChu().trim()" (click)="ghiTienDo()">Ghi tiến độ</button>
        @if (chuyen()) {
          <button type="button" class="btn" [disabled]="!nguoiChuyen().length" (click)="chuyenTiep()">Chuyển & ẩn khỏi bảng</button>
        } @else {
          <button type="button" class="btn quiet" (click)="chuyen.set(true)">Chuyển bộ phận liên quan</button>
          <button type="button" class="btn" (click)="hoanThanh()">✓ Hoàn thành</button>
        }
      </div>
    </app-modal>
  `,
})
export class Dashboard {
  protected readonly store = inject(Store);
  protected readonly money = money;
  protected readonly short = vndShort;
  protected readonly moment = viMoment;
  protected readonly capNhat = signal(nowIso());
  protected readonly viDate = viDate;
  protected readonly abs = Math.abs;
  protected readonly nam = signal(new Date().getFullYear());
  protected readonly dsNam = computed(() => {
    const ns = new Set<number>([new Date().getFullYear()]);
    for (const h of this.store.hdbVisible()) if (h.ngayKy) ns.add(+h.ngayKy.slice(0, 4));
    return [...ns].sort((a, b) => b - a);
  });
  protected readonly tieuDe = computed(() => (this.vaiTro().toLowerCase().includes('giám đốc') ? 'Tổng quan giám đốc' : 'Tổng quan điều hành'));

  /** 4 thẻ số liệu đầu trang: doanh thu / lợi nhuận theo HĐ ký trong năm chọn; phải thu quá hạn tính trên mọi HĐ. */
  protected readonly tongQuan = computed(() => {
    const db = this.store.db();
    const nam = String(this.nam());
    const trongNam = this.calcBan().filter((x) => x.h.ngayKy?.startsWith(nam));
    const doanhThu = sum(trongNam, (x) => x.h.truocVAT);
    const loiNhuan = sum(trongNam, (x) => x.c.lnGop);
    const truoc = this.calcBan().filter((x) => x.h.ngayKy?.startsWith(String(this.nam() - 1)));
    const dtTruoc = sum(truoc, (x) => x.h.truocVAT);
    // Đường xu hướng: lợi nhuận gộp luỹ kế theo tháng ký HĐ.
    const thang = Array.from({ length: 12 }, () => 0);
    for (const x of trongNam) thang[+(x.h.ngayKy ?? '').slice(5, 7) - 1 || 0] += x.c.lnGop;
    const cuoi = Math.max(0, ...thang.map((_, i) => (new Date().getFullYear() === this.nam() ? (i <= new Date().getMonth() ? i : -1) : i)));
    let acc = 0;
    const luyKe = thang.slice(0, cuoi + 1).map((v) => (acc += v));
    const lo = Math.min(...luyKe), hi = Math.max(...luyKe);
    const spark = luyKe.map((v, i) => `${luyKe.length > 1 ? (i / (luyKe.length - 1)) * 100 : 0},${hi > lo ? 30 - ((v - lo) / (hi - lo)) * 28 : 16}`).join(' ');
    const khQuaHan = new Set<string>();
    let quaHan = 0;
    for (const { h } of this.calcBan()) {
      for (const d of h.dotTT) {
        const con = d.soTien - dotBanDaThu(d, db);
        if (d.han && d.han < todayIso() && con > 0) {
          quaHan += con;
          khQuaHan.add(h.maKH || h.tenKH);
        }
      }
    }
    const thu = sum(this.calcBan(), (x) => x.c.conPhaiThu);
    return {
      doanhThu,
      loiNhuan,
      spark,
      dtDoi: dtTruoc > 0 ? Math.round(((doanhThu - dtTruoc) / dtTruoc) * 100) : null,
      soHD: trongNam.length,
      bien: doanhThu > 0 ? Math.round((loiNhuan / doanhThu) * 1000) / 10 : 0,
      quaHan,
      khQuaHan: khQuaHan.size,
      pctQuaHan: thu > 0 ? Math.round((quaHan / thu) * 100) : 0,
    };
  });

  // ── Ưu tiên điều hành hôm nay: việc CỦA TÔI đến hạn trong ngày / quá hạn, chưa hoàn thành ──
  protected readonly hang = computed(() => {
    const me = this.store.meId() ?? '';
    const homNay = todayIso();
    const lop = (loai: string) => (loai === 'HĐ MUA' ? 'mua' : loai === 'CÔNG NỢ' || loai === 'CHI PHÍ' ? 'no' : loai === 'PHÊ DUYỆT' ? 'pd' : 'ban');
    const viecs = this.store
      .viecVisible()
      .filter((v) => !v.xongLuc && (v.nguoiNhan.includes(me) || (!v.nguoiNhan.length && v.nguoiTao === me)) && (v.han ?? homNay) <= homNay)
      .map((v) => {
        const tre = -daysFromToday(v.han ?? homNay);
        const cuoi = [...v.phanHoi].reverse().find((m) => !m.heThong);
        const hd = this.store.hdbById(v.hdbId);
        return {
          key: v.id,
          viecId: v.id as string | null,
          p0: !!v.uuTien || tre > 0,
          text: v.noiDung,
          sub: cuoi ? `${this.store.userName(cuoi.nguoi)}: ${cuoi.noiDung}` : `Giao bởi ${this.store.userName(v.nguoiTao)}${tre > 0 ? ` · quá hạn ${tre} ngày` : ''}`,
          loai: 'HĐ BÁN',
          ma: hd ? hd.soHD || '(báo giá)' : '',
          mau: 'ban',
          link: hd ? ['/hop-dong-ban', hd.id] : ['/viec'],
          qp: undefined as Record<string, string> | undefined,
          ai: v.nguoiNhan[0] ?? v.nguoiTao,
          han: v.han ?? homNay,
          gio: v.gio,
          tre,
        };
      });
    // Cảnh báo tự sinh của hệ thống: Xử lý = mở hồ sơ gốc; hết điều kiện cảnh báo thì tự rời bảng.
    const canhBao = this.viec().map((x, i) => ({
      key: `cb${i}`,
      viecId: null,
      p0: x.tone === 'bad',
      text: x.text,
      sub: x.sub,
      loai: x.loai,
      ma: x.ma,
      mau: lop(x.loai),
      link: [x.link],
      qp: x.qp,
      ai: me,
      han: homNay,
      gio: undefined as string | undefined,
      tre: x.tone === 'bad' ? 1 : 0,
    }));
    return [...viecs, ...canhBao].sort((a, b) => Number(b.p0) - Number(a.p0));
  });
  protected readonly demMuc = computed(() => ({ p0: this.hang().filter((r) => r.p0).length, p1: this.hang().filter((r) => !r.p0).length }));
  protected ngayNgan(iso: string): string {
    return viDate(iso).slice(0, 5);
  }
  protected viet(id: string): string {
    const p = this.store.userName(id).replace(/\(.*?\)/g, '').trim().split(/\s+/);
    return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : (p[0]?.slice(0, 2) ?? '?')).toUpperCase();
  }
  protected mau(id: string): string {
    const m = ['#1f6b3a', '#d59a1b', '#7a5bc7', '#c0572b', '#2b7fc0'];
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return m[h % m.length];
  }
  protected tenNhan(v: ViecGiao): string {
    return v.nguoiNhan.map((id) => this.store.userName(id)).join(', ');
  }

  // ── Xử lý việc ──
  protected readonly xemId = signal<string | null>(null);
  protected readonly chon = computed(() => this.store.viecVisible().find((v) => v.id === this.xemId() && !v.xongLuc) ?? null);
  protected readonly ghiChu = signal('');
  protected readonly chuyen = signal(false);
  protected readonly nguoiChuyen = signal<string[]>([]);
  protected readonly nguoiOpts = computed<PickOption[]>(() =>
    this.store
      .taiKhoan()
      .filter((t) => t.trangThai === TT.HOAT_DONG && t.id !== this.store.meId() && !this.nguoiChuyen().includes(t.id))
      .map((t) => ({ value: t.id, label: t.hoTen, hint: this.store.tenNhom(t) })),
  );
  protected moXuLy(id: string): void {
    this.ghiChu.set('');
    this.chuyen.set(false);
    this.nguoiChuyen.set([]);
    this.xemId.set(id);
  }
  protected dong(): void {
    this.xemId.set(null);
  }
  protected themNhan(id: string): void {
    if (id) this.nguoiChuyen.update((l) => [...l, id]);
  }
  protected boNhan(id: string): void {
    this.nguoiChuyen.update((l) => l.filter((x) => x !== id));
  }
  protected ghiTienDo(): void {
    const v = this.chon();
    if (!v) return;
    const err = this.store.phanHoiViec(v.id, this.ghiChu());
    if (err) return this.store.say(err);
    this.ghiChu.set('');
    this.store.say('Đã ghi tiến độ');
  }
  /** Xong: việc rời khỏi bảng (kèm ghi chú nếu có). */
  protected hoanThanh(): void {
    const v = this.chon();
    if (!v) return;
    if (this.ghiChu().trim()) this.store.phanHoiViec(v.id, this.ghiChu());
    const err = this.store.xongViec(v.id, true);
    if (err) return this.store.say(err);
    this.store.say('Đã hoàn thành việc');
    this.dong();
  }
  /** Chuyển cho người / bộ phận liên quan: tạo việc mới cho họ (cùng hồ sơ), ghi vết rồi đóng việc này — Giám đốc không phải can thiệp tiếp. */
  protected chuyenTiep(): void {
    const v = this.chon();
    const ds = this.nguoiChuyen();
    if (!v || !ds.length) return;
    const ten = ds.map((id) => this.store.userName(id)).join(', ');
    const ghi = this.ghiChu().trim();
    const err = this.store.giaoViec({ noiDung: `${v.noiDung}${ghi ? ` — ${ghi}` : ''}`, nguoiNhan: ds, hdbId: v.hdbId, han: todayIso(), gio: v.gio });
    if (err) return this.store.say(err);
    this.store.phanHoiViec(v.id, `Chuyển cho ${ten} tiếp tục xử lý${ghi ? `: ${ghi}` : ''}`);
    this.store.xongViec(v.id, true);
    this.store.say(`Đã chuyển cho ${ten}`);
    this.dong();
  }

  protected readonly soViec = signal(12);
  protected readonly TONES: { k: Viec['tone']; ten: string }[] = [
    { k: 'bad', ten: 'Quá hạn' },
    { k: 'warn', ten: 'Cần xử lý' },
    { k: 'info', ten: 'Nhắc' },
  ];
  protected readonly locViec = signal<Viec['tone'] | ''>('');
  protected readonly demViec = computed(() => {
    const d: Record<Viec['tone'], number> = { bad: 0, warn: 0, info: 0 };
    for (const v of this.viec()) d[v.tone]++;
    return d;
  });
  protected readonly viecLoc = computed(() => {
    const t = this.locViec();
    return t ? this.viec().filter((v) => v.tone === t) : this.viec();
  });
  protected tenTone(t: Viec['tone']): string {
    return this.TONES.find((x) => x.k === t)!.ten;
  }
  protected chonLoc(t: Viec['tone'] | ''): void {
    this.locViec.set(t);
    this.soViec.set(12);
  }

  protected readonly vaiTro = computed(() => this.store.tenNhom(this.store.me()));

  private readonly calcBan = computed(() => {
    const db = this.store.db();
    return this.store
      .hdbVisible()
      .filter((h) => h.trangThai !== TT.BAO_GIA && h.trangThai !== TT.HUY)
      .map((h) => ({ h, c: hdbCalc(h, db) }));
  });
  private readonly calcMua = computed(() => {
    const db = this.store.db();
    return this.store
      .hdmVisible()
      .filter((m) => !m.thuocPhuTai && m.trangThai !== TT.HUY)
      .map((m) => ({ m, c: hdmCalc(m, db) }));
  });

  protected readonly nguon = computed(() =>
    this.store
      .nguonTien()
      .filter((n) => n.trangThai === TT.DANG_DUNG)
      .map((n) => ({ id: n.id, ten: n.ten, soDu: this.store.soDu(n.id).soDu })),
  );
  protected readonly tongSoDu = computed(() => sum(this.nguon(), (n) => n.soDu));

  protected readonly congNo = computed(() => ({
    thu: sum(this.calcBan(), (x) => x.c.conPhaiThu),
    tra: sum(this.calcMua(), (x) => x.c.conPhaiTra),
    quaHanBan: this.calcBan().filter((x) => x.c.quaHan > 0).length,
    quaHanMua: this.calcMua().filter((x) => x.c.quaHan > 0).length,
  }));

  protected readonly choDuyet = computed(() => {
    const s = this.store;
    if (!s.canView('soQuy') && !s.canView('cpHD')) return null;
    const duyet = s.canApprove('soQuyDuyet') || s.canApprove('cpHDDuyet');
    const me = s.meId();
    const phieu = s.phieuChoDuyet().filter((p) => duyet || p.nguoiDeNghi === me);
    const cp = s.cpChoDuyet().filter((c) => duyet || c.nguoiThucHien === me);
    return {
      cuaToi: !duyet,
      phieu: phieu.length,
      cp: cp.length,
      tien: sum(phieu, (p) => p.soTienThu + p.soTienChi) + sum(cp, (c) => c.soTien),
    };
  });

  protected readonly hoSo = computed(() => ({
    tong: this.calcBan().length,
    thieu: this.calcBan().filter((x) => x.c.hoSoThieu.length > 0).length,
    chuaHD: this.calcBan().filter((x) => x.c.daXuatHD <= 0).length,
  }));

  protected readonly tonTheoKho = computed(() => {
    const m = new Map<string, number>();
    for (const r of tonKho(this.store.db())) {
      if (r.kho === KHO_CHUYEN_THANG) continue;
      m.set(r.kho, (m.get(r.kho) ?? 0) + r.ton);
    }
    return [...m.entries()].map(([kho, sl]) => ({ kho, sl, ten: this.store.khoTen(kho) })).sort((a, b) => a.ten.localeCompare(b.ten, 'vi'));
  });

  protected readonly quyPT = computed(() => soDuQuyPT(this.store.db()));

  protected readonly tamUng = computed(() => {
    const me = this.store.meId();
    const rieng = this.store.level('soQuy') === 'draft';
    const list = tamUngTreo(this.store.db()).filter((p) => !rieng || p.nguoiDeNghi === me);
    return { so: list.length, tien: sum(list, (p) => p.soTienChi) };
  });

  protected readonly xoa = computed(() => {
    const s = this.store;
    if (!s.canView('duyetXoa') && !s.coQuyenDuyetXoa()) return null;
    if (s.coQuyenDuyetXoa()) return { cuaToi: false, so: s.xoaChoDuyet().filter((y) => s.duyetXoaDuoc(y)).length };
    return { cuaToi: true, so: s.xoaChoDuyet().filter((y) => y.nguoiGui === s.meId()).length };
  });

  protected readonly viec = computed<Viec[]>(() => {
    const s = this.store;
    const me = s.meId();
    const out: Viec[] = [];
    if (s.canView('hdbTab3')) {
      for (const { h, c } of this.calcBan()) {
        if (c.quaHan > 0)
          out.push({
            loai: 'CÔNG NỢ',
            ma: h.soHD || '(chưa số)',
            text: `HĐ bán ${h.soHD || '(chưa số)'} — ${c.quaHan} đợt thanh toán quá hạn`,
            sub: `${h.tenKH} · còn phải thu ${money(c.conPhaiThu)} đ`,
            link: `/hop-dong-ban/${h.id}`,
            qp: { tab: '3' },
            tone: 'bad',
          });
      }
    }
    if (s.canView('hdm')) {
      for (const { m, c } of this.calcMua()) {
        if (c.quaHan > 0)
          out.push({
            loai: 'HĐ MUA',
            ma: m.soHD || '(chưa số)',
            text: `HĐ mua ${m.soHD || '(chưa số)'} — ${c.quaHan} đợt trả NCC quá hạn`,
            sub: `${m.tenNCC} · còn phải trả ${money(c.conPhaiTra)} đ`,
            link: `/hop-dong-mua/${m.id}`,
            qp: { tab: '4' },
            tone: 'bad',
          });
      }
    }
    if (s.canView('soQuy')) {
      for (const p of s.phieuThuChi()) {
        if (p.trangThai === TT.TU_CHOI && p.nguoiDeNghi === me)
          out.push({
            loai: 'PHÊ DUYỆT',
            ma: p.soPhieu || p.loai,
            text: `Phiếu ${p.soPhieu || p.loai} bị từ chối`,
            sub: `${viDate(p.ngayLap)} · ${p.lyDoTuChoi || p.noiDung}`,
            link: '/ke-toan',
            qp: { tab: 'so-quy', id: p.id },
            tone: 'warn',
          });
      }
    }
    if (s.canView('cpHD')) {
      for (const c of s.chiPhiHD()) {
        if (c.trangThai === TT.TU_CHOI && c.nguoiThucHien === me)
          out.push({
            loai: 'CHI PHÍ',
            ma: c.maCP || '',
            text: `Chi phí HĐ ${c.maCP || ''} bị từ chối`,
            sub: `${s.hdbById(c.hdbId)?.soHD ?? ''} · ${c.lyDoTuChoi || c.noiDung}`,
            link: '/ke-toan',
            qp: { tab: 'chi-phi', id: c.id },
            tone: 'warn',
          });
      }
    }
    if (s.canView('hdbTab3')) {
      for (const { h, c } of this.calcBan()) {
        if (h.trangThai === TT.HOAN_THANH)
          out.push({
            loai: 'HĐ BÁN',
            ma: h.soHD,
            text: `HĐ bán ${h.soHD} Hoàn thành — chưa tất toán`,
            sub: [
              c.conPhaiThu > 0 ? `còn phải thu ${money(c.conPhaiThu)} đ` : '',
              c.hoSoThieu.length ? `thiếu ${c.hoSoThieu.join(', ')}` : '',
              c.cpCho > 0 ? 'còn chi phí chờ duyệt' : '',
            ]
              .filter(Boolean)
              .join(' · ') || 'Đủ điều kiện chuyển Đã tất toán',
            link: `/hop-dong-ban/${h.id}`,
            tone: 'info',
          });
      }
    }
    if (s.canView('phuTai')) {
      const db = s.db();
      for (const p of s.hopDongPhuTai()) {
        if (p.trangThai !== TT.HOAN_THANH || s.dangChoXoa('HopDongPhuTai', p.id)) continue;
        const c = ptCalc(p, db);
        const thieu = hoSoThieu(db, 'HDPT', p.id);
        out.push({
          loai: 'PHÚ TÀI',
            ma: p.soHD,
            text: `HĐ Phú Tài ${p.soHD} Hoàn thành — chưa tất toán`,
          sub:
            [c.khDaTra < c.sauVAT ? `KH còn phải trả PT ${money(c.sauVAT - c.khDaTra)} đ` : '', thieu.length ? `thiếu ${thieu.join(', ')}` : '']
              .filter(Boolean)
              .join(' · ') || 'Kiểm tra Phú Tài đã chuyển đủ phần Oxy được hưởng',
          link: `/phu-tai/${p.id}`,
          tone: 'info',
        });
      }
    }
    // Quá hạn → Cần xử lý → Nhắc; sort ổn định nên giữ thứ tự trong cùng nhóm.
    const uuTien = { bad: 0, warn: 1, info: 2 };
    return out.sort((a, b) => uuTien[a.tone] - uuTien[b.tone]);
  });

  protected lamMoi(): void {
    this.capNhat.set(nowIso());
    this.store.say('Đã làm mới số liệu');
  }
}

