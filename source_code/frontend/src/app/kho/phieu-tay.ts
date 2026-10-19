import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { KHO_CHUYEN_THANG, PhieuKho } from '../core/models';
import { Store } from '../core/store';
import { todayIso } from '../core/util';
import { Modal, Pick, PickOption } from '../shared/ui-kit';

interface DongNhap {
  loaiHang: string;
  thuocTinh: string;
  soLuong: number;
}

interface Form {
  ngay: string;
  loai: PhieuKho['loai'];
  hdId: string;
  kho: string;
  lyDo: string;
  ghiChu: string;
  dong: DongNhap[];
}

const dongRong = (): DongNhap => ({ loaiHang: '', thuocTinh: '', soLuong: 0 });

/** KHO-06: popup lập phiếu nhập / xuất tay (điều chỉnh). */
@Component({
  selector: 'app-kho-phieu-tay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Pick],
  template: `
    <app-modal [open]="open()" title="Lập phiếu điều chỉnh" sub="Nguồn gốc: Nhập tay – điều chỉnh" size="lg" [dirty]="dirty()" (closed)="closed.emit()">
      <div class="form-grid">
        <div class="field"><label for="pt-ngay">Ngày <span class="req">*</span></label><input id="pt-ngay" type="date" [value]="f().ngay" (input)="set('ngay', $any($event.target).value)" /></div>
        <div class="field">
          <label for="pt-loai">Loại <span class="req">*</span></label>
          <select id="pt-loai" (change)="doiLoai($any($event.target).value)">
            <option value="Nhập" [selected]="f().loai === 'Nhập'">Nhập</option>
            <option value="Xuất" [selected]="f().loai === 'Xuất'">Xuất</option>
          </select>
        </div>
        <div class="field">
          <span class="lbl">Số HĐ liên quan (tuỳ chọn)</span>
          <app-pick [options]="hdOpts()" [value]="f().hdId" [allowEmpty]="true" placeholder="— Không gắn HĐ —" (valueChange)="set('hdId', $event)" />
          <span class="hint">{{ f().loai === 'Xuất' ? 'Chọn từ HĐ bán' : 'Chọn từ HĐ mua' }}</span>
        </div>
        <div class="field">
          <span class="lbl">Vị trí kho <span class="req">*</span></span>
          <app-pick [options]="khoOpts()" [value]="f().kho" (valueChange)="set('kho', $event)" />
          @if (f().kho === ctId) { <span class="hint">Chuyển thẳng: không cộng/trừ tồn (KHO-07)</span> }
        </div>
      </div>

      <h3 class="section-title">Dòng hàng <button type="button" class="btn sm quiet" (click)="themDong()">+ Thêm dòng</button></h3>
      <div class="tbl-wrap">
        <table class="tbl compact">
          <thead><tr><th>Loại hàng</th><th>Thuộc tính</th><th class="num">SL</th><th></th></tr></thead>
          <tbody>
            @for (d of f().dong; track $index; let i = $index) {
              <tr>
                <td style="min-width:240px"><app-pick [options]="lhOpts()" [value]="d.loaiHang" (valueChange)="setDong(i, 'loaiHang', $event)" /></td>
                <td>
                  <input [value]="d.thuocTinh" [placeholder]="goiY(d.loaiHang)" [attr.list]="'pt-tt-' + i" (input)="setDong(i, 'thuocTinh', $any($event.target).value)" aria-label="Thuộc tính" />
                  <datalist [id]="'pt-tt-' + i">@for (v of daDung(d.loaiHang); track v) { <option [value]="v"></option> }</datalist>
                </td>
                <td class="num"><input type="number" min="0" style="width:100px" [value]="d.soLuong || ''" (input)="setDong(i, 'soLuong', +$any($event.target).value)" aria-label="Số lượng" /></td>
                <td><button type="button" class="btn sm quiet danger" [disabled]="f().dong.length === 1" (click)="xoaDong(i)">Xoá</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="hint muted">Chuẩn hoá cách ghi thuộc tính, VD "40L · 150bar" — chọn từ gợi ý (giá trị đã dùng của loại hàng) để không tách thành biến thể mới.</p>

      <div class="form-grid">
        <div class="field wide">
          <label for="pt-lydo">Lý do điều chỉnh <span class="req">*</span></label>
          <textarea id="pt-lydo" rows="2" placeholder="Kiểm kê, hàng mượn trả, sai lệch…" [value]="f().lyDo" (input)="set('lyDo', $any($event.target).value)"></textarea>
        </div>
        <div class="field wide"><label for="pt-gc">Ghi chú</label><textarea id="pt-gc" rows="2" [value]="f().ghiChu" (input)="set('ghiChu', $any($event.target).value)"></textarea></div>
      </div>
      @if (vuot().length) {
        <div class="note warn">Xuất vượt tồn (vẫn cho lưu): {{ vuot().join('; ') }}</div>
      }
      @if (err()) { <div class="note bad">{{ err() }}</div> }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="closed.emit()">Huỷ</button>
        <button type="button" class="btn" (click)="luu()">Lưu phiếu</button>
      </div>
    </app-modal>
  `,
})
export class PhieuTayForm {
  protected readonly store = inject(Store);
  readonly open = input(false);
  readonly loaiMacDinh = input<PhieuKho['loai']>('Nhập');
  readonly closed = output<void>();
  protected readonly ctId = KHO_CHUYEN_THANG;
  protected readonly f = signal<Form>(this.moi());
  protected readonly err = signal('');
  private readonly goc = signal('');
  protected readonly dirty = computed(() => this.open() && JSON.stringify(this.f()) !== this.goc());

  constructor() {
    effect(() => {
      if (this.open()) {
        const f = this.moi();
        this.f.set(f);
        this.goc.set(JSON.stringify(f));
        this.err.set('');
      }
    });
  }

  /** Các giá trị thuộc tính đã dùng của loại hàng (phiếu kho + dòng HĐ mua) — gợi ý để ghi thống nhất. */
  private readonly thuocTinhDaDung = computed(() => {
    const m = new Map<string, Set<string>>();
    const add = (lh: string, v: string) => {
      const t = v.trim();
      if (!lh || !t) return;
      if (!m.has(lh)) m.set(lh, new Set());
      m.get(lh)!.add(t);
    };
    for (const p of this.store.phieuKho()) for (const d of p.dong) add(d.loaiHang, d.thuocTinh);
    for (const h of this.store.hopDongMua()) for (const d of h.chiTiet) add(d.loaiHang, d.thongSo);
    return m;
  });
  protected daDung(lh: string): string[] {
    return [...(this.thuocTinhDaDung().get(lh) ?? [])].sort().slice(0, 50);
  }

  private moi(): Form {
    return { ngay: todayIso(), loai: this.loaiMacDinh(), hdId: '', kho: '', lyDo: '', ghiChu: '', dong: [dongRong()] };
  }

  protected readonly khoOpts = computed<PickOption[]>(() =>
    this.store.khoDangDung().map((k) => ({ value: k.id, label: k.ten, hint: k.id })),
  );
  protected readonly lhOpts = computed<PickOption[]>(() =>
    this.store
      .loaiHang()
      .filter((l) => l.dangDung)
      .map((l) => ({ value: l.id, label: l.ten, hint: `${l.id} · ${l.nhom} · ${l.dvt}` })),
  );
  protected readonly hdOpts = computed<PickOption[]>(() =>
    this.f().loai === 'Xuất'
      ? this.store.hdbVisible().map((h) => ({ value: h.id, label: h.soHD || '(chưa có số)', hint: h.tenKH }))
      : this.store
          .hdmVisible()
          .filter((m) => !m.thuocPhuTai)
          .map((m) => ({ value: m.id, label: m.soHD || '(chưa có số)', hint: m.tenNCC })),
  );
  protected readonly vuot = computed(() => {
    const f = this.f();
    if (f.loai !== 'Xuất' || !f.kho) return [];
    return this.store.vuotTon(
      f.kho,
      f.dong.filter((d) => d.loaiHang && d.soLuong > 0),
    );
  });

  protected goiY(lh: string): string {
    const t = this.store.loaiHangById(lh)?.thuocTinh ?? [];
    return t.length ? t.join(' · ') : 'VD 40L · 150bar';
  }
  protected set<K extends keyof Form>(k: K, v: Form[K]): void {
    this.f.update((f) => ({ ...f, [k]: v }));
  }
  protected doiLoai(v: PhieuKho['loai']): void {
    this.f.update((f) => ({ ...f, loai: v, hdId: '' }));
  }
  protected setDong<K extends keyof DongNhap>(i: number, k: K, v: DongNhap[K]): void {
    this.f.update((f) => ({ ...f, dong: f.dong.map((d, j) => (j === i ? { ...d, [k]: v } : d)) }));
  }
  protected themDong(): void {
    this.f.update((f) => ({ ...f, dong: [...f.dong, dongRong()] }));
  }
  protected xoaDong(i: number): void {
    this.f.update((f) => ({ ...f, dong: f.dong.filter((_, j) => j !== i) }));
  }

  protected luu(): void {
    const f = this.f();
    if (!f.ngay) return this.err.set('Chưa chọn Ngày');
    const e = this.store.savePhieuKhoTay({
      ngay: f.ngay,
      loai: f.loai,
      hdId: f.hdId || undefined,
      kho: f.kho,
      lyDo: f.lyDo.trim(),
      ghiChu: f.ghiChu.trim() || undefined,
      dong: f.dong.map((d) => ({ loaiHang: d.loaiHang, thuocTinh: d.thuocTinh.trim(), soLuong: d.soLuong })),
    });
    if (e) return this.err.set(e);
    this.store.say(
      f.loai === this.loaiMacDinh()
        ? `Đã lập phiếu ${f.loai.toLowerCase()} điều chỉnh`
        : `Đã lập phiếu ${f.loai.toLowerCase()} điều chỉnh — xem ở tab "Phiếu ${f.loai.toLowerCase()}"`,
    );
    this.closed.emit();
  }
}
