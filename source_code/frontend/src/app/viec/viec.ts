import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ViecGiao } from '../core/models';
import { Store } from '../core/store';
import { daysFromToday, todayIso, viDate, viMoment } from '../core/util';
import { Icon } from '../shared/icon';
import { Modal, PickGo, PickOption } from '../shared/ui-kit';
import { dirtyOf } from '../shared/unsaved';
import { TT } from '../core/trang-thai';

type Xem = 'chua' | 'xong';
type PhamVi = 'toi' | 'toiGiao' | 'tatCa';

interface Soan {
  noiDung: string;
  nguoiNhan: string[];
  hdbId: string;
  han: string;
  gio: string;
}

/**
 * Việc được giao / Đặt lịch (nghiep_vu 09 — ToDoList): giao cho 1 hoặc nhiều người, gắn HĐ, có hạn,
 * phản hồi dạng hội thoại, đánh dấu xong / mở lại. Danh sách tách "Chưa hoàn thành" / "Đã hoàn thành".
 */
@Component({
  selector: 'app-viec',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, Icon, Modal, PickGo],
  styles: [
    `.uu { background: color-mix(in srgb, var(--warn-bg) 55%, transparent); }
     .chat { display: grid; gap: 8px; max-height: 320px; overflow: auto; padding: 4px; }
     .msg { max-width: 80%; padding: 8px 10px; border-radius: 10px; background: var(--surf-2); }
     .msg.toi { justify-self: end; background: var(--ok-bg); }
     .msg.he { justify-self: center; background: none; color: var(--ink-3); font-size: 13px; }
     .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }`,
  ],
  template: `
    <div class="page-head">
      <div><div class="crumbs"><a routerLink="/">Trang chủ</a> › Việc được giao</div><h1>Việc được giao</h1></div>
      @if (store.canEdit('viec', store.meId() ?? undefined)) {
        <div class="actions"><button type="button" class="btn" (click)="moSoan()"><app-icon name="plus" [size]="16" /> Giao việc / Đặt lịch</button></div>
      }
    </div>

    <div class="section-title">
      <div class="tabs" role="tablist" style="position:static;margin:0">
        <button type="button" role="tab" [class.on]="xem() === 'chua'" [attr.aria-selected]="xem() === 'chua'" (click)="xem.set('chua')">Chưa hoàn thành ({{ dem().chua }})</button>
        <button type="button" role="tab" [class.on]="xem() === 'xong'" [attr.aria-selected]="xem() === 'xong'" (click)="xem.set('xong')">Đã hoàn thành ({{ dem().xong }})</button>
      </div>
      <div class="btn-row">
        <select aria-label="Phạm vi" (change)="phamVi.set($any($event.target).value)">
          <option value="toi" [selected]="phamVi() === 'toi'">Việc của tôi / giao cho tôi</option>
          <option value="toiGiao" [selected]="phamVi() === 'toiGiao'">Tôi đã giao</option>
          @if (!store.ownOnly('viec')) { <option value="tatCa" [selected]="phamVi() === 'tatCa'">Tất cả</option> }
        </select>
        <input type="search" placeholder="Tìm việc, số HĐ, người…" [value]="q()" (input)="q.set($any($event.target).value)" aria-label="Tìm việc" />
      </div>
    </div>
    @if (soUuTien()) { <p class="note warn">⭐ {{ soUuTien() }} việc Giám đốc giao chưa hoàn thành.</p> }

    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead><tr><th>Hạn</th><th>Việc</th><th>Hợp đồng</th><th>Người nhận</th><th>Giao bởi</th><th></th></tr></thead>
        <tbody>
          @for (v of rows(); track v.id) {
            <tr [class.uu]="v.uuTien && !v.xongLuc">
              <td>
                {{ v.han ? viDate(v.han) : '—' }}@if (v.gio) { <span class="sub"> {{ v.gio }}</span> }
                @if (!v.xongLuc && v.han) { <div class="sub" [class.neg]="conNgay(v) < 0">{{ conNgayText(v) }}</div> }
              </td>
              <td class="click" (click)="moXem(v.id)">
                @if (v.uuTien) { <span class="tag warn">⭐ Giám đốc giao</span> }
                <b>{{ v.noiDung }}</b>
                @if (v.phanHoi.length) { <span class="sub"> · 💬 {{ soPH(v) }}</span> }
                @if (v.xongLuc) { <div class="sub">✓ Xong {{ viMoment(v.xongLuc) }} — {{ store.userName(v.nguoiXong) }}</div> }
              </td>
              <td>@if (v.hdbId) { <a [routerLink]="['/hop-dong-ban', v.hdbId]">{{ store.hdbById(v.hdbId)?.soHD || '(báo giá)' }}</a> <span class="sub">{{ store.hdbById(v.hdbId)?.tenKH }}</span> } @else { — }</td>
              <td>{{ tenNhan(v) }}</td>
              <td>{{ store.userName(v.nguoiTao) }} <div class="sub">{{ viMoment(v.taoLuc) }}</div></td>
              <td class="btn-row">
                <button type="button" class="btn sm quiet" (click)="moXem(v.id)">💬 Mở</button>
                @if (store.lienQuanViec(v)) {
                  <button type="button" class="btn sm" [class.quiet]="!!v.xongLuc" (click)="doiXong(v)">{{ v.xongLuc ? 'Mở lại' : '✓ Xong' }}</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="empty">{{ xem() === 'chua' ? '🎉 Không có việc nào chưa hoàn thành.' : 'Chưa có việc nào hoàn thành.' }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Giao việc / Đặt lịch -->
    <app-modal #mSoan [open]="!!soan()" title="Giao việc / Đặt lịch" sub="Không chọn người nhận = việc của mình" [dirty]="dirty()" (closed)="soan.set(null)">
      @if (soan(); as s) {
        <div class="form-grid">
          <div class="field full">
            <label for="vg-nd">Nội dung <span class="req">*</span></label>
            <textarea id="vg-nd" rows="3" placeholder="VD gọi lại khách xác nhận lịch giao bình NO 8L" [value]="s.noiDung" (input)="set({ noiDung: $any($event.target).value })"></textarea>
          </div>
          <div class="field full">
            <span class="lbl">Người nhận</span>
            <app-pick-go inputId="vg-nn" [options]="nguoiOpts()" value="" placeholder="Gõ tên để thêm người nhận…" (valueChange)="themNhan($event)" />
            <div class="chips">
              @for (id of s.nguoiNhan; track id) { <span class="tag info">👤 {{ store.userName(id) }} <button type="button" class="linkish" aria-label="Bỏ" (click)="boNhan(id)">✕</button></span> }
              @empty { <span class="sub">👤 Việc của tôi</span> }
            </div>
          </div>
          <div class="field wide">
            <span class="lbl">Hợp đồng bán (tuỳ chọn)</span>
            <app-pick-go inputId="vg-hd" [options]="hdOpts()" [value]="s.hdbId" placeholder="Gõ số HĐ hoặc khách…" (valueChange)="set({ hdbId: $event })" />
          </div>
          <div class="field"><label for="vg-han">Hạn</label><input id="vg-han" type="date" [value]="s.han" (input)="set({ han: $any($event.target).value })" /></div>
          <div class="field"><label for="vg-gio">Giờ</label><input id="vg-gio" type="time" [value]="s.gio" (input)="set({ gio: $any($event.target).value })" /></div>
          <div class="field full">
            <div class="chips">
              @for (n of hanNhanh; track n.t) { <button type="button" class="btn sm quiet" (click)="hanNhanhChon(n.ngay, n.gio)">{{ n.t }}</button> }
            </div>
          </div>
        </div>
        @if (err()) { <div class="note bad">{{ err() }}</div> }
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="soan.set(null)">Huỷ</button>
        <button type="button" class="btn" (click)="guiViec()">📌 {{ soan()?.nguoiNhan?.length ? 'Giao việc' : 'Đặt lịch' }}</button>
      </div>
    </app-modal>

    <!-- Chi tiết việc + phản hồi -->
    <app-modal [open]="!!chon()" [title]="(chon()?.xongLuc ? '✓ ' : '') + (chon()?.nguoiNhan?.length ? '📌 Việc được giao' : '📌 Việc đặt lịch')" size="lg" (closed)="xemId.set(null)">
      @if (chon(); as v) {
        <p style="white-space:pre-wrap"><b>{{ v.noiDung }}</b></p>
        <dl class="tom-tat">
          <div><dt>Giao bởi</dt><dd>{{ store.userName(v.nguoiTao) }} · {{ viMoment(v.taoLuc) }} @if (v.uuTien) { <span class="tag warn">⭐ Giám đốc giao</span> }</dd><span></span></div>
          <div><dt>Người nhận</dt><dd>{{ tenNhan(v) }}</dd><span></span></div>
          <div><dt>Hạn</dt><dd>{{ v.han ? viDate(v.han) : '—' }} {{ v.gio ?? '' }}@if (!v.xongLuc && v.han) { · {{ conNgayText(v) }} }</dd><span></span></div>
          <div><dt>Hợp đồng</dt><dd>@if (v.hdbId) { <a [routerLink]="['/hop-dong-ban', v.hdbId]" (click)="xemId.set(null)">{{ store.hdbById(v.hdbId)?.soHD || '(báo giá)' }}</a> } @else { — }</dd><span></span></div>
          <div><dt>Trạng thái</dt><dd>@if (v.xongLuc) { ✓ Đã hoàn thành {{ viMoment(v.xongLuc) }} — {{ store.userName(v.nguoiXong) }} } @else { Đang làm }</dd><span></span></div>
        </dl>
        <h3 class="section-title">Trao đổi</h3>
        <div class="chat">
          @for (m of v.phanHoi; track $index) {
            <div class="msg" [class.toi]="m.nguoi === store.meId() && !m.heThong" [class.he]="m.heThong">
              @if (!m.heThong) { <div class="sub">{{ store.userName(m.nguoi) }} · {{ viMoment(m.luc) }}</div> }
              <div style="white-space:pre-wrap">{{ m.heThong ? store.userName(m.nguoi) + ': ' + m.noiDung + ' · ' + viMoment(m.luc) : m.noiDung }}</div>
            </div>
          } @empty { <p class="sub">Chưa có phản hồi</p> }
        </div>
        @if (store.lienQuanViec(v)) {
          <div class="form-grid" style="margin-top:8px">
            <div class="field full">
              <textarea rows="2" placeholder="Phản hồi… (Enter gửi, Shift+Enter xuống dòng)" aria-label="Phản hồi" [value]="ph()" (input)="ph.set($any($event.target).value)" (keydown.enter)="enterGui($event)"></textarea>
            </div>
          </div>
        }
      }
      <div foot class="btn-row">
        @if (chon(); as v) {
          @if (store.lienQuanViec(v)) {
            <button type="button" class="btn quiet" [disabled]="!ph().trim()" (click)="gui()">Gửi phản hồi</button>
            <button type="button" class="btn" (click)="doiXong(v)">{{ v.xongLuc ? '↺ Mở lại việc' : '✓ Đánh dấu đã hoàn thành' }}</button>
          }
        }
        <button type="button" class="btn quiet" (click)="xemId.set(null)">Đóng</button>
      </div>
    </app-modal>
  `,
})
export class ViecPage {
  private readonly mSoan = viewChild<Modal>('mSoan');
  protected readonly store = inject(Store);
  protected readonly viDate = viDate;
  protected readonly viMoment = viMoment;
  protected readonly xem = signal<Xem>('chua');
  protected readonly phamVi = signal<PhamVi>('toi');
  protected readonly q = signal('');

  private readonly cuaPhamVi = computed(() => {
    const me = this.store.meId() ?? '';
    const pv = this.phamVi();
    return this.store.viecVisible().filter((v) =>
      pv === 'tatCa' ? true : pv === 'toiGiao' ? v.nguoiTao === me && v.nguoiNhan.length > 0 : v.nguoiNhan.includes(me) || (v.nguoiTao === me && !v.nguoiNhan.length),
    );
  });
  protected readonly dem = computed(() => ({ chua: this.cuaPhamVi().filter((v) => !v.xongLuc).length, xong: this.cuaPhamVi().filter((v) => v.xongLuc).length }));
  protected readonly soUuTien = computed(() => this.cuaPhamVi().filter((v) => v.uuTien && !v.xongLuc).length);
  /** Chưa xong: ưu tiên trước, rồi theo hạn tăng dần; đã xong: xong mới nhất trước. */
  protected readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    const xong = this.xem() === 'xong';
    return this.cuaPhamVi()
      .filter((v) => !!v.xongLuc === xong)
      .filter((v) => !q || `${v.noiDung} ${this.store.hdbById(v.hdbId)?.soHD ?? ''} ${this.store.hdbById(v.hdbId)?.tenKH ?? ''} ${this.tenNhan(v)} ${this.store.userName(v.nguoiTao)}`.toLowerCase().includes(q))
      .sort((a, b) =>
        xong
          ? (b.xongLuc ?? '').localeCompare(a.xongLuc ?? '')
          : Number(!!b.uuTien) - Number(!!a.uuTien) || `${a.han ?? '9'}${a.gio ?? ''}`.localeCompare(`${b.han ?? '9'}${b.gio ?? ''}`),
      );
  });

  // ── Soạn việc ──
  protected readonly soan = signal<Soan | null>(null);
  protected readonly dirty = dirtyOf(this.soan);
  protected readonly err = signal('');
  protected readonly nguoiOpts = computed<PickOption[]>(() =>
    this.store
      .taiKhoan()
      .filter((t) => t.trangThai === TT.HOAT_DONG && t.id !== this.store.meId() && !this.soan()?.nguoiNhan.includes(t.id))
      .map((t) => ({ value: t.id, label: t.hoTen, hint: t.email })),
  );
  protected readonly hdOpts = computed<PickOption[]>(() =>
    this.store
      .hdbVisible()
      .filter((h) => h.trangThai !== TT.DA_TAT_TOAN)
      .map((h) => ({ value: h.id, label: h.soHD || '(báo giá)', hint: `${h.tenKH} · ${this.store.userName(h.sale)}` })),
  );
  protected readonly hanNhanh = (() => {
    const t = todayIso();
    const cong = (n: number) => {
      const d = new Date(`${t}T00:00:00`);
      d.setDate(d.getDate() + n);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const thu = new Date(`${t}T00:00:00`).getDay();
    return [
      { t: 'Hôm nay 17:00', ngay: t, gio: '17:00' },
      { t: 'Sáng mai 08:00', ngay: cong(1), gio: '08:00' },
      { t: 'Chiều mai 14:00', ngay: cong(1), gio: '14:00' },
      { t: 'Thứ Sáu tuần này', ngay: cong((5 - thu + 7) % 7), gio: '17:00' },
      { t: 'Thứ Hai tuần sau', ngay: cong((8 - thu) % 7 || 7), gio: '08:00' },
    ];
  })();

  // ── Xem chi tiết ──
  protected readonly xemId = signal<string | null>(null);
  protected readonly chon = computed(() => this.store.viecVisible().find((v) => v.id === this.xemId()) ?? null);
  protected readonly ph = signal('');

  constructor() {
    // /viec?moi=<hdbId> → soạn việc gắn sẵn HĐ; /viec?id=<việc> → mở chi tiết.
    const route = inject(ActivatedRoute);
    const router = inject(Router);
    const qp = route.snapshot.queryParamMap;
    if (qp.has('moi')) this.moSoan(qp.get('moi') ?? '');
    if (qp.get('id')) this.moXem(qp.get('id')!);
    if (qp.has('moi') || qp.has('id')) void router.navigate([], { relativeTo: route, queryParams: { moi: null, id: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected tenNhan(v: ViecGiao): string {
    return v.nguoiNhan.length ? v.nguoiNhan.map((id) => this.store.userName(id)).join(', ') : `${this.store.userName(v.nguoiTao)} (tự đặt lịch)`;
  }
  protected soPH(v: ViecGiao): number {
    return v.phanHoi.filter((m) => !m.heThong).length;
  }
  protected conNgay(v: ViecGiao): number {
    return v.han ? daysFromToday(v.han) : 0;
  }
  protected conNgayText(v: ViecGiao): string {
    const n = this.conNgay(v);
    return n < 0 ? `quá hạn ${-n} ngày` : n === 0 ? 'hôm nay' : n === 1 ? 'ngày mai' : `còn ${n} ngày`;
  }

  protected moSoan(hdbId = ''): void {
    this.err.set('');
    this.soan.set({ noiDung: '', nguoiNhan: [], hdbId, han: todayIso(), gio: '' });
  }
  protected set(p: Partial<Soan>): void {
    this.soan.update((s) => (s ? { ...s, ...p } : s));
  }
  protected themNhan(id: string): void {
    if (id) this.soan.update((s) => (s && !s.nguoiNhan.includes(id) ? { ...s, nguoiNhan: [...s.nguoiNhan, id] } : s));
  }
  protected boNhan(id: string): void {
    this.soan.update((s) => (s ? { ...s, nguoiNhan: s.nguoiNhan.filter((x) => x !== id) } : s));
  }
  protected hanNhanhChon(ngay: string, gio: string): void {
    this.set({ han: ngay, gio });
  }
  protected guiViec(): void {
    if (this.mSoan()?.kt.hopLe() === false) return;
    const s = this.soan();
    if (!s) return;
    const e = this.store.giaoViec(s);
    if (e) return this.err.set(e);
    this.store.say(s.nguoiNhan.length ? 'Đã giao việc' : 'Đã đặt lịch');
    this.soan.set(null);
  }

  protected moXem(id: string): void {
    this.ph.set('');
    this.xemId.set(id);
  }
  protected enterGui(e: Event): void {
    if ((e as KeyboardEvent).shiftKey) return;
    e.preventDefault();
    this.gui();
  }
  protected gui(): void {
    const v = this.chon();
    if (!v || !this.ph().trim()) return;
    const e = this.store.phanHoiViec(v.id, this.ph());
    if (e) return this.store.say(e);
    this.ph.set('');
  }
  protected doiXong(v: ViecGiao): void {
    const e = this.store.xongViec(v.id, !v.xongLuc);
    this.store.say(e ?? (v.xongLuc ? 'Đã mở lại việc' : 'Đã hoàn thành — ghi vào trao đổi'));
  }
}
