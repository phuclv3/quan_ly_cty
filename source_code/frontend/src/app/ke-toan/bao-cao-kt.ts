import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { LCP_VAN_CHUYEN, PhieuThuChi } from '../core/models';
import { tamUngTreo } from '../core/calc';
import { daysFromToday, money, sum, todayIso, viDate } from '../core/util';
import { MoneyInput, Pick, PickOption, TrangThai } from '../shared/ui-kit';
import { esc, inGiay, kyTen } from './kt-print';

type Muc = 'tam-ung' | 'so-du' | 'van-chuyen';

interface NhomTU {
  ten: string;
  rows: PhieuThuChi[];
  tong: number;
}

/** Tab Báo cáo kế toán: Tạm ứng treo (KT-09), Số dư tại ngày (KT-11), Quyết toán vận chuyển (KT-16). ?bc=van-chuyen&hdb=<id> mở sẵn. */
@Component({
  selector: 'app-kt-bao-cao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyInput, Pick, TrangThai, RouterLink],
  template: `
    <div class="btn-row" style="margin-bottom:12px">
      @for (m of mucs(); track m.k) {
        <button type="button" class="btn sm" [class.quiet]="muc() !== m.k" (click)="muc.set(m.k)">{{ m.t }}</button>
      }
    </div>

    @switch (muc()) {
      @case ('tam-ung') {
        <h3 class="section-title">Tạm ứng chưa quyết toán</h3>
        <p class="sub muted">Phiếu Tạm ứng Đã duyệt chưa có Quyết toán Đã duyệt. Số ngày treo tính từ Ngày lập.</p>
        <div class="tbl-wrap">
          <table class="tbl freeze">
            <thead><tr><th>Người nhận</th><th>Số phiếu</th><th>Ngày</th><th class="num">Số tiền tạm ứng</th><th class="num">Số ngày treo</th></tr></thead>
            @for (g of tamUng(); track g.ten) {
              <tbody>
                @for (p of g.rows; track p.id; let i = $index) {
                  <tr [class.overdue]="treo(p) > 30">
                    <td>@if (i === 0) { <b>{{ g.ten }}</b> }</td>
                    <td>{{ p.soPhieu }}</td><td>{{ viDate(p.ngayLap) }}</td><td class="num">{{ money(p.soTienChi) }}</td><td class="num">{{ treo(p) }}</td>
                  </tr>
                }
                <tr><th colspan="3" class="muted">Cộng {{ g.ten }}</th><th class="num">{{ money(g.tong) }}</th><th></th></tr>
              </tbody>
            } @empty {
              <tbody><tr><td colspan="5" class="empty">Không có tạm ứng treo</td></tr></tbody>
            }
            <tfoot><tr><th colspan="3">Tổng</th><td class="num">{{ money(tongTU()) }}</td><td></td></tr></tfoot>
          </table>
        </div>
      }
      @case ('so-du') {
        <h3 class="section-title">Số dư theo nguồn tại ngày</h3>
        <div class="row" style="margin-bottom:10px">
          <label for="sd-ngay">Tại ngày</label>
          <input id="sd-ngay" type="date" [value]="ngay()" (input)="ngay.set($any($event.target).value || today)" />
        </div>
        <div class="tbl-wrap">
          <table class="tbl freeze">
            <thead>
              <tr>
                <th>Nguồn tiền</th><th class="num">Đầu kỳ</th><th class="num" title="Gồm hoàn ứng của quyết toán">Thu</th><th class="num" title="Gồm chi bổ sung của quyết toán">Chi</th>
                <th class="num">LC vào</th><th class="num">LC ra</th><th class="num">CP HĐ</th><th class="num">Số dư tại ngày</th>
                <th class="w-lg">Số dư thực tế</th><th class="num">Chênh lệch</th>
              </tr>
            </thead>
            <tbody>
              @for (r of soDu(); track r.id) {
                <tr>
                  <td><b>{{ r.ten }}</b>@if (r.ngung) { <span class="sub muted">Ngưng</span> }</td>
                  <td class="num">{{ money(r.s.dauKy) }}</td><td class="num">{{ money(r.s.thu + r.s.qtThu) }}</td><td class="num">{{ money(r.s.chi + r.s.qtChi) }}</td>
                  <td class="num">{{ money(r.s.lcVao) }}</td><td class="num">{{ money(r.s.lcRa) }}</td><td class="num">{{ money(r.s.cpHD) }}</td>
                  <td class="num" [class.neg]="r.s.soDu < 0"><b>{{ money(r.s.soDu) }}</b></td>
                  <td><app-money [value]="thucTe()[r.id] ?? 0" (valueChange)="setThucTe(r.id, $event)" placeholder="Sao kê / kiểm quỹ" /></td>
                  <td class="num" [class.neg]="r.cl !== null && r.cl !== 0">{{ r.cl === null ? '' : money(r.cl) }}</td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr><th>Tổng</th><td colspan="6"></td><td class="num">{{ money(tongSoDu()) }}</td><td></td><td></td></tr>
            </tfoot>
          </table>
        </div>
        @if (coLech()) {
          <div class="note warn" style="margin-top:10px">Có chênh lệch giữa sổ và thực tế — kiểm tra phiếu thiếu (chưa lập / chưa duyệt / sai ngày, sai nguồn). Hệ thống không tự sinh bút toán điều chỉnh.</div>
        }
      }
      @case ('van-chuyen') {
        <h3 class="section-title">Quyết toán vận chuyển theo HĐ</h3>
        <div class="row" style="margin-bottom:10px">
          <app-pick [options]="hdOpts()" [value]="hdb()" (valueChange)="hdb.set($event)" placeholder="— Chọn Số HĐ bán —" style="min-width:280px" />
          @if (hd(); as h) {
            <a class="linkish" [routerLink]="['/hop-dong-ban', h.id]">Mở HĐ {{ h.soHD }}</a>
            <span style="flex:1"></span>
            <button type="button" class="btn quiet" (click)="inVC()">In quyết toán (A4)</button>
          }
        </div>
        @if (hd()) {
          <div class="tbl-wrap">
            <table class="tbl freeze">
              <thead><tr><th>Ngày</th><th>Nội dung</th><th>Đơn vị vận chuyển</th><th class="num">Số tiền</th><th>Nguồn tiền</th><th>Trạng thái</th></tr></thead>
              <tbody>
                @for (c of vc(); track c.id) {
                  <tr><td>{{ viDate(c.ngay) }}</td><td>{{ c.noiDung }}</td><td>{{ c.donViVanChuyen || '—' }}</td><td class="num">{{ money(c.soTien) }}</td><td>{{ store.nguonTen(c.nguonTien) }}</td><td><app-tt [v]="c.trangThai" /></td></tr>
                } @empty {
                  <tr><td colspan="6" class="empty">HĐ chưa có chi phí vận chuyển</td></tr>
                }
              </tbody>
              <tfoot>
                <tr><th colspan="3">Tổng đã duyệt</th><td class="num">{{ money(vcDuyet()) }}</td><td colspan="2"></td></tr>
                <tr><th colspan="3">Tổng chờ duyệt</th><td class="num">{{ money(vcCho()) }}</td><td colspan="2"></td></tr>
              </tfoot>
            </table>
          </div>
        } @else {
          <div class="card empty">Chọn một HĐ bán để xem chi phí vận chuyển</div>
        }
      }
    }
  `,
})
export class BaoCaoKtTab {
  protected readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly today = todayIso();

  protected readonly mucs = computed(() => {
    const out: { k: Muc; t: string }[] = [];
    const l = this.store.level('soQuy');
    if (l !== 'none' && l !== 'draft') out.push({ k: 'tam-ung', t: 'Tạm ứng chưa quyết toán' });
    if (this.store.canView('nguonTien')) out.push({ k: 'so-du', t: 'Số dư tại ngày' });
    if (this.store.canView('cpHD')) out.push({ k: 'van-chuyen', t: 'Quyết toán vận chuyển' });
    return out;
  });
  protected readonly muc = signal<Muc>('tam-ung');

  // ── KT-09 ──
  protected readonly tamUng = computed<NhomTU[]>(() => {
    const s = this.store;
    const map = new Map<string, NhomTU>();
    for (const p of tamUngTreo(s.db())) {
      const ten = p.nguoiNhan?.trim() || s.userName(p.nguoiDeNghi);
      let g = map.get(ten);
      if (!g) map.set(ten, (g = { ten, rows: [], tong: 0 }));
      g.rows.push(p);
      g.tong += p.soTienChi;
    }
    return [...map.values()].sort((a, b) => b.tong - a.tong);
  });
  protected readonly tongTU = computed(() => sum(this.tamUng(), (g) => g.tong));
  protected treo(p: PhieuThuChi): number {
    return Math.max(0, -daysFromToday(p.ngayLap));
  }

  // ── KT-11 ──
  protected readonly ngay = signal(todayIso());
  protected readonly thucTe = signal<Record<string, number | undefined>>({});
  protected readonly soDu = computed(() => {
    const x = this.ngay();
    const tt = this.thucTe();
    this.store.db();
    return this.store.nguonTien().map((n) => {
      const s = this.store.soDu(n.id, x);
      const t = tt[n.id];
      return { id: n.id, ten: n.ten, ngung: n.trangThai === 'Ngưng', s, cl: t === undefined ? null : t - s.soDu };
    });
  });
  protected readonly tongSoDu = computed(() => sum(this.soDu(), (r) => r.s.soDu));
  protected readonly coLech = computed(() => this.soDu().some((r) => r.cl !== null && r.cl !== 0));
  protected setThucTe(id: string, v: number): void {
    this.thucTe.update((m) => ({ ...m, [id]: v }));
  }

  // ── KT-16 ──
  protected readonly hdb = signal('');
  protected readonly hdOpts = computed<PickOption[]>(() =>
    this.store
      .hdbVisible()
      .filter((h) => h.trangThai !== 'Báo giá')
      .map((h) => ({ value: h.id, label: h.soHD, hint: h.tenKH })),
  );
  protected readonly hd = computed(() => {
    const id = this.hdb();
    return id ? this.store.hdbVisible().find((h) => h.id === id) : undefined;
  });
  protected readonly vc = computed(() =>
    this.store
      .chiPhiHD()
      .filter((c) => c.hdbId === this.hdb() && c.loaiChiPhi === LCP_VAN_CHUYEN)
      .sort((a, b) => (a.ngay < b.ngay ? -1 : 1)),
  );
  protected readonly vcDuyet = computed(() => sum(this.vc().filter((c) => c.trangThai === 'Đã duyệt'), (c) => c.soTien));
  protected readonly vcCho = computed(() => sum(this.vc().filter((c) => c.trangThai === 'Chờ duyệt'), (c) => c.soTien));

  constructor() {
    const q = this.route.snapshot.queryParamMap;
    const bc = q.get('bc') as Muc | null;
    const ks = this.mucs().map((m) => m.k);
    if (bc && ks.includes(bc)) this.muc.set(bc);
    else if (ks.length) this.muc.set(ks[0]);
    const h = q.get('hdb');
    if (h && this.muc() === 'van-chuyen') this.hdb.set(h);
  }

  protected inVC(): void {
    const h = this.hd();
    if (!h) return;
    const rows = this.vc()
      .map(
        (c, i) =>
          `<tr><td class="c">${i + 1}</td><td>${viDate(c.ngay)}</td><td>${esc(c.noiDung)}</td><td>${esc(c.donViVanChuyen || '')}</td><td class="r">${money(c.soTien)}</td><td>${esc(this.store.nguonTen(c.nguonTien))}</td><td>${esc(c.trangThai)}</td></tr>`,
      )
      .join('');
    const d = todayIso().split('-');
    const body = `
      <div class="head"><div><b>OXY MECIE</b></div><div class="r">Ngày ${d[2]} tháng ${d[1]} năm ${d[0]}</div></div>
      <h1>BẢNG QUYẾT TOÁN CHI PHÍ VẬN CHUYỂN</h1>
      <p class="c">Hợp đồng bán số <b>${esc(h.soHD)}</b> — Khách hàng: ${esc(h.tenKH)}</p>
      <table class="l">
        <thead><tr><th>STT</th><th>Ngày</th><th>Nội dung</th><th>Đơn vị vận chuyển</th><th>Số tiền (đ)</th><th>Nguồn tiền</th><th>Trạng thái</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7" class="c">Không có chi phí vận chuyển</td></tr>'}</tbody>
        <tfoot>
          <tr><th colspan="4" class="r">Tổng đã duyệt</th><th class="r">${money(this.vcDuyet())}</th><th colspan="2"></th></tr>
          <tr><th colspan="4" class="r">Tổng chờ duyệt</th><th class="r">${money(this.vcCho())}</th><th colspan="2"></th></tr>
        </tfoot>
      </table>
      ${kyTen(['Người lập', 'Kế toán', 'Giám đốc'])}
    `;
    if (!inGiay(`Quyết toán vận chuyển ${h.soHD}`, body, 'A4')) this.store.say('Trình duyệt chặn cửa sổ in — hãy cho phép cửa sổ bật lên');
  }
}
