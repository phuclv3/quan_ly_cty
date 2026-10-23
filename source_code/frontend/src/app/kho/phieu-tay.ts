import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { DongLo, loConHang, phanBoLo, tonTai } from '../core/calc';
import { KHO_CHUYEN_THANG, PhieuKho } from '../core/models';
import { Store } from '../core/store';
import { money, sum, todayIso } from '../core/util';
import { Modal, Pick, PickOption } from '../shared/ui-kit';
import { maHangOpts, moTaMa } from './kho-util';

/** Dòng nhập lô: mã hàng (cố định) + quy cách / nồng độ, SL, đơn giá, VAT (nhập tay). */
interface DongNhap {
  loaiHang: string;
  thuocTinh: string;
  soLuong: number;
  donGia: number;
  vat: number;
  ghiChu: string;
}

/** Dòng xuất: mã hàng → lô (bỏ trống = tự trừ lô nhập trước), SL, tên ghi trên HĐ bán. */
interface DongXuatF {
  loaiHang: string;
  lo: string;
  soLuong: number;
  tenTrenHD: string;
  ghiChu: string;
}

interface Form {
  ngay: string;
  loai: PhieuKho['loai'];
  hdId: string;
  kho: string;
  soHoaDon: string;
  ncc: string;
  lyDo: string;
  ghiChu: string;
  nhap: DongNhap[];
  xuat: DongXuatF[];
}

const nhapRong = (): DongNhap => ({ loaiHang: '', thuocTinh: '', soLuong: 0, donGia: 0, vat: 8, ghiChu: '' });
const xuatRong = (): DongXuatF => ({ loaiHang: '', lo: '', soLuong: 0, tenTrenHD: '', ghiChu: '' });

/** KHO-06: popup lập phiếu nhập (mỗi dòng = 1 lô có đơn giá) / phiếu xuất (trừ theo lô). */
@Component({
  selector: 'app-kho-phieu-tay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Pick],
  template: `
    <app-modal #mTay [open]="open()" [title]="f().loai === 'Nhập' ? 'Lập phiếu nhập kho' : 'Lập phiếu xuất kho'" [sub]="f().loai === 'Nhập' ? 'Nhập kho' : 'Nguồn gốc: Nhập tay – điều chỉnh'" size="lg" [dirty]="dirty()" (closed)="closed.emit()">
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
          <span class="lbl">Vị trí kho <span class="req">*</span></span>
          <app-pick [options]="khoOpts()" [value]="f().kho" (valueChange)="doiKho($event)" />
          @if (f().kho === ctId) { <span class="hint">Chuyển thẳng: không cộng/trừ tồn, không theo lô (KHO-07)</span> }
        </div>
        @if (f().loai === 'Nhập') {
          <div class="field">
            <span class="lbl">Nhà cung cấp</span>
            <app-pick [options]="nccOpts()" [value]="f().ncc" [allowEmpty]="true" placeholder="— Chọn NCC —" (valueChange)="set('ncc', $event)" />
          </div>
          <div class="field">
            <label for="pt-shd">Số hoá đơn NCC <span class="req">*</span></label>
            <input id="pt-shd" placeholder="VD HĐ 259" [value]="f().soHoaDon" (input)="set('soHoaDon', $any($event.target).value)" />
            <span class="hint">Mã lô sinh theo số hoá đơn: L259-01, L259-02…</span>
          </div>
          <div class="field">
            <span class="lbl">HĐ mua liên quan <span class="req">*</span></span>
            <app-pick [options]="hdOpts()" [value]="f().hdId" placeholder="— Chọn HĐ mua —" (valueChange)="set('hdId', $event)" />
          </div>
        } @else {
          <div class="field wide">
            <span class="lbl">HĐ bán (xuất cho hợp đồng)</span>
            <app-pick [options]="hdOpts()" [value]="f().hdId" [allowEmpty]="true" placeholder="— Không gắn HĐ —" (valueChange)="set('hdId', $event)" />
            <span class="hint">Giá vốn của phiếu cộng vào HĐ bán này</span>
          </div>
        }
      </div>

      @if (f().loai === 'Nhập') {
        <h3 class="section-title">Lô nhập <button type="button" class="btn sm quiet" (click)="themNhap()">+ Thêm dòng</button></h3>
        <div class="note warn">Lưu ý: mã nhập kho và tên hàng xuất hoá đơn phải ghi đúng theo hoá đơn NCC gửi về.</div>
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead><tr><th style="min-width:260px">Mã hàng <span class="req">*</span></th><th>Quy cách / nồng độ</th><th class="num">SL <span class="req">*</span></th><th class="num">Đơn giá chưa VAT <span class="req">*</span></th><th class="num">VAT %</th><th class="num">Thành tiền</th><th>Ghi chú</th><th></th></tr></thead>
            <tbody>
              @for (d of f().nhap; track $index; let i = $index) {
                <tr>
                  <td>
                    <app-pick [options]="maOpts()" [value]="d.loaiHang" (valueChange)="setNhap(i, 'loaiHang', $event)" />
                    @if (d.loaiHang) { <span class="hint">{{ moTa(d.loaiHang) }}</span> }
                  </td>
                  <td>
                    <input [value]="d.thuocTinh" placeholder="VD NO 500ppm, COD 50ppm" [attr.list]="'pt-qc-' + i" (input)="setNhap(i, 'thuocTinh', $any($event.target).value)" aria-label="Quy cách / nồng độ" />
                    <datalist [id]="'pt-qc-' + i">@for (v of daDung(d.loaiHang); track v) { <option [value]="v"></option> }</datalist>
                  </td>
                  <td class="num"><input type="number" min="0" [value]="d.soLuong || ''" (input)="setNhap(i, 'soLuong', +$any($event.target).value)" aria-label="Số lượng" /></td>
                  <td class="num"><input type="number" min="0" step="1000" [value]="d.donGia || ''" (input)="setNhap(i, 'donGia', +$any($event.target).value)" aria-label="Đơn giá chưa VAT" /></td>
                  <td class="num"><input type="number" min="0" max="10" style="width:64px" [value]="d.vat" (input)="setNhap(i, 'vat', +$any($event.target).value)" aria-label="VAT %" /></td>
                  <td class="num">{{ money(d.soLuong * d.donGia) }}</td>
                  <td><input [value]="d.ghiChu" (input)="setNhap(i, 'ghiChu', $any($event.target).value)" aria-label="Ghi chú dòng" /></td>
                  <td><button type="button" class="btn sm quiet danger" [disabled]="f().nhap.length === 1" (click)="xoaNhap(i)">Xoá</button></td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr><td colspan="5">Tổng chưa VAT</td><td class="num">{{ money(tongNhap()) }}</td><td colspan="2"></td></tr>
              <tr><td colspan="5">Tiền VAT · Tổng sau VAT</td><td class="num">{{ money(vatNhap()) }} · <b>{{ money(tongNhap() + vatNhap()) }}</b></td><td colspan="2"></td></tr>
            </tfoot>
          </table>
        </div>
        <p class="hint muted">Mã hàng là danh mục cố định (nhóm · thể tích · ĐVT). Nồng độ khách đặt và đơn giá ghi theo từng lô — cùng mã nhập nhiều lần giá khác nhau là nhiều lô.</p>
      } @else {
        <h3 class="section-title">Dòng xuất <button type="button" class="btn sm quiet" (click)="themXuat()">+ Thêm dòng</button></h3>
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead><tr><th style="min-width:240px">Mã hàng <span class="req">*</span></th><th style="min-width:220px">Lô</th><th class="num">SL <span class="req">*</span></th><th class="num">Giá vốn</th><th>Tên hàng trên HĐ</th><th>Ghi chú</th><th></th></tr></thead>
            <tbody>
              @for (d of f().xuat; track $index; let i = $index) {
                <tr>
                  <td>
                    <app-pick [options]="maXuatOpts()" [value]="d.loaiHang" (valueChange)="setXuat(i, { loaiHang: $event, lo: '' })" />
                    @if (d.loaiHang && f().kho !== ctId) { <span class="hint">Tồn tại kho: {{ money(ton(d.loaiHang)) }}</span> }
                  </td>
                  <td>
                    @if (f().kho === ctId) { <span class="muted">Không theo lô</span> } @else {
                      <select (change)="setXuat(i, { lo: $any($event.target).value })" aria-label="Lô" [disabled]="!d.loaiHang">
                        <option value="" [selected]="!d.lo">Tự chọn lô nhập trước (FIFO)</option>
                        @for (l of lots(d.loaiHang); track l.lo) {
                          <option [value]="l.lo" [selected]="l.lo === d.lo">{{ l.lo }} · tồn {{ l.ton }} · {{ money(l.donGia) }}{{ l.quyCach ? ' · ' + l.quyCach.slice(0, 40) : '' }}</option>
                        }
                      </select>
                    }
                  </td>
                  <td class="num"><input type="number" min="0" [value]="d.soLuong || ''" (input)="setXuat(i, { soLuong: +$any($event.target).value })" aria-label="Số lượng" /></td>
                  <td class="num">{{ money(giaVon(d)) }}</td>
                  <td>
                    <input [value]="d.tenTrenHD" placeholder="Gõ tên như trên HĐ" list="pt-ten-hd" (change)="chonTen(i, $any($event.target).value)" aria-label="Tên hàng trên HĐ" />
                  </td>
                  <td><input [value]="d.ghiChu" (input)="setXuat(i, { ghiChu: $any($event.target).value })" aria-label="Ghi chú dòng" /></td>
                  <td><button type="button" class="btn sm quiet danger" [disabled]="f().xuat.length === 1" (click)="xoaXuat(i)">Xoá</button></td>
                </tr>
              }
            </tbody>
            <tfoot><tr><td colspan="3">Tổng giá vốn</td><td class="num">{{ money(tongXuat()) }}</td><td colspan="3"></td></tr></tfoot>
          </table>
          <datalist id="pt-ten-hd">@for (a of tenDaGan(); track a.id) { <option [value]="a.ten">{{ a.loaiHang }}{{ a.nongDo ? ' · ' + a.nongDo : '' }}</option> }</datalist>
        </div>
        <p class="hint muted">Giá vốn lấy đúng đơn giá của lô bị trừ. Không chọn lô thì hệ thống trừ lô nhập trước, có thể tách nhiều lô. Không cho xuất quá tồn, không trừ lô nhập sau ngày xuất.
          Gõ "Tên hàng trên HĐ" đã gán ở tab Ánh xạ tên bán → tự điền mã hàng + lô hay dùng.</p>
      }

      <div class="form-grid">
        <div class="field wide">
          <label for="pt-lydo">Lý do @if (!coChungTu()) { <span class="req">*</span> }</label>
          <textarea id="pt-lydo" rows="2" [placeholder]="f().loai === 'Nhập' ? 'Bắt buộc khi không có số hoá đơn: tồn đầu kỳ, hàng trả lại, kiểm kê…' : 'Bắt buộc khi không gắn HĐ bán: mượn, hỏng, kiểm kê…'" [value]="f().lyDo" (input)="set('lyDo', $any($event.target).value)"></textarea>
        </div>
        <div class="field wide"><label for="pt-gc">Ghi chú</label><textarea id="pt-gc" rows="2" [value]="f().ghiChu" (input)="set('ghiChu', $any($event.target).value)"></textarea></div>
      </div>
      @if (canhBao()) { <div class="note warn">{{ canhBao() }}</div> }
      @if (err()) { <div class="note bad">{{ err() }}</div> }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="closed.emit()">Huỷ</button>
        <button type="button" class="btn" (click)="luu()">Lưu phiếu</button>
      </div>
    </app-modal>
  `,
})
export class PhieuTayForm {
  private readonly mTay = viewChild<Modal>('mTay');
  protected readonly store = inject(Store);
  readonly open = input(false);
  readonly loaiMacDinh = input<PhieuKho['loai']>('Nhập');
  readonly closed = output<void>();
  protected readonly ctId = KHO_CHUYEN_THANG;
  protected readonly money = money;
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

  /** Quy cách / nồng độ đã dùng của mã hàng (phiếu kho + dòng HĐ mua) — gợi ý để ghi thống nhất. */
  private readonly quyCachDaDung = computed(() => {
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
    return [...(this.quyCachDaDung().get(lh) ?? [])].sort().slice(0, 50);
  }

  private moi(): Form {
    const kho = this.store.khoDangDung().find((k) => k.id !== KHO_CHUYEN_THANG)?.id ?? '';
    return { ngay: todayIso(), loai: this.loaiMacDinh(), hdId: '', kho, soHoaDon: '', ncc: '', lyDo: '', ghiChu: '', nhap: [nhapRong()], xuat: [xuatRong()] };
  }

  protected readonly khoOpts = computed<PickOption[]>(() => this.store.khoDangDung().map((k) => ({ value: k.id, label: k.ten, hint: k.id })));
  protected readonly nccOpts = computed<PickOption[]>(() =>
    this.store
      .ncc()
      .filter((n) => n.trangThai !== 'Ngưng')
      .map((n) => ({ value: n.id, label: n.ten, hint: n.id })),
  );
  protected readonly maOpts = computed(() => maHangOpts(this.store.loaiHang().filter((l) => l.dangDung)));
  /** Xuất: chỉ mã còn hàng tại kho đã chọn (Chuyển thẳng: mọi mã). */
  protected readonly maXuatOpts = computed(() => {
    const f = this.f();
    if (f.kho === KHO_CHUYEN_THANG) return this.maOpts();
    const con = new Set(loConHangTatCa(this.store, f.kho).map((l) => l.loaiHang));
    return maHangOpts(this.store.loaiHang().filter((l) => con.has(l.id)));
  });
  protected readonly hdOpts = computed<PickOption[]>(() =>
    this.f().loai === 'Xuất'
      ? this.store.hdbVisible().map((h) => ({ value: h.id, label: h.soHD || '(chưa có số)', hint: h.tenKH }))
      : this.store
          .hdmVisible()
          .filter((m) => !m.thuocPhuTai)
          .map((m) => ({ value: m.id, label: m.soHD || '(chưa có số)', hint: m.tenNCC })),
  );
  protected readonly coChungTu = computed(() => (this.f().loai === 'Nhập' ? !!this.f().soHoaDon.trim() : !!this.f().hdId));
  protected readonly tongNhap = computed(() => sum(this.f().nhap, (d) => d.soLuong * d.donGia));
  protected readonly tongXuat = computed(() => sum(this.f().xuat, (d) => this.giaVon(d)));
  protected readonly vatNhap = computed(() => sum(this.f().nhap, (d) => Math.round((d.soLuong * d.donGia * (d.vat || 0)) / 100)));
  /** Tên hàng HĐ bán đã gán mã (sheet "5. AnhXaTenBan"). */
  protected readonly tenDaGan = computed(() => this.store.anhXaTen().filter((a) => a.loaiHang));
  /** Lỗi xuất (quá tồn lô / thiếu tồn) hiện ngay khi nhập — lưu sẽ bị chặn. */
  protected readonly canhBao = computed(() => {
    const f = this.f();
    if (f.loai !== 'Xuất') return '';
    return this.store.loiXuat(f.kho, f.hdId || undefined, f.xuat, f.ngay) ?? '';
  });

  protected moTa(lh: string): string {
    return moTaMa(this.store.loaiHangById(lh));
  }
  protected ton(lh: string): number {
    return tonTai(this.store.db(), lh, this.f().kho);
  }
  protected lots(lh: string): DongLo[] {
    return lh ? loConHang(this.store.db(), lh, this.f().kho).filter((l) => l.ngay <= this.f().ngay) : [];
  }
  protected giaVon(d: DongXuatF): number {
    if (!d.loaiHang || !(d.soLuong > 0) || this.f().kho === KHO_CHUYEN_THANG) return 0;
    if (d.lo) return d.soLuong * (this.lots(d.loaiHang).find((l) => l.lo === d.lo)?.donGia ?? 0);
    return sum(phanBoLo(this.store.db(), { loaiHang: d.loaiHang, kho: this.f().kho, soLuong: d.soLuong }).dong, (x) => x.soLuong * x.donGia);
  }

  protected set<K extends keyof Form>(k: K, v: Form[K]): void {
    this.f.update((f) => ({ ...f, [k]: v }));
  }
  protected doiLoai(v: PhieuKho['loai']): void {
    this.f.update((f) => ({ ...f, loai: v, hdId: '' }));
  }
  protected doiKho(v: string): void {
    this.f.update((f) => ({ ...f, kho: v, xuat: f.xuat.map((d) => ({ ...d, lo: '' })) }));
  }
  protected setNhap<K extends keyof DongNhap>(i: number, k: K, v: DongNhap[K]): void {
    this.f.update((f) => ({ ...f, nhap: f.nhap.map((d, j) => (j === i ? { ...d, [k]: v } : d)) }));
  }
  protected themNhap(): void {
    this.f.update((f) => ({ ...f, nhap: [...f.nhap, nhapRong()] }));
  }
  protected xoaNhap(i: number): void {
    this.f.update((f) => ({ ...f, nhap: f.nhap.filter((_, j) => j !== i) }));
  }
  protected setXuat(i: number, p: Partial<DongXuatF>): void {
    this.f.update((f) => ({ ...f, xuat: f.xuat.map((d, j) => (j === i ? { ...d, ...p } : d)) }));
  }
  /** Chọn tên trên HĐ đã có ánh xạ → điền mã hàng (nếu dòng chưa chọn) và lô hay dùng (nếu lô còn hàng). */
  protected chonTen(i: number, ten: string): void {
    const a = this.tenDaGan().find((x) => x.ten === ten.trim());
    const d = this.f().xuat[i];
    if (!a?.loaiHang || (d.loaiHang && d.loaiHang !== a.loaiHang)) return this.setXuat(i, { tenTrenHD: ten });
    const lo = a.lo && this.lots(a.loaiHang).some((l) => l.lo === a.lo) ? a.lo : '';
    this.setXuat(i, { tenTrenHD: ten, loaiHang: a.loaiHang, lo });
  }
  protected themXuat(): void {
    this.f.update((f) => ({ ...f, xuat: [...f.xuat, xuatRong()] }));
  }
  protected xoaXuat(i: number): void {
    this.f.update((f) => ({ ...f, xuat: f.xuat.filter((_, j) => j !== i) }));
  }

  protected luu(): void {
    if (this.mTay()?.kt.hopLe() === false) return;
    const f = this.f();
    const r = this.store.savePhieuKhoTay(
      { ngay: f.ngay, loai: f.loai, hdId: f.hdId || undefined, kho: f.kho, lyDo: f.lyDo, ghiChu: f.ghiChu, soHoaDon: f.soHoaDon, ncc: f.ncc || undefined },
      f.nhap,
      f.xuat.map((d) => ({ loaiHang: d.loaiHang, lo: d.lo || undefined, soLuong: d.soLuong, tenTrenHD: d.tenTrenHD, ghiChu: d.ghiChu })),
    );
    if (typeof r === 'string') return this.err.set(r);
    this.store.say(
      f.loai === this.loaiMacDinh()
        ? `Đã lập phiếu ${f.loai.toLowerCase()} kho`
        : `Đã lập phiếu ${f.loai.toLowerCase()} kho — xem ở tab "Phiếu ${f.loai.toLowerCase()}"`,
    );
    this.closed.emit();
  }
}

/** Mọi lô còn hàng tại một kho (mọi mã). */
function loConHangTatCa(store: Store, kho: string): DongLo[] {
  return store.loKho().filter((l) => l.ton > 0 && l.kho === kho);
}
