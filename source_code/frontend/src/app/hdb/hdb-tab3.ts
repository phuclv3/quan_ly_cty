import { ChangeDetectionStrategy, Component, computed, inject, input, model, signal } from '@angular/core';
import { Store } from '../core/store';
import { DotTTBan, HopDongBan, LCP_HOA_HONG } from '../core/models';
import { Buoc, dotBanDaThu, dotQuaHan, hdbCalc } from '../core/calc';
import { money, pct, sum, todayIso, viDate } from '../core/util';
import { BuocTable, Kpi, MoneyInput, TrangThai } from '../shared/ui-kit';
import { Icon } from '../shared/icon';
import { Confirm } from '../shared/confirm';
import { guiXoa } from '../shared/ho-so';
import { RouterLink } from '@angular/router';

interface ThuNhap {
  ngayThu: string;
  soTienThu: number;
  nguonTienNhan: string;
}

/** HDB-07…HDB-10 — Tab 3 Giá trị & Thanh toán. */
@Component({
  selector: 'app-hdb-tab3',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyInput, BuocTable, Kpi, TrangThai, Icon, RouterLink],
  template: `
    <div class="kpis">
      <app-kpi label="Giá trị sau VAT" [value]="money(c().sauVAT)" />
      <app-kpi label="Đã thu (phiếu đã duyệt)" [value]="money(c().daThu)" [sub]="pct(c().pctThu) + (c().daThuCho ? ' · chờ duyệt ' + money(c().daThuCho) : '')" tone="ok" />
      <app-kpi label="Công nợ phải thu" [value]="money(c().conPhaiThu)" sub="Sau VAT − Σ thực thu đã duyệt" [tone]="c().quaHan ? 'bad' : c().conPhaiThu > 0 ? 'warn' : 'ok'" />
    </div>

    <div class="grid c2">
      <section class="card">
        <h2 class="section-title">Giá trị HĐ & Chênh lệch</h2>
        <div class="form-grid">
          <div class="field">
            <label for="t3-truoc">Tổng GTHĐ trước VAT</label>
            <app-money inputId="t3-truoc" [value]="f().truocVAT" [disabled]="!edit() || khoaGiaTri()" (valueChange)="set('truocVAT', $event)" />
            @if (khoaGiaTri()) { <span class="hint">Khoá vì HĐ đã có phiếu Thu.</span> }
          </div>
          <div class="field">
            <label for="t3-vat">VAT</label>
            <select id="t3-vat" [disabled]="!edit() || khoaGiaTri()" (change)="setVat($any($event.target).value)">
              @for (v of vats; track v) { <option [value]="v" [selected]="v === f().vat">{{ v }}%</option> }
            </select>
          </div>
          <div class="field">
            <span class="lbl">Tổng GTHĐ sau VAT</span>
            <div class="ro num" title="Sau VAT = Trước VAT × (1 + VAT%)">{{ money(c().sauVAT) }}</div>
          </div>
          <div class="field">
            <label for="t3-tt">GTHĐ thực tế trước VAT</label>
            <app-money inputId="t3-tt" [value]="f().thucTeTruocVAT" [disabled]="!edit()" (valueChange)="set('thucTeTruocVAT', $event)" />
          </div>
          <div class="field">
            <span class="lbl">Chênh lệch</span>
            <div class="ro num" [class.neg]="c().chenhLech < 0" title="Chênh lệch = Tổng GTHĐ trước VAT − GTHĐ thực tế trước VAT">{{ money(c().chenhLech) }}</div>
          </div>
          <div class="field">
            <span class="lbl">Tỷ lệ chênh lệch</span>
            <div class="ro num" title="Tỷ lệ = Chênh lệch ÷ GTHĐ thực tế trước VAT">{{ pct(c().tyLeCL) }}</div>
          </div>
        </div>
      </section>

      <section class="card">
        <h2 class="section-title">Thuế TNDN trên chênh lệch</h2>
        <app-buoc [rows]="buocThue()" />
        <p class="sub">Tham số lưu theo HĐ lúc tạo: mốc {{ pct(f().thamSoThue.nguong) }} × GTHĐ thực tế, mức {{ pct(f().thamSoThue.muc1) }} / {{ pct(f().thamSoThue.muc2) }}. Chênh lệch ≤ 0 → thuế = 0.</p>
      </section>
    </div>

    <section class="card">
      <div class="section-title">
        <h2>Tiền trả khách (hoa hồng)</h2>
        <span class="sub">Lưu ở Chi phí thực hiện HĐ loại "Hoa hồng kinh doanh"</span>
      </div>
      <div class="tbl-wrap">
        <table class="tbl compact">
          <thead><tr><th>Người nhận</th><th class="num">Số tiền</th><th>Ngày chi</th><th>Nguồn tiền</th><th>Trạng thái</th></tr></thead>
          <tbody>
            @for (x of hoaHong(); track x.id) {
              <tr><td>{{ x.nguoiNhan || '—' }}</td><td class="num">{{ money(x.soTien) }}</td><td>{{ viDate(x.ngay) }}</td><td>{{ store.nguonTen(x.nguonTien) }}</td><td><app-tt [v]="x.trangThai" /></td></tr>
            } @empty {
              <tr><td colspan="5" class="muted">Chưa có khoản trả khách</td></tr>
            }
          </tbody>
          <tfoot>
            <tr><th>Tổng (trừ Từ chối)</th><td class="num">{{ money(c().tienTraKhach) }}</td><td colspan="3" class="sub">Đã duyệt: {{ money(c().tienTraKhachDuyet) }}</td></tr>
            <tr><th>Gợi ý tối đa</th><td class="num" title="Chênh lệch − Thuế TNDN">{{ money(c().traKhachToiDa) }}</td><td colspan="3" class="sub">= Chênh lệch − Thuế TNDN</td></tr>
          </tfoot>
        </table>
      </div>
      @if (c().tienTraKhach > c().traKhachToiDa) {
        <p class="note warn">Tổng tiền trả khách vượt mức gợi ý tối đa {{ money(c().tienTraKhach - c().traKhachToiDa) }} đ.</p>
      }
      @if (themHH()) {
        <div class="inline-form">
          <input placeholder="Người nhận *" aria-label="Người nhận" [value]="hh().nguoiNhan" (input)="setHH('nguoiNhan', $any($event.target).value)" />
          <app-money placeholder="Số tiền *" [value]="hh().soTien" (valueChange)="setHH('soTien', $event)" />
          <input type="date" aria-label="Ngày chi" [value]="hh().ngay" (input)="setHH('ngay', $any($event.target).value)" />
          <select aria-label="Nguồn tiền" (change)="setHH('nguonTien', $any($event.target).value)">
            @for (n of store.nguonDangDung(); track n.id) { <option [value]="n.id" [selected]="n.id === hh().nguonTien">{{ n.ten }}</option> }
          </select>
          <button type="button" class="btn sm" (click)="luuHH()"><app-icon name="plus" [size]="16" /> Thêm (gửi duyệt)</button>
        </div>
      } @else if (saved() && saved()!.trangThai === 'Báo giá') {
        <p class="sub">HĐ ở Báo giá — chỉ thêm tiền trả khách từ Hiệu lực trở đi.</p>
      }
    </section>

    <section class="card">
      <div class="section-title">
        <h2>Đợt thanh toán</h2>
        <span class="sub">Tối đa {{ max() }} đợt · Σ đợt {{ money(tongDot()) }} / {{ money(c().sauVAT) }}</span>
      </div>
      @if (f().dotTT.length && tongDot() !== c().sauVAT) {
        <p class="note warn">Tổng số tiền các đợt ({{ money(tongDot()) }}) lệch Tổng GTHĐ sau VAT ({{ money(c().sauVAT) }}) {{ money(tongDot() - c().sauVAT) }} đ.</p>
      }
      <div class="tbl-wrap">
        <table class="tbl compact">
          <thead>
            <tr>
              <th>Đợt</th><th class="num">Tỷ lệ %</th><th class="num">Số tiền</th><th>Hạn TT</th><th>Ghi chú</th>
              <th>Ngày thực thu</th><th class="num">Số tiền thực thu</th><th>Nguồn tiền nhận</th><th>Phiếu thu</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (d of f().dotTT; track d.dot; let i = $index, last = $last) {
              <tr [class.overdue]="quaHan(d)">
                <td><b>{{ d.dot }}</b> @if (quaHan(d)) { <app-tt v="Quá hạn" /> }</td>
                <td><input class="num" type="number" min="0" max="100" step="0.1" [value]="d.tyLe ?? ''" [disabled]="!edit()" (input)="setTyLe(i, $any($event.target).value)" /></td>
                <td><app-money [value]="d.soTien" [disabled]="!edit()" (valueChange)="setSoTien(i, $event)" /></td>
                <td><input type="date" [value]="d.han ?? ''" [disabled]="!edit()" (input)="setDot(i, { han: $any($event.target).value || undefined })" /></td>
                <td><input [value]="d.ghiChu ?? ''" [disabled]="!edit()" (input)="setDot(i, { ghiChu: $any($event.target).value })" /></td>
                @if (thuSua(d)) {
                  <td><input type="date" [value]="thu(d).ngayThu" (input)="setThu(d.dot, { ngayThu: $any($event.target).value })" /></td>
                  <td><app-money [value]="thu(d).soTienThu" (valueChange)="setThu(d.dot, { soTienThu: $event })" /></td>
                  <td>
                    <select (change)="setThu(d.dot, { nguonTienNhan: $any($event.target).value })">
                      @for (n of store.nguonDangDung(); track n.id) { <option [value]="n.id" [selected]="n.id === thu(d).nguonTienNhan">{{ n.ten }}</option> }
                    </select>
                  </td>
                } @else {
                  <td>{{ viDate(d.ngayThu) }}</td>
                  <td class="num">{{ d.soTienThu ? money(d.soTienThu) : '—' }}</td>
                  <td>{{ d.nguonTienNhan ? store.nguonTen(d.nguonTienNhan) : '—' }}</td>
                }
                <td>
                  @let p = store.phieuById(d.phieuThuId);
                  @if (p) {
                    @if (xemPhieu()) { <a class="sub linkish" routerLink="/ke-toan" [queryParams]="{ tab: 'so-quy', id: p.id }">{{ p.soPhieu }}</a> }
                    @else { <span class="sub">{{ p.soPhieu }}</span> }
                    @if (store.dangChoXoa('PhieuThuChi', p.id)) { <app-tt v="Chờ xoá" /> } @else { <app-tt [v]="p.trangThai" /> }
                    @if (p.trangThai === 'Đã duyệt' && !khoa() && store.canEdit('hdbThucThu') && store.level('duyetXoa') !== 'none' && !store.dangChoXoa('PhieuThuChi', p.id)) {
                      <button type="button" class="linkish sub" title="Phiếu đã duyệt mà ghi sai: gửi yêu cầu xoá, duyệt xong ghi nhận lại" (click)="xoaPhieu(p.id, p.soPhieu, d.dot)">Yêu cầu xoá phiếu</button>
                    }
                  } @else { <span class="muted">—</span> }
                </td>
                <td class="btn-row">
                  @if (thuSua(d)) { <button type="button" class="btn sm" (click)="ghiThu(d.dot)">Ghi thực thu</button> }
                  @if (edit() && last && !d.soTienThu && !d.phieuThuId) {
                    <button type="button" class="icon-btn sm" aria-label="Xoá đợt" (click)="xoaDot(i)"><app-icon name="trash" [size]="16" /></button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="10" class="muted">Chưa có đợt thanh toán</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (edit() && f().dotTT.length < max() && (f().dotTT.length === 0 || f().dotTT[f().dotTT.length - 1].soTien > 0)) {
        <button type="button" class="btn sm quiet" (click)="themDot()"><app-icon name="plus" [size]="16" /> Thêm đợt {{ f().dotTT.length + 1 }}</button>
      }
      @if (store.canEdit('hdbThucThu') && chuaLuuDot()) {
        <p class="sub">Lưu HĐ trước khi ghi thực thu cho đợt mới / đợt vừa sửa.</p>
      }
      @if (store.canEdit('hdbThucThu') && saved()?.trangThai === 'Báo giá') {
        <p class="sub">HĐ ở Báo giá — chỉ ghi thực thu từ Hiệu lực trở đi.</p>
      }
      <p class="sub">Ghi thực thu sinh 1 phiếu Thu "Chờ duyệt" ở Sổ quỹ. Đợt chỉ tính "Đã thu" (công nợ, tất toán) và số dư nguồn tiền chỉ tăng khi phiếu được duyệt.</p>
    </section>
  `,
})
export class HdbTab3 {
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  readonly f = model.required<HopDongBan>({ alias: 'draft' });
  readonly saved = input<HopDongBan | null>(null);
  readonly edit = input(false);
  readonly khoa = input(false);

  protected readonly money = money;
  protected readonly pct = pct;
  protected readonly viDate = viDate;
  protected readonly vats = [0, 8, 10] as const;

  protected readonly c = computed(() => hdbCalc(this.f(), this.store.db()));
  /** F-08: đã có phiếu Thu (chưa bị từ chối) → khoá Giá trị trước VAT / VAT. */
  protected readonly khoaGiaTri = computed(() => !!this.saved() && this.store.hdbCoPhieuThu(this.saved()!));
  protected readonly max = computed(() => this.store.cauHinh().SO_DOT_TOI_DA);
  protected readonly tongDot = computed(() => sum(this.f().dotTT, (d) => d.soTien));

  protected readonly buocThue = computed<Buoc[]>(() => {
    const h = this.f();
    const t = this.c().thue;
    const ts = h.thamSoThue;
    return [
      { nhan: 'Chênh lệch (CL)', congThuc: 'Tổng GTHĐ trước VAT − GTHĐ thực tế', giaTri: this.c().chenhLech },
      { nhan: 'Mốc', congThuc: `${pct(ts.nguong)} × GTHĐ thực tế trước VAT`, giaTri: Math.round(t.moc) },
      { nhan: 'Phần ≤ mốc', congThuc: 'MIN(CL, Mốc)', giaTri: t.phan1 },
      { nhan: `Thuế phần ≤ mốc`, congThuc: `Phần ≤ mốc × ${pct(ts.muc1)}`, giaTri: t.thue1 },
      { nhan: 'Phần vượt mốc', congThuc: 'MAX(CL − Mốc, 0)', giaTri: t.phan2 },
      { nhan: 'Thuế phần vượt', congThuc: `Phần vượt × ${pct(ts.muc2)}`, giaTri: t.thue2 },
      { nhan: 'Thuế TNDN', congThuc: 'Tổng hai phần', giaTri: t.thue, chinh: true },
    ];
  });

  // ── Tiền trả khách (HDB-09) ──
  protected readonly hoaHong = computed(() =>
    this.store.chiPhiHD().filter((x) => x.hdbId === this.f().id && x.loaiChiPhi === LCP_HOA_HONG),
  );
  protected readonly themHH = computed(() => {
    const s = this.saved();
    return !!s && !this.khoa() && s.trangThai !== 'Báo giá' && this.store.canEdit('cpHD', s.sale);
  });
  protected readonly hh = signal({ nguoiNhan: '', soTien: 0, ngay: todayIso(), nguonTien: '' });
  protected setHH(k: 'nguoiNhan' | 'ngay' | 'nguonTien', v: string): void;
  protected setHH(k: 'soTien', v: number): void;
  protected setHH(k: string, v: string | number): void {
    this.hh.update((x) => ({ ...x, [k]: v }));
  }
  protected async luuHH(): Promise<void> {
    const o = { ...this.hh(), nguoiNhan: this.hh().nguoiNhan.trim() };
    if (!o.nguonTien) o.nguonTien = this.store.nguonDangDung()[0]?.id ?? '';
    const ok = await this.confirm.ask({
      title: `Ghi tiền trả khách ${money(o.soTien)} đ cho ${o.nguoiNhan || '(chưa nhập người nhận)'}?`,
      message: 'Tạo 1 Chi phí thực hiện HĐ loại Hoa hồng kinh doanh ở trạng thái Chờ duyệt. Khi duyệt sẽ trừ vào nguồn tiền đã chọn.',
      ok: 'Gửi duyệt',
    });
    if (!ok) return;
    const err = this.store.themTienTraKhach(this.f().id, o);
    if (err) {
      this.store.say(err);
      return;
    }
    if (this.c().tienTraKhach > this.c().traKhachToiDa) this.store.say('Đã gửi duyệt — lưu ý: tổng tiền trả khách vượt mức gợi ý tối đa');
    else this.store.say('Đã thêm tiền trả khách — chờ duyệt');
    this.hh.set({ nguoiNhan: '', soTien: 0, ngay: todayIso(), nguonTien: o.nguonTien });
  }

  // ── Đợt thanh toán (HDB-10) ──
  protected set<K extends keyof HopDongBan>(k: K, v: HopDongBan[K]): void {
    this.f.update((h) => {
      const next = { ...h, [k]: v };
      // Đổi giá trị/VAT: đợt nhập theo % tự tính lại số tiền.
      if (k === 'truocVAT' || k === 'vat') {
        const sau = hdbCalc(next, this.store.db()).sauVAT;
        next.dotTT = next.dotTT.map((d) => (d.tyLe !== undefined ? { ...d, soTien: Math.round((d.tyLe / 100) * sau) } : d));
      }
      return next;
    });
  }
  protected setVat(raw: string): void {
    const v = Number(raw);
    this.set('vat', v === 0 || v === 8 || v === 10 ? v : 8);
  }
  protected setDot(i: number, p: Partial<DotTTBan>): void {
    this.f.update((h) => ({ ...h, dotTT: h.dotTT.map((d, j) => (j === i ? { ...d, ...p } : d)) }));
  }
  protected setTyLe(i: number, raw: string): void {
    if (raw === '') {
      this.setDot(i, { tyLe: undefined });
      return;
    }
    const tyLe = Math.max(0, Number(raw) || 0);
    this.setDot(i, { tyLe, soTien: Math.round((tyLe / 100) * this.c().sauVAT) });
  }
  protected setSoTien(i: number, soTien: number): void {
    const sau = this.c().sauVAT;
    this.setDot(i, { soTien, tyLe: sau > 0 ? Math.round((soTien / sau) * 1000) / 10 : undefined });
  }
  protected themDot(): void {
    this.f.update((h) => {
      const con = Math.max(0, this.c().sauVAT - sum(h.dotTT, (d) => d.soTien));
      const sau = this.c().sauVAT;
      return {
        ...h,
        dotTT: [...h.dotTT, { dot: h.dotTT.length + 1, soTien: con, tyLe: sau > 0 ? Math.round((con / sau) * 1000) / 10 : undefined }],
      };
    });
  }
  protected xoaDot(i: number): void {
    this.f.update((h) => ({ ...h, dotTT: h.dotTT.filter((_, j) => j !== i) }));
  }
  protected quaHan(d: DotTTBan): boolean {
    return dotQuaHan(d, dotBanDaThu(d, this.store.db()));
  }

  // ── Thực thu (Kế toán) ──
  private readonly thuNhap = signal<Record<number, ThuNhap>>({});
  private dotLuu(dot: number): DotTTBan | undefined {
    return this.saved()?.dotTT.find((x) => x.dot === dot);
  }
  protected readonly chuaLuuDot = computed(() => this.f().dotTT.some((d) => !this.dotLuu(d.dot)));
  /** Số phiếu Thu bấm được (mở popup ở Sổ quỹ) khi có quyền xem Sổ quỹ. */
  protected readonly xemPhieu = computed(() => this.store.canView('soQuy') && this.store.level('soQuy') !== 'draft');
  protected thuSua(d: DotTTBan): boolean {
    if (this.khoa() || !this.store.canEdit('hdbThucThu')) return false;
    if (!this.saved() || this.saved()!.trangThai === 'Báo giá') return false;
    const luu = this.dotLuu(d.dot);
    if (!luu) return false;
    const p = this.store.phieuById(luu.phieuThuId);
    return !p || p.trangThai !== 'Đã duyệt';
  }
  protected thu(d: DotTTBan): ThuNhap {
    return (
      this.thuNhap()[d.dot] ?? {
        ngayThu: d.ngayThu ?? todayIso(),
        soTienThu: d.soTienThu ?? d.soTien,
        nguonTienNhan: d.nguonTienNhan ?? this.store.nguonDangDung()[0]?.id ?? '',
      }
    );
  }
  protected setThu(dot: number, p: Partial<ThuNhap>): void {
    const d = this.f().dotTT.find((x) => x.dot === dot);
    if (!d) return;
    this.thuNhap.update((m) => ({ ...m, [dot]: { ...this.thu(d), ...p } }));
  }
  /** F-03: phiếu Thu đã duyệt nhưng sai → yêu cầu xoá; duyệt xong đợt trở về chưa thu để ghi lại. */
  protected async xoaPhieu(id: string, soPhieu: string, dot: number): Promise<void> {
    await guiXoa(this.confirm, this.store, 'PhieuThuChi', id, `Phiếu Thu ${soPhieu} — đợt ${dot} HĐ bán ${this.saved()?.soHD ?? ''}`);
  }

  protected async ghiThu(dot: number): Promise<void> {
    const d = this.f().dotTT.find((x) => x.dot === dot);
    const s = this.saved();
    if (!d || !s) return;
    const t = this.thu(d);
    const toiDa = this.store.hdbConThuDuoc(s, dot);
    if (t.soTienThu > toiDa) {
      this.store.say(`Số thu vượt phần còn phải thu của HĐ (tối đa ${money(toiDa)} đ)`);
      return;
    }
    const ok = await this.confirm.ask({
      title: `Ghi nhận thực thu đợt ${dot}: ${money(t.soTienThu)} đ?`,
      message: `Ngày thu ${viDate(t.ngayThu)} vào ${this.store.nguonTen(t.nguonTienNhan)}. Hệ thống tạo phiếu Thu Chờ duyệt ở Sổ quỹ; số dư quỹ chỉ tăng khi phiếu được duyệt.`,
      warn: t.soTienThu !== d.soTien ? `Số thu khác số tiền của đợt (${money(d.soTien)} đ), lệch ${money(t.soTienThu - d.soTien)} đ.` : undefined,
      ok: 'Ghi nhận',
    });
    if (!ok) return;
    const err = this.store.ghiThucThu(s.id, dot, this.thu(d));
    if (err) {
      this.store.say(err);
      return;
    }
    this.thuNhap.update((m) => {
      const n = { ...m };
      delete n[dot];
      return n;
    });
    this.store.say(`Đã ghi thực thu đợt ${dot} — phiếu Thu chờ duyệt`);
  }
}
