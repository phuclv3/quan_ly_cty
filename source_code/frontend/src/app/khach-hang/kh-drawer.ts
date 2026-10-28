import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { Store } from '../core/store';
import { hdbCalc } from '../core/calc';
import { ChamSocKH, KENH_CS, KenhCS } from '../core/models';
import { TT, ttNhan } from '../core/trang-thai';
import { money, todayIso, viDate } from '../core/util';
import { TrangThai } from '../shared/ui-kit';
import { Icon } from '../shared/icon';
import { NguoiThem } from '../shared/nguoi-them';
import { chuVietTat, mauAvatar } from '../shared/avatar';
import { dangMo, loaiCoHoi } from './co-hoi-data';

/** Một dòng trên dòng thời gian: lần chăm sóc tự nhập, hoặc lịch hẹn gắn khách. */
interface Dong {
  id: string;
  luc: string;
  kind: 'cs' | 'lich';
  cs?: ChamSocKH;
  text?: string;
}

const NHAC = [
  { v: 0, l: 'Không nhắc' },
  { v: 1, l: '1 ngày' },
  { v: 2, l: '2 ngày' },
  { v: 3, l: '3 ngày' },
];

/**
 * Chi tiết khách hàng dạng ngăn bên phải: thông tin tóm tắt, lịch hẹn sắp tới, lịch sử chăm sóc (tự nhập),
 * đặt lịch làm việc (lưu vào Công việc cá nhân, mời người trong công ty tham gia).
 * khId: mã KH đang xem, null = đóng.
 */
@Component({
  selector: 'app-kh-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrangThai, Icon, NguoiThem],
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    @if (k(); as k) {
      <div class="back" (click)="closed.emit()"></div>
      <aside class="drawer" role="dialog" aria-modal="true" [attr.aria-label]="k.ten">
        <header class="head">
          <div class="ma">{{ k.id }}@if (k.tenVietTat) { · {{ k.tenVietTat }} }@if (k.mst) { · MST {{ k.mst }} }@if (k.tinh) { · {{ k.tinh }} }</div>
          <h2>{{ k.ten }}</h2>
          <div class="chips">
            <span class="pt">
              @if (k.phuTrach) { <span class="av" [style.background]="mau(k.phuTrach)">{{ vt(store.userName(k.phuTrach)) }}</span>{{ store.userName(k.phuTrach) }} }
              @else { Chưa phân bổ }
            </span>
            @if (k.nguoiLienHe || k.dienThoai) { <span class="sub">{{ k.nguoiLienHe }}{{ k.dienThoai ? ' · ' + k.dienThoai : '' }}</span> }
          </div>
          <div class="chips">
            <span class="pill">{{ soHD() }} HĐ{{ tienHD() ? ' · ' + short(tienHD()) : '' }}</span>
            @if (chMo(); as c) { <span class="pill">Cơ hội mở {{ c.id }} · {{ short(c.giaTri) }}</span> }
            <app-tt [v]="k.tiepCan || TT.CHUA_LIEN_HE" />
            <app-tt [v]="loaiCoHoi(k.coHoi).l" [t]="loaiCoHoi(k.coHoi).tone" />
          </div>
          <button type="button" class="x" aria-label="Đóng" (click)="closed.emit()"><app-icon name="x" [size]="16" /></button>
        </header>

        <div class="body">
          <section class="box">
            <div class="kv"><span>Phân loại</span><b>{{ k.phanLoai || '—' }}{{ k.nguon ? ' · ' + k.nguon : '' }}</b></div>
            <div class="kv"><span>Việc cần làm</span><b>{{ tiep()?.noiDung || '—' }}</b></div>
            <div class="kv"><span>Hạn liên hệ</span><b>{{ tiep() ? hanNhan(tiep()!.han) : '—' }}</b></div>
            <div class="row-btn">
              @if (edit()) { <button type="button" class="lnk" (click)="sua.emit(k.id)"><app-icon name="edit" [size]="13" /> Sửa khách hàng</button> }
              @if (edit() && daThua()) {
                <button type="button" class="lnk" (click)="taiTiepCan()"><app-icon name="refresh" [size]="13" /> Tái tiếp cận</button>
              }
            </div>
          </section>

          @if (tiep(); as t) {
            <section class="hen">
              <app-icon name="clock" [size]="16" />
              <div>
                <div class="hen-t">LỊCH HẸN SẮP TỚI</div>
                <div>{{ hanNhan(t.han) }}{{ t.gio ? ' · ' + t.gio : '' }} · {{ t.noiDung }}</div>
                @if (t.nguoiNhan.length) { <div class="sub">Cùng: {{ ten(t.nguoiNhan) }}</div> }
              </div>
              @if (coViec() && !t.xongLuc) { <button type="button" class="lnk" (click)="xongLich(t.id)">Xong</button> }
            </section>
          }

          <h3 class="ls-t">Lịch sử tương tác <span class="sub">tự nhập, chỉ thêm — không sửa / xoá</span></h3>
          <ol class="tl">
            @for (n of nhom(); track n.ngay) {
              <li class="day">{{ n.nhan }}</li>
              @for (d of n.ds; track d.id) {
                @if (d.kind === 'lich') {
                  <li class="sys"><span>{{ d.text }}</span></li>
                } @else {
                  @let c = d.cs!;
                  @if (c.nguoi === 'Import') {
                    <li class="sys"><span>Import từ file theo dõi KH · {{ c.noiDung }}</span></li>
                  } @else {
                    <li class="msg" [class.me]="c.nguoi === store.meId()">
                      @if (c.nguoi !== store.meId()) { <span class="av" [style.background]="mau(c.nguoi)" [attr.title]="store.userName(c.nguoi)">{{ vt(store.userName(c.nguoi)) }}</span> }
                      <div class="col">
                        @if (c.nguoi !== store.meId()) { <span class="who">{{ store.userName(c.nguoi) }}</span> }
                        <div class="bub">
                          @if (c.kenh) { <span class="k">{{ c.kenh }}</span> }
                          <div class="nd">{{ c.noiDung }}</div>
                          @if (c.ketQua) { <div class="kq">Kết quả: <b>{{ c.ketQua }}</b></div> }
                          @if (c.coHoi) { <div class="kq">Cơ hội → <app-tt [v]="loaiCoHoi(c.coHoi).l" [t]="loaiCoHoi(c.coHoi).tone" /></div> }
                        </div>
                        <span class="gio">{{ gio(c.luc) }}</span>
                      </div>
                    </li>
                  }
                }
              }
            } @empty {
              <li class="muted">Chưa có lần chăm sóc nào.</li>
            }
          </ol>
        </div>

        @if (edit()) {
          <footer class="foot">
            @if (coViec()) {
              <section class="lich">
                <div class="lich-h"><b>Hẹn lịch làm việc</b></div>
                @if (loiLich()) { <div class="note bad">{{ loiLich() }}</div> }
                <div class="g3">
                  <label>Ngày<input type="date" [value]="lNgay()" (input)="lNgay.set($any($event.target).value)" /></label>
                  <label>Giờ<input type="time" [value]="lGio()" (input)="lGio.set($any($event.target).value)" /></label>
                  <label>Nhắc trước
                    <select (change)="lNhac.set(+$any($event.target).value)">
                      @for (o of NHAC; track o.v) { <option [value]="o.v" [selected]="o.v === lNhac()">{{ o.l }}</option> }
                    </select>
                  </label>
                </div>
                <div class="kenh">
                  @for (o of KENH; track o) { <button type="button" [class.on]="lKenh() === o" (click)="lKenh.set(o)">{{ o }}</button> }
                </div>
                <label>Nội dung<input [value]="lNd()" placeholder="VD Gọi hỏi kết quả duyệt ngân sách" (input)="lNd.set($any($event.target).value)" /></label>
                <app-nguoi-them nhan="Người tham gia" placeholder="Thêm người tham gia — gõ tên hoặc email" [(ids)]="lTg" />
                <div class="lich-f">
                  <span class="sub">Lịch hẹn vào Công việc cá nhân của từng người tham gia.</span>
                  <button type="button" class="btn sm" (click)="luuLich()">Lưu lịch hẹn</button>
                </div>
              </section>
            }
            @if (nd().trim()) {
              <div class="phu">
                <select aria-label="Kênh" (change)="kenh.set($any($event.target).value)">
                  <option value="" [selected]="!kenh()">Kênh</option>
                  @for (o of KENH; track o) { <option [value]="o" [selected]="o === kenh()">{{ o }}</option> }
                </select>
                <input placeholder="Kết quả (tuỳ chọn)" aria-label="Kết quả" [value]="kq()" (input)="kq.set($any($event.target).value)" (keydown.enter)="ghi()" />
              </div>
            }
            <div class="nhap">
              <input class="nd-in" placeholder="Ghi kết quả tương tác…" aria-label="Nội dung tương tác" [value]="nd()"
                (input)="nd.set($any($event.target).value)" (keydown.enter)="ghi()" />
              <button type="button" class="pillb" (click)="coHoi.emit(k.id)">+ Cơ hội</button>
              <button type="button" class="send" aria-label="Ghi tương tác" [disabled]="!nd().trim()" (click)="ghi()"><app-icon name="send" [size]="16" /></button>
            </div>
          </footer>
        } @else {
          <footer class="foot"><div class="note info">Chỉ xem — khách do {{ k.phuTrach ? store.userName(k.phuTrach) : 'người khác' }} phụ trách.</div></footer>
        }
      </aside>
    }
  `,
  styles: `
    :host { display: contents; }
    .back { position: fixed; inset: 0; background: rgba(15, 25, 20, 0.35); z-index: 60; }
    .drawer { position: fixed; top: 12px; right: 12px; bottom: 12px; width: min(480px, calc(100vw - 24px)); background: var(--surf); border-radius: 20px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25); z-index: 61; display: flex; flex-direction: column; overflow: hidden; }
    .head { position: relative; padding: 16px 52px 12px 18px; display: grid; gap: 8px; border-bottom: 1px solid var(--line); }
    .ma { font-size: 11.5px; color: var(--ink-3); }
    h2 { margin: 0; font-size: 20px; line-height: 1.25; }
    .chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
    .pt { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
    .pill { padding: 2px 10px; border-radius: 999px; background: var(--surf-3); font-size: 12px; font-weight: 600; }
    .x { position: absolute; top: 14px; right: 14px; width: 30px; height: 30px; border: 0; border-radius: 50%; background: var(--surf-2); cursor: pointer; display: grid; place-items: center; }
    .av { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 700; flex: 0 0 auto; }
    .body { flex: 1 1 0; min-height: 120px; overflow: auto; padding: 12px 18px; display: grid; gap: 12px; align-content: start; }
    .box { border: 1px solid #f0c9a8; background: #fff6ee; border-radius: 12px; padding: 10px 12px; display: grid; gap: 4px; font-size: 13px; }
    .kv { display: grid; grid-template-columns: 96px 1fr; gap: 8px; }
    .kv span { color: var(--ink-3); }
    .row-btn { display: flex; gap: 14px; margin-top: 4px; }
    .lnk { border: 0; background: none; color: #0f5a2a; font-weight: 600; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 0; }
    .hen { display: flex; gap: 10px; align-items: flex-start; background: #fdf3d6; border-radius: 12px; padding: 10px 12px; font-size: 13px; }
    .hen > div { flex: 1 1 auto; }
    .hen-t { font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; color: #8a5a00; }
    .ls-t { margin: 4px 0 0; font-size: 14px; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .ls-t .sub { font-size: 11px; font-weight: 400; }
    .tl { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .day { text-align: center; font-size: 11.5px; color: var(--ink-3); }
    .sys { text-align: center; }
    .sys span { display: inline-block; padding: 3px 12px; border-radius: 999px; background: var(--surf-2); font-size: 12px; color: var(--ink-2); }
    .msg { display: flex; gap: 8px; align-items: flex-end; max-width: 100%; }
    .msg.me { justify-content: flex-end; }
    .msg .av { margin-bottom: 18px; }
    .col { display: grid; gap: 2px; min-width: 0; max-width: 82%; }
    .msg.me .col { justify-items: end; }
    .who { font-size: 11.5px; color: var(--ink-3); margin-left: 12px; }
    .bub { background: #e9ebee; color: #1c1e21; border-radius: 18px 18px 18px 4px; padding: 7px 13px; min-width: 0; width: fit-content; }
    .msg.me .bub { background: #0f7a3d; color: #fff; border-radius: 18px 18px 4px 18px; }
    .msg.me .bub .kq { color: rgba(255, 255, 255, 0.85); }
    .msg.me .bub .k { background: rgba(255, 255, 255, 0.22); color: #fff; }
    .gio { font-size: 10.5px; color: var(--ink-3); margin: 0 12px; }
    .k { display: inline-block; margin-bottom: 3px; padding: 0 7px; border-radius: 999px; background: #dce9f8; color: #2c5d94; font-size: 10.5px; font-weight: 700; }
    .nd { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13.5px; margin-top: 2px; }
    .kq { font-size: 12px; color: var(--ink-2); margin-top: 3px; }
    .foot { flex: 0 1 auto; max-height: 62%; overflow: auto; border-top: 1px solid var(--line); padding: 10px 14px 0; display: grid; gap: 10px; align-content: start; }
    .lich { border: 1px solid #bfe0c8; background: #f1faf3; border-radius: 12px; padding: 10px 12px; display: grid; gap: 8px; font-size: 12.5px; }
    .lich-h { display: flex; justify-content: space-between; align-items: center; }
    .x2 { border: 0; background: none; cursor: pointer; color: var(--ink-3); }
    .lich label { display: grid; gap: 3px; font-size: 11.5px; color: var(--ink-3); }
    .lich input, .lich select { height: 34px; }
    .g3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .kenh { display: flex; flex-wrap: wrap; gap: 6px; }
    .kenh button { border: 1px solid var(--line-2); background: var(--surf); border-radius: 999px; padding: 3px 12px; font-size: 12px; cursor: pointer; }
    .kenh button.on { background: #e3f1e3; border-color: #0f5a2a; color: #0f5a2a; font-weight: 700; }
    .lich-f { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .lich-f .sub { font-size: 11px; }
    .nhap { display: flex; align-items: center; gap: 8px; position: sticky; bottom: 0; margin-bottom: 14px; padding: 6px 8px 6px 18px; border-radius: 999px; background: #eef2ee; }
    .nhap .nd-in { flex: 1 1 auto; min-width: 0; height: 36px; border: 0; background: transparent; box-shadow: none; padding: 0; font-size: 13.5px; }
    .nhap .nd-in:focus { outline: none; box-shadow: none; }
    .phu { display: flex; gap: 8px; }
    .phu select { width: auto; height: 32px; border-radius: 999px; font-size: 12.5px; }
    .phu input { flex: 1 1 auto; min-width: 0; height: 32px; border-radius: 999px; font-size: 12.5px; }
    .pillb { border: 1.5px solid #16642b; background: var(--surf); color: #16642b; border-radius: 999px; padding: 4px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
    .send { width: 34px; height: 34px; border: 0; border-radius: 50%; background: #0f5a2a; color: #fff; cursor: pointer; display: grid; place-items: center; }
    .send:disabled { opacity: 0.45; cursor: default; }
  `,
})
export class KhDrawer {
  protected readonly TT = TT;
  protected readonly loaiCoHoi = loaiCoHoi;
  protected readonly store = inject(Store);
  protected readonly KENH = KENH_CS;
  protected readonly NHAC = NHAC;
  protected readonly short = (n: number) => (n >= 1e6 ? (n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr' : money(n) + ' đ');
  protected readonly mau = mauAvatar;
  protected readonly vt = chuVietTat;

  readonly khId = input<string | null>(null);
  readonly closed = output<void>();
  /** Yêu cầu mở popup sửa khách hàng. */
  readonly sua = output<string>();
  /** Bấm "+ Cơ hội": màn cha chuyển sang tab Cơ hội. */
  readonly coHoi = output<string>();

  protected readonly k = computed(() => (this.khId() ? (this.store.khById(this.khId()!) ?? null) : null));
  protected readonly edit = computed(
    () => !!this.k() && !this.store.dangChoXoa('DM_KhachHang', this.k()!.id) && this.store.canEditKH(this.k()),
  );
  protected readonly coViec = computed(() => this.store.level('viec') !== 'none');

  protected readonly soHD = computed(() => this.store.hopDongBan().filter((h) => h.maKH === this.khId()).length);
  protected readonly tienHD = computed(() => {
    const db = this.store.db();
    const ds = this.store.hdbVisible().filter((h) => h.maKH === this.khId());
    return this.store.canView('hdbTab3') ? ds.reduce((s, h) => s + hdbCalc(h, db).sauVAT, 0) : 0;
  });
  protected readonly chMo = computed(() => this.k()?.dsCoHoi?.find((c) => dangMo(c.giaiDoan)));

  /** Lịch hẹn gắn khách này (từ Công việc), sớm nhất lên đầu. */
  private readonly lich = computed(() =>
    (this.store.db().viecGiao ?? [])
      .filter((v) => v.khId === this.khId())
      .sort((a, b) => ((a.han ?? '') + (a.gio ?? '')).localeCompare((b.han ?? '') + (b.gio ?? ''))),
  );
  protected readonly tiep = computed(() => this.lich().find((v) => !v.xongLuc && (v.han ?? '') >= todayIso()) ?? null);

  protected readonly nhom = computed(() => {
    const k = this.k();
    if (!k) return [];
    const ds: Dong[] = [
      ...(k.chamSoc ?? []).map((cs): Dong => ({ id: cs.id, luc: cs.luc, kind: 'cs', cs })),
      ...this.lich().map(
        (v): Dong => ({ id: v.id, luc: v.taoLuc, kind: 'lich', text: `Đặt lịch hẹn ${viDate(v.han)}${v.gio ? ' ' + v.gio : ''} · ${v.noiDung}` }),
      ),
    ].sort((a, b) => a.luc.localeCompare(b.luc));
    const hom = todayIso();
    const out: { ngay: string; nhan: string; ds: Dong[] }[] = [];
    for (const d of ds) {
      const ngay = d.luc.slice(0, 10);
      let g = out.find((x) => x.ngay === ngay);
      if (!g) out.push((g = { ngay, nhan: ngay === hom ? 'Hôm nay · ' + viDate(ngay) : viDate(ngay), ds: [] }));
      g.ds.push(d);
    }
    return out;
  });

  // ── Ghi tương tác ──
  protected readonly nd = linkedSignal(() => (this.khId(), ''));
  protected readonly kq = linkedSignal(() => (this.khId(), ''));
  protected readonly kenh = linkedSignal<KenhCS | ''>(() => (this.khId(), ''));

  protected ghi(): void {
    const k = this.k();
    if (!k || (!this.nd().trim() && !this.kq().trim())) return;
    const err = this.store.ghiChamSoc(k.id, this.nd() || this.kq(), { kenh: this.kenh() || undefined, ketQua: this.nd().trim() ? this.kq() : '' });
    if (err) return this.store.say(err, 'bad');
    this.nd.set('');
    this.kq.set('');
    this.kenh.set('');
    this.store.say('Đã ghi tương tác');
  }

  /** Chỉ khách ở trạng thái Thua (Huỷ) mới tái tiếp cận được → về trạng thái mới. */
  protected readonly daThua = computed(() => {
    const k = this.k();
    return !!k && (loaiCoHoi(k.coHoi).v === TT.HUY || !!k.dsCoHoi?.some((c) => c.giaiDoan === 'Thua'));
  });

  /** Tái tiếp cận: khách + các cơ hội đang Thua quay về Mới. */
  protected taiTiepCan(): void {
    const k = this.k();
    if (!k || !this.daThua()) return;
    const ds = (k.dsCoHoi ?? []).map((c) =>
      c.giaiDoan === 'Thua' ? { ...c, giaiDoan: 'Mới' as const, ngayChot: undefined, lyDoThua: undefined, ngayTaiTiepCan: undefined } : c,
    );
    const e = this.store.saveKhachHang({
      ...structuredClone(k),
      dsCoHoi: ds,
      coHoi: k.coHoi === TT.HUY ? TT.CHUA_TIEP_CAN : k.coHoi,
      tiepCan: k.tiepCan === TT.HUY ? TT.CHUA_LIEN_HE : k.tiepCan,
    });
    if (e) return this.store.say(e, 'bad');
    this.store.ghiChamSoc(k.id, 'Tái tiếp cận khách hàng — chuyển về trạng thái Mới');
    this.store.say('Đã tái tiếp cận — chuyển về trạng thái Mới');
  }

  // ── Hẹn lịch ──
  /** Khoá làm mới form hẹn lịch: đổi khách hoặc lưu xong thì xoá trắng. */
  protected readonly hienLich = linkedSignal(() => (this.khId(), 0));
  protected readonly lNgay = linkedSignal(() => (this.hienLich(), todayIso()));
  protected readonly lGio = linkedSignal(() => (this.hienLich(), '09:00'));
  protected readonly lNhac = linkedSignal(() => (this.hienLich(), 1));
  protected readonly lKenh = linkedSignal<KenhCS>(() => (this.hienLich(), 'Gọi điện'));
  protected readonly lNd = linkedSignal(() => (this.hienLich(), ''));
  protected readonly lTg = linkedSignal<string[]>(() => (this.hienLich(), []));
  protected readonly loiLich = signal('');

  protected luuLich(): void {
    const k = this.k();
    if (!k) return;
    this.loiLich.set('');
    if (!this.lNd().trim()) return this.loiLich.set('Nhập nội dung lịch hẹn');
    if (!this.lNgay()) return this.loiLich.set('Chọn ngày hẹn');
    const err = this.store.giaoViec({
      noiDung: `[${k.tenVietTat || k.id}] ${this.lNd().trim()}`,
      nguoiNhan: this.lTg(),
      nhom: '',
      batDau: this.lNgay(),
      han: this.lNgay(),
      gio: this.lGio() || undefined,
      khId: k.id,
      kenh: this.lKenh(),
      nhacTruoc: this.lNhac(),
    });
    if (err) return this.loiLich.set(err);
    this.hienLich.update((n) => n + 1);
    this.store.say('Đã lưu lịch hẹn — xem ở Công việc');
  }

  protected xongLich(id: string): void {
    const err = this.store.xongViec(id, true);
    if (err) this.store.say(err, 'bad');
  }

  protected hanNhan(iso?: string): string {
    if (!iso) return '—';
    const d = Math.round((new Date(iso).getTime() - new Date(todayIso()).getTime()) / 864e5);
    return d === 0 ? 'Hôm nay' : d === 1 ? 'Ngày mai' : viDate(iso);
  }
  protected gio(iso: string): string {
    return iso.slice(11, 16);
  }
  protected ten(ids: string[]): string {
    return ids.map((i) => this.store.userName(i)).join(', ');
  }
}
