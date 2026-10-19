import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { KHO_CHUYEN_THANG } from '../core/models';
import { hdbCalc, hdmCalc, soDuQuyPT, tamUngTreo, tonKho } from '../core/calc';
import { money, sum, viDate, viMoment, vndShort, nowIso } from '../core/util';
import { Kpi } from '../shared/ui-kit';
import { Icon } from '../shared/icon';

interface Viec {
  text: string;
  sub: string;
  link: string;
  qp?: Record<string, string>;
  tone: 'bad' | 'warn' | 'info';
}

/** NT-07 — Dashboard trang chủ: thẻ theo quyền xem module, mỗi thẻ mở màn chi tiết. */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, Kpi, Icon],
  styles: [
    `.hello{display:flex;align-items:center;gap:14px}.hello img{width:auto;height:40px;max-width:none;object-fit:contain}
    a.dcard{display:grid;gap:8px;align-content:start;text-decoration:none;color:inherit;border-top:3px solid var(--brand)}
    a.dcard:hover{border-color:var(--brand)}a.dcard h3{display:flex;gap:8px;align-items:center;font-size:18px;margin:0}
    a.dcard .big{font-size:28px;font-weight:700}.dl{display:grid;gap:4px;font-size:15.5px}.dl div{display:flex;justify-content:space-between;gap:8px}
    .todo{list-style:none;margin:0;padding:0;display:grid;gap:6px}.todo a{display:flex;gap:10px;align-items:center;text-decoration:none;color:inherit;padding:8px 10px;border-radius:8px;border:1px solid var(--line)}
    .todo a:hover{background:var(--surf-2)}`,
  ],
  template: `
    <div class="page-head">
      <div class="hello">
        <img src="brand/logo-oxymecie.png" alt="Logo Oxy Mecie" width="100" height="40" />
        <div>
          <div class="crumbs">Trang chủ</div>
          <h1>Xin chào, {{ store.me()?.hoTen }}</h1>
          <div class="sub">{{ vaiTro() }} · Số liệu lúc {{ moment(capNhat()) }}</div>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="btn quiet" (click)="lamMoi()"><app-icon name="refresh" [size]="16" /> Làm mới</button>
      </div>
    </div>

    <div class="kpis">
      @if (store.canView('nguonTien')) { <app-kpi label="Tổng số dư nguồn tiền" [value]="short(tongSoDu())" [tone]="tongSoDu() < 0 ? 'bad' : 'ok'" /> }
      @if (store.canView('congNo')) {
        <app-kpi label="Công nợ phải thu" [value]="short(congNo().thu)" [sub]="congNo().quaHanBan + ' HĐ bán quá hạn'" [tone]="congNo().quaHanBan ? 'warn' : ''" />
      }
      @if (choDuyet(); as c) { <app-kpi [label]="c.cuaToi ? 'Phiếu của tôi đang chờ duyệt' : 'Đang chờ duyệt'" [value]="'' + (c.phieu + c.cp)" [tone]="c.phieu + c.cp ? 'warn' : ''" /> }
      <app-kpi label="Việc cần làm" [value]="'' + viec().length" [tone]="viec().length ? 'bad' : 'ok'" />
    </div>

    <div class="grid c3">
      @if (store.canView('nguonTien')) {
        <a class="card dcard" routerLink="/ke-toan" [queryParams]="{ tab: 'nguon' }">
          <h3><app-icon name="bank" [size]="18" /> Số dư nguồn tiền</h3>
          <div class="big num" style="text-align:left" [class.neg]="tongSoDu() < 0">{{ money(tongSoDu()) }} đ</div>
          <div class="dl">
            @for (n of nguon(); track n.id) {
              <div><span>{{ n.ten }}</span><b class="num" [class.neg]="n.soDu < 0">{{ money(n.soDu) }}</b></div>
            } @empty { <span class="muted">Chưa có nguồn tiền</span> }
          </div>
        </a>
      }
      @if (store.canView('congNo')) {
        <a class="card dcard" routerLink="/ke-toan" [queryParams]="{ tab: 'cong-no' }">
          <h3><app-icon name="wallet" [size]="18" /> Công nợ</h3>
          <div class="dl">
            <div><span>Phải thu (HĐ bán)</span><b class="num">{{ money(congNo().thu) }}</b></div>
            <div><span>Phải trả (HĐ mua)</span><b class="num">{{ money(congNo().tra) }}</b></div>
            <div><span>HĐ bán quá hạn thanh toán</span><b [class.neg]="congNo().quaHanBan > 0">{{ congNo().quaHanBan }}</b></div>
            <div><span>HĐ mua quá hạn trả NCC</span><b [class.neg]="congNo().quaHanMua > 0">{{ congNo().quaHanMua }}</b></div>
          </div>
          <span class="sub">Không tính HĐ Báo giá, HĐ mua Huỷ / Thuộc Phú Tài</span>
        </a>
      }
      @if (choDuyet(); as c) {
        <a class="card dcard" routerLink="/ke-toan" [queryParams]="{ tab: 'cho-duyet' }">
          <h3><app-icon name="clock" [size]="18" /> {{ c.cuaToi ? 'Phiếu của tôi chờ duyệt' : 'Chờ duyệt' }}</h3>
          <div class="dl">
            <div><span>Phiếu thu chi</span><b>{{ c.phieu }}</b></div>
            <div><span>Chi phí thực hiện HĐ</span><b>{{ c.cp }}</b></div>
            <div><span>Tổng tiền chờ duyệt</span><b class="num">{{ money(c.tien) }}</b></div>
          </div>
        </a>
      }
      @if (store.canView('hdb')) {
        <a class="card dcard" routerLink="/hop-dong-ban">
          <h3><app-icon name="file" [size]="18" /> Hồ sơ HĐ bán</h3>
          <div class="dl">
            <div><span>HĐ thiếu hồ sơ (chưa lưu)</span><b [class.neg]="hoSo().thieu > 0">{{ hoSo().thieu }}</b></div>
            <div><span>HĐ chưa có hoá đơn</span><b [class.neg]="hoSo().chuaHD > 0">{{ hoSo().chuaHD }}</b></div>
            <div><span>Tổng HĐ (trừ Báo giá)</span><b>{{ hoSo().tong }}</b></div>
          </div>
        </a>
      }
      @if (store.canView('khoTon')) {
        <a class="card dcard" routerLink="/kho">
          <h3><app-icon name="box" [size]="18" /> Tồn kho theo kho</h3>
          <div class="dl">
            @for (k of tonTheoKho(); track k.kho) {
              <div><span>{{ k.ten }}</span><b class="num" [class.neg]="k.sl < 0">{{ money(k.sl) }}</b></div>
            } @empty { <span class="muted">Chưa có tồn kho</span> }
          </div>
          <span class="sub">Tổng số lượng, không tính Chuyển thẳng</span>
        </a>
      }
      @if (store.canView('phuTai')) {
        <a class="card dcard" routerLink="/phu-tai" [queryParams]="{ tab: 'dong-tien' }">
          <h3><app-icon name="handshake" [size]="18" /> Quỹ ảo Phú Tài</h3>
          <div class="big num" style="text-align:left" [class.neg]="quyPT().soDu < 0">{{ money(quyPT().soDu) }} đ</div>
          <div class="dl">
            <div><span>Thu về Phú Tài</span><b class="num">{{ money(quyPT().thu) }}</b></div>
            <div><span>Chi từ Phú Tài</span><b class="num">{{ money(quyPT().chi) }}</b></div>
          </div>
        </a>
      }
      @if (store.canView('soQuy')) {
        <a class="card dcard" routerLink="/ke-toan" [queryParams]="{ tab: 'bao-cao' }">
          <h3><app-icon name="swap" [size]="18" /> Tạm ứng chưa quyết toán</h3>
          <div class="big num" style="text-align:left">{{ money(tamUng().tien) }} đ</div>
          <div class="dl"><div><span>Số phiếu tạm ứng treo</span><b>{{ tamUng().so }}</b></div></div>
          @if (store.level('soQuy') === 'draft') { <span class="sub">Chỉ tính phiếu do bạn đề nghị</span> }
        </a>
      }
      @if (xoa(); as x) {
        <a class="card dcard" routerLink="/duyet-xoa">
          <h3><app-icon name="trash" [size]="18" /> {{ x.cuaToi ? 'Yêu cầu xoá của tôi' : 'Yêu cầu xoá chờ duyệt' }}</h3>
          <div class="big">{{ x.so }}</div>
          <span class="sub">{{ x.cuaToi ? 'Đang chờ người duyệt' : 'Cần bạn duyệt' }}</span>
        </a>
      }
    </div>

    <div class="section-title"><h2>Việc cần làm</h2><span class="sub">{{ viec().length }} việc</span></div>
    <div class="card">
      <ul class="todo">
        @for (v of viec().slice(0, soViec()); track $index) {
          <li>
            <a [routerLink]="v.link" [queryParams]="v.qp">
              <span class="tag" [class]="'tag ' + v.tone">{{ v.tone === 'bad' ? 'Quá hạn' : v.tone === 'warn' ? 'Cần xử lý' : 'Nhắc' }}</span>
              <span class="grow"><b>{{ v.text }}</b><span class="sub" style="display:block">{{ v.sub }}</span></span>
              <app-icon name="chevron" [size]="16" />
            </a>
          </li>
        } @empty {
          <li class="empty">Không có việc tồn đọng.</li>
        }
      </ul>
      @if (viec().length > soViec()) {
        <div class="btn-row" style="margin-top:8px"><button type="button" class="btn sm quiet" (click)="soViec.set(soViec() + 20)">Xem thêm</button></div>
      }
    </div>
  `,
})
export class Dashboard {
  protected readonly store = inject(Store);
  protected readonly money = money;
  protected readonly short = vndShort;
  protected readonly moment = viMoment;
  protected readonly capNhat = signal(nowIso());
  protected readonly soViec = signal(12);

  protected readonly vaiTro = computed(() => this.store.tenNhom(this.store.me()));

  private readonly calcBan = computed(() => {
    const db = this.store.db();
    return this.store
      .hdbVisible()
      .filter((h) => h.trangThai !== 'Báo giá')
      .map((h) => ({ h, c: hdbCalc(h, db) }));
  });
  private readonly calcMua = computed(() => {
    const db = this.store.db();
    return this.store
      .hdmVisible()
      .filter((m) => !m.thuocPhuTai && m.trangThai !== 'Huỷ')
      .map((m) => ({ m, c: hdmCalc(m, db) }));
  });

  protected readonly nguon = computed(() =>
    this.store
      .nguonTien()
      .filter((n) => n.trangThai === 'Đang dùng')
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
    if (!s.canView('duyetXoa')) return null;
    if (s.canApprove('duyetXoa')) return { cuaToi: false, so: s.xoaChoDuyet().filter((y) => s.canDuyetXoa(y)).length };
    return { cuaToi: true, so: s.xoaChoDuyet().filter((y) => y.nguoiGui === s.meId()).length };
  });

  protected readonly viec = computed<Viec[]>(() => {
    const s = this.store;
    const me = s.meId();
    const out: Viec[] = [];
    if (s.canView('hdb')) {
      for (const { h, c } of this.calcBan()) {
        if (c.quaHan > 0)
          out.push({
            text: `HĐ bán ${h.soHD || '(chưa số)'} — ${c.quaHan} đợt thanh toán quá hạn`,
            sub: `${h.tenKH} · còn phải thu ${money(c.conPhaiThu)} đ`,
            link: `/hop-dong-ban/${h.id}`,
            tone: 'bad',
          });
      }
    }
    if (s.canView('hdm')) {
      for (const { m, c } of this.calcMua()) {
        if (c.quaHan > 0)
          out.push({
            text: `HĐ mua ${m.soHD || '(chưa số)'} — ${c.quaHan} đợt trả NCC quá hạn`,
            sub: `${m.tenNCC} · còn phải trả ${money(c.conPhaiTra)} đ`,
            link: `/hop-dong-mua/${m.id}`,
            tone: 'bad',
          });
      }
    }
    if (s.canView('soQuy')) {
      for (const p of s.phieuThuChi()) {
        if (p.trangThai === 'Từ chối' && p.nguoiDeNghi === me)
          out.push({
            text: `Phiếu ${p.soPhieu || p.loai} bị từ chối`,
            sub: `${viDate(p.ngayLap)} · ${p.lyDoTuChoi || p.noiDung}`,
            link: '/ke-toan',
            qp: { tab: 'so-quy' },
            tone: 'warn',
          });
      }
    }
    if (s.canView('cpHD')) {
      for (const c of s.chiPhiHD()) {
        if (c.trangThai === 'Từ chối' && c.nguoiThucHien === me)
          out.push({
            text: `Chi phí HĐ ${c.maCP || ''} bị từ chối`,
            sub: `${s.hdbById(c.hdbId)?.soHD ?? ''} · ${c.lyDoTuChoi || c.noiDung}`,
            link: `/hop-dong-ban/${c.hdbId}`,
            tone: 'warn',
          });
      }
    }
    if (s.canView('hdb')) {
      for (const { h, c } of this.calcBan()) {
        if (h.trangThai === 'Hoàn thành')
          out.push({
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
    return out;
  });

  protected lamMoi(): void {
    this.capNhat.set(nowIso());
    this.store.say('Đã làm mới số liệu');
  }
}

