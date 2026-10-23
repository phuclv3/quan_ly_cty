import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { TemBinhKhiReq, xemTemBinhKhi, xuatTemBinhKhi } from '../shared/export';

/** Biện pháp phòng ngừa / hướng dẫn sử dụng, bảo quản — nội dung mặc định của tem, cho sửa theo từng tem. */
const BIEN_PHAP_MD = `Nếu nuốt phải: yêu cầu hồ trợ y tế nếu thấy khó chịu
Nếu hít phải: di chuyển nạn nhân tới chỗ thoáng khí
Nếu dính vào da: rửa sạch với nhiều nước
Nếu dính vào mắt: rửa liên tục bằng nước, y/c hỗ trợ y tế`;
const HUONG_DAN_MD = `Đảm bảo môi trường thông thoáng tại nơi làm việc
Mặc quần áo, thiết bị bảo hộ khi làm việc
Không ăn, uống và hút thuốc tại khu vực làm việc. Rửa tay sau khi sử dụng`;

const TOI_DA_THANH_PHAN = 4;

interface Dong {
  ten: string;
  kyHieu: string;
  nongDo: string;
}

interface Form {
  loai: string;
  quyCachVan: string;
  vatLieu: string;
  apSuat: string;
  soSeri: string;
  maUn: string;
  dinhLuong: string;
  xuatXu: string;
  bienPhap: string;
  huongDan: string;
  ngaySanXuat: string; // yyyy-mm-dd (ô ngày)
  hanSuDung: string;
  tenKhiChuan: string;
  thanhPhan: Dong[];
  soLuong: number;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Cộng 12 tháng; 29/02 → 28/02 của năm sau. */
function congNam(s: string): string {
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return '';
  const r = new Date(y + 1, m - 1, d);
  if (r.getMonth() !== m - 1) r.setDate(0);
  return iso(r);
}

/** 2026-10-23 → 23/10/2026 (dạng in trên tem). */
const ngayVi = (s: string) => (s ? s.split('-').reverse().join('/') : '');

const trong = (): Form => {
  const nsx = iso(new Date());
  return {
    loai: '',
    quyCachVan: '',
    vatLieu: 'Thép',
    apSuat: '15 MPa',
    soSeri: '',
    maUn: '',
    dinhLuong: '',
    xuatXu: 'Việt Nam',
    bienPhap: BIEN_PHAP_MD,
    huongDan: HUONG_DAN_MD,
    ngaySanXuat: nsx,
    hanSuDung: congNam(nsx),
    tenKhiChuan: '',
    thanhPhan: [{ ten: '', kyHieu: '', nongDo: '' }],
    soLuong: 1,
  };
};

const dongChu = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

/** In tem dán bình khí: nhập thông tin → backend dựng PDF (không lưu dữ liệu). */
@Component({
  selector: 'app-in-tem',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink],
  styles: [
    `
      .tem-bo-cuc { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; align-items: start; }
      .tem-form { display: grid; gap: 14px; min-width: 0; }
      .tem-the h2 { font-size: 16px; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
      .tem-the h2 .so { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--brand-tint); color: var(--brand); font-size: 13px; font-weight: 700; }
      .tem-luoi { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 14px; }
      .tem-luoi .wide { grid-column: 1 / -1; }
      .tem-luoi textarea { resize: vertical; line-height: 1.5; }
      .tem-tp { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 1fr) auto; gap: 8px; align-items: center; }
      .tem-tp .dau { font-size: 13px; color: var(--ink-3); font-weight: 600; }
      .tem-tp + .tem-tp { margin-top: 0; }
      input[aria-invalid='true'] { border-color: var(--bad-fg) !important; background: var(--bad-bg); box-shadow: 0 0 0 3px color-mix(in srgb, var(--bad-fg) 16%, transparent); }
      .tem-tp-loi { color: var(--bad-fg); font-size: 13px; font-weight: 600; }
      .tem-xem { position: sticky; top: 12px; display: grid; gap: 10px; }
      .tem-nut { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
      .tem-xem iframe { width: 100%; aspect-ratio: 16 / 9; border: 1px solid var(--line); border-radius: 8px; background: #fff; display: block; }
      .tem-chinh { display: flex; gap: 8px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }
      .tem-chinh .btn.lon { min-height: 42px; padding: 0 20px; font-size: 16px; }
      @media (max-width: 1100px) { .tem-bo-cuc { grid-template-columns: minmax(0, 1fr); } .tem-xem { position: static; order: -1; } }
      @media (max-width: 560px) { .tem-luoi { grid-template-columns: minmax(0, 1fr); } .tem-tp { grid-template-columns: 1fr 1fr; } }
    `,
  ],
  template: `
    <div class="page-head">
      <div><div class="crumbs"><a routerLink="/">Trang chủ</a> › Kho › In tem bình khí</div><h1>In tem bình khí</h1></div>
    </div>
    @if (f(); as v) {
      <div class="tem-bo-cuc">
      <div class="tem-form">

      <section class="card tem-the">
        <h2><span class="so">1</span>Thông tin tem</h2>
        <div class="tem-luoi">
          <div class="field" [class.thieu]="thieu(v.soSeri)" data-loi="Bắt buộc">
            <label for="t-soSeri">Số seri <span class="req">*</span></label>
            <input id="t-soSeri" autocomplete="off" [value]="v.soSeri" (input)="set({ soSeri: val($event) })" />
          </div>
          <div class="field" [class.thieu]="thieu(v.loai)" data-loi="Bắt buộc">
            <label for="t-loai">Loại <span class="req">*</span></label>
            <input id="t-loai" placeholder="10L" autocomplete="off" [value]="v.loai" (input)="set({ loai: val($event) })" />
          </div>
          <div class="field" [class.thieu]="thieu(v.quyCachVan)" data-loi="Bắt buộc">
            <label for="t-quyCachVan">Quy cách van <span class="req">*</span></label>
            <input id="t-quyCachVan" placeholder="QF-2" autocomplete="off" [value]="v.quyCachVan" (input)="set({ quyCachVan: val($event) })" />
          </div>
          <div class="field" [class.thieu]="thieu(v.vatLieu)" data-loi="Bắt buộc">
            <label for="t-vatLieu">Vật liệu <span class="req">*</span></label>
            <input id="t-vatLieu" list="t-vl-ds" [value]="v.vatLieu" (input)="set({ vatLieu: val($event) })" />
            <datalist id="t-vl-ds"><option value="Thép"></option><option value="Nhôm"></option></datalist>
          </div>
          <div class="field" [class.thieu]="thieu(v.apSuat)" data-loi="Bắt buộc">
            <label for="t-apSuat">Áp suất <span class="req">*</span></label>
            <input id="t-apSuat" [value]="v.apSuat" (input)="set({ apSuat: val($event) })" />
          </div>
          <div class="field" [class.thieu]="thieu(v.dinhLuong)" data-loi="Bắt buộc">
            <label for="t-dinhLuong">Định lượng <span class="req">*</span></label>
            <input id="t-dinhLuong" autocomplete="off" [value]="v.dinhLuong" (input)="set({ dinhLuong: val($event) })" />
          </div>
          <div class="field" [class.thieu]="thieu(v.maUn)" data-loi="Bắt buộc">
            <label for="t-maUn">Mã nhận dạng (UN) <span class="req">*</span></label>
            <input id="t-maUn" placeholder="UN 1066" autocomplete="off" [value]="v.maUn" (input)="set({ maUn: val($event) })" />
          </div>
          <div class="field" [class.thieu]="thieu(v.xuatXu)" data-loi="Bắt buộc">
            <label for="t-xuatXu">Xuất xứ <span class="req">*</span></label>
            <input id="t-xuatXu" [value]="v.xuatXu" (input)="set({ xuatXu: val($event) })" />
          </div>
          <div class="field" [class.thieu]="thieu(v.ngaySanXuat)" data-loi="Bắt buộc">
            <label for="t-ngaySanXuat">Ngày sản xuất <span class="req">*</span></label>
            <input id="t-ngaySanXuat" type="date" [value]="v.ngaySanXuat" (input)="doiNsx(val($event))" />
          </div>
          <div class="field" [class.thieu]="thieu(v.hanSuDung)" data-loi="Bắt buộc">
            <label for="t-hanSuDung">Hạn sử dụng <span class="req">*</span></label>
            <input id="t-hanSuDung" type="date" [value]="v.hanSuDung" (input)="set({ hanSuDung: val($event) })" />
            <span class="hint">Mặc định = ngày sản xuất + 12 tháng, sửa được</span>
          </div>
          <div class="field" [class.thieu]="soLuongSai(v.soLuong)" data-loi="Từ 1 đến 100">
            <label for="t-soLuong">Số tem in <span class="req">*</span></label>
            <input id="t-soLuong" type="number" min="1" max="100" [value]="v.soLuong" (input)="set({ soLuong: +val($event) })" />
          </div>
          <div class="field wide" [class.thieu]="thieu(v.bienPhap)" data-loi="Bắt buộc">
            <label for="t-bienPhap">Biện pháp phòng ngừa <span class="req">*</span></label>
            <textarea id="t-bienPhap" rows="4" [value]="v.bienPhap" (input)="set({ bienPhap: val($event) })"></textarea>
          </div>
          <div class="field wide" [class.thieu]="thieu(v.huongDan)" data-loi="Bắt buộc">
            <label for="t-huongDan">Hướng dẫn sử dụng, bảo quản <span class="req">*</span></label>
            <textarea id="t-huongDan" rows="3" [value]="v.huongDan" (input)="set({ huongDan: val($event) })"></textarea>
          </div>
        </div>
      </section>

      <section class="card tem-the">
        <h2><span class="so">2</span>Khí chuẩn &amp; thành phần</h2>
        <div class="tem-luoi">
          <div class="field wide" [class.thieu]="thieu(v.tenKhiChuan)" data-loi="Bắt buộc">
            <label for="t-tenKhiChuan">Khí chuẩn <span class="req">*</span></label>
            <input id="t-tenKhiChuan" placeholder="N2" autocomplete="off" [value]="v.tenKhiChuan" (input)="set({ tenKhiChuan: val($event) })" />
            <span class="hint">Chữ số sau chữ cái tự thành chỉ số dưới (N2 → N₂)</span>
          </div>
        </div>
        <div class="section-title">
          <span class="sub">Thành phần ({{ v.thanhPhan.length }}/{{ max }} dòng, mỗi dòng nhập đủ 3 ô)</span>
          <button type="button" class="btn sm" [disabled]="v.thanhPhan.length >= max" (click)="themDong()">+ Thêm dòng</button>
        </div>
        <div class="tem-luoi" style="grid-template-columns: minmax(0, 1fr); gap: 8px">
          <div class="tem-tp dau" aria-hidden="true">
            <span>Tên khí <span class="req">*</span></span><span>Kí hiệu <span class="req">*</span></span><span>Nồng độ <span class="req">*</span></span><span></span>
          </div>
          @for (d of v.thanhPhan; track $index) {
            <div class="tem-tp">
              <input [attr.aria-label]="'Tên khí dòng ' + ($index + 1)" placeholder="Nitơ" [attr.aria-invalid]="thieu(d.ten)" [value]="d.ten" (input)="suaDong($index, { ten: val($event) })" />
              <input [attr.aria-label]="'Kí hiệu dòng ' + ($index + 1)" placeholder="N2" [attr.aria-invalid]="thieu(d.kyHieu)" [value]="d.kyHieu" (input)="suaDong($index, { kyHieu: val($event) })" />
              <input [attr.aria-label]="'Nồng độ dòng ' + ($index + 1)" placeholder="99.99 %" [attr.aria-invalid]="thieu(d.nongDo)" [value]="d.nongDo" (input)="suaDong($index, { nongDo: val($event) })" />
              <button type="button" class="btn sm quiet danger" [disabled]="v.thanhPhan.length <= 1" (click)="xoaDong($index)">Xoá</button>
            </div>
          }
          @if (thanhPhanThieu()) { <div class="tem-tp-loi">⚠ Mỗi dòng thành phần phải nhập đủ 3 ô</div> }
        </div>
      </section>

      </div>
      <aside class="tem-xem" aria-label="Xem trước tem">
        <div class="card">
          <div class="tem-nut">
            <strong>Xem trước</strong>
            <span class="sub">{{ dangXem() ? 'Đang dựng…' : 'Tự cập nhật khi nhập' }}</span>
          </div>
          @if (xemUrl(); as u) { <iframe title="Xem trước tem" [src]="u"></iframe> }
          @if (xemLoi()) { <div class="note bad">{{ xemLoi() }}</div> }
        </div>
        <div class="tem-chinh">
          <button type="button" class="btn quiet" (click)="lamLai()">Nhập lại</button>
          <button type="button" class="btn quiet" (click)="xemThu()">Xem thử</button>
          <button type="button" class="btn lon" [disabled]="dangXuat()" (click)="inTem()">Tải PDF{{ v.soLuong > 1 ? ' (' + v.soLuong + ' tem)' : '' }}</button>
        </div>
      </aside>
      </div>
    }
  `,
})
export class InTemPage {
  private readonly store = inject(Store);
  protected readonly max = TOI_DA_THANH_PHAN;
  protected readonly f = signal<Form>(trong());
  protected readonly dangXuat = signal(false);
  /** Người dùng đã tự sửa hạn sử dụng thì đổi ngày sản xuất không ghi đè nữa. */
  private hsdTaySua = false;

  private readonly san = inject(DomSanitizer);
  protected readonly xemUrl = signal<SafeResourceUrl | null>(null);
  protected readonly xemLoi = signal('');
  protected readonly dangXem = signal(false);
  /** Đã bấm Xem thử / Tải PDF mà còn thiếu → tô đỏ ô trống. */
  protected readonly daBam = signal(false);
  private urlXem: string | null = null;
  private lanXem = 0;

  constructor() {
    // Xem trực tiếp: mỗi lần form đổi, chờ 0,5 s không sửa tiếp rồi nhờ backend dựng lại PDF.
    effect((onCleanup) => {
      const req = this.taoReq(true);
      const t = setTimeout(() => void this.capNhatXem(req), 500);
      onCleanup(() => clearTimeout(t));
    });
    inject(DestroyRef).onDestroy(() => {
      this.lanXem++;
      if (this.urlXem) URL.revokeObjectURL(this.urlXem);
    });
  }

  protected val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }
  protected set(p: Partial<Form>): void {
    if (p.hanSuDung !== undefined) this.hsdTaySua = true;
    this.f.update((v) => ({ ...v, ...p }));
  }
  protected doiNsx(nsx: string): void {
    this.f.update((v) => ({ ...v, ngaySanXuat: nsx, hanSuDung: this.hsdTaySua ? v.hanSuDung : congNam(nsx) }));
  }
  protected themDong(): void {
    this.f.update((v) => (v.thanhPhan.length >= TOI_DA_THANH_PHAN ? v : { ...v, thanhPhan: [...v.thanhPhan, { ten: '', kyHieu: '', nongDo: '' }] }));
  }
  protected xoaDong(i: number): void {
    this.f.update((v) => ({ ...v, thanhPhan: v.thanhPhan.filter((_, j) => j !== i) }));
  }
  protected suaDong(i: number, p: Partial<Dong>): void {
    this.f.update((v) => ({ ...v, thanhPhan: v.thanhPhan.map((d, j) => (j === i ? { ...d, ...p } : d)) }));
  }
  protected lamLai(): void {
    this.hsdTaySua = false;
    this.daBam.set(false);
    this.f.set(trong());
  }

  /** Nội dung gửi backend. Xem trước: luôn 1 tem và backend bỏ qua kiểm tra bắt buộc (form đang nhập dở). */
  private taoReq(xem: boolean): TemBinhKhiReq {
    const v = this.f();
    const thanhPhan = xem ? v.thanhPhan.filter((d) => d.ten.trim() || d.kyHieu.trim() || d.nongDo.trim()) : v.thanhPhan;
    return {
      loai: v.loai,
      quyCachVan: v.quyCachVan,
      vatLieu: v.vatLieu,
      apSuat: v.apSuat,
      soSeri: v.soSeri.trim(),
      maUn: v.maUn,
      dinhLuong: v.dinhLuong,
      xuatXu: v.xuatXu,
      bienPhap: dongChu(v.bienPhap),
      huongDan: dongChu(v.huongDan),
      ngaySanXuat: ngayVi(v.ngaySanXuat),
      hanSuDung: ngayVi(v.hanSuDung),
      tenKhiChuan: v.tenKhiChuan.trim(),
      thanhPhan,
      soLuong: xem ? 1 : v.soLuong,
      xemTruoc: xem,
    };
  }

  protected thieu(giaTri: string): boolean {
    return this.daBam() && !giaTri.trim();
  }
  protected thanhPhanThieu(): boolean {
    return this.daBam() && this.f().thanhPhan.some((d) => !d.ten.trim() || !d.kyHieu.trim() || !d.nongDo.trim());
  }
  protected soLuongSai(n: number): boolean {
    return this.daBam() && (!Number.isInteger(n) || n < 1 || n > 100);
  }

  /** Mọi ô đều bắt buộc; mỗi dòng thành phần khí phải đủ 3 ô. Trả câu báo lỗi hoặc ''. */
  private loiNhap(): string {
    this.daBam.set(true);
    const v = this.f();
    const o: [string, string][] = [
      ['Loại', v.loai], ['Quy cách van cổ bình', v.quyCachVan], ['Vật liệu bình', v.vatLieu], ['Áp suất', v.apSuat], ['Số seri bình', v.soSeri],
      ['Mã nhận dạng hóa chất', v.maUn], ['Định lượng', v.dinhLuong], ['Xuất xứ hóa chất', v.xuatXu], ['Biện pháp phòng ngừa', v.bienPhap],
      ['Hướng dẫn sử dụng, bảo quản', v.huongDan], ['Ngày sản xuất', v.ngaySanXuat], ['Hạn sử dụng', v.hanSuDung], ['Khí chuẩn', v.tenKhiChuan],
    ];
    const thieu = o.filter(([, g]) => !g.trim()).map(([t]) => t);
    if (this.soLuongSai(v.soLuong)) thieu.push('Số tem in (1–100)');
    if (v.thanhPhan.some((d) => !d.ten.trim() || !d.kyHieu.trim() || !d.nongDo.trim())) thieu.push('Thành phần khí (mỗi dòng đủ 3 ô)');
    return thieu.length ? `Cần nhập: ${thieu.join(', ')}` : '';
  }

  private async capNhatXem(req: TemBinhKhiReq): Promise<void> {
    const lan = ++this.lanXem;
    this.dangXem.set(true);
    const { blob, loi } = await xemTemBinhKhi(req);
    if (lan !== this.lanXem) return; // đã có lần sửa mới hơn
    this.dangXem.set(false);
    this.xemLoi.set(loi);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    if (this.urlXem) URL.revokeObjectURL(this.urlXem);
    this.urlXem = url;
    this.xemUrl.set(this.san.bypassSecurityTrustResourceUrl(`${url}#toolbar=0&navpanes=0&view=Fit`));
  }

  /** Mở PDF (đủ số tem) ở tab mới. Mở tab trước khi gọi API để trình duyệt không chặn cửa sổ bật lên. */
  protected async xemThu(): Promise<void> {
    const e = this.loiNhap();
    if (e) return this.store.say(e, 'bad');
    const w = window.open('', '_blank');
    const { blob, loi } = await xemTemBinhKhi(this.taoReq(false));
    if (!blob) {
      w?.close();
      return this.store.say(loi, 'bad');
    }
    const url = URL.createObjectURL(blob);
    if (w) w.location.href = url;
    else this.store.say('Trình duyệt đang chặn cửa sổ bật lên — cho phép rồi bấm lại', 'bad');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  protected async inTem(): Promise<void> {
    const e = this.loiNhap();
    if (e) return this.store.say(e, 'bad');
    const req = this.taoReq(false);
    this.dangXuat.set(true);
    try {
      if ((await xuatTemBinhKhi(req)) !== null) this.store.say(`Đã tạo PDF tem ${req.soSeri}`);
    } finally {
      this.dangXuat.set(false);
    }
  }
}
