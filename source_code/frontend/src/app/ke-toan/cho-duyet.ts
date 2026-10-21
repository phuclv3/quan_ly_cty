import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '../core/store';
import { ChiPhiHD, PhieuThuChi } from '../core/models';
import { chenhLechQuyetToan } from '../core/calc';
import { matches, money, sum, viDate } from '../core/util';
import { Confirm } from '../shared/confirm';
import { Pager, paginate } from '../shared/pager';
import { Icon } from '../shared/icon';
import { LCP_HOA_HONG } from '../core/models';
import { hdbCalc } from '../core/calc';
import { PhieuForm } from './phieu-form';
import { ChiPhiForm } from './chi-phi-form';

type Kieu = 'P' | 'C';

interface CdRow {
  key: string;
  kieu: Kieu;
  id: string;
  so: string;
  ngay: string;
  loai: string;
  noiDung: string;
  soTien: number;
  nguon: string;
  nguoi: string;
  /** Người lập là mình và không phải Giám đốc → không tự duyệt (D-10). */
  tuLap: boolean;
  /** Chiều tác động quỹ: Thu (+), Chi (−), LC (luân chuyển, không tính). */
  chieu: 'Thu' | 'Chi' | 'LC';
  /** KT-15: hoa hồng vượt mức gợi ý (Chênh lệch − Thuế TNDN). */
  canhBao?: string;
  p?: PhieuThuChi;
  c?: ChiPhiHD;
}

/** Tab Chờ duyệt: phiếu thu chi (KT-07) + chi phí HĐ (KT-14). */
@Component({
  selector: 'app-kt-cho-duyet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhieuForm, ChiPhiForm, Pager, Icon],
  template: `
    <div class="filters">
      <label class="search"><app-icon name="search" [size]="16" /><input type="search" placeholder="Tìm số phiếu, nội dung, người lập…" [value]="q()" (input)="q.set($any($event.target).value)" aria-label="Tìm nhanh" /></label>
      <span class="fsel" [class.has]="!!kieu()">
        <select aria-label="Loại" [value]="kieu()" (change)="kieu.set($any($event.target).value)">
          <option value="">Tất cả ({{ all().length }})</option>
          @if (duyetP()) { <option value="P" [selected]="kieu() === 'P'">Phiếu thu chi ({{ demP() }})</option> }
          @if (duyetC()) { <option value="C" [selected]="kieu() === 'C'">Chi phí HĐ ({{ all().length - demP() }})</option> }
        </select>
        @if (kieu()) { <button type="button" class="f-x" aria-label="Bỏ lọc loại" title="Bỏ lọc loại" (click)="kieu.set('')"><app-icon name="x" [size]="14" /></button> }
      </span>
      <button type="button" class="btn quiet f-clear" [disabled]="!q().trim() && !kieu()" (click)="q.set(''); kieu.set('')"><app-icon name="x" [size]="16" /> Xoá lọc</button>
      <span style="flex:1"></span>
      @if (chon().size) {
        <span class="muted">Đã chọn {{ chon().size }} · {{ money(tongChon()) }} đ</span>
        <button type="button" class="btn ok" (click)="duyet(chonRows())">Duyệt đã chọn</button>
        <button type="button" class="btn danger" (click)="tuChoi(chonRows())">Từ chối đã chọn</button>
      }
    </div>
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead>
          <tr>
            <th><input type="checkbox" aria-label="Chọn tất cả" [checked]="tatCa()" (change)="chonTatCa($any($event.target).checked)" /></th>
            <th>Số</th><th>Ngày</th><th>Loại</th><th>Nội dung</th><th class="num">Số tiền</th><th>Nguồn tiền</th><th>Người lập</th><th></th>
          </tr>
        </thead>
        <tbody>
          @for (r of pg.items(); track r.key) {
            <tr class="click" [class.sel]="chon().has(r.key)" (click)="mo(r)">
              <td (click)="$event.stopPropagation()">
                <input type="checkbox" [attr.aria-label]="'Chọn ' + r.so" [disabled]="r.tuLap" [checked]="chon().has(r.key)" (change)="flip(r.key)" />
              </td>
              <td><b>{{ r.so }}</b></td>
              <td>{{ viDate(r.ngay) }}</td>
              <td>@if (r.kieu === 'C') { <span class="tag info">CP HĐ</span> } {{ r.loai }}</td>
              <td>{{ r.noiDung }}@if (r.canhBao) { <span class="tag warn" [attr.title]="r.canhBao">Vượt gợi ý hoa hồng</span> }</td>
              <td class="num">{{ r.chieu === 'Thu' ? '+' : r.chieu === 'Chi' ? '−' : '' }}{{ money(r.soTien) }}</td>
              <td>{{ r.nguon }}</td>
              <td>{{ r.nguoi }}</td>
              <td (click)="$event.stopPropagation()">
                @if (r.tuLap) {
                  <span class="tag mute" title="Người lập không tự duyệt phiếu của mình (trừ Giám đốc)">Không tự duyệt</span>
                } @else {
                  <span class="btn-row">
                    <button type="button" class="btn sm ok" (click)="duyet([r])">Duyệt</button>
                    <button type="button" class="btn sm danger quiet" (click)="tuChoi([r])">Từ chối</button>
                  </span>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="9" class="empty">Không có chứng từ chờ duyệt</td></tr>
          }
        </tbody>
        @if (rows().length) {
          <tfoot>
            <tr><th colspan="5">Tổng {{ rows().length }} chứng từ — Thu</th><td class="num">+{{ money(tongThu()) }}</td><td colspan="3"></td></tr>
            <tr><th colspan="5">Chi (gồm CP HĐ)</th><td class="num">−{{ money(tongChi()) }}</td><td colspan="3" class="sub">Luân chuyển không tính vào Thu / Chi</td></tr>
          </tfoot>
        }
      </table>
    </div>
    <app-pager [pager]="pg" />
    <app-phieu-form [phieu]="phieu()" [duyetDuoc]="!!moRow() && !moRow()!.tuLap" (closed)="dong()" (duyet)="duyetMo()" (tuChoi)="tuChoiMo()" (moPhieu)="moPhieuId($event)" />
    <app-chi-phi-form [chiPhi]="cp()" [duyetDuoc]="!!moRow() && !moRow()!.tuLap" (closed)="dong()" (duyet)="duyetMo()" (tuChoi)="tuChoiMo()" />
  `,
})
export class ChoDuyetTab {
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  protected readonly money = money;
  protected readonly viDate = viDate;

  protected readonly q = signal('');
  protected readonly kieu = signal<'' | Kieu>('');
  protected readonly chon = signal<Set<string>>(new Set());
  protected readonly phieu = signal<PhieuThuChi | null>(null);
  protected readonly cp = signal<ChiPhiHD | null>(null);

  protected readonly duyetP = computed(() => this.store.canApprove('soQuyDuyet'));
  protected readonly duyetC = computed(() => this.store.canApprove('cpHDDuyet'));

  protected readonly all = computed<CdRow[]>(() => {
    const s = this.store;
    const db = s.db();
    const me = s.meId();
    const gd = s.canEdit('tuDuyet');
    const out: CdRow[] = [];
    if (this.duyetP()) {
      for (const p of s.phieuChoDuyet()) {
        const lc = p.loai === 'Luân chuyển';
        // QT tạm ứng: chênh lệch dương = hoàn ứng (Thu), âm = chi bổ sung (Chi).
        const cl = p.loai === 'Quyết toán tạm ứng' ? chenhLechQuyetToan(p, db) : 0;
        out.push({
          key: 'P' + p.id,
          kieu: 'P',
          id: p.id,
          so: p.soPhieu,
          ngay: p.ngayLap,
          loai: p.loai,
          noiDung: p.noiDung,
          chieu: lc ? 'LC' : p.loai === 'Thu' || cl > 0 ? 'Thu' : 'Chi',
          soTien: p.loai === 'Thu' ? p.soTienThu : p.loai === 'Quyết toán tạm ứng' ? Math.abs(cl) : p.soTienChi,
          nguon: lc ? `${s.nguonTen(p.nguonTien)} → ${s.nguonTen(p.nguonTienDen)}` : s.nguonTen(p.nguonTien),
          nguoi: s.userName(p.nguoiDeNghi),
          tuLap: p.nguoiDeNghi === me && !gd,
          p,
        });
      }
    }
    if (this.duyetC()) {
      for (const c of s.cpChoDuyet()) {
        const h = s.hdbById(c.hdbId);
        let canhBao: string | undefined;
        if (h && c.loaiChiPhi === LCP_HOA_HONG) {
          const tong = sum(db.chiPhiHD.filter((x) => x.hdbId === h.id && x.loaiChiPhi === LCP_HOA_HONG && x.trangThai !== 'Từ chối'), (x) => x.soTien);
          const toiDa = hdbCalc(h, db).traKhachToiDa;
          if (tong > toiDa) canhBao = `Tổng hoa hồng HĐ ${h.soHD} ${money(tong)} đ > gợi ý tối đa ${money(toiDa)} đ`;
        }
        out.push({
          key: 'C' + c.id,
          kieu: 'C',
          id: c.id,
          so: c.maCP,
          ngay: c.ngay,
          loai: s.lcpTen(c.loaiChiPhi),
          noiDung: `${c.noiDung} — HĐ ${h?.soHD ?? ''}`,
          chieu: 'Chi',
          canhBao,
          soTien: c.soTien,
          nguon: s.nguonTen(c.nguonTien),
          nguoi: s.userName(c.nguoiThucHien),
          tuLap: c.nguoiThucHien === me && !gd,
          c,
        });
      }
    }
    return out.sort((a, b) => (a.ngay < b.ngay ? -1 : a.ngay > b.ngay ? 1 : a.so.localeCompare(b.so)));
  });
  protected readonly demP = computed(() => this.all().filter((r) => r.kieu === 'P').length);

  protected readonly rows = computed(() => {
    const k = this.kieu();
    const q = this.q();
    return this.all().filter((r) => (!k || r.kieu === k) && matches(q, r.so, r.noiDung, r.loai, r.nguoi, r.nguon));
  });
  protected readonly pg = paginate(this.rows);
  protected readonly tongThu = computed(() => sum(this.rows().filter((r) => r.chieu === 'Thu'), (r) => r.soTien));
  protected readonly tongChi = computed(() => sum(this.rows().filter((r) => r.chieu === 'Chi'), (r) => r.soTien));
  protected readonly chonRows = computed(() => this.rows().filter((r) => this.chon().has(r.key)));
  protected readonly tongChon = computed(() => sum(this.chonRows(), (r) => r.soTien));
  /** Dòng đang mở trong popup (để duyệt ngay trong popup). */
  protected readonly moRow = signal<CdRow | null>(null);
  protected readonly tatCa = computed(() => {
    const ok = this.rows().filter((r) => !r.tuLap);
    return ok.length > 0 && ok.every((r) => this.chon().has(r.key));
  });

  protected flip(key: string): void {
    this.chon.update((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }
  protected chonTatCa(v: boolean): void {
    this.chon.set(v ? new Set(this.rows().filter((r) => !r.tuLap).map((r) => r.key)) : new Set());
  }
  protected mo(r: CdRow): void {
    this.moRow.set(r);
    if (r.p) this.phieu.set(r.p);
    else if (r.c) this.cp.set(r.c);
  }
  protected dong(): void {
    this.moRow.set(null);
    this.phieu.set(null);
    this.cp.set(null);
  }
  /** Mở phiếu liên quan (tạm ứng gốc / quyết toán) — chỉ xem. */
  protected moPhieuId(id: string): void {
    const p = this.store.phieuById(id);
    if (!p) return;
    this.moRow.set(this.all().find((r) => r.key === 'P' + id) ?? null);
    this.phieu.set(p);
  }
  protected async duyetMo(): Promise<void> {
    const r = this.moRow();
    if (r && (await this.duyet([r]))) this.dong();
  }
  protected async tuChoiMo(): Promise<void> {
    const r = this.moRow();
    if (r && (await this.tuChoi([r]))) this.dong();
  }
  private moTa(rows: CdRow[]): string {
    const thu = sum(rows.filter((r) => r.chieu === 'Thu' && !r.tuLap), (r) => r.soTien);
    const chi = sum(rows.filter((r) => r.chieu === 'Chi' && !r.tuLap), (r) => r.soTien);
    const lc = sum(rows.filter((r) => r.chieu === 'LC' && !r.tuLap), (r) => r.soTien);
    return [thu ? `Thu +${money(thu)} đ` : '', chi ? `Chi −${money(chi)} đ` : '', lc ? `Luân chuyển ${money(lc)} đ` : ''].filter(Boolean).join(' · ');
  }

  private ids(rows: CdRow[], k: Kieu): string[] {
    return rows.filter((r) => r.kieu === k && !r.tuLap).map((r) => r.id);
  }
  private xong(rows: CdRow[], errs: (string | null)[], msg: string): void {
    const e = errs.filter((x): x is string => !!x);
    this.chon.update((s) => {
      const n = new Set(s);
      for (const r of rows) n.delete(r.key);
      return n;
    });
    this.store.say(e.length ? e.join(' · ') : msg);
  }

  protected async duyet(rows: CdRow[]): Promise<boolean> {
    const p = this.ids(rows, 'P');
    const c = this.ids(rows, 'C');
    if (!p.length && !c.length) {
      this.store.say('Không có chứng từ nào duyệt được');
      return false;
    }
    const canhBao = rows.filter((r) => r.canhBao).map((r) => `${r.so}: ${r.canhBao}`);
    const ok = await this.confirm.ask({
      title: `Duyệt ${p.length + c.length} chứng từ? ${this.moTa(rows)}`,
      message: 'Chứng từ đã duyệt được cộng / trừ vào số dư nguồn tiền và bị khoá sửa. Muốn bỏ phải gửi yêu cầu xoá.',
      warn: canhBao.length ? canhBao.join(' · ') : undefined,
      ok: 'Duyệt',
    });
    if (!ok) return false;
    const errs = [p.length ? this.store.duyetPhieu(p) : null, c.length ? this.store.duyetChiPhi(c) : null];
    this.xong(rows, errs, `Đã duyệt ${p.length + c.length} chứng từ`);
    return true;
  }

  protected async tuChoi(rows: CdRow[]): Promise<boolean> {
    const p = this.ids(rows, 'P');
    const c = this.ids(rows, 'C');
    if (!p.length && !c.length) {
      this.store.say('Không có chứng từ nào từ chối được');
      return false;
    }
    const lyDo = await this.confirm.prompt({
      title: `Từ chối ${p.length + c.length} chứng từ? ${this.moTa(rows)}`,
      message: 'Chứng từ quay về người lập để sửa và gửi lại.',
      label: 'Lý do từ chối (bắt buộc)',
      minLength: 3,
      multiline: true,
      ok: 'Từ chối',
    });
    if (lyDo === null) return false;
    const errs = [p.length ? this.store.tuChoiPhieu(p, lyDo) : null, c.length ? this.store.tuChoiChiPhi(c, lyDo) : null];
    this.xong(rows, errs, `Đã từ chối ${p.length + c.length} chứng từ`);
    return true;
  }
}
