import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '../core/store';
import { ChiPhiHD, PhieuThuChi } from '../core/models';
import { chenhLechQuyetToan } from '../core/calc';
import { matches, money, sum, viDate } from '../core/util';
import { Confirm } from '../shared/confirm';
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
  p?: PhieuThuChi;
  c?: ChiPhiHD;
}

/** Tab Chờ duyệt: phiếu thu chi (KT-07) + chi phí HĐ (KT-14). */
@Component({
  selector: 'app-kt-cho-duyet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhieuForm, ChiPhiForm],
  template: `
    <div class="filters">
      <label class="search"><input type="search" placeholder="Tìm số phiếu, nội dung, người lập…" [value]="q()" (input)="q.set($any($event.target).value)" /></label>
      <select aria-label="Loại" [value]="kieu()" (change)="kieu.set($any($event.target).value)">
        <option value="">Tất cả ({{ all().length }})</option>
        @if (duyetP()) { <option value="P">Phiếu thu chi ({{ demP() }})</option> }
        @if (duyetC()) { <option value="C">Chi phí HĐ ({{ all().length - demP() }})</option> }
      </select>
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
          @for (r of rows(); track r.key) {
            <tr class="click" [class.sel]="chon().has(r.key)" (click)="mo(r)">
              <td (click)="$event.stopPropagation()">
                <input type="checkbox" [attr.aria-label]="'Chọn ' + r.so" [disabled]="r.tuLap" [checked]="chon().has(r.key)" (change)="flip(r.key)" />
              </td>
              <td><b>{{ r.so }}</b></td>
              <td>{{ viDate(r.ngay) }}</td>
              <td>@if (r.kieu === 'C') { <span class="tag info">CP HĐ</span> } {{ r.loai }}</td>
              <td>{{ r.noiDung }}</td>
              <td class="num">{{ money(r.soTien) }}</td>
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
          <tfoot><tr><th colspan="5">Tổng {{ rows().length }} chứng từ</th><td class="num">{{ money(tong()) }}</td><td colspan="3"></td></tr></tfoot>
        }
      </table>
    </div>
    <app-phieu-form [phieu]="phieu()" (closed)="phieu.set(null)" />
    <app-chi-phi-form [chiPhi]="cp()" (closed)="cp.set(null)" />
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
        out.push({
          key: 'P' + p.id,
          kieu: 'P',
          id: p.id,
          so: p.soPhieu,
          ngay: p.ngayLap,
          loai: p.loai,
          noiDung: p.noiDung,
          soTien: p.loai === 'Thu' ? p.soTienThu : p.loai === 'Quyết toán tạm ứng' ? chenhLechQuyetToan(p, db) : p.soTienChi,
          nguon: lc ? `${s.nguonTen(p.nguonTien)} → ${s.nguonTen(p.nguonTienDen)}` : s.nguonTen(p.nguonTien),
          nguoi: s.userName(p.nguoiDeNghi),
          tuLap: p.nguoiDeNghi === me && !gd,
          p,
        });
      }
    }
    if (this.duyetC()) {
      for (const c of s.cpChoDuyet()) {
        out.push({
          key: 'C' + c.id,
          kieu: 'C',
          id: c.id,
          so: c.maCP,
          ngay: c.ngay,
          loai: s.lcpTen(c.loaiChiPhi),
          noiDung: `${c.noiDung} — HĐ ${s.hdbById(c.hdbId)?.soHD ?? ''}`,
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
  protected readonly tong = computed(() => sum(this.rows(), (r) => r.soTien));
  protected readonly chonRows = computed(() => this.rows().filter((r) => this.chon().has(r.key)));
  protected readonly tongChon = computed(() => sum(this.chonRows(), (r) => r.soTien));
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
    if (r.p) this.phieu.set(r.p);
    else if (r.c) this.cp.set(r.c);
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

  protected async duyet(rows: CdRow[]): Promise<void> {
    const p = this.ids(rows, 'P');
    const c = this.ids(rows, 'C');
    if (!p.length && !c.length) return this.store.say('Không có chứng từ nào duyệt được');
    const ok = await this.confirm.ask({
      title: `Duyệt ${p.length + c.length} chứng từ?`,
      message: 'Chứng từ đã duyệt được cộng / trừ vào số dư nguồn tiền và bị khoá sửa. Muốn bỏ phải gửi yêu cầu xoá.',
      ok: 'Duyệt',
    });
    if (!ok) return;
    const errs = [p.length ? this.store.duyetPhieu(p) : null, c.length ? this.store.duyetChiPhi(c) : null];
    this.xong(rows, errs, `Đã duyệt ${p.length + c.length} chứng từ`);
  }

  protected async tuChoi(rows: CdRow[]): Promise<void> {
    const p = this.ids(rows, 'P');
    const c = this.ids(rows, 'C');
    if (!p.length && !c.length) return this.store.say('Không có chứng từ nào từ chối được');
    const lyDo = await this.confirm.prompt({
      title: `Từ chối ${p.length + c.length} chứng từ?`,
      message: 'Chứng từ quay về người lập để sửa và gửi lại.',
      label: 'Lý do từ chối (bắt buộc)',
      minLength: 3,
      multiline: true,
      ok: 'Từ chối',
    });
    if (lyDo === null) return;
    const errs = [p.length ? this.store.tuChoiPhieu(p, lyDo) : null, c.length ? this.store.tuChoiChiPhi(c, lyDo) : null];
    this.xong(rows, errs, `Đã từ chối ${p.length + c.length} chứng từ`);
  }
}
